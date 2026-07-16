import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  { key: "start_date", label: "Allocation start date", sortable: true },
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
    .max(255)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Enter a valid email address" }),
  job_title: z.string().trim().max(100),
  status: z.enum(["active", "account_locked", "deleted"]),
  pin: z
    .string()
    .trim()
    .min(4, { message: "PIN must be at least 4 digits" })
    .max(10, { message: "PIN must be 10 digits or fewer" })
    .refine((v) => /^\d+$/.test(v), { message: "PIN must be numeric" }),
  employee_number: z.string().trim().max(50),
  ni_number: z.string().trim().max(20),
  labour_type: z.string().trim().max(50),
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
  job_title: "",
  start_date: format(new Date(), "yyyy-MM-dd"),
  workshop_id: "",
  status: "active",
  pin: "",
  employee_number: "",
  ni_number: "",
  labour_type: "",
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
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [labourTypeOpen, setLabourTypeOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

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
    mutationFn: async (payload: TechnicianForm) => {
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
        email: payload.email.trim() || null,
        phone: payload.phone.trim() || null,
        address_line1: payload.address_line1.trim() || null,
        address_line2: payload.address_line2.trim() || null,
        address_line3: payload.address_line3.trim() || null,
        town_city: payload.town_city.trim() || null,
        county: payload.county.trim() || null,
        country: payload.country.trim() || null,
        postcode: payload.postcode.trim() || null,
        job_title: payload.job_title.trim() || null,
        start_date: new Date(payload.start_date).toISOString(),
        workshop_id: payload.workshop_id,
        status: payload.status,
        pin: payload.pin.trim(),
        employee_number: payload.employee_number.trim() || null,
        ni_number: payload.ni_number.trim() || null,
        labour_type: payload.labour_type.trim() || null,
        color: "#f59e0b",
        active: payload.status === "active",
      };
      const { data, error } = await supabase.from("technicians" as any).insert(insertPayload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians-list"] });
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  const updateTech = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TechnicianForm }) => {
      const updatePayload: any = {
        first_name: payload.first_name.trim(),
        last_name: payload.last_name.trim(),
        email: payload.email.trim() || null,
        phone: payload.phone.trim() || null,
        address_line1: payload.address_line1.trim() || null,
        address_line2: payload.address_line2.trim() || null,
        address_line3: payload.address_line3.trim() || null,
        town_city: payload.town_city.trim() || null,
        county: payload.county.trim() || null,
        country: payload.country.trim() || null,
        postcode: payload.postcode.trim() || null,
        job_title: payload.job_title.trim() || null,
        start_date: new Date(payload.start_date).toISOString(),
        workshop_id: payload.workshop_id,
        status: payload.status,
        pin: payload.pin.trim(),
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
        case "name": av = `${a.last_name} ${a.first_name}`; bv = `${b.last_name} ${b.first_name}`; break;
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
    setDialogOpen(true);
  };

  const openEdit = (t: Technician) => {
    setEditingId(t.id);
    setErrors({});
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
      job_title: t.job_title ?? "",
      start_date: t.start_date ? format(new Date(t.start_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      workshop_id: t.workshop_id ?? "",
      status: t.status ?? "active",
      pin: t.pin ?? "",
      employee_number: t.employee_number ?? "",
      ni_number: t.ni_number ?? "",
      labour_type: t.labour_type ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = technicianSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({ title: "Please fix the errors below", description: "Some fields are invalid.", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateTech.mutateAsync({ id: editingId, payload: result.data });
      } else {
        await createTech.mutateAsync(result.data);
      }
      toast({ title: editingId ? "Technician updated" : "Technician added" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setErrors({});
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
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Personal details</h3>
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
            </section>

            <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left group">
                  <h3 className="text-sm font-semibold">Address details</h3>
                  {addressOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-3 pt-3">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs">Telephone number</Label>
                    <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={errCls("phone")} />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email address</Label>
                    <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={errCls("email")} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Employment</h3>
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
                  <Label className="text-xs">Workshop *</Label>
                  <Popover open={workshopOpen} onOpenChange={setWorkshopOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 bg-card font-normal", errors.workshop_id && "border-destructive focus-visible:ring-destructive")}>
                        {form.workshop_id ? workshopName(form.workshop_id) : <span className="text-muted-foreground">Select workshop...</span>}
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
                              <CommandItem key={w.id} value={w.name} onSelect={() => { updateField("workshop_id", w.id); setWorkshopOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.workshop_id === w.id ? "opacity-100" : "opacity-0")} />
                                {w.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.workshop_id && <p className="text-xs text-destructive">{errors.workshop_id}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Start date *</Label>
                  <DatePicker
                    value={form.start_date}
                    onChange={(d) => updateField("start_date", d)}
                    className={cn(errors.start_date && "border-destructive")}
                  />
                  {errors.start_date && <p className="text-xs text-destructive">{errors.start_date as any}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">PIN *</Label>
                  <Input
                    inputMode="numeric"
                    value={form.pin}
                    onChange={(e) => updateField("pin", e.target.value.replace(/\D/g, ""))}
                    className={errCls("pin")}
                    placeholder="Minimum 4 digits"
                  />
                  {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee number</Label>
                  <Input value={form.employee_number} onChange={(e) => updateField("employee_number", e.target.value)} className={errCls("employee_number")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">N.I. number</Label>
                  <Input value={form.ni_number} onChange={(e) => updateField("ni_number", e.target.value.toUpperCase())} className={errCls("ni_number")} />
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
              </div>
            </section>
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
