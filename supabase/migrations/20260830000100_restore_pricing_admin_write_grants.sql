-- Restore the table privileges required by the authenticated Admin pricing editor.
-- RLS policies restrict writes to the configured admin account; these GRANTs
-- allow PostgREST to reach the RLS policy evaluation layer.

grant insert on table public.pricing_versions to authenticated;
grant insert on table public.pricing_rules to authenticated;
