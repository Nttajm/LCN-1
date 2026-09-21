import { neighbors } from "topojson-client";
import { resolveIso2 } from "./flags.js";
import { isUnMemberIso2 } from "./un-members.js";

/**
 * Fold excluded / disputed Natural Earth geometries into a parent ISO so
 * shared arcs through them still create real country borders.
 * Keys are Natural Earth feature names (exact).
 */
const BORDER_MERGE = {
  Somaliland: "so",
  "N. Cyprus": "cy",
  Baikonur: "kz",
  "Siachen Glacier": "in",
  Akrotiri: "cy",
  Dhekelia: "cy",
  "Cyprus U.N. Buffer Zone": "cy",
  "Ashmore and Cartier Is.": "au",
  "Coral Sea Is.": "au",
  "Indian Ocean Ter.": "io",
  "USNB Guantanamo Bay": "cu",
};

/**
 * Explicit edge corrections for genuine world-atlas mesh gaps / artifacts.
 * Each entry is [isoA, isoB].
 */
const BORDER_OVERRIDES = {
  // Spain–Morocco via Ceuta / Melilla (not in world-atlas country arcs).
  add: [
    ["es", "ma"],
  ],
  // French Guiana is part of FR in Natural Earth, which falsely bridges
  // Europe to South America. Strip those overseas land borders.
  remove: [
    ["fr", "br"],
    ["fr", "sr"],
  ],
};

const MAX_INDEX_LENGTH = 12;

function ensureNode(adj, iso) {
  if (!adj.has(iso)) adj.set(iso, new Set());
}

function addEdge(adj, a, b) {
  if (!a || !b || a === b) return;
  ensureNode(adj, a);
  ensureNode(adj, b);
  adj.get(a).add(b);
  adj.get(b).add(a);
}

function removeEdge(adj, a, b) {
  adj.get(a)?.delete(b);
  adj.get(b)?.delete(a);
}

/**
 * Build iso2 adjacency from a TopoJSON countries topology.
 * @param {object} topology - raw TopoJSON (countries-50m)
 * @param {{ byNumeric: Map, byName: Map }} isoLookup
 * @returns {{ adj: Map<string, Set<string>>, degree: (iso: string) => number }}
 */
export function buildBorderGraph(topology, isoLookup) {
  const geometries = topology?.objects?.countries?.geometries;
  if (!Array.isArray(geometries)) {
    throw new Error("Invalid countries topology");
  }

  /** @type {string[]} parallel to geometries */
  const indexToIso = geometries.map((geom) => {
    const neName = geom.properties?.name;
    if (neName && BORDER_MERGE[neName]) return BORDER_MERGE[neName];
    return resolveIso2(geom, isoLookup.byNumeric, isoLookup.byName);
  });

  const neighborLists = neighbors(geometries);
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();

  for (let i = 0; i < geometries.length; i += 1) {
    const a = indexToIso[i];
    if (!a) continue;
    ensureNode(adj, a);
    const nbrs = neighborLists[i] || [];
    for (const j of nbrs) {
      const b = indexToIso[j];
      if (!b || b === a) continue;
      addEdge(adj, a, b);
    }
  }

  for (const [a, b] of BORDER_OVERRIDES.add) {
    addEdge(adj, a, b);
  }
  for (const [a, b] of BORDER_OVERRIDES.remove) {
    removeEdge(adj, a, b);
  }

  return {
    adj,
    degree(iso) {
      return adj.get(iso)?.size ?? 0;
    },
    neighborsOf(iso) {
      return [...(adj.get(iso) || [])];
    },
  };
}

/**
 * BFS distances (edge counts) from a source, optionally restricted to an allowed set.
 * @returns {Map<string, number>}
 */
export function distancesFrom(graph, source, allowedSet = null) {
  const dist = new Map();
  if (!graph.adj.has(source)) return dist;
  if (allowedSet && !allowedSet.has(source)) return dist;

  const queue = [source];
  dist.set(source, 0);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const d = dist.get(cur);
    for (const nxt of graph.adj.get(cur) || []) {
      if (dist.has(nxt)) continue;
      if (allowedSet && !allowedSet.has(nxt)) continue;
      dist.set(nxt, d + 1);
      queue.push(nxt);
    }
  }
  return dist;
}

/**
 * Shortest iso2 path from a to b (inclusive). Returns null if unreachable.
 * @returns {string[] | null}
 */
export function shortestChain(graph, a, b, allowedSet = null) {
  if (a === b) return [a];
  if (!graph.adj.has(a) || !graph.adj.has(b)) return null;
  if (allowedSet && (!allowedSet.has(a) || !allowedSet.has(b))) return null;

  const parent = new Map();
  const queue = [a];
  parent.set(a, null);
  let head = 0;
  let found = false;

  while (head < queue.length) {
    const cur = queue[head++];
    for (const nxt of graph.adj.get(cur) || []) {
      if (parent.has(nxt)) continue;
      if (allowedSet && !allowedSet.has(nxt)) continue;
      parent.set(nxt, cur);
      if (nxt === b) {
        found = true;
        break;
      }
      queue.push(nxt);
    }
    if (found) break;
  }

  if (!found) return null;

  const chain = [];
  let cur = b;
  while (cur != null) {
    chain.push(cur);
    cur = parent.get(cur);
  }
  chain.reverse();
  return chain;
}

/**
 * Validate a player guess set: BFS from a→b through {a,b}∪guessed.
 * Chain length in "connectors" = chain.length - 2.
 * @returns {{ chain: string[] | null, used: number, solved: boolean }}
 */
export function solveWithSet(graph, a, b, guessedIsos) {
  const allowed = new Set([a, b, ...(guessedIsos || [])]);
  const chain = shortestChain(graph, a, b, allowed);
  if (!chain) {
    return { chain: null, used: 0, solved: false };
  }
  return {
    chain,
    used: Math.max(0, chain.length - 2),
    solved: true,
  };
}

/**
 * Intermediate-country count between two nodes (= edgeDistance - 1).
 * Direct neighbors → 0.
 */
export function connectorLength(graph, a, b) {
  const chain = shortestChain(graph, a, b);
  if (!chain) return null;
  return Math.max(0, chain.length - 2);
}

/**
 * Build all-pairs buckets keyed by intermediate-country count.
 * Only pairs with length >= 1 (not direct neighbors) are stored for puzzles.
 * @param {object} graph
 * @param {Iterable<string>} poolIsos - nodes allowed as endpoints / intermediates
 * @returns {Map<number, Array<[string, string]>>}
 */
export function buildPairsByLength(graph, poolIsos) {
  const pool = new Set(
    [...poolIsos].filter((iso) => (graph.adj.get(iso)?.size ?? 0) > 0)
  );
  /** @type {Map<number, Array<[string, string]>>} */
  const pairsByLength = new Map();

  const nodes = [...pool];
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const dist = distancesFrom(graph, a, pool);
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const edgeDist = dist.get(b);
      if (edgeDist == null || edgeDist < 2) continue;
      const length = edgeDist - 1;
      if (length > MAX_INDEX_LENGTH) continue;
      if (!pairsByLength.has(length)) pairsByLength.set(length, []);
      pairsByLength.get(length).push([a, b]);
    }
  }

  return pairsByLength;
}

/**
 * Pick a random pair for a difficulty. `length` is number | "any".
 * @returns {{ a: string, b: string, length: number, chain: string[] } | null}
 */
export function pickConnectorPair(graph, pairsByLength, length) {
  let bucket = [];
  if (length === "any" || length == null) {
    for (const pairs of pairsByLength.values()) {
      bucket = bucket.concat(pairs);
    }
  } else {
    bucket = pairsByLength.get(Number(length)) || [];
  }
  if (!bucket.length) return null;

  const [a, b] = bucket[Math.floor(Math.random() * bucket.length)];
  const chain = shortestChain(graph, a, b);
  if (!chain) return null;
  return {
    a,
    b,
    length: Math.max(0, chain.length - 2),
    chain,
  };
}

/**
 * Filter pool to landlocked-capable nodes present in the playable pack.
 * @param {object} graph
 * @param {{ unOnly?: boolean, knownIsos?: Iterable<string> }} [opts]
 */
export function connectorPool(graph, { unOnly = false, knownIsos = null } = {}) {
  const known = knownIsos ? new Set([...knownIsos].map((x) => String(x).toLowerCase())) : null;
  const out = [];
  for (const iso of graph.adj.keys()) {
    if ((graph.adj.get(iso)?.size ?? 0) === 0) continue;
    if (known && !known.has(iso)) continue;
    if (unOnly && !isUnMemberIso2(iso)) continue;
    out.push(iso);
  }
  return out;
}

/**
 * Dev / self-check against known ground truth.
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function checkBorderGraph(graph) {
  const failures = [];
  const setEq = (iso, expected) => {
    const actual = new Set(graph.neighborsOf(iso));
    const exp = new Set(expected);
    const missing = [...exp].filter((x) => !actual.has(x));
    const extra = [...actual].filter((x) => !exp.has(x));
    if (missing.length || extra.length) {
      failures.push(
        `${iso}: expected [${[...exp].sort()}], got [${[...actual].sort()}]` +
          (missing.length ? `; missing ${missing}` : "") +
          (extra.length ? `; extra ${extra}` : "")
      );
    }
  };

  const mustInclude = (iso, expected) => {
    const actual = new Set(graph.neighborsOf(iso));
    const missing = expected.filter((x) => !actual.has(x));
    if (missing.length) {
      failures.push(
        `${iso}: missing required neighbors ${missing}; got [${[...actual].sort()}]`
      );
    }
  };

  const degree0 = (iso) => {
    if (graph.degree(iso) !== 0) {
      failures.push(`${iso}: expected degree 0, got ${graph.degree(iso)}`);
    }
  };

  // Portugal only borders Spain.
  setEq("pt", ["es"]);

  // France mainland neighbors (microstates included). Overseas departments
  // (French Guiana, etc.) may add extra edges — require the European set.
  mustInclude("fr", ["be", "lu", "de", "ch", "it", "es", "ad", "mc"]);

  // Panama bridges Central / South America.
  setEq("pa", ["cr", "co"]);

  // Lesotho is an enclave of South Africa.
  setEq("ls", ["za"]);

  // Island nations / countries with no land border.
  for (const iso of ["jp", "au", "is", "mg"]) {
    degree0(iso);
  }

  // Americas must not connect to Eurasia / Africa over land.
  const americasSeed = "us";
  const eurasiaSeed = "fr";
  const dist = distancesFrom(graph, americasSeed);
  if (dist.has(eurasiaSeed)) {
    failures.push("Americas connected to Eurasia (us reaches fr)");
  }
  if (dist.has("cn") || dist.has("in") || dist.has("za")) {
    failures.push("Americas incorrectly reaches Eurasia/Africa inland nodes");
  }
  // Panama should reach both US and Brazil.
  const fromPa = distancesFrom(graph, "pa");
  if (!fromPa.has("us") || !fromPa.has("br")) {
    failures.push("Panama should reach both US and Brazil");
  }

  // Djibouti–Somalia via Somaliland merge.
  if (!graph.adj.get("dj")?.has("so")) {
    failures.push("dj should border so (via Somaliland merge)");
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Cached index holder used by the game session.
 * @param {object} graph
 * @param {{ unOnly?: boolean, knownIsos?: Iterable<string> }} [opts]
 */
export function createConnectorIndex(graph, { unOnly = false, knownIsos = null } = {}) {
  const pool = connectorPool(graph, { unOnly, knownIsos });
  const pairsByLength = buildPairsByLength(graph, pool);
  return {
    graph,
    unOnly: Boolean(unOnly),
    pool,
    pairsByLength,
    pick(length) {
      return pickConnectorPair(graph, pairsByLength, length);
    },
  };
}
