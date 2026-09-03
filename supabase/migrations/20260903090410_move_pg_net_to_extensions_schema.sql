-- Move the pg_net extension out of the public schema.
-- pg_net does not support ALTER EXTENSION ... SET SCHEMA, so it is
-- recreated in the Supabase-managed extensions schema. The extension's
-- runtime objects remain in its internal net schema.

drop trigger if exists trg_queue_web_push_for_notification on public.notifications;
drop function if exists public.queue_web_push_for_notification();
drop extension pg_net;
create extension pg_net with schema extensions;

create or replace function public.queue_web_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret text;
begin
  select webhook_secret into v_secret
  from public.push_config
  where id = 'default'
  limit 1;

  if v_secret is null then
    raise warning 'VOYNU web push queue skipped: push configuration unavailable';
    return new;
  end if;

  perform net.http_post(
    url := 'https://huibxdxwspjqsxsdfxfb.supabase.co/functions/v1/voynu-push',
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-voynu-push-secret', v_secret
    )
  );

  return new;
exception when others then
  raise warning 'VOYNU web push queue failed: %', sqlerrm;
  return new;
end;
$$;

create trigger trg_queue_web_push_for_notification
after insert on public.notifications
for each row execute function public.queue_web_push_for_notification();
