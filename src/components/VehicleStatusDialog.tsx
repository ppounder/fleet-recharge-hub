import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Vehicle } from "@/hooks/useVehicles";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { MaintenanceMessageDialog } from "@/components/MaintenanceMessageDialog";

function DateField({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
        className={cn("w-full justify-between font-normal", !date && "text-muted-foreground", disabled && "bg-muted")}
        >
          <span>{date ? format(date, "dd MMM yyyy") : "Pick a date"}</span>
          <CalendarIcon className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeField({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [h, m] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const setH = (nh: string) => onChange(`${nh}:${m || "00"}`);
  const setM = (nm: string) => onChange(`${h || "00"}:${nm}`);
  const handleType = (v: string) => {
    const cleaned = v.replace(/[^\d:]/g, "").slice(0, 5);
    onChange(cleaned);
  };
  const [open, setOpen] = useState(false);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const scroll = (container: HTMLDivElement | null, key: string) => {
      if (!container || !key) return;
      const el = container.querySelector<HTMLElement>(`[data-key="${key}"]`);
      if (el) container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    };
    requestAnimationFrame(() => {
      scroll(hourColRef.current, h || "00");
      scroll(minColRef.current, m || "00");
    });
  }, [open, h, m]);
  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleType(e.target.value)}
        placeholder="HH:MM"
        disabled={disabled}
        className={cn("pr-9", disabled && "bg-muted")}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open time picker"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <div className="flex gap-2">
            <div ref={hourColRef} className="h-48 w-16 overflow-y-auto rounded border">
              {hours.map((hh) => (
                <button key={hh} data-key={hh} type="button" onClick={() => setH(hh)} className={cn("w-full px-2 py-1 text-sm text-center hover:bg-accent", h === hh && "bg-primary text-primary-foreground hover:bg-primary")}>{hh}</button>
              ))}
            </div>
            <div ref={minColRef} className="h-48 w-16 overflow-y-auto rounded border">
              {minutes.map((mm) => (
                <button key={mm} data-key={mm} type="button" onClick={() => setM(mm)} className={cn("w-full px-2 py-1 text-sm text-center hover:bg-accent", m === mm && "bg-primary text-primary-foreground hover:bg-primary")}>{mm}</button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface Props {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChanged?: (status: string) => void;
}

const statusLabel = (s?: string | null) =>
  s === "off-road" ? "Current - Off Road" : "Current - On Road";

export function VehicleStatusDialog({ vehicle, open, onOpenChange, onStatusChanged }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [offRoad, setOffRoad] = useState(vehicle.status === "off-road");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [odo, setOdo] = useState("");
  const [changedBy, setChangedBy] = useState(profile?.full_name || "");
  const [message, setMessage] = useState("");
  const [sornReturned, setSornReturned] = useState(false);
  const [sornDate, setSornDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setOffRoad(vehicle.status === "off-road");
      setChangedBy(profile?.full_name || "");
    }
  }, [open, vehicle.status, profile?.full_name]);

  const { data: history = [] } = useQuery({
    queryKey: ["vehicle-status-history", vehicle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_status_history")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const newStatus = offRoad ? "off-road" : "on-road";
      const changedAt = new Date(`${date}T${time || "00:00"}:00`).toISOString();

      const { error: histErr } = await supabase.from("vehicle_status_history").insert({
        vehicle_id: vehicle.id,
        fleet_id: (vehicle as any).fleet_id ?? null,
        status: newStatus,
        reason: reason || null,
        location: location || null,
        changed_at: changedAt,
        odometer: odo ? Number(odo) : null,
        odometer_unit: "Miles",
        changed_by: changedBy || null,
        maintenance_message: message || null,
        sorn_returned: sornReturned,
        sorn_date: sornDate || null,
      });
      if (histErr) throw histErr;

      const { error: vErr } = await supabase
        .from("vehicles")
        .update({ status: newStatus })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle-status-history", vehicle.id] });
      onStatusChanged?.(newStatus);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const lockedClass = "bg-muted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Vehicle on/off road status</DialogTitle>
          <DialogDescription>
            Update the current on or off road status for this vehicle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <UKNumberPlate registration={vehicle.registration} />
          <span className="text-sm font-medium">{statusLabel(vehicle.status)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 flex-1 min-h-0">
          {/* Left column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div>
                <p className="text-sm font-medium">Asset off-road</p>
                <p className="text-xs text-muted-foreground">Mark this vehicle as off the road</p>
              </div>
              <Switch checked={offRoad} onCheckedChange={(v) => { setOffRoad(v); if (!v) { setSornReturned(false); setSornDate(""); } }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={setReason} disabled={!offRoad}>
                  <SelectTrigger id="reason" className={cn(!offRoad && lockedClass)}>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Accident", "Breakdown", "Service", "MOT", "Repair", "Awaiting parts", "Other"].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={setLocation} disabled={!offRoad}>
                  <SelectTrigger id="location" className={cn(!offRoad && lockedClass)}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Depot", "Workshop", "Customer site", "Roadside", "Third party garage", "Other"].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <DateField id="date" value={date} onChange={setDate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">Time</Label>
                <TimeField id="time" value={time} onChange={setTime} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="odo">ODO reading (Miles)</Label>
                <Input id="odo" value={odo} onChange={(e) => setOdo(e.target.value.replace(/[^\d.]/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="changed-by">Changed by</Label>
                <Input id="changed-by" value={changedBy} onChange={(e) => setChangedBy(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg">Maintenance message</Label>
              <button
                id="msg"
                type="button"
                onClick={() => setMsgDialogOpen(true)}
                className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
              >
                {message ? (
                  <span className="whitespace-pre-wrap">{message}</span>
                ) : (
                  <span className="text-muted-foreground">Click to add or manage maintenance messages...</span>
                )}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-3 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0 rounded-lg border overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">Status history</div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status amended to</TableHead>
                      <TableHead>Status amended date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground">No history yet</TableCell></TableRow>
                    ) : history.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>{statusLabel(h.status)}</TableCell>
                        <TableCell>{new Date(h.changed_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className={cn("flex items-center justify-between rounded-lg border p-2.5", !offRoad && "opacity-60")}>
              <div>
                <p className="text-sm font-medium">DVLA SORN returned</p>
                <p className="text-xs text-muted-foreground">
                  {offRoad ? "Mark when SORN has been returned to DVLA" : "Available when the asset is off-road"}
                </p>
              </div>
              <Switch checked={sornReturned} onCheckedChange={setSornReturned} disabled={!offRoad} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sorn-date">Date SORN to DVLA</Label>
              <DateField id="sorn-date" value={sornDate} onChange={setSornDate} disabled={!offRoad || !sornReturned} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
