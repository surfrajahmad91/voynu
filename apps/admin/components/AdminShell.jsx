"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";
import { isAdminUser, clearAdminCache } from "../lib/admin";
import AdminNotificationBell from "./AdminNotificationBell";

const groups=[
 {label:"WORKSPACE",items:[
  ["/admin","Dashboard","⌂"],
 ]},
 {label:"BOOKINGS",items:[
  ["/admin/bookings?type=ride","Ride bookings","🚕"],
  ["/admin/rentals","Rentals","🚗"],
  ["/admin/subscriptions","Commute subscriptions","📅"],
 ]},
 {label:"OPERATIONS",items:[
  ["/admin/trip-monitor","Live trips","◉"],
  ["/admin/dispatch","Dispatch","⇄"],
  ["/admin/drivers","Drivers","♙"],
  ["/admin/vehicles","Fleet & vehicles","▣"],
  ["/admin/vehicle-categories","Vehicle types","▦"],
 ]},
 {label:"MANAGE",items:[
  ["/admin/pricing","Pricing","₹"],
  ["/admin/configuration","Configuration","⚙"],
  ["/admin/activity","Activity log","☰"],
 ]},
];

const PUBLIC_PATHS=["/login","/forgot-password","/reset-password"];
function hrefPath(href){return href.split("?")[0]}
function isActive(pathname,href){
 const p=hrefPath(href);
 if(p==="/admin")return pathname==="/admin";
 return pathname?.startsWith(p);
}
const initials=(name)=>String(name||"A").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join("")||"A";
const shortId=id=>id?String(id).slice(0,8).toUpperCase():"";
const place=v=>v?String(v).split(",")[0].trim():"";

function GlobalSearch(){
 const router=useRouter();
 const[q,setQ]=useState(""),[results,setResults]=useState(null),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const box=useRef(null),seq=useRef(0);
 useEffect(()=>{
  const term=q.trim();
  if(term.length<2){setResults(null);setBusy(false);return}
  const mine=++seq.current;setBusy(true);
  const t=setTimeout(async()=>{
   const{data,error}=await supabase.rpc("admin_search",{p_query:term});
   if(mine!==seq.current)return;
   setBusy(false);setResults(error?{error:error.message}:data);
  },250);
  return()=>clearTimeout(t);
 },[q]);
 useEffect(()=>{
  const close=e=>{if(box.current&&!box.current.contains(e.target))setOpen(false)};
  document.addEventListener("mousedown",close);document.addEventListener("touchstart",close);
  return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("touchstart",close)};
 },[]);
 const go=href=>{setOpen(false);setQ("");setResults(null);router.push(href)};
 const empty=results&&!results.error&&!(results.bookings?.length||results.drivers?.length||results.subscriptions?.length);
 return <div className="adminSearch" ref={box} style={{position:"relative"}}>
  <span>⌕</span>
  <input aria-label="Search" value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==="Escape")setOpen(false)}} placeholder="Search bookings, drivers, customers…"/>
  {open&&q.trim().length>=2&&<div role="listbox" style={{position:"absolute",left:0,right:0,top:"calc(100% + 6px)",zIndex:60,background:"#fff",color:"#12251a",border:"1px solid #d8dee8",borderRadius:12,boxShadow:"0 14px 40px rgba(0,0,0,.18)",maxHeight:"70vh",overflowY:"auto",padding:6}}>
   {busy&&!results&&<div style={{padding:12,fontSize:12,color:"#6b7a72"}}>Searching…</div>}
   {results?.error&&<div style={{padding:12,fontSize:12,color:"#a12622"}}>{results.error}</div>}
   {empty&&<div style={{padding:12,fontSize:12,color:"#6b7a72"}}>No matches for “{q.trim()}”.</div>}
   {results?.bookings?.length>0&&<Section title="Bookings">{results.bookings.map(b=><Row key={b.id} onClick={()=>go(`/admin/bookings?type=ride&q=${shortId(b.id)}`)} main={`#${shortId(b.id)} · ${b.passenger_name||"Passenger"}`} sub={`${place(b.pickup_name)} → ${place(b.drop_name)} · ${String(b.booking_status||"").replace(/_/g," ")}${b.phone?` · ${b.phone}`:""}`}/>)}</Section>}
   {results?.drivers?.length>0&&<Section title="Drivers">{results.drivers.map(d=><Row key={d.id} onClick={()=>go("/admin/drivers")} main={d.full_name} sub={`${d.registration_number||"No vehicle"} · ${d.availability_status||""}${d.phone?` · ${d.phone}`:""}`}/>)}</Section>}
   {results?.subscriptions?.length>0&&<Section title="Commute subscriptions">{results.subscriptions.map(s=><Row key={s.id} onClick={()=>go("/admin/subscriptions")} main={`#${shortId(s.id)} · ${s.status||""}`} sub={`${place(s.pickup_name)} → ${place(s.drop_name)} · ${s.start_date||""}`}/>)}</Section>}
  </div>}
 </div>;
}
function Section({title,children}){return <div style={{padding:"4px 0"}}><div style={{padding:"6px 10px",fontSize:10,fontWeight:900,letterSpacing:1,color:"#6b7a72",textTransform:"uppercase"}}>{title}</div>{children}</div>}
function Row({main,sub,onClick}){return <button type="button" onClick={onClick} style={{display:"block",width:"100%",textAlign:"left",border:0,background:"transparent",padding:"8px 10px",borderRadius:8,cursor:"pointer",font:"inherit"}} onMouseEnter={e=>e.currentTarget.style.background="#f3f7f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{fontSize:13,fontWeight:800}}>{main}</div><div style={{fontSize:11,color:"#6b7a72",marginTop:2}}>{sub}</div></button>}

export default function AdminShell({children}){
 const pathname=usePathname();
 const router=useRouter();
 const[open,setOpen]=useState(false);
 const[access,setAccess]=useState("checking"); // checking | ok | denied
 const[me,setMe]=useState({name:"",email:""});
 const isPublic=PUBLIC_PATHS.includes(pathname);

 useEffect(()=>{
  if(isPublic)return;
  let cancelled=false;
  const check=async()=>{
   const{data}=await supabase.auth.getSession();
   const user=data?.session?.user;
   if(!user){if(!cancelled)router.replace("/login");return}
   const ok=await isAdminUser(user.email||"");
   if(cancelled)return;
   setAccess(ok?"ok":"denied");
   if(ok){
    const{data:profile}=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
    if(!cancelled)setMe({name:profile?.full_name||"",email:user.email||""});
   }
  };
  check();
  const{data:sub}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||!session){clearAdminCache();router.replace("/login")}
  });
  return()=>{cancelled=true;sub?.subscription?.unsubscribe()};
 },[isPublic,router]);

 if(isPublic)return children;
 if(access==="checking")return <div className="adminLoading">Checking admin access…</div>;
 if(access==="denied")return <div className="adminLoading"><div style={{textAlign:"center"}}><h2>Access denied</h2><p>This account does not have admin access.</p><button onClick={async()=>{await supabase.auth.signOut();clearAdminCache();router.replace("/login")}} style={{padding:"10px 16px",borderRadius:10,border:0,background:"#0a7fa6",color:"#fff",fontWeight:800}}>Sign out</button></div></div>;
 const displayName=me.name||me.email||"Administrator";
 return <div className="adminApp">
  <aside className={open?"adminSidebar open":"adminSidebar"}>
   <div className="adminSidebarBrand">
    <Link href="/admin" onClick={()=>setOpen(false)} className="adminBrand">
     <img src="/icon.svg" alt="VOYNU" width="42" height="42"/>
     <span><strong>VOYNU</strong><small>Mobility for a Better Tomorrow</small></span>
    </Link>
    <button className="adminSidebarClose" onClick={()=>setOpen(false)} aria-label="Close menu">×</button>
   </div>
   <div className="adminNavScroll">
    {groups.map(group=><div className="adminNavGroup" key={group.label}>
     <div className="adminNavLabel">{group.label}</div>
     {group.items.map(([href,label,icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={isActive(pathname,href)?"adminNavItem active":"adminNavItem"}>
       <span className="adminNavIcon">{icon}</span><span>{label}</span>
      </Link>)}
    </div>)}
   </div>
   <div className="adminSidebarFooter"><div className="adminUserAvatar">{initials(displayName)}</div><div style={{minWidth:0}}><strong style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</strong><small>Administrator</small></div><button title="Sign out" aria-label="Sign out" onClick={async()=>{await supabase.auth.signOut();clearAdminCache();router.replace("/login")}} style={{marginLeft:"auto",background:"transparent",border:0,color:"inherit",cursor:"pointer",fontSize:16}}>⇥</button></div>
  </aside>
  {open&&<button className="adminOverlay" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
  <section className="adminMain">
   <header className="adminTopbar">
    <button className="adminMenuButton" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button>
    <Link href="/admin" className="adminMobileBrand"><img src="/icon.svg" alt="VOYNU" width="35" height="35"/><strong>VOYNU</strong></Link>
    <GlobalSearch/>
    <div className="adminTopActions"><span className="adminSystem"><i/> System Online</span><AdminNotificationBell/><Link href="/admin/configuration" className="adminGear">⚙</Link></div>
   </header>
   <main className="adminPage">{children}</main>
  </section>
  <nav className="adminBottomNav">
   {[["/admin","⌂","Home"],["/admin/bookings?type=ride","🚕","Rides"],["/admin/trip-monitor","◉","Live"],["/admin/dispatch","⇄","Dispatch"],["/admin/configuration","⚙","More"]].map(([href,icon,label])=><Link key={label} href={href} className={isActive(pathname,href)?"active":""}><span>{icon}</span><small>{label}</small></Link>)}
  </nav>
 </div>
}
