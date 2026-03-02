import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMenuItemsByProviderAndFleet,
  useCreateMenuItem,
  useDeleteMenuItem,
  useUpdateMenuItem,
} from "@/hooks/useMenuItems";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const JOB_TYPES = [
  { value: "mot", label: "MOT" },
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "tyres", label: "Tyres" },
  { value: "bodywork", label: "Bodywork" },
];

interface MenuPricesPanelProps {
  providerId: string;
  fleetId: string;
}

export function MenuPricesPanel({ providerId, fleetId }: MenuPricesPanelProps) {
  const { toast } = useToast();
  const { data: menuItems, isLoading } = useMenuItemsByProviderAndFleet(providerId, fleetId);
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const updateItem = useUpdateMenuItem();

  const [newJobType, setNewJobType] = useState("mot");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleAdd = async () => {
    if (!newPrice) {
      toast({ title: "Missing fields", description: "Please enter a price", variant: "destructive" });
      return;
    }
    try {
      await createItem.mutateAsync({
        provider_id: providerId,
        fleet_id: fleetId,
        job_type: newJobType,
        description: newDescription || JOB_TYPES.find((j) => j.value === newJobType)?.label || newJobType,
        unit_price: Number(newPrice),
      });
      toast({ title: "Menu price added" });
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

  return (
    <div className="space-y-4">
      {/* Add new price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Agreed Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Job Type *</Label>
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

      {/* Prices table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : !menuItems?.length ? (
            <div className="p-6 text-center text-muted-foreground">No menu prices yet. Add your first agreed price above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Agreed Price</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => {
                  const jobLabel = JOB_TYPES.find((j) => j.value === item.job_type)?.label || item.job_type;
                  const isEditing = editingId === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="capitalize font-medium">{jobLabel}</TableCell>
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
  );
}
