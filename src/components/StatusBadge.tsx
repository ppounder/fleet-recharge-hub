import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  "booked": "Booked",
  "confirmed": "Confirmed",
  "estimated": "Estimated",
  "approved": "Approved",
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "awaiting-sign-off": "Awaiting Sign Off",
  "completed": "Completed",
  "invoiced": "Invoiced",
  "closed": "Closed",
  "pending-review": "Pending Review",
  "declined": "Declined",
  "disputed": "Disputed",
  "settled": "Settled",
  "active": "Active",
  "in-service": "In Service",
  "off-road": "Off Road",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      statusColors[status] || "bg-muted text-muted-foreground",
      className
    )}>
      {statusLabels[status] || status}
    </span>
  );
}
