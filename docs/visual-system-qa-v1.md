# VOYNU Visual System QA v1

## Scope
Unified visual QA for Customer, Saarthi and Admin.

## Product presentation rules
- Poppins is the shared product font.
- Teal is the primary action/navigation color; Navy carries high-emphasis branding; Copper is a restrained supporting accent.
- White elevated surfaces sit on the light VOYNU background.
- Desktop/tablet content windows are wider for richer composition; mobile remains fluid with compact gutters.
- Legacy green/older inline presentation is normalized by the shared brand layer without changing interaction logic.

## App coverage
- Customer: booking surfaces, location controls, map controls, datetime controls, cab/payment states and focus states are aligned.
- Saarthi: shell/header, controls and legacy action styling are aligned while driver/navigation logic remains unchanged.
- Admin: shell/navigation uses the same VOYNU identity, with a 1240px desktop shell and mobile horizontal navigation.

## Functional verification
- Production category availability helper returns EV as fleet-backed and Hatchback as not fleet-backed under the current fleet.
- Production vehicle-category RLS policies were inspected and the permissive generic customer read policy was removed.
- Production trip timing and driver/vehicle enforcement functions and triggers were inspected.

## Safety
No booking, pricing, fleet or trip-status records are rewritten by this change. The RLS change intentionally limits customer category visibility to active + bookable + fleet-backed inventory.
