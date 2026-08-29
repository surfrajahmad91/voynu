-- Fix booking confirmation RLS without exposing auth.users to normal users.
--
-- The booking-confirmation API performs a SELECT against public.bookings before
-- inserting a new row. That SELECT evaluates the driver's RLS path as well as
-- the user's own-booking policy. The legacy driver fallback queried
-- auth.users directly, which caused `permission denied for table users` for
-- authenticated customers.

DROP POLICY IF EXISTS "Drivers can view their assigned bookings" ON public.bookings;
CREATE POLICY "Drivers can view their assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT d.id
    FROM public.drivers d
    WHERE d.active = true
      AND (
        d.user_id = auth.uid()
        OR (
          d.user_id IS NULL
          AND lower(d.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  )
);

DROP POLICY IF EXISTS "Drivers can update their assigned booking status" ON public.bookings;
CREATE POLICY "Drivers can update their assigned booking status"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id IN (
    SELECT d.id
    FROM public.drivers d
    WHERE d.active = true
      AND (
        d.user_id = auth.uid()
        OR (
          d.user_id IS NULL
          AND lower(d.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  )
)
WITH CHECK (
  driver_id IN (
    SELECT d.id
    FROM public.drivers d
    WHERE d.active = true
      AND (
        d.user_id = auth.uid()
        OR (
          d.user_id IS NULL
          AND lower(d.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
      )
  )
);

DROP POLICY IF EXISTS "Drivers can view own driver record" ON public.drivers;
CREATE POLICY "Drivers can view own driver record"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    user_id IS NULL
    AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);

-- Vehicle categories already have a public SELECT policy for active/bookable
-- vehicles. Admin-only access is required for writes, not reads, so avoid
-- evaluating the admin guard on every cab-selection SELECT.
DROP POLICY IF EXISTS "Admins can manage vehicle categories" ON public.vehicle_categories;
CREATE POLICY "Admins can insert vehicle categories"
ON public.vehicle_categories
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update vehicle categories"
ON public.vehicle_categories
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete vehicle categories"
ON public.vehicle_categories
FOR DELETE
TO authenticated
USING (is_admin());

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
