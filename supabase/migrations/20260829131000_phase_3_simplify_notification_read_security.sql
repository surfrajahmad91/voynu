drop policy if exists "Users can update own notification read state" on public.notifications;
create policy "Users can update own notification read state"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update (read_at) on public.notifications to authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.notifications
     set read_at = coalesce(read_at, now())
   where id = p_notification_id
     and user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null;

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;
