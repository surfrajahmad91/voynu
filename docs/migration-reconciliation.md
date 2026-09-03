# Supabase migration reconciliation

## Status

As of 2026-09-03, the production Supabase project reports 86 applied migration versions. The repository previously contained only a partial set of migration files whose timestamps did not match the production ledger.

The repository is now reconciled to the production version set:

- `supabase/migrations/20260828171837_remote_schema_baseline.sql` contains the reconstructed production schema.
- Every other production migration timestamp is represented locally by a history placeholder.
- The old partial migration files were removed from the active migration directory; their original contents remain available in Git history.
- No production data or push credentials were committed.

Supabase compares migration history by the migration timestamp, not the descriptive filename. The local files therefore preserve all 86 production version identifiers while using a single authoritative schema baseline for fresh environments.

## Important operational rule

Do not edit or delete the history placeholders individually. Future schema changes must be added as a new migration with a fresh 14-digit timestamp greater than `20260902183759`.

Do not put production user data, driver data, booking data, or push private keys in migrations.

## Verification target

A local Supabase environment must be reset from the migration directory and must produce the same public/private application schema represented by the baseline. Production must continue to report the same 86 applied migration timestamps.

The production database itself was not reset or rewritten during this reconciliation.
