
-- Service providers table
CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  address text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Fleet managers can manage service providers
CREATE POLICY "Fleet managers can manage service providers"
  ON public.service_providers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'fleet-manager'));

-- Service providers can view own record
CREATE POLICY "Service providers can view own record"
  ON public.service_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
