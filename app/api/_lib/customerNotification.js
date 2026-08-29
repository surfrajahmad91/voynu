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

function bookingReference(id) {
  return id ? `VOY-${String(id).slice(0, 8).toUpperCase()}` : "VOY-UNKNOWN";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCopy({ booking, category, savedBooking }) {
  const pendingPayment = savedBooking?.booking_status === "pending_payment";
  const reference = bookingReference(savedBooking?.id);
  return {
    reference,
    subject: pendingPayment ? `VOYNU booking received — ${reference}` : `VOYNU booking confirmed — ${reference}`,
    heading: pendingPayment ? "Booking received" : "Booking confirmed",
    message: pendingPayment
      ? "Your booking has been saved successfully. Your UPI payment is awaiting verification by the VOYNU team."
      : "Your booking has been confirmed successfully. Our team will contact you before your journey to confirm the pickup details.",
    tripType: formatTripType(booking?.tripType),
    paymentMethod: formatPaymentMethod(booking?.paymentMethod),
    categoryName: category?.name || "—",
  };
}

function buildText({ booking, category, savedBooking }) {
  const copy = buildCopy({ booking, category, savedBooking });
  const lines = [
    `VOYNU — ${copy.heading}`,
    `Booking reference: ${copy.reference}`,
    "",
    copy.message,
    "",
    `Trip type: ${copy.tripType}`,
    `Pickup: ${booking?.pickup?.name || "—"}`,
    `Destination: ${booking?.drop?.name || "—"}`,
    `Travel date: ${booking?.travelDate || "—"}`,
    `Pickup time: ${booking?.pickupTime || "—"}`,
  ];

  if (copy.tripType === "Round Trip") {
    lines.push(`Return date: ${booking?.returnDate || "—"}`, `Return time: ${booking?.returnTime || "—"}`);
  }

  lines.push(
    "",
    `Cab type: ${copy.categoryName}`,
    `Passengers: ${booking?.passengerCount ?? "—"}`,
    `Luggage: ${booking?.luggageCount ?? "—"}`,
    `Fare: ${formatMoney(savedBooking?.fare)}`,
    `Payment: ${copy.paymentMethod}`,
    "",
    "Your booking details are already with the VOYNU team. Please quote your booking reference if you need help or want to request a change."
  );

  return lines.join("\n");
}

function buildHtml({ booking, category, savedBooking }) {
  const copy = buildCopy({ booking, category, savedBooking });
  const fields = [
    ["Booking reference", copy.reference],
    ["Trip type", copy.tripType],
    ["Pickup", booking?.pickup?.name || "—"],
    ["Destination", booking?.drop?.name || "—"],
    ["Travel date", booking?.travelDate || "—"],
    ["Pickup time", booking?.pickupTime || "—"],
    ["Cab type", copy.categoryName],
    ["Passengers", booking?.passengerCount ?? "—"],
    ["Luggage", booking?.luggageCount ?? "—"],
    ["Fare", formatMoney(savedBooking?.fare)],
    ["Payment", copy.paymentMethod],
  ];

  if (copy.tripType === "Round Trip") {
    fields.splice(6, 0, ["Return date", booking?.returnDate || "—"], ["Return time", booking?.returnTime || "—"]);
  }

  const rows = fields.map(([label, value]) => `<tr><td style="padding:9px 0;color:#6a786f;font-size:13px;width:150px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;color:#18251e;font-size:13px;font-weight:600">${escapeHtml(value)}</td></tr>`).join("");

  return `<!doctype html><html><body style="margin:0;background:#f3f8f5;font-family:Arial,sans-serif;color:#18251e"><div style="max-width:640px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border:1px solid #dce7e0;border-radius:18px;padding:24px"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#08783f">VOYNU</div><h1 style="margin:8px 0 4px;font-size:24px">${escapeHtml(copy.heading)}</h1><div style="color:#08783f;font-size:15px;font-weight:700">${escapeHtml(copy.reference)}</div><p style="margin:18px 0;color:#506158;font-size:14px;line-height:1.55">${escapeHtml(copy.message)}</p><table style="width:100%;border-collapse:collapse">${rows}</table><div style="margin-top:20px;padding:14px 16px;background:#edf8f1;border-radius:12px;color:#356049;font-size:13px;line-height:1.5">Need help or a change? Contact the VOYNU team and quote your booking reference.</div></div></div></body></html>`;
}

export async function notifyCustomerOfBooking({ email, booking, category, savedBooking }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!email) return { sent: false, skipped: true, reason: "CUSTOMER_EMAIL_MISSING" };
  if (!apiKey) return { sent: false, skipped: true, reason: "RESEND_API_KEY_MISSING" };
  if (!from) return { sent: false, skipped: true, reason: "RESEND_FROM_EMAIL_MISSING" };

  const copy = buildCopy({ booking, category, savedBooking });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: copy.subject,
        text: buildText({ booking, category, savedBooking }),
        html: buildHtml({ booking, category, savedBooking }),
      }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("VOYNU: customer booking email failed", result);
      return { sent: false, skipped: false, reason: "RESEND_REQUEST_FAILED" };
    }

    return { sent: true, skipped: false, id: result?.id || null };
  } catch (error) {
    console.error("VOYNU: customer booking email error", error);
    return { sent: false, skipped: false, reason: error?.name === "AbortError" ? "RESEND_TIMEOUT" : "RESEND_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
