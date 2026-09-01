const EARTH_RADIUS_KM = 6371;

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const COLOR_STOPS = [
  { km: 0, color: [106, 170, 100] },
  { km: 250, color: [139, 26, 26] },
  { km: 1000, color: [200, 50, 30] },
  { km: 2500, color: [230, 120, 40] },
  { km: 5000, color: [240, 200, 80] },
  { km: 10000, color: [245, 235, 210] },
  { km: 20000, color: [230, 225, 215] },
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
  if (km <= 0) {
    return "rgb(106, 170, 100)";
  }

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

export function formatDistance(km) {
  return Math.round(km).toLocaleString("en-US");
}
