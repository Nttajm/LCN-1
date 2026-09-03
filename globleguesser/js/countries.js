import { feature as topoFeature } from "topojson-client";
import { loadIsoLookup, resolveIso2 } from "./flags.js";

const GEOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json";

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

const REGION_IDS = ["world", "asia", "americas", "europe", "africa", "west-hemisphere"];

function classifyRegions(centroid) {
  const { lat, lng } = centroid;
  const regions = new Set(["world"]);

  if (lat >= -56 && lat <= 72 && lng >= -172 && lng <= -32) {
    regions.add("americas");
  }

  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45) {
    if (!(lng > 38 && lat < 42)) regions.add("europe");
  }

  if (lat >= -35 && lat <= 38 && lng >= -18 && lng <= 52) {
    if (!(lng > 34 && lat > 12)) regions.add("africa");
  }

  if (
    (lat >= -10 && lat <= 77 && lng >= 25 && lng <= 180) ||
    (lng < -169 && lat >= 42) ||
    (lat >= 12 && lat <= 42 && lng >= 34 && lng <= 95)
  ) {
    regions.add("asia");
  }

  if (lng < 0) {
    regions.add("west-hemisphere");
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

export async function loadCountries() {
  const [topoRes, isoLookup] = await Promise.all([
    fetch(GEOJSON_URL),
    loadIsoLookup(),
  ]);
  if (!topoRes.ok) throw new Error("country data fetch failed");
  const topo = await topoRes.json();
  const geojson = topoFeature(topo, topo.objects.countries);

  /** @type {Map<string, { name: string, feature: object, centroid: object, iso2: string, priority: number }>} */
  const byIso2 = new Map();

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
    const existing = byIso2.get(iso2);
    if (existing && existing.priority >= priority) continue;

    feature.properties = { ...feature.properties, name, neName };
    const centroid = featureCentroid(feature.geometry);
    byIso2.set(iso2, { name, feature, centroid, iso2, priority });
  }

  const countries = [...byIso2.values()].map(({ priority: _p, ...rest }) => rest);
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
  const features = countries.map((c) => c.feature);
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
    randomTarget() {
      const pool = uniqueNames.map((n) => byName.get(normalizeKey(n))).filter(Boolean);
      return pool[Math.floor(Math.random() * pool.length)];
    },
  };
}
