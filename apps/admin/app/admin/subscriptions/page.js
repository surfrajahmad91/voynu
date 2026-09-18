"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "../../../../../shared/lib/supabaseClient";
import {ADMIN_EMAILS} from "../../../lib/admin";

const money=v=>Number(v||0).toLocaleString("en-IN");
const statusText=v=>String(v||"pending").replace(/_/g," ");
const dateText=v=>v?new Date(v+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const timeText=v=>String(v||"").slice(0,5)||"—";

export default function SubscriptionAdminPage(){
 const router=useRouter();
 const[checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false);
 const[plans,setPlans]=useState([]),[subs,setSubs]=useState([]),[drafts,setDrafts]=useState({});
 const[error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 const load=async()=>{
  setLoading(true);setError("");
  const [{data:p,error:pe},{data:s,error:se}]=await Promise.all([
   supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,sort_order,active,updated_at").order("sort_order"),
   supabase.from("commute_subscriptions").select("id,user_id,plan_id,pickup_name,drop_name,one_way_distance_km,passenger_count,passengers,morning_pickup_time,evening_return_time,start_date,end_date,total_amount,payment_status,status,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  if(pe||se)setError((pe||se).message);
  setPlans(p||[]);setSubs(s||[]);
  setDrafts(Object.fromEntries((p||[]).map(x=>[x.id,String(x.discount_percent??0)])));
  setLoading(false);
 };
 useEffect(()=>{(async()=>{
  const{data}=await supabase.auth.getSession();const email=data?.session?.user?.email||"";
  if(!data?.session){router.replace("/login");return}
  setAuthorized(ADMIN_EMAILS.includes(email));setChecking(false);
 })()},[router]);
 useEffect(()=>{if(authorized)load()},[authorized]);
 const activeCount=useMemo(()=>subs.filter(s=>!["cancelled","completed"].includes(s.status)).length,[subs]);
 const pendingCount=useMemo(()=>subs.filter(s=>["pending","pending_payment","payment_pending"].includes(s.status)||["pending","unpaid"].includes(s.payment_status)).length,[subs]);
 const save=async plan=>{
  setError("");setMessage("");
  const discount=Number(drafts[plan.id]);
  if(!Number.isFinite(discount)||discount<0||discount>=100){setError("Discount must be between 0 and 99.99%.");return}
  const{error:e}=await supabase.rpc("set_subscription_plan",{p_id:plan.id,p_discount_percent:discount,p_active:plan.active});
  if(e){setError(e.message);return}
  setMessage(plan.name+" plan updated successfully.");await load();
 };
 if(checking)return <div className="subLoading">Checking access…</div>;
 if(!authorized)return <div className="subLoading"><div><h2>Access denied</h2><Link href="/login">Return to login</Link></div></div>;
 return <div className="subPage">
  <div className="subContainer">
   <header className="subHeader">
    <div>
     <Link className="crumb" href="/admin">← Control centre</Link>
     <div className="eyebrow">COMMUTE OPERATIONS</div>
     <h1>Commute subscriptions</h1>
     <p>Manage subscription plans, discounts and customer requests from one place.</p>
    </div>
    <button className="refreshButton" onClick={load} disabled={loading}>{loading?"Refreshing…":"↻ Refresh"}</button>
   </header>
   {error&&<div className="notice error">{error}</div>}
   {message&&<div className="notice success">{message}</div>}

   <section className="summaryGrid">
    <Summary label="Customer requests" value={subs.length} hint="latest 100"/>
    <Summary label="Active subscriptions" value={activeCount} hint="currently active"/>
    <Summary label="Needs attention" value={pendingCount} hint="pending / unpaid"/>
    <Summary label="Plans" value={plans.length} hint="configured options"/>
   </section>

   <section className="panel">
    <div className="panelHeader"><div><span className="sectionLabel">PRICING</span><h2>Plans & discounts</h2><p>These discounts are used by the customer subscription quote.</p></div></div>
    <div className="planGrid">{plans.map(plan=><article className="planCard" key={plan.id}>
      <div className="planTop"><div><h3>{plan.name}</h3><span>{plan.code} · {plan.duration_months===0?"7 days":plan.duration_months+" month"+(plan.duration_months>1?"s":"")}</span></div><b className={plan.active?"activePill":"inactivePill"}>{plan.active?"ACTIVE":"OFF"}</b></div>
      <label>Discount <span>%</span><div className="discountRow"><input type="number" min="0" max="99.99" step="0.01" value={drafts[plan.id]??""} onChange={e=>setDrafts(v=>({...v,[plan.id]:e.target.value}))}/><button onClick={()=>save(plan)}>Save changes</button></div></label>
    </article>)}</div>
   </section>

   <section className="panel requestsPanel">
    <div className="panelHeader requestsHeader"><div><span className="sectionLabel">CUSTOMER ACTIVITY</span><h2>Subscription requests</h2><p>Review routes, passengers, schedules, payment and status.</p></div><span className="countPill">{subs.length} records</span></div>

    <div className="desktopTable">
     <table><thead><tr><th>Route</th><th>Plan</th><th>Passengers</th><th>Schedule</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
     <tbody>{subs.map(s=><SubscriptionRow key={s.id} s={s} plan={plans.find(p=>p.id===s.plan_id)}/>)}</tbody></table>
    </div>

    <div className="mobileCards">
     {subs.map(s=><SubscriptionCard key={s.id} s={s} plan={plans.find(p=>p.id===s.plan_id)}/>)}
     {!subs.length&&<Empty/>}
    </div>
   </section>
  </div>
  <style jsx>{styles}</style>
 </div>;
}

function Summary({label,value,hint}){return <div className="summaryCard"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function SubscriptionRow({s,plan}){
 return <tr><td><b>{s.pickup_name||"—"}</b><span className="routeArrow">→</span><b>{s.drop_name||"—"}</b><small>{Number(s.one_way_distance_km||0).toFixed(1)} km</small></td><td><b>{plan?.name||"—"}</b><small>{plan?.code||""}</small></td><td><b>{s.passenger_count||0}</b>{Array.isArray(s.passengers)&&s.passengers.length>0&&<div className="peopleInline">{s.passengers.map((p,i)=><span key={i}>{i+1}. {p.name||"Passenger"} · {p.age||"—"}y · {p.gender||"—"}</span>)}</div>}</td><td><b>{timeText(s.morning_pickup_time)} <i>→</i> {timeText(s.evening_return_time)}</b><small>{dateText(s.start_date)} → {dateText(s.end_date)}</small></td><td><b>₹{money(s.total_amount)}</b></td><td><span className={"badge "+statusClass(s.payment_status)}>{statusText(s.payment_status)}</span></td><td><span className={"badge "+statusClass(s.status)}>{statusText(s.status)}</span></td></tr>
}
function SubscriptionCard({s,plan}){
 return <article className="requestCard">
  <div className="requestTop"><div><span className="requestId">REQUEST #{String(s.id||"").slice(0,8).toUpperCase()}</span><h3>{s.pickup_name||"—"} <span>→</span> {s.drop_name||"—"}</h3><small>{Number(s.one_way_distance_km||0).toFixed(1)} km · {plan?.name||"Plan not found"}</small></div><span className={"badge "+statusClass(s.status)}>{statusText(s.status)}</span></div>
  <div className="requestGrid">
   <Info label="Passengers" value={s.passenger_count||0}/>
   <Info label="Schedule" value={timeText(s.morning_pickup_time)+" → "+timeText(s.evening_return_time)}/>
   <Info label="Amount" value={"₹"+money(s.total_amount)}/>
   <Info label="Payment" value={statusText(s.payment_status)} badge={statusClass(s.payment_status)}/>
  </div>
  {Array.isArray(s.passengers)&&s.passengers.length>0&&<div className="passengerList"><div className="miniLabel">PASSENGERS</div>{s.passengers.map((p,i)=><div className="passenger" key={i}><b>{i+1}. {p.name||"Passenger"}</b><span>{p.age||"—"} years · {p.gender||"—"}</span></div>)}</div>}
  <div className="requestFooter"><span>{dateText(s.start_date)} → {dateText(s.end_date)}</span><span>Created {s.created_at?new Date(s.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"—"}</span></div>
 </article>
}
function Info({label,value,badge}){return <div className="infoBox"><small>{label}</small>{badge?<span className={"badge "+badge}>{value}</span>:<b>{value}</b>}</div>}
function Empty(){return <div className="empty"><b>No subscription requests yet</b><span>New customer subscriptions will appear here.</span></div>}
function statusClass(v){const s=String(v||"").toLowerCase();if(s.includes("paid")||s==="active"||s==="completed")return "good";if(s.includes("cancel")||s.includes("failed"))return "bad";return "pending"}

const styles=`
.subPage{min-height:100vh;background:#f6f9fc;color:#173047;font-family:var(--voynu-font),Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.subContainer{max-width:1240px;margin:0 auto;padding:30px 28px 70px}
.subHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}
.crumb{display:inline-flex;margin-bottom:12px;color:#577487;text-decoration:none;font-size:10px;font-weight:800}
.eyebrow,.sectionLabel{display:block;color:#0b82a6;font-size:8px;font-weight:900;letter-spacing:1.5px}
.subHeader h1{margin:5px 0 6px;font-size:32px;line-height:1.1;letter-spacing:-.8px;color:#122b40}
.subHeader p,.panelHeader p{margin:0;color:#718492;font-size:11px;line-height:1.5}
.refreshButton{height:38px;border:1px solid #dbe4ea;background:#fff;border-radius:10px;padding:0 14px;color:#173047;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}
.refreshButton:disabled{opacity:.6}
.notice{padding:11px 13px;border-radius:10px;margin-bottom:14px;font-size:10px;font-weight:700}.notice.error{background:#fff0f1;color:#c94b55}.notice.success{background:#eaf8f1;color:#16835b}
.summaryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.summaryCard{background:#fff;border:1px solid #dfe8ee;border-radius:13px;padding:14px;display:grid;gap:3px;box-shadow:0 4px 16px rgba(17,48,70,.03)}
.summaryCard span{font-size:8px;color:#7c8e9b;font-weight:800}.summaryCard strong{font-size:24px;line-height:1.1;color:#19344a}.summaryCard small{font-size:8px;color:#a0adb6}
.panel{background:#fff;border:1px solid #dfe8ee;border-radius:16px;padding:18px;margin-bottom:15px;box-shadow:0 5px 18px rgba(17,48,70,.035)}
.panelHeader{margin-bottom:15px}.panelHeader h2{margin:4px 0;font-size:17px;letter-spacing:-.2px}.requestsHeader{display:flex;justify-content:space-between;align-items:flex-end}.countPill{padding:6px 9px;border-radius:99px;background:#eef7fa;color:#087b9f;font-size:8px;font-weight:900}
.planGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.planCard{border:1px solid #dfe8ee;border-radius:12px;padding:13px;background:#f9fbfc}
.planTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.planTop h3{margin:0;font-size:12px}.planTop span{display:block;margin-top:3px;font-size:8px;color:#7b8e9b}
.activePill,.inactivePill{font-size:7px;padding:4px 6px;border-radius:99px;font-weight:900}.activePill{background:#e8f8ef;color:#12825a}.inactivePill{background:#f2f3f4;color:#75818a}
.planCard label{display:block;margin-top:13px;font-size:9px;font-weight:900;color:#445c6c}.planCard label>span{color:#82929d}.discountRow{display:flex;gap:6px;margin-top:5px}.discountRow input{min-width:0;width:76px;height:35px;border:1px solid #ccd9e1;border-radius:8px;padding:0 9px;background:#fff;font-size:11px}.discountRow button{height:35px;flex:1;border:0;border-radius:8px;background:linear-gradient(135deg,#0b86aa,#087a9f);color:#fff;font-size:8px;font-weight:900;cursor:pointer}
.desktopTable{overflow:auto}.desktopTable table{width:100%;border-collapse:collapse;min-width:900px}.desktopTable th{padding:10px 8px;text-align:left;border-bottom:1px solid #dfe8ee;color:#81919d;font-size:7px;letter-spacing:.8px;text-transform:uppercase}.desktopTable td{padding:12px 8px;border-bottom:1px solid #edf1f4;vertical-align:top;font-size:9px;color:#354d5d}.desktopTable tr:last-child td{border-bottom:0}.desktopTable td b{display:block;font-size:9px;color:#1b3448}.desktopTable td small{display:block;margin-top:4px;color:#84949f;font-size:7.5px;line-height:1.35}.routeArrow{display:inline!important;color:#0b82a6;font-weight:900;margin:0 3px}.peopleInline{display:grid;gap:3px;margin-top:6px}.peopleInline span{padding:4px 5px;border-radius:6px;background:#eef8fb;color:#416778;font-size:7px}.desktopTable i{font-style:normal;color:#0b82a6}.badge{display:inline-flex;padding:4px 7px;border-radius:99px;font-size:7px;font-weight:900;text-transform:capitalize;white-space:nowrap;background:#fff4df;color:#a86705}.badge.good{background:#e8f8ef;color:#14845b}.badge.bad{background:#ffebed;color:#c84954}
.mobileCards{display:none}
.empty{padding:40px 10px;text-align:center;display:grid;gap:4px}.empty b{font-size:11px}.empty span{font-size:9px;color:#81919d}
.subLoading{min-height:60vh;display:grid;place-items:center;color:#718492;font-size:11px}.subLoading h2{color:#173047}
@media(max-width:1000px){.subContainer{padding:24px 20px 65px}.planGrid{grid-template-columns:repeat(2,1fr)}.summaryGrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:650px){
 .subContainer{padding:15px 11px 82px}.subHeader{align-items:flex-start;flex-direction:column;gap:10px;margin-bottom:15px}.subHeader h1{font-size:26px}.subHeader p{font-size:10px;max-width:340px}.crumb{margin-bottom:9px}.refreshButton{width:100%;height:40px}
 .summaryGrid{grid-template-columns:repeat(2,1fr);gap:7px}.summaryCard{padding:11px;border-radius:11px}.summaryCard strong{font-size:20px}.summaryCard span{font-size:7px}.summaryCard small{font-size:7px}
 .panel{padding:12px;border-radius:13px;margin-bottom:10px}.panelHeader h2{font-size:14px}.panelHeader p{font-size:9px}.sectionLabel{font-size:7px}.planGrid{grid-template-columns:1fr;gap:7px}.planCard{padding:11px}.discountRow input{width:88px}
 .requestsHeader{align-items:flex-start}.countPill{margin-top:2px}.desktopTable{display:none}.mobileCards{display:grid;gap:8px}
 .requestCard{border:1px solid #dfe8ee;border-radius:12px;padding:12px;background:#fff;box-shadow:0 3px 12px rgba(17,48,70,.025)}.requestTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.requestTop>div{min-width:0}.requestId{display:block;font-size:6.5px;color:#81919d;font-weight:900;letter-spacing:.7px}.requestCard h3{margin:4px 0 3px;font-size:11px;line-height:1.35;word-break:normal}.requestCard h3 span{color:#0b82a6}.requestTop small{display:block;color:#7e909d;font-size:7.5px}.requestGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px}.infoBox{min-width:0;background:#f6f9fb;border-radius:8px;padding:8px}.infoBox small{display:block;color:#81919d;font-size:6.5px;font-weight:900;text-transform:uppercase;letter-spacing:.4px}.infoBox b{display:block;margin-top:3px;font-size:9px;color:#233e51;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.infoBox .badge{margin-top:3px}.passengerList{margin-top:9px}.miniLabel{font-size:6.5px;color:#81919d;font-weight:900;letter-spacing:.8px;margin-bottom:5px}.passenger{display:flex;justify-content:space-between;gap:8px;padding:6px 7px;border-radius:7px;background:#eef8fb;margin-bottom:4px}.passenger b,.passenger span{font-size:7.5px;color:#31566a}.requestFooter{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #edf1f4;margin-top:9px;padding-top:8px;color:#81919d;font-size:7px}
}
@media(max-width:370px){.subContainer{padding-left:8px;padding-right:8px}.summaryGrid{grid-template-columns:1fr 1fr}.summaryCard strong{font-size:18px}.requestGrid{gap:5px}.requestCard{padding:10px}}
`;
