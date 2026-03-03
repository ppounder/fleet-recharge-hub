import { Car, Wrench, CreditCard, FileText } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function CustomerDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  // Fetch rechargeable work items with labour/parts for accurate totals
  const { data: rechargeItems = [], isLoading: rechargesLoading } = useQuery({
    queryKey: ["customer_recharge_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("id, total, work_item_labour(total), work_item_parts(unit_price, quantity, vat_percent)")
        .eq("rechargeable", true);
      if (error) throw error;
      return (data || []).map((item: any) => {
        const labourTotal = (item.work_item_labour || []).reduce((s: number, l: any) => s + Number(l.total), 0);
        const partsNet = (item.work_item_parts || []).reduce((s: number, p: any) => s + Number(p.unit_price) * Number(p.quantity), 0);
        const partsVat = (item.work_item_parts || []).reduce((s: number, p: any) => {
          const net = Number(p.unit_price) * Number(p.quantity);
          return s + net * (Number(p.vat_percent) / 100);
        }, 0);
        return Number(item.total) + labourTotal + partsNet + partsVat;
      });
    },
  });

  const isLoading = jobsLoading || rechargesLoading || vehiclesLoading;
  const activeJobs = jobs.filter((j) => !["closed", "invoiced"].includes(j.status));
  const rechargeTotal = rechargeItems.reduce((s, t) => s + t, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Portal</h1>
        <p className="text-sm text-muted-foreground">Vehicle & Service Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Vehicles" value={vehicles.length} icon={Car} />
        <StatCard label="Active Work" value={activeJobs.length} icon={Wrench} changeType="neutral" />
        <StatCard label="Recharges" value={`£${rechargeTotal.toFixed(2)}`} icon={CreditCard} change={`${rechargeItems.length} items`} changeType="negative" />
        <StatCard label="Total Jobs" value={jobs.length} icon={FileText} changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No vehicles assigned</p>
            ) : (
              vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <UKNumberPlate registration={v.registration} />
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{v.make} {v.model} {v.year && `· ${v.year}`}</p>
                      <p className="text-xs text-muted-foreground">{v.mileage ? `${v.mileage.toLocaleString()} miles` : ""} {v.mot_due && `· MOT: ${v.mot_due}`}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active work</p>
            ) : (
              activeJobs.map((job) => (
                <div key={job.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold">{job.job_number}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-xs">{job.description || "No description"}</p>
                  <span className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center"><UKNumberPlate registration={job.vehicle_reg} /></span>
                  <div className="mt-2">
                    <JobProgress currentStatus={job.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
