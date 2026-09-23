-- Authoritative commute earning ownership.
-- A completed commute service day earns against the driver who actually owns
-- the booking at completion time. This prevents the original Saarthi from
-- receiving a replacement day's earning.

create table if not exists public.driver_commute_earnings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  subscription_trip_id uuid references public.subscription_trips(id) on delete set null,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  constraint driver_commute_earnings_status_check check (status in ('pending','settled','cancelled')),
  unique (booking_id)
);

create index if not exists driver_commute_earnings_driver_date_idx
  on public.driver_commute_earnings(driver_id, completed_at desc);

create index if not exists driver_commute_earnings_subscription_trip_idx
  on public.driver_commute_earnings(subscription_trip_id);

alter table public.driver_commute_earnings enable row level security;

drop policy if exists driver_commute_earnings_select_own on public.driver_commute_earnings;
create policy driver_commute_earnings_select_own
on public.driver_commute_earnings for select to authenticated
using (
  driver_id in (
    select d.id
    from public.drivers d
    where d.user_id=auth.uid()
       or (d.user_id is null and lower(d.email)=lower((select email from auth.users where id=auth.uid())))
  )
  or public.is_admin()
);

revoke all on public.driver_commute_earnings from anon,authenticated;
grant select on public.driver_commute_earnings to authenticated;

create or replace function public.record_driver_commute_earning()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
begin
  if new.booking_status='trip_completed'
     and old.booking_status is distinct from 'trip_completed'
     and new.driver_id is not null
     and coalesce(new.fare,0) > 0
     and new.subscription_trip_id is not null
  then
    insert into public.driver_commute_earnings(
      booking_id,
      subscription_trip_id,
      driver_id,
      gross_amount,
      status,
      completed_at
    )
    values(
      new.id,
      new.subscription_trip_id,
      new.driver_id,
      round(coalesce(new.fare,0),2),
      'pending',
      coalesce(new.completed_at,now())
    )
    on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_record_driver_commute_earning on public.bookings;
create trigger trg_record_driver_commute_earning
after update of booking_status on public.bookings
for each row
execute function public.record_driver_commute_earning();

revoke all on function public.record_driver_commute_earning() from public,anon,authenticated;
