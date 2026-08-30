# VOYNU Phase 5 — Server-Authoritative Fare Calculation

## Status
Implementation complete; production acceptance test pending.

## Rules

1. The browser may calculate and display an estimate for a responsive customer experience.
2. The booking API never trusts the browser's distance or fare.
3. At booking confirmation, the server resolves the pickup/drop coordinates through the server-side road-distance service.
4. The server loads the current active pricing version and matching vehicle/trip rule.
5. The server calculates the final fare from the authoritative road distance.
6. The saved booking stores the authoritative one-way distance, billed distance, fare breakdown, fare, and pricing version.
7. Existing bookings are never repriced when pricing changes.
8. If the authoritative distance service fails, the booking is rejected rather than creating a booking with an unverified fare.
9. Road-distance responses are cached briefly to reduce duplicate Google Routes calls while preserving server authority.

## Customer experience

The cab-selection screen continues to show the fast estimate and fare breakup. After confirmation, the booking-confirmed data is replaced with the server-returned fare and breakdown so the customer sees the actual saved amount.

## Acceptance tests

- Alter the client-submitted distance/fare and confirm the saved booking still uses the server road distance and current pricing.
- Change the active price and create a new booking; the new booking uses the new price.
- Confirm an older booking still retains its original fare.
- Force road-distance failure; no booking is created.
- Confirm the fare breakup and saved total match.
- Confirm duplicate/idempotent submission still returns the existing booking.
