-- VOYNU launch pricing rule:
-- the newest active pricing version is current immediately for new bookings.
-- Existing bookings keep their stored fare and pricing_version_id.
WITH current_version AS (
  SELECT id
  FROM public.pricing_versions
  WHERE status = 'active'
  ORDER BY version DESC, created_at DESC
  LIMIT 1
)
UPDATE public.pricing_versions
SET status = 'archived'
WHERE status = 'active'
  AND id <> (SELECT id FROM current_version);

-- These helpers are not intended for anonymous callers.
REVOKE EXECUTE ON FUNCTION public.customer_has_assigned_driver(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_driver(uuid) FROM anon;
