"use client";

import { useState } from "react";
import { theme } from "../../../shared/lib/theme";

const money = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const pill = (active) => ({
  padding: "12px 14px", borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: "pointer", textAlign: "center",
  border: `1.5px solid ${active ? theme.colors.primary : theme.colors.border}`,
  background: active ? theme.colors.primaryTint : "#fff", color: active ? theme.colors.primary : theme.colors.text,
});

export default function SubscriptionPaymentSheet({ sheet, busy, error, onCancel, onConfirm }) {
  const { summary, routeLabel } = sheet;
  const dueToday = Number(summary?.due_today || 0);
  const remaining = Number(summary?.remaining || 0);
  const [method, setMethod] = useState(dueToday > 0 ? "cash" : "upi");
  const [amount, setAmount] = useState(dueToday > 0 ? String(dueToday) : "");
  const [utr, setUtr] = useState("");
  const [localError, setLocalError] = useState("");

  const cap = method === "cash" ? dueToday : remaining;
  const disabled = remaining <= 0;

  const chooseMethod = (m) => {
    setMethod(m);
    setLocalError("");
    if (m === "cash") setAmount(dueToday > 0 ? String(dueToday) : "");
  };

  const submit = () => {
    setLocalError("");
    const value = Number(amount);
    if (!(value > 0)) return setLocalError("Enter an amount.");
    if (method === "cash" && dueToday <= 0) return setLocalError("No cash is due today. Use UPI for any further payment.");
    if (value > cap) return setLocalError(method === "cash" ? `Cash is limited to today's due amount of ${money(dueToday)}.` : `Amount cannot be more than the balance of ${money(remaining)}.`);
    if (method === "upi") {
      const clean = utr.trim().toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z0-9]{6,30}$/.test(clean)) return setLocalError("Enter the 12-digit UPI transaction reference (UTR).");
      onConfirm({ method, amount: value, utr: clean });
      return;
    }
    onConfirm({ method, amount: value });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(13,27,42,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "min(520px,100%)", maxHeight: "92dvh", overflowY: "auto", background: "#fff", borderRadius: "22px 22px 0 0", padding: "18px 18px 22px", boxShadow: "0 -20px 60px rgba(0,0,0,.25)", fontFamily: theme.fontFamily }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: theme.colors.primary, textTransform: "uppercase" }}>COMMUTE PAYMENT</div>
        <h3 style={{ margin: "4px 0 4px", fontSize: 18 }}>{routeLabel || "Record payment"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0" }}>
          <div style={{ padding: 11, borderRadius: 12, background: "#F7F9FB" }}><small style={{ fontSize: 9, color: theme.colors.textFaint }}>DUE TODAY</small><b style={{ display: "block", fontSize: 15, marginTop: 2 }}>{money(dueToday)}</b></div>
          <div style={{ padding: 11, borderRadius: 12, background: "#F7F9FB" }}><small style={{ fontSize: 9, color: theme.colors.textFaint }}>BALANCE LEFT</small><b style={{ display: "block", fontSize: 15, marginTop: 2 }}>{money(remaining)}</b></div>
        </div>

        {disabled ? (
          <div style={{ padding: 12, borderRadius: 12, background: "#EAFBF2", color: "#16824A", fontSize: 13, fontWeight: 800 }}>This subscription is fully paid. Nothing to collect.</div>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>How is the customer paying?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" style={pill(method === "cash")} onClick={() => chooseMethod("cash")} disabled={dueToday <= 0}>Cash</button>
              <button type="button" style={pill(method === "upi")} onClick={() => chooseMethod("upi")}>UPI</button>
            </div>
            {dueToday <= 0 && method === "cash" && <div style={{ marginTop: 8, fontSize: 11.5, color: theme.colors.textFaint }}>Nothing is due today in cash. Only UPI is available right now.</div>}

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Amount collected</div>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹ amount"
                style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${theme.colors.border}`, borderRadius: 12, padding: 13, fontSize: 16, fontWeight: 600 }} />
              <small style={{ display: "block", marginTop: 6, fontSize: 11, color: theme.colors.textFaint }}>
                {method === "cash" ? `Cash cannot be more than today's due of ${money(dueToday)}.` : `UPI can be any amount up to the balance of ${money(remaining)}.`}
              </small>
            </div>

            {method === "upi" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>UPI transaction reference (UTR)</div>
                <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" autoCapitalize="characters"
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${theme.colors.border}`, borderRadius: 12, padding: 13, fontSize: 15, fontFamily: "monospace", letterSpacing: 1 }} />
                <small style={{ display: "block", marginTop: 6, fontSize: 11, color: theme.colors.textFaint }}>Check the UTR on the customer&apos;s UPI app before confirming. VOYNU verifies it again before it counts as paid.</small>
              </div>
            )}
          </>
        )}

        {(localError || error) && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12, fontWeight: 700 }}>{localError || error}</div>}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ flex: 1, minHeight: 46, borderRadius: 13, border: `1px solid ${theme.colors.border}`, background: "#fff", fontWeight: 800 }}>Close</button>
          {!disabled && <button type="button" onClick={submit} disabled={busy} style={{ flex: 1.4, minHeight: 46, borderRadius: 13, border: 0, background: theme.gradients.primary, color: "#fff", fontWeight: 900, opacity: busy ? 0.6 : 1 }}>{busy ? "Recording…" : "Record payment"}</button>}
        </div>
      </div>
    </div>
  );
}
