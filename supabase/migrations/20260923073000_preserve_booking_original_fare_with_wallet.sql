-- Preserve the authoritative quoted/original fare while wallet credits reduce the payable fare.
-- The booking wallet trigger remains atomic and row-locks the customer's wallet account.
create or replace function public.apply_wallet_on_booking_insert()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_settings public.wallet_settings;
  v_account public.wallet_accounts;
  v_requested numeric(12,2):=round(coalesce(new.wallet_requested_amount,0),2);
  v_allowed numeric(12,2):=0;
  v_applied numeric(12,2):=0;
  v_original_fare numeric(12,2):=round(coalesce(new.fare,0),2);
  v_original_quoted_fare numeric(12,2):=round(coalesce(new.quoted_fare,new.fare),2);
  v_service text:=case when new.trip_type='roundtrip' then 'roundtrip' else 'oneway' end;
begin
  new.wallet_used:=0;
  if v_requested<=0 then return new; end if;
  if auth.uid() is null or auth.uid() is distinct from new.user_id then raise exception 'VOYNU: wallet booking access denied'; end if;

  select * into v_settings from public.wallet_settings where id=true;
  if not coalesce(v_settings.wallet_enabled,false) then raise exception 'VOYNU: wallet is currently unavailable'; end if;
  if not (v_service=any(v_settings.eligible_services)) then raise exception 'VOYNU: wallet cannot be used for this service'; end if;
  if v_original_fare<v_settings.min_booking_amount then raise exception 'VOYNU: booking amount is below the wallet minimum'; end if;

  insert into public.wallet_accounts(user_id) values(new.user_id) on conflict(user_id) do nothing;
  select * into v_account from public.wallet_accounts where user_id=new.user_id for update;
  v_allowed:=least(v_account.balance,round(v_original_fare*v_settings.max_usage_percent/100,2));
  if v_requested>v_allowed+0.009 then raise exception 'VOYNU: requested wallet amount exceeds the currently available limit'; end if;
  v_applied:=v_requested;
  if v_applied>v_original_fare then raise exception 'VOYNU: wallet amount cannot exceed booking fare'; end if;

  update public.wallet_accounts set balance=balance-v_applied,updated_at=now() where id=v_account.id returning * into v_account;
  new.fare:=round(v_original_fare-v_applied,2);
  new.quoted_fare:=v_original_quoted_fare;
  new.wallet_used:=v_applied;
  new.wallet_requested_amount:=v_requested;
  new.fare_breakdown:=coalesce(new.fare_breakdown,'{}'::jsonb)||jsonb_build_object('walletUsed',v_applied,'originalFare',v_original_fare,'payableFare',new.fare,'walletBalanceBefore',v_account.balance+v_applied,'walletUsagePercent',v_settings.max_usage_percent);

  insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,booking_id,description)
  values(v_account.id,new.user_id,'booking_use',-v_applied,v_account.balance,'booking','booking_wallet:'||new.id::text,new.id,'Wallet credits used on booking');
  return new;
end;
$$;
