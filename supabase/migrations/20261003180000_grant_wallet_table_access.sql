-- The wallet tables have row-level-security policies (owner-read) but were never granted
-- table-level SELECT to the authenticated role, so the customer Wallet page failed with
-- "permission denied for table wallet_accounts". RLS still limits each customer to their own rows.
-- Writes stay locked down: all wallet changes go through security-definer functions.
grant select on public.wallet_accounts, public.wallet_transactions, public.wallet_reward_rules to authenticated;
