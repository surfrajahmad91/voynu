-- VOYNU 2.0 / P0: progressive (pay-at-pickup) commute subscription payments.
--
-- Model: a subscription request is APPROVED by admin (status active, payment_status pending);
-- the customer then pays at each pickup. Every payment is an immutable ledger row recorded by the
-- assigned driver (cash, or UPI verified on the spot by UTR) and later confirmed by admin.
-- The database derives paid amount, balance and "due today"; nothing is client-trusted.
--   cash  : limited to what is due to date (no prepaying the driver in cash)
--   upi   : any amount up to the outstanding balance; UTR mandatory and unique
--   due to date after n trips = round(total_amount * n / billable_days)
-- This migration does NOT yet enforce the pay-before-start gate on trip start (ships with the Saarthi UI).
-- Also moves the unapproved-request expiry from 30 minutes to 4 hours, and makes cancellation refunds
-- based on money actually received instead of assuming full prepayment.

-- 1. Columns and status vocabulary ---------------------------------------------------------------
alter table public.commute_subscriptions
  add column if not exists amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  add column if not exists approved_at timestamptz;

alter table public.commute_subscriptions drop constraint if exists commute_subscriptions_payment_check;
alter table public.commute_subscriptions add constraint commute_subscriptions_payment_check
  check (payment_status = any (array['pending','partial','paid','failed','refunded']));

update public.commute_subscriptions set amount_paid = total_amount where payment_status = 'paid' and amount_paid = 0;

-- 2. Immutable payment ledger --------------------------------------------------------------------
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.commute_subscriptions(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid not null,
  driver_id uuid references public.drivers(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash','upi')),
  utr text,
  status text not null check (status in ('recorded','driver_verified','confirmed','rejected')),
  idempotency_key text not null,
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  confirmed_by uuid,
  confirmed_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  constraint subscription_payments_upi_needs_utr check (method <> 'upi' or (utr is not null and utr ~ '^[A-Z0-9]{6,30}$')),
  constraint subscription_payments_idem_uq unique (subscription_id, idempotency_key)
);
create unique index if not exists subscription_payments_utr_uidx
  on public.subscription_payments (utr) where method = 'upi' and status <> 'rejected';
create index if not exists subscription_payments_subscription_idx on public.subscription_payments (subscription_id, recorded_at);
create index if not exists subscription_payments_booking_idx on public.subscription_payments (booking_id);
create index if not exists subscription_payments_driver_idx on public.subscription_payments (driver_id);
create index if not exists subscription_payments_user_idx on public.subscription_payments (user_id);

alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;

drop policy if exists "Customers view own subscription payments" on public.subscription_payments;
create policy "Customers view own subscription payments" on public.subscription_payments
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Admins view all subscription payments" on public.subscription_payments;
create policy "Admins view all subscription payments" on public.subscription_payments
  for select to authenticated using (public.is_admin());
drop policy if exists "Drivers view payments they recorded" on public.subscription_payments;
create policy "Drivers view payments they recorded" on public.subscription_payments
  for select to authenticated using (driver_id in (select d.id from public.drivers d where d.user_id = (select auth.uid())));

create or replace function public.protect_subscription_payments()
returns trigger language plpgsql set search_path = 'public','pg_temp' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Subscription payment records cannot be deleted';
  end if;
  if new.subscription_id is distinct from old.subscription_id or new.booking_id is distinct from old.booking_id
     or new.user_id is distinct from old.user_id or new.driver_id is distinct from old.driver_id
     or new.amount is distinct from old.amount or new.method is distinct from old.method
     or new.utr is distinct from old.utr or new.idempotency_key is distinct from old.idempotency_key
     or new.recorded_by is distinct from old.recorded_by or new.recorded_at is distinct from old.recorded_at then
    raise exception 'Subscription payment records are immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_subscription_payments on public.subscription_payments;
create trigger trg_protect_subscription_payments before update or delete on public.subscription_payments
  for each row execute function public.protect_subscription_payments();

-- 3. Due schedule and summary --------------------------------------------------------------------
create or replace function public.subscription_due_to_date(p_subscription_id uuid, p_date date)
returns numeric language sql stable security definer set search_path = 'public','pg_temp' as $$
  select case when coalesce(s.billable_days,0) <= 0 then 0::numeric
    else least(s.total_amount, round(s.total_amount * least(coalesce(n.c,0), s.billable_days)::numeric / s.billable_days, 2)) end
  from public.commute_subscriptions s
  left join lateral (
    select count(*) as c from public.subscription_trips t
    where t.subscription_id = s.id and t.trip_date <= p_date and t.status not in ('off','cancelled')
  ) n on true
  where s.id = p_subscription_id;
$$;
revoke all on function public.subscription_due_to_date(uuid,date) from public, anon, authenticated;

create or replace function public.subscription_payment_summary(p_subscription_id uuid, p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = 'public','pg_temp' as $$
declare s public.commute_subscriptions; d date; v_due numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into s from public.commute_subscriptions where id = p_subscription_id;
  if not found then raise exception 'Subscription not found'; end if;
  if not (s.user_id = auth.uid() or public.is_admin() or exists(
      select 1 from public.bookings b join public.drivers dr on dr.id = b.driver_id
      where b.subscription_id = s.id and dr.user_id = auth.uid())) then
    raise exception 'Subscription access denied';
  end if;
  d := coalesce(p_date, (now() at time zone 'Asia/Kolkata')::date);
  v_due := public.subscription_due_to_date(s.id, d);
  return jsonb_build_object(
    'subscription_id', s.id, 'status', s.status, 'payment_status', s.payment_status,
    'total', s.total_amount, 'paid', s.amount_paid,
    'remaining', greatest(0, s.total_amount - s.amount_paid),
    'due_to_date', v_due, 'due_today', greatest(0, v_due - s.amount_paid),
    'billable_days', s.billable_days,
    'daily_minimum', case when coalesce(s.billable_days,0) > 0 then round(s.total_amount / s.billable_days, 2) else 0 end
  );
end;
$$;
revoke all on function public.subscription_payment_summary(uuid,date) from public, anon;
grant execute on function public.subscription_payment_summary(uuid,date) to authenticated;

-- 4. Notifications: customer, driver and every admin ---------------------------------------------
create or replace function public.notify_subscription_payment(p_payment_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare
  p public.subscription_payments; s public.commute_subscriptions;
  v_driver_user uuid; v_driver_name text; v_amt text; v_paid text; v_total text; v_data jsonb;
  v_ct text; v_cm text; v_dt text; v_dm text; v_at text; v_am text; v_type text := 'subscription_payment_received';
  v_notify_admin boolean := true;
begin
  select * into p from public.subscription_payments where id = p_payment_id;
  if not found then return; end if;
  select * into s from public.commute_subscriptions where id = p.subscription_id;
  select dr.user_id, dr.full_name into v_driver_user, v_driver_name from public.drivers dr where dr.id = p.driver_id;

  v_amt   := '₹' || regexp_replace(to_char(p.amount, 'FM999999990.00'), '\.00$', '');
  v_paid  := '₹' || regexp_replace(to_char(s.amount_paid, 'FM999999990.00'), '\.00$', '');
  v_total := '₹' || regexp_replace(to_char(s.total_amount, 'FM999999990.00'), '\.00$', '');
  v_data  := jsonb_build_object('subscription_id', s.id, 'payment_id', p.id, 'amount', p.amount, 'method', p.method,
                                'status', p.status, 'paid', s.amount_paid, 'total', s.total_amount);

  if p_kind = 'cash_recorded' then
    v_ct := 'Payment received'; v_cm := v_amt || ' cash received by your driver for your commute. Paid ' || v_paid || ' of ' || v_total || '.';
    v_dt := 'Payment recorded'; v_dm := v_amt || ' cash recorded for the commute trip.';
    v_at := 'Commute payment received'; v_am := v_amt || ' cash collected by ' || coalesce(v_driver_name,'the driver') || '. Paid ' || v_paid || ' of ' || v_total || '.';
  elsif p_kind = 'upi_verified' then
    v_ct := 'Payment received'; v_cm := 'UPI payment of ' || v_amt || ' noted by your driver. VOYNU will confirm it shortly. Paid ' || v_paid || ' of ' || v_total || '.';
    v_dt := 'UPI payment recorded'; v_dm := v_amt || ' via UPI recorded. Awaiting admin confirmation.';
    v_at := 'UPI payment to confirm'; v_am := v_amt || ' via UPI (UTR ' || p.utr || ') verified by ' || coalesce(v_driver_name,'the driver') || '. Please confirm it.';
    v_type := 'subscription_payment_review';
  elsif p_kind = 'confirmed' then
    v_ct := 'Payment confirmed'; v_cm := 'Your UPI payment of ' || v_amt || ' has been confirmed by VOYNU.';
    v_dt := 'UPI payment confirmed'; v_dm := 'The ' || v_amt || ' UPI payment has been confirmed by VOYNU.';
    v_notify_admin := false; v_type := 'subscription_payment_confirmed';
  elsif p_kind = 'rejected' then
    v_ct := 'UPI payment not verified'; v_cm := 'We could not verify your UPI payment of ' || v_amt || ' (UTR ' || p.utr || '). Please pay your driver at pickup or contact VOYNU.';
    v_dt := 'UPI payment rejected'; v_dm := 'The ' || v_amt || ' UPI payment (UTR ' || p.utr || ') could not be verified. Collect the day''s amount from the customer.';
    v_notify_admin := false; v_type := 'subscription_payment_rejected';
  else
    return;
  end if;

  insert into public.notifications(user_id, booking_id, type, title, message, data)
  select s.user_id, p.booking_id, v_type, v_ct, v_cm, v_data
  where exists (select 1 from public.profiles where id = s.user_id);

  if v_driver_user is not null then
    insert into public.notifications(user_id, booking_id, type, title, message, data)
    select v_driver_user, p.booking_id, v_type, v_dt, v_dm, v_data
    where exists (select 1 from public.profiles where id = v_driver_user);
  end if;

  if v_notify_admin then
    insert into public.notifications(user_id, booking_id, type, title, message, data)
    select a.id, p.booking_id, v_type, v_at, v_am, v_data from public.profiles a where a.role = 'admin';
  end if;
end;
$$;
revoke all on function public.notify_subscription_payment(uuid,text) from public, anon, authenticated;

-- 5. Driver records a payment at pickup ----------------------------------------------------------
create or replace function public.driver_record_subscription_payment(
  p_booking_id uuid, p_amount numeric, p_method text, p_utr text default null, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare
  v_driver public.drivers; b public.bookings; s public.commute_subscriptions; pay public.subscription_payments;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_amount numeric(12,2); v_key text; v_utr text; v_remaining numeric; v_due numeric; v_after numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_driver from public.drivers where user_id = auth.uid() and active;
  if not found then raise exception 'Driver access required'; end if;

  select * into b from public.bookings where id = p_booking_id;
  if not found or b.subscription_id is null then raise exception 'Commute trip not found'; end if;
  if b.driver_id is distinct from v_driver.id then raise exception 'This trip is not assigned to you'; end if;
  if b.booking_status in ('cancelled') then raise exception 'This trip is cancelled'; end if;
  if b.travel_date is distinct from v_today then raise exception 'Payment can only be recorded on the day of the trip'; end if;

  select * into s from public.commute_subscriptions where id = b.subscription_id for update;
  if s.status not in ('active','paused') then raise exception 'This subscription is not active'; end if;

  if p_method not in ('cash','upi') then raise exception 'Payment method must be cash or UPI'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid amount'; end if;
  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then raise exception 'Amount cannot have more than two decimals'; end if;
  v_key := coalesce(nullif(trim(p_idempotency_key),''), gen_random_uuid()::text);

  select * into pay from public.subscription_payments where subscription_id = s.id and idempotency_key = v_key;
  if found then
    return jsonb_build_object('duplicate', true, 'payment_id', pay.id, 'payment_record_status', pay.status, 'amount', pay.amount)
      || public.subscription_payment_summary(s.id, v_today);
  end if;

  v_remaining := greatest(0, s.total_amount - s.amount_paid);
  if v_remaining <= 0 then raise exception 'This subscription is already fully paid'; end if;
  if v_amount > v_remaining then
    raise exception 'Amount exceeds the outstanding balance of ₹%', regexp_replace(to_char(v_remaining,'FM999999990.00'),'\.00$','');
  end if;
  v_due := greatest(0, public.subscription_due_to_date(s.id, v_today) - s.amount_paid);

  if p_method = 'cash' then
    if v_due <= 0 then raise exception 'No cash is due today. Further payments must be made by UPI'; end if;
    if v_amount > v_due then
      raise exception 'Cash is limited to today''s due amount of ₹%. Larger amounts must be paid by UPI',
        regexp_replace(to_char(v_due,'FM999999990.00'),'\.00$','');
    end if;
    v_utr := null;
  else
    v_utr := upper(regexp_replace(coalesce(p_utr,''), '\s', '', 'g'));
    if v_utr !~ '^[A-Z0-9]{6,30}$' then raise exception 'Enter the UPI transaction reference (UTR)'; end if;
  end if;

  begin
    insert into public.subscription_payments(subscription_id, booking_id, user_id, driver_id, amount, method, utr, status, idempotency_key, recorded_by)
    values (s.id, b.id, s.user_id, v_driver.id, v_amount, p_method, v_utr,
            case when p_method = 'cash' then 'recorded' else 'driver_verified' end, v_key, auth.uid())
    returning * into pay;
  exception when unique_violation then
    raise exception 'This UPI reference has already been recorded';
  end;

  v_after := s.amount_paid + v_amount;
  update public.commute_subscriptions
     set amount_paid = v_after,
         payment_status = case when v_after >= total_amount then 'paid' else 'partial' end,
         updated_at = now()
   where id = s.id;

  perform public.notify_subscription_payment(pay.id, case when p_method = 'cash' then 'cash_recorded' else 'upi_verified' end);

  return jsonb_build_object('duplicate', false, 'payment_id', pay.id, 'payment_record_status', pay.status, 'amount', pay.amount)
    || public.subscription_payment_summary(s.id, v_today);
end;
$$;
revoke all on function public.driver_record_subscription_payment(uuid,numeric,text,text,text) from public, anon;
grant execute on function public.driver_record_subscription_payment(uuid,numeric,text,text,text) to authenticated;

-- 6. Admin confirms / rejects a driver-verified UPI payment ----------------------------------------
create or replace function public.admin_confirm_subscription_payment(p_payment_id uuid)
returns public.subscription_payments language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare pay public.subscription_payments;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into pay from public.subscription_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if pay.status = 'confirmed' then return pay; end if;
  if pay.status <> 'driver_verified' then raise exception 'Only a driver-verified UPI payment can be confirmed (status %)', pay.status; end if;
  update public.subscription_payments set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
   where id = p_payment_id returning * into pay;
  perform public.notify_subscription_payment(pay.id, 'confirmed');
  return pay;
end;
$$;
revoke all on function public.admin_confirm_subscription_payment(uuid) from public, anon;
grant execute on function public.admin_confirm_subscription_payment(uuid) to authenticated;

create or replace function public.admin_reject_subscription_payment(p_payment_id uuid, p_reason text)
returns public.subscription_payments language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare pay public.subscription_payments; s public.commute_subscriptions; v_after numeric;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if coalesce(length(trim(p_reason)),0) < 3 then raise exception 'A rejection reason is required'; end if;
  select * into pay from public.subscription_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if pay.status = 'rejected' then return pay; end if;
  if pay.status <> 'driver_verified' then raise exception 'Only an unconfirmed UPI payment can be rejected (status %)', pay.status; end if;

  select * into s from public.commute_subscriptions where id = pay.subscription_id for update;
  update public.subscription_payments
     set status = 'rejected', rejected_by = auth.uid(), rejected_at = now(), rejection_reason = trim(p_reason)
   where id = p_payment_id returning * into pay;

  v_after := greatest(0, s.amount_paid - pay.amount);
  update public.commute_subscriptions
     set amount_paid = v_after,
         payment_status = case
           when payment_status in ('pending','partial','paid') then (case when v_after <= 0 then 'pending' when v_after >= total_amount then 'paid' else 'partial' end)
           else payment_status end,
         updated_at = now()
   where id = s.id;

  perform public.notify_subscription_payment(pay.id, 'rejected');
  return pay;
end;
$$;
revoke all on function public.admin_reject_subscription_payment(uuid,text) from public, anon;
grant execute on function public.admin_reject_subscription_payment(uuid,text) to authenticated;

-- 7. Admin approval no longer means "paid" ---------------------------------------------------------
create or replace function public.admin_confirm_commute_subscription(p_subscription_id uuid)
returns public.commute_subscriptions language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into v from public.commute_subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if v.status in ('active','paused') then return v; end if;   -- idempotent
  if v.status <> 'pending_payment' then
    raise exception 'Only a pending subscription request can be approved (status %)', v.status;
  end if;
  update public.commute_subscriptions
     set status = 'active', approved_at = now(), updated_at = now()
   where id = p_subscription_id returning * into v;

  insert into public.notifications(user_id, type, title, message, data)
  select v.user_id, 'subscription_approved', 'Commute subscription approved',
         'Your commute subscription has been approved. You pay your driver at each pickup.',
         jsonb_build_object('subscription_id', v.id)
  where exists (select 1 from public.profiles where id = v.user_id);
  return v;
end;
$$;

create or replace function public.admin_set_commute_subscription_status(p_subscription_id uuid, p_status text)
returns public.commute_subscriptions language plpgsql security definer set search_path = 'public','pg_temp' as $$
declare v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status = 'cancelled' then raise exception 'Use admin_cancel_commute_subscription with a cancellation reason'; end if;
  if p_status = 'pending_payment' then raise exception 'A subscription cannot be moved back to pending payment'; end if;
  if p_status not in ('active','paused','completed') then raise exception 'Invalid subscription status'; end if;
  select * into v from public.commute_subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if v.status = p_status then return v; end if;
  if not ((v.status = 'active' and p_status in ('paused','completed'))
       or (v.status = 'paused' and p_status in ('active','completed'))) then
    raise exception 'Invalid status transition from % to %', v.status, p_status;
  end if;
  update public.commute_subscriptions set status = p_status, updated_at = now()
   where id = p_subscription_id returning * into v;
  return v;
end;
$$;

-- 8. Patch existing lifecycle functions in place (exactly-one-match guarded) ----------------------
create or replace function pg_temp.patch_fn(p_sig regprocedure, p_old text, p_new text) returns void language plpgsql as $$
declare v_def text; v_cnt int;
begin
  v_def := pg_get_functiondef(p_sig);
  v_cnt := (length(v_def) - length(replace(v_def, p_old, ''))) / length(p_old);
  if v_cnt <> 1 then raise exception 'patch % expected exactly one match of [%], found %', p_sig, p_old, v_cnt; end if;
  execute replace(v_def, p_old, p_new);
end;
$$;

-- Trip generation, pausing, availability and unavailability now key off "approved" (active/paused), not "paid".
select pg_temp.patch_fn('public.sync_commute_subscription_trips(uuid)'::regprocedure,
  ' or s.payment_status <> ''paid'' then return 0;', ' then return 0;');
select pg_temp.patch_fn('public.pause_commute_subscription_dates_internal(uuid,date[],text,uuid,text)'::regprocedure,
  's.payment_status <> ''paid'' or s.status not in (''active'',''paused'')', 's.status not in (''active'',''paused'')');
select pg_temp.patch_fn('public.pause_commute_subscription_dates_internal(uuid,date[],text,uuid,text)'::regprocedure,
  'Only paid active subscriptions can be paused', 'Only active subscriptions can be paused');
select pg_temp.patch_fn('public.request_driver_subscription_unavailability(date,date,text)'::regprocedure,
  'and s.payment_status=''paid'' and s.status in (''active'',''paused'')', 'and s.status in (''active'',''paused'')');
select pg_temp.patch_fn('public.set_driver_availability(text)'::regprocedure,
  'and s.payment_status=''paid''', '');

-- Cancellation refunds what was actually received (cash/UPI + wallet) beyond the value of chargeable days.
select pg_temp.patch_fn('public.cancel_commute_subscription_internal(uuid,text,uuid,text)'::regprocedure,
  'if s.payment_status=''paid'' then', 'if s.status in (''active'',''paused'') then');
select pg_temp.patch_fn('public.cancel_commute_subscription_internal(uuid,text,uuid,text)'::regprocedure,
  'v_refund:=round(v_daily_value*v_refundable_days,2);',
  'v_refund:=least(
      round(coalesce(s.amount_paid,0)+coalesce(s.wallet_used,0),2),
      greatest(0, round(
        (coalesce(s.amount_paid,0)+coalesce(s.wallet_used,0))
        - (coalesce(nullif(s.original_total_amount,0),round(coalesce(s.base_amount,0)-coalesce(s.discount_amount,0),2)) - v_daily_value*v_refundable_days),
      2)));');
select pg_temp.patch_fn('public.cancel_commute_subscription_internal(uuid,text,uuid,text)'::regprocedure,
  'payment_status=case when s.payment_status=''paid'' then ''refunded'' else ''failed'' end,',
  'payment_status=case when s.status in (''active'',''paused'') then ''refunded'' else ''failed'' end,');

-- Pre-existing bug found by the end-to-end test: bookings.cancelled_by is text constrained to
-- ('customer','driver','admin','system') but the cancel function wrote the actor's uuid, so cancelling a
-- subscription that already had generated future bookings failed with bookings_cancelled_by_check.
select pg_temp.patch_fn('public.cancel_commute_subscription_internal(uuid,text,uuid,text)'::regprocedure,
  E'cancelled_by=p_actor,\n      cancellation_reason=''Commute subscription cancelled: ''',
  E'cancelled_by=case when p_actor_role=''admin'' then ''admin'' else ''customer'' end,\n      cancellation_reason=''Commute subscription cancelled: ''');

-- Unapproved requests expire after 4 hours (was 30 minutes).
select pg_temp.patch_fn('public.expire_stale_commute_subscriptions()'::regprocedure,
  'interval ''30 minutes''', 'interval ''4 hours''');
