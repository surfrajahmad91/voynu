"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  loadGoogleMaps,
  extractCityName,
} from "../lib/googleMaps";

/*
 * Used only as a sensible default map center before the user has
 * panned anywhere — not a business rule, purely a UX starting point.
 */
const DEFAULT_CENTER = {
  lat: 26.4499,
  lng: 80.3319,
};

export default function MapLocationPicker({
  open,
  title = "Choose location",
  initialLat = null,
  initialLon = null,
  onConfirm,
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const idleListenerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [mapsReady, setMapsReady] =
    useState(false);

  const [resolvedAddress, setResolvedAddress] =
    useState("");

  const [resolvedCity, setResolvedCity] =
    useState(null);

  const [resolvedPlaceId, setResolvedPlaceId] =
    useState(null);

  const [center, setCenter] =
    useState(null);

  const [resolving, setResolving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ------------------------------------------------------------
   * LOAD GOOGLE MAPS WHEN OPENED
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
        }
      })
      .catch((err) => {
        console.error(
          "VOYNU map picker load error:",
          err
        );

        if (!cancelled) {
          setError(
            "Map is temporarily unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  /*
   * ------------------------------------------------------------
   * REVERSE GEOCODE HELPER
   * ------------------------------------------------------------
   */

  const reverseGeocode = useCallback(
    (lat, lng) => {
      if (!geocoderRef.current) {
        return;
      }

      setResolving(true);

      geocoderRef.current.geocode(
        {
          location: { lat, lng },
        },
        (results, status) => {
          setResolving(false);

          if (
            status !== "OK" ||
            !results?.length
          ) {
            setResolvedAddress("");
            setResolvedCity(null);
            setResolvedPlaceId(null);

            setError(
              "Unable to determine the address for this location."
            );

            return;
          }

          setError("");

          setResolvedAddress(
            results[0]
              .formatted_address ||
              ""
          );

          setResolvedCity(
            extractCityName(
              results[0]
                .address_components
            )
          );

          setResolvedPlaceId(
            results[0].place_id ||
              null
          );
        }
      );
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * CREATE MAP
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      !open ||
      !mapsReady ||
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const startLat =
      Number.isFinite(initialLat)
        ? initialLat
        : DEFAULT_CENTER.lat;

    const startLng =
      Number.isFinite(initialLon)
        ? initialLon
        : DEFAULT_CENTER.lng;

    const map =
      new window.google.maps.Map(
        mapContainerRef.current,
        {
          center: {
            lat: startLat,
            lng: startLng,
          },

          zoom: 15,

          disableDefaultUI: true,

          zoomControl: true,

          gestureHandling: "greedy",
        }
      );

    mapRef.current = map;

    geocoderRef.current =
      new window.google.maps.Geocoder();

    setCenter({
      lat: startLat,
      lng: startLng,
    });

    reverseGeocode(
      startLat,
      startLng
    );

    const listener = map.addListener(
      "idle",
      () => {
        const c = map.getCenter();

        if (!c) {
          return;
        }

        const lat = c.lat();
        const lng = c.lng();

        setCenter({ lat, lng });

        reverseGeocode(lat, lng);
      }
    );

    idleListenerRef.current =
      listener;

    if (
      searchInputRef.current &&
      window.google.maps.places
    ) {
      const autocomplete =
        new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            fields: [
              "geometry",
              "formatted_address",
              "address_components",
              "place_id",
            ],

            componentRestrictions: {
              country: "in",
            },
          }
        );

      autocompleteRef.current =
        autocomplete;

      autocomplete.addListener(
        "place_changed",
        () => {
          const place =
            autocomplete.getPlace();

          const location =
            place?.geometry?.location;

          if (!location) {
            return;
          }

          map.panTo(location);
          map.setZoom(16);
        }
      );
    }

    return () => {
      if (idleListenerRef.current) {
        window.google.maps.event.removeListener(
          idleListenerRef.current
        );

        idleListenerRef.current =
          null;
      }
    };
  }, [
    open,
    mapsReady,
    initialLat,
    initialLon,
    reverseGeocode,
  ]);

  /*
   * ------------------------------------------------------------
   * RESET WHEN CLOSED
   *
   * So reopening creates a fresh map instance rather than
   * reusing a stale one.
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!open) {
      mapRef.current = null;
      setMapsReady(false);
      setResolvedAddress("");
      setResolvedCity(null);
      setResolvedPlaceId(null);
      setCenter(null);
      setError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (!center || !resolvedAddress) {
      return;
    }

    onConfirm?.({
      name: resolvedAddress,
      lat: center.lat,
      lon: center.lng,
      placeId: resolvedPlaceId,
      city: resolvedCity,
    });
  };

  return (
    <div
      className="mapPickerOverlay"
      role="dialog"
      aria-modal="true"
    >

      <div className="mapPickerSheet">

        <div className="mapPickerHeader">

          <span>{title}</span>

          <button
            type="button"
            className="mapPickerClose"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>

        </div>

        <div className="mapPickerSearch">

          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search area..."
            className="mapPickerSearchInput"
          />

        </div>

        <div className="mapPickerMapWrap">

          <div
            ref={mapContainerRef}
            className="mapPickerMap"
          />

          <div
            className="mapPickerPin"
            aria-hidden="true"
          >
            <svg
              width="34"
              height="42"
              viewBox="0 0 34 42"
              fill="none"
            >
              <path
                d="M17 0C7.6 0 0 7.6 0 17c0 12 17 25 17 25s17-13 17-25C34 7.6 26.4 0 17 0z"
                fill="#08783f"
              />
              <circle
                cx="17"
                cy="17"
                r="6.5"
                fill="#ffffff"
              />
            </svg>
          </div>

        </div>

        <div className="mapPickerFooter">

          <div className="mapPickerAddress">

            {!mapsReady
              ? "Loading map..."
              : resolving
              ? "Locating..."
              : error
              ? error
              : resolvedAddress ||
                "Move the map to select a location"}

          </div>

          <button
            type="button"
            className="mapPickerConfirm"
            onClick={handleConfirm}
            disabled={
              !resolvedAddress ||
              resolving
            }
          >
            Confirm location
          </button>

        </div>

      </div>

      <style jsx>{`

        .mapPickerOverlay {
          position: fixed;
          inset: 0;

          z-index: 1000;

          background: rgba(10, 20, 15, 0.55);

          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .mapPickerSheet {
          width: 100%;
          max-width: 560px;
          height: min(88vh, 720px);

          background: #ffffff;

          border-radius: 20px 20px 0 0;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        @media (min-width: 700px) {

          .mapPickerOverlay {
            align-items: center;
          }

          .mapPickerSheet {
            border-radius: 20px;
            height: min(80vh, 680px);
          }

        }

        .mapPickerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 16px 18px;

          font-weight: 800;
          font-size: 15px;
          color: #16241d;

          border-bottom: 1px solid #eef2ef;
        }

        .mapPickerClose {
          border: 0;

          background: #f1f4f2;

          width: 30px;
          height: 30px;

          border-radius: 50%;

          font-size: 14px;

          cursor: pointer;
        }

        .mapPickerSearch {
          padding: 10px 14px;
        }

        .mapPickerSearchInput {
          width: 100%;
          height: 44px;

          border: 1px solid #dfe6e1;
          border-radius: 10px;

          padding: 0 14px;

          font-size: 14px;

          outline: none;
        }

        .mapPickerMapWrap {
          position: relative;
          flex: 1;

          background: #eef2ef;
        }

        .mapPickerMap {
          position: absolute;
          inset: 0;
        }

        .mapPickerPin {
          position: absolute;

          top: 50%;
          left: 50%;

          transform: translate(-50%, -100%);

          pointer-events: none;

          filter:
            drop-shadow(
              0 6px 6px
              rgba(0, 0, 0, 0.25)
            );
        }

        .mapPickerFooter {
          padding: 14px 16px 18px;

          border-top: 1px solid #eef2ef;
        }

        .mapPickerAddress {
          font-size: 13px;
          color: #4b5c53;

          margin-bottom: 10px;

          min-height: 18px;
        }

        .mapPickerConfirm {
          width: 100%;
          height: 50px;

          border: 0;
          border-radius: 12px;

          background: #08783f;
          color: #ffffff;

          font-weight: 800;
          font-size: 14px;

          cursor: pointer;
        }

        .mapPickerConfirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

      `}</style>

    </div>
  );
}
