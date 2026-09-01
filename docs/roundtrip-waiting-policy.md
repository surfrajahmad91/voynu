# VOYNU Round-trip Waiting Policy

- Round trips must return on the same calendar day as pickup.
- Return time must be after the server-calculated estimated arrival.
- Maximum return wait is configurable in Admin; current default is 180 minutes (3 hours).
- Waiting is charged in configurable intervals; current default is ₹50 per 15 minutes.
- Waiting fee is calculated server-side from authoritative road duration and the active pricing version.
- The waiting configuration is versioned with pricing so existing bookings retain their original policy.
