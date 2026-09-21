import { supabase } from "../../../shared/lib/supabaseClient";

/*
 * IMPORTANT: this is a UI convenience. The security boundary is the database:
 * every admin table/RPC checks public.is_admin() (profiles.role = 'admin') under RLS.
 * Admin access is decided by the database, so adding another admin needs no code change.
 * The list below is only a fallback when the database cannot be reached.
 */
export const ADMIN_EMAILS = ["surfrajahmad@gmail.com"];

const cache = new Map(); // email -> { at, value }
const TTL_MS = 60 * 1000;

export async function isAdminUser(email = "") {
  const key = String(email || "").toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value = null;
  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (!error && typeof data === "boolean") value = data;
  } catch {}
  if (value === null) value = ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(key);
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearAdminCache() { cache.clear(); }
