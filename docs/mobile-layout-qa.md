# VOYNU Mobile Layout QA

## Issue

Customer home/booking screens could render as a narrower desktop-style composition on some mobile/PWA viewport sizes, leaving the right side of the viewport unused and making the page appear horizontally offset.

## Fix

- Shared document and body roots are explicitly constrained to 100% width.
- Shared `.page` is explicitly viewport-width safe and clips accidental horizontal overflow.
- Shared `.content` now uses `width: 100%` with a `760px` maximum rather than relying on a calculated width.
- Mobile content uses compact 10–12px gutters.
- Customer PageHeader now has explicit responsive classes and progressively compact controls below 700px, 520px and 400px.
- The mobile header keeps Ride, Rent, notifications, account and WhatsApp actions available without forcing horizontal page scrolling.
- Home Ride/Rent switch remains full-width inside its own responsive bar.

## Safety

No booking, pricing, dispatch, fleet, authentication or database behavior is changed. This is a presentation/viewport containment fix only.
