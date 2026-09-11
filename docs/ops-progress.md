# Admin operations build progress

This document tracks the production hardening sequence requested for VOYNU Admin.

## 2026-09-11 — Trip timing and driver/vehicle integrity foundation

- Added booking schedule snapshots: scheduled pickup, scheduled completion, expected route duration.
- Added actual trip start timestamp and on-time/late measurements for trip start and completion.
- Added `trip_timing_alerts` for start-overdue and completion-overdue cases.
- Added an admin-only watchdog RPC (`check_trip_timing_alerts`) that records each overdue alert once and creates an Admin notification; Admin UI will poll this while open.
- Added database triggers preventing a driver from taking a booking unless the driver has an assigned active vehicle, and preventing a mismatched vehicle from being attached.
- Existing booking statuses remain unchanged.
- No existing customer or Saarthi booking workflow was removed.

## Next modules

1. Booking Management + live trip/timing monitor
2. Saarthi/driver management and mandatory vehicle assignment UI
3. Service Area configuration
4. Booking Rules configuration
5. Notification controls/history
6. Fleet documents/maintenance
7. Payments, revenue and payouts
8. Customer management
9. Reports/analytics
10. Admin roles and audit log
