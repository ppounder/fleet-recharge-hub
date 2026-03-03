import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItemPartRow {
  id: string;
  menu_item_id: string;
  part_id: string;
  unit_price: number;
  quantity: number;
  created_at: string;
}

export function useMenuItemParts(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu_item_parts", menuItemId],
    enabled: !!menuItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_parts")
        .select("*")
        .eq("menu_item_id", menuItemId!);
      if (error) throw error;
      return data as MenuItemPartRow[];
    },
  });
}

export function useCreateMenuItemPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { menu_item_id: string; part_id: string; unit_price: number; quantity: number }) => {
      const { data, error } = await supabase.from("menu_item_parts").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["menu_item_parts", vars.menu_item_id] }),
  });
}

export function useUpdateMenuItemPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; menu_item_id: string; unit_price: number; quantity: number }) => {
      const { id, menu_item_id, ...rest } = row;
      const { error } = await supabase.from("menu_item_parts").update(rest).eq("id", id);
      if (error) throw error;
      return { menu_item_id };
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ["menu_item_parts", result.menu_item_id] }),
  });
}

export function useDeleteMenuItemPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; menu_item_id: string }) => {
      const { error } = await supabase.from("menu_item_parts").delete().eq("id", row.id);
      if (error) throw error;
      return { menu_item_id: row.menu_item_id };
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ["menu_item_parts", result.menu_item_id] }),
  });
}
