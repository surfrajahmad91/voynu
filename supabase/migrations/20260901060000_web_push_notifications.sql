create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_config (
  id text primary key,
  public_key text not null,
  private_key text not null,
  subject text not null,
  webhook_secret text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_config enable row level security;
revoke all on public.push_config from public, anon, authenticated;

create or replace function public.touch_push_subscription_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_push_subscription_updated_at on public.push_subscriptions;
create trigger trg_push_subscription_updated_at before update on public.push_subscriptions
for each row execute function public.touch_push_subscription_updated_at();

create or replace function public.queue_web_push_for_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_secret text;
begin
  select webhook_secret into v_secret from public.push_config where id = 'default' limit 1;
  if v_secret is null then return new; end if;
  perform net.http_post(
    url := 'https://huibxdxwspjqsxsdfxfb.supabase.co/functions/v1/voynu-push',
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object('Content-Type','application/json','x-voynu-push-secret',v_secret)
  );
  return new;
exception when others then
  raise warning 'VOYNU web push queue failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.queue_web_push_for_notification() from public, anon, authenticated;
drop trigger if exists trg_queue_web_push_for_notification on public.notifications;
create trigger trg_queue_web_push_for_notification after insert on public.notifications
for each row execute function public.queue_web_push_for_notification();
