"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../../shared/components/PageHeader";

const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
const money = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const reference = (id) => (id ? `VOY-SUB-${String(id).slice(0, 8).toUpperCase()}` : "—");

export default function SubscriptionConfirmedPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("voynu_confirmed_subscription");
      if (raw) setSubscription(JSON.parse(raw));
    } catch (error) {
      console.error("VOYNU: unable to read confirmed subscription:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && !subscription) router.replace("/subscriptions");
  }, [loaded, subscription, router]);

  if (loaded && !subscription) return null;
  if (!loaded || !subscription) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--voynu-bg,#F7F9FC)" }}>
        <div style={{ width: 34, height: 34, border: "3px solid rgba(10,127,166,0.18)", borderTopColor: "#0A7FA6", borderRadius: "50%" }} />
      </main>
    );
  }

  const quote = subscription.quote || {};
  const days = (subscription.weekdays || []).map((d) => DAY_LABELS[d] || d).join(", ");
  const payable = Number(subscription.payableAmount ?? quote.totalAmount ?? 0);
  const billable = Number(subscription.billableDays || quote.billableDays || 0);
  const perDay = billable > 0 ? Math.round(payable / billable) : 0;
  const walletUsed = Number(subscription.walletUsed || 0);

  return (
    <>
      <PageHeader showWhatsapp={false} />
      <main className="page">
        <div className="wrap">
          <div className="hero">
            <div className="tick" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h1>Request sent</h1>
            <p>Your commute subscription is with the VOYNU team. We&apos;ll notify you as soon as it is approved.</p>
          </div>

          <div className="ref">
            <small>Subscription reference</small>
            <b>{reference(subscription.id)}</b>
            <span className="badge">Awaiting approval</span>
          </div>

          <section className="card">
            <h2>What happens next</h2>
            <ol className="next">
              <li><b>1</b><div><strong>VOYNU approves your request</strong><span>Requests not approved within 4 hours lapse automatically, and any wallet credits used are returned.</span></div></li>
              <li><b>2</b><div><strong>Your driver picks you up</strong><span>Pickups begin on {subscription.start || "your start date"}.</span></div></li>
              <li><b>3</b><div><strong>You pay at pickup</strong><span>At least that day&apos;s fare{perDay > 0 ? <> (about <em>₹{money(perDay)}</em>)</> : null}. Cash up to that amount, or UPI to VOYNU — your driver verifies the transaction reference.</span></div></li>
            </ol>
          </section>

          <section className="card">
            <h2>Your commute</h2>
            <div className="route">
              <div><i className="dot a" /><span>{subscription.pickupName}</span></div>
              <div className="line" />
              <div><i className="dot b" /><span>{subscription.dropName}</span></div>
            </div>
            <dl className="facts">
              <div><dt>Plan</dt><dd>{subscription.planName}</dd></div>
              <div><dt>Distance</dt><dd>{subscription.distance ? `${subscription.distance} km one way` : "—"}</dd></div>
              <div><dt>Morning pickup</dt><dd>{subscription.morning}</dd></div>
              <div><dt>Evening return</dt><dd>{subscription.evening}</dd></div>
              <div><dt>Start date</dt><dd>{subscription.start}</dd></div>
              <div><dt>Travel days</dt><dd>{days || "—"}</dd></div>
              <div><dt>Riders</dt><dd>{subscription.passengers || 1}</dd></div>
              <div><dt>Payment</dt><dd>Pay at pickup</dd></div>
            </dl>
          </section>

          <section className="card">
            <h2>Amount</h2>
            <div className="rows">
              <div><span>Daily round trip</span><b>₹{money(quote.dailyRoundTripFare)}</b></div>
              <div><span>Billable days</span><b>{quote.billableDays ?? "—"}</b></div>
              {Number(quote.discountAmount) > 0 && <div className="good"><span>Plan discount</span><b>− ₹{money(quote.discountAmount)}</b></div>}
              {walletUsed > 0 && <div className="good"><span>Wallet credits used</span><b>− ₹{money(walletUsed)}</b></div>}
            </div>
            <div className="total"><span>To pay across the plan</span><b>₹{money(payable)}</b></div>
            <p className="note">Scheduled days stay chargeable when fewer riders travel. Off-days paused at least 4 hours before pickup are not charged.</p>
          </section>

          <div className="actions">
            <Link href="/subscriptions/manage" className="primary">My subscriptions</Link>
            <Link href="/" className="secondary">Back to home</Link>
          </div>
        </div>

        <style jsx>{`
          .page{min-height:100vh;background:var(--voynu-bg,#F7F9FC);color:var(--voynu-text,#1E3348);padding:18px 0 calc(40px + env(safe-area-inset-bottom))}
          .wrap{width:min(680px,calc(100% - 28px));margin:0 auto}
          .hero{text-align:center;padding:14px 0 8px}
          .tick{width:72px;height:72px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#12A0C6,#0A7FA6);color:#fff;box-shadow:0 14px 30px rgba(10,127,166,.28)}
          h1{margin:0 0 6px;font-size:26px;letter-spacing:-.5px;font-weight:700;color:var(--voynu-navy,#0A2337)}
          .hero p{max-width:460px;margin:0 auto;font-size:15px;line-height:1.55;color:var(--voynu-muted,#5B6B7C)}
          .ref{margin:16px 0 14px;padding:14px 16px;border-radius:18px;background:var(--voynu-primary-tint,#E7F4F8);text-align:center}
          .ref small{display:block;font-size:12px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}
          .ref b{display:block;margin:2px 0 8px;font-size:20px;letter-spacing:.6px;color:var(--voynu-teal-deep,#00456B)}
          .badge{display:inline-block;padding:5px 12px;border-radius:99px;background:#FFF7E6;color:#8A5A00;font-size:13px;font-weight:700}
          .card{background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7);border-radius:20px;padding:20px 18px;margin-bottom:14px;box-shadow:var(--voynu-shadow,0 12px 30px rgba(10,35,55,.07))}
          h2{margin:0 0 12px;font-size:18px;letter-spacing:-.2px;font-weight:700;color:var(--voynu-navy,#0A2337)}
          .next{margin:0;padding:0;list-style:none;display:grid;gap:14px}
          .next li{display:flex;gap:12px;align-items:flex-start}
          .next li>b{width:28px;height:28px;flex:0 0 28px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--voynu-teal,#0A7FA6);color:#fff;font-size:13px}
          .next strong{display:block;font-size:15px;color:var(--voynu-navy,#0A2337)}
          .next span{display:block;margin-top:2px;font-size:14px;line-height:1.55;color:var(--voynu-muted,#5B6B7C)}
          .next em{font-style:normal;font-weight:700;color:var(--voynu-accent-deep,#D4552A)}
          .route>div{display:flex;gap:12px;align-items:flex-start;font-size:15px;font-weight:600;line-height:1.4}
          .dot{width:12px;height:12px;flex:0 0 12px;margin-top:5px;border-radius:50%}.dot.a{background:var(--voynu-teal,#0A7FA6)}.dot.b{background:var(--voynu-accent,#F5813F)}
          .line{width:2px;height:16px;margin:3px 0 3px 5px;background:var(--voynu-border-strong,#D8DEE8)}
          .facts{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px;margin:16px 0 0;padding-top:14px;border-top:1px dashed var(--voynu-border-strong,#D8DEE8)}
          .facts dt{font-size:12px;font-weight:600;color:var(--voynu-muted,#5B6B7C)}.facts dd{margin:3px 0 0;font-size:14px;font-weight:600}
          .rows>div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;font-size:14.5px;color:var(--voynu-muted,#5B6B7C)}.rows b{color:var(--voynu-text,#1E3348);font-variant-numeric:tabular-nums}
          .rows .good b,.rows .good span{color:#15803D}
          .total{display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;padding-top:14px;border-top:1px solid var(--voynu-border-strong,#D8DEE8);font-size:15px;font-weight:600}
          .total b{font-size:24px;color:var(--voynu-navy,#0A2337);font-variant-numeric:tabular-nums}
          .note{margin:12px 0 0;font-size:12.5px;line-height:1.55;color:var(--voynu-muted,#5B6B7C)}
          .actions{display:grid;gap:10px;margin-top:18px}
          .actions :global(a){display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:16px;font-size:16px;font-weight:700}
          .actions :global(a.primary){background:var(--voynu-gradient,linear-gradient(135deg,#12A0C6,#0A7FA6));color:#fff;box-shadow:0 10px 24px rgba(10,127,166,.22)}
          .actions :global(a.secondary){border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:#fff;color:var(--voynu-navy,#0A2337)}
        `}</style>
      </main>
    </>
  );
}
