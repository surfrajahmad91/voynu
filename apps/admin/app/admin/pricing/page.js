"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const emptyRule = () => ({ base_fare: 0, per_km_rate: 0, driver_allowance_per_day: 0, minimum_fare: 0, rounding_unit: 10 });
const formatDate = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const RULE_FIELDS = [["base_fare", "Base"], ["per_km_rate", "Per km"], ["driver_allowance_per_day", "Driver/day"], ["minimum_fare", "Minimum"], ["rounding_unit", "Round to"]];

const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const btn = { border: 0, borderRadius: 10, padding: "0 18px", minHeight: 44, background: theme.gradients.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", font: "inherit", boxShadow: theme.shadow.button };
const field = { display: "block", width: "100%", boxSizing: "border-box", minHeight: 40, marginTop: 5, padding: "0 10px", border: `1px solid ${c.borderStrong}`, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const label = { fontSize: 11.5, fontWeight: 700, color: c.textFaint };

export default function PricingAdminPage() {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]), [versions, setVersions] = useState([]), [rules, setRules] = useState({});
  const [name, setName] = useState(""), [waitingFee, setWaitingFee] = useState(50), [waitingInterval, setWaitingInterval] = useState(15), [maxWaiting, setMaxWaiting] = useState(180);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  const load = async () => {
    setError("");
    const { data: cats, error: catError } = await supabase.from("vehicle_categories").select("id,name,slug,active,sort_order").order("sort_order");
    if (catError) return setError(catError.message);
    const { data: versionRows, error: versionError } = await supabase.from("pricing_versions").select("id,version,name,status,effective_from,created_at,waiting_fee_per_interval,waiting_interval_minutes,max_roundtrip_wait_minutes").eq("status", "active").order("version", { ascending: false });
    if (versionError) return setError(versionError.message);
    setCategories((cats || []).filter((cat) => cat.active)); setVersions(versionRows || []);
    const current = (versionRows || [])[0];
    if (!current) { setName("Current Pricing"); setWaitingFee(50); setWaitingInterval(15); setMaxWaiting(180); setRules({}); setReady(true); return; }
    setName(current.name || `Pricing v${current.version}`); setWaitingFee(Number(current.waiting_fee_per_interval ?? 50)); setWaitingInterval(Number(current.waiting_interval_minutes ?? 15)); setMaxWaiting(Number(current.max_roundtrip_wait_minutes ?? 180));
    const { data: existing, error: ruleError } = await supabase.from("pricing_rules").select("*").eq("pricing_version_id", current.id);
    if (ruleError) return setError(ruleError.message);
    const map = {}; (existing || []).forEach((r) => { map[`${r.vehicle_category_id}:${r.trip_type}`] = { ...emptyRule(), ...r }; });
    setRules(map); setReady(true);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }, [message]);

  const updateRule = (categoryId, tripType, field_, value) => setRules((prev) => ({ ...prev, [`${categoryId}:${tripType}`]: { ...emptyRule(), ...(prev[`${categoryId}:${tripType}`] || {}), [field_]: value } }));

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
        const r = rules[`${category.id}:${tripType}`] || emptyRule();
        const values = [Number(r.base_fare), Number(r.per_km_rate), Number(r.driver_allowance_per_day), Number(r.minimum_fare), Number(r.rounding_unit)];
        const tripLabel = tripType === "oneway" ? "One Way" : "Round Trip";
        if (!values.every(Number.isFinite)) throw new Error(`Invalid numeric value in ${category.name} · ${tripLabel}.`);
        if (values.slice(0, 4).some((v) => v < 0)) throw new Error(`Pricing values cannot be negative in ${category.name} · ${tripLabel}.`);
        if (values[4] <= 0) throw new Error(`Rounding unit must be greater than zero in ${category.name} · ${tripLabel}.`);
        rows.push({ vehicle_category_id: category.id, trip_type: tripType, base_fare: values[0], per_km_rate: values[1], driver_allowance_per_day: values[2], minimum_fare: values[3], rounding_unit: values[4] });
      }
      // One atomic database call: create the version, its rules, archive the old one and activate the new one together.
      const { data: published, error: publishError } = await supabase.rpc("admin_publish_pricing", { p_name: name.trim(), p_waiting_fee: fee, p_interval: interval, p_max_wait: maximum, p_rules: rows });
      if (publishError) throw new Error(String(publishError.message).replace(/^VOYNU:\s*/, ""));
      setMessage(`Pricing updated. New bookings now use V${published?.version}. Existing bookings keep their original fare.`);
      await load();
    } catch (e) { setError(e?.message || "Unable to save pricing."); } finally { setSaving(false); }
  };

  const currentVersion = useMemo(() => versions[0], [versions]);

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 88px" }}>
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, margin: "6px 0 16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 }}>Pricing</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: c.textFaint, fontWeight: 600, maxWidth: 460 }}>New settings apply immediately to new bookings; existing bookings keep the fare they were quoted.</p>
        </div>
        <div style={{ fontSize: 12.5, textAlign: "right" }}>
          <strong style={{ color: c.primaryDark }}>{ready ? (currentVersion ? `V${currentVersion.version} · ${currentVersion.name}` : "Not configured") : "Loading…"}</strong>
          {currentVersion?.created_at && <div style={{ color: c.textFaint, marginTop: 2 }}>Updated {formatDate(currentVersion.created_at)}</div>}
        </div>
      </header>

      {!ready ? <div style={{ display: "grid", gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} style={{ ...card, height: 90, background: c.border, opacity: 0.5 }} />)}</div> : <>

        <section style={{ ...card, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Round-trip waiting policy</h2>
          <p style={{ margin: "4px 0 14px", fontSize: 12.5, color: c.textMuted, lineHeight: 1.5 }}>Drivers stay reserved while passengers wait at the destination. Waiting is calculated from estimated arrival until the requested return time, rounded up to the interval below.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <label style={label}>Waiting fee / interval (₹)<input type="number" min="0" step="1" value={waitingFee} onChange={(e) => setWaitingFee(e.target.value)} style={field} /></label>
            <label style={label}>Interval (minutes)<input type="number" min="1" step="1" value={waitingInterval} onChange={(e) => setWaitingInterval(e.target.value)} style={field} /></label>
            <label style={label}>Maximum waiting (minutes)<input type="number" min="0" step="1" value={maxWaiting} onChange={(e) => setMaxWaiting(e.target.value)} style={field} /></label>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Pricing name</h2>
          <p style={{ margin: "4px 0 10px", fontSize: 12.5, color: c.textMuted }}>Publishing creates a new version — existing bookings keep their stored fare and waiting policy.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, marginTop: 0 }} />
        </section>

        {categories.map((category) => <section key={category.id} style={{ ...card, marginBottom: 12 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>{category.name}</h2>
          {["oneway", "roundtrip"].map((tripType) => <div key={tripType} style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${c.border}` }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 12.5, fontWeight: 800, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{tripType === "oneway" ? "One way" : "Round trip"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
              {RULE_FIELDS.map(([f, l]) => <label key={f} style={label}>{l}<input type="number" min="0" step="0.01" value={rules[`${category.id}:${tripType}`]?.[f] ?? ""} onChange={(e) => updateRule(category.id, tripType, f, e.target.value)} style={field} /></label>)}
            </div>
          </div>)}
        </section>)}

        <button disabled={saving} onClick={save} style={{ ...btn, width: "100%", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Publish pricing & waiting rules"}</button>
      </>}
    </div>

    {(error || message) && <div role={error ? "alert" : "status"} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", margin: "0 auto", maxWidth: 520, zIndex: 130, padding: "12px 14px", borderRadius: 12, background: error ? "#B42318" : c.navy, color: "#fff", fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: theme.shadow.card }}>
      <span>{error || message}</span>
      <button onClick={() => { setError(""); setMessage(""); }} aria-label="Dismiss" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>}
  </main>;
}
