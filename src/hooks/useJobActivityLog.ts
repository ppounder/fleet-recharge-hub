import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobActivityLog {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export function useJobActivityLog(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job_activity_log", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_activity_log")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobActivityLog[];
    },
  });
}

export function useLogJobActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      job_id: string;
      user_id: string;
      user_name: string;
      action: string;
      details?: Record<string, any>;
    }) => {
      const { error } = await supabase.from("job_activity_log").insert({
        job_id: entry.job_id,
        user_id: entry.user_id,
        user_name: entry.user_name,
        action: entry.action,
        details: entry.details || {},
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["job_activity_log", vars.job_id] }),
  });
}
