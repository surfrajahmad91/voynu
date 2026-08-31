"use client";

import { useEffect } from "react";
import { supabase } from "../../../app/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../app/lib/admin";

export default function RealtimeSync() {
  useEffect(() => {
    let disposed = false;
    let reloadTimer = null;
    let pendingWhileHidden = false;
    let channel = null;

    const scheduleReload = () => {
      if (disposed) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        pendingWhileHidden = true;
        return;
      }
      if (reloadTimer) return;
      reloadTimer = window.setTimeout(() => {
        reloadTimer = null;
        if (!disposed) window.location.reload();
      }, 300);
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";
      if (disposed || !data?.session || !ADMIN_EMAILS.includes(email)) return;

      channel = supabase
        .channel("voynu-admin-live-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, scheduleReload)
        .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleReload)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dispatch_settings" }, scheduleReload)
        .subscribe();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && pendingWhileHidden) {
        pendingWhileHidden = false;
        scheduleReload();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      disposed = true;
      if (reloadTimer) window.clearTimeout(reloadTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
