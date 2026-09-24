-- Harden the legacy admin refund action so it cannot leave future bookings
-- assigned after a subscription has been cancelled/refunded.
-- The canonical lifecycle remains admin_cancel_commute_subscription(reason).

create or replace function public.admin_refund_commute_subscription(p_subscription_id uuid)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return public.cancel_commute_subscription_internal(
    p_subscription_id,
    'Admin refund and cancellation',
    auth.uid(),
    'admin'
  );
end;
$$;

revoke all on function public.admin_refund_commute_subscription(uuid) from public;
grant execute on function public.admin_refund_commute_subscription(uuid) to authenticated;

-- Repair any already-cancelled subscriptions that still have future
-- non-terminal bookings or scheduled subscription-trip rows.
update public.bookings b
set booking_status='cancelled',
    status='cancelled',
    cancelled_at=coalesce(b.cancelled_at,now()),
    cancelled_by='system',
    cancellation_reason=coalesce(b.cancellation_reason,'Parent commute subscription was cancelled'),
    updated_at=now()
where b.subscription_id in (
  select s.id from public.commute_subscriptions s where s.status='cancelled'
)
and b.travel_date >= (now() at time zone 'Asia/Kolkata')::date
and b.booking_status in ('confirmed','driver_assigned');

delete from public.driver_assignments da
using public.bookings b
where da.booking_id=b.id
  and b.subscription_id in (
    select s.id from public.commute_subscriptions s where s.status='cancelled'
  )
  and b.booking_status='cancelled'
  and da.status='assigned';

update public.subscription_trips st
set status='cancelled'
where st.subscription_id in (
  select s.id from public.commute_subscriptions s where s.status='cancelled'
)
and st.trip_date >= (now() at time zone 'Asia/Kolkata')::date
and st.status='scheduled'
and not exists (
  select 1
  from public.bookings b
  where b.subscription_trip_id=st.id
    and b.booking_status in (
      'on_the_way','arrived','trip_started',
      'waiting_for_return','return_trip_started','trip_completed'
    )
);
