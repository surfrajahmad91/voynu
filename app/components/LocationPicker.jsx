"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

let googleMapsPromise = null;

/*
|--------------------------------------------------------------------------
| VOYNU — Google Maps Loader
|--------------------------------------------------------------------------
|
| Loads Google Maps only once for the entire application.
|
| This component is responsible only for:
|
| - Google Maps loading
| - Places search
| - map interaction
| - current location
| - reverse geocoding
| - returning normalized location data
|
| Business rules such as:
|
| - service area
| - maximum trip distance
| - round-trip charging
|
| DO NOT put those rules here.
|
|--------------------------------------------------------------------------
*/

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "Google Maps requires a browser."
      )
    );
  }

  /*
   * Already loaded.
   */
  if (window.google?.maps) {
    return Promise.resolve(
      window.google.maps
    );
  }

  /*
   * Another LocationPicker is already
   * loading the library.
   */
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
      /*
       * Check whether another script
       * was already inserted.
       */
      const existingScript =
        document.querySelector(
          'script[data-voynu-google-maps="true"]'
        );

      if (existingScript) {
        const handleLoad = () => {
          if (window.google?.maps) {
            resolve(
              window.google.maps
            );
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
        document.createElement(
          "script"
        );

      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(
          apiKey
        )}` +
        "&libraries=places,marker";

      script.async = true;
      script.defer = true;

      script.dataset.voynuGoogleMaps =
        "true";

      script.onload = () => {
        if (window.google?.maps) {
          resolve(
            window.google.maps
          );
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

      document.head.appendChild(
        script
      );
    }
  );

  return googleMapsPromise;
}

/*
|--------------------------------------------------------------------------
| Default VOYNU map center
|--------------------------------------------------------------------------
|
| Kanpur is the initial operating market.
|
| IMPORTANT:
| This is only the initial map view.
|
| It is NOT the service-area validation.
|
|--------------------------------------------------------------------------
*/

const DEFAULT_MAP_CENTER = {
  lat: 26.4499,
  lng: 80.3319,
};

/*
|--------------------------------------------------------------------------
| Empty location
|--------------------------------------------------------------------------
*/

const EMPTY_LOCATION = {
  name: "",
  lat: null,
  lon: null,
  placeId: null,
  address: "",
  city: "",
  state: "",
  country: "",
};

/*
|--------------------------------------------------------------------------
| Normalize coordinates
|--------------------------------------------------------------------------
*/

function normalizeCoordinate(
  value
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
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
  onLocationError,
}) {
  /*
   * Google/map refs
   */
  const mapElementRef =
    useRef(null);

  const inputRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const markerRef =
    useRef(null);

  const autocompleteRef =
    useRef(null);

  const geocoderRef =
    useRef(null);

  /*
   * Event cleanup.
   */
  const listenersRef =
    useRef([]);

  /*
   * Keep latest callbacks without
   * recreating the Google Maps instance.
   */
  const onLocationSelectRef =
    useRef(onLocationSelect);

  const onLocationErrorRef =
    useRef(onLocationError);

  /*
   * Track externally controlled value.
   */
  const lastExternalValueRef =
    useRef(value || "");

  /*
   * Track whether the component
   * has a real selected location.
   */
  const hasCoordinatesRef =
    useRef(false);

  /*
   * UI state.
   */
  const [loading, setLoading] =
    useState(true);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState({
    ...EMPTY_LOCATION,
    name: value || "",
  });

  /*
  |--------------------------------------------------------------------------
  | Latest callbacks
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    onLocationSelectRef.current =
      onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    onLocationErrorRef.current =
      onLocationError;
  }, [onLocationError]);

  /*
  |--------------------------------------------------------------------------
  | Parent value synchronization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const nextValue =
      value || "";

    /*
     * Nothing changed.
     */
    if (
      nextValue ===
      lastExternalValueRef.current
    ) {
      return;
    }

    lastExternalValueRef.current =
      nextValue;

    /*
     * A parent-provided value is
     * text only unless coordinates
     * are separately supplied.
     *
     * Therefore do not assume that
     * the text itself represents a
     * valid selected location.
     */
    hasCoordinatesRef.current =
      false;

    setSelectedLocation(
      (current) => ({
        ...current,
        name: nextValue,
        lat: null,
        lon: null,
        placeId: null,
      })
    );

    if (inputRef.current) {
      inputRef.current.value =
        nextValue;
    }
  }, [value]);

  /*
  |--------------------------------------------------------------------------
  | Report error
  |--------------------------------------------------------------------------
  */

  const reportError = (
    text
  ) => {
    setError(text);

    onLocationErrorRef.current?.(
      text
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Notify parent
  |--------------------------------------------------------------------------
  */

  const notifyLocation = (
    location
  ) => {
    const normalizedLocation = {
      ...EMPTY_LOCATION,
      ...location,

      name:
        location?.name ||
        "",

      lat:
        normalizeCoordinate(
          location?.lat
        ),

      lon:
        normalizeCoordinate(
          location?.lon
        ),
    };

    hasCoordinatesRef.current =
      normalizedLocation.lat !== null &&
      normalizedLocation.lon !== null;

    setSelectedLocation(
      normalizedLocation
    );

    lastExternalValueRef.current =
      normalizedLocation.name;

    onLocationSelectRef.current?.(
      normalizedLocation
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Remove existing marker
  |--------------------------------------------------------------------------
  */

  const removeMarker = () => {
    const marker =
      markerRef.current;

    if (!marker) {
      return;
    }

    /*
     * AdvancedMarkerElement
     */
    try {
      if ("map" in marker) {
        marker.map = null;
      }
    } catch {}

    /*
     * Legacy Marker
     */
    try {
      if (
        typeof marker.setMap ===
        "function"
      ) {
        marker.setMap(null);
      }
    } catch {}

    markerRef.current =
      null;
  };

  /*
  |--------------------------------------------------------------------------
  | Reverse geocoding
  |--------------------------------------------------------------------------
  */

  const reverseGeocode = async (
    googleMaps,
    lat,
    lng
  ) => {
    try {
      if (
        !geocoderRef.current
      ) {
        geocoderRef.current =
          new googleMaps.Geocoder();
      }

      const result =
        await new Promise(
          (
            resolve,
            reject
          ) => {
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
                  status ===
                    "OK" &&
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

      /*
       * Extract useful address
       * components.
       *
       * This is informational data.
       * Trip eligibility should NOT
       * rely solely on these strings.
       */
      const addressComponents =
        result.address_components ||
        [];

      const getComponent =
        (type) => {
          const component =
            addressComponents.find(
              (item) =>
                item.types?.includes(
                  type
                )
            );

          return (
            component?.long_name ||
            ""
          );
        };

      const location = {
        name: locationName,

        lat,
        lon: lng,

        placeId:
          result.place_id ||
          null,

        address:
          locationName,

        city:
          getComponent(
            "locality"
          ) ||
          getComponent(
            "postal_town"
          ) ||
          getComponent(
            "administrative_area_level_2"
          ),

        state:
          getComponent(
            "administrative_area_level_1"
          ),

        country:
          getComponent(
            "country"
          ),
      };

      if (inputRef.current) {
        inputRef.current.value =
          locationName;
      }

      setError("");

      notifyLocation(
        location
      );

      return location;
    } catch (err) {
      console.error(
        "VOYNU reverse geocoding failed:",
        err
      );

      /*
       * Coordinates are still valid,
       * even if address lookup failed.
       */
      const location = {
        name:
          `${lat.toFixed(
            6
          )}, ${lng.toFixed(6)}`,

        lat,
        lon: lng,

        placeId: null,

        address: "",

        city: "",

        state: "",

        country: "",
      };

      if (inputRef.current) {
        inputRef.current.value =
          location.name;
      }

      notifyLocation(
        location
      );

      reportError(
        "Location selected, but we couldn't identify the exact address."
      );

      return location;
    }
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
        markerLibrary?.AdvancedMarkerElement;

      if (
        AdvancedMarkerElement
      ) {
        const marker =
          new AdvancedMarkerElement({
            map,

            position: {
              lat,
              lng,
            },

            title:
              "Selected location",

            gmpDraggable: true,
          });

        markerRef.current =
          marker;

        try {
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

              const normalizedLat =
                normalizeCoordinate(
                  nextLat
                );

              const normalizedLng =
                normalizeCoordinate(
                  nextLng
                );

              if (
                normalizedLat ===
                  null ||
                normalizedLng ===
                  null
              ) {
                return;
              }

              await reverseGeocode(
                googleMaps,
                normalizedLat,
                normalizedLng
              );
            };

          marker.addEventListener(
            "dragend",
            dragEndHandler
          );

          listenersRef.current.push(
            () => {
              try {
                marker.removeEventListener(
                  "dragend",
                  dragEndHandler
                );
              } catch {}
            }
          );
        } catch (err) {
          console.warn(
            "Unable to enable marker dragging:",
            err
          );
        }

        return;
      }
    } catch (err) {
      console.warn(
        "Advanced marker unavailable:",
        err
      );
    }

    /*
     * Legacy Marker fallback.
     */
    if (
      typeof googleMaps.Marker ===
      "function"
    ) {
      const marker =
        new googleMaps.Marker({
          map,

          position: {
            lat,
            lng,
          },

          draggable: true,

          animation:
            googleMaps.Animation
              ?.DROP,
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
        () => {
          try {
            dragListener.remove();
          } catch {}
        }
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Select coordinates
  |--------------------------------------------------------------------------
  */

  const selectCoordinates = async (
    googleMaps,
    lat,
    lng,
    options = {}
  ) => {
    if (
      !mapRef.current
    ) {
      return null;
    }

    const {
      zoom = 16,
      reverse = true,
    } = options;

    const normalizedLat =
      normalizeCoordinate(lat);

    const normalizedLng =
      normalizeCoordinate(lng);

    if (
      normalizedLat === null ||
      normalizedLng === null
    ) {
      return null;
    }

    mapRef.current.panTo({
      lat: normalizedLat,
      lng: normalizedLng,
    });

    mapRef.current.setZoom(
      zoom
    );

    await placeMarker(
      googleMaps,
      mapRef.current,
      normalizedLat,
      normalizedLng
    );

    if (reverse) {
      return reverseGeocode(
        googleMaps,
        normalizedLat,
        normalizedLng
      );
    }

    return null;
  };

  /*
  |--------------------------------------------------------------------------
  | Initialize Google Maps
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const initialize =
      async () => {
        try {
          setLoading(true);
          setError("");

          const googleMaps =
            await loadGoogleMaps();

          if (cancelled) {
            return;
          }

          if (
            !mapElementRef.current
          ) {
            return;
          }

          const mapId =
            process.env
              .NEXT_PUBLIC_GOOGLE_MAP_ID;

          const map =
            new googleMaps.Map(
              mapElementRef.current,
              {
                center:
                  DEFAULT_MAP_CENTER,

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
                    "address_components",
                  ],

                  componentRestrictions:
                    {
                      country:
                        "in",
                    },

                  strictBounds:
                    false,
                }
              );

            autocompleteRef.current =
              autocomplete;

            /*
             * Keep suggestions biased
             * toward the current map.
             */
            try {
              autocomplete.bindTo(
                "bounds",
                map
              );
            } catch {}

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
                    reportError(
                      "Please select a location from the suggestions."
                    );

                    return;
                  }

                  const lat =
                    place.geometry
                      .location.lat();

                  const lng =
                    place.geometry
                      .location.lng();

                  const locationName =
                    place.formatted_address ||
                    place.name ||
                    inputRef.current
                      ?.value ||
                    "";

                  const components =
                    place.address_components ||
                    [];

                  const getComponent =
                    (type) => {
                      const component =
                        components.find(
                          (
                            item
                          ) =>
                            item.types?.includes(
                              type
                            )
                        );

                      return (
                        component?.long_name ||
                        ""
                      );
                    };

                  const location = {
                    name:
                      locationName,

                    lat,

                    lon: lng,

                    placeId:
                      place.place_id ||
                      null,

                    address:
                      place.formatted_address ||
                      locationName,

                    city:
                      getComponent(
                        "locality"
                      ) ||
                      getComponent(
                        "postal_town"
                      ) ||
                      getComponent(
                        "administrative_area_level_2"
                      ),

                    state:
                      getComponent(
                        "administrative_area_level_1"
                      ),

                    country:
                      getComponent(
                        "country"
                      ),
                  };

                  setError("");

                  notifyLocation(
                    location
                  );

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

                  map.setZoom(
                    16
                  );

                  await placeMarker(
                    googleMaps,
                    map,
                    lat,
                    lng
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
              async (
                event
              ) => {
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
                    reverse:
                      true,
                  }
                );
              }
            );

          listenersRef.current.push(
            () => {
              try {
                mapClickListener.remove();
              } catch {}
            }
          );

          /*
          |--------------------------------------------------------------------------
          | Existing parent value
          |--------------------------------------------------------------------------
          */

          if (
            value &&
            inputRef.current
          ) {
            inputRef.current.value =
              value;
          }

          setLoading(false);
        } catch (err) {
          console.error(
            "VOYNU Google Maps error:",
            err
          );

          if (!cancelled) {
            reportError(
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

      listenersRef.current =
        [];

      try {
        if (
          autocompleteRef.current
        ) {
          googleMapsSafeClearListeners(
            autocompleteRef.current
          );
        }
      } catch {}

      autocompleteRef.current =
        null;

      removeMarker();

      try {
        if (mapRef.current) {
          googleMapsSafeClearListeners(
            mapRef.current
          );
        }
      } catch {}

      mapRef.current =
        null;

      geocoderRef.current =
        null;
    };

    /*
     * Intentionally initialize
     * Google Maps once.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Current Location
  |--------------------------------------------------------------------------
  */

  const useCurrentLocation =
    async () => {
      if (
        !navigator.geolocation
      ) {
        reportError(
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
        async (
          position
        ) => {
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
                reverse:
                  true,
              }
            );
          } catch (err) {
            console.error(
              "VOYNU current location error:",
              err
            );

            reportError(
              "Unable to identify your current location."
            );
          } finally {
            setLocating(false);
          }
        },

        (err) => {
          console.error(
            "VOYNU geolocation error:",
            err
          );

          setLocating(false);

          switch (
            err.code
          ) {
            case 1:
              reportError(
                "Location permission was denied. Please allow location access in your browser settings."
              );
              break;

            case 2:
              reportError(
                "Your location could not be determined. Please try again or search manually."
              );
              break;

            case 3:
              reportError(
                "Location request timed out. Please try again."
              );
              break;

            default:
              reportError(
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
  | Clear location
  |--------------------------------------------------------------------------
  */

  const clearLocation =
    () => {
      removeMarker();

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }

      hasCoordinatesRef.current =
        false;

      lastExternalValueRef.current =
        "";

      setSelectedLocation(
        EMPTY_LOCATION
      );

      setError("");

      onLocationSelectRef.current?.(
        EMPTY_LOCATION
      );

      if (
        mapRef.current
      ) {
        mapRef.current.setCenter(
          DEFAULT_MAP_CENTER
        );

        mapRef.current.setZoom(
          12
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Manual input
  |--------------------------------------------------------------------------
  |
  | Typing into the field invalidates
  | the previously selected coordinates.
  |
  | The customer must select a Google
  | suggestion or use the map/current
  | location again.
  |
  |--------------------------------------------------------------------------
  */

  const handleInputChange =
    (event) => {
      const name =
        event.target.value;

      const location = {
        ...EMPTY_LOCATION,

        name,

        lat: null,

        lon: null,
      };

      hasCoordinatesRef.current =
        false;

      lastExternalValueRef.current =
        name;

      setSelectedLocation(
        location
      );

      setError("");

      onLocationSelectRef.current?.(
        location
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="picker">

      {label && (
        <label
          className="pickerLabel"
        >
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

      {/*
       * Search is intentionally
       * positioned before the map.
       *
       * This is easier on mobile:
       * customer can search first and
       * only use the map for adjustment.
       */}

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
          onChange={
            handleInputChange
          }
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
              Tap map or drag pin to adjust
            </div>
          )}

      </div>

      {error && (
        <div
          className="mapError"
          role="alert"
          aria-live="polite"
        >
          <span>
            !
          </span>

          <span>
            {error}
          </span>
        </div>
      )}

      <p className="helpText">

        Search for a place, building,
        address or landmark.

        <br />

        You can also tap the map or
        drag the pin to fine-tune
        the location.

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

        /* ======================================================
           CURRENT LOCATION
        ====================================================== */

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

        /* ======================================================
           SEARCH
        ====================================================== */

        .searchWrapper {
          position: relative;

          margin-bottom: 12px;
        }

        .searchIcon {
          position: absolute;

          left: 14px;
          top: 50%;

          transform:
            translateY(-50%);

          z-index: 3;

          pointer-events: none;

          font-size: 17px;
        }

        .locationInput {
          width: 100%;

          min-height: 54px;

          box-sizing: border-box;

          padding:
            15px 45px 15px 43px;

          border:
            1px solid #d9e1dc;

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

        /* ======================================================
           CLEAR
        ====================================================== */

        .clearButton {
          position: absolute;

          right: 9px;
          top: 50%;

          transform:
            translateY(-50%);

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

        /* ======================================================
           MAP
        ====================================================== */

        .mapWrapper {
          position: relative;

          width: 100%;
          height: 310px;

          overflow: hidden;

          border:
            1px solid #d9e1dc;

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

          background:
            rgba(
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

          border:
            3px solid #d9e8de;

          border-top-color:
            #08783f;

          border-radius: 50%;

          animation:
            spin
            0.8s
            linear
            infinite;
        }

        .mapHint {
          position: absolute;

          left: 50%;
          bottom: 12px;

          transform:
            translateX(-50%);

          z-index: 5;

          padding:
            7px 12px;

          border-radius: 20px;

          background:
            rgba(
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

        /* ======================================================
           ERROR
        ====================================================== */

        .mapError {
          margin-top: 10px;

          display: flex;
          align-items: flex-start;

          gap: 9px;

          padding:
            11px 13px;

          border:
            1px solid #f1c8c3;

          border-radius: 11px;

          background:
            #fff3f1;

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

          background:
            #b3342a;

          color: white;

          font-size: 11px;
          font-weight: 900;
        }

        /* ======================================================
           HELP
        ====================================================== */

        .helpText {
          margin: 9px 0 0;

          color: #68776f;

          font-size: 12.5px;

          line-height: 1.5;
        }

        /* ======================================================
           MOBILE
        ====================================================== */

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

          .helpText {
            font-size: 11.5px;
          }
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
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
