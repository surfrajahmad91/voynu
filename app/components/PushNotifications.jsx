"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = "BO6Z_INPC3tEC3TPFYtPJDTaaQruf33y1FwnuGCxTiVR751_XwfABH3BRKHv5HAFR2d2hKcUVOmNyVmgNgb95Oo";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotifications({ targetPath = "/account", audience = "customer" }) {
  const [userId, setUserId] = useState(null);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!ok) {
        setSupported(false);
        return;
      }
      setPermission(Notification.permission);
      const { data } = await supabase.auth.getSession();
      const id = data?.session?.user?.id || null;
      if (cancelled) return;
      setUserId(id);
      if (!id) return;

      const registration = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const saved = await saveSubscription(id, subscription);
        if (saved && !cancelled) setEnabled(true);
      }
    };
    setup();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      setEnabled(false);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, [audience]);

  async function saveSubscription(id, subscription) {
    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return false;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: id,
        audience,
        endpoint,
        p256dh,
        auth,
        expiration_time: subscription.expirationTime ?? null,
        user_agent: navigator.userAgent.slice(0, 500),
      },
      { onConflict: "endpoint" }
    );
    return !error;
  }

  const enable = async () => {
    if (!userId || busy || !supported) return;
    setBusy(true);
    try {
      const nextPermission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => {});

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const saved = await saveSubscription(userId, subscription);
      if (!saved) throw new Error("Could not save notification subscription.");
      setEnabled(true);
    } catch (error) {
      console.error("VOYNU push notification setup failed", error);
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  if (!userId || !supported || enabled || dismissed || permission === "denied") return null;

  return (
    <div style={{ position: "fixed", left: 14, right: 14, bottom: "max(14px, env(safe-area-inset-bottom))", zIndex: 1200, display: "flex", alignItems: "center", gap: 10, padding: "11px 12px 11px 14px", borderRadius: 16, background: "#ffffff", border: "1px solid #dce7e1", boxShadow: "0 12px 35px rgba(10,40,25,0.16)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#12251a" }}>Stay updated with VOYNU</div>
        <div style={{ marginTop: 2, fontSize: 10.5, lineHeight: 1.35, color: "#617168" }}>Get booking and trip updates on your phone.</div>
      </div>
      <button type="button" onClick={enable} disabled={busy} style={{ flexShrink: 0, border: 0, borderRadius: 20, padding: "9px 13px", background: "#0b7a3e", color: "#ffffff", fontSize: 10.5, fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? "Enabling…" : "Enable"}</button>
      <button type="button" aria-label="Dismiss notification prompt" onClick={() => setDismissed(true)} style={{ border: 0, background: "transparent", color: "#7a8880", fontSize: 18, lineHeight: 1, padding: 4, cursor: "pointer" }}>×</button>
    </div>
  );
}
