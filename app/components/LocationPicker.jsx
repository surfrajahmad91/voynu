"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
==============================================================
GOOGLE MAPS LOADER
==============================================================

Make sure your .env.local contains:

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY

The same key must have these enabled:

1. Maps JavaScript API
2. Places API
3. Places API (New)
4. Routes API

Google's current Maps JS API loads the Routes library
through google.maps.importLibrary("routes").
*/

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps can only load in the browser.")
    );
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing."
      )
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      /*
       * If another component has already inserted
       * the Google Maps script, wait for it.
       */
      const existingScript =
        document.querySelector(
          'script[data-voynu-google-maps="true"]'
        );

      if (existingScript) {
        const checkExisting = () => {
          if (
            window.google?.maps?.importLibrary
          ) {
            resolve(window.google);
            return;
          }

          setTimeout(
            checkExisting,
            100
          );
        };

        checkExisting();
        return;
      }

      /*
       * Google recommended dynamic bootstrap loader.
       */
      if (!window.google) {
        window.google = {};
      }

      if (!window.google.maps) {
        window.google.maps = {};
      }

      const maps = window.google.maps;

      if (maps.importLibrary) {
        resolve(window.google);
        return;
      }

      let scriptLoaded = false;

      const loadPromise =
        new Promise(
          (innerResolve, innerReject) => {
            const script =
              document.createElement(
                "script"
              );

            script.dataset.voynuGoogleMaps =
              "true";

            const params =
              new URLSearchParams();

            params.set(
              "key",
              apiKey
            );

            params.set(
              "v",
              "weekly"
            );

            /*
             * We load Places and Routes dynamically
             * using importLibrary().
             */
            script.src =
              `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

            script.async = true;
            script.defer = true;

            script.onload = () => {
              scriptLoaded = true;
              innerResolve();
            };

            script.onerror = () => {
              innerReject(
                new Error(
                  "Google Maps failed to load."
                )
              );
            };

            document.head.appendChild(
              script
            );
          }
        );

      loadPromise
        .then(async () => {
          if (
            !window.google?.maps
              ?.importLibrary
          ) {
            throw new Error(
              "Google Maps loaded, but importLibrary is unavailable."
            );
          }

          resolve(window.google);
        })
        .catch(reject);
    }
  );

  return googleMapsPromise;
}

/*
==============================================================
HELPERS
==============================================================
*/

function normalizeLocation(location) {
  if (!location) {
    return {
      name: "",
      lat: null,
      lon: null,
    };
  }

  return {
    name:
      location.name ||
      location.formattedAddress ||
      location.address ||
      "",

    lat:
      location.lat ??
      location.latitude ??
      location.location?.lat ??
      null,

    lon:
      location.lon ??
      location.lng ??
      location.longitude ??
      location.location?.lng ??
      null,
  };
}

function formatDistance(meters) {
  if (
    meters === null ||
    meters === undefined ||
    !Number.isFinite(meters)
  ) {
    return null;
  }

  const km = meters / 1000;

  if (km < 1) {
    return `${Math.round(meters)} m`;
  }

  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}

function formatDuration(milliseconds) {
  if (
    milliseconds === null ||
    milliseconds === undefined ||
    !Number.isFinite(milliseconds)
  ) {
    return null;
  }

  const totalMinutes = Math.round(
    milliseconds / 60000
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

/*
==============================================================
COMPONENT
==============================================================
*/

export default function LocationPicker({
  label,
  value,
  placeholder,
  allowCurrentLocation = false,
  onLocationSelect,

  /*
   * Optional service-area configuration.
   *
   * If these aren't provided, the component still works.
   */
  serviceCenter = {
    lat: 26.4499,
    lon: 80.3319,
    name: "Kanpur",
  },

  serviceRadiusKm = 200,
}) {
  const mapRef =
    useRef(null);

  const mapInstanceRef =
    useRef(null);

  const markerRef =
    useRef(null);

  const autocompleteRef =
    useRef(null);

  const routePolylineRef =
    useRef([]);

  const selectedLocationRef =
    useRef({
      name: value || "",
      lat: null,
      lon: null,
    });

  const routeRequestIdRef =
    useRef(0);

  const [isGoogleReady, setIsGoogleReady] =
    useState(false);

  const [googleError, setGoogleError] =
    useState("");

  const [searchValue, setSearchValue] =
    useState(value || "");

  const [selectedLocation, setSelectedLocation] =
    useState({
      name: value || "",
      lat: null,
      lon: null,
    });

  const [isRouting, setIsRouting] =
    useState(false);

  const [routeDistance, setRouteDistance] =
    useState(null);

  const [routeDuration, setRouteDuration] =
    useState(null);

  const [routeError, setRouteError] =
    useState("");

  const [serviceDistance, setServiceDistance] =
    useState(null);

  const [serviceAreaStatus, setServiceAreaStatus] =
    useState(null);

  /*
  ============================================================
  SYNC VALUE FROM PARENT
  ============================================================
  */

  useEffect(() => {
    setSearchValue(value || "");

    if (
      value &&
      value !== selectedLocation.name
    ) {
      setSelectedLocation(
        (previous) => ({
          ...previous,
          name: value,
        })
      );
    }
  }, [value]);

  /*
  ============================================================
  LOAD GOOGLE MAPS
  ============================================================
  */

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setIsGoogleReady(true);
        }
      })
      .catch((error) => {
        console.error(
          "VOYNU Google Maps error:",
          error
        );

        if (!cancelled) {
          setGoogleError(
            error?.message ||
              "Unable to load Google Maps."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  ============================================================
  CALCULATE SERVICE CENTER DISTANCE
  ============================================================
  */

  const calculateServiceDistance =
    useCallback(
      (lat, lng) => {
        if (
          lat === null ||
          lng === null ||
          lat === undefined ||
          lng === undefined
        ) {
          return;
        }

        if (
          serviceCenter?.lat ===
            null ||
          serviceCenter?.lon ===
            null ||
          serviceCenter?.lat ===
            undefined ||
          serviceCenter?.lon ===
            undefined
        ) {
          return;
        }

        const toRadians = (
          number
        ) =>
          (number * Math.PI) /
          180;

        const earthRadiusKm =
          6371;

        const dLat =
          toRadians(
            lat -
              serviceCenter.lat
          );

        const dLon =
          toRadians(
            lng -
              serviceCenter.lon
          );

        const a =
          Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +
          Math.cos(
            toRadians(
              serviceCenter.lat
            )
          ) *
            Math.cos(
              toRadians(lat)
            ) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c =
          2 *
          Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
          );

        const distance =
          earthRadiusKm * c;

        setServiceDistance(
          distance
        );

        setServiceAreaStatus(
          distance <=
            serviceRadiusKm
            ? "inside"
            : "outside"
        );

        return distance;
      },
      [
        serviceCenter?.lat,
        serviceCenter?.lon,
        serviceRadiusKm,
      ]
    );

  /*
  ============================================================
  CLEAR ROUTE
  ============================================================
  */

  const clearRoute =
    useCallback(() => {
      routePolylineRef.current.forEach(
        (polyline) => {
          if (
            polyline &&
            typeof polyline.setMap ===
              "function"
          ) {
            polyline.setMap(null);
          }
        }
      );

      routePolylineRef.current =
        [];

      setRouteDistance(null);
      setRouteDuration(null);
      setRouteError("");
    }, []);

  /*
  ============================================================
  CALCULATE ROAD ROUTE
  ============================================================
  */

  const calculateRoadRoute =
    useCallback(
      async (
        origin,
        destination
      ) => {
        /*
         * Both coordinates are mandatory.
         */
        if (
          !origin ||
          !destination
        ) {
          clearRoute();
          return;
        }

        if (
          origin.lat === null ||
          origin.lon === null ||
          destination.lat ===
            null ||
          destination.lon ===
            null
        ) {
          clearRoute();
          return;
        }

        if (
          origin.lat ===
            undefined ||
          origin.lon ===
            undefined ||
          destination.lat ===
            undefined ||
          destination.lon ===
            undefined
        ) {
          clearRoute();
          return;
        }

        const requestId =
          ++routeRequestIdRef.current;

        setIsRouting(true);
        setRouteError("");

        try {
          /*
           * Make sure Maps is loaded.
           */
          await loadGoogleMaps();

          /*
           * Load the current Routes library.
           *
           * This is the modern replacement for
           * DirectionsService.
           */
          const {
            Route,
          } =
            await window.google.maps.importLibrary(
              "routes"
            );

          /*
           * Build the route request.
           *
           * We use coordinates rather than address
           * strings because our LocationPicker already
           * has exact latitude/longitude values.
           */
          const request = {
            origin: {
              lat: Number(
                origin.lat
              ),
              lng: Number(
                origin.lon
              ),
            },

            destination: {
              lat: Number(
                destination.lat
              ),
              lng: Number(
                destination.lon
              ),
            },

            travelMode:
              "DRIVING",

            routingPreference:
              "TRAFFIC_UNAWARE",

            units: "METRIC",

            /*
             * Required response field mask.
             */
            fields: [
              "distanceMeters",
              "durationMillis",
              "path",
              "viewport",
            ],
          };

          console.log(
            "VOYNU route request:",
            request
          );

          const result =
            await Route.computeRoutes(
              request
            );

          /*
           * Ignore an older request if the user
           * changed the location while routing.
           */
          if (
            requestId !==
            routeRequestIdRef.current
          ) {
            return;
          }

          const routes =
            result?.routes || [];

          if (!routes.length) {
            throw new Error(
              "No driving route was found between these locations."
            );
          }

          const route =
            routes[0];

          /*
           * Route distance.
           */
          const distanceMeters =
            route.distanceMeters;

          /*
           * Route duration.
           */
          const durationMillis =
            route.durationMillis;

          if (
            !Number.isFinite(
              distanceMeters
            )
          ) {
            throw new Error(
              "Google did not return a road distance."
            );
          }

          setRouteDistance(
            distanceMeters
          );

          setRouteDuration(
            Number.isFinite(
              durationMillis
            )
              ? durationMillis
              : null
          );

          /*
           * Draw the actual driving route
           * on the map.
           */
          if (
            mapInstanceRef.current &&
            typeof route.createPolylines ===
              "function"
          ) {
            /*
             * Remove previous route.
             */
            routePolylineRef.current.forEach(
              (polyline) => {
                polyline.setMap(null);
              }
            );

            routePolylineRef.current =
              [];

            const polylines =
              route.createPolylines();

            polylines.forEach(
              (polyline) => {
                polyline.setMap(
                  mapInstanceRef.current
                );

                routePolylineRef.current.push(
                  polyline
                );
              }
            );

            /*
             * Fit the map around the route.
             */
            if (route.viewport) {
              mapInstanceRef.current.fitBounds(
                route.viewport
              );
            }
          }

          console.log(
            "VOYNU road distance:",
            distanceMeters,
            "meters"
          );

          console.log(
            "VOYNU driving duration:",
            durationMillis,
            "milliseconds"
          );
        } catch (error) {
          console.error(
            "VOYNU route calculation failed:",
            error
          );

          if (
            requestId ===
            routeRequestIdRef.current
          ) {
            setRouteDistance(
              null
            );

            setRouteDuration(
              null
            );

            setRouteError(
              error?.message ||
                "Unable to calculate road distance."
            );
          }
        } finally {
          if (
            requestId ===
            routeRequestIdRef.current
          ) {
            setIsRouting(false);
          }
        }
      },
      [clearRoute]
    );

  /*
  ============================================================
  CREATE / INITIALIZE MAP
  ============================================================
  */

  useEffect(() => {
    if (
      !isGoogleReady ||
      !mapRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }

    let cancelled = false;

    async function initializeMap() {
      try {
        const [
          mapsLibrary,
          markerLibrary,
        ] =
          await Promise.all([
            window.google.maps.importLibrary(
              "maps"
            ),

            window.google.maps.importLibrary(
              "marker"
            ),
          ]);

        if (cancelled) {
          return;
        }

        const Map =
          mapsLibrary.Map;

        const AdvancedMarkerElement =
          markerLibrary.AdvancedMarkerElement;

        /*
         * Default center: Kanpur.
         */
        const defaultCenter = {
          lat:
            serviceCenter?.lat ??
            26.4499,

          lng:
            serviceCenter?.lon ??
            80.3319,
        };

        const map =
          new Map(
            mapRef.current,
            {
              center:
                defaultCenter,

              zoom: 12,

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                false,

              mapId:
                "DEMO_MAP_ID",
            }
          );

        mapInstanceRef.current =
          map;

        /*
         * Create marker.
         */
        const marker =
          new AdvancedMarkerElement(
            {
              map,

              position:
                defaultCenter,

              gmpDraggable:
                true,
            }
          );

        markerRef.current =
          marker;

        /*
         * Map click:
         * move pin to clicked location.
         */
        map.addListener(
          "click",
          (event) => {
            if (
              !event.latLng
            ) {
              return;
            }

            const lat =
              event.latLng.lat();

            const lng =
              event.latLng.lng();

            marker.position =
              {
                lat,
                lng,
              };

            updateLocationFromCoordinates(
              lat,
              lng,
              "Map location"
            );
          }
        );

        /*
         * Drag marker:
         * reverse geocode the new position.
         */
        marker.addListener(
          "dragend",
          () => {
            const position =
              marker.position;

            if (!position) {
              return;
            }

            const lat =
              typeof position.lat ===
              "function"
                ? position.lat()
                : position.lat;

            const lng =
              typeof position.lng ===
              "function"
                ? position.lng()
                : position.lng;

            updateLocationFromCoordinates(
              lat,
              lng,
              "Selected location"
            );
          }
        );

        /*
         * Places autocomplete.
         */
        const {
          Autocomplete,
        } =
          await window.google.maps.importLibrary(
            "places"
          );

        const input =
          document.getElementById(
            `voynu-location-search-${label
              ?.toLowerCase()
              .replace(
                /[^a-z0-9]+/g,
                "-"
              )}`
          );

        if (input) {
          const autocomplete =
            new Autocomplete(
              input,
              {
                fields: [
                  "formatted_address",
                  "geometry",
                  "name",
                  "place_id",
                ],

                componentRestrictions:
                  {
                    country:
                      "in",
                  },
              }
            );

          autocompleteRef.current =
            autocomplete;

          autocomplete.addListener(
            "place_changed",
            () => {
              const place =
                autocomplete.getPlace();

              if (
                !place?.geometry
                  ?.location
              ) {
                return;
              }

              const lat =
                place.geometry.location.lat();

              const lng =
                place.geometry.location.lng();

              const name =
                place.formatted_address ||
                place.name ||
                "";

              marker.position =
                {
                  lat,
                  lng,
                };

              map.setCenter({
                lat,
                lng,
              });

              map.setZoom(
                15
              );

              updateSelectedLocation(
                {
                  name,
                  lat,
                  lon: lng,
                }
              );
            }
          );
        }
      } catch (error) {
        console.error(
          "VOYNU map initialization failed:",
          error
        );

        if (!cancelled) {
          setGoogleError(
            error?.message ||
              "Unable to initialize Google Maps."
          );
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [
    isGoogleReady,
    label,
    serviceCenter?.lat,
    serviceCenter?.lon,
  ]);

  /*
  ============================================================
  UPDATE LOCATION
  ============================================================
  */

  const updateSelectedLocation =
    useCallback(
      (location) => {
        const normalized =
          normalizeLocation(
            location
          );

        selectedLocationRef.current =
          normalized;

        setSelectedLocation(
          normalized
        );

        setSearchValue(
          normalized.name
        );

        /*
         * Calculate distance from Kanpur.
         */
        calculateServiceDistance(
          normalized.lat,
          normalized.lon
        );

        /*
         * Tell HomePage about this location.
         */
        if (
          typeof onLocationSelect ===
          "function"
        ) {
          onLocationSelect(
            normalized
          );
        }
      },
      [
        calculateServiceDistance,
        onLocationSelect,
      ]
    );

  /*
  ============================================================
  REVERSE GEOCODING
  ============================================================
  */

  const updateLocationFromCoordinates =
    useCallback(
      async (
        lat,
        lng,
        fallbackName
      ) => {
        try {
          await loadGoogleMaps();

          const {
            Geocoder,
          } =
            await window.google.maps.importLibrary(
              "geocoding"
            );

          const geocoder =
            new Geocoder();

          const response =
            await geocoder.geocode(
              {
                location: {
                  lat,
                  lng,
                },
              }
            );

          const result =
            response?.results?.[0];

          const name =
            result?.formatted_address ||
            fallbackName ||
            `${lat.toFixed(
              6
            )}, ${lng.toFixed(
              6
            )}`;

          updateSelectedLocation(
            {
              name,
              lat,
              lon: lng,
            }
          );
        } catch (error) {
          console.error(
            "VOYNU reverse geocoding failed:",
            error
          );

          updateSelectedLocation(
            {
              name:
                fallbackName ||
                `${lat.toFixed(
                  6
                )}, ${lng.toFixed(
                  6
                )}`,

              lat,
              lon: lng,
            }
          );
        }
      },
      [
        updateSelectedLocation,
      ]
    );

  /*
  ============================================================
  CALCULATE SERVICE DISTANCE WHEN LOCATION CHANGES
  ============================================================
  */

  useEffect(() => {
    if (
      selectedLocation.lat !==
        null &&
      selectedLocation.lon !==
        null
    ) {
      calculateServiceDistance(
        selectedLocation.lat,
        selectedLocation.lon
      );
    }
  }, [
    selectedLocation.lat,
    selectedLocation.lon,
    calculateServiceDistance,
  ]);

  /*
  ============================================================
  CURRENT LOCATION
  ============================================================
  */

  const handleCurrentLocation =
    async () => {
      if (
        !navigator.geolocation
      ) {
        setGoogleError(
          "Your browser does not support location services."
        );

        return;
      }

      setGoogleError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          if (
            markerRef.current
          ) {
            markerRef.current.position =
              {
                lat,
                lng,
              };
          }

          if (
            mapInstanceRef.current
          ) {
            mapInstanceRef.current.setCenter(
              {
                lat,
                lng,
              }
            );

            mapInstanceRef.current.setZoom(
              16
            );
          }

          await updateLocationFromCoordinates(
            lat,
            lng,
            "Current location"
          );
        },

        (error) => {
          console.error(
            "VOYNU current location error:",
            error
          );

          setGoogleError(
            "Unable to access your current location. Please allow location permission and try again."
          );
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            30000,
        }
      );
    };

  /*
  ============================================================
  MAP SEARCH INPUT CHANGE
  ============================================================
  */

  const handleSearchChange =
    (event) => {
      setSearchValue(
        event.target.value
      );
    };

  /*
  ============================================================
  CLEAR LOCATION
  ============================================================
  */

  const handleClear =
    () => {
      setSearchValue("");

      setSelectedLocation(
        {
          name: "",
          lat: null,
          lon: null,
        }
      );

      selectedLocationRef.current =
        {
          name: "",
          lat: null,
          lon: null,
        };

      setServiceDistance(
        null
      );

      setServiceAreaStatus(
        null
      );

      clearRoute();

      if (
        markerRef.current
      ) {
        markerRef.current.position =
          null;
      }

      if (
        typeof onLocationSelect ===
        "function"
      ) {
        onLocationSelect({
          name: "",
          lat: null,
          lon: null,
        });
      }
    };

  /*
  ============================================================
  EXTERNAL ROUTE TRIGGER
  ============================================================
  IMPORTANT:
  This component calculates a route only when BOTH locations
  are available.

  HomePage will provide the other location through the
  "otherLocation" mechanism below if you add it.

  For the current VOYNU implementation, we also expose
  a DOM event so pickup/drop components can communicate
  without changing your HomePage API.
  ============================================================
  */

  useEffect(() => {
    const handleOtherLocation =
      (event) => {
        const data =
          event?.detail;

        if (
          !data ||
          data.componentId ===
            label
        ) {
          return;
        }

        if (
          !selectedLocation.lat ||
          !selectedLocation.lon ||
          data.lat === null ||
          data.lon === null ||
          data.lat === undefined ||
          data.lon === undefined
        ) {
          return;
        }

        calculateRoadRoute(
          {
            lat:
              label
                ?.toLowerCase()
                .includes(
                  "pickup"
                )
                ? selectedLocation.lat
                : data.lat,

            lon:
              label
                ?.toLowerCase()
                .includes(
                  "pickup"
                )
                ? selectedLocation.lon
                : data.lon,
          },

          {
            lat:
              label
                ?.toLowerCase()
                .includes(
                  "pickup"
                )
                ? data.lat
                : selectedLocation.lat,

            lon:
              label
                ?.toLowerCase()
                .includes(
                  "pickup"
                )
                ? data.lon
                : selectedLocation.lon,
          }
        );
      };

    window.addEventListener(
      "voynu-location-updated",
      handleOtherLocation
    );

    return () => {
      window.removeEventListener(
        "voynu-location-updated",
        handleOtherLocation
      );
    };
  }, [
    calculateRoadRoute,
    label,
    selectedLocation.lat,
    selectedLocation.lon,
  ]);

  /*
  ============================================================
  BROADCAST LOCATION CHANGE
  ============================================================
  */

  useEffect(() => {
    if (
      selectedLocation.lat ===
        null ||
      selectedLocation.lon ===
        null
    ) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "voynu-location-updated",
        {
          detail: {
            componentId:
              label,

            lat:
              selectedLocation.lat,

            lon:
              selectedLocation.lon,

            name:
              selectedLocation.name,
          },
        }
      )
    );
  }, [
    label,
    selectedLocation.lat,
    selectedLocation.lon,
    selectedLocation.name,
  ]);

  /*
  ============================================================
  UI VALUES
  ============================================================
  */

  const hasLocation =
    selectedLocation.lat !==
      null &&
    selectedLocation.lon !==
      null;

  const isPickup =
    label
      ?.toLowerCase()
      .includes("pickup");

  /*
  ============================================================
  RENDER
  ============================================================
  */

  return (
    <div className="locationPicker">

      <label className="locationLabel">
        {label}
      </label>

      {/* CURRENT LOCATION */}

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocationButton"
          onClick={
            handleCurrentLocation
          }
        >
          <span className="currentLocationIcon">
            ◎
          </span>

          <span>
            Use my current location
          </span>
        </button>
      )}

      {/* SEARCH */}

      <div className="searchWrapper">

        <span className="searchPin">
          📍
        </span>

        <input
          id={`voynu-location-search-${label
            ?.toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )}`}
          type="text"
          value={
            searchValue
          }
          onChange={
            handleSearchChange
          }
          placeholder={
            placeholder ||
            "Search location"
          }
          autoComplete="off"
        />

        {searchValue && (
          <button
            type="button"
            className="clearButton"
            onClick={
              handleClear
            }
            aria-label="Clear location"
          >
            ×
          </button>
        )}

      </div>

      {/* MAP */}

      <div
        className="mapContainer"
        ref={mapRef}
      >
        {!isGoogleReady &&
          !googleError && (
            <div className="mapLoading">
              Loading map...
            </div>
          )}

        {googleError && (
          <div className="mapError">
            {googleError}
          </div>
        )}

        {isGoogleReady &&
          !googleError && (
            <div className="mapHint">
              Tap map or drag pin to adjust
            </div>
          )}
      </div>

      {/* HELP TEXT */}

      <div className="helpText">
        Search for a place, building,
        address or landmark.
        <br />
        You can also tap the map or
        drag the pin to fine-tune the
        location.
      </div>

      {/* SERVICE AREA */}

      {isPickup &&
        serviceDistance !==
          null && (
          <div
            className={
              serviceAreaStatus ===
              "inside"
                ? "serviceMessage inside"
                : "serviceMessage outside"
            }
          >
            <span className="serviceIcon">
              {serviceAreaStatus ===
              "inside"
                ? "✓"
                : "!"}
            </span>

            <span>
              {serviceAreaStatus ===
              "inside"
                ? (
                  <>
                    Pickup is{" "}
                    <strong>
                      {serviceDistance.toFixed(
                        1
                      )}{" "}
                      km
                    </strong>{" "}
                    from{" "}
                    {serviceCenter.name ||
                      "our service center"}{" "}
                    and is within our{" "}
                    <strong>
                      {
                        serviceRadiusKm
                      }{" "}
                      km
                    </strong>{" "}
                    service area.
                  </>
                )
                : (
                  <>
                    Pickup is{" "}
                    <strong>
                      {serviceDistance.toFixed(
                        1
                      )}{" "}
                      km
                    </strong>{" "}
                    from{" "}
                    {serviceCenter.name ||
                      "our service center"}{" "}
                    and is outside our{" "}
                    <strong>
                      {
                        serviceRadiusKm
                      }{" "}
                      km
                    </strong>{" "}
                    service area.
                  </>
                )}
            </span>
          </div>
        )}

      {/* JOURNEY DISTANCE */}

      {!isPickup &&
        hasLocation && (
          <div className="journeyDistance">

            <div className="journeyIcon">
              🚕
            </div>

            <div className="journeyContent">

              <div className="journeyTitle">
                JOURNEY DISTANCE
              </div>

              {isRouting ? (
                <div className="journeyValue">
                  Calculating driving
                  distance...
                </div>
              ) : routeDistance !==
                null ? (
                <>
                  <div className="journeyValue">
                    {formatDistance(
                      routeDistance
                    )}
                  </div>

                  {routeDuration !==
                    null && (
                    <div className="journeyDuration">
                      Approx.{" "}
                      {formatDuration(
                        routeDuration
                      )}{" "}
                      driving time
                    </div>
                  )}
                </>
              ) : (
                <div className="journeyValue">
                  {routeError ||
                    "Select both locations to calculate road distance."}
                </div>
              )}

            </div>

          </div>
        )}

      {/* ROUTE ERROR */}

      {routeError &&
        !isRouting &&
        hasLocation && (
          <div className="routeError">
            {routeError}
          </div>
        )}

      <style jsx>{`

        .locationPicker {
          width: 100%;
        }

        .locationLabel {
          display: block;

          margin-bottom: 10px;

          color: #52635a;

          font-size: 13px;

          font-weight: 800;
        }

        .currentLocationButton {
          width: 100%;

          min-height: 54px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;

          margin-bottom: 14px;

          border: 1px solid #cfe2d5;

          border-radius: 14px;

          background: #f0f8f3;

          color: #28794f;

          font-family: inherit;

          font-size: 14px;

          font-weight: 800;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .currentLocationButton:hover {
          background: #e7f4eb;

          border-color: #bcd7c5;

          transform: translateY(
            -1px
          );
        }

        .currentLocationIcon {
          font-size: 20px;

          font-weight: 900;
        }

        .searchWrapper {
          position: relative;

          width: 100%;

          min-height: 62px;

          display: flex;

          align-items: center;

          border: 1px solid #d8e1dc;

          border-radius: 15px;

          background: #ffffff;

          overflow: hidden;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .searchWrapper:focus-within {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px
              rgba(
                8,
                120,
                63,
                0.08
              );
        }

        .searchPin {
          flex: 0 0 auto;

          margin-left: 18px;

          margin-right: 12px;

          font-size: 18px;
        }

        .searchWrapper input {
          width: 100%;

          min-width: 0;

          height: 60px;

          padding: 0 52px 0 0;

          border: 0;

          outline: none;

          background: transparent;

          color: #26372f;

          font-family: inherit;

          font-size: 16px;
        }

        .searchWrapper input::placeholder {
          color: #9aa69f;
        }

        .clearButton {
          position: absolute;

          right: 12px;

          top: 50%;

          transform: translateY(
            -50%
          );

          width: 42px;

          height: 42px;

          display: flex;

          align-items: center;

          justify-content: center;

          border: 0;

          border-radius: 50%;

          background: #f0f2f1;

          color: #65726c;

          font-size: 28px;

          line-height: 1;

          cursor: pointer;
        }

        .clearButton:hover {
          background: #e6eae8;
        }

        .mapContainer {
          position: relative;

          width: 100%;

          height: 500px;

          margin-top: 14px;

          border: 1px solid #dce4df;

          border-radius: 16px;

          overflow: hidden;

          background: #edf2ef;
        }

        .mapLoading,
        .mapError {
          position: absolute;

          inset: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 20px;

          text-align: center;

          color: #64746b;

          font-size: 13px;

          background: #f3f7f4;

          z-index: 2;
        }

        .mapError {
          color: #b33d34;

          background: #fff5f3;
        }

        .mapHint {
          position: absolute;

          left: 50%;

          bottom: 14px;

          transform: translateX(
            -50%
          );

          z-index: 5;

          padding: 9px 15px;

          border-radius: 30px;

          background: rgba(
            255,
            255,
            255,
            0.94
          );

          box-shadow:
            0 5px 20px
              rgba(
                0,
                0,
                0,
                0.08
              );

          color: #5c6962;

          font-size: 12px;

          font-weight: 700;

          white-space: nowrap;

          pointer-events: none;
        }

        .helpText {
          margin-top: 12px;

          color: #78867f;

          font-size: 12px;

          line-height: 1.6;
        }

        .serviceMessage {
          display: flex;

          align-items: flex-start;

          gap: 11px;

          margin-top: 18px;

          padding: 14px 16px;

          border: 1px solid;

          border-radius: 14px;

          font-size: 13px;

          line-height: 1.55;
        }

        .serviceMessage.inside {
          border-color: #cde3d4;

          background: #eff9f2;

          color: #3e7658;
        }

        .serviceMessage.outside {
          border-color: #efccc8;

          background: #fff5f3;

          color: #ad4038;
        }

        .serviceIcon {
          width: 32px;

          height: 32px;

          flex: 0 0 32px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          color: #ffffff;

          font-size: 15px;

          font-weight: 900;

          background: #08783f;
        }

        .outside
          .serviceIcon {
          background: #c64a3f;
        }

        .journeyDistance {
          display: flex;

          align-items: center;

          gap: 12px;

          margin-top: 18px;

          padding: 15px 16px;

          border: 1px solid #d8e9de;

          border-radius: 14px;

          background: #f4faf6;
        }

        .journeyIcon {
          width: 43px;

          height: 43px;

          flex: 0 0 43px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 13px;

          background: #e5f4e9;

          font-size: 21px;
        }

        .journeyContent {
          min-width: 0;
        }

        .journeyTitle {
          color: #6b7b72;

          font-size: 10px;

          font-weight: 900;

          letter-spacing: 0.7px;
        }

        .journeyValue {
          margin-top: 3px;

          color: #6a776f;

          font-size: 13px;

          font-weight: 600;

          line-height: 1.4;
        }

        .journeyDistance
          .journeyValue {
          color: #28794f;

          font-size: 18px;

          font-weight: 900;
        }

        .journeyDuration {
          margin-top: 2px;

          color: #74837b;

          font-size: 11px;
        }

        .routeError {
          margin-top: 10px;

          padding: 10px 12px;

          border-radius: 10px;

          background: #fff5f3;

          color: #b33d34;

          font-size: 11px;

          line-height: 1.5;
        }

        @media (
          max-width: 700px
        ) {
          .mapContainer {
            height: 500px;
          }

          .searchWrapper input {
            font-size: 15px;
          }

          .mapHint {
            font-size: 11px;

            padding: 8px 12px;
          }

          .journeyDistance {
            padding: 14px;
          }
        }

      `}</style>
    </div>
  );
  }
