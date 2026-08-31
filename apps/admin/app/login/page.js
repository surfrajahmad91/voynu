"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../app/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../app/lib/admin";
import { theme } from "../../../app/lib/theme";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const currentEmail = data?.session?.user?.email || "";
      if (!cancelled && data?.session && ADMIN_EMAILS.includes(currentEmail)) router.replace("/admin");
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const loggedInEmail = data?.user?.email || "";
    if (!ADMIN_EMAILS.includes(loggedInEmail)) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is not authorized for VOYNU Admin.");
      return;
    }

    router.replace("/admin");
  };

  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: theme.colors.bg, color: theme.colors.text }}>Checking access…</main>;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, padding: 28, borderRadius: 18, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, boxShadow: theme.shadow.card }}>
        <div style={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 14, background: theme.gradients.primary, color: "#fff", fontWeight: 900, fontSize: 22 }}>V</div>
        <h1 style={{ margin: "18px 0 5px", fontSize: 25, fontWeight: 850 }}>VOYNU Admin</h1>
        <p style={{ margin: 0, fontSize: 13, color: theme.colors.textFaint }}>Authorized operations access</p>

        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" autoComplete="email" required style={{ width: "100%", height: 48, boxSizing: "border-box", padding: "0 13px", borderRadius: 11, border: `1px solid ${theme.colors.border}`, background: "#f8faf9", fontFamily: theme.fontFamily }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required style={{ width: "100%", height: 48, boxSizing: "border-box", padding: "0 13px", borderRadius: 11, border: `1px solid ${theme.colors.border}`, background: "#f8faf9", fontFamily: theme.fontFamily }} />
          {error && <div style={{ padding: 11, borderRadius: 10, background: theme.colors.errorBg, color: theme.colors.error, fontSize: 12, fontWeight: 700 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ height: 48, border: 0, borderRadius: 11, background: theme.colors.primary, color: "#fff", fontFamily: theme.fontFamily, fontWeight: 800, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Signing in…" : "Sign in to Admin"}</button>
        </div>
      </form>
    </main>
  );
}
