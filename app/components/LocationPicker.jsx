"use client";

import { useEffect, useRef, useState } from "react";

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.")
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-google-maps="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        resolve(window.google.maps);
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Google Maps failed to load."));
      });

      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&loading=async&v=weekly";

    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = async () => {
      try {
        await window.google.maps.importLibrary("maps");
        await window.google.maps.importLibrary("places");

        resolve(window.google.maps);
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function LocationPicker({
  label,
  value,
  placeholder = "Search for a place or address",
  onLocationSelect,
  allowCurrentLocation = false,
}) {
  const mapRef = useRef(null);
  const autocompleteContainerRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");

  // Keep value synchronized with parent
  useEffect(() => {
    if (value) {
      setQuery(value);
    }
  }, [value]);

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;

    const initializeGoogle = async () => {
      try {
        setLoading(true);
        setError("");

        const googleMaps = await loadGoogleMaps();

        if (cancelled) return;

        const { Map } = await googleMaps.importLibrary("maps");
        await googleMaps.importLibrary("places");

        if (!mapRef.current) return;

        // Prevent duplicate map creation
        if (!mapInstanceRef.current) {
          const map = new Map(mapRef.current, {
            center: {
              lat: 26.4499,
              lng: 80.3319,
            },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
          });

          mapInstanceRef.current = map;

          // Click anywhere on map
          map.addListener("click", async (event) => {
            if (!event.latLng) return;

            const lat = event.latLng.lat();
            const lng = event.latLng.lng();

            await selectCoordinates(lat, lng);
          });
        }

        setMapReady(true);
        setLoading(false);
      } catch (err) {
        console.error("Google Maps initialization error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load Google Maps. Please check your API key."
          );

          setLoading(false);
        }
      }
    };

    initializeGoogle();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize Google's new Place Autocomplete
  useEffect(() => {
    if (
      !mapReady ||
      !autocompleteContainerRef.current ||
      !window.google?.maps?.places
    ) {
      return;
    }

    // Prevent duplicate autocomplete
    if (autocompleteRef.current) {
      return;
    }

    const initializeAutocomplete = async () => {
      try {
        const { PlaceAutocompleteElement } =
          await window.google.maps.importLibrary("places");

        if (!autocompleteContainerRef.current) return;

        const autocomplete = new PlaceAutocompleteElement();

        autocomplete.placeholder = placeholder;

        // Restrict search to India
        autocomplete.includedRegionCodes = ["in"];

        // Keep the widget inside our container
        autocompleteContainerRef.current.appendChild(autocomplete);

        autocomplete.addEventListener(
          "gmp-select",
          async (event) => {
            try {
              setLoading(true);
              setError("");

              const placePrediction = event.placePrediction;

              if (!placePrediction) {
                setLoading(false);
                return;
              }

              const place = placePrediction.toPlace();

              await place.fetchFields({
                fields: [
                  "displayName",
                  "formattedAddress",
                  "location",
                ],
              });

              if (!place.location) {
                throw new Error(
                  "Google did not return coordinates for this place."
                );
              }

              const lat = place.location.lat();
              const lng = place.location.lng();

              const locationName =
                place.formattedAddress ||
                place.displayName ||
                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

              setQuery(locationName);

              await updateMapLocation(
                lat,
                lng,
                locationName
              );

              onLocationSelect?.({
                name: locationName,
                address: place.formattedAddress || "",
                placeId: place.id || "",
                lat,
                lon: lng,
              });

              setLoading(false);
            } catch (err) {
              console.error("Place selection error:", err);

              setError(
                "Unable to get details for this place."
              );

              setLoading(false);
            }
          }
        );

        autocompleteRef.current = autocomplete;
      } catch (err) {
        console.error(
          "Autocomplete initialization error:",
          err
        );

        setError(
          "Unable to initialize Google Places search."
        );
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
    };
  }, [mapReady, placeholder, onLocationSelect]);

  const updateMapLocation = async (
    lat,
    lng,
    locationName = ""
  ) => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const map = mapInstanceRef.current;

    // Remove previous marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add marker
    markerRef.current = new window.google.maps.Marker({
      position: {
        lat,
        lng,
      },
      map,
      title: locationName || "Selected location",
    });

    // Center map
    map.panTo({
      lat,
      lng,
    });

    map.setZoom(15);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const { Geocoder } =
        await window.google.maps.importLibrary(
          "geocoding"
        );

      const geocoder = new Geocoder();

      const response = await geocoder.geocode({
        location: {
          lat,
          lng,
        },
      });

      if (
        response.results &&
        response.results.length > 0
      ) {
        return response.results[0].formatted_address;
      }
    } catch (err) {
      console.error(
        "Google reverse geocoding error:",
        err
      );
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const selectCoordinates = async (lat, lng) => {
    try {
      setLoading(true);
      setError("");

      const locationName = await reverseGeocode(
        lat,
        lng
      );

      setQuery(locationName);

      await updateMapLocation(
        lat,
        lng,
        locationName
      );

      onLocationSelect?.({
        name: locationName,
        address: locationName,
        placeId: "",
        lat,
        lon: lng,
      });

      setLoading(false);
    } catch (err) {
      console.error(
        "Coordinate selection error:",
        err
      );

      setError(
        "Unable to identify this location."
      );

      setLoading(false);
    }
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
            "Unable to identify your current location."
          );

          setLoading(false);
        }
      },
      (err) => {
        console.error(
          "Geolocation error:",
          err
        );

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

      {/* Google Places Search */}
      <div
        ref={autocompleteContainerRef}
        className="googleSearch"
      />

      {allowCurrentLocation && (
        <button
          type="button"
          className="currentLocation"
          onClick={useCurrentLocation}
          disabled={loading}
        >
          📍{" "}
          {loading
            ? "Finding location..."
            : "Use my current location"}
        </button>
      )}

      {/* Google Map */}
      <div
        ref={mapRef}
        className="locationMap"
      />

      {loading && (
        <div className="mapLoading">
          Loading Google Maps...
        </div>
      )}

      {error && (
        <div className="locationError">
          ⚠️ {error}
        </div>
      )}

      <p className="locationHelp">
        📍 Search for a place, building, address or
        landmark, or tap the map to select an exact
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

        .googleSearch {
          width: 100%;
        }

        .googleSearch :global(gmp-place-autocomplete) {
          width: 100%;
        }

        .googleSearch :global(input) {
          box-sizing: border-box;
          width: 100%;
          min-height: 52px;
          padding: 14px 16px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          background: white;
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
          cursor: wait;
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

        .mapLoading {
          position: absolute;
          z-index: 10;
          top: 72px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #d9e1dc;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 12px;
          color: #52625a;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
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
          .locationMap {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
