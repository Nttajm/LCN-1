import { feature as topoFeature } from "topojson-client";

const GEOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ALIASES = {
  "united states": "United States of America",
  "united states of america": "United States of America",
  usa: "United States of America",
  us: "United States of America",
  america: "United States of America",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  "south korea": "South Korea",
  "north korea": "North Korea",
  "republic of korea": "South Korea",
  "democratic people's republic of korea": "North Korea",
  dprk: "North Korea",
  "czech republic": "Czechia",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "dr congo": "Dem. Rep. Congo",
  "democratic republic of the congo": "Dem. Rep. Congo",
  "republic of the congo": "Congo",
  russia: "Russia",
  "russian federation": "Russia",
  vietnam: "Vietnam",
  "viet nam": "Vietnam",
  burma: "Myanmar",
  "east timor": "Timor-Leste",
  swaziland: "eSwatini",
  "north macedonia": "Macedonia",
  macedonia: "Macedonia",
  "the bahamas": "Bahamas",
  "the gambia": "Gambia",
  uae: "United Arab Emirates",
  "central african republic": "Central African Rep.",
  "dominican republic": "Dominican Rep.",
  "equatorial guinea": "Eq. Guinea",
  "bosnia": "Bosnia and Herz.",
  "bosnia and herzegovina": "Bosnia and Herz.",
  "solomon islands": "Solomon Is.",
  "falkland islands": "Falkland Is.",
  "south sudan": "S. Sudan",
  "western sahara": "W. Sahara",
  "new caledonia": "New Caledonia",
  "puerto rico": "Puerto Rico",
  "french southern territories": "Fr. S. Antarctic Lands",
};

const EXCLUDED_NAMES = new Set(["Antarctica"]);

function ringCentroid(ring) {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng, lat] = ring[i];
    sumLat += lat;
    sumLng += lng;
    count++;
  }
  return { lat: sumLat / count, lng: sumLng / count };
}

function featureCentroid(geometry) {
  if (!geometry) return { lat: 0, lng: 0 };
  const type = geometry.type;
  if (type === "Polygon") {
    return ringCentroid(geometry.coordinates[0]);
  }
  if (type === "MultiPolygon") {
    let best = null;
    let bestLen = 0;
    for (const polygon of geometry.coordinates) {
      const ring = polygon[0];
      if (ring.length > bestLen) {
        bestLen = ring.length;
        best = ring;
      }
    }
    return best ? ringCentroid(best) : { lat: 0, lng: 0 };
  }
  return { lat: 0, lng: 0 };
}

function normalizeKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function loadCountries() {
  const topoRes = await fetch(GEOJSON_URL);
  if (!topoRes.ok) throw new Error("country data fetch failed");
  const topo = await topoRes.json();
  const geojson = topoFeature(topo, topo.objects.countries);

  const byName = new Map();
  const allNames = [];

  for (const feature of geojson.features) {
    const name = feature.properties?.name;
    if (!name || EXCLUDED_NAMES.has(name)) continue;

    const centroid = featureCentroid(feature.geometry);
    const country = { name, feature, centroid };

    byName.set(normalizeKey(name), country);
    allNames.push(name);
  }

  for (const [alias, targetName] of Object.entries(ALIASES)) {
    const country = byName.get(normalizeKey(targetName));
    if (country) {
      byName.set(normalizeKey(alias), country);
    }
  }

  const uniqueNames = [...new Set(allNames)].sort((a, b) => a.localeCompare(b));
  const features = geojson.features.filter((f) => {
    const name = f.properties?.name;
    return name && !EXCLUDED_NAMES.has(name);
  });

  return {
    features,
    byName,
    allNames: uniqueNames,
    lookup(query) {
      const key = normalizeKey(query);
      if (!key) return null;
      return byName.get(key) || null;
    },
    search(query, limit = 8) {
      const key = normalizeKey(query);
      if (!key) return [];
      const results = [];
      const seen = new Set();
      for (const name of uniqueNames) {
        if (name.toLowerCase().includes(key)) {
          const country = byName.get(normalizeKey(name));
          if (country && !seen.has(country.name)) {
            seen.add(country.name);
            results.push(country);
            if (results.length >= limit) break;
          }
        }
      }
      return results;
    },
    randomTarget() {
      const pool = uniqueNames
        .filter((n) => !EXCLUDED_NAMES.has(n))
        .map((n) => byName.get(normalizeKey(n)));
      return pool[Math.floor(Math.random() * pool.length)];
    },
  };
}
