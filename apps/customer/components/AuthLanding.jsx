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

function RoutePreview() {
  return (
    <div className="landingRoute" aria-hidden="true">
      <div className="landingRouteGrid" />
      <div className="landingRouteGlow landingRouteGlowOne" />
      <div className="landingRouteGlow landingRouteGlowTwo" />
      <div className="landingRouteLine" />
      <div className="landingRoutePoint landingRoutePointOne" />
      <div className="landingRoutePoint landingRoutePointTwo" />
      <div className="landingRouteCard landingRouteCardOne"><strong>Pickup</strong><span>Choose your location</span></div>
      <div className="landingRouteCard landingRouteCardTwo"><strong>Destination</strong><span>We'll plan the route</span></div>
      <div className="landingRouteFooter"><span className="landingPulse" /> Simple booking • clear pricing • verified drivers</div>
    </div>
  );
}

export default function AuthLanding() {
  return (
    <main className="landingPage">
      <header className="landingHeader">
        <div className="landingHeaderInner">
          <Link href="/" className="landingBrand">
            <img src="/icon.svg" alt="VOYNU" width="40" height="40" />
            <span>VOYNU</span>
          </Link>

          <div className="landingNav">
            <Link href="/login" className="landingLogin">Log in</Link>
            <Link href="/signup" className="landingSignup">Sign up</Link>
          </div>
        </div>
      </header>

      <section className="landingHero">
        <div className="landingCopy">
          <div className="landingEyebrow"><span /> INTERCITY TRAVEL, SIMPLIFIED</div>

          <h1>Your ride,<br /><span>your way.</span></h1>

          <p className="landingLead">
            Book a reliable cab for your journey with clear pricing, verified drivers and a smoother travel experience.
          </p>

          <div className="landingPills">
            <div style={pillStyle}><span style={pillIconStyle}><IconCheckCircle size={13} /></span> Verified Drivers</div>
            <div style={pillStyle}><span style={pillIconStyle}><IconShield size={13} /></span> Safe &amp; Secure</div>
            <div style={pillStyle}><span style={{ ...pillIconStyle, background: "#E7F4F8", color: "#0A7FA6" }}><IconBolt size={13} /></span> EV Rides</div>
          </div>

          <div className="landingActions">
            <Link href="/signup" className="landingPrimaryButton">Get started <IconArrowRight size={17} /></Link>
            <Link href="/login" className="landingSecondaryButton">I already have an account</Link>
          </div>
        </div>

        <div className="landingVisual">
          <div className="landingVisualTop">
            <span>VOYNU TRIP</span>
            <span className="landingLive"><i /> READY TO BOOK</span>
          </div>
          <RoutePreview />
          <div className="landingTrustRow">
            <div><strong>Transparent</strong><span>Upfront fare</span></div>
            <div><strong>Verified</strong><span>Driver network</span></div>
            <div><strong>Connected</strong><span>Trip updates</span></div>
          </div>
        </div>
      </section>

      <footer className="landingFooter">
        <div><strong>VOYNU</strong> © {new Date().getFullYear()}</div>
        <div>Travel safe. Travel smart.</div>
      </footer>

      <style jsx>{`
        .landingPage { min-height: 100vh; background: linear-gradient(160deg, #FFFFFF 0%, #F7F9FC 55%, #EEF3F7 100%); color: #1E3348; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .landingHeader { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.90); border-bottom: 1px solid #EEF3F7; backdrop-filter: blur(14px); }
        .landingHeaderInner { width: min(1180px, calc(100% - 32px)); min-height: 70px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .landingBrand { display: flex; align-items: center; gap: 10px; color: #0A2337; font-size: 19px; font-weight: 800; letter-spacing: -.5px; }
        .landingBrand img { border-radius: 12px; display: block; box-shadow: 0 7px 18px rgba(10,35,55,.14); }
        .landingNav { display: flex; align-items: center; gap: 8px; }
        .landingLogin { padding: 10px 14px; color: #445163; font-size: 13px; font-weight: 700; }
        .landingSignup { padding: 10px 18px; border-radius: 999px; background: linear-gradient(135deg, #12A0C6 0%, #0A7FA6 38%, #D4552A 100%); color: #fff; font-size: 13px; font-weight: 800; box-shadow: 0 9px 22px rgba(10,127,166,.18); }

        .landingHero { width: min(1180px, calc(100% - 32px)); min-height: calc(100vh - 70px); margin: 0 auto; padding: 58px 0 70px; display: grid; grid-template-columns: minmax(0,.9fr) minmax(430px,1fr); align-items: center; gap: 68px; }
        .landingEyebrow { display: flex; align-items: center; gap: 9px; color: #00456B; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
        .landingEyebrow span { width: 22px; height: 3px; border-radius: 99px; background: linear-gradient(90deg,#0A7FA6,#F5813F); }
        h1 { margin: 16px 0 0; font-size: clamp(48px,6vw,76px); line-height: .98; letter-spacing: -3px; font-weight: 800; color: #0A2337; }
        h1 span { background: linear-gradient(135deg,#0A7FA6,#12A0C6 45%,#F5813F); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .landingLead { max-width: 500px; margin: 22px 0 0; color: #5B6B7C; font-size: 15px; line-height: 1.7; }
        .landingPills { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 25px; }
        .landingActions { width: min(350px,100%); display: flex; flex-direction: column; gap: 10px; margin-top: 30px; }
        .landingPrimaryButton, .landingSecondaryButton { min-height: 54px; border-radius: 15px; display: flex; align-items: center; justify-content: center; gap: 9px; font-size: 14px; font-weight: 800; }
        .landingPrimaryButton { background: linear-gradient(135deg, #12A0C6 0%, #0A7FA6 38%, #D4552A 100%); color: #fff; box-shadow: 0 14px 30px rgba(10,127,166,.18); }
        .landingSecondaryButton { border: 1px solid #D8DEE8; background: #fff; color: #1E3348; }

        .landingVisual { padding: 20px; border: 1px solid rgba(255,255,255,.9); border-radius: 30px; background: rgba(255,255,255,.72); box-shadow: 0 30px 80px rgba(10,35,55,.12); backdrop-filter: blur(12px); }
        .landingVisualTop { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 14px; color: #0A2337; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
        .landingLive { display: flex; align-items: center; gap: 6px; color: #00456B; font-size: 9px; letter-spacing: .8px; }
        .landingLive i { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 0 4px rgba(34,197,94,.10); }
        .landingRoute { position: relative; height: 380px; overflow: hidden; border-radius: 22px; background: linear-gradient(145deg,#0A2337,#0E2D46 60%,#12384F); }
        .landingRouteGrid { position: absolute; inset: -30px; opacity: .30; background-image: linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px); background-size: 42px 42px; transform: rotate(-8deg) scale(1.1); }
        .landingRouteGlow { position: absolute; border-radius: 50%; filter: blur(18px); }
        .landingRouteGlowOne { width: 230px; height: 230px; left: -90px; top: -70px; background: rgba(10,127,166,.18); }
        .landingRouteGlowTwo { width: 260px; height: 260px; right: -100px; bottom: -120px; background: rgba(245,129,63,.18); }
        .landingRouteLine { position: absolute; left: 17%; top: 25%; width: 66%; height: 55%; border-left: 3px solid rgba(111,214,236,.86); border-bottom: 3px solid rgba(111,214,236,.86); border-radius: 0 0 0 55%; transform: rotate(-12deg); box-shadow: 0 0 22px rgba(10,127,166,.20); }
        .landingRoutePoint { position: absolute; width: 16px; height: 16px; border-radius: 50%; z-index: 2; }
        .landingRoutePointOne { left: 16%; top: 23%; background: #6FD6EC; box-shadow: 0 0 0 7px rgba(111,214,236,.14); }
        .landingRoutePointTwo { right: 16%; bottom: 22%; background: #fff; box-shadow: 0 0 0 7px rgba(255,255,255,.10); }
        .landingRouteCard { position: absolute; display: flex; flex-direction: column; gap: 3px; padding: 11px 13px; border: 1px solid rgba(255,255,255,.10); border-radius: 12px; background: rgba(10,35,55,.72); color: #fff; backdrop-filter: blur(10px); }
        .landingRouteCard strong { font-size: 11px; }
        .landingRouteCard span { color: rgba(255,255,255,.54); font-size: 9px; }
        .landingRouteCardOne { left: 10%; top: 30%; }
        .landingRouteCardTwo { right: 9%; bottom: 29%; }
        .landingRouteFooter { position: absolute; left: 16px; right: 16px; bottom: 15px; display: flex; align-items: center; gap: 7px; color: rgba(255,255,255,.52); font-size: 9.5px; }
        .landingPulse { width: 6px; height: 6px; border-radius: 50%; background: #0A7FA6; box-shadow: 0 0 0 4px rgba(10,127,166,.10); }
        .landingTrustRow { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; margin-top: 14px; border: 1px solid #EEF3F7; border-radius: 16px; overflow: hidden; background: #EEF3F7; }
        .landingTrustRow div { min-height: 66px; display: flex; flex-direction: column; justify-content: center; padding: 10px 12px; background: #fff; }
        .landingTrustRow strong { color: #0A2337; font-size: 11px; }
        .landingTrustRow span { margin-top: 3px; color: #87919E; font-size: 9px; }
        .landingFooter { min-height: 64px; display: flex; align-items: center; justify-content: space-between; width: min(1180px,calc(100% - 32px)); margin: 0 auto; color: #7A8491; font-size: 10px; }
        .landingFooter strong { color: #0A2337; }

        @media (max-width: 920px) {
          .landingHero { grid-template-columns: 1fr; gap: 42px; padding-top: 42px; }
          .landingCopy { text-align: center; display: flex; flex-direction: column; align-items: center; }
          .landingLead { max-width: 560px; }
          .landingVisual { width: min(620px,100%); margin: 0 auto; }
        }

        @media (max-width: 560px) {
          .landingHeaderInner, .landingHero, .landingFooter { width: min(100% - 24px,1180px); }
          .landingHero { min-height: auto; padding: 38px 0 44px; }
          h1 { font-size: clamp(46px,14vw,64px); letter-spacing: -2.3px; }
          .landingPills { justify-content: center; }
          .landingVisual { padding: 12px; border-radius: 24px; }
          .landingRoute { height: 290px; border-radius: 18px; }
          .landingTrustRow div { min-height: 58px; padding: 8px; }
          .landingTrustRow strong { font-size: 10px; }
          .landingTrustRow span { font-size: 8px; }
          .landingFooter { min-height: 72px; flex-direction: column; justify-content: center; gap: 4px; }
        }
      `}</style>
    </main>
  );
}

const pillStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px 8px 8px",
  borderRadius: 30,
  background: "#FFFFFF",
  border: "1px solid #E5E9EF",
  color: "#344052",
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
  background: "#E7F4F8",
  color: "#00456B",
};
