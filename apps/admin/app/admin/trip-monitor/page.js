"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const STATUS = ["confirmed", "driver_assigned", "on_the_way", "arrived", "trip_started", "trip_completed", "cancelled"];
const fmt = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const ref = (id) => id ? `VOY-${id.slice(0, 8).toUpperCase()}` : "—";

export default function TripMonitorPage() {
  const [checking, setChecking] = useState(true), [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState([]), [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("attention"), [error, setError] = useState(""), [lastCheck, setLastCheck] = useState(null);

  const load = async (runWatchdog = true) => {
    setError("");
    if (runWatchdog) {
      const { error: watchdogError } = await supabase.rpc("check_trip_timing_alerts");
      if (watchdogError) setError(watchdogError.message);
    }
    const [{ data: bs, error: be }, { data: as, error: ae }] = await Promise.all([
      supabase.from("bookings").select("id,booking_status,travel_date,pickup_time,return_date,return_time,passenger_name,pickup_name,drop_name,driver_id,vehicle_id,scheduled_pickup_at,scheduled_completion_at,expected_duration_seconds,trip_started_at,trip_start_on_time,trip_start_delay_minutes,completed_at,trip_completion_on_time,trip_completion_delay_minutes").in("booking_status", STATUS).order("scheduled_pickup_at", { ascending: true, nullsFirst: false }),
      supabase.rpc("get_trip_timing_alerts"),
    ]);
    if (be) setError(be.message); else setBookings(bs || []);
    if (ae) setError(ae.message); else setAlerts(as || []);
    setLastCheck(new Date());
  };

  useEffect(() => { let cancelled = false; (async () => { const { data } = await supabase.auth.getSession(); const email = data?.session?.user?.email || ""; if (!data?.session) { window.location.href = "/login"; return; } if (!ADMIN_EMAILS.includes(email)) { setChecking(false); return; } if (!cancelled) { setAuthorized(true); setChecking(false); } })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!authorized) return; load(true); const timer = setInterval(() => load(true), 60000); const refresh = () => { if (document.visibilityState === "visible") load(true); }; window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh); return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); }; }, [authorized]);

  const metrics = useMemo(() => { const now = Date.now(); return {
    notStarted: bookings.filter((b) => b.scheduled_pickup_at && !b.trip_started_at && !["trip_completed","cancelled"].includes(b.booking_status) && new Date(b.scheduled_pickup_at).getTime() < now).length,
    lateStarts: bookings.filter((b) => b.trip_start_on_time === false).length,
    lateCompletions: bookings.filter((b) => b.trip_completion_on_time === false).length,
    active: bookings.filter((b) => b.booking_status === "trip_started").length,
  }; }, [bookings]);

  const visible = useMemo(() => bookings.filter((b) => { if (filter === "attention") return alerts.some((a) => a.booking_id === b.id) || b.trip_start_on_time === false || b.trip_completion_on_time === false; if (filter === "active") return ["driver_assigned","on_the_way","arrived","trip_started"].includes(b.booking_status); if (filter === "completed") return b.booking_status === "trip_completed"; return true; }), [bookings, alerts, filter]);

  const acknowledge = async (alert) => { const { data, error: e } = await supabase.rpc("ack_trip_timing_alert", { p_alert_id: alert.id }); if (e) return setError(e.message); if (!data) return setError("Alert could not be acknowledged."); setAlerts((current) => current.filter((a) => a.id !== alert.id)); };

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking access…</main>;
  if (!authorized) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div><h2>Not authorized</h2><Link href="/admin">Back to admin</Link></div></main>;
  return <main style={{ minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "28px 16px 60px" }}><div style={{ maxWidth: 1100, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}><div><div style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>VOYNU Admin · Operations</div><h1 style={{ margin: "5px 0 0", fontSize: 27 }}>Trip Monitor</h1><p style={{ margin: "5px 0 0", color: theme.colors.textFaint, fontSize: 12 }}>Track scheduled starts, actual starts, expected completion and late trips.</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => load(true)} style={{ padding: "9px 14px", borderRadius: 10, border: 0, background: theme.colors.primary, color: "#fff", fontWeight: 800 }}>Run check</button><Link href="/admin" style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${theme.colors.border}`, background: "#fff", color: theme.colors.text, textDecoration: "none", fontWeight: 800 }}>Dashboard</Link></div></header>
    {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12 }}>{error}</div>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>{[["Not started on time",metrics.notStarted,theme.colors.warning],["Active trips",metrics.active,theme.colors.primary],["Late starts recorded",metrics.lateStarts,"#b36b00"],["Late completions recorded",metrics.lateCompletions,theme.colors.error]].map(([label,value,color]) => <div key={label} style={{ background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, padding: 16 }}><div style={{ fontSize: 11, color: theme.colors.textFaint, fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color }}>{value}</div></div>)}</section>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{[["attention","Attention"],["active","Active"],["completed","Completed"],["all","All"]].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} style={{ padding: "8px 13px", borderRadius: 10, border: `1px solid ${filter===key?theme.colors.primary:theme.colors.border}`, background: filter===key?theme.colors.primary:"#fff", color: filter===key?"#fff":theme.colors.text, fontWeight: 800 }}>{label}</button>)}</div>
    {visible.length === 0 ? <div style={{ padding: 28, background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, color: theme.colors.textFaint }}>No trips match this view.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{visible.map((b) => { const related = alerts.filter((a) => a.booking_id === b.id); const startLate = b.trip_start_on_time === false; const completionLate = b.trip_completion_on_time === false; return <article key={b.id} style={{ background: "#fff", border: `1px solid ${related.length || startLate || completionLate ? "#e7b26a" : theme.colors.border}`, borderRadius: 14, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><strong style={{ fontSize: 15 }}>{ref(b.id)}</strong> · {b.passenger_name || "Passenger"}<div style={{ marginTop: 5, color: theme.colors.textMuted, fontSize: 12 }}>{b.pickup_name} → {b.drop_name}</div></div><span style={{ padding: "5px 10px", borderRadius: 20, background: theme.colors.primaryTint, color: theme.colors.primary, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{(b.booking_status || "").replace(/_/g," ")}</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 14 }}><div><div style={{ fontSize: 10, color: theme.colors.textFaint }}>SCHEDULED START</div><strong>{fmt(b.scheduled_pickup_at)}</strong></div><div><div style={{ fontSize: 10, color: theme.colors.textFaint }}>ACTUAL START</div><strong>{fmt(b.trip_started_at)}</strong>{startLate && <div style={{ color: theme.colors.error, fontSize: 11, fontWeight: 800 }}>{b.trip_start_delay_minutes} min late</div>}</div><div><div style={{ fontSize: 10, color: theme.colors.textFaint }}>EXPECTED COMPLETION</div><strong>{fmt(b.scheduled_completion_at)}</strong></div><div><div style={{ fontSize: 10, color: theme.colors.textFaint }}>ACTUAL COMPLETION</div><strong>{fmt(b.completed_at)}</strong>{completionLate && <div style={{ color: theme.colors.error, fontSize: 11, fontWeight: 800 }}>{b.trip_completion_delay_minutes} min late</div>}</div></div>{related.length > 0 && <div style={{ marginTop: 12, padding: 11, borderRadius: 10, background: "#fff7e8", color: "#8a5700", fontSize: 12, fontWeight: 800 }}>{related.map((a) => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}><span>{a.alert_type === "start_overdue" ? "Trip has not started after scheduled pickup." : "Trip has passed expected completion."}</span><button onClick={() => acknowledge(a)} style={{ border: 0, background: "transparent", color: theme.colors.primary, fontWeight: 900 }}>Acknowledge</button></div>)}</div>}</article>; })}</div>}
    {lastCheck && <div style={{ marginTop: 12, fontSize: 10, color: theme.colors.textFaint }}>Last timing check: {lastCheck.toLocaleTimeString("en-IN")}. Checks again every minute while this page is open.</div>}
  </div></main>;
}
