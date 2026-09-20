"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";
import LiveTripMap from "../../../../shared/components/LiveTripMap";
import DriverNavigationMode from "../../components/DriverNavigationMode";
import NotificationBell from "../../../../shared/components/NotificationBell";
import DriverChrome from "../../components/DriverChrome";
import TripActionSheet from "../../components/TripActionSheet";
import TripProgress from "../../components/TripProgress";
import { ACTIVE_STATUSES, NAVIGATION_STATUSES, nextStepFor, needsCollection, parseWorkflowError } from "../../lib/tripWorkflow";

const statusColors = {
  driver_assigned: { bg: "#E0EDF7", text: "#2563A8" }, on_the_way: { bg: theme.colors.warningBg, text: theme.colors.warning },
  arrived: { bg: theme.colors.warningBg, text: theme.colors.warning }, trip_started: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  waiting_for_return: { bg: "#EEF2FF", text: "#4F46E5" }, return_trip_started: { bg: "#F3E8FF", text: "#6D28D9" }, trip_completed: { bg: "#EAFBF2", text: "#16824A" },
};

function formatDate(b) { return `${b.travel_date || ""} · ${b.pickup_time || ""}`; }
function time(value) {
  if (value === null || value === undefined || value === "") return "—";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match) {
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return new Date(2000, 0, 1, hh, mm).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function DriverPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true), [driver, setDriver] = useState(null), [notADriver, setNotADriver] = useState(false);
  const [bookings, setBookings] = useState([]), [commuteSubscriptions, setCommuteSubscriptions] = useState([]), [assignmentStatuses, setAssignmentStatuses] = useState({}), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("Location tracking is off"), [driverLocation, setDriverLocation] = useState(null);
  const [navigationBookingId, setNavigationBookingId] = useState(null), [sheet, setSheet] = useState(null), [busy, setBusy] = useState(false), [sheetError, setSheetError] = useState("");
  const stepFor = (b) => nextStepFor(b, assignmentStatuses[b?.id] === "accepted");
  const [earlyMinutes, setEarlyMinutes] = useState(240);
  useEffect(() => { if (!driver) return; supabase.from("driver_workflow_settings").select("early_departure_minutes").eq("id", true).maybeSingle().then(({ data }) => { if (data?.early_departure_minutes) setEarlyMinutes(data.early_departure_minutes); }); }, [driver]);
  const lastLocationSent = useRef(0), navigationDismissed = useRef(false);

  useEffect(() => { let cancelled=false; (async()=>{ const {data}=await supabase.auth.getSession(); if(!data?.session){router.push("/login");return;} const email=data.session.user.email; const {data:row,error:e}=await supabase.from("drivers").select("*, vehicles(*)").eq("email",email).maybeSingle(); if(cancelled)return; if(e||!row||row.active===false){setNotADriver(true);setChecking(false);return;} setDriver(row);setChecking(false); })(); return()=>{cancelled=true;}; },[router]);
  const fetchBookings = async()=>{
  if(!driver)return;
  setLoading(true);
  const [{data,error:e},{data:cs,error:ce},{data:as,error:ae}]=await Promise.all([
    supabase.from("bookings").select("*").eq("driver_id",driver.id).order("travel_date",{ascending:true}).order("pickup_time",{ascending:true}),
    supabase.from("commute_subscriptions").select("id,plan_id,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,passenger_count,passengers,morning_pickup_time,evening_return_time,start_date,end_date,total_amount,payment_status,status,assigned_vehicle_id,subscription_plans(name,code),subscription_trips(trip_date,status,morning_booking_id,return_booking_id)").eq("assigned_driver_id",driver.id).order("start_date",{ascending:true}),
    supabase.rpc("get_driver_assignment_statuses")
  ]);
  setLoading(false);
  if(e||ce||ae){setError((e||ce||ae).message);return;}
  setBookings(data||[]);
  setCommuteSubscriptions(cs||[]);
  setAssignmentStatuses(Object.fromEntries((as||[]).map((x)=>[x.booking_id,x.status])));
};
  useEffect(()=>{fetchBookings();},[driver]);
  useEffect(()=>{ if(!driver)return; const channel=supabase.channel(`voynu-driver-bookings-${driver.id}`).on("postgres_changes",{event:"*",schema:"public",table:"bookings",filter:`driver_id=eq.${driver.id}`},()=>fetchBookings()).subscribe(); const subChannel=supabase.channel(`voynu-driver-commute-${driver.id}`).on("postgres_changes",{event:"*",schema:"public",table:"commute_subscriptions",filter:`assigned_driver_id=eq.${driver.id}`},()=>fetchBookings()).subscribe(); const id=setInterval(fetchBookings,10000); return()=>{clearInterval(id);supabase.removeChannel(channel);supabase.removeChannel(subChannel);}; },[driver]);

  useEffect(()=>{
    if(!driver||typeof navigator==="undefined"||!navigator.geolocation)return;
    const activeTrip=bookings.find((b)=>ACTIVE_STATUSES.includes(b.booking_status));
    if(!activeTrip){setDriverLocation(null);setLocationStatus("Location tracking will start when a trip is active");return;}
    setLocationStatus("Requesting live location…");
    const watch=navigator.geolocation.watchPosition(async(pos)=>{ const point={lat:pos.coords.latitude,lon:pos.coords.longitude}; setDriverLocation(point); const now=Date.now(); if(now-lastLocationSent.current<5000)return; lastLocationSent.current=now; const {error:e}=await supabase.rpc("update_driver_location",{p_booking_id:activeTrip.id,p_lat:point.lat,p_lon:point.lon}); if(e)setLocationStatus(e.message); else setLocationStatus(`Live location updated ${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`); },(e)=>setLocationStatus(e.code===1?"Location permission is required for live tracking":"Unable to read device location"),{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    return()=>navigator.geolocation.clearWatch(watch);
  },[driver,bookings]);

  const acceptTrip = async (booking) => {
    setError("");
    const { data, error: e } = await supabase.rpc("accept_driver_booking", { p_booking_id: booking.id });
    if (e) { setError(parseWorkflowError(e.message).message); return; }
    if (data) setAssignmentStatuses((prev) => ({ ...prev, [booking.id]: "accepted" }));
  };

  const runStep = async (booking, step, extras = {}) => {
    setBusy(true); setSheetError("");
    const { data, error: e } = await supabase.rpc("advance_driver_booking_status", {
      p_booking_id: booking.id, p_next_status: step.next, p_delay_reason: extras.reason || null,
      p_collection_status: extras.collection?.status || null, p_collected_amount: extras.collection?.amount ?? null, p_collection_note: extras.collection?.note || null,
    });
    setBusy(false);
    if (e) {
      const parsed = parseWorkflowError(e.message);
      if (parsed.kind === "needs_reason") { setSheet({ booking, step, needs: parsed }); return; }
      if (extras.fromSheet) setSheetError(parsed.message); else setError(parsed.message);
      return;
    }
    setSheet(null); setError("");
    if (data) {
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data : b)));
      if (step.next === "on_the_way" || step.next === "trip_started" || step.next === "return_trip_started") { navigationDismissed.current = false; setNavigationBookingId(booking.id); }
      if (step.next === "trip_completed") setNavigationBookingId(null);
    }
  };

  const advance = async (booking) => {
    const step = stepFor(booking); if (!step) return;
    setError("");
    if (step.action === "accept") return acceptTrip(booking);
    // pay-at-the-end trips: always record the cash outcome, even when nothing else is out of line
    if (step.next === "trip_completed" && needsCollection(booking)) { setSheetError(""); setSheet({ booking, step, needs: null }); return; }
    await runStep(booking, step);
  };
  const actionSheet = sheet ? <TripActionSheet key={`${sheet.booking.id}-${sheet.step.next}`} sheet={sheet} busy={busy} error={sheetError} onCancel={() => { setSheet(null); setSheetError(""); }} onConfirm={(values) => runStep(sheet.booking, sheet.step, { ...values, fromSheet: true })} /> : null;
  const activeNavigationBooking=useMemo(()=>bookings.find((b)=>b.id===navigationBookingId&&NAVIGATION_STATUSES.includes(b.booking_status))||null,[bookings,navigationBookingId]);
  const navigationTargetType=activeNavigationBooking?.booking_status==="on_the_way"?"pickup":activeNavigationBooking?.booking_status==="return_trip_started"?"pickup":"destination";
  useEffect(()=>{const b=bookings.find((x)=>NAVIGATION_STATUSES.includes(x.booking_status)); if(b&&!navigationBookingId&&!navigationDismissed.current)setNavigationBookingId(b.id); if(navigationBookingId&&!b){navigationDismissed.current=false;setNavigationBookingId(null);}},[bookings,navigationBookingId]);
  const exitNavigation=()=>{navigationDismissed.current=true;setNavigationBookingId(null);};

  const commuteBookingIds = useMemo(() => new Set(commuteSubscriptions.flatMap((s) => (s.subscription_trips || []).flatMap((t) => [t.morning_booking_id, t.return_booking_id]).filter(Boolean))), [commuteSubscriptions]);

  if(checking)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:theme.colors.bg}}>Checking access…</main>;
  if(notADriver)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:theme.colors.bg,fontFamily:theme.fontFamily}}><div style={{maxWidth:380,textAlign:"center",padding:30,borderRadius:20,background:"#fff",boxShadow:theme.shadow.card}}><h1>No driver profile found</h1><p style={{color:theme.colors.textFaint}}>Ask your admin to add or reactivate your Saarthi profile.</p><Link href="/" style={{color:theme.colors.primary,fontWeight:800}}>Back to home</Link></div></main>;
  if(activeNavigationBooking)return <div style={{position:"relative",width:"100vw",height:"100dvh"}}><DriverNavigationMode booking={activeNavigationBooking} driverLocation={driverLocation} targetType={navigationTargetType} actionLabel={stepFor(activeNavigationBooking)?.label||"Continue"} notice={error} onDismissNotice={()=>setError("")} onExit={exitNavigation} onComplete={()=>advance(activeNavigationBooking)} />{actionSheet}</div>;

  const active=bookings.filter((b)=>ACTIVE_STATUSES.includes(b.booking_status));
  const upcoming=bookings.filter((b)=>["driver_assigned","on_the_way","arrived","trip_started","waiting_for_return","return_trip_started"].includes(b.booking_status) && !commuteBookingIds.has(b.id)).sort((a,b)=>Number(ACTIVE_STATUSES.includes(b.booking_status))-Number(ACTIVE_STATUSES.includes(a.booking_status)));
  const past=bookings.filter((b)=>b.booking_status==="trip_completed" && !commuteBookingIds.has(b.id));

  const renderCard=(b)=>{const step=stepFor(b),status=statusColors[b.booking_status]||statusColors.driver_assigned;const isRound=b.trip_type==="roundtrip";const mapTarget=["trip_started"].includes(b.booking_status)?"destination":"pickup";return <article key={b.id} style={{padding:16,borderRadius:18,background:"#fff",border:`1px solid ${theme.colors.border}`,boxShadow:theme.shadow.card}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10}}><strong style={{fontSize:13}}>{formatDate(b)}</strong><span style={{padding:"4px 9px",borderRadius:20,fontSize:10,fontWeight:800,textTransform:"capitalize",background:status.bg,color:status.text}}>{b.booking_status.replace(/_/g," ")}</span></div><div style={{fontSize:13.5,fontWeight:700,lineHeight:1.6}}>📍 {b.pickup_name}<br/>🏁 {b.drop_name}</div><div style={{fontSize:11.5,color:theme.colors.textMuted,marginTop:8}}>{b.passenger_name} · {b.phone}<br/>{isRound?"Round Trip":"One Way"} · {b.vehicle_type} · ₹{b.fare}</div>{isRound&&<div style={{marginTop:10,padding:10,borderRadius:10,background:"#F3E8FF",color:"#6D28D9",fontSize:11,fontWeight:800}}>Return: {time(b.scheduled_return_start_at)} · Final arrival due: {time(b.scheduled_completion_at)}</div>}{ACTIVE_STATUSES.includes(b.booking_status)&&<div style={{marginTop:12}}><LiveTripMap pickup={{lat:b.pickup_lat,lon:b.pickup_lon}} destination={{lat:b.drop_lat,lon:b.drop_lon}} driverLocation={driverLocation} targetType={mapTarget} compact trafficEta/><div style={{marginTop:7,fontSize:10,color:theme.colors.textFaint}}>Live GPS · current target: {mapTarget==="pickup"?"Pickup / return pickup":"Destination"}</div></div>}{b.booking_status==="waiting_for_return"&&<div style={{marginTop:10,padding:11,borderRadius:11,background:"#EEF2FF",color:"#4F46E5",fontSize:11.5,fontWeight:800}}>You are at the destination. Waiting for the scheduled return journey at {time(b.scheduled_return_start_at)}.</div>}{step&&<button onClick={()=>advance(b)} style={{width:"100%",minHeight:46,marginTop:12,border:0,borderRadius:12,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer"}}>{step.label}</button>}</article>;};

  const openWhatsApp = (message) => window.open("https://wa.me/919918614844?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  const quickAction = async (action) => {
    if (action === "support") {
      openWhatsApp("Hi VOYNU, I need help with my Saarthi driver account.");
      return;
    }
    if (action === "issue") {
      openWhatsApp("Hi VOYNU, I want to report an issue from the Saarthi driver app.");
      return;
    }
    if (action === "emergency") {
      window.location.href = "tel:112";
      return;
    }
    if (action === "charge") {
      const openSearch = (lat, lon) => {
        window.open("https://www.google.com/maps/search/?api=1&query=EV+charging+station+" + lat + "," + lon, "_blank", "noopener,noreferrer");
      };
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => openSearch(pos.coords.latitude, pos.coords.longitude),
          () => window.open("https://www.google.com/maps/search/?api=1&query=EV+charging+station", "_blank", "noopener,noreferrer"),
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
        );
      } else {
        window.open("https://www.google.com/maps/search/?api=1&query=EV+charging+station", "_blank", "noopener,noreferrer");
      }
    }
  };

  const renderCommuteCard=(s)=>{
    const allTrips=(s.subscription_trips||[]).sort((a,b)=>String(a.trip_date).localeCompare(String(b.trip_date)));
    const serviceTrips=allTrips.filter((t)=>t.status!=="off" && t.status!=="cancelled");
    const completed=serviceTrips.filter((t)=>t.status==="completed").length;
    const today=todayIndia();
    const todayTrip=serviceTrips.find((t)=>t.trip_date===today);
    const nextTrip=serviceTrips.find((t)=>t.status==="scheduled" && String(t.trip_date)>=today);
    const todayBooking=todayTrip ? bookings.find((b)=>b.id===todayTrip.morning_booking_id || b.id===todayTrip.return_booking_id) : null;
    const progress=serviceTrips.length ? Math.round((completed/serviceTrips.length)*100) : 0;
    return <article key={s.id} style={{padding:16,borderRadius:18,background:"#fff",border:`1px solid ${theme.colors.border}`,boxShadow:theme.shadow.card}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
        <div><div style={{fontSize:10,fontWeight:900,color:theme.colors.primary,textTransform:"uppercase",letterSpacing:".7px"}}>COMMUTE · {s.subscription_plans?.name||"Subscription"}</div><strong style={{display:"block",fontSize:14,marginTop:4}}>{s.pickup_name} → {s.drop_name}</strong></div>
        <span style={{padding:"4px 9px",borderRadius:20,fontSize:10,fontWeight:800,background:"#EAFBF2",color:"#16824A"}}>{s.status.replace(/_/g," ")}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <div style={{padding:10,borderRadius:10,background:"#F7F9FB"}}><small style={{display:"block",fontSize:9,color:theme.colors.textFaint}}>DAILY SCHEDULE</small><b style={{fontSize:12}}>{time(s.morning_pickup_time)} → {time(s.evening_return_time)}</b></div>
        <div style={{padding:10,borderRadius:10,background:"#F7F9FB"}}><small style={{display:"block",fontSize:9,color:theme.colors.textFaint}}>PASSENGERS</small><b style={{fontSize:12}}>{s.passenger_count}</b></div>
      </div>
      <div style={{marginTop:11,fontSize:10.5,color:theme.colors.textMuted}}>Subscription period: {s.start_date} → {s.end_date}</div>
      <div style={{marginTop:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:800,color:theme.colors.textMuted,marginBottom:5}}><span>Service days completed</span><span>{completed}/{serviceTrips.length}</span></div>
        <div style={{height:7,borderRadius:10,background:"#EDF1F5",overflow:"hidden"}}><div style={{height:"100%",width:progress+"%",background:theme.gradients.primary,borderRadius:10}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5,marginTop:9}}>
          {serviceTrips.slice(0,12).map((t)=>{const done=t.status==="completed";const isToday=t.trip_date===today;return <div key={t.id} title={t.trip_date} style={{textAlign:"center",padding:"5px 2px",borderRadius:8,background:done?"#EAFBF2":isToday?"#EAF5FB":"#F7F9FB",border:`1px solid ${done?"#BDE8D0":isToday?theme.colors.primaryTint:theme.colors.border}`}}><div style={{fontSize:8,fontWeight:900,color:done?"#16824A":isToday?theme.colors.primary:theme.colors.textMuted}}>{done?"✓":isToday?"TODAY":"○"}</div><div style={{fontSize:8,color:theme.colors.textFaint,marginTop:2}}>{new Date(t.trip_date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div></div>})}
        </div>
      </div>
      {todayBooking ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#EAF5FB",color:theme.colors.primary,fontSize:11,fontWeight:800}}>Today's commute · {todayBooking.booking_status.replace(/_/g," ")} · {time(todayBooking.pickup_time)}</div>
       : todayTrip?.status==="completed" ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#EAFBF2",color:"#16824A",fontSize:11,fontWeight:800}}>Today's commute completed.</div>
       : nextTrip ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#F3F7FA",color:theme.colors.textMuted,fontSize:11,fontWeight:700}}>Next commute: {nextTrip.trip_date} · {time(s.morning_pickup_time)}</div>
       : <div style={{marginTop:11,padding:11,borderRadius:11,background:"#F3F7FA",color:theme.colors.textMuted,fontSize:11,fontWeight:700}}>No remaining scheduled service day.</div>}
    </article>;
  };


  return <DriverChrome active="home" subtitle={driver ? `Good evening, ${driver.full_name.split(" ")[0]} 👋` : "Good evening"}>
    <div style={{width:"min(760px,calc(100% - 28px))",margin:"0 auto",padding:"16px 0 30px"}}>
      {error&&<div role="alert" style={{marginBottom:12,padding:"11px 13px",borderRadius:14,background:"#fff1f0",color:"#a12622",border:"1px solid #f3c1bd",fontSize:12.5,fontWeight:800,display:"flex",gap:10}}><span style={{flex:1}}>{error}</span><button onClick={()=>setError("")} style={{border:0,background:"transparent",color:"#a12622",fontWeight:900,cursor:"pointer"}}>×</button></div>}
      <section style={{background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:22,boxShadow:theme.shadow.card,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><div style={{fontSize:10,fontWeight:900,color:theme.colors.textFaint,letterSpacing:1}}>YOUR VEHICLE</div><div style={{fontSize:19,fontWeight:900,marginTop:4}}>{driver.vehicles?.registration_number||"No vehicle assigned"}</div><div style={{fontSize:11,color:theme.colors.textMuted,marginTop:3}}>{driver.vehicles ? (driver.vehicles.make||"")+" "+(driver.vehicles.model||"")+" · "+(driver.vehicles.category||"") : "Ask admin to assign a vehicle"}</div></div><div style={{width:62,height:62,borderRadius:18,background:theme.colors.primaryTint,display:"grid",placeItems:"center",fontSize:34}}>🚙</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:16}}>{[["▣","Range","—"],["ϟ","Charging","Not charging"],["✓","Vehicle","Good"]].map(([i,l,v])=><div key={l} style={{padding:10,borderRadius:12,background:"#F7F9FB"}}><div style={{fontSize:16,color:theme.colors.primary}}>{i}</div><div style={{fontSize:9,color:theme.colors.textFaint,marginTop:3}}>{l}</div><div style={{fontSize:10,fontWeight:800,marginTop:2}}>{v}</div></div>)}</div>
        </div>
        <div style={{padding:"11px 16px",background:"#EAFBF2",color:"#16824A",fontSize:11,fontWeight:800}}>● &nbsp;Location tracking will start automatically when you begin a trip</div>
      </section>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"20px 4px 10px"}}><h2 style={{fontSize:18,margin:0}}>Today's Schedule</h2><span style={{padding:"7px 10px",borderRadius:20,background:theme.colors.primaryTint,color:theme.colors.primary,fontSize:10,fontWeight:900}}>Today</span></div>
      {commuteSubscriptions.length?<div style={{display:"grid",gap:12}}>{commuteSubscriptions.map((s)=>{
        const allTrips=(s.subscription_trips||[]).sort((a,b)=>String(a.trip_date).localeCompare(String(b.trip_date))); const serviceTrips=allTrips.filter(t=>t.status!=="off"&&t.status!=="cancelled"); const completed=serviceTrips.filter(t=>t.status==="completed").length; const today=todayIndia(); const todayTrip=serviceTrips.find(t=>t.trip_date===today); const nextTrip=serviceTrips.find(t=>t.status==="scheduled"&&String(t.trip_date)>=today); const todayBooking=todayTrip?bookings.find(b=>b.id===todayTrip.morning_booking_id||b.id===todayTrip.return_booking_id):null;
        return <article key={s.id} style={{background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:22,boxShadow:theme.shadow.card,overflow:"hidden"}}>
          <div style={{padding:17}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8}}><div style={{fontSize:10,fontWeight:900,color:theme.colors.primary,letterSpacing:1}}>COMMUTE · {(s.subscription_plans?.name||"SUBSCRIPTION").toUpperCase()}</div><span style={{padding:"5px 9px",borderRadius:20,background:"#EAFBF2",color:"#16824A",fontSize:9,fontWeight:900}}>{s.status}</span></div>
            <div style={{fontSize:16,fontWeight:900,lineHeight:1.45,marginTop:8}}><span style={{color:theme.colors.primary}}>●</span> {s.pickup_name}<br/><span style={{color:theme.colors.error}}>●</span> {s.drop_name}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:14}}><div style={{padding:11,borderRadius:12,background:"#F7F9FB"}}><small style={{fontSize:8,color:theme.colors.textFaint}}>PICKUP</small><b style={{display:"block",fontSize:11,marginTop:3}}>{time(s.morning_pickup_time)}</b></div><div style={{padding:11,borderRadius:12,background:"#F7F9FB"}}><small style={{fontSize:8,color:theme.colors.textFaint}}>PASSENGERS</small><b style={{display:"block",fontSize:11,marginTop:3}}>{s.passenger_count}</b></div><div style={{padding:11,borderRadius:12,background:"#F7F9FB"}}><small style={{fontSize:8,color:theme.colors.textFaint}}>DISTANCE</small><b style={{display:"block",fontSize:11,marginTop:3}}>~ {s.one_way_distance_km||"—"} km</b></div></div>
            <div style={{marginTop:13,fontSize:11,color:theme.colors.textMuted}}>Subscription progress <strong style={{float:"right",color:theme.colors.text}}>{completed}/{serviceTrips.length} days</strong></div>
            <div style={{height:7,borderRadius:10,background:"#EDF1F5",overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:(serviceTrips.length?Math.round(completed/serviceTrips.length*100):0)+"%",background:theme.gradients.primary}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:5,marginTop:10}}>{serviceTrips.slice(0,6).map(t=><div key={t.id} style={{padding:"7px 2px",textAlign:"center",borderRadius:10,background:t.status==="completed"?"#EAFBF2":t.trip_date===today?theme.colors.primaryTint:"#F7F9FB",border:"1px solid "+theme.colors.border}}><b style={{fontSize:9}}>{t.status==="completed"?"✓":t.trip_date===today?"TODAY":"○"}</b><div style={{fontSize:8,color:theme.colors.textFaint,marginTop:2}}>{new Date(t.trip_date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div></div>)}</div>
            <div style={{marginTop:12,padding:12,borderRadius:13,background:"#F3F7FA",fontSize:11,fontWeight:800}}>{todayBooking?<><span style={{color:theme.colors.primary}}>Today's commute</span> · {todayBooking.booking_status.replace(/_/g," ")} · {time(todayBooking.pickup_time)}</>:todayTrip?.status==="completed"?<span style={{color:"#16824A"}}>✓ Today's commute completed</span>:nextTrip?<>Next commute: {nextTrip.trip_date} · {time(s.morning_pickup_time)}</>: "No remaining scheduled service day"}</div>
            {todayBooking&&stepFor(todayBooking)&&<button onClick={()=>advance(todayBooking)} style={{width:"100%",marginTop:10,minHeight:46,border:0,borderRadius:13,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:12,boxShadow:theme.shadow.button}}>{stepFor(todayBooking).label} →</button>}
          </div>
          <Link href="/driver/trips" style={{display:"block",padding:"12px 17px",borderTop:"1px solid "+theme.colors.border,textAlign:"center",color:theme.colors.primary,textDecoration:"none",fontSize:11,fontWeight:900}}>View subscription details →</Link>
        </article>;
      })}</div>:<div style={{padding:18,background:"#fff",borderRadius:18,color:theme.colors.textFaint,fontSize:12}}>No commute subscriptions assigned to you.</div>}
      <section style={{marginTop:24}}><h2 style={{fontSize:18,margin:"0 4px 10px"}}>Quick actions</h2><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{[["ϟ","Fuel / Charge","charge"],["!","Report issue","issue"],["◉","Contact support","support"],["☎","Emergency","emergency"]].map(([i,l,a])=><button type="button" key={l} onClick={()=>quickAction(a)} style={{border:"1px solid "+theme.colors.border,background:"#fff",borderRadius:15,padding:"13px 4px",fontSize:9,fontWeight:900,color:theme.colors.text,cursor:"pointer"}}><div style={{fontSize:20,color:theme.colors.primary,marginBottom:5}}>{i}</div>{l}</button>)}</div></section>
      <section style={{marginTop:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:18,margin:"0 4px 10px"}}>Upcoming trips</h2>
          <Link href="/driver/trips" style={{color:theme.colors.primary,fontSize:10,fontWeight:900,textDecoration:"none"}}>View all</Link>
        </div>
        {upcoming.length ? <div style={{display:"grid",gap:10}}>{upcoming.slice(0,3).map((b)=>(
          <article key={b.id} style={{padding:14,borderRadius:18,background:"#fff",border:"1px solid "+theme.colors.border,boxShadow:theme.shadow.card}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
              <strong style={{fontSize:12}}>{formatDate(b)}</strong>
              <span style={{padding:"4px 8px",borderRadius:20,fontSize:9,fontWeight:900,textTransform:"capitalize",background:(statusColors[b.booking_status]||statusColors.driver_assigned).bg,color:(statusColors[b.booking_status]||statusColors.driver_assigned).text}}>{b.booking_status.replace(/_/g," ")}</span>
            </div>
            <div style={{marginTop:8,fontSize:12.5,fontWeight:800,lineHeight:1.5}}>📍 {b.pickup_name}<br/>🏁 {b.drop_name}</div>
            <div style={{marginTop:7,fontSize:10.5,color:theme.colors.textMuted}}>{b.passenger_name || "Passenger"} · {b.passenger_count || 1} passenger{(b.passenger_count || 1) === 1 ? "" : "s"} · {b.trip_type === "roundtrip" ? "Round Trip" : "One Way"}</div>
            <TripProgress booking={b} accepted={assignmentStatuses[b.id] === "accepted"} />
            {needsCollection(b) && <div style={{marginTop:8,padding:"7px 10px",borderRadius:10,background:"#FFF7E8",color:"#8A5700",fontSize:11,fontWeight:800}}>Collect ₹{b.fare} in cash at the end of the journey</div>}
            {b.booking_status === "waiting_for_return" && b.scheduled_return_start_at && new Date(b.scheduled_return_start_at) > new Date(b.scheduled_pickup_at || 0) && <div style={{marginTop:8,padding:"7px 10px",borderRadius:10,background:"#EEF2FF",color:"#4F46E5",fontSize:11,fontWeight:800}}>At destination · return journey at {time(b.scheduled_return_start_at)}</div>}
            {b.booking_status === "driver_assigned" && assignmentStatuses[b.id] === "accepted" && b.scheduled_pickup_at && Date.now() < new Date(b.scheduled_pickup_at).getTime() - earlyMinutes * 60000 && <div style={{marginTop:8,padding:"7px 10px",borderRadius:10,background:"#F3F7FA",color:theme.colors.textMuted,fontSize:11,fontWeight:800}}>Accepted · "Out for pickup" opens at {time(new Date(new Date(b.scheduled_pickup_at).getTime() - earlyMinutes * 60000).toISOString())}</div>}
            {b.booking_status === "driver_assigned" && assignmentStatuses[b.id] !== "accepted" ? (
              <button type="button" onClick={() => acceptTrip(b)} style={{width:"100%",minHeight:44,marginTop:11,border:0,borderRadius:12,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer"}}>Accept Trip →</button>
            ) : stepFor(b) ? (
              <button type="button" onClick={() => advance(b)} style={{width:"100%",minHeight:44,marginTop:11,border:0,borderRadius:12,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:12,cursor:"pointer"}}>{stepFor(b).label} →</button>
            ) : null}
          </article>
        ))}</div> : <div style={{padding:16,borderRadius:18,background:"#fff",border:"1px solid "+theme.colors.border,color:theme.colors.textFaint,fontSize:11}}>No upcoming trips assigned right now.</div>}
      </section>
      {actionSheet}
    </div></DriverChrome>
}
