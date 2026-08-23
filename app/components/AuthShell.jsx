"use client";

import { theme } from "../lib/theme";
import PageHeader from "./PageHeader";

function IconCheckCircle({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" />
    </svg>
  );
}

function IconShield({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l7.5 3.5v5.5c0 5-3.2 8.3-7.5 9.9-4.3-1.6-7.5-4.9-7.5-9.9V6l7.5-3.5z" />
    </svg>
  );
}

function IconBolt({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function IconCarGraphic() {
  return (
    <svg viewBox="0 0 220 130" width="100%" height="100%">
      <ellipse cx="110" cy="115" rx="90" ry="8" fill="rgba(255,255,255,0.15)" />
      <path
        d="M20 90 C20 74 30 66 46 64 L54 46 C58 36 68 30 80 30 H150 C162 30 172 36 176 46 L184 64 C198 66 208 74 208 90 V96 C208 100 205 103 201 103 H27 C23 103 20 100 20 96 Z"
        fill="#ffffff"
      />
      <rect x="70" y="26" width="70" height="6" rx="3" fill="#e6f5ec" />
      <path
        d="M60 62 L66 48 C68 44 72 41 77 41 H147 C152 41 156 44 158 48 L164 62 Z"
        fill="#0a7d42"
      />
      <rect x="110" y="41" width="5" height="21" fill="#ffffff" />
      <line x1="115" y1="64" x2="115" y2="96" stroke="#e6f5ec" strokeWidth="2" />
      <circle cx="66" cy="98" r="20" fill="rgba(0,0,0,0.18)" />
      <circle cx="162" cy="98" r="20" fill="rgba(0,0,0,0.18)" />
      <circle cx="66" cy="98" r="13" fill="#0a3d22" />
      <circle cx="66" cy="98" r="5.5" fill="#ffffff" />
      <circle cx="162" cy="98" r="13" fill="#0a3d22" />
      <circle cx="162" cy="98" r="5.5" fill="#ffffff" />
      <rect x="196" y="70" width="8" height="10" rx="3" fill="#f4c542" />
      <rect x="130" y="70" width="14" height="3" rx="1.5" fill="#e6f5ec" />
    </svg>
  );
}

export default function AuthShell({ children }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.colors.bg,
        fontFamily: theme.fontFamily,
        color: theme.colors.text,
      }}
    >
      <PageHeader
        maxWidth={theme.maxWidth.wide}
        showAccountLink={false}
        showWhatsapp={true}
      />

      <div className="authShellGrid">

        <div className="authShellPanel">

          <div className="authShellPanelInner">

            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
              Your ride,<br />your way.
            </h2>

            <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 320 }}>
              Book a reliable cab for your journey. Travel safe. Travel smart.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }}>

              <span className="authShellPill">
                <IconCheckCircle size={12} /> Verified Drivers
              </span>

              <span className="authShellPill">
                <IconShield size={12} /> Safe &amp; Secure
              </span>

              <span className="authShellPill">
                <IconBolt size={12} /> EV Rides
              </span>

            </div>

            <div style={{ width: "min(260px, 70%)", margin: "34px auto 0" }}>
              <IconCarGraphic />
            </div>

          </div>

        </div>

        <div className="authShellFormWrap">
          <div className="authShellFormCard">
            {children}
          </div>
        </div>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .authShellGrid {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          min-height: calc(100vh - 68px);
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 40px;
        }

        .authShellPanel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          border-radius: 28px;
          background: linear-gradient(160deg, #0a7d42 0%, #075c31 100%);
          color: #ffffff;
          min-height: 480px;
        }

        .authShellPanelInner {
          text-align: center;
        }

        .authShellPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          font-size: 11.5px;
          font-weight: 700;
        }

        .authShellFormWrap {
          display: flex;
          justify-content: center;
          padding: 30px 0;
        }

        .authShellFormCard {
          width: 100%;
          max-width: 380px;
          padding: 34px 30px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid #e5ede8;
          box-shadow: 0 30px 80px -20px rgba(10,40,25,0.18);
        }

        @media (max-width: 900px) {

          .authShellGrid {
            grid-template-columns: 1fr;
            min-height: auto;
            padding: 24px 0 50px;
          }

          .authShellPanel {
            display: none;
          }

          .authShellFormWrap {
            padding: 0;
          }

          .authShellFormCard {
            border-radius: 20px;
            padding: 28px 22px;
          }

        }

      `}</style>

    </main>
  );
}
