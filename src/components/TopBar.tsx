import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/lib/navigation";
import { Bell, User, Moon, Sun, LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const roleLabels: Record<UserRole, string> = {
  "fleet-manager": "Fleet Manager",
  "service-provider": "Service Provider",
  "customer": "Customer Portal",
};

export function TopBar() {
  const { currentRole, setCurrentRole, darkMode, setDarkMode } = useAppContext();
  const { profile, signOut } = useAuth();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-sm font-semibold">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h2>
        <p className="text-xs text-muted-foreground">Thursday, 27 Feb 2026</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Role switcher for demo */}
        <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as UserRole)}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fleet-manager">{roleLabels["fleet-manager"]}</SelectItem>
            <SelectItem value="service-provider">{roleLabels["service-provider"]}</SelectItem>
            <SelectItem value="customer">{roleLabels["customer"]}</SelectItem>
          </SelectContent>
        </Select>

        {/* Dark mode toggle */}
        <div className="flex items-center gap-2">
          <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
            className="scale-75"
          />
          <Moon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>

        <Button variant="ghost" size="sm" onClick={signOut} className="h-8 text-xs text-muted-foreground">
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>
    </header>
  );
}
