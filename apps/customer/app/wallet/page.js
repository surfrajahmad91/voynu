"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../shared/components/PageHeader";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";
import { buildWhatsAppLink } from "../lib/contact";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const labels = { reward: "Reward", refund: "Refund credit", booking_use: "Used on booking", reversal: "Reversal", expiry: "Expired", admin_adjustment: "Wallet adjustment" };

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
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
      if (!cancelled) { setUser(u); load(u.id); }
    });
    return () => { cancelled = true; };
  }, [router]);

  const nextMilestone = useMemo(() => rules[0] || null, [rules]);

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily }}>
      <PageHeader maxWidth={theme.maxWidth.content} whatsappHref={buildWhatsAppLink("Hi VOYNU, I need help with my wallet.")} />
      <div style={{ width: "min(" + theme.maxWidth.content + "px, calc(100% - 32px))", margin: "0 auto", padding: "26px 0 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div><div style={{ color: theme.colors.primary, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>VOYNU WALLET</div><h1 style={{ margin: "5px 0 0", fontSize: 30, letterSpacing: -0.6 }}>Your service credits</h1><p style={{ margin: "7px 0 0", color: theme.colors.textMuted, fontSize: 13 }}>Use eligible VOYNU credits on future bookings. You cannot add cash to this wallet.</p></div>
          <Link href="/account" style={{ padding: "9px 14px", borderRadius: 12, border: "1px solid " + theme.colors.border, background: theme.colors.surface, color: theme.colors.text, textDecoration: "none", fontWeight: 800, fontSize: 12 }}>Back to account</Link>
        </div>
        {error && <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12 }}>{error}</div>}
        <section style={{ marginTop: 18, padding: 22, borderRadius: 20, background: theme.gradients.primary, color: "#fff", boxShadow: theme.shadow.card }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: .82 }}>AVAILABLE VOYNU CREDITS</div>
          <div style={{ marginTop: 7, fontSize: 38, fontWeight: 900, letterSpacing: -1 }}>₹{money(balance)}</div>
          <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.5, opacity: .88 }}>Wallet credits may come from refunds, ride rewards or promotions. They are service credits, not withdrawable cash.</div>
        </section>
        <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 16, background: theme.colors.surface, border: "1px solid " + theme.colors.border, boxShadow: theme.shadow.subtle }}>
            <div style={{ fontSize: 10.5, color: theme.colors.textFaint, fontWeight: 800 }}>HOW MUCH CAN I USE?</div>
            <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>Up to 10% of the booking due</div>
            <div style={{ marginTop: 4, color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 1.45 }}>The exact limit is calculated from your eligible booking and current wallet balance.</div>
          </div>
          <div style={{ padding: 16, borderRadius: 16, background: theme.colors.surface, border: "1px solid " + theme.colors.border, boxShadow: theme.shadow.subtle }}>
            <div style={{ fontSize: 10.5, color: theme.colors.textFaint, fontWeight: 800 }}>EARN MORE</div>
            <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>{nextMilestone ? "Ride rewards are enabled at selected milestones" : "Ride rewards can be enabled by VOYNU"}</div>
            <div style={{ marginTop: 4, color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 1.45 }}>{nextMilestone ? "Next configured milestone: " + nextMilestone.qualifying_rides + " qualifying rides → ₹" + money(nextMilestone.reward_amount) + "." : "Rewards are configurable and only issued after qualifying completed and paid rides."}</div>
          </div>
        </section>
        <section style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h2 style={{ margin: 0, fontSize: 18 }}>Wallet activity</h2><span style={{ color: theme.colors.textFaint, fontSize: 11 }}>{transactions.length} recent entries</span></div>
          {loading ? <div style={{ padding: 18, color: theme.colors.textFaint, background: theme.colors.surface, borderRadius: 16 }}>Loading wallet…</div> : transactions.length === 0 ? <div style={{ padding: 22, textAlign: "center", background: theme.colors.surface, border: "1px solid " + theme.colors.border, borderRadius: 16 }}><div style={{ fontSize: 28 }}>₹</div><strong style={{ display: "block", marginTop: 7 }}>No wallet activity yet</strong><span style={{ display: "block", marginTop: 4, color: theme.colors.textMuted, fontSize: 12 }}>Refunds and rewards will appear here when issued.</span></div> : <div style={{ display: "grid", gap: 8 }}>{transactions.map((t) => { const positive = Number(t.amount) > 0; return <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 14, background: theme.colors.surface, border: "1px solid " + theme.colors.border, borderRadius: 14 }}><div style={{ minWidth: 0 }}><strong style={{ fontSize: 13 }}>{labels[t.transaction_type] || "Wallet activity"}</strong><div style={{ marginTop: 3, color: theme.colors.textMuted, fontSize: 11.5 }}>{t.description || "VOYNU wallet transaction"} · {new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>{t.expires_at && <div style={{ marginTop: 3, color: theme.colors.warning, fontSize: 10.5 }}>Expires {new Date(t.expires_at).toLocaleDateString("en-IN")}</div>}</div><div style={{ textAlign: "right", flex: "0 0 auto" }}><strong style={{ fontSize: 14, color: positive ? theme.colors.success : theme.colors.text }}>{positive ? "+" : ""}₹{money(t.amount)}</strong><div style={{ marginTop: 3, color: theme.colors.textFaint, fontSize: 10 }}>Balance ₹{money(t.balance_after)}</div></div></div>; })}</div>}
        </section>
        <div style={{ marginTop: 22, padding: 14, borderRadius: 14, background: theme.colors.primaryTint, color: theme.colors.primaryDark, fontSize: 11, lineHeight: 1.5 }}>VOYNU Wallet is designed as a closed-loop service-credit system. Credits are intended for eligible VOYNU services and are not customer deposits, cash balances, or transferable funds.</div>
      </div>
    </main>
  );
}
