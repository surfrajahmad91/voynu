"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../shared/lib/supabaseClient";
import { theme } from "../../../shared/lib/theme";

const TYPES = ["admin_booking_created", "admin_trip_start_overdue", "admin_trip_completion_overdue"];

const copy = (row) => {
  if (row.type === "admin_trip_start_overdue") return { title: "Trip start overdue", message: row.message };
  if (row.type === "admin_trip_completion_overdue") return { title: "Trip completion overdue", message: row.message };
  return { title: row.title || "New booking", message: row.message || "A new VOYNU booking needs attention." };
};

export default function AdminNotificationBell() {
  const router = useRouter();
  const ref = useRef(null);
  const [userId, setUserId] = useState(null);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data?.session?.user?.id || null;
      if (cancelled) return;
      setUserId(id);
      if (!id) return;
      const { data: notifications } = await supabase.from("notifications").select("id,booking_id,type,title,message,data,read_at,created_at").eq("user_id", id).in("type", TYPES).order("created_at", { ascending: false }).limit(30);
      if (!cancelled) setRows(notifications || []);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`voynu-admin-alerts-${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
      if (TYPES.includes(payload.new?.type)) setRows((current) => [payload.new, ...current].slice(0, 30));
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  useEffect(() => {
    const outside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const unread = useMemo(() => rows.filter((r) => !r.read_at).length, [rows]);
  const markRead = async (row) => {
    if (!row.read_at) await supabase.rpc("mark_notification_read", { p_notification_id: row.id });
    setRows((current) => current.map((r) => r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r));
    setOpen(false);
    router.push("/admin/trip-monitor");
  };
  const markAll = async () => {
    if (!unread) return;
    await supabase.rpc("mark_all_notifications_read");
    const now = new Date().toISOString();
    setRows((current) => current.map((r) => r.read_at ? r : { ...r, read_at: now }));
  };

  if (!userId) return null;
  return <div ref={ref} style={{ position: "relative" }}>
    <button type="button" aria-label={unread ? `${unread} unread notifications` : "Notifications"} onClick={() => setOpen((v) => !v)} style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", border: `1px solid ${theme.colors.border}`, background: "#fff", color: theme.colors.primary, cursor: "pointer" }}>
      <span style={{ fontSize: 19 }}>♧</span>{unread > 0 && <span style={{ position: "absolute", top: 0, right: 0, minWidth: 17, height: 17, borderRadius: 9, background: theme.colors.accent, color: "#fff", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center" }}>{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div style={{ position: "fixed", top: 58, right: 12, width: "min(390px,calc(100vw - 24px))", maxHeight: "calc(100vh - 76px)", overflow: "hidden", border: `1px solid ${theme.colors.border}`, borderRadius: 16, background: "#fff", boxShadow: "0 18px 45px rgba(10,40,25,.16)", zIndex: 10000 }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><strong style={{ color: theme.colors.text }}>Admin alerts</strong><div style={{ fontSize: 10, color: theme.colors.textFaint, marginTop: 3 }}>{unread ? `${unread} unread` : "All caught up"}</div></div>{unread > 0 && <button onClick={markAll} style={{ border: 0, background: "transparent", color: theme.colors.primary, fontWeight: 800, cursor: "pointer" }}>Mark all read</button>}</div>
      <div style={{ maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>{rows.length === 0 ? <div style={{ padding: 26, color: theme.colors.textFaint, fontSize: 12, textAlign: "center" }}>No admin alerts.</div> : rows.map((row) => { const c = copy(row); return <button key={row.id} onClick={() => markRead(row)} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: `1px solid ${theme.colors.border}`, padding: "13px 16px", background: row.read_at ? "#fff" : theme.colors.primaryTint, cursor: "pointer" }}><div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.text }}>{c.title}</div><div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: theme.colors.textMuted }}>{c.message}</div></button>; })}</div>
    </div>}
  </div>;
}
