"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../../../shared/lib/theme";

const ACTIVE_STATUSES = ["confirmed", "driver_assigned", "on_the_way", "arrived", "trip_started"];
const fmt = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const ref = (id) => id ? `VOY-${id.slice(0, 8).toUpperCase()}` : "—";

const cardStyle = {
  background: "#fff",
  border: `1px solid ${theme.colors.border}`,
  borderRadius: 14,
  padding: 14,
};

export default function AdminDashboardOperations() {
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [lastCheck, setLastCheck] = useState(null);

  const load = async (runWatchdog = true) => {
    setError("");
    if (runWatchdog) {
      const { error: watchdogError } = await supabase.rpc("check_trip_timing_alerts");
      if (watchdogError) setError(watchdogError.message);
    }

    const [{ data: bs, error: be }, { data: as, error: ae }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,booking_status,passenger_name,pickup_name,drop_name,driver_id,vehicle_id,scheduled_pickup_at,scheduled_completion_at,trip_started_at,trip_start_on_time,trip_start_delay_minutes,completed_at,trip_completion_on_time,trip_completion_delay_minutes")
        .in("booking_status", [...ACTIVE_STATUSES, "trip_completed"])
        .order("scheduled_pickup_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("trip_timing_alerts")
        .select("id,booking_id,alert_type,threshold_minutes,created_at,acknowledged_at")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (be) setError(be.message);
    else setBookings(bs || []);
    if (ae) setError(ae.message);
    else setAlerts(as || []);
    setLastCheck(new Date());
    setReady(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session || !ADMIN_EMAILS.includes(email)) return;
      if (!cancelled) setAuthorized(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authorized) return;
    load(true);
    const timer = setInterval(() => load(true), 60000);
    return () => clearInterval(timer);
  }, [authorized]);

  const metrics = useMemo(() => {
    const now = Date.now();
    return {
      attention: alerts.length + bookings.filter((b) => b.trip_start_on_time === false || b.trip_completion_on_time === false).length,
      notStarted: bookings.filter((b) => b.scheduled_pickup_at && !b.trip_started_at && ACTIVE_STATUSES.includes(b.booking_status) && new Date(b.scheduled_pickup_at).getTime() < now).length,
      active: bookings.filter((b) => b.booking_status === "trip_started").length,
      completed: bookings.filter((b) => b.booking_status === "trip_completed").length,
    };
  }, [bookings, alerts]);

  const attention = useMemo(() => bookings
    .filter((b) => alerts.some((a) => a.booking_id === b.id) || b.trip_start_on_time === false || b.trip_completion_on_time === false)
    .slice(0, 3), [bookings, alerts]);

  const acknowledge = async (alert) => {
    const { error: e } = await supabase
      .from("trip_timing_alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", alert.id);
    if (e) return setError(e.message);
    setAlerts((current) => current.filter((a) => a.id !== alert.id));
  };

  if (!authorized) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto 18px", padding: "0 14px" }} aria-label="Operations overview">
      <div style={{ background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(22,36,29,.04)" }}>
        <header style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${theme.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 900, color: theme.colors.primary }}>OPERATIONS</div>
            <h2 style={{ margin: "3px 0 0", fontSize: 20, color: theme.colors.text }}>Trip control centre</h2>
            <p style={{ margin: "5px 0 0", color: theme.colors.textFaint, fontSize: 11, lineHeight: 1.45 }}>
              Live view of trip starts, active trips, completion timing and operational attention items.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => load(true)} style={{ padding: "8px 11px", borderRadius: 8, border: `1px solid ${theme.colors.border}`, background: "#fff", color: theme.colors.text, fontWeight: 800, fontSize: 10, cursor: "pointer" }}>REFRESH</button>
            <Link href="/admin/trip-monitor" style={{ padding: "8px 11px", borderRadius: 8, background: theme.colors.primary, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 10 }}>FULL MONITOR</Link>
          </div>
        </header>

        <div style={{ padding: 14 }}>
          {error && <div style={{ marginBottom: 12, padding: 10, borderRadius: 9, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 11 }}>{error}</div>}

          {!ready ? (
            <div style={{ padding: 18, borderRadius: 12, background: theme.colors.bg, color: theme.colors.textFaint, fontSize: 11 }}>Loading operations status…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
                {[
                  ["Attention", metrics.attention, theme.colors.error],
                  ["Not started on time", metrics.notStarted, theme.colors.warning],
                  ["Active trips", metrics.active, theme.colors.primary],
                  ["Completed today/view", metrics.completed, "#45564c"],
                ].map(([label, value, color]) => (
                  <div key={label} style={cardStyle}>
                    <div style={{ fontSize: 9.5, color: theme.colors.textFaint, fontWeight: 900, textTransform: "uppercase", lineHeight: 1.3 }}>{label}</div>
                    <div style={{ marginTop: 5, fontSize: 25, fontWeight: 900, color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
                <div style={{ ...cardStyle, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: theme.colors.text, textTransform: "uppercase", marginBottom: 8 }}>Needs attention</div>
                  {attention.length === 0 ? (
                    <div style={{ padding: 10, borderRadius: 9, background: theme.colors.bg, color: theme.colors.textFaint, fontSize: 11 }}>No timing issues right now.</div>
                  ) : attention.map((b) => {
                    const related = alerts.filter((a) => a.booking_id === b.id);
                    const startLate = b.trip_start_on_time === false;
                    const completionLate = b.trip_completion_on_time === false;
                    return (
                      <div key={b.id} style={{ padding: "9px 0", borderTop: `1px solid ${theme.colors.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: 12 }}>{ref(b.id)}</strong>
                            <span style={{ color: theme.colors.textMuted, fontSize: 11 }}> · {b.passenger_name || "Passenger"}</span>
                            <div style={{ marginTop: 3, color: theme.colors.textMuted, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.pickup_name} → {b.drop_name}</div>
                          </div>
                          <span style={{ alignSelf: "flex-start", padding: "4px 7px", borderRadius: 999, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>
                            {startLate ? "Late start" : completionLate ? "Late completion" : "Overdue"}
                          </span>
                        </div>
                        <div style={{ marginTop: 5, display: "flex", gap: 12, flexWrap: "wrap", color: theme.colors.textFaint, fontSize: 9.5 }}>
                          <span>Start: {fmt(b.scheduled_pickup_at)}</span>
                          {b.trip_started_at && <span>Actual: {fmt(b.trip_started_at)}</span>}
                          {startLate && <span style={{ color: theme.colors.error, fontWeight: 800 }}>{b.trip_start_delay_minutes} min late</span>}
                          {completionLate && <span style={{ color: theme.colors.error, fontWeight: 800 }}>{b.trip_completion_delay_minutes} min late</span>}
                        </div>
                        {related.length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>{related.map((a) => <button key={a.id} onClick={() => acknowledge(a)} style={{ border: 0, background: "transparent", color: theme.colors.primary, fontSize: 9.5, fontWeight: 900, padding: 0, cursor: "pointer" }}>ACKNOWLEDGE ALERT</button>)}</div>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ ...cardStyle, minWidth: 190 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: theme.colors.text, textTransform: "uppercase", marginBottom: 8 }}>Control links</div>
                  <div style={{ display: "grid", gap: 7 }}>
                    <Link href="/admin/trip-monitor" style={{ padding: "9px 10px", borderRadius: 8, background: theme.colors.primaryTint, color: theme.colors.primary, textDecoration: "none", fontSize: 10, fontWeight: 900 }}>Trip Monitor →</Link>
                    <Link href="/admin/dispatch" style={{ padding: "9px 10px", borderRadius: 8, background: theme.colors.bg, color: theme.colors.text, textDecoration: "none", fontSize: 10, fontWeight: 900 }}>Dispatch →</Link>
                    <Link href="/admin/fleet" style={{ padding: "9px 10px", borderRadius: 8, background: theme.colors.bg, color: theme.colors.text, textDecoration: "none", fontSize: 10, fontWeight: 900 }}>Fleet →</Link>
                  </div>
                </div>
              </div>

              {lastCheck && <div style={{ marginTop: 10, fontSize: 9, color: theme.colors.textFaint }}>Last check: {lastCheck.toLocaleTimeString("en-IN")}. Auto-refreshes every minute while Admin is open.</div>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
