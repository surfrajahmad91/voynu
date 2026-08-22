"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  buildWhatsAppLink,
} from "../lib/contact";

function IconCheckBig() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconPhoneCall({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconWhatsApp({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export default function BookingConfirmedPage() {
  const [booking, setBooking] =
    useState(null);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(
        "voynu_confirmed_booking"
      );

      if (raw) {
        setBooking(JSON.parse(raw));
      }
    } catch (error) {
      console.error(
        "VOYNU: unable to read confirmed booking:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  if (loaded && !booking) {
    return (
      <main className="page emptyState">

        <div className="emptyCard">

          <h1>No confirmed booking found</h1>

          <p>
            We couldn't find a recent
            confirmation. If you just
            completed a booking, please
            check WhatsApp for confirmation.
          </p>

          <Link href="/" className="emptyButton">
            Back to home
          </Link>

        </div>

        <style jsx>{`

          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

          .emptyState {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #f5faf6;

            padding: 24px;

            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          .emptyCard {
            max-width: 380px;

            text-align: center;

            padding: 32px 26px;

            border-radius: 20px;

            background: #ffffff;

            box-shadow: 0 20px 60px rgba(10,40,25,0.10);
          }

          .emptyCard h1 {
            margin: 0 0 8px;

            font-size: 19px;
            font-weight: 800;

            color: #16241d;
          }

          .emptyCard p {
            margin: 0 0 20px;

            color: #6b7a72;

            font-size: 13px;

            line-height: 1.5;
          }

          .emptyButton {
            display: inline-block;

            padding: 12px 24px;

            border-radius: 12px;

            background: #0a7d42;

            color: #ffffff;

            text-decoration: none;

            font-weight: 700;
            font-size: 13.5px;
          }

        `}</style>

      </main>
    );
  }

  if (!loaded || !booking) {
    return (
      <main className="page loadingState">
        <div className="spinnerBox" />
        <style jsx>{`

          .loadingState {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #f5faf6;
          }

          .spinnerBox {
            width: 34px;
            height: 34px;

            border: 3px solid rgba(8,120,63,0.18);
            border-top-color: #0a7d42;

            border-radius: 50%;

            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

        `}</style>
      </main>
    );
  }

  const isRoundTrip =
    booking.tripType === "roundtrip";

  const helpMessage = `Hi VOYNU, I need help with my booking:\n\nPickup: ${
    booking.pickup?.name || ""
  }\nDrop: ${
    booking.drop?.name || ""
  }\nTravel date: ${
    booking.travelDate || ""
  }\nPickup time: ${
    booking.pickupTime || ""
  }\n\nI'd like to make an amendment / ask a question.`;

  return (
    <main className="page">

      <header className="header">

        <div className="headerInner">

          <Link href="/" className="brand">
            <div className="brandMark">V</div>
            <div>
              <div className="brandName">VOYNU</div>
              <div className="brandTagline">Travel safe. Travel smart.</div>
            </div>
          </Link>

        </div>

      </header>

      <div className="content">

        <div className="confirmedHero">

          <div className="confirmedIcon">
            <IconCheckBig />
          </div>

          <h1>Booking Confirmed!</h1>

          <p>
            You'll receive a call{" "}
            <strong>1 hour before your journey</strong>{" "}
            to confirm the pickup details.
          </p>

        </div>

        <div className="detailsCard">

          <div className="detailsRow">

            <div className="routeDot routeDotPickup" />
            <div className="routeText">{booking.pickup?.name}</div>

          </div>

          <div className="routeLine" />

          <div className="detailsRow">

            <div className="routeDot routeDotDrop" />
            <div className="routeText">{booking.drop?.name}</div>

          </div>

          <div className="detailsGrid">

            <div className="detailsCell">
              <span className="detailsLabel">Trip type</span>
              <span className="detailsValue">
                {isRoundTrip ? "Round Trip" : "One Way"}
              </span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Distance</span>
              <span className="detailsValue">
                {booking.journey?.oneWayDistanceText}
              </span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Travel date</span>
              <span className="detailsValue">{booking.travelDate}</span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Pickup time</span>
              <span className="detailsValue">{booking.pickupTime}</span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Cab type</span>
              <span className="detailsValue">
                {booking.selectedFare?.vehicleName}
              </span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Fare</span>
              <span className="detailsValue">
                ₹{booking.selectedFare?.totalFare}
              </span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Payment</span>
              <span className="detailsValue">
                {booking.paymentMethod === "upi"
                  ? "UPI"
                  : "Pay on Pickup"}
              </span>
            </div>

            <div className="detailsCell">
              <span className="detailsLabel">Passenger</span>
              <span className="detailsValue">
                {booking.passengerName}
              </span>
            </div>

          </div>

        </div>

        <div className="helpCard">

          <div className="helpIcon">
            <IconPhoneCall size={17} />
          </div>

          <div className="helpBody">
            <div className="helpTitle">Need help in the meantime?</div>
            <div className="helpText">
              You can reach out any time to ask about
              your booking or request an amendment.
            </div>
          </div>

        </div>

        <a
          href={buildWhatsAppLink(helpMessage)}
          className="helpButton"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconWhatsApp size={17} />
          <span>Chat with us on WhatsApp</span>
        </a>

        <Link href="/" className="bookAnotherLink">
          Book another ride
        </Link>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
        }

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
          width: min(720px, calc(100% - 32px));

          margin: 0 auto;

          min-height: 68px;

          display: flex;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;

          gap: 10px;

          text-decoration: none;
        }

        .brandMark {
          width: 36px;
          height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          font-weight: 800;
          font-size: 17px;

          box-shadow: 0 6px 14px rgba(8,120,63,0.24);
        }

        .brandName {
          color: #0a7d42;

          font-weight: 800;
          font-size: 17px;

          line-height: 1;
        }

        .brandTagline {
          margin-top: 3px;

          color: #7a8981;

          font-size: 8.5px;
        }

        .content {
          width: min(640px, calc(100% - 32px));

          margin: 0 auto;

          padding: 32px 0 60px;
        }

        .confirmedHero {
          text-align: center;

          margin-bottom: 26px;
        }

        .confirmedIcon {
          width: 68px;
          height: 68px;

          margin: 0 auto 16px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: linear-gradient(135deg, #1fa855, #0a7d42);

          color: #ffffff;

          box-shadow: 0 14px 30px rgba(31,168,85,0.28);
        }

        .confirmedHero h1 {
          margin: 0 0 8px;

          font-size: 24px;
          font-weight: 800;

          letter-spacing: -0.5px;
        }

        .confirmedHero p {
          margin: 0;

          color: #5c6d64;

          font-size: 13.5px;

          line-height: 1.55;
        }

        .confirmedHero strong {
          color: #0a7d42;
        }

        .detailsCard {
          padding: 20px;

          border-radius: 18px;

          background: #ffffff;

          border: 1px solid #e5ede8;

          box-shadow: 0 12px 30px rgba(10,40,25,0.06);
        }

        .detailsRow {
          display: flex;
          align-items: flex-start;

          gap: 11px;
        }

        .routeDot {
          width: 10px;
          height: 10px;

          margin-top: 4px;

          border-radius: 50%;

          flex-shrink: 0;
        }

        .routeDotPickup {
          background: #0a7d42;
        }

        .routeDotDrop {
          background: #c8622a;
        }

        .routeLine {
          width: 1.5px;
          height: 16px;

          margin-left: 4.25px;

          background: #dbe6df;
        }

        .routeText {
          font-size: 13.5px;
          font-weight: 600;

          color: #24352b;

          line-height: 1.4;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 14px;

          margin-top: 16px;

          padding-top: 16px;

          border-top: 1px dashed #e5ede8;
        }

        .detailsCell {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .detailsLabel {
          color: #8a9790;

          font-size: 10.5px;
          font-weight: 700;

          letter-spacing: 0.3px;
        }

        .detailsValue {
          color: #16241d;

          font-size: 13px;
          font-weight: 700;
        }

        .helpCard {
          display: flex;
          align-items: flex-start;

          gap: 12px;

          margin-top: 22px;

          padding: 16px 18px;

          border-radius: 16px;

          background: #fdf3dc;

          border: 1px solid #f0dfa8;
        }

        .helpIcon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: #f7e3ac;

          color: #7a5a10;
        }

        .helpTitle {
          font-size: 13px;
          font-weight: 800;

          color: #7a5a10;
        }

        .helpText {
          margin-top: 3px;

          font-size: 12px;

          line-height: 1.5;

          color: #8a6b1c;
        }

        .helpButton {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          width: 100%;
          min-height: 54px;

          margin-top: 14px;

          border-radius: 14px;

          background: #1fa855;

          color: #ffffff;

          text-decoration: none;

          font-weight: 800;
          font-size: 14px;

          box-shadow: 0 10px 24px rgba(31,168,85,.24);
        }

        .bookAnotherLink {
          display: block;

          margin-top: 18px;

          text-align: center;

          color: #0a7d42;

          text-decoration: none;

          font-weight: 700;
          font-size: 13px;
        }

      `}</style>

    </main>
  );
                }
