"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const TZ = "Asia/Kolkata";
const PAGE_SIZE = 25;
const TERMINAL = ["trip_completed", "cancelled"];
const LIVE = ["on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started"];
// Only what the cards and actions actually read.
const COLUMNS = "id,booking_status,payment_status,payment_method,driver_id,vehicle_id,trip_type,passenger_name,phone,pickup_name,drop_name,travel_date,pickup_time,vehicle_type,fare,created_at,scheduled_pickup_at,trip_start_delay_reason,trip_completion_delay_reason,outbound_arrival_delay_reason,return_trip_start_delay_reason,cash_collection_status,cash_collected_amount,cash_collection_note,cancelled_by,cancellation_reason";

// [label, tone]
const STATUS = {
  pending_payment: ["Pending payment", "warn"],
  confirmed: ["Confirmed", "info"],
  driver_assigned: ["Driver assigned", "info"],
  on_the_way: ["On the way", "live"],
  arrived: ["Arrived", "live"],
  trip_started: ["Trip started", "live"],
  waiting_for_return: ["Waiting for return", "live"],
  return_trip_started: ["Return trip started", "live"],
  trip_completed: ["Completed", "done"],
  cancelled: ["Cancelled", "bad"],
};
const STATUS_CHIPS = ["pending_payment", "confirmed", "driver_assigned", "on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started", "trip_completed", "cancelled"];
const TONES = { warn: [c.warningBg, "#8A5700"], info: [c.primaryTint, c.primaryDark], live: [c.successBg, "#0B7A43"], done: ["#EEF3F7", c.textMuted], bad: [c.errorBg, "#B42318"], muted: ["#F3F6F9", c.textMuted] };
const ACCENT = { warn: c.warning, info: c.primary, live: c.success, done: c.borderStrong, bad: c.error, muted: c.borderStrong };

// Quick views behind the summary tiles. Each mirrors the definition inside admin_dashboard_counts(),
// so tapping a tile lists exactly the rows that were counted.
const VIEWS = {
  payment: (q) => q.eq("payment_status", "pending").neq("booking_status", "cancelled"),
  awaiting: (q) => q.eq("booking_status", "confirmed").is("driver_id", null),
  live: (q) => q.in("booking_status", LIVE),
  cash: (q) => q.eq("payment_method", "cash").eq("booking_status", "trip_completed").in("cash_collection_status", ["partial", "not_collected", "unreported"]),
};
const VIEW_LABEL = { all: "All bookings", payment: "Payment pending", awaiting: "Needs a driver", live: "Live trips", cash: "Cash follow-up" };
const filterLabel = (f) => VIEW_LABEL[f] || STATUS[f]?.[0] || statusText(f);
const applyFilter = (q, f) => (f === "all" ? q : VIEWS[f] ? VIEWS[f](q) : q.eq("booking_status", f));

/* ---------- formatting ---------- */
const shortId = (id) => (id ? id.slice(0, 8).toUpperCase() : "");
function statusText(v) { return String(v || "").replace(/_/g, " "); }
const cap = (v) => { const s = statusText(v); return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"; };
const shortLocation = (v) => (v ? v.split(",")[0].trim() || v : "—");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const vehicleLabel = (v) => (!v ? "" : v.length <= 3 ? v.toUpperCase() : v.charAt(0).toUpperCase() + v.slice(1));
const fmtWhen = (d) => (d && !isNaN(d) ? d.toLocaleString("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "");
const formatDate = (v) => (v ? fmtWhen(new Date(v)) : "—");
const dayKey = (v) => new Date(v).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (v) => {
  const k = dayKey(v);
  if (k === dayKey(Date.now())) return "Today";
  if (k === dayKey(Date.now() - 864e5)) return "Yesterday";
  return new Date(v).toLocaleDateString("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
};
const pickupAt = (b) => {
  if (b.scheduled_pickup_at) return new Date(b.scheduled_pickup_at);
  if (b.travel_date && /^\d{1,2}:\d{2}/.test(b.pickup_time || "")) return new Date(`${b.travel_date}T${b.pickup_time.slice(0, 5).padStart(5, "0")}:00+05:30`);
  return null;
};
const normalizeWhatsApp = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };
const paymentLabel = (b) => (b.payment_method === "upi" ? "UPI" : b.payment_method === "cash" ? "Cash at end of journey" : b.payment_method === "subscription" ? "Commute subscription" : b.payment_method || "—");
const paymentShort = (b) => (b.payment_method === "cash" ? "Cash" : b.payment_method === "subscription" ? "Subscription" : paymentLabel(b));
const looksLikeReference = (q) => /^(voy-?)?[0-9a-f-]{4,}$/i.test(q.trim());

/* ---------- shared styles ---------- */
const CSS = ".vb-scroll{scrollbar-width:none;-webkit-overflow-scrolling:touch}.vb-scroll::-webkit-scrollbar{display:none}@keyframes vb-pulse{0%,100%{opacity:1}50%{opacity:.45}}.vb-pulse{animation:vb-pulse 1.3s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.vb-pulse{animation:none}}";
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 14 };
const btn = { border: 0, borderRadius: 10, padding: "0 14px", minHeight: 40, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const ghost = { ...btn, background: c.surface, color: c.text, border: `1px solid ${c.borderStrong}` };
const field = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 12px", border: `1px solid ${c.borderStrong}`, borderRadius: 12, background: c.surface, color: c.text, font: "inherit", fontSize: 15 };

function Chip({ tone = "muted", children }) {
  const [bg, fg] = TONES[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, background: bg, color: fg, fontSize: 11.5, fontWeight: 800, lineHeight: 1.4, whiteSpace: "nowrap" }}>{children}</span>;
}
function Note({ tone, children }) {
  const [bg, fg] = TONES[tone];
  return <div style={{ padding: "8px 11px", borderRadius: 10, background: bg, color: fg, fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>{children}</div>;
}
function Row({ label, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr)", gap: 8, fontSize: 13 }}><span style={{ color: c.textFaint, fontWeight: 600 }}>{label}</span><span style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{children}</span></div>;
}

/* ---------- one booking ---------- */
const BookingCard = memo(function BookingCard({ b, driver, assignable, onConfirm, onAssign, onCancel, onError }) {
  const terminal = TERMINAL.includes(b.booking_status);
  const [open, setOpen] = useState(!terminal); // finished trips start collapsed
  const [panel, setPanel] = useState(null); // "assign" | "cancel"
  const [driverId, setDriverId] = useState("");
  const [reason, setReason] = useState("");
  const [events, setEvents] = useState(null); // null | "loading" | rows
  const [working, setWorking] = useState(false);

  const [statusLabel, tone] = STATUS[b.booking_status] || [cap(b.booking_status), "muted"];
  const needsPayment = b.payment_method === "upi" && b.payment_status === "pending" && b.booking_status !== "cancelled";
  const needsAssignment = b.booking_status === "confirmed" && !b.driver_id;
  const cashDone = b.payment_method === "cash" && b.booking_status === "trip_completed";
  const cs = b.cash_collection_status;
  const delays = [["Late start", b.trip_start_delay_reason], ["Late reaching destination", b.outbound_arrival_delay_reason], ["Late return start", b.return_trip_start_delay_reason], ["Late completion", b.trip_completion_delay_reason]].filter(([, r]) => r);

  const run = async (fn) => { setWorking(true); try { return await fn(); } finally { setWorking(false); } };

  const doAssign = async () => {
    const d = assignable.find((x) => x.id === driverId);
    if (!d?.vehicle_id) return onError("Select a driver with an assigned active vehicle.");
    if (await run(() => onAssign(b, d))) { setPanel(null); setDriverId(""); }
  };
  const doCancel = async () => {
    if (reason.trim().length < 4) return onError("Please give a cancellation reason (at least a few words).");
    if (await run(() => onCancel(b, reason.trim()))) { setPanel(null); setReason(""); }
  };
  const toggleTimeline = async () => {
    if (events) return setEvents(null);
    setEvents("loading");
    const { data, error } = await supabase.from("booking_status_events").select("id,from_status,to_status,occurred_at,target,distance_to_target_m,scheduled_at,delay_minutes,flags,reason,cash_status,cash_amount").eq("booking_id", b.id).order("occurred_at");
    if (error) { setEvents(null); return onError(error.message); }
    setEvents(data || []);
  };
  const whatsapp = () => {
    const phone = normalizeWhatsApp(b.phone);
    if (!phone) return onError("No valid WhatsApp number on this booking.");
    const headline = b.booking_status === "cancelled" ? "has been cancelled" : b.booking_status === "trip_completed" ? "is completed" : b.booking_status === "pending_payment" ? "is awaiting payment confirmation" : "is confirmed";
    const lines = [`Hello ${b.passenger_name || ""}`.trim(), "", `Your VOYNU booking VOY-${shortId(b.id)} ${headline}.`, `Trip: ${b.trip_type === "roundtrip" ? "Round Trip" : "One Way"}`, `Pickup: ${b.pickup_name || "—"}`, `Destination: ${b.drop_name || "—"}`, `Travel: ${b.travel_date || "—"} ${b.pickup_time || ""}`.trim(), `Vehicle: ${b.vehicle_type || "—"}`, `Fare: ${money(b.fare)}`, `Payment: ${paymentLabel(b)}`];
    if (driver) lines.push(`Driver: ${driver.full_name}${driver.phone ? ` (${driver.phone})` : ""}`);
    lines.push("", "Thank you for choosing VOYNU.");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  };

  const meta = [fmtWhen(pickupAt(b)), vehicleLabel(b.vehicle_type), b.trip_type === "roundtrip" ? "Round trip" : "One way"].filter(Boolean).join(" · ");

  return <article style={{ ...card, borderLeft: `4px solid ${ACCENT[tone]}`, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <Chip tone={tone}>{statusLabel}</Chip>
      <span style={{ fontSize: 12, color: c.textFaint, fontWeight: 700 }}>#{shortId(b.id)}</span>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, minWidth: 0, overflowWrap: "anywhere" }}>{shortLocation(b.pickup_name)} <span style={{ color: c.textFaint }}>→</span> {shortLocation(b.drop_name)}</div>
      <div style={{ fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{money(b.fare)}</div>
    </div>
    <div style={{ marginTop: 4, fontSize: 13, color: c.textMuted, fontWeight: 600 }}>{meta || "Pickup time not set"}</div>
    <div style={{ marginTop: 2, fontSize: 13, color: c.textFaint, fontWeight: 600 }}>{b.passenger_name || "Passenger"}{b.phone ? ` · ${b.phone}` : ""}</div>

    {(b.booking_status === "cancelled" || cashDone || delays.length > 0) && <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      {b.booking_status === "cancelled" && (b.cancellation_reason || b.cancelled_by) && <Note tone="bad">Cancelled by {b.cancelled_by || "—"}{b.cancellation_reason ? `: ${b.cancellation_reason}` : ""}</Note>}
      {cashDone && <Note tone={cs === "collected" ? "live" : cs ? "bad" : "muted"}>Cash: {cs === "collected" ? `collected ${money(b.cash_collected_amount ?? b.fare)}` : cs === "partial" ? `part payment ${money(b.cash_collected_amount)} of ${money(b.fare)} — ${b.cash_collection_note || "no note"}` : cs === "not_collected" ? `not collected — ${b.cash_collection_note || "no note"}` : cs === "unreported" ? "driver did not report the outcome" : "not recorded (completed before cash tracking)"}</Note>}
      {delays.map(([label, r]) => <Note key={label} tone="warn">{label}: {r}</Note>)}
    </div>}

    {open && <div style={{ display: "grid", gap: 7, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${c.borderStrong}` }}>
      <Row label="Payment">{paymentShort(b)} · <span style={{ color: needsPayment ? "#8A5700" : "inherit" }}>{cap(b.payment_status)}</span></Row>
      <Row label="Driver">{driver ? `${driver.full_name} · ${driver.vehicles?.registration_number || "—"}` : <span style={{ color: needsAssignment ? "#8A5700" : c.textFaint }}>Not assigned</span>}</Row>
      <Row label="Booked">{formatDate(b.created_at)}</Row>
      {!terminal && panel !== "cancel" && <button onClick={() => { setPanel("cancel"); setReason(""); }} style={{ ...btn, background: "transparent", color: "#B42318", justifyContent: "flex-start", padding: 0, minHeight: 32 }}>Cancel booking</button>}
    </div>}

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
      {needsPayment && <button disabled={working} onClick={() => run(() => onConfirm(b))} style={{ ...btn, flex: "1 1 100%", opacity: working ? 0.6 : 1 }}>{working ? "Confirming…" : "Confirm payment received"}</button>}
      {needsAssignment && panel !== "assign" && <button onClick={() => { setPanel("assign"); setDriverId(""); }} style={{ ...btn, flex: "1 1 100%" }}>Assign driver</button>}
      {b.phone && <a href={`tel:${b.phone}`} style={{ ...ghost, textDecoration: "none", flex: "1 1 auto" }}>Call</a>}
      {b.phone && <button onClick={whatsapp} style={{ ...ghost, flex: "1 1 auto", background: c.successBg, color: "#0B7A43", borderColor: "#25D366" }}>WhatsApp</button>}
      <button onClick={toggleTimeline} style={{ ...ghost, flex: "1 1 auto" }}>{events ? "Hide timeline" : "Timeline"}</button>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ ...ghost, flex: "1 1 auto" }}>{open ? "Less" : "Details"}</button>
    </div>

    {panel === "cancel" && <div style={{ marginTop: 12, padding: 12, background: c.errorBg, borderRadius: 12, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#B42318" }}>Cancel this booking — the reason is saved in the audit log</div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked to cancel" style={field} autoFocus />
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={working} onClick={doCancel} style={{ ...btn, background: "#B42318", flex: 1 }}>{working ? "Cancelling…" : "Confirm cancel"}</button>
        <button onClick={() => setPanel(null)} style={{ ...ghost, flex: 1 }}>Keep booking</button>
      </div>
    </div>}

    {panel === "assign" && <div style={{ marginTop: 12, padding: 12, background: c.bg, borderRadius: 12, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>Assign an available driver with an active vehicle</div>
      {assignable.length === 0 ? <div style={{ color: "#8A5700", fontSize: 13 }}>No available driver currently has an assigned active vehicle. Add or assign a vehicle in Drivers.</div> : <>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={field}><option value="">Select driver…</option>{assignable.map((x) => <option key={x.id} value={x.id}>{x.full_name} · {x.vehicles?.registration_number || "—"}</option>)}</select>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={working || !driverId} onClick={doAssign} style={{ ...btn, flex: 1, opacity: working || !driverId ? 0.6 : 1 }}>{working ? "Assigning…" : "Assign"}</button>
          <button onClick={() => setPanel(null)} style={{ ...ghost, flex: 1 }}>Close</button>
        </div>
      </>}
    </div>}

    {events && <div style={{ marginTop: 12, padding: 12, background: c.bg, borderRadius: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Driver timeline</div>
      {events === "loading" ? <div style={{ fontSize: 13, color: c.textFaint }}>Loading…</div> : events.length === 0 ? <div style={{ fontSize: 13, color: c.textFaint }}>No driver steps recorded for this booking.</div> : <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>{events.map((ev, i) => <li key={ev.id} style={{ position: "relative", paddingLeft: 20, paddingBottom: i === events.length - 1 ? 0 : 12, fontSize: 12.5, lineHeight: 1.5 }}>
        <span style={{ position: "absolute", left: 0, top: 6, width: 9, height: 9, borderRadius: 99, background: c.primary }} />
        {i < events.length - 1 && <span style={{ position: "absolute", left: 4, top: 17, bottom: -4, width: 1, background: c.borderStrong }} />}
        <div><strong>{formatDate(ev.occurred_at)}</strong></div>
        <div>{ev.from_status ? `${cap(ev.from_status)} → ` : ""}<strong>{cap(ev.to_status)}</strong>{ev.delay_minutes ? <span style={{ color: "#8A5700" }}> · {ev.delay_minutes} min late</span> : null}</div>
        {ev.distance_to_target_m != null && <div style={{ color: c.textFaint }}>{ev.distance_to_target_m} m from {ev.target}</div>}
        {ev.flags?.length > 0 && <div style={{ color: "#8A5700" }}>Flags: {ev.flags.join(", ").replace(/_/g, " ")}</div>}
        {ev.reason && <div>Reason: {ev.reason}</div>}
        {ev.cash_status && <div>Cash: {statusText(ev.cash_status)}{ev.cash_amount != null ? ` · ${money(ev.cash_amount)}` : ""}</div>}
      </li>)}</ol>}
    </div>}
  </article>;
});

/* ---------- page ---------- */
export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]), [drivers, setDrivers] = useState([]), [counts, setCounts] = useState(null);
  const [filter, setFilter] = useState("all"), [search, setSearch] = useState(""), [term, setTerm] = useState(""), [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [hasMore, setHasMore] = useState(false), [busyMore, setBusyMore] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { setSearch(q); setTerm(q.trim()); }
    setReady(true);
  }, []);
  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(t); }, [notice]);

  const fetchPage = async (f, t, offset) => {
    let query = supabase.from("bookings").select(COLUMNS).order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    query = applyFilter(query, f);
    if (t) {
      if (looksLikeReference(t)) {
        const { data, error: e } = await supabase.rpc("admin_search", { p_query: t });
        if (e) return { error: e };
        const ids = (data?.bookings || []).map((b) => b.id);
        if (!ids.length) return { data: [] };
        query = query.in("id", ids);
      } else {
        const safe = t.replace(/[%,()*]/g, " ").trim();
        query = query.or(`passenger_name.ilike.%${safe}%,phone.ilike.%${safe}%,pickup_name.ilike.%${safe}%,drop_name.ilike.%${safe}%`);
      }
    }
    return query;
  };

  // The list reloads on filter/search changes only; drivers and counts are separate so typing doesn't refetch them.
  const loadList = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setLoadError("");
    const page = await fetchPage(filter, term, 0);
    if (mine !== seq.current) return;
    setLoading(false);
    if (page.error) { setLoadError(page.error.message); setBookings([]); setHasMore(false); return; }
    setBookings(page.data || []); setHasMore((page.data || []).length === PAGE_SIZE);
  }, [filter, term]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMeta = useCallback(async () => {
    const [driverRes, countRes] = await Promise.all([
      supabase.from("drivers").select("id,full_name,phone,active,availability_status,vehicle_id,vehicles(registration_number,active,status)").order("full_name"),
      supabase.rpc("admin_dashboard_counts"),
    ]);
    if (driverRes.error || countRes.error) setError((driverRes.error || countRes.error).message);
    if (driverRes.data) setDrivers(driverRes.data);
    if (countRes.data) setCounts(countRes.data);
  }, []);

  useEffect(() => { if (ready) loadList(); }, [ready, loadList]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const loadMore = async () => {
    const mine = seq.current;
    setBusyMore(true);
    const page = await fetchPage(filter, term, bookings.length);
    setBusyMore(false);
    if (mine !== seq.current) return;
    if (page.error) return setError(page.error.message);
    const rows = page.data || [];
    setBookings((prev) => { const seen = new Set(prev.map((x) => x.id)); return [...prev, ...rows.filter((x) => !seen.has(x.id))]; });
    setHasMore(rows.length === PAGE_SIZE);
  };

  const assignable = useMemo(() => drivers.filter((d) => d.active !== false && d.availability_status === "available" && d.vehicle_id && d.vehicles?.active !== false && d.vehicles?.status === "active"), [drivers]);
  const driverById = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

  // Actions patch the row in place (no full reload, no lost scroll position), then quietly re-sync that one row.
  const patch = useCallback((id, next) => setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, ...next } : x))), []);
  const syncRow = useCallback(async (id) => {
    const { data } = await supabase.from("bookings").select(COLUMNS).eq("id", id).maybeSingle();
    if (data) patch(id, data);
  }, [patch]);

  const confirmPayment = useCallback(async (b) => {
    const { data, error: e } = await supabase.rpc("admin_confirm_payment_and_dispatch", { p_booking_id: b.id });
    if (e) { setError(e.message); return false; }
    const updated = Array.isArray(data) ? data[0] : data;
    patch(b.id, updated || { payment_status: "paid" });
    setNotice(updated?.driver_id ? `Payment confirmed and driver assigned to #${shortId(b.id)}.` : `Payment confirmed for #${shortId(b.id)}.`);
    syncRow(b.id); loadMeta();
    return true;
  }, [patch, syncRow, loadMeta]);
  const assign = useCallback(async (b, d) => {
    const { data, error: e } = await supabase.rpc("assign_booking_driver", { p_booking_id: b.id, p_driver_id: d.id, p_vehicle_id: d.vehicle_id });
    if (e) { setError(e.message); return false; }
    patch(b.id, { ...(data || {}), driver_id: d.id, vehicle_id: d.vehicle_id, booking_status: data?.booking_status || "driver_assigned" });
    setNotice(`${d.full_name} assigned to #${shortId(b.id)}.`);
    syncRow(b.id); loadMeta();
    return true;
  }, [patch, syncRow, loadMeta]);
  const cancel = useCallback(async (b, reason) => {
    const { data, error: e } = await supabase.rpc("admin_cancel_booking", { p_booking_id: b.id, p_reason: reason });
    if (e) { setError(e.message.replace(/^VOYNU:\s*/, "")); return false; }
    patch(b.id, data || { booking_status: "cancelled", cancelled_by: "admin", cancellation_reason: reason });
    setNotice(`#${shortId(b.id)} cancelled.`);
    syncRow(b.id); loadMeta();
    return true;
  }, [patch, syncRow, loadMeta]);

  const groups = useMemo(() => {
    const out = [];
    for (const b of bookings) {
      const key = dayKey(b.created_at), last = out[out.length - 1];
      if (last && last.key === key) last.items.push(b); else out.push({ key, label: dayLabel(b.created_at), items: [b] });
    }
    return out;
  }, [bookings]);

  const tiles = [["all", "Total", counts?.total, "neutral"], ["payment", "Payment pending", counts?.pending_payment, "warn"], ["awaiting", "Needs a driver", counts?.awaiting, "warn"], ["live", "Live trips", counts?.live, "live"], ["cash", "Cash follow-up", counts?.cash_issues, "bad"]];
  const attention = counts ? [counts.pending_payment > 0 && `${counts.pending_payment} payment${counts.pending_payment > 1 ? "s" : ""} pending`, counts.awaiting > 0 && `${counts.awaiting} need${counts.awaiting > 1 ? "" : "s"} a driver`, counts.cash_issues > 0 && `${counts.cash_issues} cash follow-up${counts.cash_issues > 1 ? "s" : ""}`].filter(Boolean) : null;
  const filtered = filter !== "all" || term;
  const clearAll = () => { setFilter("all"); setSearch(""); setTerm(""); };

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 24px" }}>
    <style>{CSS}</style>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, margin: "6px 0 14px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 }}>Bookings</h1>
          <div style={{ marginTop: 3, fontSize: 13, fontWeight: 600, color: attention?.length ? "#8A5700" : c.textFaint }}>{attention === null ? "Loading…" : attention.length ? `Needs attention: ${attention.join(" · ")}` : "All clear — nothing needs action"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => { loadList(); loadMeta(); }} aria-label="Refresh" disabled={loading} style={{ ...ghost, width: 44, padding: 0, fontSize: 18, opacity: loading ? 0.6 : 1 }}>↻</button>
          <Link href="/admin/dispatch" style={{ ...btn, textDecoration: "none" }}>Dispatch →</Link>
        </div>
      </header>

      <div className="vb-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -4px 12px", padding: "2px 4px" }}>
        {tiles.map(([key, label, value, tone]) => {
          const active = filter === key, hot = key !== "all" && value > 0, [, fg] = TONES[tone === "neutral" ? "muted" : tone];
          return <button key={key} onClick={() => setFilter(key)} aria-pressed={active} style={{ flex: "1 0 116px", textAlign: "left", cursor: "pointer", font: "inherit", padding: "10px 12px", borderRadius: 14, background: active ? c.primaryTint : c.surface, border: `1.5px solid ${active ? c.primary : c.border}`, color: c.text }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ marginTop: 2, fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: hot ? fg : value === 0 ? c.textFaint : c.text }}>{value ?? "—"}</div>
          </button>;
        })}
      </div>

      <div style={{ position: "relative", marginBottom: 4 }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 11, fontSize: 17, color: c.textFaint }}>⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Ref, name, phone or place" aria-label="Search bookings" style={{ ...field, paddingLeft: 38, paddingRight: 40 }} />
        {search && <button onClick={() => { setSearch(""); setTerm(""); }} aria-label="Clear search" style={{ position: "absolute", right: 4, top: 4, width: 36, height: 36, border: 0, background: "transparent", color: c.textFaint, fontSize: 18, cursor: "pointer" }}>×</button>}
      </div>

      <div style={{ position: "sticky", top: 62, zIndex: 20, background: c.bg, margin: "0 -4px", padding: "8px 4px" }}>
        <div className="vb-scroll" role="group" aria-label="Filter by status" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {["all", ...STATUS_CHIPS].map((f) => { const on = filter === f; return <button key={f} onClick={() => setFilter(f)} aria-pressed={on} style={{ flex: "none", minHeight: 38, padding: "0 14px", borderRadius: 999, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? c.primary : c.borderStrong}`, background: on ? c.primary : c.surface, color: on ? "#fff" : c.text }}>{f === "all" ? "All" : STATUS[f][0]}</button>; })}
        </div>
      </div>

      {!loading && !loadError && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "4px 2px 8px", fontSize: 12.5, color: c.textFaint, fontWeight: 600 }}>
        <span>{bookings.length}{hasMore ? "+" : ""} {bookings.length === 1 ? "booking" : "bookings"}{filtered ? ` · ${[filter !== "all" && filterLabel(filter), term && `“${term}”`].filter(Boolean).join(" · ")}` : ""}</span>
        {filtered && <button onClick={clearAll} style={{ border: 0, background: "transparent", color: c.primary, fontWeight: 800, fontSize: 12.5, cursor: "pointer", padding: "6px 0" }}>Clear ✕</button>}
      </div>}

      {loading ? <div style={{ display: "grid", gap: 10 }} aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="vb-pulse" style={{ ...card, height: 150 }}><div style={{ width: 90, height: 18, borderRadius: 9, background: c.border }} /><div style={{ width: "70%", height: 18, borderRadius: 9, background: c.border, marginTop: 14 }} /><div style={{ width: "45%", height: 14, borderRadius: 7, background: c.border, marginTop: 10 }} /></div>)}</div>
        : loadError ? <div style={{ ...card, display: "grid", gap: 10, justifyItems: "start" }}><div style={{ color: "#B42318", fontWeight: 700, fontSize: 14 }}>Couldn’t load bookings: {loadError}</div><button onClick={loadList} style={btn}>Try again</button></div>
        : bookings.length === 0 ? <div style={{ ...card, display: "grid", gap: 10, justifyItems: "start", color: c.textFaint, fontSize: 14 }}><div>No bookings match this view.</div>{filtered && <button onClick={clearAll} style={btn}>Show all bookings</button>}</div>
        : groups.map((g) => <section key={g.key} style={{ marginBottom: 6 }}>
          <div style={{ margin: "12px 2px 8px", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: c.textFaint }}>{g.label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 10, alignItems: "start" }}>
            {g.items.map((b) => <BookingCard key={b.id} b={b} driver={driverById[b.driver_id]} assignable={assignable} onConfirm={confirmPayment} onAssign={assign} onCancel={cancel} onError={setError} />)}
          </div>
        </section>)}

      {hasMore && !loading && <div style={{ textAlign: "center", marginTop: 16 }}><button disabled={busyMore} onClick={loadMore} style={{ ...ghost, minWidth: 200, opacity: busyMore ? 0.6 : 1 }}>{busyMore ? "Loading…" : "Load more bookings"}</button></div>}
    </div>

    {(error || notice) && <div role={error ? "alert" : "status"} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", margin: "0 auto", maxWidth: 520, zIndex: 130, padding: "12px 14px", borderRadius: 12, background: error ? "#B42318" : c.navy, color: "#fff", fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: theme.shadow.card }}>
      <span>{error || notice}</span>
      <button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>}
  </main>;
}
