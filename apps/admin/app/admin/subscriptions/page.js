"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "../../../../../shared/lib/supabaseClient";
import { isAdminUser } from "../../../lib/admin";

const money=v=>Number(v||0).toLocaleString("en-IN");
const statusText=v=>String(v||"pending").replace(/_/g," ");
const dateText=v=>v?new Date(v+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const timeText=v=>String(v||"").slice(0,5)||"—";
const shortId=id=>String(id||"").slice(0,8).toUpperCase();

const STATUS_FILTERS=[
 {key:"all",label:"All"},
 {key:"pending_payment",label:"Payment pending"},
 {key:"active",label:"Active"},
 {key:"paused",label:"Paused"},
 {key:"completed",label:"Completed"},
 {key:"cancelled",label:"Cancelled"}
];

export default function SubscriptionAdminPage(){
 const router=useRouter();
 const[checking,setChecking]=useState(true),[authorized,setAuthorized]=useState(false);
 const[plans,setPlans]=useState([]),[subs,setSubs]=useState([]),[drivers,setDrivers]=useState([]);
 const[drafts,setDrafts]=useState({}),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const[error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 const[busyId,setBusyId]=useState(null),[assigning,setAssigning]=useState(null),[driverId,setDriverId]=useState(""),[expanded,setExpanded]=useState(null);
 const[reasonModal,setReasonModal]=useState(null),[reason,setReason]=useState(""),[pauseDates,setPauseDates]=useState([]);
 const[replacementQueue,setReplacementQueue]=useState([]),[replacementBusy,setReplacementBusy]=useState(null),[replacementDriver,setReplacementDriver]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  const [{data:p,error:pe},{data:s,error:se},{data:d,error:de}]=await Promise.all([
   supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,sort_order,active,updated_at").order("sort_order"),
   supabase.from("commute_subscriptions").select("id,user_id,plan_id,pickup_name,drop_name,one_way_distance_km,passenger_count,passengers,morning_pickup_time,evening_return_time,start_date,end_date,total_amount,base_amount,discount_amount,discount_percent,billable_days,daily_roundtrip_fare,payment_status,status,created_at,updated_at,assigned_driver_id,assigned_vehicle_id,payment_confirmed_at,subscription_trips(id,trip_date,status),subscription_exceptions(exception_date,kind,reason,chargeable)").order("created_at",{ascending:false}).limit(100),
   supabase.from("drivers").select("id,full_name,phone,availability_status,active,vehicle_id,vehicles(id,registration_number,category,seating_capacity,active,status,vehicle_category_id)").eq("active",true).order("full_name")
  ]);
  const {data:rq,error:re}=await supabase
   .from("subscription_trip_driver_overrides")
   .select("id,subscription_trip_id,original_driver_id,replacement_driver_id,replacement_vehicle_id,reason,status,created_at,subscription_trips(id,trip_date,subscription_id,status,commute_subscriptions(id,pickup_name,drop_name,morning_pickup_time,evening_return_time,assigned_driver_id))")
   .eq("status","replacement_required")
   .order("created_at",{ascending:true});
  if(pe||se||de||re)setError((pe||se||de||re).message);
  setPlans(p||[]);setSubs(s||[]);setDrivers(d||[]);setReplacementQueue(rq||[]);
  setDrafts(Object.fromEntries((p||[]).map(x=>[x.id,String(x.discount_percent??0)])));
  setLoading(false);
 };

 useEffect(()=>{(async()=>{
  const{data}=await supabase.auth.getSession();const email=data?.session?.user?.email||"";
  if(!data?.session){router.replace("/login");return}
  setAuthorized((await isAdminUser(email)));setChecking(false);
 })()},[router]);
 useEffect(()=>{if(authorized)load()},[authorized]);

 const activeCount=useMemo(()=>subs.filter(s=>s.status==="active").length,[subs]);
 const pendingCount=useMemo(()=>subs.filter(s=>s.status==="pending_payment"||s.payment_status==="pending").length,[subs]);
 const assignedCount=useMemo(()=>subs.filter(s=>s.assigned_driver_id).length,[subs]);
 const visible=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return subs.filter(s=>{
   const matchesFilter=filter==="all"||s.status===filter;
   const p=Array.isArray(s.passengers)?s.passengers:[];
   const hay=[shortId(s.id),s.pickup_name,s.drop_name,s.status,s.payment_status,...p.map(x=>x?.name)].join(" ").toLowerCase();
   return matchesFilter&&(!q||hay.includes(q));
  });
 },[subs,filter,search]);

 const assignable=useMemo(()=>drivers.filter(d=>d.active!==false&&d.vehicle_id&&d.vehicles?.active!==false&&d.vehicles?.status==="active"),[drivers]);
 const replacementAssignable=useMemo(()=>assignable.filter(d=>d.availability_status!=="offline"),[assignable]);

 const run=async(id,action,fn)=>{
  setBusyId(id);setError("");setMessage("");
  const{data,error:e}=await fn();
  if(e){setBusyId(null);setError(e.message);return}
  setSubs(prev=>prev.map(s=>s.id===id?{...s,...(Array.isArray(data)?data[0]:data)}:s));
  setBusyId(null);setMessage(action);
 };

 const confirmPayment=s=>run(s.id,"Payment confirmed and subscription activated.",()=>supabase.rpc("admin_confirm_commute_subscription",{p_subscription_id:s.id}));
 const refundSubscription=s=>{if(!window.confirm("Refund this paid subscription and cancel it? Any unused subscription wallet reward will be reversed automatically."))return;run(s.id,"Subscription refunded and cancelled.",()=>supabase.rpc("admin_refund_commute_subscription",{p_subscription_id:s.id}));};
 const assign=async s=>{
  const d=drivers.find(x=>x.id===driverId);
  if(!d?.vehicle_id)return setError("Select a driver with an assigned active vehicle.");
  await run(s.id,d.full_name+" assigned to subscription.",()=>supabase.rpc("admin_assign_commute_subscription",{p_subscription_id:s.id,p_driver_id:d.id,p_vehicle_id:d.vehicle_id}));
  setAssigning(null);setDriverId("");
 };
 const changeStatus=async(s,status)=>run(s.id,status==="active"?"Subscription resumed.":"Subscription status updated.",()=>supabase.rpc("admin_set_commute_subscription_status",{p_subscription_id:s.id,p_status:status}));
 const today=()=>{const parts=new Intl.DateTimeFormat("en",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k)?.value||"";return `${get("year")}-${get("month")}-${get("day")}`;};
 const openReason=(s,action)=>{setReasonModal({s,action});setReason("");setPauseDates(action==="pause"?((s.subscription_trips||[]).filter(t=>t.status==="scheduled"&&String(t.trip_date)>=today()).map(t=>t.trip_date)):[])};
 const submitReason=async()=>{
  const s=reasonModal?.s, action=reasonModal?.action;
  if(!s||!action)return;
  if(String(reason).trim().length<3)return setError(action==="cancel"?"Enter a cancellation reason.":"Enter a pause reason.");
  const rpc=action==="cancel"?"admin_cancel_commute_subscription":"admin_pause_commute_subscription";
  const dates=action==="pause" ? pauseDates : null;
  if(action==="pause" && !dates?.length){setError("Select at least one future scheduled service day to pause.");return}
  setReasonModal(null);
  setBusyId(s.id);setError("");setMessage("");
  const args=action==="cancel"?{p_subscription_id:s.id,p_reason:String(reason).trim()}:{p_subscription_id:s.id,p_dates:dates,p_reason:String(reason).trim()};
  const {data,error:e}=await supabase.rpc(rpc,args);
  if(e){setBusyId(null);setError(e.message);return}
  setBusyId(null);setMessage(action==="cancel"?"Subscription cancelled and applicable unused value returned to wallet.":"Pause request recorded. Days at least 4 hours before pickup are removed from the chargeable schedule; days after the cutoff remain fully chargeable.");
  await load();
 };

 const assignReplacement=async item=>{
  const d=replacementAssignable.find(x=>x.id===replacementDriver);
  if(!d?.vehicle_id)return setError("Select an active replacement driver with an assigned vehicle.");
  setReplacementBusy(item.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("admin_reassign_commute_subscription_trip",{
   p_subscription_trip_id:item.subscription_trip_id,p_driver_id:d.id,p_vehicle_id:d.vehicle_id
  });
  if(e){setReplacementBusy(null);setError(e.message);return}
  setReplacementBusy(null);setReplacementDriver("");
  setMessage(d.full_name+" assigned to the affected commute date.");
  await load();
 };
 const save=async plan=>{
  setError("");setMessage("");
  const discount=Number(drafts[plan.id]);
  if(!Number.isFinite(discount)||discount<0||discount>=100){setError("Discount must be between 0 and 99.99%.");return}
  const{error:e}=await supabase.rpc("set_subscription_plan",{p_id:plan.id,p_discount_percent:discount,p_active:plan.active});
  if(e)return setError(e.message);
  setMessage(plan.name+" plan updated successfully.");await load();
 };

 if(checking)return <div className="subLoading">Checking access…</div>;
 if(!authorized)return <div className="subLoading"><div><h2>Access denied</h2><Link href="/login">Return to login</Link></div></div>;

 return <div className="subPage"><div className="subContainer">
  <header className="subHeader">
   <div><Link className="crumb" href="/admin">← Control centre</Link><span className="eyebrow">COMMUTE OPERATIONS</span><h1>Commute subscriptions</h1><p>Review requests, confirm payment, assign operations and manage the subscription lifecycle.</p></div>
   <button className="refreshButton" onClick={load} disabled={loading}>{loading?"Refreshing…":"↻ Refresh"}</button>
  </header>
  {error&&<div className="notice error">⚠ {error}</div>}
  {message&&<div className="notice success">✓ {message}</div>}

  <section className="summaryGrid"><Summary label="Requests" value={subs.length} hint="latest 100"/><Summary label="Payment pending" value={pendingCount} hint="needs confirmation" alert={pendingCount>0}/><Summary label="Active" value={activeCount} hint="live subscriptions"/><Summary label="Driver assigned" value={assignedCount} hint="operations ready"/></section>

  <section className="panel">
   <div className="panelHeader"><div><span className="sectionLabel">PRICING CONTROL</span><h2>Plans & discounts</h2><p>Changes here feed the customer subscription quote.</p></div></div>
   <div className="planGrid">{plans.map(plan=><article className="planCard" key={plan.id}>
    <div className="planTop"><div><h3>{plan.name}</h3><span>{plan.code} · {plan.duration_months===0?"7 days":plan.duration_months+" month"+(plan.duration_months>1?"s":"")}</span></div><b className={plan.active?"activePill":"inactivePill"}>{plan.active?"ACTIVE":"OFF"}</b></div>
    <label>Discount</label><div className="discountRow"><div className="percentInput"><input type="number" min="0" max="99.99" step="0.01" value={drafts[plan.id]??""} onChange={e=>setDrafts(v=>({...v,[plan.id]:e.target.value}))}/><span>%</span></div><button onClick={()=>save(plan)}>Save changes</button></div>
   </article>)}</div>
  </section>

  <section className="panel replacementPanel">
   <div className="panelHeader requestsHeader"><div><span className="sectionLabel">ACTION REQUIRED</span><h2>Driver replacement queue</h2><p>Future commute dates that need a replacement Saarthi. Current or in-progress trips are never placed here.</p></div><span className="countPill">{replacementQueue.length} pending</span></div>
   {replacementQueue.length===0?<div className="queueEmpty">✓ No driver replacements are currently waiting for action.</div>:<div className="replacementList">
    {replacementQueue.map(item=>{
      const st=item.subscription_trips||{}; const sub=st.commute_subscriptions||{}; const original=drivers.find(d=>d.id===item.original_driver_id);
      return <article className="replacementItem" key={item.id}>
       <div className="replacementMain"><div><span className="requestId">SERVICE DATE</span><b>{dateText(st.trip_date)}</b><strong>{sub.pickup_name||"Pickup"} → {sub.drop_name||"Drop"}</strong><small>{timeText(sub.morning_pickup_time)} → {timeText(sub.evening_return_time)} · Request #{shortId(sub.id)}</small></div><span className="badge pending">Replacement required</span></div>
       <div className="replacementMeta"><span><b>Original Saarthi</b>{original?.full_name||"Driver"}</span><span><b>Reason</b>{item.reason}</span></div>
       <div className="replacementActions"><select value={replacementDriver} onChange={e=>setReplacementDriver(e.target.value)} disabled={replacementBusy===item.id}><option value="">Select replacement driver…</option>{replacementAssignable.filter(d=>d.id!==item.original_driver_id).map(d=><option key={d.id} value={d.id}>{d.full_name} · {d.vehicles?.registration_number||"—"}</option>)}</select><button className="primary" disabled={!replacementDriver||replacementBusy===item.id} onClick={()=>assignReplacement(item)}>{replacementBusy===item.id?"Assigning…":"Assign replacement"}</button></div>
      </article>
    })}
   </div>}
  </section>

  <section className="panel requestsPanel">
   <div className="panelHeader requestsHeader"><div><span className="sectionLabel">OPERATIONS QUEUE</span><h2>Subscription requests</h2><p>Every request has its payment, assignment and lifecycle controls here.</p></div><span className="countPill">{visible.length} shown</span></div>
   <div className="toolbar"><div className="searchBox"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search route, request or passenger"/></div><div className="filters">{STATUS_FILTERS.map(x=><button key={x.key} className={filter===x.key?"selected":""} onClick={()=>setFilter(x.key)}>{x.label}{x.key!=="all"&&<em>{subs.filter(s=>s.status===x.key).length}</em>}</button>)}</div></div>

   <div className="desktopTable"><table><thead><tr><th>Request</th><th>Plan / schedule</th><th>Passengers</th><th>Amount</th><th>Payment</th><th>Operations</th></tr></thead><tbody>{visible.map(s=><SubscriptionRow key={s.id} s={s} plan={plans.find(p=>p.id===s.plan_id)} busy={busyId===s.id} onPayment={()=>confirmPayment(s)} onAssign={()=>{setAssigning(s.id);setDriverId("")}} onPause={()=>openReason(s,"pause")} onActivate={()=>changeStatus(s,"active")} onCancel={()=>openReason(s,"cancel")} onRefund={()=>refundSubscription(s)} />)}</tbody></table>{!visible.length&&<Empty/>}</div>

   <div className="mobileCards">{visible.map(s=><SubscriptionCard key={s.id} s={s} plan={plans.find(p=>p.id===s.plan_id)} expanded={expanded===s.id} busy={busyId===s.id} assigning={assigning===s.id} drivers={assignable} driverId={driverId} setDriverId={setDriverId} onExpand={()=>setExpanded(expanded===s.id?null:s.id)} onPayment={()=>confirmPayment(s)} onAssign={()=>assign(s)} startAssign={()=>{setAssigning(s.id);setDriverId("")}} closeAssign={()=>setAssigning(null)} onPause={()=>openReason(s,"pause")} onActivate={()=>changeStatus(s,"active")} onCancel={()=>openReason(s,"cancel")} onRefund={()=>refundSubscription(s)}/>) }{!visible.length&&<Empty/>}</div>
  </section>
 </div><style jsx>{styles}</style></div>;
}

function Summary({label,value,hint,alert}){return <div className={"summaryCard"+(alert?" alert":"")}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}

function ActionButtons({s,busy,onPayment,onAssign,onPause,onActivate,onCancel,onRefund,compact=false}){
 const canPay=s.payment_status==="pending"&&s.status==="pending_payment";
 const canAssign=s.payment_status==="paid"&&["active","paused"].includes(s.status);
 return <div className={"actions"+(compact?" compact":"")}>
  {canPay&&<button className="primary" disabled={busy} onClick={onPayment}>✓ Confirm payment</button>}
  {canAssign&&!s.assigned_driver_id&&<button className="secondary" disabled={busy} onClick={onAssign}>＋ Assign driver</button>}
  {canAssign&&s.assigned_driver_id&&<button className="secondary" disabled={busy} onClick={onAssign}>↔ Change driver</button>}
  {s.status==="paused"&&s.payment_status==="paid"&&<button className="secondary" disabled={busy} onClick={onActivate}>▶ Resume</button>}
  {s.status==="active"&&<button className="quiet" disabled={busy} onClick={onPause}>Ⅱ Pause</button>}
  {s.payment_status==="paid"&&!["cancelled","completed"].includes(s.status)&&<button className="danger" disabled={busy} onClick={onRefund}>↩ Refund & cancel</button>}
  {s.payment_status!=="paid"&&!["cancelled","completed"].includes(s.status)&&<button className="danger" disabled={busy} onClick={()=>{if(window.confirm("Cancel this subscription?"))onCancel()}}>Cancel</button>}
 </div>
}

function SubscriptionRow({s,plan,busy,onPayment,onAssign,onPause,onActivate,onCancel,onRefund}){
 return <tr>
  <td><div className="requestCell"><b>#{shortId(s.id)}</b><strong>{s.pickup_name} <i>→</i> {s.drop_name}</strong><small>{Number(s.one_way_distance_km||0).toFixed(1)} km · {dateText(s.start_date)} → {dateText(s.end_date)}</small></div></td>
  <td><b>{plan?.name||"—"}</b><small>{timeText(s.morning_pickup_time)} → {timeText(s.evening_return_time)}</small></td>
  <td><b>{s.passenger_count}</b><small>{Array.isArray(s.passengers)?s.passengers.map(p=>p?.name||"Passenger").join(", "):"—"}</small></td>
  <td><b>₹{money(s.total_amount)}</b><small>{s.billable_days} billable days</small></td>
  <td><span className={"badge "+statusClass(s.payment_status)}>{statusText(s.payment_status)}</span><small>{s.payment_confirmed_at?"Confirmed":""}</small></td>
  <td><div className="rowStatus"><span className={"badge "+statusClass(s.status)}>{statusText(s.status)}</span>{s.assigned_driver_id&&<small>Driver assigned</small>}</div><ActionButtons s={s} busy={busy} onPayment={onPayment} onAssign={onAssign} onPause={onPause} onActivate={onActivate} onCancel={onCancel} onRefund={onRefund} compact/></td>
 </tr>
}

function SubscriptionCard({s,plan,expanded,busy,assigning,drivers,driverId,setDriverId,onExpand,onPayment,onAssign,startAssign,closeAssign,onPause,onActivate,onCancel,onRefund}){
 const driver=drivers.find(d=>d.id===s.assigned_driver_id);
 return <article className={"requestCard"+(expanded?" expanded":"")}>
  <div className="requestTop"><div><span className="requestId">REQUEST #{shortId(s.id)}</span><h3>{s.pickup_name} <span>→</span> {s.drop_name}</h3><small>{Number(s.one_way_distance_km||0).toFixed(1)} km · {plan?.name||"Plan not found"}</small></div><span className={"badge "+statusClass(s.status)}>{statusText(s.status)}</span></div>
  <div className="requestGrid"><Info label="Passengers" value={s.passenger_count}/><Info label="Schedule" value={timeText(s.morning_pickup_time)+" → "+timeText(s.evening_return_time)}/><Info label="Amount" value={"₹"+money(s.total_amount)}/><Info label="Payment" value={statusText(s.payment_status)} badge={statusClass(s.payment_status)}/></div>
  {driver&&<div className="assignedDriver"><span>DRIVER</span><div><b>{driver.full_name}</b><small>{driver.vehicles?.registration_number||"No vehicle"} · {driver.vehicles?.category||"Vehicle"}</small></div><button onClick={startAssign}>Change</button></div>}
  <ActionButtons s={s} busy={busy} onPayment={onPayment} onAssign={startAssign} onPause={onPause} onActivate={onActivate} onCancel={onCancel} onRefund={onRefund}/>
  {assigning&&<div className="assignBox"><div><b>Assign driver</b><small>Only active drivers with an active assigned vehicle are shown.</small></div><select value={driverId} onChange={e=>setDriverId(e.target.value)}><option value="">Select driver…</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name} · {d.vehicles?.registration_number||"—"}</option>)}</select><div className="assignActions"><button className="primary" disabled={!driverId||busy} onClick={onAssign}>Assign driver</button><button className="quiet" onClick={closeAssign}>Close</button></div></div>}
  <button className="detailsToggle" onClick={onExpand}>{expanded?"Hide details":"View full request details"} <span>{expanded?"↑":"↓"}</span></button>
  {expanded&&<div className="details">
   <div className="detailLine"><span>Subscription period</span><b>{dateText(s.start_date)} → {dateText(s.end_date)}</b></div>
   <div className="detailLine"><span>Billing</span><b>₹{money(s.daily_roundtrip_fare)}/day × {s.billable_days} days · {s.discount_percent||0}% discount</b></div>
   <div className="detailLine"><span>Fare</span><b>Base ₹{money(s.base_amount)} · Discount ₹{money(s.discount_amount)} · Total ₹{money(s.total_amount)}</b></div>
   <div className="detailLine"><span>Created</span><b>{s.created_at?new Date(s.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"—"}</b></div>
   {Array.isArray(s.passengers)&&s.passengers.length>0&&<div className="passengerList"><div className="miniLabel">PASSENGERS</div>{s.passengers.map((p,i)=><div className="passenger" key={i}><b>{i+1}. {p?.name||"Passenger"}</b><span>{p?.age||"—"} years · {p?.gender||"—"}</span></div>)}</div>}
  </div>}
 </article>
}

function Info({label,value,badge}){return <div className="infoBox"><small>{label}</small>{badge?<span className={"badge "+badge}>{value}</span>:<b>{value}</b>}</div>}
function Empty(){return <div className="empty"><span>✓</span><b>No requests in this view</b><small>Try another status or search term.</small></div>}
function statusClass(v){const s=String(v||"").toLowerCase();if(s.includes("paid")||s==="active"||s==="completed")return "good";if(s.includes("cancel")||s.includes("failed")||s==="refunded")return "bad";return "pending"}

const styles=String.raw`
.reasonOverlay{position:fixed;inset:0;background:rgba(10,24,34,.48);display:grid;place-items:center;padding:18px;z-index:50}.reasonModal{width:min(520px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.reasonModal h2{margin:5px 0 7px;font-size:19px}.reasonModal p{margin:0 0 14px;color:#718492;font-size:10px;line-height:1.5}.reasonModal label{display:grid;gap:6px;font-size:9px;font-weight:900;color:#445c6c}.dateChoices{display:grid;gap:6px;margin:0 0 13px;max-height:220px;overflow:auto}.dateChoice{display:flex!important;align-items:center;gap:8px;padding:8px 9px;border:1px solid #dfe8ee;border-radius:9px;background:#f8fafc;font-size:8px!important;font-weight:800!important}.dateChoice input{accent-color:#0b82a5}.reasonModal textarea{width:100%;box-sizing:border-box;border:1px solid #ccd9e1;border-radius:10px;padding:10px;resize:vertical;font:inherit;font-size:10px;outline:none}.modalActions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}.modalActions button{border:1px solid #dbe5eb;border-radius:9px;padding:9px 12px;font-size:8px;font-weight:900;cursor:pointer}.modalActions .primary{background:#0b82a5;border-color:#0b82a5;color:#fff}.modalActions .danger{background:#fff0f1;border-color:#f3c5c9;color:#c74c56}.modalActions .quiet{background:#fff;color:#526b7b}.subPage{min-height:100vh;background:#f5f8fb;color:#173047;font-family:var(--voynu-font),Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.subContainer{max-width:1280px;margin:0 auto;padding:28px 28px 70px}.subHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.crumb{display:inline-flex;margin-bottom:10px;color:#607b8b;text-decoration:none;font-size:10px;font-weight:800}.eyebrow,.sectionLabel{display:block;color:#087fa5;font-size:8px;font-weight:900;letter-spacing:1.5px}.subHeader h1{margin:5px 0 6px;font-size:32px;line-height:1.1;letter-spacing:-.8px;color:#122b40}.subHeader p,.panelHeader p{margin:0;color:#718492;font-size:11px;line-height:1.5}.refreshButton{height:39px;border:1px solid #d9e5ec;background:#fff;border-radius:10px;padding:0 15px;color:#173047;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}.refreshButton:disabled{opacity:.55}
.notice{padding:11px 13px;border-radius:10px;margin-bottom:12px;font-size:10px;font-weight:800}.notice.error{background:#fff0f1;color:#c94b55;border:1px solid #ffd6d9}.notice.success{background:#eaf8f1;color:#16835b;border:1px solid #cdeedf}
.replacementPanel{border-color:#f0d6ad;background:#fffdf8}.replacementList{display:grid;gap:8px}.replacementItem{border:1px solid #eadfca;border-radius:11px;padding:11px;background:#fff}.replacementMain{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.replacementMain>div{display:grid;gap:3px}.replacementMain b{font-size:10px;color:#203b4f}.replacementMain strong{font-size:10px;color:#173047}.replacementMain small{font-size:7.5px;color:#84949f}.replacementMeta{display:flex;gap:18px;margin-top:9px;padding:8px;border-radius:8px;background:#faf7f0}.replacementMeta span{display:grid;gap:3px;font-size:8px;color:#617786;min-width:150px}.replacementMeta b{font-size:6.5px;color:#8b7c65;text-transform:uppercase;letter-spacing:.5px}.replacementActions{display:flex;gap:7px;margin-top:9px}.replacementActions select{flex:1;height:34px;border:1px solid #ccd9e1;border-radius:8px;background:#fff;padding:0 8px;font-size:8px}.replacementActions button{height:34px;border:0;border-radius:8px;padding:0 12px;font-size:8px;font-weight:900;cursor:pointer}.replacementActions .primary{background:#0b82a5;color:#fff}.replacementActions button:disabled{opacity:.5;cursor:wait}.queueEmpty{padding:20px 10px;border:1px dashed #dfd3bb;border-radius:10px;text-align:center;color:#7e8f99;font-size:9px;background:#fff}.summaryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.summaryCard{background:#fff;border:1px solid #dfe8ee;border-radius:13px;padding:13px 14px;display:grid;gap:3px;box-shadow:0 5px 18px rgba(17,48,70,.035)}.summaryCard.alert{border-color:#f0d6ad;background:#fffaf2}.summaryCard span{font-size:8px;color:#7c8e9b;font-weight:900;text-transform:uppercase}.summaryCard strong{font-size:24px;line-height:1.1;color:#19344a}.summaryCard small{font-size:8px;color:#a0adb6}
.panel{background:#fff;border:1px solid #dfe8ee;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 5px 20px rgba(17,48,70,.035)}.panelHeader{margin-bottom:14px}.panelHeader h2{margin:4px 0;font-size:17px;letter-spacing:-.2px}.requestsHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.countPill{padding:6px 9px;border-radius:99px;background:#eef7fa;color:#087b9f;font-size:8px;font-weight:900;white-space:nowrap}
.planGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.planCard{border:1px solid #dfe8ee;border-radius:12px;padding:13px;background:#f9fbfc}.planTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.planTop h3{margin:0;font-size:12px}.planTop span{display:block;margin-top:3px;font-size:8px;color:#7b8e9b}.activePill,.inactivePill{font-size:7px;padding:4px 6px;border-radius:99px;font-weight:900}.activePill{background:#e8f8ef;color:#12825a}.inactivePill{background:#f2f3f4;color:#75818a}.planCard label{display:block;margin-top:13px;font-size:9px;font-weight:900;color:#445c6c}.discountRow{display:flex;gap:7px;margin-top:5px}.percentInput{position:relative;display:flex;align-items:center}.percentInput input{width:82px;height:36px;border:1px solid #ccd9e1;border-radius:9px;padding:0 24px 0 9px;background:#fff;font-size:11px}.percentInput span{position:absolute;right:9px;color:#7d909d;font-size:9px;font-weight:900}.discountRow button{height:36px;flex:1;border:0;border-radius:9px;background:linear-gradient(135deg,#0b86aa,#087a9f);color:#fff;font-size:8px;font-weight:900;cursor:pointer}
.toolbar{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:10px;margin-bottom:12px}.searchBox{height:38px;border:1px solid #dbe5eb;border-radius:10px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px}.searchBox span{color:#8295a2}.searchBox input{width:100%;border:0!important;outline:0;background:transparent!important;font-size:10px}.filters{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.filters button{height:34px;border:1px solid #dbe5eb;border-radius:9px;background:#fff;color:#607786;padding:0 9px;font-size:8px;font-weight:900;cursor:pointer}.filters button.selected{background:#0b82a5;border-color:#0b82a5;color:#fff}.filters em{font-style:normal;margin-left:4px;opacity:.7}
.desktopTable{overflow:auto}.desktopTable table{width:100%;border-collapse:collapse;min-width:1050px}.desktopTable th{padding:9px 8px;text-align:left;border-bottom:1px solid #dfe8ee;color:#81919d;font-size:7px;letter-spacing:.8px;text-transform:uppercase}.desktopTable td{padding:11px 8px;border-bottom:1px solid #edf1f4;vertical-align:top;font-size:9px;color:#354d5d}.desktopTable tr:last-child td{border-bottom:0}.desktopTable td b{display:block;font-size:9px;color:#1b3448}.desktopTable td small{display:block;margin-top:4px;color:#84949f;font-size:7.5px;line-height:1.35}.requestCell{display:grid;gap:3px;min-width:210px}.requestCell>strong{font-size:9.5px;color:#203b4f}.requestCell i{font-style:normal;color:#0b82a6}.rowStatus{display:flex;align-items:center;gap:7px;margin-bottom:7px}.rowStatus small{margin:0!important}.badge{display:inline-flex;padding:4px 7px;border-radius:99px;font-size:7px;font-weight:900;text-transform:capitalize;white-space:nowrap;background:#fff4df;color:#a86705}.badge.good{background:#e8f8ef;color:#14845b}.badge.bad{background:#ffebed;color:#c84954}.actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.actions button{border:1px solid #dbe5eb;border-radius:8px;background:#fff;padding:7px 8px;font-size:7.5px;font-weight:900;color:#526b7b;cursor:pointer}.actions button:disabled{opacity:.5;cursor:wait}.actions .primary{background:#0b82a5;border-color:#0b82a5;color:#fff}.actions .secondary{background:#eaf5fb;border-color:#cce5f0;color:#176c91}.actions .danger{background:#fff0f1;border-color:#f3c5c9;color:#c74c56}.actions.compact{margin-top:0}.actions.compact button{padding:6px 7px}
.mobileCards{display:none}.empty{padding:42px 10px;text-align:center;display:grid;place-items:center;gap:5px;color:#81919d}.empty span{width:30px;height:30px;border-radius:50%;background:#eaf8f1;color:#16835b;display:grid;place-items:center}.empty b{font-size:11px;color:#243d50}.empty small{font-size:8px}
.subLoading{min-height:60vh;display:grid;place-items:center;color:#718492;font-size:11px}.subLoading h2{color:#173047}
@media(max-width:1050px){.planGrid{grid-template-columns:repeat(2,1fr)}.summaryGrid{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}}
@media(max-width:650px){
 .subContainer{padding:14px 10px 82px}.subHeader{align-items:flex-start;flex-direction:column;gap:10px;margin-bottom:13px}.subHeader h1{font-size:25px}.subHeader p{font-size:10px;max-width:360px}.refreshButton{width:100%;height:39px}
 .summaryGrid{grid-template-columns:repeat(2,1fr);gap:7px}.summaryCard{padding:10px;border-radius:11px}.summaryCard strong{font-size:19px}.summaryCard span{font-size:7px}.summaryCard small{font-size:7px}
 .panel{padding:12px;border-radius:13px;margin-bottom:9px}.replacementMain{gap:6px}.replacementMeta{display:grid;gap:7px;margin-top:8px}.replacementActions{display:grid;grid-template-columns:1fr;gap:5px}.replacementActions select,.replacementActions button{width:100%;height:36px}.replacementItem{padding:10px}.panelHeader{margin-bottom:11px}.panelHeader h2{font-size:14px}.panelHeader p{font-size:8.5px}.sectionLabel{font-size:7px}.planGrid{grid-template-columns:1fr;gap:7px}.planCard{padding:11px}.discountRow button{font-size:8px}
 .toolbar{display:flex;flex-direction:column;gap:7px}.searchBox{height:37px}.filters{overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}.filters button{flex:0 0 auto;height:32px}
 .requestsHeader{align-items:flex-start}.countPill{margin-top:1px}.desktopTable{display:none}.mobileCards{display:grid;gap:8px}
 .requestCard{border:1px solid #dce7ed;border-radius:13px;padding:11px;background:#fff;box-shadow:0 3px 13px rgba(17,48,70,.035)}.requestCard.expanded{border-color:#b9dbe7}.requestTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.requestTop>div{min-width:0}.requestId{display:block;font-size:6.5px;color:#81919d;font-weight:900;letter-spacing:.7px}.requestCard h3{margin:4px 0 3px;font-size:10.5px;line-height:1.35}.requestCard h3 span{color:#0b82a6}.requestTop small{display:block;color:#7e909d;font-size:7.5px}
 .requestGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:9px}.infoBox{min-width:0;background:#f6f9fb;border-radius:8px;padding:8px}.infoBox small{display:block;color:#81919d;font-size:6.5px;font-weight:900;text-transform:uppercase;letter-spacing:.4px}.infoBox b{display:block;margin-top:3px;font-size:9px;color:#233e51;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.infoBox .badge{margin-top:3px}
 .actions{margin-top:9px;display:grid;grid-template-columns:1fr 1fr;gap:5px}.actions button{min-height:34px;font-size:8px}.actions .danger{grid-column:span 2}.assignedDriver{margin-top:8px;padding:8px;border-radius:9px;background:#edf8f4;display:flex;align-items:center;gap:8px}.assignedDriver>span{font-size:6px;font-weight:900;color:#278064}.assignedDriver>div{display:grid;gap:2px;flex:1;min-width:0}.assignedDriver b{font-size:8.5px}.assignedDriver small{font-size:7px;color:#6b858f}.assignedDriver button{border:0;background:transparent;color:#087fa5;font-size:7.5px;font-weight:900}
 .assignBox{margin-top:8px;padding:9px;border:1px solid #cfe4ec;border-radius:10px;background:#f5fafc}.assignBox>div:first-child{display:grid;gap:2px;margin-bottom:7px}.assignBox b{font-size:9px}.assignBox small{font-size:7px;color:#7a8e9a;line-height:1.35}.assignBox select{width:100%;height:36px;border:1px solid #ccdce4;border-radius:8px;background:#fff;padding:0 8px;font-size:8.5px}.assignActions{display:flex;gap:5px;margin-top:6px}.assignActions button{flex:1}
 .detailsToggle{width:100%;margin-top:8px;padding:8px 0;border:0;border-top:1px solid #edf1f4;background:transparent;color:#0b7ea2;font-size:7.5px;font-weight:900;display:flex;justify-content:center;gap:5px}.detailsToggle span{font-size:9px}.details{border-top:1px solid #edf1f4;padding-top:8px}.detailLine{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #f0f3f5}.detailLine span{font-size:7px;color:#81919d}.detailLine b{text-align:right;font-size:7.5px;color:#294458;max-width:65%}.passengerList{margin-top:9px}.miniLabel{font-size:6.5px;color:#81919d;font-weight:900;letter-spacing:.8px;margin-bottom:5px}.passenger{display:flex;justify-content:space-between;gap:8px;padding:6px 7px;border-radius:7px;background:#eef8fb;margin-bottom:4px}.passenger b,.passenger span{font-size:7.5px;color:#31566a}
}
@media(max-width:370px){.subContainer{padding-left:8px;padding-right:8px}.summaryCard strong{font-size:18px}.requestCard{padding:10px}}
`;
