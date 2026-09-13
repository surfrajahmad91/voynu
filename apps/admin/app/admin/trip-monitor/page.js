"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";
import AdminLiveMap from "../../../components/AdminLiveMap";

const ACTIVE = ["driver_assigned", "on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started"];
const fmt = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const timeOnly = (value) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const ref = (id) => id ? `VOY-${id.slice(0, 8).toUpperCase()}` : "—";
const pretty = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function delayText(minutes) { const n = Number(minutes); return Number.isFinite(n) && n > 0 ? `${n} min late` : "On time"; }

export default function TripMonitorPage() {
  const [checking, setChecking] = useState(true), [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState([]), [drivers, setDrivers] = useState([]), [locations, setLocations] = useState({});
  const [alerts, setAlerts] = useState([]), [filter, setFilter] = useState("attention"), [error, setError] = useState(""), [lastCheck, setLastCheck] = useState(null);

  const load = async (runWatchdog = true) => {
    setError("");
    if (runWatchdog) {
      const { error: watchdogError } = await supabase.rpc("check_trip_timing_alerts");
      if (watchdogError) setError(watchdogError.message);
    }
    const [{ data: bs, error: be }, { data: as, error: ae }, { data: ds, error: de }] = await Promise.all([
      supabase.from("bookings").select("id,booking_status,travel_date,pickup_time,return_date,return_time,passenger_name,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,driver_id,vehicle_id,vehicle_type,trip_type,fare,scheduled_pickup_at,scheduled_return_start_at,scheduled_completion_at,expected_duration_seconds,trip_started_at,trip_start_on_time,trip_start_delay_minutes,trip_start_delay_reason,outbound_arrived_at,return_wait_started_at,return_trip_started_at,return_trip_start_on_time,return_trip_start_delay_minutes,return_trip_start_delay_reason,completed_at,trip_completion_on_time,trip_completion_delay_minutes,trip_completion_delay_reason").in("booking_status", [...ACTIVE, "trip_completed"]).order("scheduled_pickup_at", { ascending: true, nullsFirst: false }),
      supabase.rpc("get_trip_timing_alerts"),
      supabase.from("drivers").select("id,full_name,phone,vehicle_id,availability_status,active,vehicles(registration_number,make,model,category)").eq("active", true),
    ]);
    if (be) setError(be.message); else setBookings(bs || []);
    if (ae) setError(ae.message); else setAlerts(as || []);
    if (de) setError(de.message); else setDrivers(ds || []);

    const driverIds = [...new Set((bs || []).filter((b) => b.driver_id).map((b) => b.driver_id))];
    if (driverIds.length) {
      const { data: ls, error: le } = await supabase.from("driver_current_location").select("driver_id,lat,lon,updated_at").in("driver_id", driverIds);
      if (le) setError(le.message); else setLocations(Object.fromEntries((ls || []).map((l) => [l.driver_id, l])));
    } else setLocations({});
    setLastCheck(new Date());
  };

  useEffect(() => { let cancelled = false; (async () => { const { data } = await supabase.auth.getSession(); const email = data?.session?.user?.email || ""; if (!data?.session) { window.location.href = "/login"; return; } if (!ADMIN_EMAILS.includes(email)) { setChecking(false); return; } if (!cancelled) { setAuthorized(true); setChecking(false); } })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!authorized) return; load(true); const timer = setInterval(() => load(true), 15000); const refresh = () => { if (document.visibilityState === "visible") load(true); }; window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh); return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); }; }, [authorized]);

  const metrics = useMemo(() => ({
    live: bookings.filter((b) => ACTIVE.includes(b.booking_status)).length,
    notStarted: bookings.filter((b) => b.scheduled_pickup_at && !b.trip_started_at && !["trip_completed", "cancelled", "waiting_for_return"].includes(b.booking_status) && new Date(b.scheduled_pickup_at).getTime() < Date.now()).length,
    lateStarts: bookings.filter((b) => b.trip_start_on_time === false).length,
    lateReturns: bookings.filter((b) => b.return_trip_start_on_time === false).length,
    lateCompletions: bookings.filter((b) => b.trip_completion_on_time === false).length,
    waiting: bookings.filter((b) => b.booking_status === "waiting_for_return").length,
  }), [bookings]);

  const visible = useMemo(() => bookings.filter((b) => {
    if (filter === "attention") return alerts.some((a) => a.booking_id === b.id) || b.trip_start_on_time === false || b.return_trip_start_on_time === false || b.trip_completion_on_time === false;
    if (filter === "live") return ACTIVE.includes(b.booking_status);
    if (filter === "waiting") return b.booking_status === "waiting_for_return";
    if (filter === "completed") return b.booking_status === "trip_completed";
    return true;
  }), [bookings, alerts, filter]);

  const driverFor = (booking) => drivers.find((d) => d.id === booking.driver_id);
  const acknowledge = async (alert) => { const { data, error: e } = await supabase.rpc("ack_trip_timing_alert", { p_alert_id: alert.id }); if (e) return setError(e.message); if (!data) return setError("Alert could not be acknowledged."); setAlerts((current) => current.filter((a) => a.id !== alert.id)); };

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking access…</main>;
  if (!authorized) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div><h2>Not authorized</h2><Link href="/admin">Back to admin</Link></div></main>;

  return <main style={{ minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "26px 16px 60px" }}><div style={{ maxWidth: 1180, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}><div><div style={{ fontSize: 11, color: "#6D28D9", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>VOYNU Admin · Live Operations</div><h1 style={{ margin: "5px 0 0", fontSize: 27 }}>Trip Monitor</h1><p style={{ margin: "5px 0 0", color: theme.colors.textFaint, fontSize: 12 }}>Live driver position, trip phase, scheduled times, actual times and delay reasons.</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => load(true)} style={{ padding: "9px 14px", borderRadius: 10, border: 0, background: "#6D28D9", color: "#fff", fontWeight: 800 }}>Refresh now</button><Link href="/admin/dispatch" style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${theme.colors.border}`, background: "#fff", color: theme.colors.text, textDecoration: "none", fontWeight: 800 }}>Dispatch</Link></div></header>
    {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12 }}>{error}</div>}

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>{[["Live trips",metrics.live,"#6D28D9"],["Not started",metrics.notStarted,theme.colors.warning],["Late outbound starts",metrics.lateStarts,"#b36b00"],["Waiting for return",metrics.waiting,"#2563EB"],["Late return starts",metrics.lateReturns,"#b36b00"],["Late final arrivals",metrics.lateCompletions,theme.colors.error]].map(([label,value,color]) => <div key={label} style={{ background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, padding: 14 }}><div style={{ fontSize: 9.5, color: theme.colors.textFaint, fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 5, fontSize: 25, fontWeight: 900, color }}>{value}</div></div>)}</section>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{[["attention","Attention"],["live","Live"],["waiting","Waiting at destination"],["completed","Completed"],["all","All"]].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} style={{ padding: "8px 13px", borderRadius: 10, border: `1px solid ${filter===key ? "#6D28D9" : theme.colors.border}`, background: filter===key ? "#6D28D9" : "#fff", color: filter===key ? "#fff" : theme.colors.text, fontWeight: 800 }}>{label}</button>)}</div>

    {visible.length === 0 ? <div style={{ padding: 28, background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, color: theme.colors.textFaint }}>No trips match this view.</div> : <div style={{ display: "grid", gap: 12 }}>{visible.map((b) => { const driver = driverFor(b), location = b.driver_id ? locations[b.driver_id] : null; const related = alerts.filter((a) => a.booking_id === b.id); const lateStart = b.trip_start_on_time === false; const lateReturn = b.return_trip_start_on_time === false; const lateCompletion = b.trip_completion_on_time === false; const targetType = ["waiting_for_return", "return_trip_started"].includes(b.booking_status) ? "pickup" : ["trip_started"].includes(b.booking_status) ? "destination" : "pickup"; return <article key={b.id} style={{ background: "#fff", border: `1px solid ${related.length || lateStart || lateReturn || lateCompletion ? "#e7b26a" : theme.colors.border}`, borderRadius: 16, padding: 16, boxShadow: "0 5px 20px rgba(13,27,42,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><strong style={{ fontSize: 15 }}>{ref(b.id)}</strong><span style={{ marginLeft: 7, color: theme.colors.textMuted }}>{b.passenger_name || "Passenger"}</span><div style={{ marginTop: 5, color: theme.colors.textMuted, fontSize: 12 }}>{b.pickup_name} → {b.drop_name}</div></div><span style={{ padding: "5px 10px", borderRadius: 20, background: "#F3E8FF", color: "#6D28D9", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{pretty(b.booking_status)}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(280px,.9fr)", gap: 14, marginTop: 14 }}>
        <div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 10 }}>
          <div><div className="opsLabel">Outbound scheduled</div><strong>{fmt(b.scheduled_pickup_at)}</strong></div>
          <div><div className="opsLabel">Outbound actual</div><strong>{fmt(b.trip_started_at)}</strong>{lateStart && <div className="opsLate">{delayText(b.trip_start_delay_minutes)}</div>}</div>
          <div><div className="opsLabel">Destination reached</div><strong>{fmt(b.outbound_arrived_at)}</strong></div>
          {b.trip_type === "roundtrip" && <><div><div className="opsLabel">Return scheduled</div><strong>{fmt(b.scheduled_return_start_at)}</strong></div><div><div className="opsLabel">Return actual</div><strong>{fmt(b.return_trip_started_at)}</strong>{lateReturn && <div className="opsLate">{delayText(b.return_trip_start_delay_minutes)}</div>}</div></>}
          <div><div className="opsLabel">Final arrival due</div><strong>{fmt(b.scheduled_completion_at)}</strong></div>
          <div><div className="opsLabel">Final arrival actual</div><strong>{fmt(b.completed_at)}</strong>{lateCompletion && <div className="opsLate">{delayText(b.trip_completion_delay_minutes)}</div>}</div>
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#F8FAFC", border: "1px solid #EEF3F7" }}><div style={{ fontSize: 10, color: theme.colors.textFaint, fontWeight: 900, textTransform: "uppercase" }}>Driver & vehicle</div><div style={{ marginTop: 5, fontWeight: 800 }}>{driver?.full_name || "Not assigned"}</div><div style={{ marginTop: 3, color: theme.colors.textMuted, fontSize: 11 }}>{driver?.vehicles ? `${driver.vehicles.registration_number} · ${driver.vehicles.make || ""} ${driver.vehicles.model || ""}` : "No vehicle data"}{location?.updated_at ? ` · GPS ${timeOnly(location.updated_at)}` : " · GPS unavailable"}</div></div>
        {(lateStart || lateReturn || lateCompletion) && <div style={{ marginTop: 10, display: "grid", gap: 5 }}>{lateStart && <div className="reasonLine"><b>Outbound delay:</b> {b.trip_start_delay_reason || "Reason not recorded"}</div>}{lateReturn && <div className="reasonLine"><b>Return delay:</b> {b.return_trip_start_delay_reason || "Reason not recorded"}</div>}{lateCompletion && <div className="reasonLine"><b>Final arrival delay:</b> {b.trip_completion_delay_reason || "Reason not recorded"}</div>}</div>}
        {related.length > 0 && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#fff7e8", color: "#8a5700", fontSize: 11, fontWeight: 800 }}>{related.map((a) => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}><span>{a.alert_type === "start_overdue" ? "Outbound trip has not started." : a.alert_type === "return_start_overdue" ? "Return trip has not started." : "Final arrival is overdue."}</span><button onClick={() => acknowledge(a)} style={{ border: 0, background: "transparent", color: "#6D28D9", fontWeight: 900 }}>Acknowledge</button></div>)}</div>}
        </div>
        <div><AdminLiveMap pickup={{ lat: b.pickup_lat, lon: b.pickup_lon }} destination={{ lat: b.drop_lat, lon: b.drop_lon }} driverLocation={location ? { lat: location.lat, lon: location.lon } : null} driverName={driver?.full_name} status={b.booking_status} /><div style={{ marginTop: 7, fontSize: 10, color: theme.colors.textFaint }}>Map target: {targetType === "pickup" ? (b.booking_status === "waiting_for_return" || b.booking_status === "return_trip_started" ? "Return journey → pickup" : "Pickup") : "Destination"} · GPS refreshes every 15 seconds.</div></div>
      </div>
    </article>; })}</div>}
    {lastCheck && <div style={{ marginTop: 12, fontSize: 10, color: theme.colors.textFaint }}>Last operations refresh: {lastCheck.toLocaleTimeString("en-IN")}. Live data refreshes every 15 seconds while this page is open.</div>}
  </div><style jsx>{`.opsLabel{font-size:9px;color:${theme.colors.textFaint};font-weight:900;text-transform:uppercase}.opsLate{margin-top:3px;color:${theme.colors.error};font-size:11px;font-weight:800}.reasonLine{font-size:11px;color:${theme.colors.textMuted};padding:7px 9px;border-radius:8px;background:#fff7e8}.reasonLine b{color:#8a5700}`}</style></main>;
}
