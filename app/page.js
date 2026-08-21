"use client";

import { useState } from "react";
import LocationPicker from "@/app/components/LocationPicker";

export default function HomePage() {
  const today = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const [tripType, setTripType] = useState("oneway");

  const [pickup, setPickup] = useState({
    name: "",
    lat: null,
    lon: null,
  });

  const [drop, setDrop] = useState({
    name: "",
    lat: null,
    lon: null,
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

  /*
   * Keep WhatsApp number synced with phone until
   * the user deliberately changes it.
   */
  const [whatsappEdited, setWhatsappEdited] = useState(false);

  useEffect(() => {
    if (!whatsappEdited) {
      setWhatsapp(phone);
    }
  }, [phone, whatsappEdited]);

  /*
   * When switching back to one-way, clear return details.
   */
  const handleTripTypeChange = (type) => {
    setTripType(type);
    setMessage("");
    setMessageType("");

    if (type === "oneway") {
      setReturnDate("");
      setReturnTime("");
    }
  };

  /*
   * Keep return date valid if the travel date changes.
   */
  const handleTravelDateChange = (value) => {
    setTravelDate(value);

    if (returnDate && value && returnDate < value) {
      setReturnDate("");
    }
  };

  /*
   * Basic Indian mobile number validation.
   * Allows +91XXXXXXXXXX or 10 digit number.
   */
  const isValidPhone = (value) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return /^[6-9]\d{9}$/.test(cleaned);
    }

    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return /^[6-9]\d{9}$/.test(cleaned.slice(2));
    }

    return false;
  };

  const showError = (text) => {
    setMessage(text);
    setMessageType("error");
  };

  const handleContinue = () => {
    setMessage("");
    setMessageType("");

    if (!pickup?.name?.trim()) {
      showError("Please select your pickup location.");
      return;
    }

    if (!drop?.name?.trim()) {
      showError("Please select your drop location.");
      return;
    }

    if (!travelDate) {
      showError("Please select your travel date.");
      return;
    }

    if (!pickupTime) {
      showError("Please select your pickup time.");
      return;
    }

    if (!passengerName.trim()) {
      showError("Please enter the passenger name.");
      return;
    }

    if (!isValidPhone(phone)) {
      showError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (tripType === "roundtrip") {
      if (!returnDate) {
        showError("Please select the return date.");
        return;
      }

      if (returnDate < travelDate) {
        showError("Return date cannot be before the travel date.");
        return;
      }

      if (!returnTime) {
        showError("Please select the return time.");
        return;
      }
    }

    const bookingData = {
      tripType,

      pickup: {
        name: pickup.name,
        lat: pickup.lat,
        lon: pickup.lon,
      },

      drop: {
        name: drop.name,
        lat: drop.lat,
        lon: drop.lon,
      },

      travelDate,
      pickupTime,

      returnDate:
        tripType === "roundtrip" ? returnDate : null,

      returnTime:
        tripType === "roundtrip" ? returnTime : null,

      passengerName: passengerName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
    };

    console.log("VOYNU booking:", bookingData);

    setMessage(
      "Your trip details are ready. The next step is to choose your cab."
    );

    setMessageType("success");
  };

  return (
    <main className="page">
      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <div className="brandMark">V</div>

            <div>
              <div className="brandName">VOYNU</div>
              <div className="brandTagline">
                Travel safe. Travel smart.
              </div>
            </div>
          </div>

          <a
            href="tel:+919123456789"
            className="headerPhone"
          >
            <span className="phoneIcon">☎</span>
            +91 91234 56789
          </a>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="hero">
        <div className="heroDecor heroDecorOne" />
        <div className="heroDecor heroDecorTwo" />

        <div className="heroInner">
          <div className="serviceBadge">
            <span className="badgeDot" />
            Serving within <strong>200 km</strong> from Kanpur
          </div>

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
                  <span className="featureIcon">✓</span>
                  <span>Verified Drivers</span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">⌁</span>
                  <span>Safe &amp; Secure</span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">⚡</span>
                  <span>EV Rides</span>
                </div>
              </div>
            </div>

            <div className="heroVehicle">
              <div className="vehicleGlow" />
              <div className="vehicle">🚙</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOOKING
      ========================================================= */}

      <section className="bookingSection">
        <div className="bookingCard">
          <div className="bookingHeader">
            <div>
              <h2>Book your ride</h2>
              <p>Tell us where you want to go.</p>
            </div>

            <div className="secureBadge">
              <span>🔒</span>
              Secure booking
            </div>
          </div>

          {/* =====================================================
              TRIP TYPE
          ===================================================== */}

          <div className="tripToggle">
            <button
              type="button"
              className={
                tripType === "oneway"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() =>
                handleTripTypeChange("oneway")
              }
            >
              <span className="tripIcon">→</span>
              <span>
                <strong>One Way</strong>
                <small>Single journey</small>
              </span>
            </button>

            <button
              type="button"
              className={
                tripType === "roundtrip"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() =>
                handleTripTypeChange("roundtrip")
              }
            >
              <span className="tripIcon">⇄</span>
              <span>
                <strong>Round Trip</strong>
                <small>Return journey</small>
              </span>
            </button>
          </div>

          {/* =====================================================
              LOCATIONS
          ===================================================== */}

          <div className="sectionLabel">
            <span className="sectionNumber">1</span>
            <span>Journey details</span>
          </div>

          <div className="locationGrid">
            <div className="locationBox">
              <LocationPicker
                label="Pickup location"
                value={pickup.name}
                placeholder="Search pickup location"
                allowCurrentLocation={true}
                onLocationSelect={(location) => {
                  setPickup(location);
                  setMessage("");
                  setMessageType("");
                }}
              />
            </div>

            <div className="locationBox">
              <LocationPicker
                label="Drop location"
                value={drop.name}
                placeholder="Search destination"
                allowCurrentLocation={false}
                onLocationSelect={(location) => {
                  setDrop(location);
                  setMessage("");
                  setMessageType("");
                }}
              />
            </div>
          </div>

          {/* =====================================================
              DATE + TIME
          ===================================================== */}

          <div className="formGrid">
            <div className="field">
              <label htmlFor="travelDate">
                <span className="labelIcon">▣</span>
                Travel date
              </label>

              <input
                id="travelDate"
                type="date"
                value={travelDate}
                min={today}
                onChange={(event) =>
                  handleTravelDateChange(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="field">
              <label htmlFor="pickupTime">
                <span className="labelIcon">◷</span>
                Pickup time
              </label>

              <input
                id="pickupTime"
                type="time"
                value={pickupTime}
                onChange={(event) =>
                  setPickupTime(
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          {/* =====================================================
              ROUND TRIP
          ===================================================== */}

          {tripType === "roundtrip" && (
            <div className="roundTripBox">
              <div className="roundTripTitle">
                <span>⇄</span>
                Return journey
              </div>

              <div className="formGrid">
                <div className="field">
                  <label htmlFor="returnDate">
                    <span className="labelIcon">▣</span>
                    Return date
                  </label>

                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    min={travelDate || today}
                    onChange={(event) =>
                      setReturnDate(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="returnTime">
                    <span className="labelIcon">◷</span>
                    Return time
                  </label>

                  <input
                    id="returnTime"
                    type="time"
                    value={returnTime}
                    onChange={(event) =>
                      setReturnTime(
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              PASSENGER DETAILS
          ===================================================== */}

          <div className="sectionLabel passengerSectionLabel">
            <span className="sectionNumber">2</span>
            <span>Passenger details</span>
          </div>

          <div className="field">
            <label htmlFor="passengerName">
              <span className="labelIcon">●</span>
              Passenger name
            </label>

            <input
              id="passengerName"
              type="text"
              autoComplete="name"
              placeholder="Enter passenger name"
              value={passengerName}
              onChange={(event) =>
                setPassengerName(
                  event.target.value
                )
              }
            />
          </div>

          <div className="formGrid">
            <div className="field">
              <label htmlFor="phone">
                <span className="labelIcon">☎</span>
                Phone number
              </label>

              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={phone}
                maxLength={12}
                onChange={(event) =>
                  setPhone(
                    event.target.value.replace(
                      /[^\d+]/g,
                      ""
                    )
                  )
                }
              />
            </div>

            <div className="field">
              <label htmlFor="whatsapp">
                <span className="labelIcon">◌</span>
                WhatsApp number
              </label>

              <input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="WhatsApp number"
                value={whatsapp}
                maxLength={12}
                onChange={(event) => {
                  setWhatsappEdited(true);

                  setWhatsapp(
                    event.target.value.replace(
                      /[^\d+]/g,
                      ""
                    )
                  );
                }}
              />

              {!whatsappEdited && phone && (
                <div className="fieldHint">
                  Same as your phone number
                </div>
              )}
            </div>
          </div>

          {/* =====================================================
              MESSAGE
          ===================================================== */}

          {message && (
            <div
              className={
                messageType === "success"
                  ? "message successMessage"
                  : "message errorMessage"
              }
            >
              <span className="messageIcon">
                {messageType === "success"
                  ? "✓"
                  : "!"}
              </span>

              <span>{message}</span>
            </div>
          )}

          {/* =====================================================
              CONTINUE
          ===================================================== */}

          <button
            type="button"
            className="continueButton"
            onClick={handleContinue}
          >
            <span>Continue</span>
            <span className="continueArrow">→</span>
          </button>

          <div className="bookingFooter">
            <span>🔒</span>
            Your information is safe and secure.
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="footer">
        <div className="footerInner">
          <div>
            <strong>VOYNU</strong>
            <span> © {new Date().getFullYear()}</span>
          </div>

          <div>
            Travel safe. Travel smart.
          </div>
        </div>
      </footer>

      {/* =========================================================
          STYLES
      ========================================================= */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f4faf6;
          color: #26372f;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            Helvetica,
            sans-serif;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .header {
          background: #ffffff;
          border-bottom: 1px solid #e8eee9;
          position: relative;
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
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;
          background: #08783f;

          color: #ffffff;
          font-size: 21px;
          font-weight: 900;
        }

        .brandName {
          color: #08783f;
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .brandTagline {
          margin-top: 4px;
          color: #7a8981;
          font-size: 9px;
          letter-spacing: 0.3px;
        }

        .headerPhone {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #4f6158;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .phoneIcon {
          color: #08783f;
          font-size: 15px;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .hero {
          position: relative;
          overflow: hidden;

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f1faf4 58%,
              #e8f6ed 100%
            );
        }

        .heroInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;

          padding: 42px 0 78px;

          position: relative;
          z-index: 2;
        }

        .heroDecor {
          position: absolute;
          pointer-events: none;
        }

        .heroDecorOne {
          width: 520px;
          height: 170px;
          right: -100px;
          bottom: -100px;

          border-radius: 50%;
          background: #263b31;

          transform: rotate(-8deg);
        }

        .heroDecorTwo {
          width: 220px;
          height: 220px;
          right: 11%;
          top: -145px;

          border-radius: 50%;
          background: rgba(8, 120, 63, 0.055);
        }

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 8px 14px;

          border: 1px solid #d8e7dc;
          border-radius: 30px;

          background: rgba(255, 255, 255, 0.9);

          color: #596a61;
          font-size: 12px;

          box-shadow:
            0 5px 18px rgba(0, 0, 0, 0.035);
        }

        .badgeDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #08783f;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          align-items: center;
          gap: 30px;

          margin-top: 20px;
        }

        .heroText h1 {
          margin: 0;

          color: #26372f;

          font-size: clamp(48px, 7vw, 78px);
          line-height: 0.97;

          letter-spacing: -4px;
          font-weight: 900;
        }

        .heroText h1 span {
          color: #08783f;
        }

        .heroText p {
          margin: 21px 0 0;

          color: #62736a;

          font-size: 17px;
          line-height: 1.55;
        }

        .heroFeatures {
          display: flex;
          flex-wrap: wrap;
          gap: 28px;

          margin-top: 27px;
        }

        .heroFeature {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #35473e;

          font-size: 12px;
          font-weight: 750;
        }

        .featureIcon {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e1f3e7;
          color: #08783f;

          font-size: 13px;
          font-weight: 900;
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

          width: 270px;
          height: 100px;

          border-radius: 50%;
          background: rgba(8, 120, 63, 0.08);

          transform: rotate(-8deg);
        }

        .vehicle {
          position: relative;

          font-size: 105px;
          line-height: 1;

          transform: translateY(5px);
          filter: drop-shadow(
            0 14px 15px rgba(0, 0, 0, 0.08)
          );
        }

        /* =====================================================
           BOOKING SECTION
        ===================================================== */

        .bookingSection {
          width: min(1180px, calc(100% - 40px));
          margin: -30px auto 0;

          position: relative;
          z-index: 10;

          padding-bottom: 55px;
        }

        .bookingCard {
          padding: 30px;

          border-radius: 24px;

          background: #ffffff;

          box-shadow:
            0 20px 60px rgba(25, 55, 39, 0.1);

          border: 1px solid rgba(219, 231, 223, 0.75);
        }

        .bookingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          margin-bottom: 22px;
        }

        .bookingHeader h2 {
          margin: 0;

          color: #26372f;
          font-size: 24px;
          font-weight: 850;
        }

        .bookingHeader p {
          margin: 5px 0 0;

          color: #7a8981;
          font-size: 13px;
        }

        .secureBadge {
          display: flex;
          align-items: center;
          gap: 6px;

          padding: 7px 11px;

          border-radius: 20px;
          background: #f1f8f3;

          color: #4f6759;
          font-size: 11px;
          font-weight: 700;
        }

        /* =====================================================
           TRIP TOGGLE
        ===================================================== */

        .tripToggle {
          width: min(620px, 100%);

          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 5px;

          padding: 5px;

          margin-bottom: 28px;

          border-radius: 15px;
          background: #eef3ef;
        }

        .tripButton {
          min-height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border: 0;
          border-radius: 11px;

          background: transparent;

          color: #5c6d64;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .tripButton strong {
          display: block;

          font-size: 13px;
          font-weight: 800;
        }

        .tripButton small {
          display: block;

          margin-top: 2px;

          font-size: 10px;
          opacity: 0.72;
        }

        .tripIcon {
          font-size: 20px;
          font-weight: 700;
        }

        .tripButton.active {
          background: #08783f;
          color: #ffffff;

          box-shadow:
            0 5px 15px rgba(8, 120, 63, 0.2);
        }

        /* =====================================================
           SECTION LABEL
        ===================================================== */

        .sectionLabel {
          display: flex;
          align-items: center;
          gap: 9px;

          margin: 0 0 15px;

          color: #34483e;

          font-size: 13px;
          font-weight: 850;
        }

        .sectionNumber {
          width: 24px;
          height: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e5f4e9;
          color: #08783f;

          font-size: 11px;
          font-weight: 900;
        }

        .passengerSectionLabel {
          margin-top: 29px;
        }

        /* =====================================================
           LOCATIONS
        ===================================================== */

        .locationGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .locationBox {
          min-width: 0;
        }

        /* =====================================================
           FORM
        ===================================================== */

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;

          margin-top: 18px;
        }

        .field {
          min-width: 0;
        }

        .field label {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 8px;

          color: #52635a;

          font-size: 12px;
          font-weight: 750;
        }

        .labelIcon {
          color: #08783f;
          font-size: 13px;
          font-weight: 900;
        }

        .field input {
          width: 100%;
          height: 53px;

          padding: 0 15px;

          border: 1px solid #d9e2dc;
          border-radius: 11px;

          background: #ffffff;

          color: #26372f;

          font-family: inherit;
          font-size: 14px;

          outline: none;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .field input::placeholder {
          color: #9aa69f;
        }

        .field input:focus {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px rgba(8, 120, 63, 0.09);
        }

        .fieldHint {
          margin-top: 5px;

          color: #839189;
          font-size: 10px;
        }

        /* =====================================================
           ROUND TRIP
        ===================================================== */

        .roundTripBox {
          margin-top: 20px;
          padding: 17px;

          border: 1px solid #dcebe1;
          border-radius: 14px;

          background: #f6fbf7;
        }

        .roundTripTitle {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #08783f;

          font-size: 12px;
          font-weight: 850;
        }

        .roundTripTitle span {
          font-size: 17px;
        }

        .roundTripBox .formGrid {
          margin-top: 15px;
        }

        /* =====================================================
           MESSAGE
        ===================================================== */

        .message {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          margin-top: 21px;
          padding: 13px 14px;

          border-radius: 11px;

          font-size: 12px;
          line-height: 1.45;
        }

        .messageIcon {
          width: 20px;
          height: 20px;

          flex: 0 0 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          font-size: 11px;
          font-weight: 900;
        }

        .successMessage {
          border: 1px solid #cce5d4;
          background: #eef9f1;
          color: #28734b;
        }

        .successMessage .messageIcon {
          background: #08783f;
          color: #ffffff;
        }

        .errorMessage {
          border: 1px solid #efccc8;
          background: #fff5f3;
          color: #b33d34;
        }

        .errorMessage .messageIcon {
          background: #c64a3f;
          color: #ffffff;
        }

        /* =====================================================
           CONTINUE
        ===================================================== */

        .continueButton {
          width: 100%;
          height: 56px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          margin-top: 20px;

          border: 0;
          border-radius: 12px;

          background: #08783f;
          color: #ffffff;

          font-family: inherit;
          font-size: 15px;
          font-weight: 850;

          cursor: pointer;

          box-shadow:
            0 7px 18px rgba(8, 120, 63, 0.18);

          transition:
            transform 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .continueButton:hover {
          background: #076d39;

          transform: translateY(-1px);

          box-shadow:
            0 10px 22px rgba(8, 120, 63, 0.22);
        }

        .continueButton:active {
          transform: translateY(0);
        }

        .continueArrow {
          font-size: 19px;
          line-height: 1;
        }

        .bookingFooter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          margin-top: 12px;

          color: #89958e;
          font-size: 11px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .footer {
          background: #26372f;
          color: #ffffff;
        }

        .footerInner {
          width: min(1180px, calc(100% - 40px));
          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          margin: 0 auto;

          color: rgba(255, 255, 255, 0.78);

          font-size: 11px;
        }

        .footerInner strong {
          color: #ffffff;
          letter-spacing: 0.5px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 900px) {
          .heroGrid {
            grid-template-columns: 1fr;
          }

          .heroVehicle {
            display: none;
          }

          .locationGrid {
            grid-template-columns: 1fr;
          }

          .bookingCard {
            padding: 25px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .headerInner {
            width: calc(100% - 28px);
            min-height: 62px;
          }

          .brandMark {
            width: 34px;
            height: 34px;

            border-radius: 9px;

            font-size: 18px;
          }

          .brandName {
            font-size: 18px;
          }

          .brandTagline {
            display: none;
          }

          .headerPhone {
            font-size: 11px;
          }

          .heroInner {
            width: calc(100% - 28px);

            padding: 28px 0 56px;
          }

          .serviceBadge {
            font-size: 10px;
          }

          .heroText h1 {
            font-size: 50px;
            letter-spacing: -2.8px;
          }

          .heroText p {
            margin-top: 17px;

            font-size: 14px;
          }

          .desktopBreak {
            display: none;
          }

          .heroFeatures {
            gap: 12px 17px;

            margin-top: 22px;
          }

          .heroFeature {
            font-size: 10px;
          }

          .featureIcon {
            width: 22px;
            height: 22px;

            font-size: 11px;
          }

          .heroDecorOne {
            width: 350px;
            height: 120px;

            right: -140px;
            bottom: -80px;
          }

          .bookingSection {
            width: calc(100% - 20px);

            margin-top: -23px;

            padding-bottom: 30px;
          }

          .bookingCard {
            padding: 18px 16px 17px;

            border-radius: 20px;
          }

          .bookingHeader {
            margin-bottom: 17px;
          }

          .bookingHeader h2 {
            font-size: 20px;
          }

          .bookingHeader p {
            font-size: 11px;
          }

          .secureBadge {
            display: none;
          }

          .tripToggle {
            margin-bottom: 21px;
          }

          .tripButton {
            min-height: 53px;
          }

          .tripButton strong {
            font-size: 12px;
          }

          .tripButton small {
            font-size: 9px;
          }

          .tripIcon {
            font-size: 18px;
          }

          .sectionLabel {
            margin-bottom: 12px;
          }

          .locationGrid {
            gap: 14px;
          }

          .formGrid {
            grid-template-columns: 1fr;
            gap: 15px;

            margin-top: 15px;
          }

          .field input {
            height: 52px;
          }

          .roundTripBox {
            padding: 14px;
          }

          .roundTripBox .formGrid {
            margin-top: 13px;
          }

          .passengerSectionLabel {
            margin-top: 24px;
          }

          .message {
            font-size: 11px;
          }

          .continueButton {
            height: 55px;
          }

          .footerInner {
            width: calc(100% - 28px);

            min-height: 62px;

            flex-direction: column;
            justify-content: center;

            gap: 4px;
          }
        }

        /* =====================================================
           VERY SMALL PHONES
        ===================================================== */

        @media (max-width: 380px) {
          .headerPhone {
            font-size: 10px;
          }

          .heroText h1 {
            font-size: 44px;
          }

          .bookingCard {
            padding: 16px 14px;
          }

          .tripButton {
            gap: 6px;
          }

          .tripButton small {
            display: none;
          }
        }
      `}</style>
    </main>
  );
        }
