import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
  DialogDescription,
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
  pressure: number | null;
  pressure_unit: string | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const initialForm = { position: "", tyre_code: "", tread_depth: "", reading_date: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(initialForm);
  type FormErrors = Partial<Record<"position" | "tread_depth" | "reading_date", string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const readingSchema = z.object({
    position: z.string().trim().min(1, { message: "Position is required" }),
    tread_depth: z
      .string()
      .trim()
      .min(1, { message: "Tread depth is required" })
      .refine((v) => /^\d+(\.\d)?$/.test(v), { message: "Enter a number with up to 1 decimal" })
      .refine((v) => {
        const n = parseFloat(v);
        return n >= 0 && n <= 30;
      }, { message: "Tread depth must be between 0 and 30 mm" }),
    reading_date: z
      .string()
      .min(1, { message: "Reading date is required" })
      .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Enter a valid date" }),
  });

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };


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
    mutationFn: async (parsed: z.infer<typeof readingSchema>) => {
      const { error } = await supabase.from("tyre_readings").insert({
        vehicle_id: vehicleId,
        position: parsed.position,
        tyre_code: form.tyre_code.trim() || null,
        tread_depth: parseFloat(parsed.tread_depth),
        reading_date: parsed.reading_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyre_readings", vehicleId] });
      setOpen(false);
      setEditingId(null);
      setForm(initialForm);
      setErrors({});
      toast({ title: "Tyre reading added" });
    },
    onError: (e: any) => toast({ title: "Failed to add reading", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, parsed }: { id: string; parsed: z.infer<typeof readingSchema> }) => {
      const { error } = await supabase.from("tyre_readings").update({
        position: parsed.position,
        tyre_code: form.tyre_code.trim() || null,
        tread_depth: parseFloat(parsed.tread_depth),
        reading_date: parsed.reading_date,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyre_readings", vehicleId] });
      setOpen(false);
      setEditingId(null);
      setForm(initialForm);
      setErrors({});
      toast({ title: "Tyre reading updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update reading", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const result = readingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({
        title: "Please fix the errors below",
        description: "Some fields are invalid.",
        variant: "destructive",
      });
      return;
    }
    setErrors({});
    if (editingId) update.mutate({ id: editingId, parsed: result.data });
    else create.mutate(result.data);
  };

  const startEdit = (r: TyreReading) => {
    setEditingId(r.id);
    setForm({
      position: r.position,
      tyre_code: r.tyre_code ?? "",
      tread_depth: Number(r.tread_depth).toFixed(1),
      reading_date: r.reading_date,
    });
    setErrors({});
    setOpen(true);
  };



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
              <TableHead className="w-32">Date taken</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
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
                      {latest ? `${Number(latest.tread_depth).toFixed(1)} mm` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {latest ? format(parseISO(latest.reading_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {latest && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(latest)}
                            disabled={remove.isPending}
                            aria-label="Edit latest reading"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove.mutate(latest.id)}
                            disabled={remove.isPending}
                            className={cn("text-destructive hover:bg-destructive hover:text-white")}
                            aria-label="Delete latest reading"
                          >
                            {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditingId(null);
            setForm(initialForm);
            setErrors({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit tyre reading" : "Add tyre reading"}</DialogTitle>
            <DialogDescription>Record the latest tread depth for a wheel position.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Select
                value={form.position}
                onValueChange={(v) => updateField("position", v)}
              >
                <SelectTrigger
                  id="position"
                  aria-invalid={!!errors.position}
                  aria-describedby={errors.position ? "position-error" : undefined}
                  className={cn(errors.position && "border-destructive focus-visible:ring-destructive")}
                >
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position && (
                <p id="position-error" className="text-xs text-destructive">{errors.position}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tyre_code">Tyre condition</Label>
              <Input
                id="tyre_code"
                value={form.tyre_code}
                onChange={(e) => setForm((f) => ({ ...f, tyre_code: e.target.value }))}
                placeholder="e.g. YG65FFX.OSF1O-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tread_depth">Tread depth (mm)</Label>
                <Input
                  id="tread_depth"
                  type="text"
                  inputMode="decimal"
                  value={form.tread_depth}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d?$/.test(v)) updateField("tread_depth", v);
                  }}
                  aria-invalid={!!errors.tread_depth}
                  aria-describedby={errors.tread_depth ? "tread_depth-error" : undefined}
                  className={cn(errors.tread_depth && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.tread_depth && (
                  <p id="tread_depth-error" className="text-xs text-destructive">{errors.tread_depth}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reading_date">Date taken</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="reading_date"
                      type="button"
                      variant="outline"
                      aria-invalid={!!errors.reading_date}
                      aria-describedby={errors.reading_date ? "reading_date-error" : undefined}
                      className={cn(
                        "w-full justify-between font-normal",
                        !form.reading_date && "text-muted-foreground",
                        errors.reading_date && "border-destructive focus-visible:ring-destructive"
                      )}
                    >
                      <span>
                        {form.reading_date
                          ? format(parseISO(form.reading_date), "dd MMM yyyy")
                          : "Pick a date"}
                      </span>
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.reading_date ? parseISO(form.reading_date) : undefined}
                      onSelect={(d) =>
                        updateField("reading_date", d ? format(d, "yyyy-MM-dd") : "")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.reading_date && (
                  <p id="reading_date-error" className="text-xs text-destructive">{errors.reading_date}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
