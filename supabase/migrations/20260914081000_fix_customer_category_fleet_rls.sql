-- Fix customer vehicle-category visibility when the vehicles table has
-- customer-restricted RLS. The category policy must be able to verify
-- fleet availability without exposing fleet rows to customers.

create or replace function public.customer_category_has_available_vehicle(p_category_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.vehicles v
    where v.vehicle_category_id = p_category_id
      and v.active = true
      and coalesce(v.status, 'active') not in ('maintenance','inactive','unavailable')
  );
$$;

revoke all on function public.customer_category_has_available_vehicle(uuid) from public;
grant execute on function public.customer_category_has_available_vehicle(uuid) to authenticated;

drop policy if exists "Customers can read fleet-backed vehicle categories" on public.vehicle_categories;
drop policy if exists "Restrict customer categories to fleet backed inventory" on public.vehicle_categories;

create policy "Customers can read fleet-backed vehicle categories"
on public.vehicle_categories
for select
to authenticated
using (
  public.is_admin()
  or (
    active = true
    and bookable = true
    and public.customer_category_has_available_vehicle(id)
  )
);
