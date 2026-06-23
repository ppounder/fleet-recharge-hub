import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Vehicle } from "@/hooks/useVehicles";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vehicle on/off road status</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 pb-2">
          <UKNumberPlate registration={vehicle.registration} />
          <span className="text-base font-semibold">{statusLabel(vehicle.status)}</span>
        </div>

        <section className="space-y-3 border-t pt-3">
          <h3 className="text-sm font-semibold">Status update</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="off-road" checked={offRoad} onCheckedChange={(v) => setOffRoad(!!v)} />
              <Label htmlFor="off-road">Asset off-road</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} readOnly={!offRoad} className={!offRoad ? "bg-muted" : undefined} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} readOnly={!offRoad} className={!offRoad ? "bg-muted" : undefined} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="odo">Vehicle ODO reading</Label>
              <div className="flex gap-2">
                <Input id="odo" value={odo} onChange={(e) => setOdo(e.target.value.replace(/[^\d.]/g, ""))} />
                <span className="self-center text-sm text-muted-foreground">Miles</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="changed-by">Changed by</Label>
              <Input id="changed-by" value={changedBy} onChange={(e) => setChangedBy(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="msg">Maintenance message</Label>
              <Textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="bg-yellow-50" />
            </div>
          </div>
        </section>

        <section className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-semibold">Status history</h3>
          <div className="max-h-48 overflow-y-auto border rounded">
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
        </section>

        <section className="space-y-3 border-t pt-3">
          <h3 className="text-sm font-semibold">DVLA SORN</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="sorn" checked={sornReturned} onCheckedChange={(v) => setSornReturned(!!v)} />
              <Label htmlFor="sorn">SORN returned</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sorn-date">Date SORN to DVLA</Label>
              <Input id="sorn-date" type="date" value={sornDate} onChange={(e) => setSornDate(e.target.value)} />
            </div>
          </div>
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
