import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  iconColor?: string;
}

export function StatCard({ label, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <div className="stat-card-accent rounded-xl p-5 relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className="absolute top-3 right-3">
        <Maximize2 className="w-4 h-4 opacity-60" />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm font-medium opacity-80">{label.toLowerCase()}</p>
        </div>
        {change && (
          <p className="text-xs mt-1.5 opacity-70 font-medium">
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
