-- "Live" means a driver is actually engaged on the trip (on the way, at pickup, in journey, waiting at the destination, on the return leg).
-- Trips that are only assigned for a later time are counted separately as "assigned".
create or replace function public.admin_dashboard_counts() returns jsonb
language plpgsql stable security definer set search_path='public','pg_temp' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
  select jsonb_build_object(
    'total', count(*),
    'today', count(*) filter (where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'live', count(*) filter (where booking_status in ('on_the_way', 'arrived', 'trip_started', 'waiting_for_return', 'return_trip_started')),
    'on_road', count(*) filter (where booking_status in ('on_the_way', 'arrived', 'trip_started', 'return_trip_started')),
    'assigned', count(*) filter (where booking_status = 'driver_assigned'),
    'awaiting', count(*) filter (where booking_status = 'confirmed' and driver_id is null),
    'completed', count(*) filter (where booking_status = 'trip_completed'),
    'cancelled', count(*) filter (where booking_status = 'cancelled'),
    'pending_payment', count(*) filter (where payment_status = 'pending' and booking_status <> 'cancelled'),
    'cash_issues', count(*) filter (where payment_method = 'cash' and booking_status = 'trip_completed' and cash_collection_status in ('partial', 'not_collected', 'unreported'))
  ) into r from public.bookings;
  return r;
end;
$$;
revoke all on function public.admin_dashboard_counts() from public, anon;
grant execute on function public.admin_dashboard_counts() to authenticated;
