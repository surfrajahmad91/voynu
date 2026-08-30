-- VOYNU pricing is intentionally simple at launch:
-- Admin changes pricing -> new bookings use it immediately.
-- Existing bookings retain their stored fare and pricing snapshot.
-- Previous test/scheduled versions are retained as history but are not active.
UPDATE public.pricing_versions
SET status = 'archived'
WHERE version > 1;

UPDATE public.pricing_versions
SET status = 'active'
WHERE version = 1;
