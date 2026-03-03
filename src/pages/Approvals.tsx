import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2 } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";

export default function Approvals() {
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();

  const estimated = jobs?.filter((j) => j.status === "estimated") ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {estimated.length} booking{estimated.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Estimates Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : estimated.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No estimates awaiting approval.</p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimated.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                      <TableCell className="font-mono text-xs font-medium">{job.job_number}</TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <UKNumberPlate registration={job.vehicle_reg} />
                          {job.vehicle_make_model && <p className="text-muted-foreground mt-1">{job.vehicle_make_model}</p>}
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
