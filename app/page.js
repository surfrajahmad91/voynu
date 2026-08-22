"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import LocationPicker from "./components/LocationPicker";
import { useRouter } from "next/navigation";

import {
  calculateTripDetails,
  getChargingMessage,
  VOYNU_TRIP_CONFIG,
} from "./lib/tripRules";

/*
 * Used only as a display default before a pickup city has been
 * matched (e.g. in the hero badge, before any location is
 * selected). The real, authoritative limit used for validation
 * always comes from tripDetails.maxOneWayDistanceKm, which is
 * resolved per service city inside tripRules.js.
 */
const DEFAULT_MAX_DISTANCE_KM =
  VOYNU_TRIP_CONFIG.maxOneWayDistanceKm;

/*
|--------------------------------------------------------------------------
| ICONS
|--------------------------------------------------------------------------
|
| Small inline SVG icon set used throughout the page, replacing
| emoji so the UI renders consistently across devices/fonts.
|
|--------------------------------------------------------------------------
*/

function IconCheckCircle({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" />
    </svg>
  );
}

function IconShield({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l7.5 3.5v5.5c0 5-3.2 8.3-7.5 9.9-4.3-1.6-7.5-4.9-7.5-9.9V6l7.5-3.5z" />
    </svg>
  );
}

function IconBolt({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function IconPhone({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconLock({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconCalendar({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function IconClock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.2 3.2" />
    </svg>
  );
}

function IconUser({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.2 4-6.4 8-6.4s8 2.2 8 6.4" />
    </svg>
  );
}

function IconChat({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1-5.3a8.4 8.4 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </svg>
  );
}

function IconSwap({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  );
}

function IconArrowRight({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconTaxi({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16h15M5.8 16l1.6-5.2a2.2 2.2 0 0 1 2.1-1.5h5a2.2 2.2 0 0 1 2.1 1.5L18.2 16" />
      <path d="M8 9.3V7h8v2.3" />
      <circle cx="8" cy="17.6" r="1.6" />
      <circle cx="16" cy="17.6" r="1.6" />
    </svg>
  );
    }

function IconAlertCircle({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

function IconSpinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="rgba(8,120,63,0.18)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#08783f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconMapPinDot({ size = 12, tone = "pickup" }) {
  const color =
    tone === "pickup" ? "#08783f" : "#c8622a";

  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="#ffffff" stroke={color} strokeWidth="2.4" />
      {tone === "pickup" && (
        <circle cx="6" cy="6" r="2.2" fill={color} />
      )}
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

export default function HomePage() {
  const router = useRouter();
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
    city: null,
    selected: false,
  });

  const [drop, setDrop] = useState({
    name: "",
    lat: null,
    lon: null,
    placeId: null,
    city: null,
    selected: false,
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

    selected.setHours(hours, minutes, 0, 0);

    return selected < new Date();
  };

  /*
   * ------------------------------------------------------------
   * VALID LOCATION CHECK
   * ------------------------------------------------------------
   */

  const hasValidCoordinates = (location) => {
    return (
      Number.isFinite(Number(location?.lat)) &&
      Number.isFinite(Number(location?.lon))
    );
  };

  const hasSelectedLocation = (location) => {
    return (
      location?.selected === true &&
      String(location?.name || "").trim().length > 0 &&
      hasValidCoordinates(location)
    );
  };

  /*
   * ------------------------------------------------------------
   * SERVER ROAD DISTANCE
   * ------------------------------------------------------------
   */

  const calculateRoadDistance = useCallback(
    async (pickupLocation, dropLocation) => {
      if (
        !hasSelectedLocation(pickupLocation) ||
        !hasSelectedLocation(dropLocation)
      ) {
        throw new Error(
          "Both pickup and drop locations must be selected."
        );
      }

      const response = await fetch(
        "/api/route-distance",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            origin: {
              lat: Number(pickupLocation.lat),
              lon: Number(pickupLocation.lon),
            },

            destination: {
              lat: Number(dropLocation.lat),
              lon: Number(dropLocation.lon),
            },
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Road-distance request failed (${response.status}).`
        );
      }

      let distanceKm = null;

      if (
        Number.isFinite(
          Number(data?.distanceKm)
        )
      ) {
        distanceKm = Number(data.distanceKm);
      } else if (
        Number.isFinite(
          Number(data?.distanceMeters)
        )
      ) {
        distanceKm =
          Number(data.distanceMeters) / 1000;
      }

      if (
        !Number.isFinite(distanceKm)
      ) {
        throw new Error(
          "The road-distance service returned no valid distance."
        );
      }

      let distanceText =
        data?.distanceText || "";

      if (!distanceText) {
        distanceText =
          `${distanceKm.toFixed(1)} km`;
      }

      let durationText =
        data?.durationText || "";

      if (
        !durationText &&
        Number.isFinite(
          Number(data?.durationSeconds)
        )
      ) {
        const totalMinutes = Math.round(
          Number(data.durationSeconds) / 60
        );

        const hours = Math.floor(
          totalMinutes / 60
        );

        const minutes =
          totalMinutes % 60;

        if (hours > 0) {
          durationText =
            minutes > 0
              ? `${hours} hr ${minutes} min`
              : `${hours} hr`;
        } else {
          durationText =
            `${minutes} min`;
        }
      }

      return {
        distanceKm,
        distanceText,
        durationText,
      };
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * AUTOMATIC DISTANCE CALCULATION
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const pickupIsSelected =
      hasSelectedLocation(pickup);

    const dropIsSelected =
      hasSelectedLocation(drop);

    if (
      !pickupIsSelected ||
      !dropIsSelected
    ) {
      setJourneyDistanceKm(null);
      setJourneyDistanceText("");
      setJourneyDurationText("");
      setJourneyDistanceError("");
      setJourneyDistanceLoading(false);

      return () => {
        cancelled = true;
      };
    }

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
      setJourneyDistanceKm(null);
      setJourneyDistanceText("");
      setJourneyDurationText("");
      setJourneyDistanceLoading(false);

      setJourneyDistanceError(
        "Pickup and drop locations cannot be the same."
      );

      return () => {
        cancelled = true;
      };
    }

    setJourneyDistanceKm(null);
    setJourneyDistanceText("");
    setJourneyDurationText("");
    setJourneyDistanceError("");
    setJourneyDistanceLoading(true);

    const calculate = async () => {
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
    };
  }, [
    pickup,
    drop,
    calculateRoadDistance,
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
   * TRIP DETAILS (business rules)
   * ------------------------------------------------------------
   */

  const tripDetails = useMemo(() => {
    if (
      !hasSelectedLocation(pickup) ||
      !hasSelectedLocation(drop) ||
      journeyDistanceKm === null
    ) {
      return null;
    }

    return calculateTripDetails({
      pickup,
      drop,
      tripType,
      distanceKm: journeyDistanceKm,
      pickupCityName: pickup.city,
    });
  }, [
    pickup,
    drop,
    tripType,
    journeyDistanceKm,
  ]);

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
        setPickup({
          name: "",
          lat: null,
          lon: null,
          placeId: null,
          city: null,
          selected: false,
        });

        return;
      }

      const name =
        String(location.name || "").trim();

      const lat =
        Number.isFinite(
          Number(location.lat)
        )
          ? Number(location.lat)
          : null;

      const lon =
        Number.isFinite(
          Number(location.lon)
        )
          ? Number(location.lon)
          : null;

      const selected =
        Boolean(name) &&
        Number.isFinite(lat) &&
        Number.isFinite(lon);

      setPickup({
        name,
        lat,
        lon,

        placeId:
          location.placeId ??
          null,

        city:
          location.city ??
          null,

        selected,
      });
    },
    [clearMessage]
  );

  const handleDropSelect = useCallback(
    (location) => {
      clearMessage();

      if (!location) {
        setDrop({
          name: "",
          lat: null,
          lon: null,
          placeId: null,
          city: null,
          selected: false,
        });

        return;
      }

      const name =
        String(location.name || "").trim();

      const lat =
        Number.isFinite(
          Number(location.lat)
        )
          ? Number(location.lat)
          : null;

      const lon =
        Number.isFinite(
          Number(location.lon)
        )
          ? Number(location.lon)
          : null;

      const selected =
        Boolean(name) &&
        Number.isFinite(lat) &&
        Number.isFinite(lon);

      setDrop({
        name,
        lat,
        lon,

        placeId:
          location.placeId ??
          null,

        city:
          location.city ??
          null,

        selected,
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
        city: pickup.city,
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
          totalJourneyDistanceKm !== null
            ? `${totalJourneyDistanceKm.toFixed(
                1
              )} km`
            : "",

        durationText:
          journeyDurationText,

        maximumDistancePerLegKm:
          tripDetails?.maxOneWayDistanceKm ??
          DEFAULT_MAX_DISTANCE_KM,

        serviceCityId:
          tripDetails?.serviceCity?.id ??
          null,

        chargingRequired:
          tripDetails?.chargingRequired ??
          false,

        chargingBreakMinutes:
          tripDetails?.chargingBreakMinutes ??
          0,
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
        normalizedPhone,

      whatsapp:
        normalizedWhatsApp,

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

    if (!hasSelectedLocation(pickup)) {
      return "Please select your pickup location from the suggested locations.";
    }

    if (!drop.name.trim()) {
      return "Please select your drop location.";
    }

    if (!hasSelectedLocation(drop)) {
      return "Please select your drop location from the suggested locations.";
    }

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

    if (journeyDistanceKm === null) {
      if (journeyDistanceLoading) {
        return "Please wait while we calculate the road distance between your pickup and drop locations.";
      }

      return (
        journeyDistanceError ||
        "We couldn't calculate the journey distance. Please select your locations again."
      );
    }

    if (
      !Number.isFinite(
        journeyDistanceKm
      )
    ) {
      return "We couldn't calculate the journey distance. Please select your locations again.";
    }

    if (
      !tripDetails ||
      !tripDetails.valid
    ) {
      return (
        tripDetails?.reason ||
        "We couldn't validate this journey. Please select your locations again."
      );
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

    const trimmedName =
      passengerName.trim();

    if (!trimmedName) {
      return "Please enter the passenger name.";
    }

    if (trimmedName.length < 2) {
      return "Please enter a valid passenger name.";
    }

    const normalizedPhone =
      normalizeIndianPhone(phone);

    if (!normalizedPhone) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }

    const normalizedWhatsApp =
      normalizeIndianPhone(whatsapp);

    if (!normalizedWhatsApp) {
      return "Please enter a valid WhatsApp mobile number.";
    }

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

      router.push("/cab-selection");
    } catch (error) {
      console.error(
        "Unable to save booking data:",
        error
      );

      showError(
        "We couldn't save your trip details. Please try again."
      );

      setIsSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * DERIVED UI STATE for the route card
   * ------------------------------------------------------------
   */

  const bothLocationsSelected =
    hasSelectedLocation(pickup) &&
    hasSelectedLocation(drop);

  const routeCardStatus = !bothLocationsSelected
    ? "idle"
    : journeyDistanceLoading
    ? "loading"
    : journeyDistanceError
    ? "error"
    : tripDetails && !tripDetails.valid
    ? "invalid"
    : journeyDistanceKm !== null && tripDetails?.valid
    ? "valid"
    : "idle";

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
            href="https://wa.me/919918614844?text=Hi%20VOYNU%2C%20I%20have%20a%20question%20about%20booking%20a%20cab."
            className="headerWhatsapp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
          >

            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
            </svg>

            <span>Chat with us</span>

          </a>

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
                    <IconCheckCircle size={14} />
                  </span>
                  <span>Verified Drivers</span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon">
                    <IconShield size={14} />
                  </span>
                  <span>Safe &amp; Secure</span>
                </div>

                <div className="heroFeature">
                  <span className="featureIcon featureIconAmber">
                    <IconBolt size={14} />
                  </span>
                  <span>EV Rides</span>
                </div>

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

      <section className="bookingSection">

        <div className="bookingCard">

          <div className="bookingHeader">

            <div>
              <h2>Book your ride</h2>
              <p>Tell us where you want to go.</p>
            </div>

            <div className="secureBadge">
              <IconLock size={12} />
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
              aria-selected={tripType === "oneway"}
              className={
                tripType === "oneway"
                  ? "tripButton active"
                  : "tripButton"
              }
              onClick={() => handleTripTypeChange("oneway")}
            >
              <span className="tripIcon">
                <IconArrowRight size={17} />
              </span>
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
              onClick={() => handleTripTypeChange("roundtrip")}
            >
              <span className="tripIcon">
                <IconSwap size={17} />
              </span>
              <span>
                <strong>Round Trip</strong>
                <small>{DEFAULT_MAX_DISTANCE_KM} km each way</small>
              </span>
            </button>

          </div>

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
                onLocationSelect={handlePickupSelect}
              />
            </div>

            <div className="locationBox">
              <LocationPicker
                label="Drop location"
                value={drop.name}
                placeholder="Search destination"
                allowCurrentLocation={false}
                onLocationSelect={handleDropSelect}
              />
            </div>

          </div>

          <div
            className={`routeCard routeCard-${routeCardStatus}`}
          >

            <div className="routeCardIcon">

              {routeCardStatus === "loading" ? (
                <IconSpinner size={20} />
              ) : routeCardStatus === "error" ||
                routeCardStatus === "invalid" ? (
                <IconAlertCircle size={19} />
              ) : (
                <IconTaxi size={20} />
              )}

            </div>

            <div className="routeCardBody">

              <div className="routeCardLabel">
                JOURNEY DISTANCE
              </div>

              {routeCardStatus === "idle" && (
                <div className="routeCardMessage">
                  Select both locations to
                  calculate road distance.
                </div>
              )}

              {routeCardStatus === "loading" && (
                <div className="routeCardMessage">
                  Calculating road distance...
                </div>
              )}

              {routeCardStatus === "error" && (
                <div className="routeCardMessage routeCardMessageError">
                  {journeyDistanceError}
                </div>
              )}

              {routeCardStatus === "invalid" && (
                <div className="routeCardMessage routeCardMessageError">
                  {tripDetails?.reason ||
                    "This journey is not currently supported."}
                </div>
              )}

              {routeCardStatus === "valid" && (
                <div>

                  <div className="routeCardValue">

                    {tripType === "roundtrip"
                      ? `${journeyDistanceKm.toFixed(1)} km each way`
                      : journeyDistanceText ||
                        `${journeyDistanceKm.toFixed(1)} km`}

                    {tripType === "roundtrip" && (
                      <span className="routeCardValueSub">
                        {" "}• {totalJourneyDistanceKm.toFixed(1)} km total
                      </span>
                    )}

                  </div>

                  <div className="routeCardChips">

                    <span className="routeChip">
                      Max{" "}
                      {tripDetails.maxOneWayDistanceKm ??
                        DEFAULT_MAX_DISTANCE_KM}{" "}
                      km each way
                    </span>

                    {tripDetails.serviceCity?.name && (
                      <span className="routeChip">
                        <IconMapPinDot size={9} tone="pickup" />
                        Pickup in {tripDetails.serviceCity.name}
                      </span>
                    )}

                    {journeyDurationText && (
                      <span className="routeChip">
                        <IconClock size={11} />
                        {journeyDurationText}
                        {tripType === "roundtrip" && " each way"}
                      </span>
                    )}

                  </div>

                  {tripType === "roundtrip" &&
                    tripDetails.chargingRequired && (
                      <div className="chargingChip">
                        <IconBolt size={13} />
                        <span>
                          {getChargingMessage(tripDetails)}
                        </span>
                      </div>
                    )}

                </div>
              )}

            </div>

          </div>

          <div className="formGrid">

            <div className="field">
              <label htmlFor="travelDate">
                <span className="labelIcon">
                  <IconCalendar size={13} />
                </span>
                Travel date
              </label>
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

            <div className="field">
              <label htmlFor="pickupTime">
                <span className="labelIcon">
                  <IconClock size={13} />
                </span>
                Pickup time
              </label>
              <input
                id="pickupTime"
                type="time"
                value={pickupTime}
                onChange={(event) =>
                  handlePickupTimeChange(event.target.value)
                }
              />
            </div>

          </div>

          {tripType === "roundtrip" && (

            <div className="roundTripBox">

              <div className="roundTripTitle">
                <IconSwap size={15} />
                Return journey
              </div>

              <div className="formGrid">

                <div className="field">
                  <label htmlFor="returnDate">
                    <span className="labelIcon">
                      <IconCalendar size={13} />
                    </span>
                    Return date
                  </label>

                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    min={travelDate || today}
                    onChange={(event) => {

                      clearMessage();

                      const value = event.target.value;

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
                        isTimeInPastForToday(value, returnTime)
                      ) {
                        setReturnTime("");
                      }

                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="returnTime">
                    <span className="labelIcon">
                      <IconClock size={13} />
                    </span>
                    Return time
                  </label>

                  <input
                    id="returnTime"
                    type="time"
                    value={returnTime}
                    onChange={(event) => {

                      clearMessage();

                      const value = event.target.value;

                      if (
                        returnDate === today &&
                        isTimeInPastForToday(returnDate, value)
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

          <div className="sectionLabel passengerSectionLabel">
            <span className="sectionNumber">2</span>
            <div>
              <span className="sectionTitle">Passenger details</span>
              <span className="sectionSubtitle">
                Who are we booking this ride for?
              </span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="passengerName">
              <span className="labelIcon">
                <IconUser size={13} />
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
                setPassengerName(event.target.value);
                clearMessage();
              }}
            />
          </div>

          <div className="formGrid">

            <div className="field">
              <label htmlFor="phone">
                <span className="labelIcon">
                  <IconPhone size={13} />
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
                onChange={handlePhoneChange}
              />
            </div>

            <div className="field">
              <label htmlFor="whatsapp">
                <span className="labelIcon">
                  <IconChat size={13} />
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
                  {whatsappSameAsPhone && (
                    <IconCheckCircle size={11} />
                  )}
                </span>
                <span>Same as phone number</span>
              </button>

            </div>

          </div>

          {message && (

            <div
              className={
                messageType === "success"
                  ? "message successMessage"
                  : "message errorMessage"
              }
              role="alert"
              aria-live="polite"
            >
              <span className="messageIcon">
                {messageType === "success" ? (
                  <IconCheckCircle size={13} />
                ) : (
                  <IconAlertCircle size={13} />
                )}
              </span>
              <span>{message}</span>
            </div>

          )}

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
              <IconArrowRight size={18} />
            </span>
          </button>

          <div className="bookingFooter">
            <IconShield size={13} />
            <span>Your information is safe and secure.</span>
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

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5faf6;
          color: #16241d;

          font-family:
            'Plus Jakarta Sans',
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            Helvetica,
            sans-serif;
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
        
        .headerWhatsapp {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 9px 16px;

          border-radius: 30px;

          background: #1fa855;
          color: #ffffff;

          text-decoration: none;

          font-size: 13px;
          font-weight: 700;

          box-shadow: 0 6px 16px rgba(31,168,85,0.25);
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
          letter-spacing: 0.3px;
        }

        .headerPhone {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 9px 15px;

          border-radius: 30px;

          background: #eaf6ee;
          color: #0a5c32;

          text-decoration: none;

          font-size: 13px;
          font-weight: 700;
        }

        .headerPhoneIcon {
          display: flex;
          color: #0a7d42;
        }

        .hero {
          position: relative;
          overflow: hidden;

          background:
            linear-gradient(
              160deg,
              #ffffff 0%,
              #f1faf4 55%,
              #e6f5ec 100%
            );
        }

        .heroInner {
          width: min(1180px, calc(100% - 40px));

          margin: 0 auto;

          padding: 46px 0 82px;

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

        .serviceBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 15px;

          border: 1px solid #d8e7dc;
          border-radius: 30px;

          background: rgba(255,255,255,0.92);

          color: #4c5d54;

          font-size: 12px;

          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
        }

        .badgeDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #0a7d42;

          box-shadow: 0 0 0 4px rgba(8,120,63,0.14);
        }

        .heroGrid {
          display: grid;

          grid-template-columns: 1.15fr 0.85fr;

          align-items: center;

          gap: 32px;

          margin-top: 22px;
        }

        .heroText h1 {
          margin: 0;

          color: #10201a;

          font-size: clamp(46px,6.6vw,76px);

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

          font-size: 16.5px;
          line-height: 1.6;
        }

        .heroFeatures {
          display: flex;
          flex-wrap: wrap;

          gap: 12px;

          margin-top: 26px;
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

          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
        }

        .featureIcon {
          width: 26px;
          height: 26px;

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

        .bookingSection {
          width: min(1180px,calc(100% - 40px));

          margin: -34px auto 0;

          position: relative;
          z-index: 10;

          padding-bottom: 60px;
        }

        .bookingCard {
          padding: 32px;

          border-radius: 26px;

          background: #ffffff;

          border: 1px solid rgba(219,231,223,0.7);

          box-shadow: 0 30px 80px -20px rgba(10,40,25,0.20);
        }

        .bookingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 24px;
        }

        .bookingHeader h2 {
          margin: 0;

          color: #14231c;

          font-size: 25px;
          font-weight: 800;

          letter-spacing: -0.5px;
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

          padding: 8px 13px;

          border-radius: 20px;

          background: #f1f8f3;

          color: #3f5b4b;

          font-size: 11px;
          font-weight: 700;
        }

        .tripToggle {
          width: 100%;

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 5px;

          padding: 5px;

          margin-bottom: 28px;

          border-radius: 16px;

          background: #eef3ef;
        }

        .tripButton {
          min-height: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border: 0;
          border-radius: 12px;

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

          font-size: 13.5px;
          font-weight: 800;
        }

        .tripButton small {
          display: block;

          margin-top: 2px;

          font-size: 10.5px;

          opacity: .72;
        }

        .tripIcon {
          display: flex;
        }

        .tripButton.active {
          background: linear-gradient(135deg, #0a7d42, #086836);

          color: #ffffff;

          box-shadow: 0 8px 18px rgba(8,120,63,.26);
        }

        .sectionLabel {
          display: flex;
          align-items: center;

          gap: 10px;

          margin: 0 0 16px;

          color: #263a30;

          font-size: 13px;
          font-weight: 800;
        }

        .sectionNumber {
          width: 40px;
          height: 40px;

          flex: 0 0 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: linear-gradient(135deg, #e5f4e9, #d1ecda);

          color: #0a7d42;

          font-size: 14px;
          font-weight: 800;
        }

        .sectionTitle {
          display: block;

          font-size: 15px;
          font-weight: 800;
        }

        .sectionSubtitle {
          display: block;

          margin-top: 2px;

          color: #8a9790;

          font-size: 11px;
          font-weight: 500;
        }

        .passengerSectionLabel {
          margin-top: 30px;
        }

        .locationGrid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 20px;

          align-items: start;
        }

        .locationBox {
          min-width: 0;
        }

        .routeCard {
          display: flex;
          align-items: flex-start;

          gap: 14px;

          margin-top: 20px;

          padding: 16px 18px;

          border-radius: 16px;

          background: #f4fbf6;

          border: 1px solid #dcebe1;
          border-left: 4px solid #0a7d42;

          transition: border-color .2s ease, background .2s ease;
        }

        .routeCard-error,
        .routeCard-invalid {
          background: #fff6f4;
          border-color: #f0d2cc;
          border-left-color: #c64a3f;
        }

        .routeCard-loading {
          border-left-color: #8fae9c;
        }

        .routeCardIcon {
          width: 42px;
          height: 42px;

          flex: 0 0 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: #e4f4e8;
          color: #0a7d42;
        }

        .routeCard-error .routeCardIcon,
        .routeCard-invalid .routeCardIcon {
          background: #fbe4e0;
          color: #c64a3f;
        }

        .routeCardBody {
          min-width: 0;
          flex: 1;
        }

        .routeCardLabel {
          color: #718078;

          font-size: 10px;

          font-weight: 800;

          letter-spacing: .8px;
        }

        .routeCardMessage {
          margin-top: 4px;

          color: #66776e;

          font-size: 13px;

          line-height: 1.45;
        }

        .routeCardMessageError {
          color: #b34a42;
        }

        .routeCardValue {
          margin-top: 3px;

          color: #0a7d42;

          font-size: 22px;

          line-height: 1.3;

          font-weight: 800;
        }

        .routeCardValueSub {
          font-size: 13px;
          font-weight: 700;
          color: #4b6b58;
        }

        .routeCardChips {
          display: flex;
          flex-wrap: wrap;

          gap: 7px;

          margin-top: 9px;
        }

        .routeChip {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 5px 10px;

          border-radius: 20px;

          background: #ffffff;
          border: 1px solid #dcebe1;

          color: #45564c;

          font-size: 11px;
          font-weight: 700;
        }

        .chargingChip {
          display: flex;
          align-items: flex-start;
          gap: 8px;

          margin-top: 11px;

          padding: 10px 12px;

          border-radius: 12px;

          background: #fdf3dc;

          color: #7a5a10;

          font-size: 11.5px;
          line-height: 1.5;
          font-weight: 600;
        }

        .formGrid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 20px;

          margin-top: 20px;
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
          display: flex;
          color: #0a7d42;
        }

        .field input {
          width: 100%;
          height: 53px;

          padding: 0 15px;

          border: 1.5px solid #e3e9e5;

          border-radius: 12px;

          background: #f8faf9;

          color: #16241d;

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
          border-color: #0a7d42;
          background: #ffffff;

          box-shadow: 0 0 0 4px rgba(8,120,63,.10);
        }

        .field input:disabled {
          background: #f0f3f1;

          color: #63736a;

          border-color: #e0e7e2;

          cursor: not-allowed;
        }

        .samePhoneToggle {
          display: inline-flex;
          align-items: center;

          gap: 8px;

          margin-top: 9px;

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
          color: #0a7d42;
        }

        .toggleCheck {
          width: 20px;
          height: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1.5px solid #cbd9d0;

          border-radius: 50%;

          background: #ffffff;

          color: #ffffff;
        }

        .samePhoneToggle.active .toggleCheck {
          border-color: #0a7d42;

          background: #0a7d42;

          box-shadow: 0 2px 7px rgba(8,120,63,.18);
        }

        .roundTripBox {
          margin-top: 20px;

          padding: 18px;

          border-radius: 16px;

          background: #f6fbf7;
          border: 1px solid #dcebe1;
        }

        .roundTripTitle {
          display: flex;
          align-items: center;

          gap: 8px;

          color: #0a7d42;

          font-size: 12px;
          font-weight: 800;
        }

        .roundTripBox .formGrid {
          margin-top: 15px;
        }

        .message {
          display: flex;
          align-items: flex-start;

          gap: 10px;

          margin-top: 22px;

          padding: 13px 15px;

          border-radius: 12px;

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
        }

        .successMessage {
          border: 1px solid #cce5d4;
          background: #eef9f1;
          color: #28734b;
        }

        .successMessage .messageIcon {
          background: #0a7d42;
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
          min-height: 57px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;

          margin-top: 22px;

          padding: 0 20px;

          border: 0;
          border-radius: 14px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          font-family: inherit;

          font-size: 15px;
          font-weight: 800;

          cursor: pointer;

          box-shadow: 0 10px 24px rgba(8,120,63,.24);

          transition:
            transform .18s ease,
            box-shadow .18s ease,
            opacity .18s ease;
        }

        .continueButton:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(8,120,63,.28);
        }

        .continueButton:active:not(:disabled) {
          transform: translateY(0);
        }

        .continueButton:disabled {
          opacity: .7;
          cursor: wait;
        }

        .continueArrow {
          display: flex;
        }

        .bookingFooter {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          margin-top: 13px;

          color: #89958e;

          font-size: 11px;
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

            border-radius: 10px;

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
            padding: 7px 12px;
          }

          .heroInner {
            width: calc(100% - 28px);

            padding: 28px 0 56px;
          }

          .serviceBadge {
            font-size: 10px;
          }

          .heroText h1 {
            font-size: 48px;

            letter-spacing: -2.4px;
          }

          .heroText p {
            margin-top: 17px;

            font-size: 14px;
          }

          .desktopBreak {
            display: none;
          }

          .heroFeatures {
            gap: 8px;

            margin-top: 22px;
          }

          .heroFeature {
            font-size: 10px;
            padding: 6px 11px 6px 6px;
          }

          .featureIcon {
            width: 22px;
            height: 22px;
          }

          .heroDecorOne {
            width: 320px;
            height: 130px;

            right: -140px;
            bottom: -80px;
          }

          .bookingSection {
            width: calc(100% - 20px);

            margin-top: -25px;

            padding-bottom: 32px;
          }

          .bookingCard {
            padding: 18px 16px 18px;

            border-radius: 22px;
          }

          .bookingHeader {
            margin-bottom: 18px;
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
            min-height: 54px;
          }

          .tripButton strong {
            font-size: 12px;
          }

          .tripButton small {
            font-size: 9px;
          }

          .sectionLabel {
            margin-bottom: 13px;
          }

          .sectionNumber {
            width: 38px;
            height: 38px;

            flex-basis: 38px;
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

          .routeCard {
            margin-top: 15px;

            padding: 14px 14px;

            gap: 11px;
          }

          .routeCardIcon {
            width: 38px;
            height: 38px;

            flex-basis: 38px;
          }

          .routeCardValue {
            font-size: 19px;
          }

          .routeCardMessage {
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
            padding: 15px;
          }

          .roundTripBox .formGrid {
            margin-top: 13px;
          }

          .passengerSectionLabel {
            margin-top: 25px;
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

          .headerPhone span:last-child {
            display: none;
          }

          .heroText h1 {
            font-size: 42px;
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
