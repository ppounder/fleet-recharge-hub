import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItemRow {
  id: string;
  provider_id: string;
  fleet_id: string;
  job_type: string;
  work_code_id: string | null;
  description: string;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export function useMenuItems() {
  return useQuery({
    queryKey: ["provider_menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_menu_items")
        .select("*")
        .order("job_type");
      if (error) throw error;
      return data as MenuItemRow[];
    },
  });
}

export function useMenuItemsByProviderAndFleet(providerId: string | undefined, fleetId: string | undefined) {
  return useQuery({
    queryKey: ["provider_menu_items", providerId, fleetId],
    enabled: !!providerId && !!fleetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_menu_items")
        .select("*")
        .eq("provider_id", providerId!)
        .eq("fleet_id", fleetId!);
      if (error) throw error;
      return data as MenuItemRow[];
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { provider_id: string; fleet_id: string; job_type: string; work_code_id?: string | null; description: string; unit_price: number }) => {
      const { data, error } = await supabase.from("provider_menu_items").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_menu_items"] }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; unit_price?: number; description?: string; job_type?: string; work_code_id?: string | null }) => {
      const { data, error } = await supabase.from("provider_menu_items").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_menu_items"] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_menu_items"] }),
  });
}
