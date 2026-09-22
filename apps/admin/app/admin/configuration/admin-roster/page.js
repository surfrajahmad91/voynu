"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const formatDate = (v) => new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminRosterPage() {
  const [admins, setAdmins] = useState(null);
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

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Link href="/admin/configuration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.textFaint, textDecoration: "none", marginBottom: 10 }}>← Configuration</Link>
      <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.3 }}>Admin roster</h1>
      <p style={{ margin: "5px 0 18px", fontSize: 13.5, color: c.textFaint, lineHeight: 1.5, maxWidth: 560 }}>Everyone with admin access right now. Every change an admin makes is recorded automatically — see the full trail in <Link href="/admin/activity" style={{ color: c.primary, fontWeight: 700 }}>Activity log</Link>, which already has filtering by table and date range, so it isn't repeated here.</p>

      {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: c.errorBg, color: "#B42318", fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {admins === null ? <div style={{ ...card, height: 60, background: c.border, opacity: 0.5 }} /> : <div style={card}>
        {admins.length === 0 ? <div style={{ color: c.textFaint, fontSize: 13.5 }}>No admin accounts found.</div> : <div style={{ display: "grid", gap: 10 }}>{admins.map((a, i) => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingBottom: i === admins.length - 1 ? 0 : 10, borderBottom: i === admins.length - 1 ? "none" : `1px solid ${c.border}` }}>
          <div style={{ minWidth: 0 }}><strong style={{ fontSize: 13.5 }}>{a.full_name || "Unnamed admin"}</strong><div style={{ fontSize: 12, color: c.textFaint }}>{a.phone || "No phone on file"}</div></div>
          <span style={{ fontSize: 11.5, color: c.textFaint, flexShrink: 0 }}>Since {formatDate(a.created_at)}</span>
        </div>)}</div>}
      </div>}

      <Link href="/admin/activity" style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, textDecoration: "none", color: "inherit" }}>
        <div><strong style={{ fontSize: 13.5 }}>Open the full activity log</strong><div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>Every admin change, filterable by table and time range.</div></div>
        <span style={{ color: c.textFaint, fontSize: 18 }}>→</span>
      </Link>
    </div>
  </main>;
}
