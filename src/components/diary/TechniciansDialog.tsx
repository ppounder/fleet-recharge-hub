import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { useTechnicians, useUpsertTechnician, useDeleteTechnician } from "@/hooks/useDiary";

export function TechniciansDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: techs = [] } = useTechnicians();
  const upsert = useUpsertTechnician();
  const del = useDeleteTechnician();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [color, setColor] = useState("#f59e0b");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editColor, setEditColor] = useState("#f59e0b");

  const add = async () => {
    if (!first.trim() || !last.trim()) return;
    await upsert.mutateAsync({ first_name: first.trim(), last_name: last.trim(), color });
    setFirst(""); setLast("");
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditFirst(t.first_name);
    setEditLast(t.last_name);
    setEditColor(t.color);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editFirst.trim() || !editLast.trim()) return;
    await upsert.mutateAsync({ id, first_name: editFirst.trim(), last_name: editLast.trim(), color: editColor });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Technicians</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
            <div className="space-y-1.5"><Label>First name *</Label><Input value={first} onChange={e => setFirst(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Last name *</Label><Input value={last} onChange={e => setLast(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Colour</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-10 p-1" /></div>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Colour</TableHead><TableHead>Name</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {techs.map(t => {
                const isEditing = editingId === t.id;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-12 h-8 p-1" />
                      ) : (
                        <span className="inline-block w-6 h-6 rounded-full" style={{ background: t.color }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input value={editFirst} onChange={e => setEditFirst(e.target.value)} className="h-8" />
                          <Input value={editLast} onChange={e => setEditLast(e.target.value)} className="h-8" />
                        </div>
                      ) : (
                        <>{t.first_name} {t.last_name}</>
                      )}
                    </TableCell>
                    <TableCell><Switch checked={t.active} onCheckedChange={(v) => upsert.mutate({ id: t.id, active: v })} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(t.id)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Save</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancel</TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(t)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit technician</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                  onClick={() => del.mutate(t.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete technician</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
