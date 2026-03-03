import { cn } from "@/lib/utils";

interface UKNumberPlateProps {
  registration: string;
  className?: string;
}

export function UKNumberPlate({ registration, className }: UKNumberPlateProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded border border-black/80 bg-[#FFD700] text-black font-bold font-mono text-xs uppercase tracking-wider whitespace-nowrap",
        className
      )}
    >
      {registration}
    </span>
  );
}
