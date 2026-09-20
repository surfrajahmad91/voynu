# Saarthi ride workflow (server-enforced)

Source of truth: `advance_driver_booking_status` (migration `20260920020756_driver_workflow_hardening`).
The Saarthi app mirrors it (`apps/driver/lib/tripWorkflow.js`) but never decides on its own.

## Steps

One way: Accept → Out for pickup → Arrived at pickup → Start journey → Reached destination (trip completed).

Round trip: … Start outbound journey → Reached destination (waiting for return) → Start return journey → Reached back (trip completed).

Every step is written to `booking_status_events` (time, distance to the expected point, delay, flags, reason, cash outcome).

## When the driver is asked "why"

Only when something is clearly out of line. Values live in `driver_workflow_settings` (one row, editable by admin):

| Check | Default |
| --- | --- |
| "Out for pickup" opens before scheduled pickup | 240 min |
| Journey start late beyond | 10 min |
| Arrival late beyond (larger of) | 15 min or 20 % of the route time, measured from the actual start |
| Return start opens before schedule / late beyond | 10 min / 10 min |
| "Arrived" must be within | 400 m of pickup |
| "Start journey" must be within | 1000 m of pickup |
| Reaching destination / completing must be within | 500 m of the point |
| GPS older than | 180 s = not checked (logged as `no_gps`, never blocks) |

Return schedules that are not after pickup + route time are treated as invalid (`schedule_invalid`): no return timing rules apply.

## Cash on completion

Trips with `payment_method = cash` and `payment_status = due_on_pickup` ask for the outcome when the trip is completed:
collected in full, part payment (amount + reason) or not collected (reason).
The trip still completes; `cash_collection_status`, `cash_collected_amount`, `cash_collection_note` are stored and Admin gets an alert for anything but "collected".
`payment_status` is not changed by the driver; Admin confirms it.
