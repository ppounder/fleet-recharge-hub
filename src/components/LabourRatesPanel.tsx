import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLabourRates, useCreateLabourRate, useUpdateLabourRate, useDeleteLabourRate } from "@/hooks/useLabourRates";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface LabourRatesPanelProps {
  providerId: string;
  fleetId: string;
}

export function LabourRatesPanel({ providerId, fleetId }: LabourRatesPanelProps) {
  const { toast } = useToast();
  const { data: rates, isLoading } = useLabourRates(providerId, fleetId);
  const createRate = useCreateLabourRate();
  const updateRate = useUpdateLabourRate();
  const deleteRate = useDeleteLabourRate();

  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newDefault, setNewDefault] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editDefault, setEditDefault] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || !newCost) {
      toast({ title: "Missing fields", description: "Name and cost are required", variant: "destructive" });
      return;
    }
    try {
      await createRate.mutateAsync({
        provider_id: providerId,
        fleet_id: fleetId,
        name: newName.trim(),
        cost: Number(newCost),
        is_default: newDefault,
      });
      toast({ title: "Labour rate added" });
      setNewName("");
      setNewCost("");
      setNewDefault(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (rate: typeof rates extends (infer T)[] ? T : never) => {
    setEditId(rate.id);
    setEditName(rate.name);
    setEditCost(String(rate.cost));
    setEditDefault(rate.is_default);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editName.trim() || !editCost) return;
    try {
      await updateRate.mutateAsync({
        id: editId,
        name: editName.trim(),
        cost: Number(editCost),
        is_default: editDefault,
      });
      toast({ title: "Labour rate updated" });
      setEditId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Labour Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_120px_80px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. Standard Rate" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost (£) *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={newCost} onChange={(e) => setNewCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default</Label>
              <div className="flex items-center h-10">
                <Switch checked={newDefault} onCheckedChange={setNewDefault} />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={createRate.isPending} className="h-10">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rates table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : !rates?.length ? (
            <div className="p-6 text-center text-muted-foreground">No labour rates yet. Add your first rate above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cost (£)</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    {editId === rate.id ? (
                      <>
                        <TableCell>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" min="0" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="h-8 w-24" />
                        </TableCell>
                        <TableCell>
                          <Switch checked={editDefault} onCheckedChange={setEditDefault} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell>£{Number(rate.cost).toFixed(2)}</TableCell>
                        <TableCell>
                          {rate.is_default && <Badge variant="default">Default</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(rate)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteRate.mutate(rate.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
