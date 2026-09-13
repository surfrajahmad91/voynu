"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const STATUS = ["pending_review", "approved", "rejected", "suspended", "unavailable"];

export default function RentalAdminPage() {
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [owners, setOwners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fee, setFee] = useState(15);
  const [savingFee, setSavingFee] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    const [l, b, o, p, s] = await Promise.all([
      supabase.from("rental_vehicle_listings").select("*, rental_owner_profiles(full_name,phone,kyc_status), rental_vehicle_documents(id,document_type,expires_at,verification_status,document_number)").order("created_at", { ascending: false }),
      supabase.from("rental_bookings").select("*, rental_vehicle_listings(make,model,vehicle_type,city,registration_number), profiles:customer_id(full_name,phone)").order("created_at", { ascending: false }).limit(100),
      supabase.from("rental_owner_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("rental_payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("rental_settings").select("platform_fee_percent").eq("id", true).maybeSingle(),
    ]);
    const e = l.error || b.error || o.error || p.error || s.error;
    if (e) setError(e.message);
    setListings(l.data || []); setBookings(b.data || []); setOwners(o.data || []); setPayouts(p.data || []); setFee(Number(s.data?.platform_fee_percent ?? 15)); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateListing = async (id, patch) => {
    const { error: e } = await supabase.from("rental_vehicle_listings").update(patch).eq("id", id);
    if (e) setError(e.message); else await load();
  };
  const updateOwner = async (id, kyc_status) => {
    const { error: e } = await supabase.from("rental_owner_profiles").update({ kyc_status, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) setError(e.message); else await load();
  };
  const verifyDoc = async (id, verification_status) => {
    const { error: e } = await supabase.from("rental_vehicle_documents").update({ verification_status, verified_at: verification_status === "approved" ? new Date().toISOString() : null }).eq("id", id);
    if (e) setError(e.message); else await load();
  };
  const saveFee = async () => {
    setSavingFee(true); const { error: e } = await supabase.from("rental_settings").update({ platform_fee_percent: Math.max(0, Number(fee) || 0), updated_at: new Date().toISOString() }).eq("id", true); setSavingFee(false); if (e) setError(e.message); else await load();
  };

  const counts = useMemo(() => ({ pending: listings.filter(x => x.status === "pending_review").length, approved: listings.filter(x => x.status === "approved").length, active: bookings.filter(x => ["confirmed","pickup_due","handed_over","active","return_due","inspection"].includes(x.status)).length, payout: payouts.filter(x => x.status === "pending").length }), [listings, bookings, payouts]);

  const card = { background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 16, padding: 16, boxShadow: "0 5px 18px rgba(10,35,55,.04)" };
  const button = (active = false) => ({ border: `1px solid ${active ? "#0A7FA6" : theme.colors.border}`, background: active ? "#0A7FA6" : "#fff", color: active ? "#fff" : theme.colors.text, borderRadius: 10, padding: "9px 12px", fontWeight: 800, fontSize: 11, cursor: "pointer" });

  return <main style={{ minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "24px 16px 60px" }}><div style={{ maxWidth: 1180, margin: "0 auto" }}>
    <div style={{ ...card, background: "linear-gradient(135deg,#00456B,#0A7FA6)", color: "#fff", marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2 }}>VOYNU RENTALS</div><h1 style={{ margin: "5px 0", fontSize: 25 }}>Rental marketplace control centre</h1><p style={{ margin: 0, fontSize: 12, opacity: .86 }}>Approve owners and vehicles, monitor rentals, deposits and owner payouts.</p></div>
    {error && <div style={{ ...card, color: "#B42318", marginBottom: 12 }}>{error}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 9, marginBottom: 14 }}>{[["Pending listings",counts.pending],["Approved vehicles",counts.approved],["Active rentals",counts.active],["Payouts pending",counts.payout]].map(([a,b]) => <div key={a} style={card}><div style={{fontSize:9,fontWeight:900,color:theme.colors.textFaint,textTransform:"uppercase"}}>{a}</div><strong style={{fontSize:23}}>{b}</strong></div>)}</div>
    <div style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 14 }}>{[["listings","Listings"],["owners","Owners"],["bookings","Bookings"],["payouts","Payouts"],["settings","Rental settings"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={button(tab===k)}>{l}</button>)}</div>
    {loading ? <div style={card}>Loading rental operations…</div> : tab === "listings" ? <div style={{display:"grid",gap:11}}>{listings.map(l => <div key={l.id} style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong style={{fontSize:16}}>{l.make || "Vehicle"} {l.model || ""}</strong><div style={{fontSize:11,color:theme.colors.textFaint,marginTop:3}}>{l.vehicle_type} · {l.city} · {l.registration_number || "No registration"} · Owner: {l.rental_owner_profiles?.full_name || "Unknown"}</div></div><select value={l.status} onChange={e=>updateListing(l.id,{status:e.target.value,approved_at:e.target.value==="approved"?new Date().toISOString():l.approved_at,approved_by:e.target.value==="approved"?null:l.approved_by})} style={{padding:8,borderRadius:9}}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginTop:12,fontSize:11}}><div>Daily <b>₹{Number(l.daily_rate||0).toFixed(0)}</b></div><div>Deposit <b>₹{Number(l.security_deposit||0).toFixed(0)}</b></div><div>Included <b>{l.included_km_per_day} km/day</b></div><div>Owner KYC <b>{l.rental_owner_profiles?.kyc_status || "pending"}</b></div></div><div style={{marginTop:12,display:"flex",gap:7,flexWrap:"wrap"}}>{(l.rental_vehicle_documents||[]).map(d=><span key={d.id} style={{border:`1px solid ${theme.colors.border}`,borderRadius:9,padding:"6px 8px",fontSize:10}}>{d.document_type}: {d.verification_status}{d.expires_at ? ` · exp ${d.expires_at}` : ""} <button onClick={()=>verifyDoc(d.id,"approved")} style={{marginLeft:5}}>✓</button><button onClick={()=>verifyDoc(d.id,"rejected")}>×</button></span>)}</div></div>)}{!listings.length&&<div style={card}>No rental vehicle submissions yet.</div>}</div>
    : tab === "owners" ? <div style={{display:"grid",gap:11}}>{owners.map(o=><div key={o.id} style={{...card,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>{o.full_name || "Owner"}</strong><div style={{fontSize:11,color:theme.colors.textFaint}}>{o.phone || "No phone"} · {o.city || ""}</div></div><select value={o.kyc_status} onChange={e=>updateOwner(o.id,e.target.value)} style={{padding:8,borderRadius:9}}><option>pending</option><option>approved</option><option>rejected</option><option>suspended</option></select></div>)}</div>
    : tab === "bookings" ? <div style={{display:"grid",gap:10}}>{bookings.map(b=><div key={b.id} style={card}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{b.rental_vehicle_listings?.make} {b.rental_vehicle_listings?.model}</strong><div style={{fontSize:11,color:theme.colors.textFaint}}>{b.profiles?.full_name || "Customer"} · {b.rental_vehicle_listings?.city} · {new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleString()}</div></div><select value={b.status} onChange={async e=>{const {error:er}=await supabase.from("rental_bookings").update({status:e.target.value,updated_at:new Date().toISOString()}).eq("id",b.id);if(er)setError(er.message);else load();}} style={{padding:8,borderRadius:9}}>{["request","payment_pending","confirmed","pickup_due","handed_over","active","return_due","returned","inspection","payout_pending","completed","cancelled","no_show","damage_dispute","admin_hold"].map(s=><option key={s}>{s}</option>)}</select></div><div style={{marginTop:8,fontSize:12}}>Total <b>₹{Number(b.total_amount||0).toFixed(0)}</b> · Deposit ₹{Number(b.security_deposit||0).toFixed(0)} · Owner payout ₹{Number(b.owner_payout||0).toFixed(0)}</div></div>)}{!bookings.length&&<div style={card}>No rental bookings yet.</div>}</div>
    : tab === "payouts" ? <div style={{display:"grid",gap:10}}>{payouts.map(p=><div key={p.id} style={{...card,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>₹{Number(p.net_amount||0).toFixed(0)}</strong><div style={{fontSize:11,color:theme.colors.textFaint}}>Owner {p.owner_id} · Booking {p.booking_id}</div></div><select value={p.status} onChange={async e=>{const {error:er}=await supabase.from("rental_payouts").update({status:e.target.value,paid_at:e.target.value==="paid"?new Date().toISOString():p.paid_at,updated_at:new Date().toISOString()}).eq("id",p.id);if(er)setError(er.message);else load();}} style={{padding:8,borderRadius:9}}>{["pending","approved","paid","held","failed"].map(s=><option key={s}>{s}</option>)}</select></div>)}{!payouts.length&&<div style={card}>No payouts generated yet.</div>}</div>
    : <div style={card}><h2 style={{marginTop:0}}>Marketplace fee</h2><p style={{fontSize:12,color:theme.colors.textFaint}}>Applied when a rental booking is created. Owner payout is calculated from the confirmed commercial snapshot.</p><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" min="0" max="100" step="0.5" value={fee} onChange={e=>setFee(e.target.value)} style={{width:110,padding:10}}/><span>%</span><button onClick={saveFee} disabled={savingFee} style={button(false)}>{savingFee?"Saving…":"Save fee"}</button></div><div style={{marginTop:18}}><Link href="/admin" style={{fontSize:12}}>← Back to Admin</Link></div></div>}
  </div></main>;
}
