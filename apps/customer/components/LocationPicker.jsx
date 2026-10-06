"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { loadGoogleMaps, extractCityName } from "../lib/googleMaps";
import { theme } from "../../../shared/lib/theme";
import MapLocationPicker from "./MapLocationPicker";
import { PLACE_KINDS, useSavedPlaces } from "../lib/savedPlaces";

const RECENT_LOCATIONS_KEY = "voynu_recent_locations_v1";
const MAX_RECENT_LOCATIONS = 4;

function PinIcon({ tone = "pickup", size = 17 }) {
  const color = tone === "drop" ? theme.colors.accentDark : theme.colors.primary;
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

function HomeIcon({ size = 16 }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M10 20v-5h4v5" /></svg>);
}
function WorkIcon({ size = 16 }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M3 13h18" /></svg>);
}
const PLACE_META = { home: { label: "Home", Icon: HomeIcon }, work: { label: "Work", Icon: WorkIcon } };

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
  const { places: savedPlaces, save: savePlace, remove: removePlace } = useSavedPlaces();
  const lastSelectedRef = useRef(null);
  const [savingKind, setSavingKind] = useState(null); // set -> next map confirm also saves this kind
  const [editKind, setEditKind] = useState(null);

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
    lastSelectedRef.current = item;

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
    if (savingKind) {
      const kind = savingKind;
      setSavingKind(null);
      savePlace(kind, location).catch(() => setError("Couldn't save that place. Please try again."));
    }
  };

  const applySavedPlace = (place) => {
    if (inputRef.current) inputRef.current.value = place.name;
    lastSelectedRef.current = place;
    setCurrentCoords({ lat: place.lat, lon: place.lon });
    setError("");
    setEditKind(null);
    onLocationSelect?.(place);
    setFocused(false);
  };

  const openSaveMap = (kind) => {
    const p = savedPlaces[kind];
    if (p) setCurrentCoords({ lat: p.lat, lon: p.lon });
    setSavingKind(kind);
    setEditKind(null);
    setMapPickerOpen(true);
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
        {hasValue
          ? <span className={`selectedPill ${tone}`}><CheckIcon size={13} /> Selected</span>
          : <span className="locationHintLabel">{tone === "pickup" ? "Your starting point" : "Your destination"}</span>}
      </div>

      {!hasValue && (
        <div className="savedRow">
          {PLACE_KINDS.map((kind) => {
            const { label: kindLabel, Icon } = PLACE_META[kind];
            const place = savedPlaces[kind];
            return place ? (
              <span key={kind} className="savedChip set">
                <button type="button" className="savedChipMain" onClick={() => applySavedPlace(place)} aria-label={`Use ${kindLabel}: ${place.name}`}><Icon size={15} /> {kindLabel}</button>
                <button type="button" className="savedChipEdit" onClick={() => setEditKind(editKind === kind ? null : kind)} aria-label={`Edit ${kindLabel}`} aria-expanded={editKind === kind}>···</button>
              </span>
            ) : (
              <button key={kind} type="button" className="savedChip add" onClick={() => openSaveMap(kind)}><Icon size={15} /> Add {kindLabel}</button>
            );
          })}
        </div>
      )}
      {!hasValue && editKind && savedPlaces[editKind] && (
        <div className="savedEdit">
          <span className="savedEditName">{savedPlaces[editKind].name}</span>
          <button type="button" onClick={() => openSaveMap(editKind)}>Change</button>
          <button type="button" className="danger" onClick={() => { const k = editKind; setEditKind(null); removePlace(k).catch(() => setError("Couldn't remove that place. Please try again.")); }}>Remove</button>
        </div>
      )}
      {hasValue && lastSelectedRef.current?.name === value && PLACE_KINDS.some((k) => !savedPlaces[k]) && !PLACE_KINDS.some((k) => savedPlaces[k]?.name === value) && (
        <div className="saveCurrent">
          <span>Save as</span>
          {PLACE_KINDS.filter((k) => !savedPlaces[k]).map((kind) => (
            <button key={kind} type="button" onClick={() => savePlace(kind, lastSelectedRef.current).catch(() => setError("Couldn't save that place. Please try again."))}>{PLACE_META[kind].label}</button>
          ))}
        </div>
      )}

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
          style={{ paddingRight: hasValue ? "96px" : "52px" }}
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
          {allowCurrentLocation && hasValue && (
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
        <span>Search an area, landmark or address, or pin it on the map.</span>
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
        title={savingKind ? `Set ${PLACE_META[savingKind].label} location` : `Choose ${tone === "pickup" ? "pickup" : "destination"} location`}
        initialLat={currentCoords.lat}
        initialLon={currentCoords.lon}
        onConfirm={handleMapConfirm}
        onClose={() => { setMapPickerOpen(false); setSavingKind(null); }}
      />

      <style jsx>{`
        .locationPicker { width: 100%; min-width: 0; position: relative; }
        .savedRow { display:flex; gap:8px; margin:0 0 8px; }
        .savedChip { display:inline-flex; align-items:center; min-height:34px; border-radius:999px; font-size:12.5px; font-weight:800; color:${theme.colors.primary}; }
        .savedChip.set { background:${theme.colors.primaryTint}; border:1.5px solid rgba(10,127,166,.22); overflow:hidden; }
        .savedChip.add { gap:6px; padding:0 13px; background:transparent; border:1.5px dashed ${theme.colors.borderStrong}; color:${theme.colors.textMuted}; }
        .savedChipMain { display:inline-flex; align-items:center; gap:6px; min-height:34px; padding:0 6px 0 12px; border:0; background:transparent; color:inherit; font:inherit; }
        .savedChipEdit { min-height:34px; padding:0 11px 0 4px; border:0; background:transparent; color:${theme.colors.textMuted}; font-size:14px; font-weight:800; letter-spacing:1px; }
        .savedEdit { display:flex; align-items:center; gap:8px; margin:-2px 0 8px; padding:7px 10px; border-radius:12px; background:${theme.colors.bg}; border:1px solid ${theme.colors.border}; font-size:12px; }
        .savedEditName { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${theme.colors.textMuted}; }
        .savedEdit button { min-height:30px; padding:0 10px; border-radius:9px; border:1px solid ${theme.colors.border}; background:#fff; color:${theme.colors.primary}; font-size:12px; font-weight:800; }
        .savedEdit button.danger { color:${theme.colors.error}; }
        .saveCurrent { display:flex; align-items:center; gap:8px; margin:0 0 8px; font-size:12px; color:${theme.colors.textMuted}; }
        .saveCurrent button { min-height:30px; padding:0 12px; border-radius:999px; border:1.5px dashed ${theme.colors.borderStrong}; background:transparent; color:${theme.colors.primary}; font-size:12px; font-weight:800; }
        .locationLabelRow { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
        .locationLabel { display:flex; align-items:center; gap:7px; color:${theme.colors.text}; font-size:12.5px; font-weight:800; }
        .locationLabelIcon { width:25px; height:25px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:${theme.colors.primaryTint}; color:${theme.colors.primary}; }
        .locationLabelIcon.drop { background:#FFF1E7; color:${theme.colors.accentDark}; }
        .locationHintLabel { color:${theme.colors.textFaint}; font-size:12px; font-weight:600; }
        .inputWrapper { position:relative; width:100%; }
        .locationInput { width:100%; height:56px; text-overflow:ellipsis; padding:0 15px; border:1.5px solid ${theme.colors.border}; border-radius:14px; background:${theme.colors.bg}; color:${theme.colors.text}; font-family:inherit; font-size:13px; outline:none; transition:border-color .2s ease,box-shadow .2s ease,background .2s ease; }
        .locationInput::placeholder { color:${theme.colors.textFaint}; }
        .locationInput:focus { border-color:${theme.colors.primary}; background:#fff; box-shadow:0 0 0 4px rgba(10,127,166,.10); }
        .inputWrapper:has(.locationInput:focus) .locationLabelIcon { box-shadow:0 0 0 3px rgba(10,127,166,.10); }
        .inputWrapper.hasValue .locationInput { border-color:${theme.colors.primaryLight}; background:#fff; padding-right:96px !important; }
        .inputActions { position:absolute; top:50%; right:8px; transform:translateY(-50%); display:flex; gap:5px; z-index:2; }
        .actionButton { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border:0; border-radius:9px; background:${theme.colors.primaryTint}; color:${theme.colors.primary}; cursor:pointer; transition:transform .15s ease,background .15s ease; }
        .actionButton:hover:not(:disabled) { background:#d9edf3; transform:translateY(-1px); }
        .actionButton.clearButton { background:${theme.colors.border}; color:${theme.colors.textMuted}; }
        .actionButton.currentButton { background:${theme.colors.primaryTint}; }
        .actionButton:disabled { opacity:.55; cursor:wait; }
        .spinner { width:14px; height:14px; border:2px solid rgba(10,127,166,.22); border-top-color:${theme.colors.primary}; border-radius:50%; animation:spin .7s linear infinite; }
        .selectedBadge { position:absolute; left:13px; bottom:7px; display:flex; align-items:center; gap:3px; font-size:12px; line-height:1; font-weight:800; color:${theme.colors.primary}; pointer-events:none; }
        .selectedBadge.drop { color:${theme.colors.accentDark}; }
        .currentLocationLink { display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:2px 0; border:0; background:transparent; color:${theme.colors.primary}; font-family:inherit; font-size:12px; font-weight:800; cursor:pointer; }
        .currentLocationLink:disabled { opacity:.55; cursor:wait; }
        .locationHelper { display:flex; justify-content:space-between; align-items:center; margin-top:7px; margin-bottom:2px; color:${theme.colors.textFaint}; font-size:12px; line-height:1.3; }
        .mapHelper { display:inline-flex; align-items:center; gap:3px; color:${theme.colors.textMuted}; font-weight:700; }
        .recentLocations { position:absolute; left:0; right:0; top:86px; z-index:30; padding:9px; border:1px solid ${theme.colors.border}; border-radius:12px; background:#fff; box-shadow:${theme.shadow.raised}; }
        .recentTitle { display:flex; align-items:center; gap:6px; padding:3px 5px 7px; color:${theme.colors.textMuted}; font-size:12px; font-weight:800; }
        .recentItem { width:100%; display:flex; align-items:center; gap:9px; padding:9px 7px; border:0; border-radius:9px; background:transparent; color:${theme.colors.text}; text-align:left; font-family:inherit; cursor:pointer; }
        .recentItem:hover { background:${theme.colors.primaryTint}; }
        .recentPin { width:28px; height:28px; flex:0 0 28px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:${theme.colors.primaryTint}; }
        .recentPin.drop { background:#FFF1E7; }
        .recentText { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:650; }
        .locationHint { margin-top:5px; color:${theme.colors.textFaint}; font-size:12px; }
        .locationError { margin-top:6px; color:${theme.colors.error}; font-size:12px; line-height:1.4; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:700px) { .locationInput { height:42px; font-size:14px; } .actionButton { width:34px; height:34px; } .currentLocationLink { min-height:32px; margin:0; font-size:12px; } .recentItem { min-height:40px; } .locationHintLabel { display:none; } .locationHelper { font-size:12px; margin-top:4px; margin-bottom:0; } .locationLabel { margin-bottom:6px; } }
      `}</style>
    </div>
  );
}
