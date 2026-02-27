import { Car, Wrench, CreditCard, FileText, MapPin, Clock, CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { mockJobs, mockRecharges, mockVehicles, rechargeReasonCodes } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function CustomerDashboard() {
  const customerName = "Quick Deliveries Ltd";
  const myVehicles = mockVehicles.filter((v) => v.customer === customerName);
  const myJobs = mockJobs.filter((j) => j.customer === customerName);
  const myRecharges = mockRecharges.filter((r) => r.customer === customerName);
  const pendingRecharges = myRecharges.filter((r) => ["pending-review", "approved"].includes(r.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Portal</h1>
        <p className="text-sm text-muted-foreground">{customerName} — Vehicle & Service Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Vehicles" value={myVehicles.length} icon={Car} />
        <StatCard label="Active Work" value={myJobs.filter((j) => !["closed", "invoiced"].includes(j.status)).length} icon={Wrench} change="1 in progress" changeType="neutral" />
        <StatCard label="Pending Recharges" value={`£${pendingRecharges.reduce((s, r) => s + r.cost, 0).toLocaleString()}`} icon={CreditCard} change={`${pendingRecharges.length} items`} changeType="negative" iconColor="bg-warning/10" />
        <StatCard label="Invoices" value={1} icon={FileText} change="£2,150 outstanding" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myVehicles.map((v) => (
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
                    <p className="text-xs text-muted-foreground">{v.make} {v.model} · {v.year}</p>
                    <p className="text-xs text-muted-foreground">{v.mileage.toLocaleString()} miles · MOT: {v.motDue}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {v.status === "in-service" && (
                    <Button size="sm" variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" /> Track
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs">History</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Work */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myJobs.filter((j) => !["closed"].includes(j.status)).map((job) => (
              <div key={job.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold">{job.id}</span>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-xs">{job.description}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{job.vehicleReg} · {job.provider}</p>
                {job.status === "in-progress" && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-info">
                    <Clock className="w-3 h-3" />
                    <span>Est. completion: Tomorrow 2pm</span>
                  </div>
                )}
                <div className="mt-2">
                  <JobProgress currentStatus={job.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recharge Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recharge Items</CardTitle>
            <Badge variant="outline" className="text-accent border-accent/30">
              {myRecharges.length} items · £{myRecharges.reduce((s, r) => s + r.cost, 0).toLocaleString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {myRecharges.map((r) => (
            <div key={r.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold">{r.id}</span>
                    <StatusBadge status={r.status} />
                    <Badge variant="outline" className="text-[10px]">
                      {rechargeReasonCodes[r.reasonCode] || r.reasonCode}
                    </Badge>
                  </div>
                  <p className="text-sm">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.vehicleReg} · Job {r.jobId} · {r.createdAt}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{r.evidence.length} evidence file(s)</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px]">
                      <Eye className="w-3 h-3 mr-1" /> View Evidence
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">£{r.cost.toFixed(2)}</p>
                  {r.status === "approved" && (
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90 text-success-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        <XCircle className="w-3 h-3 mr-1" /> Dispute
                      </Button>
                    </div>
                  )}
                  {r.status === "settled" && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs mt-2">
                      <Download className="w-3 h-3 mr-1" /> Invoice
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
