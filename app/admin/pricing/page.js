"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";

const emptyRule = () => ({ base_fare: 0, per_km_rate: 0, driver_allowance_per_day: 0, minimum_fare: 0, rounding_unit: 10 });
function formatDate(value) { if (!value) return "—"; return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

export default function PricingAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false), [categories, setCategories] = useState([]), [versions, setVersions] = useState([]), [rules, setRules] = useState({});
  const [name, setName] = useState(""), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  const load = async () => {
    setError("");
    const { data: cats, error: catError } = await supabase.from("vehicle_categories").select("id,name,slug,active,sort_order").order("sort_order");
    if (catError) return setError(catError.message);
    const { data: versionRows, error: versionError } = await supabase.from("pricing_versions").select("id,version,name,status,effective_from,created_at").eq("status", "active").order("version", { ascending: false });
    if (versionError) return setError(versionError.message);
    setCategories((cats || []).filter((c) => c.active)); setVersions(versionRows || []);
    const current = (versionRows || [])[0];
    if (!current) { setName("Current Pricing"); setRules({}); setReady(true); return; }
    setName(current.name || `Pricing v${current.version}`);
    const { data: existing, error: ruleError } = await supabase.from("pricing_rules").select("*").eq("pricing_version_id", current.id);
    if (ruleError) return setError(ruleError.message);
    const map = {};
    (existing || []).forEach((r) => { map[`${r.vehicle_category_id}:${r.trip_type}`] = { ...emptyRule(), ...r }; });
    setRules(map); setReady(true);
  };

  useEffect(() => { (async () => { const { data } = await supabase.auth.getSession(); const email = data?.session?.user?.email || ""; if (!data?.session) return router.replace("/login"); if (!ADMIN_EMAILS.includes(email)) return setReady(false); await load(); })(); }, [router]);
  const updateRule = (categoryId, tripType, field, value) => setRules((prev) => ({ ...prev, [`${categoryId}:${tripType}`]: { ...emptyRule(), ...(prev[`${categoryId}:${tripType}`] || {}), [field]: value } }));

  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: latest } = await supabase.from("pricing_versions").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
      const nextVersion = (latest?.version || 0) + 1;
      const { data: version, error: versionError } = await supabase.from("pricing_versions").insert({ version: nextVersion, name: name.trim() || `Pricing v${nextVersion}`, status: "active", effective_from: new Date().toISOString(), created_by: user?.user?.id || null }).select("id,version").single();
      if (versionError) throw versionError;
      const rows = [];
      for (const category of categories) for (const tripType of ["oneway", "roundtrip"]) { const r = rules[`${category.id}:${tripType}`] || emptyRule(); rows.push({ pricing_version_id: version.id, vehicle_category_id: category.id, trip_type: tripType, base_fare: Number(r.base_fare), per_km_rate: Number(r.per_km_rate), driver_allowance_per_day: Number(r.driver_allowance_per_day), minimum_fare: Number(r.minimum_fare), rounding_unit: Number(r.rounding_unit) || 10 }); }
      const { error: ruleError } = await supabase.from("pricing_rules").insert(rows); if (ruleError) throw ruleError;
      setMessage(`Pricing updated. New bookings now use V${nextVersion}. Existing bookings keep their original fare.`); await load();
    } catch (e) { setError(e.message || "Unable to save pricing."); } finally { setSaving(false); }
  };

  const currentVersion = useMemo(() => versions[0], [versions]);
  if (!ready) return <main style={{ padding: 32 }}>Checking access…</main>;
  return <main style={{ minHeight: "100vh", background: "#f4f6f5", fontFamily: "ui-monospace, monospace", color: "#26352d" }}>
    <header style={{ background: "#16241d", color: "#fff", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>VOYNU ADMIN · PRICING</strong><Link href="/admin" style={{ color: "#fff", textDecoration: "none", fontSize: 12 }}>← Dashboard</Link></header>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
      <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h1 style={{ margin: 0, fontSize: 20 }}>Pricing control</h1><p style={{ margin: "6px 0 0", color: "#68766f", fontSize: 12 }}>Change the price whenever you need. The new price applies immediately to new bookings.</p></div><div style={{ fontSize: 12 }}><strong>Current:</strong> {currentVersion ? `V${currentVersion.version} · ${currentVersion.name}` : "Not configured"}{currentVersion?.created_at && <div style={{ color: "#68766f", marginTop: 4 }}>Updated {formatDate(currentVersion.created_at)}</div>}</div></div></section>
      <section style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>Update pricing</h2><label>Pricing name<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label><p style={{ margin: "8px 0 0", color: "#68766f", fontSize: 12 }}>When you publish, the new rates are used immediately for new bookings. Bookings already created keep their stored fare.</p></section>
      {categories.map((category) => <section key={category.id} style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>{category.name}</h2>{["oneway", "roundtrip"].map((tripType) => <div key={tripType} style={{ marginTop: 14 }}><h3 style={{ fontSize: 12 }}>{tripType === "oneway" ? "One Way" : "Round Trip"}</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>{[["base_fare", "Base"], ["per_km_rate", "Per km"], ["driver_allowance_per_day", "Driver/day"], ["minimum_fare", "Minimum"], ["rounding_unit", "Round"]].map(([field, label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={rules[`${category.id}:${tripType}`]?.[field] ?? ""} onChange={(e) => updateRule(category.id, tripType, field, e.target.value)} style={inputStyle} /></label>)}</div></div>)}</section>)}
      {error && <div style={{ ...noticeStyle, color: "#a33", background: "#fff0f0" }}>{error}</div>}{message && <div style={noticeStyle}>{message}</div>}<button disabled={saving} onClick={save} style={buttonStyle}>{saving ? "Saving…" : "Update pricing now"}</button>
    </div>
  </main>;
}
const cardStyle = { background: "#fff", border: "1px solid #d9e0dc", borderRadius: 10, padding: 14, marginBottom: 12 };
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 5, padding: "9px 10px", border: "1px solid #d9e0dc", borderRadius: 6, background: "#fff", fontFamily: "ui-monospace, monospace" };
const buttonStyle = { padding: "11px 16px", border: 0, borderRadius: 7, background: "#08783f", color: "#fff", fontWeight: 700, cursor: "pointer" };
const noticeStyle = { padding: 10, borderRadius: 7, background: "#eaf7ef", color: "#08783f", marginBottom: 12, fontSize: 12 };