import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRoadDistance } from "../../_lib/roadDistance";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function bearer(request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

async function authenticatedUser(request) {
  const token = bearer(request);
  if (!token || !supabaseUrl || !anonKey) return null;
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user };
}

function validPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

export async function POST(request) {
  try {
    const auth = await authenticatedUser(request);
    if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!serviceRoleKey) {
      console.error("VOYNU subscription create: SUPABASE_SERVICE_ROLE_KEY is not configured.");
      return NextResponse.json({ error: "Subscription service is not configured. Please contact VOYNU." }, { status: 503 });
    }

    const body = await request.json();
    const {
      planCode,
      vehicleCategoryId,
      pickup,
      drop,
      passengerCount,
      morningPickupTime,
      eveningReturnTime,
      startDate,
      weekdays,
      passengers,
      walletRequestedAmount,
    } = body || {};

    if (!planCode || !vehicleCategoryId || !validPoint(pickup) || !validPoint(drop)) {
      return NextResponse.json({ error: "Valid subscription route and vehicle details are required." }, { status: 400 });
    }

    const roadDistance = await getRoadDistance(pickup, drop);
    const oneWayDistanceKm = Number(roadDistance.distanceKm);
    if (!Number.isFinite(oneWayDistanceKm) || oneWayDistanceKm <= 0) {
      return NextResponse.json({ error: "The authoritative road-distance service returned an invalid distance." }, { status: 502 });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await serviceClient.rpc("create_commute_subscription", {
      p_user_id: auth.user.id,
      p_plan_code: planCode,
      p_vehicle_category_id: vehicleCategoryId,
      p_pickup_name: pickup?.name,
      p_pickup_lat: Number(pickup?.lat),
      p_pickup_lon: Number(pickup?.lon),
      p_drop_name: drop?.name,
      p_drop_lat: Number(drop?.lat),
      p_drop_lon: Number(drop?.lon),
      p_one_way_distance_km: oneWayDistanceKm,
      p_passenger_count: Number(passengerCount),
      p_morning_pickup_time: morningPickupTime,
      p_evening_return_time: eveningReturnTime,
      p_start_date: startDate,
      p_weekdays: weekdays,
      p_passengers: passengers,
      p_wallet_requested_amount: Number(walletRequestedAmount || 0),
    });

    if (error) {
      console.error("VOYNU subscription create RPC error:", error);
      return NextResponse.json({ error: error.message || "Unable to submit subscription request." }, { status: 400 });
    }

    return NextResponse.json({
      subscription: data,
      authoritativeDistance: {
        distanceKm: oneWayDistanceKm,
        distanceText: roadDistance.distanceText,
        durationSeconds: roadDistance.durationSeconds,
        durationText: roadDistance.durationText,
        routingPreference: roadDistance.routingPreference || null,
      },
    });
  } catch (error) {
    console.error("VOYNU subscription create error:", error);
    return NextResponse.json({ error: error?.message || "Unable to create subscription right now." }, { status: 500 });
  }
}
