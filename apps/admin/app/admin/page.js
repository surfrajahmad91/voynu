"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";
import { theme } from "../../../../shared/lib/theme";

const modules = [
  { href: "/admin/bookings", label: "Bookings", description: "View, confirm, assign, cancel and communicate on bookings.", accent: theme.colors.primary },
  { href: "/admin/drivers", label: "Drivers", description: "Manage drivers, availability, login status and vehicle assignment.", accent: "#2563a8" },
  { href: "/admin/vehicles", label: "Fleet", description: "Manage actual vehicles, status, category and capacity.", accent: "#45564c" },
  { href: "/admin/dispatch", label: "Dispatch", description: "Control manual or automatic assignment and dispatch queue.", accent: "#7a5a00" },
  { href: "/admin/trip-monitor", label: "Trip Monitor", description: "Track scheduled starts, active trips, completion and delays.", accent: "#a85b00" },
  { href: "/admin/pricing", label: "Pricing", description: "Manage pricing versions and fare rules.", accent: "#1283a3" },
  { href: "/admin/vehicle-categories", label: "Vehicle Categories", description: "Control customer-facing vehicle categories and capacity.", accent: "#6a4ca3" },
  { href: "/admin/configuration", label: "Configuration", description: "Review operational configuration and system readiness.", accent: "#45564c" },
];

const status = (value) => String(value || "").replace(/_/g, " ");

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatchMode, setDispatchMode] = useState("manual");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) { router.replace("/login"); return; }
      if (!ADMIN_EMAILS.includes(email)) { setChecking(false); return; }
      if (!cancelled) { setAuthorized(true); setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      setError("");
      const [{ data: bs, error: be }, { data: ds, error: de }, { data: vs, error: ve }, { data: dm, error: de2 }] = await Promise.all([
        supabase.from("bookings").select("id,booking_status,payment_status,fare,driver_id").order("created_at", { ascending: false }),
        supabase.from("drivers").select("id,active,availability_status,vehicle_id"),
        supabase.from("vehicles").select("id,active,status"),
        supabase.from("dispatch_settings").select("mode").eq("id", true).maybeSingle(),
      ]);
      const firstError = be || de || ve || de2;
      if (firstError) setError(firstError.message);
      setBookings(bs || []); setDrivers(ds || []); setVehicles(vs || []); setDispatchMode(dm?.mode === "automatic" ? "automatic" : "manual");
    })();
  }, [authorized]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pendingPayment: bookings.filter((b) => b.payment_status === "pending").length,
    awaitingAssignment: bookings.filter((b) => b.booking_status === "confirmed" && !b.driver_id).length,
    activeTrips: bookings.filter((b) => b.booking_status === "trip_started").length,
    completed: bookings.filter((b) => b.booking_status === "trip_completed").length,
    availableDrivers: drivers.filter((d) => d.active !== false && d.availability_status === "available" && d.vehicle_id).length,
    usableVehicles: vehicles.filter((v) => v.active && v.status === "active").length,
  }), [bookings, drivers, vehicles]);

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking access…</main>;
  if (!authorized) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><div><h1>Access denied</h1><Link href="/login">Login</Link></div></main>;

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ color: theme.colors.primary, fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase" }}>VOYNU Admin</div>
          <h1 style={{ margin: "5px 0 0", fontSize: 28 }}>Operations dashboard</h1>
          <p style={{ margin: "7px 0 0", color: theme.colors.textFaint, fontSize: 13, lineHeight: 1.5 }}>One home for bookings, drivers, fleet, dispatch, trips, pricing and configuration.</p>
        </header>

        {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12 }}>{error}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10, marginBottom: 20 }} aria-label="Operations summary">
          {[
            ["Bookings", stats.total], ["Payment pending", stats.pendingPayment], ["Awaiting assignment", stats.awaitingAssignment], ["Active trips", stats.activeTrips], ["Completed", stats.completed], ["Available drivers", stats.availableDrivers], ["Usable vehicles", stats.usableVehicles],
          ].map(([label, value]) => <div key={label} style={{ background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, padding: 13 }}><div style={{ fontSize: 9.5, fontWeight: 900, color: theme.colors.textFaint, textTransform: "uppercase", lineHeight: 1.35 }}>{label}</div><div style={{ marginTop: 5, fontSize: 23, fontWeight: 900 }}>{value}</div></div>)}
        </section>

        <section style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, marginBottom: 10 }}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Admin modules</h2><p style={{ margin: "4px 0 0", color: theme.colors.textFaint, fontSize: 11 }}>Each operational area has its own page. No pages are embedded inside another page.</p></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 11 }}>
            {modules.map((item) => <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "inherit", background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 15, padding: 16, display: "block", boxShadow: "0 2px 8px rgba(22,36,29,.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><strong style={{ fontSize: 15 }}>{item.label}</strong><span style={{ color: item.accent, fontSize: 18 }}>→</span></div>
              <div style={{ marginTop: 6, color: theme.colors.textFaint, fontSize: 11, lineHeight: 1.5 }}>{item.description}</div>
            </Link>)}
          </div>
        </section>

        <section style={{ background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 15, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 10, color: theme.colors.primary, fontWeight: 900, textTransform: "uppercase" }}>Dispatch status</div><div style={{ marginTop: 4, fontWeight: 800 }}>{dispatchMode === "automatic" ? "Automatic assignment is ON" : "Manual assignment is ON"}</div><div style={{ marginTop: 4, color: theme.colors.textFaint, fontSize: 11 }}>Drivers without an assigned active vehicle are not eligible for a booking.</div></div>
            <Link href="/admin/dispatch" style={{ padding: "9px 12px", borderRadius: 9, background: theme.colors.primary, color: "#fff", textDecoration: "none", fontSize: 11, fontWeight: 900 }}>OPEN DISPATCH</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
