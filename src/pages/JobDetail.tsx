import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { JobProgress } from "@/components/JobProgress";
import { useJobs, useUpdateJob } from "@/hooks/useJobs";
import { useWorkItems, useCreateWorkItem, useUpdateWorkItem, useDeleteWorkItem } from "@/hooks/useWorkItems";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle, Send } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const job = jobs?.find((j) => j.id === id);
  const { data: workItems = [], isLoading: itemsLoading } = useWorkItems(id);
  const updateJob = useUpdateJob();
  const createItem = useCreateWorkItem();
  const updateItem = useUpdateWorkItem();
  const deleteItem = useDeleteWorkItem();

  // Local state for new line
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  if (jobsLoading || itemsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Job not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </AppLayout>
    );
  }

  const isProvider = userRole === "service-provider";
  const canConfirm = isProvider && job.status === "booked";
  const canEditItems = isProvider && ["booked", "confirmed"].includes(job.status);
  const canSubmitEstimate = isProvider && job.status === "confirmed" && workItems.length > 0;

  const handleConfirm = async () => {
    try {
      await updateJob.mutateAsync({ id: job.id, status: "confirmed" });
      toast({ title: "Booking confirmed", description: "You can now review and update the work items before submitting an estimate." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmitEstimate = async () => {
    const total = workItems.reduce((s, i) => s + Number(i.total), 0);
    try {
      await updateJob.mutateAsync({ id: job.id, status: "estimated", estimate_total: total });
      toast({ title: "Estimate submitted", description: `Estimate of £${total.toFixed(2)} sent to Fleet Manager for approval.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddLine = async () => {
    if (!newDesc.trim()) return;
    const total = newQty * newPrice;
    try {
      await createItem.mutateAsync({ job_id: job.id, description: newDesc, quantity: newQty, unit_price: newPrice, total });
      setNewDesc("");
      setNewQty(1);
      setNewPrice(0);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLine = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync({ id: itemId, job_id: job.id });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const itemsTotal = workItems.reduce((s, i) => s + Number(i.total), 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{job.job_number}</h1>
              <StatusBadge status={job.status} />
              {job.priority === "urgent" && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
              {job.priority === "high" && <Badge className="text-[10px]">HIGH</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{job.vehicle_reg} {job.vehicle_make_model && `· ${job.vehicle_make_model}`}</p>
          </div>
          <div className="flex gap-2">
            {canConfirm && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Confirm Booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This confirms you will carry out the work for {job.vehicle_reg}. You can then review the work items and submit your estimate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={updateJob.isPending}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canSubmitEstimate && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="gap-1.5">
                    <Send className="w-4 h-4" /> Submit Estimate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit estimate?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will submit an estimate of £{itemsTotal.toFixed(2)} to the Fleet Manager for approval. You won't be able to edit work items after this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitEstimate} disabled={updateJob.isPending}>Submit</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <JobProgress currentStatus={job.status} />
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{job.type}</p></div>
              <div><span className="text-muted-foreground">Booking Date</span><p className="font-medium">{job.booking_date ? new Date(job.booking_date).toLocaleDateString() : "—"}</p></div>
              <div><span className="text-muted-foreground">Fleet Ref</span><p className="font-medium">{job.fleet_reference || "—"}</p></div>
              <div><span className="text-muted-foreground">Booking Ref</span><p className="font-medium">{job.booking_reference || "—"}</p></div>
              <div><span className="text-muted-foreground">Depot</span><p className="font-medium">{job.depot || "—"}</p></div>
              <div><span className="text-muted-foreground">Contact</span><p className="font-medium">{job.contact_name || "—"}</p></div>
            </div>
            {job.description && (
              <>
                <Separator className="my-4" />
                <div><span className="text-sm text-muted-foreground">Description</span><p className="text-sm mt-1">{job.description}</p></div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Work Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Work Items</CardTitle>
              <span className="text-sm font-semibold">Total: £{itemsTotal.toFixed(2)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {workItems.length === 0 && !canEditItems && (
              <p className="text-sm text-muted-foreground text-center py-6">No work items yet</p>
            )}

            {workItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × £{Number(item.unit_price).toFixed(2)}
                    {item.rechargeable && <Badge variant="outline" className="ml-2 text-[9px] h-4">Rechargeable</Badge>}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">£{Number(item.total).toFixed(2)}</span>
                {canEditItems && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteLine(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {/* Add new line */}
            {canEditItems && (
              <>
                <Separator />
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Work item description" className="h-8 text-sm" />
                  </div>
                  <div className="w-20 space-y-1">
                    <span className="text-xs text-muted-foreground">Qty</span>
                    <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="w-24 space-y-1">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <Input type="number" min={0} step={0.01} value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <Button size="sm" className="h-8 gap-1" onClick={handleAddLine} disabled={createItem.isPending || !newDesc.trim()}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
