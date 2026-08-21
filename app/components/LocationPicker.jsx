"use client";

import { useEffect, useRef, useState } from "react";

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps requires a browser.")
    );
  }

  if (window.google?.maps?.places) {
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
        "Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel."
      )
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-voynu-google-maps="true"]'
    );

    if (existingScript) {
      const handleLoad = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps failed to initialize."
            )
          );
        }
      };

      const handleError = () => {
        reject(
          new Error(
            "Unable to load Google Maps."
          )
        );
      };

      existingScript.addEventListener(
        "load",
        handleLoad,
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        handleError,
        { once: true }
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&libraries=places";

    script.async = true;
    script.defer = true;
    script.dataset.voynuGoogleMaps = "true";

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(
          new Error(
            "Google Maps failed to initialize."
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
  allowCurrentLocation = false,
  onLocationSelect,
}) {
  const mapElementRef = useRef(null);
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onLocationSelectRef = useRef(
    onLocationSelect
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedLocation, setSelectedLocation] =
    useState({
      name: value || "",
      lat: null,
      lon: null,
    });

  /*
   * Keep the latest callback without forcing
   * Google Maps to initialize again.
   */
  useEffect(() => {
    onLocationSelectRef.current =
      onLocationSelect;
  }, [onLocationSelect]);

  /*
   * Keep displayed location synchronized
   * with the parent component.
   */
  useEffect(() => {
    setSelectedLocation((current) => ({
      ...current,
      name: value || "",
    }));
  }, [value]);

  /*
   * Initialize Google Maps only once.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const googleMaps =
          await loadGoogleMaps();

        if (cancelled) return;

        if (!mapElementRef.current) {
          return;
        }

        const defaultCenter = {
          lat: 26.4499,
          lng: 80.3319,
        };

        const map =
          new googleMaps.Map(
            mapElementRef.current,
            {
              center: defaultCenter,
              zoom: 11,

              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              clickableIcons: false,

              gestureHandling: "greedy",
            }
          );

        mapRef.current = map;

        /*
         * Google Places Autocomplete.
         */
        if (
          googleMaps.places?.Autocomplete &&
          inputRef.current
        ) {
          const autocomplete =
            new googleMaps.places.Autocomplete(
              inputRef.current,
              {
                fields: [
                  "formatted_address",
                  "geometry",
                  "name",
                ],

                componentRestrictions: {
                  country: "in",
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
                !place.geometry?.location
              ) {
                setError(
                  "Please select a location from the suggestions."
                );
                return;
              }

              const lat =
                place.geometry.location.lat();

              const lng =
                place.geometry.location.lng();

              const locationName =
                place.formatted_address ||
                place.name ||
                inputRef.current?.value ||
                "";

              const location = {
                name: locationName,
                lat,
                lon: lng,
              };

              setSelectedLocation(location);
              setError("");

              map.setCenter({
                lat,
                lng,
              });

              map.setZoom(15);

              setMarker(
                map,
                googleMaps,
                lat,
                lng
              );

              onLocationSelectRef.current?.(
                location
              );
            }
          );
        }

        /*
         * Allow exact location selection
         * directly from the map.
         */
        map.addListener(
          "click",
          (event) => {
            if (!event.latLng) return;

            const lat =
              event.latLng.lat();

            const lng =
              event.latLng.lng();

            setMarker(
              map,
              googleMaps,
              lat,
              lng
            );

            reverseGeocode(
              googleMaps,
              lat,
              lng
            );
          }
        );

        setLoading(false);
      } catch (err) {
        console.error(
          "VOYNU Google Maps error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Google Maps could not be loaded."
          );

          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;

      if (
        autocompleteRef.current
      ) {
        googleMapsSafeClearListeners(
          autocompleteRef.current
        );

        autocompleteRef.current = null;
      }

      if (mapRef.current) {
        googleMapsSafeClearListeners(
          mapRef.current
        );

        mapRef.current = null;
      }

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  const setMarker = (
    map,
    googleMaps,
    lat,
    lng
  ) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current =
      new googleMaps.Marker({
        position: {
          lat,
          lng,
        },
        map,
        animation:
          googleMaps.Animation.DROP,
      });
  };

  const reverseGeocode = async (
    googleMaps,
    lat,
    lng
  ) => {
    try {
      const geocoder =
        new googleMaps.Geocoder();

      const result =
        await new Promise(
          (resolve, reject) => {
            geocoder.geocode(
              {
                location: {
                  lat,
                  lng,
                },
              },
              (
                results,
                status
              ) => {
                if (
                  status === "OK" &&
                  results?.length
                ) {
                  resolve(
                    results[0]
                  );
                } else {
                  reject(
                    new Error(
                      "Unable to identify this location."
                    )
                  );
                }
              }
            );
          }
        );

      const locationName =
        result.formatted_address ||
        `${lat.toFixed(
          6
        )}, ${lng.toFixed(6)}`;

      const location = {
        name: locationName,
        lat,
        lon: lng,
      };

      setSelectedLocation(location);
      setError("");

      if (inputRef.current) {
        inputRef.current.value =
          locationName;
      }

      onLocationSelectRef.current?.(
        location
      );
    } catch (err) {
      console.error(
        "Reverse geocoding failed:",
        err
      );

      const location = {
        name: `${lat.toFixed(
          6
        )}, ${lng.toFixed(6)}`,
        lat,
        lon: lng,
      };

      setSelectedLocation(location);

      onLocationSelectRef.current?.(
        location
      );

      setError(
        "Location selected, but the address could not be identified."
      );
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        try {
          const googleMaps =
            await loadGoogleMaps();

          if (mapRef.current) {
            mapRef.current.setCenter({
              lat,
              lng,
            });

            mapRef.current.setZoom(15);

            setMarker(
              mapRef.current,
              googleMaps,
              lat,
              lng
            );
          }

          await reverseGeocode(
            googleMaps,
            lat,
            lng
          );
        } catch (err) {
          console.error(err);

          setError(
            "Unable to use your current location."
          );
        }
      },
      (err) => {
        console.error(
          "Geolocation error:",
          err
        );

        if (err.code === 1) {
          setError(
            "Location permission was denied. Please allow location access."
          );
        } else if (err.code === 2) {
          setError(
            "Your location could not be determined."
          );
        } else {
          setError(
            "Unable to get your current location."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="picker">
      <label className="pickerLabel">
        {label}
      </label>

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocationButton"
          onClick={useCurrentLocation}
        >
          📍 Use my current location
        </button>
      )}

      <div className="mapWrapper">
        <div
          ref={mapElementRef}
          className="map"
        />

        {loading && (
          <div className="mapOverlay">
            <div className="spinner" />
            <span>
              Loading map...
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mapError">
          ⚠️ {error}
        </div>
      )}

      <div className="searchWrapper">
        <span className="searchIcon">
          📍
        </span>

        <input
          ref={inputRef}
          type="text"
          className="locationInput"
          value={selectedLocation.name}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            setSelectedLocation(
              (current) => ({
                ...current,
                name: event.target.value,
                lat: null,
                lon: null,
              })
            );

            setError("");
          }}
        />
      </div>

      <p className="helpText">
        📍 Search for a place, building,
        address or landmark, or tap the map
        to select an exact location.
      </p>

      <style jsx>{`
        .picker {
          width: 100%;
        }

        .pickerLabel {
          display: block;
          margin-bottom: 8px;
          color: #52625a;
          font-size: 13px;
          font-weight: 700;
        }

        .currentLocationButton {
          width: 100%;
          margin-bottom: 14px;
          padding: 13px 15px;
          border: 1px solid #cce3d3;
          border-radius: 11px;
          background: #f0f8f3;
          color: #08783f;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .currentLocationButton:hover {
          background: #e5f3ea;
        }

        .mapWrapper {
          position: relative;
          width: 100%;
          height: 310px;
          overflow: hidden;
          border: 1px solid #d9e1dc;
          border-radius: 14px;
          background: #f3f5f4;
        }

        .map {
          width: 100%;
          height: 100%;
        }

        .mapOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(
            255,
            255,
            255,
            0.85
          );
          color: #52625a;
          font-size: 13px;
          font-weight: 700;
          z-index: 2;
        }

        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #d9e8de;
          border-top-color: #08783f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .mapError {
          margin-top: 12px;
          padding: 12px 14px;
          border: 1px solid #f1c8c3;
          border-radius: 11px;
          background: #fff3f1;
          color: #b3342a;
          font-size: 13px;
          line-height: 1.45;
        }

        .searchWrapper {
          position: relative;
          margin-top: 12px;
        }

        .searchIcon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          pointer-events: none;
        }

        .locationInput {
          width: 100%;
          padding: 15px 15px 15px 42px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          background: #ffffff;
          color: #26372f;
          font-size: 14px;
          outline: none;
        }

        .locationInput:focus {
          border-color: #08783f;
          box-shadow:
            0 0 0 3px
            rgba(
              8,
              120,
              63,
              0.1
            );
        }

        .helpText {
          margin: 10px 0 0;
          color: #68776f;
          font-size: 13px;
          line-height: 1.45;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .mapWrapper {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}

function googleMapsSafeClearListeners(
  instance
) {
  if (
    typeof window !== "undefined" &&
    window.google?.maps?.event
  ) {
    window.google.maps.event.clearInstanceListeners(
      instance
    );
  }
}
