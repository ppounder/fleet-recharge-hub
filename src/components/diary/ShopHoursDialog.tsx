import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useShopHours, useUpsertShopHour } from "@/hooks/useDiary";
import { toast } from "sonner";

// Ordered Mon-Sun; value = day_of_week (0=Sun..6=Sat)
const DAYS: { label: string; dow: number }[] = [
  { label: "Monday", dow: 1 },
  { label: "Tuesday", dow: 2 },
  { label: "Wednesday", dow: 3 },
  { label: "Thursday", dow: 4 },
  { label: "Friday", dow: 5 },
  { label: "Saturday", dow: 6 },
  { label: "Sunday", dow: 0 },
];

type Row = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  lunch_enabled: boolean;
  lunch_start: string;
  lunch_end: string;
};

const defaultRow = (dow: number): Row => ({
  day_of_week: dow,
  is_open: false,
  open_time: "07:30",
  close_time: "17:30",
  lunch_enabled: false,
  lunch_start: "12:00",
  lunch_end: "13:00",
});

const trimTime = (t: string | null | undefined) => (t ? t.substring(0, 5) : "");

export function ShopHoursDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: hours = [] } = useShopHours();
  const upsert = useUpsertShopHour();
  const [draft, setDraft] = useState<Record<number, Row>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const map: Record<number, Row> = {};
    DAYS.forEach(({ dow }) => {
      const h = hours.find((x: any) => x.day_of_week === dow);
      map[dow] = h
        ? {
            day_of_week: dow,
            is_open: !!h.is_open,
            open_time: trimTime(h.open_time) || "07:30",
            close_time: trimTime(h.close_time) || "17:30",
            lunch_enabled: !!h.lunch_enabled,
            lunch_start: trimTime(h.lunch_start) || "12:00",
            lunch_end: trimTime(h.lunch_end) || "13:00",
          }
        : defaultRow(dow);
    });
    setDraft(map);
  }, [open, hours]);

  const update = (dow: number, patch: Partial<Row>) =>
    setDraft((d) => ({ ...d, [dow]: { ...d[dow], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(DAYS.map(({ dow }) => upsert.mutateAsync(draft[dow] as any)));
      toast.success("Shop hours saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save shop hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Opening hours</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          {DAYS.map(({ label, dow }) => {
            const h = draft[dow] ?? defaultRow(dow);
            return (
              <div key={dow} className="rounded-md border px-3 py-1.5 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Switch checked={h.is_open} onCheckedChange={(v) => update(dow, { is_open: v })} />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                {h.is_open && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Open</Label>
                      <Input type="time" value={h.open_time} onChange={(e) => update(dow, { open_time: e.target.value })} className="w-24 h-8" />
                      <Label className="text-xs">Close</Label>
                      <Input type="time" value={h.close_time} onChange={(e) => update(dow, { close_time: e.target.value })} className="w-24 h-8" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
