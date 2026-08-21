"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "voynu-google-maps-script";

let googleMapsPromise = null;

/*
 * ------------------------------------------------------------
 * GOOGLE MAPS LOADER
 *
 * Loads Google Maps JavaScript API once for the entire app.
 *
 * Required by VOYNU:
 *
 * - Places Autocomplete
 * - Geocoder
 * - DirectionsService
 *
 * ------------------------------------------------------------
 */

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Browser environment required.")
    );
  }

  /*
   * Already loaded.
   */
  if (
    window.google?.maps?.places &&
    window.google?.maps?.DirectionsService &&
    window.google?.maps?.Geocoder
  ) {
    return Promise.resolve(window.google.maps);
  }

  /*
   * Loading already in progress.
   */
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured."
      )
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.getElementById(
          GOOGLE_SCRIPT_ID
        );

      /*
       * ------------------------------------------------------
       * SCRIPT ALREADY EXISTS
       * ------------------------------------------------------
       */

      if (existingScript) {
        const checkReady = () => {
          if (
            window.google?.maps?.places &&
            window.google?.maps?.DirectionsService &&
            window.google?.maps?.Geocoder
          ) {
            resolve(window.google.maps);
          } else {
            reject(
              new Error(
                "Google Maps services are unavailable."
              )
            );
          }
        };

        if (window.google?.maps) {
          checkReady();
          return;
        }

        existingScript.addEventListener(
          "load",
          checkReady,
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Google Maps failed to load."
              )
            );
          },
          { once: true }
        );

        return;
      }

      /*
       * ------------------------------------------------------
       * CREATE SCRIPT
       * ------------------------------------------------------
       */

      const script =
        document.createElement("script");

      script.id =
        GOOGLE_SCRIPT_ID;

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&libraries=places&v=weekly`;

      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (
          window.google?.maps?.places &&
          window.google?.maps?.DirectionsService &&
          window.google?.maps?.Geocoder
        ) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps services are unavailable."
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

  /*
   * If loading fails, allow another attempt later.
   */
  googleMapsPromise.catch(() => {
    googleMapsPromise = null;
  });

  return googleMapsPromise;
}

/*
 * ------------------------------------------------------------
 * CITY EXTRACTION
 *
 * Given a Google address_components array, returns the best
 * guess for the city name.
 *
 * Prefers "locality" (city). Falls back to
 * "administrative_area_level_2" (district) for addresses
 * where Google does not return a locality, which happens
 * for some rural/outskirt addresses.
 * ------------------------------------------------------------
 */

function extractCityName(
  addressComponents
) {
  if (
    !Array.isArray(
      addressComponents
    )
  ) {
    return null;
  }

  const locality =
    addressComponents.find(
      (component) =>
        component.types?.includes(
          "locality"
        )
    );

  if (locality?.long_name) {
    return locality.long_name;
  }

  const district =
    addressComponents.find(
      (component) =>
        component.types?.includes(
          "administrative_area_level_2"
        )
    );

  return (
    district?.long_name || null
  );
}

/*
 * ------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------
 */

export default function LocationPicker({
  label,
  value = "",
  placeholder = "Search location",
  allowCurrentLocation = false,
  onLocationSelect,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);

  const [mapsReady, setMapsReady] =
    useState(false);

  const [error, setError] =
    useState("");

  const [locating, setLocating] =
    useState(false);

  /*
   * ------------------------------------------------------------
   * LOAD GOOGLE MAPS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
        }
      })
      .catch((err) => {
        console.error(
          "VOYNU Google Maps error:",
          err
        );

        if (!cancelled) {
          setError(
            "Location search is temporarily unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * KEEP INPUT VALUE IN SYNC
   *
   * LocationPicker is intentionally using an uncontrolled
   * input because Google Autocomplete modifies the input.
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      inputRef.current &&
      typeof value === "string" &&
      value !== inputRef.current.value
    ) {
      inputRef.current.value = value;
    }
  }, [value]);

  /*
   * ------------------------------------------------------------
   * GOOGLE PLACES AUTOCOMPLETE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      !mapsReady ||
      !inputRef.current ||
      !window.google?.maps?.places
    ) {
      return;
    }

    /*
     * Prevent duplicate autocomplete instances.
     */
    if (autocompleteRef.current) {
      return;
    }

    const autocomplete =
      new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: [
            "formatted_address",
            "geometry",
            "name",
            "place_id",
            "address_components",
          ],

          componentRestrictions: {
            country: "in",
          },

          types: [
            "geocode",
            "establishment",
          ],
        }
      );

    autocompleteRef.current =
      autocomplete;

    const listener =
      autocomplete.addListener(
        "place_changed",
        () => {
          const place =
            autocomplete.getPlace();

          const location =
            place?.geometry?.location;

          /*
           * User typed something but didn't actually
           * select a Google suggestion.
           */
          if (!location) {
            setError(
              "Please select a location from the suggested locations."
            );

            return;
          }

          const lat =
            location.lat();

          const lon =
            location.lng();

          const name =
            place.formatted_address ||
            place.name ||
            "";

          const city =
            extractCityName(
              place.address_components
            );

          setError("");

          /*
           * IMPORTANT:
           * These are the exact keys expected by page.js.
           */
          onLocationSelect?.({
            name,
            lat,
            lon,
            placeId:
              place.place_id || null,
            city,
          });
        }
      );

    listenerRef.current =
      listener;

    return () => {
      if (listenerRef.current) {
        window.google.maps.event.removeListener(
          listenerRef.current
        );

        listenerRef.current = null;
      }

      autocompleteRef.current =
        null;
    };
  }, [
    mapsReady,
    onLocationSelect,
  ]);

  /*
   * ------------------------------------------------------------
   * CURRENT LOCATION
   * ------------------------------------------------------------
   */

  const useCurrentLocation = () => {
    if (
      !allowCurrentLocation ||
      locating
    ) {
      return;
    }

    setError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setError(
        "Your device does not support location services."
      );

      return;
    }

    if (
      !mapsReady ||
      !window.google?.maps?.Geocoder
    ) {
      setError(
        "Please wait for location services to load."
      );

      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat =
          position.coords.latitude;

        const lon =
          position.coords.longitude;

        const geocoder =
          new window.google.maps.Geocoder();

        geocoder.geocode(
          {
            location: {
              lat,
              lng: lon,
            },
          },
          (results, status) => {
            setLocating(false);

            if (
              status !== "OK" ||
              !results?.length
            ) {
              setError(
                "Unable to determine your current address."
              );

              return;
            }

            const address =
              results[0].formatted_address ||
              "";

            const city =
              extractCityName(
                results[0]
                  .address_components
              );

            if (inputRef.current) {
              inputRef.current.value =
                address;
            }

            setError("");

            onLocationSelect?.({
              name: address,
              lat,
              lon,
              placeId:
                results[0].place_id ||
                null,
              city,
            });
          }
        );
      },

      (geoError) => {
        setLocating(false);

        console.error(
          "VOYNU geolocation error:",
          geoError
        );

        let message =
          "Unable to get your current location.";

        if (
          geoError.code ===
          geoError.PERMISSION_DENIED
        ) {
          message =
            "Location permission was denied. Please allow location access or search manually.";
        } else if (
          geoError.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          message =
            "Your current location is unavailable. Please search manually.";
        } else if (
          geoError.code ===
          geoError.TIMEOUT
        ) {
          message =
            "Location request timed out. Please try again.";
        }

        setError(message);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  /*
   * ------------------------------------------------------------
   * INPUT
   * ------------------------------------------------------------
   */

  const handleInputChange = () => {
    /*
     * IMPORTANT:
     *
     * If the user starts typing after selecting a location,
     * the old coordinates should no longer be considered valid.
     *
     * The parent page will receive a new selection only when
     * the user actually selects a Google suggestion.
     *
     * We therefore only clear the local error here.
     */
    setError("");
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="locationPicker">

      <label className="locationLabel">

        <span className="locationLabelIcon">
          ●
        </span>

        {label}

      </label>

      <div className="inputWrapper">

        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={handleInputChange}
          className="locationInput"
          aria-label={label}
        />

        {allowCurrentLocation && (
          <button
            type="button"
            className="currentLocationButton"
            onClick={useCurrentLocation}
            disabled={
              locating ||
              !mapsReady
            }
            aria-label="Use current location"
            title="Use current location"
          >
            {locating
              ? "..."
              : "⌖"}
          </button>
        )}

      </div>

      {!mapsReady && !error && (
        <div className="locationHint">
          Loading location search...
        </div>
      )}

      {error && (
        <div
          className="locationError"
          role="alert"
        >
          {error}
        </div>
      )}

      <style jsx>{`

        .locationPicker {
          width: 100%;
          min-width: 0;
        }

        .locationLabel {
          display: flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 8px;

          color: #52635a;

          font-size: 12px;
          font-weight: 750;
        }

        .locationLabelIcon {
          color: #08783f;
          font-size: 12px;
        }

        .inputWrapper {
          position: relative;
          width: 100%;
        }

        .locationInput {
          width: 100%;
          height: 53px;

          padding: 0 50px 0 15px;

          border: 1px solid #d9e2dc;
          border-radius: 11px;

          background: #ffffff;
          color: #26372f;

          font-family: inherit;
          font-size: 14px;

          outline: none;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .locationInput::placeholder {
          color: #9aa69f;
        }

        .locationInput:focus {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px
            rgba(8, 120, 63, 0.09);
        }

        .currentLocationButton {
          position: absolute;

          top: 50%;
          right: 9px;

          width: 35px;
          height: 35px;

          transform:
            translateY(-50%);

          display: flex;
          align-items: center;
          justify-content: center;

          border: 0;
          border-radius: 9px;

          background: #eaf6ee;
          color: #08783f;

          font-size: 20px;
          font-weight: 800;

          cursor: pointer;
        }

        .currentLocationButton:hover:not(:disabled) {
          background: #dff1e5;
        }

        .currentLocationButton:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .locationHint {
          margin-top: 5px;

          color: #8b9790;

          font-size: 10px;
        }

        .locationError {
          margin-top: 5px;

          color: #b33d34;

          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 700px) {

          .locationInput {
            height: 52px;
            font-size: 14px;
          }

        }

      `}</style>

    </div>
  );
}
