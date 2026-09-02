-- Production security hardening:
-- 1) anon/authenticated never need destructive TRUNCATE or schema-level
--    REFERENCES/TRIGGER privileges on application tables.
-- 2) auto_dispatch_pending_confirmed() is SECURITY DEFINER and is invoked
--    internally by trusted admin/trigger paths; it must not be directly
--    executable by arbitrary authenticated users.
revoke truncate, references, trigger on table public.bookings from anon, authenticated;
revoke truncate, references, trigger on table public.dispatch_settings from anon, authenticated;
revoke truncate, references, trigger on table public.driver_assignments from anon, authenticated;
revoke truncate, references, trigger on table public.driver_current_location from anon, authenticated;
revoke truncate, references, trigger on table public.driver_location_history from anon, authenticated;
revoke truncate, references, trigger on table public.drivers from anon, authenticated;
revoke truncate, references, trigger on table public.fare_pricing_configs from anon, authenticated;
revoke truncate, references, trigger on table public.notifications from anon, authenticated;
revoke truncate, references, trigger on table public.pricing_rules from anon, authenticated;
revoke truncate, references, trigger on table public.pricing_versions from anon, authenticated;
revoke truncate, references, trigger on table public.profiles from anon, authenticated;
revoke truncate, references, trigger on table public.push_config from anon, authenticated;
revoke truncate, references, trigger on table public.push_subscriptions from anon, authenticated;
revoke truncate, references, trigger on table public.service_areas from anon, authenticated;
revoke truncate, references, trigger on table public.vehicle_categories from anon, authenticated;
revoke truncate, references, trigger on table public.vehicles from anon, authenticated;
revoke execute on function public.auto_dispatch_pending_confirmed() from anon, authenticated;
