"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

let googleMapsPromise = null;

/*
|--------------------------------------------------------------------------
| Google Maps Loader
|--------------------------------------------------------------------------
|
| Loads Google Maps only once for the entire application.
|
*/

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps requires a browser.")
    );
  }

  if (window.google?.maps) {
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

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.querySelector(
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
        "&libraries=places,marker";

      script.async = true;
      script.defer = true;

      script.dataset.voynuGoogleMaps =
        "true";

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
    }
  );

  return googleMapsPromise;
}

/*
|--------------------------------------------------------------------------
| Location Picker
|--------------------------------------------------------------------------
*/

export default function LocationPicker({
  label,
  value,
  placeholder = "Search for a place, building or address",
  allowCurrentLocation = false,
  onLocationSelect,
}) {
  const mapElementRef = useRef(null);
  const inputRef = useRef(null);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);

  const listenersRef = useRef([]);

  const onLocationSelectRef =
    useRef(onLocationSelect);

  const lastExternalValueRef =
    useRef(value || "");

  const [loading, setLoading] =
    useState(true);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedLocation, setSelectedLocation] =
    useState({
      name: value || "",
      lat: null,
      lon: null,
    });

  /*
  |--------------------------------------------------------------------------
  | Keep latest callback
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    onLocationSelectRef.current =
      onLocationSelect;
  }, [onLocationSelect]);

  /*
  |--------------------------------------------------------------------------
  | Parent value synchronization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const nextValue = value || "";

    if (
      nextValue ===
      lastExternalValueRef.current
    ) {
      return;
    }

    lastExternalValueRef.current =
      nextValue;

    setSelectedLocation(
      (current) => ({
        ...current,
        name: nextValue,
      })
    );

    if (inputRef.current) {
      inputRef.current.value =
        nextValue;
    }
  }, [value]);

  /*
  |--------------------------------------------------------------------------
  | Notify parent
  |--------------------------------------------------------------------------
  */

  const notifyLocation = (location) => {
    setSelectedLocation(location);

    lastExternalValueRef.current =
      location.name || "";

    onLocationSelectRef.current?.(
      location
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Remove existing marker
  |--------------------------------------------------------------------------
  */

  const removeMarker = () => {
    if (!markerRef.current) {
      return;
    }

    /*
     * AdvancedMarkerElement
     */
    if (
      "map" in markerRef.current
    ) {
      markerRef.current.map = null;
    }

    /*
     * Legacy Marker fallback
     */
    if (
      typeof markerRef.current.setMap ===
      "function"
    ) {
      markerRef.current.setMap(null);
    }

    markerRef.current = null;
  };

  /*
  |--------------------------------------------------------------------------
  | Create marker
  |--------------------------------------------------------------------------
  */

  const placeMarker = async (
    googleMaps,
    map,
    lat,
    lng
  ) => {
    removeMarker();

    /*
     * Prefer AdvancedMarkerElement.
     */
    try {
      const markerLibrary =
        await googleMaps.importLibrary(
          "marker"
        );

      const AdvancedMarkerElement =
        markerLibrary.AdvancedMarkerElement;

      if (AdvancedMarkerElement) {
        const marker =
          new AdvancedMarkerElement({
            map,
            position: {
              lat,
              lng,
            },
            title:
              "Selected pickup location",
          });

        markerRef.current =
          marker;

        /*
         * If supported, allow dragging.
         */
        try {
          marker.gmpDraggable = true;

          const dragEndHandler =
            async () => {
              const position =
                marker.position;

              if (!position) {
                return;
              }

              const nextLat =
                typeof position.lat ===
                "function"
                  ? position.lat()
                  : position.lat;

              const nextLng =
                typeof position.lng ===
                "function"
                  ? position.lng()
                  : position.lng;

              await reverseGeocode(
                googleMaps,
                nextLat,
                nextLng
              );
            };

          marker.addEventListener(
            "dragend",
            dragEndHandler
          );

          listenersRef.current.push(
            () =>
              marker.removeEventListener(
                "dragend",
                dragEndHandler
              )
          );
        } catch {
          /*
           * Some map configurations may
           * not support draggable advanced
           * markers. Map tapping still works.
           */
        }

        return;
      }
    } catch (advancedMarkerError) {
      console.warn(
        "Advanced marker unavailable:",
        advancedMarkerError
      );
    }

    /*
     * Fallback for maximum compatibility.
     */
    const marker =
      new googleMaps.Marker({
        map,
        position: {
          lat,
          lng,
        },
        draggable: true,
        animation:
          googleMaps.Animation.DROP,
      });

    markerRef.current =
      marker;

    const dragListener =
      marker.addListener(
        "dragend",
        async () => {
          const position =
            marker.getPosition();

          if (!position) {
            return;
          }

          await reverseGeocode(
            googleMaps,
            position.lat(),
            position.lng()
          );
        }
      );

    listenersRef.current.push(
      () => dragListener.remove()
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Reverse Geocoding
  |--------------------------------------------------------------------------
  */

  const reverseGeocode = async (
    googleMaps,
    lat,
    lng
  ) => {
    try {
      if (!geocoderRef.current) {
        geocoderRef.current =
          new googleMaps.Geocoder();
      }

      const result =
        await new Promise(
          (resolve, reject) => {
            geocoderRef.current.geocode(
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
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      if (inputRef.current) {
        inputRef.current.value =
          locationName;
      }

      const location = {
        name: locationName,
        lat,
        lon: lng,
      };

      setError("");

      notifyLocation(
        location
      );

      return location;
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

      if (inputRef.current) {
        inputRef.current.value =
          location.name;
      }

      notifyLocation(
        location
      );

      setError(
        "Location selected, but the exact address could not be identified."
      );

      return location;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Select Coordinates
  |--------------------------------------------------------------------------
  */

  const selectCoordinates = async (
    googleMaps,
    lat,
    lng,
    options = {}
  ) => {
    if (!mapRef.current) {
      return;
    }

    const {
      zoom = 16,
      reverse = true,
    } = options;

    mapRef.current.panTo({
      lat,
      lng,
    });

    mapRef.current.setZoom(
      zoom
    );

    await placeMarker(
      googleMaps,
      mapRef.current,
      lat,
      lng
    );

    if (reverse) {
      await reverseGeocode(
        googleMaps,
        lat,
        lng
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initialize Google Maps
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);
        setError("");

        const googleMaps =
          await loadGoogleMaps();

        if (cancelled) {
          return;
        }

        if (!mapElementRef.current) {
          return;
        }

        /*
         * Kanpur as VOYNU's default
         * operating center.
         */
        const defaultCenter = {
          lat: 26.4499,
          lng: 80.3319,
        };

        /*
         * Map ID is recommended for
         * Advanced Markers.
         */
        const mapId =
          process.env
            .NEXT_PUBLIC_GOOGLE_MAP_ID;

        const map =
          new googleMaps.Map(
            mapElementRef.current,
            {
              center:
                defaultCenter,

              zoom: 12,

              ...(mapId
                ? {
                    mapId,
                  }
                : {}),

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                false,

              clickableIcons:
                false,

              gestureHandling:
                "greedy",

              zoomControl:
                true,

              cameraControl:
                false,

              styles: [
                {
                  featureType:
                    "poi.business",
                  stylers: [
                    {
                      visibility:
                        "on",
                    },
                  ],
                },
              ],
            }
          );

        mapRef.current =
          map;

        /*
         * Geocoder.
         */
        geocoderRef.current =
          new googleMaps.Geocoder();

        /*
         |--------------------------------------------------------------------------
         | Places Autocomplete
         |--------------------------------------------------------------------------
         */

        if (
          googleMaps.places
            ?.Autocomplete &&
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
                  "place_id",
                ],

                componentRestrictions: {
                  country: "in",
                },

                /*
                 * Bias suggestions toward
                 * the current map area.
                 */
                strictBounds:
                  false,
              }
            );

          autocompleteRef.current =
            autocomplete;

          /*
           * Bias autocomplete toward
           * the map viewport.
           */
          try {
            autocomplete.bindTo(
              "bounds",
              map
            );
          } catch {
            /*
             * Binding is optional.
             */
          }

          const placeChangedListener =
            autocomplete.addListener(
              "place_changed",
              async () => {
                const place =
                  autocomplete.getPlace();

                if (
                  !place.geometry
                    ?.location
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
                  inputRef.current
                    ?.value ||
                  "";

                const location = {
                  name:
                    locationName,
                  lat,
                  lon: lng,
                };

                setError("");

                lastExternalValueRef.current =
                  locationName;

                setSelectedLocation(
                  location
                );

                /*
                 * Keep the exact Google
                 * selected address.
                 */
                if (
                  inputRef.current
                ) {
                  inputRef.current.value =
                    locationName;
                }

                map.panTo({
                  lat,
                  lng,
                });

                map.setZoom(16);

                await placeMarker(
                  googleMaps,
                  map,
                  lat,
                  lng
                );

                onLocationSelectRef.current?.(
                  location
                );
              }
            );

          listenersRef.current.push(
            () =>
              placeChangedListener.remove()
          );
        }

        /*
         |--------------------------------------------------------------------------
         | Map click
         |--------------------------------------------------------------------------
         */

        const mapClickListener =
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

              setError("");

              await selectCoordinates(
                googleMaps,
                lat,
                lng,
                {
                  zoom: 16,
                  reverse: true,
                }
              );
            }
          );

        listenersRef.current.push(
          () =>
            mapClickListener.remove()
        );

        /*
         |--------------------------------------------------------------------------
         | Existing value
         |--------------------------------------------------------------------------
         */

        if (value) {
          if (inputRef.current) {
            inputRef.current.value =
              value;
          }
        }

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
    };

    initialize();

    /*
     * Cleanup.
     */
    return () => {
      cancelled = true;

      listenersRef.current.forEach(
        (cleanup) => {
          try {
            cleanup();
          } catch {}
        }
      );

      listenersRef.current = [];

      if (
        autocompleteRef.current
      ) {
        try {
          googleMapsSafeClearListeners(
            autocompleteRef.current
          );
        } catch {}
      }

      autocompleteRef.current =
        null;

      removeMarker();

      if (mapRef.current) {
        try {
          googleMapsSafeClearListeners(
            mapRef.current
          );
        } catch {}
      }

      mapRef.current =
        null;

      geocoderRef.current =
        null;
    };

    // Intentionally initialize once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Current Location
  |--------------------------------------------------------------------------
  */

  const useCurrentLocation =
    async () => {
      if (!navigator.geolocation) {
        setError(
          "Your browser does not support location services."
        );

        return;
      }

      if (locating) {
        return;
      }

      setLocating(true);
      setError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat =
              position.coords
                .latitude;

            const lng =
              position.coords
                .longitude;

            const googleMaps =
              await loadGoogleMaps();

            await selectCoordinates(
              googleMaps,
              lat,
              lng,
              {
                zoom: 17,
                reverse: true,
              }
            );
          } catch (err) {
            console.error(
              "Current location error:",
              err
            );

            setError(
              "Unable to identify your current location."
            );
          } finally {
            setLocating(false);
          }
        },
        (err) => {
          console.error(
            "Geolocation error:",
            err
          );

          setLocating(false);

          switch (err.code) {
            case 1:
              setError(
                "Location permission was denied. Please allow location access in your browser settings."
              );
              break;

            case 2:
              setError(
                "Your location could not be determined. Please try again or search manually."
              );
              break;

            case 3:
              setError(
                "Location request timed out. Please try again."
              );
              break;

            default:
              setError(
                "Unable to get your current location."
              );
          }
        },
        {
          enableHighAccuracy:
            true,

          timeout: 15000,

          maximumAge: 30000,
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Clear Location
  |--------------------------------------------------------------------------
  */

  const clearLocation = () => {
    removeMarker();

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }

    const emptyLocation = {
      name: "",
      lat: null,
      lon: null,
    };

    setSelectedLocation(
      emptyLocation
    );

    lastExternalValueRef.current =
      "";

    setError("");

    onLocationSelectRef.current?.(
      emptyLocation
    );

    if (mapRef.current) {
      mapRef.current.setCenter(
        {
          lat: 26.4499,
          lng: 80.3319,
        }
      );

      mapRef.current.setZoom(
        12
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="picker">
      {label && (
        <label className="pickerLabel">
          {label}
        </label>
      )}

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocationButton"
          onClick={
            useCurrentLocation
          }
          disabled={locating}
        >
          <span className="locationButtonIcon">
            {locating
              ? "◌"
              : "◎"}
          </span>

          <span>
            {locating
              ? "Finding your location..."
              : "Use my current location"}
          </span>
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

        {!loading &&
          !error && (
            <div className="mapHint">
              Tap the map to adjust
            </div>
          )}
      </div>

      {error && (
        <div className="mapError">
          <span>!</span>

          <span>
            {error}
          </span>
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
          defaultValue={
            selectedLocation.name
          }
          placeholder={
            placeholder
          }
          autoComplete="off"
          spellCheck="false"
          inputMode="search"
          onChange={(event) => {
            const name =
              event.target.value;

            /*
             * Critical:
             *
             * Once the user edits the
             * address manually, the old
             * coordinates are no longer
             * trustworthy.
             */
            const location = {
              name,
              lat: null,
              lon: null,
            };

            setSelectedLocation(
              location
            );

            lastExternalValueRef.current =
              name;

            setError("");

            onLocationSelectRef.current?.(
              location
            );
          }}
        />

        {selectedLocation.name && (
          <button
            type="button"
            className="clearButton"
            aria-label="Clear location"
            onClick={
              clearLocation
            }
          >
            ×
          </button>
        )}
      </div>

      <p className="helpText">
        Search for a place, building,
        address or landmark. You can also
        tap the map or drag the pin to
        fine-tune your location.
      </p>

      <style jsx>{`
        .picker {
          width: 100%;
        }

        .pickerLabel {
          display: block;
          margin-bottom: 9px;
          color: #52625a;
          font-size: 13px;
          font-weight: 800;
        }

        .currentLocationButton {
          width: 100%;
          min-height: 48px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 12px 15px;
          border: 1px solid #cce3d3;
          border-radius: 12px;
          background: #f0f8f3;
          color: #08783f;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.18s ease,
            transform 0.18s ease;
        }

        .currentLocationButton:hover {
          background: #e5f3ea;
        }

        .currentLocationButton:active {
          transform: scale(0.99);
        }

        .currentLocationButton:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .locationButtonIcon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .mapWrapper {
          position: relative;
          width: 100%;
          height: 310px;
          overflow: hidden;
          border: 1px solid #d9e1dc;
          border-radius: 15px;
          background: #f3f5f4;
        }

        .map {
          width: 100%;
          height: 100%;
        }

        .mapOverlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          color: #52625a;
          font-size: 13px;
          font-weight: 700;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #d9e8de;
          border-top-color: #08783f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .mapHint {
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform: translateX(-50%);
          z-index: 5;
          padding: 7px 12px;
          border-radius: 20px;
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          box-shadow:
            0 2px 8px
            rgba(
              0,
              0,
              0,
              0.12
            );
          color: #52625a;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          pointer-events: none;
        }

        .mapError {
          margin-top: 10px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 13px;
          border: 1px solid #f1c8c3;
          border-radius: 11px;
          background: #fff3f1;
          color: #b3342a;
          font-size: 13px;
          line-height: 1.45;
        }

        .mapError span:first-child {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #b3342a;
          color: white;
          font-size: 11px;
          font-weight: 900;
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
          z-index: 3;
          pointer-events: none;
          font-size: 17px;
        }

        .locationInput {
          width: 100%;
          min-height: 52px;
          box-sizing: border-box;
          padding: 15px 45px 15px 43px;
          border: 1px solid #d9e1dc;
          border-radius: 12px;
          background: #ffffff;
          color: #26372f;
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .locationInput::placeholder {
          color: #8a9690;
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

        .clearButton {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #eef2ef;
          color: #52625a;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .clearButton:hover {
          background: #e2e8e4;
        }

        .helpText {
          margin: 9px 0 0;
          color: #68776f;
          font-size: 12.5px;
          line-height: 1.5;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .mapWrapper {
            height: 290px;
            border-radius: 14px;
          }

          .locationInput {
            min-height: 54px;
            font-size: 15px;
          }

          .currentLocationButton {
            min-height: 50px;
          }

          .mapHint {
            bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Google Maps listener cleanup
|--------------------------------------------------------------------------
*/

function googleMapsSafeClearListeners(
  instance
) {
  if (
    typeof window !==
      "undefined" &&
    window.google?.maps?.event
  ) {
    window.google.maps.event.clearInstanceListeners(
      instance
    );
  }
}
