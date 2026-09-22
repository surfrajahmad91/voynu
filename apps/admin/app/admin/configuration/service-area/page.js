"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const km = (v) => `${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })} km`;

export default function ServiceAreaPage() {
  const [areas, setAreas] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // RLS only exposes active=true rows to admins here — inactive/draft zones aren't visible yet,
      // which matches this page being read-only until the geofence logic is audited.
      const { data, error: e } = await supabase.from("service_areas").select("id,name,active,pickup_allowed,center_lat,center_lon,radius_km,max_drop_distance_km").eq("active", true).order("name");
      if (cancelled) return;
      if (e) return setError(e.message);
      setAreas(data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href="/admin/configuration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.textFaint, textDecoration: "none", marginBottom: 10 }}>← Configuration</Link>
      <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3 }}>Service area</h1>
      <p style={{ margin: "5px 0 18px", fontSize: 13.5, color: c.textFaint, lineHeight: 1.5, maxWidth: 560 }}>These are the pickup zones and drop-distance limits <code>calculate_booking_fare</code> and the booking flow enforce right now. Editing radius or centre-point rules is intentionally withheld here until the existing customer and booking distance logic is audited — this page is read-only for that reason, not a missing feature.</p>

      {error && <div style={{ padding: 12, borderRadius: 12, background: c.errorBg, color: "#B42318", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {areas === null && !error ? <div style={{ display: "grid", gap: 10 }}>{[0, 1].map((i) => <div key={i} style={{ ...card, height: 96, background: c.border, opacity: 0.5 }} />)}</div>
        : areas && areas.length === 0 ? <div style={{ ...card, color: c.textFaint, fontSize: 13.5 }}>No active service areas are configured — bookings outside a defined zone will be rejected by the booking flow.</div>
        : <div style={{ display: "grid", gap: 10 }}>{areas?.map((a) => <div key={a.id} style={{ ...card, borderLeft: `4px solid ${c.success}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{a.name}</strong>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: a.pickup_allowed ? c.successBg : c.errorBg, color: a.pickup_allowed ? "#0B7A43" : "#B42318" }}>{a.pickup_allowed ? "Pickup allowed" : "Pickup blocked"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 12 }}>
              <Stat label="Pickup radius" value={km(a.radius_km)} />
              <Stat label="Max drop distance" value={km(a.max_drop_distance_km)} />
              <Stat label="Centre point" value={`${a.center_lat.toFixed(4)}, ${a.center_lon.toFixed(4)}`} mono />
            </div>
            <a href={`https://www.google.com/maps?q=${a.center_lat},${a.center_lon}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 700, color: c.primary, textDecoration: "none" }}>View on map ↗</a>
          </div>)}</div>}
    </div>
  </main>;
}

function Stat({ label, value, mono }) {
  return <div><div style={{ fontSize: 10.5, fontWeight: 800, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div><div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, fontFamily: mono ? "ui-monospace,monospace" : "inherit" }}>{value}</div></div>;
}
