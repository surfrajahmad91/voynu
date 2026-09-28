"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";

function IconUser({ size = 13 }) {
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "9px 14px",
        borderRadius: theme.radius.pill,
        background: "linear-gradient(135deg, rgba(255,255,255,.98) 0%, rgba(239,248,250,.94) 58%, rgba(255,243,236,.94) 100%)",
        color: theme.colors.navy,
        textDecoration: "none",
        fontSize: "12.5px",
        fontWeight: 700,
        fontFamily: theme.fontFamily,
        border: "1px solid rgba(10,127,166,.18)",
        boxShadow: "0 8px 20px rgba(10,35,55,.10), inset 0 1px 0 rgba(255,255,255,1)",
        whiteSpace: "nowrap",
        WebkitTapHighlightColor: "transparent",
        outline: "none",
        touchAction: "manipulation",
      }}
    >
      <IconUser size={13} />
      <span>{loggedIn ? "My Account" : "Log in"}</span>
    </Link>
  );
}
