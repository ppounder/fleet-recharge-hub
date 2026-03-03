import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { Loader2, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UKNumberPlate } from "@/components/UKNumberPlate";

export default function CustomerActiveWork() {
  const { data: jobs = [], isLoading } = useJobs();
  const navigate = useNavigate();
  const activeJobs = jobs.filter((j) => !["closed", "invoiced"].includes(j.status));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Active Work</h1>
          <p className="text-sm text-muted-foreground">{activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No active work at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/jobs/${job.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-semibold">{job.job_number}</span>
                    <StatusBadge status={job.status} />
                    <UKNumberPlate registration={job.vehicle_reg} />
                  </div>
                  <p className="text-sm mb-2">{job.description || "No description"}</p>
                  {job.vehicle_make_model && <p className="text-xs text-muted-foreground mb-2">{job.vehicle_make_model}</p>}
                  <JobProgress currentStatus={job.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
