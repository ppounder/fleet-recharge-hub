import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/lib/navigation";
import { useNavigate } from "react-router-dom";
import { Bell, User, Moon, Sun, LogOut, UserCog, KeyRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";


const roleLabels: Record<UserRole, string> = {
  "fleet-manager": "Fleet Manager",
  "supplier": "Supplier",
  "customer": "Customer Portal",
};

export function TopBar() {
  const { currentRole, setCurrentRole, darkMode, setDarkMode } = useAppContext();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();


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
            <SelectItem value="supplier">{roleLabels["supplier"]}</SelectItem>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-3 pr-2 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <span className="text-xs font-medium">{profile?.full_name || "User"}</span>
              <User className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{profile?.full_name || "User"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <UserCog className="w-4 h-4 mr-2" /> Change user details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <KeyRound className="w-4 h-4 mr-2" /> Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
