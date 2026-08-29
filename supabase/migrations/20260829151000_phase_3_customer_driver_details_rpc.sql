create or replace function public.get_my_booking_driver(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'driverId', d.id,
    'driverName', d.full_name,
    'driverPhone', d.phone,
    'vehicleId', v.id,
    'registrationNumber', v.registration_number,
    'make', v.make,
    'model', v.model,
    'category', v.category,
    'location', case when l.driver_id is null then null else jsonb_build_object('lat', l.lat, 'lon', l.lon, 'updatedAt', l.updated_at) end
  ) into v_result
  from public.bookings b
  join public.drivers d on d.id = b.driver_id and d.active = true
  left join public.vehicles v on v.id = b.vehicle_id
  left join public.driver_current_location l on l.driver_id = d.id
  where b.id = p_booking_id
    and b.user_id = (select auth.uid())
    and b.booking_status in ('driver_assigned','on_the_way','arrived','trip_started');
  return v_result;
end;
$$;
revoke execute on function public.get_my_booking_driver(uuid) from public, anon;
grant execute on function public.get_my_booking_driver(uuid) to authenticated;
