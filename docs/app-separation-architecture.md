# VOYNU Application Architecture

**Status:** Current production architecture and repository ownership contract.

## 1. Production applications

VOYNU has exactly three deployable PWAs:

- `apps/customer` — Customer booking PWA.
- `apps/driver` — VOYNU Saarthi/Driver PWA. The product-facing name is Saarthi, but the current Vercel Root Directory is the `driver` directory; do not rename it without coordinating the Vercel setting first.
- `apps/admin` — VOYNU Admin PWA.

There is no `apps/web` application and no fourth production frontend.

## 2. Deployment boundaries

Each application has its own Next.js app directory, package manifest, PWA metadata/assets, styles and Vercel deployment configuration.

The three Vercel projects are separate deployments of the same Git repository. Vercel supports this monorepo model with a Root Directory for each project, and can include source outside that directory when the project is configured to do so.

## 3. Current source ownership

The repository is in the middle of a controlled cleanup from an older shared-source layout to explicit ownership.

The current root `app/` tree is **active source**, not an unused fourth application. It currently contains implementations consumed by the three app shells. This is why deleting the root tree blindly is unsafe.

The target ownership model is:

```text
apps/
├── customer/
│   ├── app/          # customer routes
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

shared/               # only code genuinely consumed by 2+ apps
supabase/             # backend source and migrations
docs/                 # architecture and operational documentation
```

A migration to this target is performed file-by-file using dependency evidence. It is not acceptable to copy the root implementation into an app and leave two production copies alive.

## 4. What qualifies as shared

A file belongs in shared code only when production dependency evidence shows that two or more applications consume it.

Examples of likely shared concerns include notification delivery/client infrastructure, common Supabase client configuration, or a map/route utility genuinely used by multiple applications.

A customer fare rule, admin authorization helper, or Saarthi navigation component is not shared merely because another app could theoretically use it.

## 5. APIs and backend helpers

API endpoints belong to the application that owns the user-facing capability unless the endpoint is intentionally consumed by multiple applications.

A shared server helper may live outside an app when it is genuinely reused. The application route handlers should remain in the owning application's `app/api` tree so the deployment boundary is explicit.

Supabase migrations and Edge Functions remain repository-level backend infrastructure because all three PWAs depend on the same backend project.

## 6. Root-directory rules

The repository root is reserved for repository-wide infrastructure and documentation.

Allowed categories include:

- `README.md`
- `.gitignore`
- `docs/`
- `supabase/`
- explicitly justified shared infrastructure/configuration

Do not recreate a root Next.js application, root package manifest, root Next config, recovery app, alternate production source tree, or temporary Vercel trigger file.

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

## 8. Current known migration exception

`lib/capacityValidation.js` is currently active. The Customer cab-selection page and Customer booking-create API consume it. It was restored after an earlier cleanup attempt proved that folder appearance alone was not sufficient evidence for deletion.

Its eventual destination is Customer-owned code, but it must be moved together with its consumers and validated rather than deleted or duplicated.

## 9. Saarthi directory rename

The application is branded **VOYNU Saarthi**, but the current production repository directory is `apps/driver`. A future rename to `apps/saarthi` is desirable for semantic clarity, but it is a deployment change as well as a Git rename.

Do not rename it in GitHub until the `voynu-saarthi` Vercel project's Root Directory is changed to `apps/saarthi` and the new deployment is verified. This avoids intentionally breaking the live driver build.

## 10. Commit policy

Every structural commit must state:

- the architectural reason;
- the ownership boundary changed;
- important dependency checks performed;
- validation performed or deliberately pending.

Never use vague commit messages such as `cleanup`, `changes`, or `fix stuff` for production work.

## 11. Handover standard

A developer joining VOYNU should be able to answer these questions from the repository:

- Which three applications are deployed?
- Which directory owns each application?
- Which code is genuinely shared?
- Where are Supabase migrations and Edge Functions?
- Which files are historical documentation rather than active instructions?
- What must never be recreated?
- What must be checked before moving/deleting code?
- How are production builds validated?

If the answer cannot be found in the repository documentation, the documentation is incomplete and should be improved as part of the next relevant structural change.

## Final principle

**Repository cleanliness is achieved by understanding dependencies and ownership, not by making the tree look empty.**

The goal is one authoritative implementation per capability, a clear owner for every application-specific file, a small and justified shared layer, and documentation that makes future maintenance predictable.
