-- Break the bookings <-> drivers RLS dependency cycle.
-- These helpers intentionally bypass RLS for their internal authorization lookup;
-- callers only receive a boolean result.
create or replace function public.is_current_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.drivers d
    where d.id = p_driver_id
      and d.active = true
      and (
        d.user_id = auth.uid()
        or (
          d.user_id is null
          and lower(d.email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
      )
  );
$function$;

create or replace function public.customer_has_assigned_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.bookings b
    where b.driver_id = p_driver_id
      and b.user_id = auth.uid()
      and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started')
  );
$function$;

revoke execute on function public.is_current_driver(uuid) from anon;
revoke execute on function public.customer_has_assigned_driver(uuid) from anon;
grant execute on function public.is_current_driver(uuid) to authenticated;
grant execute on function public.customer_has_assigned_driver(uuid) to authenticated;

-- Replace the mutually recursive bookings policies with helper-based policies.
drop policy if exists "Drivers can view their assigned bookings" on public.bookings;
drop policy if exists "Drivers can update their assigned booking status" on public.bookings;
create policy "Drivers can view their assigned bookings" on public.bookings
for select to authenticated
using (public.is_current_driver(driver_id));
create policy "Drivers can update their assigned booking status" on public.bookings
for update to authenticated
using (public.is_current_driver(driver_id))
with check (public.is_current_driver(driver_id));

-- Replace the drivers policy that directly queried bookings.
drop policy if exists "Phase 3 driver select" on public.drivers;
create policy "Phase 3 driver select" on public.drivers
for select to authenticated
using (
  public.is_admin()
  or public.is_current_driver(id)
  or public.customer_has_assigned_driver(id)
);
