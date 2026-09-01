alter table public.push_subscriptions add column if not exists audience text;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_audience_check;
alter table public.push_subscriptions add constraint push_subscriptions_audience_check check (audience in ('customer','driver','admin') or audience is null);
create index if not exists push_subscriptions_user_audience_idx on public.push_subscriptions(user_id, audience);
