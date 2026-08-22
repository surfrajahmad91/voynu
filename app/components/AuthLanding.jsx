"use client";

import Link from "next/link";

function IconArrowRight({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function AuthLanding() {
  return (
    <main className="page">

      <div className="card">

        <div className="brandMark">V</div>

        <h1>Welcome to VOYNU</h1>

        <p>
          Sign in or create an account to
          book your ride.
        </p>

        <Link href="/login" className="primaryButton">
          <span>Log in</span>
          <IconArrowRight size={17} />
        </Link>

        <Link href="/signup" className="secondaryButton">
          Create an account
        </Link>

        <p className="footnote">
          Travel safe. Travel smart.
        </p>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .page {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 24px;

          background:
            linear-gradient(
              160deg,
              #ffffff 0%,
              #f1faf4 55%,
              #e6f5ec 100%
            );

          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .card {
          width: 100%;
          max-width: 380px;

          text-align: center;

          padding: 40px 30px;

          border-radius: 24px;

          background: #ffffff;

          box-shadow: 0 30px 80px -20px rgba(10,40,25,0.20);
        }

        .brandMark {
          width: 56px;
          height: 56px;

          margin: 0 auto 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 16px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          font-weight: 800;
          font-size: 26px;

          box-shadow: 0 10px 24px rgba(8,120,63,0.28);
        }

        h1 {
          margin: 0 0 8px;

          font-size: 22px;
          font-weight: 800;

          color: #16241d;

          letter-spacing: -0.5px;
        }

        p {
          margin: 0 0 26px;

          color: #6b7a72;

          font-size: 13.5px;

          line-height: 1.55;
        }

        .primaryButton {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          width: 100%;
          min-height: 52px;

          border-radius: 13px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          text-decoration: none;

          font-weight: 800;
          font-size: 14.5px;

          box-shadow: 0 10px 24px rgba(8,120,63,.24);
        }

        .secondaryButton {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 100%;
          min-height: 50px;

          margin-top: 10px;

          border-radius: 13px;

          border: 1.5px solid #dcebe1;

          color: #0a7d42;

          text-decoration: none;

          font-weight: 700;
          font-size: 13.5px;
        }

        .footnote {
          margin: 22px 0 0;

          color: #a3b0aa;

          font-size: 10.5px;
        }

      `}</style>

    </main>
  );
}
