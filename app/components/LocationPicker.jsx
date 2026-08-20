"use client";

import { useEffect, useRef, useState } from "react";

let googleMapsPromise = null;

/*
 * Load Google Maps JavaScript API once.
 */
function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Window is unavailable")
    );
  }

  // Already loaded
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing from the Vercel build"
      )
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      /*
       * Google API authentication failure.
       */
      window.gm_authFailure = () => {
        reject(
          new Error(
            "Google rejected the API key. Check API restrictions, website restrictions, billing, and enabled APIs."
          )
        );
      };

      /*
       * Check if another component has
       * already added the Google Maps script.
       */
      const existingScript =
        document.getElementById(
          "google-maps-script"
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => {
            if (window.google?.maps) {
              resolve(window.google.maps);
            } else {
              reject(
                new Error(
                  "Google Maps script loaded, but Google Maps API is unavailable."
                )
              );
            }
          },
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Google Maps JavaScript API script failed to load."
              )
            );
          },
          { once: true }
        );

        return;
      }

      /*
       * Create Google Maps script.
       */
      const script =
        document.createElement("script");

      script.id =
        "google-maps-script";

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&v=weekly`;

      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps loaded but window.google.maps is unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Unable to download Google Maps JavaScript API."
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
   * Keep search field synchronized
   * with parent value.
   */
  useEffect(() => {
    if (value) {
      setSearch(value);
    }
  }, [value]);

  /*
   * Initialize Google Maps.
   */
  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      try {
        setMapError("");

        const google =
          await loadGoogleMaps();

        if (
          cancelled ||
          !mapRef.current ||
          mapInstance.current
        ) {
          return;
        }

        /*
         * Initial map position.
         */
        const kanpur = {
          lat: 26.4499,
          lng: 80.3319,
        };

        const map =
          new google.maps.Map(
            mapRef.current,
            {
              center: kanpur,
              zoom: 11,

              mapTypeControl: false,

              streetViewControl: false,

              fullscreenControl: true,

              gestureHandling: "greedy",
            }
          );

        mapInstance.current = map;

        /*
         * Google Geocoder.
         */
        geocoderRef.current =
          new google.maps.Geocoder();

        /*
         * Allow user to tap/click
         * anywhere on the map.
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

        setMapError(
          error?.message ||
            "Unable to load Google Maps."
        );
      }
    };

    initializeMap();

    /*
     * Cleanup.
     */
    return () => {
      cancelled = true;

      if (markerRef.current) {
        markerRef.current.setMap(
          null
        );
      }

      markerRef.current = null;

      mapInstance.current = null;

      geocoderRef.current = null;
    };
  }, []);

  /*
   * Create a short, clean
   * location name.
   */
  const createShortLocationName = (
    result
  ) => {
    if (!result) {
      return "";
    }

    const components =
      result.address_components ||
      [];

    const getComponent = (
      types
    ) => {
      const component =
        components.find(
          (item) =>
            types.some((type) =>
              item.types?.includes(
                type
              )
            )
        );

      return component?.long_name;
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
   * Create or move map marker.
   */
  const updateMarker = (
    lat,
    lng
  ) => {
    if (
      !mapInstance.current ||
      !window.google?.maps
    ) {
      return;
    }

    const position = {
      lat,
      lng,
    };

    if (markerRef.current) {
      markerRef.current.setPosition(
        position
      );
    } else {
      markerRef.current =
        new window.google.maps.Marker({
          position,
          map: mapInstance.current,
        });
    }

    mapInstance.current.setCenter(
      position
    );

    mapInstance.current.setZoom(
      15
    );
  };

  /*
   * Reverse geocode coordinates.
   *
   * Used when:
   * - User taps the map
   * - User uses current location
   */
  const selectLocation = async (
    lat,
    lng
  ) => {
    if (!geocoderRef.current) {
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

      setSearch(locationName);

      updateMarker(
        lat,
        lng
      );

      if (onLocationSelect) {
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

      /*
       * Even if reverse geocoding fails,
       * keep the coordinates usable.
       */
      const fallbackName = `${lat.toFixed(
        5
      )}, ${lng.toFixed(5)}`;

      setSearch(
        fallbackName
      );

      updateMarker(
        lat,
        lng
      );

      if (onLocationSelect) {
        onLocationSelect({
          name: fallbackName,
          fullName: fallbackName,
          lat,
          lon: lng,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Search location using
   * Google Geocoding API.
   */
  const searchLocation = async () => {
    if (!search.trim()) {
      return;
    }

    if (!geocoderRef.current) {
      alert(
        "Google Maps is still loading. Please try again."
      );

      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      const response =
        await geocoderRef.current.geocode(
          {
            address: search.trim(),

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
        alert(
          "Location not found. Please try another search."
        );

        return;
      }

      /*
       * Show up to 5 results.
       */
      setSearchResults(
        results.slice(0, 5)
      );
    } catch (error) {
      console.error(
        "Google search error:",
        error
      );

      alert(
        "Unable to search location right now."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Select a Google search result.
   */
  const selectSearchResult = (
    result
  ) => {
    if (
      !result?.geometry?.location
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
      result.formatted_address ||
      `${lat.toFixed(
        5
      )}, ${lng.toFixed(5)}`;

    setSearch(shortName);

    setSearchResults([]);

    updateMarker(
      lat,
      lng
    );

    if (onLocationSelect) {
      onLocationSelect({
        name: shortName,

        fullName:
          result.formatted_address ||
          shortName,

        lat,

        lon: lng,
      });
    }
  };

  /*
   * Use device's current GPS
   * location.
   */
  const useCurrentLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
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
            alert(
              "Location permission was denied. Please allow location access and try again."
            );
          } else if (
            error.code ===
            error.POSITION_UNAVAILABLE
          ) {
            alert(
              "Your current location is unavailable."
            );
          } else if (
            error.code ===
            error.TIMEOUT
          ) {
            alert(
              "Getting your location took too long. Please try again."
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

      {/* LABEL */}

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
            setSearch(
              e.target.value
            );

            setSearchResults([]);
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
                key={`${result.place_id || "result"}-${index}`}
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

      {/* GOOGLE MAP */}

      <div
        ref={mapRef}
        className="locationMap"
      />

      {/* MAP ERROR */}

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

        .currentLocationButton:hover {
          background: #e5f3e9;
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
        }

        .mapHint {
          margin: 8px 0 0;
          font-size: 12px;
          color: #65736b;
        }

        .mapError {
          margin: 8px 0 0;
          padding: 10px 12px;
          border-radius: 9px;
          background: #fff4f2;
          border: 1px solid #f2c7c2;
          font-size: 12px;
          line-height: 1.4;
          color: #b42318;
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
