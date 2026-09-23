create or replace function public.expire_stale_pending_bookings()
returns integer
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_count integer := 0;
begin
  update public.bookings
  set booking_status='cancelled',
      cancelled_by='system',
      cancellation_fee=0,
      cancellation_reason='Payment window expired before UPI payment was confirmed'
  where payment_method='upi'
    and payment_status='pending'
    and booking_status='pending_payment'
    and created_at < now() - interval '30 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_pending_bookings() from public;
revoke all on function public.expire_stale_pending_bookings() from anon;
revoke all on function public.expire_stale_pending_bookings() from authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname='voynu-expire-stale-pending-bookings') then
    perform cron.unschedule('voynu-expire-stale-pending-bookings');
  end if;

  perform cron.schedule(
    'voynu-expire-stale-pending-bookings',
    '*/5 * * * *',
    'select public.expire_stale_pending_bookings();'
  );
end $$;
