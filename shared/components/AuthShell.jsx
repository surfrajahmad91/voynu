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

function RoutePreview() {
  return (
    <div className="routePreview" aria-hidden="true">
      <div className="routeGrid" />
      <div className="routeGlow routeGlowOne" />
      <div className="routeGlow routeGlowTwo" />
      <div className="routePath">
        <span className="routeStart" />
        <span className="routeCurve" />
        <span className="routeEnd" />
      </div>
      <div className="routeLabel routeLabelStart">
        <strong>Pickup</strong>
        <span>Your location</span>
      </div>
      <div className="routeLabel routeLabelEnd">
        <strong>Destination</strong>
        <span>Your journey</span>
      </div>
      <div className="routeEta">
        <span className="routeEtaDot" />
        <span>Trip planning made simple</span>
      </div>
    </div>
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
            <div className="authShellEyebrow">VOYNU • INTERCITY TRAVEL</div>

            <h2 style={{ margin: "12px 0 0", fontSize: 30, lineHeight: 1.12, fontWeight: 800, letterSpacing: -0.8 }}>
              Your ride,<br />your way.
            </h2>

            <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.76)", maxWidth: 330 }}>
              Book a reliable cab for your journey with clear pricing, verified drivers and a smoother travel experience.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }}>
              <span className="authShellPill"><IconCheckCircle size={12} /> Verified Drivers</span>
              <span className="authShellPill"><IconShield size={12} /> Safe &amp; Secure</span>
              <span className="authShellPill"><IconBolt size={12} /> EV Rides</span>
            </div>

            <RoutePreview />
          </div>
        </div>

        <div className="authShellFormWrap">
          <div className="authShellFormCard">{children}</div>
        </div>
      </div>

      <style jsx>{`
        .authShellGrid {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          min-height: calc(100vh - 68px);
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(360px, .82fr);
          align-items: center;
          gap: 52px;
        }

        .authShellPanel {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          border-radius: 30px;
          background: linear-gradient(145deg, #0A2337 0%, #0E2D46 58%, #12384F 100%);
          color: #ffffff;
          min-height: 540px;
          box-shadow: 0 30px 80px rgba(10,35,55,.16);
          isolation: isolate;
        }

        .authShellPanel::before {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          right: -120px;
          top: -150px;
          border-radius: 50%;
          background: rgba(10,127,166,.16);
          filter: blur(8px);
          z-index: -1;
        }

        .authShellPanel::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          left: -150px;
          bottom: -170px;
          border-radius: 50%;
          background: rgba(245,129,63,.18);
          filter: blur(10px);
          z-index: -1;
        }

        .authShellPanelInner { width: 100%; max-width: 500px; }
        .authShellEyebrow { font-size: 10px; font-weight: 800; letter-spacing: 1.6px; color: #6FD6EC; }

        .authShellPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 999px;
          background: rgba(255,255,255,.075);
          color: rgba(255,255,255,.9);
          font-size: 11.5px;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        .routePreview {
          position: relative;
          height: 205px;
          margin-top: 34px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 22px;
          background: rgba(255,255,255,.045);
        }

        .routeGrid {
          position: absolute;
          inset: 0;
          opacity: .32;
          background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
          background-size: 34px 34px;
          transform: rotate(-7deg) scale(1.18);
        }

        .routeGlow { position: absolute; border-radius: 50%; filter: blur(28px); }
        .routeGlowOne { width: 110px; height: 110px; left: 18px; top: 30px; background: rgba(10,127,166,.12); }
        .routeGlowTwo { width: 130px; height: 130px; right: 4px; bottom: 0; background: rgba(245,129,63,.14); }

        .routePath { position: absolute; inset: 30px 34px 40px; }
        .routeCurve { position: absolute; left: 34px; right: 38px; top: 56px; height: 72px; border-top: 3px solid rgba(111,214,236,.82); border-radius: 50%; transform: rotate(-8deg); box-shadow: 0 0 18px rgba(10,127,166,.18); }
        .routeStart, .routeEnd { position: absolute; width: 13px; height: 13px; border-radius: 50%; z-index: 2; }
        .routeStart { left: 28px; top: 49px; background: #6FD6EC; box-shadow: 0 0 0 6px rgba(111,214,236,.14); }
        .routeEnd { right: 30px; top: 103px; background: #FFFFFF; box-shadow: 0 0 0 6px rgba(255,255,255,.10); }

        .routeLabel { position: absolute; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.09); border-radius: 10px; background: rgba(10,35,55,.72); backdrop-filter: blur(8px); }
        .routeLabel strong { font-size: 10px; color: #fff; }
        .routeLabel span { font-size: 9px; color: rgba(255,255,255,.55); }
        .routeLabelStart { left: 22px; top: 16px; }
        .routeLabelEnd { right: 20px; bottom: 42px; }

        .routeEta { position: absolute; left: 18px; right: 18px; bottom: 14px; display: flex; align-items: center; gap: 7px; font-size: 9.5px; color: rgba(255,255,255,.56); }
        .routeEtaDot { width: 6px; height: 6px; border-radius: 50%; background: #0A7FA6; box-shadow: 0 0 0 4px rgba(10,127,166,.10); }

        .authShellFormWrap { display: flex; justify-content: center; padding: 30px 0; }
        .authShellFormCard { width: 100%; max-width: 410px; padding: 36px 32px; border-radius: 24px; background: #ffffff; border: 1px solid #EEF3F7; box-shadow: 0 30px 80px -20px rgba(10,35,55,.16); }

        @media (max-width: 900px) {
          .authShellGrid { grid-template-columns: 1fr; min-height: auto; padding: 24px 0 50px; }
          .authShellPanel { min-height: 420px; padding: 34px 26px; }
          .authShellFormWrap { padding: 0; }
          .authShellFormCard { max-width: 520px; border-radius: 20px; padding: 30px 22px; }
        }

        @media (max-width: 520px) {
          .authShellPanel { min-height: 390px; border-radius: 24px; }
          .routePreview { height: 175px; margin-top: 26px; }
        }
      `}</style>
    </main>
  );
}
