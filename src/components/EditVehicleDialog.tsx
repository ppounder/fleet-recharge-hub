import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateVehicle, Vehicle } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";

interface EditVehicleDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVehicleDialog({ vehicle, open, onOpenChange }: EditVehicleDialogProps) {
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [motDue, setMotDue] = useState("");
  const [nextService, setNextService] = useState("");
  const [status, setStatus] = useState("active");
  const updateVehicle = useUpdateVehicle();
  const { toast } = useToast();

  useEffect(() => {
    if (vehicle) {
      setRegistration(vehicle.registration);
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(vehicle.year?.toString() ?? "");
      setVin(vehicle.vin ?? "");
      setMileage(vehicle.mileage?.toString() ?? "");
      setMotDue(vehicle.mot_due ?? "");
      setNextService(vehicle.next_service ?? "");
      setStatus(vehicle.status);
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !registration.trim() || !make.trim() || !model.trim()) return;

    try {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        registration: registration.toUpperCase(),
        make,
        model,
        year: year ? parseInt(year) : null,
        vin: vin || null,
        mileage: mileage ? parseInt(mileage) : null,
        mot_due: motDue || null,
        next_service: nextService || null,
        status,
      });
      toast({ title: "Vehicle updated", description: `${registration.toUpperCase()} has been updated` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registration *</Label>
              <Input value={registration} onChange={(e) => setRegistration(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Make *</Label>
              <Input value={make} onChange={(e) => setMake(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mileage</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="off-road">Off Road</SelectItem>
                  <SelectItem value="in-service">In Service</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>MOT Due</Label>
              <Input value={motDue} onChange={(e) => setMotDue(e.target.value)} type="date" />
            </div>
            <div className="space-y-2">
              <Label>Next Service</Label>
              <Input value={nextService} onChange={(e) => setNextService(e.target.value)} type="date" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateVehicle.isPending}>
              {updateVehicle.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
