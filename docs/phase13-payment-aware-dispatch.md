# VOYNU Phase 13 — Payment-aware dispatch

## Dispatch modes

- `manual`: no automatic driver assignment; admins assign drivers from the dispatch queue.
- `automatic`: payment-ready confirmed bookings are assigned automatically.

## Payment readiness

- Pay on Pickup (`cash`) bookings are dispatch-ready when confirmed.
- UPI bookings remain `pending_payment` and are not dispatched.
- Admin UPI verification sets payment to `paid` and booking to `confirmed`; when automatic dispatch is ON, the database trigger attempts driver assignment immediately.

## Safety

- Automatic assignment is idempotent because the booking is locked and already-assigned bookings are skipped.
- Driver eligibility continues to enforce active/available driver and vehicle state, category, passenger capacity, luggage capacity, and overlapping-booking checks.
- Automatic dispatch failures never prevent the booking/payment confirmation from succeeding; the booking remains available in the dispatch queue for manual retry.
- The legacy `auto_dispatch_context` relation is not required; automatic assignment uses a transaction-local internal dispatch token to pass the existing booking update guard safely.
