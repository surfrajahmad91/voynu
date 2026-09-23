create or replace function public.wallet_debit_internal(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type text,
  p_source text,
  p_source_key text,
  p_booking_id uuid default null,
  p_subscription_id uuid default null,
  p_description text default null,
  p_created_by uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_account public.wallet_accounts;
  v_tx public.wallet_transactions;
  v_amount numeric(12,2):=round(coalesce(p_amount,0),2);
begin
  if v_amount <= 0 then raise exception 'VOYNU: wallet debit must be positive'; end if;
  if p_transaction_type not in ('booking_use','reversal','expiry','admin_adjustment') then
    raise exception 'VOYNU: invalid wallet debit type';
  end if;

  insert into public.wallet_accounts(user_id)
  values(p_user_id)
  on conflict(user_id) do nothing;

  select * into v_account
  from public.wallet_accounts
  where user_id=p_user_id
  for update;

  if p_source_key is not null then
    select * into v_tx
    from public.wallet_transactions
    where source_key=p_source_key;
    if found then return v_tx; end if;
  end if;

  if v_account.balance < v_amount then
    raise exception 'VOYNU: insufficient wallet balance for debit';
  end if;

  update public.wallet_accounts
  set balance=balance-v_amount,updated_at=now()
  where id=v_account.id
  returning * into v_account;

  insert into public.wallet_transactions(
    wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,
    booking_id,subscription_id,description,created_by
  )
  values(
    v_account.id,p_user_id,p_transaction_type,-v_amount,v_account.balance,p_source,p_source_key,
    p_booking_id,p_subscription_id,p_description,p_created_by
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke all on function public.wallet_debit_internal(uuid,numeric,text,text,text,uuid,uuid,text,uuid) from public;
revoke execute on function public.wallet_debit_internal(uuid,numeric,text,text,text,uuid,uuid,text,uuid) from anon, authenticated;

create or replace function public.reverse_subscription_wallet_reward(p_subscription_id uuid)
returns numeric
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_subscription public.commute_subscriptions;
  v_reward public.wallet_transactions;
  v_account public.wallet_accounts;
  v_reverse numeric(12,2);
begin
  select * into v_subscription
  from public.commute_subscriptions
  where id=p_subscription_id
  for update;

  if not found then raise exception 'VOYNU: subscription not found'; end if;

  select * into v_reward
  from public.wallet_transactions
  where subscription_id=p_subscription_id
    and transaction_type='reward'
    and source='subscription_reward'
    and source_key like 'subscription_reward:'||p_subscription_id::text||':%'
  order by created_at desc
  limit 1;

  if not found then return 0; end if;

  select * into v_account
  from public.wallet_accounts
  where user_id=v_subscription.user_id
  for update;

  if not found then return 0; end if;

  v_reverse := least(coalesce(v_reward.amount,0), coalesce(v_account.balance,0));
  if v_reverse <= 0 then return 0; end if;

  perform public.wallet_debit_internal(
    v_subscription.user_id,
    v_reverse,
    'reversal',
    'subscription_reward_reversal',
    'subscription_reward_reversal:'||v_reward.id::text,
    null,
    p_subscription_id,
    case
      when v_reverse = v_reward.amount
        then 'VOYNU wallet reward reversed because the paid commute subscription was refunded'
      else
        'VOYNU wallet reward partially reversed; only unused wallet credits were available'
    end,
    null
  );

  return v_reverse;
end;
$$;

revoke all on function public.reverse_subscription_wallet_reward(uuid) from public;
revoke execute on function public.reverse_subscription_wallet_reward(uuid) from anon, authenticated;

create or replace function public.admin_refund_commute_subscription(p_subscription_id uuid)
returns public.commute_subscriptions
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v public.commute_subscriptions;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select * into v
  from public.commute_subscriptions
  where id=p_subscription_id
  for update;

  if not found then raise exception 'Subscription not found'; end if;
  if v.payment_status <> 'paid' then
    raise exception 'Only paid subscriptions can be refunded';
  end if;

  update public.commute_subscriptions
  set payment_status='refunded',
      status='cancelled',
      assigned_driver_id=null,
      assigned_vehicle_id=null,
      updated_at=now()
  where id=p_subscription_id
  returning * into v;

  perform public.reverse_subscription_wallet_reward(p_subscription_id);

  select * into v
  from public.commute_subscriptions
  where id=p_subscription_id;

  return v;
end;
$$;

revoke all on function public.admin_refund_commute_subscription(uuid) from public;
revoke execute on function public.admin_refund_commute_subscription(uuid) from anon, authenticated;
