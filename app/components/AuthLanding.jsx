"use client";

import Link from "next/link";

function IconCheckCircle({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" />
    </svg>
  );
}

function IconShield({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l7.5 3.5v5.5c0 5-3.2 8.3-7.5 9.9-4.3-1.6-7.5-4.9-7.5-9.9V6l7.5-3.5z" />
    </svg>
  );
}

function IconBolt({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function IconArrowRight({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconCarGraphic() {
  return (
    <svg viewBox="0 0 220 130" width="100%" height="100%">
      <ellipse cx="110" cy="115" rx="90" ry="8" fill="rgba(8,120,63,0.10)" />
      <path
        d="M20 90 C20 74 30 66 46 64 L54 46 C58 36 68 30 80 30 H150 C162 30 172 36 176 46 L184 64 C198 66 208 74 208 90 V96 C208 100 205 103 201 103 H27 C23 103 20 100 20 96 Z"
        fill="#0a7d42"
      />
      <rect x="70" y="26" width="70" height="6" rx="3" fill="#075c31" />
      <path
        d="M60 62 L66 48 C68 44 72 41 77 41 H147 C152 41 156 44 158 48 L164 62 Z"
        fill="#eaf6ee"
      />
      <rect x="110" y="41" width="5" height="21" fill="#0a7d42" />
      <line x1="115" y1="64" x2="115" y2="96" stroke="#075c31" strokeWidth="2" />
      <circle cx="66" cy="98" r="20" fill="#0a3d22" />
      <circle cx="162" cy="98" r="20" fill="#0a3d22" />
      <circle cx="66" cy="98" r="13" fill="#16241d" />
      <circle cx="66" cy="98" r="5.5" fill="#eaf6ee" />
      <circle cx="162" cy="98" r="13" fill="#16241d" />
      <circle cx="162" cy="98" r="5.5" fill="#eaf6ee" />
      <rect x="196" y="70" width="8" height="10" rx="3" fill="#f4c542" />
      <rect x="130" y="70" width="14" height="3" rx="1.5" fill="#075c31" />
    </svg>
  );
}

const fontFamily = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function AuthLanding() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #ffffff 0%, #f1faf4 55%, #e6f5ec 100%)",
        fontFamily,
        color: "#16241d",
      }}
    >

      <header
        style={{
          background: "rgba(255,255,255,0.92)",
          borderBottom: "1px solid #e8eee9",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 32px))",
            margin: "0 auto",
            minHeight: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                background: "linear-gradient(135deg, #0a7d42, #075c31)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 19,
              }}
            >
              V
            </div>
            <div style={{ color: "#0a7d42", fontWeight: 800, fontSize: 18 }}>
              VOYNU
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/login"
              style={{
                padding: "9px 16px",
                borderRadius: 30,
                color: "#0a5c32",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                padding: "9px 18px",
                borderRadius: 30,
                background: "linear-gradient(135deg, #0a7d42, #075c31)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 6px 16px rgba(8,120,63,0.24)",
              }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "40px 0 60px",
        }}
      >

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(40px,10vw,64px)",
              lineHeight: 1,
              letterSpacing: "-2px",
              fontWeight: 800,
              color: "#10201a",
            }}
          >
            Your ride,<br />
            <span style={{ color: "#0a7d42" }}>your way.</span>
          </h1>

          <p
            style={{
              margin: "18px 0 0",
              color: "#5c6d64",
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 420,
            }}
          >
            Book a reliable cab for your journey. Travel safe. Travel smart.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              marginTop: 24,
            }}
          >

            <div style={pillStyle}>
              <span style={pillIconStyle}><IconCheckCircle size={13} /></span>
              Verified Drivers
            </div>

            <div style={pillStyle}>
              <span style={pillIconStyle}><IconShield size={13} /></span>
              Safe &amp; Secure
            </div>

            <div style={pillStyle}>
              <span style={{ ...pillIconStyle, background: "#fdf1d8", color: "#b8790e" }}>
                <IconBolt size={13} />
              </span>
              EV Rides
            </div>

          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 340,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 32,
            }}
          >

            <Link
              href="/signup"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                minHeight: 54,
                borderRadius: 14,
                background: "linear-gradient(135deg, #0a7d42, #075c31)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14.5,
                boxShadow: "0 10px 24px rgba(8,120,63,.24)",
              }}
            >
              Get started
              <IconArrowRight size={17} />
            </Link>

            <Link
              href="/login"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 50,
                borderRadius: 14,
                border: "1.5px solid #dcebe1",
                color: "#0a7d42",
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              I already have an account
            </Link>

          </div>

          <div style={{ width: "min(320px, 82%)", marginTop: 40 }}>
            <IconCarGraphic />
          </div>

        </div>

      </section>

      <footer
        style={{
          background: "#12211a",
          color: "rgba(255,255,255,.72)",
        }}
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 32px))",
            margin: "0 auto",
            minHeight: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: 11,
            textAlign: "center",
          }}
        >
          <div>
            <strong style={{ color: "#ffffff" }}>VOYNU</strong>
            {" "}© {new Date().getFullYear()}
          </div>
          <div>Travel safe. Travel smart.</div>
        </div>
      </footer>

    </main>
  );
}

const pillStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px 8px 8px",
  borderRadius: 30,
  background: "#ffffff",
  border: "1px solid #e5ede8",
  color: "#2c3d34",
  fontSize: 12,
  fontWeight: 700,
};

const pillIconStyle = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "#e1f3e7",
  color: "#0a7d42",
};
