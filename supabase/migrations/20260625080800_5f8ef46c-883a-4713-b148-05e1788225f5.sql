
CREATE OR REPLACE FUNCTION public.set_fleet_id_from_current_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fleet_id IS NULL THEN
    NEW.fleet_id := public.current_user_fleet_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_fleet_id_bays ON public.bays;
CREATE TRIGGER set_fleet_id_bays BEFORE INSERT ON public.bays
FOR EACH ROW EXECUTE FUNCTION public.set_fleet_id_from_current_user();

DROP TRIGGER IF EXISTS set_fleet_id_technicians ON public.technicians;
CREATE TRIGGER set_fleet_id_technicians BEFORE INSERT ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.set_fleet_id_from_current_user();

DROP TRIGGER IF EXISTS set_fleet_id_shop_hours ON public.shop_hours;
CREATE TRIGGER set_fleet_id_shop_hours BEFORE INSERT ON public.shop_hours
FOR EACH ROW EXECUTE FUNCTION public.set_fleet_id_from_current_user();

DROP TRIGGER IF EXISTS set_fleet_id_appointments ON public.appointments;
CREATE TRIGGER set_fleet_id_appointments BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_fleet_id_from_current_user();
