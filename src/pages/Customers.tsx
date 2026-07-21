import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Search, Columns3, ArrowUp, ArrowDown, ChevronsUpDown, Check, Pencil, Trash2, GripVertical } from "lucide-react";

import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  parent_customer_id: string | null;
  sl_account_number: string | null;
  reference_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town_city: string | null;
  county: string | null;
  country: string | null;
  postcode: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  customer_type: string | null;
};

type ColKey = "name" | "customer_type" | "sl_account_number" | "reference_number" | "town_city" | "county" | "country" | "postcode" | "contact_phone" | "contact_email";

const CUSTOMER_TYPES: { value: string; label: string }[] = [
  { value: "broker", label: "Broker" },
  { value: "corporate", label: "Corporate" },
  { value: "internal", label: "Internal" },
  { value: "public_sector", label: "Public Sector" },
  { value: "retail", label: "Retail" },
];

const typeLabel = (v: string | null | undefined) =>
  CUSTOMER_TYPES.find((t) => t.value === v)?.label ?? "—";

const COLUMNS: { key: ColKey; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Company name", sortable: true },
  { key: "customer_type", label: "Customer type", sortable: true },
  { key: "sl_account_number", label: "S/L Account", sortable: true },
  { key: "reference_number", label: "Reference", sortable: true },
  { key: "town_city", label: "Town/City", sortable: true },
  { key: "county", label: "County", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "postcode", label: "Postcode", sortable: true },
  { key: "contact_phone", label: "Telephone", sortable: false },
  { key: "contact_email", label: "Email", sortable: true },
];

const LOCKED_COLS: ColKey[] = ["name"];
const DEFAULT_ORDER: ColKey[] = COLUMNS.map((c) => c.key);
const DEFAULT_VISIBLE: ColKey[] = COLUMNS.map((c) => c.key);

const customerSchema = z.object({
  name: z.string().trim().min(1, { message: "Company name is required" }).max(150),
  parent_customer_id: z.string().nullable(),
  sl_account_number: z.string().trim().max(50, { message: "S/L Account must be less than 50 characters" }),
  reference_number: z.string().trim().max(50, { message: "Reference number must be less than 50 characters" }),
  customer_type: z.enum(["broker", "corporate", "internal", "public_sector", "retail"], {
    errorMap: () => ({ message: "Customer type is required" }),
  }),
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
});

type CustomerForm = z.infer<typeof customerSchema>;
type FormErrors = Partial<Record<keyof CustomerForm, string>>;

const emptyForm: CustomerForm = {
  name: "",
  parent_customer_id: null,
  sl_account_number: "",
  reference_number: "",
  customer_type: undefined as any,
  address_line1: "",
  address_line2: "",
  address_line3: "",
  town_city: "",
  county: "",
  country: "",
  postcode: "",
  contact_phone: "",
  contact_email: "",
};

type CustomerContact = {
  id: string;
  customer_id?: string;
  full_name: string;
  position: string;
  email: string;
  phone: string;
  _isNew?: boolean;
};

const contactSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Full name is required" }).max(150),
  position: z.string().trim().max(100),
  email: z.string().trim().max(255).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Enter a valid email address" }),
  phone: z.string().trim().max(20).refine((v) => v === "" || /^\+?[0-9\s()-]{7,}$/.test(v), { message: "Enter a valid telephone number" }),
});

const emptyContact = (): CustomerContact => ({
  id: (crypto as any).randomUUID?.() ?? String(Math.random()),
  full_name: "",
  position: "",
  email: "",
  phone: "",
  _isNew: true,
});

export default function Customers() {
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
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [parentOpen, setParentOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<CustomerContact>(emptyContact());
  const [contactDraftErrors, setContactDraftErrors] = useState<Partial<Record<keyof CustomerContact, string>>>({});
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);

  const openAddContact = () => {
    setEditingContactId(null);
    setContactDraft(emptyContact());
    setContactDraftErrors({});
    setContactDialogOpen(true);
  };
  const openEditContact = (c: CustomerContact) => {
    setEditingContactId(c.id);
    setContactDraft({ ...c });
    setContactDraftErrors({});
    setContactDialogOpen(true);
  };
  const saveContactDraft = () => {
    const res = contactSchema.safeParse({
      full_name: contactDraft.full_name,
      position: contactDraft.position,
      email: contactDraft.email,
      phone: contactDraft.phone,
    });
    if (!res.success) {
      const row: Partial<Record<keyof CustomerContact, string>> = {};
      for (const issue of res.error.issues) {
        const k = issue.path[0] as keyof CustomerContact;
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

  const updateField = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Customer[];
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (payload: CustomerForm) => {
      const { data, error } = await supabase
        .from("customers" as any)
        .insert({ ...payload, parent_customer_id: payload.parent_customer_id || null } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers-directory"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CustomerForm }) => {
      const { data, error } = await supabase
        .from("customers" as any)
        .update({ ...payload, parent_customer_id: payload.parent_customer_id || null } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers-directory"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers-directory"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? customers.filter((s) =>
          [s.name, s.sl_account_number, s.town_city, s.county, s.country, s.postcode, s.contact_email, s.contact_phone, typeLabel(s.customer_type)]
            .some((v) => v?.toLowerCase().includes(q))
        )
      : customers;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [customers, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const parentName = (id: string | null) => customers.find((s) => s.id === id)?.name ?? "";
  const countryName = (code: string) => ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (s: Customer) => {
    setEditingId(s.id);
    setErrors({});
    setDeletedContactIds([]);
    setForm({
      name: s.name ?? "",
      parent_customer_id: s.parent_customer_id,
      sl_account_number: s.sl_account_number ?? "",
      reference_number: s.reference_number ?? "",
      customer_type: (s.customer_type as any) ?? (undefined as any),
      address_line1: s.address_line1 ?? "",
      address_line2: s.address_line2 ?? "",
      address_line3: s.address_line3 ?? "",
      town_city: s.town_city ?? "",
      county: s.county ?? "",
      country: s.country ?? "",
      postcode: s.postcode ?? "",
      contact_phone: s.contact_phone ?? "",
      contact_email: s.contact_email ?? "",
    });
    setDialogOpen(true);
    const { data, error } = await supabase
      .from("customer_contacts" as any)
      .select("*")
      .eq("customer_id", s.id)
      .order("created_at");
    if (!error && data) {
      setContacts(
        (data as any[]).map((c) => ({
          id: c.id,
          customer_id: c.customer_id,
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

  const persistContacts = async (customerId: string) => {
    if (deletedContactIds.length) {
      const { error } = await supabase.from("customer_contacts" as any).delete().in("id", deletedContactIds);
      if (error) throw error;
    }
    for (const c of contacts) {
      const payload = {
        customer_id: customerId,
        full_name: c.full_name.trim(),
        position: c.position.trim() || null,
        email: c.email.trim() || null,
        phone: c.phone.trim() || null,
      };
      if (c._isNew) {
        const { error } = await supabase.from("customer_contacts" as any).insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_contacts" as any).update(payload as any).eq("id", c.id);
        if (error) throw error;
      }
    }
  };

  const handleSave = async () => {
    const result = customerSchema.safeParse(form);
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
      let customerId = editingId;
      if (editingId) {
        await updateCustomer.mutateAsync({ id: editingId, payload: result.data });
      } else {
        const created: any = await createCustomer.mutateAsync(result.data);
        customerId = created?.id ?? null;
      }
      if (customerId) await persistContacts(customerId);
      toast({ title: editingId ? "Customer updated" : "Customer added" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
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
      await deleteCustomer.mutateAsync(deleteId);
      toast({ title: "Customer deleted" });
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage your customer directory.</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 bg-card"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={openAdd}>
                  <Plus className="w-4 h-4 mr-1" /> Add customer
                </Button>
                <ManageColumnsDialog
                  visibleCols={visibleCols}
                  columnOrder={columnOrder}
                  onApply={(order, visible) => { setColumnOrder(order); setVisibleCols(visible); }}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No customers found.</div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div className="rounded-md border">
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
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => openEdit(s)}>
                        {columnOrder.filter((k) => visibleCols.includes(k)).map((k) => {
                          switch (k) {
                            case "name": return <TableCell key={k} className="font-medium">{s.name}</TableCell>;
                            case "customer_type": return <TableCell key={k}>{typeLabel(s.customer_type)}</TableCell>;
                            case "sl_account_number": return <TableCell key={k}>{s.sl_account_number || "—"}</TableCell>;
                            case "town_city": return <TableCell key={k}>{s.town_city || "—"}</TableCell>;
                            case "county": return <TableCell key={k}>{s.county || "—"}</TableCell>;
                            case "country": return <TableCell key={k}>{s.country ? countryName(s.country) : "—"}</TableCell>;
                            case "postcode": return <TableCell key={k}>{s.postcode || "—"}</TableCell>;
                            case "contact_phone": return <TableCell key={k}>{s.contact_phone || "—"}</TableCell>;
                            case "contact_email": return <TableCell key={k}>{s.contact_email || "—"}</TableCell>;
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
                              <TooltipContent>Edit customer</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete customer</TooltipContent>
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
            <DialogTitle>{editingId ? "Edit customer" : "Add customer"}</DialogTitle>
            <DialogDescription>Enter the customer details below.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <CollapsibleCard title="Customer details">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="name" className="text-xs">Company name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={!!errors.name} className={errCls("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parent company</Label>
                  <Popover open={parentOpen} onOpenChange={setParentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                        {form.parent_customer_id ? parentName(form.parent_customer_id) : <span className="text-muted-foreground">Select...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search customer..." />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { updateField("parent_customer_id", null); setParentOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", !form.parent_customer_id ? "opacity-100" : "opacity-0")} />
                              None
                            </CommandItem>
                            {customers.filter((c) => c.id !== editingId).map((s) => (
                              <CommandItem key={s.id} value={s.name} onSelect={() => { updateField("parent_customer_id", s.id); setParentOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.parent_customer_id === s.id ? "opacity-100" : "opacity-0")} />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Customer type *</Label>
                  <Select
                    value={form.customer_type as any || undefined}
                    onValueChange={(v) => updateField("customer_type", v as any)}
                  >
                    <SelectTrigger className={cn("bg-card", errors.customer_type && "border-destructive focus:ring-destructive")}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer_type && <p className="text-xs text-destructive">{errors.customer_type}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sl_account_number" className="text-xs">S/L Account number</Label>
                  <Input id="sl_account_number" value={form.sl_account_number}
                    onChange={(e) => updateField("sl_account_number", e.target.value)}
                    aria-invalid={!!errors.sl_account_number} className={errCls("sl_account_number")} />
                  {errors.sl_account_number && <p className="text-xs text-destructive">{errors.sl_account_number}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reference_number" className="text-xs">Reference number</Label>
                  <Input id="reference_number" value={form.reference_number}
                    onChange={(e) => updateField("reference_number", e.target.value)}
                    aria-invalid={!!errors.reference_number} className={errCls("reference_number")} />
                  {errors.reference_number && <p className="text-xs text-destructive">{errors.reference_number}</p>}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line1" className="text-xs">Address line 1 *</Label>
                  <Input id="address_line1" value={form.address_line1}
                    onChange={(e) => updateField("address_line1", e.target.value)}
                    aria-invalid={!!errors.address_line1} className={errCls("address_line1")} />
                  {errors.address_line1 && <p className="text-xs text-destructive">{errors.address_line1}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line2" className="text-xs">Address line 2</Label>
                  <Input id="address_line2" value={form.address_line2}
                    onChange={(e) => updateField("address_line2", e.target.value)}
                    className={errCls("address_line2")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line3" className="text-xs">Address line 3</Label>
                  <Input id="address_line3" value={form.address_line3}
                    onChange={(e) => updateField("address_line3", e.target.value)}
                    className={errCls("address_line3")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="town_city" className="text-xs">Town/City *</Label>
                  <Input id="town_city" value={form.town_city}
                    onChange={(e) => updateField("town_city", e.target.value)}
                    aria-invalid={!!errors.town_city} className={errCls("town_city")} />
                  {errors.town_city && <p className="text-xs text-destructive">{errors.town_city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="county" className="text-xs">County</Label>
                  <Input id="county" value={form.county}
                    onChange={(e) => updateField("county", e.target.value)}
                    className={errCls("county")} />
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
                  <Input id="postcode" value={form.postcode}
                    onChange={(e) => updateField("postcode", e.target.value)}
                    aria-invalid={!!errors.postcode} className={errCls("postcode")} />
                  {errors.postcode && <p className="text-xs text-destructive">{errors.postcode}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone" className="text-xs">Telephone number *</Label>
                  <Input id="contact_phone" value={form.contact_phone}
                    onChange={(e) => updateField("contact_phone", e.target.value)}
                    aria-invalid={!!errors.contact_phone} className={errCls("contact_phone")} />
                  {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email" className="text-xs">Email address</Label>
                  <Input id="contact_email" type="email" value={form.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    aria-invalid={!!errors.contact_email} className={errCls("contact_email")} />
                  {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
                </div>

              </div>
            </CollapsibleCard>

            <CollapsibleCard
              title="Contacts"
              action={
                <Button type="button" variant="outline" size="sm" onClick={openAddContact}>
                  <Plus className="w-4 h-4 mr-1" /> Add contact
                </Button>
              }
            >
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
            </CollapsibleCard>
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
                  <Input value={contactDraft.full_name}
                    onChange={(e) => setContactDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className={cn(contactDraftErrors.full_name && "border-destructive focus-visible:ring-destructive")} />
                  {contactDraftErrors.full_name && <p className="text-xs text-destructive">{contactDraftErrors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Input value={contactDraft.position}
                    onChange={(e) => setContactDraft((d) => ({ ...d, position: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={contactDraft.email}
                    onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                    className={cn(contactDraftErrors.email && "border-destructive focus-visible:ring-destructive")} />
                  {contactDraftErrors.email && <p className="text-xs text-destructive">{contactDraftErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telephone number</Label>
                  <Input value={contactDraft.phone}
                    onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
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
                <AlertDialogAction onClick={() => {
                  if (confirmDeleteContactId) removeContact(confirmDeleteContactId);
                  setConfirmDeleteContactId(null);
                }}>Yes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCustomer.isPending || updateCustomer.isPending}>
              {createCustomer.isPending || updateCustomer.isPending
                ? "Saving..."
                : editingId ? "Save changes" : "Save customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The customer will be permanently removed from your directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCustomer.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteCustomer.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomer.isPending ? "Deleting..." : "Delete"}
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
              <div key={k} draggable
                onDragStart={() => setDragKey(k)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(k)}
                onDragEnd={() => setDragKey(null)}
                className={cn("flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/50 cursor-grab active:cursor-grabbing",
                  dragKey === k && "opacity-50")}>
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
