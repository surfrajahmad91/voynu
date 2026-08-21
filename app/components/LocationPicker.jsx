"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_SCRIPT_ID = "voynu-google-maps";

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps can only load in the browser."));
      return;
    }

    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps loaded incorrectly."));
        }
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Google Maps."));
      });

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&v=weekly";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps loaded incorrectly."));
      }
    };

    script.onerror = () => {
      reject(
        new Error(
          "Unable to load Google Maps. Check your API key and website restrictions."
        )
      );
    };

    document.head.appendChild(script);
  });
}

export default function LocationPicker({
  label,
  value,
  placeholder = "Search pickup location",
  onLocationSelect,
  allowCurrentLocation = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const mountedRef = useRef(true);

  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep input synchronized with parent.
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Load Google Maps.
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(
        "Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel."
      );
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!cancelled && mountedRef.current) {
          setMapReady(true);
        }
      })
      .catch((err) => {
        console.error("Google Maps loading error:", err);

        if (!cancelled && mountedRef.current) {
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

  // Initialize Google Map.
  useEffect(() => {
    if (
      !mapReady ||
      !mapContainerRef.current ||
      !window.google ||
      !window.google.maps
    ) {
      return;
    }

    if (mapRef.current) {
      return;
    }

    const google = window.google;

    const map = new google.maps.Map(
      mapContainerRef.current,
      {
        center: {
          lat: 26.4499,
          lng: 80.3319,
        },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      }
    );

    const geocoder = new google.maps.Geocoder();

    mapRef.current = map;
    geocoderRef.current = geocoder;

    map.addListener("click", (event) => {
      if (
        event.latLng &&
        typeof event.latLng.lat === "function" &&
        typeof event.latLng.lng === "function"
      ) {
        selectCoordinates(
          event.latLng.lat(),
          event.latLng.lng()
        );
      }
    });

    // If a location already exists, try to display it.
    if (value) {
      geocodeExistingValue(value);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      mapRef.current = null;
      geocoderRef.current = null;
    };
    // Intentionally only initialize once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  const geocodeExistingValue = async (locationValue) => {
    if (!geocoderRef.current || !mapRef.current) {
      return;
    }

    try {
      const response =
        await geocoderRef.current.geocode({
          address: locationValue,
          region: "IN",
        });

      if (
        response.results &&
        response.results.length > 0
      ) {
        const location =
          response.results[0].geometry.location;

        const lat = location.lat();
        const lng = location.lng();

        placeMarker(lat, lng);

        mapRef.current.setCenter({
          lat,
          lng,
        });

        mapRef.current.setZoom(15);
      }
    } catch (err) {
      console.error(
        "Existing location geocoding error:",
        err
      );
    }
  };

  const placeMarker = (lat, lng) => {
    if (!window.google || !window.google.maps) {
      return;
    }

    const google = window.google;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current =
      new google.maps.Marker({
        position: {
          lat,
          lng,
        },
        map: mapRef.current,
        animation:
          google.maps.Animation.DROP,
      });
  };

  const selectCoordinates = async (
    lat,
    lng,
    suppliedName = ""
  ) => {
    if (!mapRef.current) {
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);

    placeMarker(lat, lng);

    mapRef.current.setCenter({
      lat,
      lng,
    });

    mapRef.current.setZoom(16);

    let locationName = suppliedName;

    // Reverse geocode exact coordinates.
    if (!locationName && geocoderRef.current) {
      try {
        const response =
          await geocoderRef.current.geocode({
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
      } catch (err) {
        console.error(
          "Reverse geocoding error:",
          err
        );
      }
    }

    if (!locationName) {
      locationName =
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    if (!mountedRef.current) {
      return;
    }

    setQuery(locationName);
    setLoading(false);

    if (onLocationSelect) {
      onLocationSelect({
        name: locationName,
        lat,
        lon: lng,
        lng,
      });
    }
  };

  const searchLocation = async () => {
    const search = query.trim();

    if (!search) {
      setError("Please enter a location.");
      setSearchResults([]);
      return;
    }

    if (!geocoderRef.current) {
      setError(
        "Google Maps is still loading. Please try again."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);

    try {
      const response =
        await geocoderRef.current.geocode({
          address: search,
          region: "IN",
        });

      if (
        !response.results ||
        response.results.length === 0
      ) {
        setError(
          "No location found. Try a different search."
        );
        return;
      }

      const results =
        response.results.slice(0, 5);

      setSearchResults(results);
    } catch (err) {
      console.error(
        "Google Maps search error:",
        err
      );

      setError(
        "Unable to search right now. Please try again."
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const chooseSearchResult = async (result) => {
    if (!result.geometry?.location) {
      return;
    }

    const lat =
      result.geometry.location.lat();

    const lng =
      result.geometry.location.lng();

    await selectCoordinates(
      lat,
      lng,
      result.formatted_address
    );
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {
            latitude,
            longitude,
          } = position.coords;

          await selectCoordinates(
            latitude,
            longitude
          );
        } catch (err) {
          console.error(err);

          if (mountedRef.current) {
            setError(
              "Unable to determine your location."
            );
            setLoading(false);
          }
        }
      },
      (err) => {
        console.error(
          "Geolocation error:",
          err
        );

        if (mountedRef.current) {
          let message =
            "Unable to get your current location.";

          if (err.code === 1) {
            message =
              "Location access was denied. Please allow location access in your browser.";
          } else if (err.code === 2) {
            message =
              "Your current location could not be determined.";
          } else if (err.code === 3) {
            message =
              "Location request timed out. Please try again.";
          }

          setError(message);
          setLoading(false);
        }
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

      <div className="locationSearch">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchResults([]);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              searchLocation();
            }
          }}
        />

        <button
          type="button"
          onClick={searchLocation}
          disabled={loading || !mapReady}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

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

      {searchResults.length > 0 && (
        <div className="searchResults">
          {searchResults.map(
            (result, index) => (
              <button
                type="button"
                key={
                  result.place_id ||
                  `${result.formatted_address}-${index}`
                }
                className="searchResult"
                onClick={() =>
                  chooseSearchResult(result)
                }
              >
                <span className="resultIcon">
                  📍
                </span>

                <span className="resultText">
                  {result.formatted_address}
                </span>
              </button>
            )
          )}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="locationMap"
      >
        {!mapReady && !error && (
          <div className="mapLoading">
            <div className="spinner" />
            <span>Loading map...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="locationError">
          ⚠️ {error}
        </div>
      )}

      <p className="locationHelp">
        📍 Search for a place, use your current
        location, or tap the map to select an exact
        location.
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

        .locationSearch {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        .locationSearch input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 16px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          background: #fff;
          color: #26372f;
        }

        .locationSearch input:focus {
          border-color: #08783f;
          box-shadow:
            0 0 0 3px
            rgba(8, 120, 63, 0.1);
        }

        .locationSearch button {
          border: 0;
          background: #08783f;
          color: #fff;
          padding: 0 22px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          min-width: 92px;
        }

        .locationSearch button:disabled {
          opacity: 0.65;
          cursor: wait;
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
          opacity: 0.65;
        }

        .searchResults {
          position: absolute;
          z-index: 10000;
          left: 0;
          right: 0;
          top: 77px;
          background: #fff;
          border: 1px solid #d9e1dc;
          border-radius: 12px;
          box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.14);
          overflow: hidden;
        }

        .searchResult {
          width: 100%;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          text-align: left;
          border: 0;
          border-bottom: 1px solid #edf0ee;
          background: #fff;
          padding: 14px;
          cursor: pointer;
          color: #26372f;
          font-size: 13px;
          line-height: 1.4;
        }

        .searchResult:last-child {
          border-bottom: 0;
        }

        .searchResult:hover {
          background: #f1f8f3;
        }

        .resultIcon {
          flex: 0 0 auto;
        }

        .resultText {
          min-width: 0;
        }

        .locationMap {
          width: 100%;
          height: 360px;
          margin-top: 12px;
          border-radius: 13px;
          border: 1px solid #d9e1dc;
          overflow: hidden;
          background: #f4f6f5;
          position: relative;
        }

        .mapLoading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #f4f6f5;
          color: #52625a;
          font-size: 14px;
          font-weight: 600;
          z-index: 2;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #d9e1dc;
          border-top-color: #08783f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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
          .locationSearch {
            grid-template-columns:
              minmax(0, 1fr) auto;
          }

          .locationSearch button {
            min-width: 82px;
            padding: 0 14px;
          }

          .locationMap {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
