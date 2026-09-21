"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { isAdminUser } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const emptyRule = () => ({ base_fare: 0, per_km_rate: 0, driver_allowance_per_day: 0, minimum_fare: 0, rounding_unit: 10 });
function formatDate(value) { if (!value) return "—"; return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

export default function PricingAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false), [categories, setCategories] = useState([]), [versions, setVersions] = useState([]), [rules, setRules] = useState({}), [name, setName] = useState(""), [waitingFee, setWaitingFee] = useState(50), [waitingInterval, setWaitingInterval] = useState(15), [maxWaiting, setMaxWaiting] = useState(180), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const load = async () => {
    setError("");
    const { data: cats, error: catError } = await supabase.from("vehicle_categories").select("id,name,slug,active,sort_order").order("sort_order");
    if (catError) return setError(catError.message);
    const { data: versionRows, error: versionError } = await supabase.from("pricing_versions").select("id,version,name,status,effective_from,created_at,waiting_fee_per_interval,waiting_interval_minutes,max_roundtrip_wait_minutes").eq("status", "active").order("version", { ascending: false });
    if (versionError) return setError(versionError.message);
    setCategories((cats || []).filter((c) => c.active)); setVersions(versionRows || []);
    const current = (versionRows || [])[0];
    if (!current) { setName("Current Pricing"); setWaitingFee(50); setWaitingInterval(15); setMaxWaiting(180); setRules({}); setReady(true); return; }
    setName(current.name || `Pricing v${current.version}`); setWaitingFee(Number(current.waiting_fee_per_interval ?? 50)); setWaitingInterval(Number(current.waiting_interval_minutes ?? 15)); setMaxWaiting(Number(current.max_roundtrip_wait_minutes ?? 180));
    const { data: existing, error: ruleError } = await supabase.from("pricing_rules").select("*").eq("pricing_version_id", current.id);
    if (ruleError) return setError(ruleError.message);
    const map = {}; (existing || []).forEach((r) => { map[`${r.vehicle_category_id}:${r.trip_type}`] = { ...emptyRule(), ...r }; }); setRules(map); setReady(true);
  };
  useEffect(() => { (async () => { const { data } = await supabase.auth.getSession(); const email = data?.session?.user?.email || ""; if (!data?.session) return router.replace("/login"); if (!(await isAdminUser(email))) return setReady(false); await load(); })(); }, [router]);
  const updateRule = (categoryId, tripType, field, value) => setRules((prev) => ({ ...prev, [`${categoryId}:${tripType}`]: { ...emptyRule(), ...(prev[`${categoryId}:${tripType}`] || {}), [field]: value } }));
  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const fee = Number(waitingFee), interval = Number(waitingInterval), maximum = Number(maxWaiting);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Waiting fee must be zero or more.");
      if (!Number.isInteger(interval) || interval <= 0) throw new Error("Waiting interval must be a positive whole number of minutes.");
      if (interval > 1440) throw new Error("Waiting interval cannot exceed 1440 minutes.");
      if (!Number.isInteger(maximum) || maximum < 0) throw new Error("Maximum round-trip waiting must be zero or more minutes.");
      if (maximum > 1440) throw new Error("Maximum round-trip waiting cannot exceed 1440 minutes.");
      if (maximum % interval !== 0) throw new Error("Maximum waiting time should be a multiple of the waiting interval.");
      const { data: user, error: userError } = await supabase.auth.getUser(); if (userError) throw userError; if (!user?.user?.id) throw new Error("Your admin session has expired. Please sign in again.");
      const rows = [];
      for (const category of categories) for (const tripType of ["oneway", "roundtrip"]) {
        const r = rules[`${category.id}:${tripType}`] || emptyRule(); const values = [Number(r.base_fare), Number(r.per_km_rate), Number(r.driver_allowance_per_day), Number(r.minimum_fare), Number(r.rounding_unit)];
        if (!values.every(Number.isFinite)) throw new Error(`Invalid numeric value in ${category.name} · ${tripType === "oneway" ? "One Way" : "Round Trip"}.`);
        if (values.slice(0, 4).some((value) => value < 0)) throw new Error(`Pricing values cannot be negative in ${category.name} · ${tripType === "oneway" ? "One Way" : "Round Trip"}.`);
        if (values[4] <= 0) throw new Error(`Rounding unit must be greater than zero in ${category.name} · ${tripType === "oneway" ? "One Way" : "Round Trip"}.`);
        rows.push({ vehicle_category_id: category.id, trip_type: tripType, base_fare: values[0], per_km_rate: values[1], driver_allowance_per_day: values[2], minimum_fare: values[3], rounding_unit: values[4] });
      }
      // One atomic database call: create the version, its rules, archive the old one and activate the new one together.
      const { data: published, error: publishError } = await supabase.rpc("admin_publish_pricing", { p_name: name.trim(), p_waiting_fee: fee, p_interval: interval, p_max_wait: maximum, p_rules: rows });
      if (publishError) throw new Error(String(publishError.message).replace(/^VOYNU:\s*/, ""));
      const nextVersion = published?.version;
      setMessage(`Pricing updated. New bookings now use V${nextVersion}. Existing bookings keep their original fare.`); await load();
    } catch (e) { setError(e?.message || "Unable to save pricing."); } finally { setSaving(false); }
  };
  const currentVersion = useMemo(() => versions[0], [versions]);
  if (!ready) return <main style={{ padding: 32, background: theme.colors.bg, color: theme.colors.text, minHeight: "100vh" }}>Checking access…</main>;
  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>
      <header style={{ background: theme.colors.footerBg, color: "#fff", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>VOYNU ADMIN · PRICING</strong><Link href="/admin" style={{ color: "#fff", textDecoration: "none", fontSize: 12 }}>← Dashboard</Link></header>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
        <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h1 style={{ margin: 0, fontSize: 20 }}>Pricing control</h1><p style={{ margin: "6px 0 0", color: theme.colors.textMuted, fontSize: 12 }}>Change prices and round-trip waiting rules. New settings apply immediately to new bookings.</p></div><div style={{ fontSize: 12 }}><strong>Current:</strong> {currentVersion ? `V${currentVersion.version} · ${currentVersion.name}` : "Not configured"}{currentVersion?.created_at && <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>Updated {formatDate(currentVersion.created_at)}</div>}</div></div></section>
        <section style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>Round-trip waiting policy</h2><p style={{ margin: "6px 0 14px", color: theme.colors.textMuted, fontSize: 12 }}>Drivers remain reserved while passengers wait at the destination. Waiting is calculated from estimated arrival until the requested return time, rounded up to the configured interval.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}><label>Waiting fee / interval (₹)<input type="number" min="0" step="1" value={waitingFee} onChange={(e) => setWaitingFee(e.target.value)} style={inputStyle} /></label><label>Interval (minutes)<input type="number" min="1" step="1" value={waitingInterval} onChange={(e) => setWaitingInterval(e.target.value)} style={inputStyle} /></label><label>Maximum waiting (minutes)<input type="number" min="0" step="1" value={maxWaiting} onChange={(e) => setMaxWaiting(e.target.value)} style={inputStyle} /></label></div><div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: theme.colors.primaryTint, color: theme.colors.primaryDark, fontSize: 12 }}><strong>Current default:</strong> ₹50 every 15 minutes, maximum 180 minutes (3 hours).</div></section>
        <section style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>Update pricing</h2><label>Pricing name<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label><p style={{ margin: "8px 0 0", color: theme.colors.textMuted, fontSize: 12 }}>Publishing creates a new pricing version. Existing bookings retain their stored fare and waiting policy.</p></section>
        {categories.map((category) => <section key={category.id} style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>{category.name}</h2>{["oneway", "roundtrip"].map((tripType) => <div key={tripType} style={{ marginTop: 14 }}><h3 style={{ fontSize: 12 }}>{tripType === "oneway" ? "One Way" : "Round Trip"}</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>{[["base_fare", "Base"], ["per_km_rate", "Per km"], ["driver_allowance_per_day", "Driver/day"], ["minimum_fare", "Minimum"], ["rounding_unit", "Round"]].map(([field, label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={rules[`${category.id}:${tripType}`]?.[field] ?? ""} onChange={(e) => updateRule(category.id, tripType, field, e.target.value)} style={inputStyle} /></label>)}</div></div>)}</section>)}
        {error && <div style={{ ...noticeStyle, color: theme.colors.error, background: theme.colors.errorBg }}>{error}</div>}{message && <div style={noticeStyle}>{message}</div>}<button disabled={saving} onClick={save} style={buttonStyle}>{saving ? "Saving…" : "Publish pricing & waiting rules"}</button>
      </div>
    </main>
  );
}
const cardStyle = { background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: 14, marginBottom: 12, boxShadow: theme.shadow.card };
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 5, padding: "9px 10px", border: `1px solid ${theme.colors.borderStrong}`, borderRadius: theme.radius.sm, background: theme.colors.surface, color: theme.colors.text, fontFamily: theme.fontFamily };
const buttonStyle = { padding: "11px 16px", border: 0, borderRadius: theme.radius.sm, background: theme.gradients.primary, color: "#fff", fontWeight: 700, cursor: "pointer", boxShadow: theme.shadow.button };
const noticeStyle = { padding: 10, borderRadius: theme.radius.sm, background: theme.colors.primaryTint, color: theme.colors.primaryDark, marginBottom: 12, fontSize: 12 };
