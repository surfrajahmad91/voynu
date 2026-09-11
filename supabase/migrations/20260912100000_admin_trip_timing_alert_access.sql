create or replace function public.get_trip_timing_alerts()
returns table (
  id uuid,
  booking_id uuid,
  alert_type text,
  threshold_minutes integer,
  created_at timestamptz,
  acknowledged_at timestamptz
)
language plpgsql
security definer
set search_path='public','pg_temp'
set row_security='off'
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select a.id,a.booking_id,a.alert_type,a.threshold_minutes,a.created_at,a.acknowledged_at
  from public.trip_timing_alerts a
  where a.acknowledged_at is null
  order by a.created_at desc;
end;
$$;

grant execute on function public.get_trip_timing_alerts() to authenticated;

create or replace function public.ack_trip_timing_alert(p_alert_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
set row_security='off'
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.trip_timing_alerts
     set acknowledged_at=coalesce(acknowledged_at,now())
   where id=p_alert_id;
  return found;
end;
$$;

grant execute on function public.ack_trip_timing_alert(uuid) to authenticated;
