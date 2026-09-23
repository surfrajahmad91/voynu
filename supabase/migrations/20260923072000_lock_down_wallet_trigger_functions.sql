-- Trigger-only wallet functions must not be callable through the Data API.
revoke execute on function public.apply_wallet_on_booking_insert() from public, anon, authenticated;
revoke execute on function public.apply_wallet_on_subscription_insert() from public, anon, authenticated;
revoke execute on function public.refund_wallet_on_booking_cancel() from public, anon, authenticated;
revoke execute on function public.refund_wallet_on_subscription_outcome() from public, anon, authenticated;
revoke execute on function public.issue_ride_wallet_rewards() from public, anon, authenticated;
revoke execute on function public.issue_subscription_wallet_reward() from public, anon, authenticated;
