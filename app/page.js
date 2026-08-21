"use client";

import { useEffect, useState } from "react";
import LocationPicker from "@/components/LocationPicker";

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  const [tripType, setTripType] = useState("oneway");

  const [pickup, setPickup] = useState({
    name: "",
    lat: null,
    lng: null,
  });

  const [drop, setDrop] = useState({
    name: "",
    lat: null,
    lng: null,
  });

  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  const [passengerName, setPassengerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(getToday());
  }, []);

  const handleTripTypeChange = (type) => {
    setTripType(type);
    setMessage("");
    setMessageType("");

    if (type === "oneway") {
      setReturnDate("");
      setReturnTime("");
    }
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");
    setPhone(value.slice(0, 10));
  };

  const handleWhatsappChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");
    setWhatsapp(value.slice(0, 10));
  };

  const handleContinue = () => {
    setMessage("");
    setMessageType("");

    if (!pickup.name || pickup.lat === null || pickup.lng === null) {
      setMessage("Please select a valid pickup location.");
      setMessageType("error");
      return;
    }

    if (!drop.name || drop.lat === null || drop.lng === null) {
      setMessage("Please select a valid drop location.");
      setMessageType("error");
      return;
    }

    if (!travelDate) {
      setMessage("Please select your travel date.");
      setMessageType("error");
      return;
    }

    if (today && travelDate < today) {
      setMessage("Travel date cannot be in the past.");
      setMessageType("error");
      return;
    }

    if (!pickupTime) {
      setMessage("Please select your pickup time.");
      setMessageType("error");
      return;
    }

    if (!passengerName.trim()) {
      setMessage("Please enter the passenger name.");
      setMessageType("error");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setMessage("Please enter a valid 10-digit Indian mobile number.");
      setMessageType("error");
      return;
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");

    if (
      cleanWhatsapp &&
      !/^[6-9]\d{9}$/.test(cleanWhatsapp)
    ) {
      setMessage("Please enter a valid WhatsApp number.");
      setMessageType("error");
      return;
    }

    if (tripType === "roundtrip") {
      if (!returnDate) {
        setMessage("Please select the return date.");
        setMessageType("error");
        return;
      }

      if (returnDate < travelDate) {
        setMessage(
          "Return date cannot be before the travel date."
        );
        setMessageType("error");
        return;
      }

      if (!returnTime) {
        setMessage("Please select the return time.");
        setMessageType("error");
        return;
      }

      if (
        returnDate === travelDate &&
        returnTime <= pickupTime
      ) {
        setMessage(
          "For a same-day round trip, return time must be later than pickup time."
        );
        setMessageType("error");
        return;
      }
    }

    const bookingData = {
      tripType,

      pickup: {
        name: pickup.name,
        lat: pickup.lat,
        lng: pickup.lng,
      },

      drop: {
        name: drop.name,
        lat: drop.lat,
        lng: drop.lng,
      },

      travelDate,
      pickupTime,

      returnDate:
        tripType === "roundtrip"
          ? returnDate
          : null,

      returnTime:
        tripType === "roundtrip"
          ? returnTime
          : null,

      passengerName: passengerName.trim(),
      phone: cleanPhone,
      whatsapp: cleanWhatsapp || null,
    };

    console.log("VOYNU booking:", bookingData);

    setMessage(
      "Your trip details are ready. Fare and vehicle selection will be added next."
    );
    setMessageType("success");
  };

  return (
    <main className="page">
      {/* HEADER */}
      <header className="header">
        <div className="headerInner">
          <div className="logo">
            <span className="logoIcon">V</span>
            <span className="logoText">VOYNU</span>
          </div>

          <div className="headerPhone">
            +91 91234 56789
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="heroInner">
          <div className="serviceBadge">
            Serving within <strong>200 km</strong> from Kanpur
          </div>

          <div className="heroContent">
            <div className="heroText">
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
            </div>

            <div className="heroCar" aria-hidden="true">
              🚙
            </div>
          </div>

          <div className="benefits">
            <div className="benefit">
              <div className="benefitIcon">🛡️</div>
              <strong>Safe &amp; Secure</strong>
            </div>

            <div className="benefit">
              <div className="benefitIcon">✓</div>
              <strong>Verified Drivers</strong>
            </div>

            <div className="benefit">
              <div className="benefitIcon">⚡</div>
              <strong>EV Rides</strong>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section className="bookingSection">
        <div className="bookingCard">
          {/* TRIP TYPE */}
          <div className="tripToggle">
            <button
              type="button"
              className={tripType === "oneway" ? "active" : ""}
              onClick={() => handleTripTypeChange("oneway")}
            >
              🚗 One Way
            </button>

            <button
              type="button"
              className={
                tripType === "roundtrip" ? "active" : ""
              }
              onClick={() => handleTripTypeChange("roundtrip")}
            >
              🔄 Round Trip
            </button>
          </div>

          {/* LOCATIONS */}
          <div className="locationGrid">
            <div className="locationColumn">
              <LocationPicker
                label="📍 Pickup location"
                value={pickup.name}
                placeholder="Search pickup location"
                allowCurrentLocation={true}
                onLocationSelect={setPickup}
              />
            </div>

            <div className="locationColumn">
              <LocationPicker
                label="📍 Drop location"
                value={drop.name}
                placeholder="Search destination"
                allowCurrentLocation={false}
                onLocationSelect={setDrop}
              />
            </div>
          </div>

          {/* TRAVEL DATE + PICKUP TIME */}
          <div className="formGrid">
            <div className="field">
              <label>📅 Travel date</label>

              <input
                type="date"
                value={travelDate}
                min={today}
                onChange={(event) => {
                  const value = event.target.value;
                  setTravelDate(value);

                  if (
                    returnDate &&
                    value &&
                    returnDate < value
                  ) {
                    setReturnDate("");
                  }
                }}
              />
            </div>

            <div className="field">
              <label>🕐 Pickup time</label>

              <input
                type="time"
                value={pickupTime}
                onChange={(event) =>
                  setPickupTime(event.target.value)
                }
              />
            </div>
          </div>

          {/* ROUND TRIP */}
          {tripType === "roundtrip" && (
            <div className="formGrid">
              <div className="field">
                <label>📅 Return date</label>

                <input
                  type="date"
                  value={returnDate}
                  min={travelDate || today}
                  onChange={(event) =>
                    setReturnDate(event.target.value)
                  }
                />
              </div>

              <div className="field">
                <label>🕐 Return time</label>

                <input
                  type="time"
                  value={returnTime}
                  onChange={(event) =>
                    setReturnTime(event.target.value)
                  }
                />
              </div>
            </div>
          )}

          {/* PASSENGER */}
          <div className="field">
            <label>👤 Passenger name</label>

            <input
              type="text"
              placeholder="Enter passenger name"
              value={passengerName}
              onChange={(event) =>
                setPassengerName(event.target.value)
              }
              autoComplete="name"
            />
          </div>

          {/* PHONE + WHATSAPP */}
          <div className="formGrid">
            <div className="field">
              <label>📞 Phone number</label>

              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                autoComplete="tel"
              />
            </div>

            <div className="field">
              <label>💬 WhatsApp number</label>

              <input
                type="tel"
                inputMode="numeric"
                placeholder="WhatsApp number (optional)"
                value={whatsapp}
                onChange={handleWhatsappChange}
                maxLength={10}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* MESSAGE */}
          {message && (
            <div
              className={
                messageType === "success"
                  ? "successMessage"
                  : "errorMessage"
              }
              role="alert"
            >
              {message}
            </div>
          )}

          {/* CONTINUE */}
          <button
            type="button"
            className="continueButton"
            onClick={handleContinue}
          >
            Continue
          </button>

          <p className="bookingNote">
            🔒 Your information is safe and secure.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footerInner">
          <div>
            © {new Date().getFullYear()} VOYNU
          </div>

          <div>
            Travel safe. Travel smart.
          </div>
        </div>
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5faf7;
          color: #26372f;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .header {
          width: 100%;
          background: #ffffff;
          border-bottom: 1px solid #edf1ee;
        }

        .headerInner {
          width: min(1200px, calc(100% - 40px));
          min-height: 74px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .logoIcon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #08783f;
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
        }

        .logoText {
          color: #08783f;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .headerPhone {
          color: #52625a;
          font-size: 13px;
          font-weight: 700;
        }

        .hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #effaf3 100%
          );
        }

        .hero::after {
          content: "";
          position: absolute;
          width: 600px;
          height: 180px;
          right: -100px;
          bottom: -85px;
          border-radius: 50%;
          background: #31443b;
          transform: rotate(-8deg);
        }

        .heroInner {
          width: min(1200px, calc(100% - 40px));
          margin: 0 auto;
          padding: 46px 0 55px;
          position: relative;
          z-index: 1;
        }

        .serviceBadge {
          display: inline-block;
          padding: 8px 15px;
          border-radius: 30px;
          background: #ffffff;
          border: 1px solid #d9e8de;
          color: #52625a;
          font-size: 12px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.04);
        }

        .heroContent {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 18px;
        }

        .heroText h1 {
          margin: 0;
          font-size: clamp(46px, 7vw, 76px);
          line-height: 0.98;
          letter-spacing: -3px;
          color: #26372f;
        }

        .heroText h1 span {
          color: #08783f;
        }

        .heroText p {
          margin: 22px 0 0;
          color: #607168;
          font-size: 18px;
          line-height: 1.5;
        }

        .heroCar {
          font-size: 110px;
          line-height: 1;
          margin-right: 70px;
          transform: translateY(5px);
        }

        .benefits {
          display: flex;
          gap: 60px;
          margin-top: 28px;
        }

        .benefit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 110px;
        }

        .benefitIcon {
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
        }

        .benefit strong {
          font-size: 14px;
          color: #26372f;
        }

        .bookingSection {
          position: relative;
          z-index: 5;
          width: min(1200px, calc(100% - 40px));
          margin: -15px auto 0;
          padding-bottom: 50px;
        }

        .bookingCard {
          width: 100%;
          background: #ffffff;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.09);
        }

        .tripToggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: #eef2ef;
          padding: 5px;
          border-radius: 14px;
          margin-bottom: 28px;
          max-width: 620px;
        }

        .tripToggle button {
          border: 0;
          background: transparent;
          padding: 15px;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 800;
          color: #52625a;
          cursor: pointer;
          transition: 0.2s;
        }

        .tripToggle button.active {
          background: #08783f;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(8, 120, 63, 0.18);
        }

        .locationGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .locationColumn {
          min-width: 0;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 20px;
        }

        .field {
          margin-top: 20px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
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
          background: #ffffff;
          color: #26372f;
        }

        .field input:focus {
          border-color: #08783f;
          box-shadow: 0 0 0 3px rgba(8, 120, 63, 0.1);
        }

        .errorMessage,
        .successMessage {
          margin-top: 20px;
          padding: 13px 15px;
          border-radius: 11px;
          font-size: 13px;
          line-height: 1.4;
        }

        .errorMessage {
          background: #fff3f1;
          border: 1px solid #f1c8c3;
          color: #b3342a;
        }

        .successMessage {
          background: #effaf3;
          border: 1px solid #cce3d3;
          color: #08783f;
        }

        .continueButton {
          width: 100%;
          margin-top: 24px;
          padding: 17px;
          border: 0;
          border-radius: 12px;
          background: #08783f;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }

        .continueButton:hover {
          background: #066b38;
          transform: translateY(-1px);
        }

        .continueButton:active {
          transform: translateY(0);
        }

        .bookingNote {
          margin: 12px 0 0;
          text-align: center;
          color: #75827b;
          font-size: 12px;
        }

        .footer {
          background: #26372f;
          color: #ffffff;
        }

        .footerInner {
          width: min(1200px, calc(100% - 40px));
          min-height: 70px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          font-size: 12px;
          opacity: 0.85;
        }

        @media (max-width: 900px) {
          .heroCar {
            margin-right: 10px;
            font-size: 80px;
          }

          .locationGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .headerInner {
            width: calc(100% - 28px);
            min-height: 62px;
          }

          .headerPhone {
            font-size: 11px;
          }

          .heroInner {
            width: calc(100% - 28px);
            padding: 32px 0 45px;
          }

          .heroText h1 {
            font-size: 48px;
            letter-spacing: -2px;
          }

          .heroText p {
            font-size: 15px;
          }

          .heroCar {
            font-size: 60px;
            margin-right: 0;
          }

          .benefits {
            gap: 20px;
            justify-content: space-between;
          }

          .benefit {
            min-width: 0;
            flex: 1;
          }

          .benefit strong {
            font-size: 11px;
            text-align: center;
          }

          .bookingSection {
            width: calc(100% - 20px);
          }

          .bookingCard {
            padding: 18px;
            border-radius: 18px;
          }

          .formGrid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .footerInner {
            width: calc(100% - 28px);
            flex-direction: column;
            justify-content: center;
            padding: 18px 0;
          }
        }
      `}</style>
    </main>
  );
}
