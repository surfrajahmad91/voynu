# VOYNU 2.0 — Engineering Master Plan

## Mission

Rebuild and harden VOYNU as a production-grade multi-app mobility platform without breaking existing working features.

Repository: `surfrajahmad91/voynu`
Primary branch: `main`

Apps:
- Customer
- Driver / Saarthi
- Admin

Backend:
- Supabase Auth
- PostgreSQL / RLS / RPCs / triggers
- Supabase Edge Functions
- Vercel deployments

Shared:
- shared UI/components
- shared API helpers
- shared business rules where appropriate

## Non-negotiable engineering rules

1. Never make speculative changes.
2. Before changing code, reproduce or trace the issue to its root cause.
3. Prefer the smallest safe change that fixes the root cause.
4. Do not duplicate business logic between Customer, Driver and Admin when it can live in a shared/backend authoritative layer.
5. Database/RPC rules are the final authority for security, money, assignment, cancellation and subscription lifecycle.
6. Never expose Supabase service-role/secret keys to browser code.
7. Never trust client-supplied distance, fare, ownership, driver assignment, payment state or permissions.
8. Every production fix must be followed by build verification and runtime verification.
9. Do not declare a fix complete merely because Vercel says READY.
10. Preserve existing working UX unless the change is explicitly part of the 2.0 redesign.
11. Keep commits small and descriptive.
12. Before modifying a file, inspect the current implementation and all callers/dependencies.
13. Before changing a database function, inspect its previous migrations and all callers.
14. Do not silently change pricing, cancellation policy, wallet rules, commission rules or subscription terms.
15. If requirements conflict, document the conflict and resolve it from the existing authoritative business rule rather than guessing.

## Current known issue to close first

Commute subscription creation currently reached Step 4 but displayed:
- "Subscription service is not configured. Please contact VOYNU."
- Then, after an attempted fix, "serviceRoleKey is not defined."

Root cause:
- The Customer subscription API was still referencing a removed serviceRoleKey.
- The subscription RPC had also been unnecessarily tied to a server service-role path.

Current intended architecture:
- Customer must be authenticated.
- Customer API receives the authenticated Bearer token.
- API validates the user through Supabase Auth.
- API calculates authoritative road distance server-side.
- API calls the subscription RPC using the authenticated session.
- RPC remains SECURITY DEFINER.
- RPC verifies auth.uid() matches p_user_id.
- Only authenticated users (for themselves) and service_role are permitted to execute the RPC.
- No service-role/secret key is required by the Customer API.

Do not revert this to exposing a service-role key in client code.

## VOYNU 2.0 architecture goals

### 1. Identity and authorization

Establish a single clear authorization model:
- Customer
- Driver
- Admin
- Super-admin/internal roles if already present

Every sensitive action must have:
- authenticated identity
- explicit authorization
- ownership/relationship validation
- database enforcement where applicable

Audit all RPC grants and RLS policies.

### 2. Booking engine

Unify and document the lifecycle for:
- normal rides
- rentals
- commute subscriptions
- subscription trips

Define authoritative state machines.

No UI should invent or locally transition a state that the backend rejects.

### 3. Commute subscription engine

Treat this as a first-class domain.

Audit:
- plan selection
- quote calculation
- authoritative road distance
- passenger details
- weekdays
- start/end dates
- payment
- wallet usage
- activation
- pause
- cancellation
- refund
- trip generation
- driver assignment
- driver unavailability
- replacement driver workflow
- cancelled-trip suppression
- expired unpaid subscriptions

Ensure Customer, Driver and Admin all observe the same backend state.

### 4. Live tracking and ETA

There must be one authoritative tracking model.

Customer ETA and Driver ETA must use the same:
- driver location
- target point
- route calculation
- trip state
- refresh strategy
- stale-location handling

Do not maintain separate ETA algorithms that can drift.

Audit:
- pickup ETA
- destination ETA
- return-trip ETA
- GPS updates
- stale GPS
- trip start
- arrival
- waiting
- return trip
- completion
- map rendering

### 5. Driver / Saarthi

Audit:
- online/offline state
- active trip
- navigation
- pause button
- commute schedule
- subscription assignments
- unavailability
- replacement
- notifications
- earnings
- cash collection
- trip completion

The driver app must never show a subscription as active/cancelled based only on stale UI state.

### 6. Customer

Audit:
- booking
- commute
- subscriptions
- payment
- wallet
- cancellation
- refunds
- tracking
- notifications
- profile
- support/contact flows

Fix mobile UX issues without changing business rules.

### 7. Admin

Audit:
- dashboard
- bookings
- live trip monitor
- driver management
- customer management
- subscriptions
- refunds
- cancellation
- driver replacement
- unavailability resolution
- pricing/configuration
- wallet
- referral/affiliate
- notifications
- audit logs

Admin actions must be auditable.

### 8. Money

Treat all financial values as backend-authoritative.

Audit:
- fare calculation
- discounts
- wallet
- UPI/payment state
- refunds
- cash collection
- driver earnings
- affiliate/referral commissions

Never trust client totals.

### 9. Notifications

Audit push notification architecture:
- token registration
- duplicate tokens
- invalid-token cleanup
- event-to-notification mapping
- Customer notifications
- Driver notifications
- Admin alerts

Keep service-role usage isolated to trusted server/Edge Function contexts.

### 10. Observability

Create a consistent error model:
- request/correlation ID
- structured server logs
- meaningful error messages
- safe user-facing messages
- no secret leakage

Production debugging must answer:
- what request failed
- which user/role was involved
- which route/RPC failed
- what state existed
- why it failed

### 11. Vercel 2.0 deployment architecture

Audit all three applications.

For each app document:
- Vercel project
- production branch
- build command
- root directory
- framework
- environment variables
- public vs secret variables
- Supabase URL/key requirements
- deployment aliases
- runtime configuration
- cron/Edge Function dependencies
- logging
- rollback strategy

Rules:
- browser variables only use NEXT_PUBLIC_* values intended to be public
- service-role/secret keys never enter client bundles
- preview and production configuration must be intentional
- every production deployment must be traceable to a commit
- verify READY + runtime behavior
- maintain a known-good rollback candidate

### 12. Database 2.0

Inventory:
- tables
- indexes
- foreign keys
- RLS policies
- RPCs
- triggers
- grants
- Edge Functions
- migrations

Look for:
- duplicate/obsolete RPC signatures
- conflicting migrations
- unsafe grants
- SECURITY DEFINER functions without fixed search_path
- missing indexes
- stale triggers
- client-trusted financial fields
- client-trusted ownership
- race conditions

Do not rewrite the database wholesale. Harden incrementally.

### 13. Testing

Build a regression matrix covering at minimum:

Customer:
- login
- ride booking
- rental booking
- commute quote
- commute creation
- payment
- wallet
- cancellation
- tracking

Driver:
- login
- online/offline
- accept
- navigation
- ETA
- trip lifecycle
- cash
- commute
- unavailability
- replacement

Admin:
- booking visibility
- live monitor
- assignment
- replacement
- cancellation
- refund
- subscription lifecycle
- audit

Security:
- unauthenticated access
- wrong-user access
- customer -> other customer
- driver -> other driver
- admin boundaries
- service-role exposure
- RLS bypass attempts

## Required workflow for every feature

For each feature:

1. Inventory current implementation.
2. Trace UI -> API -> shared code -> RPC/database.
3. Identify source of truth.
4. Reproduce current behavior.
5. Write the expected state machine/rules.
6. Identify root cause of any defect.
7. Make the smallest correct change.
8. Run/build.
9. Inspect deployment logs.
10. Test the real production path where safe.
11. Check adjacent apps for regressions.
12. Commit with a focused message.
13. Update this plan with status and remaining risks.

## Priority order

P0 — production blockers:
1. Commute subscription creation
2. Payment/subscription lifecycle integrity
3. ETA/tracking consistency
4. Driver pause/state synchronization
5. Cancellation consistency

P1 — operational integrity:
6. Driver unavailability/replacement
7. Admin subscription management
8. Wallet/refund/earnings consistency
9. Notifications
10. RLS/RPC/security audit

P2 — Vercel 2.0:
11. Deployment/environment standardization
12. Observability
13. Regression tests
14. Backup/rollback strategy
15. Performance and caching

P3 — UX:
16. Customer UX
17. Driver UX
18. Admin UX
19. Mobile/PWA/app-wrapper readiness

## Definition of done

A feature is NOT done when:
- code compiles
- Vercel says READY
- the UI looks correct

A feature is done only when:
- root cause is understood
- backend authority is correct
- security boundaries are correct
- all affected apps use the same state
- build passes
- production runtime is verified
- regression checks pass
- commit is documented
- no known blocker remains hidden

## Current status

2026-09-24:
- Commute subscription creation is the immediate blocker.
- The latest Customer API correction removes the stale serviceRoleKey reference.
- Next step is to verify the new production deployment and execute one real authenticated subscription-create request.
- Only after that should the Vercel 2.0 audit proceed feature-by-feature.
