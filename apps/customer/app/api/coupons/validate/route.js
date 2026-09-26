import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

export async function POST(request) {
  try {
    const token = bearer(request);
    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    const amount = Number(body?.bookingAmount || 0);
    const tripType = body?.tripType === "roundtrip" ? "roundtrip" : "oneway";
    if (!token || !supabaseUrl || !anonKey) return NextResponse.json({ error: "You must be logged in to apply a coupon." }, { status: 401 });
    if (!code) return NextResponse.json({ error: "Enter a coupon code." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid booking amount." }, { status: 400 });
    const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: authError } = await client.auth.getUser(token);
    if (authError || !userData?.user) return NextResponse.json({ error: "Your login session has expired. Please sign in again." }, { status: 401 });
    const { data, error } = await client.rpc("validate_coupon", { p_code: code, p_booking_amount: amount, p_trip_type: tripType });
    if (error) return NextResponse.json({ error: "Coupon validation is temporarily unavailable. Please try again." }, { status: 503 });
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.valid) return NextResponse.json({ error: result?.message || "This coupon is invalid or unavailable for this booking." }, { status: 400 });
    return NextResponse.json({ valid: true, code: result.coupon_code, discountAmount: Number(result.discount_amount || 0), message: result.message });
  } catch (error) {
    console.error("VOYNU coupon validation error", error);
    return NextResponse.json({ error: "Unable to validate the coupon right now." }, { status: 500 });
  }
}
