# VOYNU Visual System QA v1

## Scope

Unified visual QA for Customer, Saarthi and Admin applications.

## Rules

- Poppins is the shared product font.
- VOYNU Teal is the primary action/navigation color.
- VOYNU Copper is the supporting accent, not a replacement primary color.
- Navy is used for high-emphasis headings and shell branding.
- Surfaces use white cards over the light VOYNU background.
- Desktop content windows are intentionally wider than the original mobile-first 680px constraint; mobile remains fluid with compact gutters.
- Legacy green styles are compatibility-overridden so older screens do not visually diverge from the current brand.
- Functional behavior is not changed by visual-only compatibility rules.

## App coverage

### Customer
- Global background, typography, cards, route indicators, cab cards, payment controls and form focus states use shared tokens.
- Legacy LocationPicker and MapLocationPicker green/copper presentation is normalized through the shared brand layer.
- Cab-selection data remains database-backed and authoritative.

### Saarthi
- Shell, header, controls, forms and legacy action buttons use shared tokens.
- Driver navigation actions retain their behavior while using the VOYNU primary palette.

### Admin
- Shell and navigation use the shared brand system.
- Desktop shell window increased to 1240px; mobile navigation remains horizontally scrollable.
- Legacy Dispatch inline styling is normalized without changing dispatch logic.

## Functional verification performed

- Production `customer_category_has_available_vehicle()` was checked against active/bookable categories.
- EV currently resolves as fleet-backed; Hatchback does not have an available vehicle.
- Customer vehicle-category RLS was tightened by removing the permissive generic read policy.
- Trip timing and driver/vehicle trigger functions and their triggers were inspected in production.

## Safety boundary

This change does not rewrite existing bookings, pricing, fleet records or trip status data. Visual compatibility selectors only affect presentation. Database RLS changes affect which vehicle categories customers can read and are intentionally aligned with actual fleet-backed inventory.
