import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Vehicle } from "@/hooks/useVehicles";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";

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
          className={cn("w-full justify-start font-normal", !date && "text-muted-foreground", disabled && "bg-muted")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : "Pick a date"}
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
                <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} readOnly={!offRoad} className={cn(!offRoad && lockedClass)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} readOnly={!offRoad} className={cn(!offRoad && lockedClass)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <DateField id="date" value={date} onChange={setDate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
              <Textarea id="msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
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
              <Input id="sorn-date" type="date" value={sornDate} onChange={(e) => setSornDate(e.target.value)} readOnly={!offRoad || !sornReturned} className={cn((!offRoad || !sornReturned) && lockedClass)} />
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
