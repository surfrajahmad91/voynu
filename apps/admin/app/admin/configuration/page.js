"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const AREAS = [
  ["Fleet & customer visibility", "Control which vehicle categories are active, bookable and eligible to appear to customers.", "/admin/vehicle-categories"],
  ["Fleet", "Manage vehicles, status, category and driver assignments.", "/admin/vehicles"],
  ["Pricing", "Manage published fare versions and waiting policy.", "/admin/pricing"],
  ["Dispatch", "Control manual or automatic driver assignment.", "/admin/dispatch"],
];

export default function ConfigurationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [summary, setSummary] = useState({ categories: 0, visible: 0, vehicles: 0, activeVehicles: 0, dispatch: "manual" });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) return router.replace("/login");
      if (!ADMIN_EMAILS.includes(email)) return setChecking(false);
      if (!cancelled) { setAuthorized(true); setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      const [cats, vehicles, dispatch] = await Promise.all([
        supabase.from("vehicle_categories").select("id,active,bookable"),
        supabase.from("vehicles").select("id,vehicle_category_id,active,status"),
        supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle(),
      ]);
      if (cats.error) return setError(cats.error.message);
      if (vehicles.error) return setError(vehicles.error.message);
      if (dispatch.error) return setError(dispatch.error.message);
      const vehicleRows = vehicles.data || [];
      const usable = vehicleRows.filter(v => v.active && !["maintenance", "inactive", "unavailable", "retired"].includes(v.status || "active"));
      const visible = (cats.data || []).filter(c => c.active && c.bookable && usable.some(v => v.vehicle_category_id === c.id));
      setSummary({ categories: (cats.data || []).length, visible: visible.length, vehicles: vehicleRows.length, activeVehicles: usable.length, dispatch: dispatch.data?.mode === "automatic" ? "automatic" : "manual" });
    })();
  }, [authorized]);

  if (checking) return <main style={styles.center}>Checking admin access…</main>;
  if (!authorized) return <main style={styles.center}><div><h1>Access denied</h1><Link href="/admin">Return to Admin</Link></div></main>;

  return <main style={styles.page}>
    <header style={styles.header}><div style={styles.headerInner}><div><div style={styles.eyebrow}>VOYNU ADMIN</div><h1 style={styles.title}>Configuration</h1><p style={styles.subtitle}>System controls are separated by responsibility. Changes should be made in the relevant module.</p></div><Link href="/admin/control-centre" style={styles.headerLink}>← Control Centre</Link></div></header>
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}
      <section style={styles.metrics}>
        <Metric label="Categories" value={summary.categories} />
        <Metric label="Customer visible" value={summary.visible} accent={theme.colors.success} />
        <Metric label="Fleet vehicles" value={summary.vehicles} />
        <Metric label="Usable fleet" value={summary.activeVehicles} accent={theme.colors.primary} />
        <Metric label="Dispatch" value={summary.dispatch.toUpperCase()} />
      </section>
      <section style={styles.card}><h2 style={styles.sectionTitle}>Configuration areas</h2><p style={styles.sectionText}>These are the current verified configuration surfaces. New settings will be added only after their database and application dependencies are verified.</p><div style={styles.grid}>{AREAS.map(([title, description, href]) => <Link href={href} key={href} style={styles.tile}><span><strong>{title}</strong><small>{description}</small></span><span style={styles.arrow}>→</span></Link>)}</div></section>
      <section style={styles.card}><h2 style={styles.sectionTitle}>Planned controls</h2><div style={styles.planned}><div><strong>Service area</strong><span>Radius/service-centre rules will be exposed after the existing customer and booking distance logic is audited.</span></div><div><strong>Booking rules</strong><span>Advance booking, trip-type and operational constraints will be surfaced without changing existing booking behaviour.</span></div><div><strong>Notifications</strong><span>Customer and Saarthi notification controls will be added after the current notification flow is mapped.</span></div><div><strong>Access & audit</strong><span>Admin roles, permissions and change history will be introduced as a separate security layer.</span></div></div></section>
    </div>
  </main>;
}

function Metric({ label, value, accent }) { return <div style={styles.metric}><span>{label}</span><strong style={{ color: accent || theme.colors.text }}>{value}</strong></div>; }

const styles = {
  page: { minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily },
  center: { minHeight: "100vh", display: "grid", placeItems: "center", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily },
  header: { background: theme.colors.navy, color: "#fff", borderBottom: `3px solid ${theme.colors.accent}` },
  headerInner: { width: `min(${theme.maxWidth.wide}px,calc(100% - 28px))`, margin: "0 auto", padding: "24px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: theme.colors.accentLight, fontSize: 10, fontWeight: 800, letterSpacing: 1.5 },
  title: { margin: "4px 0 0", fontSize: "clamp(28px,4vw,40px)", letterSpacing: -1 },
  subtitle: { margin: "6px 0 0", color: "rgba(255,255,255,.72)", fontSize: 12, maxWidth: 650 },
  headerLink: { color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,.25)", borderRadius: theme.radius.sm, padding: "8px 11px", fontSize: 10, fontWeight: 800 },
  container: { width: `min(${theme.maxWidth.wide}px,calc(100% - 28px))`, margin: "0 auto", padding: "20px 0 60px" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10, marginBottom: 16 },
  metric: { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: 15, boxShadow: theme.shadow.card },
  card: { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.lg, padding: 18, marginBottom: 16, boxShadow: theme.shadow.card },
  sectionTitle: { margin: 0, fontSize: 17 },
  sectionText: { margin: "5px 0 0", color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 1.5 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10, marginTop: 15 },
  tile: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 15, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, textDecoration: "none", color: theme.colors.text, background: "#fff" },
  tileStrong: { fontSize: 13 },
  arrow: { color: theme.colors.textFaint, fontSize: 18 },
  planned: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginTop: 15 },
  plannedItem: { padding: 14, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md },
  error: { marginBottom: 14, padding: 11, borderRadius: theme.radius.sm, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 11 },
};

styles.tile["--unused"] = styles.tileStrong;
