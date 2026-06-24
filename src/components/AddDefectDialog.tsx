import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Camera, X, Check, AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type Severity = "safety" | "non-safety" | "advisory";
type Step = "details" | "mileage" | "overview" | "signoff" | "done";

type Defect = {
  id: string;
  type: string;
  description: string;
  severity: Severity;
  rectified: boolean;
  photos: string[];
};

const PRESETS = ["Bulb out", "Damage", "Leaking", "Worn", "Cracked", "Missing", "Other"];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function blank(): Defect {
  return { id: uid(), type: "", description: "", severity: "non-safety", rectified: false, photos: [] };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleLabel?: string;
}

export function AddDefectDialog({ open, onOpenChange, vehicleId, vehicleLabel }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("details");
  const [defects, setDefects] = useState<Defect[]>([blank()]);
  const [mileage, setMileage] = useState("");
  const [unit, setUnit] = useState<"miles" | "km" | "hours">("miles");
  const [notes, setNotes] = useState("");
  const [roadworthy, setRoadworthy] = useState<"roadworthy" | "unroadworthy">("roadworthy");
  const [confirmed, setConfirmed] = useState(false);
  const [warn, setWarn] = useState("");

  useEffect(() => {
    if (open) {
      setStep("details");
      setDefects([blank()]);
      setMileage("");
      setUnit("miles");
      setNotes("");
      setRoadworthy("roadworthy");
      setConfirmed(false);
      setWarn("");
    }
  }, [open]);

  useEffect(() => {
    const safetyUn = defects.some((d) => d.type && d.severity === "safety" && !d.rectified);
    setRoadworthy(safetyUn ? "unroadworthy" : "roadworthy");
  }, [defects]);

  const validDefects = defects.filter((d) => d.type.trim());

  const save = useMutation({
    mutationFn: async () => {
      const reportedBy = profile?.full_name || user?.email || null;
      const rows = validDefects
        .filter((d) => !d.rectified)
        .map((d) => ({
          vehicle_id: vehicleId,
          title: d.type,
          description: d.description || null,
          severity: d.severity,
          status: "open",
          reported_by: reportedBy,
          reported_at: new Date().toISOString(),
        }));
      if (rows.length > 0) {
        const { error } = await supabase.from("vehicle_defects" as any).insert(rows);
        if (error) throw error;
      }
      if (mileage) {
        const { error } = await supabase.from("odometer_readings" as any).insert({
          vehicle_id: vehicleId,
          source: "Driver report",
          reading: Number(mileage),
          unit,
          recorded_at: new Date().toISOString(),
          fleet_id: profile?.fleet_id ?? null,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle_defects", vehicleId] });
      qc.invalidateQueries({ queryKey: ["odometer_readings", vehicleId] });
      qc.invalidateQueries({ queryKey: ["vehicle-latest-odo-reading", vehicleId] });
      toast({ title: "Defect reported" });
      setStep("done");
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function finish() {
    if (!confirmed) {
      setWarn("Please confirm the report is accurate.");
      return;
    }
    setWarn("");
    save.mutate();
  }

  function continueFromDetails() {
    if (validDefects.length === 0) {
      setWarn("Add at least one defect with a type.");
      return;
    }
    setWarn("");
    setStep("mileage");
  }

  function continueFromMileage() {
    if (mileage && !/^\d+$/.test(mileage)) {
      setWarn("Mileage must be a whole number.");
      return;
    }
    setWarn("");
    setStep("overview");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a defect</DialogTitle>
          <DialogDescription>
            {vehicleLabel ? `For ${vehicleLabel}` : "Record one or more defects for this asset."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            {defects.map((d, i) => (
              <DefectCard
                key={d.id}
                defect={d}
                index={i}
                canDelete={defects.length > 1}
                onChange={(nd) => setDefects(defects.map((x) => (x.id === d.id ? nd : x)))}
                onDelete={() => setDefects(defects.filter((x) => x.id !== d.id))}
              />
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={() => setDefects([...defects, blank()])}>
              <Plus className="h-4 w-4" /> Add another defect
            </Button>
            {warn && <Alert variant="destructive"><AlertDescription>{warn}</AlertDescription></Alert>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="flex-1" onClick={continueFromDetails}>Continue</Button>
            </div>
          </div>
        )}

        {step === "mileage" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-base font-semibold">Current mileage</h2>
              <p className="mt-1 text-xs text-muted-foreground">Optional — leave blank to skip.</p>
              <Input
                type="text"
                inputMode="numeric"
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
                className="mt-3 h-14 text-center text-2xl font-bold tabular-nums"
                placeholder="0"
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["miles", "km", "hours"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`h-10 rounded-md border text-sm font-medium uppercase transition-colors ${unit === u ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              {warn && <Alert variant="destructive" className="mt-3"><AlertDescription>{warn}</AlertDescription></Alert>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>Back</Button>
              <Button className="flex-1" onClick={continueFromMileage}>Continue</Button>
            </div>
          </div>
        )}

        {step === "overview" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mileage</h3>
              <p className="mt-1 text-lg font-bold">
                {mileage ? `${Number(mileage).toLocaleString()} ${unit}` : "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" rows={3} placeholder="Optional notes…" />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Defects ({validDefects.length})</h3>
              <div className="mt-2 space-y-2">
                {validDefects.map((d) => (
                  <div key={d.id} className="rounded-md border bg-background p-3">
                    <div className="text-sm font-medium">{d.type}</div>
                    {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                    <div className="mt-1 flex gap-1 text-[10px]">
                      <span className={`rounded px-1.5 py-0.5 font-medium capitalize ${d.severity === "safety" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {d.severity.replace("-", " ")}
                      </span>
                      {d.rectified && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">Rectified</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("mileage")}>Back</Button>
              <Button className="flex-1" onClick={() => setStep("signoff")}>Continue to signoff</Button>
            </div>
          </div>
        )}

        {step === "signoff" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle status</h3>
              <RadioGroup value={roadworthy} onValueChange={(v) => setRoadworthy(v as any)} className="mt-3 grid grid-cols-2 gap-2">
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 ${roadworthy === "roadworthy" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="roadworthy" className="sr-only" />
                  <Check className="h-6 w-6 text-primary" />
                  <div className="text-sm font-semibold">Roadworthy</div>
                </label>
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 ${roadworthy === "unroadworthy" ? "border-destructive bg-destructive/10" : "border-border"}`}>
                  <RadioGroupItem value="unroadworthy" className="sr-only" />
                  <X className="h-6 w-6 text-destructive" />
                  <div className="text-sm font-semibold">Un-Roadworthy</div>
                </label>
              </RadioGroup>
            </div>
            <label className="flex items-start gap-2 rounded-lg border bg-card p-4 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} className="mt-0.5" />
              <span>I confirm the information above is accurate and complete.</span>
            </label>
            {warn && <Alert variant="destructive"><AlertDescription>{warn}</AlertDescription></Alert>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("overview")} disabled={save.isPending}>Back</Button>
              <Button className="flex-1" onClick={finish} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Sign off"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${roadworthy === "roadworthy" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
              {roadworthy === "roadworthy" ? <CheckCircle2 className="h-12 w-12" /> : <AlertTriangle className="h-12 w-12" />}
            </div>
            <h2 className="mt-4 text-2xl font-bold">Defect reported</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sent to the workshop. Track status in the Defect History.</p>
            <Button className="mt-6 w-full max-w-xs" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DefectCard({
  defect,
  index,
  canDelete,
  onChange,
  onDelete,
}: {
  defect: Defect;
  index: number;
  canDelete: boolean;
  onChange: (d: Defect) => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 5;
  const canAddPhoto = defect.photos.length < MAX_PHOTOS;

  function handlePhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (defect.photos.length >= MAX_PHOTOS) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...defect, photos: [...defect.photos, reader.result as string] });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Defect {index + 1}</div>
        {canDelete && (
          <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label>Type</Label>
          <Select value={PRESETS.includes(defect.type) ? defect.type : ""} onValueChange={(v) => onChange({ ...defect, type: v })}>
            <SelectTrigger className="mt-1.5 w-full bg-card">
              <SelectValue placeholder="Select defect type…" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="mt-2"
            value={defect.type}
            onChange={(e) => onChange({ ...defect, type: e.target.value })}
            placeholder="Or type defect…"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={defect.description} onChange={(e) => onChange({ ...defect, description: e.target.value })} />
        </div>
        <div>
          <Label>Severity</Label>
          <RadioGroup
            value={defect.severity}
            onValueChange={(v) => onChange({ ...defect, severity: v as Severity })}
            className="mt-1.5 flex gap-2"
          >
            <label className="flex flex-1 items-center gap-2 rounded-md border bg-card p-2 text-sm cursor-pointer">
              <RadioGroupItem value="safety" /> Safety
            </label>
            <label className="flex flex-1 items-center gap-2 rounded-md border bg-card p-2 text-sm cursor-pointer">
              <RadioGroupItem value="non-safety" /> Non-safety
            </label>
            <label className="flex flex-1 items-center gap-2 rounded-md border bg-card p-2 text-sm cursor-pointer">
              <RadioGroupItem value="advisory" /> Advisory
            </label>
          </RadioGroup>
        </div>
        <label className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm cursor-pointer">
          <Checkbox checked={defect.rectified} onCheckedChange={(v) => onChange({ ...defect, rectified: !!v })} />
          Self-rectified
        </label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => { handlePhoto(e.target.files); e.currentTarget.value = ""; }}
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={(e) => { handlePhoto(e.target.files); e.currentTarget.value = ""; }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={!canAddPhoto} onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4" /> Take photo
          </Button>
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={!canAddPhoto} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose file
          </Button>
        </div>
        {!canAddPhoto && <p className="text-xs text-muted-foreground">Maximum {MAX_PHOTOS} photos reached.</p>}
        {defect.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-1.5 -m-1.5">
            {defect.photos.map((p, i) => (
              <div key={i} className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                <div className="h-full w-full overflow-hidden rounded-md">
                  <img src={p} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...defect, photos: defect.photos.filter((_, j) => j !== i) })}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
