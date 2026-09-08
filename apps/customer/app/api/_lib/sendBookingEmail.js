const RESEND_API_URL = "https://api.resend.com/emails";

function env(name) {
  return process.env[name]?.trim() || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detail(label, value) {
  return `<tr><td style="padding:7px 0;color:#5b6b7c;font-size:12px;width:150px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;color:#1e3348;font-size:13px;font-weight:600">${escapeHtml(value || "—")}</td></tr>`;
}

function layout(title, intro, rows) {
  return `<!doctype html><html><body style="margin:0;background:#f7f9fc;font-family:Arial,sans-serif;color:#1e3348"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;border:1px solid #eef3f7;border-radius:16px;overflow:hidden"><div style="padding:22px 24px;background:#0a2337;color:#fff"><div style="font-size:22px;font-weight:800">VOYNU</div><div style="margin-top:4px;font-size:13px;opacity:.9">${escapeHtml(title)}</div></div><div style="padding:24px"><p style="margin:0 0 18px;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p><table style="width:100%;border-collapse:collapse">${rows}</table></div><div style="padding:16px 24px;border-top:1px solid #eef3f7;color:#8695a4;font-size:11px">This is an automated VOYNU notification.</div></div></div></body></html>`;
}

function bookingReference(id) {
  return id ? `VOY-${String(id).slice(0, 8).toUpperCase()}` : "VOY-UNKNOWN";
}

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : "—";
}

function formatStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "—";
}

function bookingDetails({ booking, category, savedBooking }) {
  const tripType = booking?.tripType === "roundtrip" ? "Round Trip" : "One Way";
  const details = [
    ["Booking reference", bookingReference(savedBooking?.id)],
    ["Booking status", formatStatus(savedBooking?.booking_status)],
    ["Payment status", formatStatus(savedBooking?.payment_status)],
    ["Trip type", tripType],
    ["Pickup", booking?.pickup?.name],
    ["Destination", booking?.drop?.name],
    ["Travel date", booking?.travelDate],
    ["Pickup time", booking?.pickupTime],
  ];

  if (tripType === "Round Trip") {
    details.push(["Return date", booking?.returnDate], ["Return time", booking?.returnTime]);
  }

  details.push(
    ["Vehicle", category?.name],
    ["Passengers", booking?.passengerCount],
    ["Luggage", booking?.luggageCount],
    ["Fare", formatMoney(savedBooking?.fare)],
    ["Payment method", booking?.paymentMethod === "upi" ? "UPI" : "Pay on Pickup"]
  );

  return details;
}

export async function sendBookingEmail({ to, subject, title, intro, details }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  const recipient = String(to || "").trim();

  if (!apiKey || !from || !recipient) {
    return {
      sent: false,
      skipped: true,
      reason: !apiKey ? "RESEND_API_KEY_MISSING" : !from ? "RESEND_FROM_EMAIL_MISSING" : "RECIPIENT_MISSING",
    };
  }

  const rows = details.map(([label, value]) => detail(label, value)).join("");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        html: layout(title, intro, rows),
      }),
      signal: controller.signal,
    });

    const body = await response.text().catch(() => "");
    let result = {};
    try {
      result = body ? JSON.parse(body) : {};
    } catch {
      result = {};
    }

    if (!response.ok) {
      console.error("VOYNU: Resend booking email failed", {
        status: response.status,
        recipient,
        error: result?.message || body.slice(0, 300),
      });
      return { sent: false, skipped: false, reason: "RESEND_REQUEST_FAILED", status: response.status };
    }

    return { sent: true, skipped: false, id: result?.id || null };
  } catch (error) {
    console.error("VOYNU: Resend booking email error", error);
    return { sent: false, skipped: false, reason: error?.name === "AbortError" ? "RESEND_TIMEOUT" : "RESEND_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTripCompletionReceipt({ userEmail, booking }) {
  if (!userEmail) return { sent: false, skipped: true, reason: "CUSTOMER_EMAIL_MISSING" };
  const reference = bookingReference(booking?.id);
  const details = [
    ["Booking reference", reference],
    ["Trip type", booking?.trip_type === "roundtrip" ? "Round Trip" : "One Way"],
    ["Pickup", booking?.pickup_name],
    ["Destination", booking?.drop_name],
    ["Travel date", booking?.travel_date],
    ["Pickup time", booking?.pickup_time],
    ["Vehicle", booking?.vehicle_type],
    ["Distance", booking?.one_way_distance_km ? `${Number(booking.one_way_distance_km).toFixed(1)} km` : "—"],
    ["Fare paid", formatMoney(booking?.fare)],
    ["Payment method", booking?.payment_method === "upi" ? "UPI" : "Cash on pickup"],
  ];
  return sendBookingEmail({
    to: userEmail,
    subject: `Your VOYNU trip receipt — ${reference}`,
    title: "Trip completed",
    intro: `Thanks for riding with VOYNU! Here's the receipt for your completed trip ${reference}.`,
    details,
  });
}

export async function sendBookingNotifications({ userEmail, booking, category, savedBooking }) {
  const reference = bookingReference(savedBooking?.id);
  const details = bookingDetails({ booking, category, savedBooking });
  const adminEmail = env("ADMIN_NOTIFICATION_EMAIL");
  const results = { admin: null, customer: null };

  results.admin = adminEmail
    ? await sendBookingEmail({
        to: adminEmail,
        subject: `New VOYNU booking — ${reference}`,
        title: "New booking received",
        intro: `A new booking ${reference} has been saved in VOYNU and is ready for review.`,
        details: [
          ...details,
          ["Passenger name", booking?.passengerName],
          ["Phone", booking?.phone],
          ["WhatsApp", booking?.whatsapp],
        ],
      })
    : { sent: false, skipped: true, reason: "ADMIN_NOTIFICATION_EMAIL_MISSING" };

  results.customer = userEmail
    ? await sendBookingEmail({
        to: userEmail,
        subject: `VOYNU booking received — ${reference}`,
        title: "Booking received",
        intro: `Thank you for booking with VOYNU. Your booking ${reference} has been received successfully.`,
        details,
      })
    : { sent: false, skipped: true, reason: "CUSTOMER_EMAIL_MISSING" };

  return results;
}
