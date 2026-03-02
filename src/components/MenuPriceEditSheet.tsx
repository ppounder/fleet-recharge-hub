import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useUpdateMenuItem, MenuItemRow } from "@/hooks/useMenuItems";
import { useLabourRates, LabourRateRow } from "@/hooks/useLabourRates";
import {
  useMenuItemLabour,
  useCreateMenuItemLabour,
  useUpdateMenuItemLabour,
  useDeleteMenuItemLabour,
} from "@/hooks/useMenuItemLabour";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useWorkCodes } from "@/hooks/useWorkCodes";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Wrench, Package } from "lucide-react";

interface MenuPriceEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemRow | null;
  providerId: string;
  fleetId: string;
}

export function MenuPriceEditSheet({ open, onOpenChange, item, providerId, fleetId }: MenuPriceEditSheetProps) {
  const { toast } = useToast();
  const { data: workCategories } = useWorkCategories(providerId);
  const { data: workCodes } = useWorkCodes(providerId);
  const { data: labourRates } = useLabourRates(providerId, fleetId);
  const { data: menuItemLabour, isLoading: labourLoading } = useMenuItemLabour(item?.id);
  const updateItem = useUpdateMenuItem();
  const createLabour = useCreateMenuItemLabour();
  const updateLabour = useUpdateMenuItemLabour();
  const deleteLabour = useDeleteMenuItemLabour();

  // Edit state for the menu item details
  const [jobType, setJobType] = useState("");
  const [workCodeId, setWorkCodeId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  // New labour row state
  const [newLabourRateId, setNewLabourRateId] = useState("");
  const [newLabourUnits, setNewLabourUnits] = useState("1");

  useEffect(() => {
    if (item) {
      setJobType(item.job_type);
      setWorkCodeId(item.work_code_id || "");
      setDescription(item.description || "");
      setPrice(String(item.unit_price));
    }
  }, [item]);

  if (!item) return null;

  const codesForCategory = workCodes?.filter((c) => c.work_category_id === jobType) || [];

  const handleSaveDetails = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        job_type: jobType,
        work_code_id: workCodeId || null,
        description,
        unit_price: Number(price),
      });
      toast({ title: "Menu price updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddLabour = async () => {
    if (!newLabourRateId || !newLabourUnits) {
      toast({ title: "Select a labour rate and enter units", variant: "destructive" });
      return;
    }
    try {
      await createLabour.mutateAsync({
        menu_item_id: item.id,
        labour_rate_id: newLabourRateId,
        units: Number(newLabourUnits),
      });
      setNewLabourRateId("");
      setNewLabourUnits("1");
      toast({ title: "Labour rate added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateLabourUnits = async (id: string, units: number) => {
    try {
      await updateLabour.mutateAsync({ id, menu_item_id: item.id, units });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLabour = async (id: string) => {
    try {
      await deleteLabour.mutateAsync({ id, menu_item_id: item.id });
      toast({ title: "Labour rate removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getRateName = (rateId: string): LabourRateRow | undefined =>
    labourRates?.find((r) => r.id === rateId);

  // Calculate total labour cost for display
  const labourTotal = (menuItemLabour || []).reduce((sum, ml) => {
    const rate = getRateName(ml.labour_rate_id);
    return sum + (rate ? rate.cost * ml.units : 0);
  }, 0);

  const catLabel = workCategories?.find((j) => j.id === jobType)?.name || jobType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Edit Menu Price</SheetTitle>
          <p className="text-sm text-muted-foreground">Configure pricing, labour rates, and (coming soon) parts for this menu item.</p>
        </SheetHeader>

        {/* Details Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Save className="w-4 h-4" /> Price Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Work Category</Label>
                  <Select value={jobType} onValueChange={(v) => { setJobType(v); setWorkCodeId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workCategories?.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Work Code</Label>
                  <Select value={workCodeId} onValueChange={setWorkCodeId} disabled={codesForCategory.length === 0}>
                    <SelectTrigger><SelectValue placeholder={codesForCategory.length === 0 ? "No codes" : "Select"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No work code</SelectItem>
                      {codesForCategory.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price £</Label>
                  <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSaveDetails} disabled={updateItem.isPending} size="sm">
                <Save className="w-3.5 h-3.5 mr-1" /> Save Details
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Labour Rates Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Labour Rates
              </CardTitle>
              <p className="text-xs text-muted-foreground">Pre-set labour charges that will auto-populate when this menu price is added to a job.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new labour row */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Labour Rate</Label>
                  <Select value={newLabourRateId} onValueChange={setNewLabourRateId}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      {labourRates?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} — £{Number(r.cost).toFixed(2)}/hr
                        </SelectItem>
                      ))}
                      {!labourRates?.length && (
                        <SelectItem value="none" disabled>No labour rates configured</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs">Units/Hrs</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={newLabourUnits}
                    onChange={(e) => setNewLabourUnits(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddLabour} disabled={createLabour.isPending} size="sm" className="h-10">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {/* Labour table */}
              {labourLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : !menuItemLabour?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No labour rates assigned yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rate</TableHead>
                      <TableHead className="text-right">Cost/Hr</TableHead>
                      <TableHead className="text-right w-24">Units</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItemLabour.map((ml) => {
                      const rate = getRateName(ml.labour_rate_id);
                      const lineTotal = rate ? rate.cost * ml.units : 0;
                      return (
                        <TableRow key={ml.id}>
                          <TableCell className="font-medium">{rate?.name || "Unknown"}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            £{rate ? Number(rate.cost).toFixed(2) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0.1}
                              step={0.1}
                              value={ml.units}
                              onChange={(e) => handleUpdateLabourUnits(ml.id, Number(e.target.value))}
                              className="w-20 ml-auto text-right text-sm h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">£{lineTotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteLabour(ml.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {menuItemLabour && menuItemLabour.length > 0 && (
                <div className="flex justify-end text-sm">
                  <span className="text-muted-foreground mr-2">Labour Total:</span>
                  <span className="font-mono font-medium">£{labourTotal.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Parts placeholder */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" /> Parts & Materials
              </CardTitle>
              <p className="text-xs text-muted-foreground">Coming soon — you'll be able to assign parts to this menu price.</p>
            </CardHeader>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
