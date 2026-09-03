"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import AuthShell from "../components/AuthShell";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // The customer app is role-neutral. Admins and drivers can use the
    // same account here and are treated exactly like normal customers.
    // Elevated Admin/Saarthi access remains enforced by those apps and
    // their backend authorization rules.
    setLoading(false);
    router.replace("/");
  };

  const inputStyle = {
    width: "100%",
    height: 50,
    border: "1.5px solid #e3e9e5",
    borderRadius: 12,
    padding: "0 14px",
    fontSize: 14,
    fontFamily: theme.fontFamily,
    outline: "none",
    boxSizing: "border-box",
    background: "#f8faf9",
  };

  return (
    <AuthShell>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
          Welcome back
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.colors.textFaint }}>
          Log in to book your next ride.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <Link
          href="/forgot-password"
          style={{
            alignSelf: "flex-end",
            fontSize: 12,
            color: theme.colors.primary,
            fontWeight: 600,
            marginTop: -4,
          }}
        >
          Forgot password?
        </Link>

        {error && (
          <div style={{ color: theme.colors.error, fontSize: 12.5, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            height: 52,
            border: 0,
            borderRadius: 13,
            background: theme.gradients.primary,
            color: "#ffffff",
            fontFamily: theme.fontFamily,
            fontWeight: 800,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginTop: 6,
            boxShadow: theme.shadow.button,
          }}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

      </form>

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.colors.textFaint }}>
        Don't have an account?{" "}
        <Link href="/signup" style={{ color: theme.colors.primary, fontWeight: 700 }}>
          Sign up
        </Link>
      </p>

    </AuthShell>
  );
}
