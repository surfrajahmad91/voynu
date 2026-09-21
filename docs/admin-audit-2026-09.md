# Admin app audit (September 2026)

## What is tracked now

| What | Where |
| --- | --- |
| Every change an admin makes (bookings, assignments, drivers, vehicles, vehicle types, pricing, dispatch mode, driver workflow rules, subscriptions, rentals, timing alerts): who, when, before/after | `admin_audit_log` (database trigger `zz_admin_audit`), shown in Admin > Activity log |
| Every driver step (time, distance from the expected point, delay, flags, reason, cash outcome) | `booking_status_events`, shown as "Timeline" on each booking |
| Admin cancellation reason and who cancelled | `bookings.cancelled_by`, `cancellation_reason` via `admin_cancel_booking` |
| Cash collected / short / not collected | `bookings.cash_*`, shown in Bookings and Live trips, alerts to admin |

## Fixed in this pass

- Admin access is decided by the database (`is_admin()`), not a hard-coded email list. The shell blocks the whole admin UI for non-admins.
- The top search box did nothing; it now searches bookings (VOY reference, passenger, phone, place), drivers and subscriptions (`admin_search`).
- Dashboard totals were capped at the latest 200 bookings and the "Late events" tile was always 0 (missing columns); totals are exact (`admin_dashboard_counts`), the rental mix uses the rentals table, polling pauses on hidden tabs.
- Bookings: paginated (100 at a time), server-side status filter and search, all statuses filterable (waiting for return / return started were missing), cancellation needs a reason, payment labels are correct for subscription and cash trips.
- Dispatch: manual driver assignment added (the page only offered "auto"), refresh + 20 s auto-refresh.
- Pricing publish is one atomic database call (`admin_publish_pricing`) instead of five browser writes.
- Live trips and dashboard operations no longer load every completed trip ever; completed trips older than 7 days are excluded.
- Leftover debug trigger on `vehicle_categories` removed.
- Database hygiene from the Supabase advisors: sign-out visitors can no longer call driver/admin RPCs, trigger functions are not callable through the API, `auth.uid()` evaluated once per query in rental/commute policies, foreign-key indexes added.

## Still to do / recommendations

- Delete the stray one-line files named `T` (accidental "Create T" commits): `apps/driver/lib/T`, `apps/admin/public/fonts/T`, `apps/customer/app/api/bookings/receipt/T`, `apps/customer/app/track/[token]/T`, `apps/driver/public/fonts/T`, `supabase/migrations/T`.
- `driver_location_history` grows with every GPS ping (about 1,200 rows in three weeks of testing). Run `select purge_driver_location_history(90)` as admin now and then, or enable `pg_cron` to schedule it.
- Turn on leaked-password protection in Supabase Auth settings.
- Commute subscriptions can be created with a return time of 00:00; validate this on the customer form.
- Security headers (CSP, HSTS) are still not set in `next.config` for the three apps.
