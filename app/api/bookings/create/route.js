import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { validateCapacity } from "../../../../lib/capacityValidation";
import { notifyAdminOfBooking } from "../../../_lib/adminNotification";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getBearerToken(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

function dbForUser(accessToken) {
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Server database configuration is missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured."
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function authenticatedUser(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken || !anonKey || !supabaseUrl) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data?.user) return null;
  return { user: data.user, accessToken };
}

function validCoordinates(location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
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
        {
          error: "Invalid booking request: booking, vehicle category and idempotency key are required.",
          code: "INVALID_BOOKING_REQUEST",
          stage: "request.validation",
        },
        { status: 400 }
      );
    }

    if (paymentMethod !== "cash" && paymentMethod !== "upi") {
      return NextResponse.json(
        {
          error: "Invalid payment method. Choose Pay on Pickup or UPI.",
          code: "INVALID_PAYMENT_METHOD",
          stage: "request.validation",
        },
        { status: 400 }
      );
    }

    const auth = await authenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        {
          error: "You must be logged in to complete a booking. Your login session may have expired; please sign in again.",
          code: "AUTHENTICATION_FAILED",
          stage: "authentication",
        },
        { status: 401 }
      );
    }

    const { user, accessToken } = auth;
    const client = dbForUser(accessToken);

    // Use the signed-in user's Supabase session for every database operation.
    // Booking creation does not require a service-role key because the existing
    // RLS policies explicitly allow authenticated users to create their own rows.
    const { data: existing, error: existingError } = await client
      .from("bookings")
      .select("id, booking_status, fare, payment_status, user_id")
      .eq("idempotency_key", idempotencyKey)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Could not check for an existing booking: ${existingError.message}`,
          code: existingError.code || "BOOKING_LOOKUP_FAILED",
          stage: "bookings.existing.lookup",
          details: existingError.details || null,
          hint: existingError.hint || null,
        },
        { status: 503 }
      );
    }

    if (existing) {
      return NextResponse.json({ booking: existing, duplicate: true });
    }

    const { data: category, error: categoryError } = await client
      .from("vehicle_categories")
      .select("id, name, slug, active, bookable, passenger_capacity, luggage_capacity")
      .eq("id", vehicleCategoryId)
      .maybeSingle();

    if (categoryError) {
      return NextResponse.json(
        {
          error: `Selected vehicle category could not be checked: ${categoryError.message}`,
          code: categoryError.code || "VEHICLE_CATEGORY_LOOKUP_FAILED",
          stage: "vehicle_categories.lookup",
          details: categoryError.details || null,
          hint: categoryError.hint || null,
        },
        { status: 503 }
      );
    }

    if (!category || !category.active || !category.bookable) {
      return NextResponse.json(
        {
          error: "Selected vehicle category is unavailable. Please return to cab selection and choose another vehicle.",
          code: "VEHICLE_CATEGORY_UNAVAILABLE",
          stage: "vehicle_categories.validation",
        },
        { status: 409 }
      );
    }

    const capacity = validateCapacity({
      passengerCount,
      luggageCount,
      passengerCapacity: category.passenger_capacity,
      luggageCapacity: category.luggage_capacity,
    });

    if (!capacity.valid) {
      return NextResponse.json(
        {
          error: capacity.reason,
          code: capacity.code || "CAPACITY_INVALID",
          stage: "vehicle_capacity.validation",
          details: capacity,
        },
        { status: 409 }
      );
    }

    if (!validCoordinates(booking.pickup) || !validCoordinates(booking.drop)) {
      return NextResponse.json(
        {
          error: "Valid pickup and destination locations are required before a booking can be confirmed.",
          code: "INVALID_LOCATION_COORDINATES",
          stage: "booking.location.validation",
        },
        { status: 400 }
      );
    }

    const tripType = booking.tripType === "roundtrip" ? "roundtrip" : "oneway";
    const oneWayKm = Number(booking?.journey?.oneWayDistanceKm);
    if (!Number.isFinite(oneWayKm) || oneWayKm < 0) {
      return NextResponse.json(
        {
          error: "Invalid journey distance. Please return to the trip details and select the locations again.",
          code: "INVALID_JOURNEY_DISTANCE",
          stage: "booking.journey.validation",
        },
        { status: 400 }
      );
    }

    const { data: pricing, error: pricingError } = await client
      .from("pricing_versions")
      .select("id, version, status")
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pricingError) {
      return NextResponse.json(
        {
          error: `Current pricing could not be loaded: ${pricingError.message}`,
          code: pricingError.code || "PRICING_VERSION_LOOKUP_FAILED",
          stage: "pricing_versions.lookup",
          details: pricingError.details || null,
          hint: pricingError.hint || null,
        },
        { status: 503 }
      );
    }

    if (!pricing) {
      return NextResponse.json(
        {
          error: "No active pricing version is configured. Please contact VOYNU before trying again.",
          code: "NO_ACTIVE_PRICING",
          stage: "pricing_versions.validation",
        },
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
        {
          error: `Pricing rule lookup failed for ${category.name}: ${ruleError.message}`,
          code: ruleError.code || "PRICING_RULE_LOOKUP_FAILED",
          stage: "pricing_rules.lookup",
          details: ruleError.details || null,
          hint: ruleError.hint || null,
        },
        { status: 503 }
      );
    }

    if (!rule) {
      return NextResponse.json(
        {
          error: `No ${tripType} pricing rule exists for ${category.name} in active pricing version ${pricing.version}.`,
          code: "NO_PRICING_RULE",
          stage: "pricing_rules.validation",
        },
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
        {
          error: `Booking could not be saved: ${error.message}`,
          code: error.code || "BOOKING_INSERT_FAILED",
          stage: "bookings.insert",
          details: error.details || null,
          hint: error.hint || null,
        },
        { status: 400 }
      );
    }

    // Notifications are deliberately best-effort. A mail-provider outage or
    // missing mail configuration must never turn a successfully saved booking
    // into a customer-facing booking failure.
    await notifyAdminOfBooking({
      booking: { ...booking, passengerCount: Number(passengerCount), luggageCount: Number(luggageCount), paymentMethod },
      category,
      savedBooking: data,
    });

    return NextResponse.json({ booking: data, duplicate: false });
  } catch (error) {
    console.error("VOYNU booking create error", error);
    return NextResponse.json(
      {
        error: error?.message || "Unable to create booking.",
        code: "BOOKING_CREATE_UNHANDLED_ERROR",
        stage: "bookings.create.unhandled",
      },
      { status: 500 }
    );
  }
}
