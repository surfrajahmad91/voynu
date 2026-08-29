"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CACHE_KEY = "voynu_vehicle_categories_v1";
const READY_EVENT = "voynu-vehicle-categories-ready";

export default function VehicleCategoryBootstrap() {
  useEffect(() => {
    if (window.location.pathname !== "/cab-selection") return;

    let cancelled = false;

    const syncCategories = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled || !sessionData?.session?.user) return;

      const { data, error } = await supabase
        .from("vehicle_categories")
        .select(
          "id,name,slug,description,passenger_capacity,luggage_capacity,active,bookable,sort_order,image_url"
        )
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

      const next = JSON.stringify(normalized);
      window.localStorage.setItem(CACHE_KEY, next);
      window.dispatchEvent(new CustomEvent(READY_EVENT));
    };

    syncCategories();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.setTimeout(() => { syncCategories(); }, 0);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
