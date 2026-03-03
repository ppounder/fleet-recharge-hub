import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartRow {
  id: string;
  provider_id: string;
  description: string;
  part_number: string;
  vat_band_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useParts(providerId: string | undefined) {
  return useQuery({
    queryKey: ["parts", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("provider_id", providerId!)
        .order("description");
      if (error) throw error;
      return data as PartRow[];
    },
  });
}

export function useCreatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { provider_id: string; description: string; part_number: string; vat_band_id: string | null }) => {
      const { data, error } = await supabase.from("parts").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parts"] }),
  });
}

export function useUpdatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; description: string; part_number: string; vat_band_id: string | null }) => {
      const { id, ...rest } = row;
      const { error } = await supabase.from("parts").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parts"] }),
  });
}

export function useDeletePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parts"] }),
  });
}
