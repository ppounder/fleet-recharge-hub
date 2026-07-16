import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { DeleteActionButton } from "@/components/ui/action-buttons";
import { useTechnicians, useUpsertTechnician, useDeleteTechnician } from "@/hooks/useDiary";

export function TechniciansDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: techs = [] } = useTechnicians();
  const upsert = useUpsertTechnician();
  const del = useDeleteTechnician();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [color, setColor] = useState("#f59e0b");

  const add = async () => {
    if (!first.trim() || !last.trim()) return;
    await upsert.mutateAsync({ first_name: first.trim(), last_name: last.trim(), color });
    setFirst(""); setLast("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Technicians</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
            <div className="space-y-1.5"><Label>First name</Label><Input value={first} onChange={e => setFirst(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Last name</Label><Input value={last} onChange={e => setLast(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Colour</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-10 p-1" /></div>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Colour</TableHead><TableHead>Name</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {techs.map(t => (
                <TableRow key={t.id}>
                  <TableCell><span className="inline-block w-6 h-6 rounded-full" style={{ background: t.color }} /></TableCell>
                  <TableCell>{t.first_name} {t.last_name}</TableCell>
                  <TableCell><Switch checked={t.active} onCheckedChange={(v) => upsert.mutate({ id: t.id, active: v })} /></TableCell>
                  <TableCell className="text-right">
                    <DeleteActionButton label="Delete technician" onClick={() => del.mutate(t.id)} />
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
