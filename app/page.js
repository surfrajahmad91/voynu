"use client";

import { useState } from "react";

export default function Home() {
  const [tripType, setTripType] = useState("oneway");
  const [sameWhatsapp, setSameWhatsapp] = useState(true);

  return (
    <main className="page">
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <span className="logoMark">V</span>
          <span>VOYNU</span>
        </div>

        <div className="headerRight">
          <a href="tel:+919123456789" className="phone">
            ☎ +91 91234 56789
          </a>
          <button className="menuButton">☰</button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="heroText">
          <div className="serviceBadge">
            📍 Serving within <strong>200 km</strong> from Kanpur
          </div>

          <h1>
            Your ride,
            <br />
            <span>your way.</span>
          </h1>

          <p>
            Book a reliable cab for your journey.
            <br />
            Travel safe. Travel smart.
          </p>

          <div className="features">
            <div>
              <span>🛡️</span>
              <strong>Safe & Secure</strong>
            </div>

            <div>
              <span>✓</span>
              <strong>Verified Drivers</strong>
            </div>

            <div>
              <span>⚡</span>
              <strong>EV Rides</strong>
            </div>
          </div>
        </div>

        <div className="heroCar">
          <div className="road"></div>
          <div className="car">
            🚙
          </div>
          <div className="kanpurSign">
            📍 KANPUR
          </div>
        </div>
      </section>

      {/* BOOKING CARD */}
      <section className="bookingCard">
        <div className="tripSelector">
          <button
            className={tripType === "oneway" ? "active" : ""}
            onClick={() => setTripType("oneway")}
          >
            🚗 One Way
          </button>

          <button
            className={tripType === "roundtrip" ? "active" : ""}
            onClick={() => setTripType("roundtrip")}
          >
            🔄 Round Trip
          </button>
        </div>

        <div className="formGrid">
          {/* PICKUP */}
          <label className="field">
            <span>📍 Pickup location</span>
            <input
              type="text"
              placeholder="Enter pickup location"
            />
          </label>

          {/* DROP */}
          <label className="field">
            <span>📍 Drop location</span>
            <input
              type="text"
              placeholder="Enter destination"
            />
          </label>

          {/* DATE */}
          <label className="field">
            <span>📅 Travel date</span>
            <input type="date" />
          </label>

          {/* TIME */}
          <label className="field">
            <span>🕐 Pickup time</span>
            <input type="time" />
          </label>
        </div>

        {/* ROUND TRIP NOTICE */}
        {tripType === "roundtrip" && (
          <div className="chargingNotice">
            ⚡ <strong>EV charging break:</strong> For longer round trips,
            approximately 1 hour may be required for charging during the
            journey.
          </div>
        )}

        {/* PASSENGER */}
        <div className="singleField">
          <label className="field">
            <span>👤 Passenger name</span>
            <input
              type="text"
              placeholder="Enter passenger name"
            />
          </label>
        </div>

        {/* CONTACT */}
        <div className="formGrid">
          <label className="field">
            <span>📞 Phone number</span>
            <input
              type="tel"
              placeholder="+91"
            />
          </label>

          <label className="field">
            <span>💬 WhatsApp number</span>
            <input
              type="tel"
              placeholder="+91"
              disabled={sameWhatsapp}
            />
          </label>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={sameWhatsapp}
            onChange={(e) => setSameWhatsapp(e.target.checked)}
          />
          WhatsApp number is the same as phone number
        </label>

        {/* BOOK BUTTON */}
        <button className="findCab">
          🚗 FIND A CAB
        </button>

        {/* BENEFITS */}
        <div className="benefits">
          <div>
            <strong>🛡️ Transparent Pricing</strong>
            <small>No hidden charges</small>
          </div>

          <div>
            <strong>🎧 Support</strong>
            <small>We're always here</small>
          </div>

          <div>
            <strong>💳 Easy Payments</strong>
            <small>UPI, Cards & Wallets</small>
          </div>
        </div>
      </section>

      {/* FOOTER MESSAGE */}
      <footer>
        ♡ Travel safe. Travel smart. Travel with <strong>VOYNU.</strong>
      </footer>

      {/* PAGE STYLES */}
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f7faf8;
          color: #10231a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          height: 76px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          border-bottom: 1px solid #e7ece9;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .logoMark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #08783f;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .headerRight {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .phone {
          color: #123;
          text-decoration: none;
          font-weight: 600;
        }

        .menuButton {
          border: 0;
          background: transparent;
          font-size: 28px;
          cursor: pointer;
        }

        .hero {
          min-height: 470px;
          padding: 55px 7% 0;
          display: flex;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 80% 20%, #d8f1df, transparent 35%),
            linear-gradient(135deg, #ffffff 30%, #eaf7ee);
        }

        .heroText {
          width: 52%;
          position: relative;
          z-index: 2;
        }

        .serviceBadge {
          display: inline-block;
          background: white;
          border: 1px solid #cce3d3;
          border-radius: 30px;
          padding: 10px 18px;
          font-size: 14px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        }

        .serviceBadge strong {
          color: #08783f;
        }

        h1 {
          font-size: clamp(48px, 6vw, 76px);
          line-height: 0.95;
          margin: 30px 0 22px;
          letter-spacing: -4px;
        }

        h1 span {
          color: #08783f;
        }

        .heroText p {
          font-size: 21px;
          line-height: 1.5;
          color: #52625a;
        }

        .features {
          display: flex;
          gap: 35px;
          margin-top: 35px;
        }

        .features div {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .features span {
          font-size: 25px;
          color: #08783f;
        }

        .features strong {
          font-size: 13px;
        }

        .heroCar {
          flex: 1;
          position: relative;
          min-height: 350px;
        }

        .car {
          position: absolute;
          font-size: 150px;
          right: 10%;
          top: 100px;
          filter: drop-shadow(0 20px 20px rgba(0,0,0,0.15));
        }

        .road {
          position: absolute;
          width: 120%;
          height: 100px;
          background: #27332d;
          transform: rotate(-8deg);
          right: -15%;
          bottom: 25px;
          border-radius: 50%;
          opacity: 0.9;
        }

        .kanpurSign {
          position: absolute;
          right: 3%;
          top: 25px;
          background: #183f30;
          color: white;
          padding: 15px 22px;
          border-radius: 5px;
          font-weight: 700;
          transform: rotate(4deg);
        }

        .bookingCard {
          width: 88%;
          max-width: 1180px;
          margin: -55px auto 0;
          position: relative;
          z-index: 5;
          background: white;
          border-radius: 22px;
          padding: 28px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
        }

        .tripSelector {
          display: flex;
          background: #f0f3f1;
          border-radius: 13px;
          padding: 4px;
          max-width: 470px;
          margin-bottom: 22px;
        }

        .tripSelector button {
          flex: 1;
          border: 0;
          padding: 15px;
          border-radius: 10px;
          background: transparent;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }

        .tripSelector button.active {
          background: #08783f;
          color: white;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field span {
          font-size: 12px;
          font-weight: 700;
          color: #52625a;
        }

        .field input {
          width: 100%;
          padding: 16px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          background: white;
        }

        .field input:focus {
          border-color: #08783f;
          box-shadow: 0 0 0 3px rgba(8, 120, 63, 0.1);
        }

        .field input:disabled {
          background: #f4f5f4;
        }

        .singleField {
          margin-top: 15px;
        }

        .chargingNotice {
          margin-top: 18px;
          padding: 15px 18px;
          background: #eff9f1;
          border: 1px solid #d6ecd9;
          border-radius: 12px;
          color: #31553e;
          font-size: 14px;
        }

        .checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px 0 20px;
          font-size: 13px;
          color: #52625a;
        }

        .checkbox input {
          accent-color: #08783f;
        }

        .findCab {
          width: 100%;
          border: 0;
          background: #08783f;
          color: white;
          padding: 18px;
          border-radius: 11px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
        }

        .findCab:hover {
          background: #065f32;
        }

        .benefits {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin-top: 18px;
          background: #f1f8f3;
          border-radius: 13px;
          padding: 17px;
          gap: 15px;
        }

        .benefits div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          text-align: center;
        }

        .benefits strong {
          font-size: 13px;
        }

        .benefits small {
          color: #65736b;
        }

        footer {
          text-align: center;
          padding: 45px 20px;
          color: #52625a;
        }

        footer strong {
          color: #08783f;
        }

        @media (max-width: 750px) {
          .header {
            padding: 0 20px;
          }

          .phone {
            display: none;
          }

          .hero {
            padding: 35px 22px 110px;
            min-height: auto;
          }

          .heroText {
            width: 100%;
          }

          h1 {
            font-size: 52px;
            letter-spacing: -3px;
          }

          .heroText p {
            font-size: 17px;
          }

          .features {
            gap: 18px;
          }

          .heroCar {
            display: none;
          }

          .bookingCard {
            width: calc(100% - 24px);
            margin: -70px auto 0;
            padding: 18px;
            border-radius: 18px;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .benefits {
            grid-template-columns: 1fr;
          }

          .tripSelector {
            max-width: none;
          }
        }
      `}</style>
    </main>
  );
}
