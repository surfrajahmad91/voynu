"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "../lib/supabaseClient";

function IconUser({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.2 4-6.4 8-6.4s8 2.2 8 6.4" />
    </svg>
  );
}

export default function AccountLink() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setLoggedIn(Boolean(data?.session));
        setChecking(false);
      }
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setLoggedIn(Boolean(session));
        }
      );

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (checking) {
    return null;
  }

  return (
    <Link
      href={loggedIn ? "/account" : "/login"}
      className="accountLink"
    >
      <IconUser size={13} />
      <span>{loggedIn ? "My Account" : "Log in"}</span>

      <style jsx>{`

        .accountLink {
          display: flex;
          align-items: center;

          gap: 6px;

          padding: 9px 14px;

          border-radius: 30px;

          background: #eaf6ee;
          color: #0a5c32;

          text-decoration: none;

          font-size: 12.5px;
          font-weight: 700;
        }

      `}</style>

    </Link>
  );
}
