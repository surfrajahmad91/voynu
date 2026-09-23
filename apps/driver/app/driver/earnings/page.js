"use client";
import {useEffect,useMemo,useState} from "react";
import DriverChrome from "../../../components/DriverChrome";
import {supabase} from "../../../../../shared/lib/supabaseClient";
import {theme} from "../../../../../shared/lib/theme";
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const fmt=d=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(d);
export default function EarningsPage(){
 const[rows,setRows]=useState([]),[mode,setMode]=useState("month"),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const{data:s}=await supabase.auth.getSession();if(!s?.session){location.href="/login";return}
  const{data:d}=await supabase.from("drivers").select("id").eq("email",s.session.user.email).maybeSingle();
  if(d){const{data:b}=await supabase.from("booking_financials").select("id,gross_amount,commission_amount,driver_payout_amount,settlement_status,completed_at,bookings(travel_date,pickup_time,pickup_name,drop_name)").eq("driver_id",d.id).order("completed_at",{ascending:false}).limit(250);setRows(b||[])}
  setLoading(false)})()},[]);
 const now=new Date(),end=fmt(now),start=mode==="today"?end:mode==="week"?fmt(new Date(now.getTime()-6*86400000)):mode==="last"?fmt(new Date(now.getFullYear(),now.getMonth()-1,1)):fmt(new Date(now.getFullYear(),now.getMonth(),1));
 const filtered=useMemo(()=>rows.filter(b=>fmt(new Date(b.completed_at))>=start&&fmt(new Date(b.completed_at))<=end),[rows,start,end]);
 const settled=filtered.filter(b=>b.settlement_status==="settled"),pending=filtered.filter(b=>b.settlement_status!=="settled");
 const total=filtered.reduce((s,b)=>s+Number(b.driver_payout_amount||0),0),pendingTotal=pending.reduce((s,b)=>s+Number(b.driver_payout_amount||0),0);
 const labels={today:"Today",week:"This Week",month:"This Month",last:"Last Month"};
 if(loading)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:theme.colors.bg}}>Loading earnings…</main>;
 return <DriverChrome active="earnings" subtitle="Earnings & Account"><div style={{width:"min(760px,calc(100% - 28px))",margin:"auto",padding:"16px 0 30px"}}>
  <section style={{background:"linear-gradient(145deg,#063B56,#0A7FA6)",color:"#fff",borderRadius:24,padding:20,boxShadow:theme.shadow.card}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:1,opacity:.8}}>SAARTHI PAYOUT</div><div style={{fontSize:32,fontWeight:900,marginTop:4}}>{money(total)}</div></div><select value={mode} onChange={e=>setMode(e.target.value)} style={{padding:"9px 11px",borderRadius:20,background:"rgba(255,255,255,.12)",color:"#fff",border:"1px solid rgba(255,255,255,.5)",fontWeight:800}}>{Object.entries(labels).map(([k,v])=><option key={k} value={k} style={{color:"#123"}}>{v}</option>)}</select></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:18}}>{[[money(settled.reduce((s,b)=>s+Number(b.driver_payout_amount||0),0)),"Settled"],[money(pendingTotal),"Pending"],[String(filtered.length),"Service days"]].map(([v,l])=><div key={l} style={{background:"#fff",color:theme.colors.text,borderRadius:13,padding:"10px 4px",textAlign:"center"}}><b style={{fontSize:12}}>{v}</b><div style={{fontSize:8,color:theme.colors.textFaint}}>{l}</div></div>)}</div>
  </section>
  <section style={{marginTop:15,background:"#fff",borderRadius:20,border:"1px solid "+theme.colors.border,padding:17}}><h2 style={{margin:0,fontSize:17}}>Recent service earnings</h2><p style={{margin:"5px 0 12px",fontSize:11,color:theme.colors.textMuted}}>Your payout is 90% of the service fare. VOYNU retains 10% commission.</p>
   {filtered.slice(0,12).map(b=><article key={b.id} style={{border:"1px solid "+theme.colors.border,borderRadius:14,padding:12,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><b style={{fontSize:11}}>{b.bookings?.travel_date||fmt(new Date(b.completed_at))} · {b.bookings?.pickup_time||""}</b><div style={{fontSize:10,color:theme.colors.textMuted,marginTop:4}}>{b.bookings?.pickup_name||"Pickup"} → {b.bookings?.drop_name||"Drop"}</div></div><strong style={{color:"#16824A"}}>{money(b.driver_payout_amount)}</strong></div><div style={{marginTop:7,fontSize:9,color:theme.colors.textFaint}}>{b.settlement_status==="settled"?"✓ Settled":"Pending settlement"} · Service fare {money(b.gross_amount)}</div></article>)}
   {!filtered.length&&<div style={{padding:25,textAlign:"center",color:theme.colors.textMuted,fontSize:12}}>No completed service earnings in this period.</div>}
  </section>
 </div></DriverChrome>
}