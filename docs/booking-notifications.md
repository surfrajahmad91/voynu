# Booking notifications

Successful bookings are saved first. The customer is then sent to the confirmation page, while the server makes a best-effort attempt to email the VOYNU admin team.

## Vercel environment variables

Add these variables to the VOYNU Vercel project:

- `RESEND_API_KEY` — Resend API key used only by the server-side booking endpoint.
- `RESEND_FROM_EMAIL` — verified sender, for example `VOYNU <bookings@your-verified-domain.com>`.
- `ADMIN_NOTIFICATION_EMAIL` — email address that should receive new booking alerts. If omitted, the configured VOYNU admin email is used as the fallback.

If `RESEND_API_KEY` is not configured, booking creation still succeeds and the booking remains available in the Admin Panel. Email delivery is deliberately non-blocking so an email-provider problem can never make a real booking look unsuccessful to the customer.

## Booking flow

1. Customer submits the booking.
2. Server authenticates the customer and validates the vehicle, capacity, locations and current pricing.
3. Server saves the booking in Supabase.
4. Server attempts the admin notification email.
5. Customer is redirected to `/booking-confirmed` using the saved booking details.

The confirmation page does not ask the customer to send the booking through WhatsApp. WhatsApp remains a separate support/contact channel elsewhere in the application.
