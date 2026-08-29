-- Allow authenticated users to evaluate the existing admin-check function used by RLS.
-- The function is SECURITY DEFINER and only checks auth.uid() against the admin role.
-- This does not grant admin access; it only grants EXECUTE so RLS policies can evaluate.

grant execute on function public.is_admin() to authenticated;
