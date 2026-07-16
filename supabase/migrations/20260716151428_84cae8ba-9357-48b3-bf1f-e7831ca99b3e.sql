
-- Helper: verify caller shares the fleet of the technician
CREATE OR REPLACE FUNCTION private.caller_can_manage_technician(_tech_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.technicians t
    JOIN public.profiles p ON p.fleet_id = t.fleet_id
    WHERE t.id = _tech_id
      AND p.id = auth.uid()
  );
$$;

-- Set username / password / pin (any subset). Password + PIN are bcrypt-hashed.
CREATE OR REPLACE FUNCTION public.set_technician_credentials(
  _tech_id UUID,
  _username TEXT DEFAULT NULL,
  _password TEXT DEFAULT NULL,
  _pin TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT private.caller_can_manage_technician(_tech_id) THEN
    RAISE EXCEPTION 'Not authorised for this technician';
  END IF;

  IF _password IS NOT NULL AND length(_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  IF _pin IS NOT NULL AND (length(_pin) < 4 OR _pin !~ '^[0-9]+$') THEN
    RAISE EXCEPTION 'PIN must be numeric and at least 4 digits';
  END IF;

  UPDATE public.technicians
  SET
    username = COALESCE(_username, username),
    password_hash = CASE WHEN _password IS NULL THEN password_hash ELSE crypt(_password, gen_salt('bf', 10)) END,
    pin_hash = CASE WHEN _pin IS NULL THEN pin_hash ELSE crypt(_pin, gen_salt('bf', 10)) END,
    pin = CASE WHEN _pin IS NULL THEN pin ELSE NULL END
  WHERE id = _tech_id;
END;
$$;

-- Reset password: generates a temporary password, hashes it, returns the plaintext ONCE so it can be shared.
CREATE OR REPLACE FUNCTION public.reset_technician_password(_tech_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  temp_password TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT private.caller_can_manage_technician(_tech_id) THEN
    RAISE EXCEPTION 'Not authorised for this technician';
  END IF;

  temp_password := encode(gen_random_bytes(6), 'base64');
  temp_password := replace(replace(replace(temp_password, '/', 'A'), '+', 'B'), '=', '');

  UPDATE public.technicians
  SET password_hash = crypt(temp_password, gen_salt('bf', 10)),
      failed_login_attempts = 0,
      password_reset_expires_at = now() + interval '24 hours'
  WHERE id = _tech_id;

  RETURN temp_password;
END;
$$;

-- Unlock account (reset failed attempts, set active)
CREATE OR REPLACE FUNCTION public.unlock_technician_account(_tech_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT private.caller_can_manage_technician(_tech_id) THEN
    RAISE EXCEPTION 'Not authorised for this technician';
  END IF;

  UPDATE public.technicians
  SET failed_login_attempts = 0,
      status = CASE WHEN status = 'account_locked' THEN 'active' ELSE status END,
      active = CASE WHEN status = 'account_locked' THEN true ELSE active END
  WHERE id = _tech_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_technician_credentials(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_technician_password(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_technician_account(UUID) TO authenticated;
