"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";

// Home / Work saved places, stored in the customer's account metadata so they follow them across devices.
export const PLACE_KINDS = ["home", "work"];

let cache = null; // null = not loaded yet
const subscribers = new Set();
let authListening = false;

function normalize(raw) {
  const out = {};
  for (const kind of PLACE_KINDS) {
    const p = raw?.[kind];
    if (p && p.name && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))) {
      out[kind] = { name: String(p.name), lat: Number(p.lat), lon: Number(p.lon), placeId: p.placeId || null, city: p.city || null };
    }
  }
  return out;
}

function emit() { subscribers.forEach((fn) => fn(cache || {})); }

async function load() {
  const { data } = await supabase.auth.getUser();
  cache = normalize(data?.user?.user_metadata?.saved_places);
  emit();
}

async function persist(next) {
  const { error } = await supabase.auth.updateUser({ data: { saved_places: next } });
  if (error) { await load(); throw error; }
}

export function useSavedPlaces() {
  const [places, setPlaces] = useState(cache || {});

  useEffect(() => {
    subscribers.add(setPlaces);
    if (!authListening) {
      authListening = true;
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") { cache = null; emit(); }
        if (event === "SIGNED_IN") load();
      });
    }
    if (cache === null) load(); else setPlaces(cache);
    return () => { subscribers.delete(setPlaces); };
  }, []);

  const save = useCallback(async (kind, place) => {
    if (!PLACE_KINDS.includes(kind) || !place?.name) return;
    cache = { ...(cache || {}), [kind]: { name: place.name, lat: place.lat, lon: place.lon, placeId: place.placeId || null, city: place.city || null } };
    emit();
    await persist(cache);
  }, []);

  const remove = useCallback(async (kind) => {
    const next = { ...(cache || {}) };
    delete next[kind];
    cache = next;
    emit();
    await persist(next);
  }, []);

  return { places, save, remove };
}
