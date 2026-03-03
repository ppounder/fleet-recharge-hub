import { Shield, Wrench, CreditCard, AlertTriangle, TrendingUp, Clock, Car } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs } from "@/hooks/useJobs";
import { useRecharges } from "@/hooks/useRecharges";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
export function FleetManagerDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: recharges = [], isLoading: rechargesLoading } = useRecharges();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const isLoading = jobsLoading || rechargesLoading || vehiclesLoading;

  const pendingApprovals = jobs.filter((j) => j.status === "estimated");
  const activeJobs = jobs.filter((j) => ["approved", "in-progress"].includes(j.status));
  const pendingRecharges = recharges.filter((r) => r.status === "pending-review");
  const disputedRecharges = recharges.filter((r) => r.status === "disputed");
  const complianceAlerts = vehicles.filter((v) => v.status === "off-road");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your fleet SMR operations</p>
        </div>
        <CreateJobDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Approvals" value={pendingApprovals.length} icon={Shield} change={`${pendingApprovals.length} awaiting review`} changeType="negative" iconColor="bg-warning/10" />
        <StatCard label="Active Jobs" value={activeJobs.length} icon={Wrench} change={`${jobs.length} total`} changeType="neutral" />
        <StatCard label="Pending Recharges" value={`£${pendingRecharges.reduce((s, r) => s + Number(r.cost), 0).toLocaleString()}`} icon={CreditCard} change={`${pendingRecharges.length} items`} changeType="neutral" iconColor="bg-accent/10" />
        <StatCard label="Compliance Alerts" value={complianceAlerts.length} icon={AlertTriangle} change={`${vehicles.length} vehicles total`} changeType={complianceAlerts.length > 0 ? "negative" : "positive"} iconColor="bg-destructive/10" />
      </div>

      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-1.5"><Car className="w-3.5 h-3.5" /> Vehicles</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="w-3.5 h-3.5" /> Jobs</TabsTrigger>
        </TabsList>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vehicle Register</CardTitle>
                <Link to="/fleet"><Button variant="ghost" size="sm" className="text-xs">Manage Fleet</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No vehicles in fleet yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Registration</TableHead>
                      <TableHead className="text-xs">Make</TableHead>
                      <TableHead className="text-xs">Model</TableHead>
                      <TableHead className="text-xs">Year</TableHead>
                      <TableHead className="text-xs">Mileage</TableHead>
                      <TableHead className="text-xs">MOT Due</TableHead>
                      <TableHead className="text-xs">Next Service</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell><UKNumberPlate registration={v.registration} /></TableCell>
                        <TableCell className="text-xs">{v.make}</TableCell>
                        <TableCell className="text-xs">{v.model}</TableCell>
                        <TableCell className="text-xs">{v.year ?? "—"}</TableCell>
                        <TableCell className="text-xs">{v.mileage ? `${v.mileage.toLocaleString()} mi` : "—"}</TableCell>
                        <TableCell className="text-xs">{v.mot_due ?? "—"}</TableCell>
                        <TableCell className="text-xs">{v.next_service ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Approvals */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Estimates Awaiting Approval</CardTitle>
                  <Link to="/jobs"><Button variant="ghost" size="sm" className="text-xs">View All</Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No estimates awaiting approval</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Job</TableHead>
                        <TableHead className="text-xs">Vehicle</TableHead>
                        <TableHead className="text-xs">Estimate</TableHead>
                        <TableHead className="text-xs">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-xs font-medium">{job.job_number}</TableCell>
                          <TableCell><UKNumberPlate registration={job.vehicle_reg} /></TableCell>
                          <TableCell className="text-xs font-medium">£{Number(job.estimate_total).toFixed(2)}</TableCell>
                          <TableCell><StatusBadge status={job.priority === "urgent" ? "off-road" : "active"} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recharge Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recharge Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div>
                      <p className="text-xs font-medium">Pending Review</p>
                      <p className="text-lg font-bold">{pendingRecharges.length}</p>
                    </div>
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="text-xs font-medium">Active Disputes</p>
                      <p className="text-lg font-bold">{disputedRecharges.length}</p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                    <div>
                      <p className="text-xs font-medium">Total Recharges</p>
                      <p className="text-lg font-bold">{recharges.length}</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Jobs</CardTitle>
                <Link to="/jobs"><Button variant="ghost" size="sm" className="text-xs">View All Jobs</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No jobs yet. Create your first job to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Job #</TableHead>
                      <TableHead className="text-xs">Vehicle</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Estimate</TableHead>
                      <TableHead className="text-xs">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.slice(0, 6).map((job) => (
                      <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-xs font-medium">{job.job_number}</TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <UKNumberPlate registration={job.vehicle_reg} />
                            {job.vehicle_make_model && <p className="text-muted-foreground mt-1">{job.vehicle_make_model}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{job.type}</TableCell>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
