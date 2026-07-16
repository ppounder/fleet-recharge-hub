import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles, useCreateVehicle } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/* ---------------- Customer ---------------- */
export function CustomerPicker({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string;
}) {

  const { data: customers = [] } = useCustomers();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const selected = customers.find(c => c.id === value);

  const handleCreate = async () => {
    if (!name.trim()) { setErr("Required"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({ name: name.trim(), contact_email: email || null, contact_phone: phone || null })
      .select()
      .single();
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["customers"] });
    onChange(data.id);
    toast({ title: "Customer added" });
    setCreateOpen(false);
    setName(""); setEmail(""); setPhone(""); setErr("");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">Customer *</Label>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="secondary">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search customers..." />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {customers.map(c => (
                    <CommandItem key={c.id} value={c.name + " " + c.id} onSelect={() => { onChange(c.id); setSearchOpen(false); }}>
                      {c.name}
                    </CommandItem>
                  ))}
                  {value && (
                    <CommandItem onSelect={() => { onChange(null); setSearchOpen(false); }}>
                      Clear selection
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className={`text-sm truncate min-h-[1.25rem] ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error ? error : selected ? selected.name : "No customer selected"}
      </p>


      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} aria-invalid={!!err} className={err ? "border-destructive" : ""} />
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Vehicle ---------------- */
export function VehiclePicker({
  value,
  onChange,
  customerId,
  onCustomerChange,
  error,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  customerId: string | null;
  onCustomerChange?: (id: string | null) => void;
  error?: string;
}) {

  const { data: vehicles = [] } = useVehicles();
  const { data: customers = [] } = useCustomers();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const create = useCreateVehicle();

  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [newCustomerId, setNewCustomerId] = useState<string>("__none__");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = customerId ? vehicles.filter(v => v.customer_id === customerId) : vehicles;
  const selected = vehicles.find(v => v.id === value);

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
        make, model,
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
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">Vehicle *</Label>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="secondary">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search registration, make, model..." />
              <CommandList>
                <CommandEmpty>No vehicles found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map(v => (
                    <CommandItem
                      key={v.id}
                      value={`${v.registration ?? ""} ${v.make ?? ""} ${v.model ?? ""} ${v.id}`}
                      onSelect={() => { onChange(v.id); setSearchOpen(false); }}
                    >
                      <span className="font-medium">{v.registration ?? v.fleet_number ?? v.id.slice(0,8)}</span>
                      {(v.make || v.model) && <span className="ml-2 text-muted-foreground text-xs">{v.make} {v.model}</span>}
                    </CommandItem>
                  ))}
                  {value && (
                    <CommandItem onSelect={() => { onChange(null); setSearchOpen(false); }}>
                      Clear selection
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className={`text-sm truncate min-h-[1.25rem] ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error
          ? error
          : selected
            ? `${selected.registration ?? selected.fleet_number ?? selected.id.slice(0,8)}${selected.make || selected.model ? ` — ${selected.make ?? ""} ${selected.model ?? ""}`.trimEnd() : ""}`
            : "No vehicle selected"}
      </p>


      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New vehicle</DialogTitle></DialogHeader>
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
    </div>
  );
}
