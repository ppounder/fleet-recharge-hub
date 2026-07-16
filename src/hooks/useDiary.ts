import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Bay = {
  id: string;
  fleet_id: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
};

export type Technician = {
  id: string;
  fleet_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  color: string;
  active: boolean;
  sort_order: number;
};

export type ShopHour = {
  id: string;
  fleet_id: string;
  day_of_week: number; // 0=Sun
  is_open: boolean;
  open_time: string; // HH:MM:SS
  close_time: string;
  lunch_enabled: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
};

export type Appointment = {
  id: string;
  fleet_id: string;
  bay_id: string | null;
  technician_id: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  job_id: string | null;
  title: string | null;
  details: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  send_reminder: boolean;
  reminder_phone: string | null;
  status: string;
};

const T = supabase as any;

export function useBays() {
  return useQuery({
    queryKey: ["bays"],
    queryFn: async () => {
      const { data, error } = await T.from("bays").select("*").order("sort_order");
      if (error) throw error;
      return data as Bay[];
    },
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await T.from("technicians").select("*").order("sort_order").order("last_name");
      if (error) throw error;
      return data as Technician[];
    },
  });
}

export function useShopHours() {
  return useQuery({
    queryKey: ["shop_hours"],
    queryFn: async () => {
      const { data, error } = await T.from("shop_hours").select("*").order("day_of_week");
      if (error) throw error;
      return data as ShopHour[];
    },
  });
}

export function useAppointments(rangeStart: Date, rangeEnd: Date) {
  return useQuery({
    queryKey: ["appointments", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await T.from("appointments")
        .select("*")
        .gte("starts_at", rangeStart.toISOString())
        .lt("starts_at", rangeEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useUpsertBay() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (b: Partial<Bay> & { id?: string }) => {
      const payload = { ...b, fleet_id: b.fleet_id ?? profile?.fleet_id };
      const { data, error } = await T.from("bays").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bays"] }),
  });
}

export function useDeleteBay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await T.from("bays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bays"] }),
  });
}

export function useUpsertTechnician() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (t: Partial<Technician> & { id?: string }) => {
      const payload = { ...t, fleet_id: t.fleet_id ?? profile?.fleet_id };
      const { data, error } = await T.from("technicians").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technicians"] }),
  });
}

export function useDeleteTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await T.from("technicians").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["technicians"] }),
  });
}

export function useUpsertShopHour() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (h: Partial<ShopHour> & { day_of_week: number }) => {
      const payload = { ...h, fleet_id: h.fleet_id ?? profile?.fleet_id };
      const { data, error } = await T.from("shop_hours")
        .upsert(payload, { onConflict: "fleet_id,day_of_week" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop_hours"] }),
  });
}

export function useUpsertAppointment() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (a: Partial<Appointment> & { id?: string }) => {
      const payload: any = {
        ...a,
        fleet_id: a.fleet_id ?? profile?.fleet_id,
      };
      if (!a.id) payload.created_by = user?.id;
      const { data, error } = await T.from("appointments").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await T.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}
