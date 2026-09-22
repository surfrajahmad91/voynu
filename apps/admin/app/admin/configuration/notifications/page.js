"use client";

import Link from "next/link";
import { theme } from "../../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };

const EXISTS = [
  ["Push infrastructure", "push_subscriptions and push_config tables already exist, and a database trigger queues a web push through a Supabase edge function whenever a notification row is created."],
  ["Per-user opt-in", "Customers, drivers and admins each manage their own subscription — there's no admin override today, by design (row-level security scopes it to auth.uid())."],
];
const NEEDED = [
  "An admin-safe read path — push_config holds the actual push signing keys and webhook secret, so this page deliberately does not query it.",
  "A notification-templates or broadcast table admins could actually target, which doesn't exist yet.",
  "A decision on what \"control\" should mean here — pausing a channel, resending, broadcasting — none of which the schema supports today.",
];

export default function NotificationsPage() {
  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Link href="/admin/configuration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.textFaint, textDecoration: "none", marginBottom: 10 }}>← Configuration</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3 }}>Notifications</h1>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: c.textFaint, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 999, padding: "3px 10px" }}>Not available</span>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13.5, color: c.textFaint, lineHeight: 1.5 }}>There's no admin-facing notification control yet. This isn't an oversight — the table that would need to back it (<code>push_config</code>) stores live signing secrets, so it's correctly locked out of every client, including this one.</p>

      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 800 }}>What already exists</h2>
        <div style={{ display: "grid", gap: 10 }}>{EXISTS.map(([label, text]) => <div key={label}><strong style={{ fontSize: 13 }}>{label}</strong><p style={{ margin: "2px 0 0", fontSize: 12.5, color: c.textMuted, lineHeight: 1.5 }}>{text}</p></div>)}</div>
      </div>

      <div style={card}>
        <h2 style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 800 }}>What building admin controls would take</h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "grid", gap: 8 }}>{NEEDED.map((t) => <li key={t} style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.5 }}>{t}</li>)}</ul>
      </div>
    </div>
  </main>;
}
