// Customer app API entrypoint.
// The booking implementation is shared with the main VOYNU app; re-export it
// here so the standalone voy­nu-customer Vercel project exposes /api/bookings/create.
export { POST } from "../../../../../../app/api/bookings/create/route.js";
