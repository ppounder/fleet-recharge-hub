import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Search, Columns3, ArrowUp, ArrowDown, ChevronsUpDown, Check, Pencil, Trash2, GripVertical } from "lucide-react";

import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { cn } from "@/lib/utils";

export const WORKSHOP_SERVICES: { key: string; label: string }[] = [
  { key: "bodyshop", label: "Bodyshop" },
  { key: "livery", label: "Livery" },
  { key: "mobile_repairs", label: "Mobile Repairs" },
  { key: "parts", label: "Parts" },
  { key: "roadside_recovery", label: "Roadside Recovery" },
  { key: "smr", label: "Service, Maintenance and Repair (SMR)" },
  { key: "tyres", label: "Tyres" },
  { key: "workshop", label: "Workshop" },
];
const ALL_SERVICE_KEYS = WORKSHOP_SERVICES.map((s) => s.key);
const serviceLabel = (k: string) => WORKSHOP_SERVICES.find((s) => s.key === k)?.label ?? k;

type Workshop = {
  id: string;
  name: string;
  pl_account_number: string | null;
  reference_number: string | null;
  parent_supplier_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town_city: string | null;
  county: string | null;
  country: string | null;
  postcode: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  services: string[] | null;
  internal_company: boolean;
};

type ColKey = "name" | "pl_account_number" | "reference_number" | "town_city" | "county" | "country" | "postcode" | "contact_phone" | "contact_email" | "services";

const COLUMNS: { key: ColKey; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Company name", sortable: true },
  { key: "pl_account_number", label: "P/L Account", sortable: true },
  { key: "reference_number", label: "Reference", sortable: true },
  { key: "town_city", label: "Town/City", sortable: true },
  { key: "county", label: "County", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "postcode", label: "Postcode", sortable: true },
  { key: "contact_phone", label: "Telephone", sortable: false },
  { key: "contact_email", label: "Email", sortable: true },
  { key: "services", label: "Services", sortable: false },
];

const LOCKED_COLS: ColKey[] = ["name"];
const DEFAULT_ORDER: ColKey[] = COLUMNS.map((c) => c.key);
const DEFAULT_VISIBLE: ColKey[] = COLUMNS.map((c) => c.key);

const workshopSchema = z.object({
  name: z.string().trim().min(1, { message: "Company name is required" }).max(150),
  pl_account_number: z.string().trim().max(50),
  reference_number: z.string().trim().max(50),
  parent_supplier_id: z.string().uuid().nullable(),
  internal_company: z.boolean(),
  address_line1: z.string().trim().min(1, { message: "Address line 1 is required" }).max(150),
  address_line2: z.string().trim().max(150),
  address_line3: z.string().trim().max(150),
  town_city: z.string().trim().min(1, { message: "Town/City is required" }).max(100),
  county: z.string().trim().max(100),
  country: z.string().trim().min(1, { message: "Country is required" }).max(2),
  postcode: z.string().trim().min(1, { message: "Postcode is required" }).max(20),
  contact_phone: z
    .string()
    .trim()
    .min(1, { message: "Telephone number is required" })
    .max(20)
    .refine((v) => /^\+?[0-9\s()-]{7,}$/.test(v), { message: "Enter a valid telephone number" }),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Enter a valid email address" }),
  services: z.array(z.string()).min(1, { message: "Select at least one service" }),
});

type WorkshopForm = z.infer<typeof workshopSchema>;
type FormErrors = Partial<Record<keyof WorkshopForm, string>>;

const emptyForm = (): WorkshopForm => ({
  name: "",
  pl_account_number: "",
  reference_number: "",
  parent_supplier_id: null,
  internal_company: true,
  address_line1: "",
  address_line2: "",
  address_line3: "",
  town_city: "",
  county: "",
  country: "",
  postcode: "",
  contact_phone: "",
  contact_email: "",
  services: ["workshop"],
});

type WorkshopContact = {
  id: string;
  supplier_id?: string;
  full_name: string;
  position: string;
  email: string;
  phone: string;
  _isNew?: boolean;
};

const contactSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Full name is required" }).max(150),
  position: z.string().trim().max(100),
  email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Enter a valid email address" }),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[0-9\s()-]{7,}$/.test(v), { message: "Enter a valid telephone number" }),
});

const emptyContact = (): WorkshopContact => ({
  id: (crypto as any).randomUUID?.() ?? String(Math.random()),
  full_name: "",
  position: "",
  email: "",
  phone: "",
  _isNew: true,
});

export default function Workshops() {
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
  const [form, setForm] = useState<WorkshopForm>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [countryOpen, setCountryOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [contacts, setContacts] = useState<WorkshopContact[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<WorkshopContact>(emptyContact());
  const [contactDraftErrors, setContactDraftErrors] = useState<Partial<Record<keyof WorkshopContact, string>>>({});
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);

  const openAddContact = () => {
    setEditingContactId(null);
    setContactDraft(emptyContact());
    setContactDraftErrors({});
    setContactDialogOpen(true);
  };
  const openEditContact = (c: WorkshopContact) => {
    setEditingContactId(c.id);
    setContactDraft({ ...c });
    setContactDraftErrors({});
    setContactDialogOpen(true);
  };
  const saveContactDraft = () => {
    const res = contactSchema.safeParse(contactDraft);
    if (!res.success) {
      const row: Partial<Record<keyof WorkshopContact, string>> = {};
      for (const issue of res.error.issues) {
        const k = issue.path[0] as keyof WorkshopContact;
        if (!row[k]) row[k] = issue.message;
      }
      setContactDraftErrors(row);
      return;
    }
    if (editingContactId) {
      setContacts((prev) => prev.map((c) => (c.id === editingContactId ? { ...contactDraft, id: editingContactId } : c)));
    } else {
      setContacts((prev) => [...prev, { ...contactDraft }]);
    }
    setContactDialogOpen(false);
  };

  const updateField = <K extends keyof WorkshopForm>(key: K, value: WorkshopForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ["workshops-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("*")
        .eq("internal_company", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Workshop[];
    },
  });

  const { data: parentSuppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as { id: string; name: string }[];
    },
  });

  const createWorkshop = useMutation({
    mutationFn: async (payload: WorkshopForm) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .insert({
          ...payload,
          internal_company: true,
          provides_parts: payload.services.includes("parts"),
          provides_tyres: payload.services.includes("tyres"),
          provides_workshop: payload.services.includes("workshop"),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workshops-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const updateWorkshop = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: WorkshopForm }) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .update({
          ...payload,
          internal_company: true,
          provides_parts: payload.services.includes("parts"),
          provides_tyres: payload.services.includes("tyres"),
          provides_workshop: payload.services.includes("workshop"),
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workshops-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const deleteWorkshop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workshops-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? workshops.filter((s) =>
          [s.name, s.pl_account_number, s.reference_number, s.town_city, s.county, s.country, s.postcode, s.contact_email, s.contact_phone]
            .some((v) => v?.toLowerCase().includes(q))
        )
      : workshops;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [workshops, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const countryName = (code: string) => ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (s: Workshop) => {
    setEditingId(s.id);
    setErrors({});
    setDeletedContactIds([]);
    const svc = s.services && s.services.length > 0 ? s.services : [...ALL_SERVICE_KEYS];
    setForm({
      name: s.name ?? "",
      pl_account_number: s.pl_account_number ?? "",
      reference_number: s.reference_number ?? "",
      address_line1: s.address_line1 ?? "",
      address_line2: s.address_line2 ?? "",
      address_line3: s.address_line3 ?? "",
      town_city: s.town_city ?? "",
      county: s.county ?? "",
      country: s.country ?? "",
      postcode: s.postcode ?? "",
      contact_phone: s.contact_phone ?? "",
      contact_email: s.contact_email ?? "",
      services: svc,
    });
    setDialogOpen(true);
    const { data, error } = await supabase
      .from("supplier_contacts" as any)
      .select("*")
      .eq("supplier_id", s.id)
      .order("created_at");
    if (!error && data) {
      setContacts(
        (data as any[]).map((c) => ({
          id: c.id,
          supplier_id: c.supplier_id,
          full_name: c.full_name ?? "",
          position: c.position ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
        }))
      );
    } else {
      setContacts([]);
    }
  };

  const removeContact = (id: string) => {
    setContacts((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target && !target._isNew) setDeletedContactIds((d) => [...d, id]);
      return prev.filter((c) => c.id !== id);
    });
  };

  const persistContacts = async (supplierId: string) => {
    if (deletedContactIds.length) {
      const { error } = await supabase
        .from("supplier_contacts" as any)
        .delete()
        .in("id", deletedContactIds);
      if (error) throw error;
    }
    for (const c of contacts) {
      const payload = {
        supplier_id: supplierId,
        full_name: c.full_name.trim(),
        position: c.position.trim() || null,
        email: c.email.trim() || null,
        phone: c.phone.trim() || null,
      };
      if (c._isNew) {
        const { error } = await supabase.from("supplier_contacts" as any).insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplier_contacts" as any)
          .update(payload as any)
          .eq("id", c.id);
        if (error) throw error;
      }
    }
  };

  const handleSave = async () => {
    const result = workshopSchema.safeParse(form);
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
      let supplierId = editingId;
      if (editingId) {
        await updateWorkshop.mutateAsync({ id: editingId, payload: result.data });
      } else {
        const created: any = await createWorkshop.mutateAsync(result.data);
        supplierId = created?.id ?? null;
      }
      if (supplierId) await persistContacts(supplierId);
      toast({ title: editingId ? "Workshop updated" : "Workshop added" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setErrors({});
      setContacts([]);
      setDeletedContactIds([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWorkshop.mutateAsync(deleteId);
      toast({ title: "Workshop deleted" });
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

  const toggleService = (key: string, checked: boolean) => {
    setForm((prev) => {
      const set = new Set(prev.services);
      if (checked) set.add(key); else set.delete(key);
      return { ...prev, services: Array.from(set) };
    });
    if (errors.services) setErrors((prev) => ({ ...prev, services: undefined }));
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Workshops</h1>
          <p className="text-muted-foreground text-sm">Manage your internal workshop directory.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workshops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add workshop
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
              <div className="p-6 text-center text-muted-foreground">No workshops found.</div>
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
                            ) : (
                              c.label
                            )}
                          </TableHead>
                        );
                      })}
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(s)}>
                        {columnOrder.filter((k) => visibleCols.includes(k)).map((k) => {
                          switch (k) {
                            case "name": return <TableCell key={k} className="font-medium">{s.name}</TableCell>;
                            case "pl_account_number": return <TableCell key={k}>{s.pl_account_number || "—"}</TableCell>;
                            case "reference_number": return <TableCell key={k}>{s.reference_number || "—"}</TableCell>;
                            case "town_city": return <TableCell key={k}>{s.town_city || "—"}</TableCell>;
                            case "county": return <TableCell key={k}>{s.county || "—"}</TableCell>;
                            case "country": return <TableCell key={k}>{s.country ? countryName(s.country) : "—"}</TableCell>;
                            case "postcode": return <TableCell key={k}>{s.postcode || "—"}</TableCell>;
                            case "contact_phone": return <TableCell key={k}>{s.contact_phone || "—"}</TableCell>;
                            case "contact_email": return <TableCell key={k}>{s.contact_email || "—"}</TableCell>;
                            case "services":
                              return (
                                <TableCell key={k} className="max-w-[260px]">
                                  <div className="flex flex-nowrap gap-1 overflow-hidden">
                                    {(s.services && s.services.length > 0) ? (
                                      s.services.map((sv) => (
                                        <Badge key={sv} variant="secondary" className="whitespace-nowrap shrink-0">{serviceLabel(sv)}</Badge>
                                      ))
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            default: return null;
                          }
                        })}
                        <TableCell className="w-24 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit workshop</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete workshop</TooltipContent>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit workshop" : "Add workshop"}</DialogTitle>
            <DialogDescription>Enter the workshop details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Workshop details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="name" className="text-xs">Company name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={errCls("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pl_account_number" className="text-xs">P/L Account number</Label>
                  <Input id="pl_account_number" value={form.pl_account_number} onChange={(e) => updateField("pl_account_number", e.target.value)} className={errCls("pl_account_number")} />
                  {errors.pl_account_number && <p className="text-xs text-destructive">{errors.pl_account_number}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reference_number" className="text-xs">Reference number</Label>
                  <Input id="reference_number" value={form.reference_number} onChange={(e) => updateField("reference_number", e.target.value)} className={errCls("reference_number")} />
                  {errors.reference_number && <p className="text-xs text-destructive">{errors.reference_number}</p>}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line1" className="text-xs">Address line 1 *</Label>
                  <Input id="address_line1" value={form.address_line1} onChange={(e) => updateField("address_line1", e.target.value)} className={errCls("address_line1")} />
                  {errors.address_line1 && <p className="text-xs text-destructive">{errors.address_line1}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line2" className="text-xs">Address line 2</Label>
                  <Input id="address_line2" value={form.address_line2} onChange={(e) => updateField("address_line2", e.target.value)} className={errCls("address_line2")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line3" className="text-xs">Address line 3</Label>
                  <Input id="address_line3" value={form.address_line3} onChange={(e) => updateField("address_line3", e.target.value)} className={errCls("address_line3")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="town_city" className="text-xs">Town/City *</Label>
                  <Input id="town_city" value={form.town_city} onChange={(e) => updateField("town_city", e.target.value)} className={errCls("town_city")} />
                  {errors.town_city && <p className="text-xs text-destructive">{errors.town_city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="county" className="text-xs">County</Label>
                  <Input id="county" value={form.county} onChange={(e) => updateField("county", e.target.value)} className={errCls("county")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Country *</Label>
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
                  <Label htmlFor="postcode" className="text-xs">Postcode *</Label>
                  <Input id="postcode" value={form.postcode} onChange={(e) => updateField("postcode", e.target.value)} className={errCls("postcode")} />
                  {errors.postcode && <p className="text-xs text-destructive">{errors.postcode}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone" className="text-xs">Telephone number *</Label>
                  <Input id="contact_phone" value={form.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} className={errCls("contact_phone")} />
                  {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email" className="text-xs">Email address</Label>
                  <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} className={errCls("contact_email")} />
                  {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Services provided *</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {WORKSHOP_SERVICES.map((svc) => {
                  const checked = form.services.includes(svc.key);
                  return (
                    <label key={svc.key} className={cn("flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 cursor-pointer", errors.services && "border-destructive")}>
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleService(svc.key, !!v)} />
                      <span className="text-sm">{svc.label}</span>
                    </label>
                  );
                })}
              </div>
              {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contacts</h3>
                <Button type="button" variant="outline" size="sm" onClick={openAddContact}>
                  <Plus className="w-4 h-4 mr-1" /> Add contact
                </Button>
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telephone</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          No contacts added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{c.full_name}</TableCell>
                          <TableCell className="text-sm">{c.position || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm">{c.email || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm">{c.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button type="button" size="icon" variant="ghost" onClick={() => openEditContact(c)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost"
                                className="text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => setConfirmDeleteContactId(c.id)}>
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
            </section>
          </div>

          <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingContactId ? "Edit contact" : "Add contact"}</DialogTitle>
                <DialogDescription>Enter the contact details below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full name *</Label>
                  <Input value={contactDraft.full_name} onChange={(e) => setContactDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className={cn(contactDraftErrors.full_name && "border-destructive focus-visible:ring-destructive")} />
                  {contactDraftErrors.full_name && <p className="text-xs text-destructive">{contactDraftErrors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Input value={contactDraft.position} onChange={(e) => setContactDraft((d) => ({ ...d, position: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={contactDraft.email} onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                    className={cn(contactDraftErrors.email && "border-destructive focus-visible:ring-destructive")} />
                  {contactDraftErrors.email && <p className="text-xs text-destructive">{contactDraftErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telephone number</Label>
                  <Input value={contactDraft.phone} onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                    className={cn(contactDraftErrors.phone && "border-destructive focus-visible:ring-destructive")} />
                  {contactDraftErrors.phone && <p className="text-xs text-destructive">{contactDraftErrors.phone}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveContactDraft}>{editingContactId ? "Save changes" : "Add contact"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={confirmDeleteContactId !== null} onOpenChange={(o) => !o && setConfirmDeleteContactId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to remove this contact?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (confirmDeleteContactId) removeContact(confirmDeleteContactId);
                    setConfirmDeleteContactId(null);
                  }}
                >
                  Yes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createWorkshop.isPending || updateWorkshop.isPending}>
              {createWorkshop.isPending || updateWorkshop.isPending
                ? "Saving..."
                : editingId ? "Save changes" : "Save workshop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workshop?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workshop will be permanently removed from your directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkshop.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteWorkshop.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkshop.isPending ? "Deleting..." : "Delete"}
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
    if (open) {
      setDraftOrder(columnOrder);
      setDraftVisible(visibleCols);
    }
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
