"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { theme } from "../../../../shared/lib/theme";
import PageHeader from "../../../../shared/components/PageHeader";

function IconCheckBig() { return (<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>); }
function IconPhoneCall({ size = 15 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>); }
function bookingReference(id) { return id ? `VOY-${String(id).slice(0, 8).toUpperCase()}` : "—"; }
function isUpiPending(booking) { return booking?.paymentMethod === "upi" && booking?.paymentStatus !== "paid"; }
function paymentLabel(booking) { if (booking?.paymentMethod !== "upi") return "Pay on Pickup"; return booking?.paymentStatus === "paid" ? "UPI — Paid" : "UPI — Verification pending"; }
function statusCopy(booking) { if (isUpiPending(booking)) return { title: "Booking Received!", message: "Your booking has been saved successfully. Your UPI payment is awaiting verification, and our team will contact you 1 hour before your journey to confirm the pickup details.", badge: "Payment verification pending" }; return { title: "Booking Confirmed!", message: "Your booking has been received successfully. Our team will contact you 1 hour before your journey to confirm the pickup details.", badge: "Booking confirmed" }; }

export default function BookingConfirmedPage() {
  const router = useRouter(); const [booking, setBooking] = useState(null); const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const raw = sessionStorage.getItem("voynu_confirmed_booking"); if (raw) setBooking(JSON.parse(raw)); } catch (error) { console.error("VOYNU: unable to read confirmed booking:", error); } finally { setLoaded(true); } }, []);
  useEffect(() => { if (loaded && !booking) router.replace("/"); }, [loaded, booking, router]);
  if (loaded && !booking) return null;
  if (!loaded || !booking) return (<main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.colors.bg }}><div style={{ width: 34, height: 34, border: "3px solid rgba(8,120,63,0.18)", borderTopColor: theme.colors.primary, borderRadius: "50%" }} /></main>);

  const isRoundTrip = booking.tripType === "roundtrip";
  const reference = bookingReference(booking.bookingId || booking.selectedFare?.serverBookingId);
  const passengerCount = Number(booking.passengerCount) || 1;
  const luggageCount = Number(booking.luggageCount) || 0;
  const copy = statusCopy(booking); const fare = booking.selectedFare || {};
  const billedDistanceKm = Number(fare.billedDistanceKm); const baseFare = Number(fare.baseFare) || 0; const distanceFare = Number(fare.distanceFare) || 0; const driverAllowance = Number(fare.driverAllowance) || 0;
  const waitingFee = Number(fare.waitingFee) || 0; const waitingMinutes = Number(fare.waitingMinutes) || 0; const waitingIntervalMinutes = Number(fare.waitingIntervalMinutes) || 15; const waitingFeePerInterval = Number(fare.waitingFeePerInterval) || 0;
  const totalFare = Number(fare.totalFare) || 0;
  const itemizedSubtotal = baseFare + distanceFare + driverAllowance + waitingFee;
  const minimumFareAdjustment = Math.max(0, totalFare - itemizedSubtotal);

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>
      <PageHeader maxWidth={theme.maxWidth.content} showWhatsapp={false} />
      <div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", padding: "32px 0 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}><div style={{ width: 68, height: 68, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "linear-gradient(135deg, #1fa855, #0a7d42)", color: "#ffffff", boxShadow: "0 14px 30px rgba(31,168,85,0.28)" }}><IconCheckBig /></div><h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{copy.title}</h1><p style={{ maxWidth: 560, margin: "0 auto", color: theme.colors.textMuted, fontSize: 13.5, lineHeight: 1.55 }}>{copy.message}</p></div>
        <div style={{ marginBottom: 14, padding: "13px 16px", borderRadius: theme.radius.lg, background: theme.colors.primaryTint, border: `1px solid ${theme.colors.border}`, textAlign: "center" }}><div style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Booking reference</div><div style={{ marginTop: 3, color: theme.colors.primary, fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>{reference}</div><div style={{ marginTop: 7, color: theme.colors.textMuted, fontSize: 11.5, fontWeight: 700 }}>{copy.badge}</div></div>
        <div style={{ padding: 20, borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}><div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.primary, flexShrink: 0 }} /><div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>{booking.pickup?.name}</div></div>
          <div style={{ width: 1.5, height: 16, marginLeft: 4.25, background: "#dbe6df" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}><div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.accent, flexShrink: 0 }} /><div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>{booking.drop?.name}</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${theme.colors.border}` }}><DetailCell label="Trip type" value={isRoundTrip ? "Round Trip" : "One Way"} /><DetailCell label="Distance" value={booking.journey?.oneWayDistanceText} /><DetailCell label="Travel date" value={booking.travelDate} /><DetailCell label="Pickup time" value={booking.pickupTime} /><DetailCell label="Cab type" value={booking.selectedFare?.vehicleName} /><DetailCell label="Fare" value={`₹${totalFare}`} /><DetailCell label="Payment" value={paymentLabel(booking)} /><DetailCell label="Passengers" value={String(passengerCount)} /><DetailCell label="Luggage" value={String(luggageCount)} /></div>
          {isRoundTrip && <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${theme.colors.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><DetailCell label="Return date" value={booking.returnDate} /><DetailCell label="Return time" value={booking.returnTime} /></div>}
        </div>
        <section style={{ marginTop: 14, padding: 18, borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}><div style={{ fontSize: 14, fontWeight: 800 }}>Fare breakup</div><div style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700 }}>Transparent pricing</div></div>
          <FareRow label="Base fare" value={baseFare} />
          <FareRow label={`Distance${Number.isFinite(billedDistanceKm) ? ` (${billedDistanceKm.toFixed(1)} km)` : ""}`} value={distanceFare} />
          {driverAllowance > 0 && <FareRow label="Driver allowance" value={driverAllowance} />}
          {waitingFee > 0 && <div style={{ padding: "8px 0", color: theme.colors.textMuted, fontSize: 12.5 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Round-trip waiting ({waitingMinutes} min)</span><span>₹{waitingFee.toFixed(2)}</span></div><div style={{ marginTop: 3, color: theme.colors.textFaint, fontSize: 10.5 }}>₹{waitingFeePerInterval.toFixed(0)} per {waitingIntervalMinutes} minutes</div></div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 7, paddingTop: 13, borderTop: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, fontSize: 13, fontWeight: 700 }}><span>Itemized subtotal</span><span>₹{itemizedSubtotal.toFixed(2)}</span></div>
          {minimumFareAdjustment > 0.009 && <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", color: theme.colors.warning, fontSize: 12.5, fontWeight: 700 }}><span>Minimum fare adjustment</span><span>₹{minimumFareAdjustment.toFixed(2)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 7, paddingTop: 13, borderTop: `1px solid ${theme.colors.border}`, color: theme.colors.text, fontSize: 16, fontWeight: 800 }}><span>Total fare</span><span>₹{totalFare.toFixed(2)}</span></div>
          <div style={{ marginTop: 9, color: theme.colors.textFaint, fontSize: 10.5, lineHeight: 1.45 }}>No hidden charges. Round-trip waiting is calculated from estimated arrival until your requested return time and rounded up to the configured interval.</div>
        </section>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 22, padding: "16px 18px", borderRadius: theme.radius.lg, background: theme.colors.warningBg, border: "1px solid #f0dfa8" }}><div style={{ width: 36, height: 36, flex: "0 0 36px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "#f7e3ac", color: theme.colors.warning }}><IconPhoneCall size={17} /></div><div><div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.warning }}>Need help before your journey?</div><div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: "#8a6b1c" }}>Your booking details are already with the VOYNU team. If you need to make a change, please contact us and quote your booking reference.</div></div></div>
        <Link href="/" style={{ display: "block", marginTop: 22, textAlign: "center", color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>Book another ride</Link>
      </div>
    </main>
  );
}
function FareRow({ label, value }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", color: theme.colors.textMuted, fontSize: 12.5 }}><span>{label}</span><span>₹{Number(value || 0).toFixed(2)}</span></div>; }
function DetailCell({ label, value }) { return (<div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span><span style={{ color: theme.colors.text, fontSize: 13, fontWeight: 700 }}>{value || "—"}</span></div>); }
