import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useJobTypes, useCreateJobType, useUpdateJobType, useDeleteJobType } from "@/hooks/useJobTypes";
import { useVatBands } from "@/hooks/useVatBands";
import { useCurrentProvider } from "@/hooks/useCurrentProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

export default function JobTypesSettings() {
  const { toast } = useToast();
  const { data: provider } = useCurrentProvider();
  const providerId = provider?.id;

  const { data: jobTypes, isLoading } = useJobTypes(providerId);
  const { data: vatBands } = useVatBands(providerId);
  const createJobType = useCreateJobType();
  const updateJobType = useUpdateJobType();
  const deleteJobType = useDeleteJobType();

  const [newName, setNewName] = useState("");
  const [newVatBandId, setNewVatBandId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editVatBandId, setEditVatBandId] = useState<string>("");

  const handleAdd = async () => {
    if (!newName.trim() || !providerId) {
      toast({ title: "Missing fields", description: "Please enter a name", variant: "destructive" });
      return;
    }
    try {
      await createJobType.mutateAsync({
        provider_id: providerId,
        name: newName.trim(),
        vat_band_id: newVatBandId || null,
      });
      toast({ title: "Job type added" });
      setNewName("");
      setNewVatBandId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateJobType.mutateAsync({
        id,
        name: editName.trim(),
        vat_band_id: editVatBandId || null,
      });
      setEditingId(null);
      toast({ title: "Job type updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (jt: { id: string; name: string; vat_band_id: string | null }) => {
    setEditingId(jt.id);
    setEditName(jt.name);
    setEditVatBandId(jt.vat_band_id || "");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Job Types</h1>
        <p className="text-muted-foreground text-sm">Manage job types for your service provider. These will be available when setting menu prices.</p>

        {/* Add new */}
        <Card>
          <CardHeader><CardTitle className="text-base">Add Job Type</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. MOT" />
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
              <Button onClick={handleAdd} disabled={createJobType.isPending} className="h-10">
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
            ) : !jobTypes?.length ? (
              <div className="p-6 text-center text-muted-foreground">No job types yet. Add your first one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>VAT Band</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobTypes.map((jt) => {
                    const isEditing = editingId === jt.id;
                    const vatBand = vatBands?.find((vb) => vb.id === jt.vat_band_id);

                    return (
                      <TableRow key={jt.id}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus />
                          ) : jt.name}
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
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(jt.id)}>
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(jt)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteJobType.mutate(jt.id)}>
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
