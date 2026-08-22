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

export default function AuthLanding() {
  return (
    <main className="page">

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <div className="brandMark">V</div>
            <div>
              <div className="brandName">VOYNU</div>
              <div className="brandTagline">Travel safe. Travel smart.</div>
            </div>
          </div>

          <div className="headerActions">
            <Link href="/login" className="headerLogin">Log in</Link>
            <Link href="/signup" className="headerSignup">Sign up</Link>
          </div>
        </div>
      </header>

      <section className="hero">

        <div className="heroDecor heroDecorOne" />
        <div className="heroDecor heroDecorTwo" />

        <div className="heroInner">

          <div className="heroGrid">

            <div className="heroText">

              <h1>
                Your ride,
                <br />
                <span>your way.</span>
              </h1>

              <p>
                Book a reliable cab for your journey.
                <br className="desktopBreak" />
                Travel safe. Travel smart.
              </p>

              <div className="heroFeatures">
                <div className="heroFeature">
                  <span className="featureIcon">
                    <IconCheckCircle size={13} />
                  </span>
                  <span>Verified Drivers</span>
                </div>
                <div className="heroFeature">
                  <span className="featureIcon">
                    <IconShield size={13} />
                  </span>
                  <span>Safe &amp; Secure</span>
                </div>
                <div className="heroFeature">
                  <span className="featureIcon featureIconAmber">
                    <IconBolt size={13} />
                  </span>
                  <span>EV Rides</span>
                </div>
              </div>

              <div className="heroActions">
                <Link href="/signup" className="primaryButton">
                  <span>Get started</span>
                  <IconArrowRight size={17} />
                </Link>
                <Link href="/login" className="secondaryButton">
                  I already have an account
                </Link>
              </div>

            </div>

            <div className="heroVehicle">
              <div className="vehicleGlow" />
              <div className="vehicle" aria-hidden="true">
                <IconCarGraphic />
              </div>
            </div>

          </div>

        </div>

      </section>

      <footer className="footer">
        <div className="footerInner">
          <div>
            <strong>VOYNU</strong>
            <span> © {new Date().getFullYear()}</span>
          </div>
          <div>Travel safe. Travel smart.</div>
        </div>
      </footer>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .page {
          min-height: 100vh;
          background: #f5faf6;
          color: #16241d;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .header {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e8eee9;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .headerInner {
          width: min(1180px, calc(100% - 40px));
          min-height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brandMark {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #ffffff;
          font-size: 21px;
          font-weight: 800;
          box-shadow: 0 6px 14px rgba(8,120,63,0.28);
        }

        .brandName {
          color: #0a7d42;
          font-size: 20px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.6px;
        }

        .brandTagline {
          margin-top: 4px;
          color: #7a8981;
          font-size: 9px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .headerLogin {
          padding: 9px 16px;
          border-radius: 30px;
          color: #0a5c32;
          font-size: 13px;
          font-weight: 700;
        }

        .headerSignup {
          padding: 9px 18px;
          border-radius: 30px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 6px 16px rgba(8,120,63,0.24);
        }

        .hero {
          position: relative;
          overflow: hidden;
          min-height: calc(100vh - 72px);
          display: flex;
          align-items: center;
          background: linear-gradient(160deg, #ffffff 0%, #f1faf4 55%, #e6f5ec 100%);
        }

        .heroInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 46px 0;
          position: relative;
          z-index: 2;
        }

        .heroDecor {
          position: absolute;
          pointer-events: none;
          filter: blur(50px);
        }

        .heroDecorOne {
          width: 480px;
          height: 200px;
          right: -80px;
          bottom: -110px;
          border-radius: 50%;
          background: rgba(8,60,38,0.28);
          transform: rotate(-8deg);
        }

        .heroDecorTwo {
          width: 260px;
          height: 260px;
          right: 8%;
          top: -160px;
          border-radius: 50%;
          background: rgba(8,120,63,0.14);
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: center;
          gap: 32px;
        }

        .heroText h1 {
          margin: 0;
          color: #10201a;
          font-size: clamp(42px,6vw,70px);
          line-height: 0.98;
          letter-spacing: -3px;
          font-weight: 800;
        }

        .heroText h1 span {
          color: #0a7d42;
        }

        .heroText p {
          margin: 20px 0 0;
          color: #5c6d64;
          font-size: 16px;
          line-height: 1.6;
        }

        .heroFeatures {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .heroFeature {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px 8px 8px;
          border-radius: 30px;
          background: #ffffff;
          border: 1px solid #e5ede8;
          color: #2c3d34;
          font-size: 12px;
          font-weight: 700;
        }

        .featureIcon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e1f3e7;
          color: #0a7d42;
        }

        .featureIconAmber {
          background: #fdf1d8;
          color: #b8790e;
        }

        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .primaryButton {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 15px 26px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #ffffff;
          font-weight: 800;
          font-size: 14.5px;
          box-shadow: 0 10px 24px rgba(8,120,63,.24);
        }

        .secondaryButton {
          display: flex;
          align-items: center;
          padding: 15px 22px;
          border-radius: 14px;
          border: 1.5px solid #dcebe1;
          color: #0a7d42;
          font-weight: 700;
          font-size: 13.5px;
        }

        .heroVehicle {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .vehicleGlow {
          position: absolute;
          width: 280px;
          height: 110px;
          border-radius: 50%;
          background: rgba(8,120,63,0.10);
          filter: blur(20px);
          transform: rotate(-6deg);
        }

        .vehicle {
          position: relative;
          width: min(320px, 82%);
          filter: drop-shadow(0 18px 20px rgba(0,0,0,0.10));
        }

        .footer {
          background: #12211a;
          color: #ffffff;
        }

        .footerInner {
          width: min(1180px,calc(100% - 40px));
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 auto;
          color: rgba(255,255,255,.72);
          font-size: 11px;
        }

        .footerInner strong {
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .heroGrid { grid-template-columns: 1fr; }
          .heroVehicle { display: none; }
        }

        @media (max-width: 700px) {
          .headerInner { width: calc(100% - 28px); min-height: 62px; }
          .brandTagline { display: none; }
          .heroInner { width: calc(100% - 28px); padding: 30px 0; }
          .heroText h1 { font-size: 44px; letter-spacing: -2px; }
          .heroText p { font-size: 14px; margin-top: 16px; }
          .desktopBreak { display: none; }
          .heroActions { flex-direction: column; }
          .primaryButton, .secondaryButton { width: 100%; justify-content: center; }
          .footerInner { width: calc(100% - 28px); flex-direction: column; gap: 4px; }
        }

      `}</style>

    </main>
  );
}
