"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";
import AdminLiveMap from "../../../components/AdminLiveMap";

// "Live" = a driver is engaged on the trip. Trips that are only assigned for later are "upcoming", not live.
const ON_ROAD = ["on_the_way", "arrived", "trip_started", "return_trip_started"];
const LIVE = [...ON_ROAD, "waiting_for_return"];
const REFRESH_MS = 15000;
const WATCHDOG_MS = 60000;
const COLUMNS = "id,booking_status,passenger_name,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,driver_id,vehicle_type,trip_type,fare,scheduled_pickup_at,scheduled_return_start_at,scheduled_completion_at,expected_duration_seconds,trip_started_at,trip_start_on_time,trip_start_delay_minutes,trip_start_delay_reason,outbound_arrived_at,return_trip_started_at,return_trip_start_on_time,return_trip_start_delay_minutes,return_trip_start_delay_reason,completed_at,trip_completion_on_time,trip_completion_delay_minutes,trip_completion_delay_reason,outbound_arrival_delay_reason,payment_method,cash_collection_status,cash_collected_amount,cash_collection_note";

const TABS = [["live", "Live now"], ["attention", "Attention"], ["upcoming", "Upcoming 24 h"], ["completed", "Completed"], ["all", "All"]];
const fmt = (v) => v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const timeOnly = (v) => v ? new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";
const ref = (id) => id ? `VOY-${id.slice(0, 8).toUpperCase()}` : "—";
const place = (v) => v ? String(v).split(",")[0].trim() : "—";
const pretty = (v) => String(v || "").replace(/_/g, " ");
const late = (m) => Number.isFinite(Number(m)) && Number(m) > 0 ? `${Number(m)} min late` : "late";
const cashIssue = (b) => b.payment_method === "cash" && b.booking_status === "trip_completed" && ["partial", "not_collected", "unreported"].includes(b.cash_collection_status);

function metersBetween(a, b) {
  const lat1 = Number(a?.lat), lon1 = Number(a?.lon), lat2 = Number(b?.lat), lon2 = Number(b?.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const km = (m) => m === null ? "" : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;

const STEPS_ONE = [["driver_assigned", "Assigned"], ["on_the_way", "On the way"], ["arrived", "At pickup"], ["trip_started", "Journey"], ["trip_completed", "Done"]];
const STEPS_ROUND = [["driver_assigned", "Assigned"], ["on_the_way", "On the way"], ["arrived", "At pickup"], ["trip_started", "Outbound"], ["waiting_for_return", "At destination"], ["return_trip_started", "Return"], ["trip_completed", "Done"]];

function describePhase(b) {
  switch (b.booking_status) {
    case "driver_assigned": return `Assigned · pickup ${fmt(b.scheduled_pickup_at)}`;
    case "on_the_way": return "Heading to pickup";
    case "arrived": return "At pickup, waiting for the passenger";
    case "trip_started": return b.trip_type === "roundtrip" ? "Outbound journey in progress" : "Journey in progress";
    case "waiting_for_return": return "At the destination, waiting for the return";
    case "return_trip_started": return "Return journey in progress";
    case "trip_completed": return `Completed ${fmt(b.completed_at)}`;
    default: return pretty(b.booking_status);
  }
}
function targetOf(b) {
  if (["trip_started"].includes(b.booking_status)) return { label: "destination", point: { lat: b.drop_lat, lon: b.drop_lon } };
  if (["on_the_way", "arrived", "return_trip_started"].includes(b.booking_status)) return { label: "pickup", point: { lat: b.pickup_lat, lon: b.pickup_lon } };
  if (b.booking_status === "waiting_for_return") return { label: "destination", point: { lat: b.drop_lat, lon: b.drop_lon } };
  return null;
}

function TripCard({ b, driver, location, alerts, onAck }) {
  const onRoad = ON_ROAD.includes(b.booking_status);
  const live = LIVE.includes(b.booking_status);
  const round = b.trip_type === "roundtrip";
  const hasMap = live && location && Number.isFinite(Number(location.lat));
  const [open, setOpen] = useState(onRoad && hasMap);
  const [events, setEvents] = useState(null);
  const [showEvents, setShowEvents] = useState(false);
  const target = targetOf(b);
  const dist = location && target ? metersBetween(location, target.point) : null;
  const gpsAge = location?.updated_at ? Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000) : null;
  const gpsStale = gpsAge !== null && gpsAge > 120;
  const lateStart = b.trip_start_on_time === false, lateReturn = b.return_trip_start_on_time === false, lateEnd = b.trip_completion_on_time === false;
  const needsAttention = alerts.length > 0 || lateStart || lateReturn || lateEnd || cashIssue(b);
  const steps = round ? STEPS_ROUND : STEPS_ONE;
  const currentIndex = Math.max(0, steps.findIndex(([key]) => key === b.booking_status));
  const returnValid = b.scheduled_return_start_at && b.scheduled_pickup_at && new Date(b.scheduled_return_start_at) > new Date(b.scheduled_pickup_at);
  const outboundDue = b.scheduled_pickup_at && b.expected_duration_seconds ? new Date(new Date(b.scheduled_pickup_at).getTime() + b.expected_duration_seconds * 1000) : null;

  const loadEvents = async () => {
    setShowEvents((v) => !v);
    if (events) return;
    const { data } = await supabase.from("booking_status_events").select("id,from_status,to_status,occurred_at,target,distance_to_target_m,delay_minutes,flags,reason,cash_status,cash_amount").eq("booking_id", b.id).order("occurred_at");
    setEvents(data || []);
  };

  const rows = [
    ["Pickup", b.scheduled_pickup_at, b.trip_started_at, lateStart ? late(b.trip_start_delay_minutes) : null],
    ...(round ? [["At destination", outboundDue, b.outbound_arrived_at, null], ["Return start", returnValid ? b.scheduled_return_start_at : null, b.return_trip_started_at, lateReturn ? late(b.return_trip_start_delay_minutes) : null]] : []),
    [round ? "Back at pickup" : "Arrival", b.scheduled_completion_at, b.completed_at, lateEnd ? late(b.trip_completion_delay_minutes) : null],
  ];

  return <article className="tm-card" style={{ borderColor: needsAttention ? "#E7B26A" : theme.colors.border }}>
    <div className="tm-head">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}><strong style={{ fontSize: 14 }}>{ref(b.id)}</strong><span style={{ color: theme.colors.textMuted, fontSize: 12 }}>{b.passenger_name || "Passenger"}</span></div>
        <div className="tm-route">{place(b.pickup_name)} → {place(b.drop_name)}{round ? " (round trip)" : ""}</div>
      </div>
      <span className="tm-pill" style={{ background: live ? "#F3E8FF" : b.booking_status === "trip_completed" ? "#EAFBF2" : "#EEF3F7", color: live ? "#6D28D9" : b.booking_status === "trip_completed" ? "#0b8750" : "#5B6B7C" }}>{pretty(b.booking_status)}</span>
    </div>

    <div className="tm-steps" aria-hidden="true">{steps.map(([key], i) => <i key={key} style={{ background: b.booking_status === "trip_completed" || i < currentIndex ? "#6D28D9" : i === currentIndex ? "#F5A524" : "#E4EAF0" }} />)}</div>
    <div className="tm-now"><b>{describePhase(b)}</b>{live && target && dist !== null ? <span> · {km(dist)} from {target.label}</span> : null}{live && gpsAge !== null ? <span style={{ color: gpsStale ? theme.colors.error : theme.colors.textFaint }}> · GPS {gpsAge < 60 ? "live" : `${Math.round(gpsAge / 60)} min ago`}</span> : live ? <span style={{ color: theme.colors.error }}> · no GPS yet</span> : null}</div>

    <div className="tm-driver">{driver ? <><strong>{driver.full_name}</strong>{driver.vehicles?.registration_number ? ` · ${driver.vehicles.registration_number}` : ""}{driver.vehicles?.make ? ` · ${driver.vehicles.make} ${driver.vehicles.model || ""}` : ""}{driver.phone ? <> · <a href={`tel:${driver.phone}`} style={{ color: "#6D28D9", fontWeight: 700 }}>{driver.phone}</a></> : null}</> : "No driver assigned"}</div>

    <div className="tm-times" role="table">
      <span className="tm-th" /><span className="tm-th">Planned</span><span className="tm-th">Actual</span>
      {rows.map(([name, planned, actual, lateText]) => [
        <span key={name + "n"} className="tm-td tm-name">{name}</span>,
        <span key={name + "p"} className="tm-td">{fmt(planned)}</span>,
        <span key={name + "a"} className="tm-td"><b>{fmt(actual)}</b>{lateText ? <em>{lateText}</em> : null}</span>,
      ])}
    </div>

    {b.payment_method === "cash" && b.booking_status === "trip_completed" && <div className="tm-note" style={{ background: b.cash_collection_status === "collected" ? "#EAFBF2" : b.cash_collection_status ? "#FFF1F0" : "#F3F7FA" }}><b>Cash:</b> {b.cash_collection_status === "collected" ? `collected ₹${b.cash_collected_amount ?? b.fare}` : b.cash_collection_status === "partial" ? `part payment ₹${b.cash_collected_amount} of ₹${b.fare} — ${b.cash_collection_note || "no note"}` : b.cash_collection_status === "not_collected" ? `not collected (₹${b.fare} due) — ${b.cash_collection_note || "no note"}` : b.cash_collection_status === "unreported" ? `driver did not report the outcome (₹${b.fare} due)` : "not recorded (completed before cash tracking)"}</div>}
    {[["Late reaching destination", b.outbound_arrival_delay_reason], ["Late start", lateStart && (b.trip_start_delay_reason || "Reason not recorded")], ["Late return", lateReturn && (b.return_trip_start_delay_reason || "Reason not recorded")], ["Late arrival", lateEnd && (b.trip_completion_delay_reason || "Reason not recorded")]].filter(([, r]) => r).map(([label, r]) => <div className="tm-note tm-warn" key={label}><b>{label}:</b> {r}</div>)}
    {alerts.map((a) => <div className="tm-note tm-warn" key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{a.alert_type === "start_overdue" ? "Trip has not started." : a.alert_type === "return_start_overdue" ? "Return has not started." : "Final arrival is overdue."}</span><button onClick={() => onAck(a)} className="tm-link">Acknowledge</button></div>)}

    <div className="tm-actions">
      {live && hasMap && <button className="tm-btn" onClick={() => setOpen((v) => !v)}>{open ? "Hide map" : "Show map"}</button>}
      <button className="tm-btn" onClick={loadEvents}>{showEvents ? "Hide steps" : "Driver steps"}</button>
      <Link className="tm-btn" href={`/admin/bookings?q=${b.id.slice(0, 8).toUpperCase()}`}>Open booking</Link>
    </div>

    {open && hasMap && <div className="tm-map"><AdminLiveMap pickup={{ lat: b.pickup_lat, lon: b.pickup_lon }} destination={{ lat: b.drop_lat, lon: b.drop_lon }} driverLocation={{ lat: location.lat, lon: location.lon }} driverName={driver?.full_name} status={b.booking_status} /><div className="tm-mapnote">Map follows the driver · refreshes every 15 s</div></div>}
    {showEvents && <div className="tm-events">{events === null ? "Loading…" : events.length === 0 ? "No driver steps recorded." : events.map((ev) => <div key={ev.id}><b>{timeOnly(ev.occurred_at)}</b> {pretty(ev.from_status)} → <b>{pretty(ev.to_status)}</b>{ev.delay_minutes ? <span style={{ color: "#8A5700" }}> · {ev.delay_minutes} min late</span> : null}{ev.distance_to_target_m != null ? <span style={{ color: theme.colors.textFaint }}> · {ev.distance_to_target_m} m from {ev.target}</span> : null}{ev.reason ? <div style={{ color: theme.colors.textMuted }}>“{ev.reason}”</div> : null}</div>)}</div>}
  </article>;
}

export default function TripMonitorPage() {
  const [bookings, setBookings] = useState([]), [drivers, setDrivers] = useState({}), [locations, setLocations] = useState({}), [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("live"), [error, setError] = useState(""), [lastCheck, setLastCheck] = useState(null), [loading, setLoading] = useState(true);
  const inflight = useRef(false), lastWatchdog = useRef(0), driverCache = useRef({});

  const load = async ({ force = false } = {}) => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      setError("");
      const now = Date.now();
      // the timing watchdog writes alerts, so run it at most once a minute (not on every 15 s refresh)
      if (force || now - lastWatchdog.current > WATCHDOG_MS) {
        lastWatchdog.current = now;
        const { error: e } = await supabase.rpc("check_trip_timing_alerts");
        if (e) setError(e.message);
      }
      const upcomingUntil = new Date(now + 24 * 3600e3).toISOString();
      const completedSince = new Date(now - 7 * 86400e3).toISOString();
      const [bookingRes, alertRes] = await Promise.all([
        supabase.from("bookings").select(COLUMNS)
          .or(`booking_status.in.(${LIVE.join(",")}),and(booking_status.eq.driver_assigned,scheduled_pickup_at.lte.${upcomingUntil}),and(booking_status.eq.trip_completed,completed_at.gte.${completedSince})`)
          .order("scheduled_pickup_at", { ascending: false, nullsFirst: false }).limit(200),
        supabase.rpc("get_trip_timing_alerts"),
      ]);
      if (bookingRes.error) setError(bookingRes.error.message); else setBookings(bookingRes.data || []);
      if (alertRes.error) setError(alertRes.error.message); else setAlerts(alertRes.data || []);

      const rows = bookingRes.data || [];
      const need = [...new Set(rows.filter((b) => b.driver_id && !driverCache.current[b.driver_id]).map((b) => b.driver_id))];
      if (need.length) {
        const { data } = await supabase.from("drivers").select("id,full_name,phone,vehicles(registration_number,make,model)").in("id", need);
        (data || []).forEach((d) => { driverCache.current[d.id] = d; });
        setDrivers({ ...driverCache.current });
      }
      const liveDrivers = [...new Set(rows.filter((b) => LIVE.includes(b.booking_status) && b.driver_id).map((b) => b.driver_id))];
      if (liveDrivers.length) {
        const { data, error: le } = await supabase.from("driver_current_location").select("driver_id,lat,lon,updated_at").in("driver_id", liveDrivers);
        if (le) setError(le.message); else setLocations(Object.fromEntries((data || []).map((l) => [l.driver_id, l])));
      } else setLocations({});
      setLastCheck(new Date());
    } finally { inflight.current = false; setLoading(false); }
  };

  useEffect(() => {
    load({ force: true });
    const tick = () => { if (document.visibilityState === "visible") load(); };
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingUntil = Date.now() + 24 * 3600e3;
  const isUpcoming = (b) => b.booking_status === "driver_assigned" && b.scheduled_pickup_at && new Date(b.scheduled_pickup_at).getTime() <= upcomingUntil;
  const needsAttention = (b) => alerts.some((a) => a.booking_id === b.id) || b.trip_start_on_time === false || b.return_trip_start_on_time === false || b.trip_completion_on_time === false || cashIssue(b);

  const metrics = useMemo(() => {
    const now = Date.now();
    return {
      onRoad: bookings.filter((b) => ON_ROAD.includes(b.booking_status)).length,
      waiting: bookings.filter((b) => b.booking_status === "waiting_for_return").length,
      upcoming: bookings.filter((b) => b.booking_status === "driver_assigned" && b.scheduled_pickup_at && new Date(b.scheduled_pickup_at).getTime() <= now + 24 * 3600e3).length,
      overdue: bookings.filter((b) => ["driver_assigned", "on_the_way", "arrived"].includes(b.booking_status) && b.scheduled_pickup_at && new Date(b.scheduled_pickup_at).getTime() < now - 10 * 60000).length,
      lateArrivals: bookings.filter((b) => b.trip_completion_on_time === false).length,
      cash: bookings.filter(cashIssue).length,
    };
  }, [bookings, lastCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const order = (b) => LIVE.indexOf(b.booking_status);
    const list = bookings.filter((b) => {
      if (filter === "live") return LIVE.includes(b.booking_status);
      if (filter === "attention") return needsAttention(b);
      if (filter === "upcoming") return isUpcoming(b);
      if (filter === "completed") return b.booking_status === "trip_completed";
      return true;
    });
    if (filter === "live") return [...list].sort((a, b) => (order(b) - order(a)) || String(a.scheduled_pickup_at).localeCompare(String(b.scheduled_pickup_at)));
    if (filter === "upcoming") return [...list].sort((a, b) => String(a.scheduled_pickup_at).localeCompare(String(b.scheduled_pickup_at)));
    if (filter === "completed") return [...list].sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    return list;
  }, [bookings, alerts, filter, lastCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const acknowledge = async (alert) => {
    const { data, error: e } = await supabase.rpc("ack_trip_timing_alert", { p_alert_id: alert.id });
    if (e) return setError(e.message);
    if (!data) return setError("Alert could not be acknowledged.");
    setAlerts((current) => current.filter((a) => a.id !== alert.id));
  };

  const counts = { live: metrics.onRoad + metrics.waiting, attention: bookings.filter(needsAttention).length, upcoming: metrics.upcoming, completed: bookings.filter((b) => b.booking_status === "trip_completed").length, all: bookings.length };
  const tiles = [["On the road", metrics.onRoad, "#6D28D9"], ["At destination", metrics.waiting, "#2563EB"], ["Upcoming 24 h", metrics.upcoming, "#0a7fa6"], ["Overdue to start", metrics.overdue, theme.colors.warning], ["Late arrivals (7 d)", metrics.lateArrivals, theme.colors.error], ["Cash to follow up", metrics.cash, "#b36b00"]];

  return <main className="tm-page">
    <header className="tm-header">
      <div><div className="tm-eyebrow">VOYNU Admin · Live operations</div><h1>Trip monitor</h1><p>Where every active trip is right now, planned vs actual times, and why anything is late.</p></div>
      <div className="tm-headActions"><button className="tm-primary" onClick={() => load({ force: true })}>{loading ? "Loading…" : "Refresh"}</button><Link className="tm-btn" href="/admin/dispatch">Dispatch</Link></div>
    </header>
    {error && <div role="alert" className="tm-error">{error}</div>}

    <section className="tm-tiles">{tiles.map(([label, value, color]) => <div className="tm-tile" key={label}><div>{label}</div><strong style={{ color }}>{value}</strong></div>)}</section>

    <div className="tm-tabs" role="tablist">{TABS.map(([key, label]) => <button role="tab" aria-selected={filter === key} key={key} onClick={() => setFilter(key)} className={filter === key ? "tm-tab on" : "tm-tab"}>{label}<span>{counts[key]}</span></button>)}</div>

    {visible.length === 0 ? <div className="tm-empty">{filter === "live" ? <>No trips are on the road right now.{metrics.upcoming ? <> {metrics.upcoming} assigned for the next 24 hours — <button className="tm-link" onClick={() => setFilter("upcoming")}>view upcoming</button>.</> : null}</> : "No trips match this view."}</div> : <div className="tm-list">{visible.map((b) => <TripCard key={b.id} b={b} driver={drivers[b.driver_id]} location={b.driver_id ? locations[b.driver_id] : null} alerts={alerts.filter((a) => a.booking_id === b.id)} onAck={acknowledge} />)}</div>}
    {lastCheck && <div className="tm-foot">Updated {lastCheck.toLocaleTimeString("en-IN")} · refreshes every 15 s while this tab is open.</div>}

    <style jsx global>{`
      .tm-page{max-width:1080px;margin:0 auto;padding:8px 2px 60px;color:${theme.colors.text};font-family:${theme.fontFamily}}
      .tm-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
      .tm-eyebrow{font-size:11px;color:#6D28D9;font-weight:900;letter-spacing:1px;text-transform:uppercase}
      .tm-header h1{margin:4px 0 0;font-size:26px}
      .tm-header p{margin:5px 0 0;color:${theme.colors.textFaint};font-size:12px;max-width:560px;line-height:1.45}
      .tm-headActions{display:flex;gap:8px}
      .tm-primary{padding:9px 14px;border-radius:10px;border:0;background:#6D28D9;color:#fff;font-weight:800;font-size:13px;cursor:pointer}
      .tm-btn{display:inline-flex;align-items:center;padding:8px 12px;border-radius:9px;border:1px solid ${theme.colors.border};background:#fff;color:${theme.colors.text};font-weight:800;font-size:12px;text-decoration:none;cursor:pointer}
      .tm-link{border:0;background:transparent;color:#6D28D9;font-weight:900;font-size:12px;cursor:pointer;padding:0}
      .tm-error{margin-bottom:12px;padding:11px;border-radius:10px;background:${theme.colors.errorBg};color:${theme.colors.error};font-size:12px}
      .tm-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .tm-tile{background:#fff;border:1px solid ${theme.colors.border};border-radius:14px;padding:12px 14px}
      .tm-tile div{font-size:10px;color:${theme.colors.textFaint};font-weight:900;text-transform:uppercase;letter-spacing:.3px}
      .tm-tile strong{display:block;margin-top:4px;font-size:26px;line-height:1}
      .tm-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;-webkit-overflow-scrolling:touch}
      .tm-tab{flex:0 0 auto;display:inline-flex;gap:7px;align-items:center;padding:8px 12px;border-radius:999px;border:1px solid ${theme.colors.border};background:#fff;font-weight:800;font-size:12px;color:${theme.colors.text};cursor:pointer;white-space:nowrap}
      .tm-tab span{min-width:18px;padding:1px 6px;border-radius:999px;background:#EEF3F7;color:${theme.colors.textMuted};font-size:10.5px;text-align:center}
      .tm-tab.on{background:#6D28D9;border-color:#6D28D9;color:#fff}
      .tm-tab.on span{background:rgba(255,255,255,.22);color:#fff}
      .tm-list{display:grid;gap:12px}
      .tm-empty{padding:26px 18px;background:#fff;border:1px solid ${theme.colors.border};border-radius:14px;color:${theme.colors.textFaint};font-size:13px}
      .tm-card{background:#fff;border:1px solid ${theme.colors.border};border-radius:16px;padding:14px;box-shadow:0 5px 18px rgba(13,27,42,.04);min-width:0}
      .tm-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .tm-route{margin-top:4px;color:${theme.colors.textMuted};font-size:12.5px;overflow-wrap:anywhere}
      .tm-pill{flex:0 0 auto;padding:4px 9px;border-radius:999px;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.3px}
      .tm-steps{display:flex;gap:3px;margin-top:11px}
      .tm-steps i{flex:1;height:5px;border-radius:4px;display:block}
      .tm-now{margin-top:7px;font-size:12.5px}
      .tm-driver{margin-top:6px;font-size:12px;color:${theme.colors.textMuted};overflow-wrap:anywhere}
      .tm-times{display:grid;grid-template-columns:minmax(84px,auto) 1fr 1fr;margin-top:11px;border:1px solid #EEF3F7;border-radius:12px;overflow:hidden;font-size:12px}
      .tm-th{padding:6px 9px;background:#F8FAFC;font-size:9.5px;font-weight:900;text-transform:uppercase;color:${theme.colors.textFaint}}
      .tm-td{padding:7px 9px;border-top:1px solid #EEF3F7;min-width:0}
      .tm-name{color:${theme.colors.textMuted};font-weight:700}
      .tm-td em{display:block;font-style:normal;color:${theme.colors.error};font-size:10.5px;font-weight:800;margin-top:1px}
      .tm-note{margin-top:8px;padding:8px 10px;border-radius:9px;font-size:11.5px;line-height:1.4}
      .tm-warn{background:#FFF7E8;color:#8A5700}
      .tm-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      .tm-map{margin-top:11px;border-radius:12px;overflow:hidden;border:1px solid ${theme.colors.border}}
      .tm-mapnote{padding:6px 10px;font-size:10px;color:${theme.colors.textFaint};background:#F8FAFC}
      .tm-events{margin-top:10px;padding:10px;background:#F8FAFC;border-radius:10px;font-size:11.5px;display:grid;gap:7px}
      .tm-foot{margin-top:12px;font-size:10.5px;color:${theme.colors.textFaint}}
      @media (min-width:760px){.tm-tiles{grid-template-columns:repeat(6,minmax(0,1fr))}.tm-header h1{font-size:28px}.tm-card{padding:16px}.tm-times{grid-template-columns:minmax(120px,auto) 1fr 1fr}}
    `}</style>
  </main>;
}
