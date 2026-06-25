import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus, Wrench, Users, Clock, CalendarPlus } from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, format, isSameDay, isSameMonth, eachDayOfInterval,
  setHours, setMinutes, differenceInMinutes, parseISO,
} from "date-fns";
import { useAppointments, useBays, useTechnicians, useShopHours, useUpsertAppointment, Appointment } from "@/hooks/useDiary";
import { useCustomers } from "@/hooks/useCustomers";
import { useVehicles } from "@/hooks/useVehicles";
import { NewAppointmentDialog } from "@/components/diary/NewAppointmentDialog";
import { ShopBaysDialog } from "@/components/diary/ShopBaysDialog";
import { ShopHoursDialog } from "@/components/diary/ShopHoursDialog";
import { TechniciansDialog } from "@/components/diary/TechniciansDialog";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";
type ResourceMode = "bay" | "technician";

const HOUR_PX = 56;

export default function Diary() {
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(new Date());
  const [resourceMode, setResourceMode] = useState<ResourceMode>("bay");
  const [apptOpen, setApptOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [initialStart, setInitialStart] = useState<Date | undefined>();
  const [initialBay, setInitialBay] = useState<string | null>(null);
  const [initialTech, setInitialTech] = useState<string | null>(null);
  const [baysOpen, setBaysOpen] = useState(false);
  const [techsOpen, setTechsOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return { start: startOfDay(cursor), end: endOfDay(cursor) };
    if (view === "week") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
    return { start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) };
  }, [view, cursor]);

  const { data: appointments = [] } = useAppointments(range.start, addDays(range.end, 1));
  const { data: bays = [] } = useBays();
  const { data: techs = [] } = useTechnicians();
  const { data: hours = [] } = useShopHours();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();

  const customerById = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setCursor(new Date());
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addWeeks(cursor, dir));
    else setCursor(addMonths(cursor, dir));
  };

  const title = view === "day"
    ? format(cursor, "EEEE, dd MMM yyyy")
    : view === "week"
      ? `${format(range.start, "dd MMM")} – ${format(range.end, "dd MMM yyyy")}`
      : format(cursor, "MMMM yyyy");

  const openNew = (start?: Date, bayId?: string | null, techId?: string | null) => {
    setEditing(null);
    setInitialStart(start);
    setInitialBay(bayId ?? null);
    setInitialTech(techId ?? null);
    setApptOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setApptOpen(true);
  };

  const apptLabel = (a: Appointment) => {
    const cust = a.customer_id ? customerById[a.customer_id]?.name : null;
    const veh = a.vehicle_id ? (vehicleById[a.vehicle_id]?.registration || vehicleById[a.vehicle_id]?.fleet_number) : null;
    if (veh && cust) return `${veh} · ${cust}`;
    if (veh) return veh;
    if (cust) return cust;
    return a.title || a.details || "Appointment";
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Diary</h1>
            <p className="text-sm text-muted-foreground">Workshop appointments &amp; bay scheduling</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBaysOpen(true)}><Wrench className="h-4 w-4 mr-1" />Bays</Button>
            <Button variant="outline" size="sm" onClick={() => setTechsOpen(true)}><Users className="h-4 w-4 mr-1" />Technicians</Button>
            <Button variant="outline" size="sm" onClick={() => setHoursOpen(true)}><Clock className="h-4 w-4 mr-1" />Opening hours</Button>
            <Button size="sm" onClick={() => openNew(cursor)}><Plus className="h-4 w-4 mr-1" />New appointment</Button>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => navigate(0)}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <div className="text-base font-medium ml-2">{title}</div>
            </div>
            <div className="flex items-center gap-3">
              {view === "day" && (
                <ToggleGroup type="single" value={resourceMode} onValueChange={(v) => v && setResourceMode(v as ResourceMode)} size="sm">
                  <ToggleGroupItem value="bay">By bay</ToggleGroupItem>
                  <ToggleGroupItem value="technician">By technician</ToggleGroupItem>
                </ToggleGroup>
              )}
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {view === "day" && (
            <DayView
              date={cursor}
              hours={hours}
              resourceMode={resourceMode}
              bays={bays.filter(b => b.active)}
              technicians={techs.filter(t => t.active)}
              appointments={appointments}
              onSlotClick={openNew}
              onAppointmentClick={openEdit}
              labelFor={apptLabel}
            />
          )}
          {view === "week" && (
            <WeekView
              start={range.start}
              hours={hours}
              appointments={appointments}
              onSlotClick={openNew}
              onAppointmentClick={openEdit}
              labelFor={apptLabel}
            />
          )}
          {view === "month" && (
            <MonthView
              cursor={cursor}
              range={range}
              appointments={appointments}
              onDayClick={(d) => { setCursor(d); setView("day"); }}
              onAppointmentClick={openEdit}
              labelFor={apptLabel}
            />
          )}
        </Card>
      </div>

      <NewAppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        initialStart={initialStart}
        initialBayId={initialBay}
        initialTechnicianId={initialTech}
        editing={editing}
      />
      <ShopBaysDialog open={baysOpen} onOpenChange={setBaysOpen} />
      <TechniciansDialog open={techsOpen} onOpenChange={setTechsOpen} />
      <ShopHoursDialog open={hoursOpen} onOpenChange={setHoursOpen} />
    </AppLayout>
  );
}

// ---------- Day View ----------
function DayView({
  date, hours, resourceMode, bays, technicians, appointments, onSlotClick, onAppointmentClick, labelFor,
}: any) {
  const dow = date.getDay();
  const dayHours = hours.find((h: any) => h.day_of_week === dow);
  const openHour = dayHours?.is_open ? parseInt((dayHours.open_time || "07:30").substring(0, 2)) : 7;
  const closeHour = dayHours?.is_open ? Math.max(openHour + 1, parseInt((dayHours.close_time || "17:30").substring(0, 2)) + 1) : 19;
  const hoursList = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);

  const resources = resourceMode === "bay" ? bays : technicians;
  const resourceKey = resourceMode === "bay" ? "bay_id" : "technician_id";
  const apptsForResource = (rid: string) => appointments.filter((a: Appointment) =>
    a[resourceKey as keyof Appointment] === rid && isSameDay(parseISO(a.starts_at), date)
  );

  const unassigned = appointments.filter((a: Appointment) =>
    !a[resourceKey as keyof Appointment] && isSameDay(parseISO(a.starts_at), date)
  );

  const totalMinutes = (closeHour - openHour) * 60;
  const gridHeight = (closeHour - openHour) * HOUR_PX;

  const positionStyle = (a: Appointment) => {
    const s = parseISO(a.starts_at);
    const e = parseISO(a.ends_at);
    const startM = (s.getHours() - openHour) * 60 + s.getMinutes();
    const lenM = Math.max(20, differenceInMinutes(e, s));
    return {
      top: `${(startM / totalMinutes) * gridHeight}px`,
      height: `${(lenM / totalMinutes) * gridHeight}px`,
    };
  };

  const handleDrop = (e: React.DragEvent, resourceId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("appointment-id");
    const appt = appointments.find((a: Appointment) => a.id === id);
    if (!appt) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = Math.round((offsetY / gridHeight) * totalMinutes / 15) * 15;
    const newStart = setMinutes(setHours(date, openHour), minutes);
    const dur = differenceInMinutes(parseISO(appt.ends_at), parseISO(appt.starts_at));
    upsertMove(appt, newStart, dur, { [resourceKey]: resourceId });
  };

  const upsert = useUpsertAppointment();
  const upsertMove = (a: Appointment, newStart: Date, durationM: number, extra: any) => {
    upsert.mutate({
      id: a.id,
      starts_at: newStart.toISOString(),
      ends_at: new Date(newStart.getTime() + durationM * 60000).toISOString(),
      ...extra,
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${resources.length + 1}, minmax(180px, 1fr))` }}>
          <div />
          <div className="px-2 py-2 text-sm font-medium border-b text-center text-muted-foreground">Unassigned</div>
          {resources.map((r: any) => (
            <div key={r.id} className="px-2 py-2 text-sm font-medium border-b text-center" style={{ borderTop: `3px solid ${r.color}` }}>
              {resourceMode === "bay" ? r.name : `${r.first_name} ${r.last_name}`}
            </div>
          ))}
        </div>

        <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${resources.length + 1}, minmax(180px, 1fr))` }}>
          <div>
            {hoursList.map(h => (
              <div key={h} className="text-xs text-muted-foreground text-right pr-2 border-t" style={{ height: HOUR_PX }}>
                {format(setHours(new Date(), h), "h a")}
              </div>
            ))}
          </div>
          <div
            className="relative border-l bg-muted/30"
            style={{ height: gridHeight }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, null)}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const minutes = Math.round(((e.clientY - rect.top) / gridHeight) * totalMinutes / 30) * 30;
              const start = setMinutes(setHours(date, openHour), minutes);
              onSlotClick(start, null, null);
            }}
          >
            {hoursList.map(h => <div key={h} className="border-t" style={{ height: HOUR_PX }} />)}
            {unassigned.map((a: Appointment) => (
              <ApptBlock key={a.id} a={a} color="#94a3b8" style={positionStyle(a)} onClick={() => onAppointmentClick(a)} label={labelFor(a)} />
            ))}
          </div>
          {resources.map((r: any) => (
            <div
              key={r.id}
              className="relative border-l"
              style={{ height: gridHeight }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, r.id)}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const minutes = Math.round(((e.clientY - rect.top) / gridHeight) * totalMinutes / 30) * 30;
                const start = setMinutes(setHours(date, openHour), minutes);
                onSlotClick(start, resourceMode === "bay" ? r.id : null, resourceMode === "technician" ? r.id : null);
              }}
            >
              {hoursList.map(h => <div key={h} className="border-t" style={{ height: HOUR_PX }} />)}
              {/* lunch overlay */}
              {dayHours?.lunch_enabled && dayHours.lunch_start && dayHours.lunch_end && (
                <LunchOverlay openHour={openHour} totalMinutes={totalMinutes} gridHeight={gridHeight} start={dayHours.lunch_start} end={dayHours.lunch_end} />
              )}
              {apptsForResource(r.id).map((a: Appointment) => (
                <ApptBlock key={a.id} a={a} color={r.color} style={positionStyle(a)} onClick={() => onAppointmentClick(a)} label={labelFor(a)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LunchOverlay({ openHour, totalMinutes, gridHeight, start, end }: any) {
  const s = parseInt(start.substring(0,2)) * 60 + parseInt(start.substring(3,5)) - openHour * 60;
  const e = parseInt(end.substring(0,2)) * 60 + parseInt(end.substring(3,5)) - openHour * 60;
  return (
    <div className="absolute left-0 right-0 bg-muted/60 border-y border-dashed pointer-events-none flex items-center justify-center text-xs text-muted-foreground"
      style={{ top: (s/totalMinutes)*gridHeight, height: ((e-s)/totalMinutes)*gridHeight }}>
      Lunch
    </div>
  );
}

function ApptBlock({ a, color, style, onClick, label }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("appointment-id", a.id); e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="absolute left-1 right-1 rounded-md px-2 py-1 text-xs text-white shadow cursor-pointer overflow-hidden hover:brightness-110"
          style={{ ...style, background: color }}
        >
          <div className="font-medium truncate">{label}</div>
          <div className="opacity-90 truncate">{format(parseISO(a.starts_at), "HH:mm")} – {format(parseISO(a.ends_at), "HH:mm")}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div className="font-medium">{label}</div>
          <div>{format(parseISO(a.starts_at), "EEE dd MMM, HH:mm")} – {format(parseISO(a.ends_at), "HH:mm")}</div>
          {a.details && <div className="text-muted-foreground">{a.details}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Week View ----------
function WeekView({ start, hours, appointments, onSlotClick, onAppointmentClick, labelFor }: any) {
  const days = eachDayOfInterval({ start, end: addDays(start, 6) });
  const openHour = 7, closeHour = 19;
  const hoursList = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);
  const totalMinutes = (closeHour - openHour) * 60;
  const gridHeight = (closeHour - openHour) * HOUR_PX;

  const apptsForDay = (d: Date) => appointments.filter((a: Appointment) => isSameDay(parseISO(a.starts_at), d));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className={cn("px-2 py-2 text-sm font-medium border-b text-center", isSameDay(d, new Date()) && "bg-primary/10")}>
              <div>{format(d, "EEE")}</div>
              <div className="text-lg">{format(d, "dd")}</div>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
          <div>{hoursList.map(h => <div key={h} className="text-xs text-muted-foreground text-right pr-2 border-t" style={{ height: HOUR_PX }}>{format(setHours(new Date(), h), "h a")}</div>)}</div>
          {days.map(d => (
            <div key={d.toISOString()} className="relative border-l" style={{ height: gridHeight }}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const minutes = Math.round(((e.clientY - rect.top) / gridHeight) * totalMinutes / 30) * 30;
                onSlotClick(setMinutes(setHours(d, openHour), minutes));
              }}>
              {hoursList.map(h => <div key={h} className="border-t" style={{ height: HOUR_PX }} />)}
              {apptsForDay(d).map((a: Appointment) => {
                const s = parseISO(a.starts_at), e = parseISO(a.ends_at);
                const startM = (s.getHours() - openHour) * 60 + s.getMinutes();
                const lenM = Math.max(20, differenceInMinutes(e, s));
                return (
                  <ApptBlock key={a.id} a={a} color="hsl(var(--primary))" label={labelFor(a)}
                    style={{ top: (startM/totalMinutes)*gridHeight, height: (lenM/totalMinutes)*gridHeight }}
                    onClick={() => onAppointmentClick(a)} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Month View ----------
function MonthView({ cursor, range, appointments, onDayClick, onAppointmentClick, labelFor }: any) {
  const days = eachDayOfInterval(range);
  const apptsForDay = (d: Date) => appointments.filter((a: Appointment) => isSameDay(parseISO(a.starts_at), d));

  return (
    <div>
      <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="px-2 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 border-l border-t">
        {days.map(d => {
          const inMonth = isSameMonth(d, cursor);
          const list = apptsForDay(d);
          return (
            <div key={d.toISOString()} className={cn("min-h-[100px] border-b border-r p-1 cursor-pointer hover:bg-muted/40", !inMonth && "bg-muted/20 text-muted-foreground", isSameDay(d, new Date()) && "bg-primary/10")}
              onClick={() => onDayClick(d)}>
              <div className="text-xs font-medium">{format(d, "d")}</div>
              <div className="space-y-0.5 mt-1">
                {list.slice(0, 3).map((a: Appointment) => (
                  <div key={a.id} className="text-[10px] bg-primary/80 text-primary-foreground rounded px-1 truncate cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onAppointmentClick(a); }}>
                    {format(parseISO(a.starts_at), "HH:mm")} {labelFor(a)}
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-muted-foreground">+{list.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
