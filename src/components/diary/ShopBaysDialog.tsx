import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
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

  const add = async () => {
    if (!name.trim()) return;
    if (bays.length >= MAX_BAYS) {
      toast({ title: `Maximum ${MAX_BAYS} bays allowed`, variant: "destructive" });
      return;
    }
    await upsert.mutateAsync({ name: name.trim(), color, sort_order: bays.length });
    setName("");
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
                <TableHead>Colour</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bays.map(b => (
                <TableRow key={b.id}>
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
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(b.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
