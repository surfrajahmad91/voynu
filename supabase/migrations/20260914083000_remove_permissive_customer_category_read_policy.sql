-- Customer vehicle-category visibility must remain fleet-backed.
-- The generic read policy bypassed the fleet availability guard.
drop policy if exists "Read vehicle categories" on public.vehicle_categories;
