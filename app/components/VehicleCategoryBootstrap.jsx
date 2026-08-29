"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CACHE_KEY = "voynu_vehicle_categories_v1";
const PRICING_CACHE_KEY = "voynu_pricing_v1";
const RELOAD_KEY = "voynu_bootstrap_reload_v1";

export default function VehicleCategoryBootstrap() {
  useEffect(() => {
    if (window.location.pathname !== "/cab-selection") return;

    let cancelled = false;

    const maybeReloadWhenReady = () => {
      if (cancelled || window.sessionStorage.getItem(RELOAD_KEY) === "1") return;
      if (!window.localStorage.getItem(CACHE_KEY) || !window.localStorage.getItem(PRICING_CACHE_KEY)) return;
      window.sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const syncCategories = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled || !sessionData?.session?.user) return;

      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("id,name,slug,description,passenger_capacity,luggage_capacity,active,bookable,sort_order,image_url")
        .eq("active", true)
        .eq("bookable", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled || error || !Array.isArray(data)) return;

      const normalized = data.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        passenger_capacity: Number(category.passenger_capacity) || 0,
        luggage_capacity: Number(category.luggage_capacity) || 0,
        sort_order: Number(category.sort_order) || 0,
        image_url: category.image_url || null,
        active: true,
        bookable: true,
      }));

      window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      maybeReloadWhenReady();
    };

    syncCategories();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.setTimeout(syncCategories, 0);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
