import {
  Car,
  Wrench,
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  CreditCard,
  Bell,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
  Truck,
  Handshake,
  ListChecks,
  Percent,
  Package,
} from "lucide-react";

export type UserRole = "fleet-manager" | "supplier" | "customer";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeKey?: string;
  children?: NavItem[];
}

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  "fleet-manager": [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "Bookings", href: "/bookings", icon: ClipboardList, badgeKey: "bookings" },
    { label: "Approvals", href: "/approvals", icon: Shield, badgeKey: "approvals" },
    { label: "Jobs", href: "/jobs", icon: Wrench, badgeKey: "activeJobs" },
    { label: "Recharges", href: "/recharges", icon: CreditCard, badge: 5 },
    { label: "Fleet", href: "/fleet", icon: Car },
    { label: "Suppliers", href: "/suppliers", icon: Truck },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  "supplier": [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "Bookings and Jobs", href: "/jobs", icon: Wrench, badgeKey: "openJobs" },
    { label: "Invoicing", href: "/invoicing", icon: FileText },
    { label: "Commercial Terms", href: "/commercial-terms", icon: Handshake },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      children: [
        { label: "Work Categories", href: "/settings/work-categories", icon: ListChecks },
        { label: "Work Codes", href: "/settings/work-codes", icon: ListChecks },
        { label: "Parts", href: "/settings/parts", icon: Package },
        { label: "VAT Bands", href: "/settings/vat-bands", icon: Percent },
      ],
    },
  ],
  customer: [
    { label: "Dashboard", href: "/", icon: BarChart3 },
    { label: "My Vehicles", href: "/vehicles", icon: Car },
    { label: "Active Work", href: "/active-work", icon: Wrench },
    { label: "Recharges", href: "/recharges", icon: CreditCard },
    { label: "Invoices", href: "/invoicing", icon: FileText },
    { label: "History", href: "/history", icon: ClipboardList },
  ],
};
