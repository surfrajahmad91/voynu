-- pg_net is installed under the managed extensions schema, while its
-- HTTP API objects remain in the extension's net schema. Keep the trigger
-- function's call explicitly qualified to net.http_post.

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
