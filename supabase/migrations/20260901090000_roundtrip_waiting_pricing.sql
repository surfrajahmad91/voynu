ALTER TABLE public.pricing_versions
  ADD COLUMN IF NOT EXISTS waiting_fee_per_interval numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS waiting_interval_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_roundtrip_wait_minutes integer NOT NULL DEFAULT 180;

ALTER TABLE public.pricing_versions
  DROP CONSTRAINT IF EXISTS pricing_versions_waiting_interval_minutes_check;
ALTER TABLE public.pricing_versions
  ADD CONSTRAINT pricing_versions_waiting_interval_minutes_check CHECK (waiting_interval_minutes > 0 AND waiting_interval_minutes <= 1440);

ALTER TABLE public.pricing_versions
  DROP CONSTRAINT IF EXISTS pricing_versions_max_roundtrip_wait_minutes_check;
ALTER TABLE public.pricing_versions
  ADD CONSTRAINT pricing_versions_max_roundtrip_wait_minutes_check CHECK (max_roundtrip_wait_minutes >= 0 AND max_roundtrip_wait_minutes <= 1440);

ALTER TABLE public.pricing_versions
  DROP CONSTRAINT IF EXISTS pricing_versions_waiting_fee_per_interval_check;
ALTER TABLE public.pricing_versions
  ADD CONSTRAINT pricing_versions_waiting_fee_per_interval_check CHECK (waiting_fee_per_interval >= 0);
