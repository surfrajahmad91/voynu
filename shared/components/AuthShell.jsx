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

export default function AuthShell({ children, panelDescription, showMarketingPanel = true, showProductBar = true, whatsappLabel = "Chat with us", whatsappHref }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #F7FAFC 0%, #F1F6F9 48%, #F8F7F5 100%)",
        fontFamily: theme.fontFamily,
        color: theme.colors.text,
      }}
    >
      <PageHeader
        maxWidth={theme.maxWidth.wide}
        showAccountLink={false}
        showWhatsapp={true}
        showProductBar={showProductBar}
        whatsappLabel={whatsappLabel}
        whatsappHref={whatsappHref}
      />

      <div className="authAmbient" aria-hidden="true">
        <div className="authMapGrid" />
        <div className="authMapGlow authMapGlowOne" />
        <div className="authMapGlow authMapGlowTwo" />
        <div className="authMapRoute authMapRouteOne" />
        <div className="authMapRoute authMapRouteTwo" />
        <div className="authMapRoute authMapRouteThree" />
        <span className="authMapNode authMapNodeOne" />
        <span className="authMapNode authMapNodeTwo" />
        <span className="authMapNode authMapNodeThree" />
        <span className="authMapChip authMapChipOne">Pickup</span>
        <span className="authMapChip authMapChipTwo">Destination</span>
        <span className="authMapChip authMapChipThree">VOYNU</span>
      </div>

      <div className={"authShellGrid" + (showMarketingPanel ? "" : " authShellGridCompact")}>
        {showMarketingPanel && <div className="authShellPanel">
          <div className="authShellPanelInner">
            <div className="authShellEyebrow">VOYNU • INTERCITY TRAVEL</div>

            <h2 style={{ margin: "12px 0 0", fontSize: 30, lineHeight: 1.12, fontWeight: 800, letterSpacing: -0.8 }}>
              Your ride,<br />your way.
            </h2>

            <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.76)", maxWidth: 330 }}>
              {panelDescription || "Book a reliable cab for your journey with clear pricing, verified drivers and a smoother travel experience."}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }}>
              <span className="authShellPill"><IconCheckCircle size={12} /> Verified Drivers</span>
              <span className="authShellPill"><IconShield size={12} /> Safe &amp; Secure</span>
              <span className="authShellPill"><IconBolt size={12} /> EV Rides</span>
            </div>

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
          </div>
        </div>}

        <div className="authShellFormWrap">
          <div className="authShellFormCard">{children}</div>
        </div>
      </div>

      <style jsx>{`
        .authShellGrid {
          position: relative;
          z-index: 1;
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

        .authAmbient {
          position: absolute;
          inset: 68px 0 0;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(circle at 18% 22%, rgba(18,160,198,.10), transparent 28%),
            radial-gradient(circle at 82% 74%, rgba(245,129,63,.10), transparent 30%);
        }

        .authMapGrid {
          position: absolute;
          inset: -12%;
          opacity: .42;
          background-image:
            linear-gradient(rgba(10,127,166,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10,127,166,.045) 1px, transparent 1px);
          background-size: 44px 44px;
          transform: rotate(-5deg) scale(1.08);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 82%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 82%, transparent 100%);
        }

        .authMapGlow {
          position: absolute;
          border-radius: 50%;
          filter: blur(28px);
        }
        .authMapGlowOne {
          width: 360px;
          height: 360px;
          left: -170px;
          top: 8%;
          background: rgba(18,160,198,.12);
        }
        .authMapGlowTwo {
          width: 420px;
          height: 420px;
          right: -210px;
          bottom: 3%;
          background: rgba(245,129,63,.11);
        }

        .authMapRoute {
          position: absolute;
          border: 2px solid rgba(10,127,166,.12);
          border-left-color: transparent;
          border-bottom-color: rgba(245,129,63,.13);
          border-radius: 50%;
          transform-origin: center;
        }
        .authMapRouteOne {
          width: 720px;
          height: 330px;
          left: -250px;
          top: 8%;
          transform: rotate(-13deg);
        }
        .authMapRouteTwo {
          width: 760px;
          height: 360px;
          right: -310px;
          top: 39%;
          transform: rotate(158deg);
        }
        .authMapRouteThree {
          width: 560px;
          height: 250px;
          left: 18%;
          bottom: 2%;
          border-color: rgba(10,127,166,.075);
          transform: rotate(8deg);
        }

        .authMapNode {
          position: absolute;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2px solid rgba(10,127,166,.55);
          box-shadow: 0 0 0 7px rgba(10,127,166,.07);
        }
        .authMapNodeOne { left: 13%; top: 25%; }
        .authMapNodeTwo { right: 14%; top: 51%; border-color: rgba(213,85,42,.55); box-shadow: 0 0 0 7px rgba(213,85,42,.07); }
        .authMapNodeThree { left: 25%; bottom: 16%; }

        .authMapChip {
          position: absolute;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,.8);
          border-radius: 10px;
          background: rgba(255,255,255,.62);
          color: rgba(10,35,55,.60);
          box-shadow: 0 8px 22px rgba(10,35,55,.05);
          backdrop-filter: blur(10px);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .35px;
        }
        .authMapChipOne { left: 9%; top: 19%; }
        .authMapChipTwo { right: 9%; top: 55%; }
        .authMapChipThree { right: 12%; bottom: 13%; color: rgba(10,127,166,.72); }

        .authShellGridCompact { grid-template-columns: 1fr; min-height: calc(100vh - 68px); }
        .authShellGridCompact .authShellFormWrap { padding: 24px 0 56px; }
        .authShellFormWrap { display: flex; justify-content: center; padding: 30px 0; }
        .authShellFormCard { width: 100%; max-width: 420px; box-sizing: border-box; padding: 28px 28px; border-radius: 26px; background: rgba(255,255,255,.92); border: 1px solid rgba(255,255,255,.95); box-shadow: 0 28px 70px rgba(10,35,55,.12), 0 4px 14px rgba(10,35,55,.04); backdrop-filter: blur(14px); }

        @media (max-width: 900px) {
          .authShellGrid { grid-template-columns: 1fr; min-height: auto; padding: 24px 0 50px; }
          .authShellGridCompact { min-height: auto; padding: 24px 0 50px; }
          .authAmbient { inset: 62px 0 0; }
          .authMapGrid { background-size: 34px 34px; opacity: .34; }
          .authMapGlowOne { width: 240px; height: 240px; left: -130px; top: 10%; }
          .authMapGlowTwo { width: 280px; height: 280px; right: -150px; bottom: 8%; }
          .authMapRouteOne { width: 520px; height: 250px; left: -260px; top: 11%; }
          .authMapRouteTwo { width: 560px; height: 260px; right: -290px; top: 46%; }
          .authMapRouteThree { width: 430px; height: 210px; left: 8%; bottom: 3%; }
          .authMapChipThree { display: none; }
          .authShellPanel { min-height: 420px; padding: 34px 26px; }
          .authShellFormWrap { padding: 0; }
          .authShellFormCard { max-width: 420px; border-radius: 22px; padding: 24px 20px; }
        }

        @media (max-width: 520px) {
          .authShellPanel { min-height: 390px; border-radius: 24px; }
          .routePreview { height: 175px; margin-top: 26px; }
        }
      `}</style>
    </main>
  );
}
