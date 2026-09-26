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
    <AuthShell
      showMarketingPanel={false}
      showProductBar={false}
      whatsappLabel="Need Help?"
      whatsappHref={"https://wa.me/919918614844?text=" + encodeURIComponent("Hi VOYNU, I need help.")}
    >

      <div style={{ marginBottom: sent ? 18 : 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
          {sent ? "Check your inbox" : "Reset your password"}
        </h1>
        <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.5, color: theme.colors.textFaint }}>
          {sent
            ? "We’ve sent instructions to help you get back into your VOYNU account."
            : "Enter your email and we’ll send you a secure password reset link."}
        </p>
      </div>

      {sent ? (
        <div style={{
          padding: "14px 15px",
          borderRadius: 15,
          background: "linear-gradient(145deg, rgba(231,244,248,.76), rgba(255,255,255,.66))",
          border: "1px solid rgba(18,160,198,.11)",
          color: theme.colors.textMuted,
          fontSize: 12.5,
          lineHeight: 1.5,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.9)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 7,
            color: theme.colors.primary,
            fontWeight: 800,
          }}>
            <span style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(18,160,198,.12)",
              color: theme.colors.primary,
              fontSize: 13,
              flexShrink: 0,
            }}>✓</span>
            Reset link sent
          </div>
          If an account is registered with <strong style={{ color: theme.colors.text }}>{email}</strong>, we’ve sent the reset link. Check your inbox and spam folder. It may take a few minutes to arrive.
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

      <p style={{ marginTop: sent ? 18 : 20, textAlign: "center", fontSize: 13, color: theme.colors.textFaint }}>
        <Link href="/login" style={{ color: theme.colors.primary, fontWeight: 700 }}>
          Back to log in
        </Link>
      </p>

    </AuthShell>
  );
}
