import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function db() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Server database configuration is missing");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticatedUser(request) {
  if (!anonKey || !supabaseUrl) return null;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await userClient.auth.getUser(authorization.slice(7));
  return data?.user || null;
}

function validCoordinates(location) {
  const lat = Number(location?.lat); const lon = Number(location?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { booking, vehicleCategoryId, passengerCount, luggageCount, paymentMethod, idempotencyKey } = body || {};
    if (!booking || !vehicleCategoryId || !idempotencyKey) return NextResponse.json({ error: "Invalid booking request" }, { status: 400 });

    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "You must be logged in to complete a booking." }, { status: 401 });

    const client = db();
    const { data: existing } = await client.from("bookings").select("id, booking_status, fare, payment_status, user_id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) {
      if (existing.user_id !== user.id) return NextResponse.json({ error: "This booking request does not belong to the signed-in user." }, { status: 403 });
      return NextResponse.json({ booking: existing, duplicate: true });
    }

    const { data: category, error: categoryError } = await client.from("vehicle_categories").select("id, name, slug, active, bookable, passenger_capacity, luggage_capacity").eq("id", vehicleCategoryId).maybeSingle();
    if (categoryError || !category || !category.active || !category.bookable) return NextResponse.json({ error: "Selected vehicle category is unavailable" }, { status: 409 });
    if (Number(passengerCount) < 1 || Number(passengerCount) > Number(category.passenger_capacity) || Number(luggageCount) < 0 || Number(luggageCount) > Number(category.luggage_capacity)) return NextResponse.json({ error: "Selected vehicle cannot accommodate the booking" }, { status: 409 });
    if (!validCoordinates(booking.pickup) || !validCoordinates(booking.drop)) return NextResponse.json({ error: "Valid pickup and destination locations are required" }, { status: 400 });

    const { data: pricing, error: pricingError } = await client.from("pricing_versions").select("id").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (pricingError || !pricing) return NextResponse.json({ error: "Current pricing is unavailable" }, { status: 503 });
    const tripType = booking.tripType === "roundtrip" ? "roundtrip" : "oneway";
    const { data: rule, error: ruleError } = await client.from("pricing_rules").select("base_fare, per_km_rate, driver_allowance_per_day, minimum_fare, rounding_unit").eq("pricing_version_id", pricing.id).eq("vehicle_category_id", vehicleCategoryId).eq("trip_type", tripType).maybeSingle();
    if (ruleError || !rule) return NextResponse.json({ error: "Pricing rule is unavailable" }, { status: 503 });
    const oneWayKm = Number(booking?.journey?.oneWayDistanceKm);
    if (!Number.isFinite(oneWayKm) || oneWayKm < 0) return NextResponse.json({ error: "Invalid journey distance" }, { status: 400 });
    const billedKm = tripType === "roundtrip" ? oneWayKm * 2 : oneWayKm;
    const rawFare = Number(rule.base_fare) + billedKm * Number(rule.per_km_rate) + (tripType === "roundtrip" ? Number(rule.driver_allowance_per_day || 0) : 0);
    const minimum = Number(rule.minimum_fare || 0); const unit = Number(rule.rounding_unit) || 1; const fare = Math.round(Math.max(rawFare, minimum) / unit) * unit;
    const isUpi = paymentMethod === "upi";
    const row = { user_id: user.id, trip_type: tripType, pickup_name: booking.pickup?.name, pickup_lat: booking.pickup?.lat, pickup_lon: booking.pickup?.lon, drop_name: booking.drop?.name, drop_lat: booking.drop?.lat, drop_lon: booking.drop?.lon, one_way_distance_km: oneWayKm, total_distance_km: booking?.journey?.totalDistanceKm, travel_date: booking.travelDate, pickup_time: booking.pickupTime, return_date: booking.returnDate, return_time: booking.returnTime, passenger_name: booking.passengerName, phone: booking.phone, whatsapp: booking.whatsapp, vehicle_type: category.slug || category.name, vehicle_category_id: category.id, passenger_count: Number(passengerCount), luggage_count: Number(luggageCount), fare, payment_method: paymentMethod, payment_status: isUpi ? "pending" : "due_on_pickup", booking_status: isUpi ? "pending_payment" : "confirmed", pricing_version_id: pricing.id, quoted_fare: fare, idempotency_key: idempotencyKey, fare_breakdown: { baseFare: Number(rule.base_fare), distanceFare: billedKm * Number(rule.per_km_rate), driverAllowance: tripType === "roundtrip" ? Number(rule.driver_allowance_per_day || 0) : 0, billedDistanceKm: billedKm }, confirmed_at: isUpi ? null : new Date().toISOString() };
    const { data, error } = await client.from("bookings").insert(row).select("id, booking_status, payment_status, fare, quoted_fare, pricing_version_id, user_id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data, duplicate: false });
  } catch (error) { return NextResponse.json({ error: error.message || "Unable to create booking" }, { status: 500 }); }
}
