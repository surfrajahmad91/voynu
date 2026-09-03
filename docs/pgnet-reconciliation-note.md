# pg_net Reconciliation Note

Production pg_net cleanup was completed through versioned migrations. The extension is installed in `extensions`; its HTTP API remains in `net`. The web-push trigger function explicitly calls `net.http_post`, and its PUBLIC/anon/authenticated EXECUTE privileges are revoked after the pg_net recreation.

Production migration versions applied for this change:
- `20260903090410_move_pg_net_to_extensions_schema`
- `20260903090516_fix_pg_net_function_schema_reference`
- `20260903091123_restore_queue_web_push_execute_revoke`
