-- VOYNU 2.0 financial ledger.
-- One immutable service-day financial record per completed booking.
-- 10% platform commission / 90% Saarthi payout is enforced server-side.

do $$
begin
  if to_regclass('public.driver_commute_earnings') is not null
     and to_regclass('public.booking_financials') is null then
    alter table public.driver_commute_earnings rename to booking_financials;
  end if;
end $$;

alter table public.booking_financials
  add column if not exists subscription_id uuid references public.commute_subscriptions(id) on delete set null,
  add column if not exists commission_percent numeric(5,2) not null default 10,
  add column if not exists commission_amount numeric(12,2) not null default 0,
  add column if not exists driver_payout_amount numeric(12,2) not null default 0,
  add column if not exists customer_received_amount numeric(12,2) not null default 0,
  add column if not exists collection_status text not null default 'unreported',
  add column if not exists payment_source text not null default 'unknown',
  add column if not exists settled_at timestamptz,
  add column if not exists settled_by uuid references auth.users(id),
  add column if not exists settlement_reference text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='booking_financials' and column_name='status'
  ) then
    alter table public.booking_financials rename column status to settlement_status;
  end if;
end $$;

update public.booking_financials f
set
  subscription_id=b.subscription_id,
  commission_percent=10,
  commission_amount=round(f.gross_amount*0.10,2),
  driver_payout_amount=round(f.gross_amount*0.90,2),
  customer_received_amount=case when b.payment_method='cash' then coalesce(b.cash_collected_amount,0) else f.gross_amount end,
  collection_status=case when b.payment_method='subscription' then 'advance_allocated' when b.payment_method='cash' then coalesce(b.cash_collection_status,'unreported') when b.payment_status='paid' then 'paid' else 'unpaid' end,
  payment_source=case when b.payment_method='subscription' then 'subscription_advance' when b.payment_method='cash' then 'cash' when b.payment_method='upi' then 'upi' else coalesce(b.payment_method,'unknown') end,
  settlement_status=case when f.settlement_status='pending' then 'accrued' else f.settlement_status end
from public.bookings b
where b.id=f.booking_id;

alter table public.booking_financials alter column commission_percent set default 10;
alter table public.booking_financials drop constraint if exists booking_financials_status_check;
alter table public.booking_financials drop constraint if exists driver_commute_earnings_status_check;
alter table public.booking_financials add constraint booking_financials_status_check check (settlement_status in ('accrued','settled','held','cancelled'));
alter table public.booking_financials add constraint booking_financials_commission_check check (commission_percent=10 and commission_amount=round(gross_amount*0.10,2) and driver_payout_amount=round(gross_amount*0.90,2));

create index if not exists booking_financials_driver_date_idx on public.booking_financials(driver_id,completed_at desc);
create index if not exists booking_financials_service_date_idx on public.booking_financials(completed_at desc);
create index if not exists booking_financials_subscription_idx on public.booking_financials(subscription_id);

alter table public.booking_financials enable row level security;
drop policy if exists driver_commute_earnings_select_own on public.booking_financials;
drop policy if exists booking_financials_select_own on public.booking_financials;
create policy booking_financials_select_own on public.booking_financials for select to authenticated using (
  driver_id in (
    select d.id from public.drivers d
    where d.user_id=auth.uid()
       or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))
  ) or public.is_admin()
);
revoke all on public.booking_financials from anon,authenticated;
grant select on public.booking_financials to authenticated;

create or replace function public.record_booking_financial()
returns trigger language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare
  v_gross numeric(12,2);
  v_received numeric(12,2);
  v_collection text;
  v_source text;
begin
  if new.booking_status='trip_completed'
     and old.booking_status is distinct from 'trip_completed'
     and new.driver_id is not null
     and coalesce(new.fare,0)>0 then

    if new.subscription_id is not null then
      select round(s.total_amount/nullif(s.billable_days,0),2) into v_gross
      from public.commute_subscriptions s where s.id=new.subscription_id;
    end if;
    v_gross:=coalesce(v_gross,round(new.fare,2));

    if new.payment_method='subscription' then
      v_received:=v_gross; v_collection:='advance_allocated'; v_source:='subscription_advance';
    elsif new.payment_method='cash' then
      v_received:=coalesce(new.cash_collected_amount,0); v_collection:=coalesce(new.cash_collection_status,'unreported'); v_source:='cash';
    elsif new.payment_status='paid' then
      v_received:=v_gross; v_collection:='paid'; v_source:=coalesce(new.payment_method,'paid');
    else
      v_received:=0; v_collection:='unpaid'; v_source:=coalesce(new.payment_method,'unknown');
    end if;

    insert into public.booking_financials(
      booking_id,subscription_id,subscription_trip_id,driver_id,gross_amount,
      commission_percent,commission_amount,driver_payout_amount,
      customer_received_amount,collection_status,payment_source,settlement_status,completed_at
    )
    values(
      new.id,new.subscription_id,new.subscription_trip_id,new.driver_id,v_gross,
      10,round(v_gross*0.10,2),round(v_gross*0.90,2),
      v_received,v_collection,v_source,'accrued',coalesce(new.completed_at,now())
    )
    on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_record_driver_commute_earning on public.bookings;
drop trigger if exists trg_record_booking_financial on public.bookings;
create trigger trg_record_booking_financial after update of booking_status on public.bookings for each row execute function public.record_booking_financial();

revoke all on function public.record_booking_financial() from public,anon,authenticated;
grant execute on function public.record_booking_financial() to authenticated;

insert into public.booking_financials(
  booking_id,subscription_id,subscription_trip_id,driver_id,gross_amount,
  commission_percent,commission_amount,driver_payout_amount,
  customer_received_amount,collection_status,payment_source,settlement_status,completed_at
)
select
  b.id,b.subscription_id,b.subscription_trip_id,b.driver_id,
  round(case when b.subscription_id is not null and coalesce(s.billable_days,0)>0 then s.total_amount/nullif(s.billable_days,0) else b.fare end,2),
  10,
  round((case when b.subscription_id is not null and coalesce(s.billable_days,0)>0 then s.total_amount/nullif(s.billable_days,0) else b.fare end)*0.10,2),
  round((case when b.subscription_id is not null and coalesce(s.billable_days,0)>0 then s.total_amount/nullif(s.billable_days,0) else b.fare end)*0.90,2),
  case when b.payment_method='cash' then coalesce(b.cash_collected_amount,0) else round(case when b.subscription_id is not null and coalesce(s.billable_days,0)>0 then s.total_amount/nullif(s.billable_days,0) else b.fare end,2) end,
  case when b.payment_method='subscription' then 'advance_allocated' when b.payment_method='cash' then coalesce(b.cash_collection_status,'unreported') when b.payment_status='paid' then 'paid' else 'unpaid' end,
  case when b.payment_method='subscription' then 'subscription_advance' when b.payment_method='cash' then 'cash' when b.payment_method='upi' then 'upi' else coalesce(b.payment_method,'unknown') end,
  'accrued',coalesce(b.completed_at,now())
from public.bookings b
left join public.commute_subscriptions s on s.id=b.subscription_id
where b.booking_status='trip_completed' and b.driver_id is not null and coalesce(b.fare,0)>0
on conflict (booking_id) do nothing;

create or replace function public.admin_settle_booking_financial(p_financial_id uuid,p_reference text default null)
returns public.booking_financials language plpgsql security definer set search_path='public','pg_temp'
as $function$
declare f public.booking_financials; b public.bookings; v_ref text:=nullif(trim(coalesce(p_reference,'')),'');
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into f from public.booking_financials where id=p_financial_id for update;
  if not found then raise exception 'Financial record not found'; end if;
  select * into b from public.bookings where id=f.booking_id for update;
  if b.booking_status<>'trip_completed' then raise exception 'Only completed bookings can be settled'; end if;
  if f.settlement_status='settled' then return f; end if;
  if f.collection_status not in ('paid','collected','advance_allocated') then raise exception 'Customer payment is not fully collected for this booking'; end if;
  update public.booking_financials set settlement_status='settled',settled_at=now(),settled_by=auth.uid(),settlement_reference=v_ref where id=f.id returning * into f;
  return f;
end;
$function$;

revoke all on function public.admin_settle_booking_financial(uuid,text) from public,anon;
grant execute on function public.admin_settle_booking_financial(uuid,text) to authenticated;
