-- Return wallet credits when a commute subscription does not successfully settle.
-- Wallet deduction remains idempotent via wallet_transactions.source_key.

create or replace function public.refund_wallet_on_subscription_outcome()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_settings public.wallet_settings;
  v_amount numeric(12,2):=round(coalesce(old.wallet_used,0),2);
  v_should_refund boolean:=false;
begin
  if v_amount<=0 then
    return new;
  end if;

  if new.payment_status in ('failed','refunded') then
    v_should_refund:=true;
  elsif new.status='cancelled' and old.payment_status is distinct from 'paid' then
    v_should_refund:=true;
  end if;

  if v_should_refund then
    select * into v_settings
    from public.wallet_settings
    where id=true;

    if coalesce(v_settings.refund_to_wallet_enabled,true) then
      perform public.wallet_credit(
        new.user_id,
        v_amount,
        'refund',
        'subscription_outcome',
        'subscription_wallet_refund:'||new.id::text,
        null,
        new.id,
        'Wallet credits returned after commute subscription payment failure/refund',
        null,
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_refund_wallet_on_subscription_outcome on public.commute_subscriptions;
create trigger trg_refund_wallet_on_subscription_outcome
after update on public.commute_subscriptions
for each row
execute function public.refund_wallet_on_subscription_outcome();
