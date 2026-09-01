"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { loadGoogleMaps, extractCityName } from "../lib/googleMaps";
import MapLocationPicker from "./MapLocationPicker";

const RECENT_LOCATIONS_KEY = "voynu_recent_locations_v1";
const MAX_RECENT_LOCATIONS = 4;

function PinIcon({ tone = "pickup", size = 17 }) {
  const color = tone === "drop" ? "#c8622a" : "#08783f";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 10.2c0 5.2-8 11-8 11s-8-5.8-8-11a8 8 0 1 1 16 0Z" fill={color} />
      <circle cx="12" cy="10" r="3" fill="#fff" />
    </svg>
  );
}

function CurrentLocationIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function MapIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

function ClockIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function CloseIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function LocationPicker({
  label,
  value = "",
  placeholder,
  allowCurrentLocation = false,
  onLocationSelect,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);

  const tone = /drop|destination/i.test(String(label || "")) ? "drop" : "pickup";
  const friendlyPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return tone === "pickup" ? "Where should we pick you up?" : "Where are you going?";
  }, [placeholder, tone]);

  const [mapsReady, setMapsReady] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ lat: null, lon: null });
  const [recentLocations, setRecentLocations] = useState([]);
  const [focused, setFocused] = useState(false);

  const hasValue = String(value || "").trim().length > 0;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || "[]");
      if (Array.isArray(stored)) setRecentLocations(stored.slice(0, MAX_RECENT_LOCATIONS));
    } catch {
      setRecentLocations([]);
    }
  }, []);

  useEffect(() => {
    if (inputRef.current && typeof value === "string" && value !== inputRef.current.value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const rememberLocation = (location) => {
    if (!location?.name || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lon))) return;

    const item = {
      name: String(location.name).trim(),
      lat: Number(location.lat),
      lon: Number(location.lon),
      placeId: location.placeId || null,
      city: location.city || null,
    };

    try {
      const existing = JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) || "[]");
      const next = [item, ...(Array.isArray(existing) ? existing : [])]
        .filter((entry, index, array) => {
          if (!entry?.name) return false;
          return index === array.findIndex((candidate) =>
            candidate?.placeId && item.placeId
              ? candidate.placeId === item.placeId
              : Number(candidate?.lat) === item.lat && Number(candidate?.lon) === item.lon
          );
        })
        .slice(0, MAX_RECENT_LOCATIONS);

      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(next));
      setRecentLocations(next);
    } catch {
      // Recent locations are only a convenience; never block booking if storage is unavailable.
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch((err) => {
        console.error("VOYNU Google Maps error:", err);
        if (!cancelled) setError("Location search is temporarily unavailable.");
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || !window.google?.maps?.places || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name", "place_id", "address_components"],
      componentRestrictions: { country: "in" },
      types: ["geocode", "establishment"],
    });

    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place?.geometry?.location;

      if (!location) {
        setError("Please select a location from the suggested locations.");
        return;
      }

      const lat = location.lat();
      const lon = location.lng();
      const name = place.formatted_address || place.name || "";
      const city = extractCityName(place.address_components);
      const selected = { name, lat, lon, placeId: place.place_id || null, city };

      setError("");
      setCurrentCoords({ lat, lon });
      rememberLocation(selected);
      onLocationSelect?.(selected);
      setFocused(false);
    });

    listenerRef.current = listener;

    return () => {
      if (listenerRef.current) {
        window.google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      autocompleteRef.current = null;
    };
  }, [mapsReady, onLocationSelect]);

  const useCurrentLocation = () => {
    if (!allowCurrentLocation || locating) return;
    setError("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your device does not support location services.");
      return;
    }

    if (!mapsReady || !window.google?.maps?.Geocoder) {
      setError("Please wait for location services to load.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
          setLocating(false);
          if (status !== "OK" || !results?.length) {
            setError("Unable to determine your current address. Please search manually.");
            return;
          }

          const address = results[0].formatted_address || "";
          const city = extractCityName(results[0].address_components);
          const selected = {
            name: address,
            lat,
            lon,
            placeId: results[0].place_id || null,
            city,
          };

          if (inputRef.current) inputRef.current.value = address;
          setError("");
          setCurrentCoords({ lat, lon });
          rememberLocation(selected);
          onLocationSelect?.(selected);
          setFocused(false);
        });
      },
      (geoError) => {
        setLocating(false);
        console.error("VOYNU geolocation error:", geoError);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Location permission was denied. Please allow access or search manually.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError("Your current location is unavailable. Please search manually.");
        } else {
          setError("Location request timed out. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleMapConfirm = (location) => {
    if (inputRef.current) inputRef.current.value = location.name;
    setError("");
    setCurrentCoords({ lat: location.lat, lon: location.lon });
    setMapPickerOpen(false);
    rememberLocation(location);
    onLocationSelect?.(location);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setCurrentCoords({ lat: null, lon: null });
    setError("");
    onLocationSelect?.(null);
    inputRef.current?.focus();
    setFocused(true);
  };

  const handleInputChange = () => {
    setError("");
    // Typing after a selected location invalidates its coordinates until a suggestion is selected.
    onLocationSelect?.(null);
  };

  const visibleRecent = recentLocations.filter((location) => location.name !== value).slice(0, MAX_RECENT_LOCATIONS);
  const showRecent = focused && !hasValue && visibleRecent.length > 0;

  return (
    <div className="locationPicker">
      <div className="locationLabelRow">
        <label className="locationLabel">
          <span className={`locationLabelIcon ${tone}`}><PinIcon tone={tone} size={16} /></span>
          {label}
        </label>
        {tone === "pickup" && <span className="locationHintLabel">Your starting point</span>}
        {tone === "drop" && <span className="locationHintLabel">Your destination</span>}
      </div>

      <div className={`inputWrapper ${hasValue ? "hasValue" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          placeholder={friendlyPlaceholder}
          autoComplete="off"
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 180)}
          className="locationInput"
          style={{ paddingRight: hasValue ? "88px" : "96px" }}
          aria-label={label}
          aria-describedby={`${tone}-location-help`}
        />

        <div className="inputActions">
          {hasValue && (
            <button type="button" className="actionButton clearButton" onClick={handleClear} aria-label="Clear selected location" title="Clear location">
              <CloseIcon />
            </button>
          )}
          <button
            type="button"
            className="actionButton"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setMapPickerOpen(true)}
            disabled={!mapsReady}
            aria-label="Pick location on map"
            title="Pick location on map"
          >
            <MapIcon />
          </button>
          {allowCurrentLocation && (
            <button
              type="button"
              className="actionButton currentButton"
              onMouseDown={(event) => event.preventDefault()}
              onClick={useCurrentLocation}
              disabled={locating || !mapsReady}
              aria-label="Use current location"
              title="Use current location"
            >
              {locating ? <span className="spinner" /> : <CurrentLocationIcon />}
            </button>
          )}
        </div>

        {hasValue && (
          <div className={`selectedBadge ${tone}`} aria-label="Location selected">
            <CheckIcon size={13} /> Selected
          </div>
        )}
      </div>

      {allowCurrentLocation && !hasValue && (
        <button
          type="button"
          className="currentLocationLink"
          onClick={useCurrentLocation}
          disabled={locating || !mapsReady}
        >
          <CurrentLocationIcon size={15} />
          {locating ? "Finding your location..." : "Use my current location"}
        </button>
      )}

      <div id={`${tone}-location-help`} className="locationHelper">
        <span>{tone === "pickup" ? "Search for an area, landmark or exact address" : "Search for an area, landmark or exact address"}</span>
        <span className="mapHelper"><MapIcon size={12} /> Map</span>
      </div>

      {showRecent && (
        <div className="recentLocations" onMouseDown={(event) => event.preventDefault()}>
          <div className="recentTitle"><ClockIcon size={14} /> Recent locations</div>
          {visibleRecent.map((location) => (
            <button
              key={`${location.placeId || "loc"}-${location.lat}-${location.lon}`}
              type="button"
              className="recentItem"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = location.name;
                setCurrentCoords({ lat: location.lat, lon: location.lon });
                setError("");
                onLocationSelect?.(location);
                setFocused(false);
              }}
            >
              <span className={`recentPin ${tone}`}><PinIcon tone={tone} size={15} /></span>
              <span className="recentText">{location.name}</span>
            </button>
          ))}
        </div>
      )}

      {!mapsReady && !error && <div className="locationHint">Loading location search...</div>}
      {error && <div className="locationError" role="alert">{error}</div>}

      <MapLocationPicker
        open={mapPickerOpen}
        title={`Choose ${tone === "pickup" ? "pickup" : "destination"} location`}
        initialLat={currentCoords.lat}
        initialLon={currentCoords.lon}
        onConfirm={handleMapConfirm}
        onClose={() => setMapPickerOpen(false)}
      />

      <style jsx>{`
        .locationPicker { width: 100%; min-width: 0; position: relative; }
        .locationLabelRow { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
        .locationLabel { display:flex; align-items:center; gap:7px; color:#34483d; font-size:12px; font-weight:800; }
        .locationLabelIcon { width:25px; height:25px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#eaf6ee; color:#08783f; }
        .locationLabelIcon.drop { background:#fff0e8; color:#c8622a; }
        .locationHintLabel { color:#94a099; font-size:10px; font-weight:600; }
        .inputWrapper { position:relative; width:100%; }
        .locationInput { width:100%; height:56px; padding:0 15px; border:1.5px solid #dfe8e2; border-radius:14px; background:#fbfdfc; color:#1d3027; font-family:inherit; font-size:14px; outline:none; transition:border-color .2s ease,box-shadow .2s ease,background .2s ease; }
        .locationInput::placeholder { color:#9aa8a1; }
        .locationInput:focus { border-color:#08783f; background:#fff; box-shadow:0 0 0 4px rgba(8,120,63,.09); }
        .inputWrapper:has(.locationInput:focus) .locationLabelIcon { box-shadow:0 0 0 3px rgba(8,120,63,.08); }
        .inputWrapper.hasValue .locationInput { border-color:#b8d9c3; background:#f7fcf8; padding-right:96px !important; }
        .inputActions { position:absolute; top:50%; right:8px; transform:translateY(-50%); display:flex; gap:5px; z-index:2; }
        .actionButton { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border:0; border-radius:9px; background:#eef6f0; color:#08783f; cursor:pointer; transition:transform .15s ease,background .15s ease; }
        .actionButton:hover:not(:disabled) { background:#e1f1e6; transform:translateY(-1px); }
        .actionButton.clearButton { background:#f2f4f3; color:#64736b; }
        .actionButton.currentButton { background:#e5f4e9; }
        .actionButton:disabled { opacity:.55; cursor:wait; }
        .spinner { width:14px; height:14px; border:2px solid rgba(8,120,63,.22); border-top-color:#08783f; border-radius:50%; animation:spin .7s linear infinite; }
        .selectedBadge { position:absolute; left:13px; bottom:7px; display:flex; align-items:center; gap:3px; font-size:9px; line-height:1; font-weight:800; color:#08783f; pointer-events:none; }
        .selectedBadge.drop { color:#b95420; }
        .currentLocationLink { display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:2px 0; border:0; background:transparent; color:#08783f; font-family:inherit; font-size:11px; font-weight:800; cursor:pointer; }
        .currentLocationLink:disabled { opacity:.55; cursor:wait; }
        .locationHelper { display:flex; justify-content:space-between; align-items:center; margin-top:6px; color:#97a39d; font-size:9.5px; line-height:1.3; }
        .mapHelper { display:inline-flex; align-items:center; gap:3px; color:#738178; font-weight:700; }
        .recentLocations { position:absolute; left:0; right:0; top:86px; z-index:30; padding:9px; border:1px solid #e0e8e3; border-radius:13px; background:#fff; box-shadow:0 18px 35px rgba(18,47,32,.14); }
        .recentTitle { display:flex; align-items:center; gap:6px; padding:3px 5px 7px; color:#738178; font-size:10px; font-weight:800; }
        .recentItem { width:100%; display:flex; align-items:center; gap:9px; padding:9px 7px; border:0; border-radius:9px; background:transparent; color:#2d4036; text-align:left; font-family:inherit; cursor:pointer; }
        .recentItem:hover { background:#f4f8f5; }
        .recentPin { width:28px; height:28px; flex:0 0 28px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#eaf6ee; }
        .recentPin.drop { background:#fff0e8; }
        .recentText { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:650; }
        .locationHint { margin-top:5px; color:#8b9790; font-size:10px; }
        .locationError { margin-top:6px; color:#b33d34; font-size:10px; line-height:1.4; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:700px) { .locationInput { height:54px; font-size:14px; } .locationHintLabel { display:none; } .locationHelper { font-size:9px; } }
      `}</style>
    </div>
  );
}
