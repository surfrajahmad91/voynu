-- Prevent generic offline mode from bypassing future commute commitments
-- and prevent an admin from closing an unavailability while replacement work remains.

create or replace function public.set_driver_availability(p_status text)
returns public.drivers
language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare
  v_driver public.drivers;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if p_status not in ('available','offline') then raise exception 'VOYNU: invalid availability status'; end if;

  select d.* into v_driver
  from public.drivers d
  where d.active=true
    and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  limit 1 for update;

  if not found then raise exception 'VOYNU: driver access denied'; end if;

  if p_status='offline' and exists (
    select 1
    from public.commute_subscriptions s
    join public.subscription_trips st on st.subscription_id=s.id
    where s.assigned_driver_id=v_driver.id
      and s.payment_status='paid'
      and s.status in ('active','paused')
      and st.trip_date>v_today
      and st.status='scheduled'
      and not exists (
        select 1 from public.subscription_trip_driver_overrides o
        where o.subscription_trip_id=st.id and o.status in ('replacement_required','reassigned')
      )
  ) then
    raise exception 'VOYNU: future commute subscription trips are assigned to you; use the commute unavailability option with a reason and dates';
  end if;

  update public.drivers set availability_status=p_status where id=v_driver.id returning * into v_driver;
  return v_driver;
end;
$function$;

revoke all on function public.set_driver_availability(text) from public,anon;
grant execute on function public.set_driver_availability(text) to authenticated;

create or replace function public.admin_resolve_driver_subscription_unavailability(p_unavailability_id uuid)
returns public.driver_subscription_unavailability
language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare
  v public.driver_subscription_unavailability;
  v_open integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select count(*) into v_open
  from public.subscription_trip_driver_overrides o
  where o.unavailability_id=p_unavailability_id and o.status='replacement_required';

  if v_open>0 then
    raise exception 'Replacement is still required for % subscription trip(s)',v_open;
  end if;

  update public.driver_subscription_unavailability
  set status='completed',resolved_at=now(),resolved_by=auth.uid()
  where id=p_unavailability_id and status='active'
  returning * into v;

  if not found then raise exception 'Unavailability request not found or already closed'; end if;
  return v;
end;
$function$;

revoke all on function public.admin_resolve_driver_subscription_unavailability(uuid) from public,anon;
grant execute on function public.admin_resolve_driver_subscription_unavailability(uuid) to authenticated;
