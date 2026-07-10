
-- 1. Move SECURITY DEFINER helper functions to a private schema so they're not exposed via the API
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.get_user_role(uuid) SET SCHEMA private;
ALTER FUNCTION public.vehicle_belongs_to_customer(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.vehicle_customer_is_user(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.current_user_fleet_id() SET SCHEMA private;
ALTER FUNCTION public.update_updated_at_column() SET SCHEMA private;
ALTER FUNCTION public.ensure_single_default_labour_rate() SET SCHEMA private;
ALTER FUNCTION public.set_fleet_id_from_current_user() SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.vehicle_belongs_to_customer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.vehicle_customer_is_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.current_user_fleet_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.update_updated_at_column() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.ensure_single_default_labour_rate() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.set_fleet_id_from_current_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC, anon;

-- 2. vehicles: replace permissive policy with fleet-scoped access
DROP POLICY IF EXISTS "Authenticated can manage vehicles" ON public.vehicles;
CREATE POLICY "Fleet managers can manage fleet vehicles"
  ON public.vehicles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::public.app_role)
         AND fleet_id = private.current_user_fleet_id())
  WITH CHECK (private.has_role(auth.uid(), 'fleet-manager'::public.app_role)
              AND fleet_id = private.current_user_fleet_id());

-- 3. tyres: scope to accessible vehicles
DROP POLICY IF EXISTS "Authenticated can view tyres" ON public.tyres;
DROP POLICY IF EXISTS "Authenticated can insert tyres" ON public.tyres;
DROP POLICY IF EXISTS "Authenticated can update tyres" ON public.tyres;
DROP POLICY IF EXISTS "Authenticated can delete tyres" ON public.tyres;
CREATE POLICY "Users can manage tyres for accessible vehicles"
  ON public.tyres FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = tyres.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = tyres.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ));

-- 4. tyre_position_changes: same scoping
DROP POLICY IF EXISTS "Authenticated can view tyre position changes" ON public.tyre_position_changes;
DROP POLICY IF EXISTS "Authenticated can insert tyre position changes" ON public.tyre_position_changes;
DROP POLICY IF EXISTS "Authenticated can update tyre position changes" ON public.tyre_position_changes;
DROP POLICY IF EXISTS "Authenticated can delete tyre position changes" ON public.tyre_position_changes;
CREATE POLICY "Users can manage tyre position changes for accessible vehicles"
  ON public.tyre_position_changes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = tyre_position_changes.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = tyre_position_changes.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ));

-- 5. odometer_readings: same scoping
DROP POLICY IF EXISTS "Authenticated users can view odometer readings" ON public.odometer_readings;
DROP POLICY IF EXISTS "Authenticated users can insert odometer readings" ON public.odometer_readings;
DROP POLICY IF EXISTS "Authenticated users can update odometer readings" ON public.odometer_readings;
DROP POLICY IF EXISTS "Authenticated users can delete odometer readings" ON public.odometer_readings;
CREATE POLICY "Users can manage odometer readings for accessible vehicles"
  ON public.odometer_readings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = odometer_readings.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = odometer_readings.vehicle_id
      AND (
        (private.has_role(auth.uid(), 'fleet-manager'::public.app_role) AND v.fleet_id = private.current_user_fleet_id())
        OR private.vehicle_customer_is_user(v.customer_id, auth.uid())
        OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.suppliers sp ON sp.id = j.provider_id
                   WHERE j.vehicle_id = v.id AND sp.user_id = auth.uid())
      )
  ));

-- 6. suppliers: remove permissive policy, restrict to fleet-manager and self
DROP POLICY IF EXISTS "Authenticated can manage suppliers" ON public.suppliers;
CREATE POLICY "Fleet managers can manage suppliers"
  ON public.suppliers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'fleet-manager'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'fleet-manager'::public.app_role));
CREATE POLICY "Suppliers can update own record"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. invoices: fix supplier policy to join through suppliers.user_id
DROP POLICY IF EXISTS "Suppliers can manage own invoices" ON public.invoices;
CREATE POLICY "Suppliers can manage own invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s
                 WHERE s.id = invoices.provider_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s
                 WHERE s.id = invoices.provider_id AND s.user_id = auth.uid()));

-- 8. job_activity_log: tighten INSERT to require job access + add customer SELECT
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.job_activity_log;
CREATE POLICY "Users can insert activity logs for accessible jobs"
  ON public.job_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_activity_log.job_id
        AND (
          (private.has_role(auth.uid(), 'fleet-manager'::public.app_role)
             AND j.fleet_id = private.current_user_fleet_id())
          OR EXISTS (SELECT 1 FROM public.suppliers sp WHERE sp.id = j.provider_id AND sp.user_id = auth.uid())
          OR private.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
        )
    )
  );
CREATE POLICY "Customers can view job activity logs"
  ON public.job_activity_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_activity_log.job_id
      AND private.vehicle_belongs_to_customer(j.vehicle_id, auth.uid())
  ));

-- 9. job_comments: force user_name to be derived server-side from profiles
CREATE OR REPLACE FUNCTION private.set_job_comment_user_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text;
BEGIN
  NEW.user_id := auth.uid();
  SELECT COALESCE(NULLIF(full_name, ''), email, 'Unknown')
    INTO resolved_name
    FROM public.profiles WHERE id = auth.uid();
  NEW.user_name := COALESCE(resolved_name, 'Unknown');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.set_job_comment_user_name() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS set_job_comment_user_name_trg ON public.job_comments;
CREATE TRIGGER set_job_comment_user_name_trg
BEFORE INSERT ON public.job_comments
FOR EACH ROW EXECUTE FUNCTION private.set_job_comment_user_name();
