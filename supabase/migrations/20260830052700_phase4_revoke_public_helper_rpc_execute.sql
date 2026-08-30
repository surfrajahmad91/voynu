-- Driver/customer helper RPCs require an authenticated caller.
REVOKE EXECUTE ON FUNCTION public.customer_has_assigned_driver(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_has_assigned_driver(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_driver(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_driver(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.customer_has_assigned_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_driver(uuid) TO authenticated;
