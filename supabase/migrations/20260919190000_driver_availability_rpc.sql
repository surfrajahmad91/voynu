-- Allow an authenticated driver to change only their own availability.
-- This is intentionally a security-definer RPC because the drivers table is RLS-protected
-- without a general-purpose driver UPDATE policy.

create or replace function public.set_driver_availability(p_status text)
returns public.drivers
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_driver public.drivers;
begin
  if p_status not in ('available','offline') then
    raise exception 'VOYNU: invalid availability status';
  end if;

  select d.*
    into v_driver
    from public.drivers d
   where d.active = true
     and (
       d.user_id = auth.uid()
       or (
         d.user_id is null
         and lower(d.email) = lower((select email from auth.users where id = auth.uid()))
       )
     )
   limit 1
   for update;

  if not found then
    raise exception 'VOYNU: driver access denied';
  end if;

  update public.drivers
     set availability_status = p_status
   where id = v_driver.id
   returning * into v_driver;

  return v_driver;
end;
$$;

grant execute on function public.set_driver_availability(text) to authenticated;
