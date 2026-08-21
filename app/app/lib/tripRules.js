/*
|--------------------------------------------------------------------------
| VOYNU Trip Rules
|--------------------------------------------------------------------------
|
| Central configuration for EV booking distance and service-area rules.
|
| Future cities can be added here without changing BookingPage.
|
|--------------------------------------------------------------------------
*/

export const TRIP_CONFIG = {
  /*
   * Current operating city.
   */
  serviceAreas: {
    kanpur: {
      id: "kanpur",
      name: "Kanpur",
      country: "India",

      /*
       * Kanpur city center.
       */
      center: {
        lat: 26.4499,
        lng: 80.3319,
      },

      /*
       * Temporary service-area radius.
       *
       * This is NOT the 200 km trip limit.
       *
       * It is only used to determine whether a selected
       * location belongs to our current Kanpur operating area.
       *
       * We can later replace this with a proper polygon.
       */
      serviceRadiusKm: 35,
    },
  },

  /*
   * Maximum allowed one-way pickup -> drop distance.
   */
  maxOneWayDistanceKm: 200,

  /*
   * Approximate practical EV range.
   */
  evRangeKm: 250,

  /*
   * Charging time communicated to customer.
   */
  chargingTimeMinutes: 60,
};

/*
|--------------------------------------------------------------------------
| Distance calculation
|--------------------------------------------------------------------------
|
| Haversine distance between two coordinates.
|
*/

export function calculateDistanceKm(
  pointA,
  pointB
) {
  if (
    !pointA ||
    !pointB ||
    typeof pointA.lat !== "number" ||
    typeof pointA.lng !== "number" ||
    typeof pointB.lat !== "number" ||
    typeof pointB.lng !== "number"
  ) {
    return null;
  }

  const earthRadiusKm = 6371;

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180;

  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const deltaLat = toRadians(
    pointB.lat - pointA.lat
  );

  const deltaLng = toRadians(
    pointB.lng - pointA.lng
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

/*
|--------------------------------------------------------------------------
| Check whether a location belongs to a service area.
|--------------------------------------------------------------------------
*/

export function getServiceAreaForLocation(
  location
) {
  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lon !== "number"
  ) {
    return null;
  }

  const point = {
    lat: location.lat,
    lng: location.lon,
  };

  for (const area of Object.values(
    TRIP_CONFIG.serviceAreas
  )) {
    const distance = calculateDistanceKm(
      point,
      area.center
    );

    if (
      distance !== null &&
      distance <= area.serviceRadiusKm
    ) {
      return {
        ...area,
        distanceFromCenterKm: distance,
      };
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Check maximum one-way distance.
|--------------------------------------------------------------------------
*/

export function isWithinMaximumDistance(
  distanceKm
) {
  return (
    typeof distanceKm === "number" &&
    distanceKm <=
      TRIP_CONFIG.maxOneWayDistanceKm
  );
}

/*
|--------------------------------------------------------------------------
| Determine charging requirement.
|--------------------------------------------------------------------------
|
| We calculate the actual round-trip distance.
|
| Example:
|
| One way = 140 km
| Round trip = 280 km
|
| EV range = 250 km
|
| Therefore charging is required.
|
|--------------------------------------------------------------------------
*/

export function getChargingRequirement({
  oneWayDistanceKm,
  isRoundTrip,
}) {
  if (
    !isRoundTrip ||
    typeof oneWayDistanceKm !== "number"
  ) {
    return {
      required: false,
      minutes: 0,
      roundTripDistanceKm: null,
    };
  }

  const roundTripDistanceKm =
    oneWayDistanceKm * 2;

  const required =
    roundTripDistanceKm >
    TRIP_CONFIG.evRangeKm;

  return {
    required,
    minutes: required
      ? TRIP_CONFIG.chargingTimeMinutes
      : 0,
    roundTripDistanceKm,
  };
}

/*
|--------------------------------------------------------------------------
| Complete trip validation.
|--------------------------------------------------------------------------
*/

export function validateTrip({
  pickup,
  drop,
  isRoundTrip = false,
}) {
  const errors = [];

  if (
    !pickup ||
    typeof pickup.lat !== "number" ||
    typeof pickup.lon !== "number"
  ) {
    errors.push(
      "Please select a valid pickup location from the map or suggestions."
    );
  }

  if (
    !drop ||
    typeof drop.lat !== "number" ||
    typeof drop.lon !== "number"
  ) {
    errors.push(
      "Please select a valid drop location from the map or suggestions."
    );
  }

  if (errors.length) {
    return {
      valid: false,
      errors,
      pickupArea: null,
      dropArea: null,
      distanceKm: null,
      roundTripDistanceKm: null,
      chargingRequired: false,
      chargingMinutes: 0,
    };
  }

  /*
   * Check service areas.
   */
  const pickupArea =
    getServiceAreaForLocation(
      pickup
    );

  const dropArea =
    getServiceAreaForLocation(
      drop
    );

  if (!pickupArea) {
    errors.push(
      "Pickup is currently available only within the Kanpur service area."
    );
  }

  if (!dropArea) {
    errors.push(
      "Drop location is currently available only within the Kanpur service area."
    );
  }

  /*
   * Calculate distance even if service-area
   * validation failed. This keeps the state
   * useful for the UI.
   */
  const distanceKm =
    calculateDistanceKm(
      {
        lat: pickup.lat,
        lng: pickup.lon,
      },
      {
        lat: drop.lat,
        lng: drop.lon,
      }
    );

  if (
    distanceKm !== null &&
    !isWithinMaximumDistance(distanceKm)
  ) {
    errors.push(
      `This trip is ${Math.round(
        distanceKm
      )} km one way. Our current maximum is ${TRIP_CONFIG.maxOneWayDistanceKm} km.`
    );
  }

  const charging =
    getChargingRequirement({
      oneWayDistanceKm:
        distanceKm,
      isRoundTrip,
    });

  return {
    valid: errors.length === 0,

    errors,

    pickupArea,

    dropArea,

    distanceKm,

    roundTripDistanceKm:
      charging.roundTripDistanceKm,

    chargingRequired:
      charging.required,

    chargingMinutes:
      charging.minutes,
  };
}
