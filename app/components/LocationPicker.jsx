"use client";

import { useEffect, useRef, useState } from "react";

export default function LocationPicker({
  label,
  value,
  onLocationSelect,
  placeholder = "Search location",
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [search, setSearch] = useState(value || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if (window.L) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initializeMap;
      document.body.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstance.current || !window.L) return;

      const L = window.L;

      // Start around Kanpur
      const kanpur = [26.4499, 80.3319];

      const map = L.map(mapRef.current).setView(kanpur, 10);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "&copy; OpenStreetMap contributors",
        }
      ).addTo(map);

      mapInstance.current = map;

      // Allow user to tap anywhere on map
      map.on("click", async (event) => {
        const { lat, lng } = event.latlng;

        await selectLocation(lat, lng);
      });
    };

    const selectLocation = async (lat, lng) => {
      setLoading(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );

        if (!response.ok) {
          throw new Error("Unable to find location");
        }

        const data = await response.json();

        const locationName =
          data.display_name ||
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        setSearch(locationName);

        if (onLocationSelect) {
          onLocationSelect({
            name: locationName,
            lat,
            lon: lng,
          });
        }

        // Move marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (mapInstance.current && window.L) {
          markerRef.current = window.L.marker([lat, lng]).addTo(
            mapInstance.current
          );
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    };

    loadLeaflet();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      markerRef.current = null;
    };
  }, []);

  const searchLocation = async () => {
    if (!search.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(
          search
        )}`
      );

      if (!response.ok) {
        throw new Error("Unable to find location");
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        alert("Location not found. Please try another search.");
        setLoading(false);
        return;
      }

      const location = data[0];

      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);
      const name = location.display_name;

      setSearch(name);

      if (mapInstance.current) {
        mapInstance.current.setView([lat, lon], 13);

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
        } else if (window.L) {
          markerRef.current = window.L.marker([lat, lon]).addTo(
            mapInstance.current
          );
        }
      }

      if (onLocationSelect) {
        onLocationSelect({
          name,
          lat,
          lon,
        });
      }
    } catch (error) {
      console.error(error);
      alert("Unable to search location right now.");
    }

    setLoading(false);
  };

  return (
    <div className="locationPicker">
      <label className="locationLabel">{label}</label>

      <div className="locationSearch">
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={(e) => setSearch(e.target.value)}
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

      <div
        ref={mapRef}
        className="locationMap"
      />

      <p className="mapHint">
        📍 Search for a place or tap anywhere on the map to select it.
      </p>

      <style jsx>{`
        .locationPicker {
          width: 100%;
        }

        .locationLabel {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #52625a;
          margin-bottom: 7px;
        }

        .locationSearch {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .locationSearch input {
          flex: 1;
          min-width: 0;
          padding: 14px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
        }

        .locationSearch input:focus {
          border-color: #08783f;
          box-shadow: 0 0 0 3px rgba(8, 120, 63, 0.1);
        }

        .locationSearch button {
          border: 0;
          background: #08783f;
          color: white;
          padding: 0 18px;
          border-radius: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .locationSearch button:disabled {
          opacity: 0.6;
        }

        .locationMap {
          width: 100%;
          height: 280px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #d9e1dc;
        }

        .mapHint {
          margin: 8px 0 0;
          font-size: 12px;
          color: #65736b;
        }

        @media (max-width: 750px) {
          .locationMap {
            height: 240px;
          }

          .locationSearch button {
            padding: 0 14px;
          }
        }
      `}</style>
    </div>
  );
}
