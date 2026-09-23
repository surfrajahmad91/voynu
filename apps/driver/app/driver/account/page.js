"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DriverChrome from "../../../components/DriverChrome";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(13,27,42,.55)",
  display: "grid",
  placeItems: "center",
  padding: 18,
};

const modalCard = {
  width: "min(440px,100%)",
  maxHeight: "min(720px, calc(100vh - 36px))",
  overflow: "auto",
  background: "#fff",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

function Modal({ title, children, onClose }) {
  return (
    <div style={modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid " + theme.colors.border, background: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [driver, setDriver] = useState(null);
  const [modal, setModal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [commuteSaving, setCommuteSaving] = useState(false);
  const [unavailability, setUnavailability] = useState([]);
  const [commuteReason, setCommuteReason] = useState("");
  const [commuteStart, setCommuteStart] = useState("");
  const [commuteEnd, setCommuteEnd] = useState("");
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);

  useEffect(() => {
    try {
      setCompact(localStorage.getItem("voynu-saarthi-compact") === "true");
      setNotificationSound(localStorage.getItem("voynu-saarthi-notification-sound") !== "false");
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session) {
        router.push("/login");
        return;
      }
      const { data: d, error: e } = await supabase
        .from("drivers")
        .select("*,vehicles(*)")
        .eq("email", s.session.user.email)
        .maybeSingle();
      if (!cancelled) {
        if (e) setError(e.message);
        setDriver(d);
        if (d) loadCommuteAvailability(d.id);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const openNotifications = async () => {
    setModal("notifications");
    setNotificationLoading(true);
    setError("");
    const { data: s } = await supabase.auth.getSession();
    const userId = s?.session?.user?.id;
    if (!userId) {
      setNotificationLoading(false);
      router.push("/login");
      return;
    }
    const { data, error: e } = await supabase
      .from("notifications")
      .select("id, booking_id, type, title, message, data, read_at, created_at")
      .eq("user_id", userId)
      .eq("type", "driver_trip_assigned")
      .order("created_at", { ascending: false })
      .limit(30);
    if (e) setError(e.message);
    setNotifications(data || []);
    setNotificationLoading(false);
  };

  const markAllNotificationsRead = async () => {
    const { error: e } = await supabase.rpc("mark_all_notifications_read");
    if (e) {
      setError(e.message);
      return;
    }
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => item.read_at ? item : { ...item, read_at: now }));
  };

  const tomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const loadCommuteAvailability = async (driverId) => {
    if (!driverId) return;
    const { data } = await supabase
      .from("driver_subscription_unavailability")
      .select("id,start_date,end_date,reason,status,created_at")
      .eq("driver_id", driverId)
      .order("start_date", { ascending: false })
      .limit(20);
    setUnavailability(data || []);
  };

  const submitCommuteUnavailability = async () => {
    if (!driver || commuteSaving) return;
    setError("");
    if (!commuteStart || !commuteEnd) { setError("Select the start and end date."); return; }
    if (commuteStart < tomorrowDate()) { setError("Commute unavailability must start from tomorrow or later."); return; }
    if (commuteEnd < commuteStart) { setError("End date cannot be before the start date."); return; }
    if (commuteReason.trim().length < 3) { setError("Please provide a reason for the unavailability."); return; }
    setCommuteSaving(true);
    const { error: e } = await supabase.rpc("request_driver_subscription_unavailability", {
      p_start_date: commuteStart,
      p_end_date: commuteEnd,
      p_reason: commuteReason.trim(),
    });
    if (e) {
      setError(e.message);
      setCommuteSaving(false);
      return;
    }
    await loadCommuteAvailability(driver.id);
    setCommuteStart("");
    setCommuteEnd("");
    setCommuteReason("");
    setCommuteSaving(false);
    setModal(null);
  };

  const setAvailability = async (value) => {
    if (!driver || availabilitySaving) return;
    setAvailabilitySaving(true);
    setError("");
    const { data, error: e } = await supabase.rpc("set_driver_availability", { p_status: value });
    if (e) {
      setError(e.message);
      setAvailabilitySaving(false);
      return;
    }
    setDriver((current) => ({ ...current, availability_status: data?.availability_status || value }));
    setAvailabilitySaving(false);
    setModal(null);
  };

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    try { localStorage.setItem("voynu-saarthi-compact", String(next)); } catch {}
  };

  const toggleNotificationSound = () => {
    const next = !notificationSound;
    setNotificationSound(next);
    try { localStorage.setItem("voynu-saarthi-notification-sound", String(next)); } catch {}
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!driver) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: theme.colors.bg }}>Loading account…</main>;

  const rows = [
    ["♨", "Notifications", notifications.length ? `${notifications.filter((n) => !n.read_at).length} unread booking/trip alerts` : "Booking and trip alerts", openNotifications],
    ["◉", "Availability", driver.availability_status || "Not set", () => setModal("availability")],
    ["◷", "Commute availability", unavailability.some((x) => x.status === "active") ? "Active future unavailability request" : "Unavailable for future subscription trips", () => setModal("commute")],
    ["?", "Help & Support", "Get help from VOYNU operations", () => window.open("https://wa.me/919918614844?text=" + encodeURIComponent("Hi VOYNU, I need help with my Saarthi driver account."), "_blank", "noopener,noreferrer")],
    ["⚙", "App settings", "Language, appearance and preferences", () => setModal("settings")],
  ];

  return (
    <DriverChrome active="account" subtitle="Earnings & Account">
      <div style={{ width: "min(760px,calc(100% - 28px))", margin: "auto", padding: compact ? "10px 0 24px" : "16px 0 30px" }}>
        <section style={{ background: "#fff", borderRadius: 22, padding: 18, border: "1px solid " + theme.colors.border, boxShadow: theme.shadow.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 62, height: 62, borderRadius: 20, background: theme.colors.primaryTint, color: theme.colors.primary, display: "grid", placeItems: "center", fontSize: 25, fontWeight: 900 }}>{driver.full_name?.[0] || "D"}</div>
            <div>
              <h1 style={{ fontSize: 20, margin: 0 }}>{driver.full_name}</h1>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>{driver.phone}</div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 14, background: "#fff", borderRadius: 20, padding: 16, border: "1px solid " + theme.colors.border }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Vehicle information</h2>
          <div style={{ padding: 13, borderRadius: 14, background: "#F7F9FB" }}>
            <b>{driver.vehicles?.registration_number || "No vehicle assigned"}</b>
            <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>{driver.vehicles ? (driver.vehicles.make + " " + driver.vehicles.model + " · " + driver.vehicles.category) : "Contact admin to assign a vehicle"}</div>
          </div>
        </section>

        <section style={{ marginTop: 14, background: "#fff", borderRadius: 20, border: "1px solid " + theme.colors.border, overflow: "hidden" }}>
          {rows.map(([icon, title, value, onClick], index) => (
            <button type="button" key={title} onClick={onClick} style={{ width: "100%", textAlign: "left", padding: compact ? "11px 14px" : "14px", border: 0, borderBottom: index === rows.length - 1 ? 0 : "1px solid " + theme.colors.border, display: "flex", alignItems: "center", gap: 12, background: "#fff", cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 13, background: theme.colors.primaryTint, color: theme.colors.primary, display: "grid", placeItems: "center", fontSize: 18 }}>{icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 12 }}>{title}</b>
                <div style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              </div>
              <span style={{ fontSize: 18, color: theme.colors.textFaint }}>›</span>
            </button>
          ))}
        </section>

        {error && <div style={{ marginTop: 12, padding: 11, borderRadius: 12, background: "#FFF7F7", border: "1px solid #F3B8BC", color: "#B4232E", fontSize: 11 }}>{error}</div>}

        <button type="button" onClick={logout} style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 14, border: "1px solid #F3B8BC", background: "#FFF7F7", color: "#D92D3B", fontWeight: 900, cursor: "pointer" }}>⇥ &nbsp; Log out</button>
      </div>

      {modal === "notifications" && (
        <Modal title="Notifications" onClose={() => setModal(null)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: theme.colors.textMuted }}>{notifications.filter((n) => !n.read_at).length} unread</span>
            <button type="button" onClick={markAllNotificationsRead} disabled={!notifications.some((n) => !n.read_at)} style={{ border: 0, background: "transparent", color: theme.colors.primary, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Mark all read</button>
          </div>
          {notificationLoading ? <div style={{ padding: 24, textAlign: "center", color: theme.colors.textFaint }}>Loading notifications…</div> : notifications.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: theme.colors.textFaint, fontSize: 12 }}>No driver notifications yet.</div> : notifications.map((n) => (
            <button type="button" key={n.id} onClick={async () => { if (!n.read_at) { await supabase.rpc("mark_notification_read", { p_notification_id: n.id }); setNotifications((items) => items.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)); } }} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid " + theme.colors.border, background: n.read_at ? "#fff" : theme.colors.primaryTint, padding: 12, cursor: "pointer" }}>
              <b style={{ fontSize: 12 }}>{n.title || "New trip assigned"}</b>
              <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: theme.colors.textMuted }}>{n.message || "A new trip has been assigned to you."}</div>
              <div style={{ marginTop: 5, fontSize: 9, color: theme.colors.textFaint }}>{n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : ""}</div>
            </button>
          ))}
        </Modal>
      )}

      {modal === "availability" && (
        <Modal title="Availability" onClose={() => setModal(null)}>
          <div style={{ padding: 13, borderRadius: 13, background: "#F7F9FB", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: theme.colors.textFaint, fontWeight: 900 }}>CURRENT STATUS</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, textTransform: "capitalize" }}>{driver.availability_status || "offline"}</div>
            <div style={{ marginTop: 4, fontSize: 11, color: theme.colors.textMuted }}>Set yourself available when you are ready to receive new trip assignments.</div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button type="button" disabled={availabilitySaving} onClick={() => setAvailability("available")} style={{ minHeight: 46, border: 0, borderRadius: 12, background: theme.gradients.primary, color: "#fff", fontWeight: 900, cursor: "pointer" }}>{availabilitySaving ? "Saving…" : "Set Available"}</button>
            <button type="button" disabled={availabilitySaving} onClick={() => setAvailability("offline")} style={{ minHeight: 46, border: "1px solid " + theme.colors.border, borderRadius: 12, background: "#fff", color: theme.colors.text, fontWeight: 900, cursor: "pointer" }}>Set Offline</button>
          </div>
        </Modal>
      )}

      {modal === "commute" && (
        <Modal title="Commute availability" onClose={() => setModal(null)}>
          <div style={{ padding: 13, borderRadius: 13, background: "#F7F9FB", marginBottom: 12, fontSize: 11, lineHeight: 1.5, color: theme.colors.textMuted }}>
            Use this when you cannot operate your <b>future scheduled commute subscription trips</b>. Your current or in-progress trip is never interrupted. VOYNU will place affected future dates into the admin replacement queue.
          </div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 5 }}>Unavailable from</label>
          <input type="date" min={tomorrowDate()} value={commuteStart} onChange={(e) => setCommuteStart(e.target.value)} style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 11px", border: "1px solid " + theme.colors.border, borderRadius: 11, marginBottom: 10 }} />
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 5 }}>Unavailable until</label>
          <input type="date" min={commuteStart || tomorrowDate()} value={commuteEnd} onChange={(e) => setCommuteEnd(e.target.value)} style={{ width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 11px", border: "1px solid " + theme.colors.border, borderRadius: 11, marginBottom: 10 }} />
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 5 }}>Reason</label>
          <textarea value={commuteReason} onChange={(e) => setCommuteReason(e.target.value)} placeholder="Tell VOYNU why you are unavailable" rows={4} style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid " + theme.colors.border, borderRadius: 11, resize: "vertical" }} />
          <div style={{ marginTop: 7, fontSize: 10, color: theme.colors.textMuted }}>Only future dates are accepted. If a date has already started or is in progress, VOYNU leaves that trip untouched.</div>
          <button type="button" disabled={commuteSaving} onClick={submitCommuteUnavailability} style={{ width: "100%", minHeight: 46, marginTop: 13, border: 0, borderRadius: 12, background: theme.gradients.primary, color: "#fff", fontWeight: 900, cursor: "pointer" }}>{commuteSaving ? "Submitting…" : "Submit unavailability"}</button>
          {unavailability.length > 0 && <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8 }}>Previous requests</div>
            <div style={{ display: "grid", gap: 8 }}>{unavailability.map((item) => <div key={item.id} style={{ padding: 11, borderRadius: 12, border: "1px solid " + theme.colors.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 11 }}>{item.start_date} → {item.end_date}</b><span style={{ fontSize: 9, fontWeight: 900, textTransform: "capitalize", color: item.status === "active" ? theme.colors.primary : theme.colors.textMuted }}>{item.status}</span></div>
              <div style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 4 }}>{item.reason}</div>
            </div>)}</div>
          </div>}
        </Modal>
      )}

      {modal === "settings" && (
        <Modal title="App settings" onClose={() => setModal(null)}>
          <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 12 }}>These preferences are saved on this device.</div>
          <button type="button" onClick={toggleCompact} style={{ width: "100%", textAlign: "left", padding: 13, border: "1px solid " + theme.colors.border, borderRadius: 13, background: "#fff", cursor: "pointer", marginBottom: 8 }}>
            <b style={{ fontSize: 12 }}>Compact layout</b>
            <div style={{ marginTop: 3, fontSize: 10, color: theme.colors.textMuted }}>{compact ? "On · uses tighter spacing" : "Off · uses standard spacing"}</div>
          </button>
          <button type="button" onClick={toggleNotificationSound} style={{ width: "100%", textAlign: "left", padding: 13, border: "1px solid " + theme.colors.border, borderRadius: 13, background: "#fff", cursor: "pointer" }}>
            <b style={{ fontSize: 12 }}>Notification sound</b>
            <div style={{ marginTop: 3, fontSize: 10, color: theme.colors.textMuted }}>{notificationSound ? "On" : "Off"}</div>
          </button>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#F7F9FB", fontSize: 10, color: theme.colors.textMuted, lineHeight: 1.5 }}>
            Language selection will be added when Saarthi's translated interface is enabled. No language is changed by this screen yet.
          </div>
        </Modal>
      )}
    </DriverChrome>
  );
}
