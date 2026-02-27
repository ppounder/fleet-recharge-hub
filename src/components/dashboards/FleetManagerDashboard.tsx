import { Shield, Wrench, CreditCard, Car, AlertTriangle, TrendingUp, TrendingDown, Clock, FileText } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { mockJobs, mockRecharges, mockVehicles } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function FleetManagerDashboard() {
  const pendingApprovals = mockJobs.filter((j) => j.status === "estimated");
  const pendingRecharges = mockRecharges.filter((r) => r.status === "pending-review");
  const disputedRecharges = mockRecharges.filter((r) => r.status === "disputed");
  const complianceAlerts = mockVehicles.filter((v) => v.status === "off-road");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fleet Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your fleet SMR operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Approvals" value={pendingApprovals.length} icon={Shield} change="+3 today" changeType="negative" iconColor="bg-warning/10" />
        <StatCard label="Active Jobs" value={mockJobs.filter((j) => ["approved", "in-progress"].includes(j.status)).length} icon={Wrench} change="2 urgent" changeType="neutral" />
        <StatCard label="Pending Recharges" value={`£${pendingRecharges.reduce((s, r) => s + r.cost, 0).toLocaleString()}`} icon={CreditCard} change={`${pendingRecharges.length} items`} changeType="neutral" iconColor="bg-accent/10" />
        <StatCard label="Compliance Alerts" value={complianceAlerts.length} icon={AlertTriangle} change="1 MOT overdue" changeType="negative" iconColor="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Estimates Awaiting Approval</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Job</TableHead>
                  <TableHead className="text-xs">Vehicle</TableHead>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Estimate</TableHead>
                  <TableHead className="text-xs">Recharge</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockJobs.filter((j) => j.status === "estimated").map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs font-medium">{job.id}</TableCell>
                    <TableCell className="text-xs">{job.vehicleReg}</TableCell>
                    <TableCell className="text-xs">{job.provider}</TableCell>
                    <TableCell className="text-xs font-medium">£{job.estimateTotal.toFixed(2)}</TableCell>
                    <TableCell>
                      {job.hasRecharge ? (
                        <span className="text-xs font-medium text-accent">£{job.rechargeAmount?.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.priority === "urgent" ? "off-road" : job.priority === "high" ? "disputed" : "active"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90 text-success-foreground">Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <p className="text-xs font-medium">Recovery Rate</p>
                  <p className="text-lg font-bold">87%</p>
                </div>
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-medium mb-2">Top Recharge Categories</p>
              {[
                { label: "Driver Damage", pct: 42 },
                { label: "Tyre Neglect", pct: 28 },
                { label: "Lost Keys", pct: 15 },
                { label: "Glass Damage", pct: 10 },
              ].map((cat) => (
                <div key={cat.label} className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] w-24 text-muted-foreground">{cat.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${cat.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-medium w-8 text-right">{cat.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Jobs</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">View All Jobs</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Job ID</TableHead>
                <TableHead className="text-xs">Vehicle</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Provider</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Estimate</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockJobs.map((job) => (
                <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-medium">{job.id}</TableCell>
                  <TableCell className="text-xs">
                    <div>
                      <p className="font-medium">{job.vehicleReg}</p>
                      <p className="text-muted-foreground">{job.vehicleMakeModel}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{job.type}</TableCell>
                  <TableCell className="text-xs">{job.provider}</TableCell>
                  <TableCell className="text-xs">{job.customer}</TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="text-xs font-medium">
                    {job.estimateTotal > 0 ? `£${job.estimateTotal.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <JobProgress currentStatus={job.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
