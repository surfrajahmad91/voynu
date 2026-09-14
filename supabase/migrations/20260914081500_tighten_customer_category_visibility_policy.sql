-- Remove the legacy broad read policy. Customer vehicle-category visibility
-- is intentionally limited to active + bookable categories backed by an
-- available fleet vehicle. Admin access remains available through the
-- fleet-backed policy's admin branch.

drop policy if exists "Read vehicle categories" on public.vehicle_categories;
