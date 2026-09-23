-- Harden wallet credits against duplicate/replayed reward/refund events.
-- The wallet account is locked before the source-key check, and the unique source_key
-- remains the final idempotency guard.
create or replace function public.wallet_credit(
  p_user_id uuid,p_amount numeric,p_transaction_type text,p_source text,
  p_source_key text default null,p_booking_id uuid default null,p_subscription_id uuid default null,
  p_description text default null,p_expires_at timestamptz default null,p_created_by uuid default auth.uid()
) returns public.wallet_transactions
language plpgsql security definer set search_path='public','pg_temp'
as $$
declare
  v_account public.wallet_accounts;
  v_tx public.wallet_transactions;
  v_amount numeric(12,2):=round(coalesce(p_amount,0),2);
  v_actor uuid:=auth.uid();
begin
  if v_amount<=0 then raise exception 'VOYNU: wallet credit must be positive'; end if;
  if p_transaction_type not in ('reward','refund','reversal','admin_adjustment') then raise exception 'VOYNU: invalid wallet credit type'; end if;
  if v_actor is not null and not public.is_admin() and v_actor is distinct from p_user_id then raise exception 'VOYNU: wallet credit access denied'; end if;
  insert into public.wallet_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into v_account from public.wallet_accounts where user_id=p_user_id for update;
  if p_source_key is not null then
    select * into v_tx from public.wallet_transactions where source_key=p_source_key;
    if found then return v_tx; end if;
  end if;
  update public.wallet_accounts set balance=balance+v_amount,updated_at=now() where id=v_account.id returning * into v_account;
  begin
    insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,booking_id,subscription_id,description,expires_at,created_by)
    values(v_account.id,p_user_id,p_transaction_type,v_amount,v_account.balance,p_source,p_source_key,p_booking_id,p_subscription_id,p_description,p_expires_at,p_created_by)
    returning * into v_tx;
  exception when unique_violation then
    if p_source_key is null then raise; end if;
    update public.wallet_accounts set balance=balance-v_amount,updated_at=now() where id=v_account.id;
    select * into v_tx from public.wallet_transactions where source_key=p_source_key;
    if not found then raise; end if;
    return v_tx;
  end;
  return v_tx;
end;
$$;
revoke all on function public.wallet_credit(uuid,numeric,text,text,text,uuid,uuid,text,timestamptz,uuid) from public;
revoke execute on function public.wallet_credit(uuid,numeric,text,text,text,uuid,uuid,text,timestamptz,uuid) from authenticated;
