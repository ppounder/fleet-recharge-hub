import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMenuItems, useCreateMenuItem, useDeleteMenuItem, useUpdateMenuItem } from "@/hooks/useMenuItems";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const JOB_TYPES = [
  { value: "mot", label: "MOT" },
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "tyres", label: "Tyres" },
  { value: "bodywork", label: "Bodywork" },
];

export default function MenuItems() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isFleetManager = userRole === "fleet-manager";
  const { data: menuItems, isLoading } = useMenuItems();
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const updateItem = useUpdateMenuItem();

  // Get the supplier record for the current user
  const { data: myProvider } = useQuery({
    queryKey: ["my_supplier", user?.id],
    enabled: !!user?.id,
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

  // Get all fleets for the dropdown
  const { data: fleets } = useQuery({
    queryKey: ["fleets_for_menu"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fleets").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get all suppliers (for fleet managers to pick from)
  const { data: allProviders } = useSuppliers();

  const [newFleetId, setNewFleetId] = useState("");
  const [newProviderId, setNewProviderId] = useState("");
  const [newJobType, setNewJobType] = useState("mot");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleAdd = async () => {
    const resolvedProviderId = isFleetManager ? newProviderId : myProvider?.id;
    if (!resolvedProviderId || !newFleetId || !newPrice) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await createItem.mutateAsync({
        provider_id: resolvedProviderId,
        fleet_id: newFleetId,
        job_type: newJobType,
        description: newDescription || JOB_TYPES.find(j => j.value === newJobType)?.label || newJobType,
        unit_price: Number(newPrice),
      });
      toast({ title: "Menu item added" });
      setNewFleetId("");
      setNewProviderId("");
      setNewJobType("mot");
      setNewDescription("");
      setNewPrice("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateItem.mutateAsync({ id, unit_price: Number(editPrice) });
      setEditingId(null);
      toast({ title: "Price updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Group items by fleet
  const fleetMap = new Map<string, typeof menuItems>();
  menuItems?.forEach((item) => {
    const existing = fleetMap.get(item.fleet_id) || [];
    existing.push(item);
    fleetMap.set(item.fleet_id, existing);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Menu Items</h1>
          <p className="text-muted-foreground">Manage agreed prices per Fleet Manager for each work category.</p>
        </div>

        {/* Add new item */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Agreed Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 items-end ${isFleetManager ? "grid-cols-[1fr_1fr_1fr_1fr_100px_auto]" : "grid-cols-[1fr_1fr_1fr_100px_auto]"}`}>
              {isFleetManager && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Supplier *</Label>
                  <Select value={newProviderId} onValueChange={setNewProviderId}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {allProviders?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                      {(!allProviders || allProviders.length === 0) && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No suppliers found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                <Label className="text-xs">Work Category *</Label>
                <Select value={newJobType} onValueChange={setNewJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((jt) => (
                      <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Standard MOT test"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price £ *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleAdd} disabled={createItem.isPending} className="h-10">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : !menuItems?.length ? (
              <div className="p-6 text-center text-muted-foreground">No menu items yet. Add your first agreed price above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Fleet</TableHead>
                    <TableHead>Work Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Agreed Price</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => {
                    const fleet = fleets?.find((f) => f.id === item.fleet_id);
                    const provider = allProviders?.find((sp) => sp.id === item.provider_id);
                    const jobLabel = JOB_TYPES.find((j) => j.value === item.job_type)?.label || item.job_type;
                    const isEditing = editingId === item.id;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{provider?.name || "Unknown"}</TableCell>
                        <TableCell>{fleet?.name || "Unknown"}</TableCell>
                        <TableCell className="capitalize">{jobLabel}</TableCell>
                        <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 ml-auto text-right text-sm"
                              autoFocus
                            />
                          ) : (
                            `£${Number(item.unit_price).toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(item.id)}>
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => { setEditingId(item.id); setEditPrice(String(item.unit_price)); }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteItem.mutate(item.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
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
    </AppLayout>
  );
}
