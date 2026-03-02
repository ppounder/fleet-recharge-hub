import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LabourRateRow {
  id: string;
  provider_id: string;
  fleet_id: string;
  name: string;
  cost: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useLabourRates(providerId?: string, fleetId?: string) {
  return useQuery({
    queryKey: ["labour_rates", providerId, fleetId],
    enabled: !!providerId && !!fleetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labour_rates")
        .select("*")
        .eq("provider_id", providerId!)
        .eq("fleet_id", fleetId!)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as LabourRateRow[];
    },
  });
}

export function useCreateLabourRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: { provider_id: string; fleet_id: string; name: string; cost: number; is_default: boolean }) => {
      const { data, error } = await supabase
        .from("labour_rates")
        .insert(rate)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labour_rates"] }),
  });
}

export function useUpdateLabourRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; cost?: number; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from("labour_rates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labour_rates"] }),
  });
}

export function useDeleteLabourRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labour_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labour_rates"] }),
  });
}
