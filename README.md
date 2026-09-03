# VOYNU

VOYNU is a production travel-booking platform consisting of three independent Next.js PWAs backed by one Supabase project.

## Production applications

| Application | Repository directory | Purpose | Vercel project |
|---|---|---|---|
| Customer | `apps/customer` | Customer booking and account experience | `voynu-customer` |
| Saarthi / Driver | `apps/driver` | Driver trip, navigation and status experience | `voynu-saarthi` |
| Admin | `apps/admin` | Operations, dispatch, pricing and fleet administration | `voynu-admin` |

**Important:** `apps/driver` is the current repository/deployment directory for the Saarthi application. The product is called Saarthi, but the deployment boundary is still named `driver`. Do not rename this directory without changing and verifying the Vercel Root Directory first.

There is no `apps/web` application and no fourth production frontend.

## Repository layout

```text
VOYNU/
├── apps/
│   ├── customer/          # Customer PWA and its deployment boundary
│   ├── driver/            # Saarthi/Driver PWA and its deployment boundary
│   └── admin/             # Admin PWA and its deployment boundary
├── shared/                # Genuinely shared UI, auth, styles and utilities
├── supabase/              # Database migrations, functions and backend source
├── docs/                  # Current architecture, operational and historical decisions
├── .gitignore
└── README.md
```

The verified source-separation target intentionally has **no root `app/`, no root `lib/`, and no `apps/web/`**. Production source belongs to its owning application; only code proven to be genuinely shared belongs under `shared/`.

Dependency evidence takes precedence over folder appearance: source is moved with its consumers, imports are rewritten path-safely, and all three applications must build before the structural migration is accepted.

## Current application boundaries

Each application has its own Next.js `app/`, `public/`, styles, package manifest and deployment configuration. Customer and Saarthi may consume shared authentication, UI, styling and utilities from `shared/`; app-specific business logic remains inside the owning application.

The three deployment boundaries are intentionally independent:

- Customer owns booking, account, cab selection and customer-facing booking APIs.
- Saarthi owns driver/trip-facing routes and driver-specific components.
- Admin owns operations, dispatch, pricing and fleet administration.
- Shared code is limited to components, authentication, styles and utilities that are intentionally cross-application.

## Backend

Supabase is the shared backend for all three applications:

- authentication;
- PostgreSQL database;
- Row Level Security;
- RPCs and triggers;
- realtime booking/dispatch state;
- notification records;
- push-subscription storage;
- `supabase/functions/voynu-push` for scoped web-push delivery;
- `supabase/migrations/` for repository-tracked database changes.

The frontend must never contain service-role credentials. Browser code may use only the public Supabase configuration intended for client use.

## Booking and notification boundaries

The three applications are separate security and UX audiences even though they share Supabase:

- Customer notifications are customer-only.
- Saarthi/Driver notifications are driver-only.
- Admin notifications are admin-only.
- Push delivery is audience-scoped in the push infrastructure.
- Server-authoritative booking validation and fare calculation must not be bypassed by trusting client-calculated values.

See `docs/booking-notifications.md` and `docs/notification-system-v7.md` for operational details.

## Vercel deployment model

The three applications are separate Vercel projects connected to the same GitHub repository. Vercel supports this monorepo pattern with an independent Root Directory per project. Shared source outside an application's Root Directory is supported when the project's build configuration includes it.

Current production project names:

- `voynu-customer`
- `voynu-saarthi`
- `voynu-admin`

Do not add a fourth Vercel project for an old/recovery application.

## Development and change workflow

1. Inspect the repository root first.
2. Identify the owning application or prove that the code is genuinely shared.
3. Search all references before deleting or moving code.
4. Check Vercel and Supabase dependencies when relevant.
5. Make the cleanest underlying fix; do not add speculative compatibility layers.
6. Update documentation in the same change when architecture or operational behavior changes.
7. Validate all affected application builds. For repository-wide structural changes, validate all three.
8. Check production deployment/runtime state when the change affects a deployed boundary.
9. Commit only with a precise, meaningful message.

## What must not be added

- recovery/backup source folders;
- duplicate production application trees;
- temporary `.vercel-deploy-trigger` files;
- abandoned `apps/web` or other old application directories;
- root Next.js configuration recreated only to work around an app-specific build;
- hard-coded secrets or service-role credentials;
- undocumented security bypasses;
- speculative changes made only to trigger Vercel.

## Documentation index

- `docs/app-separation-architecture.md` — current architecture and ownership rules.
- `docs/repository-governance.md` — mandatory engineering and handover rules.
- `docs/booking-notifications.md` — booking notification behavior.
- `docs/notification-system-v7.md` — push notification audience/icon behavior.
- `docs/brand-guidelines-v1.md` — current visual identity.
- `docs/phase5-server-authoritative-fare.md` — server-authoritative fare decision history.
- `docs/phase13-payment-aware-dispatch.md` — payment-aware dispatch decision history.
- `docs/roundtrip-waiting-policy.md` — round-trip waiting policy.

Historical documents are retained only when they explain a meaningful production decision. They are not instructions to recreate obsolete architecture.

## Engineering rule

**Inspect first. Prove dependencies. Change the underlying structure cleanly. Document the reason. Validate the result. Then commit.**

This repository is maintained as production software, not as a collection of recovery experiments. Git history is the recovery mechanism; `main` should contain one clear, understandable implementation of each production capability.

## Verified source separation

The three-app source separation was verified with production builds for Customer, Saarthi, and Admin plus a dependency-resolution and legacy-root audit before the migration was integrated into `main`. Temporary migration workflows were removed after those verification gates passed.