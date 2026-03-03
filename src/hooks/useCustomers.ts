import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}
