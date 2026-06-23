import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, AtSign, Phone, Mail, Bell, LogOut, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onEdit?: () => void;
  trailing?: React.ReactNode;
}

function Row({ icon, label, value, onEdit, trailing }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
      <span className="text-primary/70">{icon}</span>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      {value !== undefined && (
        <span className="text-sm font-medium text-foreground">{value}</span>
      )}
      {trailing}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1 ml-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Settings() {
  const { profile, user, signOut } = useAuth();
  const [alerts, setAlerts] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fullName = profile?.full_name || "";
  const email = profile?.email || "";
  const [first, last] = fullName.split(" ");
  const username = email ? email.split("@")[0] : "user";

  const [form, setForm] = useState({
    username,
    firstName: first || "",
    lastName: last || "",
    mobile: "",
    email,
    alerts: false,
  });

  const openEdit = () => {
    setForm({
      username,
      firstName: first || "",
      lastName: last || "",
      mobile: "",
      email,
      alerts,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const newFullName = `${form.firstName} ${form.lastName}`.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: newFullName, email: form.email })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    setAlerts(form.alerts);
    toast({ title: "Profile updated" });
    setOpen(false);
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,60%,18%)] to-[hsl(220,55%,28%)] text-white p-8 flex flex-col items-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">{fullName || "User"}</h2>
        </div>

        <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
          <Row icon={<AtSign className="w-4 h-4" />} label="Username" value={username} onEdit={openEdit} />
          <Row icon={<User className="w-4 h-4" />} label="Name" value={fullName || "—"} onEdit={openEdit} />
          <Row icon={<Phone className="w-4 h-4" />} label="Mobile" value="—" onEdit={openEdit} />
          <Row icon={<Mail className="w-4 h-4" />} label="Email" value={email} onEdit={openEdit} />
          <Row
            icon={<Bell className="w-4 h-4" />}
            label="Alerts"
            trailing={<Switch checked={alerts} onCheckedChange={setAlerts} />}
          />
        </div>

        <Button
          onClick={signOut}
          className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-base font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">App version 1.0.0</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change user details</DialogTitle>
            <DialogDescription>Update your profile information below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Alerts</p>
                <p className="text-xs text-muted-foreground">Receive notifications by email</p>
              </div>
              <Switch
                checked={form.alerts}
                onCheckedChange={(v) => setForm({ ...form, alerts: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
