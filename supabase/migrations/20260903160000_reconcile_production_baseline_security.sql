-- Reconcile the reconstructed production baseline with the current production security model.
-- This migration is intentionally a no-op in production: the live database was already
-- corrected by the versioned migrations that precede this file. Its purpose is to make
-- future baseline/replay tooling explicit without embedding production secrets.
--
-- pg_net belongs in the extensions schema and dispatch authorization is stored in the
-- private.dispatch_security_config table. No literal dispatch token is present here.

-- No executable SQL is required.
