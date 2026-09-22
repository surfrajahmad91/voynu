"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const TONES = { info: [c.primaryTint, c.primaryDark], live: [c.successBg, "#0B7A43"], accent: ["#FFF1E7", c.accentDark], muted: ["#EEF3F7", c.textMuted] };

// [title, description, href, stat key, icon, tone]
const AREAS = [
  ["Fleet & customer visibility", "Control which vehicle categories are active, bookable and eligible to appear to customers.", "/admin/vehicle-categories", "visibility", "▦", "info"],
  ["Fleet", "Manage vehicles, status, category and driver assignments.", "/admin/vehicles", "fleet", "▣", "live"],
  ["Pricing", "Manage published fare versions and waiting policy.", "/admin/pricing", "pricing", "₹", "accent"],
  ["Dispatch", "Control manual or automatic driver assignment.", "/admin/dispatch", "dispatch", "⇄", "info"],
  ["Service area", "See the pickup zones and drop-distance limits the booking flow enforces right now.", "/admin/configuration/service-area", "serviceArea", "📍", "live"],
  ["Admin roster", "Who currently has admin access. For the change history itself, see Activity log in the sidebar.", "/admin/configuration/admin-roster", "roster", "🛡", "muted"],
];
const UNAVAILABLE = [
  ["Booking rules", "Advance-booking windows and trip-type constraints aren't a configurable setting yet — they're fixed in code.", "/admin/configuration/booking-rules"],
  ["Notifications", "Customer and Saarthi push notifications run on infrastructure that has no admin-facing controls yet.", "/admin/configuration/notifications"],
];
const RETIRED_STATUS = ["maintenance", "inactive", "unavailable", "retired"];

const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16 };
const skeleton = { display: "inline-block", width: 90, height: 14, borderRadius: 6, background: c.border };

export default function ConfigurationPage() {
  const [summary, setSummary] = useState(null); // null while loading
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cats, vehicles, dispatch, pricing, areas, adminCount] = await Promise.all([
        supabase.from("vehicle_categories").select("id,active,bookable"),
        supabase.from("vehicles").select("id,vehicle_category_id,active,status"),
        supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle(),
        supabase.from("pricing_versions").select("id,name,version").eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("service_areas").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      ]);
      if (cancelled) return;
      const firstError = cats.error || vehicles.error || dispatch.error || pricing.error || areas.error || adminCount.error;
      if (firstError) return setError(firstError.message);
      const vehicleRows = vehicles.data || [];
      const usable = vehicleRows.filter((v) => v.active && !RETIRED_STATUS.includes(v.status || "active"));
      const visible = (cats.data || []).filter((cat) => cat.active && cat.bookable && usable.some((v) => v.vehicle_category_id === cat.id));
      setSummary({
        visibility: { primary: `${visible.length} / ${(cats.data || []).length}`, note: "categories customer-visible" },
        fleet: { primary: `${usable.length} / ${vehicleRows.length}`, note: "vehicles usable" },
        pricing: { primary: pricing.data ? pricing.data.name || `v${pricing.data.version}` : "None set", note: "active fare version" },
        dispatch: { primary: dispatch.data?.mode === "automatic" ? "Automatic" : "Manual", note: "assignment mode" },
        serviceArea: { primary: String(areas.count ?? 0), note: "active service areas" },
        roster: { primary: String(adminCount.count ?? 0), note: "admin accounts" },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <header style={{ margin: "6px 0 16px" }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 }}>Configuration</h1>
        <p style={{ margin: "5px 0 0", fontSize: 13.5, color: c.textFaint, fontWeight: 500, lineHeight: 1.5, maxWidth: 560 }}>System controls are separated by responsibility — each area below owns its own settings.</p>
      </header>

      {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: c.errorBg, color: "#B42318", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: 12 }}>
        {AREAS.map(([title, description, href, key, icon, tone]) => {
          const stat = summary?.[key];
          const [bg, fg] = TONES[tone];
          return <Link key={href} href={href} style={{ ...card, display: "block", padding: 16, textDecoration: "none", color: "inherit", boxShadow: theme.shadow.subtle, borderLeft: `4px solid ${fg}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, background: bg, color: fg, display: "grid", placeItems: "center", fontSize: 17, fontWeight: 700 }}>{icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 15 }}>{title}</strong>
                  <span aria-hidden="true" style={{ color: c.textFaint, fontSize: 18, flexShrink: 0 }}>→</span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: c.textMuted, lineHeight: 1.45 }}>{description}</p>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${c.border}`, display: "flex", alignItems: "baseline", gap: 6 }}>
              {stat ? <><strong style={{ fontSize: 17, fontWeight: 800, color: fg }}>{stat.primary}</strong><span style={{ fontSize: 12, color: c.textFaint, fontWeight: 600 }}>{stat.note}</span></> : <span style={skeleton} />}
            </div>
          </Link>;
        })}
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ margin: "0 2px", fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: c.textFaint }}>Not available yet</h2>
        <p style={{ margin: "5px 2px 12px", fontSize: 12.5, color: c.textFaint, lineHeight: 1.5 }}>These pages explain exactly what's missing and why, rather than pretending there's a setting.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 10 }}>
          {UNAVAILABLE.map(([title, description, href]) => <Link key={href} href={href} style={{ ...card, display: "block", padding: 14, textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 13.5, color: c.text }}>{title}</strong>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, color: c.textFaint, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>Not available</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: c.textFaint, lineHeight: 1.5 }}>{description}</p>
          </Link>)}
        </div>
      </section>
    </div>
  </main>;
}
