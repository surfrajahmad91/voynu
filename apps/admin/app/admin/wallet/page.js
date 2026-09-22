"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: "1px solid " + c.border, borderRadius: 16, padding: 16 };
const field = { display: "block", width: "100%", boxSizing: "border-box", minHeight: 42, marginTop: 5, padding: "0 10px", border: "1px solid " + c.borderStrong, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const btn = { border: 0, borderRadius: 10, padding: "0 18px", minHeight: 42, background: theme.gradients.primary, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", font: "inherit" };

export default function WalletAdminPage() {
  const [settings, setSettings] = useState(null), [rules, setRules] = useState([]), [customers, setCustomers] = useState([]), [query, setQuery] = useState("");
  const [adjustUser, setAdjustUser] = useState(null), [adjustAmount, setAdjustAmount] = useState(""), [adjustNote, setAdjustNote] = useState("");
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  const load = async () => {
    setError("");
    const [{ data: s, error: se }, { data: r, error: re }] = await Promise.all([
      supabase.from("wallet_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("wallet_reward_rules").select("*").order("qualifying_rides"),
    ]);
    if (se || re) setError((se || re)?.message || "Wallet configuration could not be loaded.");
    setSettings(s); setRules(r || []);
  };
  const searchCustomers = async (term = query) => {
    const { data, error: e } = await supabase.rpc("admin_wallet_customers", { p_query: term.trim() });
    if (e) setError(e.message); else setCustomers(data || []);
  };
  useEffect(() => { load(); searchCustomers(""); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: e } = await supabase.rpc("admin_set_wallet_settings", {
      p_enabled: Boolean(settings.wallet_enabled), p_max_usage_percent: Number(settings.max_usage_percent),
      p_min_booking_amount: Number(settings.min_booking_amount), p_reward_expiry_days: Number(settings.reward_expiry_days),
      p_refund_to_wallet: Boolean(settings.refund_to_wallet_enabled), p_eligible_services: settings.eligible_services || ["oneway", "roundtrip", "commute", "rental"],
    });
    if (e) setError(e.message); else { setSettings(data); setMessage("Wallet settings saved."); }
    setSaving(false);
  };

  const saveRule = async (rule) => {
    setError(""); setMessage("");
    const { data, error: e } = await supabase.rpc("admin_set_wallet_reward_rule", { p_id: rule.id, p_reward_amount: Number(rule.reward_amount), p_active: Boolean(rule.active) });
    if (e) setError(e.message); else { setRules((v) => v.map((x) => x.id === rule.id ? data : x)); setMessage(rule.qualifying_rides + "-ride reward rule saved."); }
  };

  const adjust = async () => {
    if (!adjustUser) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount === 0) { setError("Enter a non-zero wallet adjustment."); return; }
    if (!adjustNote.trim()) { setError("Add a reason for the manual wallet adjustment."); return; }
    setSaving(true); setError(""); setMessage("");
    const { error: e } = await supabase.rpc("admin_adjust_wallet", { p_user_id: adjustUser.user_id, p_amount: amount, p_description: adjustNote.trim() });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setMessage("Wallet adjusted by ₹" + amount.toLocaleString("en-IN") + " for " + (adjustUser.full_name || "customer") + ".");
    setAdjustAmount(""); setAdjustNote(""); setAdjustUser(null); await searchCustomers();
  };

  if (!settings) return <main style={{ background: c.bg, minHeight: "60vh", color: c.text, fontFamily: theme.fontFamily, padding: 8 }}><div style={card}>Loading wallet configuration…</div></main>;

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 88px" }}>
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", margin: "6px 0 16px" }}>
        <div><div style={{ color: c.primary, fontSize: 10.5, fontWeight: 900, letterSpacing: 1 }}>CUSTOMER CREDITS</div><h1 style={{ margin: "4px 0 0", fontSize: 26 }}>Wallet & rewards</h1><p style={{ margin: "5px 0 0", color: c.textFaint, fontSize: 12.5, maxWidth: 520 }}>Configure service credits without changing the existing admin visual system.</p></div>
      </header>
      {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: c.errorBg, color: c.error, fontSize: 12 }}>{error}</div>}
      {message && <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: c.successBg, color: c.success, fontSize: 12 }}>{message}</div>}

      <section style={{ ...card, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>Wallet policy</h2>
        <p style={{ margin: "4px 0 14px", color: c.textMuted, fontSize: 12 }}>Customers never top up. Credits are issued by VOYNU for refunds, promotions and qualifying rewards.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>Enabled<select value={String(Boolean(settings.wallet_enabled))} onChange={(e) => setSettings({ ...settings, wallet_enabled: e.target.value === "true" })} style={field}><option value="true">Yes</option><option value="false">No</option></select></label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>Max booking usage %<input type="number" min="0" max="100" step="0.5" value={settings.max_usage_percent} onChange={(e) => setSettings({ ...settings, max_usage_percent: e.target.value })} style={field} /></label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>Minimum booking amount<input type="number" min="0" step="1" value={settings.min_booking_amount} onChange={(e) => setSettings({ ...settings, min_booking_amount: e.target.value })} style={field} /></label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>Reward expiry days (0 = no expiry)<input type="number" min="0" step="1" value={settings.reward_expiry_days} onChange={(e) => setSettings({ ...settings, reward_expiry_days: e.target.value })} style={field} /></label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, fontSize: 12 }}><input type="checkbox" checked={Boolean(settings.refund_to_wallet_enabled)} onChange={(e) => setSettings({ ...settings, refund_to_wallet_enabled: e.target.checked })} /> Return wallet-used credits to the wallet when a booking is cancelled.</label>
        <button onClick={saveSettings} disabled={saving} style={{ ...btn, width: "100%", marginTop: 14, opacity: saving ? .7 : 1 }}>{saving ? "Saving…" : "Save wallet policy"}</button>
      </section>

      <section style={{ ...card, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>Ride milestone rewards</h2>
        <p style={{ margin: "4px 0 14px", color: c.textMuted, fontSize: 12 }}>Rewards are issued only after a qualifying ride is completed and its payment is confirmed.</p>
        <div style={{ display: "grid", gap: 9 }}>{rules.map((rule) => <div key={rule.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px", gap: 9, alignItems: "end", padding: 10, border: "1px solid " + c.border, borderRadius: 12 }}><div><strong style={{ fontSize: 13 }}>{rule.qualifying_rides} qualifying rides</strong><div style={{ marginTop: 3, color: c.textFaint, fontSize: 10.5 }}>{rule.description}</div></div><label style={{ fontSize: 10.5, fontWeight: 700 }}>Reward<input type="number" min="0" step="1" value={rule.reward_amount} onChange={(e) => setRules((v) => v.map((x) => x.id === rule.id ? { ...x, reward_amount: e.target.value } : x))} style={field} /></label><label style={{ fontSize: 10.5, fontWeight: 700 }}>Active<select value={String(Boolean(rule.active))} onChange={(e) => setRules((v) => v.map((x) => x.id === rule.id ? { ...x, active: e.target.value === "true" } : x))} style={field}><option value="true">Yes</option><option value="false">No</option></select></label><button onClick={() => saveRule(rule)} style={{ ...btn, gridColumn: "1 / -1" }}>Save {rule.qualifying_rides}-ride rule</button></div>)}</div>
      </section>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "end", flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 15 }}>Customer wallet balances</h2><p style={{ margin: "4px 0 0", color: c.textFaint, fontSize: 11.5 }}>Search by customer name or phone before making a manual adjustment.</p></div><div style={{ display: "flex", gap: 7, width: "min(100%,360px)" }}><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCustomers()} placeholder="Customer name or phone" style={{ ...field, marginTop: 0 }} /><button onClick={() => searchCustomers()} style={btn}>Search</button></div></div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{customers.map((customer) => <div key={customer.user_id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: 12, border: "1px solid " + c.border, borderRadius: 12 }}><div><strong style={{ fontSize: 12.5 }}>{customer.full_name || "Customer"}</strong><div style={{ marginTop: 3, color: c.textFaint, fontSize: 10.5 }}>{customer.phone || customer.user_id}</div></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><strong>₹{Number(customer.balance || 0).toLocaleString("en-IN")}</strong><button onClick={() => setAdjustUser(customer)} style={{ ...btn, minHeight: 36, padding: "0 12px", fontSize: 11 }}>Adjust</button></div></div>)}</div>
      </section>

      {adjustUser && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
        <section style={{ ...card, width: "min(460px,100%)", boxShadow: theme.shadow.card }}><h2 style={{ margin: 0, fontSize: 17 }}>Adjust {adjustUser.full_name || "customer"} wallet</h2><p style={{ margin: "5px 0 14px", color: c.textFaint, fontSize: 11.5 }}>Positive adds credits; negative removes credits. Every adjustment is recorded in the immutable wallet ledger.</p><label style={{ fontSize: 11.5, fontWeight: 700 }}>Amount (₹)<input autoFocus type="number" step="1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} style={field} /></label><label style={{ display: "block", marginTop: 10, fontSize: 11.5, fontWeight: 700 }}>Reason<input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} style={field} /></label><div style={{ display: "flex", gap: 8, marginTop: 14 }}><button onClick={adjust} disabled={saving} style={{ ...btn, flex: 1 }}>{saving ? "Saving…" : "Apply adjustment"}</button><button onClick={() => setAdjustUser(null)} style={{ ...btn, flex: 1, background: c.surface, color: c.text, border: "1px solid " + c.border, boxShadow: "none" }}>Cancel</button></div></section>
      </div>}
    </div>
  </main>;
}
