"use client";

import { createClient } from "@supabase/supabase-js";

// These are intentionally public client-side values. Supabase publishable keys
// are designed to be exposed in frontend applications; RLS remains the security
// boundary. Vercel environment variables take precedence when configured.
const DEFAULT_SUPABASE_URL = "https://huibxdxwspjqsxsdfxfb.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6HZwp5AyccKkTkSMZ3i_Bw_d2HjS2cI";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
