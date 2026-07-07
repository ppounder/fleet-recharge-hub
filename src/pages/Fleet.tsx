import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateVehicleDialog } from "@/components/CreateVehicleDialog";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { Loader2, Search, RefreshCw, Columns3, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { UKNumberPlate } from "@/components/UKNumberPlate";
import { formatDate, isDateExpired, cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = "registration" | "fleet_number" | "asset_type" | "vehicle" | "mileage" | "mot_due" | "status";
type SortDir = "asc" | "desc";

const ALL_COLS: { key: SortKey; label: string }[] = [
  { key: "registration", label: "Registration" },
  { key: "fleet_number", label: "Fleet No." },
  { key: "asset_type", label: "Asset Type" },
  { key: "vehicle", label: "Vehicle" },
  { key: "mileage", label: "Mileage" },
  { key: "mot_due", label: "MOT Due" },
  { key: "status", label: "Status" },
];

export default function Fleet() {
  const { data: vehicles, isLoading, isFetching } = useVehicles();
  const qc = useQueryClient();
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("registration");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<SortKey, boolean>>({
    registration: true, fleet_number: true, asset_type: true, vehicle: true, mileage: true, mot_due: true, status: true,
  });

  const rows = useMemo(() => {
    let list = vehicles ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        [v.registration, v.make, v.model, (v as any).fleet_number, (v as any).asset_type]
          .filter(Boolean).some((s: string) => String(s).toLowerCase().includes(q))
      );
    }
    const sorted = [...list].sort((a, b) => {
      const av: any = sortKey === "vehicle" ? `${a.make ?? ""} ${a.model ?? ""}` : (a as any)[sortKey];
      const bv: any = sortKey === "vehicle" ? `${b.make ?? ""} ${b.model ?? ""}` : (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [vehicles, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ChevronsUpDown className="w-3 h-3 opacity-50" />
      : sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;

  const th = (key: SortKey, label: string, className?: string) =>
    visible[key] && (
      <TableHead className={cn("text-xs", className)}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        >
          {label} <SortIcon k={key} />
        </button>
      </TableHead>
    );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet</h1>
            <p className="text-sm text-muted-foreground">{vehicles?.length ?? 0} vehicles in fleet</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vehicles..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => qc.invalidateQueries({ queryKey: ["vehicles"] })}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1.5", isFetching && "animate-spin")} />
                  Refresh data
                </Button>
                <CreateVehicleDialog />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="w-4 h-4 mr-1.5" /> Manage columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_COLS.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={visible[c.key]}
                        onCheckedChange={(v) => setVisible((s) => ({ ...s, [c.key]: !!v }))}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !rows.length ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  {search ? "No vehicles match your search." : "No vehicles yet. Add your first asset to get started."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {th("registration", "Registration")}
                      {th("fleet_number", "Fleet No.")}
                      {th("asset_type", "Asset Type")}
                      {th("vehicle", "Vehicle")}
                      {th("mileage", "Mileage")}
                      {th("mot_due", "MOT Due")}
                      {th("status", "Status")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((v: any) => (
                      <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditVehicle(v)}>
                        {visible.registration && (
                          <TableCell><UKNumberPlate registration={v.registration} /></TableCell>
                        )}
                        {visible.fleet_number && (
                          <TableCell className="text-xs">{v.fleet_number || "—"}</TableCell>
                        )}
                        {visible.asset_type && (
                          <TableCell className="text-xs">{v.asset_type || "—"}</TableCell>
                        )}
                        {visible.vehicle && (
                          <TableCell className="text-xs">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                        )}
                        {visible.mileage && (
                          <TableCell className="text-xs">
                            {v.mileage ? `${v.mileage.toLocaleString()} Miles` : "—"}
                          </TableCell>
                        )}
                        {visible.mot_due && (
                          <TableCell className={cn("text-xs", isDateExpired(v.mot_due) && "text-destructive font-semibold")}>
                            {formatDate(v.mot_due)}
                          </TableCell>
                        )}
                        {visible.status && (
                          <TableCell><StatusBadge status={v.status} /></TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditVehicleDialog vehicle={editVehicle} open={!!editVehicle} onOpenChange={(open) => !open && setEditVehicle(null)} />
    </AppLayout>
  );
}
