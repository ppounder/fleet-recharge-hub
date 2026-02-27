import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateVehicle } from "@/hooks/useVehicles";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function CreateVehicleDialog() {
  const [open, setOpen] = useState(false);
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const createVehicle = useCreateVehicle();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.trim() || !make.trim() || !model.trim()) return;

    try {
      await createVehicle.mutateAsync({
        registration: registration.toUpperCase(),
        make,
        model,
        year: year ? parseInt(year) : null,
        vin: vin || null,
        mileage: mileage ? parseInt(mileage) : null,
        fleet_manager_id: user?.id ?? null,
      });
      toast({ title: "Vehicle added", description: `${registration.toUpperCase()} added to fleet` });
      setOpen(false);
      setRegistration("");
      setMake("");
      setModel("");
      setYear("");
      setVin("");
      setMileage("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle to Fleet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registration *</Label>
              <Input value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder="AB21 XYZ" required />
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="WBA8E9C50JA..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Make *</Label>
              <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="BMW" required />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="3 Series" required />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" placeholder="2024" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mileage</Label>
            <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" placeholder="45000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
