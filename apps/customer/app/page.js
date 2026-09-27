"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import LocationPicker from "../components/LocationPicker";
import PageHeader from "../../../shared/components/PageHeader";
import AuthLanding from "../components/AuthLanding";
import OlaHomeShell from "../components/OlaHomeShell";
import { fetchActiveServiceAreas } from "../lib/serviceAreas";

import {
  calculateTripDetails,
  getChargingMessage,
  VOYNU_TRIP_CONFIG,
} from "../lib/tripRules";

import { buildWhatsAppLink } from "../lib/contact";
import { supabase } from "../../../shared/lib/supabaseClient";
import { theme } from "../../../shared/lib/theme";
import { createBookingDraft, serializeBookingDraft, validateBookingDraft } from "../lib/bookingDraft";

const DEFAULT_MAX_DISTANCE_KM = VOYNU_TRIP_CONFIG.maxOneWayDistanceKm;

function IconCheckCircle({ size = 15 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></svg>); }
function IconShield({ size = 15 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5l7.5 3.5v5.5c0 5-3.2 8.3-7.5 9.9-4.3-1.6-7.5-4.9-7.5-9.9V6l7.5-3.5z" /></svg>); }
function IconBolt({ size = 15 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>); }
function IconPhone({ size = 15 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>); }
function IconLock({ size = 13 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>); }
function IconCalendar({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>); }
function IconClock({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3.2 3.2" /></svg>); }
function IconUser({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.2 4-6.4 8-6.4s8 2.2 8 6.4" /></svg>); }
function IconChat({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1-5.3a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" /></svg>); }
function IconSwap({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h11l-3-3M17 17H6l3 3" /></svg>); }
function IconArrowRight({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>); }
function IconTaxi({ size = 22 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16h15M5.8 16l1.6-5.2a2.2 2.2 0 0 1 2.1-1.5h5a2.2 2.2 0 0 1 2.1 1.5L18.2 16" /><path d="M8 9.3V7h8v2.3" /><circle cx="8" cy="17.6" r="1.6" /><circle cx="16" cy="17.6" r="1.6" /></svg>); }
function IconAlertCircle({ size = 14 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>); }
function IconSpinner({ size = 20 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(10,127,166,0.18)" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="#0A7FA6" strokeWidth="3" strokeLinecap="round" /></svg>); }
function IconMapPinDot({ size = 12, tone = "pickup" }) { const color = tone === "pickup" ? "#0A7FA6" : "#D4552A"; return (<svg width={size} height={size} viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#ffffff" stroke={color} strokeWidth="2.4" />{tone === "pickup" && <circle cx="6" cy="6" r="2.2" fill={color} />}</svg>); }
function IconCarGraphic() { return (<svg viewBox="0 0 220 130" width="100%" height="100%"><ellipse cx="110" cy="115" rx="90" ry="8" fill="rgba(10,127,166,0.12)" /><path d="M20 90 C20 74 30 66 46 64 L54 46 C58 36 68 30 80 30 H150 C162 30 172 36 176 46 L184 64 C198 66 208 74 208 90 V96 C208 100 205 103 201 103 H27 C23 103 20 100 20 96 Z" fill="#0A7FA6" /><rect x="70" y="26" width="70" height="6" rx="3" fill="#00456B" /><path d="M60 62 L66 48 C68 44 72 41 77 41 H147 C152 41 156 44 158 48 L164 62 Z" fill="#eaf6ee" /><rect x="110" y="41" width="5" height="21" fill="#0A7FA6" /><line x1="115" y1="64" x2="115" y2="96" stroke="#00456B" strokeWidth="2" /><circle cx="66" cy="98" r="20" fill="#0A2337" /><circle cx="162" cy="98" r="20" fill="#0A2337" /><circle cx="66" cy="98" r="13" fill="#12384F" /><circle cx="66" cy="98" r="5.5" fill="#eaf6ee" /><circle cx="162" cy="98" r="13" fill="#12384F" /><circle cx="162" cy="98" r="5.5" fill="#eaf6ee" /><rect x="196" y="70" width="8" height="10" rx="3" fill="#F5813F" /><rect x="130" y="70" width="14" height="3" rx="1.5" fill="#00456B" /></svg>); }

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const acceptVerifiedSession = async (nextSession) => {
      if (!nextSession) {
        if (!cancelled) setSession(null);
        return;
      }
      if (!nextSession.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        if (!cancelled) setSession(null);
        return;
      }
      if (!cancelled) setSession(nextSession);
    };
    supabase.auth.getSession().then(({ data }) => {
      acceptVerifiedSession(data?.session || null).finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      acceptVerifiedSession(newSession);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);
  const today = useMemo(() => { const date = new Date(); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }, []);
  const [tripType, setTripType] = useState("oneway");
  const [pickup, setPickup] = useState({ name: "", lat: null, lon: null, placeId: null, city: null, selected: false });
  const [drop, setDrop] = useState({ name: "", lat: null, lon: null, placeId: null, city: null, selected: false });
  const [journeyDistanceKm, setJourneyDistanceKm] = useState(null);
  const [journeyDistanceText, setJourneyDistanceText] = useState("");
  const [journeyDurationText, setJourneyDurationText] = useState("");
  const [journeyDistanceLoading, setJourneyDistanceLoading] = useState(false);
  const [journeyDistanceError, setJourneyDistanceError] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceAreas, setServiceAreas] = useState([]);
  useEffect(() => { fetchActiveServiceAreas().then(setServiceAreas); }, []);
  const [favorites, setFavorites] = useState([]);
  const [savingFavorite, setSavingFavorite] = useState(false);
  useEffect(() => { if (!session) return; let dead = false; supabase.from("favorite_routes").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (!dead) setFavorites(data || []); }); return () => { dead = true; }; }, [session]);
  const clearMessage = useCallback(() => { setMessage(""); setMessageType(""); }, []);
  const showError = useCallback((text) => { setMessage(text); setMessageType("error"); }, []);
  const showSuccess = useCallback((text) => { setMessage(text); setMessageType("success"); }, []);
  useEffect(() => { if (whatsappSameAsPhone) setWhatsapp(phone); }, [phone, whatsappSameAsPhone]);
  const normalizeIndianPhone = (value) => { const digits = String(value || "").replace(/\D/g, ""); if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return digits; if (digits.length === 12 && digits.startsWith("91") && /^[6-9]\d{9}$/.test(digits.slice(2))) return digits.slice(2); return null; };
  const isTimeInPastForToday = (date, time) => { if (!date || !time || date !== today) return false; const [hours, minutes] = time.split(":").map(Number); const selected = new Date(); selected.setHours(hours, minutes, 0, 0); return selected < new Date(); };
  const hasValidCoordinates = (location) => Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lon));
  const hasSelectedLocation = (location) => location?.selected === true && String(location?.name || "").trim().length > 0 && hasValidCoordinates(location);
  const calculateRoadDistance = useCallback(async (pickupLocation, dropLocation) => { if (!hasSelectedLocation(pickupLocation) || !hasSelectedLocation(dropLocation)) throw new Error("Both pickup and drop locations must be selected."); const response = await fetch("/api/route-distance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: { lat: Number(pickupLocation.lat), lon: Number(pickupLocation.lon) }, destination: { lat: Number(dropLocation.lat), lon: Number(dropLocation.lon) } }) }); let data = null; try { data = await response.json(); } catch { data = null; } if (!response.ok) throw new Error(data?.error || data?.message || `Road-distance request failed (${response.status}).`); let distanceKm = null; if (Number.isFinite(Number(data?.distanceKm))) distanceKm = Number(data.distanceKm); else if (Number.isFinite(Number(data?.distanceMeters))) distanceKm = Number(data.distanceMeters) / 1000; if (!Number.isFinite(distanceKm)) throw new Error("The road-distance service returned no valid distance."); let distanceText = data?.distanceText || `${distanceKm.toFixed(1)} km`; let durationText = data?.durationText || ""; if (!durationText && Number.isFinite(Number(data?.durationSeconds))) { const totalMinutes = Math.round(Number(data.durationSeconds) / 60); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; durationText = hours > 0 ? (minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`) : `${minutes} min`; } return { distanceKm, distanceText, durationText }; }, []);
  useEffect(() => { let cancelled = false; const pickupIsSelected = hasSelectedLocation(pickup); const dropIsSelected = hasSelectedLocation(drop); if (!pickupIsSelected || !dropIsSelected) { setJourneyDistanceKm(null); setJourneyDistanceText(""); setJourneyDurationText(""); setJourneyDistanceError(""); setJourneyDistanceLoading(false); return () => { cancelled = true; }; } const sameLatitude = Math.abs(Number(pickup.lat) - Number(drop.lat)) < 0.00001; const sameLongitude = Math.abs(Number(pickup.lon) - Number(drop.lon)) < 0.00001; if (sameLatitude && sameLongitude) { setJourneyDistanceKm(null); setJourneyDistanceText(""); setJourneyDurationText(""); setJourneyDistanceLoading(false); setJourneyDistanceError("Pickup and drop locations cannot be the same."); return () => { cancelled = true; }; } setJourneyDistanceKm(null); setJourneyDistanceText(""); setJourneyDurationText(""); setJourneyDistanceError(""); setJourneyDistanceLoading(true); const calculate = async () => { try { const result = await calculateRoadDistance(pickup, drop); if (cancelled) return; setJourneyDistanceKm(result.distanceKm); setJourneyDistanceText(result.distanceText); setJourneyDurationText(result.durationText); setJourneyDistanceError(""); setJourneyDistanceLoading(false); } catch (error) { if (cancelled) return; console.error("VOYNU road distance error:", error); setJourneyDistanceKm(null); setJourneyDistanceText(""); setJourneyDurationText(""); setJourneyDistanceLoading(false); setJourneyDistanceError(error?.message || "Unable to calculate road distance."); } }; calculate(); return () => { cancelled = true; }; }, [pickup, drop, calculateRoadDistance]);
  const totalJourneyDistanceKm = journeyDistanceKm !== null ? tripType === "roundtrip" ? journeyDistanceKm * 2 : journeyDistanceKm : null;
  const tripDetails = useMemo(() => { if (!hasSelectedLocation(pickup) || !hasSelectedLocation(drop) || journeyDistanceKm === null) return null; return calculateTripDetails({ pickup, drop, tripType, distanceKm: journeyDistanceKm, serviceAreas }); }, [pickup, drop, tripType, journeyDistanceKm, serviceAreas]);
  const handleTripTypeChange = (type) => { clearMessage(); setTripType(type); if (type === "oneway") { setReturnDate(""); setReturnTime(""); } };
  const handleTravelDateChange = (value) => { clearMessage(); setTravelDate(value); if (returnDate && value && returnDate < value) { setReturnDate(""); setReturnTime(""); } if (pickupTime && value === today && isTimeInPastForToday(value, pickupTime)) setPickupTime(""); };
  const handlePickupTimeChange = (value) => { clearMessage(); if (travelDate === today && isTimeInPastForToday(today, value)) { showError("Pickup time cannot be in the past."); setPickupTime(""); return; } setPickupTime(value); };
  const handlePickupSelect = useCallback((location) => { clearMessage(); if (!location) { setPickup({ name: "", lat: null, lon: null, placeId: null, city: null, selected: false }); return; } const name = String(location.name || "").trim(); const lat = Number.isFinite(Number(location.lat)) ? Number(location.lat) : null; const lon = Number.isFinite(Number(location.lon)) ? Number(location.lon) : null; const selected = Boolean(name) && Number.isFinite(lat) && Number.isFinite(lon); setPickup({ name, lat, lon, placeId: location.placeId ?? null, city: location.city ?? null, selected }); }, [clearMessage]);
  const handleDropSelect = useCallback((location) => { clearMessage(); if (!location) { setDrop({ name: "", lat: null, lon: null, placeId: null, city: null, selected: false }); return; } const name = String(location.name || "").trim(); const lat = Number.isFinite(Number(location.lat)) ? Number(location.lat) : null; const lon = Number.isFinite(Number(location.lon)) ? Number(location.lon) : null; const selected = Boolean(name) && Number.isFinite(lat) && Number.isFinite(lon); setDrop({ name, lat, lon, placeId: location.placeId ?? null, city: location.city ?? null, selected }); }, [clearMessage]);
  useEffect(() => { if (checkingSession || !session) return; const params = new URLSearchParams(window.location.search); if (params.get("rebook") !== "1") return; const pLat = Number(params.get("pLat")), pLon = Number(params.get("pLon")), dLat = Number(params.get("dLat")), dLon = Number(params.get("dLon")); if (params.get("pName") && Number.isFinite(pLat) && Number.isFinite(pLon)) handlePickupSelect({ name: params.get("pName"), lat: pLat, lon: pLon }); if (params.get("dName") && Number.isFinite(dLat) && Number.isFinite(dLon)) handleDropSelect({ name: params.get("dName"), lat: dLat, lon: dLon }); if (params.get("tripType") === "roundtrip") setTripType("roundtrip"); if (params.get("pn")) setPassengerName(params.get("pn")); if (params.get("ph")) { setPhone(params.get("ph")); setWhatsappSameAsPhone(true); } showSuccess("Prefilled from your last trip \u2014 just pick a new date and time."); window.history.replaceState(null, "", window.location.pathname); }, [checkingSession, session, handlePickupSelect, handleDropSelect, showSuccess]);
  const isFavoriteSaved = favorites.some(f => f.pickup_name === pickup.name && f.drop_name === drop.name);
  const applyFavorite = useCallback((f) => { clearMessage(); handlePickupSelect({ name: f.pickup_name, lat: f.pickup_lat, lon: f.pickup_lon }); handleDropSelect({ name: f.drop_name, lat: f.drop_lat, lon: f.drop_lon }); }, [clearMessage, handlePickupSelect, handleDropSelect]);
  const saveFavorite = useCallback(async () => { if (!pickup.selected || !drop.selected || savingFavorite || !session) return; const label = window.prompt("Save this route as:", "Home \u2192 Office") || ""; if (!label.trim()) return; setSavingFavorite(true); const { data, error } = await supabase.from("favorite_routes").insert({ user_id: session.user.id, label: label.trim(), pickup_name: pickup.name, pickup_lat: pickup.lat, pickup_lon: pickup.lon, drop_name: drop.name, drop_lat: drop.lat, drop_lon: drop.lon }).select().single(); setSavingFavorite(false); if (error) { showError("Could not save this route. Please try again."); return; } setFavorites(v => [data, ...v]); showSuccess("Saved to your favorite routes."); }, [pickup, drop, session, savingFavorite, showError, showSuccess]);
  const removeFavorite = useCallback(async (id) => { setFavorites(v => v.filter(f => f.id !== id)); await supabase.from("favorite_routes").delete().eq("id", id); }, []);
  const handlePhoneChange = (event) => { const value = event.target.value.replace(/[^\d+]/g, ""); setPhone(value); if (whatsappSameAsPhone) setWhatsapp(value); clearMessage(); };
  const handleWhatsAppChange = (event) => { const value = event.target.value.replace(/[^\d+]/g, ""); setWhatsapp(value); clearMessage(); };
  const handleWhatsAppToggle = () => { clearMessage(); const nextState = !whatsappSameAsPhone; setWhatsappSameAsPhone(nextState); if (nextState) setWhatsapp(phone); };
  const buildBookingData = () => createBookingDraft({ tripType, pickup: { name: pickup.name.trim(), lat: pickup.lat, lon: pickup.lon, placeId: pickup.placeId, city: pickup.city }, drop: { name: drop.name.trim(), lat: drop.lat, lon: drop.lon, placeId: drop.placeId }, journey: { oneWayDistanceKm: journeyDistanceKm, oneWayDistanceText: journeyDistanceText, totalDistanceKm: totalJourneyDistanceKm, totalDistanceText: totalJourneyDistanceKm !== null ? `${totalJourneyDistanceKm.toFixed(1)} km` : "", durationText: journeyDurationText, maximumDistancePerLegKm: tripDetails?.maxOneWayDistanceKm ?? DEFAULT_MAX_DISTANCE_KM, serviceAreaId: tripDetails?.serviceArea?.id ?? null, chargingRequired: tripDetails?.chargingRequired ?? false, chargingBreakMinutes: tripDetails?.chargingBreakMinutes ?? 0 }, travelDate, pickupTime, returnDate: tripType === "roundtrip" ? returnDate : null, returnTime: tripType === "roundtrip" ? returnTime : null, passengerName: passengerName.trim(), phone: normalizeIndianPhone(phone), whatsapp: normalizeIndianPhone(whatsapp), createdAt: new Date().toISOString() });
  const validateBooking = () => { if (!pickup.name.trim()) return "Please select your pickup location."; if (!hasSelectedLocation(pickup)) return "Please select your pickup location from the suggested locations."; if (!drop.name.trim()) return "Please select your drop location."; if (!hasSelectedLocation(drop)) return "Please select your drop location from the suggested locations."; const sameLatitude = Math.abs(Number(pickup.lat) - Number(drop.lat)) < 0.00001; const sameLongitude = Math.abs(Number(pickup.lon) - Number(drop.lon)) < 0.00001; if (sameLatitude && sameLongitude) return "Pickup and drop locations cannot be the same."; if (journeyDistanceKm === null) { if (journeyDistanceLoading) return "Please wait while we calculate the road distance between your pickup and drop locations."; return journeyDistanceError || "We couldn't calculate the journey distance. Please select your locations again."; } if (!Number.isFinite(journeyDistanceKm)) return "We couldn't calculate the journey distance. Please select your locations again."; if (!tripDetails || !tripDetails.valid) return tripDetails?.reason || "We couldn't validate this journey. Please select your locations again."; if (!travelDate) return "Please select your travel date."; if (travelDate < today) return "Travel date cannot be in the past."; if (!pickupTime) return "Please select your pickup time."; if (travelDate === today && isTimeInPastForToday(travelDate, pickupTime)) return "Pickup time cannot be in the past."; const trimmedName = passengerName.trim(); if (!trimmedName) return "Please enter the passenger name."; if (trimmedName.length < 2) return "Please enter a valid passenger name."; const normalizedPhone = normalizeIndianPhone(phone); if (!normalizedPhone) return "Please enter a valid 10-digit Indian mobile number."; const normalizedWhatsApp = normalizeIndianPhone(whatsapp); if (!normalizedWhatsApp) return "Please enter a valid WhatsApp mobile number."; if (tripType === "roundtrip") { if (!returnDate) return "Please select the return date."; if (returnDate < travelDate) return "Return date cannot be before the travel date."; if (!returnTime) return "Please select the return time."; if (returnDate === today && isTimeInPastForToday(returnDate, returnTime)) return "Return time cannot be in the past."; if (returnDate === travelDate && returnTime < pickupTime) return "Return time cannot be before the pickup time."; } return null; };
  const handleContinue = () => { if (isSubmitting) return; clearMessage(); const validationError = validateBooking(); if (validationError) { showError(validationError); return; } setIsSubmitting(true); const bookingData = buildBookingData(); const draftError = validateBookingDraft(bookingData); if (draftError) { showError(draftError); return; } try { sessionStorage.setItem("voynu_booking", serializeBookingDraft(bookingData)); sessionStorage.setItem("voynu_booking_created_at", bookingData.createdAt); router.push("/cab-selection"); } catch (error) { console.error("Unable to save booking data:", error); showError("We couldn't save your trip details. Please try again."); setIsSubmitting(false); } };
  const bothLocationsSelected = hasSelectedLocation(pickup) && hasSelectedLocation(drop);
  const routeCardStatus = !bothLocationsSelected ? "idle" : journeyDistanceLoading ? "loading" : journeyDistanceError ? "error" : tripDetails && !tripDetails.valid ? "invalid" : journeyDistanceKm !== null && tripDetails?.valid ? "valid" : "idle";
  if (checkingSession) return (<main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.colors.bg }}><div style={{ width: 34, height: 34, border: "3px solid rgba(10,127,166,0.18)", borderTopColor: theme.colors.primary, borderRadius: "50%" }} /></main>);
  if (!session) return <AuthLanding />;

  return (
    <OlaHomeShell
      router={router}
      session={session}
      tripType={tripType}
      handleTripTypeChange={handleTripTypeChange}
      pickup={pickup}
      drop={drop}
      handlePickupSelect={handlePickupSelect}
      handleDropSelect={handleDropSelect}
      journeyDistanceKm={journeyDistanceKm}
      journeyDistanceText={journeyDistanceText}
      journeyDurationText={journeyDurationText}
      journeyDistanceLoading={journeyDistanceLoading}
      journeyDistanceError={journeyDistanceError}
      tripDetails={tripDetails}
      totalJourneyDistanceKm={totalJourneyDistanceKm}
      travelDate={travelDate}
      pickupTime={pickupTime}
      handleTravelDateChange={handleTravelDateChange}
      handlePickupTimeChange={handlePickupTimeChange}
      returnDate={returnDate}
      returnTime={returnTime}
      setReturnDate={setReturnDate}
      setReturnTime={setReturnTime}
      passengerName={passengerName}
      setPassengerName={setPassengerName}
      phone={phone}
      handlePhoneChange={handlePhoneChange}
      whatsapp={whatsapp}
      handleWhatsAppChange={handleWhatsAppChange}
      whatsappSameAsPhone={whatsappSameAsPhone}
      handleWhatsAppToggle={handleWhatsAppToggle}
      message={message}
      messageType={messageType}
      isSubmitting={isSubmitting}
      handleContinue={handleContinue}
      favorites={favorites}
      applyFavorite={applyFavorite}
      removeFavorite={removeFavorite}
      saveFavorite={saveFavorite}
      savingFavorite={savingFavorite}
      isFavoriteSaved={isFavoriteSaved}
      getChargingMessage={getChargingMessage}
      defaultMaxDistanceKm={DEFAULT_MAX_DISTANCE_KM}
    />
  );
}
