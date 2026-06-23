import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { ArrowLeft, Car, Loader2 } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";

export default function CustomerVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const [selected, setSelected] = useState<Vehicle | null>(null);

  if (selected) {
    const fields: { label: string; value: React.ReactNode }[] = [
      { label: "Registration", value: <UKNumberPlate registration={selected.registration} /> },
      { label: "Fleet Number", value: (selected as any).fleet_number || "—" },
      { label: "VIN", value: selected.vin || "—" },
      { label: "Asset Type", value: (selected as any).asset_type || "—" },
      { label: "Make", value: selected.make || "—" },
      { label: "Model", value: selected.model || "—" },
      { label: "Derivative", value: (selected as any).derivative || "—" },
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
                <p className="text-sm text-muted-foreground">{selected.make} {selected.model}</p>
              </div>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                {fields.map((f) => (
                  <div key={f.label} className="flex flex-col gap-1 border-b pb-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="font-medium">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
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
