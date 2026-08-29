"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CACHE_KEY = "voynu_pricing_v1";
const CATEGORY_CACHE_KEY = "voynu_vehicle_categories_v1";
const RELOAD_KEY = "voynu_bootstrap_reload_v1";

export default function PricingBootstrap() {
  useEffect(() => {
    if (window.location.pathname !== "/cab-selection") return;

    let cancelled = false;

    const maybeReloadWhenReady = () => {
      if (cancelled || window.sessionStorage.getItem(RELOAD_KEY) === "1") return;
      if (!window.localStorage.getItem(CACHE_KEY) || !window.localStorage.getItem(CATEGORY_CACHE_KEY)) return;
      window.sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const syncPricing = async () => {
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
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      maybeReloadWhenReady();
    };

    syncPricing();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.setTimeout(syncPricing, 0);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
