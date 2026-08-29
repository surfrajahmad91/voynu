-- Align the database trigger with the current passenger-priority capacity rule.
--
-- Vehicle capacity is passenger capacity + configured luggage capacity.
-- Passengers take priority; luggage uses remaining total capacity and is
-- capped at 3 items per passenger.
--
-- The previous trigger incorrectly rejected luggage above the configured
-- luggage_capacity value, which blocked valid requests such as SUV 3 passengers
-- + 5 luggage (6 passenger capacity + 4 luggage capacity = 10 total).

CREATE OR REPLACE FUNCTION public.validate_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  category record;
  max_luggage integer;
begin
  if new.vehicle_category_id is null and new.vehicle_type is not null then
    select id
    into new.vehicle_category_id
    from public.vehicle_categories
    where slug = lower(new.vehicle_type)
    limit 1;
  end if;

  if new.vehicle_category_id is not null then
    select passenger_capacity, luggage_capacity
    into category
    from public.vehicle_categories
    where id = new.vehicle_category_id
      and active = true
      and bookable = true;

    if not found then
      raise exception 'Selected vehicle category is unavailable';
    end if;

    if new.passenger_count is not null then
      if new.passenger_count < 1 then
        raise exception 'Passenger count must be at least 1';
      end if;

      if new.passenger_count > category.passenger_capacity then
        raise exception 'Passenger count exceeds vehicle category capacity';
      end if;
    end if;

    if new.luggage_count is not null then
      if new.luggage_count < 0 then
        raise exception 'Luggage count cannot be negative';
      end if;

      max_luggage := least(
        greatest(0, category.passenger_capacity + category.luggage_capacity - coalesce(new.passenger_count, 0)),
        coalesce(new.passenger_count, 0) * 3
      );

      if new.luggage_count > max_luggage then
        raise exception 'Luggage count exceeds the remaining total vehicle capacity';
      end if;
    end if;

    new.passenger_capacity_snapshot = category.passenger_capacity;
    new.luggage_capacity_snapshot = category.luggage_capacity;
  end if;

  return new;
end;
$function$;
