"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * ---------------------------------------------------------
 * GOOGLE MAPS CONFIGURATION
 * ---------------------------------------------------------
 *
 * Add this to your Vercel environment variables:
 *
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *
 * The API key must have:
 *
 * - Maps JavaScript API
 * - Places API
 *
 * enabled.
 */

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const DEFAULT_CENTER = {
  lat: 26.4499,
  lng: 80.3319,
};

/*
 * ---------------------------------------------------------
 * LOAD GOOGLE MAPS
 * ---------------------------------------------------------
 *
 * We load Google Maps manually instead of using another
 * package so this component does not depend on:
 *
 * @googlemaps/js-api-loader
 *
 * or
 *
 * @react-google-maps/api
 *
 * This also avoids the previous UnitSystem error.
 */

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (
    typeof window !== "undefined" &&
    window.google?.maps
  ) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(
      new Error(
        "Google Maps API key is missing."
      )
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.querySelector(
          'script[data-voynu-google-maps="true"]'
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(window.google)
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Google Maps failed to load."
              )
            )
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          GOOGLE_MAPS_API_KEY
        )}&libraries=places`;

      script.async = true;
      script.defer = true;

      script.dataset.voynuGoogleMaps =
        "true";

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google);
        } else {
          reject(
            new Error(
              "Google Maps loaded but is unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Unable to load Google Maps."
          )
        );
      };

      document.head.appendChild(script);
    }
  );

  return googleMapsPromise;
}

/*
 * ---------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------
 */

function locationToLatLng(location) {
  if (!location) {
    return null;
  }

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
  };
}

function createLocation(
  place,
  fallbackAddress = ""
) {
  if (
    !place?.geometry?.location
  ) {
    return null;
  }

  const lat =
    place.geometry.location.lat();

  const lng =
    place.geometry.location.lng();

  const address =
    place.formatted_address ||
    place.name ||
    fallbackAddress ||
    "";

  return {
    address,
    lat,
    lng,
  };
}

/*
 * ---------------------------------------------------------
 * COMPONENT
 * ---------------------------------------------------------
 */

export default function LocationPicker({
  pickup,
  drop,
  onPickupChange,
  onDropChange,
  onDistanceChange,
}) {
  const mapContainerRef =
    useRef(null);

  const pickupInputRef =
    useRef(null);

  const dropInputRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const pickupMarkerRef =
    useRef(null);

  const dropMarkerRef =
    useRef(null);

  const pickupAutocompleteRef =
    useRef(null);

  const dropAutocompleteRef =
    useRef(null);

  const directionsServiceRef =
    useRef(null);

  const directionsRendererRef =
    useRef(null);

  const pickupChangeRef =
    useRef(onPickupChange);

  const dropChangeRef =
    useRef(onDropChange);

  const distanceChangeRef =
    useRef(onDistanceChange);

  const [mapsReady, setMapsReady] =
    useState(false);

  const [mapsError, setMapsError] =
    useState("");

  const [isCalculating, setIsCalculating] =
    useState(false);

  const [distanceKm, setDistanceKm] =
    useState(null);

  const [distanceError, setDistanceError] =
    useState("");

  /*
   * Keep callbacks current without
   * rebuilding the Google Maps objects.
   */

  useEffect(() => {
    pickupChangeRef.current =
      onPickupChange;
  }, [onPickupChange]);

  useEffect(() => {
    dropChangeRef.current =
      onDropChange;
  }, [onDropChange]);

  useEffect(() => {
    distanceChangeRef.current =
      onDistanceChange;
  }, [onDistanceChange]);

  /*
   * ---------------------------------------------------------
   * INITIALIZE GOOGLE MAPS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const google =
          await loadGoogleMaps();

        if (cancelled) {
          return;
        }

        if (!mapContainerRef.current) {
          return;
        }

        /*
         * MAP
         */

        const map =
          new google.maps.Map(
            mapContainerRef.current,
            {
              center: DEFAULT_CENTER,
              zoom: 11,

              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,

              gestureHandling: "greedy",
            }
          );

        mapRef.current = map;

        /*
         * DIRECTIONS
         */

        directionsServiceRef.current =
          new google.maps.DirectionsService();

        directionsRendererRef.current =
          new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: false,
          });

        /*
         * PICKUP AUTOCOMPLETE
         */

        if (pickupInputRef.current) {
          const autocomplete =
            new google.maps.places.Autocomplete(
              pickupInputRef.current,
              {
                fields: [
                  "formatted_address",
                  "geometry",
                  "name",
                ],
              }
            );

          pickupAutocompleteRef.current =
            autocomplete;

          autocomplete.addListener(
            "place_changed",
            () => {
              const place =
                autocomplete.getPlace();

              const location =
                createLocation(place);

              if (!location) {
                return;
              }

              pickupChangeRef.current?.(
                location
              );
            }
          );
        }

        /*
         * DROP AUTOCOMPLETE
         */

        if (dropInputRef.current) {
          const autocomplete =
            new google.maps.places.Autocomplete(
              dropInputRef.current,
              {
                fields: [
                  "formatted_address",
                  "geometry",
                  "name",
                ],
              }
            );

          dropAutocompleteRef.current =
            autocomplete;

          autocomplete.addListener(
            "place_changed",
            () => {
              const place =
                autocomplete.getPlace();

              const location =
                createLocation(place);

              if (!location) {
                return;
              }

              dropChangeRef.current?.(
                location
              );
            }
          );
        }

        setMapsReady(true);
      } catch (error) {
        console.error(
          "Google Maps initialization error:",
          error
        );

        if (!cancelled) {
          setMapsError(
            error?.message ||
              "Unable to load Google Maps."
          );
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * CREATE / UPDATE PICKUP MARKER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !mapsReady ||
      !mapRef.current ||
      !window.google
    ) {
      return;
    }

    const google = window.google;

    if (!pickup) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setMap(null);
        pickupMarkerRef.current = null;
      }

      return;
    }

    const position =
      locationToLatLng(pickup);

    if (!position) {
      return;
    }

    if (!pickupMarkerRef.current) {
      const marker =
        new google.maps.Marker({
          map: mapRef.current,
          position,
          title: "Pickup location",
          draggable: true,
        });

      pickupMarkerRef.current =
        marker;

      /*
       * Allow user to drag pickup marker.
       */

      marker.addListener(
        "dragend",
        () => {
          const newPosition =
            marker.getPosition();

          if (!newPosition) {
            return;
          }

          const updatedLocation = {
            address:
              pickup.address,
            lat: newPosition.lat(),
            lng: newPosition.lng(),
          };

          pickupChangeRef.current?.(
            updatedLocation
          );
        }
      );
    } else {
      pickupMarkerRef.current.setPosition(
        position
      );

      pickupMarkerRef.current.setMap(
        mapRef.current
      );
    }
  }, [pickup, mapsReady]);

  /*
   * ---------------------------------------------------------
   * CREATE / UPDATE DROP MARKER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !mapsReady ||
      !mapRef.current ||
      !window.google
    ) {
      return;
    }

    const google = window.google;

    if (!drop) {
      if (dropMarkerRef.current) {
        dropMarkerRef.current.setMap(null);
        dropMarkerRef.current = null;
      }

      return;
    }

    const position =
      locationToLatLng(drop);

    if (!position) {
      return;
    }

    if (!dropMarkerRef.current) {
      const marker =
        new google.maps.Marker({
          map: mapRef.current,
          position,
          title: "Drop location",
          draggable: true,
        });

      dropMarkerRef.current =
        marker;

      /*
       * Allow user to drag drop marker.
       */

      marker.addListener(
        "dragend",
        () => {
          const newPosition =
            marker.getPosition();

          if (!newPosition) {
            return;
          }

          const updatedLocation = {
            address:
              drop.address,
            lat: newPosition.lat(),
            lng: newPosition.lng(),
          };

          dropChangeRef.current?.(
            updatedLocation
          );
        }
      );
    } else {
      dropMarkerRef.current.setPosition(
        position
      );

      dropMarkerRef.current.setMap(
        mapRef.current
      );
    }
  }, [drop, mapsReady]);

  /*
   * ---------------------------------------------------------
   * CALCULATE ROAD DISTANCE
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * There is deliberately NO:
   *
   *     UnitSystem.METRIC
   *
   * and no:
   *
   *     unitSystem: "METRIC"
   *
   * Google gives us distance.value in meters.
   *
   * We convert:
   *
   * meters / 1000 = kilometres
   */

  const calculateDistance =
    useCallback(async () => {
      if (!pickup || !drop) {
        setDistanceKm(null);
        setDistanceError("");
        setIsCalculating(false);

        distanceChangeRef.current?.(
          null
        );

        directionsRendererRef.current?.set(
          "directions",
          null
        );

        return;
      }

      if (
        !directionsServiceRef.current
      ) {
        return;
      }

      setIsCalculating(true);
      setDistanceError("");

      try {
        const origin = {
          lat: Number(pickup.lat),
          lng: Number(pickup.lng),
        };

        const destination = {
          lat: Number(drop.lat),
          lng: Number(drop.lng),
        };

        const result =
          await directionsServiceRef.current.route(
            {
              origin,
              destination,

              /*
               * Only driving mode is specified.
               *
               * NO UnitSystem is used.
               */

              travelMode:
                window.google.maps.TravelMode
                  .DRIVING,

              /*
               * Ask Google for the normal
               * road route.
               */
              provideRouteAlternatives: false,
            }
          );

        const route =
          result?.routes?.[0];

        if (!route) {
          throw new Error(
            "No driving route was found."
          );
        }

        /*
         * Add every route leg.
         *
         * This keeps the calculation robust
         * even if Google returns more than
         * one leg.
         */

        const totalMeters =
          (route.legs || []).reduce(
            (total, leg) => {
              return (
                total +
                Number(
                  leg?.distance?.value || 0
                )
              );
            },
            0
          );

        if (totalMeters <= 0) {
          throw new Error(
            "Google did not return a valid road distance."
          );
        }

        /*
         * Convert meters to kilometres.
         */

        const calculatedKm =
          totalMeters / 1000;

        /*
         * Keep one decimal place.
         */

        const roundedKm =
          Math.round(
            calculatedKm * 10
          ) / 10;

        setDistanceKm(
          roundedKm
        );

        distanceChangeRef.current?.(
          roundedKm
        );

        /*
         * Display route.
         */

        directionsRendererRef.current?.setDirections(
          result
        );

      } catch (error) {
        console.error(
          "Road distance calculation failed:",
          error
        );

        setDistanceKm(null);

        distanceChangeRef.current?.(
          null
        );

        setDistanceError(
          "Unable to calculate road distance. Please check the locations and try again."
        );

        directionsRendererRef.current?.set(
          "directions",
          null
        );
      } finally {
        setIsCalculating(false);
      }
    }, [pickup, drop]);

  /*
   * Calculate whenever either location changes.
   */

  useEffect(() => {
    calculateDistance();
  }, [calculateDistance]);

  /*
   * ---------------------------------------------------------
   * FIT MAP TO BOTH LOCATIONS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !mapsReady ||
      !mapRef.current ||
      !window.google
    ) {
      return;
    }

    if (!pickup && !drop) {
      mapRef.current.setCenter(
        DEFAULT_CENTER
      );

      mapRef.current.setZoom(11);

      return;
    }

    const bounds =
      new window.google.maps.LatLngBounds();

    let hasLocation = false;

    if (pickup) {
      bounds.extend({
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      });

      hasLocation = true;
    }

    if (drop) {
      bounds.extend({
        lat: Number(drop.lat),
        lng: Number(drop.lng),
      });

      hasLocation = true;
    }

    if (!hasLocation) {
      return;
    }

    /*
     * If both locations are almost identical,
     * don't zoom excessively.
     */

    if (
      pickup &&
      drop &&
      pickup.lat === drop.lat &&
      pickup.lng === drop.lng
    ) {
      mapRef.current.setCenter({
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      });

      mapRef.current.setZoom(15);

      return;
    }

    mapRef.current.fitBounds(
      bounds,
      80
    );
  }, [
    pickup,
    drop,
    mapsReady,
  ]);

  /*
   * ---------------------------------------------------------
   * INPUT CLEARING
   * ---------------------------------------------------------
   */

  function clearPickup() {
    pickupChangeRef.current?.(
      null
    );

    if (pickupInputRef.current) {
      pickupInputRef.current.value =
        "";
    }
  }

  function clearDrop() {
    dropChangeRef.current?.(
      null
    );

    if (dropInputRef.current) {
      dropInputRef.current.value =
        "";
    }
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-5">

      {/* ----------------------------------------------- */}
      {/* PICKUP                                          */}
      {/* ----------------------------------------------- */}

      <div>

        <label
          htmlFor="pickup-location"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Pickup location
        </label>

        <div className="relative">

          <input
            ref={pickupInputRef}
            id="pickup-location"
            type="text"
            placeholder="Search for pickup location"
            defaultValue={
              pickup?.address || ""
            }
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-[#238653] focus:ring-2 focus:ring-[#238653]/10"
          />

          {pickup && (
            <button
              type="button"
              onClick={clearPickup}
              aria-label="Clear pickup location"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ×
            </button>
          )}

        </div>

      </div>

      {/* ----------------------------------------------- */}
      {/* DROP                                            */}
      {/* ----------------------------------------------- */}

      <div>

        <label
          htmlFor="drop-location"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Drop location
        </label>

        <div className="relative">

          <input
            ref={dropInputRef}
            id="drop-location"
            type="text"
            placeholder="Search for drop location"
            defaultValue={
              drop?.address || ""
            }
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-[#238653] focus:ring-2 focus:ring-[#238653]/10"
          />

          {drop && (
            <button
              type="button"
              onClick={clearDrop}
              aria-label="Clear drop location"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ×
            </button>
          )}

        </div>

      </div>

      {/* ----------------------------------------------- */}
      {/* MAP                                             */}
      {/* ----------------------------------------------- */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">

        <div
          ref={mapContainerRef}
          className="h-[360px] w-full"
        />

      </div>

      {/* ----------------------------------------------- */}
      {/* MAP STATUS                                      */}
      {/* ----------------------------------------------- */}

      {!mapsReady &&
        !mapsError && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Loading map...
          </div>
        )}

      {mapsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mapsError}
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* INSTRUCTION                                     */}
      {/* ----------------------------------------------- */}

      {mapsReady && (
        <p className="text-sm text-gray-500">
          Search for a place, building, address or
          landmark. You can also drag either pin on
          the map to fine-tune the location.
        </p>
      )}

      {/* ----------------------------------------------- */}
      {/* JOURNEY DISTANCE                                */}
      {/* ----------------------------------------------- */}

      <div className="rounded-2xl border border-gray-200 bg-[#f1f9f4] p-5">

        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Journey distance
        </div>

        {!pickup || !drop ? (
          <div className="mt-2 text-lg font-bold text-[#28704c]">
            Select both locations to calculate road
            distance.
          </div>
        ) : isCalculating ? (
          <div className="mt-2 text-lg font-bold text-[#28704c]">
            Calculating road distance...
          </div>
        ) : distanceError ? (
          <div className="mt-2 text-sm font-medium text-red-600">
            {distanceError}
          </div>
        ) : distanceKm !== null ? (
          <>
            <div className="mt-2 text-3xl font-bold text-[#28704c]">
              {distanceKm} km
            </div>

            <div className="mt-1 text-sm text-gray-500">
              Actual driving distance
            </div>
          </>
        ) : (
          <div className="mt-2 text-lg font-bold text-[#28704c]">
            Select both locations to calculate road
            distance.
          </div>
        )}

      </div>

    </div>
  );
}
