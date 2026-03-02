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
import { useJobTypes } from "@/hooks/useJobTypes";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface MenuPricesPanelProps {
  providerId: string;
  fleetId: string;
}

export function MenuPricesPanel({ providerId, fleetId }: MenuPricesPanelProps) {
  const { toast } = useToast();
  const { data: menuItems, isLoading } = useMenuItemsByProviderAndFleet(providerId, fleetId);
  const { data: jobTypes } = useJobTypes(providerId);
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const updateItem = useUpdateMenuItem();

  const [newJobType, setNewJobType] = useState("");
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
        description: newDescription || jobTypes?.find((j) => j.id === newJobType)?.name || newJobType,
        unit_price: Number(newPrice),
      });
      toast({ title: "Menu price added" });
      setNewJobType("");
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
                  {jobTypes?.map((jt) => (
                    <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
                  ))}
                  {!jobTypes?.length && (
                    <SelectItem value="none" disabled>No job types — add them in Settings</SelectItem>
                  )}
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
                  const jobLabel = jobTypes?.find((j) => j.id === item.job_type)?.name || item.job_type;
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
