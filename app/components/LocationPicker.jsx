"use client";

import { useEffect, useRef, useState } from "react";

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

  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  // Keep input synchronized with parent
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Load Leaflet from CDN
  useEffect(() => {
    let cancelled = false;

    const loadLeaflet = async () => {
      try {
        // Load CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href =
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

          document.head.appendChild(link);
        }

        // Already loaded
        if (window.L) {
          if (!cancelled) setMapReady(true);
          return;
        }

        // Load JavaScript
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;

        script.onload = () => {
          if (!cancelled) {
            setMapReady(true);
          }
        };

        script.onerror = () => {
          if (!cancelled) {
            setError("Unable to load the map.");
          }
        };

        document.body.appendChild(script);
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError("Unable to load the map.");
        }
      }
    };

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;

    // Prevent duplicate initialization
    if (mapInstanceRef.current) return;

    const L = window.L;

    // Default center: Kanpur
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

      await selectCoordinates(lat, lng);
    });

    mapInstanceRef.current = map;

    // Fix Leaflet sizing after rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapReady]);

  const selectCoordinates = async (lat, lon, name = "") => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add new marker
    markerRef.current = L.marker([lat, lon]).addTo(
      mapInstanceRef.current
    );

    // Center map
    mapInstanceRef.current.setView([lat, lon], 15);

    let locationName = name;

    // Reverse geocode if no name supplied
    if (!locationName) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          locationName =
            data.display_name ||
            `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);

        locationName = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }
    }

    setQuery(locationName);

    setResults([]);

    setError("");

    onLocationSelect({
      name: locationName,
      lat,
      lon,
    });
  };

  const searchLocation = async () => {
    const search = query.trim();

    if (!search) {
      setError("Please enter a location.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(
          search
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setError("No location found. Try a different search.");
        return;
      }

      setResults(data);
    } catch (err) {
      console.error("Location search error:", err);

      setError(
        "Unable to search right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const chooseSearchResult = async (result) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);

    await selectCoordinates(
      lat,
      lon,
      result.display_name
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        await selectCoordinates(
          latitude,
          longitude
        );

        setLoading(false);
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
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setError("");
          }}
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
          disabled={loading}
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
          📍 {loading ? "Finding your location..." : "Use my current location"}
        </button>
      )}

      {results.length > 0 && (
        <div className="searchResults">
          {results.map((result) => (
            <button
              type="button"
              key={result.place_id}
              className="searchResult"
              onClick={() => chooseSearchResult(result)}
            >
              📍
              <span>{result.display_name}</span>
            </button>
          ))}
        </div>
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
        📍 Search for a place or tap the map to select an exact location.
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
          box-shadow: 0 0 0 3px rgba(8, 120, 63, 0.1);
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

        .searchResults {
          position: absolute;
          z-index: 1000;
          left: 0;
          right: 0;
          top: 92px;
          background: white;
          border: 1px solid #d9e1dc;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
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
          background: white;
          padding: 13px;
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
