"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import LocationPicker from "./components/LocationPicker";

const MAX_JOURNEY_DISTANCE_KM = 200;

export default function HomePage() {
  /*
   * ------------------------------------------------------------
   * TODAY
   * ------------------------------------------------------------
   */

  const today = useMemo(() => {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }, []);

  /*
   * ------------------------------------------------------------
   * TRIP
   * ------------------------------------------------------------
   */

  const [tripType, setTripType] = useState("oneway");

  /*
   * ------------------------------------------------------------
   * LOCATIONS
   * ------------------------------------------------------------
   */

  const [pickup, setPickup] = useState({
    name: "",
    lat: null,
    lon: null,
    placeId: null,
  });

  const [drop, setDrop] = useState({
    name: "",
    lat: null,
    lon: null,
    placeId: null,
  });

  /*
   * ------------------------------------------------------------
   * ROAD DISTANCE
   * ------------------------------------------------------------
   */

  const [journeyDistanceKm, setJourneyDistanceKm] =
    useState(null);

  const [journeyDistanceText, setJourneyDistanceText] =
    useState("");

  const [journeyDurationText, setJourneyDurationText] =
    useState("");

  const [journeyDistanceLoading, setJourneyDistanceLoading] =
    useState(false);

  const [journeyDistanceError, setJourneyDistanceError] =
    useState("");

  /*
   * ------------------------------------------------------------
   * JOURNEY DETAILS
   * ------------------------------------------------------------
   */

  const [travelDate, setTravelDate] = useState("");

  const [pickupTime, setPickupTime] = useState("");

  const [returnDate, setReturnDate] = useState("");

  const [returnTime, setReturnTime] = useState("");

  /*
   * ------------------------------------------------------------
   * PASSENGER
   * ------------------------------------------------------------
   */

  const [passengerName, setPassengerName] = useState("");

  const [phone, setPhone] = useState("");

  const [whatsapp, setWhatsapp] = useState("");

  const [whatsappSameAsPhone, setWhatsappSameAsPhone] =
    useState(true);

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */

  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageType("");
  }, []);

  const showError = useCallback((text) => {
    setMessage(text);
    setMessageType("error");
  }, []);

  const showSuccess = useCallback((text) => {
    setMessage(text);
    setMessageType("success");
  }, []);

  /*
   * ------------------------------------------------------------
   * WHATSAPP SYNC
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (whatsappSameAsPhone) {
      setWhatsapp(phone);
    }
  }, [phone, whatsappSameAsPhone]);

  /*
   * ------------------------------------------------------------
   * PHONE
   * ------------------------------------------------------------
   */

  const normalizeIndianPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (
      digits.length === 10 &&
      /^[6-9]\d{9}$/.test(digits)
    ) {
      return digits;
    }

    if (
      digits.length === 12 &&
      digits.startsWith("91") &&
      /^[6-9]\d{9}$/.test(digits.slice(2))
    ) {
      return digits.slice(2);
    }

    return null;
  };

  /*
   * ------------------------------------------------------------
   * TIME
   * ------------------------------------------------------------
   */

  const isTimeInPastForToday = (date, time) => {
    if (!date || !time || date !== today) {
      return false;
    }

    const [hours, minutes] = time.split(":").map(Number);

    const selected = new Date();

    selected.setHours(
      hours,
      minutes,
      0,
      0
    );

    return selected < new Date();
  };

  /*
   * ------------------------------------------------------------
   * LOCATION VALIDATION
   *
   * IMPORTANT:
   *
   * A location is considered selected ONLY when:
   *
   * 1. It has a visible name
   * 2. It has valid latitude
   * 3. It has valid longitude
   *
   * This prevents Google/current-location coordinates from
   * triggering distance calculation while the field is still
   * visually empty.
   * ------------------------------------------------------------
   */

  const hasValidSelectedLocation = useCallback(
    (location) => {
      const hasName =
        typeof location?.name === "string" &&
        location.name.trim().length > 0;

      const hasLatitude = Number.isFinite(
        Number(location?.lat)
      );

      const hasLongitude = Number.isFinite(
        Number(location?.lon)
      );

      return (
        hasName &&
        hasLatitude &&
        hasLongitude
      );
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * GOOGLE ROAD DISTANCE
   *
   * ONLY:
   *
   * PICKUP → DROP
   *
   * No Pickup → Kanpur calculation.
   * ------------------------------------------------------------
   */

  const calculateRoadDistance = useCallback(
    (pickupLocation, dropLocation) => {
      return new Promise((resolve, reject) => {
        /*
         * Validate complete selected locations.
         */

        if (
          !hasValidSelectedLocation(
            pickupLocation
          ) ||
          !hasValidSelectedLocation(
            dropLocation
          )
        ) {
          reject(
            new Error(
              "Both locations must be selected."
            )
          );

          return;
        }

        /*
         * DirectionsService must already
         * be available.
         */

        if (
          typeof window === "undefined" ||
          !window.google?.maps
            ?.DirectionsService
        ) {
          reject(
            new Error(
              "Google Maps road-distance service is not ready."
            )
          );

          return;
        }

        const directionsService =
          new window.google.maps.DirectionsService();

        directionsService.route(
          {
            origin: {
              lat: Number(
                pickupLocation.lat
              ),
              lng: Number(
                pickupLocation.lon
              ),
            },

            destination: {
              lat: Number(
                dropLocation.lat
              ),
              lng: Number(
                dropLocation.lon
              ),
            },

            travelMode:
              window.google.maps
                .TravelMode.DRIVING,

            provideRouteAlternatives: false,
          },

          (result, status) => {
            if (status !== "OK") {
              reject(
                new Error(
                  `Google route calculation failed: ${status}`
                )
              );

              return;
            }

            const leg =
              result?.routes?.[0]?.legs?.[0];

            if (
              !leg ||
              !leg.distance ||
              typeof leg.distance.value !==
                "number"
            ) {
              reject(
                new Error(
                  "Google Maps returned no road distance."
                )
              );

              return;
            }

            const distanceKm =
              leg.distance.value / 1000;

            resolve({
              distanceKm,

              distanceText:
                leg.distance.text ||
                `${distanceKm.toFixed(1)} km`,

              durationText:
                leg.duration?.text || "",
            });
          }
        );
      });
    },
    [hasValidSelectedLocation]
  );

  /*
   * ------------------------------------------------------------
   * AUTOMATIC DISTANCE CALCULATION
   * ------------------------------------------------------------
   *
   * IMPORTANT FIX:
   *
   * Calculation does NOT start just because lat/lon exist.
   *
   * Both pickup AND drop must have:
   *
   * - a non-empty selected name
   * - valid latitude
   * - valid longitude
   *
   * Therefore:
   *
   * Empty pickup + empty drop
   *        ↓
   * NO calculation
   *
   * Pickup only
   *        ↓
   * NO calculation
   *
   * Drop only
   *        ↓
   * NO calculation
   *
   * Pickup + Drop
   *        ↓
   * Calculate road distance
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    let retryTimer = null;

    const hasPickup =
      hasValidSelectedLocation(pickup);

    const hasDrop =
      hasValidSelectedLocation(drop);

    /*
     * ----------------------------------------------------------
     * NO COMPLETE JOURNEY
     * ----------------------------------------------------------
     *
     * This is the important part.
     *
     * If either location has not actually been selected,
     * we completely reset the distance state and DO NOT
     * attempt Google Directions.
     * ----------------------------------------------------------
     */

    if (!hasPickup || !hasDrop) {
      setJourneyDistanceKm(null);

      setJourneyDistanceText("");

      setJourneyDurationText("");

      setJourneyDistanceError("");

      setJourneyDistanceLoading(false);

      return () => {
        cancelled = true;

        if (retryTimer) {
          clearTimeout(retryTimer);
        }
      };
    }

    /*
     * ----------------------------------------------------------
     * COMPLETE JOURNEY
     * ----------------------------------------------------------
     */

    setJourneyDistanceKm(null);

    setJourneyDistanceText("");

    setJourneyDurationText("");

    setJourneyDistanceError("");

    setJourneyDistanceLoading(true);

    let attempts = 0;

    const maxAttempts = 20;

    const calculate = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      /*
       * Wait until DirectionsService exists.
       */

      const directionsReady =
        typeof window !== "undefined" &&
        window.google?.maps
          ?.DirectionsService;

      if (!directionsReady) {
        if (attempts < maxAttempts) {
          retryTimer = setTimeout(
            calculate,
            300
          );

          return;
        }

        if (!cancelled) {
          setJourneyDistanceLoading(false);

          setJourneyDistanceError(
            "Google Maps road-distance service is unavailable."
          );
        }

        return;
      }

      try {
        const result =
          await calculateRoadDistance(
            pickup,
            drop
          );

        if (cancelled) {
          return;
        }

        setJourneyDistanceKm(
          result.distanceKm
        );

        setJourneyDistanceText(
          result.distanceText
        );

        setJourneyDurationText(
          result.durationText
        );

        setJourneyDistanceError("");

        setJourneyDistanceLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "VOYNU road distance error:",
          error
        );

        if (attempts < maxAttempts) {
          retryTimer = setTimeout(
            calculate,
            500
          );

          return;
        }

        setJourneyDistanceKm(null);

        setJourneyDistanceText("");

        setJourneyDurationText("");

        setJourneyDistanceLoading(false);

        setJourneyDistanceError(
          error?.message ||
            "Unable to calculate road distance."
        );
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
    pickup,
    drop,
    calculateRoadDistance,
    hasValidSelectedLocation,
  ]);

  /*
   * ------------------------------------------------------------
   * TOTAL DISTANCE
   * ------------------------------------------------------------
   */

  const totalJourneyDistanceKm =
    journeyDistanceKm !== null
      ? tripType === "roundtrip"
        ? journeyDistanceKm * 2
        : journeyDistanceKm
      : null;

  /*
   * ------------------------------------------------------------
   * TRIP TYPE
   * ------------------------------------------------------------
   */

  const handleTripTypeChange = (type) => {
    clearMessage();

    setTripType(type);

    if (type === "oneway") {
      setReturnDate("");
      setReturnTime("");
    }
  };

  /*
   * ------------------------------------------------------------
   * TRAVEL DATE
   * ------------------------------------------------------------
   */

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
      isTimeInPastForToday(
        value,
        pickupTime
      )
    ) {
      setPickupTime("");
    }
  };

  /*
   * ------------------------------------------------------------
   * PICKUP TIME
   * ------------------------------------------------------------
   */

  const handlePickupTimeChange = (value) => {
    clearMessage();

    if (
      travelDate === today &&
      isTimeInPastForToday(
        today,
        value
      )
    ) {
      showError(
        "Pickup time cannot be in the past."
      );

      setPickupTime("");

      return;
    }

    setPickupTime(value);
  };

  /*
   * ------------------------------------------------------------
   * LOCATION SELECT
   * ------------------------------------------------------------
   */

  const handlePickupSelect = useCallback(
    (location) => {
      clearMessage();

      if (!location) {
        return;
      }

      setPickup({
        name:
          location.name || "",

        lat:
          location.lat ?? null,

        lon:
          location.lon ?? null,

        placeId:
          location.placeId ?? null,
      });
    },
    [clearMessage]
  );

  const handleDropSelect = useCallback(
    (location) => {
      clearMessage();

      if (!location) {
        return;
      }

      setDrop({
        name:
          location.name || "",

        lat:
          location.lat ?? null,

        lon:
          location.lon ?? null,

        placeId:
          location.placeId ?? null,
      });
    },
    [clearMessage]
  );

  /*
   * ------------------------------------------------------------
   * PHONE CHANGE
   * ------------------------------------------------------------
   */

  const handlePhoneChange = (event) => {
    const value =
      event.target.value.replace(
        /[^\d+]/g,
        ""
      );

    setPhone(value);

    if (whatsappSameAsPhone) {
      setWhatsapp(value);
    }

    clearMessage();
  };

  /*
   * ------------------------------------------------------------
   * WHATSAPP CHANGE
   * ------------------------------------------------------------
   */

  const handleWhatsAppChange = (event) => {
    const value =
      event.target.value.replace(
        /[^\d+]/g,
        ""
      );

    setWhatsapp(value);

    clearMessage();
  };

  /*
   * ------------------------------------------------------------
   * WHATSAPP TOGGLE
   * ------------------------------------------------------------
   */

  const handleWhatsAppToggle = () => {
    clearMessage();

    const nextState =
      !whatsappSameAsPhone;

    setWhatsappSameAsPhone(
      nextState
    );

    if (nextState) {
      setWhatsapp(phone);
    }
  };

  /*
   * ------------------------------------------------------------
   * BOOKING DATA
   * ------------------------------------------------------------
   */

  const buildBookingData = () => {
    const normalizedPhone =
      normalizeIndianPhone(phone);

    const normalizedWhatsApp =
      normalizeIndianPhone(whatsapp);

    return {
      tripType,

      pickup: {
        name: pickup.name.trim(),

        lat: pickup.lat,

        lon: pickup.lon,

        placeId: pickup.placeId,
      },

      drop: {
        name: drop.name.trim(),

        lat: drop.lat,

        lon: drop.lon,

        placeId: drop.placeId,
      },

      journey: {
        oneWayDistanceKm:
          journeyDistanceKm,

        oneWayDistanceText:
          journeyDistanceText,

        totalDistanceKm:
          totalJourneyDistanceKm,

        totalDistanceText:
          totalJourneyDistanceKm !==
          null
            ? `${totalJourneyDistanceKm.toFixed(
                1
              )} km`
            : "",

        durationText:
          journeyDurationText,

        maximumDistancePerLegKm:
          MAX_JOURNEY_DISTANCE_KM,
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

      phone: normalizedPhone,

      whatsapp: normalizedWhatsApp,

      createdAt:
        new Date().toISOString(),
    };
  };

  /*
   * ------------------------------------------------------------
   * VALIDATION
   * ------------------------------------------------------------
   */

  const validateBooking = () => {
    if (!pickup.name.trim()) {
      return "Please select your pickup location.";
    }

    if (
      !Number.isFinite(
        Number(pickup.lat)
      ) ||
      !Number.isFinite(
        Number(pickup.lon)
      )
    ) {
      return "Please select your pickup location from the suggested locations.";
    }

    if (!drop.name.trim()) {
      return "Please select your drop location.";
    }

    if (
      !Number.isFinite(
        Number(drop.lat)
      ) ||
      !Number.isFinite(
        Number(drop.lon)
      )
    ) {
      return "Please select your drop location from the suggested locations.";
    }

    /*
     * Same coordinates.
     */

    const sameLatitude =
      Math.abs(
        Number(pickup.lat) -
          Number(drop.lat)
      ) < 0.00001;

    const sameLongitude =
      Math.abs(
        Number(pickup.lon) -
          Number(drop.lon)
      ) < 0.00001;

    if (
      sameLatitude &&
      sameLongitude
    ) {
      return "Pickup and drop locations cannot be the same.";
    }

    /*
     * Distance.
     */

    if (
      journeyDistanceKm === null
    ) {
      return "Please wait while we calculate the road distance between your pickup and drop locations.";
    }

    if (
      !Number.isFinite(
        journeyDistanceKm
      )
    ) {
      return "We couldn't calculate the journey distance. Please select your locations again.";
    }

    /*
     * ONE WAY
     */

    if (
      tripType === "oneway" &&
      journeyDistanceKm >
        MAX_JOURNEY_DISTANCE_KM
    ) {
      return `Sorry, this one-way journey is ${
        journeyDistanceText ||
        `${journeyDistanceKm.toFixed(
          1
        )} km`
      }. VOYNU currently accepts journeys up to 200 km per leg.`;
    }

    /*
     * ROUND TRIP
     */

    if (
      tripType === "roundtrip" &&
      journeyDistanceKm >
        MAX_JOURNEY_DISTANCE_KM
    ) {
      return `Sorry, this journey is ${
        journeyDistanceText ||
        `${journeyDistanceKm.toFixed(
          1
        )} km`
      } one way. Each round-trip leg can be a maximum of 200 km.`;
    }

    /*
     * TRAVEL DATE
     */

    if (!travelDate) {
      return "Please select your travel date.";
    }

    if (travelDate < today) {
      return "Travel date cannot be in the past.";
    }

    /*
     * PICKUP TIME
     */

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

    /*
     * PASSENGER
     */

    const trimmedName =
      passengerName.trim();

    if (!trimmedName) {
      return "Please enter the passenger name.";
    }

    if (trimmedName.length < 2) {
      return "Please enter a valid passenger name.";
    }

    /*
     * PHONE
     */

    const normalizedPhone =
      normalizeIndianPhone(phone);

    if (!normalizedPhone) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    /*
     * WHATSAPP
     */

    const normalizedWhatsApp =
      normalizeIndianPhone(
        whatsapp
      );

    if (!normalizedWhatsApp) {
      return "Please enter a valid WhatsApp mobile number.";
    }

    /*
     * ROUND TRIP DATE/TIME
     */

    if (tripType === "roundtrip") {
      if (!returnDate) {
        return "Please select the return date.";
      }

      if (
        returnDate < travelDate
      ) {
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

  /*
   * ------------------------------------------------------------
   * CONTINUE
   * ------------------------------------------------------------
   */

  const handleContinue = () => {
    if (isSubmitting) {
      return;
    }

    clearMessage();

    const validationError =
      validateBooking();

    if (validationError) {
      showError(validationError);

      return;
    }

    setIsSubmitting(true);

    const bookingData =
      buildBookingData();

    try {
      sessionStorage.setItem(
        "voynu_booking",
        JSON.stringify(
          bookingData
        )
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
        "Unable to save booking data:",
        error
      );

      showError(
        "We couldn't save your trip details. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <main className="page">

      <header className="header">

        <div className="headerInner">

          <div className="brand">

            <div className="brandMark">
              V
            </div>

            <div>

              <div className="brandName">
                VOYNU
              </div>

              <div className="brandTagline">
                Travel safe. Travel smart.
              </div>

            </div>

          </div>

          <a
            href="tel:+919123456789"
            className="headerPhone"
            aria-label="Call VOYNU"
          >

            <span className="phoneIcon">
              ☎
            </span>

            <span>
              +91 91234 56789
            </span>

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
              <strong>
                200 km
              </strong>{" "}
              per leg
            </span>

          </div>

          <div className="heroGrid">

            <div className="heroText">

              <h1>
                Your ride,
                <br />
                <span>
                  your way.
                </span>
              </h1>

              <p>
                Book a reliable cab for
                your journey.
                <br className="desktopBreak" />
                Travel safe. Travel smart.
              </p>

              <div className="heroFeatures">

                <div className="heroFeature">
                  <span className="featureIcon">
                    ✓
                  </span>

                  <span>
                    Verified Drivers
                  </span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">
                    ⌁
                  </span>

                  <span>
                    Safe &amp; Secure
                  </span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">
                    ⚡
                  </span>

                  <span>
                    EV Rides
                  </span>
                </div>

              </div>

            </div>

            <div className="heroVehicle">

              <div className="vehicleGlow" />

              <div
                className="vehicle"
                aria-hidden="true"
              >
                🚙
              </div>

            </div>

          </div>

        </div>

      </section>

      <section className="bookingSection">

        <div className="bookingCard">

          <div className="bookingHeader">

            <div>

              <h2>
                Book your ride
              </h2>

              <p>
                Tell us where you want to go.
              </p>

            </div>

            <div className="secureBadge">

              <span>
                🔒
              </span>

              Secure booking

            </div>

          </div>

          <div
            className="tripToggle"
            role="tablist"
            aria-label="Trip type"
          >

            <button
              type="button"
              role="tab"
              aria-selected={
                tripType === "oneway"
              }
              className={
                tripType === "oneway"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() =>
                handleTripTypeChange(
                  "oneway"
                )
              }
            >

              <span className="tripIcon">
                →
              </span>

              <span>

                <strong>
                  One Way
                </strong>

                <small>
                  Single journey
                </small>

              </span>

            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                tripType === "roundtrip"
              }
              className={
                tripType === "roundtrip"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() =>
                handleTripTypeChange(
                  "roundtrip"
                )
              }
            >

              <span className="tripIcon">
                ⇄
              </span>

              <span>

                <strong>
                  Round Trip
                </strong>

                <small>
                  200 km each way
                </small>

              </span>

            </button>

          </div>

          <div className="sectionLabel">

            <span className="sectionNumber">
              1
            </span>

            <span>
              Journey details
            </span>

          </div>

          <div className="locationGrid">

            <div className="locationBox">

              <LocationPicker
                label="Pickup location"
                value={pickup.name}
                placeholder="Search pickup location"
                allowCurrentLocation={true}
                onLocationSelect={
                  handlePickupSelect
                }
              />

            </div>

            <div className="locationBox">

              <LocationPicker
                label="Drop location"
                value={drop.name}
                placeholder="Search destination"
                allowCurrentLocation={false}
                onLocationSelect={
                  handleDropSelect
                }
              />

            </div>

          </div>

          <div className="journeyDistanceBox">

            <div className="journeyDistanceIcon">
              🚕
            </div>

            <div className="journeyDistanceContent">

              <div className="journeyDistanceLabel">
                JOURNEY DISTANCE
              </div>

              {!hasValidSelectedLocation(
                pickup
              ) ||
              !hasValidSelectedLocation(
                drop
              ) ? (

                <div className="journeyDistanceMessage">
                  Select both locations to
                  calculate road distance.
                </div>

              ) : journeyDistanceLoading ? (

                <div className="journeyDistanceMessage">
                  Calculating road distance...
                </div>

              ) : journeyDistanceKm !==
                null ? (

                <div>

                  <div className="journeyDistanceValue">

                    {tripType ===
                    "roundtrip"
                      ? `${journeyDistanceKm.toFixed(
                          1
                        )} km each way • ${totalJourneyDistanceKm.toFixed(
                          1
                        )} km total`
                      : journeyDistanceText ||
                        `${journeyDistanceKm.toFixed(
                          1
                        )} km`}

                  </div>

                  <div className="journeyDuration">
                    Maximum 200 km each way
                  </div>

                  {journeyDurationText && (
                    <div className="journeyDuration">
                      Approx. driving time:{" "}
                      {
                        journeyDurationText
                      }

                      {tripType ===
                        "roundtrip" &&
                        " each way"}
                    </div>
                  )}

                </div>

              ) : (

                <div className="journeyDistanceError">

                  {journeyDistanceError ||
                    "Unable to calculate road distance."}

                </div>

              )}

            </div>

          </div>

          <div className="formGrid">

            <div className="field">

              <label htmlFor="travelDate">

                <span className="labelIcon">
                  ▣
                </span>

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

                <span className="labelIcon">
                  ◷
                </span>

                Pickup time

              </label>

              <input
                id="pickupTime"
                type="time"
                value={pickupTime}
                onChange={(event) =>
                  handlePickupTimeChange(
                    event.target.value
                  )
                }
              />

            </div>

          </div>

          {tripType === "roundtrip" && (

            <div className="roundTripBox">

              <div className="roundTripTitle">

                <span>
                  ⇄
                </span>

                Return journey

              </div>

              <div className="formGrid">

                <div className="field">

                  <label htmlFor="returnDate">

                    <span className="labelIcon">
                      ▣
                    </span>

                    Return date

                  </label>

                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    min={
                      travelDate ||
                      today
                    }
                    onChange={(event) => {

                      clearMessage();

                      const value =
                        event.target.value;

                      if (
                        travelDate &&
                        value &&
                        value <
                          travelDate
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

                    <span className="labelIcon">
                      ◷
                    </span>

                    Return time

                  </label>

                  <input
                    id="returnTime"
                    type="time"
                    value={returnTime}
                    onChange={(event) => {

                      clearMessage();

                      const value =
                        event.target.value;

                      if (
                        returnDate ===
                          today &&
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
                        returnDate ===
                          travelDate &&
                        pickupTime &&
                        value <
                          pickupTime
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

          <div className="sectionLabel passengerSectionLabel">

            <span className="sectionNumber">
              2
            </span>

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

              <span className="labelIcon">
                ●
              </span>

              Passenger name

            </label>

            <input
              id="passengerName"
              type="text"
              autoComplete="name"
              placeholder="Enter passenger name"
              value={passengerName}
              onChange={(event) => {

                setPassengerName(
                  event.target.value
                );

                clearMessage();

              }}
            />

          </div>

          <div className="formGrid">

            <div className="field">

              <label htmlFor="phone">

                <span className="labelIcon">
                  ☎
                </span>

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
                onChange={
                  handlePhoneChange
                }
              />

            </div>

            <div className="field">

              <label htmlFor="whatsapp">

                <span className="labelIcon">
                  ◌
                </span>

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
                disabled={
                  whatsappSameAsPhone
                }
                onChange={
                  handleWhatsAppChange
                }
              />

              <button
                type="button"
                className={
                  whatsappSameAsPhone
                    ? "samePhoneToggle active"
                    : "samePhoneToggle"
                }
                onClick={
                  handleWhatsAppToggle
                }
                aria-pressed={
                  whatsappSameAsPhone
                }
              >

                <span className="toggleCheck">

                  {whatsappSameAsPhone
                    ? "✓"
                    : ""}

                </span>

                <span>
                  Same as phone number
                </span>

              </button>

            </div>

          </div>

          {message && (

            <div
              className={
                messageType ===
                "success"
                  ? "message successMessage"
                  : "message errorMessage"
              }
              role="alert"
              aria-live="polite"
            >

              <span className="messageIcon">

                {messageType ===
                "success"
                  ? "✓"
                  : "!"}

              </span>

              <span>
                {message}
              </span>

            </div>

          )}

          <button
            type="button"
            className="continueButton"
            onClick={
              handleContinue
            }
            disabled={
              isSubmitting
            }
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

            <span>
              🛡️
            </span>

            <span>
              Your information is safe and secure.
            </span>

          </div>

        </div>

      </section>

      <footer className="footer">

        <div className="footerInner">

          <div>

            <strong>
              VOYNU
            </strong>

            <span>
              {" "}©{" "}
              {new Date().getFullYear()}
            </span>

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
            Helvetica,
            sans-serif;
        }

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

          background: rgba(8,120,63,0.055);
        }

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 8px 14px;

          border: 1px solid #d8e7dc;
          border-radius: 30px;

          background: rgba(255,255,255,0.9);

          color: #596a61;

          font-size: 12px;

          box-shadow:
            0 5px 18px
            rgba(0,0,0,0.035);
        }

        .badgeDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #08783f;
        }

        .heroGrid {
          display: grid;

          grid-template-columns:
            1.2fr 0.8fr;

          align-items: center;

          gap: 30px;

          margin-top: 20px;
        }

        .heroText h1 {
          margin: 0;

          color: #26372f;

          font-size: clamp(48px,7vw,78px);

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

          background: rgba(8,120,63,0.08);

          transform: rotate(-8deg);
        }

        .vehicle {
          position: relative;

          font-size: 105px;
          line-height: 1;

          transform: translateY(5px);

          filter:
            drop-shadow(
              0 14px 15px
              rgba(0,0,0,0.08)
            );
        }

        .bookingSection {
          width: min(1180px,calc(100% - 40px));

          margin: -30px auto 0;

          position: relative;
          z-index: 10;

          padding-bottom: 55px;
        }

        .bookingCard {
          padding: 30px;

          border-radius: 24px;

          background: #ffffff;

          border: 1px solid
            rgba(219,231,223,0.75);

          box-shadow:
            0 20px 60px
            rgba(25,55,39,0.1);
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

        .tripToggle {
          width: min(620px,100%);

          display: grid;

          grid-template-columns:
            1fr 1fr;

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

          transition:
            background .2s ease,
            color .2s ease,
            box-shadow .2s ease;
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

          opacity: .72;
        }

        .tripIcon {
          font-size: 20px;
          font-weight: 700;
        }

        .tripButton.active {
          background: #08783f;

          color: #ffffff;

          box-shadow:
            0 5px 15px
            rgba(8,120,63,.2);
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

          font-size: 14px;
          font-weight: 900;
        }

        .sectionTitle {
          display: block;

          font-size: 15px;
          font-weight: 850;
        }

        .sectionSubtitle {
          display: block;

          margin-top: 2px;

          color: #8a9790;

          font-size: 11px;
          font-weight: 500;
        }

        .passengerSectionLabel {
          margin-top: 29px;
        }

        .locationGrid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 20px;
        }

        .locationBox {
          min-width: 0;
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

          line-height: 1.4;
        }

        .journeyDistanceValue {
          margin-top: 2px;

          color: #08783f;

          font-size: 22px;

          line-height: 1.3;

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

          line-height: 1.4;
        }

        .formGrid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

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
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .field input::placeholder {
          color: #9aa69f;
        }

        .field input:focus {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px
            rgba(8,120,63,.09);
        }

        .field input:disabled {
          background: #f4f8f5;

          color: #63736a;

          border-color: #e0e7e2;

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

        .samePhoneToggle:hover,
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

          background: #ffffff;

          color: #ffffff;

          font-size: 11px;
          font-weight: 900;
        }

        .samePhoneToggle.active .toggleCheck {
          border-color: #08783f;

          background: #08783f;

          box-shadow:
            0 2px 7px
            rgba(8,120,63,.18);
        }

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

        .continueButton {
          width: 100%;
          min-height: 56px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          margin-top: 20px;

          padding: 0 20px;

          border: 0;
          border-radius: 12px;

          background: #08783f;

          color: #ffffff;

          font-family: inherit;

          font-size: 15px;
          font-weight: 850;

          cursor: pointer;

          box-shadow:
            0 7px 18px
            rgba(8,120,63,.18);

          transition:
            transform .18s ease,
            background .18s ease,
            box-shadow .18s ease,
            opacity .18s ease;
        }

        .continueButton:hover:not(:disabled) {
          background: #076d39;

          transform: translateY(-1px);

          box-shadow:
            0 10px 22px
            rgba(8,120,63,.22);
        }

        .continueButton:active:not(:disabled) {
          transform: translateY(0);
        }

        .continueButton:disabled {
          opacity: .7;
          cursor: wait;
        }

        .continueArrow {
          font-size: 21px;
          line-height: 1;
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

          color: #ffffff;
        }

        .footerInner {
          width: min(1180px,calc(100% - 40px));

          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          margin: 0 auto;

          color: rgba(255,255,255,.78);

          font-size: 11px;
        }

        .footerInner strong {
          color: #ffffff;

          letter-spacing: .5px;
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

          .bookingCard {
            padding: 25px;
          }

        }

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

          .sectionNumber {
            width: 40px;
            height: 40px;

            flex-basis: 40px;
          }

          .sectionTitle {
            font-size: 14px;
          }

          .sectionSubtitle {
            font-size: 10px;
          }

          .locationGrid {
            gap: 14px;
          }

          .journeyDistanceBox {
            margin-top: 15px;

            padding: 13px 14px;
          }

          .journeyDistanceIcon {
            width: 40px;
            height: 40px;

            flex-basis: 40px;

            font-size: 20px;
          }

          .journeyDistanceValue {
            font-size: 18px;
          }

          .journeyDistanceMessage {
            font-size: 12px;
          }

          .formGrid {
            grid-template-columns: 1fr;

            gap: 15px;

            margin-top: 15px;
          }

          .field input {
            height: 52px;
          }

          .samePhoneToggle {
            min-height: 28px;

            font-size: 11px;
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
            min-height: 55px;

            font-size: 14px;
          }

          .bookingFooter {
            font-size: 10px;
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

          .continueButton {
            font-size: 13px;
          }

        }

      `}</style>

    </main>
  );
}
