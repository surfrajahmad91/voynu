"use client";

import { useEffect, useMemo, useState } from "react";
import LocationPicker from "./components/LocationPicker";

const MAX_JOURNEY_DISTANCE_KM = 200;

export default function HomePage() {
  /* ============================================================
     DATE
  ============================================================ */

  const today = useMemo(() => {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }, []);

  /* ============================================================
     TRIP
  ============================================================ */

  const [tripType, setTripType] = useState("oneway");

  /* ============================================================
     LOCATIONS
  ============================================================ */

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

  /* ============================================================
     ROAD DISTANCE
     ONLY PICKUP → DROP
  ============================================================ */

  const [journeyDistanceKm, setJourneyDistanceKm] = useState(null);
  const [journeyDistanceText, setJourneyDistanceText] = useState("");
  const [journeyDurationText, setJourneyDurationText] = useState("");
  const [journeyDistanceLoading, setJourneyDistanceLoading] =
    useState(false);
  const [journeyDistanceError, setJourneyDistanceError] = useState("");

  /* ============================================================
     JOURNEY DETAILS
  ============================================================ */

  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  /* ============================================================
     PASSENGER
  ============================================================ */

  const [passengerName, setPassengerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);

  /* ============================================================
     UI
  ============================================================ */

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ============================================================
     HELPERS
  ============================================================ */

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const showError = (text) => {
    setMessage(text);
    setMessageType("error");
  };

  const showSuccess = (text) => {
    setMessage(text);
    setMessageType("success");
  };

  /* ============================================================
     WHATSAPP SYNC
  ============================================================ */

  useEffect(() => {
    if (whatsappSameAsPhone) {
      setWhatsapp(phone);
    }
  }, [phone, whatsappSameAsPhone]);

  /* ============================================================
     PHONE
  ============================================================ */

  const normalizeIndianPhone = (value) => {
    const cleaned = String(value || "").replace(/\D/g, "");

    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return cleaned;
    }

    if (
      cleaned.length === 12 &&
      cleaned.startsWith("91") &&
      /^[6-9]\d{9}$/.test(cleaned.slice(2))
    ) {
      return cleaned.slice(2);
    }

    return null;
  };

  /* ============================================================
     TIME
  ============================================================ */

  const isTimeInPastForToday = (date, time) => {
    if (!date || !time || date !== today) {
      return false;
    }

    const [hours, minutes] = time.split(":").map(Number);

    const selected = new Date();
    selected.setHours(hours, minutes, 0, 0);

    return selected < new Date();
  };

  /* ============================================================
     GOOGLE ROAD DISTANCE
     
     IMPORTANT:
     This ONLY calculates:
     
     PICKUP → DROP
     
     There is NO service-area calculation.
     There is NO pickup → Kanpur calculation.
  ============================================================ */

  const calculateRoadDistance = (from, to) => {
    return new Promise((resolve, reject) => {
      if (
        from?.lat == null ||
        from?.lon == null ||
        to?.lat == null ||
        to?.lon == null
      ) {
        reject(new Error("Both locations are required."));
        return;
      }

      if (
        typeof window === "undefined" ||
        !window.google?.maps?.DirectionsService
      ) {
        reject(new Error("Google Maps is not ready."));
        return;
      }

      const service = new window.google.maps.DirectionsService();

      service.route(
        {
          origin: {
            lat: Number(from.lat),
            lng: Number(from.lon),
          },

          destination: {
            lat: Number(to.lat),
            lng: Number(to.lon),
          },

          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        },

        (result, status) => {
          if (
            status !==
            window.google.maps.DirectionsStatus.OK
          ) {
            reject(
              new Error(
                `Google Maps route calculation failed: ${status}`
              )
            );
            return;
          }

          const leg = result?.routes?.[0]?.legs?.[0];

          if (
            !leg ||
            typeof leg.distance?.value !== "number"
          ) {
            reject(
              new Error("No road distance was returned.")
            );
            return;
          }

          const distanceKm = leg.distance.value / 1000;

          resolve({
            distanceKm,
            distanceText:
              leg.distance.text ||
              `${distanceKm.toFixed(1)} km`,
            durationText: leg.duration?.text || "",
          });
        }
      );
    });
  };

  /* ============================================================
     AUTOMATIC DISTANCE CALCULATION
  ============================================================ */

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const locationsReady =
      pickup.lat != null &&
      pickup.lon != null &&
      drop.lat != null &&
      drop.lon != null;

    if (!locationsReady) {
      setJourneyDistanceKm(null);
      setJourneyDistanceText("");
      setJourneyDurationText("");
      setJourneyDistanceError("");
      setJourneyDistanceLoading(false);

      return () => {
        cancelled = true;
        if (retryTimer) clearTimeout(retryTimer);
      };
    }

    setJourneyDistanceKm(null);
    setJourneyDistanceText("");
    setJourneyDurationText("");
    setJourneyDistanceError("");
    setJourneyDistanceLoading(true);

    let attempts = 0;
    const maxAttempts = 40;

    const calculate = async () => {
      if (cancelled) return;

      attempts += 1;

      const googleReady =
        typeof window !== "undefined" &&
        window.google?.maps?.DirectionsService;

      if (!googleReady) {
        if (attempts < maxAttempts) {
          retryTimer = setTimeout(calculate, 250);
          return;
        }

        if (!cancelled) {
          setJourneyDistanceLoading(false);
          setJourneyDistanceError(
            "Google Maps road distance service is unavailable."
          );
        }

        return;
      }

      try {
        const result = await calculateRoadDistance(
          pickup,
          drop
        );

        if (cancelled) return;

        setJourneyDistanceKm(result.distanceKm);
        setJourneyDistanceText(result.distanceText);
        setJourneyDurationText(result.durationText);
        setJourneyDistanceError("");
        setJourneyDistanceLoading(false);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "VOYNU road distance error:",
          error
        );

        if (attempts < maxAttempts) {
          retryTimer = setTimeout(calculate, 500);
          return;
        }

        setJourneyDistanceKm(null);
        setJourneyDistanceText("");
        setJourneyDurationText("");
        setJourneyDistanceError(
          "Unable to calculate road distance."
        );
        setJourneyDistanceLoading(false);
      }
    };

    calculate();

    return () => {
      cancelled = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [
    pickup.lat,
    pickup.lon,
    drop.lat,
    drop.lon,
  ]);

  /* ============================================================
     TOTAL DISTANCE
  ============================================================ */

  const totalJourneyDistanceKm =
    journeyDistanceKm != null
      ? tripType === "roundtrip"
        ? journeyDistanceKm * 2
        : journeyDistanceKm
      : null;

  /* ============================================================
     TRIP TYPE
  ============================================================ */

  const handleTripTypeChange = (type) => {
    clearMessage();
    setTripType(type);

    if (type === "oneway") {
      setReturnDate("");
      setReturnTime("");
    }
  };

  /* ============================================================
     TRAVEL DATE
  ============================================================ */

  const handleTravelDateChange = (value) => {
    clearMessage();
    setTravelDate(value);

    if (
      returnDate &&
      value &&
      returnDate < value
    ) {
      setReturnDate("");
      setReturnTime("");
    }

    if (
      pickupTime &&
      value === today &&
      isTimeInPastForToday(value, pickupTime)
    ) {
      setPickupTime("");
    }
  };

  /* ============================================================
     PICKUP TIME
  ============================================================ */

  const handlePickupTimeChange = (value) => {
    clearMessage();

    if (
      travelDate === today &&
      isTimeInPastForToday(today, value)
    ) {
      showError("Pickup time cannot be in the past.");
      setPickupTime("");
      return;
    }

    setPickupTime(value);
  };

  /* ============================================================
     PHONE
  ============================================================ */

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/[^\d+]/g, "");

    setPhone(value);

    if (whatsappSameAsPhone) {
      setWhatsapp(value);
    }

    clearMessage();
  };

  const handleWhatsAppChange = (event) => {
    const value = event.target.value.replace(/[^\d+]/g, "");

    setWhatsapp(value);
    clearMessage();
  };

  const handleWhatsAppToggle = () => {
    clearMessage();

    const next = !whatsappSameAsPhone;

    setWhatsappSameAsPhone(next);

    if (next) {
      setWhatsapp(phone);
    }
  };

  /* ============================================================
     LOCATION SELECT
  ============================================================ */

  const handlePickupSelect = (location) => {
    clearMessage();

    setPickup({
      name: location?.name || "",
      lat: location?.lat ?? null,
      lon: location?.lon ?? null,
    });
  };

  const handleDropSelect = (location) => {
    clearMessage();

    setDrop({
      name: location?.name || "",
      lat: location?.lat ?? null,
      lon: location?.lon ?? null,
    });
  };

  /* ============================================================
     VALIDATION
  ============================================================ */

  const validateBooking = () => {
    if (!pickup.name.trim()) {
      return "Please select your pickup location.";
    }

    if (pickup.lat == null || pickup.lon == null) {
      return "Please select your pickup location from the suggested locations.";
    }

    if (!drop.name.trim()) {
      return "Please select your drop location.";
    }

    if (drop.lat == null || drop.lon == null) {
      return "Please select your drop location from the suggested locations.";
    }

    const sameLocation =
      Math.abs(Number(pickup.lat) - Number(drop.lat)) < 0.00001 &&
      Math.abs(Number(pickup.lon) - Number(drop.lon)) < 0.00001;

    if (sameLocation) {
      return "Pickup and drop locations cannot be the same.";
    }

    if (journeyDistanceKm == null) {
      return "Please wait while we calculate the road distance between your pickup and drop locations.";
    }

    if (!Number.isFinite(journeyDistanceKm)) {
      return "We couldn't calculate the journey distance. Please select your locations again.";
    }

    /* ----------------------------------------------------------
       JOURNEY DISTANCE
       
       This is NOT a service-area calculation.
       It is simply the maximum journey distance VOYNU accepts.
    ---------------------------------------------------------- */

    if (
      journeyDistanceKm >
      MAX_JOURNEY_DISTANCE_KM
    ) {
      return `Sorry, this journey is ${
        journeyDistanceText ||
        `${journeyDistanceKm.toFixed(1)} km`
      } one way. VOYNU currently accepts journeys up to 200 km per leg.`;
    }

    if (!travelDate) {
      return "Please select your travel date.";
    }

    if (travelDate < today) {
      return "Travel date cannot be in the past.";
    }

    if (!pickupTime) {
      return "Please select your pickup time.";
    }

    if (
      travelDate === today &&
      isTimeInPastForToday(
        travelDate,
        pickupTime
      )
    ) {
      return "Pickup time cannot be in the past.";
    }

    const name = passengerName.trim();

    if (!name) {
      return "Please enter the passenger name.";
    }

    if (name.length < 2) {
      return "Please enter a valid passenger name.";
    }

    if (!normalizeIndianPhone(phone)) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    if (!normalizeIndianPhone(whatsapp)) {
      return "Please enter a valid WhatsApp mobile number.";
    }

    if (tripType === "roundtrip") {
      if (!returnDate) {
        return "Please select the return date.";
      }

      if (returnDate < travelDate) {
        return "Return date cannot be before the travel date.";
      }

      if (!returnTime) {
        return "Please select the return time.";
      }

      if (
        returnDate === today &&
        isTimeInPastForToday(
          returnDate,
          returnTime
        )
      ) {
        return "Return time cannot be in the past.";
      }

      if (
        returnDate === travelDate &&
        returnTime < pickupTime
      ) {
        return "Return time cannot be before the pickup time.";
      }
    }

    return null;
  };

  /* ============================================================
     BOOKING DATA
  ============================================================ */

  const buildBookingData = () => {
    return {
      tripType,

      pickup: {
        name: pickup.name.trim(),
        lat: pickup.lat,
        lon: pickup.lon,
      },

      drop: {
        name: drop.name.trim(),
        lat: drop.lat,
        lon: drop.lon,
      },

      journey: {
        oneWayDistanceKm: journeyDistanceKm,
        oneWayDistanceText: journeyDistanceText,

        totalDistanceKm:
          totalJourneyDistanceKm,

        totalDistanceText:
          totalJourneyDistanceKm != null
            ? `${totalJourneyDistanceKm.toFixed(1)} km`
            : "",

        durationText: journeyDurationText,
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

      passengerName:
        passengerName.trim(),

      phone:
        normalizeIndianPhone(phone),

      whatsapp:
        normalizeIndianPhone(whatsapp),

      createdAt:
        new Date().toISOString(),
    };
  };

  /* ============================================================
     CONTINUE
  ============================================================ */

  const handleContinue = () => {
    if (isSubmitting) return;

    clearMessage();

    const error = validateBooking();

    if (error) {
      showError(error);
      return;
    }

    setIsSubmitting(true);

    const bookingData = buildBookingData();

    try {
      sessionStorage.setItem(
        "voynu_booking",
        JSON.stringify(bookingData)
      );

      sessionStorage.setItem(
        "voynu_booking_created_at",
        bookingData.createdAt
      );

      console.log(
        "VOYNU booking:",
        bookingData
      );

      showSuccess(
        "Your trip details are ready. Next, we'll help you choose your cab."
      );
    } catch (error) {
      console.error(
        "Unable to save booking:",
        error
      );

      showError(
        "We couldn't save your trip details. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     UI
  ============================================================ */

  return (
    <main className="page">

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
            <span>☎</span>
            +91 91234 56789
          </a>

        </div>
      </header>

      <section className="hero">

        <div className="heroDecor heroDecorOne" />
        <div className="heroDecor heroDecorTwo" />

        <div className="heroInner">

          <div className="serviceBadge">
            <span className="badgeDot" />
            <span>
              Journeys up to{" "}
              <strong>200 km</strong> per leg
            </span>
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
                  Verified Drivers
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">⌁</span>
                  Safe &amp; Secure
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">⚡</span>
                  EV Rides
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

      <section className="bookingSection">

        <div className="bookingCard">

          <div className="bookingHeader">

            <div>
              <h2>Book your ride</h2>
              <p>Tell us where you want to go.</p>
            </div>

            <div className="secureBadge">
              🔒 Secure booking
            </div>

          </div>

          {/* TRIP TYPE */}

          <div
            className="tripToggle"
            role="tablist"
          >

            <button
              type="button"
              role="tab"
              aria-selected={tripType === "oneway"}
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
              role="tab"
              aria-selected={tripType === "roundtrip"}
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
                <small>200 km each way</small>
              </span>
            </button>

          </div>

          {/* JOURNEY */}

          <div className="sectionLabel">

            <span className="sectionNumber">1</span>

            <span>Journey details</span>

          </div>

          <div className="locationGrid">

            <LocationPicker
              label="Pickup location"
              value={pickup.name}
              placeholder="Search pickup location"
              allowCurrentLocation
              onLocationSelect={handlePickupSelect}
            />

            <LocationPicker
              label="Drop location"
              value={drop.name}
              placeholder="Search destination"
              allowCurrentLocation={false}
              onLocationSelect={handleDropSelect}
            />

          </div>

          {/* DISTANCE */}

          <div className="journeyDistanceBox">

            <div className="journeyDistanceIcon">
              🚕
            </div>

            <div className="journeyDistanceContent">

              <div className="journeyDistanceLabel">
                JOURNEY DISTANCE
              </div>

              {pickup.lat == null ||
              pickup.lon == null ||
              drop.lat == null ||
              drop.lon == null ? (

                <div className="journeyDistanceMessage">
                  Select both locations to calculate road distance.
                </div>

              ) : journeyDistanceLoading ? (

                <div className="journeyDistanceMessage">
                  Calculating road distance...
                </div>

              ) : journeyDistanceKm != null ? (

                <>
                  <div className="journeyDistanceValue">

                    {tripType === "roundtrip"
                      ? `${journeyDistanceKm.toFixed(
                          1
                        )} km each way • ${totalJourneyDistanceKm.toFixed(
                          1
                        )} km total`
                      : journeyDistanceText}

                  </div>

                  {tripType === "roundtrip" && (
                    <div className="journeyDuration">
                      Maximum 200 km each way
                    </div>
                  )}

                  {journeyDurationText && (
                    <div className="journeyDuration">
                      Approx. driving time:{" "}
                      {journeyDurationText}
                      {tripType === "roundtrip"
                        ? " each way"
                        : ""}
                    </div>
                  )}
                </>

              ) : (

                <div className="journeyDistanceError">
                  {journeyDistanceError ||
                    "Unable to calculate road distance."}
                </div>

              )}

            </div>

          </div>

          {/* DATE */}

          <div className="formGrid">

            <div className="field">

              <label htmlFor="travelDate">
                <span className="labelIcon">▣</span>
                Travel date
              </label>

              <input
                id="travelDate"
                type="date"
                min={today}
                value={travelDate}
                onChange={(e) =>
                  handleTravelDateChange(
                    e.target.value
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
                onChange={(e) =>
                  handlePickupTimeChange(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* RETURN */}

          {tripType === "roundtrip" && (

            <div className="roundTripBox">

              <div className="roundTripTitle">
                ⇄ Return journey
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
                    min={travelDate || today}
                    value={returnDate}
                    onChange={(e) => {
                      const value = e.target.value;

                      clearMessage();

                      if (
                        travelDate &&
                        value &&
                        value < travelDate
                      ) {
                        showError(
                          "Return date cannot be before the travel date."
                        );

                        setReturnDate("");
                        setReturnTime("");

                        return;
                      }

                      setReturnDate(value);

                      if (
                        value === today &&
                        returnTime &&
                        isTimeInPastForToday(
                          value,
                          returnTime
                        )
                      ) {
                        setReturnTime("");
                      }
                    }}
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
                    onChange={(e) => {
                      const value = e.target.value;

                      clearMessage();

                      if (
                        returnDate === today &&
                        isTimeInPastForToday(
                          returnDate,
                          value
                        )
                      ) {
                        showError(
                          "Return time cannot be in the past."
                        );

                        setReturnTime("");
                        return;
                      }

                      if (
                        returnDate === travelDate &&
                        pickupTime &&
                        value < pickupTime
                      ) {
                        showError(
                          "Return time cannot be before the pickup time."
                        );

                        setReturnTime("");
                        return;
                      }

                      setReturnTime(value);
                    }}
                  />

                </div>

              </div>

            </div>

          )}

          {/* PASSENGER */}

          <div className="sectionLabel passengerSectionLabel">

            <span className="sectionNumber">2</span>

            <div>
              <span className="sectionTitle">
                Passenger details
              </span>

              <span className="sectionSubtitle">
                Who are we booking this ride for?
              </span>
            </div>

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
              onChange={(e) => {
                setPassengerName(e.target.value);
                clearMessage();
              }}
            />

          </div>

          {/* PHONE */}

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
                onChange={handlePhoneChange}
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
                disabled={whatsappSameAsPhone}
                onChange={handleWhatsAppChange}
              />

              <button
                type="button"
                className={
                  whatsappSameAsPhone
                    ? "samePhoneToggle active"
                    : "samePhoneToggle"
                }
                onClick={handleWhatsAppToggle}
                aria-pressed={whatsappSameAsPhone}
              >
                <span className="toggleCheck">
                  {whatsappSameAsPhone ? "✓" : ""}
                </span>

                Same as phone number
              </button>

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
              role="alert"
            >
              <span className="messageIcon">
                {messageType === "success" ? "✓" : "!"}
              </span>

              <span>{message}</span>
            </div>

          )}

          {/* CONTINUE */}

          <button
            type="button"
            className="continueButton"
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting
                ? "Preparing your trip..."
                : "Continue to cab selection"}
            </span>

            <span className="continueArrow">
              →
            </span>
          </button>

          <div className="bookingFooter">
            🛡️ Your information is safe and secure.
          </div>

        </div>
      </section>

      <footer className="footer">

        <div className="footerInner">

          <div>
            <strong>VOYNU</strong>{" "}
            © {new Date().getFullYear()}
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
          background: #f4faf6;
          color: #26372f;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        .header {
          background: #fff;
          border-bottom: 1px solid #e8eee9;
          position: relative;
          z-index: 20;
        }

        .headerInner,
        .heroInner,
        .footerInner {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .headerInner {
          min-height: 72px;
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
          color: #fff;
          font-size: 21px;
          font-weight: 900;
        }

        .brandName {
          color: #08783f;
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .8px;
        }

        .brandTagline {
          margin-top: 4px;
          color: #7a8981;
          font-size: 9px;
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

        .hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #fff 0%,
            #f1faf4 58%,
            #e8f6ed 100%
          );
        }

        .heroInner {
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
          background: rgba(8,120,63,.055);
        }

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: 1px solid #d8e7dc;
          border-radius: 30px;
          background: rgba(255,255,255,.9);
          color: #596a61;
          font-size: 12px;
        }

        .badgeDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #08783f;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          align-items: center;
          gap: 30px;
          margin-top: 20px;
        }

        .heroText h1 {
          margin: 0;
          color: #26372f;
          font-size: clamp(48px,7vw,78px);
          line-height: .97;
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
          background: rgba(8,120,63,.08);
          transform: rotate(-8deg);
        }

        .vehicle {
          position: relative;
          font-size: 105px;
          line-height: 1;
          filter: drop-shadow(0 14px 15px rgba(0,0,0,.08));
        }

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
          background: #fff;
          border: 1px solid rgba(219,231,223,.75);
          box-shadow: 0 20px 60px rgba(25,55,39,.1);
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
          font-size: 24px;
          font-weight: 850;
        }

        .bookingHeader p {
          margin: 5px 0 0;
          color: #7a8981;
          font-size: 13px;
        }

        .secureBadge {
          padding: 7px 11px;
          border-radius: 20px;
          background: #f1f8f3;
          color: #4f6759;
          font-size: 11px;
          font-weight: 700;
        }

        .tripToggle {
          width: min(620px,100%);
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
          font-family: inherit;
        }

        .tripButton strong,
        .tripButton small {
          display: block;
        }

        .tripButton strong {
          font-size: 13px;
        }

        .tripButton small {
          margin-top: 2px;
          font-size: 10px;
          opacity: .72;
        }

        .tripIcon {
          font-size: 20px;
        }

        .tripButton.active {
          background: #08783f;
          color: #fff;
          box-shadow: 0 5px 15px rgba(8,120,63,.2);
        }

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
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e5f4e9;
          color: #08783f;
          font-weight: 900;
        }

        .sectionTitle {
          display: block;
          font-size: 15px;
        }

        .sectionSubtitle {
          display: block;
          margin-top: 2px;
          color: #8a9790;
          font-size: 11px;
          font-weight: 500;
        }

        .locationGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .journeyDistanceBox {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 20px;
          padding: 15px 17px;
          border: 1px solid #dcebe1;
          border-radius: 14px;
          background: #f4fbf6;
        }

        .journeyDistanceIcon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #e4f4e8;
          font-size: 22px;
        }

        .journeyDistanceContent {
          min-width: 0;
        }

        .journeyDistanceLabel {
          color: #718078;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .8px;
        }

        .journeyDistanceMessage {
          margin-top: 3px;
          color: #66776e;
          font-size: 13px;
        }

        .journeyDistanceValue {
          margin-top: 2px;
          color: #08783f;
          font-size: 22px;
          font-weight: 900;
        }

        .journeyDuration {
          margin-top: 3px;
          color: #718078;
          font-size: 11px;
          font-weight: 600;
        }

        .journeyDistanceError {
          margin-top: 3px;
          color: #b34a42;
          font-size: 12px;
        }

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
        }

        .field input {
          width: 100%;
          height: 53px;
          padding: 0 15px;
          border: 1px solid #d9e2dc;
          border-radius: 11px;
          background: #fff;
          color: #26372f;
          font-family: inherit;
          font-size: 14px;
          outline: none;
        }

        .field input:focus {
          border-color: #08783f;
          box-shadow: 0 0 0 3px rgba(8,120,63,.09);
        }

        .field input:disabled {
          background: #f4f8f5;
          cursor: not-allowed;
        }

        .samePhoneToggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 2px 0;
          border: 0;
          background: transparent;
          color: #7b8982;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .samePhoneToggle.active {
          color: #08783f;
        }

        .toggleCheck {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #cbd9d0;
          border-radius: 50%;
        }

        .samePhoneToggle.active .toggleCheck {
          border-color: #08783f;
          background: #08783f;
          color: #fff;
        }

        .roundTripBox {
          margin-top: 20px;
          padding: 17px;
          border: 1px solid #dcebe1;
          border-radius: 14px;
          background: #f6fbf7;
        }

        .roundTripTitle {
          color: #08783f;
          font-size: 12px;
          font-weight: 850;
        }

        .passengerSectionLabel {
          margin-top: 29px;
        }

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
          font-weight: 900;
        }

        .successMessage {
          border: 1px solid #cce5d4;
          background: #eef9f1;
          color: #28734b;
        }

        .successMessage .messageIcon {
          background: #08783f;
          color: #fff;
        }

        .errorMessage {
          border: 1px solid #efccc8;
          background: #fff5f3;
          color: #b33d34;
        }

        .errorMessage .messageIcon {
          background: #c64a3f;
          color: #fff;
        }

        .continueButton {
          width: 100%;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
          border: 0;
          border-radius: 12px;
          background: #08783f;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 850;
          cursor: pointer;
        }

        .continueButton:hover:not(:disabled) {
          background: #076d39;
        }

        .continueButton:disabled {
          opacity: .7;
          cursor: wait;
        }

        .continueArrow {
          font-size: 21px;
        }

        .bookingFooter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          color: #89958e;
          font-size: 11px;
        }

        .footer {
          background: #26372f;
          color: #fff;
        }

        .footerInner {
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(255,255,255,.78);
          font-size: 11px;
        }

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
        }

        @media (max-width: 700px) {
          .headerInner,
          .heroInner,
          .footerInner {
            width: calc(100% - 28px);
          }

          .headerInner {
            min-height: 62px;
          }

          .brandMark {
            width: 34px;
            height: 34px;
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
            padding: 28px 0 56px;
          }

          .heroText h1 {
            font-size: 50px;
            letter-spacing: -2.8px;
          }

          .heroText p {
            font-size: 14px;
          }

          .desktopBreak {
            display: none;
          }

          .heroFeatures {
            gap: 12px 17px;
          }

          .heroFeature {
            font-size: 10px;
          }

          .bookingSection {
            width: calc(100% - 20px);
            margin-top: -23px;
            padding-bottom: 30px;
          }

          .bookingCard {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .secureBadge {
            display: none;
          }

          .formGrid {
            grid-template-columns: 1fr;
            gap: 15px;
            margin-top: 15px;
          }

          .journeyDistanceValue {
            font-size: 18px;
          }

          .footerInner {
            min-height: 62px;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
          }
        }

      `}</style>

    </main>
  );
}
