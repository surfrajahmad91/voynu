# VOYNU Deployment History

This file records production-facing changes in chronological order. Every entry should identify the purpose, affected deployment boundaries, database changes, verification state and merge/deployment reference.

## 2026-09-11 — Admin Control Centre / fleet-backed vehicle visibility

**Branch:** `admin-control-centre`

**Status:** Verification branch; not merged to `main` at the time this entry was created.

**Application boundaries affected:**

- Admin (`apps/admin`) — additive `/admin/control-centre` landing page.
- Customer (`apps/customer`) — no frontend code change required for the final visibility rule; the database policy controls the rows returned by the existing category query.
- Saarthi/Driver — no code change.

**Functional changes:**

- Added a cleaner Admin Control Centre with separate tiles for Operations, Dispatch, Vehicle Categories, Fleet and Pricing.
- Added a customer-visibility summary showing category inventory and whether each category is currently visible to customers.
- Formalized customer vehicle visibility as: active category + bookable category + at least one active fleet vehicle whose status is not maintenance/inactive/unavailable.
- Admin users retain access to all vehicle categories so unavailable categories can still be configured for future fleet expansion.

**Database changes applied to production:**

1. `customer_vehicle_availability` — temporary helper function introduced during verification design.
2. `customer_category_visibility_requires_fleet` — final RLS policy enforcing fleet-backed customer category visibility.
3. `remove_unused_customer_vehicle_function` — removed the temporary helper after confirming the final RLS design did not require it.

**Verification performed:**

- Confirmed production Supabase project is healthy.
- Confirmed production fleet currently contains one active EV vehicle.
- Confirmed production vehicle categories include Hatchback, Sedan, SUV and EV.
- Confirmed the final customer-visibility query resolves EV as the only fleet-backed active/bookable category under the current fleet state.
- Confirmed the new Control Centre is additive and does not replace the existing `/admin` dashboard.

**Safety decision:**

Do not replace the existing Admin dashboard entry point until the new Control Centre and the customer cab-selection behavior have been tested in the deployed environment.

## 2026-09-06 — Admin pricing save fix

**Status:** Merged to `main` as PR #25.

**Merge commit:** `f65718d7e8a1d2d1741e9de5735103aa76cc5b48`

**Purpose:** Fixed validation and error handling in the Admin pricing publishing flow so invalid numeric values, expired sessions and failed database writes are surfaced correctly.

**Verification:** User confirmed the new pricing save flow is working in production.
