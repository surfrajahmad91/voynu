-- Fix Supabase/PostgREST relationship discovery for the rental marketplace.
-- rental_vehicle_listings.owner_id, rental_vehicle_documents.owner_id,
-- rental_vehicle_photos.owner_id, rental_availability_blocks.owner_id and
-- rental_payouts.owner_id represent the rental owner profile, whose id is also
-- the auth.users id. Point these foreign keys at rental_owner_profiles so
-- nested owner-profile selects work reliably in the Admin UI.

ALTER TABLE public.rental_vehicle_listings
  DROP CONSTRAINT IF EXISTS rental_vehicle_listings_owner_id_fkey;
ALTER TABLE public.rental_vehicle_listings
  ADD CONSTRAINT rental_vehicle_listings_owner_profile_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.rental_owner_profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.rental_vehicle_documents
  DROP CONSTRAINT IF EXISTS rental_vehicle_documents_owner_id_fkey;
ALTER TABLE public.rental_vehicle_documents
  ADD CONSTRAINT rental_vehicle_documents_owner_profile_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.rental_owner_profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.rental_vehicle_photos
  DROP CONSTRAINT IF EXISTS rental_vehicle_photos_owner_id_fkey;
ALTER TABLE public.rental_vehicle_photos
  ADD CONSTRAINT rental_vehicle_photos_owner_profile_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.rental_owner_profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.rental_availability_blocks
  DROP CONSTRAINT IF EXISTS rental_availability_blocks_owner_id_fkey;
ALTER TABLE public.rental_availability_blocks
  ADD CONSTRAINT rental_availability_blocks_owner_profile_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.rental_owner_profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.rental_payouts
  DROP CONSTRAINT IF EXISTS rental_payouts_owner_id_fkey;
ALTER TABLE public.rental_payouts
  ADD CONSTRAINT rental_payouts_owner_profile_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.rental_owner_profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;
