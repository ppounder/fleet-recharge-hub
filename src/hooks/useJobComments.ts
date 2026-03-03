import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobComment {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export function useJobComments(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job_comments", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_comments")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as JobComment[];
    },
  });
}

export function useCreateJobComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: {
      job_id: string;
      user_id: string;
      user_name: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("job_comments")
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["job_comments", data.job_id] }),
  });
}
