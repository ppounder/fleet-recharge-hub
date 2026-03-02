import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkCodeRow {
  id: string;
  provider_id: string;
  name: string;
  work_category_id: string;
  vat_band_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkCodes(providerId: string | undefined) {
  return useQuery({
    queryKey: ["work_codes", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_codes" as any)
        .select("*")
        .eq("provider_id", providerId!)
        .order("name");
      if (error) throw error;
      return data as unknown as WorkCodeRow[];
    },
  });
}

export function useCreateWorkCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { provider_id: string; name: string; work_category_id: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("work_codes" as any).insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_codes"] }),
  });
}

export function useUpdateWorkCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; work_category_id?: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("work_codes" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_codes"] }),
  });
}

export function useDeleteWorkCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_codes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_codes"] }),
  });
}
