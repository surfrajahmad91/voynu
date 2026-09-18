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
  {code:"weekly",name:"Weekly",duration_months:0,discount_percent:0},
  {code:"monthly",name:"Monthly",duration_months:1,discount_percent:5},
  {code:"quarterly",name:"Quarterly",duration_months:3,discount_percent:10},
  {code:"half_yearly",name:"Half-Yearly",duration_months:6,discount_percent:15}
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
      supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,sort_order,active").eq("active",true).order("sort_order")
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
        <div className="plans">{plans.map(p=><button type="button" key={p.code} onClick={()=>{setPlan(p.code);setHasCalculated(false);setQuote(null)}} className={plan===p.code?"planOn":"plan"}><strong>{p.name}</strong><span>{Number(p.discount_percent||0)>0?`${p.discount_percent}% discount`:"Standard pricing"}</span><small>{p.duration_months===0?"7 days":`${p.duration_months} month${p.duration_months>1?"s":""}`}</small></button>)}</div>
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
  </main></>;
}
