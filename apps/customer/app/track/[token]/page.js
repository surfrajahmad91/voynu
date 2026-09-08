"use client";
import { use, useEffect, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";
import LiveTripMap from "../../../../../shared/components/LiveTripMap";

const STATUS_LABEL = { driver_assigned: "Driver assigned", on_the_way: "Driver on the way", arrived: "Driver has arrived", trip_started: "Trip in progress", trip_completed: "Trip completed", cancelled: "Trip cancelled" };

export default function SharedTripPage({ params }) {
  const { token } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let dead = false;
    const load = async () => {
      const { data: result, error: err } = await supabase.rpc("get_shared_trip", { p_token: token });
      if (dead) return;
      if (err) { setError("This trip link is no longer available."); setLoading(false); return; }
      if (!result) { setError("This trip link is invalid or has expired."); setLoading(false); return; }
      setData(result);
      setLoading(false);
    };
    load();
    const id = setInterval(load, 15000);
    return () => { dead = true; clearInterval(id); };
  }, [token]);

  const box = { minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 40px" };
  const header = <div style={{ width: "100%", padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}` }}><img src="/icon.svg" alt="VOYNU" width={34} height={34} style={{ borderRadius: 10 }} /><span style={{ fontWeight: 800, fontSize: 16 }}>VOYNU</span><span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: theme.colors.textFaint }}>Shared trip</span></div>;

  if (loading) return <main style={box}>{header}<div style={{ marginTop: 60, width: 34, height: 34, border: "3px solid rgba(10,127,166,.18)", borderTopColor: theme.colors.primary, borderRadius: "50%" }} /></main>;
  if (error || !data) return <main style={box}>{header}<div style={{ marginTop: 60, textAlign: "center", padding: "0 24px" }}><div style={{ fontSize: 15, fontWeight: 800 }}>{error || "This trip link is invalid."}</div><div style={{ marginTop: 8, fontSize: 12.5, color: theme.colors.textFaint }}>Ask whoever shared this with you for a fresh link.</div></div></main>;

  if (!data.active) {
    const label = STATUS_LABEL[data.status] || "This trip";
    return <main style={box}>{header}<div style={{ marginTop: 60, textAlign: "center", padding: "0 24px" }}><div style={{ fontSize: 15, fontWeight: 800 }}>{label}</div><div style={{ marginTop: 8, fontSize: 12.5, color: theme.colors.textFaint }}>Live tracking is only available while a trip is in progress.</div></div></main>;
  }

  const loc = (data.driverLat != null && data.driverLon != null) ? { lat: data.driverLat, lon: data.driverLon, updatedAt: data.locationUpdatedAt } : null;
  const target = data.status === "trip_started" ? "destination" : "pickup";

  return (
    <main style={box}>
      {header}
      <div style={{ width: "min(560px,calc(100% - 32px))", marginTop: 20 }}>
        <div style={{ padding: "12px 16px", borderRadius: theme.radius.lg, background: theme.colors.primaryTint, color: theme.colors.primaryDark, fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{STATUS_LABEL[data.status] || "Trip in progress"}</div>
        <LiveTripMap pickup={{ lat: data.pickupLat, lon: data.pickupLon }} destination={{ lat: data.dropLat, lon: data.dropLon }} driverLocation={loc} targetType={target} trafficEta />
        <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: theme.radius.lg, background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: 10.5, color: theme.colors.textFaint, fontWeight: 800, textTransform: "uppercase" }}>Driver</div>
          <div style={{ marginTop: 5, fontSize: 14.5, fontWeight: 800 }}>{data.driverName || "VOYNU driver"}</div>
          <div style={{ marginTop: 3, fontSize: 12, color: theme.colors.textMuted }}>{data.vehicleLabel || ""}{data.registrationNumber ? ` · ${data.registrationNumber}` : ""}</div>
          <div style={{ marginTop: 10, fontSize: 11, color: theme.colors.textFaint, lineHeight: 1.5 }}>{data.pickupName} → {data.dropName}</div>
          {loc?.updatedAt && <div style={{ marginTop: 8, fontSize: 10, color: theme.colors.textFaint }}>Location updated {new Date(loc.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>}
        </div>
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 10.5, color: theme.colors.textFaint }}>This is a shared, read-only view. Refreshes automatically every 15 seconds.</div>
      </div>
    </main>
  );
}
