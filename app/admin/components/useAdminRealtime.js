"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export function useAdminRealtime(refresh, enabled = true) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let refreshTimer = null;

    const refreshSafely = () => {
      if (disposed) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      refreshRef.current?.();
    };

    const scheduleRefresh = () => {
      if (disposed || refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshSafely();
      }, 250);
    };

    const channel = supabase
      .channel(`voynu-admin-live-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_settings" }, scheduleRefresh)
      .subscribe();

    const fallbackTimer = window.setInterval(refreshSafely, 10000);
    const onFocus = refreshSafely;
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshSafely();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.clearInterval(fallbackTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
