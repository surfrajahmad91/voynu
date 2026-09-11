# VOYNU Deployment History

This file records production-facing changes in chronological order. Every entry should identify the purpose, affected deployment boundaries, database changes, verification state and merge/deployment reference.

## 2026-09-11 — Admin Configuration Centre Phase 2

**Branch:** `admin-control-centre-phase2`

**Status:** Verification branch; not merged to `main`.

**Purpose:** Continue the Admin Control Centre restructuring without replacing or modifying existing operational workflows.

**Functional changes:**

- Added `/admin/configuration` as a dedicated configuration landing page.
- Added verified configuration areas for Fleet & Customer Visibility, Fleet, Pricing and Dispatch.
- Added read-only operational summary for categories, customer-visible categories, fleet inventory, usable fleet and dispatch mode.
- Added a clearly separated roadmap for Service Area, Booking Rules, Notifications and Access/Audit controls.
- Added Configuration as a dedicated tile in the Admin Control Centre.

**Safety boundary:**

- No existing booking, dispatch, pricing or fleet mutation logic was changed.
- No new database writes or schema changes were introduced by this phase.
- The new configuration page is informational/navigation-first until each future setting is audited against its existing database and application dependencies.

**Verification performed:**

- Branch created from merged PR #26 on `main`.
- Existing configuration data sources were inspected before introducing new controls.
- Configuration page uses the existing authenticated Admin access pattern.
- Existing Admin routes remain intact.

**Next verification gate:**

Before exposing editable Service Area, Booking Rules, Notifications or Access/Audit controls, audit the corresponding customer, driver and booking code paths and database schema, then implement each setting independently with its own verification and deployment entry.

## 2026-09-11 — Admin Control Centre / fleet-backed vehicle visibility

**Branch:** `admin-control-centre`

**Status:** Merged to `main` as PR #26.

**Merge commit:** `bd2ef780b0d52bfb4126537f1af40b181969c81a`

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
- Confirmed the Control Centre preview returned HTTP 200 before merge.
- Confirmed PR #26 was mergeable before merging.

**Post-merge deployment:**

- Vercel Admin project: `voynu-admin` (`prj_h4vytG4MmGIucsaX3IdSe53GWSEj`).
- Git merge and Vercel production readiness are tracked separately; deployment is not considered fully verified until Vercel reports READY for the merge commit.

**Safety decision:**

Do not remove or replace legacy Admin routes until the new Control Centre and customer cab-selection behavior have been tested in the deployed environment.

## 2026-09-06 — Admin pricing save fix

**Status:** Merged to `main` as PR #25.

**Merge commit:** `f65718d7e8a1d2d1741e9de5735103aa76cc5b48`

**Purpose:** Fixed validation and error handling in the Admin pricing publishing flow so invalid numeric values, expired sessions and failed database writes are surfaced correctly.

**Verification:** User confirmed the new pricing save flow is working in production.
