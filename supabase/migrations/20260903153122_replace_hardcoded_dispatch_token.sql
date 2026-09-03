create schema if not exists private;

create table if not exists private.dispatch_security_config (
  id boolean primary key default true check (id),
  token text not null
);

insert into private.dispatch_security_config(id, token)
select true, encode(gen_random_bytes(32), 'hex')
where not exists (select 1 from private.dispatch_security_config where id=true);

revoke all on schema private from public, anon, authenticated, service_role;
revoke all on table private.dispatch_security_config from public, anon, authenticated, service_role;

create or replace function public.guard_driver_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('voynu.auto_dispatch_token', true) is not null
     and current_setting('voynu.auto_dispatch_token', true) = (select token from private.dispatch_security_config where id=true) then
    return new;
  end if;
  if public.is_admin() then return new; end if;
  if old.driver_id is null or not exists (
    select 1 from public.drivers d
    where d.id=old.driver_id and d.active=true
      and (d.user_id=auth.uid() or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid()))))
  ) then raise exception 'VOYNU: driver access denied'; end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id or new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id or new.passenger_name is distinct from old.passenger_name or new.phone is distinct from old.phone or new.whatsapp is distinct from old.whatsapp or new.pickup_name is distinct from old.pickup_name or new.drop_name is distinct from old.drop_name or new.pickup_lat is distinct from old.pickup_lat or new.pickup_lon is distinct from old.pickup_lon or new.drop_lat is distinct from old.drop_lat or new.drop_lon is distinct from old.drop_lon or new.travel_date is distinct from old.travel_date or new.pickup_time is distinct from old.pickup_time or new.trip_type is distinct from old.trip_type or new.vehicle_type is distinct from old.vehicle_type or new.fare is distinct from old.fare or new.payment_method is distinct from old.payment_method or new.payment_status is distinct from old.payment_status or new.created_at is distinct from old.created_at then
    raise exception 'VOYNU: drivers may update booking status only';
  end if;
  if not ((old.booking_status='driver_assigned' and new.booking_status='on_the_way') or (old.booking_status='on_the_way' and new.booking_status='arrived') or (old.booking_status='arrived' and new.booking_status='trip_started') or (old.booking_status='trip_started' and new.booking_status='trip_completed') or (new.booking_status is not distinct from old.booking_status)) then
    raise exception 'VOYNU: invalid driver booking status transition';
  end if;
  return new;
end;
$$;

create or replace function public.auto_assign_booking_driver_internal(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_driver public.drivers;
  v_pickup_ts timestamptz;
  v_end_ts timestamptz;
  v_dispatch_token text;
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then return null; end if;
  if v_booking.booking_status<>'confirmed' or v_booking.driver_id is not null then return v_booking; end if;
  if not ((v_booking.payment_method='cash' and v_booking.payment_status='due_on_pickup') or v_booking.payment_status='paid') then return v_booking; end if;
  if v_booking.travel_date is null or v_booking.pickup_time is null then return v_booking; end if;
  v_pickup_ts := (v_booking.travel_date+v_booking.pickup_time) at time zone 'Asia/Kolkata';
  v_end_ts := coalesce(((v_booking.return_date+v_booking.return_time) at time zone 'Asia/Kolkata'),v_pickup_ts+interval '4 hours');
  if v_end_ts<=v_pickup_ts then v_end_ts:=v_pickup_ts+interval '4 hours'; end if;
  select d.* into v_driver from public.drivers d join public.vehicles v on v.id=d.vehicle_id
  where d.active=true and d.availability_status='available' and v.active=true and coalesce(v.status,'active') not in ('maintenance','inactive','unavailable')
    and (v_booking.vehicle_category_id is null or v.vehicle_category_id=v_booking.vehicle_category_id)
    and coalesce(v.seating_capacity,0)>=coalesce(v_booking.passenger_count,0)
    and coalesce(v.luggage_capacity,0)>=coalesce(v_booking.luggage_count,0)
    and not exists (select 1 from public.bookings b where b.driver_id=d.id and b.id<>v_booking.id and b.booking_status not in ('cancelled','trip_completed')
      and (b.travel_date+b.pickup_time) at time zone 'Asia/Kolkata'<v_end_ts
      and coalesce(((b.return_date+b.return_time) at time zone 'Asia/Kolkata'),((b.travel_date+b.pickup_time) at time zone 'Asia/Kolkata')+interval '4 hours')>v_pickup_ts)
  order by d.created_at asc limit 1 for update;
  if not found then return v_booking; end if;
  select token into v_dispatch_token from private.dispatch_security_config where id=true;
  perform set_config('voynu.auto_dispatch_token',v_dispatch_token,true);
  update public.driver_assignments set status='cancelled' where booking_id=v_booking.id and status='assigned';
  insert into public.driver_assignments(booking_id,driver_id,vehicle_id,assigned_by,status) values(v_booking.id,v_driver.id,v_driver.vehicle_id,null,'assigned');
  update public.bookings set driver_id=v_driver.id,vehicle_id=v_driver.vehicle_id,booking_status='driver_assigned' where id=v_booking.id returning * into v_booking;
  update public.drivers set availability_status='busy' where id=v_driver.id;
  return v_booking;
end;
$$;
