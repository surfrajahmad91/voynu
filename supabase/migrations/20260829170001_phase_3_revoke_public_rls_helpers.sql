-- RLS-only helpers must not be callable through the public PostgREST RPC surface.
revoke all on function public.is_current_driver(uuid) from anon, authenticated;
revoke all on function public.customer_has_assigned_driver(uuid) from anon, authenticated;
