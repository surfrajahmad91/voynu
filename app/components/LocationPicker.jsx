"use client";

import { useEffect, useRef, useState } from "react";

import {
  loadGoogleMaps,
  extractCityName,
} from "../lib/googleMaps";

import MapLocationPicker from "./MapLocationPicker";

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

  const [mapPickerOpen, setMapPickerOpen] =
    useState(false);

  const [currentCoords, setCurrentCoords] =
    useState({ lat: null, lon: null });

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
          setCurrentCoords({ lat, lon });

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
                `Unable to determine your current address${
                  status
                    ? ` (${status})`
                    : ""
                }. Please search manually or check the Geocoding API is enabled for your Maps key.`
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
            setCurrentCoords({ lat, lon });

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
   * MAP PICKER
   * ------------------------------------------------------------
   */

  const handleMapConfirm = (location) => {
    if (inputRef.current) {
      inputRef.current.value =
        location.name;
    }

    setError("");
    setCurrentCoords({
      lat: location.lat,
      lon: location.lon,
    });

    setMapPickerOpen(false);

    onLocationSelect?.(location);
  };

  /*
   * ------------------------------------------------------------
   * INPUT
   * ------------------------------------------------------------
   */

  const handleInputChange = () => {
    setError("");
  };

  const buttonCount =
    (allowCurrentLocation ? 1 : 0) + 1;

  const inputRightPadding =
    buttonCount === 2 ? 92 : 50;

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
          style={{
            paddingRight:
              `${inputRightPadding}px`,
          }}
          aria-label={label}
        />

        <div className="inputActions">

          <button
            type="button"
            className="actionButton"
            onClick={() =>
              setMapPickerOpen(true)
            }
            disabled={!mapsReady}
            aria-label="Pick location on map"
            title="Pick location on map"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle
                cx="12"
                cy="9.5"
                r="2.4"
              />
            </svg>
          </button>

          {allowCurrentLocation && (
            <button
              type="button"
              className="actionButton"
              onClick={useCurrentLocation}
              disabled={
                locating ||
                !mapsReady
              }
              aria-label="Use current location"
              title="Use current location"
            >
              {locating ? (
                <span className="spinner" />
              ) : (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              )}
            </button>
          )}

        </div>

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

      <MapLocationPicker
        open={mapPickerOpen}
        title={`Choose ${label?.toLowerCase() || "location"}`}
        initialLat={currentCoords.lat}
        initialLon={currentCoords.lon}
        onConfirm={handleMapConfirm}
        onClose={() =>
          setMapPickerOpen(false)
        }
      />

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

          padding: 0 15px;

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

        .inputActions {
          position: absolute;

          top: 50%;
          right: 9px;

          transform: translateY(-50%);

          display: flex;
          gap: 6px;
        }

        .actionButton {
          width: 35px;
          height: 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 0;
          border-radius: 9px;

          background: #eaf6ee;
          color: #08783f;

          cursor: pointer;

          transition: background 0.15s ease;
        }

        .actionButton:hover:not(:disabled) {
          background: #dff1e5;
        }

        .actionButton:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .spinner {
          width: 14px;
          height: 14px;

          border: 2px solid rgba(8, 120, 63, 0.25);
          border-top-color: #08783f;

          border-radius: 50%;

          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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
