import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Columns3, ArrowUp, ArrowDown, ChevronsUpDown, Check } from "lucide-react";
import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  parent_supplier_id: string | null;
  pl_account_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  town_city: string | null;
  county: string | null;
  country: string | null;
  postcode: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  provides_parts: boolean;
  provides_tyres: boolean;
  provides_workshop: boolean;
};

const COLUMNS: { key: keyof Supplier | "services"; label: string; sortable?: boolean }[] = [
  { key: "name", label: "Company name", sortable: true },
  { key: "pl_account_number", label: "P/L Account", sortable: true },
  { key: "town_city", label: "Town/City", sortable: true },
  { key: "county", label: "County", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "postcode", label: "Postcode", sortable: true },
  { key: "contact_phone", label: "Telephone", sortable: false },
  { key: "contact_email", label: "Email", sortable: true },
  { key: "services", label: "Services", sortable: false },
];

const DEFAULT_VISIBLE = ["name", "pl_account_number", "town_city", "country", "contact_email", "services"];

const emptyForm = {
  name: "",
  parent_supplier_id: null as string | null,
  pl_account_number: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  town_city: "",
  county: "",
  country: "",
  postcode: "",
  contact_phone: "",
  contact_email: "",
  provides_parts: false,
  provides_tyres: false,
  provides_workshop: false,
};

export default function Suppliers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [parentOpen, setParentOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Supplier[];
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .insert({
          ...payload,
          parent_supplier_id: payload.parent_supplier_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers-list"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? suppliers.filter((s) =>
          [s.name, s.pl_account_number, s.town_city, s.county, s.country, s.postcode, s.contact_email, s.contact_phone]
            .some((v) => v?.toLowerCase().includes(q))
        )
      : suppliers;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [suppliers, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleCol = (key: string) =>
    setVisibleCols((cols) => cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key]);

  const parentName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "";
  const countryName = (code: string) => ISO_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    try {
      await createSupplier.mutateAsync(form);
      toast({ title: "Supplier added" });
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" strokeWidth={3} />;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Suppliers</h1>
            <p className="text-muted-foreground text-sm">Manage your supplier directory.</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add supplier
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Columns3 className="w-4 h-4 mr-1" /> Manage columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key as string}
                  checked={visibleCols.includes(c.key as string)}
                  onCheckedChange={() => toggleCol(c.key as string)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No suppliers found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.filter((c) => visibleCols.includes(c.key as string)).map((c) => (
                      <TableHead key={c.key as string}>
                        {c.sortable ? (
                          <button
                            className="flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(c.key as string)}
                          >
                            {c.label} <SortIcon col={c.key as string} />
                          </button>
                        ) : (
                          c.label
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      {visibleCols.includes("name") && <TableCell className="font-medium">{s.name}</TableCell>}
                      {visibleCols.includes("pl_account_number") && <TableCell>{s.pl_account_number || "—"}</TableCell>}
                      {visibleCols.includes("town_city") && <TableCell>{s.town_city || "—"}</TableCell>}
                      {visibleCols.includes("county") && <TableCell>{s.county || "—"}</TableCell>}
                      {visibleCols.includes("country") && <TableCell>{s.country ? countryName(s.country) : "—"}</TableCell>}
                      {visibleCols.includes("postcode") && <TableCell>{s.postcode || "—"}</TableCell>}
                      {visibleCols.includes("contact_phone") && <TableCell>{s.contact_phone || "—"}</TableCell>}
                      {visibleCols.includes("contact_email") && <TableCell>{s.contact_email || "—"}</TableCell>}
                      {visibleCols.includes("services") && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.provides_parts && <Badge variant="secondary">Parts</Badge>}
                            {s.provides_tyres && <Badge variant="secondary">Tyres</Badge>}
                            {s.provides_workshop && <Badge variant="secondary">Workshop</Badge>}
                            {!s.provides_parts && !s.provides_tyres && !s.provides_workshop && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>Enter the supplier details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Supplier details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Company name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parent company</Label>
                  <Popover open={parentOpen} onOpenChange={setParentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                        {form.parent_supplier_id ? parentName(form.parent_supplier_id) : <span className="text-muted-foreground">Select...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandList>
                          <CommandEmpty>No suppliers found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => { setForm({ ...form, parent_supplier_id: null }); setParentOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", !form.parent_supplier_id ? "opacity-100" : "opacity-0")} />
                              None
                            </CommandItem>
                            {suppliers.map((s) => (
                              <CommandItem key={s.id} value={s.name} onSelect={() => { setForm({ ...form, parent_supplier_id: s.id }); setParentOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.parent_supplier_id === s.id ? "opacity-100" : "opacity-0")} />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">P/L Account number</Label>
                  <Input value={form.pl_account_number} onChange={(e) => setForm({ ...form, pl_account_number: e.target.value })} />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 1</Label>
                  <Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 2</Label>
                  <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Address line 3</Label>
                  <Input value={form.address_line3} onChange={(e) => setForm({ ...form, address_line3: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Town/City</Label>
                  <Input value={form.town_city} onChange={(e) => setForm({ ...form, town_city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">County</Label>
                  <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 bg-card font-normal">
                        {form.country ? countryName(form.country) : <span className="text-muted-foreground">Select country...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {ISO_COUNTRIES.map((c) => (
                              <CommandItem key={c.code} value={`${c.name} ${c.code}`} onSelect={() => { setForm({ ...form, country: c.code }); setCountryOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", form.country === c.code ? "opacity-100" : "opacity-0")} />
                                {c.name} <span className="ml-auto text-xs text-muted-foreground">{c.code}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postcode</Label>
                  <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Telephone number</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email address</Label>
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Services provided</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "provides_parts", label: "Parts supplier" },
                  { key: "provides_tyres", label: "Tyres" },
                  { key: "provides_workshop", label: "Workshop" },
                ].map((svc) => (
                  <label key={svc.key} className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 cursor-pointer">
                    <Checkbox
                      checked={(form as any)[svc.key]}
                      onCheckedChange={(v) => setForm({ ...form, [svc.key]: !!v })}
                    />
                    <span className="text-sm">{svc.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createSupplier.isPending}>Save supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
