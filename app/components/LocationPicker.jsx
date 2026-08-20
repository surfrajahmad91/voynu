"use client";

import { useEffect, useRef, useState } from "react";

export default function LocationPicker({
  label,
  value,
  onLocationSelect,
  placeholder = "Search location",
  allowCurrentLocation = false,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [search, setSearch] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  /*
   * Keep the input synchronized with the parent.
   */
  useEffect(() => {
    if (value) {
      setSearch(value);
    }
  }, [value]);

  /*
   * Load Leaflet.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

      document.head.appendChild(link);
    }

    const initializeMap = () => {
      if (
        !mapRef.current ||
        mapInstance.current ||
        !window.L
      ) {
        return;
      }

      const L = window.L;

      // Start around Kanpur.
      const kanpur = [26.4499, 80.3319];

      const map = L.map(mapRef.current).setView(
        kanpur,
        11
      );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            "&copy; OpenStreetMap contributors",
        }
      ).addTo(map);

      mapInstance.current = map;

      /*
       * Allow the user to tap anywhere on the map.
       */
      map.on("click", async (event) => {
        const { lat, lng } = event.latlng;

        await selectLocation(lat, lng);
      });
    };

    const loadLeaflet = () => {
      if (window.L) {
        initializeMap();
        return;
      }

      const existingScript =
        document.getElementById("leaflet-js");

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          initializeMap
        );
        return;
      }

      const script = document.createElement("script");

      script.id = "leaflet-js";
      script.src =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initializeMap;

      document.body.appendChild(script);
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

  /*
   * Reverse geocode coordinates.
   */
  const selectLocation = async (lat, lng) => {
    setLoading(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to find location"
        );
      }

      const data = await response.json();

      const locationName =
        createShortLocationName(data) ||
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      setSearch(locationName);

      if (onLocationSelect) {
        onLocationSelect({
          name: locationName,
          fullName:
            data.display_name || locationName,
          lat,
          lon: lng,
        });
      }

      updateMarker(lat, lng);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  /*
   * Create a shorter, cleaner location name.
   */
  const createShortLocationName = (data) => {
    if (!data || !data.address) {
      return data?.display_name || "";
    }

    const address = data.address;

    const parts = [
      address.road,
      address.neighbourhood,
      address.suburb,
      address.city_district,
      address.town,
      address.city,
    ].filter(Boolean);

    const uniqueParts = [...new Set(parts)];

    return uniqueParts.slice(0, 3).join(", ");
  };

  /*
   * Move/create map marker.
   */
  const updateMarker = (lat, lon) => {
    if (!mapInstance.current || !window.L) {
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([
        lat,
        lon,
      ]);
    } else {
      markerRef.current =
        window.L.marker([
          lat,
          lon,
        ]).addTo(mapInstance.current);
    }

    mapInstance.current.setView(
      [lat, lon],
      15
    );
  };

  /*
   * Search locations.
   */
  const searchLocation = async () => {
    if (!search.trim()) return;

    setLoading(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(
          search
        )}`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to find location"
        );
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setSearchResults([]);
        alert(
          "Location not found. Please try another search."
        );
        setLoading(false);
        return;
      }

      setSearchResults(data);
    } catch (error) {
      console.error(error);

      alert(
        "Unable to search location right now."
      );
    }

    setLoading(false);
  };

  /*
   * User selects a search result.
   */
  const selectSearchResult = (location) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    const shortName =
      createShortLocationName(location) ||
      location.display_name;

    setSearch(shortName);
    setSearchResults([]);

    updateMarker(lat, lon);

    if (onLocationSelect) {
      onLocationSelect({
        name: shortName,
        fullName: location.display_name,
        lat,
        lon,
      });
    }
  };

  /*
   * Use device's current GPS location.
   */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(
        "Your device does not support location services."
      );
      return;
    }

    setLoading(true);
    setSearchResults([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat =
          position.coords.latitude;

        const lon =
          position.coords.longitude;

        await selectLocation(lat, lon);
      },
      (error) => {
        console.error(error);

        setLoading(false);

        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          alert(
            "Location permission was denied. Please allow location access and try again."
          );
        } else {
          alert(
            "Unable to get your current location."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="locationPicker">

      <label className="locationLabel">
        {label}
      </label>

      {/* SEARCH */}
      <div className="locationSearch">

        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={(e) => {
            setSearch(e.target.value);
            setSearchResults([]);
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
          {loading
            ? "..."
            : "Search"}
        </button>

      </div>

      {/* CURRENT LOCATION */}
      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocationButton"
          onClick={useCurrentLocation}
          disabled={loading}
        >
          📍 Use my current location
        </button>
      )}

      {/* SEARCH RESULTS */}
      {searchResults.length > 0 && (
        <div className="searchResults">

          {searchResults.map(
            (location, index) => (
              <button
                type="button"
                className="searchResult"
                key={`${location.place_id}-${index}`}
                onClick={() =>
                  selectSearchResult(
                    location
                  )
                }
              >

                <span className="resultIcon">
                  📍
                </span>

                <span className="resultText">
                  <strong>
                    {createShortLocationName(
                      location
                    ) ||
                      location.display_name}
                  </strong>

                  <small>
                    {location.display_name}
                  </small>
                </span>

              </button>
            )
          )}

        </div>
      )}

      {/* MAP */}
      <div
        ref={mapRef}
        className="locationMap"
      />

      <p className="mapHint">
        📍 Search for a place or tap the
        map to select an exact location.
      </p>

      <style jsx>{`

        .locationPicker {
          width: 100%;
          position: relative;
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
          margin-bottom: 8px;
        }

        .locationSearch input {
          flex: 1;
          min-width: 0;
          padding: 14px;
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
            rgba(
              8,
              120,
              63,
              0.1
            );
        }

        .locationSearch button {
          border: 0;
          background: #08783f;
          color: white;
          padding: 0 18px;
          border-radius: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .locationSearch button:disabled {
          opacity: 0.6;
        }

        .currentLocationButton {
          width: 100%;
          border: 1px solid #cce3d3;
          background: #f1f8f3;
          color: #08783f;
          padding: 11px 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .currentLocationButton:hover {
          background: #e5f3e9;
        }

        .currentLocationButton:disabled {
          opacity: 0.6;
        }

        .searchResults {
          position: relative;
          z-index: 20;
          background: white;
          border: 1px solid #d9e1dc;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 10px;
          box-shadow:
            0 8px 25px
            rgba(
              0,
              0,
              0,
              0.1
            );
        }

        .searchResult {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 0;
          border-bottom: 1px solid #edf1ee;
          background: white;
          text-align: left;
          cursor: pointer;
        }

        .searchResult:last-child {
          border-bottom: 0;
        }

        .searchResult:hover {
          background: #f4f8f5;
        }

        .resultIcon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .resultText {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .resultText strong {
          font-size: 13px;
          color: #10231a;
        }

        .resultText small {
          font-size: 11px;
          line-height: 1.35;
          color: #65736b;
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
            height: 175px;
            border-radius: 12px;
          }

          .locationSearch button {
            padding: 0 14px;
          }

          .currentLocationButton {
            padding: 10px 12px;
          }

          .searchResult {
            padding: 11px;
          }

        }

      `}</style>

    </div>
  );
}
