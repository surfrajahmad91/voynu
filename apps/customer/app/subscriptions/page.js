"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import PageHeader from "../../../../shared/components/PageHeader";
import LocationPicker from "../../components/LocationPicker";
import {supabase} from "../../../../shared/lib/supabaseClient";
import {theme} from "../../../../shared/lib/theme";

const DAYS=[[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"],[7,"Sun"]];
const VOYNU_UPI_VPA="surfraj@ybl";
const FALLBACK=[
  {code:"weekly",name:"Weekly",duration_months:0,discount_percent:0,wallet_reward_amount:0},
  {code:"monthly",name:"Monthly",duration_months:1,discount_percent:5,wallet_reward_amount:0},
  {code:"quarterly",name:"Quarterly",duration_months:3,discount_percent:10,wallet_reward_amount:0},
  {code:"half_yearly",name:"Half-Yearly",duration_months:6,discount_percent:15,wallet_reward_amount:0}
];
const emptyPerson=()=>({name:"",age:"",gender:""});

export default function CommuteSubscriptionPage(){
  const router=useRouter();
  const[session,setSession]=useState(null);
  const[categories,setCategories]=useState([]);
  const[plans,setPlans]=useState(FALLBACK);
  const[pickup,setPickup]=useState(null);
  const[drop,setDrop]=useState(null);
  const[distance,setDistance]=useState("");
  const[busyDistance,setBusyDistance]=useState(false);
  const[passengers,setPassengers]=useState(1);
  const[people,setPeople]=useState([emptyPerson()]);
  const[vehicle,setVehicle]=useState("");
  const[plan,setPlan]=useState("monthly");
  const[morning,setMorning]=useState("08:00");
  const[evening,setEvening]=useState("18:00");
  const[start,setStart]=useState("");
  const[weekdays,setWeekdays]=useState([1,2,3,4,5]);
  const[quote,setQuote]=useState(null);
  const[hasCalculated,setHasCalculated]=useState(false);
  const[calculating,setCalculating]=useState(false);
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");
  const[busy,setBusy]=useState(false);
  const[upiPayClicked,setUpiPayClicked]=useState(false);
  const[upiPaymentConfirmed,setUpiPaymentConfirmed]=useState(false);
  const[step,setStep]=useState(1);

  const tomorrow=useMemo(()=>{
    const d=new Date();
    d.setDate(d.getDate()+1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data?.session||null));
    const{data:l}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>l?.subscription?.unsubscribe();
  },[]);

  useEffect(()=>{
    setStart(v=>v||tomorrow);
    Promise.all([
      supabase.from("vehicle_categories").select("id,name,passenger_capacity,active,bookable,sort_order").eq("active",true).eq("bookable",true).order("sort_order"),
      supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,wallet_reward_amount,sort_order,active").eq("active",true).order("sort_order")
    ]).then(([c,p])=>{
      if(!c.error)setCategories(c.data||[]);
      if(!p.error&&p.data?.length)setPlans(p.data);
    });
  },[tomorrow]);

  const eligible=useMemo(
    ()=>categories.filter(c=>Number(c.passenger_capacity)>=passengers),
    [categories,passengers]
  );

  useEffect(()=>{
    if(!eligible.some(c=>c.id===vehicle))setVehicle(eligible[0]?.id||"");
  },[eligible,vehicle]);

  useEffect(()=>{
    setPeople(old=>Array.from({length:passengers},(_,i)=>old[i]||emptyPerson()));
  },[passengers]);

  const setLoc=setter=>x=>setter(x&&x.name?x:null);

  const clearFeedback=()=>{setError("");setMessage("")};

  const calcDistance=async()=>{
    clearFeedback();
    if(!pickup||!drop)return setError("Select both pickup and destination from the search suggestions or map.");
    if(Number.isFinite(Number(pickup.lat))&&Number.isFinite(Number(drop.lat))&&Math.abs(Number(pickup.lat)-Number(drop.lat))<0.00001&&Math.abs(Number(pickup.lon)-Number(drop.lon))<0.00001){
      return setError("Pickup and destination cannot be the same.");
    }
    setBusyDistance(true);
    try{
      const r=await fetch("/api/route-distance",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          origin:{lat:Number(pickup.lat),lon:Number(pickup.lon)},
          destination:{lat:Number(drop.lat),lon:Number(drop.lon)}
        })
      });
      const d=await r.json();
      if(!r.ok)throw Error(d?.error||"Unable to calculate road distance.");
      const km=Number(d?.distanceKm??Number(d?.distanceMeters)/1000);
      if(!Number.isFinite(km)||km<=0)throw Error("No valid road distance returned.");
      setDistance(km.toFixed(1));
      setQuote(null);
      setHasCalculated(false);
      return km.toFixed(1);
    }catch(e){
      setError(e.message||"Distance calculation failed");
      return null;
    }finally{setBusyDistance(false)}
  };

  const validateRoute=()=>{
    if(!pickup?.name||!Number.isFinite(Number(pickup.lat))||!Number.isFinite(Number(pickup.lon)))return "Please select a valid pickup location.";
    if(!drop?.name||!Number.isFinite(Number(drop.lat))||!Number.isFinite(Number(drop.lon)))return "Please select a valid destination.";
    if(!distance)return "Please calculate the road distance first.";
    if(!morning||!evening)return "Please select both morning pickup and evening return times.";
    if(morning===evening)return "Morning pickup and evening return times should be different.";
    if(!start)return "Please select a start date.";
    if(!weekdays.length)return "Select at least one travel day.";
    return "";
  };

  const validatePassengers=()=>{
    if(!vehicle)return "Please select a vehicle category.";
    for(let i=0;i<people.length;i++){
      const p=people[i];
      if(String(p.name).trim().length<2)return `Enter the name for Passenger ${i+1}.`;
      if(!p.age||Number(p.age)<1||Number(p.age)>120)return `Enter a valid age for Passenger ${i+1}.`;
      if(!p.gender)return `Select the gender for Passenger ${i+1}.`;
    }
    return "";
  };

  const quoteNow=async()=>{
    const routeError=validateRoute();
    if(routeError){setError(routeError);return false}
    if(!vehicle){setError("Please select a vehicle category.");return false}
    clearFeedback();
    setCalculating(true);
    const{data,error:e}=await supabase.rpc("quote_commute_subscription",{
      p_plan_code:plan,
      p_vehicle_category_id:vehicle,
      p_one_way_distance_km:Number(distance),
      p_start_date:start,
      p_passenger_count:passengers,
      p_weekdays:weekdays
    });
    setCalculating(false);
    if(e){setError(e.message||"Unable to calculate subscription price.");return false}
    setQuote(data);
    setHasCalculated(true);
    setUpiPayClicked(false);
    setUpiPaymentConfirmed(false);
    return true;
  };

  const updatePerson=(index,key,value)=>{
    setPeople(old=>old.map((p,i)=>i===index?{...p,[key]:value}:p));
    setHasCalculated(false);
    setQuote(null);
    setUpiPayClicked(false);
    setUpiPaymentConfirmed(false);
  };

  const toggleDay=n=>{
    setWeekdays(w=>w.includes(n)?w.filter(v=>v!==n):[...w,n].sort());
    setHasCalculated(false);
    setQuote(null);
  };

  const nextStep=async()=>{
    clearFeedback();
    if(step===1){
      const e=validateRoute();
      if(e)return setError(e);
      setStep(2);
      return;
    }
    if(step===2){
      const e=validatePassengers();
      if(e)return setError(e);
      setStep(3);
      return;
    }
    if(step===3){
      const ok=await quoteNow();
      if(ok)setStep(4);
    }
  };

  const previousStep=()=>{
    clearFeedback();
    setStep(s=>Math.max(1,s-1));
  };

  const submit=async()=>{
    if(!session)return router.push("/login?next=/subscriptions");
    const routeError=validateRoute();
    if(routeError)return setError(routeError);
    const peopleError=validatePassengers();
    if(peopleError)return setError(peopleError);
    if(!quote){
      const ok=await quoteNow();
      if(!ok)return;
    }
    if(!upiPaymentConfirmed)return setError("Please complete the UPI payment and confirm it above before requesting the subscription.");
    setBusy(true);
    setError("");
    const{data,error:e}=await supabase.rpc("create_commute_subscription",{
      p_plan_code:plan,
      p_vehicle_category_id:vehicle,
      p_pickup_name:pickup.name,
      p_pickup_lat:Number(pickup.lat),
      p_pickup_lon:Number(pickup.lon),
      p_drop_name:drop.name,
      p_drop_lat:Number(drop.lat),
      p_drop_lon:Number(drop.lon),
      p_one_way_distance_km:Number(distance),
      p_passenger_count:passengers,
      p_morning_pickup_time:morning,
      p_evening_return_time:evening,
      p_start_date:start,
      p_weekdays:weekdays,
      p_passengers:people.map(p=>({name:String(p.name).trim(),age:Number(p.age),gender:p.gender}))
    });
    setBusy(false);
    if(e)return setError(e.message||"Unable to submit subscription request.");
    try{
      sessionStorage.setItem("voynu_confirmed_subscription",JSON.stringify({
        id:data?.id||null,
        planName:plans.find(p=>p.code===plan)?.name||plan,
        pickupName:pickup.name,
        dropName:drop.name,
        distance,
        morning,
        evening,
        start,
        weekdays,
        passengers,
        vehicle,
        quote,
        confirmedAt:new Date().toISOString()
      }));
    }catch(storageError){console.error("VOYNU: unable to store confirmed subscription:",storageError)}
    router.push("/subscriptions/confirmed");
  };

  const selectedPlan=plans.find(p=>p.code===plan);
  const selectedVehicle=categories.find(c=>c.id===vehicle);

  const money=v=>Number(v||0).toLocaleString("en-IN");
  const dayNames=weekdays.map(n=>DAYS.find(d=>d[0]===n)?.[1]).filter(Boolean).join(", ");

  return <><PageHeader/><main className="page">
    <section className="hero">
      <div className="wrap">
        <div className="eyebrow">VOYNU COMMUTE</div>
        <h1>A fixed ride for your everyday route.</h1>
        <p>Set your route once, choose the days and plan that fit your routine, and travel with a dedicated commute schedule.</p>
      </div>
    </section>

    <div className="wrap content">
      <div className="stepper" aria-label="Commute subscription steps">
        {[
          ["1","Route"],
          ["2","Passengers"],
          ["3","Plan"],
          ["4","Review & Pay"]
        ].map(([n,label])=><div key={n} className={step===Number(n)?"stepItem active":step>Number(n)?"stepItem done":"stepItem"}>
          <span>{step>Number(n)?"✓":n}</span><b>{label}</b>
        </div>)}
      </div>

      {error&&<div className="error" role="alert">{error}</div>}
      {message&&<div className="success" role="status">{message}</div>}

      {step===1&&<section className="card">
        <div className="cardHead"><div><div className="stepKicker">STEP 1 OF 4</div><h2>Route & schedule</h2><p>Where should we pick you up, and when do you need the daily commute?</p></div><span className="stepBadge">1</span></div>
        <div className="locationGrid">
          <LocationPicker label="Pickup location" value={pickup?.name||""} placeholder="Home / pickup point" allowCurrentLocation onLocationSelect={setLoc(setPickup)}/>
          <LocationPicker label="Destination" value={drop?.name||""} placeholder="Office / school / college" onLocationSelect={setLoc(setDrop)}/>
        </div>
        <div className="distance">
          <div><b>Road distance</b><span>{distance?`${distance} km one-way`:"Select both locations, then calculate"}</span></div>
          <button type="button" onClick={calcDistance} disabled={busyDistance}>{busyDistance?"Calculating…":"Calculate distance"}</button>
        </div>
        <div className="two">
          <label>Morning pickup<input type="time" value={morning} onChange={e=>{setMorning(e.target.value);setHasCalculated(false);setQuote(null)}}/></label>
          <label>Evening return<input type="time" value={evening} onChange={e=>{setEvening(e.target.value);setHasCalculated(false);setQuote(null)}}/></label>
        </div>
        <label>Start date<input type="date" min={tomorrow} value={start} onChange={e=>{setStart(e.target.value);setHasCalculated(false);setQuote(null)}}/></label>
        <div className="label">Travel days <span className="labelHint">Choose every day you normally travel.</span>
          <div className="days">{DAYS.map(([n,x])=><button type="button" key={n} onClick={()=>toggleDay(n)} className={weekdays.includes(n)?"dayOn":"day"}>{x}</button>)}</div>
        </div>
        <div className="policyNote"><b>Flexible situations are handled separately.</b><span>Scheduled travel days remain chargeable if fewer passengers travel. Approved holidays and customer off-days can be handled separately.</span></div>
        <div className="actions"><span></span><button className="primary" type="button" onClick={nextStep}>Continue to passengers <span>→</span></button></div>
      </section>}

      {step===2&&<section className="card">
        <div className="cardHead"><div><div className="stepKicker">STEP 2 OF 4</div><h2>Passengers</h2><p>Tell us who will travel on this subscription. The selected passenger count determines vehicle eligibility.</p></div><span className="stepBadge">2</span></div>
        <div className="fieldBlock"><div className="fieldTitle">How many people?</div><div className="passengers">{[1,2,3,4,5,6,7].map(n=><button type="button" key={n} onClick={()=>{setPassengers(n);setHasCalculated(false);setQuote(null)}} className={passengers===n?"sel":"un"}>{n}<small>{n===1?"person":"people"}</small></button>)}</div></div>
        <div className="people"><div className="sectionIntro"><b>Passenger details</b><span>Each traveller needs a name, age and gender for the subscription record.</span></div>
          {people.map((p,i)=><div className="person" key={i}><div className="personTitle">Passenger {i+1}</div>
            <label>Name<input value={p.name} onChange={e=>updatePerson(i,"name",e.target.value)} placeholder="Full name" autoComplete="name"/></label>
            <div className="two"><label>Age<input type="number" min="1" max="120" value={p.age} onChange={e=>updatePerson(i,"age",e.target.value)} placeholder="Age"/></label>
            <label>Gender<select value={p.gender} onChange={e=>updatePerson(i,"gender",e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label></div>
          </div>)}
        </div>
        <div className="actions"><button className="secondary" type="button" onClick={previousStep}>← Back</button><button className="primary" type="button" onClick={nextStep}>Continue to plan <span>→</span></button></div>
      </section>}

      {step===3&&<section className="card">
        <div className="cardHead"><div><div className="stepKicker">STEP 3 OF 4</div><h2>Vehicle & subscription plan</h2><p>Choose the vehicle category and subscription duration. Longer plans can receive a configured discount.</p></div><span className="stepBadge">3</span></div>
        <label>Vehicle category<select value={vehicle} onChange={e=>{setVehicle(e.target.value);setHasCalculated(false);setQuote(null)}}><option value="">Select vehicle</option>{eligible.map(c=><option key={c.id} value={c.id}>{c.name} · up to {c.passenger_capacity} passengers</option>)}</select></label>
        <div className="summaryStrip"><span><b>{passengers}</b> {passengers===1?"passenger":"passengers"}</span><span>•</span><span>{distance||"—"} km each way</span><span>•</span><span>{dayNames||"No days selected"}</span></div>
        <div className="fieldTitle planTitle">Subscription period</div>
        <div className="plans">{plans.map(p=><button type="button" key={p.code} onClick={()=>{setPlan(p.code);setHasCalculated(false);setQuote(null)}} className={plan===p.code?"planOn":"plan"}><strong>{p.name}</strong><span>{Number(p.discount_percent||0)>0?`${p.discount_percent}% discount`:"Standard pricing"}</span>{Number(p.wallet_reward_amount||0)>0&&<span style={{color:theme.colors.primary,fontWeight:800}}>+ ₹{Number(p.wallet_reward_amount).toLocaleString("en-IN")} wallet reward</span>}<small>{p.duration_months===0?"7 days":`${p.duration_months} month${p.duration_months>1?"s":""}`}</small></button>)}</div>
        <div className="policyNote"><b>How billing works</b><span>Your scheduled days are billed even when only some of the subscribed passengers travel. Approved holidays and customer off-days are treated separately according to the service rules.</span></div>
        <div className="actions"><button className="secondary" type="button" onClick={previousStep}>← Back</button><button className="primary" type="button" onClick={nextStep} disabled={calculating}>{calculating?"Calculating…":"Continue to review & pay →"}</button></div>
      </section>}

      {step===4&&<section className="card">
        <div className="cardHead"><div><div className="stepKicker">STEP 4 OF 4</div><h2>Review & payment</h2><p>Check the commute details and total before opening your UPI app.</p></div><span className="stepBadge">4</span></div>
        <div className="reviewGrid">
          <div className="reviewItem"><span>Route</span><b>{pickup?.name||"—"}</b><small>to {drop?.name||"—"}</small></div>
          <div className="reviewItem"><span>Schedule</span><b>{morning} pickup · {evening} return</b><small>Starts {start||"—"} · {dayNames||"—"}</small></div>
          <div className="reviewItem"><span>Vehicle</span><b>{selectedVehicle?.name||"—"}</b><small>{passengers} {passengers===1?"passenger":"passengers"}</small></div>
          <div className="reviewItem"><span>Plan</span><b>{selectedPlan?.name||"—"}</b><small>{selectedPlan?.duration_months===0?"7 days":`${selectedPlan?.duration_months||0} month${Number(selectedPlan?.duration_months)>1?"s":""}`}</small></div>
        </div>
        {!quote&&<div className="recalculateBox"><b>Your price is ready to calculate.</b><span>We’ll use the route, passengers, travel days, vehicle and selected plan above.</span><button type="button" className="primary" onClick={quoteNow} disabled={calculating}>{calculating?"Calculating…":"Calculate subscription price"}</button></div>}
        {quote&&<div className="quote">
          <div><span>Daily round trip</span><b>₹{money(quote.dailyRoundTripFare)}</b></div>
          <div><span>Billable days</span><b>{quote.billableDays}</b></div>
          <div><span>Base amount</span><b>₹{money(quote.baseAmount)}</b></div>
          <div><span>Discount</span><b>- ₹{money(quote.discountAmount)}</b></div>
          <div className="total"><span>Total payable</span><b>₹{money(quote.totalAmount)}</b></div>
          <div className="upiFlow">
            {!upiPaymentConfirmed&&<a href={`upi://pay?pa=${encodeURIComponent(VOYNU_UPI_VPA)}&pn=${encodeURIComponent("VOYNU")}&am=${Number(quote.totalAmount)}&cu=INR&tn=${encodeURIComponent("VOYNU Commute Subscription")}`} className="upiPayButton" onClick={()=>setUpiPayClicked(true)}>Pay ₹{money(quote.totalAmount)} via UPI app</a>}
            {upiPayClicked&&!upiPaymentConfirmed&&<div className="upiConfirmRow"><p>Completed the payment in your UPI app?</p><div className="upiConfirmActions"><button type="button" className="upiConfirmYes" onClick={()=>setUpiPaymentConfirmed(true)}>Yes, I’ve paid</button><button type="button" className="upiConfirmRetry" onClick={()=>setUpiPayClicked(false)}>I didn’t pay yet</button></div></div>}
            {upiPaymentConfirmed&&<div className="upiConfirmedChip">✓ Payment marked as completed</div>}
          </div>
          <button className="primary submit" disabled={busy||calculating||!upiPaymentConfirmed} onClick={submit}>{busy?"Submitting…":session?"Request subscription":"Sign in to continue"}</button>
          {!upiPaymentConfirmed&&<p className="upiHint">Complete the UPI payment above, then confirm it to submit your subscription request.</p>}
        </div>}
        <div className="actions"><button className="secondary" type="button" onClick={previousStep}>← Back</button><span></span></div>
      </section>}
    </div>
    <style jsx>{`
      .page{min-height:100vh;background:${theme.colors.bg};color:${theme.colors.text}}
      .wrap{width:min(900px,calc(100% - 28px));margin:auto}
      .hero{background:${theme.colors.navy};color:#fff;border-bottom:3px solid ${theme.colors.accent};padding:30px 0}
      .eyebrow{font-size:10px;font-weight:900;letter-spacing:1.6px;color:${theme.colors.accentLight}}
      .hero h1{font-size:clamp(28px,5vw,44px);line-height:1.05;letter-spacing:-1.2px;margin:7px 0 10px}
      .hero p{font-size:13px;line-height:1.6;color:rgba(255,255,255,.76);max-width:720px;margin:0}
      .content{padding:20px 0 60px}
      .stepper{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px}
      .stepItem{display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:6px 8px;border:1px solid ${theme.colors.border};border-radius:12px;background:#fff;color:${theme.colors.textMuted};font-size:11px;font-weight:800}
      .stepItem span{width:23px;height:23px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${theme.colors.bg};font-size:10px}
      .stepItem.active{border-color:${theme.colors.primary};background:${theme.colors.primaryTint};color:${theme.colors.primaryDark}}
      .stepItem.active span,.stepItem.done span{background:${theme.colors.primary};color:#fff}
      .stepItem.done{color:${theme.colors.primaryDark}}
      .card{background:#fff;border:1px solid ${theme.colors.border};border-radius:18px;padding:22px;box-shadow:${theme.shadow.card}}
      .cardHead{display:flex;justify-content:space-between;gap:15px;margin-bottom:20px}
      .stepKicker{font-size:9px;letter-spacing:1.3px;font-weight:900;color:${theme.colors.primary}}
      h2{font-size:20px;margin:5px 0 5px;letter-spacing:-.3px}
      .cardHead p{margin:0;color:${theme.colors.textMuted};font-size:12px;line-height:1.5}
      .stepBadge{width:38px;height:38px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${theme.colors.primaryTint};color:${theme.colors.primaryDark};font-weight:900}
      .locationGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .distance{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:13px;border:1px solid ${theme.colors.border};border-radius:12px;background:${theme.colors.bg}}
      .distance div{display:flex;flex-direction:column;gap:3px;font-size:11px}.distance span{color:${theme.colors.textMuted}}
      .distance button,.secondary{border:1px solid ${theme.colors.borderStrong};background:#fff;color:${theme.colors.text};border-radius:10px;padding:10px 13px;font-weight:800;cursor:pointer}
      .distance button{border-color:${theme.colors.primary};color:${theme.colors.primaryDark};background:${theme.colors.primaryTint}}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      label,.label{display:block;font-size:11px;font-weight:800;margin:0 0 13px;color:${theme.colors.text}}
      input,select{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:11px 12px;border:1px solid ${theme.colors.borderStrong};border-radius:10px;background:#fff;color:${theme.colors.text};font-size:13px}
      input:focus,select:focus{outline:none;border-color:${theme.colors.primary};box-shadow:0 0 0 3px rgba(10,127,166,.10)}
      .labelHint{font-weight:600;color:${theme.colors.textFaint};margin-left:4px}
      .days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:7px}
      .day,.dayOn{padding:10px 2px;border-radius:9px;font-size:10px;font-weight:800;cursor:pointer}
      .day{border:1px solid ${theme.colors.border};background:${theme.colors.bg};color:${theme.colors.textMuted}}
      .dayOn{border:1px solid ${theme.colors.primary};background:${theme.colors.primaryTint};color:${theme.colors.primaryDark}}
      .policyNote{display:flex;flex-direction:column;gap:3px;margin:14px 0;padding:12px;border-radius:11px;background:${theme.colors.bg};color:${theme.colors.textMuted};font-size:10.5px;line-height:1.5}
      .policyNote b{color:${theme.colors.text}}
      .fieldBlock{margin-bottom:15px}.fieldTitle{font-size:11px;font-weight:800;margin-bottom:8px}
      .passengers{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px}
      .sel,.un{padding:11px 2px;border-radius:9px;font-size:14px;font-weight:900;cursor:pointer}
      .sel{border:1px solid ${theme.colors.primary};background:${theme.gradients.primary};color:#fff}.un{border:1px solid ${theme.colors.border};background:${theme.colors.bg};color:${theme.colors.text}}
      small{display:block;font-size:8px;font-weight:700}.sectionIntro{margin:0 0 10px;padding:10px 11px;border-radius:10px;background:${theme.colors.primaryTint};color:${theme.colors.primaryDark}}
      .sectionIntro b,.sectionIntro span{display:block}.sectionIntro b{font-size:12px}.sectionIntro span{font-size:9.5px;margin-top:3px;font-weight:600}
      .person{border:1px solid ${theme.colors.border};border-radius:11px;padding:12px;margin-bottom:9px;background:#fff}.personTitle{font-size:11px;font-weight:900;color:${theme.colors.primaryDark};margin-bottom:9px}
      .plans{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:9px 0 14px}
      .plan,.planOn{text-align:left;padding:13px;border-radius:11px;cursor:pointer}.plan{border:1px solid ${theme.colors.border};background:${theme.colors.bg};color:${theme.colors.text}}.planOn{border:1px solid ${theme.colors.primary};background:${theme.colors.primaryTint};color:${theme.colors.primaryDark}}
      .plans span,.plans small{display:block;margin-top:5px;font-size:9px;color:${theme.colors.textMuted}}
      .summaryStrip{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:14px 0;padding:10px 12px;border-radius:10px;background:${theme.colors.bg};color:${theme.colors.textMuted};font-size:10px}.summaryStrip b{color:${theme.colors.text}}
      .actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:20px}.primary{border:0;border-radius:11px;background:${theme.gradients.primary};color:#fff;padding:12px 16px;font-weight:900;cursor:pointer}.primary:disabled{opacity:.65;cursor:wait}
      .error,.success{margin-bottom:14px;padding:11px 12px;border-radius:10px;font-size:11px;line-height:1.45}.error{background:${theme.colors.errorBg};color:${theme.colors.error}}.success{background:${theme.colors.successBg};color:${theme.colors.success}}
      .reviewGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:15px}.reviewItem{padding:12px;border:1px solid ${theme.colors.border};border-radius:11px;background:${theme.colors.bg}}.reviewItem span,.reviewItem small{display:block;color:${theme.colors.textMuted};font-size:9px}.reviewItem b{display:block;margin:4px 0;font-size:11px}
      .recalculateBox{display:flex;flex-direction:column;gap:5px;padding:14px;border:1px dashed ${theme.colors.borderStrong};border-radius:12px;background:${theme.colors.bg};font-size:11px;color:${theme.colors.textMuted}}.recalculateBox b{color:${theme.colors.text}}
      .quote{margin-top:14px;padding:14px;border-radius:12px;background:${theme.colors.bg}}.quote>div{display:flex;justify-content:space-between;padding:6px 0;font-size:11px}.quote .total{border-top:1px solid ${theme.colors.border};margin-top:5px;padding-top:10px;font-size:15px}
      .upiFlow{margin-top:12px}.upiPayButton{min-height:50px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:${theme.colors.primary};color:#fff;text-decoration:none;font-weight:800;font-size:12.5px}
      .upiConfirmRow{margin-top:10px;padding:12px;border:1px solid ${theme.colors.border};border-radius:12px;background:#fff}.upiConfirmRow p{margin:0 0 10px;font-weight:800;font-size:12px}.upiConfirmActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.upiConfirmYes,.upiConfirmRetry{min-height:42px;border-radius:10px;font-weight:800;cursor:pointer;font-size:11.5px}.upiConfirmYes{border:1px solid ${theme.colors.primary};background:${theme.colors.primary};color:#fff}.upiConfirmRetry{border:1px solid ${theme.colors.borderStrong};background:#fff;color:${theme.colors.text}}
      .upiConfirmedChip{margin-top:10px;padding:11px;border-radius:11px;background:${theme.colors.successBg};color:${theme.colors.success};font-weight:800;font-size:12px;text-align:center}.upiHint{margin:8px 2px 0;color:${theme.colors.textFaint};font-size:10.5px;line-height:1.5;text-align:center}.submit{margin-top:12px;width:100%}
      @media(max-width:720px){.wrap{width:calc(100% - 20px)}.hero{padding:24px 0}.content{padding-top:12px}.stepper{gap:4px}.stepItem{min-height:40px;padding:5px 3px;gap:4px;font-size:9px}.stepItem span{width:21px;height:21px;font-size:9px}.card{padding:16px;border-radius:15px}.cardHead{margin-bottom:16px}.cardHead p{font-size:11px}.stepBadge{width:34px;height:34px;flex-basis:34px}.locationGrid,.reviewGrid{grid-template-columns:1fr}.two{grid-template-columns:1fr;gap:0}.plans{grid-template-columns:1fr 1fr}.passengers{grid-template-columns:repeat(4,1fr)}.days{gap:4px}.day,.dayOn{padding:9px 1px}.distance{align-items:stretch;flex-direction:column}.distance button{width:100%}.actions .primary{flex:1}.actions .secondary{flex:0 0 auto}.hero h1{font-size:30px}}
      @media(max-width:420px){.stepItem b{display:none}.stepItem{justify-content:center}.plans{grid-template-columns:1fr}.cardHead h2{font-size:18px}.hero h1{font-size:27px}.hero p{font-size:11px}}
    `}</style>
  </main></>;
}
