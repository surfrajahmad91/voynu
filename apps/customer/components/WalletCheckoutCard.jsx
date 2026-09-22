"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";
import { theme } from "../../../shared/lib/theme";

export default function WalletCheckoutCard({ bookingAmount, onAmountChange, disabled = false }) {
  const [quote, setQuote] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const amount = Number(bookingAmount || 0);
      if (!amount) {
        setQuote(null);
        setEnabled(false);
        onAmountChange?.(0);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc("get_wallet_summary", { p_booking_amount: amount });
      if (cancelled) return;
      setLoading(false);
      if (error || !data?.enabled || Number(data.maxUsable || 0) <= 0) {
        setQuote(null);
        setEnabled(false);
        onAmountChange?.(0);
        return;
      }
      setQuote(data);
      setEnabled(false);
      onAmountChange?.(0);
    }
    load();
    return () => { cancelled = true; };
  }, [bookingAmount]);

  if (!quote || Number(quote.maxUsable || 0) <= 0) return null;
  const maxUsable = Number(quote.maxUsable || 0);

  return (
    <section style={{ marginBottom: 12, padding: 14, border: "1px solid " + theme.colors.border, borderRadius: 16, background: theme.colors.surface }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <strong style={{ fontSize: 13 }}>Use VOYNU Wallet Credits</strong>
          <p style={{ margin: "4px 0 0", color: theme.colors.textMuted, fontSize: 11, lineHeight: 1.45 }}>
            ₹{Number(quote.balance || 0).toLocaleString("en-IN")} available · up to {Number(quote.maxUsagePercent || 0)}% of this booking.
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", color: theme.colors.primary, fontSize: 11.5, fontWeight: 800 }}>
          <input type="checkbox" checked={enabled} disabled={disabled || loading} onChange={(event) => { const next = event.target.checked; setEnabled(next); onAmountChange?.(next ? maxUsable : 0); }} style={{ width: 18, height: 18 }} />
          {enabled ? "Using ₹" + maxUsable.toLocaleString("en-IN") : "Use wallet"}
        </label>
      </div>
      {enabled && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 11, paddingTop: 10, borderTop: "1px dashed " + theme.colors.border, fontSize: 12, color: theme.colors.textMuted }}>
        <span>Wallet credit</span><strong style={{ color: theme.colors.primary }}>-₹{maxUsable.toLocaleString("en-IN")}</strong>
      </div>}
    </section>
  );
}
