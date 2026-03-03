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
import { ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const bookingStatuses = ["booked", "confirmed"] as const;

export default function Bookings() {
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();
  const updateJob = useUpdateJob();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = jobs
    ?.filter((j) => bookingStatuses.includes(j.status as any))
    ?.filter((j) => statusFilter === "all" || j.status === statusFilter) ?? [];

  const advanceStatus = async (jobId: string, currentStatus: string) => {
    const next = currentStatus === "booked" ? "confirmed" : currentStatus === "confirmed" ? "estimated" : null;
    if (!next) return;
    try {
      await updateJob.mutateAsync({ id: jobId, status: next });
      toast({ title: "Status updated", description: `Job moved to ${next}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bookings</h1>
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
              <SelectItem value="all">All Bookings</SelectItem>
              {bookingStatuses.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No bookings found.</p>
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
                      <TableCell className="min-w-[200px]">
                        <JobProgress currentStatus={job.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); advanceStatus(job.id, job.status); }}
                          disabled={updateJob.isPending}
                        >
                          Advance →
                        </Button>
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
