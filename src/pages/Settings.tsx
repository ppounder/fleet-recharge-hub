import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { User, AtSign, Phone, Mail, Bell, LogOut, Pencil } from "lucide-react";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
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
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Settings() {
  const { profile, signOut } = useAuth();
  const [alerts, setAlerts] = useState(false);

  const fullName = profile?.full_name || "User";
  const email = profile?.email || "";
  const username = email ? email.split("@")[0] : "user";

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-4 py-4">
        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(220,60%,18%)] to-[hsl(220,55%,28%)] text-white p-8 flex flex-col items-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">{fullName}</h2>
        </div>

        {/* Details card */}
        <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
          <Row icon={<AtSign className="w-4 h-4" />} label="Username" value={username} onEdit={() => {}} />
          <Row icon={<User className="w-4 h-4" />} label="Name" value={fullName} onEdit={() => {}} />
          <Row icon={<Phone className="w-4 h-4" />} label="Mobile" value="—" onEdit={() => {}} />
          <Row icon={<Mail className="w-4 h-4" />} label="Email" value={email} onEdit={() => {}} />
          <Row
            icon={<Bell className="w-4 h-4" />}
            label="Alerts"
            value={undefined}
            trailing={<Switch checked={alerts} onCheckedChange={setAlerts} />}
          />
        </div>

        {/* Sign out */}
        <Button
          onClick={signOut}
          className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-base font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">App version 1.0.0</p>
      </div>
    </AppLayout>
  );
}
