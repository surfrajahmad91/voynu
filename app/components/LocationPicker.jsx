"use client";

import { useEffect, useRef, useState } from "react";

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.")
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-google-maps-loader="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps?.importLibrary) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps loaded, but importLibrary is unavailable."
            )
          );
        }
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Google Maps."));
      });

      return;
    }

    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=weekly&loading=async`;

    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "true";

    script.onload = () => {
      if (window.google?.maps?.importLibrary) {
        resolve(window.google.maps);
      } else {
        reject(
          new Error(
            "Google Maps loaded, but importLibrary is unavailable."
          )
        );
      }
    };

    script.onerror = () => {
      reject(
        new Error(
          "Unable to load Google Maps. Check your API key and API restrictions."
        )
      );
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function LocationPicker({
  label,
  value,
  placeholder,
  onLocationSelect,
  allowCurrentLocation = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  /*
   * Load Google Maps
   */
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setMapReady(true);
        }
      })
      .catch((err) => {
        console.error("Google Maps loading error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load Google Maps."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Initialize Google Map
   */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    let cancelled = false;

    const initializeMap = async () => {
      try {
        const google = window.google;

        const [{ Map }, { AdvancedMarkerElement }] =
          await Promise.all([
            google.maps.importLibrary("maps"),
            google.maps.importLibrary("marker"),
          ]);

        if (cancelled || !mapRef.current) {
          return;
        }

        const map = new Map(mapRef.current, {
          center: {
            lat: 26.4499,
            lng: 80.3319,
          },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: "DEMO_MAP_ID",
        });

        mapInstanceRef.current = map;

        /*
         * Click anywhere on map
         */
        map.addListener("click", async (event) => {
          if (!event.latLng) return;

          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          await selectCoordinates(lat, lng);
        });

        /*
         * Google Maps sometimes needs an extra resize
         * after the component becomes visible.
         */
        setTimeout(() => {
          if (mapInstanceRef.current) {
            window.google.maps.event.trigger(
              mapInstanceRef.current,
              "resize"
            );
          }
        }, 300);
      } catch (err) {
        console.error("Google Maps initialization error:", err);

        if (!cancelled) {
          setError(
            "Unable to initialize Google Maps."
          );
        }
      }
    };

    initializeMap();

    return () => {
      cancelled = true;

      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }

      mapInstanceRef.current = null;
    };
  }, [mapReady]);

  /*
   * Google Places Autocomplete
   */
  useEffect(() => {
    if (!mapReady) return;

    let cancelled = false;

    const setupAutocomplete = async () => {
      try {
        const google = window.google;

        const { PlaceAutocompleteElement } =
          await google.maps.importLibrary("places");

        if (cancelled) return;

        const inputContainer = document.getElementById(
          "google-place-autocomplete-container"
        );

        if (!inputContainer) return;

        inputContainer.innerHTML = "";

        const autocomplete =
          new PlaceAutocompleteElement();

        autocomplete.placeholder =
          placeholder || "Search for a place";

        /*
         * Restrict suggestions to India
         */
        autocomplete.includedRegionCodes = ["in"];

        inputContainer.appendChild(autocomplete);

        autocomplete.addEventListener(
          "gmp-select",
          async ({ placePrediction }) => {
            try {
              setLoading(true);
              setError("");

              const place =
                placePrediction.toPlace();

              await place.fetchFields({
                fields: [
                  "displayName",
                  "formattedAddress",
                  "location",
                ],
              });

              if (!place.location) {
                throw new Error(
                  "This location does not have coordinates."
                );
              }

              const lat = place.location.lat();
              const lng = place.location.lng();

              const name =
                place.formattedAddress ||
                place.displayName ||
                "Selected location";

              await selectCoordinates(
                lat,
                lng,
                name
              );
            } catch (err) {
              console.error(
                "Place selection error:",
                err
              );

              setError(
                "Unable to select this location."
              );
            } finally {
              setLoading(false);
            }
          }
        );

        autocompleteRef.current = autocomplete;
      } catch (err) {
        console.error(
          "Places autocomplete error:",
          err
        );

        setError(
          "Unable to load location search."
        );
      }
    };

    setupAutocomplete();

    return () => {
      cancelled = true;

      const container = document.getElementById(
        "google-place-autocomplete-container"
      );

      if (container) {
        container.innerHTML = "";
      }

      autocompleteRef.current = null;
    };
  }, [mapReady, placeholder]);

  /*
   * Select coordinates
   */
  const selectCoordinates = async (
    lat,
    lng,
    name = ""
  ) => {
    if (!mapInstanceRef.current || !window.google) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const google = window.google;

      const { AdvancedMarkerElement } =
        await google.maps.importLibrary("marker");

      /*
       * Remove old marker
       */
      if (markerRef.current) {
        markerRef.current.map = null;
      }

      /*
       * Create marker
       */
      markerRef.current =
        new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: {
            lat,
            lng,
          },
          title: name || "Selected location",
        });

      /*
       * Move map
       */
      mapInstanceRef.current.setCenter({
        lat,
        lng,
      });

      mapInstanceRef.current.setZoom(15);

      let locationName = name;

      /*
       * Reverse geocode when selecting directly
       * on the map/current location.
       */
      if (!locationName) {
        const { Geocoder } =
          await google.maps.importLibrary(
            "geocoding"
          );

        const geocoder = new Geocoder();

        const response =
          await geocoder.geocode({
            location: {
              lat,
              lng,
            },
          });

        if (
          response.results &&
          response.results.length > 0
        ) {
          locationName =
            response.results[0].formatted_address;
        }
      }

      if (!locationName) {
        locationName =
          `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      setQuery(locationName);

      onLocationSelect({
        name: locationName,
        lat,
        lon: lng,
      });
    } catch (err) {
      console.error(
        "Location selection error:",
        err
      );

      setError(
        "Unable to determine this location."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Current location
   */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        await selectCoordinates(
          latitude,
          longitude
        );

        setLoading(false);
      },
      (err) => {
        console.error(
          "Geolocation error:",
          err
        );

        setError(
          "Unable to get your current location. Please allow location access."
        );

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="locationPicker">
      <div className="locationHeader">
        <span>{label}</span>
      </div>

      {/* Google Places search */}
      <div
        id="google-place-autocomplete-container"
        className="googleSearch"
      />

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocation"
          onClick={useCurrentLocation}
          disabled={loading}
        >
          📍{" "}
          {loading
            ? "Finding your location..."
            : "Use my current location"}
        </button>
      )}

      <div
        ref={mapRef}
        className="locationMap"
      />

      {error && (
        <div className="locationError">
          ⚠️ {error}
        </div>
      )}

      <p className="locationHelp">
        📍 Search for a place, building,
        address or landmark, or tap the map to
        select an exact location.
      </p>

      <style jsx>{`
        .locationPicker {
          width: 100%;
          position: relative;
        }

        .locationHeader {
          margin-bottom: 8px;
        }

        .locationHeader span {
          font-size: 13px;
          font-weight: 700;
          color: #52625a;
        }

        .googleSearch {
          width: 100%;
        }

        .googleSearch :global(gmp-place-autocomplete) {
          width: 100%;
        }

        .googleSearch :global(input) {
          width: 100%;
          min-height: 52px;
          padding: 0 16px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          background: white;
          box-sizing: border-box;
        }

        .googleSearch :global(input:focus) {
          border-color: #08783f;
          box-shadow:
            0 0 0 3px
            rgba(8, 120, 63, 0.1);
        }

        .currentLocation {
          width: 100%;
          margin-top: 10px;
          padding: 14px;
          border-radius: 11px;
          border: 1px solid #cce3d3;
          background: #f1f8f3;
          color: #08783f;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .currentLocation:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .locationMap {
          width: 100%;
          height: 360px;
          margin-top: 12px;
          border-radius: 13px;
          border: 1px solid #d9e1dc;
          overflow: hidden;
          background: #f4f6f5;
        }

        .locationError {
          margin-top: 10px;
          padding: 12px 14px;
          border-radius: 11px;
          background: #fff3f1;
          border: 1px solid #f1c8c3;
          color: #b3342a;
          font-size: 13px;
          line-height: 1.4;
        }

        .locationHelp {
          margin: 10px 0 0;
          color: #65736b;
          font-size: 13px;
          line-height: 1.4;
        }

        @media (max-width: 750px) {
          .locationMap {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
