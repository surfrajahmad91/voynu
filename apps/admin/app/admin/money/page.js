"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "../../../../shared/lib/supabaseClient";
import {theme} from "../../../../shared/lib/theme";

const TZ="Asia/Kolkata";
const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const dateKey=d=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ}).format(d);
const fmtDate=v=>v?new Date(v).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function MoneyPage(){
 const[authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[loading,setLoading]=useState(true);
 const[rows,setRows]=useState([]),[advances,setAdvances]=useState([]),[error,setError]=useState(""),[message,setMessage]=useState("");
 const[range,setRange]=useState("today"),[settling,setSettling]=useState(null);

 const load=async()=>{
  setLoading(true);setError("");
  const[{data:r,error:re},{data:a,error:ae}]=await Promise.all([
   supabase.from("booking_financials").select("id,booking_id,subscription_id,driver_id,gross_amount,commission_amount,driver_payout_amount,customer_received_amount,collection_status,payment_source,settlement_status,completed_at,settled_at,settlement_reference,drivers(full_name),bookings(id,travel_date,pickup_time,pickup_name,drop_name,payment_method,subscription_id,subscription_trip_id)").order("completed_at",{ascending:false}).limit(500),
   supabase.from("commute_subscriptions").select("id,total_amount,status,payment_status,booking_financials(gross_amount)").eq("payment_status","paid").in("status",["active","paused"])
  ]);
  if(re||ae)setError((re||ae).message);
  setRows(r||[]);setAdvances(a||[]);setLoading(false);
 };

 useEffect(()=>{(async()=>{
  const{data}=await supabase.auth.getSession();const user=data?.session?.user;
  if(!user){location.href="/login";return}
  const{data:p}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  setAuthorized(p?.role==="admin");setChecking(false);
 })()},[]);
 useEffect(()=>{if(authorized)load()},[authorized]);

 const selected=useMemo(()=>{
  const today=dateKey(new Date());
  if(range==="today")return rows.filter(x=>dateKey(new Date(x.completed_at))===today);
  if(range==="week"){const start=dateKey(new Date(Date.now()-6*86400000));return rows.filter(x=>dateKey(new Date(x.completed_at))>=start&&dateKey(new Date(x.completed_at))<=today)}
  return rows.filter(x=>dateKey(new Date(x.completed_at)).slice(0,7)===today.slice(0,7));
 },[rows,range]);

 const metrics=useMemo(()=>{
  const active=selected.filter(x=>x.settlement_status!=="cancelled");
  return {
   gross:active.reduce((s,x)=>s+Number(x.gross_amount||0),0),
   commission:active.reduce((s,x)=>s+Number(x.commission_amount||0),0),
   payout:active.reduce((s,x)=>s+Number(x.driver_payout_amount||0),0),
   settled:active.filter(x=>x.settlement_status==="settled").reduce((s,x)=>s+Number(x.driver_payout_amount||0),0),
   pending:active.filter(x=>x.settlement_status!=="settled").reduce((s,x)=>s+Number(x.driver_payout_amount||0),0),
   issues:active.filter(x=>!["paid","collected","advance_allocated"].includes(x.collection_status)).length
  };
 },[selected]);

 const advanceTotal=useMemo(()=>advances.reduce((s,x)=>{
  const accrued=(x.booking_financials||[]).reduce((a,f)=>a+Number(f.gross_amount||0),0);
  return s+Math.max(0,Number(x.total_amount||0)-accrued);
 },0),[advances]);

 const settle=async row=>{
  setSettling(row.id);setError("");setMessage("");
  const{error:e}=await supabase.rpc("admin_settle_booking_financial",{p_financial_id:row.id});
  if(e)setError(e.message);
  else{setMessage("Driver payout marked settled.");await load()}
  setSettling(null);
 };

 if(checking)return <div style={styles.loading}>Checking access…</div>;
 if(!authorized)return <div style={styles.loading}><div><h2>Access denied</h2><a href="/login">Return to login</a></div></div>;

 return <main style={styles.page}>
  <header style={styles.header}>
   <div><a href="/admin" style={styles.crumb}>← Control centre</a><span style={styles.eyebrow}>FINANCE</span><h1 style={styles.h1}>Money</h1><p style={styles.sub}>Service revenue, 10% VOYNU commission, Saarthi payouts and customer advances.</p></div>
   <div style={styles.headerActions}><select value={range} onChange={e=>setRange(e.target.value)} style={styles.select}><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option></select><button onClick={load} disabled={loading} style={styles.refresh}>{loading?"Refreshing…":"↻ Refresh"}</button></div>
  </header>
  {error&&<div style={styles.error}>⚠ {error}</div>}{message&&<div style={styles.success}>✓ {message}</div>}
  <section style={styles.grid}>
   <Card label="Service revenue" value={money(metrics.gross)} hint="accrued after service"/>
   <Card label="VOYNU commission" value={money(metrics.commission)} hint="10% of service revenue"/>
   <Card label="Saarthi payout" value={money(metrics.payout)} hint="90% of service revenue"/>
   <Card label="Pending settlement" value={money(metrics.pending)} hint={`${selected.filter(x=>x.settlement_status!=="settled").length} service days`}/>
  </section>
  <section style={styles.advance}><div><span style={styles.eyebrow}>CUSTOMER ADVANCE</span><h2 style={styles.h2}>{money(advanceTotal)}</h2><p style={styles.muted}>Paid subscription value not yet accrued to completed service days.</p></div><div style={styles.advancePill}>{advances.length} active paid subscriptions</div></section>
  <section style={styles.panel}>
   <div style={styles.panelHead}><div><span style={styles.eyebrow}>SERVICE LEDGER</span><h2 style={styles.h2}>Recent service days</h2></div><span style={styles.count}>{selected.length} shown</span></div>
   {metrics.issues>0&&<div style={styles.warning}>⚠ {metrics.issues} completed booking(s) have a payment collection issue and cannot be settled yet.</div>}
   <div style={styles.list}>{selected.slice(0,80).map(x=><article key={x.id} style={styles.row}>
    <div style={styles.rowMain}><div><b>{x.bookings?.travel_date||fmtDate(x.completed_at)} · {x.drivers?.full_name||"Saarthi"}</b><span>{x.bookings?.pickup_name||"Pickup"} → {x.bookings?.drop_name||"Drop"}</span></div><strong>{money(x.gross_amount)}</strong></div>
    <div style={styles.rowMeta}><span>VOYNU <b>{money(x.commission_amount)}</b></span><span>Saarthi <b>{money(x.driver_payout_amount)}</b></span><span>{x.collection_status}</span><span className={x.settlement_status==="settled"?"settled":"pending"}>{x.settlement_status}</span></div>
    {x.settlement_status!=="settled"&&<button disabled={settling===x.id||!["paid","collected","advance_allocated"].includes(x.collection_status)} onClick={()=>settle(x)} style={{...styles.settle,opacity:!["paid","collected","advance_allocated"].includes(x.collection_status)?.45:1}}>{settling===x.id?"Settling…":"Mark payout settled"}</button>}
   </article>)}</div>
   {!selected.length&&<div style={styles.empty}>No service-day earnings in this period.</div>}
  </section>
 </main>;
}
function Card({label,value,hint}){return <div style={styles.card}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
const styles={
 page:{minHeight:"100vh",background:"linear-gradient(180deg,#F7F9FC 0%,#F3F7FB 100%)",fontFamily:theme.fontFamily,color:theme.colors.text,padding:"18px 20px 40px"},
 header:{maxWidth:1100,margin:"0 auto 16px",display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-end"},
 crumb:{display:"block",color:theme.colors.textMuted,textDecoration:"none",fontWeight:800,fontSize:12,marginBottom:12},
 eyebrow:{display:"block",fontSize:10,fontWeight:900,letterSpacing:1.5,color:theme.colors.primary,marginBottom:5},
 h1:{margin:"0 0 6px",fontSize:"clamp(28px,5vw,40px)",letterSpacing:-1},
 h2:{margin:0,fontSize:18},
 sub:{margin:0,color:theme.colors.textMuted,fontSize:13,maxWidth:680,lineHeight:1.45},
 headerActions:{display:"flex",gap:8,alignItems:"center"},
 select:{height:40,borderRadius:10,border:"1px solid "+theme.colors.borderStrong,background:"#fff",padding:"0 10px",fontWeight:800},
 refresh:{height:40,border:0,borderRadius:10,padding:"0 14px",background:theme.colors.primary,color:"#fff",fontWeight:900},
 grid:{maxWidth:1100,margin:"0 auto 14px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10},
 card:{background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:16,padding:15,boxShadow:theme.shadow.card},
 advance:{maxWidth:1100,margin:"0 auto 14px",background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:16,padding:16,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"},
 advancePill:{padding:"8px 11px",borderRadius:18,background:theme.colors.primaryTint,color:theme.colors.primary,fontWeight:900,fontSize:11,whiteSpace:"nowrap"},
 panel:{maxWidth:1100,margin:"0 auto",background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:18,padding:16},
 panelHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},
 count:{fontSize:11,fontWeight:900,color:theme.colors.primary,background:theme.colors.primaryTint,borderRadius:18,padding:"8px 11px"},
 warning:{background:"#fff5e7",border:"1px solid #f0d7a5",color:"#8b5a00",padding:10,borderRadius:10,fontSize:12,fontWeight:800,marginBottom:10},
 list:{display:"grid",gap:8},
 row:{border:"1px solid "+theme.colors.border,borderRadius:13,padding:12},
 rowMain:{display:"flex",justifyContent:"space-between",gap:10},
 rowMeta:{display:"flex",gap:10,flexWrap:"wrap",fontSize:10,color:theme.colors.textMuted,marginTop:8},
 settled:{color:"#16824A",fontWeight:900},pending:{color:"#a56a00",fontWeight:900},
 settle:{marginTop:9,height:34,border:0,borderRadius:9,padding:"0 12px",background:theme.colors.primary,color:"#fff",fontWeight:900,fontSize:11},
 empty:{padding:30,textAlign:"center",color:theme.colors.textMuted,fontSize:12},
 error:{maxWidth:1100,margin:"0 auto 10px",background:"#fdeaea",color:"#a12622",border:"1px solid #f2caca",padding:11,borderRadius:10,fontWeight:800,fontSize:12},
 success:{maxWidth:1100,margin:"0 auto 10px",background:"#eaf8f0",color:"#167345",border:"1px solid #c9ead7",padding:11,borderRadius:10,fontWeight:800,fontSize:12},
 muted:{margin:"5px 0 0",color:theme.colors.textMuted,fontSize:12},
 loading:{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:theme.fontFamily}
};
