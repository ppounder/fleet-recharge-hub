import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type WorkItem = Tables<"work_items">;
export type WorkItemInsert = TablesInsert<"work_items">;

export function useWorkItems(jobId: string | undefined) {
  return useQuery({
    queryKey: ["work_items", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WorkItem[];
    },
  });
}

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: WorkItemInsert) => {
      const { data, error } = await supabase.from("work_items").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["work_items", vars.job_id] }),
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id, ...updates }: { id: string; job_id: string; description?: string; quantity?: number; unit_price?: number; total?: number; rechargeable?: boolean; recharge_reason?: string | null }) => {
      const { data, error } = await supabase.from("work_items").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["work_items", data.job_id] }),
  });
}

export function useDeleteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, job_id }: { id: string; job_id: string }) => {
      const { error } = await supabase.from("work_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["work_items", vars.job_id] }),
  });
}
