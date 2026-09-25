-- VOYNU 2.0: pay-before-start gate for commute subscription trips.
-- A driver can still accept a commute trip and head out for pickup as normal, but cannot mark
-- "trip_started" until that day's due amount has been paid (cash recorded by the driver, or an
-- admin-confirmed UPI payment). Regular (non-subscription) ride bookings are unaffected.
-- Tested in a rolled-back transaction: blocked before payment, allowed immediately after.
do $$
declare v_def text; v_cnt int;
declare old_str text := '  v_dur := v_booking.expected_duration_seconds;
  v_tol := make_interval(mins => v_set.completion_tolerance_minutes);';
declare new_str text := '  if p_next_status=''trip_started'' and v_booking.subscription_id is not null then
    if public.subscription_due_to_date(v_booking.subscription_id, (v_now at time zone ''Asia/Kolkata'')::date)
       > (select coalesce(amount_paid,0) from public.commute_subscriptions where id=v_booking.subscription_id) then
      raise exception ''VOYNU: Collect today''''s commute payment from the customer before starting the trip'';
    end if;
  end if;

  v_dur := v_booking.expected_duration_seconds;
  v_tol := make_interval(mins => v_set.completion_tolerance_minutes);';
begin
  v_def := pg_get_functiondef('public.advance_driver_booking_status(uuid,text,text,text,numeric,text)'::regprocedure);
  v_cnt := (length(v_def) - length(replace(v_def, old_str, ''))) / length(old_str);
  if v_cnt <> 1 then raise exception 'expected exactly one match, found %', v_cnt; end if;
  execute replace(v_def, old_str, new_str);
end $$;
