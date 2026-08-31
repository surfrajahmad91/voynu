"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";

export default function SaarthiLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const loggedInEmail = data?.user?.email || "";
    const { data: driverRow, error: driverError } = await supabase
      .from("drivers")
      .select("id, active")
      .eq("email", loggedInEmail)
      .maybeSingle();

    if (driverError || !driverRow || driverRow.active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is not linked to an active VOYNU Saarthi driver profile.");
      return;
    }

    router.replace("/driver");
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f3f8f5", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 28, borderRadius: 20, background: "#fff", boxShadow: "0 12px 40px rgba(10,40,25,.10)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: "#0b7a3e", color: "#fff", fontWeight: 800, fontSize: 22 }}>V</div>
          <div>
            <div style={{ color: "#0b7a3e", fontWeight: 800, fontSize: 20 }}>VOYNU Saarthi</div>
            <div style={{ color: "#718078", fontSize: 12, marginTop: 2 }}>Driver app</div>
          </div>
        </div>

        <h1 style={{ margin: "0 0 6px", fontSize: 22 }}>Saarthi login</h1>
        <p style={{ margin: "0 0 22px", color: "#718078", fontSize: 13 }}>Sign in with your registered driver account.</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ height: 50, border: "1.5px solid #e3e9e5", borderRadius: 12, padding: "0 14px", fontSize: 14, boxSizing: "border-box" }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ height: 50, border: "1.5px solid #e3e9e5", borderRadius: 12, padding: "0 14px", fontSize: 14, boxSizing: "border-box" }} />
          {error && <div style={{ color: "#b42318", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ height: 52, border: 0, borderRadius: 13, background: "#0b7a3e", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1 }}>{loading ? "Signing in..." : "Sign in to Saarthi"}</button>
        </form>

        <Link href="/forgot-password" style={{ display: "block", marginTop: 18, textAlign: "center", color: "#0b7a3e", fontSize: 12.5, fontWeight: 700 }}>Forgot password?</Link>
      </div>
    </main>
  );
}
