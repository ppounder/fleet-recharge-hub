import { Wrench, Clock, ClipboardList, FileText, AlertTriangle, Package, Upload, Camera } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { mockJobs, mockEstimateItems } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ServiceProviderDashboard() {
  const todaysJobs = mockJobs.filter((j) => ["approved", "in-progress", "booked"].includes(j.status));
  const awaitingApproval = mockJobs.filter((j) => j.status === "estimated");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Provider Dashboard</h1>
        <p className="text-sm text-muted-foreground">AutoCare Plus — Workshop Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Jobs" value={todaysJobs.length} icon={Wrench} change="2 in progress" changeType="neutral" />
        <StatCard label="Awaiting Approval" value={awaitingApproval.length} icon={Clock} change="1 high priority" changeType="negative" iconColor="bg-warning/10" />
        <StatCard label="Parts Required" value={3} icon={Package} change="1 on back-order" changeType="negative" iconColor="bg-info/10" />
        <StatCard label="Invoices Pending" value={2} icon={FileText} change="£2,470 total" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Jobs */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Jobs</CardTitle>
              <Button size="sm" className="text-xs">+ New Job</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysJobs.map((job) => (
              <div key={job.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{job.id}</span>
                      <StatusBadge status={job.status} />
                      {job.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[10px] h-5">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.vehicleReg} · {job.vehicleMakeModel} · {job.customer}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs">Update Status</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Camera className="w-3 h-3 mr-1" />
                      Evidence
                    </Button>
                  </div>
                </div>
                <JobProgress currentStatus={job.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Estimate Builder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estimate Builder — J-2402</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Ford Transit · CD22 ABC · Bumper + Brakes</p>
            {mockEstimateItems.map((item) => (
              <div key={item.id} className="p-2.5 border rounded-lg text-xs">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-muted-foreground capitalize">{item.type} · {item.quantity} × £{item.unitPrice.toFixed(2)}</p>
                  </div>
                  <span className="font-semibold">£{item.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch checked={item.rechargeable} className="scale-75" />
                    <span className={item.rechargeable ? "font-medium text-accent" : "text-muted-foreground"}>
                      {item.rechargeable ? "Rechargeable" : "Fleet Cost"}
                    </span>
                  </div>
                  {item.rechargeable && (
                    <Badge variant="outline" className="text-[10px] text-accent border-accent/30">
                      {item.rechargeReason?.replace("-", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Total Estimate</span>
              <span className="text-sm font-bold">£{mockEstimateItems.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-accent/10 rounded-lg">
              <span className="text-xs font-medium text-accent">Rechargeable Amount</span>
              <span className="text-xs font-bold text-accent">
                £{mockEstimateItems.filter((i) => i.rechargeable).reduce((s, i) => s + i.total, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 text-xs" size="sm">Submit Estimate</Button>
              <Button variant="outline" className="text-xs" size="sm">
                <Upload className="w-3 h-3 mr-1" />
                Upload Evidence
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
