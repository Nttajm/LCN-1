import { loadUsStates } from "./us-states.js";
import { loadCaProvinces } from "./ca-provinces.js";

const PACK_ID = "us-ca";

/** North America camera anchor — fits CONUS + southern Canada. */
const US_CA_CENTROID = { lat: 48, lng: -96 };

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

let loadPromise = null;

/**
 * Merge US states + Canadian provinces into one geography pack.
 */
export function loadUsCa() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [us, ca] = await Promise.all([loadUsStates(), loadCaProvinces()]);

    const byName = new Map();
    for (const [key, unit] of us.byName) byName.set(key, unit);
    for (const [key, unit] of ca.byName) byName.set(key, unit);

    const uniqueNames = [...new Set([...us.allNames, ...ca.allNames])].sort(
      (a, b) => a.localeCompare(b)
    );
    const features = [...us.features, ...ca.features];
    const memberSet = new Set(uniqueNames);
    const regionMembers = new Map([[PACK_ID, memberSet]]);
    const regionCentroids = new Map([[PACK_ID, US_CA_CENTROID]]);

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
