drop policy if exists subscription_trip_driver_overrides_select_driver_admin on public.subscription_trip_driver_overrides;

create policy subscription_trip_driver_overrides_admin_read
on public.subscription_trip_driver_overrides
for select
to authenticated
using (public.is_admin());

create policy subscription_trip_driver_overrides_driver_read
on public.subscription_trip_driver_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.drivers d
    where d.id = original_driver_id
      and d.user_id = auth.uid()
  )
);