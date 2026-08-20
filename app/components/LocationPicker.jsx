"use client";

import { useEffect, useRef, useState } from "react";

let googleMapsPromise = null;

/*
|--------------------------------------------------------------------------
| GOOGLE MAPS LOADER
|--------------------------------------------------------------------------
|
| We load the Google Maps JavaScript API once and explicitly import:
|
| - maps      → Map class
| - geocoding → Geocoder class
| - marker    → AdvancedMarkerElement
|
|--------------------------------------------------------------------------
*/

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps can only load in the browser.")
    );
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing from the Vercel environment."
      )
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    /*
     * Google Maps may already have been loaded.
     */
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.importLibrary
    ) {
      resolve(window.google.maps);
      return;
    }

    /*
     * Check whether another component has
     * already inserted the Google Maps script.
     */
    const existingScript =
      document.getElementById("google-maps-script");

    if (existingScript) {
      const checkGoogleMaps = () => {
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.importLibrary
        ) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps loaded, but importLibrary is unavailable."
            )
          );
        }
      };

      existingScript.addEventListener(
        "load",
        checkGoogleMaps,
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "Google Maps JavaScript API failed to load."
            )
          );
        },
        { once: true }
      );

      return;
    }

    /*
     * Google authentication failure.
     */
    window.gm_authFailure = () => {
      reject(
        new Error(
          "Google rejected the API key. Check Google Cloud billing, API restrictions and website restrictions."
        )
      );
    };

    /*
     * Create Google Maps script.
     */
    const script =
      document.createElement("script");

    script.id =
      "google-maps-script";

    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly" +
      "&loading=async";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.importLibrary
      ) {
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
          "Unable to download the Google Maps JavaScript API."
        )
      );
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/*
|--------------------------------------------------------------------------
| LOCATION PICKER
|--------------------------------------------------------------------------
*/

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
  const geocoderRef = useRef(null);

  const [search, setSearch] =
    useState(value || "");

  const [loading, setLoading] =
    useState(false);

  const [searchResults, setSearchResults] =
    useState([]);

  const [mapError, setMapError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Sync value from parent
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setSearch(value);
    }
  }, [value]);

  /*
  |--------------------------------------------------------------------------
  | INITIALIZE GOOGLE MAP
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      try {
        setMapError("");

        /*
         * Load Google Maps itself.
         */
        const google =
          await loadGoogleMaps();

        if (cancelled) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * Explicitly load the Maps library.
         *
         * This fixes:
         *
         * "google.maps.Map class is unavailable"
         */
        const mapsLibrary =
          await google.maps.importLibrary(
            "maps"
          );

        /*
         * Explicitly load Geocoder.
         */
        const geocodingLibrary =
          await google.maps.importLibrary(
            "geocoding"
          );

        /*
         * Explicitly load Marker library.
         */
        const markerLibrary =
          await google.maps.importLibrary(
            "marker"
          );

        if (cancelled) {
          return;
        }

        const Map =
          mapsLibrary.Map;

        const Geocoder =
          geocodingLibrary.Geocoder;

        const AdvancedMarkerElement =
          markerLibrary.AdvancedMarkerElement;

        if (!Map) {
          throw new Error(
            "Google Maps Map class is unavailable."
          );
        }

        if (!Geocoder) {
          throw new Error(
            "Google Maps Geocoder class is unavailable."
          );
        }

        /*
         * Kanpur default position.
         */
        const kanpur = {
          lat: 26.4499,
          lng: 80.3319,
        };

        /*
         * Create map.
         */
        const map =
          new Map(
            mapRef.current,
            {
              center: kanpur,
              zoom: 11,

              mapTypeControl: false,

              streetViewControl: false,

              fullscreenControl: true,

              gestureHandling:
                "greedy",
            }
          );

        mapInstance.current =
          map;

        /*
         * Create geocoder.
         */
        geocoderRef.current =
          new Geocoder();

        /*
         * Save marker class.
         */
        markerRef.current = {
          AdvancedMarkerElement,
          instance: null,
        };

        /*
         * Clicking the map selects
         * an exact location.
         */
        map.addListener(
          "click",
          async (event) => {
            if (
              !event.latLng
            ) {
              return;
            }

            const lat =
              event.latLng.lat();

            const lng =
              event.latLng.lng();

            await selectLocation(
              lat,
              lng
            );
          }
        );
      } catch (error) {
        console.error(
          "Google Maps initialization error:",
          error
        );

        if (!cancelled) {
          setMapError(
            error?.message ||
              "Google Maps API is unavailable."
          );
        }
      }
    }

    if (mapRef.current) {
      initializeMap();
    }

    return () => {
      cancelled = true;

      if (mapInstance.current) {
        mapInstance.current =
          null;
      }

      if (markerRef.current) {
        markerRef.current =
          null;
      }

      geocoderRef.current =
        null;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CREATE SHORT LOCATION NAME
  |--------------------------------------------------------------------------
  */

  const createShortLocationName =
    (result) => {
      if (!result) {
        return "";
      }

      const components =
        result.address_components ||
        [];

      const getComponent = (
        types
      ) => {
        const item =
          components.find(
            (component) =>
              types.some((type) =>
                component.types.includes(
                  type
                )
              )
          );

        return item?.long_name;
      };

      const parts = [
        getComponent([
          "route",
        ]),

        getComponent([
          "sublocality",
          "sublocality_level_1",
          "neighborhood",
        ]),

        getComponent([
          "locality",
          "postal_town",
        ]),

        getComponent([
          "administrative_area_level_2",
        ]),
      ].filter(Boolean);

      return [
        ...new Set(parts),
      ]
        .slice(0, 3)
        .join(", ");
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE MARKER
  |--------------------------------------------------------------------------
  */

  const updateMarker = (
    lat,
    lng
  ) => {
    if (
      !mapInstance.current ||
      !markerRef.current
    ) {
      return;
    }

    const {
      AdvancedMarkerElement,
    } =
      markerRef.current;

    const position = {
      lat,
      lng,
    };

    /*
     * Create marker if it doesn't exist.
     */
    if (
      !markerRef.current.instance
    ) {
      markerRef.current.instance =
        new AdvancedMarkerElement({
          map: mapInstance.current,
          position,
          title:
            "Selected location",
        });
    } else {
      /*
       * Move existing marker.
       */
      markerRef.current.instance.position =
        position;
    }

    /*
     * Move map.
     */
    mapInstance.current.setCenter(
      position
    );

    mapInstance.current.setZoom(
      15
    );
  };

  /*
  |--------------------------------------------------------------------------
  | REVERSE GEOCODING
  |--------------------------------------------------------------------------
  */

  const selectLocation =
    async (
      lat,
      lng
    ) => {
      if (
        !geocoderRef.current
      ) {
        setMapError(
          "Google Maps Geocoder is not ready yet."
        );

        return;
      }

      setLoading(true);
      setSearchResults([]);

      try {
        const response =
          await geocoderRef.current.geocode(
            {
              location: {
                lat,
                lng,
              },
            }
          );

        const result =
          response.results?.[0];

        const locationName =
          createShortLocationName(
            result
          ) ||
          result?.formatted_address ||
          `${lat.toFixed(
            5
          )}, ${lng.toFixed(5)}`;

        setSearch(
          locationName
        );

        updateMarker(
          lat,
          lng
        );

        if (
          onLocationSelect
        ) {
          onLocationSelect({
            name: locationName,

            fullName:
              result?.formatted_address ||
              locationName,

            lat,

            lon: lng,
          });
        }
      } catch (error) {
        console.error(
          "Reverse geocoding error:",
          error
        );

        setMapError(
          "Unable to identify this location."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SEARCH LOCATION
  |--------------------------------------------------------------------------
  */

  const searchLocation =
    async () => {
      if (!search.trim()) {
        return;
      }

      if (
        !geocoderRef.current
      ) {
        setMapError(
          "Google Maps is still loading. Please try again."
        );

        return;
      }

      setLoading(true);
      setSearchResults([]);
      setMapError("");

      try {
        const response =
          await geocoderRef.current.geocode(
            {
              address:
                search.trim(),

              region: "IN",

              componentRestrictions: {
                country: "IN",
              },
            }
          );

        const results =
          response.results || [];

        if (
          results.length === 0
        ) {
          setMapError(
            "Location not found. Please try another search."
          );

          setLoading(false);

          return;
        }

        /*
         * Display up to 5 results.
         */
        setSearchResults(
          results.slice(0, 5)
        );
      } catch (error) {
        console.error(
          "Google location search error:",
          error
        );

        setMapError(
          "Unable to search location right now."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SELECT SEARCH RESULT
  |--------------------------------------------------------------------------
  */

  const selectSearchResult =
    (result) => {
      if (
        !result.geometry?.location
      ) {
        return;
      }

      const lat =
        result.geometry.location.lat();

      const lng =
        result.geometry.location.lng();

      const shortName =
        createShortLocationName(
          result
        ) ||
        result.formatted_address;

      setSearch(
        shortName
      );

      setSearchResults([]);

      updateMarker(
        lat,
        lng
      );

      if (
        onLocationSelect
      ) {
        onLocationSelect({
          name: shortName,

          fullName:
            result.formatted_address,

          lat,

          lon: lng,
        });
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CURRENT LOCATION
  |--------------------------------------------------------------------------
  */

  const useCurrentLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
        setMapError(
          "Your device does not support location services."
        );

        return;
      }

      setLoading(true);
      setSearchResults([]);
      setMapError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          await selectLocation(
            lat,
            lng
          );
        },

        (error) => {
          console.error(
            "Geolocation error:",
            error
          );

          setLoading(false);

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setMapError(
              "Location permission was denied. Please allow location access."
            );
          } else {
            setMapError(
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

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

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
          placeholder={
            placeholder
          }
          onChange={(e) => {
            setSearch(
              e.target.value
            );

            setSearchResults([]);

            setMapError("");
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              e.preventDefault();

              searchLocation();
            }
          }}
        />

        <button
          type="button"
          onClick={
            searchLocation
          }
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
          onClick={
            useCurrentLocation
          }
          disabled={loading}
        >
          📍 Use my current location
        </button>
      )}

      {/* SEARCH RESULTS */}

      {searchResults.length >
        0 && (
        <div className="searchResults">

          {searchResults.map(
            (result, index) => (
              <button
                type="button"
                className="searchResult"
                key={`${result.place_id || index}-${index}`}
                onClick={() =>
                  selectSearchResult(
                    result
                  )
                }
              >

                <span className="resultIcon">
                  📍
                </span>

                <span className="resultText">

                  <strong>
                    {createShortLocationName(
                      result
                    ) ||
                      result.formatted_address}
                  </strong>

                  <small>
                    {
                      result.formatted_address
                    }
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

      {/* ERROR */}

      {mapError && (
        <p className="mapError">
          ⚠️ {mapError}
        </p>
      )}

      {/* HINT */}

      <p className="mapHint">
        📍 Search for a place or tap
        the map to select an exact
        location.
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
          cursor: wait;
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

        .currentLocationButton:disabled {
          opacity: 0.6;
          cursor: wait;
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
          background: #f4f6f5;
        }

        .mapHint {
          margin: 8px 0 0;
          font-size: 12px;
          color: #65736b;
        }

        .mapError {
          margin: 8px 0 0;
          padding: 11px 13px;
          border-radius: 11px;
          border: 1px solid #f0c7c3;
          background: #fff4f2;
          color: #b42318;
          font-size: 12px;
          line-height: 1.4;
        }

        @media (max-width: 750px) {

          .locationMap {
            height: 280px;
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
