"use client";

import { useEffect, useState } from "react";
import LocationPicker from "./components/LocationPicker";

export default function HomePage() {
  const [today] = useState(() => {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });

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
  const [whatsappEdited, setWhatsappEdited] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!whatsappEdited) {
      setWhatsapp(phone);
    }
  }, [phone, whatsappEdited]);

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const handleTripTypeChange = (type) => {
    setTripType(type);
    clearMessage();

    if (type === "oneway") {
      setReturnDate("");
      setReturnTime("");
    }
  };

  const handleTravelDateChange = (value) => {
    setTravelDate(value);
    clearMessage();

    if (returnDate && value && returnDate < value) {
      setReturnDate("");
    }
  };

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
    clearMessage();

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
      showError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    if (tripType === "roundtrip") {
      if (!returnDate) {
        showError("Please select the return date.");
        return;
      }

      if (returnDate < travelDate) {
        showError(
          "Return date cannot be before the travel date."
        );
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

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      setMessage(
        "Your trip details are ready. The next step is to choose your cab."
      );

      setMessageType("success");
    }, 450);
  };

  return (
    <main className="page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <div className="brandMark">V</div>

            <div className="brandText">
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
            <span className="phoneCircle">☎</span>

            <span className="phoneText">
              +91 91234 56789
            </span>
          </a>
        </div>
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="hero">
        <div className="heroShape heroShapeOne" />
        <div className="heroShape heroShapeTwo" />

        <div className="heroInner">
          <div className="serviceBadge">
            <span className="liveDot" />
            <span>
              Serving within <strong>200 km</strong> from Kanpur
            </span>
          </div>

          <div className="heroContent">
            <div className="heroCopy">
              <div className="eyebrow">
                <span>●</span>
                SIMPLE. SAFE. RELIABLE.
              </div>

              <h1>
                Your ride.
                <br />
                <span>Your way.</span>
              </h1>

              <p>
                Book a reliable cab for your journey
                <br className="desktopOnly" />
                and travel with confidence.
              </p>

              <div className="heroBenefits">
                <div className="benefit">
                  <span className="benefitIcon">✓</span>
                  <span>Verified drivers</span>
                </div>

                <div className="benefit">
                  <span className="benefitIcon">⌁</span>
                  <span>Safe & secure</span>
                </div>

                <div className="benefit">
                  <span className="benefitIcon">⚡</span>
                  <span>EV rides</span>
                </div>
              </div>
            </div>

            <div className="heroVisual">
              <div className="roadGlow" />

              <div className="carIllustration">
                🚙
              </div>

              <div className="floatingCard floatingCardTop">
                <span className="floatingIcon">✓</span>
                <span>
                  <strong>Trusted</strong>
                  <small>Drivers</small>
                </span>
              </div>

              <div className="floatingCard floatingCardBottom">
                <span className="floatingIcon">⚡</span>
                <span>
                  <strong>Comfort</strong>
                  <small>Every journey</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          BOOKING CARD
      ====================================================== */}

      <section className="bookingSection">
        <div className="bookingCard">
          {/* Header */}

          <div className="bookingHeader">
            <div>
              <div className="bookingEyebrow">
                PLAN YOUR JOURNEY
              </div>

              <h2>Book your ride</h2>

              <p>
                Enter your journey details and passenger information.
              </p>
            </div>

            <div className="secureBadge">
              <span>🔒</span>
              Secure booking
            </div>
          </div>

          {/* Trip Type */}

          <div className="tripSelector">
            <button
              type="button"
              className={
                tripType === "oneway"
                  ? "tripOption active"
                  : "tripOption"
              }
              onClick={() => handleTripTypeChange("oneway")}
            >
              <span className="tripOptionIcon">→</span>

              <span className="tripOptionText">
                <strong>One Way</strong>
                <small>Single journey</small>
              </span>

              {tripType === "oneway" && (
                <span className="selectedCheck">✓</span>
              )}
            </button>

            <button
              type="button"
              className={
                tripType === "roundtrip"
                  ? "tripOption active"
                  : "tripOption"
              }
              onClick={() => handleTripTypeChange("roundtrip")}
            >
              <span className="tripOptionIcon">⇄</span>

              <span className="tripOptionText">
                <strong>Round Trip</strong>
                <small>Return journey</small>
              </span>

              {tripType === "roundtrip" && (
                <span className="selectedCheck">✓</span>
              )}
            </button>
          </div>

          {/* Journey Details */}

          <div className="sectionHeading">
            <span className="stepCircle">1</span>

            <div>
              <strong>Journey details</strong>
              <span>Where are you travelling?</span>
            </div>
          </div>

          <div className="locationArea">
            <div className="locationColumn">
              <div className="locationTag pickupTag">
                <span className="locationDot" />
                PICKUP
              </div>

              <LocationPicker
                label="Pickup location"
                value={pickup.name}
                placeholder="Search pickup location"
                allowCurrentLocation={true}
                onLocationSelect={(location) => {
                  setPickup(location);
                  clearMessage();
                }}
              />
            </div>

            <div className="journeyConnector">
              <div className="connectorLine" />
              <div className="connectorArrow">↓</div>
              <div className="connectorLine" />
            </div>

            <div className="locationColumn">
              <div className="locationTag dropTag">
                <span className="locationDot" />
                DESTINATION
              </div>

              <LocationPicker
                label="Drop location"
                value={drop.name}
                placeholder="Search destination"
                allowCurrentLocation={false}
                onLocationSelect={(location) => {
                  setDrop(location);
                  clearMessage();
                }}
              />
            </div>
          </div>

          {/* Date / Time */}

          <div className="dateTimeGrid">
            <div className="formField">
              <label htmlFor="travelDate">
                <span className="fieldIcon">▣</span>
                Travel date
              </label>

              <div className="inputShell">
                <input
                  id="travelDate"
                  type="date"
                  value={travelDate}
                  min={today}
                  onChange={(event) =>
                    handleTravelDateChange(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="formField">
              <label htmlFor="pickupTime">
                <span className="fieldIcon">◷</span>
                Pickup time
              </label>

              <div className="inputShell">
                <input
                  id="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={(event) => {
                    setPickupTime(event.target.value);
                    clearMessage();
                  }}
                />
              </div>
            </div>
          </div>

          {/* Round Trip */}

          {tripType === "roundtrip" && (
            <div className="returnBox">
              <div className="returnHeader">
                <div className="returnIcon">⇄</div>

                <div>
                  <strong>Return journey</strong>
                  <span>When will you return?</span>
                </div>
              </div>

              <div className="dateTimeGrid">
                <div className="formField">
                  <label htmlFor="returnDate">
                    <span className="fieldIcon">▣</span>
                    Return date
                  </label>

                  <div className="inputShell">
                    <input
                      id="returnDate"
                      type="date"
                      value={returnDate}
                      min={travelDate || today}
                      onChange={(event) => {
                        setReturnDate(event.target.value);
                        clearMessage();
                      }}
                    />
                  </div>
                </div>

                <div className="formField">
                  <label htmlFor="returnTime">
                    <span className="fieldIcon">◷</span>
                    Return time
                  </label>

                  <div className="inputShell">
                    <input
                      id="returnTime"
                      type="time"
                      value={returnTime}
                      onChange={(event) => {
                        setReturnTime(event.target.value);
                        clearMessage();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passenger */}

          <div className="sectionHeading passengerHeading">
            <span className="stepCircle">2</span>

            <div>
              <strong>Passenger details</strong>
              <span>Who are we booking this for?</span>
            </div>
          </div>

          <div className="formField">
            <label htmlFor="passengerName">
              <span className="fieldIcon">●</span>
              Passenger name
            </label>

            <div className="inputShell">
              <input
                id="passengerName"
                type="text"
                autoComplete="name"
                placeholder="Enter passenger name"
                value={passengerName}
                onChange={(event) => {
                  setPassengerName(event.target.value);
                  clearMessage();
                }}
              />
            </div>
          </div>

          <div className="contactGrid">
            <div className="formField">
              <label htmlFor="phone">
                <span className="fieldIcon">☎</span>
                Phone number
              </label>

              <div className="inputShell">
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  maxLength={12}
                  onChange={(event) => {
                    setPhone(
                      event.target.value.replace(/[^\d+]/g, "")
                    );
                    clearMessage();
                  }}
                />
              </div>
            </div>

            <div className="formField">
              <label htmlFor="whatsapp">
                <span className="fieldIcon whatsappIcon">
                  ◌
                </span>
                WhatsApp number
              </label>

              <div className="inputShell">
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
                      event.target.value.replace(/[^\d+]/g, "")
                    );

                    clearMessage();
                  }}
                />
              </div>

              {!whatsappEdited && phone && (
                <div className="fieldHint">
                  ✓ Same as your phone number
                </div>
              )}
            </div>
          </div>

          {/* Message */}

          {message && (
            <div
              className={
                messageType === "success"
                  ? "message successMessage"
                  : "message errorMessage"
              }
            >
              <span className="messageIcon">
                {messageType === "success" ? "✓" : "!"}
              </span>

              <span>{message}</span>
            </div>
          )}

          {/* Continue */}

          <button
            type="button"
            className="continueButton"
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="buttonSpinner" />
                <span>Preparing your trip...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <span className="buttonArrow">→</span>
              </>
            )}
          </button>

          <div className="bookingSecurity">
            <span>🔒</span>
            <span>Your information is safe and secure.</span>
          </div>
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">
        <div className="footerInner">
          <div className="footerBrand">
            <strong>VOYNU</strong>
            <span> © {new Date().getFullYear()}</span>
          </div>

          <span>Travel safe. Travel smart.</span>
        </div>
      </footer>

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f4f9f6;
          color: #26372f;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        button,
        input {
          font-family: inherit;
        }

        /* ================= HEADER ================= */

        .header {
          position: relative;
          z-index: 50;
          background: #ffffff;
          border-bottom: 1px solid #e7eee9;
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
          gap: 11px;
        }

        .brandMark {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background: #08783f;
          color: white;

          font-size: 21px;
          font-weight: 900;

          box-shadow:
            0 7px 18px rgba(8, 120, 63, 0.16);
        }

        .brandName {
          color: #08783f;
          font-size: 21px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .brandTagline {
          margin-top: 4px;
          color: #829088;
          font-size: 9px;
          letter-spacing: 0.3px;
        }

        .headerPhone {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #45574e;
          text-decoration: none;

          font-size: 13px;
          font-weight: 750;
        }

        .phoneCircle {
          width: 29px;
          height: 29px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          background: #eaf6ee;
          color: #08783f;
        }

        /* ================= HERO ================= */

        .hero {
          position: relative;
          overflow: hidden;

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f2faf5 52%,
              #e5f4ea 100%
            );
        }

        .heroInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;

          padding: 38px 0 75px;

          position: relative;
          z-index: 3;
        }

        .heroShape {
          position: absolute;
          pointer-events: none;
        }

        .heroShapeOne {
          width: 560px;
          height: 190px;

          right: -130px;
          bottom: -110px;

          border-radius: 50%;

          background: #26372f;

          transform: rotate(-8deg);
        }

        .heroShapeTwo {
          width: 300px;
          height: 300px;

          right: 8%;
          top: -190px;

          border-radius: 50%;

          background: rgba(8, 120, 63, 0.045);
        }

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 14px;

          border: 1px solid #d9e8de;
          border-radius: 30px;

          background: rgba(255, 255, 255, 0.9);

          color: #5b6d63;

          font-size: 12px;

          box-shadow:
            0 6px 20px rgba(22, 56, 39, 0.035);
        }

        .serviceBadge strong {
          color: #08783f;
        }

        .liveDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #0a9b52;

          box-shadow:
            0 0 0 4px rgba(10, 155, 82, 0.1);
        }

        .heroContent {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;

          align-items: center;

          gap: 30px;

          margin-top: 21px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 12px;

          color: #08783f;

          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.6px;
        }

        .eyebrow span {
          font-size: 8px;
        }

        .heroCopy h1 {
          margin: 0;

          color: #26372f;

          font-size: clamp(50px, 7vw, 80px);
          line-height: 0.96;

          letter-spacing: -4px;
          font-weight: 900;
        }

        .heroCopy h1 span {
          color: #08783f;
        }

        .heroCopy p {
          margin: 21px 0 0;

          color: #63736b;

          font-size: 17px;
          line-height: 1.55;
        }

        .heroBenefits {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;

          margin-top: 26px;
        }

        .benefit {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #405148;

          font-size: 12px;
          font-weight: 750;
        }

        .benefitIcon {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e2f3e8;
          color: #08783f;

          font-size: 12px;
          font-weight: 900;
        }

        /* ================= HERO VISUAL ================= */

        .heroVisual {
          position: relative;

          min-height: 225px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .roadGlow {
          position: absolute;

          width: 330px;
          height: 115px;

          border-radius: 50%;

          background: rgba(8, 120, 63, 0.085);

          transform: rotate(-8deg);
        }

        .carIllustration {
          position: relative;
          z-index: 2;

          font-size: 118px;
          line-height: 1;

          filter:
            drop-shadow(
              0 18px 18px rgba(0, 0, 0, 0.1)
            );
        }

        .floatingCard {
          position: absolute;
          z-index: 5;

          display: flex;
          align-items: center;
          gap: 8px;

          padding: 9px 12px;

          border: 1px solid rgba(219, 232, 223, 0.9);
          border-radius: 12px;

          background: rgba(255, 255, 255, 0.93);

          box-shadow:
            0 12px 30px rgba(23, 55, 39, 0.09);
        }

        .floatingCard strong,
        .floatingCard small {
          display: block;
        }

        .floatingCard strong {
          color: #31443a;
          font-size: 10px;
          font-weight: 850;
        }

        .floatingCard small {
          margin-top: 2px;
          color: #829088;
          font-size: 8px;
        }

        .floatingIcon {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;

          background: #e5f5ea;
          color: #08783f;

          font-size: 11px;
          font-weight: 900;
        }

        .floatingCardTop {
          top: 18px;
          right: 10%;
        }

        .floatingCardBottom {
          bottom: 8px;
          left: 9%;
        }

        /* ================= BOOKING ================= */

        .bookingSection {
          width: min(1180px, calc(100% - 40px));

          margin: -30px auto 0;

          position: relative;
          z-index: 20;

          padding-bottom: 55px;
        }

        .bookingCard {
          padding: 32px;

          border: 1px solid #dfe9e3;
          border-radius: 25px;

          background: #ffffff;

          box-shadow:
            0 25px 70px rgba(28, 61, 43, 0.1);
        }

        .bookingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 23px;
        }

        .bookingEyebrow {
          margin-bottom: 6px;

          color: #08783f;

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .bookingHeader h2 {
          margin: 0;

          color: #26372f;

          font-size: 25px;
          font-weight: 900;
          letter-spacing: -0.6px;
        }

        .bookingHeader p {
          margin: 5px 0 0;

          color: #7a8981;

          font-size: 12px;
        }

        .secureBadge {
          display: flex;
          align-items: center;
          gap: 6px;

          padding: 8px 12px;

          border-radius: 30px;

          background: #f0f8f3;
          color: #52685b;

          font-size: 10px;
          font-weight: 800;
        }

        /* ================= TRIP SELECTOR ================= */

        .tripSelector {
          width: min(650px, 100%);

          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 6px;

          padding: 5px;

          margin-bottom: 28px;

          border-radius: 15px;

          background: #edf3ef;
        }

        .tripOption {
          position: relative;

          min-height: 62px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border: 0;
          border-radius: 11px;

          background: transparent;

          color: #63736b;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.15s ease;
        }

        .tripOption:hover {
          transform: translateY(-1px);
        }

        .tripOption.active {
          background: #08783f;
          color: #ffffff;

          box-shadow:
            0 7px 18px rgba(8, 120, 63, 0.2);
        }

        .tripOptionIcon {
          font-size: 21px;
          font-weight: 800;
        }

        .tripOptionText {
          text-align: left;
        }

        .tripOptionText strong,
        .tripOptionText small {
          display: block;
        }

        .tripOptionText strong {
          font-size: 13px;
          font-weight: 850;
        }

        .tripOptionText small {
          margin-top: 2px;
          font-size: 9px;
          opacity: 0.72;
        }

        .selectedCheck {
          position: absolute;

          right: 12px;
          top: 50%;

          width: 19px;
          height: 19px;

          display: flex;
          align-items: center;
          justify-content: center;

          transform: translateY(-50%);

          border-radius: 50%;

          background: rgba(255, 255, 255, 0.2);

          font-size: 10px;
          font-weight: 900;
        }

        /* ================= SECTION HEADINGS ================= */

        .sectionHeading {
          display: flex;
          align-items: center;
          gap: 10px;

          margin: 0 0 17px;
        }

        .stepCircle {
          width: 27px;
          height: 27px;

          flex: 0 0 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e3f4e8;
          color: #08783f;

          font-size: 11px;
          font-weight: 900;
        }

        .sectionHeading strong,
        .sectionHeading span {
          display: block;
        }

        .sectionHeading strong {
          color: #34483e;
          font-size: 13px;
          font-weight: 900;
        }

        .sectionHeading div > span {
          margin-top: 2px;

          color: #8a9891;
          font-size: 9px;
          font-weight: 500;
        }

        /* ================= LOCATIONS ================= */

        .locationArea {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            38px
            minmax(0, 1fr);

          gap: 10px;

          align-items: start;
        }

        .locationColumn {
          min-width: 0;
        }

        .locationTag {
          display: flex;
          align-items: center;
          gap: 6px;

          margin-bottom: 8px;

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .pickupTag {
          color: #08783f;
        }

        .dropTag {
          color: #d26a3c;
        }

        .locationDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: currentColor;
        }

        .journeyConnector {
          height: 310px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding-top: 28px;
        }

        .connectorLine {
          width: 1px;
          flex: 1;

          border-left: 1px dashed #c9d8ce;
        }

        .connectorArrow {
          width: 27px;
          height: 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 7px 0;

          border: 1px solid #d7e5dc;
          border-radius: 50%;

          background: #f5faf7;

          color: #08783f;

          font-size: 12px;
          font-weight: 900;
        }

        /* ================= DATE TIME ================= */

        .dateTimeGrid,
        .contactGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 20px;

          margin-top: 19px;
        }

        .formField {
          min-width: 0;
        }

        .formField label {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 8px;

          color: #53635b;

          font-size: 11px;
          font-weight: 800;
        }

        .fieldIcon {
          color: #08783f;
          font-size: 12px;
          font-weight: 900;
        }

        .whatsappIcon {
          font-size: 15px;
        }

        .inputShell {
          position: relative;
        }

        .inputShell input {
          width: 100%;
          height: 53px;

          padding: 0 15px;

          border: 1px solid #d8e2dc;
          border-radius: 11px;

          outline: none;

          background: #ffffff;
          color: #26372f;

          font-size: 13px;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .inputShell input::placeholder {
          color: #a0aaa5;
        }

        .inputShell input:hover {
          border-color: #c6d6cc;
        }

        .inputShell input:focus {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px rgba(8, 120, 63, 0.08);
        }

        .fieldHint {
          margin-top: 6px;

          color: #6f897a;

          font-size: 9px;
          font-weight: 700;
        }

        /* ================= RETURN ================= */

        .returnBox {
          margin-top: 21px;

          padding: 17px;

          border: 1px solid #dcebe1;
          border-radius: 15px;

          background: #f6fbf8;
        }

        .returnHeader {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .returnIcon {
          width: 30px;
          height: 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #e0f1e6;
          color: #08783f;

          font-size: 16px;
          font-weight: 900;
        }

        .returnHeader strong,
        .returnHeader span {
          display: block;
        }

        .returnHeader strong {
          color: #385046;
          font-size: 11px;
          font-weight: 900;
        }

        .returnHeader span {
          margin-top: 2px;
          color: #87948d;
          font-size: 9px;
        }

        .returnBox .dateTimeGrid {
          margin-top: 14px;
        }

        /* ================= PASSENGER ================= */

        .passengerHeading {
          margin-top: 30px;
        }

        /* ================= MESSAGES ================= */

        .message {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          margin-top: 21px;
          padding: 13px 14px;

          border-radius: 11px;

          font-size: 11px;
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

          color: #ffffff;

          font-size: 10px;
          font-weight: 900;
        }

        .successMessage {
          border: 1px solid #cbe5d3;
          background: #eff9f2;
          color: #267047;
        }

        .successMessage .messageIcon {
          background: #08783f;
        }

        .errorMessage {
          border: 1px solid #efcbc6;
          background: #fff5f3;
          color: #b53d34;
        }

        .errorMessage .messageIcon {
          background: #c64b40;
        }

        /* ================= BUTTON ================= */

        .continueButton {
          width: 100%;
          height: 57px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          margin-top: 21px;

          border: 0;
          border-radius: 12px;

          background: #08783f;
          color: #ffffff;

          cursor: pointer;

          font-size: 14px;
          font-weight: 900;

          box-shadow:
            0 8px 20px rgba(8, 120, 63, 0.2);

          transition:
            transform 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .continueButton:hover:not(:disabled) {
          background: #076e39;
          transform: translateY(-1px);

          box-shadow:
            0 11px 25px rgba(8, 120, 63, 0.24);
        }

        .continueButton:active:not(:disabled) {
          transform: translateY(0);
        }

        .continueButton:disabled {
          opacity: 0.75;
          cursor: wait;
        }

        .buttonArrow {
          font-size: 20px;
          line-height: 1;
        }

        .buttonSpinner {
          width: 17px;
          height: 17px;

          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;

          border-radius: 50%;

          animation: spin 0.7s linear infinite;
        }

        .bookingSecurity {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          margin-top: 12px;

          color: #89968f;

          font-size: 10px;
        }

        /* ================= FOOTER ================= */

        .footer {
          background: #26372f;
          color: rgba(255, 255, 255, 0.7);
        }

        .footerInner {
          width: min(1180px, calc(100% - 40px));
          min-height: 68px;

          margin: 0 auto;

          display: flex;
          align-items: center;
          justify-content: space-between;

          font-size: 10px;
        }

        .footerBrand strong {
          color: #ffffff;
          letter-spacing: 0.7px;
        }

        /* ================= ANIMATION ================= */

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ================= TABLET ================= */

        @media (max-width: 900px) {
          .heroContent {
            grid-template-columns: 1fr;
          }

          .heroVisual {
            display: none;
          }

          .locationArea {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .journeyConnector {
            display: none;
          }

          .locationColumn + .locationColumn {
            margin-top: 0;
          }
        }

        /* ================= MOBILE ================= */

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

          .phoneCircle {
            width: 27px;
            height: 27px;
          }

          .phoneText {
            font-size: 10px;
          }

          .heroInner {
            width: calc(100% - 28px);
            padding: 28px 0 54px;
          }

          .serviceBadge {
            padding: 7px 11px;
            font-size: 9px;
          }

          .heroContent {
            margin-top: 19px;
          }

          .eyebrow {
            margin-bottom: 10px;
            font-size: 8px;
            letter-spacing: 1.2px;
          }

          .heroCopy h1 {
            font-size: 50px;
            letter-spacing: -2.8px;
          }

          .heroCopy p {
            margin-top: 16px;
            font-size: 13px;
          }

          .desktopOnly {
            display: none;
          }

          .heroBenefits {
            gap: 11px 16px;
            margin-top: 21px;
          }

          .benefit {
            font-size: 9px;
          }

          .benefitIcon {
            width: 22px;
            height: 22px;
            font-size: 10px;
          }

          .heroShapeOne {
            width: 350px;
            height: 120px;
            right: -140px;
            bottom: -80px;
          }

          .bookingSection {
            width: calc(100% - 18px);
            margin-top: -22px;
            padding-bottom: 30px;
          }

          .bookingCard {
            padding: 20px 15px 18px;
            border-radius: 20px;
          }

          .bookingHeader {
            margin-bottom: 17px;
          }

          .bookingEyebrow {
            font-size: 8px;
          }

          .bookingHeader h2 {
            font-size: 20px;
          }

          .bookingHeader p {
            max-width: 250px;
            font-size: 10px;
          }

          .secureBadge {
            display: none;
          }

          .tripSelector {
            margin-bottom: 22px;
          }

          .tripOption {
            min-height: 54px;
            gap: 7px;
          }

          .tripOptionIcon {
            font-size: 18px;
          }

          .tripOptionText strong {
            font-size: 11px;
          }

          .tripOptionText small {
            font-size: 8px;
          }

          .selectedCheck {
            right: 8px;
            width: 17px;
            height: 17px;
            font-size: 9px;
          }

          .sectionHeading {
            margin-bottom: 13px;
          }

          .sectionHeading strong {
            font-size: 12px;
          }

          .sectionHeading div > span {
            font-size: 8px;
          }

          .stepCircle {
            width: 25px;
            height: 25px;
            flex-basis: 25px;
          }

          .locationTag {
            font-size: 8px;
          }

          .dateTimeGrid,
          .contactGrid {
            grid-template-columns: 1fr;
            gap: 14px;
            margin-top: 15px;
          }

          .formField label {
            font-size: 10px;
          }

          .inputShell input {
            height: 52px;
            font-size: 13px;
          }

          .returnBox {
            padding: 14px;
          }

          .returnBox .dateTimeGrid {
            margin-top: 13px;
          }

          .passengerHeading {
            margin-top: 25px;
          }

          .message {
            font-size: 10px;
          }

          .continueButton {
            height: 55px;
            font-size: 14px;
          }

          .footerInner {
            width: calc(100% - 28px);
            min-height: 62px;

            flex-direction: column;
            justify-content: center;

            gap: 4px;
          }
        }

        @media (max-width: 380px) {
          .phoneText {
            font-size: 9px;
          }

          .heroCopy h1 {
            font-size: 44px;
          }

          .bookingCard {
            padding: 17px 13px;
          }

          .tripOptionText small {
            display: none;
          }
        }
      `}</style>
    </main>
  );
              }
