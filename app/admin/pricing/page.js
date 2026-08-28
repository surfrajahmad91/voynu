"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";

const emptyRule = () => ({ base_fare: 0, per_km_rate: 0, driver_allowance_per_day: 0, minimum_fare: 0, rounding_unit: 10 });

export default function PricingAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState({});
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) return router.replace("/login");
      if (!ADMIN_EMAILS.includes(email)) return setReady(false);
      const { data: cats, error: catError } = await supabase.from("vehicle_categories").select("id,name,slug,active,sort_order").order("sort_order");
      if (catError) return setError(catError.message);
      setCategories((cats || []).filter(c => c.active));
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const { data: version } = await supabase.from("pricing_versions").select("id,name,effective_from").eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle();
      if (!version) return;
      setName(version.name || "Launch Pricing");
      if (version.effective_from) setEffectiveFrom(new Date(version.effective_from).toISOString().slice(0, 16));
      const { data: existing, error: ruleError } = await supabase.from("pricing_rules").select("*").eq("pricing_version_id", version.id);
      if (ruleError) return setError(ruleError.message);
      const map = {};
      (existing || []).forEach(r => { map[`${r.vehicle_category_id}:${r.trip_type}`] = { ...emptyRule(), ...r }; });
      setRules(map);
    })();
  }, [ready]);

  const updateRule = (categoryId, tripType, field, value) => setRules(prev => ({ ...prev, [`${categoryId}:${tripType}`]: { ...emptyRule(), ...(prev[`${categoryId}:${tripType}`] || {}), [field]: value } }));

  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: active } = await supabase.from("pricing_versions").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
      const nextVersion = (active?.version || 0) + 1;
      const { data: version, error: versionError } = await supabase.from("pricing_versions").insert({ version: nextVersion, name: name.trim() || `Pricing v${nextVersion}`, status: "active", effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(), created_by: user?.user?.id || null }).select("id").single();
      if (versionError) throw versionError;
      const rows = [];
      for (const category of categories) for (const tripType of ["oneway", "roundtrip"]) {
        const r = rules[`${category.id}:${tripType}`] || emptyRule();
        rows.push({ pricing_version_id: version.id, vehicle_category_id: category.id, trip_type: tripType, base_fare: Number(r.base_fare), per_km_rate: Number(r.per_km_rate), driver_allowance_per_day: Number(r.driver_allowance_per_day), minimum_fare: Number(r.minimum_fare), rounding_unit: Number(r.rounding_unit) || 10 });
      }
      const { error: ruleError } = await supabase.from("pricing_rules").insert(rows);
      if (ruleError) throw ruleError;
      const { error: archiveError } = await supabase.from("pricing_versions").update({ status: "archived" }).eq("status", "active").neq("id", version.id);
      if (archiveError) throw archiveError;
      setMessage(`Pricing version ${nextVersion} is now active.`);
    } catch (e) { setError(e.message || "Unable to save pricing."); }
    finally { setSaving(false); }
  };

  if (!ready) return <main style={{ padding: 32 }}>Checking access…</main>;
  return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
    <h1>Pricing</h1>
    <p>Manage future fares without changing application code.</p>
    <div style={{ display: "grid", gap: 12, margin: "24px 0" }}>
      <label>Pricing name<input value={name} onChange={e => setName(e.target.value)} style={{ display: "block", width: "100%", padding: 10 }} /></label>
      <label>Effective from<input type="datetime-local" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} style={{ display: "block", padding: 10 }} /></label>
    </div>
    {categories.map(category => <section key={category.id} style={{ margin: "24px 0", padding: 18, border: "1px solid #ddd", borderRadius: 12 }}><h2>{category.name}</h2>{["oneway", "roundtrip"].map(tripType => <div key={tripType} style={{ marginTop: 16 }}><h3>{tripType === "oneway" ? "One Way" : "Round Trip"}</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>{[["base_fare","Base"],["per_km_rate","Per km"],["driver_allowance_per_day","Driver/day"],["minimum_fare","Minimum"],["rounding_unit","Round" ]].map(([field,label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={rules[`${category.id}:${tripType}`]?.[field] ?? ""} onChange={e => updateRule(category.id, tripType, field, e.target.value)} style={{ display: "block", width: "100%", padding: 8 }} /></label>)}</div></div>)}</section>)}
    {error && <p style={{ color: "crimson" }}>{error}</p>}{message && <p>{message}</p>}
    <button disabled={saving} onClick={save} style={{ padding: "12px 18px" }}>{saving ? "Saving…" : "Publish pricing"}</button>
  </main>;
}
