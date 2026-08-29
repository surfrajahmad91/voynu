"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CACHE_KEY = "voynu_pricing_v1";

export default function PricingBootstrap() {
  useEffect(() => {
    if (window.location.pathname !== "/cab-selection") return;
    let cancelled = false;
    (async () => {
      const { data: version, error: versionError } = await supabase.from("pricing_versions").select("id,version,status,effective_from").eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle();
      if (cancelled || versionError || !version) return;
      const { data: rules, error } = await supabase.from("pricing_rules").select("vehicle_category_id,trip_type,base_fare,per_km_rate,driver_allowance_per_day,minimum_fare,rounding_unit").eq("pricing_version_id", version.id);
      if (cancelled || error || !Array.isArray(rules) || rules.length === 0) return;
      const payload = { version: version.version, effective_from: version.effective_from, rules };
      const next = JSON.stringify(payload);
      const previous = window.localStorage.getItem(CACHE_KEY);
      window.localStorage.setItem(CACHE_KEY, next);
      // The cab-selection fare calculator reads from localStorage. On a fresh
      // browser there is no previous cache, so reload once after the first
      // successful sync as well; otherwise the page can render with no fares.
      if (previous !== next) window.location.reload();
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}
