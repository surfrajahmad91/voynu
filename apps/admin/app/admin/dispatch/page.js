"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const POLL_MS = 20000;

const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const btn = { border: 0, borderRadius: 10, padding: "0 16px", minHeight: 40, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", font: "inherit" };
const ghost = { ...btn, background: c.surface, color: c.text, border: `1px solid ${c.borderStrong}` };
const field = { minHeight: 40, padding: "0 10px", border: `1px solid ${c.borderStrong}`, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const shortId = (id) => id.slice(0, 8).toUpperCase();
const timeAgo = (d) => {
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  return mins < 1 ? "Updated just now" : `Updated ${mins}m ago`;
};

export default function DispatchPage() {
  const [mode, setMode] = useState("manual");
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pick, setPick] = useState({});
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [{ data: setting, error: se }, { data: bs, error: be }, { data: ds, error: de }] = await Promise.all([
      supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle(),
      supabase.from("bookings").select("id,booking_status,payment_status,payment_method,travel_date,pickup_time,pickup_name,drop_name,vehicle_type,passenger_count,luggage_count,driver_id,vehicle_category_id").eq("booking_status", "confirmed").is("driver_id", null).order("travel_date").order("pickup_time"),
      supabase.from("drivers").select("id,full_name,availability_status,active,vehicle_id,vehicles(registration_number,category,seating_capacity,luggage_capacity,active,status)").eq("active", true).order("created_at"),
    ]);
    setLoading(false);
    const firstError = se || be || de;
    if (firstError) return setError(firstError.message);
    setMode(setting?.mode || "manual");
    setBookings(bs || []);
    setDrivers(ds || []);
    setLoadedAt(new Date());
  }, []);

  useEffect(() => { load(false); }, [load]);

  // Keep the queue fresh while the tab is open, without disturbing an in-progress driver pick.
  useEffect(() => {
    const tick = () => { if (!document.hidden && !busy) load(true); };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [busy, load]);

  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }, [message]);

  const setDispatchMode = async (next) => {
    if (next === mode) return;
    setBusy(true); setError(""); setMessage("");
    const { data: assignedCount, error: e } = await supabase.rpc("set_dispatch_mode", { p_mode: next });
    setBusy(false);
    if (e) return setError(e.message);
    setMode(next);
    setMessage(next === "automatic" ? `Automatic dispatch is on — ${Number(assignedCount || 0)} existing payment-ready booking(s) were assigned.` : "Automatic dispatch is off. New eligible bookings stay awaiting assignment until assigned manually.");
    load(true);
  };

  const autoAssign = async (booking) => {
    setBusy(true); setError(""); setMessage("");
    const { data, error: e } = await supabase.rpc("auto_assign_booking_driver", { p_booking_id: booking.id });
    setBusy(false);
    if (e) return setError(e.message);
    if (!data?.driver_id && !data?.id) return setError("No eligible driver with an assigned active vehicle was found.");
    setMessage(`Booking #${shortId(booking.id)} assigned automatically.`);
    load(true);
  };

  const manualAssign = async (booking) => {
    const driver = drivers.find((d) => d.id === pick[booking.id]);
    if (!driver?.vehicle_id) return setError("Choose a driver who has an active assigned vehicle.");
    setBusy(true); setError(""); setMessage("");
    const { error: e } = await supabase.rpc("assign_booking_driver", { p_booking_id: booking.id, p_driver_id: driver.id, p_vehicle_id: driver.vehicle_id });
    setBusy(false);
    if (e) return setError(e.message.replace(/^VOYNU:\s*/, ""));
    setMessage(`${driver.full_name} assigned to #${shortId(booking.id)}.`);
    setPick((prev) => { const next = { ...prev }; delete next[booking.id]; return next; });
    load(true);
  };

  const assignableDrivers = useMemo(() => drivers.filter((d) => d.availability_status === "available" && d.vehicle_id && d.vehicles?.active !== false && d.vehicles?.status === "active"), [drivers]);
  const excludedDrivers = useMemo(() => drivers.filter((d) => d.availability_status === "available" && (!d.vehicle_id || !d.vehicles || d.vehicles.active === false || d.vehicles.status !== "active")), [drivers]);

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, margin: "6px 0 16px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 }}>Dispatch</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: c.textFaint, fontWeight: 600 }}>{loadedAt ? timeAgo(loadedAt) : "Loading…"}</p>
        </div>
        <button onClick={() => load(false)} aria-label="Refresh" disabled={loading} style={{ ...ghost, width: 44, padding: 0, fontSize: 18, opacity: loading ? 0.6 : 1, flexShrink: 0 }}>↻</button>
      </header>

      <section style={{ ...card, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Dispatch mode</h2>
        <p style={{ margin: "4px 0 12px", fontSize: 13, color: c.textMuted, lineHeight: 1.5 }}>{mode === "automatic" ? "Eligible confirmed, payment-ready bookings are assigned automatically." : "Bookings stay in the queue below until an admin assigns a driver."}</p>
        <div role="group" aria-label="Dispatch mode" style={{ display: "inline-flex", padding: 3, borderRadius: 12, background: c.bg, border: `1px solid ${c.border}` }}>
          {["manual", "automatic"].map((m) => <button key={m} disabled={busy} onClick={() => setDispatchMode(m)} aria-pressed={mode === m} style={{ minHeight: 38, padding: "0 18px", borderRadius: 9, border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, textTransform: "capitalize", background: mode === m ? c.primary : "transparent", color: mode === m ? "#fff" : c.textMuted }}>{m}</button>)}
        </div>
      </section>

      <section style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, paddingBottom: bookings.length ? 6 : 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Awaiting assignment</h2>
            <span style={{ fontSize: 12, fontWeight: 800, color: bookings.length ? "#8A5700" : c.textFaint, background: bookings.length ? c.warningBg : c.bg, borderRadius: 999, padding: "2px 10px" }}>{loading ? "…" : bookings.length}</span>
          </div>
          {!loading && bookings.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: c.textFaint }}>No confirmed bookings are currently awaiting assignment.</p>}
        </div>
        {bookings.map((b) => <div key={b.id} style={{ padding: 16, borderTop: `1px solid ${c.border}`, display: "grid", gap: 10 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <strong style={{ fontSize: 14 }}>{b.pickup_name} <span style={{ color: c.textFaint }}>→</span> {b.drop_name}</strong>
              <span style={{ fontSize: 11.5, color: c.textFaint, fontWeight: 700, flexShrink: 0 }}>#{shortId(b.id)}</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 12.5, color: c.textMuted }}>{b.travel_date} {b.pickup_time} · {b.vehicle_type} · {b.passenger_count} pax · {b.luggage_count} luggage · {b.payment_method}/{b.payment_status}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={pick[b.id] || ""} onChange={(e) => setPick((prev) => ({ ...prev, [b.id]: e.target.value }))} style={{ ...field, flex: "1 1 200px" }}>
              <option value="">Choose driver…</option>
              {assignableDrivers.map((d) => <option key={d.id} value={d.id}>{d.full_name} · {d.vehicles?.registration_number || "—"}</option>)}
            </select>
            <button disabled={busy || !pick[b.id]} onClick={() => manualAssign(b)} style={{ ...btn, opacity: busy || !pick[b.id] ? 0.6 : 1 }}>Assign</button>
            <button disabled={busy || mode !== "automatic"} onClick={() => autoAssign(b)} title={mode === "automatic" ? "Let the dispatcher pick" : "Turn on automatic dispatch to use this"} style={{ ...ghost, opacity: busy || mode !== "automatic" ? 0.5 : 1 }}>Auto</button>
          </div>
        </div>)}
      </section>

      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, paddingBottom: assignableDrivers.length ? 6 : 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Available drivers</h2>
            <span style={{ fontSize: 12, fontWeight: 800, color: c.textFaint, background: c.bg, borderRadius: 999, padding: "2px 10px" }}>{loading ? "…" : assignableDrivers.length}</span>
          </div>
          {!loading && assignableDrivers.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: c.textFaint }}>No drivers are currently eligible for assignment.</p>}
        </div>
        {assignableDrivers.map((d) => <div key={d.id} style={{ padding: "10px 16px", borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}><strong style={{ fontWeight: 700 }}>{d.full_name}</strong><span style={{ color: c.textFaint }}>{d.vehicles?.registration_number} · {d.vehicles?.category || "—"}</span></div>)}
        {excludedDrivers.length > 0 && <div style={{ margin: 16, marginTop: assignableDrivers.length ? 4 : 16, padding: "10px 12px", borderRadius: 10, background: c.warningBg, color: "#8A5700", fontSize: 12.5, fontWeight: 700 }}>{excludedDrivers.length} available driver{excludedDrivers.length > 1 ? "s are" : " is"} excluded — no active assigned vehicle.</div>}
      </section>
    </div>

    {(error || message) && <div role={error ? "alert" : "status"} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", margin: "0 auto", maxWidth: 520, zIndex: 130, padding: "12px 14px", borderRadius: 12, background: error ? "#B42318" : c.navy, color: "#fff", fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: theme.shadow.card }}>
      <span>{error || message}</span>
      <button onClick={() => { setError(""); setMessage(""); }} aria-label="Dismiss" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>}
  </main>;
}
