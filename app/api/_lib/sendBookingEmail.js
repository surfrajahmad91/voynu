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
  return `<tr><td style="padding:7px 0;color:#68746d;font-size:12px;width:150px">${escapeHtml(label)}</td><td style="padding:7px 0;color:#18231d;font-size:13px;font-weight:600">${escapeHtml(value || "—")}</td></tr>`;
}

function layout(title, intro, rows) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#18231d"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;border:1px solid #e0e7e2;border-radius:16px;overflow:hidden"><div style="padding:22px 24px;background:#08783f;color:#fff"><div style="font-size:22px;font-weight:800">VOYNU</div><div style="margin-top:4px;font-size:13px;opacity:.9">${escapeHtml(title)}</div></div><div style="padding:24px"><p style="margin:0 0 18px;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p><table style="width:100%;border-collapse:collapse">${rows}</table></div><div style="padding:16px 24px;border-top:1px solid #edf1ee;color:#7a847e;font-size:11px">This is an automated VOYNU notification. Please do not reply to this email.</div></div></div></body></html>`;
}

export async function sendBookingEmail({ to, subject, title, intro, details }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  if (!apiKey || !from || !to) return { sent: false, reason: "email_not_configured" };

  const rows = details.map(([label, value]) => detail(label, value)).join("");
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html: layout(title, intro, rows) }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return { sent: true };
}
