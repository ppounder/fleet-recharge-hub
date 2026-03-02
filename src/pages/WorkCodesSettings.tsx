import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkCodes, useCreateWorkCode, useUpdateWorkCode, useDeleteWorkCode } from "@/hooks/useWorkCodes";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useVatBands } from "@/hooks/useVatBands";
import { useCurrentProvider } from "@/hooks/useCurrentProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

export default function WorkCodesSettings() {
  const { toast } = useToast();
  const { data: provider } = useCurrentProvider();
  const providerId = provider?.id;

  const { data: workCodes, isLoading } = useWorkCodes(providerId);
  const { data: workCategories } = useWorkCategories(providerId);
  const { data: vatBands } = useVatBands(providerId);
  const createCode = useCreateWorkCode();
  const updateCode = useUpdateWorkCode();
  const deleteCode = useDeleteWorkCode();

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newVatBandId, setNewVatBandId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editVatBandId, setEditVatBandId] = useState("");

  const handleAdd = async () => {
    if (!newName.trim() || !newCategoryId || !providerId) {
      toast({ title: "Missing fields", description: "Please enter a name and select a category.", variant: "destructive" });
      return;
    }
    try {
      await createCode.mutateAsync({
        provider_id: providerId,
        name: newName.trim(),
        work_category_id: newCategoryId,
        vat_band_id: newVatBandId || null,
      });
      toast({ title: "Work code added" });
      setNewName("");
      setNewCategoryId("");
      setNewVatBandId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editCategoryId) return;
    try {
      await updateCode.mutateAsync({
        id,
        name: editName.trim(),
        work_category_id: editCategoryId,
        vat_band_id: editVatBandId || null,
      });
      setEditingId(null);
      toast({ title: "Work code updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (wc: { id: string; name: string; work_category_id: string; vat_band_id: string | null }) => {
    setEditingId(wc.id);
    setEditName(wc.name);
    setEditCategoryId(wc.work_category_id);
    setEditVatBandId(wc.vat_band_id || "");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Work Codes</h1>
        <p className="text-muted-foreground text-sm">
          Manage work codes for your service provider. Each code belongs to a work category and can have an optional VAT band.
        </p>

        {/* Add new */}
        <Card>
          <CardHeader><CardTitle className="text-base">Add Work Code</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Full Service" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {workCategories?.map((wc) => (
                      <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Band</Label>
                <Select value={newVatBandId} onValueChange={setNewVatBandId}>
                  <SelectTrigger><SelectValue placeholder="Select VAT band" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No VAT band</SelectItem>
                    {vatBands?.map((vb) => (
                      <SelectItem key={vb.id} value={vb.id}>{vb.name} ({vb.percentage}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={createCode.isPending} className="h-10">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : !workCodes?.length ? (
              <div className="p-6 text-center text-muted-foreground">No work codes yet. Add your first one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>VAT Band</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workCodes.map((wc) => {
                    const isEditing = editingId === wc.id;
                    const category = workCategories?.find((c) => c.id === wc.work_category_id);
                    const vatBand = vatBands?.find((vb) => vb.id === wc.vat_band_id);

                    return (
                      <TableRow key={wc.id}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus />
                          ) : wc.name}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {workCategories?.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : category?.name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {isEditing ? (
                            <Select value={editVatBandId} onValueChange={setEditVatBandId}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No VAT band</SelectItem>
                                {vatBands?.map((vb) => (
                                  <SelectItem key={vb.id} value={vb.id}>{vb.name} ({vb.percentage}%)</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : vatBand ? `${vatBand.name} (${vatBand.percentage}%)` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(wc.id)}>
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(wc)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteCode.mutate(wc.id)}>
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
