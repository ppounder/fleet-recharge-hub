import { authStatusSteps, workStatusSteps } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface JobProgressProps {
  currentStatus: string;
}

const stepLabels: Record<string, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  estimated: "Estimated",
  approved: "Approved",
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "awaiting-sign-off": "Awaiting Sign Off",
  completed: "Completed",
  invoiced: "Invoiced",
  closed: "Closed",
};

export function JobProgress({ currentStatus }: JobProgressProps) {
  const isInWorkPhase =
    workStatusSteps.includes(currentStatus as any) ||
    currentStatus === "approved";

  if (isInWorkPhase) {
    // Show "Authorised" label + work status steps
    const workIndex = workStatusSteps.indexOf(currentStatus as any);
    // If status is "approved", work hasn't started yet so nothing is done
    const effectiveWorkIndex = currentStatus === "approved" ? -1 : workIndex;

    return (
      <div className="flex items-center gap-1 w-full">
        {/* Authorised badge */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-success text-success-foreground">
            <Check className="w-3 h-3" />
          </div>
          <span className="text-[9px] mt-1 text-center leading-tight font-semibold text-foreground">
            Authorised
          </span>
        </div>
        <div className="h-0.5 w-3 mx-0.5 rounded bg-success shrink-0" />

        {/* Work status steps */}
        {workStatusSteps.map((step, i) => {
          const isDone = i <= effectiveWorkIndex;
          const isNext = i === effectiveWorkIndex + 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                    isDone && "bg-success text-success-foreground",
                    !isDone && isNext && "bg-accent text-accent-foreground ring-2 ring-accent/30",
                    !isDone && !isNext && "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn(
                  "text-[9px] mt-1 text-center leading-tight",
                  (isDone || isNext) ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {stepLabels[step]}
                </span>
              </div>
              {i < workStatusSteps.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-0.5 rounded",
                  isDone ? "bg-success" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Authorisation phase - show only auth steps
  const currentIndex = authStatusSteps.indexOf(currentStatus as any);

  return (
    <div className="flex items-center gap-1 w-full">
      {authStatusSteps.map((step, i) => {
        const isDone = i <= currentIndex;
        const isNext = i === currentIndex + 1;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                  isDone && "bg-success text-success-foreground",
                  !isDone && isNext && "bg-accent text-accent-foreground ring-2 ring-accent/30",
                  !isDone && !isNext && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                "text-[9px] mt-1 text-center leading-tight",
                (isDone || isNext) ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {stepLabels[step]}
              </span>
            </div>
            {i < authStatusSteps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-0.5 rounded",
                isDone ? "bg-success" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
