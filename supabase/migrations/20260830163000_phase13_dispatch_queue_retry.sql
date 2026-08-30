-- Phase 13: automatically retry confirmed unassigned bookings when a driver becomes available.

create or replace function public.auto_dispatch_pending_confirmed()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_count integer := 0;
  v_booking record;
  v_result public.bookings;
begin
  if not exists (select 1 from public.dispatch_settings where id=true and mode='automatic') then return 0; end if;
  for v_booking in
    select id from public.bookings
    where booking_status='confirmed' and driver_id is null
    order by travel_date, pickup_time, created_at
  loop
    v_result := public.auto_assign_booking_driver_internal(v_booking.id);
    if v_result.driver_id is not null then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$function$;

revoke all on function public.auto_dispatch_pending_confirmed() from public,anon,authenticated;

create or replace function public.retry_auto_dispatch_after_driver_available()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if old.availability_status is distinct from new.availability_status and new.availability_status='available' and new.active=true then
    perform public.auto_dispatch_pending_confirmed();
  end if;
  return new;
exception when others then
  return new;
end;
$function$;

revoke all on function public.retry_auto_dispatch_after_driver_available() from public,anon,authenticated;
drop trigger if exists trg_retry_auto_dispatch_after_driver_available on public.drivers;
create trigger trg_retry_auto_dispatch_after_driver_available
after update of availability_status, active on public.drivers
for each row
when (new.availability_status='available' and new.active=true)
execute function public.retry_auto_dispatch_after_driver_available();