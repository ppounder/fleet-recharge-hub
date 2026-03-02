import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateJob } from "@/hooks/useJobs";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useVehicles } from "@/hooks/useVehicles";
import { useMenuItemsByProviderAndFleet } from "@/hooks/useMenuItems";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useVatBands } from "@/hooks/useVatBands";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, PlusCircle, Sparkles, Loader2 } from "lucide-react";

interface WorkLine {
  id: string;
  jobTypeId: string; // job_types.id
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
  rechargeable: boolean;
  rechargeReason: string;
}

const emptyWorkLine = (): WorkLine => ({
  id: crypto.randomUUID(),
  jobTypeId: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatPercent: 0,
  rechargeable: false,
  rechargeReason: "",
});

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [workLines, setWorkLines] = useState<WorkLine[]>([emptyWorkLine()]);
  const createJob = useCreateJob();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { data: serviceProviders, isLoading: loadingProviders } = useServiceProviders();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();

  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const [aiLoading, setAiLoading] = useState(false);
  const lastParsedDesc = useRef("");

  // Fetch work categories & vat bands for selected provider
  const { data: workCategories } = useWorkCategories(providerId || undefined);
  const { data: vatBands } = useVatBands(providerId || undefined);
  // Fetch agreed menu items for this provider + fleet combination
  const { data: menuItems } = useMenuItemsByProviderAndFleet(providerId || undefined, profile?.fleet_id || undefined);

  // Build a lookup: job_type_id → vat percentage
  const vatLookup = useMemo(() => {
    const map = new Map<string, number>();
    if (!workCategories || !vatBands) return map;
    for (const jt of workCategories) {
      if (jt.vat_band_id) {
        const vb = vatBands.find((b) => b.id === jt.vat_band_id);
        if (vb) map.set(jt.id, Number(vb.percentage));
      }
    }
    return map;
  }, [workCategories, vatBands]);

  // Helper: apply menu item prices to work lines
  const applyMenuPrices = useCallback(
    (lines: WorkLine[], items: typeof menuItems): WorkLine[] => {
      if (!items?.length) return lines;
      return lines.map((l) => {
        if (!l.jobTypeId) return l;
        const match = items.find((mi) => mi.job_type === l.jobTypeId);
        if (match && l.unitPrice === 0) {
          return {
            ...l,
            unitPrice: Number(match.unit_price),
            vatPercent: vatLookup.get(l.jobTypeId) ?? 0,
          };
        }
        return l;
      });
    },
    [vatLookup]
  );

  const parseDescriptionWithAI = async (text: string) => {
    if (!text.trim() || text.trim() === lastParsedDesc.current) return;
    lastParsedDesc.current = text.trim();
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-work-lines", {
        body: { description: text },
      });
      if (error) throw error;
      if (data?.lines?.length) {
        // AI returns jobType as text — try to match to a work_categories record by name
        const parsed: WorkLine[] = data.lines.map((l: any) => {
          const matchedJt = workCategories?.find((jt) => jt.name.toLowerCase() === (l.jobType || "").toLowerCase());
          const jtId = matchedJt?.id || "";
          return {
            id: crypto.randomUUID(),
            jobTypeId: jtId,
            description: l.description || "",
            quantity: l.quantity || 1,
            unitPrice: l.unitPrice || 0,
            vatPercent: jtId ? (vatLookup.get(jtId) ?? 0) : 0,
            rechargeable: false,
            rechargeReason: "",
          };
        });
        setWorkLines(applyMenuPrices(parsed, menuItems));
        toast({ title: "AI parsed work lines", description: `${parsed.length} line(s) generated from description` });
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      toast({ title: "AI parsing failed", description: err.message || "Could not parse description", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // When menuItems load/change, apply prices to any lines that still have 0 price
  useEffect(() => {
    if (menuItems?.length) {
      setWorkLines((prev) => applyMenuPrices(prev, menuItems));
    }
  }, [menuItems, applyMenuPrices]);

  // Reset work lines when provider changes
  useEffect(() => {
    setWorkLines([emptyWorkLine()]);
  }, [providerId]);

  const addWorkLine = () => setWorkLines((prev) => [...prev, emptyWorkLine()]);

  const removeWorkLine = (id: string) =>
    setWorkLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));

  const updateWorkLine = useCallback(
    (id: string, field: keyof WorkLine, value: any) => {
      setWorkLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const updated = { ...l, [field]: value };
          // Auto-populate price and VAT when work category changes
          if (field === "jobTypeId") {
            updated.vatPercent = vatLookup.get(value) ?? 0;
            if (menuItems?.length) {
              const match = menuItems.find((mi) => mi.job_type === value);
              if (match) {
                updated.unitPrice = Number(match.unit_price);
                if (match.description && !l.description) {
                  updated.description = match.description;
                }
              }
            }
          }
          return updated;
        })
      );
    },
    [menuItems, vatLookup]
  );

  const lineVat = (line: WorkLine) => line.quantity * line.unitPrice * (line.vatPercent / 100);
  const lineTotal = (line: WorkLine) => line.quantity * line.unitPrice + lineVat(line);
  const grandTotal = workLines.reduce((sum, l) => sum + lineTotal(l), 0);

  const resetForm = () => {
    setVehicleId("");
    setProviderId("");
    setPriority("normal");
    setDescription("");
    setWorkLines([emptyWorkLine()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;

    const jobNumber = `J-${Date.now().toString().slice(-4)}`;
    const firstLineWc = workCategories?.find((wc) => wc.id === workLines[0]?.jobTypeId);

    try {
      const jobData = await createJob.mutateAsync({
        job_number: jobNumber,
        vehicle_reg: selectedVehicle?.registration.toUpperCase() ?? "",
        vehicle_make_model: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        vehicle_id: vehicleId,
        type: firstLineWc?.name || "maintenance",
        priority,
        description: description || null,
        fleet_manager_id: user?.id ?? null,
        provider_id: providerId || null,
        status: "booked",
        estimate_total: grandTotal,
      });

      const validLines = workLines.filter((l) => l.description.trim());
      if (validLines.length > 0) {
        const items = validLines.map((l) => {
          const jtName = workCategories?.find((wc) => wc.id === l.jobTypeId)?.name || "";
          return {
            job_id: jobData.id,
            description: jtName ? `[${jtName.toUpperCase()}] ${l.description}` : l.description,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            total: lineTotal(l),
            rechargeable: l.rechargeable,
            recharge_reason: l.rechargeReason || null,
          };
        });
        const { error } = await supabase.from("estimate_items").insert(items);
        if (error) throw error;
      }

      toast({ title: "Job created", description: `${jobNumber} created with ${validLines.length} work line(s) — Total: £${grandTotal.toFixed(2)}` });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Job
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="!w-[calc(100vw-var(--sidebar-width))] !max-w-none overflow-y-auto p-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-xl">Create New Job</SheetTitle>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Vehicle & Job Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vehicle & Job Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingVehicles ? "Loading..." : "Select a vehicle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration} — {v.make} {v.model}
                        </SelectItem>
                      ))}
                      {(!vehicles || vehicles.length === 0) && !loadingVehicles && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles in fleet</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Provider</Label>
                  <Select value={providerId} onValueChange={setProviderId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProviders ? "Loading..." : "Select a provider"} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceProviders?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name}
                        </SelectItem>
                      ))}
                      {(!serviceProviders || serviceProviders.length === 0) && !loadingProviders && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No providers found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={aiLoading || !description.trim()}
                      onClick={() => parseDescriptionWithAI(description)}
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate Lines
                    </Button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => { if (description.trim()) parseDescriptionWithAI(description); }}
                    placeholder="Describe the work needed — AI will auto-generate work lines..."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Work Lines */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Work Lines
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addWorkLine}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {workLines.map((line, idx) => {
                  const jtName = workCategories?.find((wc) => wc.id === line.jobTypeId)?.name;
                  return (
                    <Card key={line.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            Line {idx + 1}{jtName ? ` · ${jtName}` : ""}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeWorkLine(line.id)}
                            disabled={workLines.length <= 1}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-[1fr_150px_60px_90px_90px_90px] gap-3 items-end">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Description *</Label>
                            <Input
                              value={line.description}
                              onChange={(e) => updateWorkLine(line.id, "description", e.target.value)}
                              placeholder="e.g. Indicator repair, Tyre replacement..."
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Work Category</Label>
                            <Select
                              value={line.jobTypeId}
                              onValueChange={(v) => updateWorkLine(line.id, "jobTypeId", v)}
                            >
                              <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {workCategories?.map((wc) => (
                                  <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                                ))}
                                {!workCategories?.length && (
                                  <SelectItem value="none" disabled>
                                    {providerId ? "No work categories for this provider" : "Select a provider first"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) => updateWorkLine(line.id, "quantity", Number(e.target.value) || 1)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Unit £</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={line.unitPrice || ""}
                              onChange={(e) => updateWorkLine(line.id, "unitPrice", Number(e.target.value) || 0)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">VAT ({line.vatPercent}%)</Label>
                            <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">
                              £{lineVat(line).toFixed(2)}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Total</Label>
                            <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">
                              £{lineTotal(line).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
                <span className="text-sm font-semibold">Estimated Total (inc. VAT)</span>
                <span className="text-lg font-bold font-mono">£{grandTotal.toFixed(2)}</span>
              </div>
            </section>
          </div>

          {/* Sticky Footer */}
          <div className="border-t border-border p-4 flex justify-end gap-3 bg-card">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
