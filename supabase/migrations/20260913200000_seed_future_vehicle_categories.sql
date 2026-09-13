insert into public.vehicle_categories(name,slug,description,passenger_capacity,luggage_capacity,active,bookable,sort_order)
values
  ('Auto Rickshaw','auto-rickshaw','Three-wheeler for short urban single or small-group trips.',3,1,false,false,20),
  ('Bike','bike','Two-wheeler ride for single-person urban commute.',1,0,false,false,21),
  ('Scooter','scooter','Scooter ride for single-person urban commute.',1,0,false,false,22)
on conflict (slug) do nothing;
