"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";
import LiveTripMap from "../../../../shared/components/LiveTripMap";
import DriverNavigationMode from "../../components/DriverNavigationMode";

const ACTIVE_STATUSES = ["on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started"];
const NAVIGATION_STATUSES = ["on_the_way", "trip_started", "return_trip_started"];
const statusColors = {
  driver_assigned: { bg: "#E0EDF7", text: "#2563A8" }, on_the_way: { bg: theme.colors.warningBg, text: theme.colors.warning },
  arrived: { bg: theme.colors.warningBg, text: theme.colors.warning }, trip_started: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  waiting_for_return: { bg: "#EEF2FF", text: "#4F46E5" }, return_trip_started: { bg: "#F3E8FF", text: "#6D28D9" }, trip_completed: { bg: "#EAFBF2", text: "#16824A" },
};

function nextStep(booking) {
  const status = booking?.booking_status;
  if (status === "driver_assigned") return { next: "on_the_way", label: "Mark: On the way" };
  if (status === "on_the_way") return { next: "arrived", label: "Mark: Arrived at pickup" };
  if (status === "arrived") return { next: "trip_started", label: "Start Outbound Trip" };
  if (status === "trip_started") return booking.trip_type === "roundtrip" ? { next: "waiting_for_return", label: "Reached Destination · Start Waiting" } : { next: "trip_completed", label: "Complete Trip" };
  if (status === "waiting_for_return") return { next: "return_trip_started", label: "Start Return Trip" };
  if (status === "return_trip_started") return { next: "trip_completed", label: "Complete Round Trip" };
  return null;
}
function needsReason(booking, next) {
  if (next === "trip_started") return booking.scheduled_pickup_at && Date.now() > new Date(booking.scheduled_pickup_at).getTime();
  if (next === "return_trip_started") return booking.scheduled_return_start_at && Date.now() > new Date(booking.scheduled_return_start_at).getTime();
  if (next === "trip_completed") return booking.scheduled_completion_at && Date.now() > new Date(booking.scheduled_completion_at).getTime();
  return false;
}
function formatDate(b) { return `${b.travel_date || ""} · ${b.pickup_time || ""}`; }
function time(value) {
  if (!value) return "—";
  if (/^\\d{2}:\\d{2}/.test(String(value))) {
    const [hh, mm] = String(value).slice(0, 5).split(":").map(Number);
    const d = new Date(2000, 0, 1, hh, mm);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function DriverPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true), [driver, setDriver] = useState(null), [notADriver, setNotADriver] = useState(false);
  const [bookings, setBookings] = useState([]), [commuteSubscriptions, setCommuteSubscriptions] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("Location tracking is off"), [driverLocation, setDriverLocation] = useState(null);
  const [navigationBookingId, setNavigationBookingId] = useState(null), [reasonPrompt, setReasonPrompt] = useState(null);
  const lastLocationSent = useRef(0), navigationDismissed = useRef(false);

  useEffect(() => { let cancelled=false; (async()=>{ const {data}=await supabase.auth.getSession(); if(!data?.session){router.push("/login");return;} const email=data.session.user.email; const {data:row,error:e}=await supabase.from("drivers").select("*, vehicles(*)").eq("email",email).maybeSingle(); if(cancelled)return; if(e||!row||row.active===false){setNotADriver(true);setChecking(false);return;} setDriver(row);setChecking(false); })(); return()=>{cancelled=true;}; },[router]);
  const fetchBookings = async()=>{
  if(!driver)return;
  setLoading(true);
  const [{data,error:e},{data:cs,error:ce}]=await Promise.all([
    supabase.from("bookings").select("*").eq("driver_id",driver.id).order("travel_date",{ascending:true}).order("pickup_time",{ascending:true}),
    supabase.from("commute_subscriptions").select("id,plan_id,pickup_name,pickup_lat,pickup_lon,drop_name,drop_lat,drop_lon,passenger_count,passengers,morning_pickup_time,evening_return_time,start_date,end_date,total_amount,payment_status,status,assigned_vehicle_id,subscription_plans(name,code),subscription_trips(trip_date,status,morning_booking_id,return_booking_id)").eq("assigned_driver_id",driver.id).order("start_date",{ascending:true})
  ]);
  setLoading(false);
  if(e||ce){setError((e||ce).message);return;}
  setBookings(data||[]);
  setCommuteSubscriptions(cs||[]);
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

  const advance = async(booking, suppliedReason=null)=>{
    const step=nextStep(booking); if(!step)return;
    let reason=suppliedReason;
    if(needsReason(booking,step.next)&&!reason){ setReasonPrompt({booking,step}); return; }
    setError("");
    const {data,error:e}=await supabase.rpc("advance_driver_booking_status",{p_booking_id:booking.id,p_next_status:step.next,p_delay_reason:reason||null});
    if(e){setError(e.message);return;}
    if(data){setBookings((prev)=>prev.map((b)=>b.id===booking.id?data:b)); if(step.next==="on_the_way"||step.next==="trip_started"||step.next==="return_trip_started"){navigationDismissed.current=false;setNavigationBookingId(booking.id);} if(step.next==="trip_completed"){setNavigationBookingId(null);}}
  };
  const submitReason=async()=>{const reason=reasonPrompt?.reason?.trim(); if(!reason){setError("Please enter the reason for the delay.");return;} const {booking,step}=reasonPrompt; setReasonPrompt(null); await advance(booking,reason);};
  const activeNavigationBooking=useMemo(()=>bookings.find((b)=>b.id===navigationBookingId&&NAVIGATION_STATUSES.includes(b.booking_status))||null,[bookings,navigationBookingId]);
  const navigationTargetType=activeNavigationBooking?.booking_status==="on_the_way"?"pickup":activeNavigationBooking?.booking_status==="return_trip_started"?"pickup":"destination";
  useEffect(()=>{const b=bookings.find((x)=>NAVIGATION_STATUSES.includes(x.booking_status)); if(b&&!navigationBookingId&&!navigationDismissed.current)setNavigationBookingId(b.id); if(navigationBookingId&&!b){navigationDismissed.current=false;setNavigationBookingId(null);}},[bookings,navigationBookingId]);
  const exitNavigation=()=>{navigationDismissed.current=true;setNavigationBookingId(null);};

  if(checking)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:theme.colors.bg}}>Checking access…</main>;
  if(notADriver)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:theme.colors.bg,fontFamily:theme.fontFamily}}><div style={{maxWidth:380,textAlign:"center",padding:30,borderRadius:20,background:"#fff",boxShadow:theme.shadow.card}}><h1>No driver profile found</h1><p style={{color:theme.colors.textFaint}}>Ask your admin to add or reactivate your Saarthi profile.</p><Link href="/" style={{color:theme.colors.primary,fontWeight:800}}>Back to home</Link></div></main>;
  if(activeNavigationBooking)return <div style={{position:"relative",width:"100vw",height:"100dvh"}}><DriverNavigationMode booking={activeNavigationBooking} driverLocation={driverLocation} targetType={navigationTargetType} onExit={exitNavigation} onComplete={()=>advance(activeNavigationBooking)} /></div>;

  const commuteBookingIds = useMemo(() => new Set(commuteSubscriptions.flatMap((s) => (s.subscription_trips || []).flatMap((t) => [t.morning_booking_id, t.return_booking_id]).filter(Boolean))), [commuteSubscriptions]);
  const active=bookings.filter((b)=>ACTIVE_STATUSES.includes(b.booking_status));
  const upcoming=bookings.filter((b)=>b.booking_status==="driver_assigned" && !commuteBookingIds.has(b.id));
  const past=bookings.filter((b)=>b.booking_status==="trip_completed" && !commuteBookingIds.has(b.id));

  const renderCard=(b)=>{const step=nextStep(b),status=statusColors[b.booking_status]||statusColors.driver_assigned;const isRound=b.trip_type==="roundtrip";const mapTarget=["trip_started"].includes(b.booking_status)?"destination":"pickup";return <article key={b.id} style={{padding:16,borderRadius:18,background:"#fff",border:`1px solid ${theme.colors.border}`,boxShadow:theme.shadow.card}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10}}><strong style={{fontSize:13}}>{formatDate(b)}</strong><span style={{padding:"4px 9px",borderRadius:20,fontSize:10,fontWeight:800,textTransform:"capitalize",background:status.bg,color:status.text}}>{b.booking_status.replace(/_/g," ")}</span></div><div style={{fontSize:13.5,fontWeight:700,lineHeight:1.6}}>📍 {b.pickup_name}<br/>🏁 {b.drop_name}</div><div style={{fontSize:11.5,color:theme.colors.textMuted,marginTop:8}}>{b.passenger_name} · {b.phone}<br/>{isRound?"Round Trip":"One Way"} · {b.vehicle_type} · ₹{b.fare}</div>{isRound&&<div style={{marginTop:10,padding:10,borderRadius:10,background:"#F3E8FF",color:"#6D28D9",fontSize:11,fontWeight:800}}>Return: {time(b.scheduled_return_start_at)} · Final arrival due: {time(b.scheduled_completion_at)}</div>}{ACTIVE_STATUSES.includes(b.booking_status)&&<div style={{marginTop:12}}><LiveTripMap pickup={{lat:b.pickup_lat,lon:b.pickup_lon}} destination={{lat:b.drop_lat,lon:b.drop_lon}} driverLocation={driverLocation} targetType={mapTarget} compact/><div style={{marginTop:7,fontSize:10,color:theme.colors.textFaint}}>Live GPS · current target: {mapTarget==="pickup"?"Pickup / return pickup":"Destination"}</div></div>}{b.booking_status==="waiting_for_return"&&<div style={{marginTop:10,padding:11,borderRadius:11,background:"#EEF2FF",color:"#4F46E5",fontSize:11.5,fontWeight:800}}>You are at the destination. Waiting for the scheduled return journey at {time(b.scheduled_return_start_at)}.</div>}{step&&<button onClick={()=>advance(b)} style={{width:"100%",minHeight:46,marginTop:12,border:0,borderRadius:12,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer"}}>{step.label}</button>}</article>;};

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
      </div>
      {todayBooking ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#EAF5FB",color:theme.colors.primary,fontSize:11,fontWeight:800}}>Today's commute · {todayBooking.booking_status.replace(/_/g," ")} · {time(todayBooking.pickup_time)}</div>
       : todayTrip?.status==="completed" ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#EAFBF2",color:"#16824A",fontSize:11,fontWeight:800}}>Today's commute completed.</div>
       : nextTrip ? <div style={{marginTop:11,padding:11,borderRadius:11,background:"#F3F7FA",color:theme.colors.textMuted,fontSize:11,fontWeight:700}}>Next commute: {nextTrip.trip_date} · {time(s.morning_pickup_time)}</div>
       : <div style={{marginTop:11,padding:11,borderRadius:11,background:"#F3F7FA",color:theme.colors.textMuted,fontSize:11,fontWeight:700}}>No remaining scheduled service day.</div>}
    </article>;
  };

  return <main style={{minHeight:"100vh",background:theme.colors.bg,fontFamily:theme.fontFamily,color:theme.colors.text}}><header style={{background:"rgba(255,255,255,.96)",borderBottom:`1px solid ${theme.colors.border}`,position:"sticky",top:0,zIndex:20}}><div style={{width:`min(680px,calc(100% - 24px))`,margin:"0 auto",minHeight:66,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:10}}><img src="/icon.svg" alt="VOYNU" width="38" height="38" style={{borderRadius:11}}/><div><div style={{fontWeight:900,color:theme.colors.primary,fontSize:16}}>VOYNU Saarthi</div><div style={{fontSize:10,color:theme.colors.textFaint}}>{driver.full_name}</div></div></div><button onClick={async()=>{await supabase.auth.signOut();router.push("/login");}} style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${theme.colors.border}`,background:"#fff",fontWeight:800,fontSize:11}}>Log out</button></div></header><div style={{width:`min(680px,calc(100% - 24px))`,margin:"0 auto",padding:"22px 0 60px"}}><div style={{padding:14,borderRadius:15,background:"#fff",border:`1px solid ${theme.colors.border}`,marginBottom:12}}><strong>{driver.vehicles?.registration_number||"No vehicle assigned"}</strong><div style={{fontSize:11,color:theme.colors.textFaint,marginTop:3}}>{driver.vehicles?`${driver.vehicles.make||""} ${driver.vehicles.model||""} · ${driver.vehicles.category||""}`:"—"}</div></div><div style={{padding:"9px 11px",borderRadius:10,background:theme.colors.primaryTint,color:theme.colors.primary,fontSize:11,fontWeight:800,marginBottom:20}}>{locationStatus}</div>{error&&<div style={{padding:11,borderRadius:10,background:theme.colors.errorBg,color:theme.colors.error,fontSize:12,marginBottom:15}}>{error}</div>}<h2 style={{fontSize:15,margin:"0 0 10px"}}>Commute subscriptions</h2>{commuteSubscriptions.length?<div style={{display:"grid",gap:12,marginBottom:25}}>{commuteSubscriptions.map(renderCommuteCard)}</div>:<p style={{fontSize:12,color:theme.colors.textFaint,marginBottom:25}}>No commute subscriptions assigned to you.</p>}<h2 style={{fontSize:15,margin:"0 0 10px"}}>Active journeys</h2>{loading?<p style={{fontSize:12,color:theme.colors.textFaint}}>Loading…</p>:active.length?<div style={{display:"grid",gap:12}}>{active.map(renderCard)}</div>:<p style={{fontSize:12,color:theme.colors.textFaint}}>No active journeys right now.</p>}<h2 style={{fontSize:15,margin:"25px 0 10px"}}>Upcoming trips</h2>{upcoming.length?<div style={{display:"grid",gap:12}}>{upcoming.map(renderCard)}</div>:<p style={{fontSize:12,color:theme.colors.textFaint}}>No upcoming trips.</p>}<h2 style={{fontSize:15,margin:"25px 0 10px"}}>Completed</h2>{past.slice(-10).reverse().map(renderCard)}{reasonPrompt&&<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(13,27,42,.55)",display:"grid",placeItems:"center",padding:18}}><div style={{width:"min(430px,100%)",background:"#fff",borderRadius:18,padding:18,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}><h3 style={{margin:"0 0 6px",fontSize:16}}>Why is this trip late?</h3><p style={{margin:"0 0 12px",fontSize:11,color:theme.colors.textMuted}}>The system recorded this action after its scheduled time. Please select a clear operational reason.</p><textarea autoFocus value={reasonPrompt.reason||""} onChange={(e)=>setReasonPrompt((p)=>({...p,reason:e.target.value}))} rows={4} placeholder="Example: passenger requested a delayed departure" style={{width:"100%",boxSizing:"border-box",border:"1px solid #D8DEE8",borderRadius:10,padding:10,fontSize:12,resize:"vertical"}}/><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}><button onClick={()=>setReasonPrompt(null)} style={{padding:"9px 12px",borderRadius:9,border:`1px solid ${theme.colors.border}`,background:"#fff",fontWeight:800}}>Cancel</button><button onClick={submitReason} style={{padding:"9px 12px",borderRadius:9,border:0,background:theme.colors.primary,color:"#fff",fontWeight:900}}>Continue</button></div></div></div>}</div></main>;
}
