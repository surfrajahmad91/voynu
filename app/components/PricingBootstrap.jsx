"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CACHE_KEY = "voynu_pricing_v1";

export default function PricingBootstrap() {
  useEffect(() => {
    if (window.location.pathname !== "/cab-selection") return;

    let cancelled = false;
    let reloaded = false;

    const syncPricing = async () => {
      // Supabase may still be restoring the browser session when layout
      // effects first run. Pricing is restricted to authenticated users, so
      // wait for a real session before querying the pricing tables.
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled || !sessionData?.session?.user) return;

      const { data: version, error: versionError } = await supabase
        .from("pricing_versions")
        .select("id,version,status,effective_from")
        .eq("status", "active")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || versionError || !version) return;

      const { data: rules, error } = await supabase
        .from("pricing_rules")
        .select("vehicle_category_id,trip_type,base_fare,per_km_rate,driver_allowance_per_day,minimum_fare,rounding_unit")
        .eq("pricing_version_id", version.id);

      if (cancelled || error || !Array.isArray(rules) || rules.length === 0) return;

      const payload = { version: version.version, effective_from: version.effective_from, rules };
      const next = JSON.stringify(payload);
      const previous = window.localStorage.getItem(CACHE_KEY);
      window.localStorage.setItem(CACHE_KEY, next);

      // Reload once only when the cache actually changed. The reload makes
      // the synchronous fare calculator consume the freshly synced rules.
      if (previous !== next && !reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };

    // Try immediately if the session is already restored.
    syncPricing();

    // Also retry as soon as Supabase finishes restoring/signing in the user.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.setTimeout(() => { syncPricing(); }, 0);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
