import { Fragment, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown, Check, X, Columns3, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentSupplier } from "@/hooks/useCurrentSupplier";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useVatBands } from "@/hooks/useVatBands";
import { useVehicles } from "@/hooks/useVehicles";
import { VehicleScopeTree, ScopeValue } from "@/components/VehicleScopeTree";
import { taxonomyAsVehicles } from "@/lib/vehicle-taxonomy";
import { cn } from "@/lib/utils";

const PART_TYPES = ["Part", "Oils & Fluids"] as const;
const UNITS = ["Each", "Pack"] as const;
const STOCK_CATEGORIES = ["Own stock", "Impress stock"] as const;
const WARRANTY_UNITS = ["Days", "Weeks", "Months", "Years"] as const;

type ColKey = "part_number" | "description" | "part_type" | "manufacturer" | "stock_items";
const COLUMNS: { key: ColKey; label: string; sortable?: boolean }[] = [
  { key: "part_number", label: "Part number", sortable: true },
  { key: "description", label: "Description", sortable: true },
  { key: "part_type", label: "Type", sortable: true },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "stock_items", label: "Stock items" },
];
const LOCKED_COLS: ColKey[] = ["part_number"];
const DEFAULT_ORDER: ColKey[] = COLUMNS.map((c) => c.key);
const DEFAULT_VISIBLE: ColKey[] = COLUMNS.map((c) => c.key);


type PartRow = {
  id: string;
  provider_id: string;
  description: string;
  part_number: string;
  part_type: string | null;
  manufacturer_id: string | null;
  vat_band_id: string | null;
  supersedes_id: string | null;
  superseded_by_id: string | null;
  alternative_part_id: string | null;
  warranty_value: number | null;
  warranty_unit: string | null;
  applicable_asset_types: string[];
  applicable_makes: string[];
  applicable_models: string[];
  applicable_derivatives: string[];
};

type StockItem = {
  id: string;
  db_id?: string;
  parts_supplier_id: string | null;
  quantity: number;
  unit: string;
  pack_size: number | null;
  cost: number;
  rrp: number;
  stock_category: string;
  vat_band_id: string | null;
  bin_number: string;
  bin_location: string;
  posting_definition_id: string | null;
  _isNew?: boolean;
};

type PartForm = {
  part_number: string;
  description: string;
  part_type: string;
  manufacturer_id: string;
  vat_band_id: string;
  supersedes_id: string;
  superseded_by_id: string;
  alternative_part_id: string;
  warranty_value: string;
  warranty_unit: string;
  scope: ScopeValue;
};

const emptyForm = (): PartForm => ({
  part_number: "",
  description: "",
  part_type: "",
  manufacturer_id: "",
  vat_band_id: "",
  supersedes_id: "",
  superseded_by_id: "",
  alternative_part_id: "",
  warranty_value: "",
  warranty_unit: "Months",
  scope: { applicable_asset_types: [], applicable_makes: [], applicable_models: [], applicable_derivatives: [] },
});

// Searchable combobox
function Combobox({
  value, onChange, options, placeholder, invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox"
          className={cn("h-10 w-full justify-between font-normal", !label && "text-muted-foreground", invalid && "border-destructive")}>
          <span className="truncate">{label || placeholder || "Select..."}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem value="__clear__" onSelect={() => { onChange(""); setOpen(false); }}>
                  <X className="mr-2 h-4 w-4" /> Clear
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export default function Parts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: currentSupplier } = useCurrentSupplier();
  const { data: suppliers } = useSuppliers();
  const { data: vehiclesData } = useVehicles();

  const [providerId, setProviderId] = useState<string>("");
  useEffect(() => {
    if (currentSupplier?.id) setProviderId(currentSupplier.id);
    else if (!providerId && suppliers?.length) setProviderId(suppliers[0].id);
  }, [currentSupplier, suppliers, providerId]);

  const { data: vatBands } = useVatBands(providerId);

  const { data: parts, isLoading } = useQuery({
    queryKey: ["parts_full", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("parts").select("*").eq("provider_id", providerId).order("part_number");
      if (error) throw error;
      return data as any as PartRow[];
    },
  });

  const { data: manufacturers } = useQuery({
    queryKey: ["part_manufacturers", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("part_manufacturers" as any).select("*").eq("provider_id", providerId).order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: postingDefs } = useQuery({
    queryKey: ["posting_definitions", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("posting_definitions" as any).select("*").eq("provider_id", providerId).order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: allStockItems } = useQuery({
    queryKey: ["parts_stock_items_all", providerId],
    enabled: !!providerId && !!parts,
    queryFn: async () => {
      const partIds = (parts ?? []).map((p) => p.id);
      if (!partIds.length) return [] as any[];
      const { data, error } = await supabase.from("parts_stock_items" as any).select("*").in("part_id", partIds);
      if (error) throw error;
      return data as any[];
    },
  });

  const vehiclesForScope = useMemo(() => {
    const rows = vehiclesData ?? [];
    return rows.length ? rows : taxonomyAsVehicles();
  }, [vehiclesData]);

  // -----------------------------------
  // Dialog / form state
  // -----------------------------------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartForm>(emptyForm());
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [deletedStockIds, setDeletedStockIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setStockItems([]);
    setDeletedStockIds([]);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (p: PartRow) => {
    setEditingId(p.id);
    setForm({
      part_number: p.part_number || "",
      description: p.description || "",
      part_type: p.part_type || "",
      manufacturer_id: p.manufacturer_id || "",
      vat_band_id: p.vat_band_id || "",
      supersedes_id: p.supersedes_id || "",
      superseded_by_id: p.superseded_by_id || "",
      alternative_part_id: p.alternative_part_id || "",
      warranty_value: p.warranty_value != null ? String(p.warranty_value) : "",
      warranty_unit: p.warranty_unit || "Months",
      scope: {
        applicable_asset_types: p.applicable_asset_types || [],
        applicable_makes: p.applicable_makes || [],
        applicable_models: p.applicable_models || [],
        applicable_derivatives: p.applicable_derivatives || [],
      },
    });
    setDeletedStockIds([]);
    setErrors({});
    const { data } = await supabase.from("parts_stock_items" as any).select("*").eq("part_id", p.id);
    setStockItems(((data as any[]) || []).map((s) => ({
      id: crypto.randomUUID(),
      db_id: s.id,
      parts_supplier_id: s.parts_supplier_id,
      quantity: Number(s.quantity),
      unit: s.unit,
      pack_size: s.pack_size,
      cost: Number(s.cost),
      rrp: Number(s.rrp),
      stock_category: s.stock_category,
      vat_band_id: s.vat_band_id,
      bin_number: s.bin_number || "",
      bin_location: s.bin_location || "",
      posting_definition_id: s.posting_definition_id,
    })));
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.part_number.trim()) e.part_number = "Part number is required";
    if (!form.description.trim()) e.description = "Part description is required";
    if (!form.part_type) e.part_type = "Part type is required";
    if (!form.manufacturer_id) e.manufacturer_id = "Manufacturer is required";
    stockItems.forEach((s, i) => {
      if (!s.parts_supplier_id) e[`stock_${i}_supplier`] = "Required";
      if (!(s.quantity >= 0)) e[`stock_${i}_qty`] = "Required";
      if (!s.unit) e[`stock_${i}_unit`] = "Required";
      if (s.unit === "Pack" && (!s.pack_size || s.pack_size < 1)) e[`stock_${i}_pack`] = "Required";
      if (!(s.cost >= 0)) e[`stock_${i}_cost`] = "Required";
      if (!(s.rrp >= 0)) e[`stock_${i}_rrp`] = "Required";
      if (!s.stock_category) e[`stock_${i}_cat`] = "Required";
      if (!s.vat_band_id) e[`stock_${i}_vat`] = "Required";
      if (!s.posting_definition_id) e[`stock_${i}_post`] = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const savePart = useMutation({
    mutationFn: async () => {
      const payload: any = {
        provider_id: providerId,
        part_number: form.part_number.trim(),
        description: form.description.trim(),
        part_type: form.part_type,
        manufacturer_id: form.manufacturer_id || null,
        vat_band_id: form.vat_band_id || null,
        supersedes_id: form.supersedes_id || null,
        superseded_by_id: form.superseded_by_id || null,
        alternative_part_id: form.alternative_part_id || null,
        warranty_value: form.warranty_value ? parseInt(form.warranty_value, 10) : null,
        warranty_unit: form.warranty_value ? form.warranty_unit : null,
        applicable_asset_types: form.scope.applicable_asset_types,
        applicable_makes: form.scope.applicable_makes,
        applicable_models: form.scope.applicable_models,
        applicable_derivatives: form.scope.applicable_derivatives,
      };
      let partId = editingId;
      if (editingId) {
        const { error } = await supabase.from("parts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("parts").insert(payload).select("id").single();
        if (error) throw error;
        partId = data.id;
      }
      // Delete removed stock items
      if (deletedStockIds.length) {
        await supabase.from("parts_stock_items" as any).delete().in("id", deletedStockIds);
      }
      // Upsert stock items
      for (const s of stockItems) {
        const row: any = {
          part_id: partId,
          parts_supplier_id: s.parts_supplier_id,
          quantity: s.quantity,
          unit: s.unit,
          pack_size: s.unit === "Pack" ? s.pack_size : null,
          cost: s.cost,
          rrp: s.rrp,
          stock_category: s.stock_category,
          vat_band_id: s.vat_band_id,
          bin_number: s.bin_number || null,
          bin_location: s.bin_location || null,
          posting_definition_id: s.posting_definition_id,
        };
        if (s.db_id) {
          await supabase.from("parts_stock_items" as any).update(row).eq("id", s.db_id);
        } else {
          await supabase.from("parts_stock_items" as any).insert(row);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts_full"] });
      qc.invalidateQueries({ queryKey: ["parts_stock_items_all"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      toast({ title: editingId ? "Part updated" : "Part added" });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!validate()) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    savePart.mutate();
  };

  // -----------------------------------
  // Add manufacturer inline
  // -----------------------------------
  const [newManufacturer, setNewManufacturer] = useState("");
  const addManufacturer = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("part_manufacturers" as any)
        .insert({ provider_id: providerId, name: name.trim() }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["part_manufacturers"] });
      setForm((f) => ({ ...f, manufacturer_id: data.id }));
      setNewManufacturer("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // -----------------------------------
  // Table
  // -----------------------------------
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"part_number" | "description" | "part_type">("part_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_VISIBLE);
  const [columnOrder, setColumnOrder] = useState<ColKey[]>(DEFAULT_ORDER);

  const filtered = useMemo(() => {
    let rows = parts ?? [];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => [r.part_number, r.description, r.part_type].some((v) => (v || "").toLowerCase().includes(q)));
    rows = [...rows].sort((a, b) => {
      const av = (a[sortBy] || "").toString().toLowerCase();
      const bv = (b[sortBy] || "").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [parts, search, sortBy, sortDir]);

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(k); setSortDir("asc"); }
  };
  const SortIcon = ({ k }: { k: typeof sortBy }) =>
    sortBy !== k ? <ChevronsUpDown className="ml-1 h-3 w-3 inline text-muted-foreground" /> :
    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5 inline text-primary font-bold" /> :
    <ArrowDown className="ml-1 h-3.5 w-3.5 inline text-primary font-bold" />;

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts_full"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["parts_stock_items_all"] });
      toast({ title: "Part deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Stock summary derivations for form
  const stockSummary = useMemo(() => {
    const own = { qty: 0, value: 0 };
    const impress = { qty: 0, value: 0 };
    for (const s of stockItems) {
      if (s.stock_category === "Own stock") { own.qty += s.quantity; own.value += s.quantity * s.cost; }
      else if (s.stock_category === "Impress stock") { impress.qty += s.quantity; impress.value += s.quantity * s.cost; }
    }
    return { own, impress, onOrder: { qty: 0, value: 0 } };
  }, [stockItems]);

  const partOptions = useMemo(
    () => (parts ?? [])
      .filter((p) => p.id !== editingId)
      .map((p) => ({ value: p.id, label: `${p.part_number} — ${p.description}` })),
    [parts, editingId]
  );
  const manufacturerOptions = useMemo(
    () => (manufacturers ?? []).map((m: any) => ({ value: m.id, label: m.name })), [manufacturers]);
  const supplierOptions = useMemo(
    () => (suppliers ?? []).map((s: any) => ({ value: s.id, label: s.name })), [suppliers]);
  const postingOptions = useMemo(
    () => (postingDefs ?? []).map((p: any) => ({ value: p.id, label: p.name })), [postingDefs]);
  const vatOptions = useMemo(
    () => (vatBands ?? []).map((v: any) => ({ value: v.id, label: `${v.name} (${v.percentage}%)` })), [vatBands]);

  // -----------------------------------
  // Stock item helpers
  // -----------------------------------
  const [stockDialog, setStockDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [stockDraft, setStockDraft] = useState<StockItem | null>(null);
  const [stockCostStr, setStockCostStr] = useState("0.00");
  const [stockRrpStr, setStockRrpStr] = useState("0.00");

  const openAddStock = () => {
    setStockDraft({
      id: crypto.randomUUID(),
      parts_supplier_id: null, quantity: 0, unit: "Each", pack_size: null,
      cost: 0, rrp: 0, stock_category: "Own stock", vat_band_id: null,
      bin_number: "", bin_location: "", posting_definition_id: null, _isNew: true,
    });
    setStockCostStr("0.00");
    setStockRrpStr("0.00");
    setStockDialog({ open: true, index: null });
  };
  const openEditStock = (i: number) => {
    const item = stockItems[i];
    setStockDraft({ ...item });
    setStockCostStr(Number(item.cost || 0).toFixed(2));
    setStockRrpStr(Number(item.rrp || 0).toFixed(2));
    setStockDialog({ open: true, index: i });
  };
  const saveStockDraft = () => {
    if (!stockDraft) return;
    const errs: string[] = [];
    if (!stockDraft.parts_supplier_id) errs.push("Parts supplier");
    if (!(stockDraft.quantity >= 0)) errs.push("Quantity");
    if (!stockDraft.unit) errs.push("Unit");
    if (stockDraft.unit === "Pack" && (!stockDraft.pack_size || stockDraft.pack_size < 1)) errs.push("Items per pack");
    if (!(stockDraft.cost >= 0)) errs.push("Cost");
    if (!(stockDraft.rrp >= 0)) errs.push("RRP");
    if (!stockDraft.stock_category) errs.push("Stock category");
    if (!stockDraft.vat_band_id) errs.push("VAT band");
    if (!stockDraft.posting_definition_id) errs.push("Posting definition");
    if (errs.length) { toast({ title: "Missing: " + errs.join(", "), variant: "destructive" }); return; }
    if (stockDialog.index == null) setStockItems((prev) => [...prev, stockDraft]);
    else setStockItems((prev) => prev.map((s, i) => i === stockDialog.index ? stockDraft : s));
    setStockDialog({ open: false, index: null });
    setStockDraft(null);
  };
  const removeStock = (i: number) => {
    const s = stockItems[i];
    if (s.db_id) setDeletedStockIds((prev) => [...prev, s.db_id!]);
    setStockItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const partLabel = (id: string | null) => {
    if (!id) return "—";
    const p = (parts ?? []).find((x) => x.id === id);
    return p ? `${p.part_number} — ${p.description}` : "—";
  };
  const supplierLabel = (id: string | null) => (suppliers ?? []).find((s: any) => s.id === id)?.name || "—";
  const vatLabel = (id: string | null) => {
    const v = (vatBands ?? []).find((x: any) => x.id === id);
    return v ? `${v.name} (${v.percentage}%)` : "—";
  };
  const stockItemsFor = (partId: string) => (allStockItems ?? []).filter((s: any) => s.part_id === partId);

  return (
    <AppLayout>
      <TooltipProvider><div className="space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Parts</h1>
        </div>


        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts..." className="pl-8 h-10" />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate} disabled={!providerId} className="h-10 gap-2">
              <Plus className="w-4 h-4" /> Add part
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
            ) : !filtered.length ? (
              <div className="p-6 text-center text-muted-foreground">No parts yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    {columnOrder.filter((k) => visibleCols.includes(k)).map((k) => {
                      const c = COLUMNS.find((x) => x.key === k)!;
                      const sortable = c.sortable;
                      return (
                        <TableHead
                          key={k}
                          className={cn(sortable && "cursor-pointer")}
                          onClick={sortable ? () => toggleSort(k as any) : undefined}
                        >
                          {c.label}{sortable && <SortIcon k={k as any} />}
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const isOpen = expanded.has(p.id);
                    const items = stockItemsFor(p.id);
                    const visible = columnOrder.filter((k) => visibleCols.includes(k));
                    return (
                      <Fragment key={p.id}>
                        <TableRow className="cursor-pointer" onClick={() => openEdit(p)}>
                          <TableCell onClick={(e) => { e.stopPropagation(); setExpanded((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; }); }} className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </TableCell>
                          {visible.map((k) => {
                            switch (k) {
                              case "part_number": return <TableCell key={k} className="font-medium">{p.part_number}</TableCell>;
                              case "description": return <TableCell key={k}>{p.description}</TableCell>;
                              case "part_type": return <TableCell key={k} className="text-muted-foreground">{p.part_type || "—"}</TableCell>;
                              case "manufacturer": return <TableCell key={k} className="text-muted-foreground">{(manufacturers ?? []).find((m: any) => m.id === p.manufacturer_id)?.name || "—"}</TableCell>;
                              case "stock_items": return <TableCell key={k} className="text-muted-foreground">{items.length}</TableCell>;
                              default: return null;
                            }
                          })}
                          <TableCell className="w-24 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit part</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                    onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete part</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={visible.length + 2} className="bg-muted/30 p-3">
                              {items.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No stock items.</div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Supplier</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead>Cost</TableHead>
                                      <TableHead>RRP</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead>Bin</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((s: any) => (
                                      <TableRow key={s.id}>
                                        <TableCell>{supplierLabel(s.parts_supplier_id)}</TableCell>
                                        <TableCell>{Number(s.quantity).toFixed(2)}</TableCell>
                                        <TableCell>{s.unit}{s.unit === "Pack" && s.pack_size ? ` (${s.pack_size}/pack)` : ""}</TableCell>
                                        <TableCell>{Number(s.cost).toFixed(2)}</TableCell>
                                        <TableCell>{Number(s.rrp).toFixed(2)}</TableCell>
                                        <TableCell>{s.stock_category}</TableCell>
                                        <TableCell className="text-muted-foreground">{[s.bin_number, s.bin_location].filter(Boolean).join(" / ") || "—"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================= Add / Edit Dialog ================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{editingId ? "Edit part" : "Add part"}</DialogTitle>
            <DialogDescription>Manage a part in the catalogue.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Part Details */}
            <CollapsibleCard title="Part Details" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Part number *</Label>
                  <Input value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                    className={cn("h-10", errors.part_number && "border-destructive")} />
                  {errors.part_number && <p className="text-xs text-destructive">{errors.part_number}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Part description *</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={cn("h-10", errors.description && "border-destructive")} />
                  {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Part type *</Label>
                  <Combobox value={form.part_type} onChange={(v) => setForm({ ...form, part_type: v })}
                    options={PART_TYPES.map((p) => ({ value: p, label: p }))}
                    placeholder="Select type" invalid={!!errors.part_type} />
                  {errors.part_type && <p className="text-xs text-destructive">{errors.part_type}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Manufacturer *</Label>
                  <Combobox value={form.manufacturer_id} onChange={(v) => setForm({ ...form, manufacturer_id: v })}
                    options={manufacturerOptions}
                    placeholder="Select manufacturer" invalid={!!errors.manufacturer_id} />
                  <div className="flex gap-1">
                    <Input value={newManufacturer} onChange={(e) => setNewManufacturer(e.target.value)}
                      placeholder="Add new manufacturer" className="h-8 text-xs" />
                    <Button type="button" size="sm" variant="outline" className="h-8"
                      disabled={!newManufacturer.trim() || addManufacturer.isPending}
                      onClick={() => addManufacturer.mutate(newManufacturer)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {errors.manufacturer_id && <p className="text-xs text-destructive">{errors.manufacturer_id}</p>}
                </div>
              </div>
            </CollapsibleCard>

            {/* Stock Items */}
            <CollapsibleCard title="Stock Items" defaultOpen>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={openAddStock}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add stock item
                  </Button>
                </div>
                {stockItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 text-center border rounded">No stock items yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>RRP</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>VAT</TableHead>
                        <TableHead>Bin</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((s, i) => (
                        <TableRow key={s.id}>
                          <TableCell>{supplierLabel(s.parts_supplier_id)}</TableCell>
                          <TableCell>{s.quantity.toFixed(2)}</TableCell>
                          <TableCell>{s.unit}{s.unit === "Pack" && s.pack_size ? ` (${s.pack_size}/pack)` : ""}</TableCell>
                          <TableCell>{s.cost.toFixed(2)}</TableCell>
                          <TableCell>{s.rrp.toFixed(2)}</TableCell>
                          <TableCell>{s.stock_category}</TableCell>
                          <TableCell>{vatLabel(s.vat_band_id)}</TableCell>
                          <TableCell className="text-muted-foreground">{[s.bin_number, s.bin_location].filter(Boolean).join(" / ") || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditStock(i)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeStock(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {/* Related parts + warranty */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="space-y-1.5">
                    <Label>Supersedes</Label>
                    <Combobox value={form.supersedes_id} onChange={(v) => setForm({ ...form, supersedes_id: v })}
                      options={partOptions} placeholder="Select part" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Superseded by</Label>
                    <Combobox value={form.superseded_by_id} onChange={(v) => setForm({ ...form, superseded_by_id: v })}
                      options={partOptions} placeholder="Select part" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alternative part</Label>
                    <Combobox value={form.alternative_part_id} onChange={(v) => setForm({ ...form, alternative_part_id: v })}
                      options={partOptions} placeholder="Select part" />
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Label className="text-sm font-semibold">Parts Warranty</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Warranty period</Label>
                      <Input type="text" inputMode="numeric" value={form.warranty_value}
                        onChange={(e) => setForm({ ...form, warranty_value: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="e.g. 12" className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit</Label>
                      <Select value={form.warranty_unit} onValueChange={(v) => setForm({ ...form, warranty_unit: v })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WARRANTY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleCard>

            {/* Stock Summary */}
            <CollapsibleCard title="Stock Summary" defaultOpen>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Own stock</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.own.qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.own.value.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Impress stock</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.impress.qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.impress.value.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Items on order</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.onOrder.qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{stockSummary.onOrder.value.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CollapsibleCard>

            {/* Applicable Vehicles */}
            <CollapsibleCard title="Applicable Vehicles" defaultOpen>
              <VehicleScopeTree
                vehicles={vehiclesForScope}
                value={form.scope}
                onChange={(scope) => setForm((f) => ({ ...f, scope }))}
              />
            </CollapsibleCard>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={savePart.isPending}>{savePart.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= Stock item sub-dialog ================= */}
      <Dialog open={stockDialog.open} onOpenChange={(o) => { if (!o) { setStockDialog({ open: false, index: null }); setStockDraft(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{stockDialog.index == null ? "Add stock item" : "Edit stock item"}</DialogTitle>
          </DialogHeader>
          {stockDraft && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Parts supplier *</Label>
                <Combobox value={stockDraft.parts_supplier_id || ""} onChange={(v) => setStockDraft({ ...stockDraft, parts_supplier_id: v || null })}
                  options={supplierOptions} placeholder="Select supplier" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="text" inputMode="decimal" value={String(stockDraft.quantity)}
                  onChange={(e) => setStockDraft({ ...stockDraft, quantity: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                  onBlur={(e) => setStockDraft({ ...stockDraft, quantity: Number(parseFloat(e.target.value || "0").toFixed(2)) })}
                  className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <Select value={stockDraft.unit} onValueChange={(v) => setStockDraft({ ...stockDraft, unit: v, pack_size: v === "Pack" ? (stockDraft.pack_size || 1) : null })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {stockDraft.unit === "Pack" && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Items per pack *</Label>
                  <Input type="text" inputMode="numeric" value={stockDraft.pack_size ?? ""}
                    onChange={(e) => setStockDraft({ ...stockDraft, pack_size: parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || null })}
                    className="h-10" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Cost *</Label>
                <Input type="text" inputMode="decimal" value={stockCostStr}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setStockCostStr(v); setStockDraft({ ...stockDraft, cost: parseFloat(v) || 0 }); }}
                  onBlur={() => { const n = Number(parseFloat(stockCostStr || "0").toFixed(2)); setStockCostStr(n.toFixed(2)); setStockDraft({ ...stockDraft, cost: n }); }}
                  className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>RRP *</Label>
                <Input type="text" inputMode="decimal" value={stockRrpStr}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setStockRrpStr(v); setStockDraft({ ...stockDraft, rrp: parseFloat(v) || 0 }); }}
                  onBlur={() => { const n = Number(parseFloat(stockRrpStr || "0").toFixed(2)); setStockRrpStr(n.toFixed(2)); setStockDraft({ ...stockDraft, rrp: n }); }}
                  className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Stock category *</Label>
                <Combobox value={stockDraft.stock_category} onChange={(v) => setStockDraft({ ...stockDraft, stock_category: v })}
                  options={STOCK_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </div>
              <div className="space-y-1.5">
                <Label>VAT band *</Label>
                <Combobox value={stockDraft.vat_band_id || ""} onChange={(v) => setStockDraft({ ...stockDraft, vat_band_id: v || null })}
                  options={vatOptions} placeholder="Select VAT band" />
              </div>
              <div className="space-y-1.5">
                <Label>Bin number</Label>
                <Input value={stockDraft.bin_number} onChange={(e) => setStockDraft({ ...stockDraft, bin_number: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Bin location</Label>
                <Input value={stockDraft.bin_location} onChange={(e) => setStockDraft({ ...stockDraft, bin_location: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Posting definition *</Label>
                <Combobox value={stockDraft.posting_definition_id || ""} onChange={(v) => setStockDraft({ ...stockDraft, posting_definition_id: v || null })}
                  options={postingOptions} placeholder="Select posting definition" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStockDialog({ open: false, index: null }); setStockDraft(null); }}>Cancel</Button>
            <Button onClick={saveStockDraft}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete part?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the part and all its stock items. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && del.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider></AppLayout>
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

