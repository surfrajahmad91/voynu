"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const AREAS = [
  ["Operations", "Bookings, drivers and day-to-day operations", "/admin", "▦"],
  ["Dispatch", "Assignment queue and dispatch mode", "/admin/dispatch", "⇄"],
  ["Vehicle Categories", "Customer visibility, capacity and ordering", "/admin/vehicle-categories", "▤"],
  ["Fleet", "Vehicles, status and assignments", "/admin/vehicles", "▱"],
  ["Pricing", "Fare versions and waiting policy", "/admin/pricing", "₹"],
  ["Commute Subscriptions", "Plans, discounts, holidays and recurring commuters", "/admin/subscriptions", "📅"],
  ["Configuration", "System-wide configuration surfaces and future controls", "/admin/configuration", "⚙"],
];

export default function ControlCentrePage() {
  const router = useRouter();
  const [checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false),[categories,setCategories]=useState([]),[vehicles,setVehicles]=useState([]),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;(async()=>{const {data}=await supabase.auth.getSession();const email=data?.session?.user?.email||"";if(!data?.session)return router.replace("/login");if(!ADMIN_EMAILS.includes(email))return setChecking(false);if(!cancelled){setAuthorized(true);setChecking(false)}})();return()=>{cancelled=true}},[router]);
  useEffect(()=>{if(!authorized)return;(async()=>{const [c,v]=await Promise.all([supabase.from("vehicle_categories").select("id,name,slug,active,bookable,sort_order,passenger_capacity,luggage_capacity").order("sort_order"),supabase.from("vehicles").select("id,vehicle_category_id,active,status")]);if(c.error)return setError(c.error.message);if(v.error)return setError(v.error.message);setCategories(c.data||[]);setVehicles(v.data||[])})()},[authorized]);
  const activeVehicleCount=id=>vehicles.filter(v=>v.vehicle_category_id===id&&v.active&&!['maintenance','inactive','unavailable','retired'].includes(v.status||'active')).length;
  const visibleCount=categories.filter(c=>c.active&&c.bookable&&activeVehicleCount(c.id)>0).length;
  if(checking)return <main style={styles.center}>Checking admin access…</main>;
  if(!authorized)return <main style={styles.center}><div><h1>Access denied</h1><Link href="/admin">Return to Admin</Link></div></main>;
  return <main style={styles.page}><header style={styles.header}><div style={styles.headerInner}><div><div style={styles.eyebrow}>VOYNU ADMIN</div><h1 style={styles.title}>Control Centre</h1><p style={styles.subtitle}>Operations and system configuration.</p></div><Link href="/admin" style={styles.headerLink}>Classic dashboard →</Link></div></header><div style={styles.container}>{error&&<div style={styles.error}>{error}</div>}<section style={styles.metrics}><Metric label="Vehicle categories" value={categories.length}/><Metric label="Customer-visible" value={visibleCount} accent={theme.colors.success}/><Metric label="Fleet vehicles" value={vehicles.length}/><Metric label="Active fleet" value={vehicles.filter(v=>v.active&&!['maintenance','inactive','unavailable','retired'].includes(v.status||'active')).length} accent={theme.colors.primary}/></section><section style={styles.card}><h2 style={styles.sectionTitle}>Administration</h2><p style={styles.sectionText}>Operational areas are kept separate so configuration changes do not get mixed with live booking work.</p><div style={styles.grid}>{AREAS.map(([title,description,href,icon])=><Link href={href} key={href} style={styles.tile}><span style={styles.icon}>{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span style={styles.arrow}>→</span></Link>)}</div></section></div></main>;
}
function Metric({label,value,accent}){return <div style={styles.metric}><span>{label}</span><strong style={{color:accent||theme.colors.text}}>{value}</strong></div>}
const styles={page:{minHeight:'100vh',background:theme.colors.bg,color:theme.colors.text,fontFamily:theme.fontFamily},center:{minHeight:'100vh',display:'grid',placeItems:'center',background:theme.colors.bg,color:theme.colors.text,fontFamily:theme.fontFamily},header:{background:theme.colors.navy,color:'#fff',borderBottom:`3px solid ${theme.colors.accent}`},headerInner:{width:`min(${theme.maxWidth.wide}px,calc(100% - 28px))`,margin:'0 auto',padding:'24px 0',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'},eyebrow:{color:theme.colors.accentLight,fontSize:10,fontWeight:800,letterSpacing:1.5},title:{margin:'4px 0 0',fontSize:'clamp(28px,4vw,40px)',letterSpacing:-1},subtitle:{margin:'6px 0 0',color:'rgba(255,255,255,.72)',fontSize:12},headerLink:{color:'#fff',textDecoration:'none',border:'1px solid rgba(255,255,255,.25)',borderRadius:theme.radius.sm,padding:'8px 11px',fontSize:10,fontWeight:800},container:{width:`min(${theme.maxWidth.wide}px,calc(100% - 28px))`,margin:'0 auto',padding:'20px 0 60px'},metrics:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16},metric:{background:theme.colors.surface,border:`1px solid ${theme.colors.border}`,borderRadius:theme.radius.md,padding:15,boxShadow:theme.shadow.card,display:'flex',flexDirection:'column',gap:4},card:{background:theme.colors.surface,border:`1px solid ${theme.colors.border}`,borderRadius:theme.radius.md,padding:18,boxShadow:theme.shadow.card},sectionTitle:{margin:0,fontSize:18},sectionText:{margin:'5px 0 16px',fontSize:11,color:theme.colors.textMuted},grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:9},tile:{display:'grid',gridTemplateColumns:'32px 1fr 18px',alignItems:'center',gap:9,padding:12,border:`1px solid ${theme.colors.border}`,borderRadius:12,textDecoration:'none',color:theme.colors.text,background:theme.colors.bg},icon:{fontSize:18,textAlign:'center'},arrow:{color:theme.colors.textMuted},error:{background:'#fff2ee',border:'1px solid #f1c2b5',color:'#9f321c',padding:12,borderRadius:10,fontSize:12,fontWeight:700,marginBottom:14}};
