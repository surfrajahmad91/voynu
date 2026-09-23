-- Remove auth.users access from RLS policy evaluation for commute driver availability.
-- Keep the email fallback inside a security-definer helper so authenticated clients
-- never need direct access to auth.users.

create or replace function public.is_current_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $function$
  select exists (
    select 1
    from public.drivers d
    where d.id=p_driver_id
      and (
        d.user_id=auth.uid()
        or (
          d.user_id is null
          and lower(d.email)=lower((select u.email from auth.users u where u.id=auth.uid()))
        )
      )
  );
$function$;

revoke all on function public.is_current_driver(uuid) from public,anon;
grant execute on function public.is_current_driver(uuid) to authenticated;

drop policy if exists driver_subscription_unavailability_select_own on public.driver_subscription_unavailability;
create policy driver_subscription_unavailability_select_own
on public.driver_subscription_unavailability for select to authenticated
using (public.is_admin() or public.is_current_driver(driver_id));

drop policy if exists subscription_trip_driver_overrides_select_driver_admin on public.subscription_trip_driver_overrides;
drop policy if exists subscription_trip_driver_overrides_admin_read on public.subscription_trip_driver_overrides;
create policy subscription_trip_driver_overrides_select_driver_admin
on public.subscription_trip_driver_overrides for select to authenticated
using (public.is_admin() or public.is_current_driver(original_driver_id));

grant select on public.driver_subscription_unavailability to authenticated;
grant select on public.subscription_trip_driver_overrides to authenticated;
