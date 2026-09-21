import { feature as topoFeature } from "topojson-client";
import { borderPointsFromGeometry } from "./distance.js";
import { loadIsoLookup, resolveIso2 } from "./flags.js";

// 110m for the globe mesh (FPS); 50m for scoring borders + small-island fill-ins.
const GEO_URL_GLOBE = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const GEO_URL_BORDERS = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

/** Prefer 50m display geometry when 110m is missing or smaller than this span (degrees). */
const ISLAND_DISPLAY_SPAN_MAX = 8;

/** Friendly display names by ISO alpha-2 (overrides Natural Earth / formal ISO labels). */
const DISPLAY_NAMES = {
  ag: "Antigua and Barbuda",
  ba: "Bosnia and Herzegovina",
  bo: "Bolivia",
  bn: "Brunei",
  cf: "Central African Republic",
  cd: "Democratic Republic of the Congo",
  cg: "Republic of the Congo",
  do: "Dominican Republic",
  gq: "Equatorial Guinea",
  fo: "Faroe Islands",
  fk: "Falkland Islands",
  ir: "Iran",
  la: "Laos",
  mk: "North Macedonia",
  mh: "Marshall Islands",
  fm: "Micronesia",
  md: "Moldova",
  mp: "Northern Mariana Islands",
  nl: "Netherlands",
  kp: "North Korea",
  ps: "Palestine",
  ru: "Russia",
  ss: "South Sudan",
  sb: "Solomon Islands",
  kn: "Saint Kitts and Nevis",
  vc: "Saint Vincent and the Grenadines",
  sy: "Syria",
  st: "São Tomé and Príncipe",
  tw: "Taiwan",
  tz: "Tanzania",
  tr: "Turkey",
  gb: "United Kingdom",
  va: "Vatican City",
  ve: "Venezuela",
  vn: "Vietnam",
  eh: "Western Sahara",
  sz: "Eswatini",
  kr: "South Korea",
  us: "United States of America",
  ae: "United Arab Emirates",
  cv: "Cabo Verde",
  ci: "Côte d'Ivoire",
  cz: "Czechia",
  xk: "Kosovo",
  tf: "French Southern Territories",
  io: "British Indian Ocean Territory",
  vg: "British Virgin Islands",
  vi: "U.S. Virgin Islands",
  um: "U.S. Minor Outlying Islands",
  gs: "South Georgia and the South Sandwich Islands",
  hm: "Heard Island and McDonald Islands",
  pf: "French Polynesia",
  bl: "Saint Barthélemy",
  mf: "Saint Martin",
  pm: "Saint Pierre and Miquelon",
  sh: "Saint Helena",
  ax: "Åland Islands",
  ky: "Cayman Islands",
  ck: "Cook Islands",
  tc: "Turks and Caicos Islands",
  wf: "Wallis and Futuna",
  pn: "Pitcairn",
};

/**
 * Alias / alternate spelling → canonical display name.
 * Keys must be normalizeKey()'d forms.
 */
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
  "côte d'ivoire": "Côte d'Ivoire",
  "dr congo": "Democratic Republic of the Congo",
  "drc": "Democratic Republic of the Congo",
  "democratic republic of the congo": "Democratic Republic of the Congo",
  "democratic republic of congo": "Democratic Republic of the Congo",
  "republic of the congo": "Republic of the Congo",
  congo: "Republic of the Congo",
  russia: "Russia",
  "russian federation": "Russia",
  vietnam: "Vietnam",
  "viet nam": "Vietnam",
  burma: "Myanmar",
  "east timor": "Timor-Leste",
  swaziland: "Eswatini",
  eswatini: "Eswatini",
  "north macedonia": "North Macedonia",
  macedonia: "North Macedonia",
  "the bahamas": "Bahamas",
  "the gambia": "Gambia",
  uae: "United Arab Emirates",
  "central african republic": "Central African Republic",
  "dominican republic": "Dominican Republic",
  "equatorial guinea": "Equatorial Guinea",
  bosnia: "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "bosnia and herz.": "Bosnia and Herzegovina",
  "solomon islands": "Solomon Islands",
  "solomon is.": "Solomon Islands",
  "falkland islands": "Falkland Islands",
  "falkland is.": "Falkland Islands",
  "south sudan": "South Sudan",
  "s. sudan": "South Sudan",
  "western sahara": "Western Sahara",
  "w. sahara": "Western Sahara",
  "new caledonia": "New Caledonia",
  "puerto rico": "Puerto Rico",
  "french southern territories": "French Southern Territories",
  "fr. s. antarctic lands": "French Southern Territories",
  "french polynesia": "French Polynesia",
  "fr. polynesia": "French Polynesia",
  "cape verde": "Cabo Verde",
  "cabo verde": "Cabo Verde",
  "antigua and barbuda": "Antigua and Barbuda",
  "antigua and barb.": "Antigua and Barbuda",
  "saint vincent and the grenadines": "Saint Vincent and the Grenadines",
  "st. vincent and the grenadines": "Saint Vincent and the Grenadines",
  "st. vin. and gren.": "Saint Vincent and the Grenadines",
  "sao tome and principe": "São Tomé and Príncipe",
  "são tomé and principe": "São Tomé and Príncipe",
  "são tomé and príncipe": "São Tomé and Príncipe",
  "marshall islands": "Marshall Islands",
  "marshall is.": "Marshall Islands",
  "saint kitts and nevis": "Saint Kitts and Nevis",
  "st. kitts and nevis": "Saint Kitts and Nevis",
  "saint lucia": "Saint Lucia",
  "st lucia": "Saint Lucia",
  "saint barthelemy": "Saint Barthélemy",
  "saint barthélemy": "Saint Barthélemy",
  "st-barthélemy": "Saint Barthélemy",
  "st-barthelemy": "Saint Barthélemy",
  "saint martin": "Saint Martin",
  "st-martin": "Saint Martin",
  "saint pierre and miquelon": "Saint Pierre and Miquelon",
  "st. pierre and miquelon": "Saint Pierre and Miquelon",
  "cayman islands": "Cayman Islands",
  "cayman is.": "Cayman Islands",
  "cook islands": "Cook Islands",
  "cook is.": "Cook Islands",
  "turks and caicos": "Turks and Caicos Islands",
  "turks and caicos islands": "Turks and Caicos Islands",
  "turks and caicos is.": "Turks and Caicos Islands",
  "british virgin islands": "British Virgin Islands",
  "british virgin is.": "British Virgin Islands",
  "us virgin islands": "U.S. Virgin Islands",
  "u.s. virgin islands": "U.S. Virgin Islands",
  "u.s. virgin is.": "U.S. Virgin Islands",
  vatican: "Vatican City",
  "vatican city": "Vatican City",
  "holy see": "Vatican City",
  "faroe islands": "Faroe Islands",
  "faeroe is.": "Faroe Islands",
  "dem. rep. congo": "Democratic Republic of the Congo",
  "central african rep.": "Central African Republic",
  "dominican rep.": "Dominican Republic",
  "eq. guinea": "Equatorial Guinea",
  turkey: "Turkey",
  türkiye: "Turkey",
  turkiye: "Turkey",
};

const EXCLUDED_NAMES = new Set(["Antarctica"]);

/** Features that share a parent ISO code but are not the primary country polygon. */
const EXCLUDED_NE_NAMES = new Set([
  "Ashmore and Cartier Is.",
  "Coral Sea Is.",
  "Indian Ocean Ter.",
  "N. Cyprus",
  "Somaliland",
  "Baikonur",
  "Siachen Glacier",
  "Scarborough Reef",
  "Spratly Is.",
  "Bajo Nuevo Bank",
  "Serranilla Bank",
  "Akrotiri",
  "Dhekelia",
  "Cyprus U.N. Buffer Zone",
  "USNB Guantanamo Bay",
  "Clipperton I.",
]);

const REGION_IDS = ["world", "asia", "americas", "europe", "africa", "east-hemisphere"];

function classifyRegions(centroid) {
  const { lat, lng } = centroid;
  const regions = new Set(["world"]);

  if (lat >= -56 && lat <= 72 && lng >= -172 && lng <= -32) {
    regions.add("americas");
  }

  // Europe: keep Malta/Cyprus; Maghreb (Tunisia ~34°N/10°E) is African.
  // Malta Channel (~14°E) separates Tunisia from Malta.
  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45) {
    const northAfricanMainland = lat < 36 && lng >= -18 && lng < 14;
    if (!northAfricanMainland && !(lng > 38 && lat < 42)) {
      regions.add("europe");
    }
  }

  // Africa: Maghreb + Horn; exclude Levant/Arabia (Suez ~32.5°E) and European Med islands.
  if (lat >= -35 && lat <= 38 && lng >= -18 && lng <= 52) {
    const medEuropeanIsland = lat >= 34 && lng >= 14 && lng <= 36;
    const southwestAsia =
      lng >= 32.5 && lat >= 12 && !(lat < 18.5 && lng < 43); // Horn west of Bab-el-Mandeb
    if (!medEuropeanIsland && !southwestAsia) {
      regions.add("africa");
    }
  }

  // Asia: west edge at Suez (~32.5°E). Do not sweep East/Horn Africa (old lng≥25 box).
  const africanHornOrIslands = lat < 12 && lng >= 44 && lng < 60;
  if (
    ((lat >= -10 && lat <= 77 && lng >= 44 && lng <= 180) && !africanHornOrIslands) ||
    (lng < -169 && lat >= 42) ||
    (lat >= 27 && lat <= 43 && lng >= 32.5 && lng < 44) ||
    (lat >= 12 && lat < 27 && lng >= 36 && lng < 44 && !(lat < 18.5 && lng < 43.5))
  ) {
    regions.add("asia");
  }

  if (lng >= 0) {
    regions.add("east-hemisphere");
  }

  return regions;
}

function buildRegionMembers(countries) {
  const members = new Map(REGION_IDS.map((id) => [id, new Set()]));
  const centroidAcc = new Map(
    REGION_IDS.map((id) => [id, { latSum: 0, lngSum: 0, count: 0 }])
  );

  for (const country of countries) {
    for (const region of classifyRegions(country.centroid)) {
      members.get(region).add(country.name);
      const acc = centroidAcc.get(region);
      acc.latSum += country.centroid.lat;
      acc.lngSum += country.centroid.lng;
      acc.count += 1;
    }
  }

  const regionCentroids = new Map();
  for (const id of REGION_IDS) {
    const acc = centroidAcc.get(id);
    regionCentroids.set(id, {
      lat: acc.count ? acc.latSum / acc.count : 0,
      lng: acc.count ? acc.lngSum / acc.count : 0,
    });
  }

  return { members, regionCentroids };
}

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
  if (!count) return { lat: 0, lng: 0 };
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

/** Island / archipelago nations that need a slight visibility boost on the globe. */
const ISLAND_ISO2 = new Set([
  "ag", "ai", "as", "aw", "ax", "bb", "bh", "bm", "bs", "bv", "cc", "ck", "cv",
  "cw", "cx", "cy", "dm", "fj", "fk", "fm", "fo", "gd", "gg", "gp", "gu", "hm",
  "ht", "id", "ie", "im", "is", "je", "jm", "jp", "ki", "kn", "ky", "lc", "lk",
  "mh", "mp", "mq", "ms", "mt", "mu", "mv", "nc", "nf", "nr", "nu", "nz", "pf",
  "ph", "pn", "pr", "pw", "re", "sb", "sc", "sg", "sh", "sj", "st", "sx", "tc",
  "tk", "tl", "to", "tt", "tv", "tw", "um", "vc", "vg", "vi", "vu", "wf", "ws",
  "yt",
]);

function ringSpanDeg(ring) {
  if (!ring?.length) return 0;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (let i = 0; i < ring.length; i += 1) {
    const [lng, lat] = ring[i];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return Math.max(maxLat - minLat, maxLng - minLng);
}

function geometryBBoxSpanDeg(geometry) {
  if (!geometry) return 0;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  function consume(ring) {
    for (let i = 0; i < ring.length; i += 1) {
      const [lng, lat] = ring[i];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  if (geometry.type === "Polygon") {
    consume(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) consume(polygon[0]);
  } else {
    return 0;
  }
  return Math.max(maxLat - minLat, maxLng - minLng);
}

/** Slight size bump only — tiny islands stay readable without looking inflated. */
function inflateFactorForSpan(span) {
  if (span <= 0.8) return 1.55;
  if (span <= 1.6) return 1.35;
  if (span <= 3) return 1.2;
  if (span <= 5) return 1.1;
  return 1;
}

function scaleRing(ring, center, factor) {
  if (factor === 1) return ring;
  return ring.map(([lng, lat]) => [
    center.lng + (lng - center.lng) * factor,
    center.lat + (lat - center.lat) * factor,
  ]);
}

/**
 * Display-only tweak for island nations: slight polygon scale so they read on
 * the globe. Mainland countries are left alone. Game math uses borderPoints.
 */
function boostTinyDisplayGeometry(feature, centroid, iso2) {
  const geometry = feature?.geometry;
  if (!geometry || !ISLAND_ISO2.has(iso2)) {
    return { feature, tinyBoost: 0 };
  }

  const overallSpan = geometryBBoxSpanDeg(geometry);
  // Large island countries (Japan, Indonesia, etc.) only get a soft extrusion
  // flag — no footprint stretch.
  if (overallSpan > 8) {
    return {
      feature: {
        ...feature,
        properties: { ...feature.properties, tinyBoost: 1.05 },
      },
      tinyBoost: 1.05,
    };
  }

  const countryFactor = inflateFactorForSpan(overallSpan);
  if (countryFactor <= 1) {
    return {
      feature: {
        ...feature,
        properties: { ...feature.properties, tinyBoost: 1.08 },
      },
      tinyBoost: 1.08,
    };
  }

  function boostPolygon(polygon) {
    return polygon.map((ring, index) =>
      index === 0 ? scaleRing(ring, centroid, countryFactor) : ring
    );
  }

  let nextGeometry = geometry;
  if (geometry.type === "Polygon") {
    nextGeometry = { type: "Polygon", coordinates: boostPolygon(geometry.coordinates) };
  } else if (geometry.type === "MultiPolygon") {
    nextGeometry = {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => boostPolygon(polygon)),
    };
  }

  return {
    feature: {
      ...feature,
      geometry: nextGeometry,
      properties: {
        ...feature.properties,
        tinyBoost: countryFactor,
      },
    },
    tinyBoost: countryFactor,
  };
}

function normalizeKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayNameFor(iso2, neName, isoOfficialName) {
  if (DISPLAY_NAMES[iso2]) return DISPLAY_NAMES[iso2];
  if (neName && !EXCLUDED_NE_NAMES.has(neName)) return neName;
  return isoOfficialName || neName;
}

/** Prefer primary country polygons over satellite territories sharing an ISO id. */
function featurePriority(neName, iso2, isoOfficialName) {
  if (EXCLUDED_NE_NAMES.has(neName)) return -100;
  const display = displayNameFor(iso2, neName, isoOfficialName);
  if (normalizeKey(neName) === normalizeKey(display)) return 100;
  if (isoOfficialName && normalizeKey(neName) === normalizeKey(isoOfficialName)) return 90;
  if (/is\.|ter\.|bank|reef|glacier/i.test(neName)) return 10;
  return 50;
}

function ingestTopoFeatures(geojson, isoLookup, into, { forBorders = false } = {}) {
  for (const feature of geojson.features) {
    const neName = feature.properties?.name;
    if (!neName || EXCLUDED_NAMES.has(neName) || EXCLUDED_NE_NAMES.has(neName)) continue;

    const iso2 = resolveIso2(feature, isoLookup.byNumeric, isoLookup.byName);
    if (!iso2) continue;

    const numeric = feature.id != null ? String(feature.id).padStart(3, "0") : null;
    const isoOfficialName =
      (numeric && isoLookup.nameByNumeric.get(numeric)) ||
      isoLookup.nameByAlpha2.get(iso2) ||
      null;

    const name = displayNameFor(iso2, neName, isoOfficialName);
    const priority = featurePriority(neName, iso2, isoOfficialName);
    const existing = into.get(iso2);

    if (forBorders) {
      if (!existing) continue;
      if (existing.borderPriority != null && existing.borderPriority >= priority) continue;
      const { points: borderPoints, bbox: borderBBox } = borderPointsFromGeometry(feature.geometry);
      existing.borderPoints = borderPoints;
      existing.borderBBox = borderBBox;
      existing.borderPriority = priority;
      continue;
    }

    if (existing && existing.priority >= priority) continue;

    feature.properties = { ...feature.properties, name, neName };
    const centroid = featureCentroid(feature.geometry);
    into.set(iso2, {
      name,
      feature,
      centroid,
      borderPoints: [],
      borderBBox: null,
      iso2,
      priority,
      borderPriority: null,
    });
  }
}

/**
 * Collect best-priority 50m features for island nations so we can fill gaps /
 * replace tiny 110m shapes on the display mesh only.
 */
function collectIslandDisplayCandidates(geojson, isoLookup) {
  /** @type {Map<string, { feature: object, centroid: object, priority: number, name: string }>} */
  const candidates = new Map();

  for (const feature of geojson.features) {
    const neName = feature.properties?.name;
    if (!neName || EXCLUDED_NAMES.has(neName) || EXCLUDED_NE_NAMES.has(neName)) continue;

    const iso2 = resolveIso2(feature, isoLookup.byNumeric, isoLookup.byName);
    if (!iso2 || !ISLAND_ISO2.has(iso2)) continue;

    const numeric = feature.id != null ? String(feature.id).padStart(3, "0") : null;
    const isoOfficialName =
      (numeric && isoLookup.nameByNumeric.get(numeric)) ||
      isoLookup.nameByAlpha2.get(iso2) ||
      null;

    const name = displayNameFor(iso2, neName, isoOfficialName);
    const priority = featurePriority(neName, iso2, isoOfficialName);
    const existing = candidates.get(iso2);
    if (existing && existing.priority >= priority) continue;

    const cloned = {
      ...feature,
      properties: { ...feature.properties, name, neName },
    };
    candidates.set(iso2, {
      name,
      feature: cloned,
      centroid: featureCentroid(feature.geometry),
      priority,
    });
  }

  return candidates;
}

/**
 * Prefer 50m island polygons when 110m is missing or too coarse/small.
 * Scoring still uses borderPoints from 50m (applied separately).
 */
function mergeIslandDisplayFeatures(byIso2, islandCandidates) {
  for (const [iso2, candidate] of islandCandidates) {
    const existing = byIso2.get(iso2);
    if (!existing) {
      byIso2.set(iso2, {
        name: candidate.name,
        feature: candidate.feature,
        centroid: candidate.centroid,
        borderPoints: [],
        borderBBox: null,
        iso2,
        priority: candidate.priority,
        borderPriority: null,
      });
      continue;
    }

    const span110 = geometryBBoxSpanDeg(existing.feature?.geometry);
    if (span110 > ISLAND_DISPLAY_SPAN_MAX) continue;

    existing.feature = candidate.feature;
    existing.centroid = candidate.centroid;
  }
}

export async function loadCountries() {
  const [globeRes, borderRes, isoLookup] = await Promise.all([
    fetch(GEO_URL_GLOBE),
    fetch(GEO_URL_BORDERS),
    loadIsoLookup(),
  ]);
  if (!globeRes.ok) throw new Error("country data fetch failed");
  if (!borderRes.ok) throw new Error("border data fetch failed");

  const [topoGlobe, topoBorders] = await Promise.all([globeRes.json(), borderRes.json()]);
  const geoGlobe = topoFeature(topoGlobe, topoGlobe.objects.countries);
  const geoBorders = topoFeature(topoBorders, topoBorders.objects.countries);

  /** @type {Map<string, object>} */
  const byIso2 = new Map();
  // 110m = light display mesh
  ingestTopoFeatures(geoGlobe, isoLookup, byIso2, { forBorders: false });
  // 50m island polygons fill gaps / replace tiny 110m island shapes
  mergeIslandDisplayFeatures(
    byIso2,
    collectIslandDisplayCandidates(geoBorders, isoLookup)
  );
  // 50m = accurate borders for scoring
  ingestTopoFeatures(geoBorders, isoLookup, byIso2, { forBorders: true });

  // Fallback: densify from display geometry if a country lacked 50m borders.
  for (const country of byIso2.values()) {
    if (country.borderPoints?.length) continue;
    const { points, bbox } = borderPointsFromGeometry(country.feature.geometry);
    country.borderPoints = points;
    country.borderBBox = bbox;
  }

  const countries = [...byIso2.values()].map(
    ({ priority: _p, borderPriority: _bp, ...rest }) => rest
  );
  const byName = new Map();
  const allNames = [];

  for (const country of countries) {
    byName.set(normalizeKey(country.name), country);
    allNames.push(country.name);

    const official = isoLookup.nameByAlpha2.get(country.iso2);
    if (official) {
      const key = normalizeKey(official);
      if (!byName.has(key)) byName.set(key, country);
    }

    const neOriginal = country.feature.properties?.neName;
    if (neOriginal) {
      const key = normalizeKey(neOriginal);
      if (!byName.has(key)) byName.set(key, country);
    }
  }

  for (const [alias, targetName] of Object.entries(ALIASES)) {
    const country = byName.get(normalizeKey(targetName));
    if (country) {
      byName.set(normalizeKey(alias), country);
    }
  }

  const uniqueNames = [...new Set(allNames)].sort((a, b) => a.localeCompare(b));
  // Display-only: slight size bump for island nations. borderPoints stay untouched.
  const features = countries.map((c) => {
    const { feature } = boostTinyDisplayGeometry(c.feature, c.centroid, c.iso2);
    c.feature = feature;
    return feature;
  });
  const { members: regionMembers, regionCentroids } = buildRegionMembers(countries);

  return {
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
    randomTarget(regionId = "world", excludeNames = []) {
      const excluded = new Set(excludeNames);
      const memberSet = regionId && regionId !== "world"
        ? regionMembers.get(regionId)
        : null;
      const pool = uniqueNames
        .map((n) => byName.get(normalizeKey(n)))
        .filter((country) => {
          if (!country) return false;
          if (excluded.has(country.name)) return false;
          if (!memberSet) return true;
          return memberSet.has(country.name);
        });
      if (!pool.length) {
        const fallback = uniqueNames
          .map((n) => byName.get(normalizeKey(n)))
          .filter((country) => country && !excluded.has(country.name));
        const list = fallback.length
          ? fallback
          : uniqueNames.map((n) => byName.get(normalizeKey(n))).filter(Boolean);
        return list[Math.floor(Math.random() * list.length)];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },
  };
}
