import { borderPointsFromGeometry } from "./distance.js";
import { groupAliasesByTarget, pickDisplayAliases } from "./alias-display.js";

const GEO_URL =
  "https://cdn.jsdelivr.net/gh/codeforamerica/click_that_hood@master/public/data/canada.geojson";
const BORDER_STEP_KM = 5;
const PACK_ID = "ca-provinces";

/** Southern Canada camera anchor — avoids Nunavut/NWT pulling the view north. */
const CANADA_CENTROID = { lat: 56.1, lng: -96.5 };

/** Postal / common aliases → canonical display name (as in source GeoJSON). */
const ALIASES = {
  ab: "Alberta",
  alberta: "Alberta",
  bc: "British Columbia",
  "british columbia": "British Columbia",
  mb: "Manitoba",
  manitoba: "Manitoba",
  nb: "New Brunswick",
  "new brunswick": "New Brunswick",
  nl: "Newfoundland and Labrador",
  nf: "Newfoundland and Labrador",
  nfl: "Newfoundland and Labrador",
  newfoundland: "Newfoundland and Labrador",
  "newfoundland and labrador": "Newfoundland and Labrador",
  labrador: "Newfoundland and Labrador",
  ns: "Nova Scotia",
  "nova scotia": "Nova Scotia",
  nt: "Northwest Territories",
  nwt: "Northwest Territories",
  "northwest territories": "Northwest Territories",
  "north west territories": "Northwest Territories",
  nu: "Nunavut",
  nunavut: "Nunavut",
  on: "Ontario",
  ontario: "Ontario",
  pe: "Prince Edward Island",
  pei: "Prince Edward Island",
  "prince edward island": "Prince Edward Island",
  "p.e.i.": "Prince Edward Island",
  "p.e.i": "Prince Edward Island",
  qc: "Quebec",
  pq: "Quebec",
  quebec: "Quebec",
  québec: "Quebec",
  sk: "Saskatchewan",
  saskatchewan: "Saskatchewan",
  yt: "Yukon Territory",
  yk: "Yukon Territory",
  yukon: "Yukon Territory",
  "yukon territory": "Yukon Territory",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function ringCentroid(ring) {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng, lat] = ring[i];
    sumLat += lat;
    sumLng += lng;
    count += 1;
  }
  if (!count) return { lat: 0, lng: 0 };
  return { lat: sumLat / count, lng: sumLng / count };
}

function featureCentroid(geometry) {
  if (!geometry) return { lat: 0, lng: 0 };
  if (geometry.type === "Polygon") {
    return ringCentroid(geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
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

let loadPromise = null;

/**
 * Load Canadian provinces + territories with the same API surface as loadCountries().
 */
export function loadCaProvinces() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch(GEO_URL);
    if (!res.ok) throw new Error("canada provinces data fetch failed");
    const geo = await res.json();

    const units = [];
    for (const feature of geo.features || []) {
      const name = feature.properties?.name;
      if (!name) continue;

      const displayFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          name,
        },
      };
      displayFeature.__id = name;

      const centroid = featureCentroid(displayFeature.geometry);
      const { points, bbox } = borderPointsFromGeometry(
        displayFeature.geometry,
        BORDER_STEP_KM
      );

      units.push({
        name,
        iso2: "",
        centroid,
        feature: displayFeature,
        borderPoints: points,
        borderBBox: bbox,
      });
    }

    units.sort((a, b) => a.name.localeCompare(b.name));

    const byName = new Map();
    const allNames = [];
    for (const unit of units) {
      byName.set(normalizeKey(unit.name), unit);
      allNames.push(unit.name);
    }

    for (const [alias, targetName] of Object.entries(ALIASES)) {
      const unit = byName.get(normalizeKey(targetName));
      if (unit) byName.set(normalizeKey(alias), unit);
    }

    const aliasesByTarget = groupAliasesByTarget(ALIASES);
    for (const unit of units) {
      unit.aliases = pickDisplayAliases(
        unit.name,
        aliasesByTarget.get(unit.name) || []
      );
    }

    const uniqueNames = [...new Set(allNames)].sort((a, b) =>
      a.localeCompare(b)
    );
    const features = units.map((u) => u.feature);
    const memberSet = new Set(uniqueNames);
    const regionMembers = new Map([[PACK_ID, memberSet]]);
    const regionCentroids = new Map([[PACK_ID, CANADA_CENTROID]]);

    return {
      packId: PACK_ID,
      features,
      regionMembers,
      regionCentroids,
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
          if (!name.toLowerCase().includes(key)) continue;
          const unit = byName.get(normalizeKey(name));
          if (!unit || seen.has(unit.name)) continue;
          seen.add(unit.name);
          results.push(unit);
          if (results.length >= limit) break;
        }
        return results;
      },
      randomTarget(regionId = PACK_ID, excludeNames = []) {
        const excluded = new Set(excludeNames);
        const pool = uniqueNames
          .map((n) => byName.get(normalizeKey(n)))
          .filter((unit) => unit && !excluded.has(unit.name));
        if (!pool.length) {
          const fallback = uniqueNames
            .map((n) => byName.get(normalizeKey(n)))
            .filter(Boolean);
          return fallback[Math.floor(Math.random() * fallback.length)];
        }
        return pool[Math.floor(Math.random() * pool.length)];
      },
    };
  })();

  return loadPromise;
}
