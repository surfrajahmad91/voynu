"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const PAGE_SIZE = 100;
const FILTERS = ["all", "pending_payment", "confirmed", "driver_assigned", "on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started", "trip_completed", "cancelled"];
const TERMINAL = ["trip_completed", "cancelled"];
const COLUMNS = "id,booking_status,payment_status,payment_method,driver_id,vehicle_id,trip_type,passenger_name,phone,pickup_name,drop_name,travel_date,pickup_time,vehicle_type,fare,created_at,scheduled_pickup_at,trip_started_at,completed_at,trip_start_delay_minutes,trip_start_delay_reason,trip_completion_delay_minutes,trip_completion_delay_reason,outbound_arrival_delay_reason,return_trip_start_delay_reason,cash_collection_status,cash_collected_amount,cash_collection_note,cancelled_by,cancellation_reason";
const shortId = (id) => id ? id.slice(0, 8).toUpperCase() : "";
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const formatTime = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const shortLocation = (value) => value ? value.split(",")[0].trim() || value : "—";
const statusText = (value) => String(value || "").replace(/_/g, " ");
const normalizeWhatsApp = (value) => { const digits = String(value || "").replace(/\D/g, ""); return digits.length === 10 ? `91${digits}` : digits; };
const paymentLabel = (b) => b.payment_method === "upi" ? "UPI" : b.payment_method === "cash" ? "Cash at end of journey" : b.payment_method === "subscription" ? "Commute subscription" : (b.payment_method || "—");
const looksLikeReference = (q) => /^(voy-?)?[0-9a-f-]{4,}$/i.test(q.trim());

const card = { background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, padding: 15 };
const button = { border: 0, borderRadius: 8, padding: "8px 11px", background: theme.colors.primary, color: "#fff", fontWeight: 800, fontSize: 11, cursor: "pointer" };
const ghost = { ...button, background: "#fff", color: theme.colors.text, border: `1px solid ${theme.colors.border}` };
const input = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: `1px solid ${theme.colors.border}`, borderRadius: 8, background: "#fff", font: "inherit", fontSize: 12 };

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]), [drivers, setDrivers] = useState([]), [counts, setCounts] = useState(null);
  const [filter, setFilter] = useState("all"), [search, setSearch] = useState(""), [term, setTerm] = useState("");
  const [assigning, setAssigning] = useState(null), [driverId, setDriverId] = useState("");
  const [cancelling, setCancelling] = useState(null), [cancelReason, setCancelReason] = useState("");
  const [timelines, setTimelines] = useState({}); // bookingId -> events | "loading"
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { setSearch(q); setTerm(q); }
  }, []);
  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const fetchPage = async (offset) => {
    let query = supabase.from("bookings").select(COLUMNS).order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    if (filter !== "all") query = query.eq("booking_status", filter);
    if (term) {
      if (looksLikeReference(term)) {
        const { data, error: e } = await supabase.rpc("admin_search", { p_query: term });
        if (e) return { error: e };
        const ids = (data?.bookings || []).map((b) => b.id);
        if (!ids.length) return { data: [] };
        query = query.in("id", ids);
      } else {
        const safe = term.replace(/[%,()*]/g, " ").trim();
        query = query.or(`passenger_name.ilike.%${safe}%,phone.ilike.%${safe}%,pickup_name.ilike.%${safe}%,drop_name.ilike.%${safe}%`);
      }
    }
    return query;
  };

  const load = async () => {
    const mine = ++seq.current;
    setLoading(true); setError("");
    const [page, driverRes, countRes] = await Promise.all([
      fetchPage(0),
      supabase.from("drivers").select("id,full_name,phone,active,availability_status,vehicle_id,vehicles(registration_number,active,status)").order("full_name"),
      supabase.rpc("admin_dashboard_counts"),
    ]);
    if (mine !== seq.current) return;
    setLoading(false);
    const firstError = page.error || driverRes.error || countRes.error;
    if (firstError) setError(firstError.message);
    setBookings(page.data || []); setHasMore((page.data || []).length === PAGE_SIZE);
    setDrivers(driverRes.data || []); setCounts(countRes.data || null);
  };
  useEffect(() => { load(); }, [filter, term]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setBusy(true);
    const page = await fetchPage(bookings.length);
    setBusy(false);
    if (page.error) return setError(page.error.message);
    setBookings((prev) => [...prev, ...(page.data || [])]); setHasMore((page.data || []).length === PAGE_SIZE);
  };

  const assignable = drivers.filter((d) => d.active !== false && d.availability_status === "available" && d.vehicle_id && d.vehicles?.active !== false && d.vehicles?.status === "active");
  const driverById = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const patch = (id, next) => setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, ...next } : x)));

  const confirmPayment = async (b) => {
    setError(""); setBusy(true);
    const { data, error: e } = await supabase.rpc("admin_confirm_payment_and_dispatch", { p_booking_id: b.id });
    setBusy(false);
    if (e) return setError(e.message);
    const updated = Array.isArray(data) ? data[0] : data;
    patch(b.id, updated || { payment_status: "paid" });
    setNotice(updated?.driver_id ? `Payment confirmed and driver assigned to #${shortId(b.id)}.` : `Payment confirmed for #${shortId(b.id)}.`);
    load();
  };
  const assign = async (b) => {
    const d = driverById[driverId];
    if (!d?.vehicle_id) return setError("Select a driver with an assigned active vehicle.");
    setBusy(true);
    const { data, error: e } = await supabase.rpc("assign_booking_driver", { p_booking_id: b.id, p_driver_id: d.id, p_vehicle_id: d.vehicle_id });
    setBusy(false);
    if (e) return setError(e.message);
    patch(b.id, { ...(data || {}), driver_id: d.id, vehicle_id: d.vehicle_id, booking_status: data?.booking_status || "driver_assigned" });
    setAssigning(null); setDriverId(""); setNotice(`${d.full_name} assigned to #${shortId(b.id)}.`);
  };
  const cancel = async (b) => {
    if (cancelReason.trim().length < 4) return setError("Please give a cancellation reason (at least a few words).");
    setBusy(true); setError("");
    const { data, error: e } = await supabase.rpc("admin_cancel_booking", { p_booking_id: b.id, p_reason: cancelReason.trim() });
    setBusy(false);
    if (e) return setError(e.message.replace(/^VOYNU:\s*/, ""));
    patch(b.id, data || { booking_status: "cancelled", cancelled_by: "admin", cancellation_reason: cancelReason.trim() });
    setCancelling(null); setCancelReason(""); setNotice(`#${shortId(b.id)} cancelled.`);
    load();
  };
  const toggleTimeline = async (b) => {
    if (timelines[b.id]) { setTimelines((prev) => { const next = { ...prev }; delete next[b.id]; return next; }); return; }
    setTimelines((prev) => ({ ...prev, [b.id]: "loading" }));
    const { data, error: e } = await supabase.from("booking_status_events").select("id,from_status,to_status,occurred_at,target,distance_to_target_m,scheduled_at,delay_minutes,flags,reason,cash_status,cash_amount").eq("booking_id", b.id).order("occurred_at");
    if (e) { setError(e.message); setTimelines((prev) => { const next = { ...prev }; delete next[b.id]; return next; }); return; }
    setTimelines((prev) => ({ ...prev, [b.id]: data || [] }));
  };
  const whatsapp = (b) => {
    const phone = normalizeWhatsApp(b.phone);
    if (!phone) return setError("No valid WhatsApp number on this booking.");
    const d = driverById[b.driver_id];
    const headline = b.booking_status === "cancelled" ? "has been cancelled" : b.booking_status === "trip_completed" ? "is completed" : ["pending_payment"].includes(b.booking_status) ? "is awaiting payment confirmation" : "is confirmed";
    const lines = [`Hello ${b.passenger_name || ""}`.trim(), "", `Your VOYNU booking VOY-${shortId(b.id)} ${headline}.`, `Trip: ${b.trip_type === "roundtrip" ? "Round Trip" : "One Way"}`, `Pickup: ${b.pickup_name || "—"}`, `Destination: ${b.drop_name || "—"}`, `Travel: ${b.travel_date || "—"} ${b.pickup_time || ""}`.trim(), `Vehicle: ${b.vehicle_type || "—"}`, `Fare: ₹${Number(b.fare || 0).toLocaleString("en-IN")}`, `Payment: ${paymentLabel(b)}`];
    if (d) lines.push(`Driver: ${d.full_name}${d.phone ? ` (${d.phone})` : ""}`);
    lines.push("", "Thank you for choosing VOYNU.");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  };

  const metrics = [["Total", counts?.total], ["Payment pending", counts?.pending_payment], ["Awaiting assignment", counts?.awaiting], ["Live trips", counts?.live], ["Cash to follow up", counts?.cash_issues]];
  return <main style={{ background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "8px 4px 60px" }}><div style={{ maxWidth: 1100, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 18 }}><div><div style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>VOYNU Admin · Operations</div><h1 style={{ margin: "5px 0 0", fontSize: 27 }}>Bookings</h1><p style={{ margin: "5px 0 0", color: theme.colors.textFaint, fontSize: 12 }}>Payment, assignment, customer communication and the full trip timeline.</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={load} style={ghost}>{loading ? "Refreshing…" : "Refresh"}</button><Link href="/admin/dispatch" style={{ ...button, textDecoration: "none" }}>Dispatch queue →</Link></div></header>
    {(error || notice) && <div role="status" style={{ marginBottom: 14, padding: 11, borderRadius: 9, background: error ? theme.colors.errorBg : theme.colors.primaryTint, color: error ? theme.colors.error : theme.colors.primary, fontSize: 11, fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }} style={{ border: 0, background: "transparent", color: "inherit", fontWeight: 900, cursor: "pointer" }}>×</button></div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>{metrics.map(([l, v]) => <div key={l} style={card}><div style={{ fontSize: 9, fontWeight: 900, color: theme.colors.textFaint, textTransform: "uppercase" }}>{l}</div><div style={{ marginTop: 5, fontSize: 24, fontWeight: 900 }}>{v ?? "—"}</div></div>)}</div>
    <section style={{ ...card, marginBottom: 14 }}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search booking reference (VOY-…), passenger, phone or location" style={input} aria-label="Search bookings" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${filter === f ? theme.colors.primary : theme.colors.border}`, background: filter === f ? theme.colors.primary : "#fff", color: filter === f ? "#fff" : theme.colors.text, fontWeight: 800, fontSize: 9.5, textTransform: "uppercase", cursor: "pointer" }}>{statusText(f)}</button>)}</div>
    </section>
    {loading && bookings.length === 0 ? <div style={card}>Loading bookings…</div> : bookings.length === 0 ? <div style={{ ...card, color: theme.colors.textFaint }}>No bookings match this view.</div> : <div style={{ display: "grid", gap: 10 }}>{bookings.map((b) => {
      const d = driverById[b.driver_id];
      const needsPayment = b.payment_method === "upi" && b.payment_status === "pending" && b.booking_status !== "cancelled";
      const needsAssignment = b.booking_status === "confirmed" && !b.driver_id;
      const events = timelines[b.id];
      const cashDone = b.payment_method === "cash" && b.booking_status === "trip_completed";
      return <article key={b.id} style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong style={{ color: "#7b8982", fontSize: 11 }}>#{shortId(b.id)} · {formatDate(b.created_at)}</strong><span style={{ padding: "4px 8px", borderRadius: 999, background: b.booking_status === "cancelled" ? theme.colors.errorBg : theme.colors.primaryTint, color: b.booking_status === "cancelled" ? theme.colors.error : theme.colors.primary, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>{statusText(b.booking_status)}</span></div>
        <div style={{ margin: "8px 0 5px", fontSize: 13, fontWeight: 700 }}>{shortLocation(b.pickup_name)} → {shortLocation(b.drop_name)}</div>
        <div style={{ color: theme.colors.textFaint, fontSize: 11 }}>{b.passenger_name || "Passenger"} · {b.phone || "—"} · {b.travel_date || "—"} {b.pickup_time || ""} · {b.vehicle_type || "—"} · {b.trip_type === "roundtrip" ? "Round trip" : "One way"} · ₹{Number(b.fare || 0).toLocaleString("en-IN")}</div>
        <div style={{ marginTop: 5, color: theme.colors.textMuted, fontSize: 10 }}>Payment: <strong>{paymentLabel(b)} · {b.payment_status || "—"}</strong>{d ? <> · Driver: <strong>{d.full_name}</strong> · Vehicle: <strong>{d.vehicles?.registration_number || "—"}</strong></> : <> · Driver: <strong>Not assigned</strong></>}</div>
        {cashDone && <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 9, fontSize: 10.5, fontWeight: 700, background: b.cash_collection_status === "collected" ? "#EAFBF2" : b.cash_collection_status ? "#fff1f0" : "#F3F7FA", color: b.cash_collection_status === "collected" ? "#0b8750" : b.cash_collection_status ? "#a12622" : "#5e6963" }}>Cash: {b.cash_collection_status === "collected" ? `collected ₹${b.cash_collected_amount ?? b.fare}` : b.cash_collection_status === "partial" ? `part payment ₹${b.cash_collected_amount} of ₹${b.fare} — ${b.cash_collection_note || "no note"}` : b.cash_collection_status === "not_collected" ? `not collected — ${b.cash_collection_note || "no note"}` : b.cash_collection_status === "unreported" ? "driver did not report the outcome" : "not recorded (completed before cash tracking)"}</div>}
        {b.booking_status === "cancelled" && (b.cancellation_reason || b.cancelled_by) && <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 9, fontSize: 10.5, background: theme.colors.errorBg, color: theme.colors.error, fontWeight: 700 }}>Cancelled by {b.cancelled_by || "—"}{b.cancellation_reason ? `: ${b.cancellation_reason}` : ""}</div>}
        {[["Late start", b.trip_start_delay_reason], ["Late reaching destination", b.outbound_arrival_delay_reason], ["Late return start", b.return_trip_start_delay_reason], ["Late completion", b.trip_completion_delay_reason]].filter(([, r]) => r).map(([label, r]) => <div key={label} style={{ marginTop: 6, fontSize: 10.5, color: "#8A5700" }}><strong>{label}:</strong> {r}</div>)}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {needsPayment && <button disabled={busy} onClick={() => confirmPayment(b)} style={button}>Confirm payment</button>}
          {needsAssignment && assigning !== b.id && <button onClick={() => { setAssigning(b.id); setDriverId(""); setError(""); }} style={{ ...button, background: "#e0edf7", color: "#2563a8" }}>Assign driver</button>}
          {b.phone && <button onClick={() => whatsapp(b)} style={{ ...button, background: "#eafaf0", color: "#128C4A", border: "1px solid #25D366" }}>WhatsApp</button>}
          <button onClick={() => toggleTimeline(b)} style={ghost}>{events ? "Hide timeline" : "Timeline"}</button>
          {!TERMINAL.includes(b.booking_status) && cancelling !== b.id && <button onClick={() => { setCancelling(b.id); setCancelReason(""); setError(""); }} style={{ ...button, background: theme.colors.errorBg, color: theme.colors.error, border: `1px solid ${theme.colors.error}` }}>Cancel</button>}
        </div>
        {cancelling === b.id && <div style={{ marginTop: 10, padding: 10, background: theme.colors.errorBg, borderRadius: 9 }}><div style={{ fontSize: 10, fontWeight: 900, marginBottom: 5, color: theme.colors.error }}>CANCEL THIS BOOKING — REASON (SHARED IN THE AUDIT LOG)</div><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 7 }}><input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer asked to cancel, driver unavailable…" style={input} /><button disabled={busy} onClick={() => cancel(b)} style={{ ...button, background: theme.colors.error }}>Confirm cancel</button><button onClick={() => setCancelling(null)} style={ghost}>Keep</button></div></div>}
        {assigning === b.id && <div style={{ marginTop: 10, padding: 10, background: theme.colors.bg, borderRadius: 9 }}><div style={{ fontSize: 10, fontWeight: 900, marginBottom: 5 }}>ASSIGN ACTIVE VEHICLE + DRIVER</div>{assignable.length === 0 ? <div style={{ color: theme.colors.warning, fontSize: 11 }}>No available driver currently has an assigned active vehicle. Add or assign a vehicle in Drivers.</div> : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 7 }}><select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={input}><option value="">Select driver…</option>{assignable.map((x) => <option key={x.id} value={x.id}>{x.full_name} · {x.vehicles?.registration_number || "—"}</option>)}</select><button disabled={busy} onClick={() => assign(b)} style={button}>Assign</button><button onClick={() => setAssigning(null)} style={ghost}>Close</button></div>}</div>}
        {events && <div style={{ marginTop: 10, padding: 10, background: theme.colors.bg, borderRadius: 9 }}>
          <div style={{ fontSize: 10, fontWeight: 900, marginBottom: 6 }}>DRIVER TIMELINE</div>
          {events === "loading" ? <div style={{ fontSize: 11 }}>Loading…</div> : events.length === 0 ? <div style={{ fontSize: 11, color: theme.colors.textFaint }}>No driver steps recorded for this booking.</div> : <div style={{ display: "grid", gap: 6 }}>{events.map((ev) => <div key={ev.id} style={{ fontSize: 11, display: "grid", gap: 2, paddingBottom: 6, borderBottom: `1px solid ${theme.colors.border}` }}><div><strong>{formatTime(ev.occurred_at)}</strong> · {statusText(ev.from_status)} → <strong>{statusText(ev.to_status)}</strong>{ev.delay_minutes ? <span style={{ color: "#8A5700" }}> · {ev.delay_minutes} min late</span> : null}{ev.distance_to_target_m != null ? <span style={{ color: theme.colors.textFaint }}> · {ev.distance_to_target_m} m from {ev.target}</span> : null}</div>{ev.flags?.length > 0 && <div style={{ color: "#8A5700" }}>Flags: {ev.flags.join(", ").replace(/_/g, " ")}</div>}{ev.reason && <div>Reason: {ev.reason}</div>}{ev.cash_status && <div>Cash: {ev.cash_status.replace(/_/g, " ")}{ev.cash_amount != null ? ` · ₹${ev.cash_amount}` : ""}</div>}</div>)}</div>}
        </div>}
      </article>;
    })}</div>}
    {hasMore && <div style={{ textAlign: "center", marginTop: 14 }}><button disabled={busy} onClick={loadMore} style={ghost}>{busy ? "Loading…" : "Load more bookings"}</button></div>}
  </div></main>;
}
