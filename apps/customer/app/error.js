"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error("VOYNU app error:", error); }, [error]);
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center", background: "#F7F9FC", color: "#1E3348", fontFamily: "var(--voynu-font)" }}>
      <img src="/icon.svg" alt="VOYNU" width={56} height={56} style={{ borderRadius: 16 }} />
      <h1 style={{ margin: "10px 0 0", fontSize: 21, fontWeight: 800 }}>Something went wrong</h1>
      <p style={{ margin: 0, maxWidth: 320, color: "#5B6B7C", fontSize: 13, lineHeight: 1.55 }}>Please try again. If it keeps happening, check your connection or contact VOYNU support.</p>
      <button type="button" onClick={() => reset()} style={{ minHeight: 50, marginTop: 14, padding: "0 28px", border: 0, borderRadius: 16, background: "linear-gradient(135deg,#12A0C6,#0A7FA6)", color: "#fff", fontWeight: 800, fontSize: 14 }}>Try again</button>
    </main>
  );
}
