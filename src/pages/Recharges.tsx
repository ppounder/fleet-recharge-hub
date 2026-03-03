import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { CreditCard, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface RechargeWorkItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  job_id: string;
  job_number: string;
  vehicle_reg: string;
}

export default function Recharges() {
  // Fetch work items that are rechargeable, for jobs linked to the customer's vehicles
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["customer_recharge_items"],
    queryFn: async () => {
      // work_items RLS already scopes to customer's vehicles
      const { data, error } = await supabase
        .from("work_items")
        .select("id, description, quantity, unit_price, total, rechargeable, job_id, jobs!inner(job_number, vehicle_reg)")
        .eq("rechargeable", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total: Number(item.total),
        job_id: item.job_id,
        job_number: item.jobs?.job_number || "",
        vehicle_reg: item.jobs?.vehicle_reg || "",
      })) as RechargeWorkItem[];
    },
  });

  const totalRecharge = items.reduce((s, i) => s + i.total, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recharges</h1>
          <p className="text-sm text-muted-foreground">
            Work items recharged to you · {items.length} item{items.length !== 1 ? "s" : ""} · Total: £{totalRecharge.toFixed(2)}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No recharges assigned to you.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Recharged Work Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Job</TableHead>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit £</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.job_number}</TableCell>
                      <TableCell><UKNumberPlate registration={item.vehicle_reg} /></TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{item.description}</TableCell>
                      <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                      <TableCell className="text-xs text-right">£{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">£{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
