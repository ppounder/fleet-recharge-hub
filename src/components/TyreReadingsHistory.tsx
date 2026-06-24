import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, Loader2, Wrench, ArrowLeftRight } from "lucide-react";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";

interface TyreReadingsHistoryProps {
  vehicleId: string;
  wheelPlan: string;
  assetType?: string;
  section?: "details" | "readings" | "both";
}

interface TyreReading {
  id: string;
  vehicle_id: string;
  position: string;
  tyre_code: string | null;
  tread_depth: number;
  tread_outer: number | null;
  tread_centre: number | null;
  tread_inner: number | null;
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

interface Tyre {
  id: string;
  vehicle_id: string;
  position: string;
  manufacturer: string;
  tyre_size: string;
  serial_number: string;
  manufacture_date: string | null;
  fitted_date: string;
  disposed_at: string | null;
}

function dotToManufactureDate(serial: string): string | null {
  const last4 = (serial || "").replace(/\s+/g, "").slice(-4);
  if (!/^\d{4}$/.test(last4)) return null;
  const ww = parseInt(last4.slice(0, 2), 10);
  const yy = parseInt(last4.slice(2, 4), 10);
  if (ww < 1 || ww > 53) return null;
  return `Week ${String(ww).padStart(2, "0")} / 20${String(yy).padStart(2, "0")}`;
}

const TYRE_MANUFACTURERS = [
  "Avon",
  "BFGoodrich",
  "Bridgestone",
  "Continental",
  "Cooper",
  "Dunlop",
  "Falken",
  "Firestone",
  "General Tire",
  "Goodyear",
  "Hankook",
  "Kumho",
  "Maxxis",
  "Michelin",
  "Nexen",
  "Nokian",
  "Pirelli",
  "Toyo",
  "Vredestein",
  "Yokohama",
];
const OTHER_MANUFACTURER = "Other";

export function TyreReadingsHistory({ vehicleId, wheelPlan, assetType, section = "both" }: TyreReadingsHistoryProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const initialForm = { position: "", tyre_code: "", tread_outer: "", tread_centre: "", tread_inner: "", pressure: "", pressure_unit: "psi", reading_date: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(initialForm);
  type FormErrors = Partial<Record<"position" | "tyre_code" | "tread_outer" | "tread_centre" | "tread_inner" | "pressure" | "reading_date", string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const treadOptional = z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+(\.\d)?$/.test(v), { message: "Enter a number with up to 1 decimal" })
    .refine((v) => v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 30), { message: "Must be between 0 and 30 mm" });

  const readingSchema = z.object({
    position: z.string().trim().min(1, { message: "Position is required" }),
    tyre_code: z.string().trim().min(1, { message: "Tyre condition is required" }),
    tread_outer: treadOptional,
    tread_centre: z
      .string()
      .trim()
      .min(1, { message: "Centre tread depth is required" })
      .refine((v) => /^\d+(\.\d)?$/.test(v), { message: "Enter a number with up to 1 decimal" })
      .refine((v) => {
        const n = parseFloat(v);
        return n >= 0 && n <= 30;
      }, { message: "Must be between 0 and 30 mm" }),
    tread_inner: treadOptional,
    pressure: z
      .string()
      .trim()
      .min(1, { message: "Pressure is required" })
      .refine(
        (v) => form.pressure_unit === "bar" ? /^\d+(\.\d)?$/.test(v) : /^\d+$/.test(v),
        { message: form.pressure_unit === "bar" ? "Enter a number with up to 1 decimal" : "Enter a whole number" }
      )
      .refine((v) => {
        const n = parseFloat(v);
        return form.pressure_unit === "bar" ? n >= 0 && n <= 20 : n >= 0 && n <= 200;
      }, { message: form.pressure_unit === "bar" ? "Pressure must be between 0 and 20 bar" : "Pressure must be between 0 and 200 psi" }),
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

  // ---------- Tyre details (fitted tyres) ----------
  const { data: tyres = [], isLoading: tyresLoading } = useQuery({
    queryKey: ["tyres", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyres")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .is("disposed_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as Tyre[];
    },
    enabled: !!vehicleId,
  });

  const activeTyrePositions = useMemo(() => new Set(tyres.map((t) => t.position)), [tyres]);

  const initialTyreForm = {
    position: "",
    manufacturer: "",
    tyre_size: "",
    serial_number: "",
    fitted_date: new Date().toISOString().slice(0, 10),
  };
  const [tyreOpen, setTyreOpen] = useState(false);
  const [tyreEditingId, setTyreEditingId] = useState<string | null>(null);
  const [tyreForm, setTyreForm] = useState(initialTyreForm);
  type TyreErrors = Partial<Record<keyof typeof initialTyreForm, string>>;
  const [tyreErrors, setTyreErrors] = useState<TyreErrors>({});
  const [manufacturerIsOther, setManufacturerIsOther] = useState(false);

  const updateTyreField = <K extends keyof typeof initialTyreForm>(key: K, value: string) => {
    setTyreForm((prev) => ({ ...prev, [key]: value }));
    if (tyreErrors[key]) setTyreErrors((p) => ({ ...p, [key]: undefined }));
  };

  const resetTyreForm = () => {
    setTyreForm(initialTyreForm);
    setTyreEditingId(null);
    setTyreErrors({});
    setManufacturerIsOther(false);
  };

  const tyreSchema = z.object({
    position: z.string().trim().min(1, "Position is required"),
    manufacturer: z.string().trim().min(1, "Manufacturer is required"),
    tyre_size: z.string().trim().min(1, "Tyre size is required"),
    serial_number: z.string().trim().min(1, "Serial number is required"),
    fitted_date: z.string().min(1, "Date is required").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  });

  const saveTyre = useMutation({
    mutationFn: async (parsed: z.infer<typeof tyreSchema>) => {
      const payload = {
        vehicle_id: vehicleId,
        position: parsed.position,
        manufacturer: parsed.manufacturer,
        tyre_size: parsed.tyre_size,
        serial_number: parsed.serial_number,
        manufacture_date: dotToManufactureDate(parsed.serial_number),
        fitted_date: parsed.fitted_date,
      };
      if (tyreEditingId) {
        const { error } = await supabase.from("tyres").update(payload).eq("id", tyreEditingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tyres").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyres", vehicleId] });
      setTyreOpen(false);
      resetTyreForm();
      toast({ title: tyreEditingId ? "Tyre updated" : "Tyre added" });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to save tyre",
        description: e.message?.includes("tyres_active_position_unique")
          ? "This position already has an active tyre."
          : e.message,
        variant: "destructive",
      }),
  });

  const handleSaveTyre = () => {
    const result = tyreSchema.safeParse(tyreForm);
    if (!result.success) {
      const errs: TyreErrors = {};
      for (const i of result.error.issues) {
        const k = i.path[0] as keyof TyreErrors;
        if (k && !errs[k]) errs[k] = i.message;
      }
      setTyreErrors(errs);
      return;
    }
    saveTyre.mutate(result.data);
  };

  const startEditTyre = (t: Tyre) => {
    setTyreEditingId(t.id);
    setTyreForm({
      position: t.position,
      manufacturer: t.manufacturer,
      tyre_size: t.tyre_size,
      serial_number: t.serial_number,
      fitted_date: t.fitted_date,
    });
    setTyreErrors({});
    setManufacturerIsOther(!!t.manufacturer && !TYRE_MANUFACTURERS.includes(t.manufacturer));
    setTyreOpen(true);
  };

  const availableTyrePositions = useMemo(
    () => positions.filter((p) => !activeTyrePositions.has(p) || p === tyreForm.position),
    [positions, activeTyrePositions, tyreForm.position],
  );

  const create = useMutation({
    mutationFn: async (parsed: z.infer<typeof readingSchema>) => {
      const { error } = await supabase.from("tyre_readings").insert({
        vehicle_id: vehicleId,
        position: parsed.position,
        tyre_code: form.tyre_code.trim() || null,
        tread_depth: parseFloat(parsed.tread_centre),
        tread_outer: parsed.tread_outer ? parseFloat(parsed.tread_outer) : null,
        tread_centre: parseFloat(parsed.tread_centre),
        tread_inner: parsed.tread_inner ? parseFloat(parsed.tread_inner) : null,
        pressure: parsed.pressure ? parseFloat(parsed.pressure) : null,
        pressure_unit: parsed.pressure ? form.pressure_unit : null,
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
        tread_depth: parseFloat(parsed.tread_centre),
        tread_outer: parsed.tread_outer ? parseFloat(parsed.tread_outer) : null,
        tread_centre: parseFloat(parsed.tread_centre),
        tread_inner: parsed.tread_inner ? parseFloat(parsed.tread_inner) : null,
        pressure: parsed.pressure ? parseFloat(parsed.pressure) : null,
        pressure_unit: parsed.pressure ? form.pressure_unit : null,
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
      tread_outer: r.tread_outer != null ? Number(r.tread_outer).toFixed(1) : "",
      tread_centre: r.tread_centre != null ? Number(r.tread_centre).toFixed(1) : Number(r.tread_depth).toFixed(1),
      tread_inner: r.tread_inner != null ? Number(r.tread_inner).toFixed(1) : "",
      pressure: r.pressure != null ? Number(r.pressure).toFixed(1) : "",
      pressure_unit: (r.pressure_unit ?? "psi").toLowerCase(),
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

  // ----- Dispose tyre dialog state -----
  const initialDisposeForm = {
    position: "",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  };
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false,
    message: "",
    onConfirm: () => {},
  });
  const askConfirm = (message: string, onConfirm: () => void) =>
    setConfirm({ open: true, message, onConfirm });
  const [disposeForm, setDisposeForm] = useState(initialDisposeForm);
  type DisposeErrors = Partial<Record<"position" | "date" | "time", string>>;
  const [disposeErrors, setDisposeErrors] = useState<DisposeErrors>({});

  const dispose = useMutation({
    mutationFn: async (payload: { vehicle_id: string; position: string; disposed_at: string }) => {
      const { error } = await supabase.from("tyre_disposals").insert(payload);
      if (error) throw error;
      // Mark the active tyre at that position as disposed so it's removed from the active view.
      const { error: updErr } = await supabase
        .from("tyres")
        .update({ disposed_at: payload.disposed_at })
        .eq("vehicle_id", payload.vehicle_id)
        .eq("position", payload.position)
        .is("disposed_at", null);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyre_disposals", vehicleId] });
      qc.invalidateQueries({ queryKey: ["tyres", vehicleId] });
      setDisposeOpen(false);
      setDisposeForm(initialDisposeForm);
      setDisposeErrors({});
      toast({ title: "Tyre disposed" });
    },
    onError: (e: any) => toast({ title: "Failed to dispose tyre", description: e.message, variant: "destructive" }),
  });

  const startDispose = (position?: string) => {
    setDisposeForm({ ...initialDisposeForm, position: position ?? "" });
    setDisposeErrors({});
    setDisposeOpen(true);
  };

  const handleDispose = () => {
    const errs: DisposeErrors = {};
    if (!disposeForm.position) errs.position = "Position is required";
    if (!disposeForm.date) errs.date = "Date is required";
    if (!disposeForm.time) errs.time = "Time is required";
    if (Object.keys(errs).length) {
      setDisposeErrors(errs);
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }
    setDisposeErrors({});
    const iso = new Date(`${disposeForm.date}T${disposeForm.time}`).toISOString();
    dispose.mutate({ vehicle_id: vehicleId, position: disposeForm.position, disposed_at: iso });
  };

  // ----- Change tyre position dialog state -----
  const initialChangePosForm = {
    tyre_id: "",
    from_position: "",
    to_position: "",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    notes: "",
  };
  const [changePosOpen, setChangePosOpen] = useState(false);
  const [changePosForm, setChangePosForm] = useState(initialChangePosForm);
  type ChangePosErrors = Partial<Record<"to_position" | "date" | "time", string>>;
  const [changePosErrors, setChangePosErrors] = useState<ChangePosErrors>({});

  const changePosition = useMutation({
    mutationFn: async (payload: {
      tyre_id: string;
      vehicle_id: string;
      from_position: string;
      to_position: string;
      changed_at: string;
      notes: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Find any active tyre currently sitting at the target position (swap scenario).
      const { data: occupant, error: occErr } = await supabase
        .from("tyres")
        .select("id")
        .eq("vehicle_id", payload.vehicle_id)
        .eq("position", payload.to_position)
        .is("disposed_at", null)
        .maybeSingle();
      if (occErr) throw occErr;

      // History entry for the primary move.
      const { error: histErr } = await supabase.from("tyre_position_changes").insert({
        tyre_id: payload.tyre_id,
        vehicle_id: payload.vehicle_id,
        from_position: payload.from_position,
        to_position: payload.to_position,
        changed_at: payload.changed_at,
        notes: payload.notes,
        created_by: user?.id ?? null,
      });
      if (histErr) throw histErr;

      if (occupant && occupant.id !== payload.tyre_id) {
        // Swap: park the occupant on a unique sentinel position to avoid the
        // active-position unique index, move source to target, then place
        // the occupant on the source position.
        const sentinel = `__swap__${occupant.id}`;
        const { error: e1 } = await supabase.from("tyres").update({ position: sentinel }).eq("id", occupant.id);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("tyres").update({ position: payload.to_position }).eq("id", payload.tyre_id);
        if (e2) throw e2;
        const { error: e3 } = await supabase.from("tyres").update({ position: payload.from_position }).eq("id", occupant.id);
        if (e3) throw e3;
        // Log the swapped tyre's move too.
        await supabase.from("tyre_position_changes").insert({
          tyre_id: occupant.id,
          vehicle_id: payload.vehicle_id,
          from_position: payload.to_position,
          to_position: payload.from_position,
          changed_at: payload.changed_at,
          notes: payload.notes ? `Swap with ${payload.from_position}: ${payload.notes}` : `Swap with ${payload.from_position}`,
          created_by: user?.id ?? null,
        });
      } else {
        const { error: updErr } = await supabase
          .from("tyres")
          .update({ position: payload.to_position })
          .eq("id", payload.tyre_id);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tyres", vehicleId] });
      qc.invalidateQueries({ queryKey: ["tyre_position_changes", vehicleId] });
      setChangePosOpen(false);
      setChangePosForm(initialChangePosForm);
      setChangePosErrors({});
      toast({ title: "Tyre position changed" });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to change tyre position",
        description: e.message?.includes("tyres_active_position_unique")
          ? "That position already has an active tyre."
          : e.message,
        variant: "destructive",
      }),
  });

  const startChangePosition = (t: Tyre) => {
    setChangePosForm({
      ...initialChangePosForm,
      tyre_id: t.id,
      from_position: t.position,
    });
    setChangePosErrors({});
    setChangePosOpen(true);
  };

  const handleChangePosition = () => {
    const errs: ChangePosErrors = {};
    if (!changePosForm.to_position) errs.to_position = "New position is required";
    if (changePosForm.to_position === changePosForm.from_position) errs.to_position = "Choose a different position";
    if (!changePosForm.date) errs.date = "Date is required";
    if (!changePosForm.time) errs.time = "Time is required";
    if (Object.keys(errs).length) {
      setChangePosErrors(errs);
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }
    const iso = new Date(`${changePosForm.date}T${changePosForm.time}`).toISOString();
    changePosition.mutate({
      tyre_id: changePosForm.tyre_id,
      vehicle_id: vehicleId,
      from_position: changePosForm.from_position,
      to_position: changePosForm.to_position,
      changed_at: iso,
      notes: changePosForm.notes.trim() || null,
    });
  };

  const availableChangeTargets = useMemo(
    () => positions.filter((p) => p !== changePosForm.from_position),
    [positions, changePosForm.from_position],
  );
  const targetIsOccupied = useMemo(
    () =>
      !!changePosForm.to_position &&
      changePosForm.to_position !== changePosForm.from_position &&
      activeTyrePositions.has(changePosForm.to_position),
    [activeTyrePositions, changePosForm.to_position, changePosForm.from_position],
  );

  return (
    <div className="space-y-8">
      {section !== "readings" && (<>
      {/* ============ Tyre details section ============ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Fitted tyres per wheel position.</p>
          </div>
          <Button
            size="sm"
            onClick={() => { resetTyreForm(); setTyreOpen(true); }}
            disabled={!positions.length || availableTyrePositions.length === 0}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add tyre
          </Button>
        </div>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Tyre position</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Tyre size</TableHead>
                <TableHead>Serial number</TableHead>
                <TableHead>Manufacture date</TableHead>
                <TableHead>Date fitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tyresLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : positions.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No tyre positions for this wheel plan.</TableCell></TableRow>
              ) : (
                positions.map((pos, idx) => {
                  const t = tyres.find((x) => x.position === pos);
                  return (
                    <TableRow key={pos}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{pos}</TableCell>
                      <TableCell>{t?.manufacturer ?? "—"}</TableCell>
                      <TableCell>{t?.tyre_size ?? "—"}</TableCell>
                      <TableCell>{t?.serial_number ?? "—"}</TableCell>
                      <TableCell>{t?.manufacture_date ?? "—"}</TableCell>
                      <TableCell>{t ? format(parseISO(t.fitted_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {t ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => startEditTyre(t)} aria-label="Edit tyre" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startChangePosition(t)}
                                aria-label="Change tyre position"
                                title="Change tyre position"
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => askConfirm("Are you sure you want to delete?", () => startDispose(t.position))}
                                className="text-destructive hover:bg-destructive hover:text-white"
                                aria-label="Dispose tyre"
                                title="Delete"

                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { resetTyreForm(); setTyreForm((f) => ({ ...f, position: pos })); setTyreOpen(true); }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      </>)}

      {section !== "details" && (<>
      {/* ============ Tyre readings section ============ */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Latest tread depth (mm) for each wheel position.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditingId(null); setForm(initialForm); setErrors({}); setOpen(true); }} disabled={!positions.length}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add reading
          </Button>
        </div>
      </div>


      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Tyre position</TableHead>
              <TableHead className="w-40">Latest Tread Depth</TableHead>
              <TableHead className="w-32">Pressure</TableHead>
              <TableHead className="w-32">Date taken</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            ) : positionsToShow.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
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
                    <TableCell>
                      {latest?.pressure != null
                        ? `${Number(latest.pressure).toFixed(latest.pressure_unit === "bar" ? 1 : 0)} ${latest.pressure_unit ?? ""}`.trim()
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {latest ? format(parseISO(latest.reading_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {latest ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(latest)}
                              disabled={remove.isPending}
                              aria-label="Edit latest reading"
                              title="Edit"

                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => askConfirm("Are you sure you want to delete?", () => remove.mutate(latest.id))}
                              disabled={remove.isPending}
                              className={cn("text-destructive hover:bg-destructive hover:text-white")}
                              aria-label="Delete latest reading"
                              title="Delete"

                            >
                              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingId(null); setForm({ ...initialForm, position: pos }); setErrors({}); setOpen(true); }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      </>)}

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
              <Label htmlFor="position">Tyre position</Label>
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
                onChange={(e) => updateField("tyre_code", e.target.value)}
                aria-invalid={!!errors.tyre_code}
                aria-describedby={errors.tyre_code ? "tyre_code-error" : undefined}
                className={cn(errors.tyre_code && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.tyre_code && (
                <p id="tyre_code-error" className="text-xs text-destructive">{errors.tyre_code}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tread depth (mm)</Label>
                <div className="space-y-2">
                  {([
                    { key: "tread_outer", label: "Outer" },
                    { key: "tread_centre", label: "Centre" },
                    { key: "tread_inner", label: "Inner" },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <Label htmlFor={key} className="text-xs text-muted-foreground font-normal">{label}</Label>
                      <div>
                        <Input
                          id={key}
                          type="text"
                          inputMode="decimal"
                          value={form[key]}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d?$/.test(v)) updateField(key, v);
                          }}
                          aria-invalid={!!errors[key]}
                          aria-describedby={errors[key] ? `${key}-error` : undefined}
                          className={cn(errors[key] && "border-destructive focus-visible:ring-destructive")}
                        />
                        {errors[key] && (
                          <p id={`${key}-error`} className="text-xs text-destructive mt-1">{errors[key]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pressure">Pressure</Label>
                <div className="flex gap-2">
                  <Input
                    id="pressure"
                    type="text"
                    inputMode="decimal"
                    value={form.pressure}
                    onChange={(e) => {
                      const v = e.target.value;
                      const re = form.pressure_unit === "bar" ? /^\d*\.?\d?$/ : /^\d*$/;
                      if (v === "" || re.test(v)) updateField("pressure", v);
                    }}
                    aria-invalid={!!errors.pressure}
                    aria-describedby={errors.pressure ? "pressure-error" : undefined}
                    className={cn("flex-1", errors.pressure && "border-destructive focus-visible:ring-destructive")}
                    placeholder="e.g. 110"
                  />
                  <Select
                    value={form.pressure_unit}
                    onValueChange={(v) => {
                      updateField("pressure_unit", v);
                      if (v === "psi" && form.pressure) {
                        updateField("pressure", String(Math.round(parseFloat(form.pressure))));
                      }
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psi">psi</SelectItem>
                      <SelectItem value="bar">bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.pressure && (
                  <p id="pressure-error" className="text-xs text-destructive">{errors.pressure}</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-2">
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

      <Dialog
        open={disposeOpen}
        onOpenChange={(next) => {
          setDisposeOpen(next);
          if (!next) {
            setDisposeForm(initialDisposeForm);
            setDisposeErrors({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose tyre</DialogTitle>
            <DialogDescription>Record that a tyre has been removed from a wheel position.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dispose_position">Tyre position</Label>
              <Select
                value={disposeForm.position}
                onValueChange={(v) => {
                  setDisposeForm((f) => ({ ...f, position: v }));
                  if (disposeErrors.position) setDisposeErrors((e) => ({ ...e, position: undefined }));
                }}
              >
                <SelectTrigger
                  id="dispose_position"
                  aria-invalid={!!disposeErrors.position}
                  className={cn(disposeErrors.position && "border-destructive focus-visible:ring-destructive")}
                >
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(activeTyrePositions).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {disposeErrors.position && (
                <p className="text-xs text-destructive">{disposeErrors.position}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dispose_date">Disposal date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dispose_date"
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between font-normal",
                        !disposeForm.date && "text-muted-foreground",
                        disposeErrors.date && "border-destructive focus-visible:ring-destructive"
                      )}
                    >
                      <span>
                        {disposeForm.date
                          ? format(parseISO(disposeForm.date), "dd MMM yyyy")
                          : "Pick a date"}
                      </span>
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={disposeForm.date ? parseISO(disposeForm.date) : undefined}
                      onSelect={(d) =>
                        setDisposeForm((f) => ({ ...f, date: d ? format(d, "yyyy-MM-dd") : "" }))
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {disposeErrors.date && (
                  <p className="text-xs text-destructive">{disposeErrors.date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dispose_time">Time</Label>
                <Input
                  id="dispose_time"
                  type="time"
                  value={disposeForm.time}
                  onChange={(e) => {
                    setDisposeForm((f) => ({ ...f, time: e.target.value }));
                    if (disposeErrors.time) setDisposeErrors((er) => ({ ...er, time: undefined }));
                  }}
                  aria-invalid={!!disposeErrors.time}
                  className={cn(disposeErrors.time && "border-destructive focus-visible:ring-destructive")}
                />
                {disposeErrors.time && (
                  <p className="text-xs text-destructive">{disposeErrors.time}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(false)}>Cancel</Button>
            <Button onClick={handleDispose} disabled={dispose.isPending}>
              {dispose.isPending ? "Saving…" : "Dispose"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Change tyre position dialog ============ */}
      <Dialog
        open={changePosOpen}
        onOpenChange={(next) => {
          setChangePosOpen(next);
          if (!next) {
            setChangePosForm(initialChangePosForm);
            setChangePosErrors({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change tyre position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current position</Label>
              <Input value={changePosForm.from_position} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="change_to_position">New position</Label>
              <Select
                value={changePosForm.to_position || undefined}
                onValueChange={(v) => {
                  setChangePosForm((f) => ({ ...f, to_position: v }));
                  if (changePosErrors.to_position) setChangePosErrors((e) => ({ ...e, to_position: undefined }));
                }}
              >
                <SelectTrigger
                  id="change_to_position"
                  aria-invalid={!!changePosErrors.to_position}
                  className={cn(changePosErrors.to_position && "border-destructive focus-visible:ring-destructive")}
                >
                  <SelectValue placeholder={availableChangeTargets.length ? "Select position" : "No other positions"} />
                </SelectTrigger>
                <SelectContent>
                  {availableChangeTargets.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}{activeTyrePositions.has(p) ? " (occupied — will swap)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetIsOccupied && !changePosErrors.to_position && (
                <p className="text-xs text-muted-foreground">
                  This position is occupied. The tyre currently there will be moved to {changePosForm.from_position}.
                </p>
              )}
              {changePosErrors.to_position && (
                <p className="text-xs text-destructive">{changePosErrors.to_position}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="change_date">Position date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="change_date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !changePosForm.date && "text-muted-foreground",
                        changePosErrors.date && "border-destructive",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {changePosForm.date ? format(parseISO(changePosForm.date), "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={changePosForm.date ? parseISO(changePosForm.date) : undefined}
                      onSelect={(d) => {
                        setChangePosForm((f) => ({ ...f, date: d ? format(d, "yyyy-MM-dd") : "" }));
                        if (changePosErrors.date) setChangePosErrors((e) => ({ ...e, date: undefined }));
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {changePosErrors.date && <p className="text-xs text-destructive">{changePosErrors.date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="change_time">Time</Label>
                <Input
                  id="change_time"
                  type="time"
                  value={changePosForm.time}
                  onChange={(e) => {
                    setChangePosForm((f) => ({ ...f, time: e.target.value }));
                    if (changePosErrors.time) setChangePosErrors((er) => ({ ...er, time: undefined }));
                  }}
                  aria-invalid={!!changePosErrors.time}
                  className={cn(changePosErrors.time && "border-destructive focus-visible:ring-destructive")}
                />
                {changePosErrors.time && <p className="text-xs text-destructive">{changePosErrors.time}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="change_notes">Notes (optional)</Label>
              <Textarea
                id="change_notes"
                rows={2}
                value={changePosForm.notes}
                onChange={(e) => setChangePosForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePosOpen(false)}>Cancel</Button>
            <Button
              onClick={handleChangePosition}
              disabled={changePosition.isPending || availableChangeTargets.length === 0}
            >
              {changePosition.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Add / Edit Tyre dialog ============ */}
      <Dialog
        open={tyreOpen}
        onOpenChange={(next) => {
          setTyreOpen(next);
          if (!next) resetTyreForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tyreEditingId ? "Edit tyre" : "Add tyre"}</DialogTitle>
            <DialogDescription>Record the fitted tyre details for a wheel position.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tyre_position">Tyre position</Label>
              <Select
                value={tyreForm.position}
                onValueChange={(v) => updateTyreField("position", v)}
              >
                <SelectTrigger
                  id="tyre_position"
                  aria-invalid={!!tyreErrors.position}
                  className={cn(tyreErrors.position && "border-destructive focus-visible:ring-destructive")}
                >
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {availableTyrePositions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tyreErrors.position && <p className="text-xs text-destructive">{tyreErrors.position}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tyre_manufacturer">Manufacturer</Label>
                <Select
                  value={
                    manufacturerIsOther
                      ? OTHER_MANUFACTURER
                      : TYRE_MANUFACTURERS.includes(tyreForm.manufacturer)
                        ? tyreForm.manufacturer
                        : ""
                  }
                  onValueChange={(v) => {
                    if (v === OTHER_MANUFACTURER) {
                      setManufacturerIsOther(true);
                      updateTyreField("manufacturer", "");
                    } else {
                      setManufacturerIsOther(false);
                      updateTyreField("manufacturer", v);
                    }
                  }}
                >
                  <SelectTrigger
                    id="tyre_manufacturer"
                    aria-invalid={!!tyreErrors.manufacturer}
                    className={cn(tyreErrors.manufacturer && "border-destructive focus-visible:ring-destructive")}
                  >
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYRE_MANUFACTURERS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                    <SelectItem value={OTHER_MANUFACTURER}>{OTHER_MANUFACTURER}</SelectItem>
                  </SelectContent>
                </Select>
                {manufacturerIsOther && (
                  <Input
                    autoFocus
                    placeholder="Enter manufacturer"
                    value={tyreForm.manufacturer}
                    onChange={(e) => updateTyreField("manufacturer", e.target.value)}
                    aria-invalid={!!tyreErrors.manufacturer}
                    className={cn(tyreErrors.manufacturer && "border-destructive focus-visible:ring-destructive")}
                  />
                )}
                {tyreErrors.manufacturer && <p className="text-xs text-destructive">{tyreErrors.manufacturer}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tyre_size">Tyre size</Label>
                <Input
                  id="tyre_size"
                  value={tyreForm.tyre_size}
                  onChange={(e) => updateTyreField("tyre_size", e.target.value)}
                  placeholder="e.g. 315/80R22.5"
                  aria-invalid={!!tyreErrors.tyre_size}
                  className={cn(tyreErrors.tyre_size && "border-destructive focus-visible:ring-destructive")}
                />
                {tyreErrors.tyre_size && <p className="text-xs text-destructive">{tyreErrors.tyre_size}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tyre_serial">Serial number</Label>
              <Input
                id="tyre_serial"
                value={tyreForm.serial_number}
                onChange={(e) => updateTyreField("serial_number", e.target.value)}
                placeholder="DOT code, e.g. XXXX XXXX 1223"
                aria-invalid={!!tyreErrors.serial_number}
                className={cn("font-mono", tyreErrors.serial_number && "border-destructive focus-visible:ring-destructive")}
              />
              {tyreErrors.serial_number && <p className="text-xs text-destructive">{tyreErrors.serial_number}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Manufacture date (tyre age)</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                  {dotToManufactureDate(tyreForm.serial_number) ?? "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tyre_fitted_date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="tyre_fitted_date"
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between font-normal",
                        !tyreForm.fitted_date && "text-muted-foreground",
                        tyreErrors.fitted_date && "border-destructive focus-visible:ring-destructive"
                      )}
                    >
                      <span>
                        {tyreForm.fitted_date
                          ? format(parseISO(tyreForm.fitted_date), "dd MMM yyyy")
                          : "Pick a date"}
                      </span>
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tyreForm.fitted_date ? parseISO(tyreForm.fitted_date) : undefined}
                      onSelect={(d) => updateTyreField("fitted_date", d ? format(d, "yyyy-MM-dd") : "")}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {tyreErrors.fitted_date && <p className="text-xs text-destructive">{tyreErrors.fitted_date}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTyreOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTyre} disabled={saveTyre.isPending}>
              {saveTyre.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm.open} onOpenChange={(o) => setConfirm((c) => ({ ...c, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm delete</AlertDialogTitle>
            <AlertDialogDescription>{confirm.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm.onConfirm();
                setConfirm((c) => ({ ...c, open: false }));
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
