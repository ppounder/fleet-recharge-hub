import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DefectStatus = "open" | "in-progress" | "resolved" | "cancelled";
export type DefectSeverity = "minor" | "major" | "critical";

export type VehicleDefect = {
  id: string;
  vehicle_id: string;
  job_id: string | null;
  reported_at: string;
  title: string;
  description: string | null;
  severity: DefectSeverity;
  status: DefectStatus;
  reported_by: string | null;
  job?: { id: string; job_number: string; status: string } | null;
};

export function useVehicleDefects(vehicleId?: string) {
  return useQuery({
    queryKey: ["vehicle_defects", vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_defects" as any)
        .select("*, job:jobs(id, job_number, status)")
        .eq("vehicle_id", vehicleId!)
        .order("reported_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VehicleDefect[];
    },
  });
}
