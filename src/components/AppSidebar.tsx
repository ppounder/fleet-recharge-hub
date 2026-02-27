import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { navItemsByRole, UserRole } from "@/lib/navigation";
import { ChevronLeft, ChevronRight, Bell, User, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  "fleet-manager": "Fleet Manager",
  "service-provider": "Service Provider",
  "customer": "Customer",
};

export function AppSidebar() {
  const { currentRole, sidebarOpen, setSidebarOpen } = useAppContext();
  const location = useLocation();
  const navItems = navItemsByRole[currentRole];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold tracking-tight">FleetLink SMR</h1>
            <p className="text-[10px] text-sidebar-muted">{roleLabels[currentRole]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
              {item.badge && sidebarOpen && (
                <Badge className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-[10px] px-1.5 py-0 h-5">
                  {item.badge}
                </Badge>
              )}
              {item.badge && !sidebarOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="mx-2 mb-4 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-muted"
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
}
