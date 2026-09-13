ALTER FUNCTION public.is_admin() SECURITY DEFINER;
ALTER FUNCTION public.is_admin() SET search_path = public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
