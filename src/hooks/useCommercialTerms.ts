import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommercialTermRow {
  id: string;
  provider_id: string;
  fleet_id: string;
  start_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useCommercialTerms() {
  return useQuery({
    queryKey: ["commercial_terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_terms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommercialTermRow[];
    },
  });
}

export function useCreateCommercialTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (term: { provider_id: string; fleet_id: string; start_date: string }) => {
      const { data, error } = await supabase
        .from("commercial_terms")
        .insert(term)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commercial_terms"] }),
  });
}

export function useDeleteCommercialTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commercial_terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commercial_terms"] }),
  });
}
