"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../shared/components/PageHeader";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { buildWhatsAppLink } from "../../lib/contact";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const labels = { reward: "Reward", refund: "Refund credit", booking_use: "Used on booking", reversal: "Reversal", expiry: "Expired", admin_adjustment: "Wallet adjustment" };
const dateShort = (v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const timeShort = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (uid) => {
    setLoading(true);
    setError("");
    const [{ data: account, error: accountError }, { data: tx, error: txError }, { data: rewardRules, error: rulesError }] = await Promise.all([
      supabase.from("wallet_accounts").select("balance").eq("user_id", uid).maybeSingle(),
      supabase.from("wallet_transactions").select("id,transaction_type,amount,balance_after,description,expires_at,created_at,booking_id,subscription_id").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      supabase.from("wallet_reward_rules").select("id,code,qualifying_rides,reward_amount,active,description").eq("active", true).order("qualifying_rides"),
    ]);
    if (accountError || txError || rulesError) setError((accountError || txError || rulesError)?.message || "Wallet could not be loaded.");
    setBalance(Number(account?.balance || 0));
    setTransactions(tx || []);
    setRules((rewardRules || []).filter((r) => Number(r.reward_amount) > 0));
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user;
      if (!u) { router.replace("/login"); return; }
      if (!cancelled) load(u.id);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const nextMilestone = useMemo(() => rules[0] || null, [rules]);
  const hasActivity = transactions.length > 0;

  return (
    <main className="page">
      <PageHeader whatsappHref={buildWhatsAppLink("Hi VOYNU, I need help with my wallet.")} />

      <div className="wrap">
        <div className="titleRow">
          <div>
            <span className="eyebrow">VOYNU WALLET</span>
            <h1>Your service credits</h1>
          </div>
          <Link href="/account" className="backLink">← Account</Link>
        </div>
        <p className="lede">Use eligible VOYNU credits on future bookings. This is not a cash wallet — you can&apos;t add money to it yourself.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <section className="balanceCard">
          <span className="balanceLabel">AVAILABLE CREDITS</span>
          <div className="balanceValue">₹{money(balance)}</div>
          <p className="balanceNote">Credits come from refunds, ride rewards or promotions VOYNU runs — never a top-up.</p>
        </section>

        <section className="infoGrid">
          <div className="infoCard">
            <span className="infoLabel">HOW MUCH CAN I USE?</span>
            <div className="infoHeadline">Up to 10% of a booking</div>
            <p className="infoBody">The exact amount is calculated for you at checkout, based on your balance and that booking&apos;s total.</p>
          </div>
          <div className="infoCard">
            <span className="infoLabel">EARN MORE</span>
            <div className="infoHeadline">{nextMilestone ? "Ride rewards are active" : "No rewards running yet"}</div>
            <p className="infoBody">{nextMilestone ? `Next milestone: ${nextMilestone.qualifying_rides} qualifying rides → ₹${money(nextMilestone.reward_amount)}.` : "VOYNU hasn't enabled any reward milestones yet — credits currently only come from refunds."}</p>
          </div>
        </section>

        <section className="activity">
          <div className="activityHead"><h2>Wallet activity</h2>{hasActivity && <span className="activityCount">{transactions.length} entr{transactions.length === 1 ? "y" : "ies"}</span>}</div>

          {loading ? (
            <div className="skeletons">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
          ) : !hasActivity ? (
            <div className="empty">
              <div className="emptyIcon">₹</div>
              <strong>No wallet activity yet</strong>
              <span>Refunds and rewards will show up here as soon as they&apos;re issued.</span>
            </div>
          ) : (
            <div className="list">
              {transactions.map((t) => {
                const positive = Number(t.amount) > 0;
                return (
                  <div key={t.id} className="row">
                    <div className="rowMain">
                      <strong>{labels[t.transaction_type] || "Wallet activity"}</strong>
                      <span className="rowMeta">{t.description || "VOYNU wallet transaction"} · {dateShort(t.created_at)}, {timeShort(t.created_at)}</span>
                      {t.expires_at && <span className="rowExpiry">Expires {dateShort(t.expires_at)}</span>}
                    </div>
                    <div className="rowAmount">
                      <strong className={positive ? "amountPositive" : ""}>{positive ? "+" : ""}₹{money(t.amount)}</strong>
                      <span>Balance ₹{money(t.balance_after)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="footNote">VOYNU Wallet is a closed-loop service-credit system. Credits are for eligible VOYNU services only — not deposits, cash balances, or transferable funds.</div>
      </div>

      <style jsx>{`
        .page{min-height:100vh;background:var(--voynu-bg,#F7F9FC);color:var(--voynu-text,#1E3348)}
        .wrap{width:min(640px,calc(100% - 28px));margin:0 auto;padding:22px 0 60px}
        .titleRow{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .eyebrow{display:block;font-size:11px;font-weight:800;letter-spacing:1.2px;color:var(--voynu-teal,#0A7FA6)}
        h1{margin:5px 0 0;font-size:clamp(24px,6vw,30px);letter-spacing:-.6px;font-weight:800}
        .backLink{flex:0 0 auto;padding:9px 13px;border-radius:12px;border:1px solid var(--voynu-border-strong,#D8DEE8);background:var(--voynu-surface,#fff);color:var(--voynu-text,#1E3348);text-decoration:none;font-weight:700;font-size:12px}
        .lede{margin:9px 0 0;color:var(--voynu-muted,#5B6B7C);font-size:13.5px;line-height:1.5}
        .alert{margin-top:16px;padding:13px 14px;border-radius:12px;background:#FFF1F2;color:#B42318;font-size:13px;font-weight:500}
        .balanceCard{margin-top:16px;padding:22px 20px;border-radius:20px;background:var(--voynu-gradient,linear-gradient(135deg,#12A0C6,#0A7FA6));color:#fff;box-shadow:0 14px 30px rgba(10,127,166,.25)}
        .balanceLabel{font-size:11px;font-weight:800;letter-spacing:1px;opacity:.85}
        .balanceValue{margin-top:7px;font-size:clamp(34px,10vw,42px);font-weight:900;letter-spacing:-1px;font-variant-numeric:tabular-nums}
        .balanceNote{margin:10px 0 0;font-size:12px;line-height:1.5;opacity:.9;max-width:46ch}
        .infoGrid{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .infoCard{padding:15px;border-radius:16px;background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7)}
        .infoLabel{display:block;font-size:10px;font-weight:800;letter-spacing:.5px;color:var(--voynu-muted,#5B6B7C)}
        .infoHeadline{margin-top:6px;font-size:14.5px;font-weight:800;line-height:1.3}
        .infoBody{margin:5px 0 0;font-size:11.5px;line-height:1.5;color:var(--voynu-muted,#5B6B7C)}
        .activity{margin-top:26px}
        .activityHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .activityHead h2{margin:0;font-size:17px;font-weight:800}
        .activityCount{font-size:11px;color:var(--voynu-muted,#5B6B7C)}
        .skeletons{display:grid;gap:8px}
        .skeleton{height:66px;border-radius:14px;background:linear-gradient(90deg,#EEF3F7 25%,#F5F8FB 37%,#EEF3F7 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
        @keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
        .empty{padding:30px 20px;text-align:center;background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7);border-radius:18px}
        .emptyIcon{width:44px;height:44px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--voynu-primary-tint,#E7F4F8);color:var(--voynu-teal,#0A7FA6);font-size:20px;font-weight:800}
        .empty strong{display:block;font-size:14px}
        .empty span{display:block;margin-top:5px;color:var(--voynu-muted,#5B6B7C);font-size:12.5px;line-height:1.5;max-width:34ch;margin-inline:auto}
        .list{display:grid;gap:8px}
        .row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px;background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7);border-radius:16px}
        .rowMain{min-width:0}
        .rowMain strong{display:block;font-size:13.5px}
        .rowMeta{display:block;margin-top:3px;color:var(--voynu-muted,#5B6B7C);font-size:11.5px;line-height:1.4}
        .rowExpiry{display:block;margin-top:3px;color:#B45309;font-size:10.5px;font-weight:700}
        .rowAmount{text-align:right;flex:0 0 auto}
        .rowAmount strong{display:block;font-size:15px;font-variant-numeric:tabular-nums}
        .amountPositive{color:#15803D}
        .rowAmount span{display:block;margin-top:3px;color:var(--voynu-muted,#5B6B7C);font-size:10.5px;font-variant-numeric:tabular-nums}
        .footNote{margin-top:22px;padding:14px;border-radius:14px;background:var(--voynu-primary-tint,#E7F4F8);color:var(--voynu-teal-deep,#00456B);font-size:11.5px;line-height:1.55}
        @media(max-width:420px){.infoGrid{grid-template-columns:1fr}.balanceCard{padding:19px 17px}}
      `}</style>
    </main>
  );
}
