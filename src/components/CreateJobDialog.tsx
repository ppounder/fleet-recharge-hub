import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJob } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleMakeModel, setVehicleMakeModel] = useState("");
  const [type, setType] = useState("maintenance");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const createJob = useCreateJob();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg.trim()) return;

    const jobNumber = `J-${Date.now().toString().slice(-4)}`;

    try {
      await createJob.mutateAsync({
        job_number: jobNumber,
        vehicle_reg: vehicleReg.toUpperCase(),
        vehicle_make_model: vehicleMakeModel || null,
        type,
        priority,
        description: description || null,
        fleet_manager_id: user?.id ?? null,
        status: "booked",
      });
      toast({ title: "Job created", description: `${jobNumber} created successfully` });
      setOpen(false);
      setVehicleReg("");
      setVehicleMakeModel("");
      setType("maintenance");
      setPriority("normal");
      setDescription("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Job</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Reg *</Label>
              <Input value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="AB21 XYZ" required />
            </div>
            <div className="space-y-2">
              <Label>Make / Model</Label>
              <Input value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} placeholder="BMW 3 Series" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="mot">MOT</SelectItem>
                  <SelectItem value="tyres">Tyres</SelectItem>
                  <SelectItem value="bodywork">Bodywork</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work required..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
