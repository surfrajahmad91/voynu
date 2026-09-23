-- Commute subscription lifecycle: authoritative pauses, 4-hour cutoff,
-- schedule extension, reason/audit fields, and partial cancellation refunds.

alter table public.commute_subscriptions
  add column if not exists original_total_amount numeric(12,2);

update public.commute_subscriptions
set original_total_amount = round(coalesce(base_amount,0) - coalesce(discount_amount,0),2)
where coalesce(original_total_amount,0) <= 0;

alter table public.commute_subscriptions
  alter column original_total_amount set default 0;

update public.commute_subscriptions
set off_day_cutoff_hours = 4
where off_day_cutoff_hours is distinct from 4;

alter table public.subscription_exceptions
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists created_by_role text;

alter table public.subscription_exceptions
  drop constraint if exists subscription_exceptions_kind_check;

alter table public.subscription_exceptions
  add constraint subscription_exceptions_kind_check
  check (kind in (
    'customer_off','customer_pause','admin_pause','company_holiday',
    'school_holiday','voynu_closure','driver_unavailable',
    'operational_exception','other'
  ));

alter table public.commute_subscriptions
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancelled_by_role text;

create or replace function public.apply_wallet_on_subscription_insert()
returns trigger language plpgsql security definer set search_path='public','pg_temp'
as $$
declare
  v_settings public.wallet_settings;
  v_account public.wallet_accounts;
  v_requested numeric(12,2):=round(coalesce(new.wallet_requested_amount,0),2);
  v_allowed numeric(12,2);
  v_applied numeric(12,2);
begin
  if coalesce(new.original_total_amount,0) <= 0 then
    new.original_total_amount:=round(coalesce(new.total_amount,0),2);
  end if;
  new.wallet_used:=0;
  if v_requested<=0 then return new; end if;
  if auth.uid() is null and auth.role() <> 'service_role' then raise exception 'VOYNU: wallet subscription access denied'; end if;
  if auth.uid() is not null and auth.uid() is distinct from new.user_id then raise exception 'VOYNU: wallet subscription access denied'; end if;
  select * into v_settings from public.wallet_settings where id=true;
  if not coalesce(v_settings.wallet_enabled,false) then raise exception 'VOYNU: wallet is currently unavailable'; end if;
  if not ('commute'=any(v_settings.eligible_services)) then raise exception 'VOYNU: wallet cannot be used for commute subscriptions'; end if;
  if coalesce(new.total_amount,0)<v_settings.min_booking_amount then raise exception 'VOYNU: subscription amount is below the wallet minimum'; end if;
  insert into public.wallet_accounts(user_id) values(new.user_id) on conflict(user_id) do nothing;
  select * into v_account from public.wallet_accounts where user_id=new.user_id for update;
  v_allowed:=least(v_account.balance,round(greatest(0,new.total_amount)*v_settings.max_usage_percent/100,2));
  if v_requested>v_allowed+0.009 then raise exception 'VOYNU: requested wallet amount exceeds the currently available subscription limit'; end if;
  v_applied:=v_requested;
  if v_applied>new.total_amount then raise exception 'VOYNU: wallet amount cannot exceed subscription total'; end if;
  update public.wallet_accounts set balance=balance-v_applied,updated_at=now() where id=v_account.id returning * into v_account;
  new.total_amount:=round(new.total_amount-v_applied,2);
  new.wallet_used:=v_applied;
  new.wallet_requested_amount:=v_requested;
  insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,subscription_id,description)
  values(v_account.id,new.user_id,'booking_use',-v_applied,v_account.balance,'subscription','subscription_wallet:'||new.id::text,new.id,'Wallet credits used on commute subscription');
  return new;
end;
$$;

create or replace function public.extend_commute_subscription_schedule(p_subscription_id uuid)
returns date language plpgsql security definer set search_path='public','pg_temp'
as $$
declare s public.commute_subscriptions%rowtype; d date; v_count integer:=0; v_end date;
begin
  select * into s from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  d:=s.start_date;
  while v_count < s.billable_days loop
    if extract(isodow from d)::smallint=any(s.weekdays)
       and not exists(select 1 from public.subscription_holidays h where h.holiday_date=d and h.active)
       and not exists(select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d and e.chargeable=false)
    then v_count:=v_count+1; v_end:=d; end if;
    d:=d+1;
  end loop;
  update public.commute_subscriptions set end_date=v_end,updated_at=now() where id=s.id;
  return v_end;
end;
$$;

revoke all on function public.extend_commute_subscription_schedule(uuid) from public,anon,authenticated;

create or replace function public.pause_commute_subscription_dates_internal(p_subscription_id uuid,p_dates date[],p_reason text,p_actor uuid,p_actor_role text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$
declare
  s public.commute_subscriptions%rowtype; d date; v_trip public.subscription_trips%rowtype;
  v_scheduled timestamptz; v_cutoff interval;
begin
  if p_actor is null then raise exception 'Authentication required'; end if;
  if coalesce(length(trim(p_reason)),0)<3 then raise exception 'A pause reason is required'; end if;
  if p_dates is null or cardinality(p_dates)<1 then raise exception 'Select at least one service day'; end if;
  select * into s from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if s.payment_status <> 'paid' or s.status not in ('active','paused') then raise exception 'Only paid active subscriptions can be paused'; end if;
  if s.user_id is distinct from p_actor and p_actor_role<>'admin' then raise exception 'Subscription access denied'; end if;
  v_cutoff:=make_interval(hours=>coalesce(s.off_day_cutoff_hours,4));
  foreach d in array p_dates loop
    if d < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Pause dates must be today or in the future'; end if;
    if extract(isodow from d)::smallint <> all(s.weekdays) then raise exception 'Selected date % is not one of the subscription travel days',d; end if;
    if exists(select 1 from public.subscription_holidays h where h.holiday_date=d and h.active) then raise exception 'Selected date % is already a company holiday',d; end if;
    if d > s.end_date then raise exception 'Selected date % is outside the current subscription schedule',d; end if;
    if exists(select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d) then raise exception 'Selected date % already has a subscription exception',d; end if;
    select * into v_trip from public.subscription_trips where subscription_id=s.id and trip_date=d for update;
    if v_trip.id is not null and v_trip.status in ('completed','cancelled') then raise exception 'Selected date % has already been completed or cancelled',d; end if;
    v_scheduled:=(d::timestamp+s.morning_pickup_time) at time zone 'Asia/Kolkata';
    if now() > v_scheduled-v_cutoff then raise exception 'The 4-hour cutoff has passed for %; that round-trip remains chargeable',d; end if;
    insert into public.subscription_exceptions(subscription_id,exception_date,reason,kind,chargeable,created_by,created_by_role)
    values(s.id,d,trim(p_reason),case when p_actor_role='admin' then 'admin_pause' else 'customer_pause' end,false,p_actor,p_actor_role);
  end loop;
  perform public.extend_commute_subscription_schedule(s.id);
  perform public.sync_commute_subscription_trips(s.id);
  select * into s from public.commute_subscriptions where id=p_subscription_id;
  return s;
end;
$$;

create or replace function public.customer_pause_commute_subscription(p_subscription_id uuid,p_dates date[],p_reason text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$ begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.pause_commute_subscription_dates_internal(p_subscription_id,p_dates,p_reason,auth.uid(),'customer');
end; $$;

create or replace function public.admin_pause_commute_subscription(p_subscription_id uuid,p_dates date[],p_reason text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$ begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return public.pause_commute_subscription_dates_internal(p_subscription_id,p_dates,p_reason,auth.uid(),'admin');
end; $$;

revoke all on function public.pause_commute_subscription_dates_internal(uuid,date[],text,uuid,text) from public,anon,authenticated;
revoke all on function public.customer_pause_commute_subscription(uuid,date[],text) from public;
revoke all on function public.admin_pause_commute_subscription(uuid,date[],text) from public;
grant execute on function public.customer_pause_commute_subscription(uuid,date[],text) to authenticated;
grant execute on function public.admin_pause_commute_subscription(uuid,date[],text) to authenticated;

create or replace function public.cancel_commute_subscription_internal(p_subscription_id uuid,p_reason text,p_actor uuid,p_actor_role text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$
declare
  s public.commute_subscriptions%rowtype; t public.subscription_trips%rowtype; d date;
  v_now_ist timestamptz:=now(); v_cutoff interval; v_refundable_days integer:=0;
  v_refund numeric(12,2):=0; v_daily_value numeric(12,2);
  v_nonchargeable boolean; v_chargeable_exception boolean; v_scheduled timestamptz;
begin
  if p_actor is null then raise exception 'Authentication required'; end if;
  if coalesce(length(trim(p_reason)),0)<3 then raise exception 'A cancellation reason is required'; end if;
  select * into s from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if s.status in ('cancelled','completed') then raise exception 'Subscription is already closed'; end if;
  if s.user_id is distinct from p_actor and p_actor_role<>'admin' then raise exception 'Subscription access denied'; end if;

  if s.payment_status='paid' then
    v_daily_value:=round(coalesce(nullif(s.original_total_amount,0),round(coalesce(s.base_amount,0)-coalesce(s.discount_amount,0),2))/nullif(s.billable_days,0),2);
    v_cutoff:=make_interval(hours=>coalesce(s.off_day_cutoff_hours,4));
    d:=s.start_date;
    while d<=s.end_date loop
      if d >= (v_now_ist at time zone 'Asia/Kolkata')::date
         and extract(isodow from d)::smallint=any(s.weekdays)
         and not exists(select 1 from public.subscription_holidays h where h.holiday_date=d and h.active)
      then
        select * into t from public.subscription_trips where subscription_id=s.id and trip_date=d;
        v_nonchargeable:=exists(select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d and e.chargeable=false);
        v_chargeable_exception:=exists(select 1 from public.subscription_exceptions e where e.subscription_id=s.id and e.exception_date=d and e.chargeable=true);
        v_scheduled:=(d::timestamp+s.morning_pickup_time) at time zone 'Asia/Kolkata';
        if v_nonchargeable then
          v_refundable_days:=v_refundable_days+1;
        elsif not v_chargeable_exception and v_scheduled >= v_now_ist+v_cutoff then
          v_refundable_days:=v_refundable_days+1;
        end if;
      end if;
      d:=d+1;
    end loop;
    v_refund:=round(v_daily_value*v_refundable_days,2);
  end if;

  update public.commute_subscriptions
  set status='cancelled',
      payment_status=case when s.payment_status='paid' then 'refunded' else 'failed' end,
      cancellation_reason=trim(p_reason),cancelled_at=now(),cancelled_by=p_actor,cancelled_by_role=p_actor_role,
      assigned_driver_id=case when exists(select 1 from public.bookings bx where bx.subscription_id=s.id and bx.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started')) then s.assigned_driver_id else null end,
      assigned_vehicle_id=case when exists(select 1 from public.bookings bx where bx.subscription_id=s.id and bx.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started')) then s.assigned_vehicle_id else null end,
      updated_at=now()
  where id=s.id returning * into s;

  update public.subscription_trips
  set status=case when status='off' then 'off' else 'cancelled' end
  where subscription_id=s.id and trip_date >= (v_now_ist at time zone 'Asia/Kolkata')::date
    and not exists(select 1 from public.bookings bx where bx.subscription_trip_id=subscription_trips.id and bx.booking_status in ('on_the_way','arrived','trip_started','waiting_for_return','return_trip_started','trip_completed'));

  update public.bookings
  set booking_status='cancelled',status='cancelled',cancelled_at=now(),cancelled_by=p_actor,
      cancellation_reason='Commute subscription cancelled: '||trim(p_reason),updated_at=now()
  where subscription_id=s.id and travel_date >= (v_now_ist at time zone 'Asia/Kolkata')::date
    and booking_status in ('confirmed','driver_assigned');

  delete from public.driver_assignments da using public.bookings bx
  where da.booking_id=bx.id and bx.subscription_id=s.id and bx.booking_status='cancelled' and da.status='assigned';

  if v_refund>0 and s.payment_status='refunded' then
    perform public.wallet_credit(s.user_id,v_refund,'refund','subscription_cancellation','subscription_cancellation_refund:'||s.id::text,null,s.id,'Refund for unused service days after commute subscription cancellation',null,p_actor);
  end if;

  perform public.reverse_subscription_wallet_reward(s.id);
  return s;
end;
$$;

create or replace function public.customer_cancel_commute_subscription(p_subscription_id uuid,p_reason text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$ begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.cancel_commute_subscription_internal(p_subscription_id,p_reason,auth.uid(),'customer');
end; $$;

create or replace function public.admin_cancel_commute_subscription(p_subscription_id uuid,p_reason text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$ begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return public.cancel_commute_subscription_internal(p_subscription_id,p_reason,auth.uid(),'admin');
end; $$;

revoke all on function public.cancel_commute_subscription_internal(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.customer_cancel_commute_subscription(uuid,text) from public;
revoke all on function public.admin_cancel_commute_subscription(uuid,text) from public;
grant execute on function public.customer_cancel_commute_subscription(uuid,text) to authenticated;
grant execute on function public.admin_cancel_commute_subscription(uuid,text) to authenticated;

create or replace function public.admin_set_commute_subscription_status(p_subscription_id uuid,p_status text)
returns public.commute_subscriptions language plpgsql security definer set search_path='public','pg_temp'
as $$
declare v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status='cancelled' then raise exception 'Use admin_cancel_commute_subscription with a cancellation reason'; end if;
  if p_status not in ('pending_payment','active','paused','completed') then raise exception 'Invalid subscription status'; end if;
  update public.commute_subscriptions set status=p_status,updated_at=now() where id=p_subscription_id returning * into v;
  if not found then raise exception 'Subscription not found'; end if;
  return v;
end;
$$;
