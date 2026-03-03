import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItemLabourRow {
  id: string;
  menu_item_id: string;
  labour_rate_id: string;
  units: number;
  created_at: string;
}

export function useMenuItemLabour(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu_item_labour", menuItemId],
    enabled: !!menuItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_labour")
        .select("*")
        .eq("menu_item_id", menuItemId!)
        .order("created_at");
      if (error) throw error;
      return data as MenuItemLabourRow[];
    },
  });
}

export function useCreateMenuItemLabour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { menu_item_id: string; labour_rate_id: string; units: number }) => {
      const { data, error } = await supabase
        .from("menu_item_labour")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["menu_item_labour", vars.menu_item_id] });
      qc.invalidateQueries({ queryKey: ["menu_item_labour_bulk"] });
    },
  });
}

export function useUpdateMenuItemLabour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, menu_item_id, ...updates }: { id: string; menu_item_id: string; units?: number; labour_rate_id?: string }) => {
      const { data, error } = await supabase
        .from("menu_item_labour")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["menu_item_labour", vars.menu_item_id] });
      qc.invalidateQueries({ queryKey: ["menu_item_labour_bulk"] });
    },
  });
}

export function useDeleteMenuItemLabour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, menu_item_id }: { id: string; menu_item_id: string }) => {
      const { error } = await supabase.from("menu_item_labour").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["menu_item_labour", vars.menu_item_id] });
      qc.invalidateQueries({ queryKey: ["menu_item_labour_bulk"] });
    },
  });
}
