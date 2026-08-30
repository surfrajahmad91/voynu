import { NextResponse } from "next/server";
import { getRoadDistance } from "../_lib/roadDistance";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await getRoadDistance(body?.origin, body?.destination);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("VOYNU route-distance error:", error);
    const message = error?.message || "Unable to calculate the road distance right now.";
    const status = message.includes("coordinates") ? 400 : message.includes("No drivable") ? 422 : message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
