create or replace function public.customer_has_assigned_driver(p_driver_id uuid)
returns boolean language sql stable security definer set search_path='public','pg_temp' set row_security='off' as $$
  select exists (
    select 1 from public.bookings b
    where b.driver_id=p_driver_id and b.user_id=auth.uid()
      and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started','waiting_for_return','return_trip_started')
  );
$$;
grant execute on function public.customer_has_assigned_driver(uuid) to authenticated;
revoke execute on function public.customer_has_assigned_driver(uuid) from anon;
