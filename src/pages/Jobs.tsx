import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { useJobs, useUpdateJob } from "@/hooks/useJobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Loader2 } from "lucide-react";
import { useState } from "react";
import { jobStatusSteps } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();
  const updateJob = useUpdateJob();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = jobs?.filter((j) => statusFilter === "all" || j.status === statusFilter) ?? [];

  const advanceStatus = async (jobId: string, currentStatus: string) => {
    const idx = jobStatusSteps.indexOf(currentStatus as any);
    if (idx < 0 || idx >= jobStatusSteps.length - 1) return;
    const nextStatus = jobStatusSteps[idx + 1];
    try {
      await updateJob.mutateAsync({ id: jobId, status: nextStatus });
      toast({ title: "Status updated", description: `Job moved to ${nextStatus}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bookings & Jobs</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} bookings {statusFilter !== "all" && `· filtered by ${statusFilter}`}</p>
          </div>
          <CreateJobDialog />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {jobStatusSteps.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" /> All Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No bookings found. Create your first booking to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Job #</TableHead>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Estimate</TableHead>
                    <TableHead className="text-xs">Progress</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                      <TableCell className="font-mono text-xs font-medium">{job.job_number}</TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <p className="font-medium">{job.vehicle_reg}</p>
                          {job.vehicle_make_model && <p className="text-muted-foreground">{job.vehicle_make_model}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{job.type}</TableCell>
                      <TableCell>
                        <Badge variant={job.priority === "urgent" ? "destructive" : job.priority === "high" ? "default" : "secondary"} className="text-[10px]">
                          {job.priority}
                        </Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={job.status} /></TableCell>
                      <TableCell className="text-xs font-medium">
                        {Number(job.estimate_total) > 0 ? `£${Number(job.estimate_total).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <JobProgress currentStatus={job.status} />
                      </TableCell>
                      <TableCell>
                        {job.status !== "closed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => advanceStatus(job.id, job.status)}
                            disabled={updateJob.isPending}
                          >
                            Advance →
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
