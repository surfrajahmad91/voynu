"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";

const emptyRule = () => ({
  base_fare: 0,
  per_km_rate: 0,
  driver_allowance_per_day: 0,
  minimum_fare: 0,
  rounding_unit: 10,
});

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function PricingAdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [versions, setVersions] = useState([]);
  const [rules, setRules] = useState({});
  const [name, setName] = useState("");
  const [waitingFee, setWaitingFee] = useState(50);
  const [waitingInterval, setWaitingInterval] = useState(15);
  const [maxWaiting, setMaxWaiting] = useState(180);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const { data: cats, error: catError } = await supabase.from("vehicle_categories").select("id,name,slug,active,sort_order").order("sort_order");
    if (catError) return setError(catError.message);
    const { data: versionRows, error: versionError } = await supabase.from("pricing_versions").select("id,version,name,status,effective_from,created_at,waiting_fee_per_interval,waiting_interval_minutes,max_roundtrip_wait_minutes").eq("status", "active").order("version", { ascending: false });
    if (versionError) return setError(versionError.message);
    setCategories((cats || []).filter((c) => c.active));
    setVersions(versionRows || []);

    const current = (versionRows || [])[0];
    if (!current) {
      setName("Current Pricing");
      setWaitingFee(50); setWaitingInterval(15); setMaxWaiting(180);
      setRules({});
      setReady(true);
      return;
    }

    setName(current.name || `Pricing v${current.version}`);
    setWaitingFee(Number(current.waiting_fee_per_interval ?? 50));
    setWaitingInterval(Number(current.waiting_interval_minutes ?? 15));
    setMaxWaiting(Number(current.max_roundtrip_wait_minutes ?? 180));
    const { data: existing, error: ruleError } = await supabase.from("pricing_rules").select("*").eq("pricing_version_id", current.id);
    if (ruleError) return setError(ruleError.message);
    const map = {};
    (existing || []).forEach((r) => { map[`${r.vehicle_category_id}:${r.trip_type}`] = { ...emptyRule(), ...r }; });
    setRules(map);
    setReady(true);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (!data?.session) return router.replace("/login");
      if (!ADMIN_EMAILS.includes(email)) return setReady(false);
      await load();
    })();
  }, [router]);

  const updateRule = (categoryId, tripType, field, value) => {
    setRules((prev) => ({
      ...prev,
      [`${categoryId}:${tripType}`]: {
        ...emptyRule(),
        ...(prev[`${categoryId}:${tripType}`] || {}),
        [field]: value,
      },
    }));
  };

  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const fee = Number(waitingFee);
      const interval = Number(waitingInterval);
      const maximum = Number(maxWaiting);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Waiting fee must be zero or more.");
      if (!Number.isInteger(interval) || interval <= 0) throw new Error("Waiting interval must be a positive whole number of minutes.");
      if (!Number.isInteger(maximum) || maximum < 0) throw new Error("Maximum round-trip waiting must be zero or more minutes.");
      if (maximum % interval !== 0) throw new Error("Maximum waiting time should be a multiple of the waiting interval.");

      const { data: user } = await supabase.auth.getUser();
      const { data: latest } = await supabase.from("pricing_versions").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
      const nextVersion = (latest?.version || 0) + 1;
      const effectiveIso = new Date().toISOString();

      const { data: version, error: versionError } = await supabase.from("pricing_versions").insert({
        version: nextVersion,
        name: name.trim() || `Pricing v${nextVersion}`,
        status: "archived",
        effective_from: effectiveIso,
        created_by: user?.user?.id || null,
        waiting_fee_per_interval: fee,
        waiting_interval_minutes: interval,
        max_roundtrip_wait_minutes: maximum,
      }).select("id,version,effective_from").single();
      if (versionError) throw versionError;

      const rows = [];
      for (const category of categories) {
        for (const tripType of ["oneway", "roundtrip"]) {
          const r = rules[`${category.id}:${tripType}`] || emptyRule();
          rows.push({
            pricing_version_id: version.id,
            vehicle_category_id: category.id,
            trip_type: tripType,
            base_fare: Number(r.base_fare),
            per_km_rate: Number(r.per_km_rate),
            driver_allowance_per_day: Number(r.driver_allowance_per_day),
            minimum_fare: Number(r.minimum_fare),
            rounding_unit: Number(r.rounding_unit) || 10,
          });
        }
      }
      const { error: ruleError } = await supabase.from("pricing_rules").insert(rows);
      if (ruleError) throw ruleError;
      const { error: activateError } = await supabase.from("pricing_versions").update({ status: "active" }).eq("id", version.id);
      if (activateError) throw activateError;
      const { error: archiveError } = await supabase.from("pricing_versions").update({ status: "archived" }).eq("status", "active").neq("id", version.id);
      if (archiveError) throw archiveError;

      setMessage(`Pricing updated. New bookings now use V${nextVersion}. Existing bookings keep their original fare.`);
      await load();
    } catch (e) {
      setError(e.message || "Unable to save pricing.");
    } finally { setSaving(false); }
  };

  const currentVersion = useMemo(() => versions[0], [versions]);
  if (!ready) return <main style={{ padding: 32 }}>Checking access…</main>;

  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f5", fontFamily: "ui-monospace, monospace", color: "#26352d" }}>
      <header style={{ background: "#16241d", color: "#fff", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>VOYNU ADMIN · PRICING</strong>
        <Link href="/admin" style={{ color: "#fff", textDecoration: "none", fontSize: 12 }}>← Dashboard</Link>
      </header>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div><h1 style={{ margin: 0, fontSize: 20 }}>Pricing control</h1><p style={{ margin: "6px 0 0", color: "#68766f", fontSize: 12 }}>Change prices and round-trip waiting rules. New settings apply immediately to new bookings.</p></div>
            <div style={{ fontSize: 12 }}><strong>Current:</strong> {currentVersion ? `V${currentVersion.version} · ${currentVersion.name}` : "Not configured"}{currentVersion?.created_at && <div style={{ color: "#68766f", marginTop: 4 }}>Updated {formatDate(currentVersion.created_at)}</div>}</div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Round-trip waiting policy</h2>
          <p style={{ margin: "6px 0 14px", color: "#68766f", fontSize: 12 }}>Drivers remain reserved while passengers wait at the destination. Waiting is calculated from estimated arrival until the requested return time, rounded up to the configured interval.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <label>Waiting fee / interval (₹)<input type="number" min="0" step="1" value={waitingFee} onChange={(e) => setWaitingFee(e.target.value)} style={inputStyle} /></label>
            <label>Interval (minutes)<input type="number" min="1" step="1" value={waitingInterval} onChange={(e) => setWaitingInterval(e.target.value)} style={inputStyle} /></label>
            <label>Maximum waiting (minutes)<input type="number" min="0" step="1" value={maxWaiting} onChange={(e) => setMaxWaiting(e.target.value)} style={inputStyle} /></label>
          </div>
          <div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: "#eef8f1", color: "#08783f", fontSize: 12 }}><strong>Current default:</strong> ₹50 every 15 minutes, maximum 180 minutes (3 hours).</div>
        </section>

        <section style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>Update pricing</h2><label>Pricing name<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label><p style={{ margin: "8px 0 0", color: "#68766f", fontSize: 12 }}>Publishing creates a new pricing version. Existing bookings retain their stored fare and waiting policy.</p></section>

        {categories.map((category) => <section key={category.id} style={cardStyle}><h2 style={{ fontSize: 15, marginTop: 0 }}>{category.name}</h2>{["oneway", "roundtrip"].map((tripType) => <div key={tripType} style={{ marginTop: 14 }}><h3 style={{ fontSize: 12 }}>{tripType === "oneway" ? "One Way" : "Round Trip"}</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>{[["base_fare", "Base"], ["per_km_rate", "Per km"], ["driver_allowance_per_day", "Driver/day"], ["minimum_fare", "Minimum"], ["rounding_unit", "Round"]].map(([field, label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={rules[`${category.id}:${tripType}`]?.[field] ?? ""} onChange={(e) => updateRule(category.id, tripType, field, e.target.value)} style={inputStyle} /></label>)}</div></div>)}</section>)}

        {error && <div style={{ ...noticeStyle, color: "#a33", background: "#fff0f0" }}>{error}</div>}
        {message && <div style={noticeStyle}>{message}</div>}
        <button disabled={saving} onClick={save} style={buttonStyle}>{saving ? "Saving…" : "Publish pricing & waiting rules"}</button>
      </div>
    </main>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #d9e0dc", borderRadius: 10, padding: 14, marginBottom: 12 };
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 5, padding: "9px 10px", border: "1px solid #d9e0dc", borderRadius: 6, background: "#fff", fontFamily: "ui-monospace, monospace" };
const buttonStyle = { padding: "11px 16px", border: 0, borderRadius: 7, background: "#08783f", color: "#fff", fontWeight: 700, cursor: "pointer" };
const noticeStyle = { padding: 10, borderRadius: 7, background: "#eaf7ef", color: "#08783f", marginBottom: 12, fontSize: 12 };