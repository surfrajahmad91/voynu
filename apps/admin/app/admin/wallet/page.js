"use client";
/* eslint-disable */

import { useEffect, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: "1px solid " + c.border, borderRadius: 16, padding: 16 };
const inputStyle = { width: "100%", minHeight: 42, marginTop: 5, padding: "0 10px", boxSizing: "border-box", border: "1px solid " + c.borderStrong, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const buttonStyle = { minHeight: 42, padding: "0 16px", border: 0, borderRadius: 10, background: theme.gradients.primary, color: "#fff", font: "inherit", fontWeight: 800, cursor: "pointer" };

export default function WalletAdminPage() {
  const [settings, setSettings] = useState(null);
  const [rules, setRules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCustomers(term) {
    const { data, error: e } = await supabase.rpc("admin_wallet_customers", { p_query: String(term || "").trim() });
    if (e) {
      setError(e.message);
      return;
    }
    setCustomers(data || []);
  }

  async function load() {
    setError("");
    const [settingsResult, rulesResult] = await Promise.all([
      supabase.from("wallet_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("wallet_reward_rules").select("*").order("qualifying_rides"),
    ]);
    if (settingsResult.error || rulesResult.error) {
      setError((settingsResult.error || rulesResult.error).message);
      return;
    }
    setSettings(settingsResult.data);
    setRules(rulesResult.data || []);
    await loadCustomers("");
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: e } = await supabase.rpc("admin_set_wallet_settings", {
      p_enabled: Boolean(settings.wallet_enabled),
      p_max_usage_percent: Number(settings.max_usage_percent),
      p_min_booking_amount: Number(settings.min_booking_amount),
      p_reward_expiry_days: Number(settings.reward_expiry_days),
      p_refund_to_wallet: Boolean(settings.refund_to_wallet_enabled),
      p_eligible_services: settings.eligible_services || ["oneway", "roundtrip", "commute", "rental"],
    });
    if (e) {
      setError(e.message);
    } else {
      setSettings(data);
      setMessage("Wallet policy saved.");
    }
    setBusy(false);
  }

  async function saveRule(rule) {
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: e } = await supabase.rpc("admin_set_wallet_reward_rule", {
      p_id: rule.id,
      p_reward_amount: Number(rule.reward_amount),
      p_active: Boolean(rule.active),
    });
    if (e) {
      setError(e.message);
    } else {
      setRules((current) => current.map((item) => item.id === rule.id ? data : item));
      setMessage("Reward rule saved.");
    }
    setBusy(false);
  }

  async function applyAdjustment() {
    if (!selectedCustomer) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) {
      setError("Enter a non-zero amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the adjustment.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const { error: e } = await supabase.rpc("admin_adjust_wallet", {
      p_user_id: selectedCustomer.user_id,
      p_amount: value,
      p_description: reason.trim(),
    });
    if (e) {
      setError(e.message);
    } else {
      setMessage("Wallet adjusted successfully.");
      setSelectedCustomer(null);
      setAmount("");
      setReason("");
      await loadCustomers(query);
    }
    setBusy(false);
  }

  if (!settings) {
    return (
      <main style={{ background: c.bg, minHeight: "60vh", color: c.text, fontFamily: theme.fontFamily, padding: 8 }}>
        <section style={card}>Loading wallet configuration…</section>
      </main>
    );
  }

  return (
    <main style={{ background: c.bg, minHeight: "70vh", color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 88px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header style={{ margin: "6px 0 16px" }}>
          <div style={{ color: c.primary, fontSize: 10.5, fontWeight: 900, letterSpacing: 1 }}>CUSTOMER CREDITS</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 26 }}>Wallet & rewards</h1>
          <p style={{ margin: "5px 0 0", color: c.textFaint, fontSize: 12.5 }}>Manage VOYNU service credits using the existing admin theme.</p>
        </header>

        {error && <div style={{ ...card, marginBottom: 12, color: c.error, background: c.errorBg }}>{error}</div>}
        {message && <div style={{ ...card, marginBottom: 12, color: c.success, background: c.successBg }}>{message}</div>}

        <section style={{ ...card, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15 }}>Wallet policy</h2>
          <p style={{ margin: "5px 0 14px", color: c.textMuted, fontSize: 12 }}>Customers do not top up. Credits are issued by VOYNU for refunds, rewards and promotions.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>Enabled
              <select value={String(Boolean(settings.wallet_enabled))} onChange={(e) => setSettings({ ...settings, wallet_enabled: e.target.value === "true" })} style={inputStyle}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>Maximum usage %
              <input type="number" min="0" max="100" step="0.5" value={settings.max_usage_percent} onChange={(e) => setSettings({ ...settings, max_usage_percent: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>Minimum booking amount
              <input type="number" min="0" step="1" value={settings.min_booking_amount} onChange={(e) => setSettings({ ...settings, min_booking_amount: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>Reward expiry days
              <input type="number" min="0" step="1" value={settings.reward_expiry_days} onChange={(e) => setSettings({ ...settings, reward_expiry_days: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 13, fontSize: 12 }}>
            <input type="checkbox" checked={Boolean(settings.refund_to_wallet_enabled)} onChange={(e) => setSettings({ ...settings, refund_to_wallet_enabled: e.target.checked })} />
            Return wallet-used credits after a customer cancellation.
          </label>
          <button type="button" disabled={busy} onClick={saveSettings} style={{ ...buttonStyle, width: "100%", marginTop: 14, opacity: busy ? 0.7 : 1 }}>Save wallet policy</button>
        </section>

        <section style={{ ...card, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15 }}>Ride milestone rewards</h2>
          <p style={{ margin: "5px 0 14px", color: c.textMuted, fontSize: 12 }}>A reward is issued only after the ride is completed and payment is confirmed.</p>
          <div style={{ display: "grid", gap: 9 }}>
            {rules.map((rule) => (
              <div key={rule.id} style={{ padding: 12, border: "1px solid " + c.border, borderRadius: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{rule.qualifying_rides} qualifying rides</strong>
                    <div style={{ marginTop: 4, color: c.textFaint, fontSize: 10.5 }}>{rule.description}</div>
                  </div>
                  <label style={{ fontSize: 10.5, fontWeight: 700 }}>Reward (₹)
                    <input type="number" min="0" step="1" value={rule.reward_amount} onChange={(e) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, reward_amount: e.target.value } : item))} style={inputStyle} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 10 }}>
                  <select value={String(Boolean(rule.active))} onChange={(e) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: e.target.value === "true" } : item))} style={{ ...inputStyle, marginTop: 0, maxWidth: 150 }}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <button type="button" disabled={busy} onClick={() => saveRule(rule)} style={buttonStyle}>Save rule</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: 0, fontSize: 15 }}>Customer wallet balances</h2>
          <p style={{ margin: "5px 0 12px", color: c.textFaint, fontSize: 11.5 }}>Search by name or phone before making a manual adjustment.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadCustomers(query); }} placeholder="Customer name or phone" style={{ ...inputStyle, marginTop: 0 }} />
            <button type="button" onClick={() => loadCustomers(query)} style={buttonStyle}>Search</button>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {customers.map((customer) => (
              <div key={customer.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, border: "1px solid " + c.border, borderRadius: 12 }}>
                <div>
                  <strong style={{ fontSize: 12.5 }}>{customer.full_name || "Customer"}</strong>
                  <div style={{ marginTop: 3, color: c.textFaint, fontSize: 10.5 }}>{customer.phone || customer.user_id}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>₹{Number(customer.balance || 0).toLocaleString("en-IN")}</strong>
                  <button type="button" onClick={() => setSelectedCustomer(customer)} style={{ ...buttonStyle, minHeight: 36, padding: "0 12px", fontSize: 11 }}>Adjust</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedCustomer && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(0,0,0,.35)" }}>
            <section style={{ ...card, width: "min(460px,100%)", boxShadow: theme.shadow.card }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>Adjust {selectedCustomer.full_name || "customer"} wallet</h2>
              <p style={{ margin: "5px 0 14px", color: c.textFaint, fontSize: 11.5 }}>Positive adds credits. Negative removes credits. Every change is recorded in the wallet ledger.</p>
              <label style={{ fontSize: 11.5, fontWeight: 700 }}>Amount (₹)
                <input autoFocus type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: "block", marginTop: 10, fontSize: 11.5, fontWeight: 700 }}>Reason
                <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button type="button" disabled={busy} onClick={applyAdjustment} style={{ ...buttonStyle, flex: 1 }}>Apply adjustment</button>
                <button type="button" onClick={() => setSelectedCustomer(null)} style={{ ...buttonStyle, flex: 1, background: c.surface, color: c.text, border: "1px solid " + c.border }}>Cancel</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
