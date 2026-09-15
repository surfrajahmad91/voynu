"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../shared/components/PageHeader";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";

const DAYS = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"],
];
const PLANS = ["weekly", "monthly", "quarterly", "half_yearly"];

export default function CommuteSubscriptionPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pickup, setPickup] = useState({ name: "", lat: null, lon: null });
  const [drop, setDrop] = useState({ name: "", lat: null, lon: null });
  const [distance, setDistance] = useState("");
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [vehicleCategoryId, setVehicleCategoryId] = useState("");
  const [planCode, setPlanCode] = useState("monthly");
  const [morningTime, setMorningTime] = useState("08:00");
  const [returnTime, setReturnTime] = useState("18:00");
  const [startDate, setStartDate] = useState("");
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from("vehicle_categories").select("id,name,slug,passenger_capacity,luggage_capacity,active,bookable,sort_order").eq("active", true).eq("bookable", true).order("sort_order"),
      supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,sort_order,active").eq("active", true).order("sort_order"),
    ]).then(([cat, plan]) => {
      if (!cat.error) setCategories(cat.data || []);
      if (!plan.error) setPlans(plan.data || []);
    });
  }, []);

  const eligibleCategories = useMemo(() => categories.filter((c) => Number(c.passenger_capacity) >= passengers), [categories, passengers]);
  useEffect(() => {
    if (!eligibleCategories.some((c) => c.id === vehicleCategoryId)) setVehicleCategoryId(eligibleCategories[0]?.id || "");
  }, [eligibleCategories, vehicleCategoryId]);

  useEffect(() => {
    if (!startDate) {
      const d = new Date(); d.setDate(d.getDate() + 1);
      setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  }, [startDate]);

  const getDistance = async () => {
    if (!Number.isFinite(Number(pickup.lat)) || !Number.isFinite(Number(pickup.lon)) || !Number.isFinite(Number(drop.lat)) || !Number.isFinite(Number(drop.lon))) {
      setError("Please select both pickup and destination locations with a map result before calculating the fare."); return;
    }
    setDistanceLoading(true); setError("");
    try {
      const response = await fetch("/api/route-distance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: { lat: pickup.lat, lon: pickup.lon }, destination: { lat: drop.lat, lon: drop.lon } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to calculate road distance.");
      const km = Number(data?.distanceKm ?? Number(data?.distanceMeters) / 1000);
      if (!Number.isFinite(km)) throw new Error("Road distance was not returned.");
      setDistance(km.toFixed(1));
    } catch (e) { setError(e.message || "Unable to calculate road distance."); }
    finally { setDistanceLoading(false); }
  };

  const loadQuote = async () => {
    setError(""); setMessage(""); setQuote(null);
    if (!vehicleCategoryId || !Number(distance) || !startDate || !weekdays.length) return setError("Complete the route, vehicle, start date and travel days first.");
    const { data, error: rpcError } = await supabase.rpc("quote_commute_subscription", { p_plan_code: planCode, p_vehicle_category_id: vehicleCategoryId, p_one_way_distance_km: Number(distance), p_start_date: startDate, p_passenger_count: passengers, p_weekdays: weekdays });
    if (rpcError) return setError(rpcError.message);
    setQuote(data);
  };

  const submit = async () => {
    if (!session) return router.push(`/login?next=/subscriptions`);
    if (!quote) return loadQuote();
    setBusy(true); setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("create_commute_subscription", {
      p_plan_code: planCode, p_vehicle_category_id: vehicleCategoryId,
      p_pickup_name: pickup.name, p_pickup_lat: pickup.lat, p_pickup_lon: pickup.lon,
      p_drop_name: drop.name, p_drop_lat: drop.lat, p_drop_lon: drop.lon,
      p_one_way_distance_km: Number(distance), p_passenger_count: passengers,
      p_morning_pickup_time: morningTime, p_evening_return_time: returnTime,
      p_start_date: startDate, p_weekdays: weekdays,
    });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    setMessage(`Subscription request ${data?.id ? `#${data.id.slice(0, 8)}` : "created"}. The subscription remains pending until the full amount is paid and confirmed.`);
  };

  const toggleDay = (day) => setWeekdays((current) => current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b));

  return <>
    <PageHeader />
    <main style={styles.page}>
      <section style={styles.hero}><div style={styles.heroInner}><div style={styles.eyebrow}>VOYNU COMMUTE</div><h1 style={styles.title}>Your daily route, booked for the long run.</h1><p style={styles.lead}>A fixed home-to-office, school or college route with a morning drop and evening return pickup. One vehicle, up to 7 passengers.</p></div></section>
      <div style={styles.container}>
        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}
        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.heading}>Route & schedule</h2>
            <label style={styles.label}>Pickup location<input value={pickup.name} onChange={(e) => setPickup((v) => ({ ...v, name: e.target.value }))} placeholder="Home / pickup point" /></label>
            <div style={styles.two}><label style={styles.label}>Pickup latitude<input type="number" step="any" value={pickup.lat ?? ""} onChange={(e) => setPickup((v) => ({ ...v, lat: e.target.value }))} /></label><label style={styles.label}>Pickup longitude<input type="number" step="any" value={pickup.lon ?? ""} onChange={(e) => setPickup((v) => ({ ...v, lon: e.target.value }))} /></label></div>
            <label style={styles.label}>Destination<input value={drop.name} onChange={(e) => setDrop((v) => ({ ...v, name: e.target.value }))} placeholder="Office / school / college" /></label>
            <div style={styles.two}><label style={styles.label}>Destination latitude<input type="number" step="any" value={drop.lat ?? ""} onChange={(e) => setDrop((v) => ({ ...v, lat: e.target.value }))} /></label><label style={styles.label}>Destination longitude<input type="number" step="any" value={drop.lon ?? ""} onChange={(e) => setDrop((v) => ({ ...v, lon: e.target.value }))} /></label></div>
            <div style={styles.distanceRow}><label style={{...styles.label,flex:1}}>One-way road distance (km)<input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} /></label><button style={styles.secondary} disabled={distanceLoading} onClick={getDistance}>{distanceLoading ? "Calculating…" : "Calculate distance"}</button></div>
            <div style={styles.two}><label style={styles.label}>Morning pickup<input type="time" value={morningTime} onChange={(e) => setMorningTime(e.target.value)} /></label><label style={styles.label}>Evening return pickup<input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></label></div>
            <label style={styles.label}>Start date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <div style={styles.label}>Travel days<div style={styles.dayGrid}>{DAYS.map(([day, name]) => <button type="button" key={day} onClick={() => toggleDay(day)} style={weekdays.includes(day) ? styles.dayActive : styles.day}>{name}</button>)}</div></div>
          </section>
          <section style={styles.card}>
            <h2 style={styles.heading}>Passengers & vehicle</h2>
            <div style={styles.passengerGrid}>{Array.from({ length: 7 }, (_, i) => i + 1).map((n) => <button key={n} type="button" onClick={() => setPassengers(n)} style={passengers === n ? styles.passengerActive : styles.passenger}>{n}<small>{n === 1 ? "person" : "people"}</small></button>)}</div>
            <label style={styles.label}>Vehicle category<select value={vehicleCategoryId} onChange={(e) => setVehicleCategoryId(e.target.value)}>{eligibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name} · up to {c.passenger_capacity}</option>)}</select></label>
            <h2 style={{...styles.heading,marginTop:28}}>Subscription period</h2>
            <div style={styles.planGrid}>{PLANS.map((code) => { const p=plans.find((x)=>x.code===code); if (!p) return null; return <button key={code} type="button" onClick={() => setPlanCode(code)} style={planCode===code?styles.planActive:styles.plan}><strong>{p.name}</strong><span>{Number(p.discount_percent || 0)}% long-term discount</span></button>; })}</div>
            <div style={styles.note}>The subscribed passenger count determines the vehicle requirement. If fewer people travel on a scheduled day, the day remains fully chargeable. Approved holidays/off-days are handled separately.</div>
            <button style={styles.primary} onClick={loadQuote}>Calculate subscription</button>
            {quote && <div style={styles.quote}><div><span>Daily round trip</span><strong>₹{Number(quote.dailyRoundTripFare).toLocaleString("en-IN")}</strong></div><div><span>Billable days</span><strong>{quote.billableDays}</strong></div><div><span>Base amount</span><strong>₹{Number(quote.baseAmount).toLocaleString("en-IN")}</strong></div><div><span>Discount</span><strong>- ₹{Number(quote.discountAmount).toLocaleString("en-IN")}</strong></div><div style={styles.total}><span>Pay in full</span><strong>₹{Number(quote.totalAmount).toLocaleString("en-IN")}</strong></div><button style={styles.primary} disabled={busy} onClick={submit}>{busy ? "Creating…" : session ? "Request this subscription" : "Sign in to continue"}</button></div>}
          </section>
        </div>
      </div>
    </main>
  </>;
}

const input = { width:"100%",boxSizing:"border-box",marginTop:6,padding:"11px 12px",border:`1px solid ${theme.colors.borderStrong}`,borderRadius:10,fontSize:13,background:theme.colors.surface,color:theme.colors.text };
const styles = { page:{minHeight:"100vh",background:theme.colors.bg,color:theme.colors.text},hero:{background:theme.colors.navy,color:"#fff",borderBottom:`3px solid ${theme.colors.accent}`},heroInner:{width:`min(${theme.maxWidth.content}px,calc(100% - 28px))`,margin:"0 auto",padding:"34px 0 30px"},eyebrow:{fontSize:10,fontWeight:800,letterSpacing:1.6,color:theme.colors.accentLight},title:{fontSize:"clamp(28px,5vw,44px)",lineHeight:1.05,letterSpacing:-1.2,maxWidth:700,margin:"7px 0 10px"},lead:{fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,.75)",maxWidth:720,margin:0},container:{width:`min(${theme.maxWidth.content}px,calc(100% - 28px))`,margin:"0 auto",padding:"20px 0 60px"},grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:16},card:{background:theme.colors.surface,border:`1px solid ${theme.colors.border}`,borderRadius:16,padding:18,boxShadow:theme.shadow.card},heading:{fontSize:18,margin:"0 0 16px",letterSpacing:-.4},label:{display:"block",fontSize:11,fontWeight:800,color:theme.colors.text,marginBottom:12},two:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},distanceRow:{display:"flex",alignItems:"end",gap:8},secondary:{padding:"11px 12px",borderRadius:10,border:`1px solid ${theme.colors.primary}`,background:theme.colors.primaryTint,color:theme.colors.primaryDark,fontWeight:800,fontSize:11,whiteSpace:"nowrap",cursor:"pointer"},dayGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginTop:7},day:{padding:"9px 2px",border:`1px solid ${theme.colors.border}`,background:theme.colors.bg,borderRadius:8,fontSize:10,fontWeight:800,color:theme.colors.textMuted},dayActive:{padding:"9px 2px",border:`1px solid ${theme.colors.primary}`,background:theme.colors.primaryTint,borderRadius:8,fontSize:10,fontWeight:800,color:theme.colors.primaryDark},passengerGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:15},passenger:{padding:"10px 2px",border:`1px solid ${theme.colors.border}`,background:theme.colors.bg,borderRadius:9,fontSize:14,fontWeight:900,color:theme.colors.text},passengerActive:{padding:"10px 2px",border:`1px solid ${theme.colors.primary}`,background:theme.gradients.primary,color:"white",borderRadius:9,fontSize:14,fontWeight:900},planGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},plan:{textAlign:"left",padding:12,border:`1px solid ${theme.colors.border}`,background:theme.colors.bg,borderRadius:11,color:theme.colors.text},planActive:{textAlign:"left",padding:12,border:`1px solid ${theme.colors.primary}`,background:theme.colors.primaryTint,borderRadius:11,color:theme.colors.primaryDark},note:{fontSize:10.5,lineHeight:1.5,color:theme.colors.textMuted,background:theme.colors.bg,borderRadius:10,padding:11,margin:"14px 0"},primary:{width:"100%",padding:"12px 14px",border:0,borderRadius:10,background:theme.gradients.primary,color:"white",fontWeight:900,fontSize:12,cursor:"pointer",boxShadow:"0 7px 18px rgba(10,127,166,.18)"},quote:{marginTop:14,borderTop:`1px solid ${theme.colors.border}`,paddingTop:12,display:"grid",gap:8},quoteRow:{},quote:{marginTop:14,borderTop:`1px solid ${theme.colors.border}`,paddingTop:12,display:"grid",gap:8},total:{borderTop:`2px solid ${theme.colors.borderStrong}`,marginTop:5,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:13},success:{background:"#eaf8ef",border:"1px solid #b9e3c6",color:"#166534",padding:12,borderRadius:10,fontSize:12,fontWeight:700,marginBottom:14},error:{background:"#fff2ee",border:"1px solid #f1c2b5",color:"#9f321c",padding:12,borderRadius:10,fontSize:12,fontWeight:700,marginBottom:14}}
