/**
 * FIFA World Cup winners (~500 squad players) → merge into data.json by QID.
 *
 * Strategy:
 * 1) Wikipedia category "FIFA World Cup–winning players" = who won (≈497).
 * 2) Edition winner team country + player P1344/P1532 = win years/counts.
 * 3) upsertTrophy by QID so Messi keeps ballonDor and gains worldCup.
 *
 * Run: node js/fetch-world-cup.mjs
 */

import {
  queryWikidata,
  loadData,
  playersById,
  upsertTrophy,
  saveData,
  parseYears,
  httpsImage,
} from "./lib.mjs";

/** Authoritative set of winning players (Wikipedia category → Wikidata). */
const CATEGORY_SPARQL = `
SELECT DISTINCT ?qid ?playerLabel (SAMPLE(?image) AS ?image) WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "Generator" .
    bd:serviceParam wikibase:endpoint "en.wikipedia.org" .
    bd:serviceParam mwapi:generator "categorymembers" .
    bd:serviceParam mwapi:gcmtitle "Category:FIFA World Cup–winning players" .
    bd:serviceParam mwapi:gcmtype "page" .
    bd:serviceParam mwapi:gcmlimit "max" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  BIND(STRAFTER(STR(?item), "entity/") AS ?qid)
  OPTIONAL { ?item wdt:P18 ?image }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en" .
    ?item rdfs:label ?playerLabel .
  }
}
GROUP BY ?qid ?playerLabel
`.trim();

/**
 * Win years: played in a WC edition for the country that won that edition.
 * (Filters coaches who never played that year if they lack P1344.)
 */
const YEARS_SPARQL = `
SELECT ?qid (GROUP_CONCAT(DISTINCT ?year; SEPARATOR=",") AS ?years) WHERE {
  ?edition wdt:P3450 wd:Q19317 .
  ?edition wdt:P1346 ?team .
  ?edition wdt:P585 ?date .
  BIND(YEAR(?date) AS ?year)
  FILTER(?year <= YEAR(NOW()))
  ?team wdt:P1532 ?country .
  ?player wdt:P1344 ?edition .
  ?player wdt:P1532 ?country .
  ?player wdt:P31 wd:Q5 .
  BIND(STRAFTER(STR(?player), "entity/") AS ?qid)
}
GROUP BY ?qid
`.trim();

console.log("Fetching WC category members…");
const catJson = await queryWikidata(CATEGORY_SPARQL);
console.log(`  ${catJson.results.bindings.length} in category`);

console.log("Fetching WC win years…");
const yearsJson = await queryWikidata(YEARS_SPARQL);
const yearsById = new Map();
for (const b of yearsJson.results.bindings) {
  yearsById.set(b.qid.value, parseYears(b.years?.value));
}
console.log(`  ${yearsById.size} with year data`);

const data = loadData();
const byId = playersById(data);

let withYears = 0;
let defaulted = 0;

for (const b of catJson.results.bindings) {
  const id = b.qid?.value;
  if (!id) continue;
  const name = /^Q\d+$/.test(b.playerLabel.value)
    ? id
    : b.playerLabel.value;
  const years = yearsById.get(id) || [];
  const count = years.length > 0 ? years.length : 1;
  if (years.length) withYears++;
  else defaulted++;

  upsertTrophy(byId, {
    id,
    name,
    image: httpsImage(b.image?.value),
    trophy: "worldCup",
    count,
    years,
  });
}

data.meta.awards = data.meta.awards || {};
data.meta.awards.worldCup = {
  id: "worldCup",
  label: "World Cup",
  wikidataId: "Q19317",
  icon: "icons/trophies/worldcup.png",
  category: "Category:FIFA World Cup–winning players",
};
data.meta.queries = data.meta.queries || {};
data.meta.queries.worldCup =
  "enwiki category + edition P1346/P1532 + player P1344";

const players = saveData(data, byId);
const wc = players.filter((p) => p.trophies.worldCup);
const both = players.filter(
  (p) => p.trophies.ballonDor && p.trophies.worldCup
);
console.log(
  `Merged World Cup onto ${wc.length} players (${withYears} with years, ${defaulted} as ×1)`
);
console.log(
  `Overlap with Ballon d'Or: ${both.length} (e.g. Messi keeps one row)`
);
console.log(`Total players in data.json: ${players.length}`);
