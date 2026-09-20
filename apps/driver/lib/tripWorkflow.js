// Saarthi ride workflow: labels, progress, reason options and server-error parsing.
// The database (advance_driver_booking_status) is the authority; this file only mirrors it for the UI.

export const NAVIGATION_STATUSES = ["on_the_way", "trip_started", "return_trip_started"];
export const ACTIVE_STATUSES = ["on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started"];

// accepted = the driver has accepted the assignment (driver_assignments.status === "accepted")
export function nextStepFor(booking, accepted) {
  const status = booking?.booking_status;
  const round = booking?.trip_type === "roundtrip";
  if (status === "driver_assigned") return accepted ? { next: "on_the_way", label: "Out for pickup" } : { action: "accept", label: "Accept trip" };
  if (status === "on_the_way") return { next: "arrived", label: "Arrived at pickup" };
  if (status === "arrived") return { next: "trip_started", label: round ? "Start outbound journey" : "Start journey" };
  if (status === "trip_started") return round ? { next: "waiting_for_return", label: "Reached destination" } : { next: "trip_completed", label: "Reached destination · Complete trip" };
  if (status === "waiting_for_return") return { next: "return_trip_started", label: "Start return journey" };
  if (status === "return_trip_started") return { next: "trip_completed", label: "Reached back · Complete trip" };
  return null;
}

export function progressSteps(booking, accepted) {
  const round = booking?.trip_type === "roundtrip";
  const steps = round
    ? [["accept", "Accepted"], ["on_the_way", "Out for pickup"], ["arrived", "At pickup"], ["trip_started", "Outbound"], ["waiting_for_return", "At destination"], ["return_trip_started", "Return"], ["trip_completed", "Done"]]
    : [["accept", "Accepted"], ["on_the_way", "Out for pickup"], ["arrived", "At pickup"], ["trip_started", "Journey"], ["trip_completed", "Done"]];
  const order = steps.map((s) => s[0]);
  let current = order.indexOf(booking?.booking_status);
  if (booking?.booking_status === "driver_assigned") current = accepted ? 0 : -1;
  return steps.map(([key, label], index) => ({ key, label, state: index < current || booking?.booking_status === "trip_completed" ? "done" : index === current ? "current" : "todo" }));
}

export function needsCollection(booking) {
  return booking?.payment_method === "cash" && booking?.payment_status === "due_on_pickup";
}

// "VOYNU_NEEDS_REASON|late,location|42|3200|destination"
export function parseWorkflowError(message) {
  const text = String(message || "");
  const at = text.indexOf("VOYNU_NEEDS_REASON|");
  if (at >= 0) {
    const [, flags = "", lateMin = "0", distM = "0", target = ""] = text.slice(at).split("|");
    return { kind: "needs_reason", late: flags.includes("late"), location: flags.includes("location"), lateMinutes: Number(lateMin) || 0, distanceM: Number(distM) || 0, target };
  }
  return { kind: "error", message: text.replace(/^VOYNU:\s*/, "").trim() || "Something went wrong. Please try again." };
}

export function formatDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return "—";
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function formatMinutes(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function distanceMeters(a, b) {
  const lat1 = Number(a?.lat), lon1 = Number(a?.lon), lat2 = Number(b?.lat), lon2 = Number(b?.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const LATE_REASONS = ["Heavy traffic", "Road closure or diversion", "Passenger was late", "Passenger asked to wait or stop", "Vehicle issue or charging stop", "Forgot to update earlier"];
export const LOCATION_REASONS = ["Passenger asked to be dropped elsewhere", "Meeting point is different", "GPS not accurate here", "Road blocked, stopped nearby", "Forgot to update earlier"];
