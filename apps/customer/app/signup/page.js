"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../../../../shared/lib/supabaseClient";
import { theme } from "../../../../shared/lib/theme";
import AuthShell from "../../../../shared/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin + "/",
        },
      });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const confirmed = Boolean(data?.user?.email_confirmed_at);
    if (confirmed) {
      router.replace("/");
      return;
    }

    if (data?.session) {
      await supabase.auth.signOut();
    }
    setVerificationSent(true);
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
    }
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

      {verificationSent ? (
        <>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
              Verify your email
            </h1>
            <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.5, color: theme.colors.textFaint }}>
              One quick step before you start using VOYNU.
            </p>
          </div>

          <div style={{
            padding: "15px",
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
              Verification email sent
            </div>
            We sent a verification link to <strong style={{ color: theme.colors.text }}>{email}</strong>. Open the email and verify your address before logging in. Check your spam folder if you don't see it.
          </div>

          {error && (
            <div style={{ marginTop: 12, color: theme.colors.error, fontSize: 12.5, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button type="button" onClick={handleResend} disabled={resending} style={{
            width: "100%", height: 50, marginTop: 16, border: 0, borderRadius: 13,
            background: theme.gradients.primary, color: "#fff", fontFamily: theme.fontFamily,
            fontWeight: 800, fontSize: 14, cursor: resending ? "wait" : "pointer",
            opacity: resending ? 0.7 : 1, boxShadow: theme.shadow.button,
          }}>
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.colors.text }}>
              Create your VOYNU account
            </h1>
            <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.5, color: theme.colors.textFaint }}>
              Sign up once and unlock rides, commute and rentals in VOYNU.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            {error && <div style={{ color: theme.colors.error, fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              height: 52, border: 0, borderRadius: 13, background: theme.gradients.primary,
              color: "#ffffff", fontFamily: theme.fontFamily, fontWeight: 800, fontSize: 14,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 6,
              boxShadow: theme.shadow.button,
            }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </>
      )}

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.colors.textFaint }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: theme.colors.primary, fontWeight: 700 }}>
          Log in
        </Link>
      </p>

    </AuthShell>
  );
}
