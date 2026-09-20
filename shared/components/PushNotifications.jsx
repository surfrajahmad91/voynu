"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = "BO6Z_INPC3tEC3TPFYtPJDTaaQruf33y1FwnuGCxTiVR751_XwfABH3BRKHv5HAFR2d2hKcUVOmNyVmgNgb95Oo";
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// A subscription made with an older VAPID key can never receive our pushes: replace it.
function keyMatches(subscription) {
  try {
    const current = subscription.options?.applicationServerKey;
    if (!current) return true;
    const a = new Uint8Array(current);
    const b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    return a.length === b.length && a.every((value, index) => value === b[index]);
  } catch {
    return true;
  }
}

async function ensureSubscription(registration, allowCreate) {
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !keyMatches(subscription)) {
    await subscription.unsubscribe().catch(() => {});
    subscription = null;
  }
  if (!subscription && allowCreate) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }).catch(() => null);
  }
  return subscription;
}

export default function PushNotifications({ targetPath = "/account", audience = "customer" }) {
  const [userId, setUserId] = useState(null);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false); // never show the prompt until we know the real state
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");
  const userRef = useRef(null);
  const dismissKey = `voynu_push_prompt_dismissed_${audience}`;

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

  useEffect(() => {
    let cancelled = false;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!ok) {
      setSupported(false);
      setReady(true);
      return undefined;
    }
    try {
      if (Number(localStorage.getItem(dismissKey) || 0) > Date.now()) setDismissed(true);
    } catch {}

    // Already allowed on this device: make sure the subscription exists and is saved, silently (no prompt).
    const check = async (id) => {
      const registration = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!registration) return false;
      const subscription = await ensureSubscription(registration, Notification.permission === "granted");
      if (!subscription) return false;
      return saveSubscription(id, subscription);
    };

    const handle = async (id) => {
      userRef.current = id;
      setUserId(id);
      setPermission(Notification.permission);
      setEnabled(false);
      if (!id) {
        setReady(true);
        return;
      }
      setReady(false);
      const saved = await check(id).catch(() => false);
      if (cancelled || userRef.current !== id) return;
      setEnabled(saved);
      setReady(true);
    };

    supabase.auth.getSession().then(({ data }) => {
      const id = data?.session?.user?.id || null;
      if (!cancelled && id !== userRef.current) handle(id);
      else if (!cancelled && !id) setReady(true);
    });
    // Token refreshes and app-focus events re-emit the same session: only react when the user really changes.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id || null;
      if (id === userRef.current) return;
      handle(id);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, [audience]); // eslint-disable-line react-hooks/exhaustive-deps

  const enable = async () => {
    if (!userId || busy || !supported) return;
    setBusy(true);
    setMessage("");
    try {
      const nextPermission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await ensureSubscription(registration, true);
      if (!subscription) throw new Error("Could not subscribe this device to notifications.");
      const saved = await saveSubscription(userId, subscription);
      if (!saved) throw new Error("Could not save notification subscription.");
      setEnabled(true);
    } catch (error) {
      console.error("VOYNU push notification setup failed", error);
      setEnabled(false);
      setMessage("Couldn't turn notifications on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {}
  };

  if (!ready || !userId || !supported || enabled || dismissed || permission === "denied") return null;

  return (
    <div style={{ position: "fixed", left: 14, right: 14, bottom: "max(14px, env(safe-area-inset-bottom))", zIndex: 1200, display: "flex", alignItems: "center", gap: 10, padding: "11px 12px 11px 14px", borderRadius: 16, background: "#ffffff", border: "1px solid #dce7e1", boxShadow: "0 12px 35px rgba(10,40,25,0.16)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#12251a" }}>Stay updated with VOYNU</div>
        <div style={{ marginTop: 2, fontSize: 10.5, lineHeight: 1.35, color: "#617168" }}>{message || "Get booking and trip updates on your phone."}</div>
      </div>
      <button type="button" onClick={enable} disabled={busy} style={{ flexShrink: 0, border: 0, borderRadius: 20, padding: "9px 13px", background: "#0b7a3e", color: "#ffffff", fontSize: 10.5, fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? "Enabling…" : "Enable"}</button>
      <button type="button" aria-label="Dismiss notification prompt" onClick={dismiss} style={{ border: 0, background: "transparent", color: "#7a8880", fontSize: 18, lineHeight: 1, padding: 4, cursor: "pointer" }}>×</button>
    </div>
  );
}
