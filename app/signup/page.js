"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";

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

  return (
    <main className="page">

      <div className="authCard">

        <Link href="/" className="brand">
          <div className="brandMark">V</div>
          <div className="brandName">VOYNU</div>
        </Link>

        <h1>Create your account</h1>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="authError">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>

        </form>

        <p className="authFooter">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </p>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5faf6;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 20px;
        }

        .authCard {
          width: 100%;
          max-width: 380px;
          padding: 32px 28px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(10,40,25,0.10);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 24px;
        }

        .brandMark {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #fff;
          font-weight: 800;
        }

        .brandName {
          color: #0a7d42;
          font-weight: 800;
          font-size: 16px;
        }

        h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 20px;
          color: #16241d;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        input {
          height: 48px;
          border: 1.5px solid #e3e9e5;
          border-radius: 11px;
          padding: 0 14px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }

        input:focus {
          border-color: #0a7d42;
        }

        button {
          height: 50px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          margin-top: 6px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .authError {
          color: #b33d34;
          font-size: 12.5px;
          font-weight: 600;
        }

        .authFooter {
          margin-top: 18px;
          text-align: center;
          font-size: 13px;
          color: #6b7a72;
        }

        .authFooter a {
          color: #0a7d42;
          font-weight: 700;
          text-decoration: none;
        }

      `}</style>

    </main>
  );
              }
