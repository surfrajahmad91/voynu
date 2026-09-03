# pg_net Migration Reconciliation

On 2026-09-03, the production Supabase database was updated through versioned migrations to move `pg_net` out of the `public` schema and restore the intended execute privileges on the web-push trigger function.

Applied production migrations:

- `20260903090410_move_pg_net_to_extensions_schema`
- `20260903090516_fix_pg_net_function_schema_reference`
- `20260903091123_restore_queue_web_push_execute_revoke`

`pg_net` does not support `ALTER EXTENSION ... SET SCHEMA`, so the extension was recreated in the managed `extensions` schema. Its HTTP API objects remain in the extension-owned `net` schema, and `queue_web_push_for_notification()` explicitly calls `net.http_post`.

The pg_net recreation recreated the trigger function, so the final migration restores the original non-PUBLIC EXECUTE privilege. The notification trigger itself remains enabled and executes internally through PostgreSQL's trigger mechanism.

All production changes are represented by timestamped migrations; no undocumented direct production-only edit is intended.
