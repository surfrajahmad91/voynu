-- VOYNU coupon engine: server-authoritative validation and redemption.
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique, description text,
  discount_type text not null default 'fixed' check (discount_type in ('fixed','percent')),
  discount_value numeric(12,2) not null check (discount_value>0), max_discount numeric(12,2),
  min_booking_amount numeric(12,2) not null default 0 check (min_booking_amount>=0),
  starts_at timestamptz, expires_at timestamptz, active boolean not null default true,
  usage_limit integer, per_user_limit integer not null default 1,
  applicable_trip_types text[] not null default array['oneway','roundtrip'],
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint coupons_dates_valid check (expires_at is null or starts_at is null or expires_at>starts_at),
  constraint coupons_trip_types_valid check (applicable_trip_types <@ array['oneway','roundtrip']::text[] and cardinality(applicable_trip_types)>0)
);
create unique index if not exists coupons_code_upper_uidx on public.coupons(upper(trim(code)));
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict, booking_id uuid not null unique references public.bookings(id) on delete restrict,
  code_snapshot text not null, discount_amount numeric(12,2) not null check (discount_amount>=0), created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id,created_at desc);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions(user_id,coupon_id,created_at desc);
alter table public.bookings add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.bookings add column if not exists coupon_code text;
alter table public.bookings add column if not exists coupon_discount numeric(12,2) not null default 0;
alter table public.bookings add constraint bookings_coupon_discount_nonnegative check (coupon_discount>=0);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
drop policy if exists coupons_admin_read on public.coupons;
create policy coupons_admin_read on public.coupons for select to authenticated using (public.is_admin());
drop policy if exists coupons_admin_insert on public.coupons;
create policy coupons_admin_insert on public.coupons for insert to authenticated with check (public.is_admin());
drop policy if exists coupons_admin_update on public.coupons;
create policy coupons_admin_update on public.coupons for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists coupons_admin_delete on public.coupons;
create policy coupons_admin_delete on public.coupons for delete to authenticated using (public.is_admin());
drop policy if exists coupon_redemptions_admin_read on public.coupon_redemptions;
create policy coupon_redemptions_admin_read on public.coupon_redemptions for select to authenticated using (public.is_admin());

create or replace function public.validate_coupon(p_code text,p_booking_amount numeric,p_trip_type text default 'oneway')
returns table(valid boolean,message text,coupon_id uuid,coupon_code text,discount_amount numeric)
language plpgsql security definer set search_path='public','pg_temp' as $$
declare c public.coupons; a numeric(12,2):=round(coalesce(p_booking_amount,0),2); d numeric(12,2):=0; used integer; mine integer; trip text:=case when p_trip_type='roundtrip' then 'roundtrip' else 'oneway' end;
begin
 if auth.uid() is null then return query select false,'Please log in to apply a coupon.',null::uuid,null::text,0::numeric; return; end if;
 select * into c from public.coupons where upper(trim(code))=upper(trim(coalesce(p_code,''))) limit 1;
 if not found or not c.active or (c.starts_at is not null and now()<c.starts_at) or (c.expires_at is not null and now()>=c.expires_at) or a<c.min_booking_amount or not(trip=any(c.applicable_trip_types)) then
   return query select false,'This coupon is invalid or unavailable for this booking.',null::uuid,null::text,0::numeric; return;
 end if;
 select count(*) into used from public.coupon_redemptions where coupon_id=c.id;
 if c.usage_limit is not null and used>=c.usage_limit then return query select false,'This coupon has reached its usage limit.',null::uuid,null::text,0::numeric; return; end if;
 select count(*) into mine from public.coupon_redemptions where coupon_id=c.id and user_id=auth.uid();
 if mine>=c.per_user_limit then return query select false,'You have already used this coupon the maximum number of times.',null::uuid,null::text,0::numeric; return; end if;
 if c.discount_type='percent' then d:=round(a*c.discount_value/100,2); else d:=round(c.discount_value,2); end if;
 if c.max_discount is not null then d:=least(d,round(c.max_discount,2)); end if;
 d:=least(d,a);
 return query select true,'Coupon applied successfully.',c.id,upper(trim(c.code)),d;
end; $$;
revoke all on function public.validate_coupon(text,numeric,text) from public;
grant execute on function public.validate_coupon(text,numeric,text) to authenticated;

create or replace function public.apply_coupon_on_booking_insert() returns trigger
language plpgsql security definer set search_path='public','pg_temp' as $$
declare c public.coupons; used integer; mine integer; d numeric(12,2):=0; trip text:=case when new.trip_type='roundtrip' then 'roundtrip' else 'oneway' end; original numeric(12,2):=round(coalesce(new.fare,0),2);
begin
 new.coupon_discount:=0;
 if nullif(trim(coalesce(new.coupon_code,'')),'') is null then return new; end if;
 if auth.uid() is null or auth.uid() is distinct from new.user_id then raise exception 'VOYNU: coupon booking access denied'; end if;
 select * into c from public.coupons where upper(trim(code))=upper(trim(new.coupon_code)) for update;
 if not found or not c.active or (c.starts_at is not null and now()<c.starts_at) or (c.expires_at is not null and now()>=c.expires_at) or original<c.min_booking_amount or not(trip=any(c.applicable_trip_types)) then raise exception 'VOYNU: This coupon is invalid or unavailable for this booking'; end if;
 select count(*) into used from public.coupon_redemptions where coupon_id=c.id;
 if c.usage_limit is not null and used>=c.usage_limit then raise exception 'VOYNU: This coupon has reached its usage limit'; end if;
 select count(*) into mine from public.coupon_redemptions where coupon_id=c.id and user_id=new.user_id;
 if mine>=c.per_user_limit then raise exception 'VOYNU: You have already used this coupon the maximum number of times'; end if;
 if c.discount_type='percent' then d:=round(original*c.discount_value/100,2); else d:=round(c.discount_value,2); end if;
 if c.max_discount is not null then d:=least(d,round(c.max_discount,2)); end if;
 d:=least(d,original);
 new.coupon_id:=c.id; new.coupon_code:=upper(trim(c.code)); new.coupon_discount:=d; new.fare:=round(original-d,2);
 new.fare_breakdown:=coalesce(new.fare_breakdown,'{}'::jsonb)||jsonb_build_object('couponCode',upper(trim(c.code)),'couponDiscount',d,'fareBeforeCoupon',original,'fareAfterCoupon',new.fare);
 return new;
end; $$;
revoke all on function public.apply_coupon_on_booking_insert() from public,anon,authenticated;

create or replace function public.record_coupon_redemption_after_booking() returns trigger
language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if new.coupon_id is not null and new.coupon_discount>0 then
   insert into public.coupon_redemptions(coupon_id,user_id,booking_id,code_snapshot,discount_amount) values(new.coupon_id,new.user_id,new.id,new.coupon_code,new.coupon_discount);
 end if;
 return new;
end; $$;
revoke all on function public.record_coupon_redemption_after_booking() from public,anon,authenticated;
drop trigger if exists aa_apply_coupon_on_booking_insert on public.bookings;
create trigger aa_apply_coupon_on_booking_insert before insert on public.bookings for each row execute function public.apply_coupon_on_booking_insert();
drop trigger if exists zz_record_coupon_redemption_after_booking on public.bookings;
create trigger zz_record_coupon_redemption_after_booking after insert on public.bookings for each row execute function public.record_coupon_redemption_after_booking();

create or replace function public.admin_upsert_coupon(p_id uuid,p_code text,p_description text,p_discount_type text,p_discount_value numeric,p_max_discount numeric default null,p_min_booking_amount numeric default 0,p_starts_at timestamptz default null,p_expires_at timestamptz default null,p_active boolean default true,p_usage_limit integer default null,p_per_user_limit integer default 1,p_applicable_trip_types text[] default array['oneway','roundtrip'])
returns public.coupons language plpgsql security definer set search_path='public','pg_temp' as $$
declare v public.coupons;
begin
 if not public.is_admin() then raise exception 'VOYNU: admin access required'; end if;
 insert into public.coupons(id,code,description,discount_type,discount_value,max_discount,min_booking_amount,starts_at,expires_at,active,usage_limit,per_user_limit,applicable_trip_types,created_by,updated_at)
 values(coalesce(p_id,gen_random_uuid()),upper(trim(p_code)),p_description,p_discount_type,p_discount_value,p_max_discount,coalesce(p_min_booking_amount,0),p_starts_at,p_expires_at,coalesce(p_active,true),p_usage_limit,coalesce(p_per_user_limit,1),p_applicable_trip_types,auth.uid(),now())
 on conflict(id) do update set code=excluded.code,description=excluded.description,discount_type=excluded.discount_type,discount_value=excluded.discount_value,max_discount=excluded.max_discount,min_booking_amount=excluded.min_booking_amount,starts_at=excluded.starts_at,expires_at=excluded.expires_at,active=excluded.active,usage_limit=excluded.usage_limit,per_user_limit=excluded.per_user_limit,applicable_trip_types=excluded.applicable_trip_types,updated_at=now()
 returning * into v;
 return v;
end; $$;
revoke all on function public.admin_upsert_coupon(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,boolean,integer,integer,text[]) from public;
grant execute on function public.admin_upsert_coupon(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,boolean,integer,integer,text[]) to authenticated;
