import { NextResponse } from "next/server";

const CUSTOMER_ROUTE_DISTANCE_URL =
  process.env.CUSTOMER_APP_URL
    ? `${process.env.CUSTOMER_APP_URL.replace(/\\/$/, "")}/api/route-distance`
    : "https://voynu.vercel.app/api/route-distance";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Saarthi must use the exact same ETA service as the customer tracking
    // page. The customer production endpoint owns the server-side Google
    // Routes configuration and traffic-aware routing.
    const response = await fetch(CUSTOMER_ROUTE_DISTANCE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: body?.origin,
        destination: body?.destination,
        purpose: "eta",
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error: any) {
    console.error("VOYNU Saarthi route-distance proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to calculate the traffic-aware ETA right now." },
      { status: 502 },
    );
  }
}
