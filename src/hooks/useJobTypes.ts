import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobTypeRow {
  id: string;
  provider_id: string;
  name: string;
  vat_band_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobTypes(providerId: string | undefined) {
  return useQuery({
    queryKey: ["job_types", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_types")
        .select("*")
        .eq("provider_id", providerId!)
        .order("name");
      if (error) throw error;
      return data as JobTypeRow[];
    },
  });
}

export function useCreateJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { provider_id: string; name: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("job_types").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_types"] }),
  });
}

export function useUpdateJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("job_types").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_types"] }),
  });
}

export function useDeleteJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_types"] }),
  });
}
