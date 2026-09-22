-- VOYNU Wallet & Rewards foundation. See Supabase migration applied 2026-09-22.
-- Closed-loop VOYNU service credits only: no customer top-up or cash withdrawal.

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint wallet_accounts_balance_check check (balance >= 0)
);
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(), wallet_account_id uuid not null references public.wallet_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, transaction_type text not null, amount numeric(12,2) not null,
  balance_after numeric(12,2) not null, source text not null, source_key text unique, booking_id uuid references public.bookings(id) on delete set null,
  subscription_id uuid references public.commute_subscriptions(id) on delete set null, description text, expires_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  constraint wallet_transactions_type_check check (transaction_type in ('reward','refund','booking_use','reversal','expiry','admin_adjustment')),
  constraint wallet_transactions_amount_check check (amount <> 0), constraint wallet_transactions_balance_check check (balance_after >= 0)
);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_transactions_booking_idx on public.wallet_transactions(booking_id) where booking_id is not null;
create index if not exists wallet_transactions_expiry_idx on public.wallet_transactions(expires_at) where expires_at is not null;
create table if not exists public.wallet_settings (
  id boolean primary key default true check (id), wallet_enabled boolean not null default true, max_usage_percent numeric(5,2) not null default 10,
  min_booking_amount numeric(12,2) not null default 0, reward_expiry_days integer not null default 0, refund_to_wallet_enabled boolean not null default true,
  eligible_services text[] not null default array['oneway','roundtrip','commute','rental'], updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
  constraint wallet_settings_percent_check check (max_usage_percent >= 0 and max_usage_percent <= 100), constraint wallet_settings_min_check check (min_booking_amount >= 0),
  constraint wallet_settings_expiry_check check (reward_expiry_days >= 0)
);
insert into public.wallet_settings(id) values(true) on conflict(id) do nothing;
create table if not exists public.wallet_reward_rules (
  id uuid primary key default gen_random_uuid(), code text not null unique, qualifying_rides integer not null, reward_amount numeric(12,2) not null default 0,
  active boolean not null default false, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint wallet_reward_rules_rides_check check (qualifying_rides > 0), constraint wallet_reward_rules_amount_check check (reward_amount >= 0)
);
insert into public.wallet_reward_rules(code,qualifying_rides,reward_amount,active,description) values
('ride_5',5,0,false,'Reward after the 5th qualifying completed and paid ride'),('ride_10',10,0,false,'Reward after the 10th qualifying completed and paid ride') on conflict(code) do nothing;
alter table public.bookings add column if not exists wallet_used numeric(12,2) not null default 0;
alter table public.bookings add column if not exists wallet_requested_amount numeric(12,2) not null default 0;
alter table public.subscription_plans add column if not exists wallet_reward_amount numeric(12,2) not null default 0;
alter table public.subscription_plans drop constraint if exists subscription_plans_wallet_reward_check;
alter table public.subscription_plans add constraint subscription_plans_wallet_reward_check check (wallet_reward_amount >= 0);
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_settings enable row level security;
alter table public.wallet_reward_rules enable row level security;
drop policy if exists wallet_accounts_owner_read on public.wallet_accounts;
create policy wallet_accounts_owner_read on public.wallet_accounts for select to authenticated using (user_id = auth.uid() or (select is_admin()));
drop policy if exists wallet_transactions_owner_read on public.wallet_transactions;
create policy wallet_transactions_owner_read on public.wallet_transactions for select to authenticated using (user_id = auth.uid() or (select is_admin()));
drop policy if exists wallet_settings_read on public.wallet_settings;
create policy wallet_settings_read on public.wallet_settings for select to authenticated using (true);
drop policy if exists wallet_reward_rules_read on public.wallet_reward_rules;
create policy wallet_reward_rules_read on public.wallet_reward_rules for select to authenticated using (active = true or (select is_admin()));

create or replace function public.get_wallet_summary(p_booking_amount numeric default 0) returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_user uuid:=auth.uid(); v_balance numeric(12,2):=0; v_enabled boolean; v_percent numeric(5,2); v_min numeric(12,2); v_max numeric(12,2):=0; v_amount numeric(12,2):=greatest(0,coalesce(p_booking_amount,0));
begin if v_user is null then raise exception 'VOYNU: authentication required'; end if;
select wallet_enabled,max_usage_percent,min_booking_amount into v_enabled,v_percent,v_min from public.wallet_settings where id=true;
select balance into v_balance from public.wallet_accounts where user_id=v_user; v_balance:=coalesce(v_balance,0);
if coalesce(v_enabled,false) and v_amount>=coalesce(v_min,0) then v_max:=least(v_balance,round(v_amount*coalesce(v_percent,0)/100,2)); end if;
return jsonb_build_object('enabled',coalesce(v_enabled,false),'balance',v_balance,'maxUsagePercent',coalesce(v_percent,0),'minBookingAmount',coalesce(v_min,0),'maxUsable',v_max,'currency','INR'); end; $$;
revoke all on function public.get_wallet_summary(numeric) from public; grant execute on function public.get_wallet_summary(numeric) to authenticated;

create or replace function public.wallet_credit(p_user_id uuid,p_amount numeric,p_transaction_type text,p_source text,p_source_key text default null,p_booking_id uuid default null,p_subscription_id uuid default null,p_description text default null,p_expires_at timestamptz default null,p_created_by uuid default auth.uid()) returns public.wallet_transactions language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_account public.wallet_accounts; v_tx public.wallet_transactions; v_amount numeric(12,2):=round(coalesce(p_amount,0),2); v_actor uuid:=auth.uid();
begin if v_amount<=0 then raise exception 'VOYNU: wallet credit must be positive'; end if; if p_transaction_type not in ('reward','refund','reversal','admin_adjustment') then raise exception 'VOYNU: invalid wallet credit type'; end if;
if p_source_key is not null and exists(select 1 from public.wallet_transactions where source_key=p_source_key) then select * into v_tx from public.wallet_transactions where source_key=p_source_key limit 1; return v_tx; end if;
if v_actor is not null and not public.is_admin() and v_actor is distinct from p_user_id then raise exception 'VOYNU: wallet credit access denied'; end if;
insert into public.wallet_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing; select * into v_account from public.wallet_accounts where user_id=p_user_id for update;
update public.wallet_accounts set balance=balance+v_amount,updated_at=now() where id=v_account.id returning * into v_account;
insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,booking_id,subscription_id,description,expires_at,created_by)
values(v_account.id,p_user_id,p_transaction_type,v_amount,v_account.balance,p_source,p_source_key,p_booking_id,p_subscription_id,p_description,p_expires_at,p_created_by) returning * into v_tx; return v_tx; end; $$;
revoke all on function public.wallet_credit(uuid,numeric,text,text,text,uuid,uuid,text,timestamptz,uuid) from public; grant execute on function public.wallet_credit(uuid,numeric,text,text,text,uuid,uuid,text,timestamptz,uuid) to authenticated;

create or replace function public.admin_set_wallet_settings(p_enabled boolean,p_max_usage_percent numeric,p_min_booking_amount numeric,p_reward_expiry_days integer,p_refund_to_wallet boolean,p_eligible_services text[]) returns public.wallet_settings language plpgsql security definer set search_path='public','pg_temp' as $$ declare v public.wallet_settings; begin
if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; if p_max_usage_percent<0 or p_max_usage_percent>100 then raise exception 'VOYNU: wallet usage percentage must be between 0 and 100'; end if; if p_min_booking_amount<0 or p_reward_expiry_days<0 then raise exception 'VOYNU: wallet settings cannot be negative'; end if;
update public.wallet_settings set wallet_enabled=p_enabled,max_usage_percent=p_max_usage_percent,min_booking_amount=p_min_booking_amount,reward_expiry_days=p_reward_expiry_days,refund_to_wallet_enabled=p_refund_to_wallet,eligible_services=coalesce(p_eligible_services,eligible_services),updated_at=now(),updated_by=auth.uid() where id=true returning * into v; return v; end; $$;
revoke all on function public.admin_set_wallet_settings(boolean,numeric,numeric,integer,boolean,text[]) from public; grant execute on function public.admin_set_wallet_settings(boolean,numeric,numeric,integer,boolean,text[]) to authenticated;

create or replace function public.admin_set_wallet_reward_rule(p_id uuid,p_reward_amount numeric,p_active boolean) returns public.wallet_reward_rules language plpgsql security definer set search_path='public','pg_temp' as $$ declare v public.wallet_reward_rules; begin
if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; if p_reward_amount<0 then raise exception 'VOYNU: reward cannot be negative'; end if;
update public.wallet_reward_rules set reward_amount=round(p_reward_amount,2),active=p_active,updated_at=now() where id=p_id returning * into v; if not found then raise exception 'VOYNU: reward rule not found'; end if; return v; end; $$;
revoke all on function public.admin_set_wallet_reward_rule(uuid,numeric,boolean) from public; grant execute on function public.admin_set_wallet_reward_rule(uuid,numeric,boolean) to authenticated;

create or replace function public.admin_adjust_wallet(p_user_id uuid,p_amount numeric,p_description text) returns public.wallet_transactions language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_account public.wallet_accounts; v_tx public.wallet_transactions; v_amount numeric(12,2):=round(coalesce(p_amount,0),2); v_balance numeric(12,2); v_key text:='admin_adjust:'||gen_random_uuid()::text;
begin if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if; if v_amount=0 then raise exception 'VOYNU: adjustment cannot be zero'; end if;
insert into public.wallet_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing; select * into v_account from public.wallet_accounts where user_id=p_user_id for update; v_balance:=v_account.balance+v_amount; if v_balance<0 then raise exception 'VOYNU: adjustment would make wallet negative'; end if;
update public.wallet_accounts set balance=v_balance,updated_at=now() where id=v_account.id;
insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,description,created_by) values(v_account.id,p_user_id,'admin_adjustment',v_amount,v_balance,'admin',v_key,p_description,auth.uid()) returning * into v_tx; return v_tx; end; $$;
revoke all on function public.admin_adjust_wallet(uuid,numeric,text) from public; grant execute on function public.admin_adjust_wallet(uuid,numeric,text) to authenticated;

create or replace function public.apply_wallet_on_booking_insert() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_settings public.wallet_settings; v_account public.wallet_accounts; v_requested numeric(12,2):=round(coalesce(new.wallet_requested_amount,0),2); v_allowed numeric(12,2):=0; v_applied numeric(12,2):=0; v_service text:=case when new.trip_type='roundtrip' then 'roundtrip' else 'oneway' end;
begin new.wallet_used:=0; if v_requested<=0 then return new; end if; if auth.uid() is null or auth.uid() is distinct from new.user_id then raise exception 'VOYNU: wallet booking access denied'; end if;
select * into v_settings from public.wallet_settings where id=true; if not coalesce(v_settings.wallet_enabled,false) then raise exception 'VOYNU: wallet is currently unavailable'; end if; if not (v_service=any(v_settings.eligible_services)) then raise exception 'VOYNU: wallet cannot be used for this service'; end if; if coalesce(new.fare,0)<v_settings.min_booking_amount then raise exception 'VOYNU: booking amount is below the wallet minimum'; end if;
insert into public.wallet_accounts(user_id) values(new.user_id) on conflict(user_id) do nothing; select * into v_account from public.wallet_accounts where user_id=new.user_id for update; v_allowed:=least(v_account.balance,round(greatest(0,new.fare)*v_settings.max_usage_percent/100,2)); if v_requested>v_allowed+0.009 then raise exception 'VOYNU: requested wallet amount exceeds the currently available limit'; end if;
v_applied:=v_requested; if v_applied>new.fare then raise exception 'VOYNU: wallet amount cannot exceed booking fare'; end if; update public.wallet_accounts set balance=balance-v_applied,updated_at=now() where id=v_account.id returning * into v_account;
new.fare:=round(new.fare-v_applied,2); new.quoted_fare:=round(coalesce(new.quoted_fare,new.fare+v_applied)-v_applied,2); new.wallet_used:=v_applied; new.wallet_requested_amount:=v_requested; new.fare_breakdown:=coalesce(new.fare_breakdown,'{}'::jsonb)||jsonb_build_object('walletUsed',v_applied,'walletBalanceBefore',v_account.balance+v_applied,'walletUsagePercent',v_settings.max_usage_percent);
insert into public.wallet_transactions(wallet_account_id,user_id,transaction_type,amount,balance_after,source,source_key,booking_id,description) values(v_account.id,new.user_id,'booking_use',-v_applied,v_account.balance,'booking','booking_wallet:'||new.id::text,new.id,'Wallet credits used on booking'); return new; end; $$;
drop trigger if exists trg_apply_wallet_on_booking_insert on public.bookings; create trigger trg_apply_wallet_on_booking_insert before insert on public.bookings for each row execute function public.apply_wallet_on_booking_insert();

create or replace function public.refund_wallet_on_booking_cancel() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$ declare v_settings public.wallet_settings; v_amount numeric(12,2):=coalesce(old.wallet_used,0); begin
if new.booking_status='cancelled' and old.booking_status is distinct from 'cancelled' and v_amount>0 then select * into v_settings from public.wallet_settings where id=true; if coalesce(v_settings.refund_to_wallet_enabled,true) then perform public.wallet_credit(new.user_id,v_amount,'refund','booking_cancellation','booking_wallet_refund:'||new.id::text,new.id,null,'Wallet credits returned after booking cancellation',null,auth.uid()); end if; end if; return new; end; $$;
drop trigger if exists trg_refund_wallet_on_booking_cancel on public.bookings; create trigger trg_refund_wallet_on_booking_cancel after update on public.bookings for each row execute function public.refund_wallet_on_booking_cancel();

create or replace function public.issue_ride_wallet_rewards() returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
declare r public.wallet_reward_rules; v_count integer; v_key text; v_expiry timestamptz;
begin if new.booking_status='trip_completed' and new.payment_status='paid' and (old.booking_status is distinct from new.booking_status or old.payment_status is distinct from new.payment_status) then
select count(*) into v_count from public.bookings b where b.user_id=new.user_id and b.booking_status='trip_completed' and b.payment_status='paid';
for r in select * from public.wallet_reward_rules where active and reward_amount>0 and qualifying_rides=v_count loop
v_key:='ride_reward:'||new.id::text||':'||r.code; select case when ws.reward_expiry_days>0 then now()+(ws.reward_expiry_days||' days')::interval else null end into v_expiry from public.wallet_settings ws where ws.id=true;
perform public.wallet_credit(new.user_id,r.reward_amount,'reward','ride_milestone',v_key,new.id,null,format('VOYNU reward for qualifying ride milestone: %s rides',r.qualifying_rides),v_expiry,null); end loop; end if; return new; end; $$;
drop trigger if exists trg_issue_ride_wallet_rewards on public.bookings; create trigger trg_issue_ride_wallet_rewards after update on public.bookings for each row execute function public.issue_ride_wallet_rewards();
