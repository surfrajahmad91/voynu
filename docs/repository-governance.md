# VOYNU Engineering & Handover Rules

VOYNU is maintained as a production three-PWA monorepo. Repository organization is part of the product's engineering contract, not an optional cleanup preference.

## 1. Application ownership

- `apps/customer/` owns customer-facing routes, components, libraries, PWA assets, and app configuration.
- `apps/driver/` is the current deployment directory for the VOYNU Saarthi/Driver PWA. Do not rename it casually: the Vercel project is currently configured around this deployment boundary. A future rename to `apps/saarthi/` requires the Vercel Root Directory to be changed and verified before the GitHub rename is promoted.
- `apps/admin/` owns Admin routes, components, libraries, PWA assets, and app configuration.

## 2. Shared code

Only code genuinely consumed by two or more applications belongs outside an application directory. Shared code should live under an explicitly named shared area rather than being mixed with application routes.

Before creating shared code, verify that at least two production applications actually consume it. Do not move code to shared merely to avoid deciding which app owns it.

## 3. Root-directory policy

The repository root is reserved for repository-wide infrastructure and documentation: `README.md`, `.gitignore`, `docs/`, `supabase/`, and future workspace/build governance files that are demonstrably repository-wide.

Do not create another root Next.js application, root `package.json`, root `next.config.js`, recovery application, temporary deployment trigger, or duplicate production source tree.

## 4. Before deleting or moving anything

A file or directory may be deleted only after checking:

1. direct imports/references;
2. dynamic or string-based references where applicable;
3. Vercel build/deployment role;
4. Supabase/backend dependency;
5. PWA/static-asset role;
6. whether it is a shared dependency of another app;
7. whether an apparently duplicate file is actually an app-specific copy required by a deployment boundary.

A move is a refactor, not a cosmetic rename. Update imports, build configuration, documentation, and deployment settings as one change when required.

## 5. Commit standard

Every production commit must have a specific message that explains the intent. Avoid messages such as `update`, `fix stuff`, `changes`, or `cleanup`.

For structural changes, the commit documentation must explain:

- what moved/was removed;
- why it was safe;
- what dependency or deployment boundary was checked;
- how the affected applications were validated.

Do not commit speculative changes simply to force a deployment.

## 6. Validation standard

For changes affecting shared code or repository structure:

- build Customer;
- build Saarthi/Driver;
- build Admin;
- inspect Vercel deployment state when production boundaries are affected;
- inspect runtime errors after deployment when behavior is affected.

A successful edit is not considered a successful fix until the dependency graph and production build are consistent.

## 7. Recovery and legacy-code policy

Do not keep backup copies, recovery branches represented as source folders, old application trees, obsolete deployment trigger files, or duplicate implementations in `main` merely because they might be useful later. Git history is the recovery mechanism.

Historical documentation may remain when it explains an important production decision or migration, but it must be clearly identified as historical and must not be mistaken for current architecture.

## 8. Security and backend boundary

Frontend code may use only public Supabase configuration intended for the browser. Service-role credentials remain server-side/edge-function-only.

Database authorization, RLS, RPC authorization, notification audience scoping, and server-authoritative booking/fare validation are production security boundaries. Do not weaken them to solve a frontend or build problem.

## 9. Documentation is part of delivery

When architecture, deployment boundaries, notification routing, branding, security, or important booking rules change, update the relevant document in `docs/` in the same change.

The root `README.md` must remain sufficient for a new developer to understand the repository structure, deployment boundaries, local build entry points, backend location, and rules against legacy/recovery duplication.

## 10. Decision rule

When speed conflicts with correctness, preserve correctness. Inspect first, make the smallest clean architectural change that solves the actual problem, validate all affected boundaries, then commit with documentation.
