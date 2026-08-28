"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../lib/theme";

const BOOKING_STATUS_FILTERS = ["all","pending_payment","confirmed","driver_assigned","on_the_way","arrived","trip_started","trip_completed","cancelled"];
const TERMINAL_STATUSES = ["trip_completed", "cancelled"];

function IconLogout({ size = 13 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>; }
function shortLocationName(fullAddress) { if (!fullAddress) return "—"; const firstSegment = fullAddress.split(",")[0].trim(); return firstSegment || fullAddress; }
function shortBookingId(id) { if (!id) return ""; return id.slice(0, 8).toUpperCase(); }
const bookingStatusColors = { pending_payment:{bg:theme.colors.warningBg,text:theme.colors.warning},confirmed:{bg:theme.colors.primaryTint,text:theme.colors.primary},driver_assigned:{bg:"#e0edf7",text:"#2563a8"},on_the_way:{bg:"#e0edf7",text:"#2563a8"},arrived:{bg:"#e0edf7",text:"#2563a8"},trip_started:{bg:theme.colors.primaryTint,text:theme.colors.primary},trip_completed:{bg:"#e5ede8",text:"#45564c"},cancelled:{bg:theme.colors.errorBg,text:theme.colors.error} };
const tabStyle = (active) => ({ padding:"8px 14px",borderRadius:6,border:`1px solid ${active?theme.colors.primary:"#d9e0dc"}`,background:active?theme.colors.primary:"#ffffff",color:active?"#ffffff":"#45564c",fontFamily:"ui-monospace, monospace",fontWeight:700,fontSize:11,textTransform:"uppercase",cursor:"pointer" });

export default function AdminPage() {
  const router=useRouter();
  const [checking,setChecking]=useState(true); const [authorized,setAuthorized]=useState(false); const [bookings,setBookings]=useState([]); const [drivers,setDrivers]=useState([]); const [vehicles,setVehicles]=useState([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [assigningBookingId,setAssigningBookingId]=useState(null); const [selectedDriverId,setSelectedDriverId]=useState(""); const [statusFilter,setStatusFilter]=useState("all");

  useEffect(()=>{ let cancelled=false; (async()=>{ const {data}=await supabase.auth.getSession(); if(!data?.session){router.push("/login");return;} const email=(data.session.user.email||"").toLowerCase(); if(!ADMIN_EMAILS.map(e=>e.toLowerCase()).includes(email)){setChecking(false);router.push("/");return;} if(!cancelled){setAuthorized(true);setChecking(false);} })(); return()=>{cancelled=true}; },[router]);
  const fetchBookings=async()=>{setLoading(true);const {data,error:e}=await supabase.from("bookings").select("*").order("created_at",{ascending:false});setLoading(false);if(e){setError(e.message);return;}setBookings(data||[]);};
  const fetchDrivers=async()=>{const {data,error:e}=await supabase.from("drivers").select("*, vehicles(*)").order("created_at",{ascending:false});if(e){setError(e.message);return;}setDrivers(data||[]);};
  const fetchVehicles=async()=>{const {data,error:e}=await supabase.from("vehicles").select("*").order("created_at",{ascending:false});if(e){setError(e.message);return;}setVehicles(data||[]);};
  useEffect(()=>{if(!authorized)return;fetchBookings();fetchDrivers();fetchVehicles();},[authorized]);

  const handleConfirmPayment=async(booking)=>{setNotice("");setError("");const {data,error:e}=await supabase.rpc("confirm_booking_payment",{p_booking_id:booking.id});if(e){setError(e.message);return;}setBookings(p=>p.map(b=>b.id===booking.id?data:b));setNotice(`Payment confirmed for booking #${shortBookingId(booking.id)}.`);};
  const openAssign=(id)=>{setAssigningBookingId(id);setSelectedDriverId("");setNotice("");setError("");};
  const handleAssignDriver=async(booking)=>{if(!selectedDriverId){setError("Select a driver first.");return;}const driver=drivers.find(d=>d.id===selectedDriverId);if(!driver){setError("Driver not found.");return;}setError("");const {data,error:e}=await supabase.rpc("assign_booking_driver",{p_booking_id:booking.id,p_driver_id:driver.id,p_vehicle_id:driver.vehicle_id});if(e){setError(e.message);return;}setBookings(p=>p.map(b=>b.id===booking.id?data:b));setAssigningBookingId(null);setNotice(`${driver.full_name} assigned to booking #${shortBookingId(booking.id)}.`);};
  const handleCancelBooking=async(booking)=>{setNotice("");setError("");if(TERMINAL_STATUSES.includes(booking.booking_status))return;const {error:e}=await supabase.from("bookings").update({booking_status:"cancelled",driver_id:null,vehicle_id:null}).eq("id",booking.id);if(e){setError(e.message);return;}await supabase.from("driver_assignments").update({status:"cancelled"}).eq("booking_id",booking.id).eq("status","assigned");setBookings(p=>p.map(b=>b.id===booking.id?{...b,booking_status:"cancelled",driver_id:null,vehicle_id:null}:b));setNotice(`Booking #${shortBookingId(booking.id)} cancelled.`);};
  const filtered=useMemo(()=>statusFilter==="all"?bookings:bookings.filter(b=>b.booking_status===statusFilter),[bookings,statusFilter]);

  if(checking)return <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:theme.colors.bg}}><div>Loading…</div></main>;
  if(!authorized)return null;
  return <main style={{minHeight:"100vh",background:theme.colors.bg,fontFamily:theme.fontFamily,color:theme.colors.text}}><header style={{background:"rgba(255,255,255,.92)",borderBottom:`1px solid ${theme.colors.border}`,position:"sticky",top:0,zIndex:20}}><div style={{width:`min(${theme.maxWidth.content}px,calc(100% - 32px))`,margin:"0 auto",minHeight:66,display:"flex",alignItems:"center",justifyContent:"space-between"}}><strong>VOYNU Admin</strong><button onClick={async()=>{await supabase.auth.signOut();router.push("/login")}} style={{display:"flex",gap:6,alignItems:"center"}}><IconLogout/>Logout</button></div></header><section style={{width:`min(${theme.maxWidth.content}px,calc(100% - 32px))`,margin:"24px auto"}}><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{BOOKING_STATUS_FILTERS.map(s=><button key={s} onClick={()=>setStatusFilter(s)} style={tabStyle(statusFilter===s)}>{s.replaceAll("_"," ")}</button>)}</div>{notice&&<p>{notice}</p>}{error&&<p role="alert">{error}</p>}{loading?<p>Loading…</p>:filtered.map(b=><article key={b.id} style={{background:"#fff",padding:18,marginBottom:12,borderRadius:12}}><strong>#{shortBookingId(b.id)}</strong><div>{shortLocationName(b.pickup_location)} → {shortLocationName(b.destination)}</div><div>Status: {b.booking_status} · Payment: {b.payment_status}</div>{b.booking_status==="pending_payment"&&b.payment_status==="pending"&&<button onClick={()=>handleConfirmPayment(b)}>Confirm payment</button>}{["confirmed","driver_assigned"].includes(b.booking_status)&&<><button onClick={()=>openAssign(b.id)}>Assign driver</button>{assigningBookingId===b.id&&<div><select value={selectedDriverId} onChange={e=>setSelectedDriverId(e.target.value)}><option value="">Select driver</option>{drivers.filter(d=>d.active&&(!d.availability_status||d.availability_status==="available")||d.id===b.driver_id).map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select><button onClick={()=>handleAssignDriver(b)}>Save</button></div></>}{!TERMINAL_STATUSES.includes(b.booking_status)&&<button onClick={()=>handleCancelBooking(b)}>Cancel</button>}</article>)}</section></main>;
}
