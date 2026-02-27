import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useServiceProviders() {
  return useQuery({
    queryKey: ["service_providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
