import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Recharge = Tables<"recharges">;

export function useRecharges() {
  return useQuery({
    queryKey: ["recharges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recharges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recharge[];
    },
  });
}
