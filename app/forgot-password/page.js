"use client";

import { useState } from "react";
import Link from "next/link";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import AuthShell from "../components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
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
          Reset your password
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.colors.textFaint }}>
          Enter your account email and we'll send a reset link.
        </p>
      </div>

      {sent ? (
        <div style={{
          padding: "14px 16px",
          borderRadius: 12,
          background: theme.colors.primaryTint,
          color: theme.colors.primary,
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          If an account exists for <strong>{email}</strong>, a reset link has
          been sent. Check your inbox (and spam folder) — it can take a few
          minutes to arrive.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

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
            {loading ? "Sending..." : "Send reset link"}
          </button>

        </form>
      )}

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.colors.textFaint }}>
        <Link href="/login" style={{ color: theme.colors.primary, fontWeight: 700 }}>
          Back to log in
        </Link>
      </p>

    </AuthShell>
  );
}
