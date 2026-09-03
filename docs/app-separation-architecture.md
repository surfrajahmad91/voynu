# VOYNU Application Architecture

**Status:** Current production architecture and repository ownership contract.

## 1. Production applications

VOYNU has exactly three deployable PWAs:

- `apps/customer` — Customer booking PWA.
- `apps/driver` — VOYNU Saarthi/Driver PWA. The product-facing name is Saarthi, but the current Vercel Root Directory is the `driver` directory; do not rename it without coordinating the Vercel setting first.
- `apps/admin` — VOYNU Admin PWA.

There is no `apps/web` application and no fourth production frontend.

## 2. Deployment boundaries

Each application has its own Next.js `app/` directory, package manifest, PWA metadata/assets, styles and Vercel deployment configuration.

The three Vercel projects are separate deployments of the same Git repository. Vercel supports this monorepo model with a Root Directory for each project, and can include source outside that directory when the project is configured to do so.

## 3. Current source ownership

The source-separation cleanup is **complete and verified**. The repository root no longer contains a production Next.js `app/` tree or a root application `lib/` tree. There is also no `apps/web` application.

The ownership model is:

```text
apps/
├── customer/
│   ├── app/          # customer routes and customer APIs
│   ├── components/   # customer-only UI
│   ├── lib/          # customer-only business logic
│   ├── public/       # customer PWA assets
│   └── styles/
├── driver/
│   ├── app/          # Saarthi routes
│   ├── components/   # Saarthi-only UI
│   ├── lib/          # Saarthi-only business logic
│   ├── public/       # Saarthi PWA assets
│   └── styles/
└── admin/
    ├── app/          # Admin routes
    ├── components/   # Admin-only UI
    ├── lib/          # Admin-only business logic
    ├── public/       # Admin PWA assets
    └── styles/

shared/               # code genuinely consumed across applications
supabase/             # backend source and migrations
docs/                 # architecture and operational documentation
```

Source is owned by the application that consumes it. Shared code is limited to code with genuine cross-application dependency evidence.

## 4. Shared source

Current shared concerns include authentication pages, common UI infrastructure, shared styling, Supabase client/theme utilities and the road-distance utility used by multiple applications.

Customer fare rules, Customer service-area logic, Admin authorization helpers and Saarthi navigation logic remain application-owned.

## 5. APIs and backend helpers

API endpoints belong to the application that owns the user-facing capability unless an endpoint is intentionally consumed by multiple applications.

Customer booking creation and its email helper are Customer-owned. Shared road-distance logic remains under `shared/api` because both Customer and Saarthi consume it.

Supabase migrations and Edge Functions remain repository-level backend infrastructure because all three PWAs depend on the same backend project.

## 6. Root-directory rules

The repository root is reserved for repository-wide infrastructure and documentation.

Allowed categories include:

- `README.md`
- `.gitignore`
- `docs/`
- `supabase/`
- `shared/`
- explicitly justified repository-wide configuration

Do not recreate a root Next.js application, root application `lib/`, recovery app, alternate production source tree, or temporary Vercel trigger file.

## 7. Safe move/delete procedure

Before moving or deleting any file:

1. Search direct imports and references.
2. Check dynamic/string references where relevant.
3. Check whether another app consumes the file.
4. Check Vercel build/deployment boundaries.
5. Check Supabase/backend dependencies.
6. Check PWA/static asset usage.
7. Move the implementation once and update consumers.
8. Build every affected app.
9. Confirm the old path is no longer referenced.
10. Update documentation when ownership or architecture changes.

If any dependency is uncertain, **do not delete**. Investigate first.

## 8. Capacity validation ownership

`capacityValidation.js` is now Customer-owned at `apps/customer/lib/capacityValidation.js`. It was moved together with the Customer consumers and retained because dependency evidence showed it was active production logic.

It must not be recreated at the repository root or duplicated into another application without new dependency evidence.

## 9. Saarthi directory rename

The application is branded **VOYNU Saarthi**, but the current production repository directory is `apps/driver`. A future rename to `apps/saarthi` is a deployment change as well as a Git rename.

Do not rename it in GitHub until the `voynu-saarthi` Vercel project's Root Directory is changed to `apps/saarthi` and the new deployment is verified.

## 10. Verification gate

The completed separation was accepted only after a controlled migration verified:

- Customer production build passes;
- Saarthi/Driver production build passes;
- Admin production build passes;
- relative dependency resolution succeeds;
- stale root `app/` and `lib/` dependencies are rejected;
- root `app/`, root `lib/` and `apps/web` are absent;
- temporary source-separation workflows are removed.

Git history remains the recovery mechanism. Recovery copies must not be kept as parallel production source.

## 11. Commit policy

Structural commits must state the architectural reason and preserve one clear implementation of each production capability.

The repository should be treated as production software: inspect first, prove dependencies, change the underlying structure cleanly, document the reason, validate the result, then commit.
