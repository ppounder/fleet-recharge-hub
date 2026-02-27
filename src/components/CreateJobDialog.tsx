import { useState, useCallback } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, PlusCircle } from "lucide-react";

interface WorkLine {
  id: string;
  jobType: string;
  type: "labour" | "parts" | "sundries";
  description: string;
  quantity: number;
  unitPrice: number;
  rechargeable: boolean;
  rechargeReason: string;
}

const emptyWorkLine = (): WorkLine => ({
  id: crypto.randomUUID(),
  jobType: "maintenance",
  type: "labour",
  description: "",
  quantity: 1,
  unitPrice: 0,
  rechargeable: false,
  rechargeReason: "",
});

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleMakeModel, setVehicleMakeModel] = useState("");
  const [providerId, setProviderId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [workLines, setWorkLines] = useState<WorkLine[]>([emptyWorkLine()]);
  const createJob = useCreateJob();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: serviceProviders, isLoading: loadingProviders } = useServiceProviders();

  const addWorkLine = () => setWorkLines((prev) => [...prev, emptyWorkLine()]);

  const removeWorkLine = (id: string) =>
    setWorkLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));

  const updateWorkLine = useCallback(
    (id: string, field: keyof WorkLine, value: any) => {
      setWorkLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      );
    },
    []
  );

  const lineTotal = (line: WorkLine) => line.quantity * line.unitPrice;
  const grandTotal = workLines.reduce((sum, l) => sum + lineTotal(l), 0);

  const resetForm = () => {
    setVehicleReg("");
    setVehicleMakeModel("");
    setProviderId("");
    setPriority("normal");
    setDescription("");
    setWorkLines([emptyWorkLine()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg.trim()) return;

    const jobNumber = `J-${Date.now().toString().slice(-4)}`;

    try {
      const jobData = await createJob.mutateAsync({
        job_number: jobNumber,
        vehicle_reg: vehicleReg.toUpperCase(),
        vehicle_make_model: vehicleMakeModel || null,
        type: workLines[0]?.jobType || "maintenance",
        priority,
        description: description || null,
        fleet_manager_id: user?.id ?? null,
        provider_id: providerId || null,
        status: "booked",
        estimate_total: grandTotal,
      });

      const validLines = workLines.filter((l) => l.description.trim());
      if (validLines.length > 0) {
        const items = validLines.map((l) => ({
          job_id: jobData.id,
          type: l.type,
          description: `[${l.jobType.toUpperCase()}] ${l.description}`,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          total: l.quantity * l.unitPrice,
          rechargeable: l.rechargeable,
          recharge_reason: l.rechargeReason || null,
        }));
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle Reg *</Label>
                  <Input value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="AB21 XYZ" required />
                </div>
                <div className="space-y-2">
                  <Label>Make / Model</Label>
                  <Input value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} placeholder="BMW 3 Series" />
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
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the overall job..." rows={2} />
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
                {workLines.map((line, idx) => (
                  <Card key={line.id} className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">
                          Line {idx + 1} · <span className="capitalize">{line.jobType}</span>
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
                      <div className="grid grid-cols-[1fr_130px_120px_80px_90px_90px] gap-3 items-end">
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
                          <Label className="text-xs">Job Type</Label>
                          <Select
                            value={line.jobType}
                            onValueChange={(v) => updateWorkLine(line.id, "jobType", v)}
                          >
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="repair">Repair</SelectItem>
                              <SelectItem value="mot">MOT</SelectItem>
                              <SelectItem value="tyres">Tyres</SelectItem>
                              <SelectItem value="bodywork">Bodywork</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Line Type</Label>
                          <Select
                            value={line.type}
                            onValueChange={(v) => updateWorkLine(line.id, "type", v)}
                          >
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labour">Labour</SelectItem>
                              <SelectItem value="parts">Parts</SelectItem>
                              <SelectItem value="sundries">Sundries</SelectItem>
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
                          <Label className="text-xs">Total</Label>
                          <div className="flex items-center h-10 px-3 rounded-md bg-muted text-sm font-medium">
                            £{lineTotal(line).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
                <span className="text-sm font-semibold">Estimated Total</span>
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
