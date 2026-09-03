-- The pg_net drop/recreate (20260903090410) recreated queue_web_push_for_notification() from scratch, which reset it to the Postgres default privilege of EXECUTE granted to PUBLIC. The original design (20260901000503_add_web_push_notifications) explicitly revoked this. Restore that revoke.
revoke all on function public.queue_web_push_for_notification() from public, anon, authenticated;
