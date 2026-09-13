# VOYNU Rentals — V1 product design

VOYNU Rentals is a second mobility product alongside driver-operated cab bookings. It lets vehicle owners earn from cars, bikes and scooters that are otherwise sitting unused, while customers can rent an approved vehicle for a defined period.

## Two-sided model

### Vehicle owner
- Create an owner profile.
- Submit vehicle details and ownership/insurance documents.
- Choose availability windows and minimum rental duration.
- Set or accept VOYNU-managed pricing.
- See booking calendar, earnings, deductions and payout status.
- Approve handover/return checkpoints where required.

### Customer
- Browse approved vehicles by city, type and dates.
- See total rental price, security deposit, included kilometres and excess-km rules before payment.
- Reserve and pay.
- Complete identity/handover checks required for the rental.
- Report pickup/return condition with timestamped photos.

## Vehicle types

The same customer-facing category system should be extensible to car, hatchback, sedan, SUV, motorcycle and scooter. Rental listings must not be mixed with driver-operated fleet records: a rental vehicle is its own asset with its own owner, documents, availability and booking calendar.

## Admin approval gates

A listing cannot become bookable until an admin has approved:
- Owner identity/KYC status.
- Ownership/RC evidence.
- Insurance validity and rental-use eligibility.
- Required local permits/compliance checks where applicable.
- Vehicle condition and required photos.
- Pricing and security deposit.

Expired documents automatically make the listing unavailable until renewed.

## Rental booking lifecycle

`request -> payment_pending -> confirmed -> pickup_due -> handed_over -> active -> return_due -> returned -> inspection -> payout_pending -> completed`

Cancellation, no-show, damage/dispute and admin-hold states remain separate from the happy path.

## Money model

Store every amount separately:
- gross rental amount
- taxes/fees where applicable
- security deposit
- VOYNU platform fee
- owner payout
- refunds/adjustments
- damage/dispute hold

Never calculate owner earnings from a mutable display price after the booking has been confirmed; snapshot the commercial terms on the rental booking.

## Safety and trust

The launch flow should include a documented handover checklist, odometer/fuel or charge snapshot, condition photos, customer/owner verification, emergency support and a dispute process. Rental-specific insurance/permit eligibility must be verified before public launch rather than assuming that a normal private-use policy permits commercial self-drive rental.

## Relationship to cab service

The existing `vehicles` table remains the driver-operated fleet. Rental vehicles should use separate rental tables. This prevents a car listed for self-drive rental from accidentally becoming eligible for automatic cab dispatch.
