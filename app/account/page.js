"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { buildWhatsAppLink } from "../lib/contact";
import { theme } from "../lib/theme";
import PageHeader from "../components/PageHeader";

function IconLogout({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>;
}

function shortLocationName(fullAddress) {
  if (!fullAddress) return "";
  return fullAddress.split(",")[0].trim() || fullAddress;
}

function shortBookingId(id) {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

function statusColor(status) {
  if (status === "cancelled") return { bg: theme.colors.errorBg, text: theme.colors.error };
  if (status === "trip_completed") return { bg: "#e5ede8", text: "#45564c" };
  if (["on_the_way", "arrived"].includes(status)) return { bg: theme.colors.warningBg, text: theme.colors.warning };
  return { bg: theme.colors.primaryTint, text: theme.colors.primary };
}

function statusLabel(status) {
  return ({
    pending_payment: "Payment pending",
    confirmed: "Booking confirmed",
    driver_assigned: "Driver assigned",
    on_the_way: "Driver on the way",
    arrived: "Driver arrived",
    trip_started: "Trip started",
    trip_completed: "Trip completed",
    cancelled: "Cancelled",
  })[status] || "Booking update";
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const a = [lat1, lon1, lat2, lon2].map(Number);
  if (!a.every(Number.isFinite)) return null;
  const [p1, l1, p2, l2] = a;
  const rad = Math.PI / 180;
  const dLat = (p2 - p1) * rad;
  const dLon = (l2 - l1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(p1 * rad) * Math.cos(p2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function estimatedMinutes(distanceKm) {
  if (!Number.isFinite(distanceKm)) return null;
  return Math.max(1, Math.ceil((distanceKm / 30) * 60));
}

// A booking is active only once operations have actually started.
// Driver assignment by itself does not make a future booking an active journey.
const ACTIVE_STATUSES = ["on_the_way", "arrived", "trip_started"];
const PAST_STATUSES = ["trip_completed", "cancelled"];

export default function AccountPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [driverDetails, setDriverDetails] = useState({});

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) { router.replace("/login"); return; }
      if (!cancelled) { setUser(data.session.user); setChecking(false); }
    };
    checkSession();
    return () => { cancelled = true; };
  }, [router]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoadingBookings(true);
    const { data } = await supabase.from("bookings").select("*").eq("user_id", user.id).order("travel_date", { ascending: false });
    setLoadingBookings(false);
    setBookings(data || []);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`voynu-customer-bookings-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, (payload) => {
        setBookings((current) => current.map((b) => b.id === payload.new.id ? payload.new : b));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadDrivers = async () => {
      const assigned = bookings.filter((b) => b.driver_id && ACTIVE_STATUSES.includes(b.booking_status));
      if (!assigned.length) { setDriverDetails({}); return; }
      const entries = await Promise.all(assigned.map(async (booking) => {
        const { data } = await supabase.rpc("get_my_booking_driver", { p_booking_id: booking.id });
        return [booking.id, data || null];
      }));
      if (!cancelled) setDriverDetails(Object.fromEntries(entries));
    };
    loadDrivers();
    return () => { cancelled = true; };
  }, [user, bookings]);

  useEffect(() => {
    const driverIds = [...new Set(Object.values(driverDetails).map((d) => d?.driverId).filter(Boolean))];
    if (!driverIds.length) return;
    const channels = driverIds.map((driverId) => supabase.channel(`voynu-customer-location-${driverId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "driver_current_location", filter: `driver_id=eq.${driverId}` }, (payload) => {
        setDriverDetails((current) => Object.fromEntries(Object.entries(current).map(([bookingId, detail]) => detail?.driverId === driverId ? [bookingId, { ...detail, location: { lat: payload.new.lat, lon: payload.new.lon, updatedAt: payload.new.updated_at } }] : [bookingId, detail])));
      }).subscribe());
    return () => channels.forEach((channel) => supabase.removeChannel(channel));
  }, [driverDetails]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const today = new Date().toISOString().slice(0, 10);
  const activeBookings = useMemo(() => bookings.filter((b) => ACTIVE_STATUSES.includes(b.booking_status)), [bookings]);
  const pastBookings = useMemo(() => bookings.filter((b) => PAST_STATUSES.includes(b.booking_status)), [bookings]);
  const upcomingBookings = useMemo(() => bookings.filter((b) => !ACTIVE_STATUSES.includes(b.booking_status) && !PAST_STATUSES.includes(b.booking_status) && b.travel_date >= today), [bookings, today]);

  const renderDriverCard = (booking) => {
    const driver = driverDetails[booking.id];
    if (!driver) return null;
    const distance = driver.location ? haversineKm(driver.location.lat, driver.location.lon, booking.pickup_lat, booking.pickup_lon) : null;
    const eta = estimatedMinutes(distance);
    return <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 12, background: "#f7faf8", border: `1px solid ${theme.colors.border}` }}>
      <div style={{ fontSize: 11, color: theme.colors.textFaint, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>Your driver</div>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 800 }}>{driver.driverName || "Driver assigned"}</div>
      <div style={{ marginTop: 3, fontSize: 12, color: theme.colors.textMuted }}>{driver.make || ""} {driver.model || ""} · {driver.registrationNumber || "Vehicle details unavailable"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
        {driver.driverPhone && <a href={`tel:${driver.driverPhone}`} style={{ padding: "6px 10px", borderRadius: 20, background: "#ffffff", border: `1px solid ${theme.colors.border}`, color: theme.colors.primary, fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Call driver</a>}
        {driver.location && <span style={{ padding: "6px 10px", borderRadius: 20, background: theme.colors.primaryTint, color: theme.colors.primary, fontSize: 11, fontWeight: 800 }}>{distance != null ? `${distance.toFixed(1)} km from pickup` : "Live location active"}</span>}
        {eta != null && <span style={{ padding: "6px 10px", borderRadius: 20, background: "#ffffff", border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, fontSize: 11, fontWeight: 800 }}>ETA ~{eta} min</span>}
      </div>
      {driver.location?.updatedAt && <div style={{ marginTop: 7, fontSize: 10.5, color: theme.colors.textFaint }}>Last location update: {new Date(driver.location.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}
    </div>;
  };

  const renderFareBreakdown = (booking) => {
    const breakdown = booking.fare_breakdown;
    if (!breakdown) return null;
    const baseFare = Number(breakdown.baseFare) || 0;
    const distanceFare = Number(breakdown.distanceFare) || 0;
    const driverAllowance = Number(breakdown.driverAllowance) || 0;
    const billedDistanceKm = Number(breakdown.billedDistanceKm);
    return <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 12, background: "#f7faf8", border: `1px solid ${theme.colors.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
        <div style={{ fontSize: 11, color: theme.colors.text, fontWeight: 800 }}>Fare breakup</div>
        <div style={{ fontSize: 10, color: theme.colors.textFaint, fontWeight: 700 }}>Transparent pricing</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", color: theme.colors.textMuted, fontSize: 11.5 }}><span>Base fare</span><span>₹{baseFare}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", color: theme.colors.textMuted, fontSize: 11.5 }}><span>Distance{Number.isFinite(billedDistanceKm) ? ` (${billedDistanceKm.toFixed(1)} km)` : ""}</span><span>₹{distanceFare}</span></div>
      {driverAllowance > 0 && <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", color: theme.colors.textMuted, fontSize: 11.5 }}><span>Driver allowance</span><span>₹{driverAllowance}</span></div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 5, paddingTop: 9, borderTop: `1px solid ${theme.colors.border}`, color: theme.colors.text, fontSize: 13, fontWeight: 800 }}><span>Total fare</span><span>₹{booking.fare}</span></div>
    </div>;
  };

  const renderBookingCard = (b) => {
    const status = statusColor(b.booking_status);
    const active = ACTIVE_STATUSES.includes(b.booking_status);
    return <div key={b.id} style={{ padding: "16px 18px", borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: "0 8px 20px rgba(10,40,25,0.05)", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.colors.textFaint, letterSpacing: 0.3 }}>BOOKING #{shortBookingId(b.id)}</span>
        <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: status.bg, color: status.text }}>{statusLabel(b.booking_status)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.primary }} /><span style={{ fontSize: 14.5, fontWeight: 700 }}>{shortLocationName(b.pickup_name)}</span><span style={{ color: "#a3b0aa" }}>→</span><div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} /><span style={{ fontSize: 14.5, fontWeight: 700 }}>{shortLocationName(b.drop_name)}</span></div>
      <div style={{ fontSize: 11, color: theme.colors.textFaint, marginBottom: 10, lineHeight: 1.5 }}>{b.pickup_name} → {b.drop_name}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}><InfoChip label={b.trip_type === "roundtrip" ? "Round Trip" : "One Way"} /><InfoChip label={`${b.travel_date} • ${b.pickup_time}`} /><InfoChip label={b.vehicle_type} />{b.one_way_distance_km && <InfoChip label={`${Number(b.one_way_distance_km).toFixed(1)} km`} />}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px dashed ${theme.colors.border}` }}><div><div style={{ fontSize: 10.5, color: theme.colors.textFaint, fontWeight: 700 }}>{b.payment_method === "upi" ? "UPI Payment" : "Pay on Pickup"}</div><div style={{ fontSize: 10, color: "#a3b0aa", marginTop: 1 }}>{b.payment_status === "paid" ? "Paid" : b.payment_method === "upi" ? "Verification pending" : "To pay"}</div></div><div style={{ fontSize: 18, fontWeight: 800, color: theme.colors.primary }}>₹{b.fare}</div></div>
      {renderFareBreakdown(b)}
      {active && renderDriverCard(b)}
    </div>;
  };

  if (checking) return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.colors.bg }}><div style={{ width: 34, height: 34, border: "3px solid rgba(8,120,63,0.18)", borderTopColor: theme.colors.primary, borderRadius: "50%" }} /></main>;

  return <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>
    <PageHeader maxWidth={theme.maxWidth.content} showAccountLink={false} whatsappHref={buildWhatsAppLink("Hi VOYNU, I need help with my account/booking.")} />
    <div style={{ background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}` }}><div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "flex-end" }}><button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", margin: "8px 0", borderRadius: 20, border: `1.5px solid ${theme.colors.border}`, background: "#ffffff", color: "#45564c", fontFamily: theme.fontFamily, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}><IconLogout size={12} />Log out</button></div></div>
    <div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", padding: "24px 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}><div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: theme.gradients.primary, color: "#ffffff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{(user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase()}</div><div><div style={{ fontSize: 15, fontWeight: 800 }}>{user?.user_metadata?.full_name || "VOYNU Customer"}</div><div style={{ fontSize: 12, color: theme.colors.textFaint, marginTop: 2 }}>{user?.email}</div></div></div>
      <h2 style={{ margin: "24px 0 12px", fontSize: 15, fontWeight: 800 }}>Active journeys</h2>
      {loadingBookings ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>Loading...</p> : activeBookings.length === 0 ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>No active journeys.</p> : activeBookings.map(renderBookingCard)}
      <h2 style={{ margin: "24px 0 12px", fontSize: 15, fontWeight: 800 }}>Upcoming journeys</h2>
      {loadingBookings ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>Loading...</p> : upcomingBookings.length === 0 ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>No upcoming bookings.</p> : upcomingBookings.map(renderBookingCard)}
      <h2 style={{ margin: "24px 0 12px", fontSize: 15, fontWeight: 800 }}>Past journeys</h2>
      {loadingBookings ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>Loading...</p> : pastBookings.length === 0 ? <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>No past bookings yet.</p> : pastBookings.map(renderBookingCard)}
      <a href={buildWhatsAppLink("Hi VOYNU, I need help with my account/booking.")} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 26, textAlign: "center", color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>Need help? Chat with us on WhatsApp</a>
    </div>
  </main>;
}

function InfoChip({ label }) {
  return <span style={{ padding: "5px 10px", borderRadius: 20, background: "#f4f6f4", border: `1px solid ${theme.colors.border}`, color: "#45564c", fontSize: 11, fontWeight: 700 }}>{label}</span>;
}
