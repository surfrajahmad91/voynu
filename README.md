# VOYNU

VOYNU is a three-PWA travel booking platform backed by a shared Supabase project.

## Production app structure

The repository has three deployable applications:

- `apps/customer` — VOYNU customer booking PWA
- `apps/driver` — VOYNU Saarthi driver PWA
- `apps/admin` — VOYNU Admin PWA

Each app has its own Next.js entry point, PWA manifest, service worker, package manifest, and deployment configuration. The deployable app entry points intentionally re-export the shared application implementation from the root `app/` tree so booking, driver, admin, and shared components remain single-source rather than duplicated.

## Shared application source

The root `app/` directory is **shared source**, not a fourth application. It contains the implementation consumed by the three deployable PWAs:

- Customer routes: `/`, `/account`, `/cab-selection`, `/booking-confirmed`, auth routes
- Saarthi route: `/driver`
- Admin routes: `/admin/*`
- Shared components and business rules
- Shared Supabase client and route/fare logic

`app/` should not be treated as an additional Vercel production app.

## Backend

- Supabase database, RLS, RPCs, triggers and realtime
- `supabase/functions/voynu-push` for scoped web push delivery
- `supabase/migrations` contains the database change history tracked in this repository

## Deployment rule

Vercel production projects point to the corresponding directory under `apps/`. Make application changes in the shared `app/` source when the behavior is shared; make app-specific changes in the appropriate `apps/<app>/` entry/config/public files.

Do not create recovery copies, alternate app trees, temporary deployment trigger files, or duplicate production source trees in the repository.
