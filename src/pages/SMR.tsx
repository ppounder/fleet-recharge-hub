import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";

const REASONS = ["Routine", "Damage", "Repair", "Warranty"] as const;
const WORK_TYPES = ["Safety Inspection", "Service", "MOT", "Maintenance", "LOLER", "Tacho", "Other"] as const;

type SMRItem = {
  id: string;
  name: string;
  valid_from: string;
  valid_to: string | null;
  applicable_asset_types: string[];
  applicable_makes: string[];
  applicable_models: string[];
  applicable_derivatives: string[];
  applicable_weight_bands: string[];
  applicable_axles: number[];
  fixed_price: boolean;
  labour_net: number | null;
  parts_net: number | null;
  vat_band_id: string | null;
  total: number | null;
};

type WorkDetail = {
  id: string;
  smr_item_id?: string;
  name: string;
  code: string;
  checklist_id: string | null;
  document_required: boolean;
  reason_for_work: string;
  work_type: string;
  work_type_other: string;
  posting_definition_id: string | null;
  labour_hours: number;
  vat_band_id: string | null;
  sort_order: number;
  _isNew?: boolean;
};

const smrSchema = z.object({
  name: z.string().trim().min(1, { message: "SMR name is required" }).max(150),
  valid_from: z.string().min(1, { message: "Valid from is required" }),
  valid_to: z.string().nullable(),
  fixed_price: z.boolean(),
  labour_net: z.number().nullable(),
  parts_net: z.number().nullable(),
  vat_band_id: z.string().nullable(),
});

type SMRForm = {
  name: string;
  valid_from: string; // yyyy-MM-dd
  valid_to: string; // yyyy-MM-dd
  applicable_asset_types: string[];
  applicable_makes: string[];
  applicable_models: string[];
  applicable_derivatives: string[];
  applicable_weight_bands: string[];
  applicable_axles: string[];
  fixed_price: boolean;
  labour_net: string;
  parts_net: string;
  vat_band_id: string;
};

const todayIso = () => format(new Date(), "yyyy-MM-dd");
const toIsoDay = (v: string | null) => (v ? format(parseISO(v), "yyyy-MM-dd") : "");
const dispDate = (v: string | null) => {
  if (!v) return "—";
  const d = parseISO(v);
  return isValid(d) ? format(d, "dd MMM yyyy") : "—";
};

const emptyForm = (): SMRForm => ({
  name: "",
  valid_from: todayIso(),
  valid_to: "",
  applicable_asset_types: [],
  applicable_makes: [],
  applicable_models: [],
  applicable_derivatives: [],
  applicable_weight_bands: [],
  applicable_axles: [],
  fixed_price: false,
  labour_net: "",
  parts_net: "",
  vat_band_id: "",
});

const emptyWorkDetail = (): WorkDetail => ({
  id: (crypto as any).randomUUID?.() ?? String(Math.random()),
  name: "",
  code: "",
  checklist_id: null,
  document_required: false,
  reason_for_work: "",
  work_type: "",
  work_type_other: "",
  posting_definition_id: null,
  labour_hours: 0,
  vat_band_id: null,
  sort_order: 0,
  _isNew: true,
});

const wdSchema = z.object({
  name: z.string().trim().min(1),
  reason_for_work: z.string().min(1),
  work_type: z.string().min(1),
  labour_hours: z.number().min(0),
  vat_band_id: z.string().min(1),
});

export default function SMR() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<SMRForm>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workDetails, setWorkDetails] = useState<WorkDetail[]>([]);
  const [deletedWdIds, setDeletedWdIds] = useState<string[]>([]);

  const [wdDialogOpen, setWdDialogOpen] = useState(false);
  const [wdDraft, setWdDraft] = useState<WorkDetail>(emptyWorkDetail());
  const [wdDraftErrors, setWdDraftErrors] = useState<Record<string, string>>({});
  const [editingWdId, setEditingWdId] = useState<string | null>(null);
  const [confirmDeleteWdId, setConfirmDeleteWdId] = useState<string | null>(null);

  // Data
  const { data: smrItems = [], isLoading } = useQuery({
    queryKey: ["smr_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("smr_items").select("*").order("name");
      if (error) throw error;
      return data as SMRItem[];
    },
  });

  const { data: vatBands = [] } = useQuery({
    queryKey: ["all_vat_bands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vat_bands").select("id, name, percentage").order("name");
      if (error) throw error;
      return data as { id: string; name: string; percentage: number }[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles_for_smr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("asset_type, make, model, derivative, weight_band, no_axles");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const distinct = (key: string) => {
    const s = new Set<string>();
    vehicles.forEach((v: any) => {
      const val = v?.[key];
      if (val !== null && val !== undefined && String(val).trim() !== "") s.add(String(val));
    });
    return Array.from(s).sort();
  };

  const assetTypeOptions = useMemo(() => distinct("asset_type"), [vehicles]);
  const makeOptions = useMemo(() => distinct("make"), [vehicles]);
  const modelOptions = useMemo(() => distinct("model"), [vehicles]);
  const derivativeOptions = useMemo(() => distinct("derivative"), [vehicles]);
  const weightBandOptions = useMemo(() => distinct("weight_band"), [vehicles]);
  const axleOptions = useMemo(() => distinct("no_axles"), [vehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? smrItems.filter((s) => s.name?.toLowerCase().includes(q))
      : smrItems;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [smrItems, search, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" strokeWidth={3} />;
  };

  // Load work details when editing
  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      applicable_asset_types: assetTypeOptions,
      applicable_makes: makeOptions,
      applicable_models: modelOptions,
      applicable_derivatives: derivativeOptions,
      applicable_weight_bands: weightBandOptions,
      applicable_axles: axleOptions,
    });
    setErrors({});
    setWorkDetails([]);
    setDeletedWdIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (s: SMRItem) => {
    setEditingId(s.id);
    setErrors({});
    setDeletedWdIds([]);
    setForm({
      name: s.name,
      valid_from: toIsoDay(s.valid_from),
      valid_to: toIsoDay(s.valid_to),
      applicable_asset_types: s.applicable_asset_types ?? [],
      applicable_makes: s.applicable_makes ?? [],
      applicable_models: s.applicable_models ?? [],
      applicable_derivatives: s.applicable_derivatives ?? [],
      applicable_weight_bands: s.applicable_weight_bands ?? [],
      applicable_axles: (s.applicable_axles ?? []).map(String),
      fixed_price: s.fixed_price,
      labour_net: s.labour_net != null ? String(s.labour_net) : "",
      parts_net: s.parts_net != null ? String(s.parts_net) : "",
      vat_band_id: s.vat_band_id ?? "",
    });
    setDialogOpen(true);
    const { data, error } = await supabase
      .from("smr_work_details")
      .select("*")
      .eq("smr_item_id", s.id)
      .order("sort_order");
    if (!error && data) {
      setWorkDetails(data.map((r: any) => ({
        id: r.id,
        smr_item_id: r.smr_item_id,
        name: r.name ?? "",
        code: r.code ?? "",
        checklist_id: r.checklist_id ?? null,
        document_required: !!r.document_required,
        reason_for_work: r.reason_for_work ?? "",
        work_type: r.work_type ?? "",
        work_type_other: r.work_type_other ?? "",
        posting_definition_id: r.posting_definition_id ?? null,
        labour_hours: Number(r.labour_hours ?? 0),
        vat_band_id: r.vat_band_id ?? null,
        sort_order: r.sort_order ?? 0,
      })));
    } else {
      setWorkDetails([]);
    }
  };

  const totalCalc = useMemo(() => {
    if (!form.fixed_price) return 0;
    const l = parseFloat(form.labour_net) || 0;
    const p = parseFloat(form.parts_net) || 0;
    const vat = vatBands.find((v) => v.id === form.vat_band_id);
    const pct = vat ? Number(vat.percentage) : 0;
    return l + p + (l + p) * (pct / 100);
  }, [form.fixed_price, form.labour_net, form.parts_net, form.vat_band_id, vatBands]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate
      const errs: Record<string, string> = {};
      if (!form.name.trim()) errs.name = "SMR name is required";
      if (!form.valid_from) errs.valid_from = "Valid from is required";
      if (form.fixed_price) {
        if (!form.labour_net) errs.labour_net = "Labour NET is required";
        if (!form.parts_net) errs.parts_net = "Parts NET is required";
        if (!form.vat_band_id) errs.vat_band_id = "VAT band is required";
      }
      if (Object.keys(errs).length) {
        setErrors(errs);
        throw new Error("Please fix the errors below");
      }

      const payload: any = {
        name: form.name.trim(),
        valid_from: new Date(form.valid_from).toISOString(),
        valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : null,
        applicable_asset_types: form.applicable_asset_types,
        applicable_makes: form.applicable_makes,
        applicable_models: form.applicable_models,
        applicable_derivatives: form.applicable_derivatives,
        applicable_weight_bands: form.applicable_weight_bands,
        applicable_axles: form.applicable_axles.map((a) => parseInt(a, 10)).filter((n) => !isNaN(n)),
        fixed_price: form.fixed_price,
        labour_net: form.fixed_price ? parseFloat(form.labour_net) || 0 : null,
        parts_net: form.fixed_price ? parseFloat(form.parts_net) || 0 : null,
        vat_band_id: form.fixed_price ? form.vat_band_id || null : null,
        total: form.fixed_price ? totalCalc : null,
      };

      let itemId = editingId;
      if (editingId) {
        const { error } = await supabase.from("smr_items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("smr_items").insert(payload).select().single();
        if (error) throw error;
        itemId = data.id;
      }

      if (deletedWdIds.length) {
        const { error } = await supabase.from("smr_work_details").delete().in("id", deletedWdIds);
        if (error) throw error;
      }
      for (let i = 0; i < workDetails.length; i++) {
        const wd = workDetails[i];
        const body: any = {
          smr_item_id: itemId,
          name: wd.name.trim(),
          code: wd.code.trim() || null,
          checklist_id: wd.checklist_id,
          document_required: wd.document_required,
          reason_for_work: wd.reason_for_work,
          work_type: wd.work_type,
          work_type_other: wd.work_type === "Other" ? wd.work_type_other.trim() || null : null,
          posting_definition_id: wd.posting_definition_id,
          labour_hours: wd.labour_hours,
          vat_band_id: wd.vat_band_id,
          sort_order: i,
        };
        if (wd._isNew) {
          const { error } = await supabase.from("smr_work_details").insert(body);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("smr_work_details").update(body).eq("id", wd.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smr_items"] });
      toast({ title: editingId ? "SMR updated" : "SMR added" });
      setDialogOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("smr_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smr_items"] });
      toast({ title: "SMR deleted" });
      setDeleteId(null);
    },
  });

  const openAddWd = () => {
    setEditingWdId(null);
    setWdDraft(emptyWorkDetail());
    setWdDraftErrors({});
    setWdDialogOpen(true);
  };
  const openEditWd = (wd: WorkDetail) => {
    setEditingWdId(wd.id);
    setWdDraft({ ...wd });
    setWdDraftErrors({});
    setWdDialogOpen(true);
  };
  const saveWdDraft = () => {
    const res = wdSchema.safeParse({
      name: wdDraft.name,
      reason_for_work: wdDraft.reason_for_work,
      work_type: wdDraft.work_type,
      labour_hours: Number(wdDraft.labour_hours),
      vat_band_id: wdDraft.vat_band_id ?? "",
    });
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const i of res.error.issues) errs[i.path[0] as string] = i.message || "Required";
      setWdDraftErrors(errs);
      return;
    }
    if (wdDraft.work_type === "Other" && !wdDraft.work_type_other.trim()) {
      setWdDraftErrors({ work_type_other: "Please specify" });
      return;
    }
    if (editingWdId) {
      setWorkDetails((prev) => prev.map((w) => (w.id === editingWdId ? { ...wdDraft, id: editingWdId } : w)));
    } else {
      setWorkDetails((prev) => [...prev, wdDraft]);
    }
    setWdDialogOpen(false);
  };
  const removeWd = (id: string) => {
    setWorkDetails((prev) => {
      const t = prev.find((w) => w.id === id);
      if (t && !t._isNew) setDeletedWdIds((d) => [...d, id]);
      return prev.filter((w) => w.id !== id);
    });
    setConfirmDeleteWdId(null);
  };

  const errCls = (k: string) => cn(errors[k] && "border-destructive focus-visible:ring-destructive");
  const vatName = (id: string | null) => vatBands.find((v) => v.id === id)?.name ?? "—";

  return (
    <AppLayout>
      <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SMR</h1>
            <p className="text-sm text-muted-foreground">Service, Maintenance and Repair work items</p>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> Add SMR</Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SMR..." className="pl-9" />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                      <div className="flex items-center gap-1">Name <SortIcon col="name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("valid_from")}>
                      <div className="flex items-center gap-1">Valid from <SortIcon col="valid_from" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("valid_to")}>
                      <div className="flex items-center gap-1">Valid to <SortIcon col="valid_to" /></div>
                    </TableHead>
                    <TableHead>Fixed price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No SMR items</TableCell></TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer h-11" onClick={() => openEdit(s)}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{dispDate(s.valid_from)}</TableCell>
                        <TableCell>{dispDate(s.valid_to)}</TableCell>
                        <TableCell>{s.fixed_price ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                        <TableCell>{s.fixed_price && s.total != null ? `£${Number(s.total).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit SMR</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(s.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete SMR</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] !flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>{editingId ? "Edit SMR" : "Add SMR"}</DialogTitle>
              <DialogDescription>Configure a Service, Maintenance & Repair work item.</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <CollapsibleCard title="SMR Details" defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>SMR name</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={errCls("name")} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label>Valid from *</Label>
                    <DatePicker value={form.valid_from} onChange={(v) => setForm((f) => ({ ...f, valid_from: v }))} />
                    {errors.valid_from && <p className="text-xs text-destructive mt-1">{errors.valid_from}</p>}
                  </div>
                  <div>
                    <Label>Valid to</Label>
                    <DatePicker value={form.valid_to} onChange={(v) => setForm((f) => ({ ...f, valid_to: v }))} />
                  </div>
                </div>
              </CollapsibleCard>

              <CollapsibleCard title="Applicable Vehicles" defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MultiCheckField label="Asset type" options={assetTypeOptions} value={form.applicable_asset_types}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_asset_types: v }))} />
                  <MultiCheckField label="Make" options={makeOptions} value={form.applicable_makes}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_makes: v }))} />
                  <MultiCheckField label="Model" options={modelOptions} value={form.applicable_models}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_models: v }))} />
                  <MultiCheckField label="Derivative" options={derivativeOptions} value={form.applicable_derivatives}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_derivatives: v }))} />
                  <MultiCheckField label="Weight band" options={weightBandOptions} value={form.applicable_weight_bands}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_weight_bands: v }))} />
                  <MultiCheckField label="No of axles" options={axleOptions} value={form.applicable_axles}
                    onChange={(v) => setForm((f) => ({ ...f, applicable_axles: v }))} />
                </div>
              </CollapsibleCard>

              <CollapsibleCard title="Fixed Price Details" defaultOpen>
                <div className="flex items-center gap-3 mb-4">
                  <Switch checked={form.fixed_price} onCheckedChange={(v) => setForm((f) => ({ ...f, fixed_price: v }))} />
                  <Label>Fixed price</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Labour NET cost {form.fixed_price && "*"}</Label>
                    <Input type="text" inputMode="decimal" value={form.labour_net} disabled={!form.fixed_price}
                      onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setForm((f) => ({ ...f, labour_net: e.target.value }))}
                      className={errCls("labour_net")} />
                    {errors.labour_net && <p className="text-xs text-destructive mt-1">{errors.labour_net}</p>}
                  </div>
                  <div>
                    <Label>Parts NET cost {form.fixed_price && "*"}</Label>
                    <Input type="text" inputMode="decimal" value={form.parts_net} disabled={!form.fixed_price}
                      onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setForm((f) => ({ ...f, parts_net: e.target.value }))}
                      className={errCls("parts_net")} />
                    {errors.parts_net && <p className="text-xs text-destructive mt-1">{errors.parts_net}</p>}
                  </div>
                  <div>
                    <Label>VAT Band {form.fixed_price && "*"}</Label>
                    <Select value={form.vat_band_id || "__none__"} disabled={!form.fixed_price}
                      onValueChange={(v) => setForm((f) => ({ ...f, vat_band_id: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className={errCls("vat_band_id")}><SelectValue placeholder="Select VAT band" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select —</SelectItem>
                        {vatBands.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name} ({v.percentage}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vat_band_id && <p className="text-xs text-destructive mt-1">{errors.vat_band_id}</p>}
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input value={form.fixed_price ? `£${totalCalc.toFixed(2)}` : ""} disabled className="bg-muted" />
                  </div>
                </div>
              </CollapsibleCard>

              <CollapsibleCard title="Work Details" defaultOpen>
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={openAddWd} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add work item</Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Work type</TableHead>
                        <TableHead>Labour hrs</TableHead>
                        <TableHead>VAT</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workDetails.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-4 text-sm text-muted-foreground">No work items</TableCell></TableRow>
                      ) : workDetails.map((w) => (
                        <TableRow key={w.id} className="h-10">
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell>{w.code || "—"}</TableCell>
                          <TableCell>{w.reason_for_work}</TableCell>
                          <TableCell>{w.work_type === "Other" ? `Other: ${w.work_type_other}` : w.work_type}</TableCell>
                          <TableCell>{w.labour_hours.toFixed(2)}</TableCell>
                          <TableCell>{vatName(w.vat_band_id)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditWd(w)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => setConfirmDeleteWdId(w.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleCard>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Work detail draft dialog */}
        <Dialog open={wdDialogOpen} onOpenChange={setWdDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] !grid-rows-[auto_1fr_auto] grid-cols-1 p-0 gap-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{editingWdId ? "Edit work item" : "Add work item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 px-6 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work item name *</Label>
                  <Input value={wdDraft.name} onChange={(e) => setWdDraft((d) => ({ ...d, name: e.target.value }))}
                    className={cn(wdDraftErrors.name && "border-destructive")} />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={wdDraft.code} onChange={(e) => setWdDraft((d) => ({ ...d, code: e.target.value }))} />
                </div>
                <div>
                  <Label>Checklist</Label>
                  <Select value="__none__" onValueChange={() => {}}>
                    <SelectTrigger><SelectValue placeholder="No checklists available" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3">
                  <Switch checked={wdDraft.document_required} onCheckedChange={(v) => setWdDraft((d) => ({ ...d, document_required: v }))} />
                  <Label className="mb-2">Document upload required</Label>
                </div>
                <div>
                  <Label>Reason for work *</Label>
                  <Select value={wdDraft.reason_for_work || "__none__"} onValueChange={(v) => setWdDraft((d) => ({ ...d, reason_for_work: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className={cn(wdDraftErrors.reason_for_work && "border-destructive")}>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Work type *</Label>
                  <Select value={wdDraft.work_type || "__none__"} onValueChange={(v) => setWdDraft((d) => ({ ...d, work_type: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className={cn(wdDraftErrors.work_type && "border-destructive")}>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {WORK_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {wdDraft.work_type === "Other" && (
                  <div className="col-span-2">
                    <Label>Specify work type *</Label>
                    <Input value={wdDraft.work_type_other} onChange={(e) => setWdDraft((d) => ({ ...d, work_type_other: e.target.value }))}
                      className={cn(wdDraftErrors.work_type_other && "border-destructive")} />
                  </div>
                )}
                <div>
                  <Label>Posting definition *</Label>
                  <Select value="__none__" onValueChange={() => {}}>
                    <SelectTrigger><SelectValue placeholder="No definitions available" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Labour hours *</Label>
                  <Input type="text" inputMode="decimal" value={String(wdDraft.labour_hours)}
                    onChange={(e) => /^[0-9]*\.?[0-9]{0,2}$/.test(e.target.value) && setWdDraft((d) => ({ ...d, labour_hours: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>VAT Band *</Label>
                  <Select value={wdDraft.vat_band_id || "__none__"} onValueChange={(v) => setWdDraft((d) => ({ ...d, vat_band_id: v === "__none__" ? null : v }))}>
                    <SelectTrigger className={cn(wdDraftErrors.vat_band_id && "border-destructive")}>
                      <SelectValue placeholder="Select VAT band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {vatBands.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.percentage}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0">
              <Button variant="outline" onClick={() => setWdDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveWdDraft}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeleteWdId} onOpenChange={(o) => !o && setConfirmDeleteWdId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete work item?</AlertDialogTitle>
              <AlertDialogDescription>This will remove the work item from this SMR.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmDeleteWdId && removeWd(confirmDeleteWdId)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete SMR?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the SMR and all its work items. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </TooltipProvider>
    </AppLayout>
  );
}

function MultiCheckField({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const allSelected = options.length > 0 && value.length === options.length;
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  const toggleAll = () => onChange(allSelected ? [] : [...options]);
  return (
    <div className="border rounded-md p-3 bg-card">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{label}</Label>
        {options.length > 0 && (
          <button type="button" className="text-xs text-primary hover:underline" onClick={toggleAll}>
            {allSelected ? "Clear" : "Select all"}
          </button>
        )}
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground">No options available</p>
        ) : options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
