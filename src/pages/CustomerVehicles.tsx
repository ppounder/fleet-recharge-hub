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
import { useVehicles, useUpdateVehicle, Vehicle } from "@/hooks/useVehicles";
import { useVehicleDefects, VehicleDefect, DefectStatus } from "@/hooks/useVehicleDefects";
import { ArrowLeft, ArrowUpDown, Car, ChevronUp, Loader2 } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type EditableFields = {
  status: string;
  vin: string;
  registration: string;
  fleet_number: string;
  asset_number: string;
  asset_type: string;
  body_type: string;
  make: string;
  model: string;
  derivative: string;
};

const blank: EditableFields = {
  status: "",
  vin: "",
  registration: "",
  fleet_number: "",
  asset_number: "",
  asset_type: "",
  body_type: "",
  make: "",
  model: "",
  derivative: "",
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
    make: v.make || "",
    model: v.model || "",
    derivative: (v as any).derivative || "",
  };
}


export default function CustomerVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const update = useUpdateVehicle();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<EditableFields>(blank);

  useEffect(() => {
    if (selected) setForm(toForm(selected));
  }, [selected]);

  const set = (k: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
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
        make: form.make,
        model: form.model,
        derivative: form.derivative || null,
      } as any);
      toast({ title: "Vehicle updated" });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  if (selected) {
    const labels: Record<keyof EditableFields, string> = {
      status: "Status",
      vin: "VIN",
      registration: "Registration number",
      fleet_number: "Fleet number",
      asset_number: "Asset number",
      asset_type: "Asset type",
      body_type: "Body type",
      make: "Make",
      model: "Model",
      derivative: "Derivative",
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
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Vehicle Details</h1>
                <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                  <UKNumberPlate registration={selected.registration} />
                  · {selected.make} {selected.model}
                </p>
              </div>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <Tabs defaultValue="info">
            <TabsList className="bg-sidebar text-sidebar-foreground">
              <TabsTrigger value="info" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Vehicle Information</TabsTrigger>
              <TabsTrigger value="dates" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Key Dates</TabsTrigger>
              <TabsTrigger value="defects" className="bg-card text-sidebar data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Defect History</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <CollapsibleCard title="Vehicle Information">
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
            </TabsContent>

            <TabsContent value="dates">
              <CollapsibleCard title="Key Dates">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" value={selected.year ?? ""} readOnly className="bg-card" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mot_due">MOT due</Label>
                    <Input id="mot_due" type="date" value={selected.mot_due ?? ""} readOnly className="bg-card" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="next_service">Next service</Label>
                    <Input id="next_service" type="date" value={selected.next_service ?? ""} readOnly className="bg-card" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage" value={selected.mileage ? `${selected.mileage.toLocaleString()} mi` : ""} readOnly className="bg-card" />
                  </div>
                </div>
              </CollapsibleCard>
            </TabsContent>

            <TabsContent value="defects">
              <DefectHistory vehicleId={selected.id} />
            </TabsContent>
          </Tabs>


          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={update.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Vehicles</h1>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <Card
                key={v.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelected(v)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base"><UKNumberPlate registration={v.registration} /></CardTitle>
                    <StatusBadge status={v.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium">{v.make} {v.model} {v.year && `(${v.year})`}</p>
                  {v.mileage && <p className="text-muted-foreground">{v.mileage.toLocaleString()} miles</p>}
                  {v.mot_due && <p className="text-muted-foreground">MOT Due: {formatDate(v.mot_due)}</p>}
                  {v.next_service && <p className="text-muted-foreground">Next Service: {formatDate(v.next_service)}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

type SortKey = "reported_at" | "severity" | "status" | "title";
type SortDir = "asc" | "desc";

const severityRank: Record<string, number> = { safety: 3, "non-safety": 2, advisory: 1 };
const statusRank: Record<string, number> = { open: 1, "in-progress": 2, resolved: 3, cancelled: 4 };

const severityVariant = (s: string) =>
  s === "safety" ? "destructive" : s === "non-safety" ? "default" : "secondary";

const statusVariant = (s: string) =>
  s === "open" ? "destructive" : s === "in-progress" ? "default" : "secondary";

function DefectHistory({ vehicleId }: { vehicleId: string }) {
  const { data: defects = [], isLoading } = useVehicleDefects(vehicleId);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<DefectStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("reported_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    let list = [...defects];
    if (statusFilter !== "all") list = list.filter((d) => d.status === statusFilter);
    if (severityFilter !== "all") list = list.filter((d) => d.severity === severityFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "reported_at") cmp = new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime();
      else if (sortKey === "severity") cmp = (severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0);
      else if (sortKey === "status") cmp = (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [defects, statusFilter, severityFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "reported_at" ? "desc" : "asc"); }
  };

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-foreground" : "opacity-40"}`} />
    </button>
  );

  return (
    <CollapsibleCard title="Defect History">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="defect-status">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger id="defect-status" className="bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defect-severity">Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger id="defect-severity" className="bg-card"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="non-safety">Non-safety</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No defects match the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortBtn k="reported_at">Reported</SortBtn></TableHead>
                <TableHead><SortBtn k="title">Defect</SortBtn></TableHead>
                <TableHead><SortBtn k="severity">Severity</SortBtn></TableHead>
                <TableHead><SortBtn k="status">Status</SortBtn></TableHead>
                <TableHead>Work Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(d.reported_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{d.title}</div>
                    {d.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{d.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant(d.severity) as any} className="capitalize">{d.severity.replace("-", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status) as any} className="capitalize">{d.status.replace("-", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    {d.job ? (
                      <button
                        onClick={() => navigate(`/jobs/${d.job!.id}`)}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        {d.job.job_number}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </CollapsibleCard>
  );
}

function CompanyDetails({ vehicle }: { vehicle: Vehicle }) {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle_company_details", vehicle.id],
    queryFn: async () => {
      const [customerRes, managerRes] = await Promise.all([
        vehicle.customer_id
          ? supabase.from("customers").select("name").eq("id", vehicle.customer_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        vehicle.fleet_manager_id
          ? supabase.from("profiles").select("full_name,email").eq("id", vehicle.fleet_manager_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      return {
        customer: (customerRes as any).data as { name?: string; depot?: string | null; home_dealer?: string | null } | null,
        manager: (managerRes as any).data as { full_name?: string; email?: string } | null,
      };
    },
  });

  const rows: { label: string; value: string }[] = [
    { label: "Customer", value: data?.customer?.name || "—" },
    { label: "Depot", value: (data?.customer as any)?.depot || "—" },
    { label: "Fleet Manager", value: data?.manager?.full_name || data?.manager?.email || "—" },
    { label: "Home Dealer", value: (data?.customer as any)?.home_dealer || "—" },
  ];

  return (
    <CollapsibleCard title="Company Details">
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {rows.map((r) => (
            <div key={r.label} className="space-y-1.5">
              <Label>{r.label}</Label>
              <Input value={r.value} readOnly className="bg-card" />
            </div>
          ))}
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



