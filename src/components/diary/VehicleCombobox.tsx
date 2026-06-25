import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles, useCreateVehicle } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  customerId?: string | null;
  onCustomerChange?: (id: string | null) => void;
}

export function VehicleCombobox({ value, onChange, customerId, onCustomerChange }: Props) {
  const { data: vehicles = [] } = useVehicles();
  const { data: customers = [] } = useCustomers();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const create = useCreateVehicle();

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [newCustomerId, setNewCustomerId] = useState<string>("__none__");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = customerId ? vehicles.filter(v => v.customer_id === customerId) : vehicles;
  const selected = vehicles.find(v => v.id === value);
  const label = selected ? (selected.registration ?? selected.fleet_number ?? selected.id.slice(0, 8)) : "Select vehicle";

  const handleCreate = async () => {
    const e: Record<string, string> = {};
    if (!registration.trim()) e.registration = "Required";
    if (!make.trim()) e.make = "Required";
    if (!model.trim()) e.model = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const v = await create.mutateAsync({
        registration: registration.toUpperCase(),
        make,
        model,
        year: year ? parseInt(year) : null,
        customer_id: newCustomerId === "__none__" ? (customerId ?? null) : newCustomerId,
        fleet_manager_id: user?.id ?? null,
        fleet_id: profile?.fleet_id ?? null,
      });
      toast({ title: "Vehicle added" });
      onChange(v.id);
      if (v.customer_id && onCustomerChange) onCustomerChange(v.customer_id);
      setCreateOpen(false);
      setRegistration(""); setMake(""); setModel(""); setYear(""); setNewCustomerId("__none__");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={cn(!selected && "text-muted-foreground")}>{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search registration, make, model..." />
            <CommandList>
              <CommandEmpty>No vehicles found.</CommandEmpty>
              <CommandGroup>
                {filtered.map(v => {
                  const text = `${v.registration ?? ""} ${v.make ?? ""} ${v.model ?? ""} ${v.fleet_number ?? ""}`.trim();
                  return (
                    <CommandItem
                      key={v.id}
                      value={text + " " + v.id}
                      onSelect={() => { onChange(v.id); setOpen(false); }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === v.id ? "opacity-100" : "opacity-0")} />
                      <span className="font-medium">{v.registration ?? v.fleet_number ?? v.id.slice(0,8)}</span>
                      {(v.make || v.model) && <span className="ml-2 text-muted-foreground text-xs">{v.make} {v.model}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => { setOpen(false); setCreateOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Create new vehicle
                </CommandItem>
                {value && (
                  <CommandItem onSelect={() => { onChange(null); setOpen(false); }}>
                    Clear selection
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Registration *</Label>
                <Input value={registration} onChange={(e) => setRegistration(e.target.value)} aria-invalid={!!errors.registration} className={errors.registration ? "border-destructive" : ""} />
                {errors.registration && <p className="text-sm text-destructive">{errors.registration}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Make *</Label>
                <Input value={make} onChange={(e) => setMake(e.target.value)} aria-invalid={!!errors.make} className={errors.make ? "border-destructive" : ""} />
                {errors.make && <p className="text-sm text-destructive">{errors.make}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Model *</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} aria-invalid={!!errors.model} className={errors.model ? "border-destructive" : ""} />
                {errors.model && <p className="text-sm text-destructive">{errors.model}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
