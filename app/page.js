"use client";

import { useEffect, useState } from "react";
import LocationPicker from "./components/LocationPicker";

function Icon({ type, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M16 2v4M8 2v4M3 9h18" />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg {...common}>
        <path d="M6.5 3.5h3l1.5 4-2 1.5a14 14 0 0 0 6 6l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C10.5 19.5 4.5 13.5 4.5 6c0-1.1.9-2 2-2Z" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" />
      </svg>
    );
  }

  if (type === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (type === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (type === "location") {
    return (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (type === "car") {
    return (
      <svg {...common}>
        <path d="M5 17h14l-1-6H6l-1 6Z" />
        <path d="m7 11 1.5-4h7L17 11" />
        <circle cx="8" cy="17" r="1.5" />
        <circle cx="16" cy="17" r="1.5" />
      </svg>
    );
  }

  return null;
}

export default function HomePage() {
  const [today] = useState(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [whatsappEdited, setWhatsappEdited] = useState(false);

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

    if (returnDate && value && returnDate < value) {
      setReturnDate("");
    }

    clearMessage();
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

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleContinue = () => {
    clearMessage();

    if (!pickup?.name?.trim()) {
      showError("Please select your pickup location.");
      return;
    }

    if (!drop?.name?.trim()) {
      showError("Please select your destination.");
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
      "Your trip details are ready. Next, we'll help you choose your cab."
    );

    setMessageType("success");
  };

  const usePhoneForWhatsapp = () => {
    setWhatsappEdited(false);
    setWhatsapp(phone);
  };

  return (
    <main className="page">
      {/* HEADER */}

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

          <a href="tel:+919123456789" className="headerPhone">
            <span className="phoneCircle">
              <Icon type="phone" size={14} />
            </span>

            <span className="phoneText">+91 91234 56789</span>
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <div className="heroInner">
          <div className="serviceBadge">
            <span className="onlineDot" />
            <span>
              Serving within <strong>200 km</strong> from Kanpur
            </span>
          </div>

          <div className="heroContent">
            <div className="heroText">
              <h1>
                Your ride.
                <br />
                <span>Your way.</span>
              </h1>

              <p>
                Reliable rides for every journey.
                <br className="desktopBreak" />
                Simple booking. Safe travel.
              </p>

              <div className="heroFeatures">
                <div className="heroFeature">
                  <span className="featureCircle">
                    <Icon type="check" size={13} />
                  </span>
                  Verified drivers
                </div>

                <div className="heroFeature">
                  <span className="featureCircle">
                    <Icon type="shield" size={13} />
                  </span>
                  Safe & secure
                </div>

                <div className="heroFeature">
                  <span className="featureCircle">
                    <Icon type="car" size={14} />
                  </span>
                  EV rides
                </div>
              </div>
            </div>

            <div className="heroVisual">
              <div className="vehicleShadow" />
              <div className="vehicleEmoji">🚙</div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING */}

      <section className="bookingSection">
        <div className="bookingCard">

          {/* BOOKING HEADER */}

          <div className="bookingTop">
            <div>
              <div className="eyebrow">BOOK A RIDE</div>

              <h2>Plan your journey</h2>

              <p>
                Enter your trip details and passenger information.
              </p>
            </div>

            <div className="secureBadge">
              <Icon type="shield" size={14} />
              Secure
            </div>
          </div>

          {/* PROGRESS */}

          <div className="progress">
            <div className="progressItem active">
              <span className="progressNumber">1</span>

              <div>
                <strong>Journey</strong>
                <small>Where & when</small>
              </div>
            </div>

            <div className="progressLine" />

            <div className="progressItem">
              <span className="progressNumber">2</span>

              <div>
                <strong>Passenger</strong>
                <small>Your details</small>
              </div>
            </div>
          </div>

          {/* TRIP TYPE */}

          <div className="tripTypeLabel">
            <span>What type of trip?</span>
          </div>

          <div className="tripToggle">
            <button
              type="button"
              className={
                tripType === "oneway"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() => handleTripTypeChange("oneway")}
            >
              <span className="tripIcon">→</span>

              <span className="tripText">
                <strong>One Way</strong>
                <small>Single journey</small>
              </span>

              {tripType === "oneway" && (
                <span className="selectedCheck">
                  <Icon type="check" size={12} />
                </span>
              )}
            </button>

            <button
              type="button"
              className={
                tripType === "roundtrip"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() => handleTripTypeChange("roundtrip")}
            >
              <span className="tripIcon">⇄</span>

              <span className="tripText">
                <strong>Round Trip</strong>
                <small>Return journey</small>
              </span>

              {tripType === "roundtrip" && (
                <span className="selectedCheck">
                  <Icon type="check" size={12} />
                </span>
              )}
            </button>
          </div>

          {/* JOURNEY */}

          <div className="sectionHeader">
            <div className="sectionNumber">1</div>

            <div>
              <h3>Journey details</h3>
              <p>Where should we pick you up?</p>
            </div>
          </div>

          <div className="locationGrid">
            <div className="locationCard">
              <div className="locationCardTop">
                <span className="locationDot pickupDot" />
                <span>Pickup</span>
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

            <div className="locationCard">
              <div className="locationCardTop">
                <span className="locationDot dropDot" />
                <span>Destination</span>
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

          {/* DATE / TIME */}

          <div className="fieldSection">
            <div className="formGrid">
              <div className="field">
                <label htmlFor="travelDate">
                  <span className="labelIcon">
                    <Icon type="calendar" size={15} />
                  </span>
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

              <div className="field">
                <label htmlFor="pickupTime">
                  <span className="labelIcon">
                    <Icon type="clock" size={15} />
                  </span>
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
          </div>

          {/* ROUND TRIP */}

          {tripType === "roundtrip" && (
            <div className="roundTripBox">
              <div className="roundTripHeader">
                <div className="returnIcon">⇄</div>

                <div>
                  <strong>Return journey</strong>
                  <span>When will you return?</span>
                </div>
              </div>

              <div className="formGrid">
                <div className="field">
                  <label htmlFor="returnDate">
                    <span className="labelIcon">
                      <Icon type="calendar" size={15} />
                    </span>
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

                <div className="field">
                  <label htmlFor="returnTime">
                    <span className="labelIcon">
                      <Icon type="clock" size={15} />
                    </span>
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

          {/* PASSENGER */}

          <div className="sectionHeader passengerHeader">
            <div className="sectionNumber">2</div>

            <div>
              <h3>Passenger details</h3>
              <p>Who are we booking this ride for?</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="passengerName">
              <span className="labelIcon">
                <Icon type="user" size={15} />
              </span>
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

          <div className="formGrid passengerGrid">
            <div className="field">
              <label htmlFor="phone">
                <span className="labelIcon">
                  <Icon type="phone" size={15} />
                </span>
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

            <div className="field">
              <label htmlFor="whatsapp">
                <span className="labelIcon">
                  <span className="whatsappSymbol">●</span>
                </span>
                WhatsApp number
              </label>

              <div className="inputShell whatsappShell">
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
                  }}
                />
              </div>

              {phone && (
                <button
                  type="button"
                  className="samePhoneButton"
                  onClick={usePhoneForWhatsapp}
                >
                  <span className="tinyCheck">
                    <Icon type="check" size={10} />
                  </span>

                  Same as phone number
                </button>
              )}
            </div>
          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={
                messageType === "success"
                  ? "message successMessage"
                  : "message errorMessage"
              }
            >
              <span className="messageIcon">
                {messageType === "success" ? (
                  <Icon type="check" size={14} />
                ) : (
                  "!"
                )}
              </span>

              <span>{message}</span>
            </div>
          )}

          {/* CONTINUE */}

          <button
            type="button"
            className="continueButton"
            onClick={handleContinue}
          >
            <span>Continue to cab selection</span>

            <span className="continueArrow">
              <Icon type="arrow" size={21} />
            </span>
          </button>

          <div className="bookingFooter">
            <span className="footerShield">
              <Icon type="shield" size={13} />
            </span>

            <span>Your information is safe and secure</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}

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
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f4f8f5;
          color: #26372f;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        /* ================= HEADER ================= */

        .header {
          position: relative;
          z-index: 20;
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
          gap: 10px;
        }

        .brandMark {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;
          background: #08783f;

          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          box-shadow:
            0 7px 16px rgba(8, 120, 63, 0.18);
        }

        .brandName {
          color: #08783f;
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .brandTagline {
          margin-top: 4px;
          color: #89958f;
          font-size: 9px;
          letter-spacing: 0.2px;
        }

        .headerPhone {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #52625a;
          text-decoration: none;

          font-size: 12px;
          font-weight: 750;
        }

        .phoneCircle {
          width: 27px;
          height: 27px;

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
              #f1faf4 60%,
              #e7f5ec 100%
            );
        }

        .heroInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;

          padding: 42px 0 78px;

          position: relative;
          z-index: 2;
        }

        .heroGlow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .heroGlowOne {
          width: 500px;
          height: 190px;

          right: -120px;
          bottom: -110px;

          background: rgba(38, 55, 47, 0.08);
          transform: rotate(-10deg);
        }

        .heroGlowTwo {
          width: 280px;
          height: 280px;

          right: 12%;
          top: -170px;

          background: rgba(8, 120, 63, 0.045);
        }

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 14px;

          border: 1px solid #d8e7dc;
          border-radius: 30px;

          background: rgba(255, 255, 255, 0.9);

          color: #63736b;
          font-size: 11px;

          box-shadow:
            0 5px 18px rgba(0, 0, 0, 0.035);
        }

        .serviceBadge strong {
          color: #26372f;
        }

        .onlineDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #08783f;
          box-shadow:
            0 0 0 4px rgba(8, 120, 63, 0.08);
        }

        .heroContent {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: center;
          gap: 30px;

          margin-top: 20px;
        }

        .heroText h1 {
          margin: 0;

          color: #26372f;

          font-size: clamp(48px, 7vw, 78px);
          line-height: 0.96;

          letter-spacing: -4px;
          font-weight: 900;
        }

        .heroText h1 span {
          color: #08783f;
        }

        .heroText p {
          margin: 20px 0 0;

          color: #65766d;

          font-size: 16px;
          line-height: 1.55;
        }

        .heroFeatures {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;

          margin-top: 25px;
        }

        .heroFeature {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #3c4e45;
          font-size: 11px;
          font-weight: 750;
        }

        .featureCircle {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          background: #e0f2e6;
          color: #08783f;
        }

        .heroVisual {
          min-height: 190px;

          display: flex;
          align-items: center;
          justify-content: center;

          position: relative;
        }

        .vehicleShadow {
          position: absolute;

          width: 280px;
          height: 85px;

          border-radius: 50%;
          background: rgba(8, 120, 63, 0.09);

          transform: rotate(-7deg);
        }

        .vehicleEmoji {
          position: relative;

          font-size: 105px;
          line-height: 1;

          filter:
            drop-shadow(
              0 14px 15px rgba(0, 0, 0, 0.08)
            );
        }

        /* ================= BOOKING ================= */

        .bookingSection {
          width: min(1180px, calc(100% - 40px));
          margin: -30px auto 0;

          position: relative;
          z-index: 10;

          padding-bottom: 55px;
        }

        .bookingCard {
          padding: 30px;

          border: 1px solid rgba(218, 231, 222, 0.8);
          border-radius: 24px;

          background: #ffffff;

          box-shadow:
            0 24px 65px rgba(25, 55, 39, 0.105);
        }

        .bookingTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;

          margin-bottom: 22px;
        }

        .eyebrow {
          margin-bottom: 5px;

          color: #08783f;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .bookingTop h2 {
          margin: 0;

          color: #26372f;
          font-size: 25px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .bookingTop p {
          margin: 6px 0 0;

          color: #7c8983;
          font-size: 12px;
        }

        .secureBadge {
          display: flex;
          align-items: center;
          gap: 6px;

          padding: 7px 11px;

          border-radius: 20px;
          background: #f0f8f3;

          color: #527061;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* ================= PROGRESS ================= */

        .progress {
          display: flex;
          align-items: center;

          width: min(550px, 100%);

          margin-bottom: 25px;
          padding: 12px 15px;

          border: 1px solid #e3ebe5;
          border-radius: 14px;

          background: #f8fbf9;
        }

        .progressItem {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #8a9690;
        }

        .progressItem.active {
          color: #26372f;
        }

        .progressNumber {
          width: 26px;
          height: 26px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e4ebe6;

          color: #697870;
          font-size: 10px;
          font-weight: 900;
        }

        .progressItem.active .progressNumber {
          background: #08783f;
          color: #ffffff;
        }

        .progressItem strong {
          display: block;

          font-size: 11px;
          font-weight: 850;
        }

        .progressItem small {
          display: block;

          margin-top: 1px;

          font-size: 9px;
          color: #8b9690;
        }

        .progressLine {
          width: 45px;
          height: 1px;

          margin: 0 14px;

          background: #dce5df;
        }

        /* ================= TRIP TYPE ================= */

        .tripTypeLabel {
          margin-bottom: 9px;

          color: #52635a;
          font-size: 11px;
          font-weight: 800;
        }

        .tripToggle {
          width: min(650px, 100%);

          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 6px;

          padding: 5px;

          border-radius: 15px;
          background: #eef3ef;

          margin-bottom: 28px;
        }

        .tripButton {
          min-height: 62px;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border: 0;
          border-radius: 11px;

          background: transparent;
          color: #63726a;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.15s ease;
        }

        .tripButton:hover {
          transform: translateY(-1px);
        }

        .tripButton.active {
          background: #08783f;
          color: #ffffff;

          box-shadow:
            0 7px 17px rgba(8, 120, 63, 0.2);
        }

        .tripIcon {
          font-size: 21px;
          font-weight: 800;
        }

        .tripText {
          text-align: left;
        }

        .tripText strong {
          display: block;

          font-size: 12px;
          font-weight: 850;
        }

        .tripText small {
          display: block;

          margin-top: 3px;

          font-size: 9px;
          opacity: 0.72;
        }

        .selectedCheck {
          width: 19px;
          height: 19px;

          position: absolute;
          top: 7px;
          right: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }

        /* ================= SECTION ================= */

        .sectionHeader {
          display: flex;
          align-items: center;
          gap: 10px;

          margin: 0 0 17px;
        }

        .sectionNumber {
          width: 29px;
          height: 29px;

          flex: 0 0 29px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e4f3e8;
          color: #08783f;

          font-size: 11px;
          font-weight: 900;
        }

        .sectionHeader h3 {
          margin: 0;

          color: #34473e;
          font-size: 14px;
          font-weight: 900;
        }

        .sectionHeader p {
          margin: 2px 0 0;

          color: #89958f;
          font-size: 10px;
        }

        /* ================= LOCATIONS ================= */

        .locationGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .locationCard {
          min-width: 0;

          padding: 15px;

          border: 1px solid #e1e9e4;
          border-radius: 16px;

          background: #fbfdfc;
        }

        .locationCardTop {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 12px;

          color: #42544b;
          font-size: 11px;
          font-weight: 850;
        }

        .locationDot {
          width: 9px;
          height: 9px;

          border-radius: 50%;
        }

        .pickupDot {
          background: #08783f;
          box-shadow:
            0 0 0 4px rgba(8, 120, 63, 0.1);
        }

        .dropDot {
          background: #26372f;
          box-shadow:
            0 0 0 4px rgba(38, 55, 47, 0.08);
        }

        /* ================= FORM ================= */

        .fieldSection {
          margin-top: 20px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
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
          font-size: 11px;
          font-weight: 800;
        }

        .labelIcon {
          display: flex;
          align-items: center;
          color: #08783f;
        }

        .inputShell {
          width: 100%;
        }

        .field input {
          width: 100%;
          height: 52px;

          padding: 0 15px;

          border: 1px solid #d8e1db;
          border-radius: 11px;

          background: #ffffff;
          color: #26372f;

          font-family: inherit;
          font-size: 13px;

          outline: none;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .field input:hover {
          border-color: #c7d6cc;
        }

        .field input:focus {
          border-color: #08783f;
          background: #ffffff;

          box-shadow:
            0 0 0 3px rgba(8, 120, 63, 0.08);
        }

        .field input::placeholder {
          color: #a0aaa5;
        }

        .passengerHeader {
          margin-top: 31px;
          margin-bottom: 17px;
        }

        .passengerGrid {
          margin-top: 17px;
        }

        .whatsappSymbol {
          width: 10px;
          height: 10px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          border: 2px solid #08783f;
          border-radius: 50%;

          font-size: 0;
        }

        .samePhoneButton {
          display: flex;
          align-items: center;
          gap: 6px;

          margin-top: 6px;

          border: 0;
          padding: 0;

          background: transparent;
          color: #718078;

          font-family: inherit;
          font-size: 9px;
          font-weight: 700;

          cursor: pointer;
        }

        .samePhoneButton:hover {
          color: #08783f;
        }

        .tinyCheck {
          width: 16px;
          height: 16px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e4f3e8;
          color: #08783f;
        }

        /* ================= ROUND TRIP ================= */

        .roundTripBox {
          margin-top: 20px;
          padding: 17px;

          border: 1px solid #dcebe1;
          border-radius: 15px;

          background: #f7fbf8;
        }

        .roundTripHeader {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-bottom: 15px;
        }

        .returnIcon {
          width: 29px;
          height: 29px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #e1f2e6;
          color: #08783f;

          font-size: 17px;
          font-weight: 800;
        }

        .roundTripHeader strong {
          display: block;

          color: #34483e;
          font-size: 11px;
          font-weight: 850;
        }

        .roundTripHeader span {
          display: block;

          margin-top: 2px;

          color: #8a9690;
          font-size: 9px;
        }

        /* ================= MESSAGE ================= */

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
          width: 21px;
          height: 21px;

          flex: 0 0 21px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          font-size: 12px;
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

        /* ================= CONTINUE ================= */

        .continueButton {
          width: 100%;
          min-height: 57px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          margin-top: 20px;

          border: 0;
          border-radius: 13px;

          background: #08783f;
          color: #ffffff;

          font-family: inherit;
          font-size: 14px;
          font-weight: 900;

          cursor: pointer;

          box-shadow:
            0 9px 22px rgba(8, 120, 63, 0.2);

          transition:
            transform 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .continueButton:hover {
          background: #076d39;
          transform: translateY(-1px);

          box-shadow:
            0 12px 26px rgba(8, 120, 63, 0.24);
        }

        .continueButton:active {
          transform: translateY(0);
        }

        .continueArrow {
          display: flex;
          align-items: center;
        }

        .bookingFooter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          margin-top: 11px;

          color: #8b9791;
          font-size: 9px;
        }

        .footerShield {
          display: flex;
          align-items: center;
          color: #08783f;
        }

        /* ================= FOOTER ================= */

        .footer {
          background: #26372f;
          color: rgba(255, 255, 255, 0.72);
        }

        .footerInner {
          width: min(1180px, calc(100% - 40px));
          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          margin: 0 auto;

          font-size: 10px;
        }

        .footerInner strong {
          color: #ffffff;
          letter-spacing: 0.6px;
        }

        /* ================= TABLET ================= */

        @media (max-width: 900px) {
          .heroContent {
            grid-template-columns: 1fr;
          }

          .heroVisual {
            display: none;
          }

          .locationGrid {
            grid-template-columns: 1fr;
          }

          .bookingCard {
            padding: 25px;
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

          .headerPhone {
            font-size: 10px;
          }

          .phoneCircle {
            width: 25px;
            height: 25px;
          }

          .heroInner {
            width: calc(100% - 28px);
            padding: 28px 0 55px;
          }

          .serviceBadge {
            font-size: 9px;
            padding: 7px 11px;
          }

          .heroText h1 {
            font-size: 49px;
            letter-spacing: -2.8px;
          }

          .heroText p {
            margin-top: 16px;
            font-size: 13px;
          }

          .desktopBreak {
            display: none;
          }

          .heroFeatures {
            gap: 11px 16px;
            margin-top: 20px;
          }

          .heroFeature {
            font-size: 9px;
          }

          .featureCircle {
            width: 22px;
            height: 22px;
          }

          .bookingSection {
            width: calc(100% - 20px);
            margin-top: -22px;
            padding-bottom: 28px;
          }

          .bookingCard {
            padding: 18px 15px 17px;
            border-radius: 20px;
          }

          .bookingTop {
            margin-bottom: 18px;
          }

          .eyebrow {
            font-size: 8px;
          }

          .bookingTop h2 {
            font-size: 20px;
          }

          .bookingTop p {
            font-size: 10px;
          }

          .secureBadge {
            display: none;
          }

          .progress {
            padding: 10px 11px;
            margin-bottom: 20px;
          }

          .progressLine {
            width: 25px;
            margin: 0 9px;
          }

          .progressItem strong {
            font-size: 10px;
          }

          .progressItem small {
            font-size: 8px;
          }

          .progressNumber {
            width: 24px;
            height: 24px;
          }

          .tripToggle {
            margin-bottom: 22px;
          }

          .tripButton {
            min-height: 54px;
            gap: 7px;
          }

          .tripIcon {
            font-size: 18px;
          }

          .tripText strong {
            font-size: 11px;
          }

          .tripText small {
            font-size: 8px;
          }

          .selectedCheck {
            width: 17px;
            height: 17px;
          }

          .sectionHeader {
            margin-bottom: 13px;
          }

          .sectionHeader h3 {
            font-size: 13px;
          }

          .sectionHeader p {
            font-size: 9px;
          }

          .locationGrid {
            gap: 14px;
          }

          .locationCard {
            padding: 13px;
            border-radius: 14px;
          }

          .locationCardTop {
            margin-bottom: 10px;
          }

          .formGrid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .fieldSection {
            margin-top: 17px;
          }

          .field input {
            height: 51px;
            font-size: 13px;
          }

          .passengerHeader {
            margin-top: 25px;
          }

          .passengerGrid {
            margin-top: 15px;
          }

          .roundTripBox {
            padding: 14px;
          }

          .message {
            font-size: 10px;
          }

          .continueButton {
            min-height: 55px;
            font-size: 13px;
          }

          .bookingFooter {
            font-size: 8px;
          }

          .footerInner {
            width: calc(100% - 28px);
            min-height: 61px;

            flex-direction: column;
            justify-content: center;

            gap: 4px;
          }
        }

        @media (max-width: 380px) {
          .headerPhone .phoneText {
            display: none;
          }

          .heroText h1 {
            font-size: 43px;
          }

          .bookingCard {
            padding: 16px 13px;
          }

          .tripButton {
            gap: 5px;
          }

          .tripText small {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
