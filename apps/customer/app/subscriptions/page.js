"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../shared/components/PageHeader";
import LocationPicker from "../../components/LocationPicker";
import { supabase } from "../../../../shared/lib/supabaseClient";
import WalletCheckoutCard from "../../components/WalletCheckoutCard";

const DAYS = [[1, "M", "Mon"], [2, "T", "Tue"], [3, "W", "Wed"], [4, "T", "Thu"], [5, "F", "Fri"], [6, "S", "Sat"], [7, "S", "Sun"]];
const STEPS = ["Route", "Riders", "Plan", "Review"];
const FALLBACK = [
  { code: "weekly", name: "Weekly", duration_months: 0, discount_percent: 0, wallet_reward_amount: 0 },
  { code: "monthly", name: "Monthly", duration_months: 1, discount_percent: 5, wallet_reward_amount: 0 },
  { code: "quarterly", name: "Quarterly", duration_months: 3, discount_percent: 10, wallet_reward_amount: 0 },
  { code: "half_yearly", name: "Half-Yearly", duration_months: 6, discount_percent: 15, wallet_reward_amount: 0 },
];
const emptyPerson = () => ({ name: "", age: "", gender: "" });
const money = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const periodText = (p) => (Number(p?.duration_months) === 0 ? "7 days" : `${p?.duration_months || 0} month${Number(p?.duration_months) > 1 ? "s" : ""}`);

export default function CommuteSubscriptionPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState(FALLBACK);
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [distance, setDistance] = useState("");
  const [busyDistance, setBusyDistance] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [people, setPeople] = useState([emptyPerson()]);
  const [vehicle, setVehicle] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [morning, setMorning] = useState("08:00");
  const [evening, setEvening] = useState("18:00");
  const [start, setStart] = useState("");
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [walletApplied, setWalletApplied] = useState(0);
  const [step, setStep] = useState(1);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));
    const { data: l } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => l?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    setStart((v) => v || tomorrow);
    Promise.all([
      supabase.from("vehicle_categories").select("id,name,passenger_capacity,active,bookable,sort_order").eq("active", true).eq("bookable", true).order("sort_order"),
      supabase.from("subscription_plans").select("id,code,name,duration_months,discount_percent,wallet_reward_amount,sort_order,active").eq("active", true).order("sort_order"),
    ]).then(([c, p]) => {
      if (!c.error) setCategories(c.data || []);
      if (!p.error && p.data?.length) setPlans(p.data);
    });
  }, [tomorrow]);

  const eligible = useMemo(() => categories.filter((c) => Number(c.passenger_capacity) >= passengers), [categories, passengers]);

  useEffect(() => {
    if (!eligible.some((c) => c.id === vehicle)) setVehicle(eligible[0]?.id || "");
  }, [eligible, vehicle]);

  useEffect(() => {
    setPeople((old) => Array.from({ length: passengers }, (_, i) => old[i] || emptyPerson()));
  }, [passengers]);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const invalidate = () => setQuote(null);
  const setLoc = (setter) => (x) => { setter(x && x.name ? x : null); setDistance(""); invalidate(); };
  const clearFeedback = () => setError("");

  const calcDistance = async () => {
    clearFeedback();
    if (!pickup || !drop) return setError("Select both pickup and destination from the suggestions or the map.");
    if (Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(drop.lat)) &&
        Math.abs(Number(pickup.lat) - Number(drop.lat)) < 0.00001 && Math.abs(Number(pickup.lon) - Number(drop.lon)) < 0.00001) {
      return setError("Pickup and destination cannot be the same.");
    }
    setBusyDistance(true);
    try {
      const r = await fetch("/api/route-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: Number(pickup.lat), lon: Number(pickup.lon) },
          destination: { lat: Number(drop.lat), lon: Number(drop.lon) },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d?.error || "Unable to calculate road distance.");
      const km = Number(d?.distanceKm ?? Number(d?.distanceMeters) / 1000);
      if (!Number.isFinite(km) || km <= 0) throw Error("No valid road distance returned.");
      setDistance(km.toFixed(1));
      invalidate();
      return km.toFixed(1);
    } catch (e) {
      setError(e.message || "Distance calculation failed");
      return null;
    } finally {
      setBusyDistance(false);
    }
  };

  // Calculate the road distance as soon as both places are chosen.
  useEffect(() => {
    if (pickup && drop && !distance && !busyDistance) calcDistance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, drop]);

  const validateRoute = () => {
    if (!pickup?.name || !Number.isFinite(Number(pickup.lat)) || !Number.isFinite(Number(pickup.lon))) return "Please select a valid pickup location.";
    if (!drop?.name || !Number.isFinite(Number(drop.lat)) || !Number.isFinite(Number(drop.lon))) return "Please select a valid destination.";
    if (!distance) return "Please wait for the road distance to be calculated.";
    if (!morning || !evening) return "Please select both morning pickup and evening return times.";
    if (morning >= evening) return "Evening return time must be later than morning pickup time.";
    if (!start) return "Please select a start date.";
    if (!weekdays.length) return "Select at least one travel day.";
    return "";
  };

  const validatePassengers = () => {
    if (!vehicle) return "Please select a vehicle category.";
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      if (String(p.name).trim().length < 2) return `Enter the name for Passenger ${i + 1}.`;
      if (!p.age || Number(p.age) < 1 || Number(p.age) > 120) return `Enter a valid age for Passenger ${i + 1}.`;
      if (!p.gender) return `Select the gender for Passenger ${i + 1}.`;
    }
    return "";
  };

  const quoteNow = async () => {
    const routeError = validateRoute();
    if (routeError) { setError(routeError); return false; }
    if (!vehicle) { setError("Please select a vehicle category."); return false; }
    clearFeedback();
    if (!session?.access_token) { setError("Please sign in again before calculating the subscription price."); return false; }
    setCalculating(true);
    try {
      const r = await fetch("/api/subscriptions/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ planCode: plan, vehicleCategoryId: vehicle, pickup, drop, startDate: start, passengerCount: passengers, weekdays }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d?.error || "Unable to calculate subscription price.");
      const authoritativeKm = Number(d?.authoritativeDistance?.distanceKm);
      if (!Number.isFinite(authoritativeKm) || authoritativeKm <= 0) throw Error("Unable to verify the authoritative road distance.");
      setDistance(authoritativeKm.toFixed(1));
      if (!d?.quote) throw Error("No subscription quote was returned.");
      setQuote(d.quote);
    } catch (e) {
      setError(e.message || "Unable to calculate subscription price.");
      return false;
    } finally {
      setCalculating(false);
    }
    return true;
  };

  const updatePerson = (index, key, value) => {
    setPeople((old) => old.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
    invalidate();
  };

  const toggleDay = (n) => {
    setWeekdays((w) => (w.includes(n) ? w.filter((v) => v !== n) : [...w, n].sort()));
    invalidate();
  };

  const nextStep = async () => {
    clearFeedback();
    if (step === 1) { const e = validateRoute(); if (e) return setError(e); setStep(2); return; }
    if (step === 2) { const e = validatePassengers(); if (e) return setError(e); setStep(3); return; }
    if (step === 3) { const ok = await quoteNow(); if (ok) setStep(4); }
  };

  const previousStep = () => { clearFeedback(); setStep((s) => Math.max(1, s - 1)); };

  const submit = async () => {
    if (!session) return router.push("/login?next=/subscriptions");
    const routeError = validateRoute();
    if (routeError) return setError(routeError);
    const peopleError = validatePassengers();
    if (peopleError) return setError(peopleError);
    if (!quote) { const ok = await quoteNow(); if (!ok) return; }
    if (!session?.access_token) return setError("Please sign in again before submitting the subscription.");
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          planCode: plan,
          vehicleCategoryId: vehicle,
          pickup,
          drop,
          passengerCount: passengers,
          morningPickupTime: morning,
          eveningReturnTime: evening,
          startDate: start,
          weekdays,
          passengers: people.map((p) => ({ name: String(p.name).trim(), age: Number(p.age), gender: p.gender })),
          walletRequestedAmount: Number(walletApplied || 0),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d?.error || "Unable to submit subscription request.");
      const subscription = d?.subscription;
      if (!subscription?.id) throw Error("Subscription was not created.");
      try {
        sessionStorage.setItem("voynu_confirmed_subscription", JSON.stringify({
          id: subscription.id,
          planName: plans.find((p) => p.code === plan)?.name || plan,
          pickupName: pickup.name,
          dropName: drop.name,
          distance: Number(d?.authoritativeDistance?.distanceKm || distance).toFixed(1),
          morning, evening, start, weekdays, passengers, vehicle, quote,
          walletUsed: Number(subscription.wallet_used || 0),
          payableAmount: Math.max(0, Number(subscription.total_amount || 0)),
          billableDays: Number(subscription.billable_days || quote?.billableDays || 0),
          confirmedAt: new Date().toISOString(),
        }));
      } catch (storageError) {
        console.error("VOYNU: unable to store confirmed subscription:", storageError);
      }
      router.push("/subscriptions/confirmed");
    } catch (e) {
      setError(e.message || "Unable to submit subscription request.");
    } finally {
      setBusy(false);
    }
  };

  const selectedPlan = plans.find((p) => p.code === plan);
  const selectedVehicle = categories.find((c) => c.id === vehicle);
  const payable = Math.max(0, Number(quote?.totalAmount || 0) - Number(walletApplied || 0));
  const perDay = quote?.billableDays > 0 ? Math.round(payable / Number(quote.billableDays)) : 0;
  const dayNames = weekdays.map((n) => DAYS.find((d) => d[0] === n)?.[2]).filter(Boolean).join(", ");

  const primaryLabel = step === 1 ? "Continue" : step === 2 ? "Choose plan" : step === 3 ? (calculating ? "Calculating…" : "See price") : busy ? "Sending…" : session ? "Send request" : "Sign in to continue";
  const primaryAction = step === 4 ? submit : nextStep;
  const primaryDisabled = busy || calculating || (step === 1 && busyDistance) || (step === 4 && !quote);

  return (
    <>
      <PageHeader />
      <main className="page">
        <section className="hero">
          <div className="wrap">
            <span className="eyebrow">VOYNU COMMUTE</span>
            <h1>Your daily ride, fixed.</h1>
            <p>Same route, same time, same driver. Pay at pickup — no advance.</p>
          </div>
        </section>

        <div className="wrap body">
          <nav className="progress" aria-label={`Step ${step} of 4`}>
            <div className="bar"><span style={{ width: `${(step / 4) * 100}%` }} /></div>
            <ol>
              {STEPS.map((label, i) => (
                <li key={label} className={step === i + 1 ? "on" : step > i + 1 ? "done" : ""} aria-current={step === i + 1 ? "step" : undefined}>
                  <b>{step > i + 1 ? "✓" : i + 1}</b><span>{label}</span>
                </li>
              ))}
            </ol>
          </nav>

          {error && <div className="alert" role="alert">{error}</div>}

          {step === 1 && (
            <section className="card">
              <h2>Where and when?</h2>
              <p className="sub">Tell us your daily route and timing.</p>
              <LocationPicker label="Pickup location" value={pickup?.name || ""} placeholder="Home / pickup point" allowCurrentLocation onLocationSelect={setLoc(setPickup)} />
              <LocationPicker label="Destination" value={drop?.name || ""} placeholder="Office / school / college" onLocationSelect={setLoc(setDrop)} />
              <div className="distance" aria-live="polite">
                <div>
                  <small>Road distance</small>
                  <b>{busyDistance ? "Calculating…" : distance ? `${distance} km one way` : "Choose both places"}</b>
                </div>
                {pickup && drop && !busyDistance && <button type="button" className="ghost" onClick={calcDistance}>Recalculate</button>}
              </div>
              <div className="two">
                <label>Morning pickup<input type="time" value={morning} onChange={(e) => { setMorning(e.target.value); invalidate(); }} /></label>
                <label>Evening return<input type="time" value={evening} onChange={(e) => { setEvening(e.target.value); invalidate(); }} /></label>
              </div>
              <label>Start date<input type="date" min={tomorrow} value={start} onChange={(e) => { setStart(e.target.value); invalidate(); }} /></label>
              <div className="field">
                <span className="fieldLabel">Travel days</span>
                <div className="days" role="group" aria-label="Travel days">
                  {DAYS.map(([n, short, full]) => (
                    <button type="button" key={n} aria-pressed={weekdays.includes(n)} aria-label={full} className={weekdays.includes(n) ? "day on" : "day"} onClick={() => toggleDay(n)}>{short}</button>
                  ))}
                </div>
                <small className="hint">{dayNames || "Pick at least one day"}</small>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="card">
              <h2>Who is riding?</h2>
              <p className="sub">Each rider needs a name, age and gender for the subscription record.</p>
              <div className="stepper" role="group" aria-label="Number of passengers">
                <button type="button" aria-label="Fewer passengers" disabled={passengers <= 1} onClick={() => { setPassengers((n) => Math.max(1, n - 1)); invalidate(); }}>−</button>
                <div><b>{passengers}</b><small>{passengers === 1 ? "passenger" : "passengers"}</small></div>
                <button type="button" aria-label="More passengers" disabled={passengers >= 7} onClick={() => { setPassengers((n) => Math.min(7, n + 1)); invalidate(); }}>+</button>
              </div>
              {people.map((p, i) => (
                <div className="person" key={i}>
                  <div className="personTitle">Passenger {i + 1}</div>
                  <label>Name<input value={p.name} onChange={(e) => updatePerson(i, "name", e.target.value)} placeholder="Full name" autoComplete="name" /></label>
                  <div className="two">
                    <label>Age<input type="number" inputMode="numeric" min="1" max="120" value={p.age} onChange={(e) => updatePerson(i, "age", e.target.value)} placeholder="Age" /></label>
                    <label>Gender
                      <select value={p.gender} onChange={(e) => updatePerson(i, "gender", e.target.value)}>
                        <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </section>
          )}

          {step === 3 && (
            <section className="card">
              <h2>Vehicle and plan</h2>
              <p className="sub">{passengers} {passengers === 1 ? "passenger" : "passengers"} · {distance || "—"} km each way · {dayNames || "no days"}</p>
              <span className="fieldLabel">Vehicle</span>
              <div className="choices" role="radiogroup" aria-label="Vehicle category">
                {eligible.length === 0 && <div className="empty">No vehicle fits {passengers} passengers yet. Reduce the passenger count.</div>}
                {eligible.map((c) => (
                  <button type="button" key={c.id} role="radio" aria-checked={vehicle === c.id} className={vehicle === c.id ? "choice on" : "choice"} onClick={() => { setVehicle(c.id); invalidate(); }}>
                    <span className="radio" aria-hidden="true" />
                    <span><b>{c.name}</b><small>Up to {c.passenger_capacity} passengers</small></span>
                  </button>
                ))}
              </div>
              <span className="fieldLabel plansLabel">Plan length</span>
              <div className="plans" role="radiogroup" aria-label="Subscription plan">
                {plans.map((p) => (
                  <button type="button" key={p.code} role="radio" aria-checked={plan === p.code} className={plan === p.code ? "plan on" : "plan"} onClick={() => { setPlan(p.code); invalidate(); }}>
                    <b>{p.name}</b>
                    <small>{periodText(p)}</small>
                    <em>{Number(p.discount_percent || 0) > 0 ? `${p.discount_percent}% off` : "Standard price"}</em>
                    {Number(p.wallet_reward_amount || 0) > 0 && <i>+ ₹{money(p.wallet_reward_amount)} wallet reward</i>}
                  </button>
                ))}
              </div>
              <p className="note">Scheduled days are billed even when fewer riders travel. Off-days can be paused up to 4 hours before pickup.</p>
            </section>
          )}

          {step === 4 && (
            <>
              <section className="card">
                <h2>Review your commute</h2>
                <div className="route">
                  <div><i className="dot a" /><span>{pickup?.name || "—"}</span></div>
                  <div className="line" />
                  <div><i className="dot b" /><span>{drop?.name || "—"}</span></div>
                </div>
                <dl className="facts">
                  <div><dt>Schedule</dt><dd>{morning} pickup · {evening} return</dd></div>
                  <div><dt>Starts</dt><dd>{start || "—"}</dd></div>
                  <div><dt>Days</dt><dd>{dayNames || "—"}</dd></div>
                  <div><dt>Vehicle</dt><dd>{selectedVehicle?.name || "—"}</dd></div>
                  <div><dt>Plan</dt><dd>{selectedPlan?.name || "—"} · {periodText(selectedPlan)}</dd></div>
                  <div><dt>Riders</dt><dd>{passengers}</dd></div>
                </dl>
              </section>

              {!quote ? (
                <section className="card center">
                  <p className="sub">Your price needs to be calculated again.</p>
                  <button type="button" className="ghost wide" onClick={quoteNow} disabled={calculating}>{calculating ? "Calculating…" : "Calculate price"}</button>
                </section>
              ) : (
                <>
                  <section className="card">
                    <h2>Price</h2>
                    <div className="rows">
                      <div><span>Daily round trip</span><b>₹{money(quote.dailyRoundTripFare)}</b></div>
                      <div><span>Billable days</span><b>{quote.billableDays}</b></div>
                      <div><span>Base amount</span><b>₹{money(quote.baseAmount)}</b></div>
                      {Number(quote.discountAmount) > 0 && <div className="good"><span>Plan discount</span><b>− ₹{money(quote.discountAmount)}</b></div>}
                    </div>
                    <WalletCheckoutCard bookingAmount={quote.totalAmount} onAmountChange={setWalletApplied} disabled={busy} />
                    <div className="total"><span>Total for the plan</span><b>₹{money(payable)}</b></div>
                  </section>

                  <section className="card pay">
                    <span className="payTag">PAY AT PICKUP</span>
                    <h2>Nothing to pay today</h2>
                    <p className="sub">On each trip day you pay your driver at least that day&apos;s fare{perDay > 0 ? <> — about <b>₹{money(perDay)}</b></> : null}.</p>
                    <ul className="how">
                      <li><b>Cash</b> up to that day&apos;s amount, handed to your driver.</li>
                      <li><b>UPI</b> to VOYNU for that day or more. Your driver checks the transaction reference on the spot.</li>
                      <li>You get a notification for every payment recorded.</li>
                    </ul>
                  </section>
                </>
              )}
            </>
          )}
        </div>

        <div className="dock">
          <div className="dockIn">
            {step > 1 && <button type="button" className="back" onClick={previousStep} disabled={busy} aria-label="Back">←</button>}
            <div className="dockInfo">
              {step === 4 && quote ? (<><small>Total</small><b>₹{money(payable)}</b></>) : (<><small>Step {step} of 4</small><b>{STEPS[step - 1]}</b></>)}
            </div>
            <button type="button" className="cta" onClick={primaryAction} disabled={primaryDisabled}>{primaryLabel}</button>
          </div>
        </div>

        <style jsx>{`
          .page{min-height:100vh;background:var(--voynu-bg,#F7F9FC);color:var(--voynu-text,#1E3348);padding-bottom:calc(112px + env(safe-area-inset-bottom))}
          .wrap{width:min(680px,calc(100% - 28px));margin:0 auto}
          .hero{background:var(--voynu-navy,#0A2337);color:#fff;padding:26px 0 30px;border-bottom:3px solid var(--voynu-accent,#F5813F)}
          .eyebrow{font-size:12px;font-weight:700;letter-spacing:1.4px;color:var(--voynu-accent-light,#FFB25C)}
          .hero h1{margin:6px 0 6px;font-size:clamp(28px,7vw,38px);line-height:1.1;letter-spacing:-.8px;font-weight:700}
          .hero p{margin:0;font-size:15px;line-height:1.5;color:rgba(255,255,255,.8)}
          .body{padding-top:18px}
          .progress{margin-bottom:16px}
          .bar{height:6px;border-radius:99px;background:var(--voynu-border-strong,#D8DEE8);overflow:hidden}
          .bar span{display:block;height:100%;border-radius:99px;background:var(--voynu-gradient,linear-gradient(90deg,#12A0C6,#0A7FA6));transition:width .25s ease}
          .progress ol{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
          .progress li{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}
          .progress li b{width:24px;height:24px;flex:0 0 24px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--voynu-mist,#EEF3F7);font-size:12px}
          .progress li.on{color:var(--voynu-teal-deep,#00456B)}.progress li.on b,.progress li.done b{background:var(--voynu-teal,#0A7FA6);color:#fff}.progress li.done{color:var(--voynu-teal-deep,#00456B)}
          .alert{margin:0 0 14px;padding:13px 14px;border-radius:14px;background:#FFF1F2;color:#B42318;font-size:14px;line-height:1.45;font-weight:500;border:1px solid #FECDD3}
          .card{background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7);border-radius:20px;padding:20px 18px;margin-bottom:14px;box-shadow:var(--voynu-shadow,0 12px 30px rgba(10,35,55,.07))}
          .card.center{text-align:center}
          h2{margin:0 0 4px;font-size:20px;line-height:1.25;letter-spacing:-.3px;font-weight:700;color:var(--voynu-navy,#0A2337)}
          .sub{margin:0 0 16px;font-size:14px;line-height:1.55;color:var(--voynu-muted,#5B6B7C)}
          label,.fieldLabel{display:block;margin:0 0 14px;font-size:13px;font-weight:600;color:var(--voynu-navy,#0A2337)}
          .fieldLabel{margin-bottom:8px}.plansLabel{margin-top:18px}
          input,select{display:block;width:100%;height:50px;margin-top:6px;padding:0 14px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);border-radius:14px;background:var(--voynu-surface,#fff);color:var(--voynu-text,#1E3348);font-size:16px;font-weight:500}
          input[type=time],input[type=date]{min-height:50px}
          .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .distance{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 16px;padding:12px 14px;border-radius:14px;background:var(--voynu-primary-tint,#E7F4F8)}
          .distance small{display:block;font-size:12px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}.distance b{font-size:15px;color:var(--voynu-teal-deep,#00456B)}
          .ghost{min-height:44px;padding:0 14px;border:1.5px solid var(--voynu-teal,#0A7FA6);border-radius:12px;background:transparent;color:var(--voynu-teal-deep,#00456B);font-size:14px;font-weight:600}.ghost.wide{width:100%}
          .days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
          .day{min-height:46px;border-radius:14px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:var(--voynu-surface,#fff);color:var(--voynu-muted,#5B6B7C);font-size:15px;font-weight:700}
          .day.on{border-color:var(--voynu-teal,#0A7FA6);background:var(--voynu-teal,#0A7FA6);color:#fff}
          .hint{display:block;margin-top:8px;font-size:12.5px;color:var(--voynu-muted,#5B6B7C)}
          .stepper{display:flex;align-items:center;justify-content:center;gap:22px;margin:4px 0 18px}
          .stepper button{width:52px;height:52px;border-radius:50%;border:1.5px solid var(--voynu-teal,#0A7FA6);background:var(--voynu-primary-tint,#E7F4F8);color:var(--voynu-teal-deep,#00456B);font-size:26px;font-weight:600;line-height:1}
          .stepper button:disabled{opacity:.4}
          .stepper div{min-width:84px;text-align:center}.stepper b{display:block;font-size:34px;line-height:1;color:var(--voynu-navy,#0A2337)}.stepper small{font-size:12.5px;color:var(--voynu-muted,#5B6B7C)}
          .person{border:1px solid var(--voynu-border,#EEF3F7);border-radius:16px;padding:14px;margin-bottom:12px;background:var(--voynu-bg,#F7F9FC)}
          .person input,.person select{background:var(--voynu-surface,#fff)}
          .personTitle{margin-bottom:10px;font-size:13px;font-weight:700;color:var(--voynu-teal-deep,#00456B)}
          .choices{display:grid;gap:10px}
          .choice{display:flex;align-items:center;gap:12px;width:100%;min-height:62px;padding:12px 14px;text-align:left;border-radius:16px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:var(--voynu-surface,#fff);color:var(--voynu-text,#1E3348)}
          .choice b{display:block;font-size:15px}.choice small{display:block;margin-top:2px;font-size:12.5px;color:var(--voynu-muted,#5B6B7C)}
          .radio{width:22px;height:22px;flex:0 0 22px;border-radius:50%;border:2px solid var(--voynu-border-strong,#D8DEE8);background:#fff}
          .choice.on{border-color:var(--voynu-teal,#0A7FA6);background:var(--voynu-primary-tint,#E7F4F8)}
          .choice.on .radio{border-color:var(--voynu-teal,#0A7FA6);background:radial-gradient(circle,var(--voynu-teal,#0A7FA6) 0 5px,#fff 6px)}
          .plans{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .plan{display:flex;flex-direction:column;gap:3px;min-height:104px;padding:14px;text-align:left;border-radius:16px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:var(--voynu-surface,#fff);color:var(--voynu-text,#1E3348)}
          .plan b{font-size:15px}.plan small{font-size:12.5px;color:var(--voynu-muted,#5B6B7C)}
          .plan em{margin-top:auto;font-style:normal;font-size:13px;font-weight:700;color:var(--voynu-accent-deep,#D4552A)}.plan i{font-style:normal;font-size:12px;font-weight:600;color:var(--voynu-teal-deep,#00456B)}
          .plan.on{border-color:var(--voynu-teal,#0A7FA6);background:var(--voynu-primary-tint,#E7F4F8);box-shadow:0 0 0 3px rgba(10,127,166,.12)}
          .note{margin:16px 0 0;font-size:12.5px;line-height:1.55;color:var(--voynu-muted,#5B6B7C)}
          .empty{padding:14px;border-radius:14px;background:#FFF7E6;color:#8A5A00;font-size:14px}
          .route{margin:10px 0 14px}.route>div{display:flex;gap:12px;align-items:flex-start;font-size:15px;font-weight:600;line-height:1.4}
          .dot{width:12px;height:12px;flex:0 0 12px;margin-top:5px;border-radius:50%}.dot.a{background:var(--voynu-teal,#0A7FA6)}.dot.b{background:var(--voynu-accent,#F5813F)}
          .line{width:2px;height:16px;margin:3px 0 3px 5px;background:var(--voynu-border-strong,#D8DEE8)}
          .facts{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px;margin:0;padding-top:14px;border-top:1px dashed var(--voynu-border-strong,#D8DEE8)}
          .facts dt{font-size:12px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}.facts dd{margin:3px 0 0;font-size:14px;font-weight:600}
          .rows>div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;font-size:14.5px;color:var(--voynu-muted,#5B6B7C)}.rows b{color:var(--voynu-text,#1E3348);font-variant-numeric:tabular-nums}
          .rows .good b,.rows .good span{color:#15803D}
          .total{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:14px;border-top:1px solid var(--voynu-border-strong,#D8DEE8);font-size:15px;font-weight:600}.total b{font-size:24px;color:var(--voynu-navy,#0A2337);font-variant-numeric:tabular-nums}
          .pay{background:linear-gradient(180deg,#FFF8F1,#fff);border-color:#FFD9BD}
          .payTag{display:inline-block;margin-bottom:8px;padding:4px 10px;border-radius:99px;background:var(--voynu-accent,#F5813F);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.8px}
          .how{margin:0;padding:0;list-style:none;display:grid;gap:10px}.how li{display:block;font-size:14px;line-height:1.5;color:var(--voynu-text,#1E3348);padding-left:16px;position:relative}
          .how li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--voynu-accent,#F5813F)}
          .dock{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-top:1px solid var(--voynu-border-strong,#D8DEE8);padding:10px 0 calc(10px + env(safe-area-inset-bottom))}
          .dockIn{width:min(680px,calc(100% - 28px));margin:0 auto;display:flex;align-items:center;gap:12px}
          .back{width:52px;height:52px;flex:0 0 52px;border-radius:16px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:#fff;color:var(--voynu-navy,#0A2337);font-size:22px;font-weight:600}
          .dockInfo{flex:1;min-width:0}.dockInfo small{display:block;font-size:12px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}.dockInfo b{display:block;font-size:17px;color:var(--voynu-navy,#0A2337);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
          .cta{min-width:148px;height:52px;padding:0 22px;border:0;border-radius:16px;background:var(--voynu-gradient,linear-gradient(135deg,#12A0C6,#0A7FA6));color:#fff;font-size:16px;font-weight:700;box-shadow:0 10px 24px rgba(10,127,166,.22)}
          .cta:disabled{opacity:.55;box-shadow:none}
          button:focus-visible{outline:3px solid rgba(10,127,166,.35);outline-offset:2px}
          @media(max-width:380px){.cta{min-width:118px;padding:0 14px}.dockInfo b{font-size:15px}  .progress li span{display:none}.progress ol{grid-template-columns:repeat(4,auto);justify-content:space-between}}
          @media(prefers-reduced-motion:reduce){.bar span{transition:none}}
        `}</style>
      </main>
    </>
  );
}
