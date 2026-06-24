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
import { Plus, Trash2, Camera, X, Upload, Undo2, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type Severity = "safety" | "non-safety" | "advisory";

type DamageMark = { x: number; y: number };

type Defect = {
  id: string;
  type: string;
  description: string;
  severity: Severity;
  rectified: boolean;
  rectifiedDetails?: string;
  photos: string[];
  damageMarks?: DamageMark[];
};

const PRESETS = ["Bulb out", "Damage", "Leaking", "Worn", "Cracked", "Missing", "Other"];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function blank(): Defect {
  return { id: uid(), type: "", description: "", severity: "non-safety", rectified: false, rectifiedDetails: "", photos: [] };
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
  const [defects, setDefects] = useState<Defect[]>([blank()]);
  const [warn, setWarn] = useState("");

  useEffect(() => {
    if (open) {
      setDefects([blank()]);
      setWarn("");
    }
  }, [open]);

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle_defects", vehicleId] });
      toast({ title: "Defect reported" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleSave() {
    if (validDefects.length === 0) {
      setWarn("Add at least one defect with a type.");
      return;
    }
    setWarn("");
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add defect</DialogTitle>
          <DialogDescription>
            {vehicleLabel ? `For ${vehicleLabel}` : "Record one or more defects for this asset."}
          </DialogDescription>
        </DialogHeader>

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
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
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
  const [cameraOpen, setCameraOpen] = useState(false);
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
        {defect.type === "Damage" && (
          <DamageDiagram
            marks={defect.damageMarks ?? []}
            onChange={(marks) => onChange({ ...defect, damageMarks: marks })}
          />
        )}
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
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={(dataUrl) => {
            if (defect.photos.length >= MAX_PHOTOS) return;
            onChange({ ...defect, photos: [...defect.photos, dataUrl] });
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={!canAddPhoto} onClick={() => {
            const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
            const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            if (hasMedia && !isMobile) {
              setCameraOpen(true);
            } else {
              cameraInputRef.current?.click();
            }
          }}>
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

function DamageDiagram({
  marks,
  onChange,
}: {
  marks: DamageMark[];
  onChange: (marks: DamageMark[]) => void;
}) {
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange([...marks, { x, y }]);
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Damage location
        </Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={marks.length === 0}
            onClick={() => onChange(marks.slice(0, -1))}
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={marks.length === 0}
            onClick={() => onChange([])}
          >
            <Trash className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Tap the diagram to mark damaged area</p>
      <div className="mt-3 rounded-md bg-muted/40 p-3">
        <svg
          viewBox="0 0 100 180"
          onClick={handleClick}
          className="mx-auto block h-72 w-auto cursor-crosshair"
          aria-label="Vehicle damage diagram"
        >
          {/* Mirrors */}
          <rect x="14" y="22" width="6" height="10" rx="1" fill="hsl(var(--foreground))" opacity="0.7" />
          <rect x="80" y="22" width="6" height="10" rx="1" fill="hsl(var(--foreground))" opacity="0.7" />
          {/* Cab */}
          <rect x="28" y="10" width="44" height="34" rx="6" fill="hsl(var(--foreground))" />
          {/* Body */}
          <rect x="22" y="48" width="56" height="118" rx="8" fill="hsl(var(--foreground))" />
          {/* Wheels */}
          <rect x="14" y="58" width="8" height="16" rx="1.5" fill="hsl(var(--foreground))" opacity="0.7" />
          <rect x="78" y="58" width="8" height="16" rx="1.5" fill="hsl(var(--foreground))" opacity="0.7" />
          <rect x="14" y="142" width="8" height="16" rx="1.5" fill="hsl(var(--foreground))" opacity="0.7" />
          <rect x="78" y="142" width="8" height="16" rx="1.5" fill="hsl(var(--foreground))" opacity="0.7" />
          {/* Marks */}
          {marks.map((m, i) => (
            <g key={i}>
              <circle cx={m.x} cy={m.y} r="3.5" fill="hsl(var(--destructive))" stroke="white" strokeWidth="1" />
              <text x={m.x} y={m.y + 1.4} fontSize="4" textAnchor="middle" fill="white" fontWeight="bold">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    setReady(false);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e: any) {
        setError(e?.message || "Unable to access camera. Please allow camera permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Take photo</DialogTitle>
          <DialogDescription>Position the subject and capture an image.</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        ) : (
          <div className="overflow-hidden rounded-md bg-black">
            <video ref={videoRef} playsInline muted className="h-auto w-full" />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={capture} disabled={!ready || !!error} className="gap-2">
            <Camera className="h-4 w-4" /> Capture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

