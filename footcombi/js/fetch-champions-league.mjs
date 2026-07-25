/**
 * UEFA Champions League / European Cup winners → merge into data.json by QID.
 *
 * Strategy (same pattern as World Cup):
 * 1) Wikipedia category ≈960 medal winners (European Cup + UCL).
 * 2) Win years where Wikidata has P1344 on the edition + club P54 = winner.
 * 3) upsertTrophy by QID so existing players (Messi, etc.) gain championsLeague.
 *
 * Run: node js/fetch-champions-league.mjs
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

const CATEGORY =
  "Category:UEFA Champions League–winning players";

const CATEGORY_SPARQL = `
SELECT DISTINCT ?qid ?playerLabel (SAMPLE(?image) AS ?image) WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "Generator" .
    bd:serviceParam wikibase:endpoint "en.wikipedia.org" .
    bd:serviceParam mwapi:generator "categorymembers" .
    bd:serviceParam mwapi:gcmtitle "${CATEGORY}" .
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
 * Years: played in a CL/European Cup edition for the club that won it.
 * Uses p:P54/ps:P54 so non-preferred (historical) club memberships count.
 * End year of the season (P582) = trophy year.
 */
const YEARS_SPARQL = `
SELECT ?qid (GROUP_CONCAT(DISTINCT ?winYear; SEPARATOR=",") AS ?years) WHERE {
  ?edition wdt:P3450 wd:Q18756 .
  ?edition wdt:P1346 ?team .
  ?edition wdt:P582 ?end .
  BIND(YEAR(?end) AS ?winYear)
  FILTER(?winYear <= YEAR(NOW()))
  ?player wdt:P1344 ?edition .
  ?player p:P54/ps:P54 ?team .
  ?player wdt:P31 wd:Q5 .
  BIND(STRAFTER(STR(?player), "entity/") AS ?qid)
}
GROUP BY ?qid
`.trim();

/**
 * Broader years: on the winning club's books at season end (tenure overlap).
 * Requires P580/P582 on the club stint so undated memberships don't match every title.
 */
const TENURE_YEARS_SPARQL = `
SELECT ?qid (GROUP_CONCAT(DISTINCT ?winYear; SEPARATOR=",") AS ?years) WHERE {
  ?edition wdt:P3450 wd:Q18756 .
  ?edition wdt:P1346 ?team .
  ?edition wdt:P582 ?end .
  BIND(YEAR(?end) AS ?winYear)
  FILTER(?winYear <= YEAR(NOW()))
  ?player p:P54 ?st .
  ?st ps:P54 ?team .
  ?player wdt:P31 wd:Q5 .
  OPTIONAL { ?st pq:P580 ?from }
  OPTIONAL { ?st pq:P582 ?to }
  FILTER(BOUND(?from) || BOUND(?to))
  FILTER(!BOUND(?from) || ?from <= ?end)
  FILTER(!BOUND(?to) || ?to >= ?end)
  BIND(STRAFTER(STR(?player), "entity/") AS ?qid)
}
GROUP BY ?qid
`.trim();

/** Known gaps when Wikidata club dates miss a final (still in category). */
const EXTRA_YEARS = {
  Q11571: [2008, 2014, 2016, 2017, 2018], // Cristiano Ronaldo
};

function mergeYears(a = [], b = []) {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

console.log("Fetching UCL category members…");
const catJson = await queryWikidata(CATEGORY_SPARQL);
console.log(`  ${catJson.results.bindings.length} in category`);

console.log("Fetching UCL win years (P1344 + club)…");
const yearsJson = await queryWikidata(YEARS_SPARQL);
const yearsById = new Map();
for (const b of yearsJson.results.bindings) {
  yearsById.set(b.qid.value, parseYears(b.years?.value));
}
console.log(`  ${yearsById.size} with participation years`);

console.log("Fetching UCL win years (club tenure)…");
let tenureCount = 0;
try {
  const tenureJson = await queryWikidata(TENURE_YEARS_SPARQL);
  for (const b of tenureJson.results.bindings) {
    const id = b.qid.value;
    const next = parseYears(b.years?.value);
    yearsById.set(id, mergeYears(yearsById.get(id), next));
  }
  tenureCount = tenureJson.results.bindings.length;
  console.log(`  ${tenureCount} with tenure years`);
} catch (err) {
  console.warn(`  tenure query skipped: ${err.message}`);
}

const data = loadData();
const byId = playersById(data);

let withYears = 0;
let defaulted = 0;

for (const [id, extra] of Object.entries(EXTRA_YEARS)) {
  yearsById.set(id, mergeYears(yearsById.get(id), extra));
}

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
    trophy: "championsLeague",
    count,
    years,
  });
}

data.meta.awards = data.meta.awards || {};
data.meta.awards.championsLeague = {
  id: "championsLeague",
  label: "Champions League",
  wikidataId: "Q18756",
  icon: "icons/trophies/championsleague.png",
  category: CATEGORY,
};
data.meta.queries = data.meta.queries || {};
data.meta.queries.championsLeague =
  "enwiki category + edition P1346 + P1344/P54 (+ tenure overlap)";

const players = saveData(data, byId);
const ucl = players.filter((p) => p.trophies.championsLeague);
const withBd = players.filter(
  (p) => p.trophies.ballonDor && p.trophies.championsLeague
);
const messi = byId.get("Q615");
const ronaldo = byId.get("Q11571");

console.log(
  `Merged Champions League onto ${ucl.length} players (${withYears} with years, ${defaulted} as ×1)`
);
console.log(`Overlap with Ballon d'Or: ${withBd.length}`);
console.log(
  `Messi: CL=${messi?.trophies.championsLeague} years=[${messi?.years.championsLeague?.join(",")}]`
);
console.log(
  `Ronaldo: CL=${ronaldo?.trophies.championsLeague} years=[${ronaldo?.years.championsLeague?.join(",")}]`
);
console.log(`Total players in data.json: ${players.length}`);
