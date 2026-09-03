# VOYNU Application Architecture

Status: Current production repository structure.

## Production applications

VOYNU has exactly three deployable PWAs:

- `apps/customer` — customer booking PWA
- `apps/driver` — VOYNU Saarthi driver PWA
- `apps/admin` — VOYNU Admin PWA

There is no `apps/web` application and no fourth production app.

## Shared source

The root `app/` directory is the single shared application source tree consumed by the three deployable app shells. It is not a fourth deployed application.

Shared source contains:

- Customer booking, account, authentication and booking-confirmed routes
- Saarthi driver trip/status/navigation implementation
- Admin operations, dispatch, pricing, vehicle and category implementation
- Shared maps/location components
- Shared notification and push components
- Shared Supabase client and business rules
- Shared route-distance and booking-email server helpers

The three `apps/*` directories provide the actual Vercel build boundaries and app-specific PWA metadata, service workers, styles, and route entry points.

## Backend

All three applications use the same Supabase project for authentication, database access, RLS, RPCs, realtime data, booking state, dispatch, and notification infrastructure.

`supabase/functions/voynu-push` handles scoped web-push delivery. Database migrations in `supabase/migrations` are the tracked migration history for changes made in this repository.

## Rules for future changes

1. Make shared behavior changes in the root `app/` source when the behavior is genuinely shared.
2. Make customer-specific deployment/PWA changes in `apps/customer`.
3. Make Saarthi-specific deployment/PWA changes in `apps/driver`.
4. Make Admin-specific deployment/PWA changes in `apps/admin`.
5. Do not create alternate copies of the root application source.
6. Do not create recovery copies, temporary deployment trigger files, or obsolete app directories.
7. Do not add a new root `package.json`, root Next.js config, or alternate application shell unless the deployment architecture is intentionally redesigned and all three Vercel projects are updated together.
8. Preserve the three-app boundary when adding future features.
