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

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i].lon);
    const yi = Number(polygon[i].lat);
    const xj = Number(polygon[j].lon);
    const yj = Number(polygon[j].lat);

    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/*
 * Checks a point against a service area record. Prefers the
 * polygon boundary if one is configured (precise), falling
 * back to the circle (center + radius) otherwise.
 */
export function isPointInServiceArea(lat, lon, area) {
  if (!area) {
    return false;
  }

  const pointLat = Number(lat);
  const pointLon = Number(lon);
  if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon)) {
    return false;
  }

  if (Array.isArray(area.polygon) && area.polygon.length >= 3) {
    return isPointInPolygon(pointLat, pointLon, area.polygon);
  }

  const centerLat = Number(area.center_lat);
  const centerLon = Number(area.center_lon);
  const radiusKm = Number(area.radius_km);

  if (
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLon) &&
    Number.isFinite(radiusKm) &&
    radiusKm >= 0
  ) {
    return haversineDistanceKm(
      pointLat,
      pointLon,
      centerLat,
      centerLon
    ) <= radiusKm;
  }

  return false;
}
