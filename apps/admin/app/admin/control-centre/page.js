"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const AREAS = [
  ["Operations", "Bookings, drivers and day-to-day operations", "/admin", "▦"],
  ["Dispatch", "Assignment queue and dispatch mode", "/admin/dispatch", "⇄"],
  ["Vehicle Categories", "Customer visibility, capacity and ordering", "/admin/vehicle-categories", "▤"],
  ["Fleet", "Vehicles, status and assignments", "/admin/vehicles", "▱"],
  ["Pricing", "Fare versions and waiting policy", "/admin/pricing", "₹"],
  ["Configuration", "System-wide configuration surfaces and future controls", "/admin/configuration", "⚙"],
];

export default function ControlCentrePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
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
      const [categoryResult, vehicleResult] = await Promise.all([
        supabase.from("vehicle_categories").select("id,name,slug,active,bookable,sort_order,passenger_capacity,luggage_capacity").order("sort_order"),
        supabase.from("vehicles").select("id,vehicle_category_id,active,status"),
      ]);
      if (categoryResult.error) return setError(categoryResult.error.message);
      if (vehicleResult.error) return setError(vehicleResult.error.message);
      setCategories(categoryResult.data || []);
      setVehicles(vehicleResult.data || []);
    })();
  }, [authorized]);

  const activeVehicleCount = (categoryId) => vehicles.filter((v) => v.vehicle_category_id === categoryId && v.active && !["maintenance", "inactive", "unavailable", "retired"].includes(v.status || "active")).length;
  const visibleCount = categories.filter((c) => c.active && c.bookable && activeVehicleCount(c.id) > 0).length;

  if (checking) return <main style={styles.center}>Checking admin access…</main>;
  if (!authorized) return <main style={styles.center}><div><h1>Access denied</h1><Link href="/admin">Return to Admin</Link></div></main>;

  return <main style={styles.page}>
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <div><div style={styles.eyebrow}>VOYNU ADMIN</div><h1 style={styles.title}>Control Centre</h1><p style={styles.subtitle}>A cleaner entry point for operations and system configuration.</p></div>
        <Link href="/admin" style={styles.headerLink}>Classic dashboard →</Link>
      </div>
    </header>
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}
      <section style={styles.metrics}>
        <Metric label="Vehicle categories" value={categories.length} />
        <Metric label="Customer-visible" value={visibleCount} accent={theme.colors.success} />
        <Metric label="Fleet vehicles" value={vehicles.length} />
        <Metric label="Active fleet" value={vehicles.filter((v) => v.active && !["maintenance", "inactive", "unavailable", "retired"].includes(v.status || "active")).length} accent={theme.colors.primary} />
      </section>
      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Administration</h2>
        <p style={styles.sectionText}>Each operational area is kept separate so configuration changes do not get mixed with live booking work.</p>
        <div style={styles.grid}>{AREAS.map(([title, description, href, icon]) => <Link href={href} key={href} style={styles.tile}><span style={styles.icon}>{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span style={styles.arrow}>→</span></Link>)}</div>
      </section>
      <section style={styles.card}>
        <div style={styles.row}><div><h2 style={styles.sectionTitle}>Customer vehicle visibility</h2><p style={styles.sectionText}>The customer app now receives only categories that are active, bookable and backed by at least one usable active fleet vehicle.</p></div><Link href="/admin/vehicle-categories" style={styles.button}>Configure</Link></div>
        <div style={styles.categoryGrid}>{categories.map((category) => { const count = activeVehicleCount(category.id); const visible = category.active && category.bookable && count > 0; return <div key={category.id} style={styles.category}><div style={styles.row}><strong>{category.name}</strong><span style={visible ? styles.visible : styles.hidden}>{visible ? "VISIBLE" : "HIDDEN"}</span></div><div style={styles.meta}>{count} active fleet vehicle{count === 1 ? "" : "s"} · {category.passenger_capacity} passengers · {category.luggage_capacity} luggage</div></div>; })}</div>
      </section>
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
  subtitle: { margin: "6px 0 0", color: "rgba(255,255,255,.72)", fontSize: 12 },
  headerLink: { color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,.25)", borderRadius: theme.radius.sm, padding: "8px 11px", fontSize: 10, fontWeight: 800 },
  container: { width: `min(${theme.maxWidth.wide}px,calc(100% - 28px))`, margin: "0 auto", padding: "20px 0 60px" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 },
  metric: { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: 15, boxShadow: theme.shadow.card },
  card: { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.lg, padding: 18, marginBottom: 16, boxShadow: theme.shadow.card },
  sectionTitle: { margin: 0, fontSize: 17 },
  sectionText: { margin: "5px 0 0", color: theme.colors.textMuted, fontSize: 11.5, lineHeight: 1.5 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 15 },
  tile: { display: "flex", alignItems: "center", gap: 11, padding: 13, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, textDecoration: "none", color: theme.colors.text, background: "#fff" },
  icon: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 11, background: theme.colors.primaryTint, color: theme.colors.primaryDark, fontWeight: 900, fontSize: 17 },
  arrow: { marginLeft: "auto", color: theme.colors.textFaint },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  button: { display: "inline-block", padding: "8px 11px", borderRadius: theme.radius.sm, background: theme.colors.primary, color: "#fff", textDecoration: "none", fontSize: 10, fontWeight: 800 },
  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, marginTop: 15 },
  category: { padding: 13, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md },
  meta: { marginTop: 6, color: theme.colors.textMuted, fontSize: 10.5 },
  visible: { padding: "3px 6px", borderRadius: 999, background: theme.colors.successBg, color: theme.colors.success, fontSize: 8.5, fontWeight: 900 },
  hidden: { padding: "3px 6px", borderRadius: 999, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 8.5, fontWeight: 900 },
  error: { marginBottom: 14, padding: 11, borderRadius: theme.radius.sm, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 11 },
};