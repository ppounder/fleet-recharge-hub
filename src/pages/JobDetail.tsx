import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs, useUpdateJob } from "@/hooks/useJobs";
import { useWorkItems, useCreateWorkItem, useDeleteWorkItem } from "@/hooks/useWorkItems";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useWorkCodes } from "@/hooks/useWorkCodes";
import { useVatBands } from "@/hooks/useVatBands";
import { useMenuItemsByProviderAndFleet } from "@/hooks/useMenuItems";
import { useLabourRates } from "@/hooks/useLabourRates";
import { useCurrentProvider } from "@/hooks/useCurrentProvider";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle, Send, PlusCircle, Sparkles, Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Types ──
interface LabourCharge {
  id: string;
  labourRateId: string;
  labourRateName: string;
  costPerUnit: number;
  units: number;
  total: number;
}

interface WorkLine {
  id: string;
  dbId?: string;
  jobTypeId: string;
  workCodeId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
  rechargeable: boolean;
  rechargeReason: string;
  dirty: boolean;
  labourCharges: LabourCharge[];
}

const emptyWorkLine = (): WorkLine => ({
  id: crypto.randomUUID(),
  jobTypeId: "",
  workCodeId: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatPercent: 0,
  rechargeable: false,
  rechargeReason: "",
  dirty: true,
  labourCharges: [],
});

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, profile } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const job = jobs?.find((j) => j.id === id);
  const { data: dbWorkItems = [], isLoading: itemsLoading } = useWorkItems(id);
  const updateJob = useUpdateJob();
  const createItem = useCreateWorkItem();
  const deleteItem = useDeleteWorkItem();
  const { data: currentProvider } = useCurrentProvider();

  const providerId = job?.provider_id || currentProvider?.id || "";
  // fleet_id is now stored directly on the job
  const jobFleetId = (job as any)?.fleet_id || profile?.fleet_id || undefined;

  const { data: workCategories } = useWorkCategories(providerId || undefined);
  const { data: workCodes } = useWorkCodes(providerId || undefined);
  const { data: vatBands } = useVatBands(providerId || undefined);
  const { data: menuItems } = useMenuItemsByProviderAndFleet(providerId || undefined, jobFleetId);
  const { data: labourRates = [] } = useLabourRates(providerId || undefined, jobFleetId);

  // Bulk fetch menu_item_labour for all menu items of this provider+fleet
  const menuItemIds = useMemo(() => menuItems?.map((i) => i.id) || [], [menuItems]);
  const { data: allMenuItemLabour } = useQuery({
    queryKey: ["menu_item_labour_bulk_job", providerId, jobFleetId, menuItemIds],
    enabled: menuItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_labour")
        .select("*")
        .in("menu_item_id", menuItemIds);
      if (error) throw error;
      return data as { id: string; menu_item_id: string; labour_rate_id: string; units: number }[];
    },
  });

  // Helper to build labour charges from a menu item's pre-set labour rates
  const buildLabourCharges = useCallback(
    (menuItemId: string): LabourCharge[] => {
      if (!allMenuItemLabour || !labourRates) return [];
      return allMenuItemLabour
        .filter((mil) => mil.menu_item_id === menuItemId)
        .map((mil) => {
          const rate = labourRates.find((r) => r.id === mil.labour_rate_id);
          return {
            id: crypto.randomUUID(),
            labourRateId: mil.labour_rate_id,
            labourRateName: rate?.name || "Unknown",
            costPerUnit: rate ? Number(rate.cost) : 0,
            units: mil.units,
            total: rate ? mil.units * Number(rate.cost) : 0,
          };
        });
    },
    [allMenuItemLabour, labourRates]
  );

  // ── Local work lines state ──
  const [workLines, setWorkLines] = useState<WorkLine[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const lastParsedDesc = useRef("");
  const [saving, setSaving] = useState(false);

  // ── VAT & price helpers ──
  const getVatPercent = useCallback(
    (categoryId: string, codeId: string): number => {
      if (!vatBands) return 0;
      if (codeId && workCodes) {
        const code = workCodes.find((c) => c.id === codeId);
        if (code?.vat_band_id) {
          const vb = vatBands.find((b) => b.id === code.vat_band_id);
          if (vb) return Number(vb.percentage);
        }
      }
      if (categoryId && workCategories) {
        const cat = workCategories.find((c) => c.id === categoryId);
        if (cat?.vat_band_id) {
          const vb = vatBands.find((b) => b.id === cat.vat_band_id);
          if (vb) return Number(vb.percentage);
        }
      }
      return 0;
    },
    [workCategories, workCodes, vatBands]
  );

  // Parse "[CATEGORY > CODE] description" from stored text
  const parseStoredDescription = useCallback(
    (raw: string) => {
      const match = raw.match(/^\[([^\]]+)\]\s*(.*)/);
      if (!match) return { jobTypeId: "", workCodeId: "", description: raw, vatPercent: 0 };
      const prefix = match[1];
      const desc = match[2];
      const parts = prefix.split(">").map((s) => s.trim());
      const catName = parts[0] || "";
      const codeName = parts[1] || "";
      const matchedCat = workCategories?.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      const catId = matchedCat?.id || "";
      const matchedCode = catId && codeName
        ? workCodes?.find((c) => c.name.toLowerCase() === codeName.toLowerCase() && c.work_category_id === catId)
        : undefined;
      const codeId = matchedCode?.id || "";
      const vatPercent = getVatPercent(catId, codeId);
      return { jobTypeId: catId, workCodeId: codeId, description: desc, vatPercent };
    },
    [workCategories, workCodes, getVatPercent]
  );

  // Initialize local state from DB items + load labour charges
  useEffect(() => {
    if (!itemsLoading && !initialized && workCategories !== undefined && workCodes !== undefined) {
      const initLines = async () => {
        if (dbWorkItems.length > 0) {
          // Fetch labour charges for all work items
          const workItemIds = dbWorkItems.map((i) => i.id);
          const { data: dbLabour } = await supabase
            .from("work_item_labour")
            .select("*")
            .in("work_item_id", workItemIds);

          setWorkLines(
            dbWorkItems.map((item) => {
              const parsed = parseStoredDescription(item.description);
              const itemLabour = (dbLabour || [])
                .filter((l: any) => l.work_item_id === item.id)
                .map((l: any) => ({
                  id: crypto.randomUUID(),
                  labourRateId: l.labour_rate_id,
                  labourRateName: l.labour_rate_name,
                  costPerUnit: Number(l.cost_per_unit),
                  units: Number(l.units),
                  total: Number(l.total),
                }));
              return {
                id: crypto.randomUUID(),
                dbId: item.id,
                jobTypeId: parsed.jobTypeId,
                workCodeId: parsed.workCodeId,
                description: parsed.description,
                quantity: item.quantity,
                unitPrice: Number(item.unit_price),
                vatPercent: parsed.vatPercent || 0,
                rechargeable: item.rechargeable,
                rechargeReason: item.recharge_reason || "",
                dirty: false,
                labourCharges: itemLabour,
              };
            })
          );
        } else {
          setWorkLines([emptyWorkLine()]);
        }
        setInitialized(true);
      };
      initLines();
    }
  }, [dbWorkItems, itemsLoading, initialized, workCategories, workCodes, parseStoredDescription]);

  const findMenuPrice = useCallback(
    (categoryId: string, codeId: string, items: typeof menuItems) => {
      if (!items?.length) return undefined;
      if (codeId) {
        const codeMatch = items.find((mi) => mi.job_type === categoryId && mi.work_code_id === codeId);
        if (codeMatch) return codeMatch;
      }
      return items.find((mi) => mi.job_type === categoryId && !mi.work_code_id);
    },
    []
  );

  const updateWorkLine = useCallback(
    (id: string, field: keyof WorkLine, value: any) => {
      setWorkLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const updated = { ...l, [field]: value, dirty: true };
          if (field === "jobTypeId") {
            updated.workCodeId = "";
            updated.vatPercent = getVatPercent(value, "");
            const match = findMenuPrice(value, "", menuItems);
            if (match) {
              updated.unitPrice = Number(match.unit_price);
              updated.labourCharges = buildLabourCharges(match.id);
              if (match.description && !l.description) updated.description = match.description;
            }
          }
          if (field === "workCodeId") {
            updated.vatPercent = getVatPercent(l.jobTypeId, value);
            const match = findMenuPrice(l.jobTypeId, value, menuItems);
            if (match) {
              updated.unitPrice = Number(match.unit_price);
              updated.labourCharges = buildLabourCharges(match.id);
              if (match.description && !l.description) updated.description = match.description;
            }
          }
          return updated;
        })
      );
    },
    [menuItems, getVatPercent, findMenuPrice, buildLabourCharges]
  );

  const addWorkLine = () => setWorkLines((prev) => [...prev, emptyWorkLine()]);
  const removeWorkLine = (lineId: string) => setWorkLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)));

  // ── Labour charge helpers ──
  const addLabourCharge = (lineId: string) => {
    const defaultRate = labourRates.find((r) => r.is_default) || labourRates[0];
    if (!defaultRate) {
      toast({ title: "No labour rates", description: "No labour rates configured for this provider/fleet.", variant: "destructive" });
      return;
    }
    const charge: LabourCharge = {
      id: crypto.randomUUID(),
      labourRateId: defaultRate.id,
      labourRateName: defaultRate.name,
      costPerUnit: Number(defaultRate.cost),
      units: 1,
      total: Number(defaultRate.cost),
    };
    setWorkLines((prev) =>
      prev.map((l) => l.id === lineId ? { ...l, labourCharges: [...l.labourCharges, charge], dirty: true } : l)
    );
  };

  const updateLabourCharge = (lineId: string, chargeId: string, field: string, value: any) => {
    setWorkLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const charges = l.labourCharges.map((c) => {
          if (c.id !== chargeId) return c;
          const updated = { ...c, [field]: value };
          if (field === "labourRateId") {
            const rate = labourRates.find((r) => r.id === value);
            if (rate) {
              updated.labourRateName = rate.name;
              updated.costPerUnit = Number(rate.cost);
              updated.total = Number(rate.cost) * updated.units;
            }
          }
          if (field === "units") {
            updated.total = updated.costPerUnit * Number(value);
          }
          return updated;
        });
        return { ...l, labourCharges: charges, dirty: true };
      })
    );
  };

  const removeLabourCharge = (lineId: string, chargeId: string) => {
    setWorkLines((prev) =>
      prev.map((l) => l.id === lineId ? { ...l, labourCharges: l.labourCharges.filter((c) => c.id !== chargeId), dirty: true } : l)
    );
  };

  // ── Totals ──
  const lineVat = (line: WorkLine) => line.quantity * line.unitPrice * (line.vatPercent / 100);
  const linePartsTotal = (line: WorkLine) => line.quantity * line.unitPrice + lineVat(line);
  const lineLabourTotal = (line: WorkLine) => line.labourCharges.reduce((s, c) => s + c.total, 0);
  const lineTotal = (line: WorkLine) => linePartsTotal(line) + lineLabourTotal(line);
  const grandTotal = workLines.reduce((sum, l) => sum + lineTotal(l), 0);
  const totalLabour = workLines.reduce((sum, l) => sum + lineLabourTotal(l), 0);

  // ── AI parsing ──
  const parseDescriptionWithAI = async (text: string) => {
    if (!text.trim() || text.trim() === lastParsedDesc.current) return;
    lastParsedDesc.current = text.trim();
    setAiLoading(true);
    try {
      const categoryNames = workCategories?.map((c) => c.name) || [];
      const codeList = workCodes?.map((c) => ({ name: c.name, category: workCategories?.find((cat) => cat.id === c.work_category_id)?.name || "" })) || [];
      const { data, error } = await supabase.functions.invoke("parse-work-lines", { body: { description: text, categories: categoryNames, codes: codeList } });
      if (error) throw error;
      if (data?.lines?.length) {
        const parsed: WorkLine[] = data.lines.map((l: any) => {
          const matchedCat = workCategories?.find((c) => c.name.toLowerCase() === (l.category || l.jobType || "").toLowerCase());
          const catId = matchedCat?.id || "";
          const matchedCode = workCodes?.find((c) => c.name.toLowerCase() === (l.workCode || "").toLowerCase() && (!catId || c.work_category_id === catId));
          const codeId = matchedCode?.id || "";
          const menuMatch = findMenuPrice(catId, codeId, menuItems);
          const unitPrice = menuMatch ? Number(menuMatch.unit_price) : (l.unitPrice || 0);
          const charges = menuMatch ? buildLabourCharges(menuMatch.id) : [];
          return { id: crypto.randomUUID(), jobTypeId: catId, workCodeId: codeId, description: l.description || "", quantity: l.quantity || 1, unitPrice, vatPercent: getVatPercent(catId, codeId), rechargeable: false, rechargeReason: "", dirty: true, labourCharges: charges };
        });
        setWorkLines((prev) => {
          const existing = prev.filter((l) => l.description.trim() || l.jobTypeId || l.dbId);
          return [...existing, ...parsed];
        });
        toast({ title: "AI parsed work lines", description: `${parsed.length} new line(s) added` });
      }
    } catch (err: any) {
      toast({ title: "AI parsing failed", description: err.message || "Could not parse description", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Save all work lines + labour to DB ──
  const handleSaveWorkItems = async () => {
    if (!job) return;
    setSaving(true);
    try {
      // Delete all existing DB items (cascade deletes labour)
      const existingIds = dbWorkItems.map((i) => i.id);
      for (const eid of existingIds) {
        await deleteItem.mutateAsync({ id: eid, job_id: job.id });
      }
      // Insert all current lines
      const validLines = workLines.filter((l) => l.description.trim());
      if (validLines.length > 0) {
        const items = validLines.map((l) => {
          const catName = workCategories?.find((wc) => wc.id === l.jobTypeId)?.name || "";
          const codeName = workCodes?.find((c) => c.id === l.workCodeId)?.name || "";
          const prefix = [catName, codeName].filter(Boolean).join(" > ");
          return { job_id: job.id, description: prefix ? `[${prefix.toUpperCase()}] ${l.description}` : l.description, quantity: l.quantity, unit_price: l.unitPrice, total: linePartsTotal(l), rechargeable: l.rechargeable, recharge_reason: l.rechargeReason || null };
        });
        const { data: insertedItems, error } = await supabase.from("work_items").insert(items).select();
        if (error) throw error;

        // Insert labour charges for each work item
        if (insertedItems) {
          const labourRows: any[] = [];
          validLines.forEach((line, idx) => {
            const dbItem = insertedItems[idx];
            if (dbItem && line.labourCharges.length > 0) {
              line.labourCharges.forEach((charge) => {
                labourRows.push({
                  work_item_id: dbItem.id,
                  labour_rate_id: charge.labourRateId,
                  labour_rate_name: charge.labourRateName,
                  cost_per_unit: charge.costPerUnit,
                  units: charge.units,
                  total: charge.total,
                });
              });
            }
          });
          if (labourRows.length > 0) {
            const { error: labErr } = await supabase.from("work_item_labour").insert(labourRows);
            if (labErr) throw labErr;
          }
        }
      }
      // Update job estimate total (parts + labour)
      const total = validLines.reduce((s, l) => s + lineTotal(l), 0);
      await updateJob.mutateAsync({ id: job.id, estimate_total: total });

      // Mark lines as clean with new DB IDs instead of re-initializing
      if (validLines.length > 0) {
        const { data: freshItems } = await supabase
          .from("work_items")
          .select("*")
          .eq("job_id", job.id)
          .order("created_at", { ascending: true });
        if (freshItems) {
          setWorkLines((prev) =>
            prev.map((line, idx) => ({
              ...line,
              dbId: freshItems[idx]?.id || line.dbId,
              dirty: false,
            }))
          );
        }
      } else {
        setWorkLines([emptyWorkLine()]);
      }
      toast({ title: "Work items saved", description: `${validLines.length} line(s) saved` });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Actions ──
  const isProvider = userRole === "service-provider";
  const canConfirm = isProvider && job?.status === "booked";
  const canEditItems = isProvider && job && ["booked", "confirmed"].includes(job.status);
  const canSubmitEstimate = isProvider && job?.status === "confirmed" && workLines.some((l) => l.description.trim());

  const handleConfirm = async () => {
    try {
      await updateJob.mutateAsync({ id: job!.id, status: "confirmed" });
      toast({ title: "Booking confirmed", description: "You can now review and update the work items before submitting an estimate." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmitEstimate = async () => {
    await handleSaveWorkItems();
    try {
      const total = workLines.filter((l) => l.description.trim()).reduce((s, l) => s + lineTotal(l), 0);
      await updateJob.mutateAsync({ id: job!.id, status: "estimated", estimate_total: total });
      toast({ title: "Estimate submitted", description: `Estimate of £${total.toFixed(2)} sent to Fleet Manager for approval.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (jobsLoading || itemsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{job.job_number}</h1>
              <StatusBadge status={job.status} />
              {job.priority === "urgent" && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
              {job.priority === "high" && <Badge className="text-[10px]">HIGH</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{job.vehicle_reg} {job.vehicle_make_model && `· ${job.vehicle_make_model}`}</p>
          </div>
          <div className="flex gap-2">
            {canConfirm && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="gap-1.5"><CheckCircle className="w-4 h-4" /> Confirm Booking</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
                    <AlertDialogDescription>This confirms you will carry out the work for {job.vehicle_reg}. You can then review the work items and submit your estimate.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={updateJob.isPending}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canEditItems && (
              <Button variant="outline" className="gap-1.5" onClick={handleSaveWorkItems} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Work Items
              </Button>
            )}
            {canSubmitEstimate && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="gap-1.5"><Send className="w-4 h-4" /> Submit Estimate</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit estimate?</AlertDialogTitle>
                    <AlertDialogDescription>This will save and submit an estimate of £{grandTotal.toFixed(2)} to the Fleet Manager for approval.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitEstimate} disabled={updateJob.isPending || saving}>Submit</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <JobProgress currentStatus={job.status} />
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Booking Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Booking Date</span><p className="font-medium">{job.booking_date ? `${new Date(job.booking_date).toLocaleDateString()} ${new Date(job.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "—"}</p></div>
              <div><span className="text-muted-foreground">Booking Ref</span><p className="font-medium">{job.booking_reference || job.job_number || "—"}</p></div>
              <div><span className="text-muted-foreground">Fleet Ref</span><p className="font-medium">{job.fleet_reference || "—"}</p></div>
              <div><span className="text-muted-foreground">Depot</span><p className="font-medium">{job.depot || "—"}</p></div>
              <div><span className="text-muted-foreground">Contact</span><p className="font-medium">{job.contact_name || "—"}</p></div>
            </div>
            {job.description && (
              <>
                <Separator className="my-4" />
                <div><span className="text-sm text-muted-foreground">Description</span><p className="text-sm mt-1">{job.description}</p></div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Work Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Work Items</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Total: £{grandTotal.toFixed(2)}</span>
                {canEditItems && (
                  <Button type="button" variant="outline" size="sm" onClick={addWorkLine}>
                    <PlusCircle className="w-4 h-4 mr-1" /> Add Line
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI description parser */}
            {canEditItems && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description (AI auto-generate)</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={aiLoading || !aiText.trim()} onClick={() => parseDescriptionWithAI(aiText)}>
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate Lines
                  </Button>
                </div>
                <Textarea value={aiText} onChange={(e) => setAiText(e.target.value)} onBlur={() => { if (aiText.trim()) parseDescriptionWithAI(aiText); }} placeholder="Describe the work needed — AI will auto-generate work lines..." rows={3} />
              </div>
            )}

            {/* Work line cards */}
            <div className="space-y-3">
              {workLines.map((line, idx) => {
                const catName = workCategories?.find((wc) => wc.id === line.jobTypeId)?.name;
                const codeName = workCodes?.find((c) => c.id === line.workCodeId)?.name;
                const codesForCategory = workCodes?.filter((c) => c.work_category_id === line.jobTypeId) || [];

                if (!canEditItems) {
                  // Read-only view
                  return (
                    <div key={line.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{line.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.quantity} × £{line.unitPrice.toFixed(2)}
                            {line.rechargeable && <Badge variant="outline" className="ml-2 text-[9px] h-4">Rechargeable</Badge>}
                          </p>
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap">£{linePartsTotal(line).toFixed(2)}</span>
                      </div>
                      {line.labourCharges.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {line.labourCharges.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{c.labourRateName}</span>
                              <span>{c.units} unit(s) × £{c.costPerUnit.toFixed(2)}</span>
                              <span className="font-semibold text-foreground ml-auto">£{c.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Card key={line.id} className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">
                          Line {idx + 1}{catName ? ` · ${catName}` : ""}{codeName ? ` > ${codeName}` : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          {isProvider && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => addLabourCharge(line.id)}>
                              <Clock className="w-3.5 h-3.5" /> Labour
                            </Button>
                          )}
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeWorkLine(line.id)} disabled={workLines.length <= 1}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_140px_140px_60px_90px_90px_90px] gap-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Description *</Label>
                          <Input value={line.description} onChange={(e) => updateWorkLine(line.id, "description", e.target.value)} placeholder="e.g. Indicator repair, Tyre replacement..." className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Category</Label>
                          <Select value={line.jobTypeId} onValueChange={(v) => updateWorkLine(line.id, "jobTypeId", v)}>
                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {workCategories?.map((wc) => (<SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>))}
                              {!workCategories?.length && (<SelectItem value="none" disabled>No categories</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Work Code</Label>
                          <Select value={line.workCodeId} onValueChange={(v) => updateWorkLine(line.id, "workCodeId", v)} disabled={!line.jobTypeId || codesForCategory.length === 0}>
                            <SelectTrigger className="text-sm"><SelectValue placeholder={!line.jobTypeId ? "Select category first" : codesForCategory.length === 0 ? "No codes" : "Select"} /></SelectTrigger>
                            <SelectContent>
                              {codesForCategory.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Qty</Label>
                          <Input type="number" min={1} value={line.quantity} onChange={(e) => updateWorkLine(line.id, "quantity", Number(e.target.value) || 1)} className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Unit £</Label>
                          <Input type="number" min={0} step={0.01} value={line.unitPrice || ""} onChange={(e) => updateWorkLine(line.id, "unitPrice", Number(e.target.value) || 0)} className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">VAT ({line.vatPercent}%)</Label>
                          <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">£{lineVat(line).toFixed(2)}</div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Total</Label>
                          <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">£{linePartsTotal(line).toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Labour charges for this work item */}
                      {line.labourCharges.length > 0 && (
                        <div className="mt-2 ml-2 space-y-2 border-l-2 border-primary/20 pl-3">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Labour Charges
                          </span>
                          {line.labourCharges.map((charge) => (
                            <div key={charge.id} className="flex items-center gap-2">
                              <Select value={charge.labourRateId} onValueChange={(v) => updateLabourCharge(line.id, charge.id, "labourRateId", v)}>
                                <SelectTrigger className="text-sm w-[280px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {labourRates.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name} (£{Number(r.cost).toFixed(2)}/unit)</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs whitespace-nowrap">Units</Label>
                                <Input
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={charge.units}
                                  onChange={(e) => updateLabourCharge(line.id, charge.id, "units", Number(e.target.value) || 1)}
                                  className="w-20 h-8 text-sm"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                × £{charge.costPerUnit.toFixed(2)}
                              </span>
                              <span className="text-sm font-semibold whitespace-nowrap ml-auto">
                                £{charge.total.toFixed(2)}
                              </span>
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeLabourCharge(line.id, charge.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Grand total bar */}
            <div className="rounded-lg bg-primary/10 px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parts & Materials</span>
                <span className="text-sm font-medium font-mono">£{(grandTotal - totalLabour).toFixed(2)}</span>
              </div>
              {totalLabour > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Labour</span>
                  <span className="text-sm font-medium font-mono">£{totalLabour.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Estimated Total (inc. VAT)</span>
                <span className="text-lg font-bold font-mono">£{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
