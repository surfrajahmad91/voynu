create or replace function public.get_or_create_share_token(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_owner uuid;
begin
  select user_id, share_token into v_owner, v_token
  from public.bookings
  where id = p_booking_id
  for update;

  if v_owner is null then
    raise exception 'VOYNU: booking not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'VOYNU: access denied';
  end if;

  if v_token is not null and length(v_token) >= 16 then
    return v_token;
  end if;

  -- Hex is deliberately used instead of base64 so the token is always safe in a URL path.
  v_token := encode(gen_random_bytes(18), 'hex');
  update public.bookings set share_token = v_token where id = p_booking_id;
  return v_token;
end;
$$;

grant execute on function public.get_or_create_share_token(uuid) to authenticated;

create or replace function public.get_shared_trip(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings;
  v_driver record;
  v_loc record;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select * into v_booking from public.bookings where share_token = p_token;
  if not found then
    return null;
  end if;

  if v_booking.booking_status not in ('driver_assigned','on_the_way','arrived','trip_started','waiting_for_return','return_trip_started') then
    return jsonb_build_object('status', v_booking.booking_status, 'active', false);
  end if;

  select d.full_name, v.make, v.model, v.registration_number
    into v_driver
    from public.drivers d
    left join public.vehicles v on v.id = v_booking.vehicle_id
    where d.id = v_booking.driver_id;

  select l.lat, l.lon, l.updated_at into v_loc
    from public.driver_current_location l
    where l.driver_id = v_booking.driver_id;

  return jsonb_build_object(
    'active', true,
    'status', v_booking.booking_status,
    'pickupName', v_booking.pickup_name,
    'pickupLat', v_booking.pickup_lat,
    'pickupLon', v_booking.pickup_lon,
    'dropName', v_booking.drop_name,
    'dropLat', v_booking.drop_lat,
    'dropLon', v_booking.drop_lon,
    'driverName', v_driver.full_name,
    'vehicleLabel', trim(concat(v_driver.make, ' ', v_driver.model)),
    'registrationNumber', v_driver.registration_number,
    'driverLat', v_loc.lat,
    'driverLon', v_loc.lon,
    'locationUpdatedAt', v_loc.updated_at
  );
end;
$$;

grant execute on function public.get_shared_trip(text) to anon, authenticated;

notify pgrst, 'reload schema';
