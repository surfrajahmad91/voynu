insert into public.wallet_settings (
  id,wallet_enabled,max_usage_percent,min_booking_amount,reward_expiry_days,
  refund_to_wallet_enabled,eligible_services,updated_at
)
values (
  true,true,10,0,0,true,
  array['oneway','roundtrip','commute','rental'],
  now()
)
on conflict (id) do nothing;

create or replace function public.admin_set_wallet_settings(
  p_enabled boolean,
  p_max_usage_percent numeric,
  p_min_booking_amount numeric,
  p_reward_expiry_days integer,
  p_refund_to_wallet boolean,
  p_eligible_services text[]
)
returns public.wallet_settings
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v public.wallet_settings;
begin
  if not public.is_admin() then
    raise exception 'VOYNU: admin access required';
  end if;

  if p_max_usage_percent < 0 or p_max_usage_percent > 100 then
    raise exception 'VOYNU: wallet usage percentage must be between 0 and 100';
  end if;

  if p_min_booking_amount < 0 or p_reward_expiry_days < 0 then
    raise exception 'VOYNU: wallet settings cannot be negative';
  end if;

  insert into public.wallet_settings(
    id,wallet_enabled,max_usage_percent,min_booking_amount,reward_expiry_days,
    refund_to_wallet_enabled,eligible_services,updated_at,updated_by
  )
  values(
    true,p_enabled,p_max_usage_percent,p_min_booking_amount,p_reward_expiry_days,
    p_refund_to_wallet,coalesce(p_eligible_services,array['oneway','roundtrip','commute','rental']),
    now(),auth.uid()
  )
  on conflict (id) do update set
    wallet_enabled=excluded.wallet_enabled,
    max_usage_percent=excluded.max_usage_percent,
    min_booking_amount=excluded.min_booking_amount,
    reward_expiry_days=excluded.reward_expiry_days,
    refund_to_wallet_enabled=excluded.refund_to_wallet_enabled,
    eligible_services=excluded.eligible_services,
    updated_at=now(),
    updated_by=auth.uid()
  returning * into v;

  return v;
end;
$$;
