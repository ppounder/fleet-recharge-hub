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
import { useParts } from "@/hooks/useParts";
import { useVatBands } from "@/hooks/useVatBands";
import {
  useMenuItemParts,
  useCreateMenuItemPart,
  useUpdateMenuItemPart,
  useDeleteMenuItemPart,
} from "@/hooks/useMenuItemParts";
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
  const { data: parts } = useParts(providerId);
  const { data: vatBands } = useVatBands(providerId);
  const { data: menuItemParts, isLoading: partsLoading } = useMenuItemParts(item?.id);
  const updateItem = useUpdateMenuItem();
  const createLabour = useCreateMenuItemLabour();
  const updateLabour = useUpdateMenuItemLabour();
  const deleteLabour = useDeleteMenuItemLabour();
  const createPart = useCreateMenuItemPart();
  const updatePartLink = useUpdateMenuItemPart();
  const deletePartLink = useDeleteMenuItemPart();

  // Edit state for the menu item details
  const [jobType, setJobType] = useState("");
  const [workCodeId, setWorkCodeId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  // New labour row state
  const [newLabourRateId, setNewLabourRateId] = useState("");
  const [newLabourUnits, setNewLabourUnits] = useState("1");

  // New part row state
  const [newPartId, setNewPartId] = useState("");
  const [newPartUnitPrice, setNewPartUnitPrice] = useState("");
  const [newPartQuantity, setNewPartQuantity] = useState("1");
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

  const handleAddPart = async () => {
    if (!newPartId || !newPartUnitPrice) {
      toast({ title: "Select a part and enter a unit price", variant: "destructive" });
      return;
    }
    try {
      await createPart.mutateAsync({
        menu_item_id: item.id,
        part_id: newPartId,
        unit_price: Number(newPartUnitPrice),
        quantity: Number(newPartQuantity) || 1,
      });
      setNewPartId("");
      setNewPartUnitPrice("");
      setNewPartQuantity("1");
      toast({ title: "Part added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePartRow = async (id: string, field: "unit_price" | "quantity", value: number) => {
    const existing = menuItemParts?.find((p) => p.id === id);
    if (!existing) return;
    try {
      await updatePartLink.mutateAsync({
        id,
        menu_item_id: item.id,
        unit_price: field === "unit_price" ? value : existing.unit_price,
        quantity: field === "quantity" ? value : existing.quantity,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePartRow = async (id: string) => {
    try {
      await deletePartLink.mutateAsync({ id, menu_item_id: item.id });
      toast({ title: "Part removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getRateName = (rateId: string): LabourRateRow | undefined =>
    labourRates?.find((r) => r.id === rateId);

  const getPartVatPercent = (partId: string): number => {
    const part = parts?.find((p) => p.id === partId);
    if (!part?.vat_band_id) return 0;
    const band = vatBands?.find((v) => v.id === part.vat_band_id);
    return band ? Number(band.percentage) : 0;
  };

  // Determine the VAT band for the base price & labour from work code or work category
  const getServiceVatPercent = (): number => {
    // Work code VAT band takes priority over work category
    if (workCodeId && workCodeId !== "none") {
      const code = workCodes?.find((c) => c.id === workCodeId);
      if (code?.vat_band_id) {
        const band = vatBands?.find((v) => v.id === code.vat_band_id);
        if (band) return Number(band.percentage);
      }
    }
    // Fall back to work category VAT band
    const cat = workCategories?.find((c) => c.id === jobType);
    if (cat?.vat_band_id) {
      const band = vatBands?.find((v) => v.id === cat.vat_band_id);
      if (band) return Number(band.percentage);
    }
    return 0;
  };

  const serviceVatPc = getServiceVatPercent();
  const basePrice = Number(price) || 0;
  const baseVat = basePrice * serviceVatPc / 100;

  // Calculate total labour cost for display
  const labourTotal = (menuItemLabour || []).reduce((sum, ml) => {
    const rate = getRateName(ml.labour_rate_id);
    return sum + (rate ? rate.cost * ml.units : 0);
  }, 0);

  // Calculate parts total (inc VAT)
  const partsNetTotal = (menuItemParts || []).reduce((sum, mp) => {
    return sum + mp.unit_price * mp.quantity;
  }, 0);

  const partsVatTotal = (menuItemParts || []).reduce((sum, mp) => {
    const vatPc = getPartVatPercent(mp.part_id);
    return sum + (mp.unit_price * mp.quantity * vatPc / 100);
  }, 0);

  const totalNet = basePrice + labourTotal + partsNetTotal;
  const totalVat = baseVat + partsVatTotal;
  const grandTotal = totalNet + totalVat;

  const catLabel = workCategories?.find((j) => j.id === jobType)?.name || jobType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Edit Menu Price</SheetTitle>
          <p className="text-sm text-muted-foreground">Configure pricing, labour rates, and parts for this menu item.</p>
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
              <div className="flex justify-end text-sm gap-4">
                <span className="text-muted-foreground">Net: <span className="font-mono font-medium text-foreground">£{basePrice.toFixed(2)}</span></span>
                <span className="text-muted-foreground">VAT ({serviceVatPc}%): <span className="font-mono font-medium text-foreground">£{baseVat.toFixed(2)}</span></span>
                <span className="text-muted-foreground">Total: <span className="font-mono font-medium text-foreground">£{(basePrice + baseVat).toFixed(2)}</span></span>
              </div>
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
                <div className="flex justify-end text-sm gap-4">
                  <span className="text-muted-foreground">Total: <span className="font-mono font-medium text-foreground">£{labourTotal.toFixed(2)}</span></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Parts & Materials Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" /> Parts & Materials
              </CardTitle>
              <p className="text-xs text-muted-foreground">Pre-set parts that will auto-populate when this menu price is added to a job.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new part row */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Part</Label>
                  <Select value={newPartId} onValueChange={setNewPartId}>
                    <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                    <SelectContent>
                      {parts?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.description}{p.part_number ? ` (${p.part_number})` : ""}
                        </SelectItem>
                      ))}
                      {!parts?.length && (
                        <SelectItem value="none" disabled>No parts — add them in Settings</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs">Unit £</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newPartUnitPrice}
                    onChange={(e) => setNewPartUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={newPartQuantity}
                    onChange={(e) => setNewPartQuantity(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddPart} disabled={createPart.isPending} size="sm" className="h-10">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {/* Parts table */}
              {partsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : !menuItemParts?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No parts assigned yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Unit £</TableHead>
                      <TableHead className="text-right w-20">Qty</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItemParts.map((mp) => {
                      const part = parts?.find((p) => p.id === mp.part_id);
                      const vatPc = getPartVatPercent(mp.part_id);
                      const net = mp.unit_price * mp.quantity;
                      const vat = net * vatPc / 100;
                      return (
                        <TableRow key={mp.id}>
                          <TableCell className="font-medium">
                            {part?.description || "Unknown"}
                            {part?.part_number ? <span className="text-muted-foreground text-xs ml-1">({part.part_number})</span> : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={mp.unit_price}
                              onChange={(e) => handleUpdatePartRow(mp.id, "unit_price", Number(e.target.value))}
                              className="w-20 ml-auto text-right text-sm h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={mp.quantity}
                              onChange={(e) => handleUpdatePartRow(mp.id, "quantity", Number(e.target.value))}
                              className="w-16 ml-auto text-right text-sm h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{vatPc}%</TableCell>
                          <TableCell className="text-right font-mono">£{(net + vat).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeletePartRow(mp.id)}
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

              {menuItemParts && menuItemParts.length > 0 && (
                <div className="flex justify-end text-sm gap-4">
                  <span className="text-muted-foreground">Net: <span className="font-mono font-medium text-foreground">£{partsNetTotal.toFixed(2)}</span></span>
                  <span className="text-muted-foreground">VAT: <span className="font-mono font-medium text-foreground">£{partsVatTotal.toFixed(2)}</span></span>
                  <span className="text-muted-foreground">Total: <span className="font-mono font-medium text-foreground">£{(partsNetTotal + partsVatTotal).toFixed(2)}</span></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Grand Total */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Base Price</span>
                  <span className="font-mono">£{basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Labour</span>
                  <span className="font-mono">£{labourTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Parts (net)</span>
                  <span className="font-mono">£{partsNetTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT ({serviceVatPc}% on base{partsVatTotal > 0 ? " + parts VAT" : ""})</span>
                  <span className="font-mono">£{totalVat.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Agreed Price (inc. VAT)</span>
                  <span className="text-lg font-mono font-bold">£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
