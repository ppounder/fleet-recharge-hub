import { useJobActivityLog } from "@/hooks/useJobActivityLog";
import { Loader2, User, CheckCircle, Send, ShieldCheck, XCircle, PlusCircle, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

const actionIcons: Record<string, any> = {
  job_created: PlusCircle,
  job_confirmed: CheckCircle,
  estimate_submitted: Send,
  job_approved: ShieldCheck,
  work_item_authorised: ShieldCheck,
  work_item_declined: XCircle,
  work_items_saved: FileText,
  status_changed: Clock,
};

const actionLabels: Record<string, string> = {
  job_created: "Created the booking",
  job_confirmed: "Confirmed the booking",
  estimate_submitted: "Submitted an estimate",
  job_approved: "Approved the job",
  work_item_authorised: "Authorised a work item",
  work_item_declined: "Declined a work item",
  work_items_saved: "Saved work items",
  status_changed: "Changed job status",
};

interface JobHistoryProps {
  jobId: string;
}

export function JobHistory({ jobId }: JobHistoryProps) {
  const { data: logs, isLoading } = useJobActivityLog(jobId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {logs.map((log, idx) => {
          const Icon = actionIcons[log.action] || Clock;
          const label = actionLabels[log.action] || log.action;
          const ts = new Date(log.created_at);

          return (
            <div key={log.id} className="relative flex gap-4 pb-6">
              {/* Icon dot */}
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-background shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{log.user_name || "System"}</span>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>

                {/* Details */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    {log.details.description && (
                      <p>"{log.details.description}"</p>
                    )}
                    {log.details.from_status && log.details.to_status && (
                      <p>
                        Status: <span className="font-medium">{log.details.from_status}</span>
                        {" → "}
                        <span className="font-medium">{log.details.to_status}</span>
                      </p>
                    )}
                    {log.details.total !== undefined && (
                      <p>Total: £{Number(log.details.total).toFixed(2)}</p>
                    )}
                    {log.details.item_count !== undefined && (
                      <p>{log.details.item_count} work item(s)</p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-1">
                  {format(ts, "d MMM yyyy 'at' HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
