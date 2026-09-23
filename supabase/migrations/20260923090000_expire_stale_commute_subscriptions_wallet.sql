create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.expire_stale_commute_subscriptions()
returns integer
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_count integer := 0;
begin
  update public.commute_subscriptions
     set payment_status='failed',
         status='cancelled',
         updated_at=now()
   where status='pending_payment'
     and payment_status='pending'
     and created_at < now() - interval '30 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_commute_subscriptions() from public;
revoke execute on function public.expire_stale_commute_subscriptions() from anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname='voynu-expire-stale-commute-subscriptions';

select cron.schedule(
  'voynu-expire-stale-commute-subscriptions',
  '*/5 * * * *',
  $$select public.expire_stale_commute_subscriptions();$$
);
