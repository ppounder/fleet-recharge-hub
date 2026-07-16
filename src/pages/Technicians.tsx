import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Search, Columns3, ArrowUp, ArrowDown, ChevronsUpDown, Check, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Workshop = { id: string; name: string; internal_company: boolean };

type Technician = {
  id: string;
  fleet_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town_city: string | null;
  county: string | null;
  country: string | null;
  postcode: string | null;
  job_title: string | null;
  start_date: string;
  workshop_id: string | null;
  status: "active" | "account_locked" | "deleted";
  pin: string | null;
  username: string | null;
  password_hash: string | null;
  pin_hash: string | null;
  failed_login_attempts: number;
  auto_unlock_enabled: boolean;
  employee_number: string | null;
  ni_number: string | null;
  labour_type: string | null;
  color: string;
  active: boolean;
};

const STATUS_LABELS: Record<Technician["status"], string> = {
  active: "Active",
  account_locked: "Account locked",
  deleted: "Deleted",
};

const LABOUR_TYPES = [
  "Mechanic",
  "Auto-electrician",
  "Bodyshop",
  "MOT Tester",
  "Tyre Fitter",
  "Valeter",
  "Apprentice",
  "Other",
];

type ColKey =
  | "name" | "job_title" | "workshop" | "status"
  | "phone" | "email" | "employee_number" | "labour_type" | "start_date";

const COLUMNS: { key: ColKey; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "job_title", label: "Job title", sortable: true },
  { key: "workshop", label: "Workshop", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "phone", label: "Telephone", sortable: false },
  { key: "email", label: "Email", sortable: true },
  { key: "employee_number", label: "Employee #", sortable: true },
  { key: "labour_type", label: "Labour type", sortable: true },
  { key: "start_date", label: "Start date", sortable: true },
];
const LOCKED_COLS: ColKey[] = ["name"];
const DEFAULT_ORDER: ColKey[] = COLUMNS.map((c) => c.key);
const DEFAULT_VISIBLE: ColKey[] = COLUMNS.map((c) => c.key);

const technicianSchema = z.object({
  first_name: z.string().trim().min(1, { message: "First name is required" }).max(80),
  last_name: z.string().trim().min(1, { message: "Last name is required" }).max(80),
  address_line1: z.string().trim().max(150),
  address_line2: z.string().trim().max(150),
  address_line3: z.string().trim().max(150),
  town_city: z.string().trim().max(100),
  county: z.string().trim().max(100),
  country: z.string().trim().max(2),
  postcode: z.string().trim().max(20),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[0-9\s()-]{7,}$/.test(v), { message: "Enter a valid telephone number" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .max(255)
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Enter a valid email address" }),
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(50)
    .refine((v) => /^[A-Za-z0-9._-]+$/.test(v), { message: "Only letters, numbers, dot, dash, underscore" }),
  password: z.string(), // validated conditionally on save
  job_title: z.string().trim().max(100),
  status: z.enum(["active", "account_locked", "deleted"]),
  start_date: z.string().min(1, { message: "Start date is required" }),
  pin: z.string(), // validated conditionally on save
  employee_number: z.string().trim().max(50),
  ni_number: z.string().trim().max(20),
  labour_type: z.string().trim().max(50),
  auto_unlock_enabled: z.boolean(),
});

export type AllocationType = "permanent" | "temporary_transfer";
const ALLOCATION_TYPE_LABELS: Record<AllocationType, string> = {
  permanent: "Permanent",
  temporary_transfer: "Temporary Transfer",
};

export type AllocationDraft = {
  id: string;
  workshop_id: string;
  allocation_start_date: string; // yyyy-MM-dd
  allocation_end_date: string; // yyyy-MM-dd | ""
  allocation_type: AllocationType;
  revert_after_end: boolean;
  _isNew?: boolean;
};

const allocationSchema = z.object({
  workshop_id: z.string().min(1, { message: "Workshop is required" }),
  allocation_start_date: z.string().min(1, { message: "Allocation start date is required" }),
  allocation_end_date: z.string(),
  allocation_type: z.enum(["permanent", "temporary_transfer"]),
  revert_after_end: z.boolean(),
}).refine((v) => !v.allocation_end_date || v.allocation_end_date >= v.allocation_start_date, {
  message: "End date must be on or after start date",
  path: ["allocation_end_date"],
});

const emptyAllocation = (): AllocationDraft => ({
  id: (crypto as any).randomUUID?.() ?? String(Math.random()),
  workshop_id: "",
  allocation_start_date: format(new Date(), "yyyy-MM-dd"),
  allocation_end_date: "",
  allocation_type: "permanent",
  revert_after_end: false,
  _isNew: true,
});

type TechnicianForm = z.infer<typeof technicianSchema>;
type FormErrors = Partial<Record<keyof TechnicianForm, string>>;

const emptyForm = (): TechnicianForm => ({
  first_name: "",
  last_name: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  town_city: "",
  county: "",
  country: "",
  postcode: "",
  phone: "",
  email: "",
  username: "",
  password: "",
  job_title: "",
  status: "active",
  start_date: format(new Date(), "yyyy-MM-dd"),
  pin: "",
  employee_number: "",
  ni_number: "",
  labour_type: "",
  auto_unlock_enabled: true,
});

export default function Technicians() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_VISIBLE);
  const [columnOrder, setColumnOrder] = useState<ColKey[]>(DEFAULT_ORDER);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TechnicianForm>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [countryOpen, setCountryOpen] = useState(false);
  const [labourTypeOpen, setLabourTypeOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  // Allocations state (per open dialog)
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);
  const [deletedAllocationIds, setDeletedAllocationIds] = useState<string[]>([]);
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [editingAllocId, setEditingAllocId] = useState<string | null>(null);
  const [allocDraft, setAllocDraft] = useState<AllocationDraft>(emptyAllocation());
  const [allocDraftErrors, setAllocDraftErrors] = useState<Partial<Record<keyof AllocationDraft, string>>>({});
  const [allocWorkshopOpen, setAllocWorkshopOpen] = useState(false);
  const [allocTypeOpen, setAllocTypeOpen] = useState(false);
  const [confirmDeleteAllocId, setConfirmDeleteAllocId] = useState<string | null>(null);
  const [allocMissingError, setAllocMissingError] = useState<string | null>(null);


  const updateField = <K extends keyof TechnicianForm>(key: K, value: TechnicianForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-internal-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("id,name,internal_company")
        .eq("internal_company", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Workshop[];
    },
  });

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians" as any)
        .select("*")
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as unknown as Technician[];
    },
  });

  const createTech = useMutation({
    mutationFn: async ({ payload, workshop_id, start_date }: { payload: TechnicianForm; workshop_id: string; start_date: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data: profile } = await supabase
        .from("profiles")
        .select("fleet_id")
        .eq("id", uid)
        .maybeSingle();
      const fleet_id = profile?.fleet_id;
      if (!fleet_id) throw new Error("No fleet assigned to your profile");
      const insertPayload = {
        fleet_id,
        first_name: payload.first_name.trim(),
        last_name: payload.last_name.trim(),
        email: payload.email.trim(),
        username: payload.username.trim(),
        phone: payload.phone.trim() || null,
        address_line1: payload.address_line1.trim() || null,
        address_line2: payload.address_line2.trim() || null,
        address_line3: payload.address_line3.trim() || null,
        town_city: payload.town_city.trim() || null,
        county: payload.county.trim() || null,
        country: payload.country.trim() || null,
        postcode: payload.postcode.trim() || null,
        job_title: payload.job_title.trim() || null,
        start_date: new Date(start_date).toISOString(),
        workshop_id,
        status: payload.status,
        auto_unlock_enabled: payload.auto_unlock_enabled,
        employee_number: payload.employee_number.trim() || null,
        ni_number: payload.ni_number.trim() || null,
        labour_type: payload.labour_type.trim() || null,
        color: "#f59e0b",
        active: payload.status === "active",
      };
      const { data, error } = await supabase.from("technicians" as any).insert(insertPayload as any).select().single();
      if (error) throw error;
      // Hash and store credentials via SECURITY DEFINER RPC
      const { error: credErr } = await supabase.rpc("set_technician_credentials" as any, {
        _tech_id: (data as any).id,
        _username: payload.username.trim(),
        _password: payload.password,
        _pin: payload.pin,
      });
      if (credErr) throw credErr;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  const updateTech = useMutation({
    mutationFn: async ({ id, payload, workshop_id, start_date }: { id: string; payload: TechnicianForm; workshop_id: string; start_date: string }) => {
      const updatePayload: any = {
        first_name: payload.first_name.trim(),
        last_name: payload.last_name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim() || null,
        address_line1: payload.address_line1.trim() || null,
        address_line2: payload.address_line2.trim() || null,
        address_line3: payload.address_line3.trim() || null,
        town_city: payload.town_city.trim() || null,
        county: payload.county.trim() || null,
        country: payload.country.trim() || null,
        postcode: payload.postcode.trim() || null,
        job_title: payload.job_title.trim() || null,
        start_date: new Date(start_date).toISOString(),
        workshop_id,
        status: payload.status,
        auto_unlock_enabled: payload.auto_unlock_enabled,
        employee_number: payload.employee_number.trim() || null,
        ni_number: payload.ni_number.trim() || null,
        labour_type: payload.labour_type.trim() || null,
        active: payload.status === "active",
      };
      const { data, error } = await supabase
        .from("technicians" as any)
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      // Update credentials (only fields provided)
      const { error: credErr } = await supabase.rpc("set_technician_credentials" as any, {
        _tech_id: id,
        _username: payload.username.trim(),
        _password: payload.password ? payload.password : null,
        _pin: payload.pin ? payload.pin : null,
      });
      if (credErr) throw credErr;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });


  const deleteTech = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technicians" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  const workshopName = (id: string | null) => workshops.find((w) => w.id === id)?.name ?? "";
  const countryName = (code: string) => ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? technicians.filter((t) =>
          [
            `${t.first_name} ${t.last_name}`, t.email, t.phone, t.job_title,
            t.employee_number, t.labour_type, workshopName(t.workshop_id),
          ].some((v) => v?.toLowerCase().includes(q))
        )
      : technicians;
    return [...rows].sort((a, b) => {
      let av: any = "", bv: any = "";
      switch (sortKey) {
        case "name": av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; break;
        case "workshop": av = workshopName(a.workshop_id); bv = workshopName(b.workshop_id); break;
        default: av = (a as any)[sortKey] ?? ""; bv = (b as any)[sortKey] ?? "";
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [technicians, workshops, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setAllocations([]);
    setDeletedAllocationIds([]);
    setAllocMissingError(null);
    setDialogOpen(true);
  };

  const openEdit = async (t: Technician) => {
    setEditingId(t.id);
    setErrors({});
    setAllocMissingError(null);
    setForm({
      first_name: t.first_name ?? "",
      last_name: t.last_name ?? "",
      address_line1: t.address_line1 ?? "",
      address_line2: t.address_line2 ?? "",
      address_line3: t.address_line3 ?? "",
      town_city: t.town_city ?? "",
      county: t.county ?? "",
      country: t.country ?? "",
      postcode: t.postcode ?? "",
      phone: t.phone ?? "",
      email: t.email ?? "",
      username: t.username ?? "",
      password: "",
      job_title: t.job_title ?? "",
      status: t.status ?? "active",
      start_date: t.start_date ? format(new Date(t.start_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      pin: "",
      employee_number: t.employee_number ?? "",
      ni_number: t.ni_number ?? "",
      labour_type: t.labour_type ?? "",
      auto_unlock_enabled: t.auto_unlock_enabled ?? true,
    });
    setDialogOpen(true);
    setDeletedAllocationIds([]);
    // Fetch allocations
    const { data, error } = await supabase
      .from("technician_allocations" as any)
      .select("*")
      .eq("technician_id", t.id)
      .order("allocation_start_date", { ascending: false });
    if (!error && data) {
      const rows = (data as any[]).map((a) => ({
        id: a.id,
        workshop_id: a.workshop_id,
        allocation_start_date: a.allocation_start_date ? format(new Date(a.allocation_start_date), "yyyy-MM-dd") : "",
        allocation_end_date: a.allocation_end_date ? format(new Date(a.allocation_end_date), "yyyy-MM-dd") : "",
        allocation_type: a.allocation_type,
        revert_after_end: !!a.revert_after_end,
      })) as AllocationDraft[];
      // Seed a default allocation from legacy technician columns if empty
      if (!rows.length && t.workshop_id) {
        rows.push({
          id: (crypto as any).randomUUID?.() ?? String(Math.random()),
          workshop_id: t.workshop_id,
          allocation_start_date: t.start_date ? format(new Date(t.start_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          allocation_end_date: "",
          allocation_type: "permanent",
          revert_after_end: false,
          _isNew: true,
        });
      }
      setAllocations(rows);
    } else {
      setAllocations([]);
    }
  };

  const currentAllocation = (list: AllocationDraft[]): AllocationDraft | null => {
    if (!list.length) return null;
    // Most recent by start date
    return [...list].sort((a, b) => (a.allocation_start_date < b.allocation_start_date ? 1 : -1))[0];
  };

  const persistAllocations = async (technicianId: string) => {
    if (deletedAllocationIds.length) {
      const { error } = await supabase
        .from("technician_allocations" as any)
        .delete()
        .in("id", deletedAllocationIds);
      if (error) throw error;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("fleet_id")
      .eq("id", uid!)
      .maybeSingle();
    const fleet_id = profile?.fleet_id;
    for (const a of allocations) {
      const payload = {
        technician_id: technicianId,
        fleet_id,
        workshop_id: a.workshop_id,
        allocation_start_date: new Date(a.allocation_start_date).toISOString(),
        allocation_end_date: a.allocation_end_date ? new Date(a.allocation_end_date).toISOString() : null,
        allocation_type: a.allocation_type,
        revert_after_end: a.revert_after_end,
      };
      if (a._isNew) {
        const { error } = await supabase.from("technician_allocations" as any).insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("technician_allocations" as any)
          .update(payload as any)
          .eq("id", a.id);
        if (error) throw error;
      }
    }
  };

  const handleSave = async () => {
    const result = technicianSchema.safeParse(form);
    const extra: FormErrors = {};
    // Password + PIN are mandatory
    const pw = form.password ?? "";
    const pin = form.pin ?? "";
    if (!editingId) {
      if (pw.length < 8) extra.password = "Password must be at least 8 characters";
      if (!/^\d{4,10}$/.test(pin)) extra.pin = "PIN must be 4-10 digits";
    } else {
      // On edit, allow blank to keep current, but if provided validate
      if (pw && pw.length < 8) extra.password = "Password must be at least 8 characters";
      if (pin && !/^\d{4,10}$/.test(pin)) extra.pin = "PIN must be 4-10 digits";
    }
    if (!result.success || Object.keys(extra).length) {
      const fieldErrors: FormErrors = { ...extra };
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof FormErrors;
          if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast({ title: "Please fix the errors below", description: "Some fields are invalid.", variant: "destructive" });
      return;
    }
    const current = currentAllocation(allocations);
    if (!current) {
      setAllocMissingError("At least one allocation is required.");
      toast({ title: "Allocation required", description: "Add at least one workshop allocation.", variant: "destructive" });
      return;
    }
    setAllocMissingError(null);
    try {
      let techId = editingId;
      if (editingId) {
        await updateTech.mutateAsync({
          id: editingId,
          payload: result.data,
          workshop_id: current.workshop_id,
          start_date: result.data.start_date,
        });
      } else {
        const created: any = await createTech.mutateAsync({
          payload: result.data,
          workshop_id: current.workshop_id,
          start_date: result.data.start_date,
        });
        techId = created?.id ?? null;
      }
      if (techId) await persistAllocations(techId);
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
      toast({ title: editingId ? "Technician updated" : "Technician added" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setErrors({});
      setAllocations([]);
      setDeletedAllocationIds([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };


  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTech.mutateAsync(deleteId);
      toast({ title: "Technician deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const [resetting, setResetting] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [tempPasswordDialog, setTempPasswordDialog] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!editingId) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.rpc("reset_technician_password" as any, { _tech_id: editingId });
      if (error) throw error;
      setTempPasswordDialog(String(data));
      toast({ title: "Password reset", description: "A temporary password was generated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleSendReminder = async () => {
    if (!editingId || !form.email) return;
    setSendingReminder(true);
    try {
      // Best-effort: invoke transactional email function if present
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          to: form.email,
          subject: "Your account username reminder",
          html: `<p>Hi ${form.first_name || ""},</p><p>Your username is: <strong>${form.username}</strong></p><p>If you have forgotten your password, contact your workshop administrator to reset it.</p>`,
        },
      }).catch(() => null);
      toast({ title: "Reminder sent", description: `A reminder was sent to ${form.email}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleUnlock = async () => {
    if (!editingId) return;
    setUnlocking(true);
    try {
      const { error } = await supabase.rpc("unlock_technician_account" as any, { _tech_id: editingId });
      if (error) throw error;
      updateField("status", "active");
      toast({ title: "Account unlocked" });
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" strokeWidth={3} />;
  };

  const errCls = (k: keyof FormErrors) =>
    cn(errors[k] && "border-destructive focus-visible:ring-destructive");

  const statusBadgeVariant = (s: Technician["status"]) => {
    if (s === "active") return "default";
    if (s === "account_locked") return "secondary";
    return "destructive";
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Technicians</h1>
          <p className="text-muted-foreground text-sm">Manage technicians and their allocated workshops.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search technicians..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add technician
            </Button>
            <ManageColumnsDialog
              visibleCols={visibleCols}
              columnOrder={columnOrder}
              onApply={(order, visible) => { setColumnOrder(order); setVisibleCols(visible); }}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No technicians found.</div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columnOrder.filter((k) => visibleCols.includes(k)).map((k) => {
                        const c = COLUMNS.find((col) => col.key === k)!;
                        return (
                          <TableHead key={k}>
                            {c.sortable ? (
                              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
                                {c.label} <SortIcon col={k} />
                              </button>
                            ) : c.label}
                          </TableHead>
                        );
                      })}
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(t)}>
                        {columnOrder.filter((k) => visibleCols.includes(k)).map((k) => {
                          switch (k) {
                            case "name":
                              return <TableCell key={k} className="font-medium whitespace-nowrap">{t.first_name} {t.last_name}</TableCell>;
                            case "job_title":
                              return <TableCell key={k}>{t.job_title || "—"}</TableCell>;
                            case "workshop":
                              return <TableCell key={k}>{workshopName(t.workshop_id) || "—"}</TableCell>;
                            case "status":
                              return (
                                <TableCell key={k}>
                                  <Badge variant={statusBadgeVariant(t.status) as any}>{STATUS_LABELS[t.status]}</Badge>
                                </TableCell>
                              );
                            case "phone":
                              return <TableCell key={k}>{t.phone || "—"}</TableCell>;
                            case "email":
                              return <TableCell key={k}>{t.email || "—"}</TableCell>;
                            case "employee_number":
                              return <TableCell key={k}>{t.employee_number || "—"}</TableCell>;
                            case "labour_type":
                              return <TableCell key={k}>{t.labour_type || "—"}</TableCell>;
                            case "start_date":
                              return <TableCell key={k} className="whitespace-nowrap">{t.start_date ? format(new Date(t.start_date), "dd MMM yyyy") : "—"}</TableCell>;
                            default:
                              return null;
                          }
                        })}
                        <TableCell className="w-24 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
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
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete technician</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setErrors({}); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>{editingId ? "Edit technician" : "Add technician"}</DialogTitle>
            <DialogDescription>Enter the technician details below.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <CollapsibleCard title="Personal details">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">First name *</Label>
                  <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} className={errCls("first_name")} />
                  {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last name *</Label>
                  <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} className={errCls("last_name")} />
                  {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard title="Address details" defaultOpen={addressOpen}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 1</Label>
                  <Input value={form.address_line1} onChange={(e) => updateField("address_line1", e.target.value)} className={errCls("address_line1")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 2</Label>
                  <Input value={form.address_line2} onChange={(e) => updateField("address_line2", e.target.value)} className={errCls("address_line2")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 3</Label>
                  <Input value={form.address_line3} onChange={(e) => updateField("address_line3", e.target.value)} className={errCls("address_line3")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Town/City</Label>
                  <Input value={form.town_city} onChange={(e) => updateField("town_city", e.target.value)} className={errCls("town_city")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">County</Label>
                  <Input value={form.county} onChange={(e) => updateField("county", e.target.value)} className={errCls("county")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 bg-card font-normal", errors.country && "border-destructive focus-visible:ring-destructive")}>
                        {form.country ? countryName(form.country) : <span className="text-muted-foreground">Select country...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {ISO_COUNTRIES.map((c) => (
                              <CommandItem key={c.code} value={`${c.name} ${c.code}`} onSelect={() => { updateField("country", c.code); setCountryOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.country === c.code ? "opacity-100" : "opacity-0")} />
                                {c.name} <span className="ml-auto text-xs text-muted-foreground">{c.code}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postcode</Label>
                  <Input value={form.postcode} onChange={(e) => updateField("postcode", e.target.value)} className={errCls("postcode")} />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Telephone number</Label>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={errCls("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard title="Employment">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Job title</Label>
                  <Input value={form.job_title} onChange={(e) => updateField("job_title", e.target.value)} className={errCls("job_title")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status *</Label>
                  <Input
                    value={STATUS_LABELS[form.status]}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>


                <div className="space-y-1.5">
                  <Label className="text-xs">Start date *</Label>
                  <DatePicker
                    value={form.start_date}
                    onChange={(v) => updateField("start_date", v)}
                    className={errCls("start_date")}
                  />
                  {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Labour type</Label>
                  <Popover open={labourTypeOpen} onOpenChange={setLabourTypeOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                        {form.labour_type || <span className="text-muted-foreground">Select labour type...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search labour type..." />
                        <CommandList>
                          <CommandEmpty>No results.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { updateField("labour_type", ""); setLabourTypeOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", !form.labour_type ? "opacity-100" : "opacity-0")} />
                              None
                            </CommandItem>
                            {LABOUR_TYPES.map((lt) => (
                              <CommandItem key={lt} value={lt} onSelect={() => { updateField("labour_type", lt); setLabourTypeOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.labour_type === lt ? "opacity-100" : "opacity-0")} />
                                {lt}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee number</Label>
                  <Input value={form.employee_number} onChange={(e) => updateField("employee_number", e.target.value)} className={errCls("employee_number")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">N.I. number</Label>
                  <Input value={form.ni_number} onChange={(e) => updateField("ni_number", e.target.value.toUpperCase())} className={errCls("ni_number")} />
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard title="Login details">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Username *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => updateField("username", e.target.value.trim())}
                    className={errCls("username")}
                    autoComplete="off"
                  />
                  {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={errCls("email")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={errCls("password")}
                    placeholder={editingId ? "Leave blank to keep current" : "Minimum 8 characters"}
                    autoComplete="new-password"
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground">Stored securely as a bcrypt hash.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PIN *</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={form.pin}
                    onChange={(e) => updateField("pin", e.target.value.replace(/\D/g, ""))}
                    className={errCls("pin")}
                    placeholder={editingId ? "Leave blank to keep current" : "Minimum 4 digits"}
                    autoComplete="off"
                  />
                  {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
                  <p className="text-xs text-muted-foreground">Stored securely as a bcrypt hash.</p>
                </div>

                <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm">Auto-unlock account after failed login attempts</Label>
                    <p className="text-xs text-muted-foreground">When on, the account unlocks automatically once the lockout period expires.</p>
                  </div>
                  <Switch
                    checked={form.auto_unlock_enabled}
                    onCheckedChange={(v) => updateField("auto_unlock_enabled", v)}
                  />
                </div>

                {editingId && (
                  <div className="col-span-2 flex flex-wrap items-center gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={handleResetPassword} disabled={resetting}>
                      {resetting ? "Resetting..." : "Reset password"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSendReminder} disabled={sendingReminder}>
                      {sendingReminder ? "Sending..." : "Send password reminder"}
                    </Button>
                    {form.status === "account_locked" && (
                      <Button type="button" variant="outline" size="sm" onClick={handleUnlock} disabled={unlocking}>
                        {unlocking ? "Unlocking..." : "Unlock account"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleCard>


            <CollapsibleCard
              title="Allocation *"
              action={
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setEditingAllocId(null);
                  setAllocDraft(emptyAllocation());
                  setAllocDraftErrors({});
                  setAllocDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add allocation
                </Button>
              }
            >
              {allocMissingError && <p className="text-xs text-destructive">{allocMissingError}</p>}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workshop</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Revert</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-4">
                          No allocations yet. Add at least one to save.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...allocations]
                        .sort((a, b) => (a.allocation_start_date < b.allocation_start_date ? 1 : -1))
                        .map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{workshopName(a.workshop_id) || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">{a.allocation_start_date ? format(new Date(a.allocation_start_date), "dd MMM yyyy") : "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">{a.allocation_end_date ? format(new Date(a.allocation_end_date), "dd MMM yyyy") : "—"}</TableCell>
                            <TableCell>{ALLOCATION_TYPE_LABELS[a.allocation_type]}</TableCell>
                            <TableCell>{a.revert_after_end ? "Yes" : "No"}</TableCell>
                            <TableCell className="w-24 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                  setEditingAllocId(a.id);
                                  setAllocDraft({ ...a });
                                  setAllocDraftErrors({});
                                  setAllocDialogOpen(true);
                                }}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => setConfirmDeleteAllocId(a.id)}>
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
            </CollapsibleCard>
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTech.isPending || updateTech.isPending}>
              {createTech.isPending || updateTech.isPending
                ? "Saving..."
                : editingId ? "Save changes" : "Save technician"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Add/Edit Dialog */}
      <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAllocId ? "Edit allocation" : "Add allocation"}</DialogTitle>
            <DialogDescription>Assign the technician to a workshop for a period.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Workshop *</Label>
              <Popover open={allocWorkshopOpen} onOpenChange={setAllocWorkshopOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 bg-card font-normal", allocDraftErrors.workshop_id && "border-destructive focus-visible:ring-destructive")}>
                    {allocDraft.workshop_id ? workshopName(allocDraft.workshop_id) : <span className="text-muted-foreground">Select workshop...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search workshop..." />
                    <CommandList>
                      <CommandEmpty>No workshops found.</CommandEmpty>
                      <CommandGroup>
                        {workshops.map((w) => (
                          <CommandItem key={w.id} value={w.name} onSelect={() => { setAllocDraft((p) => ({ ...p, workshop_id: w.id })); setAllocDraftErrors((p) => ({ ...p, workshop_id: undefined })); setAllocWorkshopOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", allocDraft.workshop_id === w.id ? "opacity-100" : "opacity-0")} />
                            {w.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {allocDraftErrors.workshop_id && <p className="text-xs text-destructive">{allocDraftErrors.workshop_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Allocation start date *</Label>
                <DatePicker
                  value={allocDraft.allocation_start_date}
                  onChange={(d) => { setAllocDraft((p) => ({ ...p, allocation_start_date: d })); setAllocDraftErrors((p) => ({ ...p, allocation_start_date: undefined })); }}
                  className={cn(allocDraftErrors.allocation_start_date && "border-destructive")}
                />
                {allocDraftErrors.allocation_start_date && <p className="text-xs text-destructive">{allocDraftErrors.allocation_start_date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Allocation end date</Label>
                <DatePicker
                  value={allocDraft.allocation_end_date}
                  onChange={(d) => { setAllocDraft((p) => ({ ...p, allocation_end_date: d })); setAllocDraftErrors((p) => ({ ...p, allocation_end_date: undefined })); }}
                  className={cn(allocDraftErrors.allocation_end_date && "border-destructive")}
                />
                {allocDraftErrors.allocation_end_date && <p className="text-xs text-destructive">{allocDraftErrors.allocation_end_date}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Allocation type *</Label>
              <Popover open={allocTypeOpen} onOpenChange={setAllocTypeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                    {ALLOCATION_TYPE_LABELS[allocDraft.allocation_type]}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                      <CommandEmpty>No results.</CommandEmpty>
                      <CommandGroup>
                        {(Object.keys(ALLOCATION_TYPE_LABELS) as AllocationType[]).map((k) => (
                          <CommandItem key={k} value={ALLOCATION_TYPE_LABELS[k]} onSelect={() => { setAllocDraft((p) => ({ ...p, allocation_type: k })); setAllocTypeOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", allocDraft.allocation_type === k ? "opacity-100" : "opacity-0")} />
                            {ALLOCATION_TYPE_LABELS[k]}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Revert to previous after end date</Label>
                <p className="text-xs text-muted-foreground">When the end date is reached, revert to previous allocation.</p>
              </div>
              <Switch checked={allocDraft.revert_after_end} onCheckedChange={(v) => setAllocDraft((p) => ({ ...p, revert_after_end: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const res = allocationSchema.safeParse({
                workshop_id: allocDraft.workshop_id,
                allocation_start_date: allocDraft.allocation_start_date,
                allocation_end_date: allocDraft.allocation_end_date,
                allocation_type: allocDraft.allocation_type,
                revert_after_end: allocDraft.revert_after_end,
              });
              if (!res.success) {
                const errs: Partial<Record<keyof AllocationDraft, string>> = {};
                for (const issue of res.error.issues) {
                  const k = issue.path[0] as keyof AllocationDraft;
                  if (k && !errs[k]) errs[k] = issue.message;
                }
                setAllocDraftErrors(errs);
                return;
              }
              if (editingAllocId) {
                setAllocations((prev) => prev.map((x) => (x.id === editingAllocId ? { ...allocDraft, id: editingAllocId } : x)));
              } else {
                setAllocations((prev) => [...prev, { ...allocDraft }]);
              }
              setAllocMissingError(null);
              setAllocDialogOpen(false);
            }}>Save allocation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tempPasswordDialog} onOpenChange={(o) => !o && setTempPasswordDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary password</AlertDialogTitle>
            <AlertDialogDescription>
              Share this password securely with the technician. It won't be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted p-3 font-mono text-center text-lg select-all">
            {tempPasswordDialog}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTempPasswordDialog(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteAllocId} onOpenChange={(o) => !o && setConfirmDeleteAllocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete allocation?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the allocation when you save the technician.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                const id = confirmDeleteAllocId!;
                setAllocations((prev) => {
                  const t = prev.find((c) => c.id === id);
                  if (t && !t._isNew) setDeletedAllocationIds((d) => [...d, id]);
                  return prev.filter((c) => c.id !== id);
                });
                setConfirmDeleteAllocId(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete technician?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The technician will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTech.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteTech.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTech.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function ManageColumnsDialog({
  visibleCols, columnOrder, onApply,
}: {
  visibleCols: ColKey[];
  columnOrder: ColKey[];
  onApply: (order: ColKey[], visible: ColKey[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<ColKey[]>(columnOrder);
  const [draftVisible, setDraftVisible] = useState<ColKey[]>(visibleCols);
  const [dragKey, setDragKey] = useState<ColKey | null>(null);

  useEffect(() => {
    if (open) { setDraftOrder(columnOrder); setDraftVisible(visibleCols); }
  }, [open, columnOrder, visibleCols]);

  const toggle = (k: ColKey, checked: boolean) => {
    if (LOCKED_COLS.includes(k)) return;
    if (checked) setDraftVisible([...draftVisible, k]);
    else setDraftVisible(draftVisible.filter((c) => c !== k));
  };

  const handleDrop = (target: ColKey) => {
    if (!dragKey || dragKey === target) return;
    const next = draftOrder.filter((k) => k !== dragKey);
    const idx = next.indexOf(target);
    next.splice(idx, 0, dragKey);
    setDraftOrder(next);
    setDragKey(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2 h-10" onClick={() => setOpen(true)}>
        <Columns3 className="w-4 h-4" />
        Manage columns
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Manage columns</SheetTitle>
          <SheetDescription>
            Select the columns you most want to see. Drag the items into the order you want them shown in the table.
          </SheetDescription>
        </SheetHeader>

        <div className="rounded-md border divide-y flex-1 overflow-y-auto mt-4">
          {draftOrder.map((k) => {
            const col = COLUMNS.find((c) => c.key === k)!;
            const locked = LOCKED_COLS.includes(k);
            const checked = draftVisible.includes(k);
            return (
              <div
                key={k}
                draggable
                onDragStart={() => setDragKey(k)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(k)}
                onDragEnd={() => setDragKey(null)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/50 cursor-grab active:cursor-grabbing",
                  dragKey === k && "opacity-50"
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium">{col.label}</span>
                <Checkbox checked={checked} disabled={locked} onCheckedChange={(v) => toggle(k, !!v)} />
              </div>
            );
          })}
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => { setDraftOrder(DEFAULT_ORDER); setDraftVisible(DEFAULT_VISIBLE); }}>Reset</Button>
          <Button onClick={() => { onApply(draftOrder, draftVisible); setOpen(false); }}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
