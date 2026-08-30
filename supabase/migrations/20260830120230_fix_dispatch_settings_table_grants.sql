-- Allow authenticated admins to read/update dispatch settings through RLS.
-- The existing policies on dispatch_settings require public.is_admin().
grant select, update on table public.dispatch_settings to authenticated;
