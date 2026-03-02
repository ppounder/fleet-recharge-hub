import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VatBandRow {
  id: string;
  provider_id: string;
  name: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export function useVatBands(providerId: string | undefined) {
  return useQuery({
    queryKey: ["vat_bands", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_bands")
        .select("*")
        .eq("provider_id", providerId!)
        .order("name");
      if (error) throw error;
      return data as VatBandRow[];
    },
  });
}

export function useCreateVatBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { provider_id: string; name: string; percentage: number }) => {
      const { data, error } = await supabase.from("vat_bands").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vat_bands"] }),
  });
}

export function useUpdateVatBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; percentage?: number }) => {
      const { data, error } = await supabase.from("vat_bands").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vat_bands"] }),
  });
}

export function useDeleteVatBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vat_bands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vat_bands"] }),
  });
}
