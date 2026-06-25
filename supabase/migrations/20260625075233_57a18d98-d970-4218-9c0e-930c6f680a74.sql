
-- Helper to get user's fleet
CREATE OR REPLACE FUNCTION public.current_user_fleet_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT fleet_id FROM public.profiles WHERE id = auth.uid() $$;

-- BAYS
CREATE TABLE public.bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#0ea5e9',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bays TO authenticated;
GRANT ALL ON public.bays TO service_role;
ALTER TABLE public.bays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_bays_all" ON public.bays FOR ALL TO authenticated
  USING (fleet_id = public.current_user_fleet_id())
  WITH CHECK (fleet_id = public.current_user_fleet_id());
CREATE TRIGGER trg_bays_updated BEFORE UPDATE ON public.bays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TECHNICIANS
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  color text NOT NULL DEFAULT '#f59e0b',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_tech_all" ON public.technicians FOR ALL TO authenticated
  USING (fleet_id = public.current_user_fleet_id())
  WITH CHECK (fleet_id = public.current_user_fleet_id());
CREATE TRIGGER trg_techs_updated BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOP HOURS (one row per fleet per day 0=Sun..6=Sat)
CREATE TABLE public.shop_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '07:30',
  close_time time NOT NULL DEFAULT '17:30',
  lunch_enabled boolean NOT NULL DEFAULT false,
  lunch_start time,
  lunch_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;
GRANT ALL ON public.shop_hours TO service_role;
ALTER TABLE public.shop_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_hours_all" ON public.shop_hours FOR ALL TO authenticated
  USING (fleet_id = public.current_user_fleet_id())
  WITH CHECK (fleet_id = public.current_user_fleet_id());
CREATE TRIGGER trg_hours_updated BEFORE UPDATE ON public.shop_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL,
  bay_id uuid REFERENCES public.bays(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  title text,
  details text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  send_reminder boolean NOT NULL DEFAULT false,
  reminder_phone text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_appts_all" ON public.appointments FOR ALL TO authenticated
  USING (fleet_id = public.current_user_fleet_id())
  WITH CHECK (fleet_id = public.current_user_fleet_id());
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_appts_fleet_start ON public.appointments(fleet_id, starts_at);
CREATE INDEX idx_appts_bay ON public.appointments(bay_id);
CREATE INDEX idx_appts_tech ON public.appointments(technician_id);

-- Seed defaults for every existing fleet
INSERT INTO public.bays (fleet_id, name, color, sort_order)
SELECT f.id, 'Bay ' || g, c, g
FROM public.fleets f
CROSS JOIN LATERAL (VALUES (1,'#0ea5e9'),(2,'#22c55e'),(3,'#f97316')) AS v(g,c)
ON CONFLICT DO NOTHING;

INSERT INTO public.shop_hours (fleet_id, day_of_week, is_open, open_time, close_time)
SELECT f.id, d, CASE WHEN d BETWEEN 1 AND 6 THEN true ELSE false END, '07:30', '17:30'
FROM public.fleets f, generate_series(0,6) d
ON CONFLICT DO NOTHING;
