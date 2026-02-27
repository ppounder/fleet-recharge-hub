import { Wrench, Clock, FileText, Package, Upload, Camera } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function ServiceProviderDashboard() {
  const { data: jobs = [], isLoading } = useJobs();

  const todaysJobs = jobs.filter((j) => ["approved", "in-progress", "booked"].includes(j.status));
  const awaitingApproval = jobs.filter((j) => j.status === "estimated");

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
        <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
        <p className="text-sm text-muted-foreground">Workshop Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Jobs" value={todaysJobs.length} icon={Wrench} change={`${jobs.filter(j => j.status === "in-progress").length} in progress`} changeType="neutral" />
        <StatCard label="Awaiting Approval" value={awaitingApproval.length} icon={Clock} changeType="negative" iconColor="bg-warning/10" />
        <StatCard label="Total Jobs" value={jobs.length} icon={Package} changeType="neutral" iconColor="bg-info/10" />
        <StatCard label="Completed" value={jobs.filter(j => ["complete", "invoiced", "closed"].includes(j.status)).length} icon={FileText} changeType="neutral" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaysJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active jobs</p>
          ) : (
            todaysJobs.map((job) => (
              <div key={job.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{job.job_number}</span>
                      <StatusBadge status={job.status} />
                      {job.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[10px] h-5">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{job.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.vehicle_reg} {job.vehicle_make_model && `· ${job.vehicle_make_model}`}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs">Update</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Camera className="w-3 h-3 mr-1" /> Evidence
                    </Button>
                  </div>
                </div>
                <JobProgress currentStatus={job.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
