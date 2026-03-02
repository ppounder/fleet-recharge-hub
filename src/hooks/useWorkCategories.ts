import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkCategoryRow {
  id: string;
  provider_id: string;
  name: string;
  vat_band_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkCategories(providerId: string | undefined) {
  return useQuery({
    queryKey: ["work_categories", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_categories")
        .select("*")
        .eq("provider_id", providerId!)
        .order("name");
      if (error) throw error;
      return data as WorkCategoryRow[];
    },
  });
}

export function useCreateWorkCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { provider_id: string; name: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("work_categories").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_categories"] }),
  });
}

export function useUpdateWorkCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; vat_band_id?: string | null }) => {
      const { data, error } = await supabase.from("work_categories").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_categories"] }),
  });
}

export function useDeleteWorkCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_categories"] }),
  });
}
