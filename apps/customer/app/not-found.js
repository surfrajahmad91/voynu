import Link from "next/link";

export const metadata = { title: "Page not found · VOYNU" };

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center", background: "#F7F9FC", color: "#1E3348", fontFamily: "var(--voynu-font)" }}>
      <img src="/icon.svg" alt="VOYNU" width={56} height={56} style={{ borderRadius: 16 }} />
      <h1 style={{ margin: "10px 0 0", fontSize: 24, fontWeight: 800 }}>We couldn&apos;t find that page</h1>
      <p style={{ margin: 0, maxWidth: 320, color: "#5B6B7C", fontSize: 14, lineHeight: 1.55 }}>The link may be old or the page may have moved.</p>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 50, marginTop: 14, padding: "0 28px", borderRadius: 16, background: "linear-gradient(135deg,#12A0C6,#0A7FA6)", color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Back to home</Link>
    </main>
  );
}
