"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateAllFaresFromData } from "../lib/fareRules";
import { buildWhatsAppLink } from "../lib/contact";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import PageHeader from "../components/PageHeader";
import { validateCapacity } from "../../lib/capacityValidation";
import { normalizeTripType } from "../lib/tripRules";

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
  const [authReady, setAuthReady] = useState(false);
  const [dataStatus, setDataStatus] = useState("loading");
  const [dataError, setDataError] = useState("");
  const [dataDiagnostics, setDataDiagnostics] = useState(null);
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingVersion, setPricingVersion] = useState(null);
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
      console.error("VOYNU: unable to read booking data", error);
      setDataError(`Booking session could not be read: ${error?.message || "invalid sessionStorage data"}`);
      setDataStatus("error");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && !booking) router.replace("/");
  }, [loaded, booking, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadCabData() {
      if (!booking) return;
      setDataStatus("loading");
      setDataError("");
      setDataDiagnostics(null);

      const tripType = normalizeTripType(booking.tripType);
      const distance = Number(booking?.journey?.oneWayDistanceKm);

      if (!Number.isFinite(distance) || distance < 0) {
        setDataStatus("error");
        setDataError("Cab selection cannot load pricing because the booking contains an invalid one-way journey distance.");
        setDataDiagnostics({ stage: "booking validation", tripType, distance: booking?.journey?.oneWayDistanceKm ?? null });
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setDataStatus("error");
        setDataError(`Authentication session check failed: ${sessionError.message}`);
        setDataDiagnostics({ stage: "auth.getSession", tripType, distance });
        return;
      }
      if (!sessionData?.session?.user) {
        setDataStatus("error");
        setDataError("You must be logged in to load available cab categories and pricing.");
        setDataDiagnostics({ stage: "authentication", tripType, distance, authenticated: false });
        router.replace(`/login?next=${encodeURIComponent("/cab-selection")}`);
        return;
      }
      setAuthReady(true);

      const { data: categories, error: categoryError } = await supabase
        .from("vehicle_categories")
        .select("id,name,slug,description,passenger_capacity,luggage_capacity,active,bookable,sort_order,image_url")
        .eq("active", true)
        .eq("bookable", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled) return;
      if (categoryError) {
        setDataStatus("error");
        setDataError(`Vehicle category query failed: ${categoryError.message}`);
        setDataDiagnostics({ stage: "vehicle_categories.select", tripType, distance, code: categoryError.code || null, details: categoryError.details || null, hint: categoryError.hint || null });
        return;
      }
      if (!Array.isArray(categories) || categories.length === 0) {
        setDataStatus("error");
        setDataError("Vehicle category query succeeded but returned 0 active/bookable categories.");
        setDataDiagnostics({ stage: "vehicle_categories.select", tripType, distance, categoryCount: 0 });
        return;
      }

      const { data: version, error: versionError } = await supabase
        .from("pricing_versions")
        .select("id,version,status,effective_from")
        .eq("status", "active")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (versionError) {
        setDataStatus("error");
        setDataError(`Active pricing version query failed: ${versionError.message}`);
        setDataDiagnostics({ stage: "pricing_versions.select", tripType, distance, categoryCount: categories.length, code: versionError.code || null, details: versionError.details || null, hint: versionError.hint || null });
        return;
      }
      if (!version) {
        setDataStatus("error");
        setDataError("No active pricing version exists. Cab selection cannot calculate fares until an active pricing version is configured.");
        setDataDiagnostics({ stage: "pricing_versions.select", tripType, distance, categoryCount: categories.length, activePricingVersion: null });
        return;
      }

      const { data: rules, error: pricingError } = await supabase
        .from("pricing_rules")
        .select("vehicle_category_id,trip_type,base_fare,per_km_rate,driver_allowance_per_day,minimum_fare,rounding_unit")
        .eq("pricing_version_id", version.id);

      if (cancelled) return;
      if (pricingError) {
        setDataStatus("error");
        setDataError(`Pricing rules query failed: ${pricingError.message}`);
        setDataDiagnostics({ stage: "pricing_rules.select", tripType, distance, categoryCount: categories.length, pricingVersionId: version.id, pricingVersion: version.version, code: pricingError.code || null, details: pricingError.details || null, hint: pricingError.hint || null });
        return;
      }

      const normalizedRules = Array.isArray(rules) ? rules : [];
      const rulesForTrip = normalizedRules.filter((rule) => rule.trip_type === tripType);
      const missingCategories = categories.filter((category) => !rulesForTrip.some((rule) => rule.vehicle_category_id === category.id));

      if (missingCategories.length > 0) {
        setDataStatus("error");
        setDataError(`Pricing configuration is incomplete for ${tripType}: ${missingCategories.map((category) => category.name).join(", ")} has no matching pricing rule.`);
        setDataDiagnostics({ stage: "pricing_rules.validation", tripType, distance, categoryCount: categories.length, totalRuleCount: normalizedRules.length, matchingRuleCount: rulesForTrip.length, missingCategories: missingCategories.map((category) => ({ id: category.id, name: category.name })) });
        return;
      }

      const fares = calculateAllFaresFromData({ vehicleCategories: categories, pricingRules: normalizedRules, oneWayDistanceKm: distance, tripType });
      if (fares.length === 0) {
        setDataStatus("error");
        setDataError("Pricing data loaded successfully, but the fare calculator produced 0 vehicle fares. This indicates a data-to-calculator mismatch.");
        setDataDiagnostics({ stage: "fare calculation", tripType, distance, categoryCount: categories.length, totalRuleCount: normalizedRules.length, matchingRuleCount: rulesForTrip.length, categoryIds: categories.map((category) => category.id), ruleCategoryIds: rulesForTrip.map((rule) => rule.vehicle_category_id) });
        return;
      }

      setVehicleCategories(categories);
      setPricingRules(normalizedRules);
      setPricingVersion(version);
      setDataDiagnostics({ stage: "ready", tripType, distance, categoryCount: categories.length, totalRuleCount: normalizedRules.length, matchingRuleCount: rulesForTrip.length, fareCount: fares.length, pricingVersion: version.version });
      setDataStatus("ready");
    }

    loadCabData().catch((error) => {
      if (cancelled) return;
      console.error("VOYNU: cab data load failed", error);
      setDataStatus("error");
      setDataError(`Unexpected cab-selection data error: ${error?.message || String(error)}`);
      setDataDiagnostics({ stage: "loadCabData", tripType: normalizeTripType(booking?.tripType), distance: booking?.journey?.oneWayDistanceKm ?? null });
    });

    return () => {
      cancelled = true;
    };
  }, [booking, router]);

  const fares = useMemo(() => {
    if (dataStatus !== "ready" || !booking) return [];
    return calculateAllFaresFromData({
      vehicleCategories,
      pricingRules,
      oneWayDistanceKm: booking.journey.oneWayDistanceKm,
      tripType: booking.tripType,
    });
  }, [booking, dataStatus, pricingRules, vehicleCategories]);

  const eligibleFares = useMemo(
    () => fares.filter((fare) => validateCapacity({ passengerCount, luggageCount, passengerCapacity: fare.capacity, luggageCapacity: fare.luggageCapacity }).valid),
    [fares, passengerCount, luggageCount]
  );

  useEffect(() => {
    if (dataStatus !== "ready") return;
    if (!eligibleFares.length) {
      setSelectedVehicleId(null);
      return;
    }
    if (!eligibleFares.some((fare) => fare.vehicleTypeId === selectedVehicleId)) {
      setSelectedVehicleId(eligibleFares[0].vehicleTypeId);
    }
  }, [dataStatus, eligibleFares, selectedVehicleId]);

  useEffect(() => {
    if (dataStatus !== "ready") {
      setCapacityError("");
      return;
    }
    const result = selectedVehicleId ? eligibleFares.find((fare) => fare.vehicleTypeId === selectedVehicleId) : null;
    if (!result) {
      if (eligibleFares.length) setCapacityError("Please select a suitable vehicle category.");
      else setCapacityError(`No available vehicle can accommodate ${passengerCount} passenger${passengerCount === 1 ? "" : "s"} and ${luggageCount} luggage item${luggageCount === 1 ? "" : "s"}.`);
    } else {
      setCapacityError("");
    }
  }, [dataStatus, eligibleFares, selectedVehicleId, passengerCount, luggageCount]);

  useEffect(() => {
    setUpiPayClicked(false);
    setUpiPaymentConfirmed(false);
  }, [selectedVehicleId, paymentMethod]);

  const selectedFare = eligibleFares.find((fare) => fare.vehicleTypeId === selectedVehicleId) || null;
  const isRoundTrip = normalizeTripType(booking?.tripType) === "roundtrip";

  const buildConfirmationMessage = () => {
    if (!booking || !selectedFare) return "";
    const paymentLine = paymentMethod === "upi" ? "UPI — customer confirmed payment sent (please verify before dispatch)" : "Pay on Pickup (Cash)";
    const lines = [
      "New VOYNU booking request:",
      "",
      `Trip type: ${isRoundTrip ? "Round Trip" : "One Way"}`,
      `Pickup: ${booking.pickup?.name || ""}`,
      `Drop: ${booking.drop?.name || ""}`,
      `Distance: ${booking.journey?.oneWayDistanceText || ""}${isRoundTrip ? ` (round trip: ${booking.journey?.totalDistanceText || ""})` : ""}`,
      `Travel date: ${booking.travelDate || ""}`,
      `Pickup time: ${booking.pickupTime || ""}`,
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
    if (!capacity.valid) {
      setCapacityError(capacity.reason);
      return;
    }

    setIsConfirming(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error(`Authentication check failed: ${userError?.message || "You are not logged in."}`);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) throw new Error(`Authenticated session token unavailable: ${sessionError?.message || "Please log in again."}`);

      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({
          userId: userData.user.id,
          vehicleCategoryId: selectedFare.vehicleCategoryId,
          passengerCount,
          luggageCount,
          paymentMethod,
          idempotencyKey,
          booking,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.booking?.id) throw new Error(result?.error || `Booking API failed with HTTP ${response.status}.`);

      const confirmedBooking = {
        ...booking,
        passengerCount,
        luggageCount,
        selectedFare: { ...selectedFare, totalFare: result.booking.fare, serverBookingId: result.booking.id },
        paymentMethod,
        bookingId: result.booking.id,
        paymentStatus: result.booking.payment_status,
        bookingStatus: result.booking.booking_status,
        confirmedAt: new Date().toISOString(),
      };

      sessionStorage.setItem("voynu_confirmed_booking", JSON.stringify(confirmedBooking));
      sessionStorage.removeItem("voynu_booking");
      window.open(buildWhatsAppLink(buildConfirmationMessage()), "_blank");
      router.replace("/booking-confirmed");
    } catch (error) {
      console.error("VOYNU: unable to create booking", error);
      setCapacityError(error?.message || "Unable to create booking. Please try again.");
    } finally {
      setIsConfirming(false);
    }
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
          <label>Passengers<select value={passengerCount} onChange={(event) => setPassengerCount(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
          <label>Luggage<select value={luggageCount} onChange={(event) => setLuggageCount(Number(event.target.value))}>{Array.from({ length: 11 }, (_, index) => index).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
        </div>

        <h2 className="sectionHeading">Choose your ride</h2>

        {dataStatus === "loading" && <div className="statusCard"><div className="spinner small" /><div><strong>Loading vehicle availability and pricing…</strong><p>Checking your authenticated session, active vehicle categories and active pricing rules.</p></div></div>}

        {dataStatus === "error" && (
          <div className="errorCard">
            <strong>Cab selection could not load.</strong>
            <p>{dataError}</p>
            {dataDiagnostics && <details><summary>Technical diagnostic</summary><pre>{JSON.stringify(dataDiagnostics, null, 2)}</pre></details>}
            <button type="button" className="retryButton" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {dataStatus === "ready" && eligibleFares.length > 0 && (
          <div className="cabList">
            {eligibleFares.map((fare) => (
              <button key={fare.vehicleTypeId} type="button" className={selectedVehicleId === fare.vehicleTypeId ? "cabCard active" : "cabCard"} onClick={() => setSelectedVehicleId(fare.vehicleTypeId)}>
                <div className="cabCardLeft"><div className="cabName">{fare.vehicleName}</div><div className="cabMeta"><IconUsers size={12} /><span>{fare.capacity} passengers</span><span className="cabDot">•</span><span>{fare.luggageCapacity} luggage</span><span className="cabDot">•</span><span>{fare.description}</span></div></div>
                <div className="cabCardRight"><div className="cabPrice">₹{fare.totalFare}</div><div className={selectedVehicleId === fare.vehicleTypeId ? "cabRadio cabRadioActive" : "cabRadio"}>{selectedVehicleId === fare.vehicleTypeId && <IconCheck size={11} />}</div></div>
              </button>
            ))}
          </div>
        )}

        {dataStatus === "ready" && !eligibleFares.length && <div className="errorCard"><strong>No suitable vehicle is available.</strong><p>{capacityError}</p><p className="diagnosticLine">Loaded {vehicleCategories.length} vehicle categories and {pricingRules.length} pricing rules. Requested: {passengerCount} passenger{passengerCount === 1 ? "" : "s"}, {luggageCount} luggage item{luggageCount === 1 ? "" : "s"}.</p></div>}
        {dataStatus === "ready" && capacityError && eligibleFares.length > 0 && <div className="capacityError">{capacityError}</div>}

        {dataStatus === "ready" && selectedFare && (
          <>
            <div className="dataHealth"><span>Pricing v{pricingVersion?.version}</span><span>•</span><span>{vehicleCategories.length} vehicles</span><span>•</span><span>{pricingRules.filter((rule) => rule.trip_type === normalizeTripType(booking.tripType)).length} matching rules</span></div>
            <h2 className="sectionHeading">Payment</h2>
            <div className="paymentGrid">
              <button type="button" className={paymentMethod === "cash" ? "paymentCard active" : "paymentCard"} onClick={() => setPaymentMethod("cash")}><IconCash size={16} /><span>Pay on Pickup</span></button>
              <button type="button" className={paymentMethod === "upi" ? "paymentCard active" : "paymentCard"} onClick={() => setPaymentMethod("upi")}><IconUpi size={16} /><span>UPI</span></button>
            </div>

            {paymentMethod === "upi" && <div className="upiFlow">
              {!upiPaymentConfirmed && <a href={upiHref} className="upiPayButton" onClick={() => setUpiPayClicked(true)}><IconUpi size={17} /><span>Pay ₹{selectedFare.totalFare} via UPI app</span></a>}
              {upiPayClicked && !upiPaymentConfirmed && <div className="upiConfirmRow"><p>Completed the payment in your UPI app?</p><div className="upiConfirmActions"><button type="button" className="upiConfirmYes" onClick={() => setUpiPaymentConfirmed(true)}><IconCheck size={12} />Yes, I've paid</button><button type="button" className="upiConfirmRetry" onClick={() => setUpiPayClicked(false)}>Didn't pay yet</button></div></div>}
              {upiPaymentConfirmed && <div className="upiConfirmedChip"><IconCheck size={13} /><span>Payment marked as completed</span></div>}
            </div>}

            <div className="fareBreakdown">
              <div className="fareRow"><span>Base fare</span><span>₹{selectedFare.baseFare}</span></div>
              <div className="fareRow"><span>Distance ({selectedFare.billedDistanceKm.toFixed(1)} km)</span><span>₹{selectedFare.distanceFare}</span></div>
              {selectedFare.driverAllowance > 0 && <div className="fareRow"><span>Driver allowance</span><span>₹{selectedFare.driverAllowance}</span></div>}
              <div className="fareRow fareRowTotal"><span>Total</span><span>₹{selectedFare.totalFare}</span></div>
            </div>

            {canConfirm && <button type="button" className="confirmButton" onClick={handleConfirm} disabled={isConfirming}><IconWhatsApp size={18} /><span>{isConfirming ? "Confirming…" : "Confirm on WhatsApp"}</span></button>}
            {!canConfirm && paymentMethod === "upi" && <p className="upiHint">Complete your UPI payment above to continue to WhatsApp confirmation.</p>}
            <p className="disclaimer">Fares shown are estimates. Final fare is confirmed by our team on WhatsApp before your ride is dispatched.</p>
          </>
        )}
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        .page { min-height: 100vh; background: #f5faf6; color: #16241d; font-family: 'Plus Jakarta Sans', sans-serif; }
        .content { width: min(720px, calc(100% - 32px)); margin: 0 auto; padding: 24px 0 60px; }
        .loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: ${theme.colors.bg}; }
        .spinner { width: 34px; height: 34px; border: 3px solid rgba(8,120,63,.18); border-top-color: ${theme.colors.primary}; border-radius: 50%; animation: spin .8s linear infinite; }
        .spinner.small { width: 24px; height: 24px; flex: 0 0 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .summaryCard, .requirementsCard, .fareBreakdown, .statusCard, .errorCard { padding: 18px; border-radius: 16px; background: #fff; border: 1px solid #e5ede8; box-shadow: 0 12px 30px rgba(10,40,25,.06); }
        .summaryRoute { display: flex; align-items: flex-start; gap: 11px; }
        .routeDot { width: 10px; height: 10px; margin-top: 6px; border-radius: 50%; flex: 0 0 10px; }
        .routeDotPickup { background: #08783f; box-shadow: 0 0 0 4px #e7f5ec; }
        .routeDotDrop { background: #c8622a; box-shadow: 0 0 0 4px #fff0e8; }
        .routeLine { width: 2px; height: 18px; margin: 3px 0 3px 4px; background: #dce8df; }
        .routeText { font-size: 16px; line-height: 1.35; word-break: break-word; }
        .summaryMeta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; color: #587064; font-size: 13px; }
        .sectionHeading { margin: 34px 0 14px; font-size: 27px; line-height: 1.15; }
        .requirementsCard { display: flex; gap: 24px; align-items: center; font-size: 18px; }
        .requirementsCard label { display: flex; align-items: center; gap: 8px; }
        select { border: 1px solid #cbd9d0; border-radius: 7px; padding: 7px 22px 7px 8px; background: #fff; font-size: 16px; }
        .cabList { display: grid; gap: 12px; }
        .cabCard { width: 100%; display: flex; justify-content: space-between; gap: 14px; padding: 18px; border-radius: 16px; border: 1px solid #dfe9e2; background: #fff; text-align: left; cursor: pointer; box-shadow: 0 8px 20px rgba(10,40,25,.04); }
        .cabCard.active { border: 2px solid #08783f; padding: 17px; background: #f7fcf8; }
        .cabCardLeft { min-width: 0; }
        .cabName { font-size: 18px; font-weight: 800; }
        .cabMeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; color: #63776c; font-size: 12px; }
        .cabPrice { font-size: 21px; font-weight: 800; white-space: nowrap; }
        .cabCardRight { display: flex; align-items: center; gap: 12px; }
        .cabRadio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #bdcbc1; display: grid; place-items: center; color: #fff; }
        .cabRadioActive { background: #08783f; border-color: #08783f; }
        .statusCard { display: flex; gap: 14px; align-items: center; color: #2e493a; }
        .statusCard p, .errorCard p { margin: 6px 0 0; color: #61766a; line-height: 1.5; }
        .errorCard { border-color: #f0c9c9; background: #fffafa; }
        .errorCard strong { color: #9c2424; }
        .errorCard details { margin-top: 14px; }
        .errorCard summary { cursor: pointer; font-weight: 700; }
        .errorCard pre { overflow: auto; padding: 12px; margin: 10px 0 0; border-radius: 10px; background: #1c2520; color: #e8f3eb; font-size: 11px; white-space: pre-wrap; word-break: break-word; }
        .retryButton { margin-top: 14px; padding: 11px 16px; border: 0; border-radius: 10px; background: #08783f; color: #fff; font-weight: 700; cursor: pointer; }
        .capacityError { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: #fff2e9; color: #8b4a20; font-size: 14px; }
        .diagnosticLine, .dataHealth { margin-top: 10px; color: #61766a; font-size: 12px; }
        .dataHealth { display: flex; flex-wrap: wrap; gap: 6px; }
        .paymentGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .paymentCard { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 14px; border: 1px solid #dce7df; border-radius: 12px; background: #fff; font-size: 15px; font-weight: 700; cursor: pointer; }
        .paymentCard.active { border-color: #08783f; color: #08783f; background: #f2fbf5; }
        .fareBreakdown { margin-top: 14px; }
        .fareRow { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; color: #50665a; }
        .fareRowTotal { margin-top: 5px; padding-top: 12px; border-top: 1px solid #e4ece7; color: #16241d; font-size: 18px; font-weight: 800; }
        .confirmButton, .upiPayButton { width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 14px; padding: 15px; border: 0; border-radius: 12px; background: #08783f; color: #fff; font-weight: 800; text-decoration: none; cursor: pointer; }
        .confirmButton:disabled { opacity: .65; cursor: wait; }
        .upiFlow { margin-top: 14px; }
        .upiConfirmRow { padding: 14px; margin-top: 10px; border: 1px solid #e1e9e4; border-radius: 12px; background: #fff; }
        .upiConfirmRow p { margin: 0 0 10px; font-weight: 700; }
        .upiConfirmActions { display: flex; gap: 8px; }
        .upiConfirmYes, .upiConfirmRetry { flex: 1; padding: 10px; border-radius: 9px; cursor: pointer; }
        .upiConfirmYes { border: 0; background: #08783f; color: #fff; }
        .upiConfirmRetry { border: 1px solid #ccd9d0; background: #fff; }
        .upiConfirmedChip { display: flex; align-items: center; gap: 7px; padding: 11px 13px; border-radius: 10px; background: #e9f8ee; color: #08783f; font-weight: 700; }
        .upiHint, .disclaimer { color: #61766a; font-size: 13px; line-height: 1.5; }
        .disclaimer { margin-top: 16px; }
        @media (max-width: 560px) { .content { width: min(720px, calc(100% - 24px)); padding-top: 18px; } .sectionHeading { font-size: 26px; } .requirementsCard { gap: 12px; justify-content: space-between; font-size: 17px; } .cabCard { padding: 15px; } .cabCard.active { padding: 14px; } .cabMeta { max-width: 210px; } }
      `}</style>
    </main>
  );
}
