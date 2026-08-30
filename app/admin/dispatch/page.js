"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";

const button = { padding: "9px 14px", borderRadius: 7, border: "1px solid #d9e0dc", background: "#fff", fontFamily: "ui-monospace,monospace", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const primary = { ...button, background: "#173c2b", color: "#fff", borderColor: "#173c2b" };

export default function DispatchPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mode, setMode] = useState("manual");
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const [{ data: setting, error: se }, { data: bs, error: be }, { data: ds, error: de }] = await Promise.all([
      supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle(),
      supabase.from("bookings").select("id,booking_status,payment_status,payment_method,travel_date,pickup_time,pickup_name,drop_name,vehicle_type,passenger_count,luggage_count,driver_id,vehicle_category_id").eq("booking_status", "confirmed").is("driver_id", null).order("travel_date").order("pickup_time"),
      supabase.from("drivers").select("id,full_name,availability_status,active,vehicle_id,vehicles(registration_number,category,seating_capacity,luggage_capacity,active,status)").eq("active", true).order("created_at")
    ]);
    if (se) return setError(se.message);
    if (be) return setError(be.message);
    if (de) return setError(de.message);
    setMode(setting?.mode || "manual");
    setBookings(bs || []);
    setDrivers(ds || []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) { window.location.href = "/login"; return; }
      if (!ADMIN_EMAILS.includes(email)) { setChecking(false); return; }
      setAuthorized(true); setChecking(false); await load();
    })();
  }, []);

  const setDispatchMode = async (next) => {
    setBusy(true); setError(""); setMessage("");
    const { data: assignedCount, error: e } = await supabase.rpc("set_dispatch_mode", { p_mode: next });
    setBusy(false);
    if (e) return setError(e.message);
    setMode(next);
    if (next === "automatic") {
      setMessage(`Automatic dispatch is ON. ${Number(assignedCount || 0)} existing payment-ready booking(s) were assigned.`);
    } else {
      setMessage("Automatic dispatch is OFF. New eligible bookings will remain awaiting assignment until you assign a driver manually.");
    }
    await load();
  };

  const autoAssign = async (booking) => {
    setBusy(true); setError(""); setMessage("");
    const { data, error: e } = await supabase.rpc("auto_assign_booking_driver", { p_booking_id: booking.id });
    setBusy(false);
    if (e) return setError(e.message);
    setMessage(`Booking ${booking.id.slice(0, 8).toUpperCase()} assigned successfully.`);
    await load();
    return data;
  };

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking access…</main>;
  if (!authorized) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div><h2>Not authorized</h2><Link href="/admin">Back to admin</Link></div></main>;

  return <main style={{ minHeight: "100vh", background: "#f4f6f5", color: "#1d2b24", fontFamily: "ui-monospace,monospace", padding: 18 }}>
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}><div><h1 style={{ margin: 0, fontSize: 22 }}>VOYNU DISPATCH</h1><p style={{ margin: "5px 0", color: "#66756d", fontSize: 12 }}>Manual or automatic driver assignment.</p></div><Link href="/admin" style={{ ...button, textDecoration: "none" }}>ADMIN DASHBOARD</Link></div>
      {message && <div style={{ padding: 11, background: "#eaf5ed", border: "1px solid #cfe3d4", borderRadius: 7, marginBottom: 12, fontSize: 12 }}>{message}</div>}
      {error && <div style={{ padding: 11, background: "#fff0f0", border: "1px solid #e5caca", borderRadius: 7, marginBottom: 12, color: "#a22", fontSize: 12 }}>{error}</div>}
      <section style={{ background: "#fff", border: "1px solid #d9e0dc", borderRadius: 9, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><strong>Dispatch mode</strong><div style={{ color: "#66756d", fontSize: 11, marginTop: 5 }}>{mode === "automatic" ? "Eligible confirmed and payment-ready bookings will be assigned automatically." : "Bookings remain awaiting assignment until an admin assigns a driver."}</div></div><div style={{ display: "flex", gap: 7 }}><button disabled={busy} onClick={() => setDispatchMode("manual")} style={mode === "manual" ? primary : button}>MANUAL</button><button disabled={busy} onClick={() => setDispatchMode("automatic")} style={mode === "automatic" ? primary : button}>AUTOMATIC</button></div></div>
      </section>
      <section style={{ background: "#fff", border: "1px solid #d9e0dc", borderRadius: 9, padding: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Confirmed bookings awaiting assignment</h2>
        {bookings.length === 0 ? <p style={{ color: "#66756d", fontSize: 12 }}>No confirmed bookings are currently awaiting assignment.</p> : bookings.map(b => <div key={b.id} style={{ borderTop: "1px solid #edf0ee", padding: "12px 0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>#{b.id.slice(0, 8).toUpperCase()}</strong> · {b.pickup_name} → {b.drop_name}<div style={{ color: "#66756d", fontSize: 11, marginTop: 4 }}>{b.travel_date} {b.pickup_time} · {b.vehicle_type} · {b.passenger_count} passenger(s) · {b.luggage_count} luggage · payment: {b.payment_method}/{b.payment_status}</div></div><button disabled={busy || mode !== "automatic"} onClick={() => autoAssign(b)} style={primary}>{mode === "automatic" ? "AUTO ASSIGN" : "AUTO OFF"}</button></div>)}
      </section>
      <section style={{ marginTop: 12, background: "#fff", border: "1px solid #d9e0dc", borderRadius: 9, padding: 16 }}><h2 style={{ margin: "0 0 10px", fontSize: 15 }}>Available drivers</h2>{drivers.filter(d => d.availability_status === "available").map(d => <div key={d.id} style={{ padding: "7px 0", borderTop: "1px solid #edf0ee", fontSize: 12 }}>{d.full_name} · {d.vehicles?.registration_number || "no vehicle"} · {d.vehicles?.category || "—"}</div>)}{drivers.filter(d => d.availability_status === "available").length === 0 && <p style={{ color: "#66756d", fontSize: 12 }}>No drivers are currently available.</p>}</section>
    </div>
  </main>;
}
