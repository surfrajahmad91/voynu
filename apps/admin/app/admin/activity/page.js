"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const PAGE_SIZE = 50;
const TABLES = [
  ["all", "All changes"], ["bookings", "Bookings"], ["driver_assignments", "Assignments"], ["drivers", "Drivers"], ["vehicles", "Vehicles"],
  ["vehicle_categories", "Vehicle types"], ["pricing_versions", "Pricing versions"], ["pricing_rules", "Pricing rules"], ["dispatch_settings", "Dispatch mode"],
  ["driver_workflow_settings", "Driver workflow rules"], ["commute_subscriptions", "Commute subscriptions"], ["subscription_plans", "Subscription plans"],
  ["rental_bookings", "Rentals"], ["rental_vehicle_listings", "Rental listings"], ["rental_payouts", "Rental payouts"], ["trip_timing_alerts", "Timing alerts"],
];
const RANGES = [["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["0", "All time"]];
const tableName = Object.fromEntries(TABLES);
const HIDDEN_FIELDS = new Set(["updated_at", "created_at", "fare_breakdown", "share_token"]);
const label = (v) => String(v || "").replace(/_/g, " ");
const shortId = (v) => (v && String(v).length > 12 ? String(v).slice(0, 8).toUpperCase() : v || "—");
const when = (v) => new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const show = (v) => v === null || v === undefined ? "empty" : typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v).length > 48 ? `${String(v).slice(0, 48)}…` : String(v);

function describe(row) {
  const c = row.changes || {};
  if (row.action === "UPDATE") {
    return Object.entries(c).filter(([k]) => !HIDDEN_FIELDS.has(k)).slice(0, 8).map(([k, v]) => `${label(k)}: ${show(v?.old)} → ${show(v?.new)}`);
  }
  const keys = ["booking_status", "status", "name", "full_name", "registration_number", "version", "mode", "trip_type", "base_fare", "per_km_rate", "passenger_name"];
  const picked = keys.filter((k) => c[k] !== undefined && c[k] !== null).slice(0, 5).map((k) => `${label(k)}: ${show(c[k])}`);
  return picked.length ? picked : [row.action === "DELETE" ? "Record removed" : "Record created"];
}

const card = { background: "#fff", border: `1px solid ${theme.colors.border}`, borderRadius: 14, padding: 14 };
const field = { padding: "9px 10px", border: `1px solid ${theme.colors.border}`, borderRadius: 8, background: "#fff", font: "inherit", fontSize: 12 };
const ghost = { border: `1px solid ${theme.colors.border}`, borderRadius: 8, padding: "8px 11px", background: "#fff", fontWeight: 800, fontSize: 11, cursor: "pointer" };

export default function ActivityLogPage() {
  const [rows, setRows] = useState([]), [table, setTable] = useState("all"), [range, setRange] = useState("7"), [record, setRecord] = useState("");
  const [loading, setLoading] = useState(true), [more, setMore] = useState(false), [error, setError] = useState("");

  const query = (before) => {
    let q = supabase.from("admin_audit_log").select("id,occurred_at,actor_email,table_name,record_id,action,changes").order("id", { ascending: false }).limit(PAGE_SIZE);
    if (table !== "all") q = q.eq("table_name", table);
    if (range !== "0") q = q.gte("occurred_at", new Date(Date.now() - Number(range) * 86400000).toISOString());
    if (record.trim()) q = q.ilike("record_id", `${record.trim().toLowerCase().replace(/^voy-/, "").replace(/[%_]/g, "")}%`);
    if (before) q = q.lt("id", before);
    return q;
  };

  const load = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await query();
    setLoading(false);
    if (e) return setError(e.message);
    setRows(data || []); setMore((data || []).length === PAGE_SIZE);
  };
  useEffect(() => { const t = setTimeout(load, record ? 300 : 0); return () => clearTimeout(t); }, [table, range, record]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    const { data, error: e } = await query(rows[rows.length - 1]?.id);
    if (e) return setError(e.message);
    setRows((prev) => [...prev, ...(data || [])]); setMore((data || []).length === PAGE_SIZE);
  };

  return <main style={{ background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.fontFamily, padding: "8px 4px 60px" }}><div style={{ maxWidth: 980, margin: "0 auto" }}>
    <header style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>VOYNU Admin · Accountability</div><h1 style={{ margin: "5px 0 0", fontSize: 27 }}>Activity log</h1><p style={{ margin: "5px 0 0", color: theme.colors.textFaint, fontSize: 12 }}>Every change made by an administrator: who, when, and what changed. Driver trip steps and delay reasons are on each booking's timeline.</p></header>
    <section style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <select value={table} onChange={(e) => setTable(e.target.value)} style={field} aria-label="What changed">{TABLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select value={range} onChange={(e) => setRange(e.target.value)} style={field} aria-label="Period">{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <input value={record} onChange={(e) => setRecord(e.target.value)} placeholder="Record / booking reference" style={{ ...field, flex: 1, minWidth: 180 }} aria-label="Record reference" />
      <button onClick={load} style={ghost}>{loading ? "Loading…" : "Refresh"}</button>
    </section>
    {error && <div role="alert" style={{ marginBottom: 12, padding: 11, borderRadius: 9, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12, fontWeight: 700 }}>{error}</div>}
    {loading && rows.length === 0 ? <div style={card}>Loading activity…</div> : rows.length === 0 ? <div style={{ ...card, color: theme.colors.textFaint }}>No admin changes match this view.</div> : <div style={{ display: "grid", gap: 8 }}>{rows.map((r) => <article key={r.id} style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 11 }}><strong>{tableName[r.table_name] || label(r.table_name)} · #{shortId(r.record_id)}</strong><span style={{ color: theme.colors.textFaint }}>{when(r.occurred_at)}</span></div>
      <div style={{ marginTop: 3, fontSize: 10.5, color: theme.colors.textMuted }}><span style={{ padding: "2px 7px", borderRadius: 999, background: r.action === "DELETE" ? theme.colors.errorBg : theme.colors.primaryTint, color: r.action === "DELETE" ? theme.colors.error : theme.colors.primary, fontWeight: 900, fontSize: 9 }}>{r.action}</span> by {r.actor_email || "unknown"}</div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 17, fontSize: 11.5, lineHeight: 1.55 }}>{describe(r).map((line, i) => <li key={i}>{line}</li>)}</ul>
    </article>)}</div>}
    {more && <div style={{ textAlign: "center", marginTop: 14 }}><button onClick={loadMore} style={ghost}>Load older activity</button></div>}
  </div></main>;
}
