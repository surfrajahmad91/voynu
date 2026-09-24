-- VOYNU 2.0 / P0: enforce commute subscription payment/status transitions in the database.
-- Found: admin_set_commute_subscription_status accepted any status for any subscription
-- (activate an unpaid request, resurrect a cancelled/refunded one, move a paid one back to
-- pending_payment) and admin_confirm_commute_subscription could re-activate a paused one.
-- The admin UI only ever calls: confirm (pending_payment+pending) and resume (paused+paid -> active),
-- so these guards do not change any UI-reachable behaviour.

create or replace function public.admin_confirm_commute_subscription(p_subscription_id uuid)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select * into v from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;

  -- Idempotent: confirming an already-confirmed subscription changes nothing.
  if v.status='active' and v.payment_status='paid' then return v; end if;

  if v.status<>'pending_payment' or v.payment_status<>'pending' then
    raise exception 'Subscription is not awaiting payment (status %, payment %)', v.status, v.payment_status;
  end if;

  update public.commute_subscriptions
     set payment_status='paid',
         status='active',
         payment_confirmed_at=coalesce(payment_confirmed_at,now()),
         updated_at=now()
   where id=p_subscription_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.admin_set_commute_subscription_status(p_subscription_id uuid,p_status text)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status='cancelled' then
    raise exception 'Use admin_cancel_commute_subscription with a cancellation reason';
  end if;
  if p_status='pending_payment' then
    raise exception 'A subscription cannot be moved back to pending payment';
  end if;
  if p_status not in ('active','paused','completed') then
    raise exception 'Invalid subscription status';
  end if;

  select * into v from public.commute_subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;

  if v.status=p_status then return v; end if;

  if v.payment_status<>'paid' then
    raise exception 'Only paid subscriptions can change status (payment is %)', v.payment_status;
  end if;
  if not ((v.status='active' and p_status in ('paused','completed'))
       or (v.status='paused' and p_status in ('active','completed'))) then
    raise exception 'Invalid status transition from % to %', v.status, p_status;
  end if;

  update public.commute_subscriptions
     set status=p_status, updated_at=now()
   where id=p_subscription_id
  returning * into v;
  return v;
end;
$$;
