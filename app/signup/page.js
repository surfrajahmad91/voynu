"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import AuthShell from "../components/AuthShell";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    const { error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/");
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
          Create your account
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.colors.textFaint }}>
          Join VOYNU to start booking rides.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Creating account..." : "Sign up"}
        </button>

      </form>

      <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.colors.textFaint }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: theme.colors.primary, fontWeight: 700 }}>
          Log in
        </Link>
      </p>

    </AuthShell>
  );
}
