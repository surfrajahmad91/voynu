# Booking notifications

Successful bookings are saved first. Email is a post-save notification and is deliberately best-effort: an email-provider problem must never make a real booking look unsuccessful to the customer.

## Email provider

Booking confirmation email is currently disabled. VOYNU uses an explicit admin WhatsApp confirmation action from the Admin booking panel until a verified VOYNU sending domain is configured for Resend. The current Resend free plan is suitable for the present low-traffic stage: 3,000 emails/month with a 100-email daily limit. Resend currently allows up to 3 verified domains on the free plan.

## Vercel environment variables

Add these variables to the VOYNU Vercel project for the **Production** environment:

- `RESEND_API_KEY` — server-side Resend API key. Never expose this through `NEXT_PUBLIC_*` variables.
- `RESEND_FROM_EMAIL` — a sender address on a domain verified in Resend, for example `VOYNU <bookings@your-verified-domain.com>`.
- `ADMIN_NOTIFICATION_EMAIL` — the email address that should receive new booking alerts.

All three are required for the corresponding email delivery. The customer recipient comes from the authenticated Supabase user's email address.

### Resend setup note for later re-enablement

For production customer emails, use a verified VOYNU sending domain. Resend's documented examples use `onboarding@resend.dev` for API testing; a verified domain should be used for real customer-facing sending.

## Booking flow

1. Customer submits the booking.
2. Server authenticates the customer and validates the vehicle, capacity, locations and current pricing.
3. Server saves the booking in Supabase.
4. Server sends the customer booking email and admin booking email as best-effort notifications.
5. The customer is redirected to `/booking-confirmed` using the saved booking details.
6. In-app notifications continue independently of email delivery.

Email failures are logged server-side with a clear reason/status and never roll back a saved booking.

The confirmation page does not ask the customer to send the booking through WhatsApp. WhatsApp remains a separate support/contact channel elsewhere in the application.
