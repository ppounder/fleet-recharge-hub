import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Network } from "lucide-react";

export default function SupplierNetworks() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("internal");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: networks, isLoading } = useQuery({
    queryKey: ["supplier_networks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_networks")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createNetwork = useMutation({
    mutationFn: async (network: { name: string; type: string }) => {
      const { data, error } = await supabase
        .from("supplier_networks")
        .insert({ name: network.name, type: network.type as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier_networks"] }),
  });

  const deleteNetwork = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_networks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier_networks"] }),
  });

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: "Missing name", description: "Please enter a network name", variant: "destructive" });
      return;
    }
    try {
      await createNetwork.mutateAsync({ name: newName.trim(), type: newType });
      toast({ title: "Supplier network created" });
      setNewName("");
      setNewType("internal");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Supplier Networks</h1>
          <p className="text-muted-foreground">
            Manage your internal and external supplier networks.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Network</CardTitle>
            <CardDescription>Add a new supplier network.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_180px_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input
                  placeholder="e.g. 1Link, DAF Check"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={createNetwork.isPending} className="h-10">
                <Plus className="w-4 h-4 mr-1" /> Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : !networks?.length ? (
              <div className="p-6 text-center text-muted-foreground">
                No supplier networks yet. Create your first one above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networks.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Network className="w-4 h-4 text-muted-foreground" />
                        {n.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={n.type === "internal" ? "default" : "secondary"}>
                          {n.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(n.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Network?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this supplier network. Suppliers linked to it will become unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteNetwork.mutateAsync(deleteId);
                  toast({ title: "Network deleted" });
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                }
                setDeleteId(null);
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
