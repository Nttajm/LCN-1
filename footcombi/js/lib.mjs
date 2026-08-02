import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = join(__dirname, "data.json");

export async function queryWikidata(sparql) {
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", sparql);
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "FootCombi/1.0 (educational; local)",
    },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Load data.json or start empty. Players keyed by Wikidata QID. */
export function loadData() {
  if (!existsSync(DATA_PATH)) {
    return {
      meta: { source: "Wikidata", fetchedAt: null, awards: {}, queries: {} },
      players: [],
    };
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf8"));
}

export function playersById(data) {
  const map = new Map();
  for (const p of data.players || []) map.set(p.id, structuredClone(p));
  return map;
}

/**
 * Merge trophy onto an existing player (same QID) or create one.
 * Messi already in DB → only adds trophies.worldCup / years.worldCup.
 */
export function upsertTrophy(byId, { id, name, image, trophy, count, years }) {
  let p = byId.get(id);
  if (!p) {
    p = { id, name: name || id, image: image || null, trophies: {}, years: {} };
    byId.set(id, p);
  } else {
    if (name && (!p.name || /^Q\d+$/.test(p.name))) p.name = name;
    if (image && !p.image) p.image = image.replace(/^http:/, "https:");
  }
  if (!p.trophies) p.trophies = {};
  if (!p.years) p.years = {};
  p.trophies[trophy] = count;
  p.years[trophy] = years;
  return p;
}

export function saveData(data, byId) {
  const players = [...byId.values()].sort((a, b) => {
    const score = (p) =>
      Object.values(p.trophies || {}).reduce((s, n) => s + n, 0);
    return score(b) - score(a) || a.name.localeCompare(b.name);
  });
  data.players = players;
  data.meta = data.meta || {};
  data.meta.fetchedAt = new Date().toISOString();
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  return players;
}

export function parseYears(raw) {
  return [
    ...new Set(
      String(raw || "")
        .split(",")
        .map((y) => parseInt(y, 10))
        .filter((y) => Number.isFinite(y))
    ),
  ].sort((a, b) => a - b);
}

export function httpsImage(url) {
  return url ? url.replace(/^http:/, "https:") : null;
}
