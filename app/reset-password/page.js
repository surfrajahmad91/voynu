"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import AuthShell from "../components/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    /*
     * Supabase's password-reset email links land here with a
     * recovery token in the URL. onAuthStateChange fires a
     * PASSWORD_RECOVERY event once Supabase has processed it
     * and established a temporary session for the update below.
     */
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setHasRecoverySession(true);
        }
        setCheckingSession(false);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setHasRecoverySession(true);
      }
      setCheckingSession(false);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
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

  if (checkingSession) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.colors.bg,
      }}>
        <div style={{
          width: 34,
          height: 34,
          border: "3px solid rgba(8,120,63,0.18)",
          borderTopColor: theme.colors.primary,
          borderRadius: "50%",
        }} />
      </main>
    );
  }

  if (success) {
    return (
      <AuthShell>
        <div style={{ marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
            Password updated
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: theme.colors.textFaint, lineHeight: 1.5 }}>
            Your password has been changed. You can now log in with your
            new password.
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          style={{
            width: "100%",
            height: 52,
            border: 0,
            borderRadius: 13,
            background: theme.gradients.primary,
            color: "#ffffff",
            fontFamily: theme.fontFamily,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            marginTop: 18,
            boxShadow: theme.shadow.button,
          }}
        >
          Go to log in
        </button>
      </AuthShell>
    );
  }

  if (!hasRecoverySession) {
    return (
      <AuthShell>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
            Link expired or invalid
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: theme.colors.textFaint, lineHeight: 1.5 }}>
            This password reset link is no longer valid. Please request a
            new one.
          </p>
        </div>
        <button
          onClick={() => router.push("/forgot-password")}
          style={{
            width: "100%",
            height: 52,
            border: 0,
            borderRadius: 13,
            background: theme.gradients.primary,
            color: "#ffffff",
            fontFamily: theme.fontFamily,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            marginTop: 18,
            boxShadow: theme.shadow.button,
          }}
        >
          Request new link
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
          Set a new password
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.colors.textFaint }}>
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <input
          type="password"
          placeholder="New password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Updating..." : "Update password"}
        </button>

      </form>

    </AuthShell>
  );
}
