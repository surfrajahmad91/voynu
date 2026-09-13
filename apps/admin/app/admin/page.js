"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";
import { theme } from "../../../../shared/lib/theme";

const modules = [
  ["/admin/bookings", "Bookings", "Confirm, assign, cancel and communicate on bookings."],
  ["/admin/trip-monitor", "Live Operations", "See live trips, driver GPS, timing and delay reasons."],
  ["/admin/dispatch", "Dispatch", "Control automatic/manual assignment and the dispatch queue."],
  ["/admin/drivers", "Drivers", "Manage drivers, availability, login status and vehicle pairing."],
  ["/admin/vehicles", "Fleet", "Manage actual vehicles, status, category and capacity."],
  ["/admin/vehicle-categories", "Vehicle Types", "Add or activate cars, auto-rickshaws, bikes and future categories."],
  ["/admin/pricing", "Pricing", "Manage versioned fare rules and round-trip waiting charges."],
  ["/admin/configuration", "Configuration", "Review service, dispatch and operational settings."],
];
const ACTIVE = ["driver_assigned", "on_the_way", "arrived", "trip_started", "waiting_for_return", "return_trip_started"];

export default function AdminDashboard() {
  const router = useRouter(); const [checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false); const [bookings,setBookings]=useState([]),[drivers,setDrivers]=useState([]),[vehicles,setVehicles]=useState([]),[alerts,setAlerts]=useState(0),[dispatchMode,setDispatchMode]=useState("manual"),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;(async()=>{const {data}=await supabase.auth.getSession();const email=data?.session?.user?.email||"";if(!data?.session){router.replace("/login");return;}if(!ADMIN_EMAILS.includes(email)){setChecking(false);return;}if(!cancelled){setAuthorized(true);setChecking(false);}})();return()=>{cancelled=true;}},[router]);
  const load=async()=>{const [{data:bs,error:be},{data:ds,error:de},{data:vs,error:ve},{data:as,error:ae},{data:dm,error:dme}]=await Promise.all([supabase.from("bookings").select("id,booking_status,payment_status,driver_id,trip_type,trip_start_on_time,return_trip_start_on_time,trip_completion_on_time").order("created_at",{ascending:false}),supabase.from("drivers").select("id,active,availability_status,vehicle_id"),supabase.from("vehicles").select("id,active,status"),supabase.rpc("get_trip_timing_alerts"),supabase.from("dispatch_settings").select("mode").eq("id",true).maybeSingle()]);const e=be||de||ve||ae||dme;if(e)setError(e.message);setBookings(bs||[]);setDrivers(ds||[]);setVehicles(vs||[]);setAlerts((as||[]).length);setDispatchMode(dm?.mode==="automatic"?"automatic":"manual");};
  useEffect(()=>{if(!authorized)return;load();const id=setInterval(load,15000);return()=>clearInterval(id);},[authorized]);
  const stats=useMemo(()=>({total:bookings.length,pending:bookings.filter(b=>b.payment_status==="pending").length,awaiting:bookings.filter(b=>b.booking_status==="confirmed"&&!b.driver_id).length,live:bookings.filter(b=>ACTIVE.includes(b.booking_status)).length,waiting:bookings.filter(b=>b.booking_status==="waiting_for_return").length,completed:bookings.filter(b=>b.booking_status==="trip_completed").length,available:drivers.filter(d=>d.active!==false&&d.availability_status==="available"&&d.vehicle_id).length,vehicles:vehicles.filter(v=>v.active&&v.status==="active").length,late:bookings.filter(b=>b.trip_start_on_time===false||b.return_trip_start_on_time===false||b.trip_completion_on_time===false).length}),[bookings,drivers,vehicles]);
  if(checking)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>Checking access…</main>;
  if(!authorized)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}><div><h1>Access denied</h1><Link href="/login">Login</Link></div></main>;
  return <main style={{minHeight:"100vh",background:theme.colors.bg,color:theme.colors.text,fontFamily:theme.fontFamily,padding:"24px 16px 60px"}}><div style={{maxWidth:1180,margin:"0 auto"}}>
    <section style={{padding:"18px 20px",borderRadius:18,background:"linear-gradient(135deg,#0D1B2A,#312E81)",color:"#fff",marginBottom:16,boxShadow:"0 12px 30px rgba(13,27,42,.14)"}}><div style={{fontSize:10,fontWeight:900,letterSpacing:1.2,textTransform:"uppercase",opacity:.78}}>Operations control centre</div><h1 style={{margin:"5px 0 0",fontSize:26}}>Good operations start with visibility.</h1><p style={{margin:"6px 0 0",fontSize:12,lineHeight:1.5,opacity:.82}}>Monitor every journey, keep the customer informed, and understand exactly why a trip misses its schedule.</p></section>
    {error&&<div style={{marginBottom:14,padding:12,borderRadius:10,background:theme.colors.errorBg,color:theme.colors.error,fontSize:12}}>{error}</div>}
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:18}}>{[["Bookings",stats.total],["Live trips",stats.live],["Waiting return",stats.waiting],["Late events",stats.late],["Awaiting dispatch",stats.awaiting],["Completed",stats.completed],["Available drivers",stats.available],["Usable vehicles",stats.vehicles]].map(([l,v])=><div key={l} style={{background:"#fff",border:`1px solid ${theme.colors.border}`,borderRadius:14,padding:12}}><div style={{fontSize:9,color:theme.colors.textFaint,fontWeight:900,textTransform:"uppercase"}}>{l}</div><div style={{marginTop:4,fontSize:23,fontWeight:900}}>{v}</div></div>)}</section>
    <section style={{background:"#fff",border:`1px solid ${theme.colors.border}`,borderRadius:16,padding:14,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:9,color:"#6D28D9",fontWeight:900,textTransform:"uppercase"}}>Dispatch</div><strong style={{fontSize:14}}>{dispatchMode==="automatic"?"Automatic assignment is ON":"Manual assignment is ON"}</strong><div style={{fontSize:11,color:theme.colors.textFaint,marginTop:3}}>{alerts?`${alerts} unacknowledged timing alert${alerts===1?"":"s"}`:"No unacknowledged timing alerts"}</div></div><Link href="/admin/trip-monitor" style={{padding:"9px 13px",borderRadius:10,background:"#6D28D9",color:"#fff",textDecoration:"none",fontSize:11,fontWeight:900}}>OPEN LIVE OPERATIONS</Link></section>
    <h2 style={{fontSize:18,margin:"0 0 10px"}}>Admin modules</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:11}}>{modules.map(([href,label,description])=><Link key={href} href={href} style={{textDecoration:"none",color:"inherit",background:"#fff",border:`1px solid ${theme.colors.border}`,borderRadius:15,padding:16,boxShadow:"0 3px 12px rgba(13,27,42,.035)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><strong style={{fontSize:14}}>{label}</strong><span style={{color:"#6D28D9",fontSize:17}}>→</span></div><div style={{marginTop:6,fontSize:11,color:theme.colors.textFaint,lineHeight:1.5}}>{description}</div></Link>)}</div>
  </div></main>;
}
