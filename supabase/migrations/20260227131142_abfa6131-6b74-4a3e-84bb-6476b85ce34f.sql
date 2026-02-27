
-- Role enum
CREATE TYPE public.app_role AS ENUM ('fleet-manager', 'service-provider', 'customer');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  company_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  vin TEXT,
  mileage INT,
  next_service DATE,
  mot_due DATE,
  status TEXT NOT NULL DEFAULT 'active',
  fleet_manager_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_reg TEXT NOT NULL,
  vehicle_make_model TEXT,
  type TEXT NOT NULL DEFAULT 'maintenance',
  status TEXT NOT NULL DEFAULT 'reported',
  provider_id UUID REFERENCES auth.users(id),
  fleet_manager_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES auth.users(id),
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  estimate_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoice_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  has_recharge BOOLEAN NOT NULL DEFAULT false,
  recharge_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Estimate items table
CREATE TABLE public.estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'labour',
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  rechargeable BOOLEAN NOT NULL DEFAULT false,
  recharge_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- Recharges table
CREATE TABLE public.recharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  vehicle_reg TEXT NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  reason_code TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending-review',
  evidence TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recharges ENABLE ROW LEVEL SECURITY;

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  provider_id UUID REFERENCES auth.users(id) NOT NULL,
  fleet_manager_id UUID REFERENCES auth.users(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: users can view own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Vehicles: role-based access
CREATE POLICY "Fleet managers can manage vehicles" ON public.vehicles FOR ALL USING (public.has_role(auth.uid(), 'fleet-manager'));
CREATE POLICY "Service providers can view assigned vehicles" ON public.vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.vehicle_id = vehicles.id AND jobs.provider_id = auth.uid())
);
CREATE POLICY "Customers can view own vehicles" ON public.vehicles FOR SELECT USING (customer_id = auth.uid());

-- Jobs: role-based access
CREATE POLICY "Fleet managers can manage jobs" ON public.jobs FOR ALL USING (public.has_role(auth.uid(), 'fleet-manager'));
CREATE POLICY "Providers can view/update assigned jobs" ON public.jobs FOR SELECT USING (provider_id = auth.uid());
CREATE POLICY "Providers can update assigned jobs" ON public.jobs FOR UPDATE USING (provider_id = auth.uid());
CREATE POLICY "Customers can view own jobs" ON public.jobs FOR SELECT USING (customer_id = auth.uid());

-- Estimate items: inherit from job access
CREATE POLICY "Users can view estimate items for accessible jobs" ON public.estimate_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = estimate_items.job_id AND (
    jobs.fleet_manager_id = auth.uid() OR jobs.provider_id = auth.uid() OR jobs.customer_id = auth.uid()
  ))
);
CREATE POLICY "Providers can manage estimate items" ON public.estimate_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = estimate_items.job_id AND jobs.provider_id = auth.uid())
);

-- Recharges: role-based access
CREATE POLICY "Fleet managers can manage recharges" ON public.recharges FOR ALL USING (public.has_role(auth.uid(), 'fleet-manager'));
CREATE POLICY "Providers can view recharges for their jobs" ON public.recharges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = recharges.job_id AND jobs.provider_id = auth.uid())
);
CREATE POLICY "Customers can view own recharges" ON public.recharges FOR SELECT USING (customer_id = auth.uid());

-- Invoices: role-based access
CREATE POLICY "Fleet managers can manage invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'fleet-manager'));
CREATE POLICY "Providers can manage own invoices" ON public.invoices FOR ALL USING (provider_id = auth.uid());
