import { Car, Wrench, CreditCard, FileText, Clock } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { useRecharges } from "@/hooks/useRecharges";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function CustomerDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: recharges = [], isLoading: rechargesLoading } = useRecharges();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const isLoading = jobsLoading || rechargesLoading || vehiclesLoading;
  const activeJobs = jobs.filter((j) => !["closed", "invoiced"].includes(j.status));
  const pendingRecharges = recharges.filter((r) => ["pending-review", "approved"].includes(r.status));

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
        <StatCard label="Pending Recharges" value={`£${pendingRecharges.reduce((s, r) => s + Number(r.cost), 0).toLocaleString()}`} icon={CreditCard} change={`${pendingRecharges.length} items`} changeType="negative" iconColor="bg-warning/10" />
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
                        <span className="font-mono font-semibold text-sm">{v.registration}</span>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">{job.vehicle_reg}</p>
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
