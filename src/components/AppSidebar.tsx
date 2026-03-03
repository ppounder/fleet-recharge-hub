import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { navItemsByRole, NavItem, UserRole } from "@/lib/navigation";
import { useJobs } from "@/hooks/useJobs";
import { ChevronLeft, ChevronRight, ChevronDown, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  "fleet-manager": "Fleet Manager",
  "supplier": "Supplier",
  customer: "Customer",
};

function NavItemLink({
  item,
  sidebarOpen,
  isActive,
  badgeCounts,
}: {
  item: NavItem;
  sidebarOpen: boolean;
  isActive: boolean;
  badgeCounts: Record<string, number>;
}) {
  const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : item.badge;
  const showBadge = badgeValue != null && badgeValue > 0;

  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative group",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
      {showBadge && sidebarOpen && (
        <Badge className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-[10px] px-1.5 py-0 h-5">
          {badgeValue}
        </Badge>
      )}
      {showBadge && !sidebarOpen && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sidebar-primary" />
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { currentRole, sidebarOpen, setSidebarOpen } = useAppContext();
  const location = useLocation();
  const navItems = navItemsByRole[currentRole];
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const { data: jobs } = useJobs();

  const badgeCounts = useMemo(() => {
    if (!jobs) return {};
    return {
      bookings: jobs.filter((j) => j.status === "booked" || j.status === "confirmed").length,
      approvals: jobs.filter((j) => j.status === "estimated").length,
      activeJobs: jobs.filter((j) => {
        const postApproval = ["approved", "not-started", "in-progress", "awaiting-sign-off", "completed", "invoiced"];
        return postApproval.includes(j.status);
      }).length,
      openJobs: jobs.filter((j) => j.status !== "closed").length,
    };
  }, [jobs]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isChildActive = (item: NavItem) => item.children?.some((child) => location.pathname === child.href) ?? false;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold tracking-tight">MEx 2.0</h1>
            <p className="text-[10px] text-sidebar-muted">{roleLabels[currentRole]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;

          if (item.children && sidebarOpen) {
            const expanded = expandedMenus[item.label] || isChildActive(item);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isChildActive(item)
                      ? "text-sidebar-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="animate-fade-in">{item.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", expanded && "rotate-180")} />
                </button>
                {expanded && (
                  <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
                    {item.children.map((child) => (
                      <NavItemLink
                        key={child.href}
                        item={child}
                        sidebarOpen={sidebarOpen}
                        isActive={location.pathname === child.href}
                        badgeCounts={badgeCounts}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // For collapsed sidebar with children, just show the icon
          if (item.children && !sidebarOpen) {
            return (
              <NavItemLink
                key={item.href}
                item={item}
                sidebarOpen={sidebarOpen}
                isActive={isActive || isChildActive(item)}
                badgeCounts={badgeCounts}
              />
            );
          }

          return (
            <NavItemLink
              key={item.href}
              item={item}
              sidebarOpen={sidebarOpen}
              isActive={isActive}
              badgeCounts={badgeCounts}
            />
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
