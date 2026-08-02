/**
 * Ballon d'Or → merge into data.json by Wikidata QID.
 * Run: node js/fetch-ballon-dor.mjs
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

const SPARQL = `
SELECT ?player ?playerLabel ?qid (SAMPLE(?image) AS ?image)
       (COUNT(?statement) AS ?wins)
       (GROUP_CONCAT(?year; SEPARATOR=",") AS ?years)
WHERE {
  wd:Q166177 p:P1346 ?statement .
  ?statement ps:P1346 ?player .
  OPTIONAL {
    ?statement pq:P585 ?date .
    BIND(YEAR(?date) AS ?year)
  }
  OPTIONAL { ?player wdt:P18 ?image }
  BIND(STRAFTER(STR(?player), "entity/") AS ?qid)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?player ?playerLabel ?qid
ORDER BY DESC(?wins) ?playerLabel
`.trim();

const LABEL_FIX = { Q152832: "Kevin Keegan" };
const EXTRA = [{ id: "Q20851003", name: "Ousmane Dembélé", year: 2025 }];

const data = loadData();
const byId = playersById(data);
const json = await queryWikidata(SPARQL);

for (const b of json.results.bindings) {
  const id = b.qid.value;
  const years = parseYears(b.years?.value);
  const name =
    LABEL_FIX[id] ||
    (/^Q\d+$/.test(b.playerLabel.value) ? id : b.playerLabel.value);
  upsertTrophy(byId, {
    id,
    name,
    image: httpsImage(b.image?.value),
    trophy: "ballonDor",
    count: years.length || Number(b.wins.value),
    years,
  });
}

for (const extra of EXTRA) {
  const existing = byId.get(extra.id);
  const years = existing?.years?.ballonDor
    ? [...existing.years.ballonDor]
    : [];
  if (!years.includes(extra.year)) years.push(extra.year);
  years.sort((a, c) => a - c);
  upsertTrophy(byId, {
    id: extra.id,
    name: extra.name,
    image: existing?.image || null,
    trophy: "ballonDor",
    count: years.length,
    years,
  });
}

data.meta.awards = data.meta.awards || {};
data.meta.awards.ballonDor = {
  id: "ballonDor",
  label: "Ballon d'Or",
  wikidataId: "Q166177",
  icon: "icons/trophies/ballondor.png",
};
data.meta.queries = data.meta.queries || {};
data.meta.queries.ballonDor = "wd:Q166177 p:P1346 / pq:P585";

const players = saveData(data, byId);
const n = players.filter((p) => p.trophies.ballonDor).length;
console.log(`Merged Ballon d'Or onto ${n} players → data.json (${players.length} total)`);
