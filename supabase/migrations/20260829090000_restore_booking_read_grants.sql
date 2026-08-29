-- Restore the read privileges required by the authenticated cab-selection flow.
-- RLS policies already restrict which rows can be read; these GRANTs allow
-- PostgREST to reach the policy evaluation layer in the first place.

grant select on table public.vehicle_categories to anon, authenticated;
grant select on table public.pricing_versions to authenticated;
grant select on table public.pricing_rules to authenticated;
