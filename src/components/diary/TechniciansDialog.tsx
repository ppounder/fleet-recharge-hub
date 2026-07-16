import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useTechnicians, useUpsertTechnician, useDeleteTechnician } from "@/hooks/useDiary";
import { useToast } from "@/hooks/use-toast";

export function TechniciansDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: techs = [] } = useTechnicians();
  const upsert = useUpsertTechnician();
  const del = useDeleteTechnician();
  const { toast } = useToast();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const sorted = [...techs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const add = async () => {
    if (!first.trim() || !last.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        first_name: first.trim(),
        last_name: last.trim(),
        color,
        active: true,
        sort_order: techs.length,
      });
      setFirst("");
      setLast("");
      toast({ title: "Technician added" });
    } catch (e: any) {
      toast({ title: "Failed to add technician", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorder = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = sorted.map((t) => t.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    try {
      await Promise.all(
        ids.map((id, idx) => {
          const original = sorted.find((t) => t.id === id);
          if (!original || original.sort_order === idx) return Promise.resolve();
          return upsert.mutateAsync({
            id: original.id,
            first_name: original.first_name,
            last_name: original.last_name,
            color: original.color,
            active: original.active,
            sort_order: idx,
          });
        }),
      );
    } catch (e: any) {
      toast({ title: "Failed to reorder", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await del.mutateAsync(confirmDelete.id);
      toast({ title: "Technician deleted" });
    } catch (e: any) {
      toast({ title: "Failed to delete technician", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Technicians</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>First name *</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Joe" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Last name *</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Bloggs" />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
            </div>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <p className="text-xs text-muted-foreground">{techs.length} {techs.length === 1 ? "technician" : "technicians"}</p>

          <div className="rounded-md border bg-card divide-y">
            {sorted.map((t) => {
              const isOver = overId === t.id && dragId && dragId !== t.id;
              const fullName = `${t.first_name} ${t.last_name}`.trim();
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(t.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overId !== t.id) setOverId(t.id);
                  }}
                  onDragLeave={() => overId === t.id && setOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) reorder(dragId, t.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={`flex items-center gap-3 p-2 transition-colors ${
                    dragId === t.id ? "opacity-50" : ""
                  } ${isOver ? "bg-accent" : ""}`}
                >
                  <button
                    type="button"
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <Input
                    type="color"
                    defaultValue={t.color}
                    onBlur={(e) =>
                      e.target.value !== t.color &&
                      upsert.mutate({
                        id: t.id,
                        first_name: t.first_name,
                        last_name: t.last_name,
                        active: t.active,
                        sort_order: t.sort_order,
                        color: e.target.value,
                      })
                    }
                    className="w-10 h-8 p-1 shrink-0"
                  />
                  <Input
                    defaultValue={fullName}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v || v === fullName) return;
                      const [f, ...rest] = v.split(/\s+/);
                      const l = rest.join(" ") || "";
                      upsert.mutate({
                        id: t.id,
                        first_name: f,
                        last_name: l,
                        color: t.color,
                        active: t.active,
                        sort_order: t.sort_order,
                      });
                    }}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={t.active}
                      onCheckedChange={(v) =>
                        upsert.mutate({
                          id: t.id,
                          first_name: t.first_name,
                          last_name: t.last_name,
                          color: t.color,
                          sort_order: t.sort_order,
                          active: v,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete({ id: t.id, name: fullName })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Save</Button>
        </DialogFooter>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete technician?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This cannot be undone and any appointments assigned to this technician will be unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
