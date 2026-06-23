import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useVehicles, useUpdateVehicle, Vehicle } from "@/hooks/useVehicles";
import { ArrowLeft, Car, Loader2 } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { toast } from "@/hooks/use-toast";

type EditableFields = {
  registration: string;
  fleet_number: string;
  vin: string;
  asset_type: string;
  make: string;
  model: string;
  derivative: string;
};

const blank: EditableFields = {
  registration: "",
  fleet_number: "",
  vin: "",
  asset_type: "",
  make: "",
  model: "",
  derivative: "",
};

function toForm(v: Vehicle): EditableFields {
  return {
    registration: v.registration || "",
    fleet_number: (v as any).fleet_number || "",
    vin: v.vin || "",
    asset_type: (v as any).asset_type || "",
    make: v.make || "",
    model: v.model || "",
    derivative: (v as any).derivative || "",
  };
}

export default function CustomerVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const update = useUpdateVehicle();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<EditableFields>(blank);

  useEffect(() => {
    if (selected) setForm(toForm(selected));
  }, [selected]);

  const set = (k: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!selected) return;
    try {
      await update.mutateAsync({
        id: selected.id,
        registration: form.registration,
        fleet_number: form.fleet_number || null,
        vin: form.vin || null,
        asset_type: form.asset_type || null,
        make: form.make,
        model: form.model,
        derivative: form.derivative || null,
      } as any);
      toast({ title: "Vehicle updated" });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  if (selected) {
    const fields: { key: keyof EditableFields; label: string }[] = [
      { key: "registration", label: "Registration" },
      { key: "fleet_number", label: "Fleet Number" },
      { key: "vin", label: "VIN" },
      { key: "asset_type", label: "Asset Type" },
      { key: "make", label: "Make" },
      { key: "model", label: "Model" },
      { key: "derivative", label: "Derivative" },
    ];

    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Vehicle Details</h1>
                <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                  <UKNumberPlate registration={selected.registration} />
                  · {selected.make} {selected.model}
                </p>
              </div>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key} className="text-xs uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </Label>
                    <Input id={f.key} value={form[f.key]} onChange={set(f.key)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={update.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Vehicles</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} assigned to you</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No vehicles assigned to your account yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <Card
                key={v.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelected(v)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base"><UKNumberPlate registration={v.registration} /></CardTitle>
                    <StatusBadge status={v.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium">{v.make} {v.model} {v.year && `(${v.year})`}</p>
                  {v.mileage && <p className="text-muted-foreground">{v.mileage.toLocaleString()} miles</p>}
                  {v.mot_due && <p className="text-muted-foreground">MOT Due: {v.mot_due}</p>}
                  {v.next_service && <p className="text-muted-foreground">Next Service: {v.next_service}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
