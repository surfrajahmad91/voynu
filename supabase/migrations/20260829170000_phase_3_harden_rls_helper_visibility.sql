-- Keep RLS-only SECURITY DEFINER helpers out of the PostgREST-exposed public schema.
create schema if not exists private;

create or replace function private.is_current_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1 from public.drivers d
    where d.id = p_driver_id
      and d.active = true
      and (
        d.user_id = auth.uid()
        or (d.user_id is null and lower(d.email) = lower(coalesce(auth.jwt()->>'email', '')))
      )
  );
$function$;

create or replace function private.customer_has_assigned_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1 from public.bookings b
    where b.driver_id = p_driver_id
      and b.user_id = auth.uid()
      and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')
  );
$function$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_current_driver(uuid) from public;
revoke all on function private.customer_has_assigned_driver(uuid) from public;
grant execute on function private.is_current_driver(uuid) to authenticated;
grant execute on function private.customer_has_assigned_driver(uuid) to authenticated;

drop policy if exists "Drivers can view their assigned bookings" on public.bookings;
drop policy if exists "Drivers can update their assigned booking status" on public.bookings;
create policy "Drivers can view their assigned bookings" on public.bookings
for select to authenticated using (private.is_current_driver(driver_id));
create policy "Drivers can update their assigned booking status" on public.bookings
for update to authenticated
using (private.is_current_driver(driver_id))
with check (private.is_current_driver(driver_id));

drop policy if exists "Phase 3 driver select" on public.drivers;
create policy "Phase 3 driver select" on public.drivers
for select to authenticated
using (
  public.is_admin()
  or private.is_current_driver(id)
  or private.customer_has_assigned_driver(id)
);
