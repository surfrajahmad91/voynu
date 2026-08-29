import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function db() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server database configuration is missing: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticatedUser(request) {
  if (!anonKey || !supabaseUrl) return null;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await userClient.auth.getUser(authorization.slice(7));
  return data?.user || null;
}

function validCoordinates(location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function validatePassengerAndLuggage(passengerCount, luggageCount, category) {
  const passengers = Number(passengerCount);
  const luggage = Number(luggageCount);
  const passengerCapacity = Number(category?.passenger_capacity);
  const luggageCapacity = Number(category?.luggage_capacity);

  if (!Number.isInteger(passengers) || passengers < 1) {
    return "Passenger count must be at least 1.";
  }
  if (!Number.isInteger(luggage) || luggage < 0) {
    return "Luggage count cannot be negative.";
  }
  if (passengers > passengerCapacity) {
    return `Selected ${category.name} can accommodate up to ${passengerCapacity} passengers, but ${passengers} were requested.`;
  }

  const requestLuggageLimit = passengers * 3;
  if (luggage > requestLuggageLimit) {
    return `Luggage limit exceeded: maximum 3 luggage items per passenger. With ${passengers} passenger${passengers === 1 ? "" : "s"}, the maximum is ${requestLuggageLimit}.`;
  }
  if (luggage > luggageCapacity) {
    return `Selected ${category.name} can accommodate up to ${luggageCapacity} luggage items, but ${luggage} were requested.`;
  }

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      booking,
      vehicleCategoryId,
      passengerCount,
      luggageCount,
      paymentMethod,
      idempotencyKey,
    } = body || {};

    if (!booking || !vehicleCategoryId || !idempotencyKey) {
      return NextResponse.json(
        { error: "Invalid booking request: booking, vehicle category and idempotency key are required." },
        { status: 400 }
      );
    }

    if (paymentMethod !== "cash" && paymentMethod !== "upi") {
      return NextResponse.json(
        { error: "Invalid payment method. Choose Pay on Pickup or UPI." },
        { status: 400 }
      );
    }

    const user = await authenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to complete a booking." },
        { status: 401 }
      );
    }

    const client = db();

    const { data: existing, error: existingError } = await client
      .from("bookings")
      .select("id, booking_status, fare, payment_status, user_id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: `Could not check for an existing booking: ${existingError.message}` },
        { status: 503 }
      );
    }

    if (existing) {
      if (existing.user_id !== user.id) {
        return NextResponse.json(
          { error: "This booking request does not belong to the signed-in user." },
          { status: 403 }
        );
      }
      return NextResponse.json({ booking: existing, duplicate: true });
    }

    const { data: category, error: categoryError } = await client
      .from("vehicle_categories")
      .select("id, name, slug, active, bookable, passenger_capacity, luggage_capacity")
      .eq("id", vehicleCategoryId)
      .maybeSingle();

    if (categoryError) {
      return NextResponse.json(
        { error: `Selected vehicle category could not be checked: ${categoryError.message}` },
        { status: 503 }
      );
    }
    if (!category || !category.active || !category.bookable) {
      return NextResponse.json(
        { error: "Selected vehicle category is unavailable. Please return to cab selection and choose another vehicle." },
        { status: 409 }
      );
    }

    const capacityError = validatePassengerAndLuggage(
      passengerCount,
      luggageCount,
      category
    );
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 409 });
    }

    if (!validCoordinates(booking.pickup) || !validCoordinates(booking.drop)) {
      return NextResponse.json(
        { error: "Valid pickup and destination locations are required before a booking can be confirmed." },
        { status: 400 }
      );
    }

    const tripType = booking.tripType === "roundtrip" ? "roundtrip" : "oneway";
    const oneWayKm = Number(booking?.journey?.oneWayDistanceKm);
    if (!Number.isFinite(oneWayKm) || oneWayKm < 0) {
      return NextResponse.json(
        { error: "Invalid journey distance. Please return to the trip details and select the locations again." },
        { status: 400 }
      );
    }

    // pricing_versions uses `status`, not the legacy `active` column.
    const { data: pricing, error: pricingError } = await client
      .from("pricing_versions")
      .select("id, version, status")
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pricingError) {
      return NextResponse.json(
        { error: `Current pricing could not be loaded: ${pricingError.message}` },
        { status: 503 }
      );
    }
    if (!pricing) {
      return NextResponse.json(
        { error: "No active pricing version is configured. Please contact VOYNU before trying again." },
        { status: 503 }
      );
    }

    const { data: rule, error: ruleError } = await client
      .from("pricing_rules")
      .select("base_fare, per_km_rate, driver_allowance_per_day, minimum_fare, rounding_unit")
      .eq("pricing_version_id", pricing.id)
      .eq("vehicle_category_id", vehicleCategoryId)
      .eq("trip_type", tripType)
      .maybeSingle();

    if (ruleError) {
      return NextResponse.json(
        { error: `Pricing rule lookup failed for ${category.name}: ${ruleError.message}` },
        { status: 503 }
      );
    }
    if (!rule) {
      return NextResponse.json(
        { error: `No ${tripType} pricing rule exists for ${category.name} in active pricing version ${pricing.version}.` },
        { status: 503 }
      );
    }

    const billedKm = tripType === "roundtrip" ? oneWayKm * 2 : oneWayKm;
    const rawFare =
      Number(rule.base_fare) +
      billedKm * Number(rule.per_km_rate) +
      (tripType === "roundtrip" ? Number(rule.driver_allowance_per_day || 0) : 0);
    const minimum = Number(rule.minimum_fare || 0);
    const unit = Number(rule.rounding_unit) || 1;
    const fare = Math.round(Math.max(rawFare, minimum) / unit) * unit;
    const isUpi = paymentMethod === "upi";

    const row = {
      user_id: user.id,
      trip_type: tripType,
      pickup_name: booking.pickup?.name,
      pickup_lat: booking.pickup?.lat,
      pickup_lon: booking.pickup?.lon,
      drop_name: booking.drop?.name,
      drop_lat: booking.drop?.lat,
      drop_lon: booking.drop?.lon,
      one_way_distance_km: oneWayKm,
      total_distance_km: booking?.journey?.totalDistanceKm,
      travel_date: booking.travelDate,
      pickup_time: booking.pickupTime,
      return_date: booking.returnDate,
      return_time: booking.returnTime,
      passenger_name: booking.passengerName,
      phone: booking.phone,
      whatsapp: booking.whatsapp,
      vehicle_type: category.slug || category.name,
      vehicle_category_id: category.id,
      passenger_count: Number(passengerCount),
      luggage_count: Number(luggageCount),
      passenger_capacity_snapshot: Number(category.passenger_capacity),
      luggage_capacity_snapshot: Number(category.luggage_capacity),
      fare,
      payment_method: paymentMethod,
      payment_status: isUpi ? "pending" : "due_on_pickup",
      booking_status: isUpi ? "pending_payment" : "confirmed",
      pricing_version_id: pricing.id,
      quoted_fare: fare,
      idempotency_key: idempotencyKey,
      fare_breakdown: {
        baseFare: Number(rule.base_fare),
        distanceFare: billedKm * Number(rule.per_km_rate),
        driverAllowance: tripType === "roundtrip" ? Number(rule.driver_allowance_per_day || 0) : 0,
        billedDistanceKm: billedKm,
      },
      confirmed_at: isUpi ? null : new Date().toISOString(),
    };

    const { data, error } = await client
      .from("bookings")
      .insert(row)
      .select("id, booking_status, payment_status, fare, quoted_fare, pricing_version_id, user_id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Booking could not be saved: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ booking: data, duplicate: false });
  } catch (error) {
    console.error("VOYNU booking create error", error);
    return NextResponse.json(
      { error: error?.message || "Unable to create booking." },
      { status: 500 }
    );
  }
}
