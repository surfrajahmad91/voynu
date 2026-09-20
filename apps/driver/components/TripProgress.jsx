"use client";

import { theme } from "../../../shared/lib/theme";
import { progressSteps } from "../lib/tripWorkflow";

export default function TripProgress({ booking, accepted }) {
  const steps = progressSteps(booking, accepted);
  const current = steps.find((s) => s.state === "current") || steps.find((s) => s.state === "todo");
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {steps.map((s) => <div key={s.key} title={s.label} style={{ flex: 1, height: 5, borderRadius: 4, background: s.state === "done" ? theme.colors.primary : s.state === "current" ? "#F5A524" : "#E4EAF0" }} />)}
      </div>
      <div style={{ marginTop: 5, fontSize: 10, fontWeight: 800, color: theme.colors.textMuted }}>{booking?.booking_status === "trip_completed" ? "Completed" : current ? `Next: ${current.label}` : ""}</div>
    </div>
  );
}
