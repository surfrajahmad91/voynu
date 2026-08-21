"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "voynu-google-maps-script";

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (
    typeof window === "undefined"
  ) {
    return Promise.reject(
      new Error("Browser environment required.")
    );
  }

  if (
    window.google?.maps?.places
  ) {
    return Promise.resolve(window.google.maps);
  }

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

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(window.google.maps)
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
          window.google?.maps?.places
        ) {
          resolve(
            window.google.maps
          );
        } else {
          reject(
            new Error(
              "Google Places library is unavailable."
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

export default function LocationPicker({
  label,
  value = "",
  placeholder = "Search location",
  allowCurrentLocation = false,
  onLocationSelect,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [mapsReady, setMapsReady] =
    useState(false);

  const [error, setError] =
    useState("");

  const [locating, setLocating] =
    useState(false);

  /* ============================================================
     LOAD GOOGLE MAPS
  ============================================================ */

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

  /* ============================================================
     GOOGLE AUTOCOMPLETE
  ============================================================ */

  useEffect(() => {
    if (
      !mapsReady ||
      !inputRef.current ||
      !window.google?.maps?.places
    ) {
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

          if (!location) {
            setError(
              "Please select a location from the suggestions."
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

          setError("");

          onLocationSelect?.({
            name,
            lat,
            lon,
            placeId:
              place.place_id || null,
          });
        }
      );

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(
          listener
        );
      }

      autocompleteRef.current =
        null;
    };
  }, [
    mapsReady,
    onLocationSelect,
  ]);

  /* ============================================================
     CURRENT LOCATION
  ============================================================ */

  const useCurrentLocation = () => {
    if (
      !allowCurrentLocation ||
      locating
    ) {
      return;
    }

    clearError();

    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      setError(
        "Your device does not support location services."
      );

      return;
    }

    if (!mapsReady) {
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
              results[0]
                .formatted_address || "";

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
        }

        if (
          geoError.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          message =
            "Your current location is unavailable. Please search manually.";
        }

        if (
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

  /* ============================================================
     INPUT CHANGE
  ============================================================ */

  const handleInputChange = (
    event
  ) => {
    clearError();

    /*
     * If the user manually changes
     * the selected address, the previous
     * coordinates are no longer guaranteed
     * to match the text.
     *
     * The parent will receive the correct
     * coordinates once a suggestion is selected.
     */
  };

  const clearError = () => {
    setError("");
  };

  /* ============================================================
     RENDER
  ============================================================ */

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
            onClick={
              useCurrentLocation
            }
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
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .locationInput::placeholder {
          color: #9aa69f;
        }

        .locationInput:focus {
          border-color: #08783f;

          box-shadow:
            0 0 0 3px
              rgba(8,120,63,.09);
        }

        .currentLocationButton {
          position: absolute;

          top: 50%;
          right: 9px;

          width: 35px;
          height: 35px;

          transform: translateY(-50%);

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
          opacity: .55;
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
