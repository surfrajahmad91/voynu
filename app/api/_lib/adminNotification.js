const DEFAULT_ADMIN_EMAIL = "surfrajah@gmail.com";

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : "—";
}

function formatTripType(value) {
  return value === "roundtrip" ? "Round Trip" : "One Way";
}

function formatPaymentMethod(value) {
  return value === "upi" ? "UPI" : "Pay on Pickup";
}

function formatBookingStatus(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "—";
}

function bookingReference(id) {
  return id ? `VOY-${String(id).slice(0, 8).toUpperCase()}` : "VOY-UNKNOWN";
}

function buildText({ booking, category, savedBooking }) {
  const tripType = formatTripType(booking?.tripType);
  const paymentMethod = formatPaymentMethod(booking?.paymentMethod);
  const status = formatBookingStatus(savedBooking?.booking_status);
  const paymentStatus = formatBookingStatus(savedBooking?.payment_status);
  const reference = bookingReference(savedBooking?.id);
  const lines = [
    `New VOYNU booking — ${reference}`,
    "",
    `Status: ${status}`,
    `Payment status: ${paymentStatus}`,
    `Trip type: ${tripType}`,
    `Pickup: ${booking?.pickup?.name || "—"}`,
    `Destination: ${booking?.drop?.name || "—"}`,
    `Travel date: ${booking?.travelDate || "—"}`,
    `Pickup time: ${booking?.pickupTime || "—"}`,
  ];

  if (tripType === "Round Trip") {
    lines.push(`Return date: ${booking?.returnDate || "—"}`, `Return time: ${booking?.returnTime || "—"}`);
  }

  lines.push(
    "",
    `Vehicle: ${category?.name || "—"}`,
    `Passengers: ${booking?.passengerCount ?? "—"}`,
    `Luggage: ${booking?.luggageCount ?? "—"}`,
    `Fare: ${formatMoney(savedBooking?.fare)}`,
    `Payment method: ${paymentMethod}`,
    "",
    `Passenger: ${booking?.passengerName || "—"}`,
    `Phone: ${booking?.phone || "—"}`,
    `WhatsApp: ${booking?.whatsapp || "—"}`,
    "",
    "Open the VOYNU Admin Panel to review and manage this booking."
  );

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtml({ booking, category, savedBooking }) {
  const reference = bookingReference(savedBooking?.id);
  const tripType = formatTripType(booking?.tripType);
  const fields = [
    ["Status", formatBookingStatus(savedBooking?.booking_status)],
    ["Payment status", formatBookingStatus(savedBooking?.payment_status)],
    ["Trip type", tripType],
    ["Pickup", booking?.pickup?.name || "—"],
    ["Destination", booking?.drop?.name || "—"],
    ["Travel date", booking?.travelDate || "—"],
    ["Pickup time", booking?.pickupTime || "—"],
    ["Vehicle", category?.name || "—"],
    ["Passengers", booking?.passengerCount ?? "—"],
    ["Luggage", booking?.luggageCount ?? "—"],
    ["Fare", formatMoney(savedBooking?.fare)],
    ["Payment method", formatPaymentMethod(booking?.paymentMethod)],
    ["Passenger", booking?.passengerName || "—"],
    ["Phone", booking?.phone || "—"],
    ["WhatsApp", booking?.whatsapp || "—"],
  ];

  if (tripType === "Round Trip") {
    fields.splice(7, 0, ["Return date", booking?.returnDate || "—"], ["Return time", booking?.returnTime || "—"]);
  }

  const rows = fields
    .map(([label, value]) => `<tr><td style="padding:9px 0;color:#6a786f;font-size:13px;width:150px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;color:#18251e;font-size:13px;font-weight:600">${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f3f8f5;font-family:Arial,sans-serif;color:#18251e"><div style="max-width:640px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border:1px solid #dce7e0;border-radius:18px;padding:24px"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#08783f">VOYNU</div><h1 style="margin:8px 0 4px;font-size:24px">New booking received</h1><div style="color:#08783f;font-size:15px;font-weight:700">${escapeHtml(reference)}</div><table style="width:100%;border-collapse:collapse;margin-top:18px">${rows}</table><div style="margin-top:20px;padding:14px 16px;background:#edf8f1;border-radius:12px;color:#356049;font-size:13px;line-height:1.5">The booking is already saved in VOYNU. Open the Admin Panel to review, contact the passenger, assign a driver, or update the booking status.</div></div></div></body></html>`;
}

export async function notifyAdminOfBooking({ booking, category, savedBooking }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    console.warn("VOYNU: admin email notification skipped because RESEND_API_KEY is not configured.");
    return { sent: false, skipped: true, reason: "RESEND_API_KEY_MISSING" };
  }

  if (!from) {
    console.warn("VOYNU: admin email notification skipped because RESEND_FROM_EMAIL is not configured.");
    return { sent: false, skipped: true, reason: "RESEND_FROM_EMAIL_MISSING" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New VOYNU booking — ${bookingReference(savedBooking?.id)}`,
        text: buildText({ booking, category, savedBooking }),
        html: buildHtml({ booking, category, savedBooking }),
      }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("VOYNU: admin booking email failed", result);
      return { sent: false, skipped: false, reason: "RESEND_REQUEST_FAILED" };
    }

    return { sent: true, skipped: false, id: result?.id || null };
  } catch (error) {
    console.error("VOYNU: admin booking email error", error);
    return { sent: false, skipped: false, reason: error?.name === "AbortError" ? "RESEND_TIMEOUT" : "RESEND_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
