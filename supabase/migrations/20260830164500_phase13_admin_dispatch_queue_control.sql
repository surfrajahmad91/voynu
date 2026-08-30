create or replace function public.admin_run_dispatch_queue()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'VOYNU: admin access required';
  end if;
  return public.auto_dispatch_pending_confirmed();
end;
$function$;

revoke all on function public.admin_run_dispatch_queue() from public,anon;
grant execute on function public.admin_run_dispatch_queue() to authenticated;
