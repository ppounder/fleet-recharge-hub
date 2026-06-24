import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

type Reading = {
  id: string;
  vehicle_id: string;
  source: string | null;
  reading: number;
  unit: string;
  recorded_at: string;
};

const SOURCES = ["Manual", "Telematics", "Driver", "Supplier", "MOT", "Service", "Estimated"];
const UNITS = ["Miles", "Kms", "Hours"];

interface Props {
  vehicleId: string;
}

export function OdometerReadingsHistory({ vehicleId }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reading | null>(null);
  const [deleting, setDeleting] = useState<Reading | null>(null);

  const [source, setSource] = useState("");
  const [reading, setReading] = useState("");
  const [unit, setUnit] = useState("Miles");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(
    new Date().toTimeString().slice(0, 5),
  );

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["odometer_readings", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odometer_readings" as any)
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Reading[];
    },
    enabled: !!vehicleId,
  });

  const resetForm = () => {
    setSource("");
    setReading("");
    setUnit("Miles");
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    setTime(now.toTimeString().slice(0, 5));
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (r: Reading) => {
    setEditing(r);
    setSource(r.source || "");
    setReading(String(r.reading));
    setUnit(r.unit || "Miles");
    const d = new Date(r.recorded_at);
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!reading || !/^\d+$/.test(reading)) throw new Error("Reading must be a whole number");
      const recorded_at = new Date(`${date}T${time || "00:00"}:00`).toISOString();
      const payload: any = {
        vehicle_id: vehicleId,
        source: source || null,
        reading: Number(reading),
        unit,
        recorded_at,
        fleet_id: profile?.fleet_id ?? null,
      };
      if (editing) {
        const { error } = await supabase
          .from("odometer_readings" as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("odometer_readings" as any).insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odometer_readings", vehicleId] });
      toast({ title: editing ? "Reading updated" : "Reading added" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("odometer_readings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odometer_readings", vehicleId] });
      toast({ title: "Reading deleted" });
      setDeleting(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add odo reading
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Odometer reading</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>
            ) : readings.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No readings recorded</TableCell></TableRow>
            ) : (
              readings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.source || "—"}</TableCell>
                  <TableCell>{r.reading.toLocaleString()}</TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>{formatDateTime(r.recorded_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(r)} aria-label="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit odometer reading" : "Add odometer reading"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source || "__none__"} onValueChange={(v) => setSource(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <Label>Odometer reading</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={reading}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d+$/.test(v)) setReading(v);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete odometer reading?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
