import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useBays, useTechnicians, useUpsertAppointment, useDeleteAppointment, Appointment } from "@/hooks/useDiary";
import { useCustomers } from "@/hooks/useCustomers";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes } from "date-fns";
import { Trash2 } from "lucide-react";
import { VehicleCombobox } from "./VehicleCombobox";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStart?: Date;
  initialBayId?: string | null;
  initialTechnicianId?: string | null;
  editing?: Appointment | null;
}

const NONE = "__none__";

function toTimeInput(d: Date) { return format(d, "HH:mm"); }

export function NewAppointmentDialog({ open, onOpenChange, initialStart, initialBayId, initialTechnicianId, editing }: Props) {
  const { data: bays = [] } = useBays();
  const { data: techs = [] } = useTechnicians();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const upsert = useUpsertAppointment();
  const del = useDeleteAppointment();
  const { toast } = useToast();

  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [bayId, setBayId] = useState<string>(NONE);
  const [techId, setTechId] = useState<string>(NONE);
  const [customerId, setCustomerId] = useState<string>(NONE);
  const [vehicleId, setVehicleId] = useState<string>(NONE);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sendReminder, setSendReminder] = useState(false);
  const [reminderPhone, setReminderPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.starts_at);
      const e = new Date(editing.ends_at);
      setDate(format(s, "yyyy-MM-dd"));
      setStartTime(toTimeInput(s));
      setEndTime(toTimeInput(e));
      setAllDay(editing.all_day);
      setBayId(editing.bay_id ?? NONE);
      setTechId(editing.technician_id ?? NONE);
      setCustomerId(editing.customer_id ?? NONE);
      setVehicleId(editing.vehicle_id ?? NONE);
      setTitle(editing.title ?? "");
      setDetails(editing.details ?? "");
      setSendReminder(editing.send_reminder);
      setReminderPhone(editing.reminder_phone ?? "");
    } else {
      const s = initialStart ?? new Date();
      setDate(format(s, "yyyy-MM-dd"));
      setStartTime(toTimeInput(s));
      setEndTime(toTimeInput(addMinutes(s, 60)));
      setAllDay(false);
      setBayId(initialBayId ?? NONE);
      setTechId(initialTechnicianId ?? NONE);
      setCustomerId(NONE);
      setVehicleId(NONE);
      setTitle("");
      setDetails("");
      setSendReminder(false);
      setReminderPhone("");
    }
    setErrors({});
  }, [open, editing, initialStart, initialBayId, initialTechnicianId]);

  const filteredVehicles = customerId !== NONE ? vehicles.filter(v => v.customer_id === customerId) : vehicles;

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Required";
    if (!allDay && (!startTime || !endTime)) e.time = "Required";
    if (!allDay && startTime >= endTime) e.time = "End must be after start";
    if (sendReminder && !reminderPhone) e.phone = "Required for reminders";
    setErrors(e);
    if (Object.keys(e).length) return;

    const ymd = date;
    const starts = allDay ? new Date(`${ymd}T00:00:00`) : new Date(`${ymd}T${startTime}:00`);
    const ends = allDay ? new Date(`${ymd}T23:59:59`) : new Date(`${ymd}T${endTime}:00`);

    try {
      await upsert.mutateAsync({
        id: editing?.id,
        bay_id: bayId === NONE ? null : bayId,
        technician_id: techId === NONE ? null : techId,
        customer_id: customerId === NONE ? null : customerId,
        vehicle_id: vehicleId === NONE ? null : vehicleId,
        title: title || null,
        details: details || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        all_day: allDay,
        send_reminder: sendReminder,
        reminder_phone: sendReminder ? reminderPhone : null,
      });
      toast({ title: editing ? "Appointment updated" : "Appointment created" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await del.mutateAsync(editing.id);
      toast({ title: "Appointment deleted" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit appointment" : "New appointment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} />
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="allday" checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
            <Label htmlFor="allday">All day</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              {errors.time && <p className="text-sm text-destructive col-span-2">{errors.time}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bay</Label>
              <Select value={bayId} onValueChange={setBayId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {bays.filter(b => b.active).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Technician</Label>
              <Select value={techId} onValueChange={setTechId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {techs.filter(t => t.active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setVehicleId(NONE); }}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {filteredVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration ?? v.fleet_number ?? v.id.slice(0,8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual service" />
          </div>

          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="reminder" checked={sendReminder} onCheckedChange={(v) => setSendReminder(!!v)} />
              <Label htmlFor="reminder">Send SMS reminder</Label>
            </div>
            {sendReminder && (
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input value={reminderPhone} onChange={(e) => setReminderPhone(e.target.value)} placeholder="+44..." />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div>
            {editing && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
