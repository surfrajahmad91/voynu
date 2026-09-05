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

function IconMapPin({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13" />
      <path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function IconNavigation({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8-8 18-2.5-7.5L3 11Z" />
    </svg>
  );
}

function IconClock({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function IconUsers({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="9" cy="8" r="3.2" />
      <path d="M18 19v-1.5a3.3 3.3 0 0 0-2.2-3.1" />
      <path d="M14.3 4.9a3.2 3.2 0 0 1 0 6.1" />
    </svg>
  );
}

function IconHeadset({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v1a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

function IconCity({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V9l5-4v16" />
      <path d="M15 21V4l5 3v14" />
      <path d="M4 21h16" />
      <path d="M9 9h1M9 13h1M9 17h1M18 9h1M18 13h1M18 17h1" />
    </svg>
  );
}

function IconRoundTrip({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconPlane({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 3.5 12 2l1.5 1.5-1 5.5 6.4 3.7c.7.4.7 1.5-.1 1.8l-6 2-.3 4.2-1.6 1.1-1-4.6-4.6-1-1.1 1.6L2.9 16.7l4.2-.3 2-6-5.5-1L2 8l1.5-1.5 5.5 1 1.5-4Z" />
    </svg>
  );
}

const tripTypes = [
  { icon: <IconNavigation size={20} />, label: "One Way", desc: "Point-to-point drop" },
  { icon: <IconRoundTrip size={20} />, label: "Round Trip", desc: "There and back, one booking" },
  { icon: <IconCity size={20} />, label: "Outstation", desc: "Travel between cities" },
  { icon: <IconPlane size={20} />, label: "Airport", desc: "On-time pickup & drop" },
];

const steps = [
  {
    icon: <IconMapPin size={22} />,
    title: "Enter pickup & drop",
    desc: "Tell us where you're starting from and where you're headed. Pick a trip type \u2014 one way, round trip, outstation or airport.",
  },
  {
    icon: <IconCar size={22} />,
    title: "Choose your ride & see the fare",
    desc: "Compare vehicle categories with the full price shown upfront \u2014 no surprise charges after the ride.",
  },
  {
    icon: <IconCheckCircle size={22} />,
    title: "Confirm & meet your driver",
    desc: "Your booking is confirmed instantly and a verified driver is assigned. You'll see their details before pickup.",
  },
  {
    icon: <IconShield size={22} />,
    title: "Track, ride & pay",
    desc: "Follow your driver live on the way to pickup, ride safely, and pay by UPI or cash \u2014 whichever you prefer.",
  },
];

const values = [
  { icon: <IconShield size={22} />, title: "Safe & Secure", desc: "Verified rides for your safety" },
  { icon: <IconUsers size={22} />, title: "Trusted Drivers", desc: "Background-verified professionals" },
  { icon: <IconClock size={22} />, title: "On Time", desc: "Punctual rides, every time" },
  { icon: <IconCity size={22} />, title: "Across Cities", desc: "Outstation & airport rides made easy" },
  { icon: <IconHeadset size={22} />, title: "24x7 Support", desc: "We're here for you, anytime" },
];

export default function AuthLanding() {
  return (
    <main className="landingPage">
      <header className="landingHeader">
        <div className="landingHeaderInner">
          <Link href="/" className="landingBrand">
            <img src="/icon.svg" alt="VOYNU" width="42" height="42" />
            <span>VOYNU</span>
          </Link>

          <div className="landingNav">
            <Link href="/login" className="landingLogin">Log in</Link>
            <Link href="/signup" className="landingSignup">Sign up<IconArrowRight size={14} /></Link>
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
            <div className="pill"><span className="pillIcon"><IconCheckCircle size={13} /></span> Verified Drivers</div>
            <div className="pill"><span className="pillIcon"><IconShield size={13} /></span> Safe &amp; Secure</div>
            <div className="pill"><span className="pillIcon pillIconAccent"><IconBolt size={13} /></span> EV Rides</div>
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

          <div className="landingRoute" aria-hidden="true">
            <div className="landingRouteGrid" />
            <div className="landingRouteGlow landingRouteGlowOne" />
            <div className="landingRouteGlow landingRouteGlowTwo" />
            <div className="landingRouteLine" />
            <div className="landingRoutePoint landingRoutePointOne" />
            <div className="landingRoutePoint landingRoutePointTwo" />
            <div className="landingRouteCard landingRouteCardOne"><strong>Pickup</strong><span>Choose your location</span></div>
            <div className="landingRouteCard landingRouteCardTwo"><strong>Destination</strong><span>We&rsquo;ll plan the route</span></div>
            <div className="landingRouteFooter"><span className="landingPulse" /> Simple booking &bull; clear pricing &bull; verified drivers</div>
          </div>

          <div className="landingTrustRow">
            <div><strong>Transparent</strong><span>Upfront fare</span></div>
            <div><strong>Verified</strong><span>Driver network</span></div>
            <div><strong>Connected</strong><span>Trip updates</span></div>
          </div>
        </div>
      </section>

      <section className="landingTripTypes">
        <div className="landingSectionInner">
          <div className="landingTripTypeGrid">
            {tripTypes.map((t) => (
              <div className="tripTypeCard" key={t.label}>
                <span className="tripTypeIcon">{t.icon}</span>
                <strong>{t.label}</strong>
                <span className="tripTypeDesc">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landingHow">
        <div className="landingSectionInner">
          <div className="landingSectionHead">
            <div className="landingEyebrow landingEyebrowCenter"><span /> HOW IT WORKS</div>
            <h2>Booking a ride takes four simple steps</h2>
            <p>Here&rsquo;s exactly what happens from opening the app to reaching your destination &mdash; so there&rsquo;s nothing to figure out along the way.</p>
          </div>

          <div className="stepGrid">
            {steps.map((step, i) => (
              <div className="stepCard" key={step.title}>
                <span className="stepNumber">{String(i + 1).padStart(2, "0")}</span>
                <span className="stepIcon">{step.icon}</span>
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landingValues">
        <div className="landingSectionInner">
          <div className="landingSectionHead">
            <div className="landingEyebrow landingEyebrowCenter"><span /> WHY VOYNU</div>
            <h2>Built for a dependable everyday ride</h2>
          </div>

          <div className="valueGrid">
            {values.map((v) => (
              <div className="valueCard" key={v.title}>
                <span className="valueIcon">{v.icon}</span>
                <strong>{v.title}</strong>
                <span>{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landingFinalCta">
        <div className="landingSectionInner landingFinalCtaInner">
          <div>
            <h2>Ready for your next trip?</h2>
            <p>Create your account and get your first fare estimate in under a minute.</p>
          </div>
          <Link href="/signup" className="landingPrimaryButton">Get started <IconArrowRight size={17} /></Link>
        </div>
      </section>

      <footer className="landingFooter">
        <div><strong>VOYNU</strong> &copy; {new Date().getFullYear()}</div>
        <div>Travel safe. Travel smart.</div>
      </footer>

      <style jsx>{`
        .landingPage { min-height: 100vh; background: linear-gradient(160deg, #FFFFFF 0%, #F7F9FC 55%, #EEF3F7 100%); color: #1E3348; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; overflow-x: hidden; }
        .landingSectionInner { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }

        .landingHeader { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.92); border-bottom: 1px solid #EEF3F7; backdrop-filter: blur(14px); }
        .landingHeaderInner { width: min(1180px, calc(100% - 32px)); min-height: 76px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .landingBrand { display: flex; align-items: center; gap: 12px; color: #0A2337; font-size: 21px; font-weight: 800; letter-spacing: -.6px; flex-shrink: 0; }
        .landingBrand img { border-radius: 13px; display: block; box-shadow: 0 8px 20px rgba(10,35,55,.18); }
        .landingNav { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .landingLogin { display: inline-flex; align-items: center; justify-content: center; height: 42px; padding: 0 18px; border-radius: 999px; border: 1.5px solid #D8DEE8; background: #fff; color: #1E3348; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
        .landingSignup { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 42px; padding: 0 20px; border-radius: 999px; border: none; background: linear-gradient(135deg, #12A0C6 0%, #0A7FA6 38%, #D4552A 100%); color: #fff !important; font-size: 13.5px; font-weight: 800; white-space: nowrap; box-shadow: 0 10px 22px rgba(10,127,166,.28); }

        .landingHero { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 58px 0 70px; display: grid; grid-template-columns: minmax(0,.9fr) minmax(430px,1fr); align-items: center; gap: 68px; }
        .landingEyebrow { display: flex; align-items: center; gap: 9px; color: #00456B; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
        .landingEyebrow span { width: 22px; height: 3px; border-radius: 99px; background: linear-gradient(90deg,#0A7FA6,#F5813F); flex-shrink: 0; }
        .landingEyebrowCenter { justify-content: center; }
        h1 { margin: 16px 0 0; font-size: clamp(48px,6vw,76px); line-height: .98; letter-spacing: -3px; font-weight: 800; color: #0A2337; }
        h1 span { background: linear-gradient(135deg,#0A7FA6,#12A0C6 45%,#F5813F); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .landingLead { max-width: 500px; margin: 22px 0 0; color: #5B6B7C; font-size: 15px; line-height: 1.7; }
        .landingPills { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 25px; }
        .pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px 8px 8px; border-radius: 30px; background: #FFFFFF; border: 1px solid #EEF3F7; color: #344052; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .pillIcon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #E7F4F8; color: #00456B; flex-shrink: 0; }
        .pillIconAccent { background: #FFF1E7; color: #D4552A; }
        .landingActions { width: min(350px,100%); display: flex; flex-direction: column; gap: 10px; margin-top: 30px; }
        .landingPrimaryButton, .landingSecondaryButton { min-height: 54px; border-radius: 15px; display: flex; align-items: center; justify-content: center; gap: 9px; font-size: 14px; font-weight: 800; }
        .landingPrimaryButton { background: linear-gradient(135deg, #12A0C6 0%, #0A7FA6 38%, #D4552A 100%); color: #fff; box-shadow: 0 14px 30px rgba(10,127,166,.18); }
        .landingSecondaryButton { border: 1px solid #D8DEE8; background: #fff; color: #1E3348; }

        .landingVisual { padding: 20px; border: 1px solid rgba(255,255,255,.9); border-radius: 30px; background: rgba(255,255,255,.72); box-shadow: 0 30px 80px rgba(10,35,55,.12); backdrop-filter: blur(12px); }
        .landingVisualTop { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 14px; color: #0A2337; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
        .landingLive { display: flex; align-items: center; gap: 6px; color: #00456B; font-size: 9px; letter-spacing: .8px; }
        .landingLive i { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 0 4px rgba(34,197,94,.10); display: block; }
        .landingRoute { position: relative; height: 380px; overflow: hidden; border-radius: 22px; background: linear-gradient(145deg,#0A2337,#0E2D46 60%,#12384F); }
        .landingRouteGrid { position: absolute; inset: -30px; opacity: .30; background-image: linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px); background-size: 42px 42px; transform: rotate(-8deg) scale(1.1); }
        .landingRouteGlow { position: absolute; border-radius: 50%; filter: blur(18px); }
        .landingRouteGlowOne { width: 230px; height: 230px; left: -90px; top: -70px; background: rgba(10,127,166,.18); }
        .landingRouteGlowTwo { width: 260px; height: 260px; right: -100px; bottom: -120px; background: rgba(245,129,63,.18); }
        .landingRouteLine { position: absolute; left: 17%; top: 25%; width: 66%; height: 55%; border-left: 3px solid rgba(111,214,236,.86); border-bottom: 3px solid rgba(111,214,236,.86); border-radius: 0 0 0 55%; transform: rotate(-12deg); box-shadow: 0 0 22px rgba(10,127,166,.20); }
        .landingRoutePoint { position: absolute; width: 16px; height: 16px; border-radius: 50%; z-index: 2; }
        .landingRoutePointOne { left: 16%; top: 23%; background: #6FD6EC; box-shadow: 0 0 0 7px rgba(111,214,236,.14); }
        .landingRoutePointTwo { right: 16%; bottom: 22%; background: #fff; box-shadow: 0 0 0 7px rgba(255,255,255,.10); }
        .landingRouteCard { position: absolute; display: flex; flex-direction: column; gap: 3px; padding: 11px 13px; border: 1px solid rgba(255,255,255,.10); border-radius: 12px; background: rgba(10,35,55,.72); color: #fff; backdrop-filter: blur(10px); max-width: 44%; }
        .landingRouteCard strong { font-size: 11px; }
        .landingRouteCard span { color: rgba(255,255,255,.6); font-size: 9px; }
        .landingRouteCardOne { left: 10%; top: 30%; }
        .landingRouteCardTwo { right: 9%; bottom: 29%; text-align: right; align-items: flex-end; }
        .landingRouteFooter { position: absolute; left: 16px; right: 16px; bottom: 15px; display: flex; align-items: center; gap: 7px; color: rgba(255,255,255,.55); font-size: 9.5px; }
        .landingPulse { width: 6px; height: 6px; border-radius: 50%; background: #0A7FA6; box-shadow: 0 0 0 4px rgba(10,127,166,.10); display: block; flex-shrink: 0; }
        .landingTrustRow { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; margin-top: 14px; border: 1px solid #EEF3F7; border-radius: 16px; overflow: hidden; background: #EEF3F7; }
        .landingTrustRow div { min-height: 66px; display: flex; flex-direction: column; justify-content: center; padding: 10px 12px; background: #fff; }
        .landingTrustRow strong { color: #0A2337; font-size: 11px; }
        .landingTrustRow span { margin-top: 3px; color: #87919E; font-size: 9px; }

        .landingTripTypes { padding: 6px 0 14px; }
        .landingTripTypeGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .tripTypeCard { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 18px 16px; border-radius: 18px; background: #fff; border: 1px solid #EEF3F7; box-shadow: 0 10px 26px rgba(10,35,55,.05); }
        .tripTypeIcon { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; background: #E7F4F8; color: #0A7FA6; }
        .tripTypeCard strong { font-size: 14px; color: #0A2337; }
        .tripTypeDesc { font-size: 11.5px; color: #5B6B7C; line-height: 1.4; }

        .landingSectionHead { text-align: center; max-width: 620px; margin: 0 auto 40px; }
        .landingSectionHead h2 { margin: 14px 0 10px; font-size: clamp(24px,3.4vw,34px); font-weight: 800; letter-spacing: -1px; color: #0A2337; }
        .landingSectionHead p { color: #5B6B7C; font-size: 14.5px; line-height: 1.7; }

        .landingHow { padding: 76px 0; }
        .stepGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .stepCard { position: relative; padding: 26px 20px 22px; border-radius: 20px; background: #fff; border: 1px solid #EEF3F7; box-shadow: 0 12px 30px rgba(10,35,55,.05); }
        .stepNumber { position: absolute; top: 18px; right: 20px; font-size: 26px; font-weight: 800; color: #EEF3F7; }
        .stepIcon { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, #12A0C6 0%, #0A7FA6 38%, #D4552A 100%); color: #fff; margin-bottom: 16px; }
        .stepCard strong { display: block; font-size: 15px; color: #0A2337; margin-bottom: 8px; }
        .stepCard p { font-size: 12.5px; color: #5B6B7C; line-height: 1.6; }

        .landingValues { padding: 20px 0 76px; }
        .valueGrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .valueCard { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 22px 14px; border-radius: 18px; background: #F7F9FC; }
        .valueIcon { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #E7F4F8; color: #0A7FA6; }
        .valueCard strong { font-size: 13px; color: #0A2337; }
        .valueCard span { font-size: 11px; color: #5B6B7C; line-height: 1.4; }

        .landingFinalCta { padding: 4px 0 70px; }
        .landingFinalCtaInner { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 40px 44px; border-radius: 26px; background: linear-gradient(145deg,#0A2337,#0E2D46 60%,#12384F); color: #fff; }
        .landingFinalCtaInner h2 { font-size: clamp(20px,2.6vw,28px); font-weight: 800; margin: 0 0 8px; }
        .landingFinalCtaInner p { font-size: 13.5px; color: rgba(255,255,255,.68); margin: 0; }
        .landingFinalCtaInner .landingPrimaryButton { flex-shrink: 0; padding: 0 26px; }

        .landingFooter { min-height: 64px; display: flex; align-items: center; justify-content: space-between; width: min(1180px,calc(100% - 32px)); margin: 0 auto; color: #7A8491; font-size: 10px; }
        .landingFooter strong { color: #0A2337; }

        @media (max-width: 920px) {
          .landingHero { grid-template-columns: 1fr; gap: 42px; padding-top: 42px; }
          .landingCopy { text-align: center; display: flex; flex-direction: column; align-items: center; }
          .landingLead { max-width: 560px; }
          .landingVisual { width: min(620px,100%); margin: 0 auto; }
          .landingTripTypeGrid { grid-template-columns: repeat(2, 1fr); }
          .stepGrid { grid-template-columns: repeat(2, 1fr); }
          .valueGrid { grid-template-columns: repeat(3, 1fr); }
          .landingFinalCtaInner { flex-direction: column; text-align: center; }
        }

        @media (max-width: 560px) {
          .landingHeaderInner, .landingHero, .landingFooter { width: min(100% - 24px,1180px); }
          .landingBrand span { display: none; }
          .landingLogin { height: 38px; padding: 0 14px; font-size: 12.5px; }
          .landingSignup { height: 38px; padding: 0 15px; font-size: 12.5px; }
          .landingHero { min-height: auto; padding: 38px 0 44px; }
          h1 { font-size: clamp(46px,14vw,64px); letter-spacing: -2.3px; }
          .landingPills { justify-content: center; }
          .landingVisual { padding: 12px; border-radius: 24px; }
          .landingRoute { height: 300px; border-radius: 18px; }
          .landingRouteCard { padding: 9px 11px; }
          .landingTrustRow div { min-height: 58px; padding: 8px; }
          .landingTrustRow strong { font-size: 10px; }
          .landingTrustRow span { font-size: 8px; }
          .landingTripTypeGrid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .tripTypeCard { padding: 14px 12px; }
          .landingHow, .landingValues { padding: 52px 0; }
          .stepGrid { grid-template-columns: 1fr; gap: 14px; }
          .valueGrid { grid-template-columns: repeat(2, 1fr); }
          .landingFinalCtaInner { padding: 30px 24px; }
          .landingFooter { min-height: 72px; flex-direction: column; justify-content: center; gap: 4px; }
        }
      `}</style>
    </main>
  );
}
