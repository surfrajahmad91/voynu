-- The baseline migration revokes public table privileges. Commute subscription
-- tables are RLS-protected, so authenticated admins/owners need SELECT table
-- privileges for the policies to be evaluated.

grant select on public.subscription_plans,
  public.subscription_holidays,
  public.commute_subscriptions,
  public.subscription_exceptions,
  public.subscription_trips
to authenticated;
