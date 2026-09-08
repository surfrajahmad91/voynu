import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTripCompletionReceipt } from "../../_lib/sendBookingEmail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getBearerToken(request) { const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) return null; const token = authorization.slice(7).trim(); return token || null; }
function dbForUser(accessToken) { if (!supabaseUrl || !anonKey) throw new Error("Server database configuration is missing."); return createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } }); }
async function authenticatedUser(request) { const accessToken = getBearerToken(request); if (!accessToken || !anonKey || !supabaseUrl) return null; const userClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } }); const { data, error } = await userClient.auth.getUser(accessToken); if (error || !data?.user) return null; return { user: data.user, accessToken }; }

export async function POST(request) {
  try {
    const body = await request.json();
    const bookingId = body?.bookingId;
    if (!bookingId) return NextResponse.json({ error: "bookingId is required." }, { status: 400 });

    const auth = await authenticatedUser(request);
    if (!auth) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    const { user, accessToken } = auth;
    const client = dbForUser(accessToken);

    // RLS scopes this to the caller's own booking. The receipt_sent_at guard
    // (only update rows where it's still null) makes this safe to call more
    // than once without sending duplicate receipts.
    const { data: claimed, error: claimError } = await client
      .from("bookings")
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .eq("booking_status", "trip_completed")
      .is("receipt_sent_at", null)
      .select("*")
      .maybeSingle();

    if (claimError) return NextResponse.json({ error: "Could not prepare the receipt." }, { status: 500 });
    if (!claimed) return NextResponse.json({ sent: false, skipped: true, reason: "ALREADY_SENT_OR_NOT_ELIGIBLE" });

    const result = await sendTripCompletionReceipt({ userEmail: user.email, booking: claimed });
    return NextResponse.json(result);
  } catch (error) {
    console.error("VOYNU: trip receipt route error", error);
    return NextResponse.json({ error: "Unexpected error sending receipt." }, { status: 500 });
  }
}
