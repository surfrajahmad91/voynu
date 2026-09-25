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
        <div className="authJourneyGlow authJourneyGlowOne" />
        <div className="authJourneyGlow authJourneyGlowTwo" />
        <svg className="authJourneyMap" viewBox="0 0 1200 900" preserveAspectRatio="none">
          <defs>
            <linearGradient id="voynuRouteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#12A0C6" />
              <stop offset="52%" stopColor="#6FD6EC" />
              <stop offset="100%" stopColor="#F5813F" />
            </linearGradient>
            <linearGradient id="voynuRoadFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0A7FA6" stopOpacity=".08" />
              <stop offset="50%" stopColor="#0A2337" stopOpacity=".18" />
              <stop offset="100%" stopColor="#D4552A" stopOpacity=".08" />
            </linearGradient>
            <filter id="voynuGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="voynuGrid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M42 0H0V42" fill="none" stroke="#0A7FA6" strokeOpacity=".07" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1200" height="900" fill="url(#voynuGrid)" />
          <path d="M-80 610 C 130 390, 250 760, 480 545 S 770 250, 1020 430 S 1230 700, 1320 500"
                fill="none" stroke="url(#voynuRoadFade)" strokeWidth="42" strokeLinecap="round" />
          <path d="M-80 610 C 130 390, 250 760, 480 545 S 770 250, 1020 430 S 1230 700, 1320 500"
                fill="none" stroke="url(#voynuRouteGradient)" strokeOpacity=".48" strokeWidth="3.5" strokeLinecap="round"
                filter="url(#voynuGlow)" />
          <path d="M-40 300 C 180 190, 290 360, 455 330 S 720 120, 930 245 S 1110 430, 1260 310"
                fill="none" stroke="#0A2337" strokeOpacity=".10" strokeWidth="2" strokeDasharray="8 13" />
          <path d="M80 820 C 250 650, 430 760, 590 700 S 850 570, 1130 690"
                fill="none" stroke="#0A7FA6" strokeOpacity=".10" strokeWidth="2" />
          <circle cx="205" cy="470" r="9" fill="#FFFFFF" stroke="#12A0C6" strokeWidth="4" filter="url(#voynuGlow)" />
          <circle cx="705" cy="345" r="9" fill="#FFFFFF" stroke="#12A0C6" strokeWidth="4" filter="url(#voynuGlow)" />
          <circle cx="1015" cy="465" r="10" fill="#FFFFFF" stroke="#F5813F" strokeWidth="4" filter="url(#voynuGlow)" />
          <circle cx="205" cy="470" r="25" fill="#12A0C6" fillOpacity=".06" />
          <circle cx="1015" cy="465" r="28" fill="#F5813F" fillOpacity=".07" />
        </svg>
        <div className="authJourneyBadge authJourneyBadgeOne"><span /> Pickup</div>
        <div className="authJourneyBadge authJourneyBadgeTwo">ON ROUTE</div>
        <div className="authJourneyBadge authJourneyBadgeThree">Destination <span /></div>
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
            radial-gradient(ellipse at 50% 30%, rgba(10,35,55,.055), transparent 48%),
            linear-gradient(160deg, #F4F8FB 0%, #EEF5F8 52%, #FAF6F2 100%);
        }

        .authAmbient::after {
          content: "";
          position: absolute;
          inset: 12% 0 0;
          background: linear-gradient(180deg, rgba(10,35,55,.045), transparent 34%, rgba(245,129,63,.035) 78%, transparent);
        }

        .authJourneyGlow {
          position: absolute;
          border-radius: 50%;
          filter: blur(42px);
          opacity: .9;
        }
        .authJourneyGlowOne {
          width: 420px;
          height: 420px;
          left: -190px;
          top: 10%;
          background: rgba(18,160,198,.13);
        }
        .authJourneyGlowTwo {
          width: 500px;
          height: 500px;
          right: -250px;
          bottom: 2%;
          background: rgba(245,129,63,.12);
        }

        .authJourneyMap {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: .9;
        }

        .authJourneyBadge {
          position: absolute;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.78);
          border-radius: 999px;
          background: rgba(255,255,255,.66);
          color: rgba(10,35,55,.64);
          box-shadow: 0 10px 28px rgba(10,35,55,.07);
          backdrop-filter: blur(14px);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .5px;
        }
        .authJourneyBadge span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #12A0C6;
          box-shadow: 0 0 0 4px rgba(18,160,198,.10);
        }
        .authJourneyBadgeOne { left: 13%; top: 30%; }
        .authJourneyBadgeTwo { left: 49%; top: 43%; color: #0A7FA6; }
        .authJourneyBadgeThree { right: 11%; top: 54%; }
        .authJourneyBadgeThree span { background: #F5813F; box-shadow: 0 0 0 4px rgba(245,129,63,.10); }

        .authShellGridCompact { grid-template-columns: 1fr; min-height: calc(100vh - 68px); }
        .authShellGridCompact .authShellFormWrap { padding: 24px 0 56px; }
        .authShellFormWrap { display: flex; justify-content: center; padding: 30px 0; }
        .authShellFormCard { width: 100%; max-width: 420px; box-sizing: border-box; padding: 28px 28px; border-radius: 26px; background: rgba(255,255,255,.84); border: 1px solid rgba(255,255,255,.96); box-shadow: 0 30px 80px rgba(10,35,55,.14), 0 6px 18px rgba(10,35,55,.05); backdrop-filter: blur(20px); }

        @media (max-width: 900px) {
          .authShellGrid { grid-template-columns: 1fr; min-height: auto; padding: 24px 0 50px; }
          .authShellGridCompact { min-height: auto; padding: 24px 0 50px; }
          .authAmbient { inset: 62px 0 0; }
          .authJourneyMap { opacity: .82; }
          .authJourneyGlowOne { width: 280px; height: 280px; left: -150px; top: 9%; }
          .authJourneyGlowTwo { width: 320px; height: 320px; right: -170px; bottom: 4%; }
          .authJourneyBadgeOne { left: 7%; top: 27%; }
          .authJourneyBadgeTwo { left: 42%; top: 46%; }
          .authJourneyBadgeThree { right: 5%; top: 56%; }
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
