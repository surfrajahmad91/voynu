"use client";

import { supabase } from "./supabaseClient";

/*
 * Fetches all currently active, pickup-allowed service areas.
 * These are the geofenced regions VOYNU currently operates in
 * (e.g. Kanpur). Configurable in the database — no code change
 * needed to add a new city or adjust a boundary.
 */
export async function fetchActiveServiceAreas() {
  const { data, error } = await supabase
    .from("service_areas")
    .select("*")
    .eq("active", true)
    .eq("pickup_allowed", true);

  if (error) {
    console.error(
      "VOYNU: unable to fetch service areas:",
      error
    );
    return [];
  }

  return data || [];
}
