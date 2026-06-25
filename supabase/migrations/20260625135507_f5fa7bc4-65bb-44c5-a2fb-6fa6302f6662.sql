CREATE UNIQUE INDEX IF NOT EXISTS vehicles_fleet_registration_unique
  ON public.vehicles (fleet_id, UPPER(TRIM(registration)))
  WHERE registration IS NOT NULL AND TRIM(registration) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_fleet_vin_unique
  ON public.vehicles (fleet_id, UPPER(TRIM(vin)))
  WHERE vin IS NOT NULL AND TRIM(vin) <> '';