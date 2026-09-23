import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRoadDistance } from "../../_lib/roadDistance";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  return { user: data.user, token };
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

    const body = await request.json();
    const {
      planCode,
      vehicleCategoryId,
      pickup,
      drop,
      startDate,
      passengerCount,
      weekdays,
    } = body || {};

    if (!planCode || !vehicleCategoryId || !validPoint(pickup) || !validPoint(drop)) {
      return NextResponse.json({ error: "Valid subscription route and vehicle details are required." }, { status: 400 });
    }

    const roadDistance = await getRoadDistance(pickup, drop);
    const oneWayDistanceKm = Number(roadDistance.distanceKm);
    if (!Number.isFinite(oneWayDistanceKm) || oneWayDistanceKm <= 0) {
      return NextResponse.json({ error: "The authoritative road-distance service returned an invalid distance." }, { status: 502 });
    }

    const client = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    });

    const { data, error } = await client.rpc("quote_commute_subscription", {
      p_plan_code: planCode,
      p_vehicle_category_id: vehicleCategoryId,
      p_one_way_distance_km: oneWayDistanceKm,
      p_start_date: startDate,
      p_passenger_count: Number(passengerCount),
      p_weekdays: weekdays,
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Unable to calculate subscription price." }, { status: 400 });
    }

    return NextResponse.json({
      quote: data,
      authoritativeDistance: {
        distanceKm: oneWayDistanceKm,
        distanceText: roadDistance.distanceText,
        durationSeconds: roadDistance.durationSeconds,
        durationText: roadDistance.durationText,
        routingPreference: roadDistance.routingPreference || null,
      },
    });
  } catch (error) {
    console.error("VOYNU subscription quote error:", error);
    return NextResponse.json({ error: error?.message || "Unable to calculate subscription price right now." }, { status: 502 });
  }
}
