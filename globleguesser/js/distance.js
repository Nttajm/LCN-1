const EARTH_RADIUS_KM = 6371;
const DENSIFY_STEP_KM = 25;
const DISPLAY_ROUND_KM = 10;
const BBOX_PAD_DEG = 0.5;

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Enclaves / shared borders that low-res polygons often miss. */
const ZERO_DISTANCE_PAIRS = new Set([
  "Italy|Vatican City",
  "Vatican City|Italy",
  "Italy|San Marino",
  "San Marino|Italy",
  "South Africa|Lesotho",
  "Lesotho|South Africa",
]);

// Hot (near) → cold (far). Correct guesses use a separate green fill.
const COLOR_STOPS = [
  { km: 0, color: [139, 26, 26] },
  { km: 250, color: [200, 50, 30] },
  { km: 1000, color: [230, 120, 40] },
  { km: 2500, color: [240, 200, 80] },
  { km: 5000, color: [245, 235, 210] },
  { km: 10000, color: [230, 225, 215] },
  { km: 20000, color: [220, 218, 210] },
];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

export function haversineKm(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function destinationPoint(origin, distanceKm, bearingDeg) {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(origin.lat);
  const λ1 = toRad(origin.lng);
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const φ2 = Math.asin(sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return {
    lat: toDeg(φ2),
    lng: ((toDeg(λ2) + 540) % 360) - 180,
  };
}

export function greatCircleRing(center, radiusKm, steps = 72) {
  if (!(radiusKm > 0) || !center) return [];
  const n = Math.max(8, Math.floor(steps));
  const points = [];
  for (let i = 0; i <= n; i += 1) {
    const bearingDeg = (i / n) * 360;
    points.push(destinationPoint(center, radiusKm, bearingDeg));
  }
  return points;
}

export function bearing(from, to) {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const idx = Math.round(brng / 45) % 8;
  return DIRECTIONS[idx];
}

/** Shortest signed longitude delta in degrees (−180, 180]. */
function lngDelta(a, b) {
  return ((b - a + 540) % 360) - 180;
}

/**
 * Interpolate along a short edge. Linear lat + unwrapped lng is fine for
 * segments of a few hundred km (Natural Earth edges after densify steps).
 */
function interpolateEdge(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + lngDelta(a.lng, b.lng) * t,
  };
}

function densifyEdge(a, b, stepKm, out) {
  const dist = haversineKm(a, b);
  if (dist <= stepKm) return;
  const n = Math.ceil(dist / stepKm);
  for (let i = 1; i < n; i++) {
    out.push(interpolateEdge(a, b, i / n));
  }
}

function emptyBBox() {
  return {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
    crossesAntimeridian: false,
  };
}

function expandBBox(bbox, point) {
  if (point.lat < bbox.minLat) bbox.minLat = point.lat;
  if (point.lat > bbox.maxLat) bbox.maxLat = point.lat;
  if (point.lng < bbox.minLng) bbox.minLng = point.lng;
  if (point.lng > bbox.maxLng) bbox.maxLng = point.lng;
}

function finalizeBBox(bbox) {
  if (!Number.isFinite(bbox.minLat)) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0, crossesAntimeridian: false };
  }
  bbox.crossesAntimeridian = bbox.maxLng - bbox.minLng > 180;
  return bbox;
}

/**
 * Flatten + densify outer rings so closest points mid-edge are represented.
 * Returns { points, bbox }.
 */
export function borderPointsFromGeometry(geometry, stepKm = DENSIFY_STEP_KM) {
  if (!geometry) return { points: [], bbox: finalizeBBox(emptyBBox()) };

  const rings = [];
  if (geometry.type === "Polygon") {
    rings.push(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      rings.push(polygon[0]);
    }
  }

  const points = [];
  const bbox = emptyBBox();

  for (const ring of rings) {
    if (!ring?.length) continue;
    const ringPts = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng, lat] = ring[i];
      ringPts.push({ lat, lng });
    }
    if (!ringPts.length) continue;

    for (let i = 0; i < ringPts.length; i++) {
      const a = ringPts[i];
      const b = ringPts[(i + 1) % ringPts.length];
      points.push(a);
      expandBBox(bbox, a);
      const before = points.length;
      densifyEdge(a, b, stepKm, points);
      for (let k = before; k < points.length; k++) expandBBox(bbox, points[k]);
    }
  }

  return { points, bbox: finalizeBBox(bbox) };
}

/** Lower-bound km from a point to an axis-aligned bbox (0 if inside / antimeridian). */
function pointToBBoxLowerBoundKm(point, bbox) {
  if (bbox.crossesAntimeridian) return 0;
  const lat = Math.min(Math.max(point.lat, bbox.minLat), bbox.maxLat);
  const lng = Math.min(Math.max(point.lng, bbox.minLng), bbox.maxLng);
  if (lat === point.lat && lng === point.lng) return 0;
  return haversineKm(point, { lat, lng });
}

/**
 * Shortest great-circle distance between two countries' borders (km).
 * Densified vertex pairs + bbox pruning (Globle-style, more accurate on coarse coasts).
 */
export function closestBorder(countryA, countryB) {
  const pairKey = `${countryA.name}|${countryB.name}`;
  if (ZERO_DISTANCE_PAIRS.has(pairKey)) {
    return {
      distance: 0,
      from: countryA.centroid,
      to: countryB.centroid,
    };
  }

  let points1 = countryA.borderPoints;
  let points2 = countryB.borderPoints;
  let bbox1 = countryA.borderBBox;
  let bbox2 = countryB.borderBBox;
  let swap = false;

  if (!points1?.length || !points2?.length) {
    const distance = haversineKm(countryA.centroid, countryB.centroid);
    return { distance, from: countryA.centroid, to: countryB.centroid };
  }

  // Outer loop = smaller set for fewer bbox checks.
  if (points1.length > points2.length) {
    [points1, points2] = [points2, points1];
    [bbox1, bbox2] = [bbox2, bbox1];
    swap = true;
  }

  let best = Infinity;
  let from = points1[0];
  let to = points2[0];

  for (let i = 0; i < points1.length; i++) {
    const p1 = points1[i];
    if (bbox2 && pointToBBoxLowerBoundKm(p1, bbox2) >= best) continue;

    for (let j = 0; j < points2.length; j++) {
      const p2 = points2[j];
      if (bbox1 && best < Infinity && pointToBBoxLowerBoundKm(p2, bbox1) >= best) continue;

      const d = haversineKm(p1, p2);
      if (d < best) {
        best = d;
        from = p1;
        to = p2;
        if (best <= 0.05) {
          return swap
            ? { distance: 0, from: to, to: from }
            : { distance: 0, from, to };
        }
      }
    }
  }

  return swap ? { distance: best, from: to, to: from } : { distance: best, from, to };
}

/** Round for display — Globle-style, hides low-res border noise. */
export function roundDistanceKm(km) {
  if (!(km > 0)) return 0;
  return Math.round(km / DISPLAY_ROUND_KM) * DISPLAY_ROUND_KM;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

export function colorFromDistance(km) {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const curr = COLOR_STOPS[i];
    const next = COLOR_STOPS[i + 1];
    if (km <= next.km) {
      const t = (km - curr.km) / (next.km - curr.km);
      const [r, g, b] = lerpColor(curr.color, next.color, t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const last = COLOR_STOPS[COLOR_STOPS.length - 1].color;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export function formatDistance(km, unit = "km") {
  const rounded = roundDistanceKm(km);
  const value = unit === "mi" ? rounded * 0.621371 : rounded;
  return Math.round(value).toLocaleString("en-US");
}

export function distanceUnitLabel(unit) {
  return unit === "mi" ? "miles" : "km";
}
