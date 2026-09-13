import { feature as topoFeature } from "topojson-client";
import { borderPointsFromGeometry } from "./distance.js";
import { groupAliasesByTarget, pickDisplayAliases } from "./alias-display.js";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const BORDER_STEP_KM = 5;
const PACK_ID = "us-states";

/** CONUS camera anchor — avoids Alaska/Hawaii pulling the region centroid. */
const CONUS_CENTROID = { lat: 39.5, lng: -98.35 };

/** FIPS codes for the 50 states + District of Columbia. */
const INCLUDE_FIPS = new Set([
  "01", "02", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
  "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42",
  "44", "45", "46", "47", "48", "49", "50", "51", "53", "54", "55", "56",
]);

/** Postal / common aliases → canonical display name. */
const ALIASES = {
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  calif: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  dc: "District of Columbia",
  "washington dc": "District of Columbia",
  "washington d.c.": "District of Columbia",
  "washington d.c": "District of Columbia",
  "d.c.": "District of Columbia",
  "d.c": "District of Columbia",
  "district of columbia": "District of Columbia",
  fl: "Florida",
  fla: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mass: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming",
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

function padFips(id) {
  const raw = String(id ?? "");
  return raw.length >= 2 ? raw : raw.padStart(2, "0");
}

let loadPromise = null;

/**
 * Load US states + DC as a geography pack with the same API surface as loadCountries().
 */
export function loadUsStates() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch(GEO_URL);
    if (!res.ok) throw new Error("us states data fetch failed");
    const topo = await res.json();
    const geo = topoFeature(topo, topo.objects.states);

    const units = [];
    for (const feature of geo.features) {
      const fips = padFips(feature.id);
      if (!INCLUDE_FIPS.has(fips)) continue;
      const name = feature.properties?.name;
      if (!name) continue;

      const displayFeature = {
        ...feature,
        id: fips,
        properties: {
          ...feature.properties,
          name,
          fips,
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
        fips,
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
    const regionCentroids = new Map([[PACK_ID, CONUS_CENTROID]]);

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
