import { Car, Wrench, Users, FileText, BarChart3, Settings, Shield, CreditCard, Bell, ChevronLeft, ChevronRight, AlertTriangle, ClipboardList, Truck } from "lucide-react";

export type UserRole = "fleet-manager" | "service-provider" | "customer";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  "fleet-manager": [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "Approvals", href: "/approvals", icon: Shield, badge: 12 },
    { label: "Jobs", href: "/jobs", icon: Wrench },
    { label: "Recharges", href: "/recharges", icon: CreditCard, badge: 5 },
    { label: "Fleet", href: "/fleet", icon: Car },
    { label: "Suppliers", href: "/suppliers", icon: Truck },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Compliance", href: "/compliance", icon: AlertTriangle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  "service-provider": [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "Jobs", href: "/jobs", icon: Wrench, badge: 8 },
    { label: "Estimates", href: "/estimates", icon: ClipboardList, badge: 3 },
    { label: "Invoicing", href: "/invoicing", icon: FileText },
    { label: "Menu Items", href: "/menu-items", icon: Settings },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ],
  "customer": [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "My Vehicles", href: "/vehicles", icon: Car },
    { label: "Active Work", href: "/active-work", icon: Wrench },
    { label: "Recharges", href: "/recharges", icon: CreditCard },
    { label: "Invoices", href: "/invoicing", icon: FileText },
    { label: "History", href: "/history", icon: ClipboardList },
  ],
};
