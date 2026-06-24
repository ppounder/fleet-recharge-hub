WITH v AS (
  SELECT id, row_number() OVER (ORDER BY registration) AS rn
  FROM public.vehicles
)
UPDATE public.vehicles AS x
SET
  registered_date        = (CURRENT_DATE - ((v.rn * 365) + 180) * INTERVAL '1 day')::date,
  date_in_service        = (CURRENT_DATE - (v.rn * 365) * INTERVAL '1 day')::date,
  last_service_date      = (CURRENT_DATE - (((v.rn % 6) + 1) * 30) * INTERVAL '1 day')::date,
  next_service           = (CURRENT_DATE + ((v.rn - 6) * 30) * INTERVAL '1 day')::date,
  next_service_date      = (CURRENT_DATE + ((v.rn - 5) * 30) * INTERVAL '1 day')::date,
  last_inspection_date   = (CURRENT_DATE - (((v.rn % 4) + 1) * 60) * INTERVAL '1 day')::date,
  next_inspection_date   = (CURRENT_DATE + ((v.rn - 7) * 45) * INTERVAL '1 day')::date,
  mot_issued_date        = (CURRENT_DATE - ((365 - ((v.rn - 6) * 30))) * INTERVAL '1 day')::date,
  mot_due                = (CURRENT_DATE + ((v.rn - 6) * 30) * INTERVAL '1 day')::date,
  mot_expiry_date        = (CURRENT_DATE + ((v.rn - 6) * 30) * INTERVAL '1 day')::date,
  loler_expiry_date      = (CURRENT_DATE + ((v.rn - 8) * 60) * INTERVAL '1 day')::date,
  tacho_2yr_expiry_date  = (CURRENT_DATE + ((v.rn - 4) * 90) * INTERVAL '1 day')::date,
  tacho_6yr_expiry_date  = (CURRENT_DATE + ((v.rn + 2) * 30) * INTERVAL '1 day')::date,
  rfl_expiry_date        = (CURRENT_DATE + ((v.rn - 5) * 30) * INTERVAL '1 day')::date
FROM v
WHERE x.id = v.id;