
-- 1. SMR tables: replace `true` policies with role-scoped access
DROP POLICY IF EXISTS "smr_items authenticated all" ON public.smr_items;
CREATE POLICY "smr_items select authenticated" ON public.smr_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "smr_items write supplier or fleet manager" ON public.smr_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role));

DROP POLICY IF EXISTS "smr_work_details authenticated all" ON public.smr_work_details;
CREATE POLICY "smr_work_details select authenticated" ON public.smr_work_details
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "smr_work_details write supplier or fleet manager" ON public.smr_work_details
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role));

DROP POLICY IF EXISTS "Authenticated can view smr part details" ON public.smr_part_details;
DROP POLICY IF EXISTS "Authenticated can insert smr part details" ON public.smr_part_details;
DROP POLICY IF EXISTS "Authenticated can update smr part details" ON public.smr_part_details;
DROP POLICY IF EXISTS "Authenticated can delete smr part details" ON public.smr_part_details;
CREATE POLICY "smr_part_details select authenticated" ON public.smr_part_details
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "smr_part_details write supplier or fleet manager" ON public.smr_part_details
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'supplier'::app_role) OR private.has_role(auth.uid(), 'fleet-manager'::app_role));

-- 2. Remove overly permissive SELECT `true` on reference tables
DROP POLICY IF EXISTS "Authenticated users can view manufacturers" ON public.part_manufacturers;
DROP POLICY IF EXISTS "Authenticated users can view supplier networks" ON public.supplier_networks;
DROP POLICY IF EXISTS "Authenticated users can view vat bands" ON public.vat_bands;

-- Allow authenticated users to view standard (system-wide) VAT bands with no provider
CREATE POLICY "Anyone authenticated can view standard vat bands" ON public.vat_bands
  FOR SELECT TO authenticated
  USING (provider_id IS NULL);

-- Allow customers to view manufacturers (needed by Customer portal Parts screen)
CREATE POLICY "Customers can view manufacturers" ON public.part_manufacturers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'customer'::app_role));

-- Allow suppliers/fleet-managers/customers to view supplier networks
CREATE POLICY "Roles can view supplier networks" ON public.supplier_networks
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'supplier'::app_role)
    OR private.has_role(auth.uid(), 'fleet-manager'::app_role)
    OR private.has_role(auth.uid(), 'customer'::app_role)
  );

-- 3. Technicians: hide credential columns from clients
REVOKE SELECT (password_hash, pin_hash, pin), UPDATE (password_hash, pin_hash, pin) ON public.technicians FROM authenticated;
REVOKE SELECT (password_hash, pin_hash, pin), UPDATE (password_hash, pin_hash, pin) ON public.technicians FROM anon;

-- 4. Lock down SECURITY DEFINER functions: revoke PUBLIC, grant only authenticated
REVOKE EXECUTE ON FUNCTION public.set_technician_credentials(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_technician_password(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlock_technician_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_technician_credentials(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_technician_password(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_technician_account(uuid) TO authenticated;
