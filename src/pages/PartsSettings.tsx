import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParts, useCreatePart, useUpdatePart, useDeletePart } from "@/hooks/useParts";
import { useVatBands } from "@/hooks/useVatBands";
import { useCurrentProvider } from "@/hooks/useCurrentProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Save, Package } from "lucide-react";

export default function PartsSettings() {
  const { toast } = useToast();
  const { data: provider } = useCurrentProvider();
  const providerId = provider?.id;
  const { data: parts, isLoading } = useParts(providerId);
  const { data: vatBands } = useVatBands(providerId);
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();

  const [newDescription, setNewDescription] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newVatBandId, setNewVatBandId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editPartNumber, setEditPartNumber] = useState("");
  const [editVatBandId, setEditVatBandId] = useState("");

  const handleAdd = async () => {
    if (!newDescription.trim() || !providerId) {
      toast({ title: "Part description is required", variant: "destructive" });
      return;
    }
    try {
      await createPart.mutateAsync({
        provider_id: providerId,
        description: newDescription.trim(),
        part_number: newPartNumber.trim(),
        vat_band_id: newVatBandId && newVatBandId !== "none" ? newVatBandId : null,
      });
      toast({ title: "Part added" });
      setNewDescription("");
      setNewPartNumber("");
      setNewVatBandId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (part: any) => {
    setEditingId(part.id);
    setEditDescription(part.description);
    setEditPartNumber(part.part_number);
    setEditVatBandId(part.vat_band_id || "");
  };

  const handleSaveEdit = async () => {
    if (!editDescription.trim() || !editingId) return;
    try {
      await updatePart.mutateAsync({
        id: editingId,
        description: editDescription.trim(),
        part_number: editPartNumber.trim(),
        vat_band_id: editVatBandId && editVatBandId !== "none" ? editVatBandId : null,
      });
      toast({ title: "Part updated" });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const vatLabel = (vatBandId: string | null) => {
    if (!vatBandId) return "—";
    const band = vatBands?.find((v) => v.id === vatBandId);
    return band ? `${band.name} (${band.percentage}%)` : "—";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> Parts
        </h1>

        {/* Add new */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Part</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Description *</Label>
                <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="e.g. Brake Pad Set" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Part Number</Label>
                <Input value={newPartNumber} onChange={(e) => setNewPartNumber(e.target.value)} placeholder="e.g. BP-1234" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Band</Label>
                <Select value={newVatBandId} onValueChange={setNewVatBandId}>
                  <SelectTrigger><SelectValue placeholder="Select VAT band" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No VAT band</SelectItem>
                    {vatBands?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v.percentage}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={createPart.isPending} className="h-10">
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
            ) : !parts?.length ? (
              <div className="p-6 text-center text-muted-foreground">No parts yet. Add your first part above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>VAT Band</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) =>
                    editingId === part.id ? (
                      <TableRow key={part.id}>
                        <TableCell>
                          <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={editPartNumber} onChange={(e) => setEditPartNumber(e.target.value)} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Select value={editVatBandId} onValueChange={setEditVatBandId}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No VAT band</SelectItem>
                              {vatBands?.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name} ({v.percentage}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.description}</TableCell>
                        <TableCell className="text-muted-foreground">{part.part_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{vatLabel(part.vat_band_id)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(part)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deletePart.mutate(part.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
