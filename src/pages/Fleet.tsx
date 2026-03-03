import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateVehicleDialog } from "@/components/CreateVehicleDialog";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useCustomers";
import { Car, Loader2 } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";

export default function Fleet() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: customers } = useCustomers();
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const customerMap = new Map(customers?.map((c) => [c.id, c.name]) ?? []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet</h1>
            <p className="text-sm text-muted-foreground">{vehicles?.length ?? 0} vehicles in fleet</p>
          </div>
          <CreateVehicleDialog />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-4 h-4" /> Vehicle Register
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !vehicles?.length ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No vehicles yet. Add your first vehicle to get started.</p>
              </div>
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
                     <TableHead className="text-xs">Customer</TableHead>
                     <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditVehicle(v)}>
                      <TableCell><UKNumberPlate registration={v.registration} /></TableCell>
                      <TableCell className="text-xs">{v.make}</TableCell>
                      <TableCell className="text-xs">{v.model}</TableCell>
                      <TableCell className="text-xs">{v.year ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.mileage ? `${v.mileage.toLocaleString()} mi` : "—"}</TableCell>
                      <TableCell className="text-xs">{v.mot_due ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.next_service ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.customer_id ? customerMap.get(v.customer_id) ?? "—" : "—"}</TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <EditVehicleDialog vehicle={editVehicle} open={!!editVehicle} onOpenChange={(open) => !open && setEditVehicle(null)} />
    </AppLayout>
  );
}
