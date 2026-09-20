"use client";

import { useState } from "react";
import { theme } from "../../../shared/lib/theme";
import { LATE_REASONS, LOCATION_REASONS, formatDistance, formatMinutes, needsCollection } from "../lib/tripWorkflow";

const OTHER = "Other";

const pill = (active) => ({
  padding: "9px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", textAlign: "left",
  border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
  background: active ? theme.colors.primaryTint : "#fff", color: active ? theme.colors.primary : theme.colors.text,
});

export default function TripActionSheet({ sheet, busy, error, onCancel, onConfirm }) {
  const { booking, step, needs } = sheet;
  const cash = step?.next === "trip_completed" && needsCollection(booking);
  const fare = Number(booking?.fare) || 0;
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [colStatus, setColStatus] = useState("collected");
  const [amount, setAmount] = useState("");
  const [colNote, setColNote] = useState("");
  const [localError, setLocalError] = useState("");

  const needsReason = !!needs && (needs.late || needs.location);
  const options = needs?.location && !needs?.late ? LOCATION_REASONS : needs?.late && !needs?.location ? LATE_REASONS : [...new Set([...LATE_REASONS, ...LOCATION_REASONS])];
  const place = needs?.target === "pickup" ? "pickup point" : "destination";

  const submit = () => {
    setLocalError("");
    let reason = null;
    if (needsReason) {
      if (!choice) return setLocalError("Please choose what best describes the reason.");
      if (choice === OTHER && note.trim().length < 4) return setLocalError("Please type a short reason.");
      reason = choice === OTHER ? note.trim() : note.trim() ? `${choice} — ${note.trim()}` : choice;
    }
    let collection = null;
    if (cash) {
      if (colStatus === "collected") collection = { status: "collected", amount: fare };
      if (colStatus === "partial") {
        const value = Number(amount);
        if (!(value > 0 && value < fare)) return setLocalError(`Enter the amount you collected (less than ₹${fare}).`);
        if (colNote.trim().length < 4) return setLocalError("Please say why the full fare was not collected.");
        collection = { status: "partial", amount: value, note: colNote.trim() };
      }
      if (colStatus === "not_collected") {
        if (colNote.trim().length < 4) return setLocalError("Please say why the fare was not collected.");
        collection = { status: "not_collected", amount: 0, note: colNote.trim() };
      }
    }
    onConfirm({ reason, collection });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(13,27,42,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "min(520px,100%)", maxHeight: "92dvh", overflowY: "auto", background: "#fff", borderRadius: "22px 22px 0 0", padding: "18px 18px 22px", boxShadow: "0 -20px 60px rgba(0,0,0,.25)", fontFamily: theme.fontFamily }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: theme.colors.primary, textTransform: "uppercase" }}>{step?.label}</div>
        <h3 style={{ margin: "4px 0 10px", fontSize: 18 }}>{needsReason ? "Quick note needed" : "Confirm payment"}</h3>

        {needs?.location && (
          <div style={{ padding: 11, borderRadius: 12, background: "#FFF7E8", color: "#8A5700", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            {needs.distanceM ? `You are about ${formatDistance(needs.distanceM)} from the ${place}.` : `Your position doesn't match the ${place}.`} This is recorded for the passenger's safety.
          </div>
        )}
        {needs?.late && (
          <div style={{ padding: 11, borderRadius: 12, background: "#FFF7E8", color: "#8A5700", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            This step is about {formatMinutes(needs.lateMinutes)} later than planned.
          </div>
        )}

        {needsReason && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>What happened?</div>
            <div style={{ display: "grid", gap: 7 }}>
              {[...options, OTHER].map((option) => <button key={option} type="button" onClick={() => setChoice(option)} style={pill(choice === option)}>{option}</button>)}
            </div>
            {choice && <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={choice === OTHER ? "Type the reason" : "Add a detail (optional)"} style={{ width: "100%", boxSizing: "border-box", marginTop: 9, border: `1px solid ${theme.colors.border}`, borderRadius: 10, padding: 10, fontSize: 13, fontFamily: "inherit" }} />}
          </div>
        )}

        {cash && (
          <div style={{ marginTop: needsReason ? 16 : 4 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Cash to collect: ₹{fare}</div>
            <div style={{ display: "grid", gap: 7 }}>
              <button type="button" onClick={() => setColStatus("collected")} style={pill(colStatus === "collected")}>Collected in full · ₹{fare}</button>
              <button type="button" onClick={() => setColStatus("partial")} style={pill(colStatus === "partial")}>Part payment only</button>
              <button type="button" onClick={() => setColStatus("not_collected")} style={pill(colStatus === "not_collected")}>Not collected</button>
            </div>
            {colStatus === "partial" && <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount collected (₹)" style={{ width: "100%", boxSizing: "border-box", marginTop: 9, border: `1px solid ${theme.colors.border}`, borderRadius: 10, padding: 11, fontSize: 14 }} />}
            {colStatus !== "collected" && <textarea value={colNote} onChange={(e) => setColNote(e.target.value)} rows={2} placeholder="What happened? (passenger short of cash, UPI failed, dispute…)" style={{ width: "100%", boxSizing: "border-box", marginTop: 9, border: `1px solid ${theme.colors.border}`, borderRadius: 10, padding: 10, fontSize: 13, fontFamily: "inherit" }} />}
            <div style={{ marginTop: 7, fontSize: 10.5, color: theme.colors.textFaint }}>The trip still completes if the fare could not be collected. VOYNU follows up with the passenger.</div>
          </div>
        )}

        {(localError || error) && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12, fontWeight: 700 }}>{localError || error}</div>}

        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ flex: 1, minHeight: 46, borderRadius: 13, border: `1px solid ${theme.colors.border}`, background: "#fff", fontWeight: 800 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy} style={{ flex: 1.4, minHeight: 46, borderRadius: 13, border: 0, background: theme.gradients.primary, color: "#fff", fontWeight: 900, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
