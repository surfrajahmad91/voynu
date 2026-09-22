"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../../shared/lib/theme";

const c = theme.colors;
const PAGE_SIZE = 25;
const ACTION_TONE = { INSERT: ["#EAFBF2", "#0B7A43"], UPDATE: [c.primaryTint, c.primaryDark], DELETE: [c.errorBg, "#B42318"] };
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const formatDate = (v) => new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AccessAuditPage() {
  const [admins, setAdmins] = useState(null);
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [busyMore, setBusyMore] = useState(false);
  const [open, setOpen] = useState(null); // expanded audit row id
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: e } = await supabase.from("profiles").select("id,full_name,phone,role,created_at").eq("role", "admin").order("created_at");
      if (cancelled) return;
      if (e) return setError(e.message);
      setAdmins(data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadLog = async (offset = 0) => {
    offset === 0 ? setLogLoading(true) : setBusyMore(true);
    const { data, error: e } = await supabase.from("admin_audit_log").select("id,occurred_at,actor_email,table_name,record_id,action,changes").order("occurred_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    setLogLoading(false); setBusyMore(false);
    if (e) return setError(e.message);
    setLog((prev) => (offset === 0 ? data || [] : [...prev, ...(data || [])]));
    setHasMore((data || []).length === PAGE_SIZE);
  };
  useEffect(() => { loadLog(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href="/admin/configuration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.textFaint, textDecoration: "none", marginBottom: 10 }}>← Configuration</Link>
      <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3 }}>Access & audit</h1>
      <p style={{ margin: "5px 0 18px", fontSize: 13.5, color: c.textFaint, lineHeight: 1.5, maxWidth: 560 }}>Who currently has admin access, and every change an admin has made — recorded automatically by the database, not something a page could edit or clear.</p>

      {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: c.errorBg, color: "#B42318", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 2px 8px", fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: c.textFaint }}>Admin roster · {admins?.length ?? "…"}</h2>
        {admins === null ? <div style={{ ...card, height: 60, background: c.border, opacity: 0.5 }} /> : <div style={card}>
          {admins.length === 0 ? <div style={{ color: c.textFaint, fontSize: 13.5 }}>No admin accounts found.</div> : <div style={{ display: "grid", gap: 10 }}>{admins.map((a) => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: `1px solid ${c.border}` }}>
            <div style={{ minWidth: 0 }}><strong style={{ fontSize: 13.5 }}>{a.full_name || "Unnamed admin"}</strong><div style={{ fontSize: 12, color: c.textFaint }}>{a.phone || "No phone on file"}</div></div>
            <span style={{ fontSize: 11.5, color: c.textFaint, flexShrink: 0 }}>Since {formatDate(a.created_at)}</span>
          </div>)}</div>}
        </div>}
      </section>

      <section>
        <h2 style={{ margin: "0 2px 8px", fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: c.textFaint }}>Change log</h2>
        {logLoading ? <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ ...card, height: 58, background: c.border, opacity: 0.5 }} />)}</div>
          : log.length === 0 ? <div style={{ ...card, color: c.textFaint, fontSize: 13.5 }}>No admin changes have been logged yet.</div>
          : <div style={{ display: "grid", gap: 8 }}>{log.map((ev) => {
              const [bg, fg] = ACTION_TONE[ev.action] || [c.bg, c.textMuted];
              const expanded = open === ev.id;
              return <div key={ev.id} style={card}>
                <button onClick={() => setOpen(expanded ? null : ev.id)} aria-expanded={expanded} style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 10, border: 0, background: "transparent", padding: 0, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: bg, color: fg, marginRight: 8 }}>{ev.action}</span>
                    <strong style={{ fontSize: 13.5 }}>{ev.table_name}</strong>
                    <div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>{ev.actor_email || "Unknown admin"} · {formatDate(ev.occurred_at)}</div>
                  </div>
                  <span style={{ color: c.textFaint, fontSize: 16, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
                </button>
                {expanded && <pre style={{ margin: "10px 0 0", padding: 10, background: c.bg, borderRadius: 10, fontSize: 11, lineHeight: 1.5, overflowX: "auto", fontFamily: "ui-monospace,monospace" }}>{JSON.stringify(ev.changes, null, 2)}</pre>}
              </div>;
            })}</div>}
        {hasMore && !logLoading && <div style={{ textAlign: "center", marginTop: 14 }}><button disabled={busyMore} onClick={() => loadLog(log.length)} style={{ border: `1px solid ${c.borderStrong}`, background: c.surface, color: c.text, borderRadius: 10, minHeight: 40, padding: "0 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busyMore ? 0.6 : 1 }}>{busyMore ? "Loading…" : "Load more"}</button></div>}
      </section>
    </div>
  </main>;
}
