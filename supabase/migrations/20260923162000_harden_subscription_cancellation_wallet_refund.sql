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
  if v_amount<=0 then return new; end if;

  if new.payment_status='failed' then
    v_should_refund:=true;
  elsif new.payment_status='refunded'
    and old.payment_status is distinct from 'refunded'
    and new.cancellation_reason is null then
    v_should_refund:=true;
  elsif new.status='cancelled'
    and old.payment_status is distinct from 'paid'
    and new.cancellation_reason is null then
    v_should_refund:=true;
  end if;

  if v_should_refund then
    select * into v_settings from public.wallet_settings where id=true;
    if coalesce(v_settings.refund_to_wallet_enabled,true) then
      perform public.wallet_credit(
        new.user_id,v_amount,'refund','subscription_outcome',
        'subscription_wallet_refund:'||new.id::text,null,new.id,
        'Wallet credits returned after commute subscription payment failure/refund',
        null,null
      );
    end if;
  end if;
  return new;
end;
$$;
