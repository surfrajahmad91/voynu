"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";

function IconBell({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationBell({ targetPath = "/account" }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data?.session?.user?.id || null;

      if (cancelled) return;
      setUserId(id);

      if (!id) {
        setLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from("notifications")
        .select("id, booking_id, type, title, message, data, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!cancelled) {
        setNotifications(rows || []);
        setLoading(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id || null;
      setUserId(id);
      if (!id) setNotifications([]);
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`voynu-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((current) => [payload.new, ...current].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const markRead = async (notification) => {
    if (!notification.read_at) {
      await supabase.rpc("mark_notification_read", {
        p_notification_id: notification.id,
      });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    }

    setOpen(false);
    router.push(targetPath);
  };

  const markAllRead = async () => {
    if (!unreadCount) return;

    await supabase.rpc("mark_all_notifications_read");
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.read_at ? item : { ...item, read_at: now }))
    );
  };

  if (!userId) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "relative",
          width: 42,
          height: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: `1px solid ${theme.colors.border}`,
          background: "#ffffff",
          color: theme.colors.primary,
          cursor: "pointer",
          boxShadow: "0 5px 14px rgba(10,40,25,0.06)",
        }}
      >
        <IconBell />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 1,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: theme.colors.accent,
              color: "#ffffff",
              border: "2px solid #ffffff",
              fontSize: 8.5,
              fontWeight: 800,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 0,
            width: "min(360px, calc(100vw - 32px))",
            maxHeight: 430,
            overflow: "hidden",
            borderRadius: 16,
            border: `1px solid ${theme.colors.border}`,
            background: "#ffffff",
            boxShadow: "0 18px 45px rgba(10,40,25,0.16)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${theme.colors.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: theme.colors.text }}>
                Notifications
              </div>
              <div style={{ marginTop: 2, fontSize: 10.5, color: theme.colors.textFaint }}>
                {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  border: 0,
                  background: "transparent",
                  color: theme.colors.primary,
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: theme.colors.textFaint, fontSize: 12 }}>
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: theme.colors.textFaint, fontSize: 12, lineHeight: 1.5 }}>
                No notifications yet. We'll keep you updated here when something important happens.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => markRead(notification)}
                  style={{
                    width: "100%",
                    display: "block",
                    padding: "13px 16px",
                    textAlign: "left",
                    border: 0,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    background: notification.read_at ? "#ffffff" : theme.colors.primaryTint,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        marginTop: 5,
                        borderRadius: "50%",
                        background: notification.read_at ? "#c5d1ca" : theme.colors.primary,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: theme.colors.text }}>
                          {notification.title}
                        </span>
                        <span style={{ flexShrink: 0, fontSize: 9.5, color: theme.colors.textFaint }}>
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </span>
                      <span style={{ display: "block", marginTop: 4, fontSize: 11, lineHeight: 1.45, color: theme.colors.textMuted }}>
                        {notification.message}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
