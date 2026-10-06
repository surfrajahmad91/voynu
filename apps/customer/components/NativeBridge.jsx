"use client";

import { useEffect } from "react";

// Tiny bridge for the Capacitor Android shell. Does nothing in a normal browser.
// - marks <html data-native-app="android"> so CSS can adapt if needed
// - light haptic tick on button presses
export default function NativeBridge() {
  useEffect(() => {
    const cap = typeof window !== "undefined" ? window.Capacitor : null;
    if (!cap?.isNativePlatform?.()) return undefined;
    document.documentElement.setAttribute("data-native-app", "android");

    const haptics = cap.Plugins?.Haptics;
    const onPress = (event) => {
      const el = event.target?.closest?.("button, [role='button'], a.btn");
      if (!el || el.disabled) return;
      try { Promise.resolve(haptics?.impact?.({ style: "LIGHT" })).catch(() => {}); } catch { /* haptics unavailable */ }
    };
    document.addEventListener("pointerdown", onPress, { passive: true });
    return () => document.removeEventListener("pointerdown", onPress);
  }, []);
  return null;
}
