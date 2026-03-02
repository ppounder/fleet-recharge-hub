import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useCreateJob } from "@/hooks/useJobs";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useVehicles } from "@/hooks/useVehicles";
import { useMenuItemsByProviderAndFleet } from "@/hooks/useMenuItems";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useWorkCodes } from "@/hooks/useWorkCodes";
import { useVatBands } from "@/hooks/useVatBands";
import { useLabourRates } from "@/hooks/useLabourRates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, PlusCircle, Sparkles, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

// ── Work Line Types ──────────────────────────────────────────────
interface LabourCharge {
  labour_rate_id: string;
  labour_rate_name: string;
  units: number;
  cost_per_unit: number;
  total: number;
}

interface WorkLine {
  id: string;
  jobTypeId: string;
  workCodeId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
  rechargeable: boolean;
  rechargeReason: string;
  labourCharges: LabourCharge[];
  menuItemId: string | null;
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
  labourCharges: [],
  menuItemId: null,
});

// ── Component ────────────────────────────────────────────────────
export function CreateJobDialog() {
  const [open, setOpen] = useState(false);

  // Step 1: Vehicle & Provider
  const [vehicleId, setVehicleId] = useState("");
  const [providerId, setProviderId] = useState("");

  // Step 2: Booking details
  const [fleetReference, setFleetReference] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [depot, setDepot] = useState("");
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState("09:00");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [priority, setPriority] = useState("normal");

  // Step 3: Work lines
  const [description, setDescription] = useState("");
  const [workLines, setWorkLines] = useState<WorkLine[]>([emptyWorkLine()]);
  const [aiLoading, setAiLoading] = useState(false);
  const lastParsedDesc = useRef("");

  const createJob = useCreateJob();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { data: serviceProviders, isLoading: loadingProviders } = useServiceProviders();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();

  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);

  const { data: workCategories } = useWorkCategories(providerId || undefined);
  const { data: workCodes } = useWorkCodes(providerId || undefined);
  const { data: vatBands } = useVatBands(providerId || undefined);
  const { data: menuItems } = useMenuItemsByProviderAndFleet(providerId || undefined, profile?.fleet_id || undefined);
  const { data: labourRates } = useLabourRates(providerId || undefined, profile?.fleet_id || undefined);

  // Bulk fetch menu_item_labour for all menu items of this provider+fleet
  const menuItemIds = useMemo(() => menuItems?.map((i) => i.id) || [], [menuItems]);
  const { data: allMenuItemLabour } = useQuery({
    queryKey: ["menu_item_labour_bulk_create", providerId, profile?.fleet_id, menuItemIds],
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

  // Helper to build labour charges from a menu item
  const buildLabourCharges = useCallback(
    (menuItemId: string): LabourCharge[] => {
      if (!allMenuItemLabour || !labourRates) return [];
      return allMenuItemLabour
        .filter((mil) => mil.menu_item_id === menuItemId)
        .map((mil) => {
          const rate = labourRates.find((r) => r.id === mil.labour_rate_id);
          return {
            labour_rate_id: mil.labour_rate_id,
            labour_rate_name: rate?.name || "Unknown",
            units: mil.units,
            cost_per_unit: rate ? Number(rate.cost) : 0,
            total: rate ? mil.units * Number(rate.cost) : 0,
          };
        });
    },
    [allMenuItemLabour, labourRates]
  );
  // ── VAT & price helpers (unchanged logic) ──────────────────────
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

  const applyMenuPrices = useCallback(
    (lines: WorkLine[], items: typeof menuItems): WorkLine[] => {
      if (!items?.length) return lines;
      return lines.map((l) => {
        if (!l.jobTypeId) return l;
        const match = findMenuPrice(l.jobTypeId, l.workCodeId, items);
        if (match && l.unitPrice === 0) {
          return { ...l, unitPrice: Number(match.unit_price), vatPercent: getVatPercent(l.jobTypeId, l.workCodeId) };
        }
        return l;
      });
    },
    [getVatPercent, findMenuPrice]
  );

  // ── AI parsing (unchanged) ─────────────────────────────────────
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
          return { id: crypto.randomUUID(), jobTypeId: catId, workCodeId: codeId, description: l.description || "", quantity: l.quantity || 1, unitPrice: l.unitPrice || 0, vatPercent: getVatPercent(catId, codeId), rechargeable: false, rechargeReason: "", labourCharges: menuMatch ? buildLabourCharges(menuMatch.id) : [], menuItemId: menuMatch?.id || null };
        });
        const newLines = applyMenuPrices(parsed, menuItems);
        setWorkLines((prev) => {
          // Remove any empty placeholder lines before appending
          const existing = prev.filter((l) => l.description.trim() || l.jobTypeId);
          return [...existing, ...newLines];
        });
        toast({ title: "AI parsed work lines", description: `${parsed.length} line(s) added from description` });
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      toast({ title: "AI parsing failed", description: err.message || "Could not parse description", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (menuItems?.length) setWorkLines((prev) => applyMenuPrices(prev, menuItems));
  }, [menuItems, applyMenuPrices]);

  useEffect(() => {
    setWorkLines([emptyWorkLine()]);
  }, [providerId]);

  const addWorkLine = () => setWorkLines((prev) => [...prev, emptyWorkLine()]);
  const removeWorkLine = (id: string) => setWorkLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));

  const updateWorkLine = useCallback(
    (id: string, field: keyof WorkLine, value: any) => {
      setWorkLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const updated = { ...l, [field]: value };
          if (field === "jobTypeId") {
            updated.workCodeId = "";
            updated.vatPercent = getVatPercent(value, "");
            const match = findMenuPrice(value, "", menuItems);
            if (match) {
              updated.unitPrice = Number(match.unit_price);
              updated.menuItemId = match.id;
              updated.labourCharges = buildLabourCharges(match.id);
              if (match.description && !l.description) updated.description = match.description;
            } else {
              updated.menuItemId = null;
              updated.labourCharges = [];
            }
          }
          if (field === "workCodeId") {
            updated.vatPercent = getVatPercent(l.jobTypeId, value);
            const match = findMenuPrice(l.jobTypeId, value, menuItems);
            if (match) {
              updated.unitPrice = Number(match.unit_price);
              updated.menuItemId = match.id;
              updated.labourCharges = buildLabourCharges(match.id);
              if (match.description && !l.description) updated.description = match.description;
            } else {
              updated.menuItemId = null;
              updated.labourCharges = [];
            }
          }
          return updated;
        })
      );
    },
    [menuItems, getVatPercent, findMenuPrice, buildLabourCharges]
  );

  const lineLabourTotal = (line: WorkLine) => line.labourCharges.reduce((sum, lc) => sum + lc.total, 0);
  const lineVat = (line: WorkLine) => line.quantity * line.unitPrice * (line.vatPercent / 100);
  const lineTotal = (line: WorkLine) => line.quantity * line.unitPrice + lineLabourTotal(line) + lineVat(line);
  const grandTotal = workLines.reduce((sum, l) => sum + lineTotal(l), 0);

  const resetForm = () => {
    setVehicleId(""); setProviderId(""); setPriority("normal"); setDescription("");
    setFleetReference(""); setBookingReference(""); setDepot("");
    setBookingDate(undefined); setBookingTime("09:00");
    setContactName(""); setContactEmail(""); setContactPhone("");
    setWorkLines([emptyWorkLine()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !providerId) return;

    const jobNumber = `B-${Date.now().toString().slice(-6)}`;
    const firstLineWc = workCategories?.find((wc) => wc.id === workLines[0]?.jobTypeId);

    // Combine date + time
    let combinedDate: string | null = null;
    if (bookingDate) {
      const [hh, mm] = bookingTime.split(":").map(Number);
      const dt = new Date(bookingDate);
      dt.setHours(hh || 9, mm || 0, 0, 0);
      combinedDate = dt.toISOString();
    }

    try {
      const jobData = await createJob.mutateAsync({
        job_number: jobNumber,
        vehicle_reg: selectedVehicle?.registration.toUpperCase() ?? "",
        vehicle_make_model: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        vehicle_id: vehicleId,
        type: firstLineWc?.name || "maintenance",
        priority,
        description: description || null,
        fleet_id: profile?.fleet_id ?? null,
        provider_id: providerId || null,
        status: "booked",
        estimate_total: grandTotal,
        fleet_reference: fleetReference || null,
        booking_reference: bookingReference || null,
        depot: depot || null,
        booking_date: combinedDate,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
      } as any);

      const validLines = workLines.filter((l) => l.description.trim());
      if (validLines.length > 0) {
        const items = validLines.map((l) => {
          const catName = workCategories?.find((wc) => wc.id === l.jobTypeId)?.name || "";
          const codeName = workCodes?.find((c) => c.id === l.workCodeId)?.name || "";
          const prefix = [catName, codeName].filter(Boolean).join(" > ");
          return { job_id: jobData.id, description: prefix ? `[${prefix.toUpperCase()}] ${l.description}` : l.description, quantity: l.quantity, unit_price: l.unitPrice, total: lineTotal(l), rechargeable: l.rechargeable, recharge_reason: l.rechargeReason || null };
        });
        const { data: insertedItems, error } = await supabase.from("work_items").insert(items).select("id");
        if (error) throw error;

        // Insert labour charges for each work item
        const labourInserts: any[] = [];
        validLines.forEach((l, idx) => {
          const workItemId = insertedItems?.[idx]?.id;
          if (workItemId && l.labourCharges.length > 0) {
            l.labourCharges.forEach((lc) => {
              labourInserts.push({
                work_item_id: workItemId,
                labour_rate_id: lc.labour_rate_id,
                labour_rate_name: lc.labour_rate_name,
                units: lc.units,
                cost_per_unit: lc.cost_per_unit,
                total: lc.total,
              });
            });
          }
        });
        if (labourInserts.length > 0) {
          const { error: labourError } = await supabase.from("work_item_labour").insert(labourInserts);
          if (labourError) throw labourError;
        }
      }

      toast({ title: "Booking created", description: `${jobNumber} created with ${validLines.length} work line(s) — Total: £${grandTotal.toFixed(2)}` });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Booking
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="!w-[calc(100vw-var(--sidebar-width))] !max-w-none overflow-y-auto p-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-xl">Create New Booking</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── Section 1: Vehicle & Service Provider ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vehicle & Service Provider</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger><SelectValue placeholder={loadingVehicles ? "Loading..." : "Select a vehicle"} /></SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.registration} — {v.make} {v.model}</SelectItem>
                      ))}
                      {(!vehicles || vehicles.length === 0) && !loadingVehicles && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles in fleet</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service Provider *</Label>
                  <Select value={providerId} onValueChange={setProviderId}>
                    <SelectTrigger><SelectValue placeholder={loadingProviders ? "Loading..." : "Select a provider"} /></SelectTrigger>
                    <SelectContent>
                      {serviceProviders?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                      {(!serviceProviders || serviceProviders.length === 0) && !loadingProviders && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No providers found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Section 2: Booking Details ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fleet Reference</Label>
                  <Input value={fleetReference} onChange={(e) => setFleetReference(e.target.value)} placeholder="e.g. FR-001234" />
                </div>
                <div className="space-y-2">
                  <Label>Booking Reference</Label>
                  <Input value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} placeholder="Auto-generated if empty" />
                </div>
                <div className="space-y-2">
                  <Label>Depot</Label>
                  <Input value={depot} onChange={(e) => setDepot(e.target.value)} placeholder="e.g. Birmingham" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Booking Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bookingDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Booking Time</Label>
                  <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
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
            </section>

            <Separator />

            {/* ── Section 3: Contact Details ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Telephone</Label>
                  <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="07xxx xxx xxx" />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Section 4: Work Lines ── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Work Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addWorkLine}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Line
                </Button>
              </div>

              {/* AI description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description (AI auto-generate)</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={aiLoading || !description.trim()} onClick={() => parseDescriptionWithAI(description)}>
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate Lines
                  </Button>
                </div>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => { if (description.trim()) parseDescriptionWithAI(description); }} placeholder="Describe the work needed — AI will auto-generate work lines..." rows={3} />
              </div>

              <div className="space-y-3">
                {workLines.map((line, idx) => {
                  const catName = workCategories?.find((wc) => wc.id === line.jobTypeId)?.name;
                  const codeName = workCodes?.find((c) => c.id === line.workCodeId)?.name;
                  const codesForCategory = workCodes?.filter((c) => c.work_category_id === line.jobTypeId) || [];
                  return (
                    <Card key={line.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            Line {idx + 1}{catName ? ` · ${catName}` : ""}{codeName ? ` > ${codeName}` : ""}
                          </span>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeWorkLine(line.id)} disabled={workLines.length <= 1}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
                                {!workCategories?.length && (<SelectItem value="none" disabled>{providerId ? "No categories" : "Select provider"}</SelectItem>)}
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
                            <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">£{lineTotal(line).toFixed(2)}</div>
                          </div>
                        </div>
                        {/* Labour charges (read-only) */}
                        {line.labourCharges.length > 0 && (
                          <div className="border-t border-border pt-2 mt-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labour Rates</span>
                            <div className="mt-1 space-y-1">
                              {line.labourCharges.map((lc, lcIdx) => (
                                <div key={lcIdx} className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                                  <span>{lc.labour_rate_name}</span>
                                  <span className="font-mono">{lc.units} × £{lc.cost_per_unit.toFixed(2)} = £{lc.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
                <span className="text-sm font-semibold">Estimated Total (inc. VAT)</span>
                <span className="text-lg font-bold font-mono">£{grandTotal.toFixed(2)}</span>
              </div>
            </section>
          </div>

          {/* Sticky Footer */}
          <div className="border-t border-border p-4 flex justify-end gap-3 bg-card">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createJob.isPending || !vehicleId || !providerId}>
              {createJob.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
