import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVehicles, useUpdateVehicle, useCreateVehicle, Vehicle } from "@/hooks/useVehicles";
import { useVehicleDefects, VehicleDefect, DefectStatus } from "@/hooks/useVehicleDefects";
import { ArrowLeft, ArrowUpDown, Calendar as CalendarIcon, Car, Check, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Columns3, GripVertical, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { VehicleStatusDialog } from "@/components/VehicleStatusDialog";
import { MaintenanceMessageDialog } from "@/components/MaintenanceMessageDialog";
import { AddDefectDialog } from "@/components/AddDefectDialog";

import { UKNumberPlate } from "@/components/UKNumberPlate";
import { WheelPlanDiagram } from "@/components/WheelPlanDiagram";
import { TyreReadingsHistory } from "@/components/TyreReadingsHistory";
import { OdometerReadingsHistory } from "@/components/OdometerReadingsHistory";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EditableFields = {
  status: string;
  vin: string;
  registration: string;
  fleet_number: string;
  asset_number: string;
  asset_type: string;
  body_type: string;
  wheel_plan: string;
  make: string;
  model: string;
  derivative: string;
  year: string;
  mot_due: string;
  next_service: string;
  mileage: string;
  registered_date: string;
  date_in_service: string;
  last_service_date: string;
  next_service_date: string;
  last_inspection_date: string;
  next_inspection_date: string;
  mot_issued_date: string;
  mot_expiry_date: string;
  loler_expiry_date: string;
  tacho_2yr_expiry_date: string;
  tacho_6yr_expiry_date: string;
  rfl_type: string;
  rfl_expiry_date: string;
  rfl_renewal_method: string;
  rfl_renewal_term_months: string;
  rfl_supplier: string;
  odometer_start_distance: string;
  last_known_distance: string;
  last_known_distance_unit: string;
  last_known_distance_recorded_at: string;
  distance_source: string;
  average_monthly_distance: string;
  life_distance: string;
  estimated_distance: string;
};

const blank: EditableFields = {
  status: "",
  vin: "",
  registration: "",
  fleet_number: "",
  asset_number: "",
  asset_type: "",
  body_type: "",
  wheel_plan: "",
  make: "",
  model: "",
  derivative: "",
  year: "",
  mot_due: "",
  next_service: "",
  mileage: "",
  registered_date: "",
  date_in_service: "",
  last_service_date: "",
  next_service_date: "",
  last_inspection_date: "",
  next_inspection_date: "",
  mot_issued_date: "",
  mot_expiry_date: "",
  loler_expiry_date: "",
  tacho_2yr_expiry_date: "",
  tacho_6yr_expiry_date: "",
  rfl_type: "",
  rfl_expiry_date: "",
  rfl_renewal_method: "",
  rfl_renewal_term_months: "",
  rfl_supplier: "",
  odometer_start_distance: "",
  last_known_distance: "",
  last_known_distance_unit: "",
  last_known_distance_recorded_at: "",
  distance_source: "",
  average_monthly_distance: "",
  life_distance: "",
  estimated_distance: "",
};

function toForm(v: Vehicle): EditableFields {
  return {
    status: v.status || "",
    vin: v.vin || "",
    registration: v.registration || "",
    fleet_number: (v as any).fleet_number || "",
    asset_number: (v as any).asset_number || "",
    asset_type: (v as any).asset_type || "",
    body_type: (v as any).body_type || "",
    wheel_plan: (v as any).wheel_plan || "",
    make: v.make || "",
    model: v.model || "",
    derivative: (v as any).derivative || "",
    year: v.year != null ? String(v.year) : "",
    mot_due: v.mot_due || "",
    next_service: v.next_service || "",
    mileage: v.mileage != null ? String(v.mileage) : "",
    registered_date: (v as any).registered_date || "",
    date_in_service: (v as any).date_in_service || "",
    last_service_date: (v as any).last_service_date || "",
    next_service_date: (v as any).next_service_date || "",
    last_inspection_date: (v as any).last_inspection_date || "",
    next_inspection_date: (v as any).next_inspection_date || "",
    mot_issued_date: (v as any).mot_issued_date || "",
    mot_expiry_date: (v as any).mot_expiry_date || "",
    loler_expiry_date: (v as any).loler_expiry_date || "",
    tacho_2yr_expiry_date: (v as any).tacho_2yr_expiry_date || "",
    tacho_6yr_expiry_date: (v as any).tacho_6yr_expiry_date || "",
    rfl_type: (v as any).rfl_type || "",
    rfl_expiry_date: (v as any).rfl_expiry_date || "",
    rfl_renewal_method: (v as any).rfl_renewal_method || "",
    rfl_renewal_term_months: (v as any).rfl_renewal_term_months != null ? String((v as any).rfl_renewal_term_months) : "",
    rfl_supplier: (v as any).rfl_supplier || "",
    odometer_start_distance: (v as any).odometer_start_distance != null ? String((v as any).odometer_start_distance) : "",
    last_known_distance: (v as any).last_known_distance != null ? String((v as any).last_known_distance) : "",
    last_known_distance_unit: (v as any).last_known_distance_unit || "",
    last_known_distance_recorded_at: (v as any).last_known_distance_recorded_at || "",
    distance_source: (v as any).distance_source || "",
    average_monthly_distance: (v as any).average_monthly_distance != null ? String((v as any).average_monthly_distance) : "",
    life_distance: (v as any).life_distance != null ? String((v as any).life_distance) : "",
    estimated_distance: (v as any).estimated_distance != null ? String((v as any).estimated_distance) : "",
  };
}

const BODY_TYPES_BY_ASSET: Record<string, string[]> = {
  Car: ["Saloon", "Hatchback", "Estate", "SUV", "Coupe", "Convertible", "MPV", "Pickup"],
  Van: ["Panel Van", "Crew Van", "Luton", "Dropside", "Tipper", "Box Van", "Refrigerated", "Curtainsider"],
  HGV: ["Rigid", "Tractor Unit", "Box", "Curtainsider", "Tipper", "Tanker", "Skeletal", "Refrigerated", "Flatbed"],
  Trailer: ["Curtainsider", "Box", "Flatbed", "Skeletal", "Tipper", "Tanker", "Refrigerated", "Low Loader"],
  Plant: ["Excavator", "Forklift", "Telehandler", "Dumper", "Roller", "Generator", "Compressor"],
  "Tail Lift": ["Column", "Cantilever", "Tuckaway", "Slider"],
  _default: ["Other"],
};

const WHEEL_PLANS_BY_ASSET: Record<string, string[]> = {
  Car: ["2-Axle Rigid Body (4x2)", "2-Axle Rigid Body (4x4)"],
  Van: ["2-Axle Rigid Body (4x2)", "2-Axle Rigid Body (4x2T) Twin Rear Wheels", "2-Axle Rigid Body (4x4)"],
  HGV: [
    "2-Axle Rigid (4x2)",
    "3-Axle Rigid (6x2)",
    "3-Axle Rigid (6x4)",
    "4-Axle Rigid (8x2)",
    "4-Axle Rigid (8x4)",
    "2-Axle Tractor (4x2)",
    "3-Axle Tractor (6x2)",
    "3-Axle Tractor (6x4)",
  ],
  Trailer: [
    "Single Axle",
    "Twin Axle",
    "Tri Axle",
    "Quad Axle",
  ],
};
const WHEEL_PLAN_ASSET_TYPES = new Set(["Car", "Van", "HGV", "Trailer"]);



type ColKey = "registration" | "fleet_number" | "asset_type" | "vehicle" | "year" | "mileage" | "mot_due" | "next_service" | "status";
const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: "registration", label: "Registration" },
  { key: "fleet_number", label: "Fleet No." },
  { key: "asset_type", label: "Asset Type" },
  { key: "vehicle", label: "Vehicle" },
  { key: "year", label: "Year" },
  { key: "mileage", label: "Mileage" },
  { key: "mot_due", label: "MOT Due" },
  { key: "next_service", label: "Next Service" },
  { key: "status", label: "Status" },
];
const DEFAULT_VISIBLE: ColKey[] = ["registration", "fleet_number", "asset_type", "vehicle", "mileage", "mot_due", "status"];
const DEFAULT_ORDER: ColKey[] = ALL_COLUMNS.map((c) => c.key);
const LOCKED_COLS: ColKey[] = ["registration"];

export default function CustomerVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const update = useUpdateVehicle();
  const createVehicle = useCreateVehicle();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ColKey>("registration");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_VISIBLE);
  const [columnOrder, setColumnOrder] = useState<ColKey[]>(DEFAULT_ORDER);
  const location = useLocation();
  useEffect(() => {
    setSelected(null);
    setCreating(false);
  }, [location.key]);
  const [form, setForm] = useState<EditableFields>(blank);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const { profile } = useAuth();

  const { data: recentNotes = [] } = useQuery({
    queryKey: ["vehicle-recent-maintenance-messages", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_status_history")
        .select("id, maintenance_message, changed_at")
        .eq("vehicle_id", selected!.id)
        .not("maintenance_message", "is", null)
        .neq("maintenance_message", "")
        .order("changed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
  const latestMessage = recentNotes[0]?.maintenance_message ?? "";

  const { data: latestOdoReading } = useQuery({
    queryKey: ["vehicle-latest-odo-reading", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odometer_readings")
        .select("reading, unit, recorded_at, source")
        .eq("vehicle_id", selected!.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });


  useEffect(() => {
    if (selected) setForm(toForm(selected));
    else if (creating) setForm(blank);
  }, [selected, creating]);

  const set = (k: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (creating) {
      if (!form.registration.trim() || !form.make.trim() || !form.model.trim()) {
        toast({ title: "Missing required fields", description: "Registration, Make and Model are required", variant: "destructive" });
        return;
      }
      try {
        const created = await createVehicle.mutateAsync({
          registration: form.registration.toUpperCase(),
          make: form.make,
          model: form.model,
          status: form.status || "on-road",
          vin: form.vin || null,
          fleet_number: form.fleet_number || null,
          asset_number: form.asset_number || null,
          asset_type: form.asset_type || null,
          body_type: form.body_type || null,
          wheel_plan: form.wheel_plan || null,
          derivative: form.derivative || null,
          year: form.year ? Number(form.year) : null,
          mot_due: form.mot_due || null,
          next_service: form.next_service || null,
          mileage: form.mileage ? Number(form.mileage) : null,
          registered_date: form.registered_date || null,
          date_in_service: form.date_in_service || null,
          last_service_date: form.last_service_date || null,
          next_service_date: form.next_service_date || null,
          last_inspection_date: form.last_inspection_date || null,
          next_inspection_date: form.next_inspection_date || null,
          mot_issued_date: form.mot_issued_date || null,
          mot_expiry_date: form.mot_expiry_date || null,
          loler_expiry_date: form.loler_expiry_date || null,
          tacho_2yr_expiry_date: form.tacho_2yr_expiry_date || null,
          tacho_6yr_expiry_date: form.tacho_6yr_expiry_date || null,
          rfl_type: form.rfl_type || null,
          rfl_expiry_date: form.rfl_expiry_date || null,
          rfl_renewal_method: form.rfl_renewal_method || null,
          rfl_renewal_term_months: form.rfl_renewal_term_months ? Number(form.rfl_renewal_term_months) : null,
          rfl_supplier: form.rfl_supplier || null,
          odometer_start_distance: form.odometer_start_distance ? Number(form.odometer_start_distance) : null,
          last_known_distance: form.last_known_distance ? Number(form.last_known_distance) : null,
          last_known_distance_unit: form.last_known_distance_unit || null,
          last_known_distance_recorded_at: form.last_known_distance ? new Date().toISOString() : null,
          distance_source: form.distance_source || null,
          average_monthly_distance: form.average_monthly_distance ? Number(form.average_monthly_distance) : null,
          life_distance: form.life_distance ? Number(form.life_distance) : null,
          estimated_distance: form.estimated_distance ? Number(form.estimated_distance) : null,
          fleet_manager_id: user?.id ?? null,
          fleet_id: profile?.fleet_id ?? null,
        } as any);
        toast({ title: "Asset created", description: created.registration });
        setCreating(false);
        setSelected(created as Vehicle);
      } catch (e: any) {
        toast({ title: "Create failed", description: e.message, variant: "destructive" });
      }
      return;
    }
    if (!selected) return;
    try {
      await update.mutateAsync({
        id: selected.id,
        status: form.status || null,
        vin: form.vin || null,
        registration: form.registration,
        fleet_number: form.fleet_number || null,
        asset_number: form.asset_number || null,
        asset_type: form.asset_type || null,
        body_type: form.body_type || null,
        wheel_plan: form.wheel_plan || null,
        make: form.make,
        model: form.model,
        derivative: form.derivative || null,
        year: form.year ? Number(form.year) : null,
        mot_due: form.mot_due || null,
        next_service: form.next_service || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        registered_date: form.registered_date || null,
        date_in_service: form.date_in_service || null,
        last_service_date: form.last_service_date || null,
        next_service_date: form.next_service_date || null,
        last_inspection_date: form.last_inspection_date || null,
        next_inspection_date: form.next_inspection_date || null,
        mot_issued_date: form.mot_issued_date || null,
        mot_expiry_date: form.mot_expiry_date || null,
        loler_expiry_date: form.loler_expiry_date || null,
        tacho_2yr_expiry_date: form.tacho_2yr_expiry_date || null,
        tacho_6yr_expiry_date: form.tacho_6yr_expiry_date || null,
        rfl_type: form.rfl_type || null,
        rfl_expiry_date: form.rfl_expiry_date || null,
        rfl_renewal_method: form.rfl_renewal_method || null,
        rfl_renewal_term_months: form.rfl_renewal_term_months ? Number(form.rfl_renewal_term_months) : null,
        rfl_supplier: form.rfl_supplier || null,
        odometer_start_distance: form.odometer_start_distance ? Number(form.odometer_start_distance) : null,
        last_known_distance: form.last_known_distance ? Number(form.last_known_distance) : null,
        last_known_distance_unit: form.last_known_distance_unit || null,
        last_known_distance_recorded_at: (() => {
          const prev = (selected as any).last_known_distance;
          const next = form.last_known_distance ? Number(form.last_known_distance) : null;
          if (next == null) return null;
          if (prev !== next) return new Date().toISOString();
          return (selected as any).last_known_distance_recorded_at || new Date().toISOString();
        })(),
        distance_source: form.distance_source || null,
        average_monthly_distance: form.average_monthly_distance ? Number(form.average_monthly_distance) : null,
        life_distance: form.life_distance ? Number(form.life_distance) : null,
        estimated_distance: form.estimated_distance ? Number(form.estimated_distance) : null,
      } as any);
      toast({ title: "Vehicle updated" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  if (selected || creating) {
    const labels: Record<keyof EditableFields, string> = {
      status: "Status",
      vin: form.asset_type === "Tail Lift" || form.asset_type === "Plant" ? "Serial number" : "VIN",
      registration: "Registration number",
      fleet_number: "Fleet number",
      asset_number: "Asset number",
      asset_type: "Asset type",
      body_type: "Body type",
      wheel_plan: "Wheel plan",
      make: "Make",
      model: "Model",
      derivative: "Derivative",
      year: "Year",
      mot_due: "MOT due",
      next_service: "Next service",
      mileage: "Mileage",
      registered_date: "Registered date",
      date_in_service: "Date in service",
      last_service_date: "Last service date",
      next_service_date: "Next service date",
      last_inspection_date: "Last inspection date",
      next_inspection_date: "Next inspection date",
      mot_issued_date: "MOT issued date",
      mot_expiry_date: "MOT expiry date",
      loler_expiry_date: "LOLER expiry date",
      tacho_2yr_expiry_date: "2yr Tacho expiry date",
      tacho_6yr_expiry_date: "6yr Tacho expiry date",
      rfl_type: "RFL type",
      rfl_expiry_date: "RFL expiry date",
      rfl_renewal_method: "Renewal method",
      rfl_renewal_term_months: "Renewal term (months)",
      rfl_supplier: "RFL supplier",
      odometer_start_distance: "Odometer start distance",
      last_known_distance: "Last known distance",
      last_known_distance_unit: "Unit",
      last_known_distance_recorded_at: "Reading taken",
      distance_source: "Source",
      average_monthly_distance: "Average monthly distance",
      life_distance: "Life distance",
      estimated_distance: "Estimated distance",
    };
    const rows: (keyof EditableFields)[][] = [
      ["status", "vin"],
      ["registration", "fleet_number", "asset_number"],
      ["asset_type", "body_type"],
      ["make", "model", "derivative"],
    ];




    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold">{creating ? "New Asset" : "Vehicle Details"}</h1>
                {!creating && selected && (
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    <UKNumberPlate registration={selected.registration} />
                    · {selected.make} {selected.model}
                  </p>
                )}
              </div>
            </div>
            {!creating && selected && <StatusBadge status={selected.status} />}
          </div>

          <Tabs defaultValue="info">
            <TabsList className="bg-transparent text-sidebar-foreground gap-2 h-auto">
              <TabsTrigger value="info" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Asset / Vehicle Details</TabsTrigger>
              <TabsTrigger value="defects" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Defect History</TabsTrigger>
              <TabsTrigger value="distance" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Distance</TabsTrigger>
              <TabsTrigger value="dates" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Key Dates</TabsTrigger>
              {WHEEL_PLAN_ASSET_TYPES.has(form.asset_type) && (
                <TabsTrigger value="tyres" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Tyres</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <CollapsibleCard title="Vehicle / Asset Details">
                <div className="space-y-5">
                  {rows.map((row, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                      {row.map((k) => (
                        <div key={k} className="space-y-1.5">
                          <Label htmlFor={k}>{labels[k]}</Label>
                          {k === "asset_type" ? (
                            <Select value={form.asset_type || ""} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v }))}>
                              <SelectTrigger id={k} className="bg-card"><SelectValue placeholder="Select asset type" /></SelectTrigger>
                              <SelectContent>
                                {["Car", "Van", "HGV", "Trailer", "Plant", "Tail Lift"].map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : k === "status" ? (
                            <div className="relative">
                              <Input id={k} value={form[k] === "off-road" ? "Off Road" : form[k] === "on-road" ? "On Road" : ""} readOnly onClick={() => setStatusDialogOpen(true)} className="bg-card pr-9 cursor-pointer" placeholder="Set status" />
                              <button
                                type="button"
                                onClick={() => setStatusDialogOpen(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                                aria-label="Edit status"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                          ) : k === "body_type" ? (
                            <Select value={form.body_type || ""} onValueChange={(v) => setForm((f) => ({ ...f, body_type: v }))}>
                              <SelectTrigger id={k} className="bg-card"><SelectValue placeholder={form.asset_type ? "Select body type" : "Select asset type first"} /></SelectTrigger>
                              <SelectContent>
                                {(BODY_TYPES_BY_ASSET[form.asset_type] || BODY_TYPES_BY_ASSET._default).map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : k === "wheel_plan" ? (
                            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 items-start">
                              <Select value={form.wheel_plan || ""} onValueChange={(v) => setForm((f) => ({ ...f, wheel_plan: v }))}>
                                <SelectTrigger id={k} className="bg-card"><SelectValue placeholder="Select wheel plan" /></SelectTrigger>
                                <SelectContent>
                                  {(WHEEL_PLANS_BY_ASSET[form.asset_type] || []).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.wheel_plan && (
                                <WheelPlanDiagram plan={form.wheel_plan} assetType={form.asset_type} />
                              )}
                            </div>
                          ) : (
                            <Input id={k} value={form[k]} onChange={set(k)} className="bg-card" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CollapsibleCard>

              <CompanyDetails vehicle={selected} />

              <CollapsibleCard title="Notes">
                <div className="space-y-1.5">
                  {selected ? (
                    <div className="relative rounded-md border bg-card">
                      <button
                        type="button"
                        onClick={() => setMsgDialogOpen(true)}
                        className="absolute right-2 top-2 p-1 rounded hover:bg-muted text-muted-foreground z-10"
                        aria-label="Edit notes"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {recentNotes.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setMsgDialogOpen(true)}
                          className="w-full text-left text-sm text-muted-foreground px-3 py-6"
                        >
                          No note recorded
                        </button>
                      ) : (
                        <ul className="divide-y">
                          {recentNotes.map((n: any) => (
                            <li
                              key={n.id}
                              onClick={() => setMsgDialogOpen(true)}
                              className="px-3 py-2 cursor-pointer hover:bg-muted/40"
                            >
                              <div className="text-xs text-muted-foreground">{formatDate(n.changed_at)}</div>
                              <div className="text-sm whitespace-pre-wrap break-words pr-8">{n.maintenance_message}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border bg-card px-3 py-6 text-sm text-muted-foreground">
                      Notes can be added once the asset is created.
                    </div>
                  )}
                </div>
              </CollapsibleCard>

            </TabsContent>

            <TabsContent value="dates" className="space-y-4">
              <CollapsibleCard title="Key Dates">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="registered_date">Registered date</Label>
                    <DatePicker id="registered_date" value={form.registered_date} onChange={(v) => setForm((f) => ({ ...f, registered_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date_in_service">Date in service</Label>
                    <DatePicker id="date_in_service" value={form.date_in_service} onChange={(v) => setForm((f) => ({ ...f, date_in_service: v }))} />
                  </div>
                </div>
              </CollapsibleCard>
              <CollapsibleCard title="SMR">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 [&>div:nth-child(3)]:sm:col-start-1 [&>div:nth-child(5)]:sm:col-start-1 [&>div:nth-child(7)]:sm:col-start-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="last_service_date">Last service date</Label>
                    <DatePicker id="last_service_date" value={form.last_service_date} onChange={(v) => setForm((f) => ({ ...f, last_service_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="next_service_date">Next service date</Label>
                    <DatePicker id="next_service_date" value={form.next_service_date} onChange={(v) => setForm((f) => ({ ...f, next_service_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_inspection_date">Last inspection date</Label>
                    <DatePicker id="last_inspection_date" value={form.last_inspection_date} onChange={(v) => setForm((f) => ({ ...f, last_inspection_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="next_inspection_date">Next inspection date</Label>
                    <DatePicker id="next_inspection_date" value={form.next_inspection_date} onChange={(v) => setForm((f) => ({ ...f, next_inspection_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mot_issued_date">MOT issued date</Label>
                    <DatePicker id="mot_issued_date" value={form.mot_issued_date} onChange={(v) => setForm((f) => ({ ...f, mot_issued_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mot_expiry_date">MOT expiry date</Label>
                    <DatePicker id="mot_expiry_date" value={form.mot_expiry_date} onChange={(v) => setForm((f) => ({ ...f, mot_expiry_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loler_expiry_date">LOLER expiry date</Label>
                    <DatePicker id="loler_expiry_date" value={form.loler_expiry_date} onChange={(v) => setForm((f) => ({ ...f, loler_expiry_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tacho_2yr_expiry_date">2yr Tacho expiry date</Label>
                    <DatePicker id="tacho_2yr_expiry_date" value={form.tacho_2yr_expiry_date} onChange={(v) => setForm((f) => ({ ...f, tacho_2yr_expiry_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tacho_6yr_expiry_date">6yr Tacho expiry date</Label>
                    <DatePicker id="tacho_6yr_expiry_date" value={form.tacho_6yr_expiry_date} onChange={(v) => setForm((f) => ({ ...f, tacho_6yr_expiry_date: v }))} />
                  </div>
                </div>
              </CollapsibleCard>
              <CollapsibleCard title="Road Fund Licence">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="rfl_type">RFL type</Label>
                    <Select value={form.rfl_type || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, rfl_type: v === "__none__" ? "" : v }))}>
                      <SelectTrigger id="rfl_type" className="bg-card"><SelectValue placeholder="Select RFL type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="PLG">PLG (Private Light Goods)</SelectItem>
                        <SelectItem value="PHGV">PHGV (Private HGV)</SelectItem>
                        <SelectItem value="HGV">HGV</SelectItem>
                        <SelectItem value="LGV">LGV</SelectItem>
                        <SelectItem value="PSV">PSV (Public Service Vehicle)</SelectItem>
                        <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="Agricultural">Agricultural</SelectItem>
                        <SelectItem value="Special Vehicle">Special Vehicle</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Historic">Historic</SelectItem>
                        <SelectItem value="Exempt">Exempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfl_expiry_date">RFL expiry date</Label>
                    <DatePicker id="rfl_expiry_date" value={form.rfl_expiry_date} onChange={(v) => setForm((f) => ({ ...f, rfl_expiry_date: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfl_renewal_method">Renewal method</Label>
                    <Select value={form.rfl_renewal_method || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, rfl_renewal_method: v === "__none__" ? "" : v }))}>
                      <SelectTrigger id="rfl_renewal_method" className="bg-card"><SelectValue placeholder="Select renewal method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto">Auto</SelectItem>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="DVLA Electronic">DVLA Electronic</SelectItem>
                        <SelectItem value="DVLA eRFL">DVLA eRFL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfl_renewal_term_months">Renewal term (months)</Label>
                    <Input
                      id="rfl_renewal_term_months"
                      type="text"
                      inputMode="numeric"
                      value={form.rfl_renewal_term_months}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setForm((f) => ({ ...f, rfl_renewal_term_months: v }));
                      }}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rfl_supplier">RFL supplier</Label>
                    <Select value={form.rfl_supplier || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, rfl_supplier: v === "__none__" ? "" : v }))}>
                      <SelectTrigger id="rfl_supplier" className="bg-card"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="DVLA">DVLA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleCard>
            </TabsContent>

            <TabsContent value="distance" className="space-y-4">
              <CollapsibleCard title="Odometer Details">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="odometer_start_distance">Odometer start distance</Label>
                    <Input
                      id="odometer_start_distance"
                      type="text"
                      inputMode="numeric"
                      value={form.odometer_start_distance}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setForm((f) => ({ ...f, odometer_start_distance: v }));
                      }}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_90px] gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="last_known_distance">Last known distance</Label>
                        <Input
                          id="last_known_distance"
                          type="text"
                          value={latestOdoReading?.reading != null ? String(latestOdoReading.reading) : ""}
                          readOnly
                          tabIndex={-1}
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="last_known_distance_unit">Unit</Label>
                        <Input
                          id="last_known_distance_unit"
                          type="text"
                          value={latestOdoReading?.unit ?? ""}
                          readOnly
                          tabIndex={-1}
                          className="bg-muted cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reading taken: {latestOdoReading?.recorded_at ? format(parseISO(latestOdoReading.recorded_at), "dd MMM yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="distance_source">Source</Label>
                    <Select
                      value={form.distance_source || "__none__"}
                      onValueChange={(v) => setForm((f) => ({ ...f, distance_source: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger id="distance_source" className="bg-card"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Telematics">Telematics</SelectItem>
                        <SelectItem value="Driver">Driver</SelectItem>
                        <SelectItem value="Supplier">Supplier</SelectItem>
                        <SelectItem value="MOT">MOT</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Estimated">Estimated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="average_monthly_distance">Average monthly distance</Label>
                    <Input
                      id="average_monthly_distance"
                      type="text"
                      inputMode="numeric"
                      value={form.average_monthly_distance}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setForm((f) => ({ ...f, average_monthly_distance: v }));
                      }}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="life_distance">Life distance</Label>
                    <Input
                      id="life_distance"
                      type="text"
                      inputMode="numeric"
                      value={form.life_distance}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setForm((f) => ({ ...f, life_distance: v }));
                      }}
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estimated_distance">Estimated distance</Label>
                    <Input
                      id="estimated_distance"
                      type="text"
                      inputMode="numeric"
                      value={form.estimated_distance}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) setForm((f) => ({ ...f, estimated_distance: v }));
                      }}
                      className="bg-card"
                    />
                  </div>
                </div>
              </CollapsibleCard>
              {selected ? (
                <CollapsibleCard title="Odometer Readings">
                  <OdometerReadingsHistory vehicleId={selected.id} />
                </CollapsibleCard>
              ) : (
                <CollapsibleCard title="Odometer Readings">
                  <div className="rounded-md border bg-card px-3 py-6 text-sm text-muted-foreground">
                    Readings can be recorded once the asset is created.
                  </div>
                </CollapsibleCard>
              )}
            </TabsContent>




            {WHEEL_PLAN_ASSET_TYPES.has(form.asset_type) && (
              <TabsContent value="tyres" className="space-y-4">
                <CollapsibleCard title="Wheel Plan">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 items-start">
                    <div className="space-y-1.5">
                      <Label htmlFor="wheel_plan">Wheel plan</Label>
                      <Select value={form.wheel_plan || ""} onValueChange={(v) => setForm((f) => ({ ...f, wheel_plan: v }))}>
                        <SelectTrigger id="wheel_plan" className="bg-card"><SelectValue placeholder="Select wheel plan" /></SelectTrigger>
                        <SelectContent>
                          {(WHEEL_PLANS_BY_ASSET[form.asset_type] || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.wheel_plan && (
                      <WheelPlanDiagram plan={form.wheel_plan} assetType={form.asset_type} />
                    )}
                  </div>
                </CollapsibleCard>

                {selected && form.wheel_plan && (
                  <div className="space-y-4">
                    <CollapsibleCard title="Tyre Details">
                      <TyreReadingsHistory
                        vehicleId={selected.id}
                        wheelPlan={form.wheel_plan}
                        assetType={form.asset_type}
                        section="details"
                      />
                    </CollapsibleCard>
                    <CollapsibleCard title="Tyre Readings">
                      <TyreReadingsHistory
                        vehicleId={selected.id}
                        wheelPlan={form.wheel_plan}
                        assetType={form.asset_type}
                        section="readings"
                      />
                    </CollapsibleCard>
                  </div>
                )}
              </TabsContent>
            )}


            <TabsContent value="defects">
              {selected ? (
                <DefectHistory vehicleId={selected.id} vehicleLabel={selected.registration || selected.fleet_number || undefined} />

              ) : (
                <CollapsibleCard title="Defect History">
                  <div className="rounded-md border bg-card px-3 py-6 text-sm text-muted-foreground">
                    Defects can be recorded once the asset is created.
                  </div>
                </CollapsibleCard>
              )}
            </TabsContent>
          </Tabs>


          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setSelected(null); setCreating(false); }} disabled={update.isPending || createVehicle.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={update.isPending || createVehicle.isPending}>
              {(update.isPending || createVehicle.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {creating ? "Create Asset" : "Save"}
            </Button>
          </div>
        </div>
        <VehicleStatusDialog
          vehicle={selected ?? ({ id: "", registration: form.registration, status: form.status } as any)}
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          onStatusChanged={(s) => setForm((f) => ({ ...f, status: s }))}
          draft={creating}
        />
        {selected && (
          <MaintenanceMessageDialog
            vehicleId={selected.id}
            vehicleStatus={selected.status}
            fleetId={(selected as any).fleet_id ?? null}
            changedBy={profile?.full_name || ""}
            open={msgDialogOpen}
            onOpenChange={setMsgDialogOpen}
            currentMessage={latestMessage}
            onCurrentMessageChange={() => {}}
          />
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assets / Vehicles</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} assigned to you</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No vehicles assigned to your account yet.</p>
            </CardContent>
          </Card>
) : (
          <VehiclesTable
            vehicles={vehicles}
            search={search}
            setSearch={setSearch}
            sortKey={sortKey}
            sortDir={sortDir}
            setSort={(k) => {
              if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
              else { setSortKey(k); setSortDir("asc"); }
            }}
            visibleCols={visibleCols}
            setVisibleCols={setVisibleCols}
            columnOrder={columnOrder}
            setColumnOrder={setColumnOrder}
            onRowClick={setSelected}
            onAdd={() => setCreating(true)}
          />
        )}
      </div>
    </AppLayout>
  );
}

function VehiclesTable({
  vehicles, search, setSearch, sortKey, sortDir, setSort, visibleCols, setVisibleCols, columnOrder, setColumnOrder, onRowClick, onAdd,
}: {
  vehicles: Vehicle[];
  search: string;
  setSearch: (s: string) => void;
  sortKey: ColKey;
  sortDir: "asc" | "desc";
  setSort: (k: ColKey) => void;
  visibleCols: ColKey[];
  setVisibleCols: (c: ColKey[]) => void;
  columnOrder: ColKey[];
  setColumnOrder: (c: ColKey[]) => void;
  onRowClick: (v: Vehicle) => void;
  onAdd: () => void;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    setRefreshing(false);
  };
  const isVisible = (k: ColKey) => visibleCols.includes(k);
  const orderedColumns = useMemo(
    () => columnOrder.map((k) => ALL_COLUMNS.find((c) => c.key === k)!).filter(Boolean),
    [columnOrder]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = vehicles;
    if (q) {
      list = list.filter((v) =>
        [v.registration, (v as any).fleet_number, (v as any).asset_type, (v as any).asset_number, v.make, v.model, (v as any).derivative, (v as any).body_type, v.vin, v.status]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    const sorted = [...list].sort((a, b) => {
      const va: any = sortKey === "vehicle" ? `${a.make} ${a.model}` : (a as any)[sortKey];
      const vb: any = sortKey === "vehicle" ? `${b.make} ${b.model}` : (b as any)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [vehicles, search, sortKey, sortDir]);

  const SortHeader = ({ k, children, className }: { k: ColKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => setSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-foreground" : "opacity-40"}`} />
      </button>
    </TableHead>
  );

  const renderCell = (k: ColKey, v: Vehicle) => {
    switch (k) {
      case "registration": return <TableCell key={k}><UKNumberPlate registration={v.registration} /></TableCell>;
      case "fleet_number": return <TableCell key={k}>{(v as any).fleet_number || "—"}</TableCell>;
      case "asset_type": return <TableCell key={k}>{(v as any).asset_type || "—"}</TableCell>;
      case "vehicle": return <TableCell key={k} className="font-medium">{v.make} {v.model}</TableCell>;
      case "year": return <TableCell key={k}>{v.year ?? "—"}</TableCell>;
      case "mileage": return <TableCell key={k} className="text-right tabular-nums">{v.mileage ? `${v.mileage.toLocaleString()} ${(v as any).last_known_distance_unit || "miles"}` : "—"}</TableCell>;
      case "mot_due": return <TableCell key={k}>{v.mot_due ? formatDate(v.mot_due) : "—"}</TableCell>;
      case "next_service": return <TableCell key={k}>{v.next_service ? formatDate(v.next_service) : "—"}</TableCell>;
      case "status": return <TableCell key={k}><StatusBadge status={v.status} /></TableCell>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh data
            </Button>
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Asset
            </Button>
            <ManageColumnsDialog
              visibleCols={visibleCols}
              columnOrder={columnOrder}
              onApply={(order, visible) => { setColumnOrder(order); setVisibleCols(visible); }}
            />
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {orderedColumns.filter((c) => isVisible(c.key)).map((c) => (
                  <SortHeader key={c.key} k={c.key} className={c.key === "mileage" ? "text-right" : ""}>
                    {c.label}
                  </SortHeader>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length} className="text-center text-sm text-muted-foreground py-10">
                    No vehicles match your search.
                  </TableCell>
                </TableRow>
              ) : filtered.map((v) => (
                <TableRow key={v.id} onClick={() => onRowClick(v)} className="cursor-pointer">
                  {orderedColumns.filter((c) => isVisible(c.key)).map((c) => renderCell(c.key, v))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
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
            const col = ALL_COLUMNS.find((c) => c.key === k)!;
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





type SortKey = "reported_at" | "severity" | "status" | "title" | "job";
type SortDir = "asc" | "desc";

const severityRank: Record<string, number> = { safety: 3, "non-safety": 2, advisory: 1 };
const statusRank: Record<string, number> = { open: 1, "in-progress": 2, rectified: 3, cancelled: 4 };

const severityVariant = (s: string) =>
  s === "safety" ? "destructive" : s === "non-safety" ? "default" : "secondary";

const statusVariant = (s: string) =>
  s === "open" ? "destructive" : s === "in-progress" ? "default" : "secondary";

type DefectColKey = "reported_at" | "title" | "severity" | "status" | "job" | "actions";
const DEFECT_COLUMNS: { key: DefectColKey; label: string }[] = [
  { key: "reported_at", label: "Reported" },
  { key: "title", label: "Defect" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "job", label: "Work Order" },
  { key: "actions", label: "Actions" },
];
const DEFECT_LOCKED: DefectColKey[] = ["reported_at", "title", "actions"];
const DEFECT_DEFAULT_ORDER: DefectColKey[] = ["reported_at", "title", "severity", "status", "job", "actions"];
const DEFECT_DEFAULT_VISIBLE: DefectColKey[] = ["reported_at", "title", "severity", "status", "job", "actions"];

function DefectHistory({ vehicleId, vehicleLabel }: { vehicleId: string; vehicleLabel?: string }) {
  const { data: defects = [], isLoading } = useVehicleDefects(vehicleId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<DefectStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("reported_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [editDefect, setEditDefect] = useState<VehicleDefect | null>(null);
  const [deleteDefect, setDeleteDefect] = useState<VehicleDefect | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCols, setVisibleCols] = useState<DefectColKey[]>(DEFECT_DEFAULT_VISIBLE);
  const [columnOrder, setColumnOrder] = useState<DefectColKey[]>(DEFECT_DEFAULT_ORDER);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_defects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle_defects", vehicleId] });
      toast({ title: "Defect deleted" });
      setDeleteDefect(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["vehicle_defects", vehicleId] });
    setRefreshing(false);
  };

  const rows = useMemo(() => {
    let list = [...defects];
    if (statusFilter !== "all") list = list.filter((d) => d.status === statusFilter);
    if (severityFilter !== "all") list = list.filter((d) => d.severity === severityFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) =>
        [d.title, d.description, d.severity, d.status, d.job?.job_number]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "reported_at") cmp = new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime();
      else if (sortKey === "severity") cmp = (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0);
      else if (sortKey === "status") cmp = (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
      else if (sortKey === "job") cmp = (a.job?.job_number ?? "").localeCompare(b.job?.job_number ?? "");
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [defects, statusFilter, severityFilter, sortKey, sortDir, search]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "reported_at" ? "desc" : "asc"); }
  };

  const isVisible = (k: DefectColKey) => visibleCols.includes(k);
  const orderedColumns = useMemo(
    () => columnOrder.map((k) => DEFECT_COLUMNS.find((c) => c.key === k)!).filter(Boolean),
    [columnOrder]
  );

  const SortHeader = ({ k, children }: { k: DefectColKey; children: React.ReactNode }) => (
    <TableHead>
      <button onClick={() => toggleSort(k as SortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-foreground" : "opacity-40"}`} />
      </button>
    </TableHead>
  );

  const renderCell = (k: DefectColKey, d: VehicleDefect) => {
    switch (k) {
      case "reported_at":
        return (
          <TableCell key={k} className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(d.reported_at)}
          </TableCell>
        );
      case "title":
        return (
          <TableCell key={k}>
            <div className="font-medium">{d.title}</div>
            {d.description && (
              <div className="text-xs text-muted-foreground line-clamp-1">{d.description}</div>
            )}
          </TableCell>
        );
      case "severity":
        return (
          <TableCell key={k}>
            <Badge variant={severityVariant(d.severity) as any} className="capitalize">{d.severity.replace("-", " ")}</Badge>
          </TableCell>
        );
      case "status":
        return (
          <TableCell key={k}>
            <Badge variant={statusVariant(d.status) as any} className="capitalize">{d.status.replace("-", " ")}</Badge>
          </TableCell>
        );
      case "job":
        return (
          <TableCell key={k}>
            {d.job ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${d.job!.id}`); }}
                className="text-primary hover:underline text-sm font-medium"
              >
                {d.job.job_number}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key={k} className="w-[100px]">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit defect"
                title="Edit"
                onClick={(e) => { e.stopPropagation(); setEditDefect(d); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete defect"
                title="Delete"
                className="text-destructive hover:bg-destructive hover:text-white"
                onClick={(e) => { e.stopPropagation(); setDeleteDefect(d); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        );
    }
  };

  return (
    <CollapsibleCard title="Defect History">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search defects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh data
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add defect
            </Button>
            <DefectColumnsDialog
              visibleCols={visibleCols}
              columnOrder={columnOrder}
              onApply={(order, visible) => { setColumnOrder(order); setVisibleCols(visible); }}
            />
          </div>
        </div>

        <AddDefectDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          vehicleId={vehicleId}
          vehicleLabel={vehicleLabel}
        />


        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                {orderedColumns.filter((c) => isVisible(c.key)).map((c) => (
                  <SortHeader key={c.key} k={c.key}>{c.label}</SortHeader>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="py-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground inline-block" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                    No defects match the current filters.
                  </TableCell>
                </TableRow>
              ) : rows.map((d) => {
                const hasDetails = !!(d.rectified_details && d.rectified_details.trim());
                const isOpen = expanded.has(d.id);
                return (
                  <Fragment key={d.id}>
                    <TableRow>
                      <TableCell className="w-[40px] p-0 text-center">
                        {hasDetails ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={isOpen ? "Hide rectification details" : "Show rectification details"}
                            title={isOpen ? "Hide rectification details" : "Show rectification details"}
                            onClick={(e) => { e.stopPropagation(); toggleExpand(d.id); }}
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        ) : null}
                      </TableCell>
                      {orderedColumns.filter((c) => isVisible(c.key)).map((c) => renderCell(c.key, d))}
                    </TableRow>
                    {isOpen && hasDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={visibleCols.length} className="py-3">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rectification details</div>
                            <div className="text-sm whitespace-pre-wrap">{d.rectified_details}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddDefectDialog
        open={!!editDefect}
        onOpenChange={(o) => { if (!o) setEditDefect(null); }}
        vehicleId={vehicleId}
        vehicleLabel={vehicleLabel}
        editDefect={editDefect}
      />


      <AlertDialog open={!!deleteDefect} onOpenChange={(o) => { if (!o) setDeleteDefect(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete defect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDefect?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteDefect && deleteMutation.mutate(deleteDefect.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CollapsibleCard>
  );
}


function DefectColumnsDialog({
  visibleCols, columnOrder, onApply,
}: {
  visibleCols: DefectColKey[];
  columnOrder: DefectColKey[];
  onApply: (order: DefectColKey[], visible: DefectColKey[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<DefectColKey[]>(columnOrder);
  const [draftVisible, setDraftVisible] = useState<DefectColKey[]>(visibleCols);
  const [dragKey, setDragKey] = useState<DefectColKey | null>(null);

  useEffect(() => {
    if (open) {
      setDraftOrder(columnOrder);
      setDraftVisible(visibleCols);
    }
  }, [open, columnOrder, visibleCols]);

  const toggle = (k: DefectColKey, checked: boolean) => {
    if (DEFECT_LOCKED.includes(k)) return;
    if (checked) setDraftVisible([...draftVisible, k]);
    else setDraftVisible(draftVisible.filter((c) => c !== k));
  };

  const handleDrop = (target: DefectColKey) => {
    if (!dragKey || dragKey === target) return;
    const next = draftOrder.filter((k) => k !== dragKey);
    const idx = next.indexOf(target);
    next.splice(idx, 0, dragKey);
    setDraftOrder(next);
    setDragKey(null);
  };

  const handleReset = () => {
    setDraftOrder(DEFECT_DEFAULT_ORDER);
    setDraftVisible(DEFECT_DEFAULT_VISIBLE);
  };

  const handleApply = () => {
    onApply(draftOrder, draftVisible);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
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
            const col = DEFECT_COLUMNS.find((c) => c.key === k)!;
            const locked = DEFECT_LOCKED.includes(k);
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


function SearchableSelect({
  value,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-card font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label || value || placeholder}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange?.(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.value ? "opacity-100" : "opacity-0"
                    )}
                  />
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

function CompanyDetails({ vehicle }: { vehicle?: Vehicle | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle_company_details", vehicle?.id ?? "new"],
    enabled: !!vehicle?.id,
    queryFn: async () => {
      const [customerRes, managerRes] = await Promise.all([
        vehicle?.customer_id
          ? supabase.from("customers").select("name").eq("id", vehicle.customer_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        vehicle?.fleet_manager_id
          ? supabase.from("profiles").select("full_name,email").eq("id", vehicle.fleet_manager_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      return {
        customer: (customerRes as any).data as { name?: string; depot?: string | null; home_dealer?: string | null } | null,
        manager: (managerRes as any).data as { full_name?: string; email?: string } | null,
      };
    },
  });

  const { data: customerOptions = [] } = useQuery({
    queryKey: ["company_details_customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,name").order("name");
      return (data || []).map((c: any) => ({ value: c.id as string, label: c.name as string }));
    },
  });

  const { data: managerOptions = [] } = useQuery({
    queryKey: ["company_details_fleet_managers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,email").order("full_name");
      return (data || []).map((p: any) => ({
        value: p.id as string,
        label: (p.full_name || p.email || "—") as string,
      }));
    },
  });

  const [customerId, setCustomerId] = useState<string>(vehicle?.customer_id || "");
  const [managerId, setManagerId] = useState<string>(vehicle?.fleet_manager_id || "");
  const [depot, setDepot] = useState<string>((data?.customer as any)?.depot || "");
  const [homeDealer, setHomeDealer] = useState<string>((data?.customer as any)?.home_dealer || "");
  const [allocatedDriver, setAllocatedDriver] = useState<string>("");

  useEffect(() => {
    setCustomerId(vehicle?.customer_id || "");
    setManagerId(vehicle?.fleet_manager_id || "");
  }, [vehicle?.customer_id, vehicle?.fleet_manager_id]);

  const currentCustomerLabel = data?.customer?.name || "";
  const customerOpts = customerOptions.length
    ? customerOptions
    : currentCustomerLabel
      ? [{ value: customerId, label: currentCustomerLabel }]
      : [];

  const currentManagerLabel = data?.manager?.full_name || data?.manager?.email || "";
  const managerOpts = managerId && !managerOptions.some((o) => o.value === managerId) && currentManagerLabel
    ? [{ value: managerId, label: currentManagerLabel }, ...managerOptions]
    : managerOptions;

  const depotOpts = depot ? [{ value: depot, label: depot }] : [];
  const homeDealerOpts = homeDealer ? [{ value: homeDealer, label: homeDealer }] : [];
  const allocatedDriverOpts = allocatedDriver ? [{ value: allocatedDriver, label: allocatedDriver }] : [];

  return (
    <CollapsibleCard title="Company Details">
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <SearchableSelect
              value={customerId}
              options={customerOpts}
              placeholder="—"
              searchPlaceholder="Search customers..."
              emptyText="No customers found."
              onChange={setCustomerId}
            />
            <div className="pl-4 border-l-2 border-border ml-2 mt-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Depot</Label>
              <SearchableSelect
                value={depot}
                options={depotOpts}
                placeholder="—"
                searchPlaceholder="Search depots..."
                emptyText="No depots found."
                onChange={setDepot}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fleet Manager</Label>
            <SearchableSelect
              value={managerId}
              options={managerOpts}
              placeholder="—"
              searchPlaceholder="Search fleet managers..."
              emptyText="No fleet managers found."
              onChange={setManagerId}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Allocated Driver</Label>
            <SearchableSelect
              value={allocatedDriver}
              options={allocatedDriverOpts}
              placeholder="—"
              searchPlaceholder="Search drivers..."
              emptyText="No drivers found."
              onChange={setAllocatedDriver}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Home Dealer</Label>
            <SearchableSelect
              value={homeDealer}
              options={homeDealerOpts}
              placeholder="—"
              searchPlaceholder="Search dealers..."
              emptyText="No dealers found."
              onChange={setHomeDealer}
            />
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}



function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={open}
        >
          <CardTitle className="text-base">{title}</CardTitle>
          <ChevronUp
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`}
          />
        </button>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}



