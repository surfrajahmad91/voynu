"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const BOOKING_STATUSES = ["request", "payment_pending", "confirmed", "pickup_due", "handed_over", "active", "return_due", "returned", "inspection", "payout_pending", "completed", "cancelled", "no_show", "damage_dispute", "admin_hold"];
const LISTING_STATUSES = ["draft", "pending_review", "approved", "rejected", "suspended", "unavailable"];
const OWNER_STATUSES = ["pending", "approved", "rejected", "suspended"];
const PAYOUT_STATUSES = ["pending", "approved", "paid", "held", "failed"];
const TABS = [["listings", "Vehicles"], ["owners", "Owners"], ["bookings", "Bookings"], ["payouts", "Payouts"], ["settings", "Settings"]];

const TONES = { warn: [c.warningBg, "#8A5700"], info: [c.primaryTint, c.primaryDark], live: [c.successBg, "#0B7A43"], bad: [c.errorBg, "#B42318"], muted: ["#EEF3F7", c.textMuted] };
const GOOD = ["approved", "active", "handed_over", "returned", "completed", "paid"];
const BAD = ["rejected", "suspended", "cancelled", "failed", "no_show", "damage_dispute", "admin_hold"];
const WARN = ["pending", "pending_review", "payment_pending", "pickup_due", "return_due", "inspection", "payout_pending", "held"];
function toneFor(status) {
  if (GOOD.includes(status)) return "live";
  if (BAD.includes(status)) return "bad";
  if (WARN.includes(status)) return "warn";
  return "muted";
}

const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const btn = { border: 0, borderRadius: 10, padding: "0 14px", minHeight: 40, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", font: "inherit" };
const field = { minHeight: 40, padding: "0 10px", border: `1px solid ${c.borderStrong}`, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const shortId = (id) => (id ? id.slice(0, 8).toUpperCase() : "—");
const formatDate = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

function StatusSelect({ value, options, onChange }) {
  const [bg, fg] = TONES[toneFor(value)];
  return <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, minHeight: 36, padding: "0 8px 0 10px", fontWeight: 700, background: bg, color: fg, border: "none" }}>
    {options.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
  </select>;
}
function Chip({ tone = "muted", children }) {
  const [bg, fg] = TONES[tone];
  return <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>;
}

export default function RentalAdmin() {
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]), [owners, setOwners] = useState([]), [bookings, setBookings] = useState([]), [payouts, setPayouts] = useState([]);
  const [settings, setSettings] = useState({ platform_fee_percent: 15 });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    const [l, o, b, p, s] = await Promise.all([
      supabase.from("rental_vehicle_listings").select("*,rental_owner_profiles(full_name,phone,kyc_status),rental_vehicle_documents(id,document_type,expires_at,verification_status,storage_path)").order("created_at", { ascending: false }),
      supabase.from("rental_owner_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("rental_bookings").select("*,rental_vehicle_listings(make,model,vehicle_type,city)").order("created_at", { ascending: false }).limit(100),
      supabase.from("rental_payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("rental_settings").select("platform_fee_percent").eq("id", true).maybeSingle(),
    ]);
    const firstError = l.error || o.error || b.error || p.error || s.error;
    if (firstError) setError(firstError.message);
    setListings(l.data || []); setOwners(o.data || []); setBookings(b.data || []); setPayouts(p.data || []);
    if (s.data) setSettings(s.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(t); }, [notice]);

  const update = async (table, id, patch, okMessage) => {
    const { error: e } = await supabase.from(table).update(patch).eq("id", id);
    if (e) return setError(e.message);
    setNotice(okMessage || "Updated.");
    load();
  };
  const saveFee = async () => {
    const { error: e } = await supabase.from("rental_settings").update({ platform_fee_percent: Math.max(0, Number(settings.platform_fee_percent) || 0), updated_at: new Date().toISOString() }).eq("id", true);
    if (e) return setError(e.message);
    setNotice("Platform fee saved.");
    load();
  };

  const counts = { listings: listings.filter((l) => l.status === "pending_review").length, owners: owners.filter((o) => o.kyc_status === "pending").length, payouts: payouts.filter((p) => p.status === "pending" || p.status === "approved").length };

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ borderRadius: 18, padding: 18, marginBottom: 14, background: theme.gradients.primary, color: "#fff", boxShadow: theme.shadow.card }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.2, opacity: 0.9 }}>VOYNU RENTALS</div>
        <h1 style={{ margin: "4px 0 2px", fontSize: 24 }}>Marketplace operations</h1>
        <p style={{ margin: 0, fontSize: 12.5, opacity: 0.9 }}>Owner onboarding · compliance · vehicles · bookings · payouts</p>
      </div>

      <div className="vb-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }}>
        {TABS.map(([key, label]) => { const badge = counts[key]; const on = tab === key;
          return <button key={key} onClick={() => setTab(key)} aria-pressed={on} style={{ flex: "none", minHeight: 40, padding: "0 16px", borderRadius: 999, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? c.primary : c.borderStrong}`, background: on ? c.primary : c.surface, color: on ? "#fff" : c.text, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {label}{!!badge && <span style={{ fontSize: 10.5, fontWeight: 900, background: on ? "rgba(255,255,255,.25)" : c.warningBg, color: on ? "#fff" : "#8A5700", borderRadius: 999, padding: "1px 7px" }}>{badge}</span>}
          </button>; })}
      </div>

      {loading ? <div style={{ ...card, color: c.textFaint }}>Loading…</div> : <>

        {tab === "listings" && <div style={{ display: "grid", gap: 10 }}>
          {listings.length === 0 && <div style={{ ...card, color: c.textFaint }}>No owner vehicle submissions.</div>}
          {listings.map((l) => <div key={l.id} style={{ ...card, borderLeft: `4px solid ${TONES[toneFor(l.status)][1]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <strong style={{ fontSize: 14.5 }}>{l.make || "Vehicle"} {l.model || ""}</strong>
                <div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>{l.vehicle_type} · {l.city} · {l.registration_number || "No registration"} · Owner {l.rental_owner_profiles?.full_name || shortId(l.owner_id)}</div>
              </div>
              <StatusSelect value={l.status} options={LISTING_STATUSES} onChange={(v) => update("rental_vehicle_listings", l.id, { status: v, approved_at: v === "approved" ? new Date().toISOString() : l.approved_at }, `Listing set to ${v.replace(/_/g, " ")}.`)} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: c.textMuted }}>{money(l.daily_rate)}/day · deposit {money(l.security_deposit)} · {l.included_km_per_day} km/day · owner KYC <Chip tone={toneFor(l.rental_owner_profiles?.kyc_status || "pending")}>{l.rental_owner_profiles?.kyc_status || "pending"}</Chip></div>
            {(l.rental_vehicle_documents || []).length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${c.border}` }}>
              {l.rental_vehicle_documents.map((d) => <div key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, border: `1px solid ${c.border}`, borderRadius: 999, padding: "4px 6px 4px 10px" }}>
                <span>{d.document_type}</span><Chip tone={toneFor(d.verification_status)}>{d.verification_status}</Chip>{d.expires_at && <span style={{ color: c.textFaint }}>exp {d.expires_at}</span>}
                <button onClick={() => update("rental_vehicle_documents", d.id, { verification_status: "approved", verified_at: new Date().toISOString() }, "Document approved.")} aria-label="Approve document" style={{ width: 22, height: 22, borderRadius: 999, border: 0, background: c.successBg, color: "#0B7A43", fontWeight: 900, cursor: "pointer" }}>✓</button>
                <button onClick={() => update("rental_vehicle_documents", d.id, { verification_status: "rejected" }, "Document rejected.")} aria-label="Reject document" style={{ width: 22, height: 22, borderRadius: 999, border: 0, background: c.errorBg, color: "#B42318", fontWeight: 900, cursor: "pointer" }}>×</button>
              </div>)}
            </div>}
          </div>)}
        </div>}

        {tab === "owners" && <div style={{ display: "grid", gap: 10 }}>
          {owners.length === 0 && <div style={{ ...card, color: c.textFaint }}>No owners yet.</div>}
          {owners.map((o) => <div key={o.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", borderLeft: `4px solid ${TONES[toneFor(o.kyc_status)][1]}` }}>
            <div><strong style={{ fontSize: 14 }}>{o.full_name || "Owner"}</strong><div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>{o.phone || "No phone"} · {o.city || "No city"}</div></div>
            <StatusSelect value={o.kyc_status} options={OWNER_STATUSES} onChange={(v) => update("rental_owner_profiles", o.id, { kyc_status: v, updated_at: new Date().toISOString() }, `Owner KYC set to ${v}.`)} />
          </div>)}
        </div>}

        {tab === "bookings" && <div style={{ display: "grid", gap: 10 }}>
          {bookings.length === 0 && <div style={{ ...card, color: c.textFaint }}>No rental bookings yet.</div>}
          {bookings.map((b) => <div key={b.id} style={{ ...card, borderLeft: `4px solid ${TONES[toneFor(b.status)][1]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <strong style={{ fontSize: 14.5 }}>{b.rental_vehicle_listings?.make || "Vehicle"} {b.rental_vehicle_listings?.model || ""}</strong>
                <div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>Customer {shortId(b.customer_id)} · {b.rental_vehicle_listings?.city} · {formatDate(b.starts_at)} → {formatDate(b.ends_at)}</div>
              </div>
              <StatusSelect value={b.status} options={BOOKING_STATUSES} onChange={(v) => update("rental_bookings", b.id, { status: v, updated_at: new Date().toISOString() }, `Booking set to ${v.replace(/_/g, " ")}.`)} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: c.textMuted }}>Total {money(b.total_amount)} · Deposit {money(b.security_deposit)} · Owner payout {money(b.owner_payout)}</div>
          </div>)}
        </div>}

        {tab === "payouts" && <div style={{ display: "grid", gap: 10 }}>
          {payouts.length === 0 && <div style={{ ...card, color: c.textFaint }}>No payouts yet.</div>}
          {payouts.map((p) => <div key={p.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", borderLeft: `4px solid ${TONES[toneFor(p.status)][1]}` }}>
            <div><strong style={{ fontSize: 15 }}>{money(p.net_amount)}</strong><div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>Owner {shortId(p.owner_id)} · booking {shortId(p.booking_id)}</div></div>
            <StatusSelect value={p.status} options={PAYOUT_STATUSES} onChange={(v) => update("rental_payouts", p.id, { status: v, paid_at: v === "paid" ? new Date().toISOString() : p.paid_at, updated_at: new Date().toISOString() }, `Payout set to ${v}.`)} />
          </div>)}
        </div>}

        {tab === "settings" && <div style={card}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Rental platform fee</h2>
          <p style={{ margin: "4px 0 12px", fontSize: 12.5, color: c.textFaint }}>This is locked into each booking's commercial snapshot at checkout — changing it only affects new bookings.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" min="0" max="100" step="0.5" value={settings.platform_fee_percent} onChange={(e) => setSettings({ ...settings, platform_fee_percent: e.target.value })} style={{ ...field, width: 100 }} />
            <span style={{ fontWeight: 700 }}>%</span>
            <button onClick={saveFee} style={btn}>Save</button>
          </div>
        </div>}
      </>}
    </div>

    {(error || notice) && <div role={error ? "alert" : "status"} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", margin: "0 auto", maxWidth: 520, zIndex: 130, padding: "12px 14px", borderRadius: 12, background: error ? "#B42318" : c.navy, color: "#fff", fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: theme.shadow.card }}>
      <span>{error || notice}</span>
      <button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>}
  </main>;
}
