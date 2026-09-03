"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "voynu-theme";

function applyTheme(value) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.voynuTheme = value;
  document.documentElement.style.colorScheme = value;
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
        <span aria-hidden="true">☼</span><span className="themeLabel">Light</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === "dark"}
        className={mode === "dark" ? "active" : ""}
        onClick={() => setTheme("dark")}
        title="Dark theme"
      >
        <span aria-hidden="true">◐</span><span className="themeLabel">Dark</span>
      </button>
      <style jsx>{`
        .voynu-theme-toggle { display:flex; align-items:center; gap:3px; padding:3px; border:1px solid var(--voynu-border,#E5E9EF); border-radius:999px; background:var(--voynu-surface,#fff); box-shadow:0 4px 14px rgba(13,27,42,.08); }
        button { border:0; background:transparent; color:var(--voynu-muted,#687280); min-height:32px; padding:0 9px; border-radius:999px; display:flex; align-items:center; justify-content:center; gap:5px; font:600 10.5px/1 "Poppins","Plus Jakarta Sans",system-ui,sans-serif; cursor:pointer; }
        button.active { background:var(--voynu-navy,#0D1B2A); color:#fff; }
        button:focus-visible { outline:2px solid var(--voynu-teal,#00B4A6); outline-offset:2px; }
        .compact button { min-height:28px; padding:0 7px; }
        .compact .themeLabel { display:none; }
        @media (max-width:420px) { .themeLabel { display:none; } button { width:32px; padding:0; } }
      `}</style>
    </div>
  );
}
