"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "../../../../../shared/lib/supabaseClient";
import {theme} from "../../../../../shared/lib/theme";

const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const fmt=v=>v?new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";

export default function SubscriptionPaymentsPage(){
 const[authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[loading,setLoading]=useState(true);
 const[rows,setRows]=useState([]),[tab,setTab]=useState("pending"),[busyId,setBusyId]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState("");
 const[rejecting,setRejecting]=useState(null),[reason,setReason]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  const{data,error:e}=await supabase.from("subscription_payments")
   .select("id,amount,method,utr,status,recorded_at,confirmed_at,rejected_at,rejection_reason,commute_subscriptions(id,pickup_name,drop_name,user_id,profiles(full_name,phone)),drivers(full_name,phone)")
   .order("recorded_at",{ascending:false}).limit(300);
  if(e)setError(e.message);else setRows(data||[]);
  setLoading(false);
 };
 useEffect(()=>{(async()=>{
  const{data}=await supabase.auth.getSession();const user=data?.session?.user;
  if(!user){location.href="/login";return}
  const{data:p}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  setAuthorized(p?.role==="admin");setChecking(false);
 })()},[]);
 useEffect(()=>{if(authorized)load()},[authorized]);

 const filtered=useMemo(()=>{
  if(tab==="pending")return rows.filter(r=>r.status==="driver_verified");
  if(tab==="confirmed")return rows.filter(r=>r.status==="confirmed"||r.status==="recorded");
  return rows.filter(r=>r.status==="rejected");
 },[rows,tab]);
 const pendingCount=useMemo(()=>rows.filter(r=>r.status==="driver_verified").length,[rows]);

 const confirm=async row=>{
  setBusyId(row.id);setError("");setMessage("");
  const{error:e}=await supabase.rpc("admin_confirm_subscription_payment",{p_payment_id:row.id});
  if(e)setError(e.message.replace(/^VOYNU:\s*/,""));else{setMessage(`Confirmed ${money(row.amount)} for ${row.commute_subscriptions?.pickup_name||"subscription"}.`);await load();}
  setBusyId(null);
 };
 const submitReject=async()=>{
  if(reason.trim().length<3)return setError("A rejection reason is required.");
  setBusyId(rejecting.id);setError("");setMessage("");
  const{error:e}=await supabase.rpc("admin_reject_subscription_payment",{p_payment_id:rejecting.id,p_reason:reason.trim()});
  if(e)setError(e.message.replace(/^VOYNU:\s*/,""));else{setMessage("Payment rejected. The customer and driver were notified.");setRejecting(null);setReason("");await load();}
  setBusyId(null);
 };

 if(checking)return <div style={styles.loading}>Checking access…</div>;
 if(!authorized)return <div style={styles.loading}><div><h2>Access denied</h2><a href="/login">Return to login</a></div></div>;

 return <main style={styles.page}>
  <header style={styles.header}>
   <div><a href="/admin" style={styles.crumb}>← Control centre</a><span style={styles.eyebrow}>FINANCE</span><h1 style={styles.h1}>Commute payments</h1><p style={styles.sub}>Cash is recorded directly by the driver. UPI payments are recorded by the driver on the spot and need your confirmation here.</p></div>
   <button onClick={load} disabled={loading} style={styles.refresh}>{loading?"Refreshing…":"↻ Refresh"}</button>
  </header>
  {error&&<div style={styles.error}>⚠ {error}</div>}{message&&<div style={styles.success}>✓ {message}</div>}
  <div style={styles.tabs}>
   <button onClick={()=>setTab("pending")} style={tab==="pending"?styles.tabOn:styles.tab}>Awaiting confirmation {pendingCount>0&&<span style={styles.badge}>{pendingCount}</span>}</button>
   <button onClick={()=>setTab("confirmed")} style={tab==="confirmed"?styles.tabOn:styles.tab}>Confirmed / cash</button>
   <button onClick={()=>setTab("rejected")} style={tab==="rejected"?styles.tabOn:styles.tab}>Rejected</button>
  </div>
  <section style={styles.list}>
   {filtered.map(r=><article key={r.id} style={styles.row}>
    <div style={styles.rowMain}>
     <div>
      <b>{r.commute_subscriptions?.pickup_name||"—"} → {r.commute_subscriptions?.drop_name||"—"}</b>
      <span style={styles.meta}>{r.commute_subscriptions?.profiles?.full_name||"Customer"} · Driver {r.drivers?.full_name||"—"} · {fmt(r.recorded_at)}</span>
     </div>
     <strong style={styles.amount}>{money(r.amount)}</strong>
    </div>
    <div style={styles.rowMeta}>
     <span style={r.method==="upi"?styles.pillUpi:styles.pillCash}>{r.method==="upi"?"UPI":"CASH"}</span>
     {r.utr&&<span style={styles.utr}>UTR {r.utr}</span>}
     <span style={r.status==="confirmed"?styles.ok:r.status==="rejected"?styles.bad:r.status==="driver_verified"?styles.warn:styles.ok}>{r.status.replace(/_/g," ")}</span>
    </div>
    {r.status==="rejected"&&r.rejection_reason&&<div style={styles.rejectionNote}>Reason: {r.rejection_reason}</div>}
    {r.status==="driver_verified"&&(
     rejecting?.id===r.id ? (
      <div style={styles.rejectBox}>
       <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} placeholder="Why couldn't this be verified? (e.g. UTR not found in bank statement)" style={styles.textarea}/>
       <div style={styles.rejectActions}>
        <button onClick={()=>{setRejecting(null);setReason("");}} disabled={busyId===r.id} style={styles.ghost}>Cancel</button>
        <button onClick={submitReject} disabled={busyId===r.id} style={styles.dangerBtn}>{busyId===r.id?"Rejecting…":"Confirm rejection"}</button>
       </div>
      </div>
     ) : (
      <div style={styles.actions}>
       <button onClick={()=>{setRejecting(r);setReason("");setError("");}} disabled={busyId===r.id} style={styles.ghost}>Reject</button>
       <button onClick={()=>confirm(r)} disabled={busyId===r.id} style={styles.primaryBtn}>{busyId===r.id?"Confirming…":"✓ Confirm payment"}</button>
      </div>
     )
    )}
   </article>)}
   {!filtered.length&&<div style={styles.empty}>Nothing here right now.</div>}
  </section>
 </main>;
}
const styles={
 page:{minHeight:"100vh",background:"linear-gradient(180deg,#F7F9FC 0%,#F3F7FB 100%)",fontFamily:theme.fontFamily,color:theme.colors.text,padding:"18px 20px 40px"},
 header:{maxWidth:900,margin:"0 auto 16px",display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-end"},
 crumb:{display:"block",color:theme.colors.textMuted,textDecoration:"none",fontWeight:800,fontSize:12,marginBottom:12},
 eyebrow:{display:"block",fontSize:10,fontWeight:900,letterSpacing:1.5,color:theme.colors.primary,marginBottom:5},
 h1:{margin:"0 0 6px",fontSize:"clamp(26px,5vw,36px)",letterSpacing:-1},
 sub:{margin:0,color:theme.colors.textMuted,fontSize:13,maxWidth:560,lineHeight:1.45},
 refresh:{height:40,border:0,borderRadius:10,padding:"0 14px",background:theme.colors.primary,color:"#fff",fontWeight:900,alignSelf:"flex-start"},
 tabs:{maxWidth:900,margin:"0 auto 14px",display:"flex",gap:8},
 tab:{height:40,padding:"0 14px",borderRadius:12,border:"1px solid "+theme.colors.border,background:"#fff",fontWeight:800,fontSize:12,color:theme.colors.textMuted},
 tabOn:{height:40,padding:"0 14px",borderRadius:12,border:"1px solid "+theme.colors.primary,background:theme.colors.primaryTint,fontWeight:900,fontSize:12,color:theme.colors.primary},
 badge:{marginLeft:6,padding:"2px 7px",borderRadius:20,background:theme.colors.primary,color:"#fff",fontSize:10},
 list:{maxWidth:900,margin:"0 auto",display:"grid",gap:10},
 row:{background:"#fff",border:"1px solid "+theme.colors.border,borderRadius:16,padding:14,boxShadow:theme.shadow.card},
 rowMain:{display:"flex",justifyContent:"space-between",gap:12},
 meta:{display:"block",marginTop:4,fontSize:11,color:theme.colors.textMuted},
 amount:{fontSize:18,whiteSpace:"nowrap"},
 rowMeta:{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,fontSize:10.5,fontWeight:900},
 pillCash:{padding:"4px 9px",borderRadius:20,background:"#F3F7FA",color:theme.colors.textMuted},
 pillUpi:{padding:"4px 9px",borderRadius:20,background:"#EEF2FF",color:"#4F46E5"},
 utr:{padding:"4px 9px",borderRadius:20,background:"#F7F9FB",fontFamily:"monospace",letterSpacing:.5,color:theme.colors.text},
 ok:{padding:"4px 9px",borderRadius:20,background:"#EAFBF2",color:"#16824A",textTransform:"capitalize"},
 warn:{padding:"4px 9px",borderRadius:20,background:"#FFF7E8",color:"#8A5700",textTransform:"capitalize"},
 bad:{padding:"4px 9px",borderRadius:20,background:"#FDEAEA",color:"#A12622",textTransform:"capitalize"},
 rejectionNote:{marginTop:9,padding:9,borderRadius:10,background:"#FDEAEA",color:"#A12622",fontSize:11.5,fontWeight:700},
 actions:{display:"flex",gap:8,marginTop:12},
 ghost:{flex:1,height:42,borderRadius:11,border:"1px solid "+theme.colors.border,background:"#fff",fontWeight:800,fontSize:12},
 primaryBtn:{flex:1.6,height:42,border:0,borderRadius:11,background:theme.gradients.primary,color:"#fff",fontWeight:900,fontSize:12},
 dangerBtn:{flex:1.6,height:42,border:0,borderRadius:11,background:"#D64545",color:"#fff",fontWeight:900,fontSize:12},
 rejectBox:{marginTop:12},
 textarea:{width:"100%",boxSizing:"border-box",border:"1px solid "+theme.colors.border,borderRadius:11,padding:10,fontSize:12.5,fontFamily:"inherit"},
 rejectActions:{display:"flex",gap:8,marginTop:8},
 empty:{padding:30,textAlign:"center",color:theme.colors.textMuted,fontSize:12,background:"#fff",borderRadius:16,border:"1px solid "+theme.colors.border},
 error:{maxWidth:900,margin:"0 auto 10px",background:"#fdeaea",color:"#a12622",border:"1px solid #f2caca",padding:11,borderRadius:10,fontWeight:800,fontSize:12},
 success:{maxWidth:900,margin:"0 auto 10px",background:"#eaf8f0",color:"#167345",border:"1px solid #c9ead7",padding:11,borderRadius:10,fontWeight:800,fontSize:12},
 loading:{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:theme.fontFamily}
};
