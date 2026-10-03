"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { calculateAllFaresFromData } from "../../lib/fareRules";
import { buildWhatsAppLink } from "../../lib/contact";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";
import PageHeader from "../../../../shared/components/PageHeader";
import { getMaxLuggageForPassengers, validateCapacity } from "../../lib/capacityValidation";
import { normalizeTripType } from "../../lib/tripRules";
import { deserializeBookingDraft } from "../../lib/bookingDraft";

const MAX_PASSENGERS = 12;
const MAX_LUGGAGE = 10;

function IconCheck({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>; }
function IconUsers({ size = 13 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 8.5a3 3 0 1 1 3.6 2.9" /><path d="M17.5 14.6c2.6.3 4 2 4 5.4" /></svg>; }
function IconCash({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="3" /></svg>; }
function IconInfo({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></svg>; }
function IconTicket({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h16v-4a2 2 0 0 1 0-4V7H4z" /><path d="M13 7v2M13 15v2M13 11v2" /></svg>; }

function getCustomerCapacityMessage(capacity) {
  if (!capacity) return "This vehicle is not available for the current passenger and luggage selection.";
  if (capacity.code === "PASSENGER_CAPACITY_EXCEEDED") return `This vehicle accommodates up to ${capacity.maxPassengers} passengers. Please choose a larger vehicle for ${capacity.passengers} passengers.`;
  if (capacity.code === "LUGGAGE_CAPACITY_EXCEEDED") return `With ${capacity.passengerCount} passenger${capacity.passengerCount === 1 ? "" : "s"}, this vehicle can accommodate up to ${capacity.maxLuggage} luggage item${capacity.maxLuggage === 1 ? "" : "s"}.`;
  return "This vehicle is not available for the current selection. Please choose another vehicle.";
}

export default function CabSelectionPage() {
  const router = useRouter();
  const [booking, setBooking] = useState(null), [loaded, setLoaded] = useState(false), [dataStatus, setDataStatus] = useState("loading"), [dataError, setDataError] = useState(""), [dataDiagnostics, setDataDiagnostics] = useState(null), [vehicleCategories, setVehicleCategories] = useState([]), [pricingRules, setPricingRules] = useState([]), [pricingVersion, setPricingVersion] = useState(null), [passengerCount, setPassengerCount] = useState(1), [luggageCount, setLuggageCount] = useState(0), [selectedVehicleId, setSelectedVehicleId] = useState(null), [paymentMethod, setPaymentMethod] = useState("cash"), [isConfirming, setIsConfirming] = useState(false), [flowError, setFlowError] = useState(""), [walletApplied, setWalletApplied] = useState(0), [couponOpen, setCouponOpen] = useState(false), [couponCode, setCouponCode] = useState(""), [couponState, setCouponState] = useState(null), [couponApplying, setCouponApplying] = useState(false);

  useEffect(() => { try { const raw = sessionStorage.getItem("voynu_booking"); if (!raw) return; const parsedResult = deserializeBookingDraft(raw); if (parsedResult.error) { setFlowError(`Booking session could not be read: ${parsedResult.error}`); return; } const parsed = parsedResult.draft; setBooking(parsed); setPassengerCount(Math.max(1, Number(parsed?.passengerCount) || 1)); setLuggageCount(Math.max(0, Number(parsed?.luggageCount) || 0)); } catch (error) { setFlowError(`Booking session could not be read: ${error?.message || "invalid session data"}`); } finally { setLoaded(true); } }, []);
  useEffect(() => { if (loaded && !booking) router.replace("/"); }, [loaded, booking, router]);
  const maxLuggageForPassengers = useMemo(() => Math.min(MAX_LUGGAGE, getMaxLuggageForPassengers(passengerCount, MAX_LUGGAGE)), [passengerCount]);
  useEffect(() => { if (luggageCount > maxLuggageForPassengers) setLuggageCount(maxLuggageForPassengers); }, [luggageCount, maxLuggageForPassengers]);

  useEffect(() => {
    let cancelled = false;
    async function loadCabData() {
      if (!booking) return;
      setDataStatus("loading"); setDataError(""); setDataDiagnostics(null);
      const tripType = normalizeTripType(booking.tripType);
      const distance = Number(booking?.journey?.oneWayDistanceKm);
      if (!Number.isFinite(distance) || distance < 0) { setDataStatus("error"); setDataError("Cab selection cannot load because the booking contains an invalid one-way journey distance."); setDataDiagnostics({ stage: "booking.validation", tripType, distance: booking?.journey?.oneWayDistanceKm ?? null }); return; }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) { setDataStatus("error"); setDataError(`Authentication session check failed: ${sessionError.message}`); setDataDiagnostics({ stage: "auth.getSession", tripType, distance }); return; }
      if (!sessionData?.session?.user) { setDataStatus("error"); setDataError("You must be logged in to select a cab."); setDataDiagnostics({ stage: "authentication", authenticated: false, tripType, distance }); router.replace(`/login?next=${encodeURIComponent("/cab-selection")}`); return; }
      const { data: categories, error: categoryError } = await supabase.from("vehicle_categories").select("id,name,slug,description,passenger_capacity,luggage_capacity,active,bookable,sort_order,image_url").eq("active", true).eq("bookable", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
      if (cancelled) return;
      if (categoryError) { setDataStatus("error"); setDataError(`Vehicle category query failed: ${categoryError.message}`); setDataDiagnostics({ stage: "vehicle_categories.select", code: categoryError.code || null, details: categoryError.details || null, hint: categoryError.hint || null, tripType, distance }); return; }
      if (!categories?.length) { setDataStatus("error"); setDataError("Vehicle category query succeeded but returned no active/bookable categories."); setDataDiagnostics({ stage: "vehicle_categories.select", categoryCount: 0, tripType, distance }); return; }
      const pricingNowIso = new Date().toISOString();
      const { data: version, error: versionError } = await supabase.from("pricing_versions").select("id,version,status,effective_from").eq("status", "active").lte("effective_from", pricingNowIso).order("effective_from", { ascending: false, nullsFirst: false }).order("version", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (versionError) { setDataStatus("error"); setDataError(`Active pricing version query failed: ${versionError.message}`); setDataDiagnostics({ stage: "pricing_versions.select", code: versionError.code || null, details: versionError.details || null, hint: versionError.hint || null, tripType, distance, categoryCount: categories.length }); return; }
      if (!version) { setDataStatus("error"); setDataError("No active pricing version exists. Cab selection cannot calculate fares until pricing is configured."); setDataDiagnostics({ stage: "pricing_versions.select", activePricingVersion: null, tripType, distance, categoryCount: categories.length }); return; }
      const { data: rules, error: pricingError } = await supabase.from("pricing_rules").select("vehicle_category_id,trip_type,base_fare,per_km_rate,driver_allowance_per_day,minimum_fare,rounding_unit").eq("pricing_version_id", version.id);
      if (cancelled) return;
      if (pricingError) { setDataStatus("error"); setDataError(`Pricing rules query failed: ${pricingError.message}`); setDataDiagnostics({ stage: "pricing_rules.select", code: pricingError.code || null, details: pricingError.details || null, hint: pricingError.hint || null, tripType, distance, pricingVersionId: version.id }); return; }
      const matchingRules = (rules || []).filter((rule) => rule.trip_type === tripType);
      const missingCategories = categories.filter((category) => !matchingRules.some((rule) => rule.vehicle_category_id === category.id));
      if (missingCategories.length) { setDataStatus("error"); setDataError(`Pricing configuration is incomplete for ${tripType}: ${missingCategories.map((category) => category.name).join(", ")} has no matching pricing rule.`); setDataDiagnostics({ stage: "pricing_rules.validation", tripType, distance, pricingVersionId: version.id, missingCategories: missingCategories.map((category) => ({ id: category.id, name: category.name })), totalRuleCount: rules?.length || 0, matchingRuleCount: matchingRules.length }); return; }
      const fares = calculateAllFaresFromData({ vehicleCategories: categories, pricingRules: rules || [], oneWayDistanceKm: distance, tripType });
      if (!fares.length) { setDataStatus("error"); setDataError("Pricing data loaded, but fare calculation produced no vehicle fares. The category-to-pricing mapping is inconsistent."); setDataDiagnostics({ stage: "fare_calculation", tripType, distance, categoryIds: categories.map((category) => category.id), ruleCategoryIds: matchingRules.map((rule) => rule.vehicle_category_id) }); return; }
      setVehicleCategories(categories); setPricingRules(rules || []); setPricingVersion(version); setDataDiagnostics({ stage: "ready", tripType, distance, pricingVersion: version.version, categoryCount: categories.length, matchingRuleCount: matchingRules.length, fareCount: fares.length }); setDataStatus("ready");
    }
    loadCabData().catch((error) => { if (cancelled) return; setDataStatus("error"); setDataError(`Unexpected cab-selection data error: ${error?.message || String(error)}`); setDataDiagnostics({ stage: "loadCabData.unhandled", tripType: normalizeTripType(booking?.tripType), distance: booking?.journey?.oneWayDistanceKm ?? null }); });
    return () => { cancelled = true; };
  }, [booking, router]);

  useEffect(() => { if (dataStatus === "error") console.error("VOYNU cab selection:", dataError, dataDiagnostics); }, [dataStatus, dataError, dataDiagnostics]);
  const fares = useMemo(() => dataStatus !== "ready" || !booking ? [] : calculateAllFaresFromData({ vehicleCategories, pricingRules, oneWayDistanceKm: booking.journey.oneWayDistanceKm, tripType: booking.tripType }), [booking, dataStatus, pricingRules, vehicleCategories]);
  const fareAvailability = useMemo(() => fares.map((fare) => ({ fare, capacity: validateCapacity({ passengerCount, luggageCount, passengerCapacity: fare.capacity, luggageCapacity: fare.luggageCapacity }) })), [fares, passengerCount, luggageCount]);
  const eligibleFares = useMemo(() => fareAvailability.filter(({ capacity }) => capacity.valid).map(({ fare }) => fare), [fareAvailability]);
  useEffect(() => { if (dataStatus !== "ready") return; if (!eligibleFares.some((fare) => fare.vehicleTypeId === selectedVehicleId)) setSelectedVehicleId(eligibleFares[0]?.vehicleTypeId || null); }, [dataStatus, eligibleFares, selectedVehicleId]);
  useEffect(() => { setFlowError(""); }, [selectedVehicleId, paymentMethod]);
  useEffect(() => { setCouponState(null); setCouponCode(""); setCouponOpen(false); setWalletApplied(0); }, [selectedVehicleId, passengerCount, luggageCount]);

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code || couponApplying || !selectedFare) return;
    setCouponApplying(true);
    setCouponState(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) throw new Error("Your login session has expired. Please sign in again.");
      const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ code, bookingAmount: Number(selectedFare.totalFare || 0), tripType: booking?.tripType }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.valid) throw new Error(result?.error || "This coupon is invalid or unavailable.");
      setCouponState({ valid: true, code: result.code, discountAmount: Number(result.discountAmount || 0), message: result.message });
      setCouponCode(result.code || code.toUpperCase());
    } catch (error) {
      setCouponState({ valid: false, message: error?.message || "Unable to apply this coupon." });
    } finally { setCouponApplying(false); }
  };

  const removeCoupon = () => { setCouponState(null); setCouponCode(""); setCouponOpen(false); setWalletApplied(0); };

  const selectedFare = eligibleFares.find((fare) => fare.vehicleTypeId === selectedVehicleId) || null;
  const selectedCapacity = fareAvailability.find(({ fare }) => fare.vehicleTypeId === selectedVehicleId)?.capacity || null;
  const isRoundTrip = normalizeTripType(booking?.tripType) === "roundtrip";
  const capacityError = !selectedFare && dataStatus === "ready" ? `No available vehicle can accommodate ${passengerCount} passenger${passengerCount === 1 ? "" : "s"} and ${luggageCount} luggage item${luggageCount === 1 ? "" : "s"}.` : selectedCapacity?.valid === false ? selectedCapacity.reason : "";
  const couponDiscount = Number(couponState?.discountAmount || 0);
  const discountedFare = Math.max(0, Number(selectedFare?.totalFare || 0) - couponDiscount);
  const payableFare = Math.max(0, discountedFare - Number(walletApplied || 0));
  const canConfirm = Boolean(selectedFare && selectedCapacity?.valid) && paymentMethod === "cash";

  const handleConfirm = async () => {
    if (!canConfirm || !selectedFare || isConfirming) return;
    setFlowError("");
    const validation = validateCapacity({ passengerCount, luggageCount, passengerCapacity: selectedFare.capacity, luggageCapacity: selectedFare.luggageCapacity });
    if (!validation.valid) { setFlowError(validation.reason); return; }
    setIsConfirming(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error(`Authentication check failed: ${userError?.message || "You are not logged in."}`);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) throw new Error(`Authenticated session token unavailable: ${sessionError?.message || "Please log in again."}`);
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/bookings/create", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ vehicleCategoryId: selectedFare.vehicleCategoryId, passengerCount, luggageCount, paymentMethod, walletRequestedAmount: walletApplied, couponCode: couponState?.valid ? couponState.code : "", idempotencyKey, booking }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.booking?.id) throw new Error(result?.error || `Booking API failed with HTTP ${response.status}.`);
      const serverFare = Number(result.booking.fare);
      const serverBreakdown = result.booking.fare_breakdown || null;
      const serverDistanceKm = Number(result.booking.one_way_distance_km);
      const confirmedBooking = {
        ...booking,
        passengerCount,
        luggageCount,
        selectedFare: {
          ...selectedFare,
          totalFare: serverFare,
          baseFare: Number(serverBreakdown?.baseFare ?? selectedFare.baseFare),
          distanceFare: Number(serverBreakdown?.distanceFare ?? selectedFare.distanceFare),
          driverAllowance: Number(serverBreakdown?.driverAllowance ?? selectedFare.driverAllowance),
          billedDistanceKm: Number(serverBreakdown?.billedDistanceKm ?? selectedFare.billedDistanceKm),
          authoritativeDistanceKm: Number.isFinite(serverDistanceKm) ? serverDistanceKm : null,
          authoritativeDistanceText: serverBreakdown?.authoritativeDistanceText || null,
        },
        paymentMethod,
        bookingId: result.booking.id,
        paymentStatus: result.booking.payment_status,
        bookingStatus: result.booking.booking_status,
        pricingVersionId: result.booking.pricing_version_id,
        confirmedAt: new Date().toISOString(),
        fareSource: "server_authoritative",
      };
      sessionStorage.setItem("voynu_confirmed_booking", JSON.stringify(confirmedBooking));
      sessionStorage.removeItem("voynu_booking");
      router.replace("/booking-confirmed");
    } catch (error) {
      console.error("VOYNU: unable to create booking", error);
      setFlowError(error?.message || "Unable to create booking. Please try again.");
    } finally { setIsConfirming(false); }
  };

  if (!loaded) return <main className="loading"><div className="spinner" /></main>;
  if (!booking) return null;
  return (
    <main className="page"><PageHeader maxWidth={theme.maxWidth.content} whatsappHref={buildWhatsAppLink("Hi VOYNU, I have a question about my booking.")} /><div className="content">
      <section className="summaryCard" aria-label="Journey summary"><div className="summaryRoute"><span className="routeDot pickup" /><div className="summaryAddress" title={booking.pickup?.name}>{booking.pickup?.name}</div></div><div className="routeLine" /><div className="summaryRoute"><span className="routeDot drop" /><div className="summaryAddress" title={booking.drop?.name}>{booking.drop?.name}</div></div><div className="summaryMeta"><span>{isRoundTrip ? "Round Trip" : "One Way"}</span><span>•</span><span>{booking.journey?.oneWayDistanceText}</span><span>•</span><span>{booking.travelDate} at {booking.pickupTime}</span></div></section>
      <h2 className="sectionHeading">Passengers & luggage</h2><section className="requirementsCard"><label><span>Passengers</span><select value={passengerCount} onChange={(event) => setPassengerCount(Number(event.target.value))}>{Array.from({ length: MAX_PASSENGERS }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label><label><span>Luggage</span><select value={luggageCount} onChange={(event) => setLuggageCount(Number(event.target.value))}>{Array.from({ length: maxLuggageForPassengers + 1 }, (_, index) => index).map((number) => <option key={number} value={number}>{number}</option>)}</select></label></section>
      <h2 className="sectionHeading">Choose your ride</h2>
      {dataStatus === "loading" && <div className="statusCard"><div className="spinner small" /><div><strong>Finding available cabs…</strong><p>Getting today's fares for your trip.</p></div></div>}
      {dataStatus === "error" && <section className="errorCard"><strong>Couldn't load ride options</strong><p>We couldn't load ride options and prices right now. Please check your connection and try again.</p><button type="button" className="retryButton" onClick={() => window.location.reload()}>Retry</button></section>}
      {dataStatus === "ready" && fares.length > 0 && <div className="cabList">{fareAvailability.map(({ fare, capacity }) => { const available = capacity.valid; const active = available && selectedVehicleId === fare.vehicleTypeId; return <button key={fare.vehicleTypeId} type="button" disabled={!available} className={`cabCard${active ? " active" : ""}${!available ? " unavailable" : ""}`} onClick={() => available && setSelectedVehicleId(fare.vehicleTypeId)}><div className="cabCardLeft"><div className="cabName">{fare.vehicleName}</div><div className="cabMeta"><IconUsers size={12} /><span>{fare.capacity} passengers</span><span>•</span><span>{fare.luggageCapacity} luggage</span><span>•</span><span>{fare.description}</span></div>{!available && <div className="cabUnavailableReason"><div className="cabUnavailableTitle"><IconInfo size={14} /><span>Not available for this selection</span></div><div className="cabUnavailableText">{getCustomerCapacityMessage(capacity)}</div>{capacity.code === "LUGGAGE_CAPACITY_EXCEEDED" && <div className="cabUnavailableHint">A larger vehicle can provide additional luggage space.</div>}</div>}</div><div className="cabCardRight"><div className="cabPrice">₹{fare.totalFare}</div><div className={active ? "cabRadio active" : "cabRadio"}>{active && <IconCheck size={11} />}</div></div></button>; })}</div>}
      {dataStatus === "ready" && !eligibleFares.length && <section className="availabilityNotice"><div className="availabilityNoticeIcon"><IconInfo size={18} /></div><div><strong>We need a larger vehicle for this request.</strong><p>{capacityError}</p><p className="diagnosticLine">Try reducing the luggage or passenger count, or choose a larger vehicle when available.</p></div></section>}
      {dataStatus === "ready" && selectedFare && <><h2 className="sectionHeading">Payment</h2><div className="paymentAction"><button type="button" className={paymentMethod === "cash" ? "paymentCard active" : "paymentCard"} onClick={() => setPaymentMethod("cash")}><IconCash size={16} /><span>Pay on Pickup</span></button></div><section className="couponCard">{couponState?.valid ? <div className="couponApplied"><div className="couponAppliedIcon"><IconTicket size={16} /></div><div className="couponAppliedCopy"><strong>{couponState.code}</strong><span>Coupon applied · You save ₹{couponDiscount.toFixed(2).replace(/\.00$/,"")}</span></div><button type="button" className="couponRemove" onClick={removeCoupon}>Remove</button></div> : <><button type="button" className="couponTrigger" onClick={() => setCouponOpen((value) => !value)}><span className="couponTriggerLeft"><span className="couponIcon"><IconTicket size={16} /></span><span><strong>Have a coupon?</strong><small>Apply a promo code and save on this ride</small></span></span><span className="couponAction">{couponOpen ? "Close" : "Apply"}</span></button>{couponOpen && <div className="couponForm"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Enter coupon code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} onKeyDown={(event) => { if (event.key === "Enter") applyCoupon(); }} /><button type="button" onClick={applyCoupon} disabled={couponApplying || !couponCode.trim()}>{couponApplying ? "Checking…" : "Apply"}</button></div>}{couponState?.message && <p className="couponError">{couponState.message}</p>}</>}</section><section className="fareBreakdown"><div className="fareRow"><span>Base fare</span><span>₹{selectedFare.baseFare.toFixed(2)}</span></div><div className="fareRow"><span>Distance ({selectedFare.billedDistanceKm.toFixed(1)} km)</span><span>₹{selectedFare.distanceFare.toFixed(2)}</span></div>{selectedFare.driverAllowance > 0 && <div className="fareRow"><span>Driver allowance</span><span>₹{selectedFare.driverAllowance.toFixed(2)}</span></div>}<div className="fareRow subtotal"><span>Itemized subtotal</span><span>₹{selectedFare.itemizedSubtotal.toFixed(2)}</span></div>{selectedFare.minimumFareApplies && <><div className="fareRow minimumAdjustment"><span><IconInfo size={12} /> Minimum fare adjustment</span><span>₹{selectedFare.minimumFareAdjustment.toFixed(2)}</span></div><div className="minimumFareNote">Minimum fare of ₹{selectedFare.minimumFare.toFixed(2)} applies to this vehicle.</div></>}{couponDiscount > 0 && <div className="fareRow discountRow"><span>Coupon discount</span><span>− ₹{couponDiscount.toFixed(2).replace(/\.00$/,"")}</span></div>}{walletApplied > 0 && <div className="fareRow discountRow"><span>VOYNU Wallet</span><span>− ₹{Number(walletApplied).toFixed(2).replace(/\.00$/,"")}</span></div>}<div className="fareRow total"><span>Total</span><span>₹{payableFare.toFixed(2).replace(/\.00$/,"")}</span></div></section>{flowError && <section className="errorCard confirmError"><strong>Booking could not be confirmed.</strong><p>{flowError}</p><details open><summary>Technical diagnostic</summary><pre>{JSON.stringify({ stage: "booking.create", vehicleCategoryId: selectedFare.vehicleCategoryId, passengerCount, luggageCount, paymentMethod }, null, 2)}</pre></details></section>}{canConfirm && <><button type="button" className="confirmButton desktopConfirmButton" onClick={handleConfirm} disabled={isConfirming}><IconCheck size={18} /><span>{isConfirming ? "Saving booking…" : "Confirm booking"}</span></button><div className="mobileConfirmBar"><div className="mobileConfirmAmount"><small>Total</small><strong>₹{payableFare.toFixed(2).replace(/\.00$/,"")}</strong></div><button type="button" className="mobileConfirmButton" onClick={handleConfirm} disabled={isConfirming}><IconCheck size={17} /><span>{isConfirming ? "Saving…" : "Confirm booking"}</span><span aria-hidden="true">→</span></button></div></>}<p className="disclaimer">The displayed fare is an estimate. At confirmation, VOYNU rechecks the road distance and current pricing on the server; the saved booking fare is the authoritative amount and will not change later.</p></>}
    </div><style jsx>{`
*{box-sizing:border-box}
.page{min-height:100vh;background:${theme.colors.bg};color:${theme.colors.text};font-family:${theme.fontFamily}}
.content{width:min(${theme.maxWidth.content}px,calc(100% - 32px));margin:0 auto;padding:20px 0 calc(112px + env(safe-area-inset-bottom))}
.loading{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${theme.colors.bg}}
.spinner{width:34px;height:34px;border:3px solid ${theme.colors.primaryTint};border-top-color:${theme.colors.primary};border-radius:50%;animation:spin .8s linear infinite}
.spinner.small{width:22px;height:22px;flex:0 0 22px}
@keyframes spin{to{transform:rotate(360deg)}}

.summaryCard,.requirementsCard,.fareBreakdown,.statusCard,.errorCard,.availabilityNotice,.cabCard,.paymentCard,.couponCard{
  border:1px solid ${theme.colors.border};background:${theme.colors.surface};border-radius:${theme.radius.md}px;
}

.summaryCard{padding:16px 18px}
.summaryRoute{display:flex;align-items:flex-start;gap:12px;font-size:14px;font-weight:600;line-height:1.4}
.summaryAddress{min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.routeDot{width:9px;height:9px;margin-top:6px;border-radius:50%;flex:0 0 9px}
.routeDot.pickup{background:${theme.colors.primary};box-shadow:0 0 0 4px ${theme.colors.primaryTint}}
.routeDot.drop{background:${theme.colors.accent};box-shadow:0 0 0 4px #fff0e8}
.routeLine{width:1px;height:18px;margin:3px 0 3px 4px;background:${theme.colors.borderStrong}}
.summaryMeta{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:14px;padding-top:12px;border-top:1px solid ${theme.colors.border};color:${theme.colors.textMuted};font-size:12px}

.sectionHeading{margin:26px 0 10px;font-size:16px;font-weight:700;color:${theme.colors.textMuted}}

.requirementsCard{display:flex;align-items:center;justify-content:space-between;padding:14px 16px}
.requirementsCard label{display:flex;align-items:center;gap:8px;font-size:13.5px}
.requirementsCard label span{color:${theme.colors.textMuted}}
select{height:40px;padding:0 10px;border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm}px;background:${theme.colors.bg};color:${theme.colors.text};font:inherit;font-weight:600}

.statusCard{display:flex;gap:14px;align-items:center;padding:16px}
.statusCard strong,.errorCard strong{font-size:14.5px}
.statusCard p,.errorCard p{margin:6px 0 0;color:${theme.colors.textMuted};font-size:13px;line-height:1.5}
.errorCard{background:${theme.colors.errorBg};border-color:#efd2cd;padding:16px}
.errorCard strong{color:#8e3029}
.errorCard details{margin-top:10px}
.errorCard summary{cursor:pointer;font-weight:700;color:#8e3029;font-size:13px}
.errorCard pre{margin:8px 0 0;padding:12px;overflow:auto;border-radius:${theme.radius.sm}px;background:${theme.colors.navy};color:#dce8df;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.retryButton{margin-top:12px;border:0;border-radius:${theme.radius.sm}px;padding:10px 16px;background:${theme.colors.primary};color:#fff;font-weight:700;cursor:pointer}

.cabList{display:grid;gap:10px}
.cabCard{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;color:inherit;text-align:left;cursor:pointer}
.cabCard.active{border:1.5px solid ${theme.colors.primary};background:${theme.colors.primaryTint}}
.cabCard.unavailable{cursor:not-allowed;background:${theme.colors.bg};align-items:flex-start}
.cabCard.unavailable .cabName,.cabCard.unavailable .cabPrice{color:${theme.colors.textMuted}}
.cabCardLeft{min-width:0;flex:1}
.cabName{font-size:15px;font-weight:700}
.cabMeta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;color:${theme.colors.textMuted};font-size:11.5px;line-height:1.4}
.cabUnavailableReason{margin-top:9px;padding:9px 10px;border-radius:${theme.radius.sm}px;background:#fff;border:1px solid ${theme.colors.border}}
.cabUnavailableTitle{display:flex;align-items:center;gap:6px;color:#4e6659;font-size:11.5px;font-weight:700}
.cabUnavailableText{margin-top:4px;color:#5e6d65;font-size:11.5px;line-height:1.45}
.cabUnavailableHint{margin-top:3px;color:#75827b;font-size:11.5px;line-height:1.4}
.cabCardRight{display:flex;align-items:center;gap:12px;flex:0 0 auto}
.cabPrice{font-size:17px;font-weight:700}
.cabRadio{width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:1.5px solid ${theme.colors.borderStrong};border-radius:50%;color:#fff;flex:0 0 20px}
.cabRadio.active{border-color:${theme.colors.primary};background:${theme.colors.primary}}
.dataHealth{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;color:${theme.colors.textMuted};font-size:11px}

.paymentAction{margin-top:10px}
.paymentCard{width:100%;min-height:52px;display:flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:700;cursor:pointer;opacity:0.55}
.paymentCard.active{opacity:1;border-color:${theme.colors.primary};background:${theme.colors.primaryTint};color:${theme.colors.primary}}

.couponCard{margin-top:10px;overflow:hidden}
.couponTrigger{appearance:none;-webkit-appearance:none;width:100%;min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0;padding:12px 14px;border:0;background:transparent;color:${theme.colors.text};font-family:inherit;font-size:13px;text-align:left;cursor:pointer}
.couponTriggerLeft{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.couponIcon,.couponAppliedIcon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex:0 0 32px;border-radius:${theme.radius.sm}px;background:${theme.colors.primaryTint};color:${theme.colors.primary}}
.couponTrigger strong,.couponAppliedCopy strong{display:block;font-size:13px;font-weight:700}
.couponTrigger small,.couponAppliedCopy span{display:block;margin-top:2px;color:${theme.colors.textMuted};font-size:11px}
.couponAction{flex:0 0 auto;padding:7px 12px;border-radius:${theme.radius.sm}px;background:${theme.colors.primary};color:#fff;font-size:11.5px;font-weight:700}
.couponForm{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:0 14px 14px}
.couponForm input{min-width:0;width:100%;height:40px;padding:0 12px;border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm}px;background:${theme.colors.bg};color:${theme.colors.text};font:inherit;font-size:12px;font-weight:600;outline:none}
.couponForm input:focus{border-color:${theme.colors.primary}}
.couponForm button{height:40px;padding:0 14px;border:0;border-radius:${theme.radius.sm}px;background:${theme.colors.primary};color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}
.couponForm button:disabled{opacity:.55;cursor:wait}
.couponError{margin:0;padding:0 14px 12px;color:#b64c32;font-size:11px}
.couponApplied{display:flex;align-items:center;gap:10px;padding:12px 14px}
.couponAppliedCopy{min-width:0;flex:1}
.couponRemove{appearance:none;border:0;background:transparent;color:#b64c32;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer}

.fareBreakdown{margin-top:12px;padding:16px 18px}
.fareRow{display:flex;justify-content:space-between;gap:14px;padding:6px 0;color:${theme.colors.textMuted};font-size:13px}
.fareRow.subtotal{margin-top:6px;padding-top:12px;border-top:1px solid ${theme.colors.border};font-weight:700;color:${theme.colors.text}}
.fareRow.minimumAdjustment{color:${theme.colors.textMuted}}
.fareRow.minimumAdjustment span:first-child{display:flex;align-items:center;gap:5px}
.minimumFareNote{margin-top:2px;color:${theme.colors.textFaint};font-size:11.5px;line-height:1.45}
.discountRow{color:${theme.colors.primary};font-weight:700}
.fareRow.total{margin-top:6px;padding-top:13px;border-top:1px solid ${theme.colors.border};color:${theme.colors.text};font-size:18px;font-weight:700}

.availabilityNotice{margin-top:12px;display:flex;gap:12px;align-items:flex-start;background:${theme.colors.primaryTint};padding:16px}
.availabilityNoticeIcon{width:32px;height:32px;flex:0 0 32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;color:${theme.colors.primary}}
.availabilityNotice strong{display:block;font-size:14px}
.availabilityNotice p{margin:5px 0 0;color:${theme.colors.textMuted};font-size:12px;line-height:1.5}
.availabilityNotice .diagnosticLine{color:#738079}

.confirmError{margin-top:14px}
.desktopConfirmButton{width:100%;min-height:54px;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:${theme.radius.md}px;background:${theme.gradients.primary};box-shadow:${theme.shadow.button};color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}
.desktopConfirmButton:disabled{opacity:.7;cursor:wait}
.disclaimer{margin:12px 2px 0;text-align:center;color:${theme.colors.textFaint};font-size:11px;line-height:1.5}

.mobileConfirmBar{display:none}

@media(max-width:600px){
  .desktopConfirmButton{display:none}
  .mobileConfirmBar{
    position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;align-items:center;gap:10px;
    padding:10px 16px calc(10px + env(safe-area-inset-bottom));
    background:${theme.colors.surface};border-top:1px solid ${theme.colors.border};box-shadow:0 -8px 24px rgba(10,35,55,.08);
  }
  .mobileConfirmAmount{min-width:60px;display:flex;flex-direction:column;gap:1px}
  .mobileConfirmAmount small{font-size:11.5px;color:${theme.colors.textMuted};font-weight:700}
  .mobileConfirmAmount strong{font-size:16px;color:${theme.colors.text};font-weight:800}
  .mobileConfirmButton{flex:1;min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:${theme.radius.sm}px;background:${theme.gradients.primary};color:#fff;font-family:inherit;font-size:13px;font-weight:700}
  .mobileConfirmButton:disabled{opacity:.7}
  .requirementsCard{padding:12px 14px}
  .sectionHeading{font-size:15px;margin:22px 0 10px}
}
`}</style></main>
  );
}
