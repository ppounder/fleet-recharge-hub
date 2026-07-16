import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Search, Columns3, ArrowUp, ArrowDown, ChevronsUpDown, Check, Pencil, Trash2, GripVertical, X } from "lucide-react";

import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  parent_supplier_id: string | null;
  pl_account_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town_city: string | null;
  county: string | null;
  country: string | null;
  postcode: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  provides_parts: boolean;
  provides_tyres: boolean;
  provides_workshop: boolean;
  internal_company: boolean;
};

type ColKey = "name" | "pl_account_number" | "town_city" | "county" | "country" | "postcode" | "contact_phone" | "contact_email" | "services";

const COLUMNS: { key: ColKey; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Company name", sortable: true },
  { key: "pl_account_number", label: "P/L Account", sortable: true },
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


const supplierSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Company name is required" })
      .max(150, { message: "Company name must be less than 150 characters" }),
    parent_supplier_id: z.string().nullable(),
    pl_account_number: z
      .string()
      .trim()
      .max(50, { message: "P/L Account must be less than 50 characters" }),
    address_line1: z
      .string()
      .trim()
      .min(1, { message: "Address line 1 is required" })
      .max(150, { message: "Address line 1 must be less than 150 characters" }),
    address_line2: z.string().trim().max(150, { message: "Address line 2 must be less than 150 characters" }),
    address_line3: z.string().trim().max(150, { message: "Address line 3 must be less than 150 characters" }),
    town_city: z
      .string()
      .trim()
      .min(1, { message: "Town/City is required" })
      .max(100, { message: "Town/City must be less than 100 characters" }),
    county: z.string().trim().max(100, { message: "County must be less than 100 characters" }),
    country: z
      .string()
      .trim()
      .min(1, { message: "Country is required" })
      .max(2, { message: "Invalid country" }),
    postcode: z
      .string()
      .trim()
      .min(1, { message: "Postcode is required" })
      .max(20, { message: "Postcode must be less than 20 characters" }),
    contact_phone: z
      .string()
      .trim()
      .min(1, { message: "Telephone number is required" })
      .max(20, { message: "Telephone must be less than 20 characters" })
      .refine((v) => /^\+?[0-9\s()-]{7,}$/.test(v), {
        message: "Enter a valid telephone number",
      }),
    contact_email: z
      .string()
      .trim()
      .max(255, { message: "Email must be less than 255 characters" })
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "Enter a valid email address",
      }),
    provides_parts: z.boolean(),
    provides_tyres: z.boolean(),
    provides_workshop: z.boolean(),
    internal_company: z.boolean(),
  })
  .refine((d) => d.provides_parts || d.provides_tyres || d.provides_workshop, {
    message: "Select at least one service provided",
    path: ["provides_parts"],
  });

type SupplierForm = z.infer<typeof supplierSchema>;
type FormErrors = Partial<Record<keyof SupplierForm, string>>;

const emptyForm: SupplierForm = {
  name: "",
  parent_supplier_id: null,
  pl_account_number: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  town_city: "",
  county: "",
  country: "",
  postcode: "",
  contact_phone: "",
  contact_email: "",
  provides_parts: false,
  provides_tyres: false,
  provides_workshop: false,
  internal_company: false,
};

type SupplierContact = {
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

const emptyContact = (): SupplierContact => ({
  id: (crypto as any).randomUUID?.() ?? String(Math.random()),
  full_name: "",
  position: "",
  email: "",
  phone: "",
  _isNew: true,
});

export default function Suppliers() {
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
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [parentOpen, setParentOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);
  const [contactErrors, setContactErrors] = useState<Record<string, Partial<Record<keyof SupplierContact, string>>>>({});
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<SupplierContact>(emptyContact());
  const [contactDraftErrors, setContactDraftErrors] = useState<Partial<Record<keyof SupplierContact, string>>>({});
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);

  const openAddContact = () => {
    setEditingContactId(null);
    setContactDraft(emptyContact());
    setContactDraftErrors({});
    setContactDialogOpen(true);
  };
  const openEditContact = (c: SupplierContact) => {
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
      const row: Partial<Record<keyof SupplierContact, string>> = {};
      for (const issue of res.error.issues) {
        const k = issue.path[0] as keyof SupplierContact;
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

  const updateField = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Supplier[];
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (payload: SupplierForm) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .insert({
          ...payload,
          parent_supplier_id: payload.parent_supplier_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SupplierForm }) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .update({
          ...payload,
          parent_supplier_id: payload.parent_supplier_id || null,
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? suppliers.filter((s) =>
          [s.name, s.pl_account_number, s.town_city, s.county, s.country, s.postcode, s.contact_email, s.contact_phone]
            .some((v) => v?.toLowerCase().includes(q))
        )
      : suppliers;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [suppliers, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };




  const parentName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "";
  const countryName = (code: string) => ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setContacts([]);
    setDeletedContactIds([]);
    setContactErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (s: Supplier) => {
    setEditingId(s.id);
    setErrors({});
    setContactErrors({});
    setDeletedContactIds([]);
    setForm({
      name: s.name ?? "",
      parent_supplier_id: s.parent_supplier_id,
      pl_account_number: s.pl_account_number ?? "",
      address_line1: s.address_line1 ?? "",
      address_line2: s.address_line2 ?? "",
      address_line3: s.address_line3 ?? "",
      town_city: s.town_city ?? "",
      county: s.county ?? "",
      country: s.country ?? "",
      postcode: s.postcode ?? "",
      contact_phone: s.contact_phone ?? "",
      contact_email: s.contact_email ?? "",
      provides_parts: !!s.provides_parts,
      provides_tyres: !!s.provides_tyres,
      provides_workshop: !!s.provides_workshop,
      internal_company: !!(s as any).internal_company,
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

  const updateContact = (id: string, key: keyof SupplierContact, value: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
    setContactErrors((prev) => {
      const next = { ...prev };
      if (next[id]) { const row = { ...next[id] }; delete row[key]; next[id] = row; }
      return next;
    });
  };

  const addContact = () => setContacts((prev) => [...prev, emptyContact()]);

  const removeContact = (id: string) => {
    setContacts((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target && !target._isNew) setDeletedContactIds((d) => [...d, id]);
      return prev.filter((c) => c.id !== id);
    });
    setContactErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
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
    const result = supplierSchema.safeParse(form);
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
    // Validate contacts
    const cErrs: Record<string, Partial<Record<keyof SupplierContact, string>>> = {};
    for (const c of contacts) {
      const res = contactSchema.safeParse({
        full_name: c.full_name, position: c.position, email: c.email, phone: c.phone,
      });
      if (!res.success) {
        const row: Partial<Record<keyof SupplierContact, string>> = {};
        for (const issue of res.error.issues) {
          const k = issue.path[0] as keyof SupplierContact;
          if (k && !row[k]) row[k] = issue.message;
        }
        cErrs[c.id] = row;
      }
    }
    if (Object.keys(cErrs).length) {
      setContactErrors(cErrs);
      toast({ title: "Please fix contact errors", description: "Some contact fields are invalid.", variant: "destructive" });
      return;
    }
    try {
      let supplierId = editingId;
      if (editingId) {
        await updateSupplier.mutateAsync({ id: editingId, payload: result.data });
      } else {
        const created: any = await createSupplier.mutateAsync(result.data);
        supplierId = created?.id ?? null;
      }
      if (supplierId) await persistContacts(supplierId);
      toast({ title: editingId ? "Supplier updated" : "Supplier added" });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setErrors({});
      setContacts([]);
      setDeletedContactIds([]);
      setContactErrors({});
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSupplier.mutateAsync(deleteId);
      toast({ title: "Supplier deleted" });
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
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Manage your supplier directory.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add supplier
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
              <div className="p-6 text-center text-muted-foreground">No suppliers found.</div>
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
                              <button
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort(k)}
                              >
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
                            case "name":
                              return <TableCell key={k} className="font-medium">{s.name}</TableCell>;
                            case "pl_account_number":
                              return <TableCell key={k}>{s.pl_account_number || "—"}</TableCell>;
                            case "town_city":
                              return <TableCell key={k}>{s.town_city || "—"}</TableCell>;
                            case "county":
                              return <TableCell key={k}>{s.county || "—"}</TableCell>;
                            case "country":
                              return <TableCell key={k}>{s.country ? countryName(s.country) : "—"}</TableCell>;
                            case "postcode":
                              return <TableCell key={k}>{s.postcode || "—"}</TableCell>;
                            case "contact_phone":
                              return <TableCell key={k}>{s.contact_phone || "—"}</TableCell>;
                            case "contact_email":
                              return <TableCell key={k}>{s.contact_email || "—"}</TableCell>;
                            case "services":
                              return (
                                <TableCell key={k} className="max-w-[260px]">
                                  <div className="flex flex-nowrap gap-1 overflow-hidden">
                                    {s.provides_parts && <Badge variant="secondary" className="whitespace-nowrap shrink-0">Parts</Badge>}
                                    {s.provides_tyres && <Badge variant="secondary" className="whitespace-nowrap shrink-0">Tyres</Badge>}
                                    {s.provides_workshop && <Badge variant="secondary" className="whitespace-nowrap shrink-0">Workshop</Badge>}
                                    {!s.provides_parts && !s.provides_tyres && !s.provides_workshop && (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            default:
                              return null;
                          }
                        })}
                        <TableCell className="w-24 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit supplier</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete supplier</TooltipContent>
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
            <DialogTitle>{editingId ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>Enter the supplier details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Supplier details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="name" className="text-xs">Company name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={errCls("name")}
                  />
                  {errors.name && <p id="name-error" className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parent company</Label>
                  <Popover open={parentOpen} onOpenChange={setParentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                        {form.parent_supplier_id ? parentName(form.parent_supplier_id) : <span className="text-muted-foreground">Select...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandList>
                          <CommandEmpty>No suppliers found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { updateField("parent_supplier_id", null); setParentOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", !form.parent_supplier_id ? "opacity-100" : "opacity-0")} />
                              None
                            </CommandItem>
                            {suppliers.map((s) => (
                              <CommandItem key={s.id} value={s.name} onSelect={() => { updateField("parent_supplier_id", s.id); setParentOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.parent_supplier_id === s.id ? "opacity-100" : "opacity-0")} />
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
                  <Label className="text-xs">Internal company</Label>
                  <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 cursor-pointer w-fit h-10">
                    <Checkbox
                      checked={form.internal_company}
                      onCheckedChange={(v) => updateField("internal_company", !!v)}
                    />
                    <span className="text-sm">Internal company</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pl_account_number" className="text-xs">P/L Account number</Label>
                  <Input
                    id="pl_account_number"
                    value={form.pl_account_number}
                    onChange={(e) => updateField("pl_account_number", e.target.value)}
                    aria-invalid={!!errors.pl_account_number}
                    className={errCls("pl_account_number")}
                  />
                  {errors.pl_account_number && <p className="text-xs text-destructive">{errors.pl_account_number}</p>}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line1" className="text-xs">Address line 1 *</Label>
                  <Input
                    id="address_line1"
                    value={form.address_line1}
                    onChange={(e) => updateField("address_line1", e.target.value)}
                    aria-invalid={!!errors.address_line1}
                    className={errCls("address_line1")}
                  />
                  {errors.address_line1 && <p className="text-xs text-destructive">{errors.address_line1}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line2" className="text-xs">Address line 2</Label>
                  <Input
                    id="address_line2"
                    value={form.address_line2}
                    onChange={(e) => updateField("address_line2", e.target.value)}
                    aria-invalid={!!errors.address_line2}
                    className={errCls("address_line2")}
                  />
                  {errors.address_line2 && <p className="text-xs text-destructive">{errors.address_line2}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address_line3" className="text-xs">Address line 3</Label>
                  <Input
                    id="address_line3"
                    value={form.address_line3}
                    onChange={(e) => updateField("address_line3", e.target.value)}
                    aria-invalid={!!errors.address_line3}
                    className={errCls("address_line3")}
                  />
                  {errors.address_line3 && <p className="text-xs text-destructive">{errors.address_line3}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="town_city" className="text-xs">Town/City *</Label>
                  <Input
                    id="town_city"
                    value={form.town_city}
                    onChange={(e) => updateField("town_city", e.target.value)}
                    aria-invalid={!!errors.town_city}
                    className={errCls("town_city")}
                  />
                  {errors.town_city && <p className="text-xs text-destructive">{errors.town_city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="county" className="text-xs">County</Label>
                  <Input
                    id="county"
                    value={form.county}
                    onChange={(e) => updateField("county", e.target.value)}
                    aria-invalid={!!errors.county}
                    className={errCls("county")}
                  />
                  {errors.county && <p className="text-xs text-destructive">{errors.county}</p>}
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
                  <Input
                    id="postcode"
                    value={form.postcode}
                    onChange={(e) => updateField("postcode", e.target.value)}
                    aria-invalid={!!errors.postcode}
                    className={errCls("postcode")}
                  />
                  {errors.postcode && <p className="text-xs text-destructive">{errors.postcode}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone" className="text-xs">Telephone number *</Label>
                  <Input
                    id="contact_phone"
                    value={form.contact_phone}
                    onChange={(e) => updateField("contact_phone", e.target.value)}
                    aria-invalid={!!errors.contact_phone}
                    className={errCls("contact_phone")}
                  />
                  {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email" className="text-xs">Email address</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    aria-invalid={!!errors.contact_email}
                    className={errCls("contact_email")}
                  />
                  {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 cursor-pointer w-fit">
                    <Checkbox
                      checked={form.internal_company}
                      onCheckedChange={(v) => updateField("internal_company", !!v)}
                    />
                    <span className="text-sm">Internal company</span>
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Services provided *</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "provides_parts", label: "Parts supplier" },
                  { key: "provides_tyres", label: "Tyres" },
                  { key: "provides_workshop", label: "Workshop" },
                ].map((svc) => (
                  <label key={svc.key} className={cn("flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 cursor-pointer", errors.provides_parts && "border-destructive")}>
                    <Checkbox
                      checked={(form as any)[svc.key]}
                      onCheckedChange={(v) => {
                        setForm((prev) => ({ ...prev, [svc.key]: !!v }));
                        if (errors.provides_parts) setErrors((prev) => ({ ...prev, provides_parts: undefined }));
                      }}
                    />
                    <span className="text-sm">{svc.label}</span>
                  </label>
                ))}
              </div>
              {errors.provides_parts && <p className="text-xs text-destructive">{errors.provides_parts}</p>}
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
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => setConfirmDeleteContactId(c.id)}
                              >
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
                  <Input
                    value={contactDraft.full_name}
                    onChange={(e) => setContactDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className={cn(contactDraftErrors.full_name && "border-destructive focus-visible:ring-destructive")}
                  />
                  {contactDraftErrors.full_name && <p className="text-xs text-destructive">{contactDraftErrors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Input
                    value={contactDraft.position}
                    onChange={(e) => setContactDraft((d) => ({ ...d, position: e.target.value }))}
                    className={cn(contactDraftErrors.position && "border-destructive focus-visible:ring-destructive")}
                  />
                  {contactDraftErrors.position && <p className="text-xs text-destructive">{contactDraftErrors.position}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contactDraft.email}
                    onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                    className={cn(contactDraftErrors.email && "border-destructive focus-visible:ring-destructive")}
                  />
                  {contactDraftErrors.email && <p className="text-xs text-destructive">{contactDraftErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telephone number</Label>
                  <Input
                    value={contactDraft.phone}
                    onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                    className={cn(contactDraftErrors.phone && "border-destructive focus-visible:ring-destructive")}
                  />
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
            <Button onClick={handleSave} disabled={createSupplier.isPending || updateSupplier.isPending}>
              {createSupplier.isPending || updateSupplier.isPending
                ? "Saving..."
                : editingId ? "Save changes" : "Save supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The supplier will be permanently removed from your directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSupplier.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteSupplier.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSupplier.isPending ? "Deleting..." : "Delete"}
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

  const handleReset = () => {
    setDraftOrder(DEFAULT_ORDER);
    setDraftVisible(DEFAULT_VISIBLE);
  };

  const handleApply = () => {
    onApply(draftOrder, draftVisible);
    setOpen(false);
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
                <Checkbox
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(v) => toggle(k, !!v)}
                />
              </div>
            );
          })}
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleReset}>Reset</Button>
          <Button onClick={handleApply}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

