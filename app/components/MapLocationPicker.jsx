"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadGoogleMaps, extractCityName } from "../lib/googleMaps";

const DEFAULT_CENTER = { lat: 26.4499, lng: 80.3319 };

function Marker({ tone }) {
  const color = tone === "drop" ? "#c8622a" : "#08783f";
  return (
    <svg width="38" height="46" viewBox="0 0 38 46" fill="none" aria-hidden="true">
      <path d="M19 1C9.06 1 1 9.06 1 19c0 12.5 18 25 18 25s18-12.5 18-25C37 9.06 28.94 1 19 1Z" fill={color} stroke="#fff" strokeWidth="2" />
      <circle cx="19" cy="19" r="7" fill="#fff" />
      <circle cx="19" cy="19" r="3" fill={color} />
    </svg>
  );
}

export default function MapLocationPicker({ open, title = "Choose location", initialLat = null, initialLon = null, onConfirm, onClose }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const idleListenerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [resolvedCity, setResolvedCity] = useState(null);
  const [resolvedPlaceId, setResolvedPlaceId] = useState(null);
  const [center, setCenter] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const tone = /drop|destination/i.test(String(title)) ? "drop" : "pickup";

  useEffect(() => {
    if (!open) return;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.width = previous.width;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadGoogleMaps().then(() => { if (!cancelled) setMapsReady(true); }).catch((err) => {
      console.error("VOYNU map picker load error:", err);
      if (!cancelled) setError("Map is temporarily unavailable.");
    });
    return () => { cancelled = true; };
  }, [open]);

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    setResolving(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setResolving(false);
      if (status !== "OK" || !results?.length) {
        setResolvedAddress("");
        setResolvedCity(null);
        setResolvedPlaceId(null);
        setError("Unable to determine the address for this location.");
        return;
      }
      const result = results[0];
      setError("");
      setResolvedAddress(result.formatted_address || "");
      setResolvedCity(extractCityName(result.address_components));
      setResolvedPlaceId(result.place_id || null);
    });
  }, []);

  useEffect(() => {
    if (!open || !mapsReady || !mapContainerRef.current || mapRef.current) return;

    const startLat = Number.isFinite(initialLat) ? initialLat : DEFAULT_CENTER.lat;
    const startLng = Number.isFinite(initialLon) ? initialLon : DEFAULT_CENTER.lng;
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: startLat, lng: startLng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
    setCenter({ lat: startLat, lng: startLng });
    reverseGeocode(startLat, startLng);

    window.setTimeout(() => {
      window.google.maps.event.trigger(map, "resize");
      map.setCenter({ lat: startLat, lng: startLng });
    }, 80);

    const listener = map.addListener("idle", () => {
      const current = map.getCenter();
      if (!current) return;
      const lat = current.lat();
      const lng = current.lng();
      setCenter({ lat, lng });
      reverseGeocode(lat, lng);
    });
    idleListenerRef.current = listener;

    if (searchInputRef.current && window.google.maps.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "formatted_address", "address_components", "place_id"],
        componentRestrictions: { country: "in" },
      });
      autocompleteRef.current = autocomplete;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place?.geometry?.location) return;
        map.panTo(place.geometry.location);
        map.setZoom(16);
      });
    }

    return () => {
      if (idleListenerRef.current) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
    };
  }, [open, mapsReady, initialLat, initialLon, reverseGeocode]);

  useEffect(() => {
    if (!open) {
      mapRef.current = null;
      geocoderRef.current = null;
      autocompleteRef.current = null;
      setMapsReady(false);
      setResolvedAddress("");
      setResolvedCity(null);
      setResolvedPlaceId(null);
      setCenter(null);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!center || !resolvedAddress) return;
    onConfirm?.({ name: resolvedAddress, lat: center.lat, lon: center.lng, placeId: resolvedPlaceId, city: resolvedCity });
  };

  return (
    <div className="mapPickerOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mapPickerSheet">
        <div className="mapPickerHeader">
          <div className="titleWrap">
            <span className={`titleMarker ${tone}`}><Marker tone={tone} /></span>
            <span>{title}</span>
          </div>
          <button type="button" className="mapPickerClose" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="mapPickerSearch">
          <input ref={searchInputRef} type="text" placeholder="Search area, landmark or address" className="mapPickerSearchInput" autoComplete="off" />
        </div>

        <div className="mapPickerMapWrap">
          <div ref={mapContainerRef} className="mapPickerMap" />
          <div className={`mapPickerPin ${tone}`} aria-hidden="true"><Marker tone={tone} /></div>
          <div className="mapInstruction">Move the map to place the pin exactly</div>
        </div>

        <div className="mapPickerFooter">
          <div className="mapPickerAddressRow">
            <div className={`addressDot ${tone}`} />
            <div className="mapPickerAddress">
              {!mapsReady ? "Loading map..." : resolving ? "Finding address..." : error ? error : resolvedAddress || "Move the map to select a location"}
            </div>
          </div>
          <button type="button" className={`mapPickerConfirm ${tone}`} onClick={handleConfirm} disabled={!resolvedAddress || resolving}>Confirm location</button>
        </div>
      </div>

      <style jsx>{`
        .mapPickerOverlay{position:fixed;inset:0;z-index:1000;background:rgba(10,20,15,.58);display:flex;align-items:flex-end;justify-content:center;touch-action:none;overscroll-behavior:contain}
        .mapPickerSheet{width:100%;max-width:560px;height:min(88vh,720px);background:#fff;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;touch-action:none;box-shadow:0 20px 60px rgba(0,0,0,.25)}
        @media(min-width:700px){.mapPickerOverlay{align-items:center}.mapPickerSheet{border-radius:20px;height:min(80vh,680px)}}
        .mapPickerHeader{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid #edf1ee;color:#16241d;font-size:15px;font-weight:800;touch-action:manipulation}
        .titleWrap{display:flex;align-items:center;gap:10px}.titleMarker{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:#eaf6ee;overflow:hidden}.titleMarker.drop{background:#fff0e8}.titleMarker svg{width:19px;height:23px}
        .mapPickerClose{border:0;background:#f1f4f2;width:32px;height:32px;border-radius:50%;font-size:23px;line-height:1;color:#526158;cursor:pointer}
        .mapPickerSearch{padding:10px 14px;touch-action:manipulation}.mapPickerSearchInput{width:100%;height:46px;border:1px solid #dfe7e1;border-radius:11px;padding:0 14px;font-size:14px;outline:none;box-sizing:border-box}.mapPickerSearchInput:focus{border-color:#08783f;box-shadow:0 0 0 3px rgba(8,120,63,.09)}
        .mapPickerMapWrap{position:relative;flex:1;min-height:0;background:#eef2ef;overflow:hidden;touch-action:none}.mapPickerMap{position:absolute;inset:0;touch-action:none}.mapPickerPin{position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);pointer-events:none;filter:drop-shadow(0 6px 7px rgba(0,0,0,.27))}.mapPickerPin svg{width:38px;height:46px}.mapInstruction{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);padding:7px 11px;border-radius:20px;background:rgba(18,33,26,.86);color:#fff;font-size:10px;font-weight:700;white-space:nowrap;pointer-events:none}
        .mapPickerFooter{padding:13px 16px 17px;border-top:1px solid #edf1ee;background:#fff;touch-action:manipulation}.mapPickerAddressRow{display:flex;align-items:flex-start;gap:9px;min-height:38px}.addressDot{width:10px;height:10px;flex:0 0 10px;margin-top:4px;border-radius:50%;background:#08783f;box-shadow:0 0 0 4px #eaf6ee}.addressDot.drop{background:#c8622a;box-shadow:0 0 0 4px #fff0e8}.mapPickerAddress{font-size:13px;line-height:1.45;color:#4b5c53}.mapPickerConfirm{width:100%;height:51px;margin-top:10px;border:0;border-radius:12px;background:#08783f;color:#fff;font-weight:800;font-size:14px;cursor:pointer}.mapPickerConfirm.drop{background:#c8622a}.mapPickerConfirm:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
