"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateAllFares } from "../lib/fareRules";
import { buildWhatsAppLink } from "../lib/contact";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import PageHeader from "../components/PageHeader";
import { validateCapacity } from "../../lib/capacityValidation";

const VOYNU_UPI_VPA = "voynu@upi";

function IconCheck({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}
function IconWhatsApp({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>;
}
function IconUsers({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 8.5a3 3 0 1 1 3.6 2.9" /><path d="M17.5 14.6c2.6.3 4 2 4 5.4" /></svg>;
}
function IconCash({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="3" /></svg>;
}
function IconUpi({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
}

export default function CabSelectionPage() {
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [luggageCount, setLuggageCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [upiPayClicked, setUpiPayClicked] = useState(false);
  const [upiPaymentConfirmed, setUpiPaymentConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [capacityError, setCapacityError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("voynu_booking");
      if (raw) {
        const parsed = JSON.parse(raw);
        setBooking(parsed);
        setPassengerCount(Math.max(1, Number(parsed?.passengerCount) || 1));
        setLuggageCount(Math.max(0, Number(parsed?.luggageCount) || 0));
      }
    } catch (error) {
      console.error("VOYNU: unable to read booking data:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && !booking) router.replace("/");
  }, [loaded, booking, router]);

  const fares = useMemo(() => {
    if (!booking || !Number.isFinite(Number(booking?.journey?.oneWayDistanceKm))) return [];
    return calculateAllFares({ oneWayDistanceKm: booking.journey.oneWayDistanceKm, tripType: booking.tripType });
  }, [booking]);

  const eligibleFares = useMemo(() => fares.filter((fare) => validateCapacity({
    passengerCount,
    luggageCount,
    passengerCapacity: fare.capacity,
    luggageCapacity: fare.luggageCapacity,
  }).valid), [fares, passengerCount, luggageCount]);

  useEffect(() => {
    if (!eligibleFares.length) {
      setSelectedVehicleId(null);
      return;
    }
    if (!eligibleFares.some((fare) => fare.vehicleTypeId === selectedVehicleId)) {
      setSelectedVehicleId(eligibleFares[0].vehicleTypeId);
    }
  }, [eligibleFares, selectedVehicleId]);

  useEffect(() => {
    const result = selectedVehicleId ? eligibleFares.find((f) => f.vehicleTypeId === selectedVehicleId) : null;
    if (!result) {
      setCapacityError(eligibleFares.length ? "Please select a suitable vehicle category." : "No vehicle category can accommodate this passenger and luggage requirement.");
    } else {
      setCapacityError("");
    }
  }, [eligibleFares, selectedVehicleId]);

  useEffect(() => {
    setUpiPayClicked(false);
    setUpiPaymentConfirmed(false);
  }, [selectedVehicleId, paymentMethod]);

  const selectedFare = eligibleFares.find((f) => f.vehicleTypeId === selectedVehicleId) || null;
  const isRoundTrip = booking?.tripType === "roundtrip";

  const buildConfirmationMessage = () => {
    if (!booking || !selectedFare) return "";
    const paymentLine = paymentMethod === "upi" ? "UPI — customer confirmed payment sent (please verify before dispatch)" : "Pay on Pickup (Cash)";
    const lines = [
      "New VOYNU booking request:", "", `Trip type: ${isRoundTrip ? "Round Trip" : "One Way"}`,
      `Pickup: ${booking.pickup?.name || ""}`, `Drop: ${booking.drop?.name || ""}`,
      `Distance: ${booking.journey?.oneWayDistanceText || ""}${isRoundTrip ? ` (round trip: ${booking.journey?.totalDistanceText || ""})` : ""}`,
      `Travel date: ${booking.travelDate || ""}`, `Pickup time: ${booking.pickupTime || ""}`,
    ];
    if (isRoundTrip) lines.push(`Return date: ${booking.returnDate || ""}`, `Return time: ${booking.returnTime || ""}`);
    lines.push("", `Passengers: ${passengerCount}`, `Luggage: ${luggageCount}`, `Cab type: ${selectedFare.vehicleName}`, `Estimated fare: ₹${selectedFare.totalFare}`, `Payment: ${paymentLine}`, "", `Passenger: ${booking.passengerName || ""}`, `Phone: ${booking.phone || ""}`, `WhatsApp: ${booking.whatsapp || ""}`);
    return lines.join("\n");
  };

  const upiHref = selectedFare ? `upi://pay?pa=${encodeURIComponent(VOYNU_UPI_VPA)}&pn=${encodeURIComponent("VOYNU")}&am=${selectedFare.totalFare}&cu=INR&tn=${encodeURIComponent("VOYNU Cab Booking")}` : "";
  const canConfirm = Boolean(selectedFare) && (paymentMethod === "cash" || (paymentMethod === "upi" && upiPaymentConfirmed));

  const handleConfirm = async () => {
    if (!selectedFare || !canConfirm || isConfirming) return;
    const capacity = validateCapacity({ passengerCount, luggageCount, passengerCapacity: selectedFare.capacity, luggageCapacity: selectedFare.luggageCapacity });
    if (!capacity.valid) { setCapacityError(capacity.reason); return; }
    setIsConfirming(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("bookings").insert({
        user_id: userData?.user?.id || null,
        trip_type: booking.tripType,
        pickup_name: booking.pickup?.name, pickup_lat: booking.pickup?.lat, pickup_lon: booking.pickup?.lon,
        drop_name: booking.drop?.name, drop_lat: booking.drop?.lat, drop_lon: booking.drop?.lon,
        one_way_distance_km: booking.journey?.oneWayDistanceKm, total_distance_km: booking.journey?.totalDistanceKm,
        travel_date: booking.travelDate, pickup_time: booking.pickupTime, return_date: booking.returnDate, return_time: booking.returnTime,
        passenger_name: booking.passengerName, phone: booking.phone, whatsapp: booking.whatsapp,
        vehicle_type: selectedFare.vehicleCategorySlug || selectedFare.vehicleName,
        vehicle_category_id: selectedFare.vehicleCategoryId || null,
        passenger_count: passengerCount, luggage_count: luggageCount,
        fare: selectedFare.totalFare, payment_method: paymentMethod,
        payment_status: paymentMethod === "upi" ? "pending" : "due_on_pickup",
        booking_status: paymentMethod === "upi" ? "pending_payment" : "confirmed",
        confirmed_at: new Date().toISOString(),
      });
      if (insertError) console.error("VOYNU: unable to save booking to database:", insertError);
    } catch (error) {
      console.error("VOYNU: unable to save booking to database:", error);
    }
    const confirmedBooking = { ...booking, passengerCount, luggageCount, selectedFare, paymentMethod, confirmedAt: new Date().toISOString() };
    try { sessionStorage.setItem("voynu_confirmed_booking", JSON.stringify(confirmedBooking)); sessionStorage.removeItem("voynu_booking"); } catch (error) { console.error("VOYNU: unable to save confirmed booking:", error); }
    window.open(buildWhatsAppLink(buildConfirmationMessage()), "_blank");
    router.replace("/booking-confirmed");
  };

  if (loaded && !booking) return null;
  if (!loaded || !booking) return <main className="loading"><div className="spinner" /></main>;

  return (
    <main className="page">
      <PageHeader maxWidth={theme.maxWidth.content} whatsappHref={buildWhatsAppLink("Hi VOYNU, I have a question about my booking.")} />
      <div className="content">
        <div className="summaryCard">
          <div className="summaryRoute"><div className="routeDot routeDotPickup" /><div className="routeText">{booking.pickup?.name}</div></div>
          <div className="routeLine" />
          <div className="summaryRoute"><div className="routeDot routeDotDrop" /><div className="routeText">{booking.drop?.name}</div></div>
          <div className="summaryMeta"><span>{isRoundTrip ? "Round Trip" : "One Way"}</span><span>•</span><span>{booking.journey?.oneWayDistanceText}</span><span>•</span><span>{booking.travelDate} at {booking.pickupTime}</span></div>
        </div>

        <h2 className="sectionHeading">Passengers & luggage</h2>
        <div className="requirementsCard">
          <label>Passengers<select value={passengerCount} onChange={(e) => setPassengerCount(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Luggage<select value={luggageCount} onChange={(e) => setLuggageCount(Number(e.target.value))}>{Array.from({ length: 11 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>

        <h2 className="sectionHeading">Choose your ride</h2>
        <div className="cabList">
          {eligibleFares.map((fare) => (
            <button key={fare.vehicleTypeId} type="button" className={selectedVehicleId === fare.vehicleTypeId ? "cabCard active" : "cabCard"} onClick={() => setSelectedVehicleId(fare.vehicleTypeId)}>
              <div className="cabCardLeft"><div className="cabName">{fare.vehicleName}</div><div className="cabMeta"><IconUsers size={12} /><span>{fare.capacity} passengers</span><span className="cabDot">•</span><span>{fare.luggageCapacity} luggage</span><span className="cabDot">•</span><span>{fare.description}</span></div></div>
              <div className="cabCardRight"><div className="cabPrice">₹{fare.totalFare}</div><div className={selectedVehicleId === fare.vehicleTypeId ? "cabRadio cabRadioActive" : "cabRadio"}>{selectedVehicleId === fare.vehicleTypeId && <IconCheck size={11} />}</div></div>
            </button>
          ))}
        </div>
        {capacityError && <div className="capacityError">{capacityError}</div>}

        <h2 className="sectionHeading">Payment</h2>
        <div className="paymentGrid">
          <button type="button" className={paymentMethod === "cash" ? "paymentCard active" : "paymentCard"} onClick={() => setPaymentMethod("cash")}><IconCash size={16} /><span>Pay on Pickup</span></button>
          <button type="button" className={paymentMethod === "upi" ? "paymentCard active" : "paymentCard"} onClick={() => setPaymentMethod("upi")}><IconUpi size={16} /><span>UPI</span></button>
        </div>

        {paymentMethod === "upi" && selectedFare && <div className="upiFlow">
          {!upiPaymentConfirmed && <a href={upiHref} className="upiPayButton" onClick={() => setUpiPayClicked(true)}><IconUpi size={17} /><span>Pay ₹{selectedFare.totalFare} via UPI app</span></a>}
          {upiPayClicked && !upiPaymentConfirmed && <div className="upiConfirmRow"><p>Completed the payment in your UPI app?</p><div className="upiConfirmActions"><button type="button" className="upiConfirmYes" onClick={() => setUpiPaymentConfirmed(true)}><IconCheck size={12} />Yes, I've paid</button><button type="button" className="upiConfirmRetry" onClick={() => setUpiPayClicked(false)}>Didn't pay yet</button></div></div>}
          {upiPaymentConfirmed && <div className="upiConfirmedChip"><IconCheck size={13} /><span>Payment marked as completed</span></div>}
        </div>}

        {selectedFare && <div className="fareBreakdown"><div className="fareRow"><span>Base fare</span><span>₹{selectedFare.baseFare}</span></div><div className="fareRow"><span>Distance ({selectedFare.billedDistanceKm.toFixed(1)} km)</span><span>₹{selectedFare.distanceFare}</span></div>{selectedFare.driverAllowance > 0 && <div className="fareRow"><span>Driver allowance</span><span>₹{selectedFare.driverAllowance}</span></div>}<div className="fareRow fareRowTotal"><span>Total</span><span>₹{selectedFare.totalFare}</span></div></div>}

        {canConfirm && <button type="button" className="confirmButton" onClick={handleConfirm} disabled={isConfirming}><IconWhatsApp size={18} /><span>{isConfirming ? "Confirming..." : "Confirm on WhatsApp"}</span></button>}
        {!canConfirm && paymentMethod === "upi" && <p className="upiHint">Complete your UPI payment above to continue to WhatsApp confirmation.</p>}
        <p className="disclaimer">Fares shown are estimates. Final fare is confirmed by our team on WhatsApp before your ride is dispatched.</p>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        .page { min-height:100vh; background:#f5faf6; color:#16241d; font-family:'Plus Jakarta Sans',sans-serif; }
        .content { width:min(720px,calc(100% - 32px)); margin:0 auto; padding:24px 0 60px; }
        .loading { min-height:100vh; display:flex; align-items:center; justify-content:center; background:${theme.colors.bg}; }
        .spinner { width:34px; height:34px; border:3px solid rgba(8,120,63,.18); border-top-color:${theme.colors.primary}; border-radius:50%; }
        .summaryCard,.requirementsCard,.fareBreakdown { padding:18px; border-radius:16px; background:#fff; border:1px solid #e5ede8; box-shadow:0 12px 30px rgba(10,40,25,.06); }
        .summaryRoute { display:flex; align-items:flex-start; gap:11px; }
        .routeDot { width:10px; height:10px; margin-top:4px; border-radius:50%; flex-shrink:0; }
        .routeDotPickup { background:#0a7d42; } .routeDotDrop { background:#c8622a; }
        .routeLine { width:1.5px; height:16px; margin-left:4.25px; background:#dbe6df; }
        .routeText { font-size:13.5px; font-weight:600; color:#24352b; line-height:1.4; }
        .summaryMeta { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; padding-top:14px; border-top:1px dashed #e5ede8; color:#6b7a72; font-size:12px; font-weight:600; }
        .sectionHeading { margin:26px 0 12px; font-size:15px; font-weight:800; }
        .requirementsCard { display:grid; grid-template-columns:1fr 1fr; gap:12px; box-shadow:none; }
        .requirementsCard label { font-size:12px; font-weight:800; color:#45564c; }
        .requirementsCard select { display:block; width:100%; margin-top:6px; min-height:44px; padding:8px 10px; border:1px solid #d9e0dc; border-radius:10px; background:#fff; font:inherit; font-weight:700; }
        .cabList { display:flex; flex-direction:column; gap:10px; }
        .cabCard { display:flex; align-items:center; justify-content:space-between; padding:15px 16px; border-radius:16px; border:1.5px solid #e5ede8; background:#fff; cursor:pointer; text-align:left; font-family:inherit; }
        .cabCard.active { border-color:#0a7d42; background:#f4fbf6; }
        .cabName { font-size:14.5px; font-weight:800; } .cabMeta { display:flex; align-items:center; gap:5px; margin-top:4px; color:#7a8981; font-size:11.5px; font-weight:600; flex-wrap:wrap; }
        .cabDot { opacity:.5; } .cabCardRight { display:flex; align-items:center; gap:12px; } .cabPrice { font-size:16px; font-weight:800; color:#0a7d42; }
        .cabRadio { width:22px; height:22px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1.5px solid #cbd9d0; color:#fff; } .cabRadioActive { background:#0a7d42; border-color:#0a7d42; }
        .capacityError { margin-top:10px; padding:12px 14px; border-radius:12px; background:#fff3f1; border:1px solid #f0d3cd; color:#9b4b3c; font-size:12px; font-weight:700; }
        .paymentGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; } .paymentCard { display:flex; align-items:center; justify-content:center; gap:8px; min-height:50px; border-radius:13px; border:1.5px solid #e5ede8; background:#fff; color:#45564c; cursor:pointer; font-family:inherit; font-weight:700; font-size:13px; }
        .paymentCard.active { border-color:#0a7d42; background:#f4fbf6; color:#0a7d42; }
        .upiFlow { margin-top:12px; } .upiPayButton { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; min-height:52px; border-radius:13px; background:linear-gradient(135deg,#0a7d42,#075c31); color:#fff; text-decoration:none; font-weight:800; font-size:14px; }
        .upiConfirmRow { margin-top:12px; padding:14px 15px; border-radius:13px; background:#fdf3dc; border:1px solid #f0dfa8; } .upiConfirmRow p { margin:0 0 10px; color:#7a5a10; font-size:12.5px; font-weight:700; }
        .upiConfirmActions { display:flex; gap:8px; } .upiConfirmYes,.upiConfirmRetry { flex:1; min-height:42px; border-radius:10px; font-family:inherit; font-weight:700; font-size:12.5px; cursor:pointer; } .upiConfirmYes { display:flex; align-items:center; justify-content:center; gap:6px; border:0; background:#0a7d42; color:#fff; } .upiConfirmRetry { border:1.5px solid #e3d1a0; background:transparent; color:#7a5a10; }
        .upiConfirmedChip { display:flex; align-items:center; gap:8px; margin-top:12px; padding:12px 14px; border-radius:12px; background:#eef9f1; border:1px solid #cce5d4; color:#28734b; font-weight:700; font-size:12.5px; }
        .fareBreakdown { margin-top:22px; box-shadow:none; } .fareRow { display:flex; justify-content:space-between; padding:6px 0; color:#5c6d64; font-size:13px; font-weight:600; } .fareRowTotal { margin-top:4px; padding-top:10px; border-top:1px dashed #e5ede8; color:#16241d; font-size:15px; font-weight:800; }
        .confirmButton { width:100%; min-height:56px; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:20px; border:0; border-radius:14px; background:#1fa855; color:#fff; font-family:inherit; font-weight:800; font-size:14.5px; cursor:pointer; } .confirmButton:disabled { opacity:.6; cursor:wait; }
        .upiHint { margin-top:16px; padding:12px 14px; border-radius:12px; background:#f4f6f4; color:#6b7a72; font-size:12px; font-weight:600; text-align:center; } .disclaimer { margin-top:18px; color:#8a9790; font-size:11px; line-height:1.5; text-align:center; }
        @media (max-width:520px) { .requirementsCard { grid-template-columns:1fr 1fr; } .cabMeta { max-width:230px; } .cabCard { padding:13px; } .cabCardRight { gap:8px; } }
      `}</style>
    </main>
  );
}
