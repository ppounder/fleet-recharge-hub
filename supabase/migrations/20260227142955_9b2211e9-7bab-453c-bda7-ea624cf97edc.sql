
-- Auto-assign fleet-manager role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  -- Auto-assign fleet-manager role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'fleet-manager');
  
  RETURN NEW;
END;
$$;

-- Assign fleet-manager role to any existing users who don't have a role yet
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'fleet-manager'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL;
