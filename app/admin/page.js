"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../lib/theme";

const BOOKING_STATUS_FILTERS = ["all", "pending_payment", "confirmed", "driver_assigned", "on_the_way", "arrived", "trip_started", "trip_completed", "cancelled"];
const TERMINAL_STATUSES = ["trip_completed", "cancelled"];

const shortId = (id) => id ? id.slice(0, 8).toUpperCase() : "";
const shortLocation = (value) => value ? value.split(",")[0].trim() || value : "—";
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const normalizeWhatsApp = (value) => { const digits = String(value || "").replace(/\D/g, ""); return digits.length === 10 ? `91${digits}` : digits; };

const statusStyle = {
  pending_payment: { bg: theme.colors.warningBg, text: theme.colors.warning },
  confirmed: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  driver_assigned: { bg: "#e0edf7", text: "#2563a8" },
  on_the_way: { bg: "#e0edf7", text: "#2563a8" },
  arrived: { bg: "#e0edf7", text: "#2563a8" },
  trip_started: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  trip_completed: { bg: "#e5ede8", text: "#45564c" },
  cancelled: { bg: theme.colors.errorBg, text: theme.colors.error },
};

const tabStyle = (active) => ({ padding: "8px 14px", borderRadius: 6, border: `1px solid ${active ? theme.colors.primary : "#d9e0dc"}`, background: active ? theme.colors.primary : "#fff", color: active ? "#fff" : "#45564c", fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 11, textTransform: "uppercase", cursor: "pointer" });
const inputStyle = { flex: "1 1 140px", minWidth: 0, height: 34, padding: "0 10px", border: "1px solid #d9e0dc", borderRadius: 6, background: "#fff", fontFamily: "ui-monospace, monospace", fontSize: 11.5 };
const buttonStyle = { padding: "6px 10px", borderRadius: 6, border: 0, background: theme.colors.primary, color: "#fff", fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 10.5, cursor: "pointer" };

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pricingVersions, setPricingVersions] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dispatchMode, setDispatchModeState] = useState("manual");
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [assigningBookingId, setAssigningBookingId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [newVehicle, setNewVehicle] = useState({ registration_number: "", make: "", model: "", category: "hatchback", seating_capacity: 4, fuel_type: "petrol" });
  const [newDriver, setNewDriver] = useState({ full_name: "", phone: "", email: "", vehicle_id: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) return router.replace("/login");
      if (!ADMIN_EMAILS.includes(email)) return setChecking(false);
      if (!cancelled) { setAuthorized(true); setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const fetchBookings = async () => {
    const { data, error: e } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (e) return setError(e.message);
    setBookings(data || []);
  };
  const fetchDrivers = async () => {
    const { data, error: e } = await supabase.from("drivers").select("*, vehicles(*)").order("created_at", { ascending: false });
    if (e) return setError(e.message);
    setDrivers(data || []);
  };
  const fetchVehicles = async () => {
    const { data, error: e } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    if (e) return setError(e.message);
    setVehicles(data || []);
  };
  const fetchPricing = async () => {
    const { data: versions, error: ve } = await supabase.from("pricing_versions").select("id,version,name,status,effective_from,created_at").eq("status", "active").order("version", { ascending: false });
    if (ve) return setError(ve.message);
    const { data: rules, error: re } = await supabase.from("pricing_rules").select("*, vehicle_categories(name,slug)").order("created_at", { ascending: false });
    if (re) return setError(re.message);
    const { data: cats, error: ce } = await supabase.from("vehicle_categories").select("id,name,slug,active,bookable,passenger_capacity,luggage_capacity").order("sort_order");
    if (ce) return setError(ce.message);
    setPricingVersions(versions || []); setPricingRules(rules || []); setCategories(cats || []);
  };
  const fetchDispatchMode = async () => {
    const { data, error: e } = await supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle();
    if (e) return setError(e.message);
    setDispatchModeState(data?.mode === "automatic" ? "automatic" : "manual");
  };

  useEffect(() => {
    if (!authorized) return;
    (async () => { setLoading(true); setError(""); await Promise.all([fetchBookings(), fetchDrivers(), fetchVehicles(), fetchPricing(), fetchDispatchMode()]); setLoading(false); })();
  }, [authorized]);

  const currentPricing = useMemo(() => {
    const now = Date.now();
    return pricingVersions.filter(v => !v.effective_from || new Date(v.effective_from).getTime() <= now).sort((a, b) => b.version - a.version)[0] || null;
  }, [pricingVersions]);
  const scheduledPricing = useMemo(() => {
    const now = Date.now();
    return pricingVersions.filter(v => v.effective_from && new Date(v.effective_from).getTime() > now).sort((a, b) => new Date(a.effective_from) - new Date(b.effective_from));
  }, [pricingVersions]);

  const filteredBookings = useMemo(() => {
    let list = statusFilter === "all" ? bookings : bookings.filter(b => b.booking_status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(b => [shortId(b.id), b.passenger_name, b.phone, b.pickup_name, b.drop_name].some(v => String(v || "").toLowerCase().includes(q)));
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => ({
    total: bookings.length,
    awaitingPayment: bookings.filter(b => b.payment_status === "pending").length,
    awaitingAssignment: bookings.filter(b => b.booking_status === "confirmed" && !b.driver_id).length,
    completed: bookings.filter(b => b.booking_status === "trip_completed").length,
    revenue: bookings.filter(b => b.booking_status === "trip_completed").reduce((s, b) => s + Number(b.fare || 0), 0),
  }), [bookings]);

  const assignableDrivers = drivers.filter(d => d.active !== false && d.availability_status === "available");

  const handleDispatchToggle = async () => {
    const next = dispatchMode === "automatic" ? "manual" : "automatic";
    setDispatchBusy(true); setError(""); setNotice("");
    const { data: assignedCount, error: e } = await supabase.rpc("set_dispatch_mode", { p_mode: next });
    setDispatchBusy(false);
    if (e) return setError(e.message);
    setDispatchModeState(next);
    if (next === "automatic") {
      setNotice(`Automatic driver assignment is ON. ${Number(assignedCount || 0)} existing payment-ready booking(s) were assigned.`);
    } else {
      setNotice("Automatic driver assignment is OFF. Eligible bookings will remain awaiting assignment until you assign a driver manually.");
    }
    await Promise.all([fetchBookings(), fetchDrivers()]);
  };

  const confirmPayment = async (booking) => {
    setError(""); setNotice("");
    const { data, error: e } = await supabase.rpc("admin_confirm_payment_and_dispatch", { p_booking_id: booking.id });
    if (e) return setError(e.message);
    const updated = Array.isArray(data) ? data[0] : data;
    if (updated?.id) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...updated } : b));
      if (updated.driver_id) {
        await fetchDrivers();
      }
    } else {
      await fetchBookings();
    }
    setNotice(updated?.driver_id ? `Payment confirmed and driver assigned to #${shortId(booking.id)}.` : `Payment confirmed for #${shortId(booking.id)}.`);
  };

  const assignDriver = async (booking) => {
    if (!selectedDriverId) return setError("Select a driver first.");
    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver) return setError("Driver not found.");
    const { data, error: e } = await supabase.rpc("assign_booking_driver", { p_booking_id: booking.id, p_driver_id: driver.id, p_vehicle_id: driver.vehicle_id });
    if (e) return setError(e.message);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, driver_id: data?.driver_id || driver.id, vehicle_id: data?.vehicle_id || driver.vehicle_id, booking_status: data?.booking_status || "driver_assigned" } : b));
    setAssigningBookingId(null); setSelectedDriverId(""); setNotice(`${driver.full_name} assigned to #${shortId(booking.id)}.`);
  };

  const cancelBooking = async (booking) => {
    if (TERMINAL_STATUSES.includes(booking.booking_status)) return;
    const previousDriverId = booking.driver_id;
    const { error: e } = await supabase.from("bookings").update({ booking_status: "cancelled", driver_id: null, vehicle_id: null }).eq("id", booking.id);
    if (e) return setError(e.message);
    if (previousDriverId) await supabase.from("driver_assignments").update({ status: "cancelled" }).eq("booking_id", booking.id).eq("driver_id", previousDriverId);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, booking_status: "cancelled", driver_id: null, vehicle_id: null } : b));
    setNotice(`Booking #${shortId(booking.id)} cancelled.`);
  };

  const sendWhatsApp = (booking) => {
    const phone = normalizeWhatsApp(booking.phone);
    if (!phone) return setError("This booking does not have a valid WhatsApp phone number.");
    const driver = drivers.find(d => d.id === booking.driver_id);
    const lines = [`Hello ${booking.passenger_name || ""}`, "", `Your VOYNU booking VOY-${shortId(booking.id)} is confirmed.`, `Trip: ${booking.trip_type === "roundtrip" ? "Round Trip" : "One Way"}`, `Pickup: ${booking.pickup_name || "—"}`, `Destination: ${booking.drop_name || "—"}`, `Travel: ${booking.travel_date || "—"} ${booking.pickup_time || ""}`.trim(), `Vehicle: ${booking.vehicle_type || "—"}`, `Passengers: ${booking.passenger_count || "—"}`, `Fare: ₹${Number(booking.fare || 0).toLocaleString("en-IN")}`, `Payment: ${booking.payment_method === "upi" ? "UPI" : "Pay on Pickup"}`];
    if (driver) lines.push(`Driver: ${driver.full_name}${driver.phone ? ` (${driver.phone})` : ""}`);
    lines.push("", "Thank you for choosing VOYNU.");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  };

  const changeDriverAvailability = async (driverId, status) => {
    const { error: e } = await supabase.from("drivers").update({ availability_status: status }).eq("id", driverId);
    if (e) return setError(e.message);
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, availability_status: status } : d));
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    if (!newVehicle.registration_number.trim()) return setError("Registration number is required.");
    const { error: e } = await supabase.from("vehicles").insert({ registration_number: newVehicle.registration_number.trim(), make: newVehicle.make.trim(), model: newVehicle.model.trim(), category: newVehicle.category, seating_capacity: Number(newVehicle.seating_capacity) || 4, fuel_type: newVehicle.fuel_type });
    if (e) return setError(e.message);
    setNewVehicle({ registration_number: "", make: "", model: "", category: "hatchback", seating_capacity: 4, fuel_type: "petrol" });
    await fetchVehicles(); setNotice("Vehicle added.");
  };

  const addDriver = async (event) => {
    event.preventDefault();
    if (!newDriver.full_name.trim() || !newDriver.phone.trim()) return setError("Driver name and phone are required.");
    const { error: e } = await supabase.from("drivers").insert({ full_name: newDriver.full_name.trim(), phone: newDriver.phone.trim(), email: newDriver.email.trim() || null, vehicle_id: newDriver.vehicle_id || null, availability_status: "available" });
    if (e) return setError(e.message);
    setNewDriver({ full_name: "", phone: "", email: "", vehicle_id: "" });
    await fetchDrivers(); setNotice("Driver added.");
  };

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking access…</main>;
  if (!authorized) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><div><h1>Not authorized</h1><Link href="/">Back to home</Link></div></main>;

  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f5", fontFamily: "ui-monospace, monospace", color: theme.colors.text }}>
      <header style={{ background: "#16241d", color: "#fff" }}>
        <div style={{ width: `min(${theme.maxWidth.wide}px, calc(100% - 28px))`, margin: "0 auto", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>VOYNU ADMIN</strong><button onClick={logout} style={{ ...buttonStyle, background: "transparent", border: "1px solid rgba(255,255,255,.25)" }}>LOGOUT</button>
        </div>
      </header>

      <div style={{ width: `min(${theme.maxWidth.wide}px, calc(100% - 28px))`, margin: "0 auto", padding: "18px 0 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 14 }}>
          <StatBox label="TOTAL" value={stats.total} />
          <StatBox label="AWAITING PAYMENT" value={stats.awaitingPayment} accent={theme.colors.warning} />
          <StatBox label="AWAITING ASSIGNMENT" value={stats.awaitingAssignment} accent="#2563a8" />
          <StatBox label="COMPLETED" value={stats.completed} accent="#45564c" />
          <StatBox label="REVENUE" value={`₹${stats.revenue}`} accent={theme.colors.primary} />
        </div>

        <section style={{ ...cardStyle, marginBottom: 14, padding: 14, border: `1px solid ${dispatchMode === "automatic" ? theme.colors.primary : "#d9e0dc"}`, background: dispatchMode === "automatic" ? "#f5fbf7" : "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13 }}>Automatic driver assignment</strong>
                <span style={{ padding: "3px 7px", borderRadius: 10, fontSize: 9.5, fontWeight: 800, background: dispatchMode === "automatic" ? theme.colors.primary : "#e9eeeb", color: dispatchMode === "automatic" ? "#fff" : "#526159" }}>{dispatchMode === "automatic" ? "ON" : "OFF"}</span>
              </div>
              <div style={{ color: "#68766f", fontSize: 10.5, lineHeight: 1.45, marginTop: 5 }}>{dispatchMode === "automatic" ? "Cash/pay-on-pickup bookings assign automatically after confirmation; UPI bookings assign immediately after admin payment verification." : "Manual mode: bookings will wait for an admin to assign a driver."}</div>
            </div>
            <button type="button" disabled={dispatchBusy} onClick={handleDispatchToggle} aria-pressed={dispatchMode === "automatic"} style={{ minWidth: 118, padding: "9px 13px", borderRadius: 20, border: `1px solid ${dispatchMode === "automatic" ? theme.colors.primary : "#cbd5cf"}`, background: dispatchMode === "automatic" ? theme.colors.primary : "#fff", color: dispatchMode === "automatic" ? "#fff" : "#45564c", fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: 10.5, cursor: dispatchBusy ? "wait" : "pointer", opacity: dispatchBusy ? 0.65 : 1 }}>{dispatchBusy ? "UPDATING…" : dispatchMode === "automatic" ? "AUTO ASSIGN: ON" : "AUTO ASSIGN: OFF"}</button>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}><Link href="/admin/dispatch" style={{ ...buttonStyle, textDecoration: "none", background: "#fff", color: "#45564c", border: "1px solid #d9e0dc" }}>OPEN DISPATCH QUEUE</Link></div>
        </section>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {["bookings", "drivers", "vehicles", "pricing"].map(t => <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        {notice && <div style={{ padding: 10, borderRadius: 6, background: theme.colors.primaryTint, color: theme.colors.primary, fontSize: 11.5, marginBottom: 12 }}>{notice}</div>}
        {error && <div style={{ padding: 10, borderRadius: 6, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 11.5, marginBottom: 12 }}>{error}</div>}

        {tab === "bookings" && <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <input placeholder="search: id / name / phone / location" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{BOOKING_STATUS_FILTERS.map(s => <button key={s} onClick={() => setStatusFilter(s)} style={tabStyle(statusFilter === s)}>{s.replace(/_/g, " ")}</button>)}</div>
          </div>
          {loading ? <p>loading...</p> : filteredBookings.length === 0 ? <p style={{ color: theme.colors.textFaint }}>no matching bookings.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredBookings.map(b => {
              const assignedDriver = drivers.find(d => d.id === b.driver_id);
              const sc = statusStyle[b.booking_status] || statusStyle.confirmed;
              const needsPayment = b.payment_method === "upi" && b.payment_status === "pending";
              const needsAssignment = b.booking_status === "confirmed" && !b.driver_id;
              return <div key={b.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong style={{ color: "#8a9790" }}>#{shortId(b.id)} · {formatDate(b.created_at)}</strong><span style={{ padding: "3px 8px", borderRadius: 5, background: sc.bg, color: sc.text, fontSize: 10, fontWeight: 700 }}>{String(b.booking_status || "").replace(/_/g, " ")}</span></div>
                <div style={{ margin: "7px 0" }}>{shortLocation(b.pickup_name)} → {shortLocation(b.drop_name)} · {b.trip_type === "roundtrip" ? "RT" : "OW"} · {b.travel_date} {b.pickup_time} · {b.vehicle_type} · ₹{b.fare}</div>
                <div style={{ color: "#6b7a72", marginBottom: 8 }}>{b.passenger_name} · {b.phone} · {b.payment_method} · payment: <strong>{b.payment_status || "—"}</strong>{assignedDriver && <> · driver: <strong>{assignedDriver.full_name}</strong></>}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {needsPayment && <button style={buttonStyle} onClick={() => confirmPayment(b)}>Confirm payment received</button>}
                  {needsAssignment && assigningBookingId !== b.id && <button style={{ ...buttonStyle, background: "#e0edf7", color: "#2563a8", border: "1px solid #2563a8" }} onClick={() => { setAssigningBookingId(b.id); setSelectedDriverId(""); }}>Assign driver</button>}
                  {b.phone && b.booking_status !== "cancelled" && <button style={{ ...buttonStyle, background: "#eafaf0", color: "#128C4A", border: "1px solid #25D366" }} onClick={() => sendWhatsApp(b)}>Send WhatsApp confirmation</button>}
                  {!TERMINAL_STATUSES.includes(b.booking_status) && <button style={{ ...buttonStyle, background: theme.colors.errorBg, color: theme.colors.error, border: `1px solid ${theme.colors.error}` }} onClick={() => cancelBooking(b)}>Cancel booking</button>}
                </div>
                {assigningBookingId === b.id && <div style={{ marginTop: 10, padding: 10, background: "#f4f6f5", border: "1px solid #d9e0dc", borderRadius: 6 }}>
                  {assignableDrivers.length === 0 ? <p style={{ margin: 0 }}>No drivers available. Add one in Drivers.</p> : <><select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 8 }}><option value="">Select a driver...</option>{assignableDrivers.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.vehicles?.registration_number || "no vehicle"} ({d.vehicles?.category || "—"})</option>)}</select><button style={buttonStyle} onClick={() => assignDriver(b)}>Confirm assignment</button> <button style={{ ...buttonStyle, background: "#fff", color: "#45564c", border: "1px solid #d9e0dc" }} onClick={() => setAssigningBookingId(null)}>Cancel</button></>}
                </div>}
              </div>;
            })}
          </div>}
        </>}

        {tab === "drivers" && <>
          <form onSubmit={addDriver} style={cardStyle}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><input placeholder="Full name" value={newDriver.full_name} onChange={e => setNewDriver({ ...newDriver, full_name: e.target.value })} style={inputStyle} /><input placeholder="Phone" value={newDriver.phone} onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })} style={inputStyle} /><input type="email" placeholder="Login email" value={newDriver.email} onChange={e => setNewDriver({ ...newDriver, email: e.target.value })} style={inputStyle} /><select value={newDriver.vehicle_id} onChange={e => setNewDriver({ ...newDriver, vehicle_id: e.target.value })} style={inputStyle}><option value="">No vehicle yet</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} ({v.category})</option>)}</select><button type="submit" style={buttonStyle}>Add driver</button></div></form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{drivers.map(d => <div key={d.id} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><strong>{d.full_name}</strong> · {d.phone}{d.email && <> · {d.email}</>}{d.vehicles && <> · {d.vehicles.registration_number} ({d.vehicles.category})</>}{!d.user_id && <span style={{ color: theme.colors.warning }}> · no login linked</span>}</div><select value={d.availability_status} onChange={e => changeDriverAvailability(d.id, e.target.value)} style={{ padding: 5, border: "1px solid #d9e0dc", borderRadius: 5 }}><option value="available">available</option><option value="busy">busy</option><option value="offline">offline</option><option value="suspended">suspended</option></select></div></div>)}{drivers.length === 0 && <p>No drivers yet.</p>}</div>
        </>}

        {tab === "vehicles" && <>
          <form onSubmit={addVehicle} style={cardStyle}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><input placeholder="Registration number" value={newVehicle.registration_number} onChange={e => setNewVehicle({ ...newVehicle, registration_number: e.target.value })} style={inputStyle} /><input placeholder="Make" value={newVehicle.make} onChange={e => setNewVehicle({ ...newVehicle, make: e.target.value })} style={inputStyle} /><input placeholder="Model" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} style={inputStyle} /><select value={newVehicle.category} onChange={e => setNewVehicle({ ...newVehicle, category: e.target.value })} style={inputStyle}><option value="hatchback">Hatchback</option><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="ev">EV</option></select><input type="number" placeholder="Seats" value={newVehicle.seating_capacity} onChange={e => setNewVehicle({ ...newVehicle, seating_capacity: e.target.value })} style={{ ...inputStyle, flex: "0 0 80px" }} /><button type="submit" style={buttonStyle}>Add vehicle</button></div></form>
          {vehicles.map(v => <div key={v.id} style={cardStyle}><strong>{v.registration_number}</strong> · {v.make} {v.model} · {v.category} · {v.seating_capacity} seats · {v.fuel_type || "—"}</div>)}{vehicles.length === 0 && <p>No vehicles yet.</p>}
        </>}

        {tab === "pricing" && <PricingDashboard versions={pricingVersions} rules={pricingRules} categories={categories} current={currentPricing} scheduled={scheduledPricing} onRefresh={fetchPricing} />}
      </div>
    </main>
  );
}

function PricingDashboard({ versions, rules, categories, current, scheduled, onRefresh }) {
  const [expanded, setExpanded] = useState(current?.id || "");
  const rulesByVersion = useMemo(() => {
    const map = {};
    rules.forEach(r => { (map[r.pricing_version_id] ||= []).push(r); });
    return map;
  }, [rules]);

  return <>
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: 17 }}>Pricing</h2><p style={{ margin: "6px 0 0", color: "#68766f", fontSize: 12 }}>Pricing is now part of the Admin dashboard. The booking server uses the latest version whose effective date has arrived.</p></div>
        <Link href="/admin/pricing" style={{ ...buttonStyle, textDecoration: "none", display: "inline-block" }}>Open pricing editor</Link>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
      <div style={cardStyle}><div style={labelStyle}>CURRENT VERSION</div><strong>{current ? `V${current.version} · ${current.name}` : "Not configured"}</strong><div style={{ color: "#68766f", fontSize: 11, marginTop: 5 }}>{current ? `Effective ${formatDate(current.effective_from)}` : "—"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>SCHEDULED</div><strong>{scheduled.length}</strong><div style={{ color: "#68766f", fontSize: 11, marginTop: 5 }}>{scheduled.length ? formatDate(scheduled[0].effective_from) : "No future pricing"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>VEHICLE CATEGORIES</div><strong>{categories.filter(c => c.active && c.bookable).length}</strong><div style={{ color: "#68766f", fontSize: 11, marginTop: 5 }}>active & bookable</div></div>
    </div>

    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, fontSize: 14 }}>Pricing versions</h3>
      {versions.map(v => <div key={v.id} style={{ borderTop: "1px solid #e3e8e5", padding: "10px 0" }}>
        <button onClick={() => setExpanded(expanded === v.id ? "" : v.id)} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", fontFamily: "ui-monospace,monospace", textAlign: "left", width: "100%" }}>
          <strong>V{v.version}</strong> · {v.name} · {v.effective_from && new Date(v.effective_from).getTime() > Date.now() ? "SCHEDULED" : "CURRENT/PAST"} · effective {formatDate(v.effective_from)}
        </button>
        {expanded === v.id && <div style={{ marginTop: 9, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><thead><tr><th style={th}>Category</th><th style={th}>Trip</th><th style={th}>Base</th><th style={th}>Per km</th><th style={th}>Driver/day</th><th style={th}>Minimum</th><th style={th}>Round</th></tr></thead><tbody>{(rulesByVersion[v.id] || []).map(r => <tr key={r.id}><td style={td}>{r.vehicle_categories?.name || "—"}</td><td style={td}>{r.trip_type === "roundtrip" ? "Round Trip" : "One Way"}</td><td style={td}>₹{r.base_fare}</td><td style={td}>₹{r.per_km_rate}</td><td style={td}>₹{r.driver_allowance_per_day}</td><td style={td}>₹{r.minimum_fare}</td><td style={td}>{r.rounding_unit}</td></tr>)}</tbody></table></div>}
      </div>)}
      {versions.length === 0 && <p style={{ color: "#68766f" }}>No pricing versions found.</p>}
    </div>
  </>;
}

function StatBox({ label, value, accent = theme.colors.text }) { return <div style={cardStyle}><div style={labelStyle}>{label}</div><div style={{ fontSize: 18, fontWeight: 800, color: accent, marginTop: 2 }}>{value}</div></div>; }
const cardStyle = { padding: "12px 14px", borderRadius: 8, background: "#fff", border: "1px solid #d9e0dc", fontSize: 11.5, marginBottom: 10 };
const labelStyle = { fontSize: 9.5, color: "#8a9790", fontWeight: 700, letterSpacing: .4 };
const th = { textAlign: "left", padding: "6px 5px", borderBottom: "1px solid #d9e0dc" };
const td = { padding: "6px 5px", borderBottom: "1px solid #eef1ef" };
