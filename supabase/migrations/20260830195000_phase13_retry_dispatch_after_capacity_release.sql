-- VOYNU Phase 13: make automatic dispatch retry whenever capacity is released.
-- This covers the important case where a confirmed booking was waiting because
-- no driver was available, and a later cancellation frees a driver.

create or replace function public.retry_auto_dispatch_after_driver_available()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if (
    old.availability_status is distinct from new.availability_status
    or old.active is distinct from new.active
  )
  and new.availability_status = 'available'
  and new.active = true
  then
    perform public.auto_dispatch_pending_confirmed();
  end if;
  return new;
exception when others then
  raise warning 'VOYNU auto-dispatch retry after driver availability failed: %', sqlerrm;
  return new;
end;
$function$;

create or replace function public.retry_auto_dispatch_after_booking_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- sync_booking_state() releases the old driver during its BEFORE trigger.
  -- Run the pending-booking sweep after the cancellation row is finalized so
  -- a newly available driver can immediately take the next suitable booking.
  if old.booking_status is distinct from new.booking_status
     and new.booking_status = 'cancelled'
     and old.driver_id is not null
     and exists (
       select 1
       from public.dispatch_settings
       where id = true
         and mode = 'automatic'
     )
  then
    perform public.auto_dispatch_pending_confirmed();
  end if;
  return new;
exception when others then
  -- Dispatch failure must never prevent a legitimate cancellation.
  -- Keep the failure visible in Postgres logs instead of silently swallowing it.
  raise warning 'VOYNU auto-dispatch retry after booking cancellation failed: %', sqlerrm;
  return new;
end;
$function$;

revoke all on function public.retry_auto_dispatch_after_booking_cancelled() from public, anon;

drop trigger if exists trg_retry_auto_dispatch_after_booking_cancelled on public.bookings;
create trigger trg_retry_auto_dispatch_after_booking_cancelled
after update of booking_status on public.bookings
for each row
when (
  new.booking_status = 'cancelled'
  and old.booking_status is distinct from new.booking_status
  and old.driver_id is not null
)
execute function public.retry_auto_dispatch_after_booking_cancelled();
