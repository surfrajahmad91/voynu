-- Keep customer vehicle-category visibility fleet-backed only.
-- The earlier generic read policy bypassed the fleet availability guard.
-- Admin access remains provided by the dedicated admin-safe policies.

drop policy if exists "Read vehicle categories" on public.vehicle_categories;
