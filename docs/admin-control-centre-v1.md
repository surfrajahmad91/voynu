# VOYNU Admin Control Centre v1

## Purpose

This change introduces a non-breaking Admin Control Centre at `/admin/control-centre` and formalizes the rule used by the customer cab-selection flow for vehicle categories.

The existing `/admin` dashboard remains intact during this first rollout. The new page is additive so the new information architecture can be verified before replacing the existing dashboard entry point.

## Admin areas

The Control Centre separates the main administrative responsibilities:

- Operations — bookings and day-to-day operations.
- Dispatch — driver assignment and dispatch mode.
- Vehicle Categories — category configuration and customer-facing eligibility.
- Fleet — individual vehicles and their operational state.
- Pricing — pricing versions and round-trip waiting policy.

## Customer vehicle visibility

A vehicle category is customer-visible only when all three conditions are true:

1. `vehicle_categories.active = true`
2. `vehicle_categories.bookable = true`
3. At least one vehicle in that category is active and its status is not `maintenance`, `inactive`, or `unavailable`.

This prevents the customer app from displaying categories that have no usable fleet inventory.

The rule is enforced in the database RLS policy for `vehicle_categories`, so the customer frontend does not need a separate hard-coded list. Admin users continue to see all categories for configuration purposes.

## Current production state at rollout

At the time of this change, the production fleet contains one active EV vehicle. The category inventory query therefore identifies EV as customer-visible. Hatchback and SUV have no active fleet vehicles and are not exposed to customer cab selection. Sedan is already inactive and not bookable.

## Safety / rollout strategy

This release intentionally does **not** replace `/admin` yet. The Control Centre is an additive route. Existing booking, dispatch, pricing and fleet routes remain unchanged.

Before making the Control Centre the default Admin landing page, verify:

- Admin authentication and authorization.
- Booking operations remain unchanged.
- Dispatch mode and driver assignment remain unchanged.
- Pricing publishing remains unchanged.
- Customer cab selection shows only fleet-backed categories.
- Adding/activating a vehicle causes its eligible category to become customer-visible when the category is active and bookable.
- Deactivating/unbooking a category immediately removes it from customer selection.

## Database changes

Production migrations applied for this rollout:

- `customer_vehicle_availability` — introduced and then removed an unused security-definer helper after the final design used the existing category query plus RLS.
- `customer_category_visibility_requires_fleet` — replaced the previous active/bookable category policy with a fleet-backed customer visibility rule.
- `remove_unused_customer_vehicle_function` — removed the temporary helper so there is no unused public API surface.

The final production behavior is provided by the `vehicle_categories` RLS policy named `Customers can read fleet-backed vehicle categories`.

## Deployment record

Git branch: `admin-control-centre`

Initial commit: `7737d79897b6efceccb9dcc8c1e0a4fa85b4cd92`

This branch is intended for verification before merging to `main`.
