-- Fix admin finance RLS dependency on auth.users.
-- Authenticated clients cannot directly read auth.users. Use the JWT email claim instead.
drop policy if exists booking_financials_select_own on public.booking_financials;

create policy booking_financials_select_own
on public.booking_financials
for select
to authenticated
using (
  public.is_admin()
  or driver_id in (
    select d.id
    from public.drivers d
    where d.user_id = auth.uid()
       or (
         d.user_id is null
         and lower(d.email) = lower(coalesce(auth.jwt()->>'email',''))
       )
  )
);
