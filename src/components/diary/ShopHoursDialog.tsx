import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useShopHours, useUpsertShopHour } from "@/hooks/useDiary";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ShopHoursDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: hours = [] } = useShopHours();
  const upsert = useUpsertShopHour();

  const trimTime = (t: string | null | undefined) => (t ? t.substring(0, 5) : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Shop hours</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {DAYS.map((label, dow) => {
            const h = hours.find(x => x.day_of_week === dow) ?? { day_of_week: dow, is_open: false, open_time: "07:30", close_time: "17:30", lunch_enabled: false, lunch_start: "12:00", lunch_end: "13:00" } as any;
            return (
              <div key={dow} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={h.is_open} onCheckedChange={(v) => upsert.mutate({ ...h, is_open: v })} />
                    <span className="font-medium w-24">{label}</span>
                  </div>
                  {h.is_open && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Open</Label>
                      <Input type="time" value={trimTime(h.open_time)} onChange={(e) => upsert.mutate({ ...h, open_time: e.target.value })} className="w-28" />
                      <Label className="text-xs">Close</Label>
                      <Input type="time" value={trimTime(h.close_time)} onChange={(e) => upsert.mutate({ ...h, close_time: e.target.value })} className="w-28" />
                    </div>
                  )}
                </div>
                {h.is_open && (
                  <div className="flex items-center gap-3 pl-12">
                    <Switch checked={h.lunch_enabled} onCheckedChange={(v) => upsert.mutate({ ...h, lunch_enabled: v })} />
                    <Label className="text-xs">Lunch</Label>
                    {h.lunch_enabled && (
                      <>
                        <Input type="time" value={trimTime(h.lunch_start)} onChange={(e) => upsert.mutate({ ...h, lunch_start: e.target.value })} className="w-28" />
                        <span>–</span>
                        <Input type="time" value={trimTime(h.lunch_end)} onChange={(e) => upsert.mutate({ ...h, lunch_end: e.target.value })} className="w-28" />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
