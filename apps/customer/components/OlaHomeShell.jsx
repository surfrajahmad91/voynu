"use client";

import { useEffect, useMemo, useState } from "react";
import LocationPicker from "./LocationPicker";
import { theme } from "../../../shared/lib/theme";

function Icon({ name, size = 22, stroke = "currentColor" }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    heart: <><path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></>,
    car: <><path d="M5 16h14M6 16l1.5-5h9L18 16" /><path d="M8 11V8.5h8V11" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></>,
    bolt: <path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none" />,
    bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17l4-8 3 8m-3-8h4l2 3M10 12H7" /></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    road: <><path d="M7 21 10 3M17 21 14 3" /><path d="M12 6v3m0 4v3m0 4v1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function MapSurface({ pickup }) {
  const [center, setCenter] = useState({ lat: 26.4499, lon: 80.3319 });
  useEffect(() => {
    let cancelled = false;
    if (pickup?.selected && Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(pickup.lon))) {
      setCenter({ lat: Number(pickup.lat), lon: Number(pickup.lon) });
      return undefined;
    }
    if (!navigator.geolocation) return undefined;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { if (!cancelled) setCenter({ lat: coords.latitude, lon: coords.longitude }); },
      () => {},
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 5000 }
    );
    return () => { cancelled = true; };
  }, [pickup]);

  const zoom = 14;
  const n = 2 ** zoom;
  const x = ((center.lon + 180) / 360) * n;
  const latRad = (center.lat * Math.PI) / 180;
  const y = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const offsetX = 50 - (x - tileX) * 100;
  const offsetY = 50 - (y - tileY) * 100;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const tx = ((tileX + dx) % n + n) % n;
      const ty = tileY + dy;
      if (ty < 0 || ty >= n) continue;
      tiles.push(<img key={`${tx}:${ty}`} src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`} alt="" draggable="false" style={{ position: "absolute", width: "256px", height: "256px", left: `${offsetX + dx * 256}px`, top: `${offsetY + dy * 256}px`, maxWidth: "none" }} />);
    }
  }

  return (
    <div className="voMap">
      <div className="voMapTiles">{tiles}</div>
      <div className="voMapShade" />
      <div className="voMapMarker"><span /><i /></div>
      <div className="voMapAttribution">© OpenStreetMap contributors</div>
    </div>
  );
}

export default function OlaHomeShell({
  router,
  session,
  tripType,
  handleTripTypeChange,
  pickup,
  drop,
  handlePickupSelect,
  handleDropSelect,
  journeyDistanceKm,
  journeyDistanceText,
  journeyDurationText,
  journeyDistanceLoading,
  journeyDistanceError,
  tripDetails,
  totalJourneyDistanceKm,
  travelDate,
  pickupTime,
  handleTravelDateChange,
  handlePickupTimeChange,
  returnDate,
  returnTime,
  setReturnDate,
  setReturnTime,
  passengerName,
  setPassengerName,
  phone,
  handlePhoneChange,
  whatsapp,
  handleWhatsAppChange,
  whatsappSameAsPhone,
  handleWhatsAppToggle,
  message,
  messageType,
  isSubmitting,
  handleContinue,
  favorites,
  applyFavorite,
  removeFavorite,
  saveFavorite,
  savingFavorite,
  isFavoriteSaved,
  getChargingMessage,
  defaultMaxDistanceKm,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const hasDestination = Boolean(drop?.selected);
  const hasRoute = Boolean(pickup?.selected && drop?.selected);
  const recent = useMemo(() => (favorites || []).slice(0, 4), [favorites]);

  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (pickup?.selected) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (pickup?.selected) return;
        try {
          const response = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: coords.latitude, lon: coords.longitude }),
          });
          const data = await response.json();
          if (response.ok && data?.name && typeof handlePickupSelect === "function") {
            handlePickupSelect({
              name: data.name,
              lat: coords.latitude,
              lon: coords.longitude,
              placeId: data.placeId || null,
              city: data.city || null,
            });
          }
        } catch {
          // The user can still select pickup manually.
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    );
  }, [pickup?.selected, handlePickupSelect]);

  const hasDestination = Boolean(drop?.selected);
  const hasRoute = Boolean(pickup?.selected && drop?.selected);
  const recent = useMemo(() => (favorites || []).slice(0, 4), [favorites]);

  const openDestination = () => {
    setDetailsOpen(false);
    setLocationPanelOpen(true);
  };

  const openDetails = () => {
    if (!hasRoute) return;
    setLocationPanelOpen(false);
    setDetailsOpen(true);
  };

  return (
    <main className="voHome">
      <section className="voMapArea">
        <MapSurface pickup={pickup} />
        <button type="button" className="voTopButton voMenuButton" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu"><Icon name="menu" size={24} /></button>
        <button type="button" className="voTopButton voHeartButton" onClick={() => setDestinationFocused(true)} aria-label="Saved places"><Icon name="heart" size={23} /></button>
        {menuOpen && (
          <div className="voMenu">
            <button onClick={() => router.push("/account")}>My trips</button>
            <button onClick={() => router.push("/subscriptions")}>Commute</button>
            <button onClick={() => router.push("/wallet")}>Wallet</button>
            <button onClick={() => router.push("/account")}>Account</button>
          </div>
        )}
        <div className="voMapLocationPill"><span className="voLiveDot" />{pickup?.selected ? "Pickup ready" : "Set pickup"}</div>
      </section>

      <section className="voBookingSurface">
        <button type="button" className="voPickupRow" onClick={() => setLocationPanelOpen(true)}>
          <span className="voPickupIcon"><Icon name="pin" size={20} /></span>
          <span className="voLocationCopy">
            <small>PICKUP</small>
            <strong>{pickup?.selected ? pickup.name : "Use your current location"}</strong>
          </span>
          <span className="voEditArrow">›</span>
        </button>

        <button type="button" className="voDestinationRow" onClick={openDestination}>
          <span className="voSearchIcon"><Icon name="search" size={21} /></span>
          <span className="voLocationCopy">
            <small>DESTINATION</small>
            <strong>{hasDestination ? drop.name : "Where do you want to go?"}</strong>
          </span>
          <Icon name="arrow" size={20} />
        </button>

        {locationPanelOpen && (
          <div className="voLocationPanel">
            <div className="voPanelHeader">
              <div><span className="voEyebrow">JOURNEY</span><h2>Where are you going?</h2></div>
              <button type="button" onClick={() => setLocationPanelOpen(false)}>Done</button>
            </div>
            <LocationPicker
              label="Pickup"
              value={pickup?.name || ""}
              placeholder="Where should we pick you up?"
              allowCurrentLocation={true}
              onLocationSelect={handlePickupSelect}
            />
            <div className="voPanelDivider" />
            <LocationPicker
              label="Destination"
              value={drop?.name || ""}
              placeholder="Search destination"
              allowCurrentLocation={false}
              onLocationSelect={handleDropSelect}
            />
          </div>
        )}

        {!locationPanelOpen && !hasRoute && (
          <div className="voQuickHint"><Icon name="clock" size={15} /> Recent destinations and saved routes appear after you book.</div>
        )}

        {recent.length > 0 && !locationPanelOpen && !hasRoute && (
          <div className="voRecentList">
            {recent.map(f => (
              <div className="voRecentRow" key={f.id}>
                <button type="button" onClick={() => { applyFavorite(f); setDetailsOpen(false); }}>
                  <span className="voRecentIcon"><Icon name="clock" size={17} /></span>
                  <span className="voRecentCopy"><strong>{f.label}</strong><small>{f.drop_name}</small></span>
                  <span className="voRecentArrow">›</span>
                </button>
                <button type="button" className="voRecentDelete" onClick={() => removeFavorite(f.id)} aria-label="Remove saved route">×</button>
              </div>
            ))}
          </div>
        )}

        {hasRoute && !detailsOpen && (
          <div className="voRoutePreview">
            <div className="voRouteHeader">
              <div><span className="voEyebrow">YOUR ROUTE</span><h2>{journeyDistanceLoading ? "Calculating route…" : journeyDistanceError ? "Route unavailable" : "Ready to choose a cab"}</h2></div>
              {journeyDistanceKm != null && <span className="voRouteDistance">{journeyDistanceText || `${journeyDistanceKm.toFixed(1)} km`}</span>}
            </div>
            <div className="voRouteStops">
              <div><span className="routeDot pickup" /><strong>{pickup.name}</strong></div>
              <span className="routeConnector" />
              <div><span className="routeDot drop" /><strong>{drop.name}</strong></div>
            </div>
            {journeyDistanceError && <div className="voInlineError">{journeyDistanceError}</div>}
            {!journeyDistanceError && (
              <button type="button" className="voPrimaryAction" onClick={openDetails} disabled={journeyDistanceLoading || journeyDistanceKm == null || !tripDetails?.valid}>
                Choose a cab <Icon name="arrow" size={19} />
              </button>
            )}
            <button type="button" className="voChangeRoute" onClick={openDestination}>Change pickup or destination</button>
          </div>
        )}

        {hasRoute && detailsOpen && (
          <section className="voTripCard">
            <div className="voTripHeader">
              <div><span className="voEyebrow">TRIP DETAILS</span><h2>When are you travelling?</h2></div>
              <button type="button" className="voBackButton" onClick={() => setDetailsOpen(false)}>Back</button>
            </div>

            <div className="voTripToggle">
              <button type="button" className={tripType === "oneway" ? "active" : ""} onClick={() => handleTripTypeChange("oneway")}><Icon name="arrow" size={17} />One way</button>
              <button type="button" className={tripType === "roundtrip" ? "active" : ""} onClick={() => handleTripTypeChange("roundtrip")}><Icon name="swap" size={17} />Round trip</button>
            </div>

            <div className="voRouteSummary">
              <div><span className="dot pickup" /><div><small>FROM</small><strong>{pickup.name}</strong></div></div>
              <div className="routeLine" />
              <div><span className="dot drop" /><div><small>TO</small><strong>{drop.name}</strong></div></div>
            </div>

            <div className="voDistance">
              {journeyDistanceLoading ? "Calculating route…" : journeyDistanceError ? journeyDistanceError : journeyDistanceKm == null ? "Distance unavailable" : tripType === "roundtrip" ? `${journeyDistanceKm.toFixed(1)} km each way · ${totalJourneyDistanceKm.toFixed(1)} km total` : `${journeyDistanceText || journeyDistanceKm.toFixed(1) + " km"} · ${journeyDurationText || "route time pending"}`}
            </div>

            {tripDetails?.chargingRequired && tripType === "roundtrip" && <div className="voNotice"><Icon name="bolt" size={15} />{getChargingMessage(tripDetails)}</div>}

            <div className="voFormGrid">
              <label><span><Icon name="calendar" size={14} />Travel date</span><input type="date" value={travelDate} min={new Date().toISOString().slice(0, 10)} onChange={e => handleTravelDateChange(e.target.value)} /></label>
              <label><span><Icon name="clock" size={14} />Pickup time</span><input type="time" value={pickupTime} onChange={e => handlePickupTimeChange(e.target.value)} /></label>
            </div>

            {tripType === "roundtrip" && (
              <div className="voReturn">
                <div className="voReturnTitle"><Icon name="swap" size={15} />Return journey</div>
                <div className="voFormGrid">
                  <label><span><Icon name="calendar" size={14} />Return date</span><input type="date" value={returnDate} min={travelDate || new Date().toISOString().slice(0, 10)} onChange={e => setReturnDate(e.target.value)} /></label>
                  <label><span><Icon name="clock" size={14} />Return time</span><input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} /></label>
                </div>
              </div>
            )}

            <div className="voPassenger">
              <label><span><Icon name="user" size={14} />Passenger</span><input type="text" placeholder="Passenger name" value={passengerName} onChange={e => setPassengerName(e.target.value)} /></label>
              <label><span>Mobile</span><input type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={phone} maxLength={12} onChange={handlePhoneChange} /></label>
              <label><span>WhatsApp</span><input type="tel" inputMode="numeric" placeholder="WhatsApp number" value={whatsapp} maxLength={12} disabled={whatsappSameAsPhone} onChange={handleWhatsAppChange} /></label>
              <button type="button" className="voSamePhone" onClick={handleWhatsAppToggle}><span className={whatsappSameAsPhone ? "checked" : ""}>{whatsappSameAsPhone ? "✓" : ""}</span>Same as mobile</button>
            </div>

            {message && <div className={messageType === "success" ? "voMessage success" : "voMessage error"}>{message}</div>}
            <button type="button" className="voContinue" onClick={handleContinue} disabled={isSubmitting}>{isSubmitting ? "Preparing your trip…" : "Continue to cab selection"}<Icon name="arrow" size={19} /></button>
            <div className="voSecure">Your information is secure · Fare is shown before confirmation</div>
          </section>
        )}

        {!hasRoute && (
          <section className="voServices">
            <button type="button" className="voServiceCard active" onClick={openDestination}><span className="voServiceIcon"><Icon name="car" size={25} /></span><strong>Ride</strong><small>Cab</small></button>
            <button type="button" className="voServiceCard" onClick={() => router.push("/rentals")}><span className="voServiceIcon"><Icon name="clock" size={25} /></span><strong>Rentals</strong><small>Hourly</small></button>
            <button type="button" className="voServiceCard" onClick={() => openDestination()}><span className="voServiceIcon"><Icon name="road" size={25} /></span><strong>Outstation</strong><small>Intercity</small></button>
            <button type="button" className="voServiceCard" onClick={() => router.push("/subscriptions")}><span className="voServiceIcon"><Icon name="calendar" size={25} /></span><strong>Commute</strong><small>Daily</small></button>
          </section>
        )}
      </section>

      <footer className="voFooter"><strong>VOYNU</strong><span>Travel safe. Travel smart.</span></footer>

      <style jsx>{`
        *{box-sizing:border-box}.voHome{min-height:100vh;background:#f5f7f7;color:#173126;font-family:inherit;padding-bottom:78px}.voMapArea{height:43vh;min-height:330px;max-height:520px;position:relative;overflow:hidden;background:#e9eef0}.voMap{position:absolute;inset:0;overflow:hidden}.voMapTiles{position:absolute;inset:0}.voMapShade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(255,255,255,.02) 50%,rgba(245,247,247,.58) 100%);pointer-events:none}.voMapMarker{position:absolute;left:50%;top:50%;width:42px;height:42px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(43,130,246,.16);box-shadow:0 0 0 9px rgba(43,130,246,.07)}.voMapMarker span{position:absolute;left:50%;top:50%;width:15px;height:15px;transform:translate(-50%,-50%);border:3px solid #fff;border-radius:50%;background:#2f80ed;box-shadow:0 2px 7px rgba(0,0,0,.18)}.voTopButton{position:absolute;top:max(16px,env(safe-area-inset-top));width:52px;height:52px;border:0;border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 4px 18px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;color:#111;z-index:5}.voMenuButton{left:16px}.voHeartButton{right:16px}.voMapLocationPill{position:absolute;right:78px;top:max(20px,env(safe-area-inset-top));padding:10px 13px;border-radius:22px;background:rgba(255,255,255,.93);box-shadow:0 3px 14px rgba(0,0,0,.1);font-size:11px;font-weight:800;color:#36433e;z-index:4}.voLiveDot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#26b86b;margin-right:6px}.voMapAttribution{position:absolute;right:8px;bottom:7px;padding:2px 5px;border-radius:4px;background:rgba(255,255,255,.72);font-size:8px;color:#52605b}.voMenu{position:absolute;top:76px;left:16px;width:190px;padding:8px;border-radius:18px;background:#fff;box-shadow:0 16px 40px rgba(0,0,0,.16);z-index:20}.voMenu button{display:block;width:100%;padding:12px 13px;border:0;background:none;text-align:left;border-radius:11px;font:700 13px inherit;color:#26332e}.voMenu button:hover{background:#f0f8f3}
        .voBookingSurface{position:relative;margin:-30px 12px 0;padding:14px;border-radius:26px;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.1);z-index:10}
        .voPickupRow,.voDestinationRow{width:100%;display:flex;align-items:center;gap:12px;border:1px solid #e8eeeb;background:#fff;text-align:left;cursor:pointer}
        .voPickupRow{padding:13px 12px;border-radius:17px 17px 9px 9px}
        .voDestinationRow{margin-top:7px;padding:14px 12px;border:2px solid #62c692;border-radius:16px}
        .voPickupIcon,.voSearchIcon{width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex:0 0 42px;border-radius:13px}
        .voPickupIcon{background:#e9f7f0;color:#18845a}.voSearchIcon{background:#f3f7f5;color:#111}
        .voLocationCopy{min-width:0;flex:1}.voLocationCopy small{display:block;font-size:8px;letter-spacing:.1em;color:#8b9691;font-weight:900}.voLocationCopy strong{display:block;margin-top:3px;font-size:13px;color:#15231d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.voDestinationRow .voLocationCopy strong{font-size:15px}
        .voEditArrow{font-size:25px;color:#7e8984}.voLocationPanel{margin-top:12px;padding:13px;border-radius:18px;background:#f7f9f8;border:1px solid #e2e9e5}.voPanelHeader{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.voPanelHeader h2{margin:3px 0 0;font-size:18px}.voPanelHeader button,.voBackButton{border:0;background:#e5f5eb;color:#167044;border-radius:999px;padding:8px 12px;font-weight:800}.voPanelDivider{height:1px;background:#e3e9e6;margin:12px 0}
        .voQuickHint{display:flex;align-items:center;gap:7px;padding:12px 3px 3px;color:#89938f;font-size:9.5px}
        .voRecentList{margin-top:5px}.voRecentRow{display:flex;align-items:center;border-bottom:1px solid #edf0ef}.voRecentRow:last-child{border-bottom:0}.voRecentRow>button:first-child{display:flex;align-items:center;gap:12px;flex:1;min-width:0;border:0;background:none;text-align:left;padding:11px 5px;cursor:pointer}.voRecentIcon{width:34px;height:34px;border-radius:50%;background:#f3f5f4;display:flex;align-items:center;justify-content:center;color:#111}.voRecentCopy{min-width:0;flex:1}.voRecentCopy strong{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.voRecentCopy small{display:block;margin-top:3px;font-size:10px;color:#808a86;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.voRecentArrow{font-size:26px;color:#111}.voRecentDelete{border:0;background:none;color:#a1aaa6;font-size:19px;padding:9px;cursor:pointer}
        .voRoutePreview{margin-top:12px;padding:15px;border-radius:18px;background:#f8fbf9;border:1px solid #dfe9e4}.voRouteHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.voRouteHeader h2{margin:3px 0 0;font-size:18px}.voRouteDistance{padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#177247;font-size:9px;font-weight:900;white-space:nowrap}.voRouteStops{margin:13px 0}.voRouteStops>div{display:flex;align-items:center;gap:9px;min-width:0}.voRouteStops strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.routeDot{width:10px;height:10px;flex:0 0 10px;border-radius:50%;box-shadow:0 0 0 3px #fff}.routeDot.pickup{background:#189bb8}.routeDot.drop{background:#ef7b45}.routeConnector{display:block;height:14px;border-left:2px dashed #cbd6d0;margin:0 0 0 4px}.voPrimaryAction,.voContinue{width:100%;height:50px;border:0;border-radius:14px;background:#22bf69;color:#fff;font:800 13px inherit;display:flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 8px 20px rgba(34,191,105,.18);cursor:pointer}.voPrimaryAction:disabled,.voContinue:disabled{opacity:.55;cursor:wait}.voChangeRoute{width:100%;border:0;background:none;color:#177247;font-size:10px;font-weight:800;padding:10px 0 1px}
        .voServices{display:flex;gap:9px;overflow-x:auto;padding:15px 0 3px;scrollbar-width:none}.voServices::-webkit-scrollbar{display:none}.voServiceCard{flex:0 0 106px;height:100px;border:1px solid #edf0ef;border-radius:18px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 3px 14px rgba(0,0,0,.045);cursor:pointer}.voServiceCard.active{background:#f7fbf8;border-color:#cfe8da}.voServiceIcon{width:43px;height:43px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:#eaf8ef;color:#21bd69}.voServiceCard strong{font-size:11px}.voServiceCard small{font-size:8px;color:#929b97}
        .voTripCard{margin-top:12px;padding:16px;border-radius:20px;background:#fff;border:1px solid #e7edeb}.voTripHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.voEyebrow{font-size:8px;letter-spacing:.12em;color:#6d7974;font-weight:900}.voTripHeader h2{margin:4px 0 0;font-size:19px}.voBackButton{font-size:10px}
        .voTripToggle{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:14px 0;padding:4px;border-radius:15px;background:#f0f3f2}.voTripToggle button{height:43px;border:0;border-radius:11px;background:transparent;color:#69746f;font-weight:800;display:flex;gap:7px;align-items:center;justify-content:center}.voTripToggle button.active{background:#22bf69;color:#fff}
        .voRouteSummary>div{display:flex;gap:10px;align-items:flex-start}.voRouteSummary .dot{width:12px;height:12px;flex:0 0 12px;border-radius:50%;margin-top:4px;border:3px solid #fff;box-shadow:0 0 0 1px #b7c0bb}.voRouteSummary .pickup{background:#1a9fbd}.voRouteSummary .drop{background:#ef7b45}.voRouteSummary small{display:block;font-size:8px;letter-spacing:.1em;color:#89938f;font-weight:900}.voRouteSummary strong{display:block;margin-top:2px;font-size:11px;line-height:1.35}.voRouteSummary .routeLine{height:16px;border-left:2px dashed #d1d8d4;margin-left:5px}.voDistance{margin:11px 0;padding:9px 11px;border-radius:11px;background:#f5faf7;color:#3f5149;font-size:10px;font-weight:800}.voNotice{display:flex;gap:7px;padding:10px;border-radius:11px;background:#fff4e9;color:#a15b30;font-size:10px;line-height:1.4}.voFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}.voFormGrid label,.voPassenger label{display:block;min-width:0}.voFormGrid label>span,.voPassenger label>span{display:flex;align-items:center;gap:5px;margin:0 0 5px;color:#59655f;font-size:9px;font-weight:800}.voFormGrid input,.voPassenger input{width:100%;height:44px;border:1px solid #e2e8e5;border-radius:11px;background:#fafcfb;padding:0 9px;font:600 12px inherit;color:#173126;outline:none}.voReturn{margin-top:11px;padding:11px;border-radius:13px;background:#f7faf8}.voReturnTitle{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:#197146}.voPassenger{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}.voPassenger label:first-child{grid-column:1/-1}.voSamePhone{grid-column:1/-1;border:0;background:none;color:#69746f;font-size:10px;font-weight:800;text-align:left;padding:0}.voSamePhone span{display:inline-flex;width:18px;height:18px;border-radius:50%;border:1px solid #b7c0bb;align-items:center;justify-content:center;margin-right:5px}.voSamePhone span.checked{background:#22bf69;border-color:#22bf69;color:#fff}.voMessage{margin-top:11px;padding:10px 11px;border-radius:11px;font-size:10px;line-height:1.4}.voMessage.success{background:#eaf8ef;color:#187444}.voMessage.error,.voInlineError{background:#fff0ef;color:#b42318;padding:9px;border-radius:10px;font-size:10px}.voSecure{text-align:center;margin-top:8px;color:#8b9691;font-size:8px}.voFooter{position:fixed;left:0;right:0;bottom:0;height:64px;padding-bottom:env(safe-area-inset-bottom);background:rgba(255,255,255,.96);border-top:1px solid #e8edeb;display:flex;align-items:center;justify-content:space-around;z-index:30;color:#a0a8a4;font-size:11px}.voFooter strong{color:#111}.voFooter span:before{content:"Trips";color:#7d8782;margin-right:22px}
        @media(min-width:760px){.voHome{max-width:520px;margin:0 auto;border-left:1px solid #e9edeb;border-right:1px solid #e9edeb}.voMapArea{height:400px}.voBookingSurface{margin-top:-30px;margin-left:10px;margin-right:10px}}@media(max-width:420px){.voBookingSurface{margin-left:8px;margin-right:8px}.voServices{gap:7px}.voServiceCard{flex-basis:101px}.voPassenger{grid-template-columns:1fr}.voPassenger label:first-child{grid-column:auto}.voSamePhone{grid-column:auto}}
      `}</style>
    </main>
  );
}
    </main>
  );
}
