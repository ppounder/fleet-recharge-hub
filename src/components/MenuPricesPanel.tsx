import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMenuItemsByProviderAndFleet,
  useCreateMenuItem,
  useDeleteMenuItem,
  MenuItemRow,
} from "@/hooks/useMenuItems";
import { useWorkCategories } from "@/hooks/useWorkCategories";
import { useWorkCodes } from "@/hooks/useWorkCodes";
import { useLabourRates } from "@/hooks/useLabourRates";
import { useVatBands } from "@/hooks/useVatBands";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { MenuPriceEditSheet } from "@/components/MenuPriceEditSheet";

interface MenuPricesPanelProps {
  providerId: string;
  fleetId: string;
}

export function MenuPricesPanel({ providerId, fleetId }: MenuPricesPanelProps) {
  const { toast } = useToast();
  const { data: menuItems, isLoading } = useMenuItemsByProviderAndFleet(providerId, fleetId);
  const { data: workCategories } = useWorkCategories(providerId);
  const { data: workCodes } = useWorkCodes(providerId);
  const { data: labourRates } = useLabourRates(providerId, fleetId);
  const { data: vatBands } = useVatBands(providerId);
  const createItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();

  // Fetch all menu_item_labour rows for items in this provider+fleet
  const menuItemIds = menuItems?.map((i) => i.id) || [];
  const { data: allMenuItemLabour } = useQuery({
    queryKey: ["menu_item_labour_bulk", providerId, fleetId, menuItemIds],
    enabled: menuItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_labour")
        .select("*")
        .in("menu_item_id", menuItemIds);
      if (error) throw error;
      return data as { id: string; menu_item_id: string; labour_rate_id: string; units: number }[];
    },
  });

  // Fetch all menu_item_parts rows for items in this provider+fleet
  const { data: allMenuItemParts } = useQuery({
    queryKey: ["menu_item_parts_bulk", providerId, fleetId, menuItemIds],
    enabled: menuItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_parts")
        .select("*, parts:part_id(vat_band_id)")
        .in("menu_item_id", menuItemIds);
      if (error) throw error;
      return data as { id: string; menu_item_id: string; part_id: string; unit_price: number; quantity: number; parts: { vat_band_id: string | null } | null }[];
    },
  });

  // Get VAT percent for base price & labour from work code or work category
  const getServiceVatPercent = (item: MenuItemRow): number => {
    if (item.work_code_id) {
      const code = workCodes?.find((c) => c.id === item.work_code_id);
      if (code?.vat_band_id) {
        const band = vatBands?.find((v) => v.id === code.vat_band_id);
        if (band) return Number(band.percentage);
      }
    }
    const cat = workCategories?.find((c) => c.id === item.job_type);
    if (cat?.vat_band_id) {
      const band = vatBands?.find((v) => v.id === cat.vat_band_id);
      if (band) return Number(band.percentage);
    }
    return 0;
  };

  // Calculate total price (unit_price + labour costs + parts with VAT) for a menu item
  const getTotalPrice = (item: MenuItemRow) => {
    const basePrice = Number(item.unit_price);
    const serviceVatPc = getServiceVatPercent(item);

    const labourRows = allMenuItemLabour?.filter((l) => l.menu_item_id === item.id) || [];
    const labourTotal = labourRows.reduce((sum, row) => {
      const rate = labourRates?.find((r) => r.id === row.labour_rate_id);
      return sum + (rate ? row.units * rate.cost : 0);
    }, 0);

    const baseVat = basePrice * serviceVatPc / 100;

    const partRows = allMenuItemParts?.filter((p) => p.menu_item_id === item.id) || [];
    const partsTotal = partRows.reduce((sum, row) => {
      const net = row.unit_price * row.quantity;
      const vatBandId = row.parts?.vat_band_id;
      const vatPc = vatBandId ? Number(vatBands?.find((v) => v.id === vatBandId)?.percentage || 0) : 0;
      return sum + net + (net * vatPc / 100);
    }, 0);

    return basePrice + labourTotal + baseVat + partsTotal;
  };

  const [newJobType, setNewJobType] = useState("");
  const [newWorkCodeId, setNewWorkCodeId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Sheet state
  const [editItem, setEditItem] = useState<MenuItemRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const codesForNewCategory = workCodes?.filter((c) => c.work_category_id === newJobType) || [];

  const handleAdd = async () => {
    if (!newPrice || !newJobType) {
      toast({ title: "Missing fields", description: "Please select a category and enter a price", variant: "destructive" });
      return;
    }
    try {
      await createItem.mutateAsync({
        provider_id: providerId,
        fleet_id: fleetId,
        job_type: newJobType,
        work_code_id: newWorkCodeId || null,
        description: newDescription || workCategories?.find((j) => j.id === newJobType)?.name || newJobType,
        unit_price: Number(newPrice),
      });
      toast({ title: "Menu price added" });
      setNewJobType("");
      setNewWorkCodeId("");
      setNewDescription("");
      setNewPrice("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (item: MenuItemRow) => {
    setEditItem(item);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Add new price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Agreed Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_1fr_100px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Work Category *</Label>
              <Select value={newJobType} onValueChange={(v) => { setNewJobType(v); setNewWorkCodeId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {workCategories?.map((wc) => (
                    <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                  ))}
                  {!workCategories?.length && (
                    <SelectItem value="none" disabled>No work categories — add them in Settings</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Work Code (optional)</Label>
              <Select value={newWorkCodeId} onValueChange={setNewWorkCodeId} disabled={!newJobType || codesForNewCategory.length === 0}>
                <SelectTrigger><SelectValue placeholder={!newJobType ? "Select category first" : codesForNewCategory.length === 0 ? "No codes" : "Select code"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No work code (category-level)</SelectItem>
                  {codesForNewCategory.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Standard MOT test"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price £ *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleAdd} disabled={createItem.isPending} className="h-10">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prices table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : !menuItems?.length ? (
            <div className="p-6 text-center text-muted-foreground">No menu prices yet. Add your first agreed price above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Category</TableHead>
                  <TableHead>Work Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Agreed Price</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => {
                  const catLabel = workCategories?.find((j) => j.id === item.job_type)?.name || item.job_type;
                  const codeLabel = item.work_code_id ? workCodes?.find((c) => c.id === item.work_code_id)?.name || "—" : "—";
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                      <TableCell className="capitalize font-medium">{catLabel}</TableCell>
                      <TableCell className="text-muted-foreground">{codeLabel}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                      <TableCell className="text-right font-mono">£{getTotalPrice(item).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteItem.mutate(item.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <MenuPriceEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={editItem}
        providerId={providerId}
        fleetId={fleetId}
      />
    </div>
  );
}
