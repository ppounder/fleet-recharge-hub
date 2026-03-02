import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVatBands, useCreateVatBand, useUpdateVatBand, useDeleteVatBand } from "@/hooks/useVatBands";
import { useCurrentProvider } from "@/hooks/useCurrentProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

export default function VatBandsSettings() {
  const { toast } = useToast();
  const { data: provider } = useCurrentProvider();
  const providerId = provider?.id;

  const { data: vatBands, isLoading } = useVatBands(providerId);
  const createVatBand = useCreateVatBand();
  const updateVatBand = useUpdateVatBand();
  const deleteVatBand = useDeleteVatBand();

  const [newName, setNewName] = useState("");
  const [newPercentage, setNewPercentage] = useState("20");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPercentage, setEditPercentage] = useState("");

  const handleAdd = async () => {
    if (!newName.trim() || !providerId) {
      toast({ title: "Missing fields", description: "Please enter a name", variant: "destructive" });
      return;
    }
    try {
      await createVatBand.mutateAsync({
        provider_id: providerId,
        name: newName.trim(),
        percentage: Number(newPercentage),
      });
      toast({ title: "VAT band added" });
      setNewName("");
      setNewPercentage("20");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateVatBand.mutateAsync({ id, name: editName.trim(), percentage: Number(editPercentage) });
      setEditingId(null);
      toast({ title: "VAT band updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">VAT Bands</h1>
        <p className="text-muted-foreground text-sm">Manage VAT bands that can be assigned to your job types.</p>

        <Card>
          <CardHeader><CardTitle className="text-base">Add VAT Band</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_120px_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Standard Rate" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rate % *</Label>
                <Input type="number" min={0} max={100} step={0.01} value={newPercentage} onChange={(e) => setNewPercentage(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={createVatBand.isPending} className="h-10">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : !vatBands?.length ? (
              <div className="p-6 text-center text-muted-foreground">No VAT bands yet. Add your first one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate %</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatBands.map((vb) => {
                    const isEditing = editingId === vb.id;
                    return (
                      <TableRow key={vb.id}>
                        <TableCell className="font-medium">
                          {isEditing ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus /> : vb.name}
                        </TableCell>
                        <TableCell>
                          {isEditing ? <Input type="number" min={0} max={100} step={0.01} value={editPercentage} onChange={(e) => setEditPercentage(e.target.value)} className="h-8 w-24" /> : `${vb.percentage}%`}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(vb.id)}>
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingId(vb.id); setEditName(vb.name); setEditPercentage(String(vb.percentage)); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteVatBand.mutate(vb.id)}>
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
