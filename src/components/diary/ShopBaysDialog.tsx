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
import { useBays, useUpsertBay, useDeleteBay } from "@/hooks/useDiary";
import { useToast } from "@/hooks/use-toast";

const MAX_BAYS = 6;

export function ShopBaysDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: bays = [] } = useBays();
  const upsert = useUpsertBay();
  const del = useDeleteBay();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const sorted = [...bays].sort((a, b) => a.sort_order - b.sort_order);

  const add = async () => {
    if (!name.trim()) {
      toast({ title: "Bay name is required", variant: "destructive" });
      return;
    }
    if (bays.length >= MAX_BAYS) {
      toast({ title: `Maximum ${MAX_BAYS} bays allowed`, variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({ name: name.trim(), color, sort_order: bays.length, active: true });
      setName("");
      toast({ title: "Bay added" });
    } catch (e: any) {
      toast({ title: "Failed to add bay", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorder = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = sorted.map((b) => b.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    try {
      await Promise.all(
        ids.map((id, idx) => {
          const original = sorted.find((b) => b.id === id);
          if (!original || original.sort_order === idx) return Promise.resolve();
          return upsert.mutateAsync({ id, sort_order: idx });
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
      toast({ title: "Bay deleted" });
    } catch (e: any) {
      toast({ title: "Failed to delete bay", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Shop bays</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bay 4" />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
            </div>
            <Button onClick={add} disabled={bays.length >= MAX_BAYS}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <p className="text-xs text-muted-foreground">{bays.length} of {MAX_BAYS} bays</p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Order</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((b, i) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === sorted.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell><span className="inline-block w-6 h-6 rounded" style={{ background: b.color }} /></TableCell>
                  <TableCell>
                    <Input
                      defaultValue={b.name}
                      onBlur={(e) => e.target.value !== b.name && upsert.mutate({ id: b.id, name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch checked={b.active} onCheckedChange={(v) => upsert.mutate({ id: b.id, active: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete({ id: b.id, name: b.name })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Save</Button>
        </DialogFooter>


        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bay?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This cannot be undone and any appointments assigned to this bay will be unassigned.
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
