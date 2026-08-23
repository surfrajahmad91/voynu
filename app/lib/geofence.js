/*
|--------------------------------------------------------------------------
| VOYNU — Geofence
|--------------------------------------------------------------------------
|
| Pure geographic functions. No API calls, no business rules —
| just "is this point inside this area."
|
|--------------------------------------------------------------------------
*/

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/*
 * Haversine distance between two points, in kilometers.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/*
 * Standard ray-casting point-in-polygon test.
 * polygon: array of { lat, lon } points, in order.
 */
export function isPointInPolygon(lat, lon, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;

    const intersects =
      yi > lat !== yj > lat &&
      lon 
        ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/*
 * Checks a point against a service area record. Prefers the
 * polygon boundary if one is configured (precise), falling
 * back to the circle (center + radius) otherwise (simple MVP
 * default).
 */
export function isPointInServiceArea(lat, lon, area) {
  if (!area) {
    return false;
  }

  if (Array.isArray(area.polygon) && area.polygon.length >= 3) {
    return isPointInPolygon(lat, lon, area.polygon);
  }

  if (
    Number.isFinite(area.center_lat) &&
    Number.isFinite(area.center_lon) &&
    Number.isFinite(area.radius_km)
  ) {
    const distance = haversineDistanceKm(
      lat,
      lon,
      area.center_lat,
      area.center_lon
    );

    return distance <= area.radius_km;
  }

  return false;
}
