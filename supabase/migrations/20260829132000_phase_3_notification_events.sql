create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference text := 'VOY-' || upper(left(NEW.id::text, 8));
  v_title text;
  v_message text;
begin
  if NEW.user_id is not null then
    if NEW.booking_status = 'pending_payment' then
      v_title := 'Booking received';
      v_message := format('Your booking %s has been saved. UPI payment is awaiting verification.', v_reference);
    else
      v_title := 'Booking confirmed';
      v_message := format('Your booking %s is confirmed. We will contact you before your journey.', v_reference);
    end if;

    insert into public.notifications (user_id, booking_id, type, title, message, data)
    values (
      NEW.user_id,
      NEW.id,
      'booking_created',
      v_title,
      v_message,
      jsonb_build_object(
        'bookingId', NEW.id,
        'reference', v_reference,
        'bookingStatus', NEW.booking_status,
        'paymentStatus', NEW.payment_status
      )
    );
  end if;

  insert into public.notifications (user_id, booking_id, type, title, message, data)
  select
    p.id,
    NEW.id,
    'admin_booking_created',
    'New booking received',
    format('Booking %s has been created and is ready for review.', v_reference),
    jsonb_build_object(
      'bookingId', NEW.id,
      'reference', v_reference,
      'bookingStatus', NEW.booking_status,
      'paymentStatus', NEW.payment_status
    )
  from public.profiles p
  where p.role = 'admin';

  return NEW;
end;
$$;

create or replace function public.notify_booking_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference text := 'VOY-' || upper(left(NEW.id::text, 8));
  v_type text;
  v_title text;
  v_message text;
begin
  if NEW.user_id is null then
    return NEW;
  end if;

  case NEW.booking_status
    when 'confirmed' then
      v_type := 'booking_confirmed';
      v_title := 'Booking confirmed';
      v_message := format('Payment has been verified and booking %s is confirmed.', v_reference);
    when 'driver_assigned' then
      v_type := 'driver_assigned';
      v_title := 'Driver assigned';
      v_message := format('A driver has been assigned to booking %s.', v_reference);
    when 'on_the_way' then
      v_type := 'driver_on_the_way';
      v_title := 'Driver is on the way';
      v_message := format('Your driver is on the way for booking %s.', v_reference);
    when 'arrived' then
      v_type := 'driver_arrived';
      v_title := 'Driver has arrived';
      v_message := format('Your driver has arrived for booking %s.', v_reference);
    when 'trip_started' then
      v_type := 'trip_started';
      v_title := 'Trip started';
      v_message := format('Your journey for booking %s has started.', v_reference);
    when 'trip_completed' then
      v_type := 'trip_completed';
      v_title := 'Trip completed';
      v_message := format('Your journey for booking %s has been completed. Thank you for riding with VOYNU.', v_reference);
    when 'cancelled' then
      v_type := 'booking_cancelled';
      v_title := 'Booking cancelled';
      v_message := format('Booking %s has been cancelled.', v_reference);
    else
      return NEW;
  end case;

  insert into public.notifications (user_id, booking_id, type, title, message, data)
  values (
    NEW.user_id,
    NEW.id,
    v_type,
    v_title,
    v_message,
    jsonb_build_object(
      'bookingId', NEW.id,
      'reference', v_reference,
      'bookingStatus', NEW.booking_status,
      'paymentStatus', NEW.payment_status
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_driver_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_user_id uuid;
  v_reference text;
begin
  if NEW.status <> 'assigned' then
    return NEW;
  end if;

  select d.user_id
    into v_driver_user_id
  from public.drivers d
  where d.id = NEW.driver_id
    and d.active = true;

  if v_driver_user_id is null then
    return NEW;
  end if;

  v_reference := 'VOY-' || upper(left(NEW.booking_id::text, 8));

  insert into public.notifications (user_id, booking_id, type, title, message, data)
  values (
    v_driver_user_id,
    NEW.booking_id,
    'driver_trip_assigned',
    'New trip assigned',
    format('Booking %s has been assigned to you. Open your driver dashboard for trip details.', v_reference),
    jsonb_build_object(
      'bookingId', NEW.booking_id,
      'reference', v_reference,
      'driverAssignmentId', NEW.id,
      'vehicleId', NEW.vehicle_id
    )
  );

  return NEW;
end;
$$;

revoke all on function public.notify_booking_created() from public, anon, authenticated;
revoke all on function public.notify_booking_status_changed() from public, anon, authenticated;
revoke all on function public.notify_driver_assignment() from public, anon, authenticated;

drop trigger if exists trg_notify_booking_created on public.bookings;
create trigger trg_notify_booking_created
after insert on public.bookings
for each row
execute function public.notify_booking_created();

drop trigger if exists trg_notify_booking_status_changed on public.bookings;
create trigger trg_notify_booking_status_changed
after update of booking_status on public.bookings
for each row
when (old.booking_status is distinct from new.booking_status)
execute function public.notify_booking_status_changed();

drop trigger if exists trg_notify_driver_assignment on public.driver_assignments;
create trigger trg_notify_driver_assignment
after insert on public.driver_assignments
for each row
execute function public.notify_driver_assignment();
