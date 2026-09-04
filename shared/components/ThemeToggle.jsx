"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "voynu-theme";

function applyTheme(value) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.voynuTheme = value;
  document.documentElement.style.colorScheme = value;
}

function SunIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.7 8.7 0 1 0 11.3 11.3Z" />
    </svg>
  );
}

export default function ThemeToggle({ compact = false }) {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = saved === "dark" || saved === "light"
      ? saved
      : (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setMode(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (next) => {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <div className={`voynu-theme-toggle${compact ? " compact" : ""}`} role="group" aria-label="Theme">
      <button
        type="button"
        aria-pressed={mode === "light"}
        className={mode === "light" ? "active" : ""}
        onClick={() => setTheme("light")}
        title="Light theme"
      >
        <SunIcon /><span className="themeLabel">Light</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === "dark"}
        className={mode === "dark" ? "active" : ""}
        onClick={() => setTheme("dark")}
        title="Dark theme"
      >
        <MoonIcon /><span className="themeLabel">Dark</span>
      </button>
      <style jsx>{`
        .voynu-theme-toggle { display:flex; align-items:center; gap:3px; padding:3px; border:1px solid var(--voynu-border,#E5E9EF); border-radius:999px; background:var(--voynu-surface,#fff); box-shadow:0 4px 14px rgba(13,27,42,.08); }
        button { border:0; background:transparent; color:var(--voynu-muted,#687280); min-height:32px; min-width:32px; padding:0 9px; border-radius:999px; display:flex; align-items:center; justify-content:center; gap:5px; font:600 10.5px/1 "Poppins","Plus Jakarta Sans",system-ui,sans-serif; cursor:pointer; transition:background .18s ease,color .18s ease,transform .18s ease; }
        button.active { background:var(--voynu-navy,#0D1B2A); color:#fff; }
        button:active { transform:scale(.97); }
        button:focus-visible { outline:2px solid var(--voynu-teal,#00B4A6); outline-offset:2px; }
        .compact button { min-height:28px; padding:0 7px; }
        .compact .themeLabel { display:none; }
        @media (max-width:420px) { .themeLabel { display:none; } button { width:32px; padding:0; } }
      `}</style>
    </div>
  );
}
