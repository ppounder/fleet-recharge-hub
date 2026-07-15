
CREATE OR REPLACE FUNCTION private.customer_can_view_supplier(_supplier_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.customers c ON c.id = j.customer_id
    WHERE j.provider_id = _supplier_id AND c.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION private.customer_can_view_supplier(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.customer_can_view_supplier(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Customers can view suppliers on their jobs" ON public.suppliers;

CREATE POLICY "Customers can view suppliers on their jobs"
  ON public.suppliers FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'customer'::app_role)
    AND private.customer_can_view_supplier(suppliers.id, auth.uid())
  );
