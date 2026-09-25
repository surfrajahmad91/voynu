"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";

export default function WalletCheckoutCard({ bookingAmount, onAmountChange, disabled = false }) {
  const [quote, setQuote] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  // Remember the customer's own choice across re-quotes triggered by unrelated changes
  // (selecting a different plan, wallet input, etc.) so it isn't silently discarded.
  const wantsWallet = useRef(false);

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
        setQuote(data && data.enabled ? data : null);
        setEnabled(false);
        onAmountChange?.(0);
        return;
      }
      setQuote(data);
      const stillWants = wantsWallet.current;
      setEnabled(stillWants);
      onAmountChange?.(stillWants ? Number(data.maxUsable || 0) : 0);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingAmount]);

  const maxUsable = Number(quote?.maxUsable || 0);
  const balance = Number(quote?.balance || 0);

  const toggle = (event) => {
    const next = event.target.checked;
    wantsWallet.current = next;
    setEnabled(next);
    onAmountChange?.(next ? maxUsable : 0);
  };

  if (!quote) return null;

  if (maxUsable <= 0) {
    return (
      <section className="walletCard walletCard-empty">
        <div className="walletRow">
          <div>
            <strong>VOYNU Wallet</strong>
            <p>{balance > 0 ? `Your ₹${balance.toLocaleString("en-IN")} balance can't be used on this booking.` : "You have no wallet credits to use yet."}</p>
          </div>
        </div>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="walletCard">
      <div className="walletRow">
        <div>
          <strong>Use VOYNU Wallet Credits</strong>
          <p>₹{balance.toLocaleString("en-IN")} available · up to {Number(quote.maxUsagePercent || 0)}% of this booking.</p>
        </div>
        <label className={enabled ? "walletToggle on" : "walletToggle"}>
          <input type="checkbox" checked={enabled} disabled={disabled || loading} onChange={toggle} />
          <span>{enabled ? `Using ₹${maxUsable.toLocaleString("en-IN")}` : "Use wallet"}</span>
        </label>
      </div>
      {enabled && (
        <div className="walletApplied">
          <span>Wallet credit</span><strong>− ₹{maxUsable.toLocaleString("en-IN")}</strong>
        </div>
      )}
      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .walletCard{margin-bottom:12px;padding:14px;border-radius:16px;background:var(--voynu-surface,#fff);border:1px solid var(--voynu-border,#EEF3F7)}
  .walletCard-empty{background:var(--voynu-bg,#F7F9FC)}
  .walletRow{display:flex;justify-content:space-between;align-items:center;gap:12px}
  .walletRow strong{font-size:13.5px;color:var(--voynu-navy,#0A2337)}
  .walletRow p{margin:4px 0 0;color:var(--voynu-muted,#5B6B7C);font-size:11.5px;line-height:1.45}
  .walletToggle{display:flex;align-items:center;gap:8px;flex:0 0 auto;padding:9px 12px;border-radius:12px;border:1.5px solid var(--voynu-border-strong,#D8DEE8);background:#fff;color:var(--voynu-text,#1E3348);font-size:12px;font-weight:700;white-space:nowrap}
  .walletToggle.on{border-color:var(--voynu-teal,#0A7FA6);background:var(--voynu-primary-tint,#E7F4F8);color:var(--voynu-teal-deep,#00456B)}
  .walletToggle input{width:18px;height:18px;accent-color:var(--voynu-teal,#0A7FA6)}
  .walletApplied{display:flex;justify-content:space-between;margin-top:11px;padding-top:10px;border-top:1px dashed var(--voynu-border-strong,#D8DEE8);font-size:12.5px;color:var(--voynu-muted,#5B6B7C)}
  .walletApplied strong{color:var(--voynu-teal-deep,#00456B)}
`;
