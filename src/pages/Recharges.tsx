import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { CreditCard, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  labour_total: number;
  parts_net: number;
  parts_vat: number;
  grand_total: number;
}

export default function Recharges() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["customer_recharge_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("id, description, quantity, unit_price, total, rechargeable, job_id, jobs!inner(job_number, vehicle_reg), work_item_labour(total), work_item_parts(total, unit_price, quantity, vat_percent)")
        .eq("rechargeable", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((item: any) => {
        const labourTotal = (item.work_item_labour || []).reduce((s: number, l: any) => s + (Number(l.total) || 0), 0);
        const partsNet = (item.work_item_parts || []).reduce((s: number, p: any) => s + (Number(p.unit_price) || 0) * (Number(p.quantity) || 0), 0);
        const partsVat = (item.work_item_parts || []).reduce((s: number, p: any) => {
          const net = (Number(p.unit_price) || 0) * (Number(p.quantity) || 0);
          return s + net * ((Number(p.vat_percent) || 0) / 100);
        }, 0);
        const baseTotal = Number(item.total) || 0;
        const grandTotal = baseTotal + labourTotal + partsNet + partsVat;
        return {
          id: item.id,
          description: item.description || "",
          quantity: item.quantity || 0,
          unit_price: Number(item.unit_price) || 0,
          total: baseTotal,
          job_id: item.job_id,
          job_number: item.jobs?.job_number || "",
          vehicle_reg: item.jobs?.vehicle_reg || "",
          labour_total: labourTotal,
          parts_net: partsNet,
          parts_vat: partsVat,
          grand_total: grandTotal,
        } as RechargeWorkItem;
      });
    },
  });

  const totalRecharge = items.reduce((s, i) => s + i.grand_total, 0);

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
                    <TableHead className="text-xs text-right">Base £</TableHead>
                    <TableHead className="text-xs text-right">Labour £</TableHead>
                    <TableHead className="text-xs text-right">Parts £</TableHead>
                    <TableHead className="text-xs text-right">VAT £</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.job_number}</TableCell>
                      <TableCell><UKNumberPlate registration={item.vehicle_reg} /></TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">{item.description}</TableCell>
                      <TableCell className="text-xs text-right">£{item.total.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">£{item.labour_total.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">£{item.parts_net.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">£{item.parts_vat.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">£{item.grand_total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell colSpan={3} className="text-xs text-right">Totals</TableCell>
                    <TableCell className="text-xs text-right">£{items.reduce((s, i) => s + i.total, 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">£{items.reduce((s, i) => s + i.labour_total, 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">£{items.reduce((s, i) => s + i.parts_net, 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">£{items.reduce((s, i) => s + i.parts_vat, 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right">£{totalRecharge.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
