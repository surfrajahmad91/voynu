# VOYNU App Separation Architecture

Status: Phase 1 scaffold only. Production `main` remains unchanged.

## Target applications

- `apps/web` — main public VOYNU experience. Customer-facing brand remains **VOYNU**; never show "Customer App".
- `apps/driver` — VOYNU Saarthi experience. Internal technical terminology remains `driver` / `driver_id` / `drivers`.
- `apps/admin` — VOYNU Admin operations dashboard.

## Shared backend

All three applications continue to use the same Supabase project, authentication, database, realtime notifications, payment verification, and dispatch logic.

## Migration order

1. Preserve the current working monolith as the rollback reference.
2. Scaffold the three app workspaces without changing production routes.
3. Extract the public VOYNU experience into `apps/web` and regression-test booking/auth/payment/notifications.
4. Extract the driver experience into `apps/driver` and regression-test assignment/status/realtime flows.
5. Extract admin into `apps/admin` and regression-test payment verification, dispatch, Auto Assign, driver/vehicle/pricing controls and notifications.
6. Move genuinely shared code into packages only after the three apps build independently.
7. Create separate Vercel projects and connect domains/subdomains.
8. Cut over production only after end-to-end regression testing.
9. Remove legacy role routes from the old app only after the new apps are proven.

## Safety rules

- Never delete the existing `app/` implementation during extraction.
- Never change Supabase dispatch/payment behavior as part of the application split.
- Keep `main` deployable throughout migration.
- Customer terminology: **VOYNU**.
- Driver customer-facing terminology: **VOYNU Saarthi**.
- Internal/backend terminology: **driver**.
