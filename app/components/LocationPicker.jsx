"use client";

import { useEffect, useRef, useState } from "react";

let leafletPromise = null;
let googleMapsPromise = null;

// ---------------------------------------------------------
// Load Leaflet
// ---------------------------------------------------------
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject();

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletPromise) {
    return leafletPromise;
  }

  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

      document.head.appendChild(link);
    }

    // JavaScript
    const existingScript = document.querySelector(
      'script[data-leaflet="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(window.L)
      );
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

    script.async = true;
    script.dataset.leaflet = "true";

    script.onload = () => {
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error("Leaflet failed to load."));
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Leaflet."));
    };

    document.body.appendChild(script);
  });

  return leafletPromise;
}

// ---------------------------------------------------------
// Load Google Maps JavaScript API + Places
// ---------------------------------------------------------
function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject();
  }

  if (
    window.google &&
    window.google.maps &&
    window.google.maps.places
  ) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      reject(
        new Error(
          "Google Maps API key is missing."
        )
      );
      return;
    }

    const existingScript = document.querySelector(
      'script[data-google-maps="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.places
        ) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Places library failed to load."
            )
          );
        }
      });

      existingScript.addEventListener("error", reject);

      return;
    }

    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=places&v=weekly`;

    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = () => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places
      ) {
        resolve(window.google.maps);
      } else {
        reject(
          new Error(
            "Google Places library failed to initialize."
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
  });

  return googleMapsPromise;
}

// ---------------------------------------------------------
// Component
// ---------------------------------------------------------
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

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const selectedPlaceRef = useRef(null);

  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------------
  // Keep input synchronized with parent
  // -------------------------------------------------------
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // -------------------------------------------------------
  // Load Leaflet + Google Places
  // -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadLeaflet(),
      loadGoogleMaps(),
    ])
      .then(() => {
        if (cancelled) return;

        setMapReady(true);
        setGoogleReady(true);
      })
      .catch((err) => {
        console.error(err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load location services."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------
  // Initialize Leaflet map
  // -------------------------------------------------------
  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current ||
      !window.L ||
      mapInstanceRef.current
    ) {
      return;
    }

    const L = window.L;

    const map = L.map(mapRef.current).setView(
      [26.4499, 80.3319],
      11
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    map.on("click", async (event) => {
      const { lat, lng } = event.latlng;

      await selectCoordinates(
        lat,
        lng
      );
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapReady]);

  // -------------------------------------------------------
  // Initialize Google Places Autocomplete
  // -------------------------------------------------------
  useEffect(() => {
    if (
      !googleReady ||
      !inputRef.current ||
      !window.google?.maps?.places
    ) {
      return;
    }

    // Prevent duplicate autocomplete
    if (autocompleteRef.current) {
      return;
    }

    try {
      const autocomplete =
        new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: {
              country: "in",
            },

            fields: [
              "formatted_address",
              "geometry",
              "name",
              "place_id",
              "address_components",
            ],

            types: [
              "establishment",
              "geocode",
            ],
          }
        );

      autocomplete.addListener(
        "place_changed",
        () => {
          const place =
            autocomplete.getPlace();

          selectedPlaceRef.current =
            place;

          if (
            !place ||
            !place.geometry ||
            !place.geometry.location
          ) {
            setError(
              "Please select a location from the search suggestions."
            );
            return;
          }

          const lat =
            place.geometry.location.lat();

          const lon =
            place.geometry.location.lng();

          const name =
            place.formatted_address ||
            place.name ||
            query;

          selectCoordinates(
            lat,
            lon,
            name
          );
        }
      );

      autocompleteRef.current =
        autocomplete;
    } catch (err) {
      console.error(
        "Google Places initialization error:",
        err
      );

      setError(
        "Google Places search could not be initialized."
      );
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current
        );

        autocompleteRef.current = null;
      }
    };
  }, [googleReady]);

  // -------------------------------------------------------
  // Select coordinates
  // -------------------------------------------------------
  const selectCoordinates = async (
    lat,
    lon,
    name = ""
  ) => {
    if (
      !mapInstanceRef.current ||
      !window.L
    ) {
      return;
    }

    const L = window.L;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker
    markerRef.current =
      L.marker([
        lat,
        lon,
      ]).addTo(
        mapInstanceRef.current
      );

    // Center map
    mapInstanceRef.current.setView(
      [lat, lon],
      15
    );

    let locationName = name;

    // -----------------------------------------------------
    // If no name was provided, use Google reverse geocoding
    // -----------------------------------------------------
    if (!locationName) {
      try {
        if (
          window.google?.maps
        ) {
          const geocoder =
            new window.google.maps.Geocoder();

          const response =
            await geocoder.geocode({
              location: {
                lat,
                lng: lon,
              },
            });

          if (
            response.results &&
            response.results.length > 0
          ) {
            locationName =
              response.results[0]
                .formatted_address;
          }
        }
      } catch (err) {
        console.error(
          "Google reverse geocoding error:",
          err
        );
      }
    }

    // Fallback
    if (!locationName) {
      locationName =
        `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }

    setQuery(locationName);

    setError("");

    onLocationSelect({
      name: locationName,
      lat,
      lon,
    });
  };

  // -------------------------------------------------------
  // Search
  // -------------------------------------------------------
  const searchLocation = async () => {
    const search =
      query.trim();

    if (!search) {
      setError(
        "Please enter a location."
      );
      return;
    }

    if (
      !window.google?.maps?.places
    ) {
      setError(
        "Google Places is still loading. Please try again."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      // If user selected a Google suggestion,
      // use that exact place.
      const selectedPlace =
        selectedPlaceRef.current;

      if (
        selectedPlace &&
        selectedPlace.geometry?.location
      ) {
        const lat =
          selectedPlace.geometry.location.lat();

        const lon =
          selectedPlace.geometry.location.lng();

        const name =
          selectedPlace.formatted_address ||
          selectedPlace.name ||
          search;

        await selectCoordinates(
          lat,
          lon,
          name
        );

        return;
      }

      // Otherwise trigger Google autocomplete
      // by focusing the input.
      inputRef.current?.focus();

      setError(
        "Please select a location from the Google suggestions."
      );
    } catch (err) {
      console.error(
        "Google Places search error:",
        err
      );

      setError(
        "Unable to search right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // Input change
  // -------------------------------------------------------
  const handleInputChange = (
    event
  ) => {
    setQuery(event.target.value);

    // Clear previously selected place
    selectedPlaceRef.current =
      null;

    setError("");
  };

  // -------------------------------------------------------
  // Current location
  // -------------------------------------------------------
  const useCurrentLocation = () => {
    if (
      !navigator.geolocation
    ) {
      setError(
        "Your browser does not support location services."
      );
      return;
    }

    setLoading(true);
    setError("");

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

          setError(
            "Unable to determine your location."
          );
        } finally {
          setLoading(false);
        }
      },

      (err) => {
        console.error(err);

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

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div className="locationPicker">
      <div className="locationHeader">
        <span>{label}</span>
      </div>

      <div className="locationSearch">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchLocation();
            }
          }}
        />

        <button
          type="button"
          onClick={searchLocation}
          disabled={
            loading ||
            !googleReady
          }
        >
          {loading
            ? "..."
            : "Search"}
        </button>
      </div>

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocation"
          onClick={
            useCurrentLocation
          }
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
        📍 Search for a place or tap
        the map to select an exact
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
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .locationSearch input {
          width: 100%;
          min-width: 0;
          padding: 16px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          background: white;
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
          color: white;
          padding: 0 22px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          min-width: 92px;
        }

        .locationSearch button:disabled {
          opacity: 0.7;
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
          opacity: 0.7;
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
          .locationSearch {
            grid-template-columns: 1fr auto;
          }

          .locationSearch button {
            min-width: 88px;
            padding: 0 15px;
          }

          .locationMap {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
