"use client";

import Link from "next/link";
import { theme } from "../../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };

const FIXED = [
  ["Trip type", "Every booking is either one-way or round trip — enforced by a database check constraint (calculate_booking_fare only accepts oneway or roundtrip)."],
  ["Fare rules", "Driven entirely by the active pricing version. There's no separate advance-booking window, surge, or minimum-notice rule today."],
  ["Cancellation", "Any admin can cancel any non-terminal booking with a reason, logged to the audit trail. There's no cancellation-window or fee policy."],
];
const NEEDED = [
  "A rules table (e.g. minimum notice, per-category advance-booking window, cancellation fee schedule) that the booking flow actually reads from.",
  "Booking-flow changes on both the customer app and the fare RPC to enforce whatever gets configured.",
  "A migration + RLS policy letting admins write those rules — none exists yet.",
];

export default function BookingRulesPage() {
  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Link href="/admin/configuration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.textFaint, textDecoration: "none", marginBottom: 10 }}>← Configuration</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3 }}>Booking rules</h1>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: c.textFaint, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 999, padding: "3px 10px" }}>Not available</span>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13.5, color: c.textFaint, lineHeight: 1.5 }}>There's no configurable booking-rules setting yet — the constraints below are fixed in application code, not a database table this page could expose an editor for.</p>

      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 800 }}>What's actually enforced today</h2>
        <div style={{ display: "grid", gap: 10 }}>{FIXED.map(([label, text]) => <div key={label}><strong style={{ fontSize: 13 }}>{label}</strong><p style={{ margin: "2px 0 0", fontSize: 12.5, color: c.textMuted, lineHeight: 1.5 }}>{text}</p></div>)}</div>
      </div>

      <div style={card}>
        <h2 style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 800 }}>What building this would take</h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "grid", gap: 8 }}>{NEEDED.map((t) => <li key={t} style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.5 }}>{t}</li>)}</ul>
      </div>
    </div>
  </main>;
}
