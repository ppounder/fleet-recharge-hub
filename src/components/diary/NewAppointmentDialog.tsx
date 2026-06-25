import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { useBays, useTechnicians, useUpsertAppointment, useDeleteAppointment, Appointment } from "@/hooks/useDiary";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes } from "date-fns";
import { Trash2 } from "lucide-react";
import { CustomerPicker, VehiclePicker } from "./CustomerVehiclePickers";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStart?: Date;
  initialBayId?: string | null;
  initialTechnicianId?: string | null;
  editing?: Appointment | null;
}

const NONE = "__none__";
const toTimeInput = (d: Date) => format(d, "HH:mm");

export function NewAppointmentDialog({ open, onOpenChange, initialStart, initialBayId, initialTechnicianId, editing }: Props) {
  const { data: bays = [] } = useBays();
  const { data: techs = [] } = useTechnicians();
  const upsert = useUpsertAppointment();
  const del = useDeleteAppointment();
  const { toast } = useToast();

  const [date, setDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [multipleDays, setMultipleDays] = useState(false);
  const [bayId, setBayId] = useState<string>(NONE);
  const [techId, setTechId] = useState<string>(NONE);
  const [statusVal, setStatusVal] = useState<string>("scheduled");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sendReminder, setSendReminder] = useState(false);
  const [reminderWhen, setReminderWhen] = useState("1d");
  const [reminderText, setReminderText] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.starts_at);
      const e = new Date(editing.ends_at);
      const sameDay = format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd");
      setDate(format(s, "yyyy-MM-dd"));
      setEndDate(format(e, "yyyy-MM-dd"));
      setMultipleDays(!sameDay);
      setStartTime(toTimeInput(s));
      setEndTime(toTimeInput(e));
      setAllDay(editing.all_day);
      setBayId(editing.bay_id ?? NONE);
      setTechId(editing.technician_id ?? NONE);
      setStatusVal(editing.status ?? "scheduled");
      setCustomerId(editing.customer_id);
      setVehicleId(editing.vehicle_id);
      setDetails(editing.details ?? "");
      setSendReminder(editing.send_reminder);
    } else {
      const s = initialStart ?? new Date();
      setDate(format(s, "yyyy-MM-dd"));
      setEndDate(format(s, "yyyy-MM-dd"));
      setMultipleDays(false);
      setStartTime(toTimeInput(s));
      setEndTime(toTimeInput(addMinutes(s, 60)));
      setAllDay(false);
      setBayId(initialBayId ?? NONE);
      setTechId(initialTechnicianId ?? NONE);
      setStatusVal("scheduled");
      setCustomerId(null);
      setVehicleId(null);
      setDetails("");
      setSendReminder(false);
    }
    setReminderWhen("1d");
    setReminderText(false);
    setReminderEmail(false);
    setErrors({});
  }, [open, editing, initialStart, initialBayId, initialTechnicianId]);

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Required";
    if (multipleDays && !endDate) e.endDate = "Required";
    if (!allDay && (!startTime || !endTime)) e.time = "Required";
    if (!allDay && !multipleDays && startTime >= endTime) e.time = "End must be after start";
    setErrors(e);
    if (Object.keys(e).length) return;

    const endYmd = multipleDays ? endDate : date;
    const starts = allDay ? new Date(`${date}T00:00:00`) : new Date(`${date}T${startTime}:00`);
    const ends = allDay ? new Date(`${endYmd}T23:59:59`) : new Date(`${endYmd}T${endTime}:00`);

    try {
      await upsert.mutateAsync({
        id: editing?.id,
        bay_id: bayId === NONE ? null : bayId,
        technician_id: techId === NONE ? null : techId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        title: null,
        details: details || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        all_day: allDay,
        send_reminder: sendReminder,
        reminder_phone: null,
        status: statusVal,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">{editing ? "Edit Appointment" : "New Appointment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer / Vehicle */}
          <div className="rounded-md border bg-muted/40 p-4 grid grid-cols-2 gap-6">
            <CustomerPicker value={customerId} onChange={(id) => { setCustomerId(id); if (!id) setVehicleId(null); }} />
            <VehiclePicker
              value={vehicleId}
              onChange={setVehicleId}
              customerId={customerId}
              onCustomerChange={setCustomerId}
            />
          </div>

          {/* Date / In / Out / Bay */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker value={date} onChange={setDate} />
              {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>In</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} />
            </div>
            <div className="space-y-1.5">
              <Label>Out</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} />
            </div>
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
            {errors.time && <p className="text-sm text-destructive col-span-4">{errors.time}</p>}
          </div>

          {multipleDays && (
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>End date</Label>
                <DatePicker value={endDate} onChange={setEndDate} />
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="allday" checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
              <Label htmlFor="allday" className="font-normal">All Day</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="multi" checked={multipleDays} onCheckedChange={(v) => setMultipleDays(!!v)} />
              <Label htmlFor="multi" className="font-normal">Multiple Days</Label>
            </div>
          </div>

          {/* Send Reminder */}
          <div className="space-y-2">
            <Label className={!sendReminder ? "text-muted-foreground" : ""}>Send Reminder</Label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox id="rem" checked={sendReminder} onCheckedChange={(v) => setSendReminder(!!v)} />
                <Select value={reminderWhen} onValueChange={setReminderWhen} disabled={!sendReminder}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour Before</SelectItem>
                    <SelectItem value="3h">3 Hours Before</SelectItem>
                    <SelectItem value="1d">1 Day Before</SelectItem>
                    <SelectItem value="2d">2 Days Before</SelectItem>
                    <SelectItem value="1w">1 Week Before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="rtext" checked={reminderText} onCheckedChange={(v) => setReminderText(!!v)} disabled={!sendReminder} />
                <Label htmlFor="rtext" className="font-normal">Text</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remail" checked={reminderEmail} onCheckedChange={(v) => setReminderEmail(!!v)} disabled={!sendReminder} />
                <Label htmlFor="remail" className="font-normal">Email</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Technician / Status */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
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
