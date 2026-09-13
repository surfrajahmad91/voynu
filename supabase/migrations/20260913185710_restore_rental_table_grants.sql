-- Restore PostgREST table privileges for the rental marketplace.
-- RLS remains the authorization boundary; these grants only allow the API roles to reach the tables.
grant usage on schema public to anon, authenticated;

grant select on public.rental_vehicle_listings to anon, authenticated;
grant select on public.rental_vehicle_photos to anon, authenticated;
grant select on public.rental_settings to anon, authenticated;

grant all privileges on public.rental_owner_profiles to authenticated;
grant all privileges on public.rental_vehicle_listings to authenticated;
grant all privileges on public.rental_vehicle_documents to authenticated;
grant all privileges on public.rental_vehicle_photos to authenticated;
grant all privileges on public.rental_availability_blocks to authenticated;
grant all privileges on public.rental_bookings to authenticated;
grant all privileges on public.rental_payouts to authenticated;
grant all privileges on public.rental_reviews to authenticated;

grant select on public.rental_settings to authenticated;
