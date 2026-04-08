import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommercialTerms, useCreateCommercialTerm, useDeleteCommercialTerm } from "@/hooks/useCommercialTerms";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSuppliers } from "@/hooks/useSuppliers";
import { MenuPricesPanel } from "@/components/MenuPricesPanel";
import { LabourRatesPanel } from "@/components/LabourRatesPanel";
import { Plus, Trash2, ArrowLeft, Handshake, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function CommercialTerms() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isFleetManager = userRole === "fleet-manager";
  const { data: terms, isLoading } = useCommercialTerms();
  const createTerm = useCreateCommercialTerm();
  const deleteTerm = useDeleteCommercialTerm();

  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [deleteTermId, setDeleteTermId] = useState<string | null>(null);
  const [newFleetId, setNewFleetId] = useState("");
  const [newProviderId, setNewProviderId] = useState("");
  const [newStartDate, setNewStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Get supplier record for current user (supplier role)
  const { data: myProvider } = useQuery({
    queryKey: ["my_supplier", user?.id],
    enabled: !!user?.id && !isFleetManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { id: string; name: string; user_id: string } | null;
    },
  });

  const { data: fleets } = useQuery({
    queryKey: ["fleets_for_terms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fleets").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProviders } = useSuppliers();

  const { data: networks } = useQuery({
    queryKey: ["supplier_networks_for_terms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_networks").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Filter to only internal-network suppliers for commercial terms
  const internalProviders = useMemo(() => {
    if (!allProviders) return [];
    return allProviders.filter((sp: any) => {
      if (!sp.network_id) return true;
      const network = networks?.find((n: any) => n.id === sp.network_id);
      return !network || network.type === "internal";
    });
  }, [allProviders, networks]);

  const selectedTerm = terms?.find((t) => t.id === selectedTermId);

  const handleAdd = async () => {
    const resolvedProviderId = isFleetManager ? newProviderId : myProvider?.id;
    if (!resolvedProviderId || !newFleetId || !newStartDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await createTerm.mutateAsync({
        provider_id: resolvedProviderId,
        fleet_id: newFleetId,
        start_date: newStartDate,
      });
      toast({ title: "Commercial terms created" });
      setNewFleetId("");
      setNewProviderId("");
      setNewStartDate(format(new Date(), "yyyy-MM-dd"));
    } catch (err: any) {
      const msg = err.message?.includes("duplicate") ? "Terms already exist for this fleet" : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  // Drill-down view: show menu prices for the selected agreement
  if (selectedTerm) {
    const fleet = fleets?.find((f) => f.id === selectedTerm.fleet_id);
    const provider = allProviders?.find((sp) => sp.id === selectedTerm.provider_id);

    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTermId(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isFleetManager ? provider?.name : fleet?.name} — Menu Prices
              </h1>
              <p className="text-muted-foreground text-sm">
                Agreement started {format(new Date(selectedTerm.start_date), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <Tabs defaultValue="prices" className="w-full">
            <TabsList>
              <TabsTrigger value="prices">Prices</TabsTrigger>
              <TabsTrigger value="labour-rates">Labour Rates</TabsTrigger>
            </TabsList>
            <TabsContent value="prices" className="mt-4">
              <MenuPricesPanel providerId={selectedTerm.provider_id} fleetId={selectedTerm.fleet_id} />
            </TabsContent>
            <TabsContent value="labour-rates" className="mt-4">
              <LabourRatesPanel providerId={selectedTerm.provider_id} fleetId={selectedTerm.fleet_id} />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Commercial Terms</h1>
          <p className="text-muted-foreground">
            {isFleetManager
              ? "Manage commercial agreements with your suppliers."
              : "Manage your fleet agreements and agreed menu prices."}
          </p>
        </div>

        {/* Add new agreement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Agreement</CardTitle>
            <CardDescription>Establish commercial terms with a fleet to start adding menu prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 items-end ${isFleetManager ? "grid-cols-[1fr_1fr_150px_auto]" : "grid-cols-[1fr_1fr_150px_auto]"}`}>
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier *</Label>
                {isFleetManager ? (
                  <Select value={newProviderId} onValueChange={setNewProviderId}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {internalProviders?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                      {(!internalProviders || internalProviders.length === 0) && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No suppliers found</div>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={myProvider?.name || "Loading..."} disabled className="bg-muted" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fleet *</Label>
                <Select value={newFleetId} onValueChange={setNewFleetId}>
                  <SelectTrigger><SelectValue placeholder="Select fleet" /></SelectTrigger>
                  <SelectContent>
                    {fleets?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                    {(!fleets || fleets.length === 0) && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No fleets found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date *</Label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} disabled={createTerm.isPending} className="h-10">
                <Plus className="w-4 h-4 mr-1" /> Create
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agreements list */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : !terms?.length ? (
              <div className="p-6 text-center text-muted-foreground">
                No commercial agreements yet. Create your first agreement above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isFleetManager && <TableHead>Supplier</TableHead>}
                    <TableHead>Fleet</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => {
                    const fleet = fleets?.find((f) => f.id === term.fleet_id);
                    const provider = allProviders?.find((sp) => sp.id === term.provider_id);

                    return (
                      <TableRow
                        key={term.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedTermId(term.id)}
                      >
                        {isFleetManager && (
                          <TableCell className="font-medium">{provider?.name || "Unknown"}</TableCell>
                        )}
                        <TableCell className="font-medium">{fleet?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(term.start_date), "dd MMM yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={term.status === "active" ? "default" : "secondary"}>
                            {term.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); setSelectedTermId(term.id); }}
                            >
                              <Handshake className="w-3.5 h-3.5 mr-1" /> Prices
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteTermId(term.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTermId} onOpenChange={(open) => !open && setDeleteTermId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commercial Terms?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this agreement along with all associated menu prices and labour rates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTermId) return;
                try {
                  const term = terms?.find((t) => t.id === deleteTermId);
                  if (term) {
                    await supabase.from("provider_menu_items").delete().eq("provider_id", term.provider_id).eq("fleet_id", term.fleet_id);
                    await supabase.from("labour_rates").delete().eq("provider_id", term.provider_id).eq("fleet_id", term.fleet_id);
                  }
                  await deleteTerm.mutateAsync(deleteTermId);
                  toast({ title: "Commercial terms deleted" });
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                }
                setDeleteTermId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
