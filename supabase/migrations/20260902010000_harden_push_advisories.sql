-- Harden the push subscription trigger against search_path manipulation.
create or replace function public.touch_push_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Evaluate auth.uid() once per statement rather than once per row.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
on public.push_subscriptions
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Remove exact duplicate indexes; retain the established names used by the app.
drop index if exists public.notifications_user_id_created_at_idx;
drop index if exists public.push_subscriptions_user_id_idx;
