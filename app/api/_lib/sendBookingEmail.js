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
  return `<tr><td style="padding:7px 0;color:#68746d;font-size:12px;width:150px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;color:#18231d;font-size:13px;font-weight:600">${escapeHtml(value || "—")}</td></tr>`;
}

function layout(title, intro, rows) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#18231d"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;border:1px solid #e0e7e2;border-radius:16px;overflow:hidden"><div style="padding:22px 24px;background:#08783f;color:#fff"><div style="font-size:22px;font-weight:800">VOYNU</div><div style="margin-top:4px;font-size:13px;opacity:.9">${escapeHtml(title)}</div></div><div style="padding:24px"><p style="margin:0 0 18px;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p><table style="width:100%;border-collapse:collapse">${rows}</table></div><div style="padding:16px 24px;border-top:1px solid #edf1ee;color:#7a847e;font-size:11px">This is an automated VOYNU notification.</div></div></div></body></html>`;
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

/**
 * Send a transactional email through Resend.
 * This function intentionally throws only for provider/request failures;
 * callers decide whether email failure should block their business operation.
 */
export async function sendBookingEmail({ to, subject, title, intro, details }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  const recipient = envValue(to);

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
      return {
        sent: false,
        skipped: false,
        reason: "RESEND_REQUEST_FAILED",
        status: response.status,
      };
    }

    return { sent: true, skipped: false, id: result?.id || null };
  } catch (error) {
    console.error("VOYNU: Resend booking email error", error);
    return {
      sent: false,
      skipped: false,
      reason: error?.name === "AbortError" ? "RESEND_TIMEOUT" : "RESEND_NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function envValue(value) {
  return String(value || "").trim();
}

export async function sendBookingNotifications({ userEmail, booking, category, savedBooking }) {
  const reference = bookingReference(savedBooking?.id);
  const details = bookingDetails({ booking, category, savedBooking });
  const adminEmail = env("ADMIN_NOTIFICATION_EMAIL") || "surfrajahmad@gmail.com";
  const results = { admin: null, customer: null };

  results.admin = await sendBookingEmail({
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
  });

  if (userEmail) {
    results.customer = await sendBookingEmail({
      to: userEmail,
      subject: `VOYNU booking received — ${reference}`,
      title: "Booking received",
      intro: `Thank you for booking with VOYNU. Your booking ${reference} has been received successfully.`,
      details,
    });
  } else {
    results.customer = { sent: false, skipped: true, reason: "CUSTOMER_EMAIL_MISSING" };
  }

  return results;
}
