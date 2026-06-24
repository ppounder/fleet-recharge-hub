import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface TyreReadingsHistoryProps {
  vehicleId: string;
  wheelPlan: string;
  assetType?: string;
}

interface TyreReading {
  id: string;
  vehicle_id: string;
  position: string;
  tyre_code: string | null;
  tread_depth: number;
  reading_date: string;
}

function derivePositions(plan: string, assetType?: string): string[] {
  if (!plan) return [];
  const isTrailer = assetType === "Trailer";
  const twinRear = !isTrailer && (/\d+x\d+T\b/i.test(plan) || /Twin Rear/i.test(plan));

  let axles = 2;
  if (isTrailer) {
    if (/Quad/i.test(plan)) axles = 4;
    else if (/Tri/i.test(plan)) axles = 3;
    else if (/Twin/i.test(plan)) axles = 2;
    else axles = 1;
  } else {
    const m = plan.match(/(\d+)x(\d+)/);
    if (m) axles = Math.max(1, Math.round(parseInt(m[1], 10) / 2));
    else {
      const am = plan.match(/(\d+)-Axle/i);
      if (am) axles = parseInt(am[1], 10);
    }
  }

  const axleLabel = (i: number) => {
    if (axles === 2) return i === 0 ? "Front Axle" : "Rear Axle";
    if (i === 0) return "Front Axle";
    if (i === axles - 1) return "Rear Axle";
    return `Axle ${i + 1}`;
  };

  const out: string[] = [];
  for (let i = 0; i < axles; i++) {
    const label = axleLabel(i);
    const isRear = i === axles - 1;
    out.push(`${label} N/S Outer`);
    out.push(`${label} O/S Outer`);
    if (twinRear && isRear) {
      out.push(`${label} N/S Inner`);
      out.push(`${label} O/S Inner`);
    }
  }
  return out;
}

export function TyreReadingsHistory({ vehicleId, wheelPlan, assetType }: TyreReadingsHistoryProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ position: "", tyre_code: "", tread_depth: "", reading_date: new Date().toISOString().slice(0, 10) });

  const positions = useMemo(() => derivePositions(wheelPlan, assetType), [wheelPlan, assetType]);

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["tyre_readings", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyre_readings")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("reading_date", { ascending: false });
      if (error) throw error;
      return (data || []) as TyreReading[];
    },
    enabled: !!vehicleId,
  });

  // latest reading per position
  const latestByPosition = useMemo(() => {
    const map = new Map<string, TyreReading>();
    for (const r of readings) {
      const existing = map.get(r.position);
      if (!existing || r.reading_date > existing.reading_date) map.set(r.position, r);
    }
    return map;
  }, [readings]);

  const create = useMutation({
    mutationFn: async () => {
      const depth = parseFloat(form.tread_depth);
      if (!form.position) throw new Error("Position is required");
      if (Number.isNaN(depth)) throw new Error("Tread depth must be a number");
      const { error } = await supabase.from("tyre_readings").insert({
        vehicle_id: vehicleId,
        position: form.position,
        tyre_code: form.tyre_code || null,
        tread_depth: depth,
        reading_date: form.reading_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyre_readings", vehicleId] });
      setOpen(false);
      setForm({ position: "", tyre_code: "", tread_depth: "", reading_date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Tyre reading added" });
    },
    onError: (e: any) => toast({ title: "Failed to add reading", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tyre_readings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tyre_readings", vehicleId] }),
  });

  const positionsToShow = positions.length
    ? positions
    : Array.from(new Set(readings.map((r) => r.position)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Latest tread depth (mm) for each wheel position.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!positions.length}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add reading
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-40">Latest Tread Depth</TableHead>
              <TableHead className="w-32">Last Reading</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            ) : positionsToShow.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Select a wheel plan to see tyre positions.
                </TableCell>
              </TableRow>
            ) : (
              positionsToShow.map((pos, idx) => {
                const latest = latestByPosition.get(pos);
                return (
                  <TableRow key={pos}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      {pos}
                      {latest?.tyre_code && (
                        <span className="text-muted-foreground"> ({latest.tyre_code})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {latest ? `${Number(latest.tread_depth).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {latest ? latest.reading_date : "—"}
                    </TableCell>
                    <TableCell>
                      {latest && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove.mutate(latest.id)}
                          aria-label="Delete latest reading"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tyre reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Select value={form.position} onValueChange={(v) => setForm((f) => ({ ...f, position: v }))}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tyre code (optional)</Label>
              <Input value={form.tyre_code} onChange={(e) => setForm((f) => ({ ...f, tyre_code: e.target.value }))} placeholder="e.g. YG65FFX.OSF1O-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tread depth (mm)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.tread_depth}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, tread_depth: v }));
                  }}
                  placeholder="8.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reading date</Label>
                <Input type="date" value={form.reading_date} onChange={(e) => setForm((f) => ({ ...f, reading_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
