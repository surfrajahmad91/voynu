"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { theme } from "../../../../../shared/lib/theme";
import PageHeader from "../../../../../shared/components/PageHeader";

const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

function IconCheckBig() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconPhoneCall({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function subscriptionReference(id) {
  return id ? `VOY-SUB-${String(id).slice(0, 8).toUpperCase()}` : "—";
}

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
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.colors.bg }}>
        <div style={{ width: 34, height: 34, border: "3px solid rgba(10,127,166,0.18)", borderTopColor: theme.colors.primary, borderRadius: "50%" }} />
      </main>
    );
  }

  const reference = subscriptionReference(subscription.id);
  const quote = subscription.quote || {};
  const weekdayLabels = (subscription.weekdays || []).map((d) => DAY_LABELS[d] || d).join(", ");

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>
      <PageHeader maxWidth={theme.maxWidth.content} showWhatsapp={false} />
      <div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", padding: "32px 0 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 68, height: 68, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "linear-gradient(135deg, #1fa855, #0a7d42)", color: "#ffffff", boxShadow: "0 14px 30px rgba(31,168,85,0.28)" }}>
            <IconCheckBig />
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Subscription Requested!</h1>
          <p style={{ maxWidth: 560, margin: "0 auto", color: theme.colors.textMuted, fontSize: 13.5, lineHeight: 1.55 }}>
            Your commute subscription request has been saved. Your UPI payment is awaiting verification — our team will confirm it and activate your subscription shortly.
          </p>
        </div>

        <div style={{ marginBottom: 14, padding: "13px 16px", borderRadius: theme.radius.lg, background: theme.colors.primaryTint, border: `1px solid ${theme.colors.border}`, textAlign: "center" }}>
          <div style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Subscription reference</div>
          <div style={{ marginTop: 3, color: theme.colors.primary, fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>{reference}</div>
          <div style={{ marginTop: 7, color: theme.colors.textMuted, fontSize: 11.5, fontWeight: 700 }}>Payment verification pending</div>
        </div>

        <div style={{ padding: 20, borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.primary, flexShrink: 0 }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>{subscription.pickupName}</div>
          </div>
          <div style={{ width: 1.5, height: 16, marginLeft: 4.25, background: "#dbe6df" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.accent, flexShrink: 0 }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>{subscription.dropName}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${theme.colors.border}` }}>
            <DetailCell label="Plan" value={subscription.planName} />
            <DetailCell label="Distance" value={subscription.distance ? `${subscription.distance} km one-way` : ""} />
            <DetailCell label="Morning pickup" value={subscription.morning} />
            <DetailCell label="Evening return" value={subscription.evening} />
            <DetailCell label="Start date" value={subscription.start} />
            <DetailCell label="Travel days" value={weekdayLabels} />
            <DetailCell label="Passengers" value={String(subscription.passengers || 1)} />
            <DetailCell label="Payment" value="UPI — Verification pending" />
          </div>
        </div>

        <section style={{ marginTop: 14, padding: 18, borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Subscription amount</div>
            <div style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700 }}>Transparent pricing</div>
          </div>
          <FareRow label="Daily round trip" value={quote.dailyRoundTripFare} />
          <FareRow label={`Billable days (${quote.billableDays ?? "—"})`} value={quote.baseAmount} />
          {Number(quote.discountAmount) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", color: theme.colors.success, fontSize: 12.5, fontWeight: 700 }}>
              <span>Discount</span>
              <span>- ₹{Number(quote.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 7, paddingTop: 13, borderTop: `1px solid ${theme.colors.border}`, color: theme.colors.text, fontSize: 16, fontWeight: 800 }}>
            <span>Total payable</span>
            <span>₹{Number(quote.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div style={{ marginTop: 9, color: theme.colors.textFaint, fontSize: 10.5, lineHeight: 1.45 }}>
            Full payment is required before activation. Scheduled days remain chargeable when fewer passengers travel; approved holidays and off-days are handled separately.
          </div>
        </section>

        <div style={{ marginTop: 14, padding: "13px 16px", borderRadius: theme.radius.lg, background: theme.colors.primaryTint, fontSize: 11.5, color: theme.colors.primaryDark, lineHeight: 1.5 }}>
          Once your UPI payment is verified, your subscription will be activated and your morning/evening pickups will begin from your start date. You can track subscription status from My Account.
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 22, padding: "16px 18px", borderRadius: theme.radius.lg, background: theme.colors.warningBg, border: "1px solid #f0dfa8" }}>
          <div style={{ width: 36, height: 36, flex: "0 0 36px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "#f7e3ac", color: theme.colors.warning }}>
            <IconPhoneCall size={17} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.warning }}>Need help with your subscription?</div>
            <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: "#8a6b1c" }}>
              Your request details are already with the VOYNU team. If you need to make a change, please contact us and quote your subscription reference.
            </div>
          </div>
        </div>

        <Link href="/" style={{ display: "block", marginTop: 22, textAlign: "center", color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>
          Back to home
        </Link>
      </div>
    </main>
  );
}

function FareRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", color: theme.colors.textMuted, fontSize: 12.5 }}>
      <span>{label}</span>
      <span>₹{Number(value || 0).toFixed(2)}</span>
    </div>
  );
}
function DetailCell({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
      <span style={{ color: theme.colors.text, fontSize: 13, fontWeight: 700 }}>{value || "—"}</span>
    </div>
  );
}
