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
import { formatDateTime, cn } from "@/lib/utils";

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
  const { user, profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reading | null>(null);
  const [deleting, setDeleting] = useState<Reading | null>(null);
  const [confirmLower, setConfirmLower] = useState(false);

  const [source, setSource] = useState("");
  const [reading, setReading] = useState("");
  const [unit, setUnit] = useState("Miles");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [errors, setErrors] = useState<{ source?: string; reading?: string; unit?: string; date?: string; time?: string }>({});

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
    setErrors({});
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
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!source) next.source = "Source is required";
    if (!reading) next.reading = "Reading is required";
    else if (!/^\d+$/.test(reading)) next.reading = "Must be a whole number";
    else if (Number(reading) > 9999999) next.reading = "Reading is too large";
    if (!unit) next.unit = "Unit is required";
    if (!date) next.date = "Date is required";
    if (!time || !/^\d{2}:\d{2}$/.test(time)) next.time = "Valid time required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const recorded_at = new Date(`${date}T${time}:00`).toISOString();
      const payload: any = {
        vehicle_id: vehicleId,
        source,
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
      qc.invalidateQueries({ queryKey: ["vehicle-latest-odo-reading", vehicleId] });
      toast({ title: editing ? "Reading updated" : "Reading added" });
      setDialogOpen(false);
      resetForm();
    },

    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!validate()) return;
    // Check previous reading (exclude the one being edited)
    const prev = readings
      .filter((r) => !editing || r.id !== editing.id)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
    if (prev && Number(reading) < prev.reading) {
      setConfirmLower(true);
      return;
    }
    save.mutate();
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("odometer_readings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odometer_readings", vehicleId] });
      qc.invalidateQueries({ queryKey: ["vehicle-latest-odo-reading", vehicleId] });
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(r)}
                        aria-label="Edit reading"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(r)}
                        className="text-destructive hover:bg-destructive hover:text-white"
                        aria-label="Delete reading"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
              <Label htmlFor="odo_source">Source</Label>
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v);
                  if (errors.source) setErrors((e) => ({ ...e, source: undefined }));
                }}
              >
                <SelectTrigger
                  id="odo_source"
                  aria-invalid={!!errors.source}
                  className={cn(errors.source && "border-destructive focus:ring-destructive")}
                >
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="odo_reading">Odometer reading</Label>
                <Input
                  id="odo_reading"
                  type="text"
                  inputMode="numeric"
                  value={reading}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d+$/.test(v)) {
                      setReading(v);
                      if (errors.reading) setErrors((er) => ({ ...er, reading: undefined }));
                    }
                  }}
                  aria-invalid={!!errors.reading}
                  className={cn(errors.reading && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.reading && <p className="text-xs text-destructive">{errors.reading}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="odo_unit">Unit</Label>
                <Select
                  value={unit}
                  onValueChange={(v) => {
                    setUnit(v);
                    if (errors.unit) setErrors((e) => ({ ...e, unit: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="odo_unit"
                    aria-invalid={!!errors.unit}
                    className={cn(errors.unit && "border-destructive focus:ring-destructive")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="odo_date">Date</Label>
                <DatePicker
                  id="odo_date"
                  value={date}
                  onChange={(v) => {
                    setDate(v);
                    if (errors.date) setErrors((e) => ({ ...e, date: undefined }));
                  }}
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="odo_time">Time</Label>
                <Input
                  id="odo_time"
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    if (errors.time) setErrors((er) => ({ ...er, time: undefined }));
                  }}
                  aria-invalid={!!errors.time}
                  className={cn(errors.time && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>
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
