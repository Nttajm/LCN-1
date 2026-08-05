// ================================================================
// ALLIE ENGINE — lane-accurate shortest-path routing
//
// The road network already exposes everything routing needs:
//   - `segments`: each has per-lane specs (offset + direction) via
//     getLaneSpecsFor(segment)
//   - `nodes`: each junction (count > 1) has `laneNodes` (the little
//     colored in/out dots) and `edges` (the bezier turn connections
//     between them), built by calculateCurves().
//
// ALLIE turns both of those into one directed graph of "atoms":
//   - a LANE atom = driving the length of one lane, from the stub
//     where it leaves its origin junction to the stub where it
//     arrives at its destination junction (open ends have no stub).
//   - a TURN atom = one bezier lane-to-lane connection inside a
//     junction (already computed & already respects the U-turn /
//     common-sense settings).
// A stub ("<nodeKey>#<laneNodeId>") is the graph *node*; atoms are
// the graph *edges*. A full drivable route is just an alternating
// walk: LANE -> TURN -> LANE -> TURN -> ... Dijkstra over this graph
// (weighted by real arc length) gives the optimal route.
// ================================================================

let allieAtoms = [];          // every LANE + TURN + LANECHANGE atom currently in the network
let allieOutByStub = new Map(); // stubKey -> [atom, ...] leaving that stub

function stubKey(nodeKey, laneNodeId) {
  return nodeKey + '#' + laneNodeId;
}

// Same start/end shortening `redrawSegment()` uses to draw a segment's lane
// lines (pulled back to STUB_R at any junction end) — lane atoms need to
// walk the exact same drivable geometry that's on screen.
function computeShortenedEndpoints(segment) {
  const startKey = getNodeKey(segment.startNode.x, segment.startNode.y);
  const endKey = getNodeKey(segment.endNode.x, segment.endNode.y);
  const startIsJunction = !!(nodes.get(startKey) && nodes.get(startKey).count > 1);
  const endIsJunction = !!(nodes.get(endKey) && nodes.get(endKey).count > 1);
  const startInset = startIsJunction
    ? (typeof getStubInset === 'function' ? getStubInset(segment, 'start') : STUB_R)
    : 0;
  const endInset = endIsJunction
    ? (typeof getStubInset === 'function' ? getStubInset(segment, 'end') : STUB_R)
    : 0;
  const shortened = shortenLine(
    segment.startNode.x, segment.startNode.y,
    segment.endNode.x, segment.endNode.y,
    startInset, endInset
  );
  return { x1: shortened.x1, y1: shortened.y1, x2: shortened.x2, y2: shortened.y2, startKey, endKey };
}

function findLaneStub(nodeKey, segId, laneIdx, type) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.laneNodes) return null;
  return nd.laneNodes.find(ln => ln.segId === segId && ln.laneIdx === laneIdx && ln.type === type) || null;
}

// Cubic bezier point/tangent at parameter t (t in [0,1])
function bezierPoint(c, t) {
  const mt = 1 - t;
  const x = mt*mt*mt*c.x1 + 3*mt*mt*t*c.c1x + 3*mt*t*t*c.c2x + t*t*t*c.x2;
  const y = mt*mt*mt*c.y1 + 3*mt*mt*t*c.c1y + 3*mt*t*t*c.c2y + t*t*t*c.y2;
  return { x, y };
}
function bezierTangent(c, t) {
  const mt = 1 - t;
  const dx = 3*mt*mt*(c.c1x-c.x1) + 6*mt*t*(c.c2x-c.c1x) + 3*t*t*(c.x2-c.c2x);
  const dy = 3*mt*mt*(c.c1y-c.y1) + 6*mt*t*(c.c2y-c.c1y) + 3*t*t*(c.y2-c.c2y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx/len, y: dy/len };
}

const TURN_ATOM_SAMPLES = 22;

// Build one TURN atom from a junction's precomputed lane-to-lane edge.
function buildTurnAtom(nodeKey, edge) {
  const c = buildLaneCurve(edge.from, edge.to);
  // Arclength table: cumulative length at each sampled bezier-t
  const table = [{ t: 0, s: 0 }];
  let prev = bezierPoint(c, 0);
  let acc = 0;
  for (let i = 1; i <= TURN_ATOM_SAMPLES; i++) {
    const t = i / TURN_ATOM_SAMPLES;
    const p = bezierPoint(c, t);
    acc += Math.hypot(p.x - prev.x, p.y - prev.y);
    table.push({ t, s: acc });
    prev = p;
  }
  const length = Math.max(acc, 0.001);

  const cross = edge.from.tdx * edge.to.tdy - edge.from.tdy * edge.to.tdx;
  const dot = edge.from.tdx * edge.to.tdx + edge.from.tdy * edge.to.tdy;
  const turnAngleDeg = Math.atan2(Math.abs(cross), dot) * 180 / Math.PI;
  const radius = length / Math.max(turnAngleDeg * Math.PI / 180, 0.05);

  // RH speed profile for this turn: sharper angle + tighter radius both pull
  // the target speed down (a >90° hairpin crawls, a gentle bend barely slows).
  const severity = turnSeverity(turnAngleDeg);
  const radiusFactor = clampNum(radius / 26, 0.35, 1);
  const targetSpeed = Math.max(ALLIE_CONFIG.MIN_TURN_SPEED, ALLIE_CONFIG.CRUISE_SPEED * severity.factor * radiusFactor);

  // Map an arclength fraction (0..1) to the matching bezier t via the table
  function tFromFrac(frac) {
    const targetS = frac * length;
    for (let i = 1; i < table.length; i++) {
      if (table[i].s >= targetS) {
        const a = table[i-1], b = table[i];
        const span = (b.s - a.s) || 1;
        const localT = (targetS - a.s) / span;
        return a.t + (b.t - a.t) * localT;
      }
    }
    return 1;
  }

  return {
    kind: 'turn',
    id: 'turn:' + nodeKey + ':' + edge.from.id + '->' + edge.to.id,
    nodeKey,
    turnType: edge.turn,
    turnAngleDeg,
    radius,
    targetSpeed,
    sharp: severity.sharp,
    length,
    originStub: stubKey(nodeKey, edge.from.id),
    destStub: stubKey(nodeKey, edge.to.id),
    color: TURN_COLORS[edge.turn] || '#3fa7ff',
    sampleAtT(frac) {
      const bt = tFromFrac(Math.max(0, Math.min(1, frac)));
      const p = bezierPoint(c, bt);
      const tan = bezierTangent(c, bt);
      return { x: p.x, y: p.y, tx: tan.x, ty: tan.y };
    },
    // Full path 'd' string, used for route-highlight rendering
    pathD: `M ${c.x1} ${c.y1} C ${c.c1x} ${c.c1y}, ${c.c2x} ${c.c2y}, ${c.x2} ${c.y2}`
  };
}

// Lane-change WINDOWS — the only places along a multi-lane road where a
// lanechange graph edge exists. Modeled as short mini-junctions dropped
// periodically along the road: never right after entering (fresh off a
// junction) and never right up against the next one (drivers settle into
// the correct lane before a turn) — exactly like a human plans a merge well
// ahead of the exit, not in the middle of the intersection.
function laneWindowClearances() {
  if (ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES) {
    return {
      entry: ALLIE_CONFIG.LANE_WINDOW_ENTRY_CLEAR_TIGHT,
      exit: ALLIE_CONFIG.LANE_WINDOW_EXIT_CLEAR_TIGHT
    };
  }
  return {
    entry: ALLIE_CONFIG.LANE_WINDOW_ENTRY_CLEAR,
    exit: ALLIE_CONFIG.LANE_WINDOW_EXIT_CLEAR
  };
}

// Lay out up to LANE_WINDOW_MAX_COUNT windows (each LANE_WINDOW_LEN long,
// LANE_WINDOW_SPACING apart) in the usable middle stretch of a segment.
// Too short a segment (usable span < one window) simply gets zero windows —
// realistic: short blocks don't offer a lane-change opportunity.
function computeLaneWindows(segLen) {
  const { entry: entryClear, exit: exitClear } = laneWindowClearances();
  const winLen = ALLIE_CONFIG.LANE_WINDOW_LEN;
  const spacing = ALLIE_CONFIG.LANE_WINDOW_SPACING;
  const usableStart = entryClear;
  const usableEnd = segLen - exitClear;
  const windows = [];
  if (usableEnd - usableStart >= winLen) {
    let pos = usableStart;
    while (pos + winLen <= usableEnd && windows.length < ALLIE_CONFIG.LANE_WINDOW_MAX_COUNT) {
      windows.push({ start: pos, end: pos + winLen });
      pos += winLen + spacing;
    }
    // Center the whole cluster in the usable span instead of hugging the entry edge
    const used = windows[windows.length - 1].end - windows[0].start;
    const shift = Math.max(0, (usableEnd - usableStart) - used) / 2;
    windows.forEach(w => { w.start += shift; w.end += shift; });
  }
  return windows;
}

// Shared split table (arclength fractions) every sibling lane in a group is
// sliced at, so each window becomes a real graph node (a "rung") shared by
// every lane at that point — like connecting parallel roads together, but
// at several points along the entire road instead of just at its ends.
function buildWindowSplitTable(segLen) {
  const windows = computeLaneWindows(segLen);
  const splits = [{ t: 0 }];
  windows.forEach((w, wi) => {
    splits.push({ t: w.start / segLen, windowIdx: wi, edge: 'entry' });
    splits.push({ t: w.end / segLen, windowIdx: wi, edge: 'exit' });
  });
  splits.push({ t: 1 });
  return { splits, windows };
}

function rungStubKey(segId, splitIdx, laneIdx) {
  return 'rung:' + segId + ':' + splitIdx + ':' + laneIdx;
}

// One drivable slice of a lane, from split index s to s+1. Interior
// boundaries use synthetic "rung" stubs instead of real junction stubs.
function makeLaneRunAtom(segId, line, t0, t1, originStub, destStub, splitIdx) {
  const p0 = line.sampleFull(t0), p1 = line.sampleFull(t1);
  const length = Math.max(0.001, line.segLen * (t1 - t0));
  return {
    kind: 'lane',
    id: 'lane:' + segId + ':' + line.spec.idx + (splitIdx != null ? (':' + splitIdx) : ''),
    segId,
    laneIdx: line.spec.idx,
    x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
    length,
    fullSegLen: line.segLen,
    originStub, destStub,
    color: line.color,
    segTStart: t0, segTEnd: t1,
    sampleAtT(frac) {
      const t = t0 + (t1 - t0) * Math.max(0, Math.min(1, frac));
      return line.sampleFull(t);
    },
    pathD: null // straight lane: rendered as a plain line by the caller
  };
}

// A lane-change graph EDGE — a short curved connector between two sibling
// lanes at one window. This is the same smoothstep S-curve blend the car
// physically drives, but now baked into the road graph itself (a tiny
// "mini-junction" mid-block) so Dijkstra can route through it just like any
// other turn, and the runtime only has to negotiate *when* it's safe to go.
function buildLaneChangeEdge(segId, fromLine, toLine, entryIdx, exitIdx, splits, windowIdx) {
  const t0 = splits[entryIdx].t, t1 = splits[exitIdx].t;
  const length = Math.max(0.5, fromLine.segLen * (t1 - t0));
  const originStub = rungStubKey(segId, entryIdx, fromLine.spec.idx);
  const destStub = rungStubKey(segId, exitIdx, toLine.spec.idx);
  const midT = (t0 + t1) / 2;
  const mid0 = fromLine.sampleFull(midT), mid1 = toLine.sampleFull(midT);
  const ddx = mid1.x - mid0.x, ddy = mid1.y - mid0.y;
  // Lateral in the same frame as car blinker lamps (local +Y = right lamp).
  // Dot path offset with driver's-right (−ty, tx) in SVG.
  const toRight = -ddx * mid0.ty + ddy * mid0.tx;
  const signal = Math.abs(toRight) < 0.05 ? null : (toRight > 0 ? 'right' : 'left');
  return {
    kind: 'lanechange',
    id: 'lc:' + segId + ':' + fromLine.spec.idx + '->' + toLine.spec.idx + ':' + windowIdx,
    segId,
    laneIdx: toLine.spec.idx,
    fromLaneIdx: fromLine.spec.idx,
    toLaneIdx: toLine.spec.idx,
    windowIdx,
    length,
    fullSegLen: fromLine.segLen,
    segT0: t0, segT1: t1,
    originStub, destStub,
    color: toLine.color,
    isLaneChangeBlend: true,
    signal,
    sampleAtT(frac) {
      const localT = Math.max(0, Math.min(1, frac));
      const segT = t0 + (t1 - t0) * localT;
      const p1 = fromLine.sampleFull(segT), p2 = toLine.sampleFull(segT);
      // Smoothstep — gentle S-curve, no linear diagonal snap
      const sp = localT * localT * (3 - 2 * localT);
      const x = p1.x + (p2.x - p1.x) * sp;
      const y = p1.y + (p2.y - p1.y) * sp;
      const tx = p1.tx + (p2.tx - p1.tx) * sp;
      const ty = p1.ty + (p2.ty - p1.ty) * sp;
      const len = Math.hypot(tx, ty) || 1;
      return { x, y, tx: tx / len, ty: ty / len };
    },
    pathD: null
  };
}

// Build every LANE + LANECHANGE atom for one road segment. Multi-lane
// sibling groups (2+ lanes, same travel direction) get sliced into windowed
// sub-atoms with lanechange edges at each window; single-lane groups keep
// one full-length atom (no lane changes possible — nothing to change into).
function buildLaneAtoms(segment) {
  const { x1, y1, x2, y2, startKey, endKey } = computeShortenedEndpoints(segment);
  const dx = x2 - x1, dy = y2 - y1;
  const segLen = Math.hypot(dx, dy);
  if (segLen < 0.001) return [];
  const ux = dx / segLen, uy = dy / segLen;
  const perpX = -uy, perpY = ux;
  const { lanesIn, lanesOut } = getRoadDirs(segment);
  const specs = getLaneSpecs(lanesIn, lanesOut);

  const lines = specs.map(spec => {
    const offset = spec.offset;
    let ax1, ay1, ax2, ay2, originKey, destKey;
    if (spec.forward) {
      ax1 = x1 + perpX*offset; ay1 = y1 + perpY*offset;
      ax2 = x2 + perpX*offset; ay2 = y2 + perpY*offset;
      originKey = startKey; destKey = endKey;
    } else {
      ax1 = x2 + perpX*offset; ay1 = y2 + perpY*offset;
      ax2 = x1 + perpX*offset; ay2 = y1 + perpY*offset;
      originKey = endKey; destKey = startKey;
    }
    const tux = (ax2 - ax1) / segLen, tuy = (ay2 - ay1) / segLen;
    const originNode = nodes.get(originKey);
    const destNode = nodes.get(destKey);
    const originIsJunction = !!(originNode && originNode.count > 1);
    const destIsJunction = !!(destNode && destNode.count > 1);
    const originStubObj = originIsJunction ? findLaneStub(originKey, segment.id, spec.idx, 'out') : null;
    const destStubObj = destIsJunction ? findLaneStub(destKey, segment.id, spec.idx, 'in') : null;
    return {
      spec, segLen,
      originStub: originStubObj ? stubKey(originKey, originStubObj.id) : null,
      destStub: destStubObj ? stubKey(destKey, destStubObj.id) : null,
      color: laneColorFor(spec, lanesIn, lanesOut),
      sampleFull(frac) {
        const t = Math.max(0, Math.min(1, frac));
        return { x: ax1 + tux*segLen*t, y: ay1 + tuy*segLen*t, tx: tux, ty: tuy };
      }
    };
  });

  const atoms = [];
  const groups = [lines.filter(l => l.spec.forward), lines.filter(l => !l.spec.forward)];

  groups.forEach(group => {
    if (!group.length) return;
    group.sort((a, b) => a.spec.idx - b.spec.idx);

    if (group.length < 2) {
      const line = group[0];
      atoms.push(makeLaneRunAtom(segment.id, line, 0, 1, line.originStub, line.destStub, null));
      return;
    }

    const { splits, windows } = buildWindowSplitTable(segLen);
    if (!windows.length) {
      group.forEach(line => {
        atoms.push(makeLaneRunAtom(segment.id, line, 0, 1, line.originStub, line.destStub, null));
      });
      return;
    }

    group.forEach(line => {
      for (let s = 0; s < splits.length - 1; s++) {
        const t0 = splits[s].t, t1 = splits[s + 1].t;
        const originStub = s === 0 ? line.originStub : rungStubKey(segment.id, s, line.spec.idx);
        const destStub = s === splits.length - 2 ? line.destStub : rungStubKey(segment.id, s + 1, line.spec.idx);
        atoms.push(makeLaneRunAtom(segment.id, line, t0, t1, originStub, destStub, s));
      }
    });

    windows.forEach((w, wi) => {
      const entryIdx = splits.findIndex(sp => sp.windowIdx === wi && sp.edge === 'entry');
      const exitIdx = splits.findIndex(sp => sp.windowIdx === wi && sp.edge === 'exit');
      if (entryIdx < 0 || exitIdx < 0) return;
      for (let i = 0; i < group.length - 1; i++) {
        const laneA = group[i], laneB = group[i + 1];
        atoms.push(buildLaneChangeEdge(segment.id, laneA, laneB, entryIdx, exitIdx, splits, wi));
        atoms.push(buildLaneChangeEdge(segment.id, laneB, laneA, entryIdx, exitIdx, splits, wi));
      }
    });
  });

  return atoms;
}

// Pairwise geometric conflict matrix for turn atoms at one junction.
// Sampled once per graph rebuild — not per frame.
function computeTurnConflicts(turnAtoms) {
  const N = turnAtoms.length;
  const SAMPLES = 10;
  const clearSq = ALLIE_CONFIG.JUNCTION_CONFLICT_CLEARANCE * ALLIE_CONFIG.JUNCTION_CONFLICT_CLEARANCE;
  for (let i = 0; i < N; i++) {
    if (!turnAtoms[i].conflicts) turnAtoms[i].conflicts = new Set();
  }
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = turnAtoms[i], b = turnAtoms[j];
      // Same approach stub = following, not a crossing conflict
      if (a.originStub && a.originStub === b.originStub) continue;
      let conflict = false;
      for (let sa = 0; sa <= SAMPLES && !conflict; sa++) {
        const pa = a.sampleAtT(sa / SAMPLES);
        for (let sb = 0; sb <= SAMPLES; sb++) {
          const pb = b.sampleAtT(sb / SAMPLES);
          const dx = pa.x - pb.x, dy = pa.y - pb.y;
          if (dx * dx + dy * dy < clearSq) { conflict = true; break; }
        }
      }
      if (conflict) {
        a.conflicts.add(b.id);
        b.conflicts.add(a.id);
      }
    }
  }
}

function rebuildAllieGraph() {
  const atoms = [];
  segments.forEach(seg => { atoms.push(...buildLaneAtoms(seg)); });
  const turnsByNode = new Map();
  nodes.forEach((nd, nodeKey) => {
    if (nd.count > 1 && nd.edges) {
      const turns = [];
      nd.edges.forEach(edge => {
        // When intersection lane-changes are off, drop straight-through edges
        // that hop to a different relative lane (that was the free "change
        // lanes inside the junction" path Dijkstra was happily taking).
        if (!ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES
            && isCrossLaneStraightEdge(nodeKey, edge)) return;
        const atom = buildTurnAtom(nodeKey, edge);
        atoms.push(atom);
        turns.push(atom);
      });
      if (turns.length) turnsByNode.set(nodeKey, turns);
    }
  });
  turnsByNode.forEach(turns => computeTurnConflicts(turns));

  const outByStub = new Map();
  atoms.forEach(atom => {
    if (!atom.originStub) return;
    if (!outByStub.has(atom.originStub)) outByStub.set(atom.originStub, []);
    outByStub.get(atom.originStub).push(atom);
  });

  allieAtoms = atoms;
  allieOutByStub = outByStub;
  refreshAllSpawnerDestCaches();
  if (typeof rebuildLaneChangeGraphVisual === 'function') rebuildLaneChangeGraphVisual();
  // Network changed — every live car needs a fresh optimal path to its dest.
  if (typeof cars !== 'undefined' && cars.length) rerouteAllCars();
}

// Driver's-right ranking for a junction stub (SVG y-down). Higher = righter.
function laneRightnessAllie(ln) {
  return ln.y * ln.tdx - ln.x * ln.tdy;
}

// True when a straight junction edge leaves on a different relative lane than
// it entered on (e.g. left approach → right exit). That's a lane change
// happening *inside* the intersection.
function isCrossLaneStraightEdge(nodeKey, edge) {
  if (!edge || edge.turn !== 'straight') return false;
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.laneNodes) return false;
  const enters = nd.laneNodes
    .filter(l => l.type === 'in' && l.segId === edge.from.segId)
    .slice()
    .sort((a, b) => laneRightnessAllie(a) - laneRightnessAllie(b));
  const exits = nd.laneNodes
    .filter(l => l.type === 'out' && l.segId === edge.to.segId)
    .slice()
    .sort((a, b) => laneRightnessAllie(a) - laneRightnessAllie(b));
  const fi = enters.findIndex(l => l.id === edge.from.id);
  const ti = exits.findIndex(l => l.id === edge.to.id);
  if (fi < 0 || ti < 0) return false;
  const ne = enters.length, nx = exits.length;
  if (ne <= 1 || nx <= 1) return false;
  const ideal = fi * (nx - 1) / (ne - 1);
  return Math.abs(ti - ideal) > 0.01;
}

// Find the closest point (spawn/destination candidate) to a world-space
// click, searching both straight lane atoms and curved turn atoms.
// Returns { atom, t (arclength fraction 0..1), x, y, dist } or null.
// allowLaneChange: include mid-block lanechange blends (used for live re-route
// origin when a car is already mid-merge).
function findNearestAtomPoint(wx, wy, maxDist, allowLaneChange) {
  let best = null;
  allieAtoms.forEach(atom => {
    if (atom.kind === 'lanechange' && !allowLaneChange) return;
    if (atom.kind === 'lane') {
      const dx = atom.x2 - atom.x1, dy = atom.y2 - atom.y1;
      const lenSq = dx*dx + dy*dy;
      if (lenSq < 0.0001) return;
      let t = ((wx - atom.x1)*dx + (wy - atom.y1)*dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = atom.x1 + dx*t, py = atom.y1 + dy*t;
      const dist = Math.hypot(px - wx, py - wy);
      if (!best || dist < best.dist) best = { atom, t, x: px, y: py, dist };
    } else {
      // Sample curved atoms (turns + optional lanechanges)
      const STEPS = atom.kind === 'lanechange' ? 12 : 18;
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const p = atom.sampleAtT(t);
        const dist = Math.hypot(p.x - wx, p.y - wy);
        if (!best || dist < best.dist) best = { atom, t, x: p.x, y: p.y, dist };
      }
    }
  });
  if (best && (maxDist == null || best.dist <= maxDist)) return best;
  return null;
}

// Dijkstra over the stub graph from startStub to targetStub.
// Binary-heap priority queue keeps this usable for spawner route caches.
function allieDijkstra(startStub, targetStub) {
  if (startStub === targetStub) return [];
  const dist = new Map([[startStub, 0]]);
  const prevAtom = new Map();
  const visited = new Set();
  const heap = [[0, startStub]]; // [distance, stub]

  function heapPush(entry) {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      const tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp;
      i = p;
    }
  }
  function heapPop() {
    const top = heap[0];
    const last = heap.pop();
    if (!heap.length) return top;
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let smallest = i;
      if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
      if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      const tmp = heap[i]; heap[i] = heap[smallest]; heap[smallest] = tmp;
      i = smallest;
    }
    return top;
  }

  while (heap.length) {
    const [ud, u] = heapPop();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === targetStub) break;
    if (ud > (dist.get(u) ?? Infinity)) continue;
    const outs = allieOutByStub.get(u) || [];
    for (let i = 0; i < outs.length; i++) {
      const atom = outs[i];
      if (!atom.destStub) continue;
      // Stay-in-lane is free; lane changes cost extra so Dijkstra only uses
      // them when the destination actually requires crossing lanes.
      const edgeCost = atom.length
        + (atom.kind === 'lanechange' ? ALLIE_CONFIG.LANE_CHANGE_GRAPH_PENALTY : 0);
      const nd = ud + edgeCost;
      if (nd < (dist.has(atom.destStub) ? dist.get(atom.destStub) : Infinity)) {
        dist.set(atom.destStub, nd);
        prevAtom.set(atom.destStub, { atom, from: u });
        heapPush([nd, atom.destStub]);
      }
    }
  }
  if (!dist.has(targetStub)) return null;
  const chain = [];
  let cur = targetStub;
  while (cur !== startStub) {
    const step = prevAtom.get(cur);
    if (!step) return null;
    chain.push(step.atom);
    cur = step.from;
  }
  chain.reverse();
  return chain;
}

// Build a full route (ordered legs, each { atom, tStart, tEnd }) from a
// spawn pick to a destination pick, both as returned by findNearestAtomPoint.
function allieFindPath(spawnPick, destPick) {
  const spawnAtom = spawnPick.atom, destAtom = destPick.atom;

  // Trivial case: destination is further along the very same atom
  if (spawnAtom === destAtom && destPick.t > spawnPick.t + 0.001) {
    return [{ atom: spawnAtom, tStart: spawnPick.t, tEnd: destPick.t }];
  }

  if (!spawnAtom.destStub) return null; // spawn lane dead-ends before any junction
  if (!destAtom.originStub) return null; // destination lane isn't reachable from upstream

  const middle = allieDijkstra(spawnAtom.destStub, destAtom.originStub);
  if (!middle) return null;

  const legs = [];
  legs.push({ atom: spawnAtom, tStart: spawnPick.t, tEnd: 1 });
  middle.forEach(atom => legs.push({ atom, tStart: 0, tEnd: 1 }));
  legs.push({ atom: destAtom, tStart: 0, tEnd: destPick.t });
  return legs.filter(leg => leg.tEnd - leg.tStart > 0.0005);
}

// Rematch a car's stored destination against the current graph (atoms are
// rebuilt from scratch whenever the network changes, so old references die).
function rematchDestPick(car) {
  if (!car.destPick) return null;
  const x = car.destPick.x, y = car.destPick.y;
  if (x == null || y == null) return null;
  return findNearestAtomPoint(x, y, 18);
}

// Live re-route one car from its current world pose to its destination using
// the freshly rebuilt graph. Returns true if a new path was applied.
function rerouteCar(car) {
  if (!car || car.state === 'despawning') return false;
  const dest = rematchDestPick(car);
  if (!dest) {
    beginDespawn(car);
    return false;
  }
  car.destPick = { atom: dest.atom, t: dest.t, x: dest.x, y: dest.y };

  // Prefer the rear-axle pose; allow lanechange atoms so mid-merge cars snap
  // back onto a legal blend instead of the wrong parallel lane.
  const origin = findNearestAtomPoint(car.x, car.y, 22, true);
  if (!origin) {
    beginDespawn(car);
    return false;
  }

  const raw = allieFindPath(origin, dest);
  if (!raw || !raw.length) {
    beginDespawn(car);
    return false;
  }

  const legs = raw.map(leg => ({
    atom: leg.atom, tStart: leg.tStart, tEnd: leg.tEnd,
    length: 0, cumStart: 0, cumEnd: 0
  }));
  car.route = legs;
  car.legIndex = 0;
  car.traveledLength = 0;
  car.totalLength = recomputeRouteCum(legs);
  car.signalDecision = null;
  car.signalTimer = 0;
  car.rorPhase = null;
  car.junctionWait = null;
  car._pendingLaneChangeAtomId = null;
  car._laneChangeWaitT = 0;
  car._laneChangeForce = false;
  car._laneChangeDebug = { phase: 'none' };
  car._lastObstruction = null;
  car._yieldOther = null;
  if (car.selected) updateRouteHighlight(car);
  return true;
}

function rerouteAllCars() {
  if (!cars || !cars.length) return;
  // Snapshot — beginDespawn mutates the list
  const list = cars.slice();
  for (let i = 0; i < list.length; i++) {
    const car = list[i];
    if (car.state === 'despawning') continue;
    rerouteCar(car);
  }
}

function turnSeverity(angleDeg) {
  if (angleDeg < 15) return { factor: 1.0, sharp: false };
  if (angleDeg < 45) return { factor: 0.72, sharp: false };
  if (angleDeg < 100) return { factor: 0.42, sharp: false };
  return { factor: 0.2, sharp: true };
}

function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ================================================================
// CAR SIMULATION
//
// Each car tracks a REAR-AXLE position + heading (Kinematic Bicycle
// Model). Every frame it looks a short distance ahead along its
// precomputed route (Pure Pursuit), steers toward that point, and
// integrates position/heading from speed + steering angle — never
// snaps straight onto the path. Target speed comes from a simple
// "RH" profile: cruise on straight lane atoms, brake ahead of turn
// atoms (harder for sharp ones, using the turn's own radius), brake
// for cars ahead on the same route corridor (DETECT_RING_*), and
// brake to a stop approaching the destination before despawning.
// ================================================================

const ALLIE_CONFIG = {
  CAR_LENGTH: 5.6,
  CAR_WIDTH: 2.6,
  WHEELBASE: 3.4,
  REAR_OVERHANG: 1.2,
  CRUISE_SPEED: 37,
  MIN_TURN_SPEED: 9,
  ACCEL: 20,
  DECEL_NORMAL: 30,
  DECEL_SHARP: 46,
  ARRIVAL_DECEL: 24,
  ARRIVAL_MIN_DIST: 10,
  LOOKAHEAD_MIN: 4,
  LOOKAHEAD_MAX: 13,
  LOOKAHEAD_K: 0.55,
  PLANNING_LOOKAHEAD: 60,
  BLINKER_LOOKAHEAD: 52,
  BLINKER_PERIOD: 0.55,
  MAX_STEER: Math.PI / 2.1,
  DESPAWN_DURATION: 0.55,
  FOLLOW_LERP: 0.08,
  FOLLOW_MIN_SCALE: 2.6,
  PICK_TOLERANCE_PX: 20,
  SIGNAL_DECEL: 30,
  SIGNAL_REACTION: 0.35,
  STOP_LINE_GAP: 9.5, // hold this far before the turn / intersection centerline
  ROR_DWELL: 0.9,
  ROR_CREEP_SPEED: 3.2,
  ROR_CREEP_TIME: 1.15,
  // Forward obstruction detection — three rings, measured as clear gap
  // (bumper-to-bumper) along the car's own upcoming route.
  DETECT_RING_OUTER: 46,   // noticed, no reaction
  DETECT_RING_MID: 24,     // eases off toward a safe following speed
  DETECT_RING_INNER: 12,   // hard braking toward a safe stop/match speed
  DETECT_FOLLOW_GAP: 5.5,  // hold this bumper-to-bumper clearance (real-life gap)
  DETECT_CORRIDOR_HALF: 2.4, // same-lane only; must stay < LANE_OFFSET (~4)
  // Peripheral "ring" awareness — soft slowdown for nearby off-path cars
  SIDE_DETECT_RADIUS: 22,
  SIDE_DETECT_CONE_DEG: 90,
  SIDE_CAUTION_MAX_SLOWDOWN: 0.18,
  // Unsignalized junction conflict / yield
  JUNCTION_CONFLICT_CLEARANCE: 2.8,
  JUNCTION_COMMIT_FRAC: 0.28,
  JUNCTION_YIELD_LOOKAHEAD: 28,
  JUNCTION_YIELD_TIMEOUT: 4.5, // if still waiting this long with no mover, take turn
  // Hard OBB overlap safety net (last resort)
  HARD_SAFETY_MARGIN: 0.05,
  HARD_SAFETY_CREEP: 4.0,  // crawl when unlocking a jam
  HARD_SAFETY_STUCK: 0.7,  // seconds stopped-on-block before forced unlock
  // Lane changes — graph-integrated windows, blinker-first, smooth blend path.
  // Lane changes are only legal at "windows": short mini-junctions dropped
  // periodically along a multi-lane road. Windows never sit right after a
  // junction or right up against the next one (see the *_CLEAR constants),
  // so a car's plan to switch lanes is always made well ahead of a turn —
  // never as a last-second scramble in the intersection itself.
  ALLOW_INTERSECTION_LANE_CHANGES: false, // "Allow lane changes in intersection" toggle
  LANE_WINDOW_LEN: 12,             // forward distance a lane-change blend covers
  LANE_WINDOW_SPACING: 5,          // gap between consecutive windows
  LANE_WINDOW_MAX_COUNT: 14,       // cap windows per lane-group per segment
  LANE_WINDOW_ENTRY_CLEAR: 14,     // no changes this close after entering the road
  LANE_WINDOW_EXIT_CLEAR: 18,      // no changes this close before the next junction
  LANE_WINDOW_ENTRY_CLEAR_TIGHT: 5,   // relaxed clearances when the toggle is on
  LANE_WINDOW_EXIT_CLEAR_TIGHT: 10,
  LANE_CHANGE_GAP_AHEAD_MIN: 6,
  LANE_CHANGE_GAP_BEHIND_MIN: 7,
  LANE_CHANGE_TTC_MIN: 1.6,
  LANE_CHANGE_APPROACH_LOOKAHEAD: 20, // start easing before a window
  LANE_CHANGE_HOLD_DECEL: 16,         // gentle ease-down while waiting for a gap
  LANE_CHANGE_BOOST_FACTOR: 1.12,     // rare risky speed-up to slot into a closing gap
  LANE_CHANGE_BOOST_CHANCE: 0.12,
  LANE_CHANGE_GRAPH_PENALTY: 55,      // Dijkstra prefers stay-in-lane unless a change is needed
  LANE_CHANGE_WAIT_ABORT: 1.8,        // seconds stuck waiting → skip window, go straight
  LANE_CHANGE_MIN_CREEP: 3.5,         // never hard-stop at a window waiting for a gap
  LANE_DECISION_LOOKAHEAD: 70,        // how far ahead discretionary overtakes scan for a window
  OVERTAKE_CHECK_INTERVAL: 2.8,
  OVERTAKE_SPEED_DEFICIT: 16,
  OVERTAKE_MIN_GAIN: 10,
  COURTESY_EASE_FACTOR: 0.4,
  COURTESY_RANGE: 22
};

const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#2ecc71', '#ff6fae'];

let driveMode = false;
let pendingSpawn = null;
let cars = [];
let carIdCounter = 1;
let followedCar = null;
let hoveredCar = null;
let simPaused = false;
let spawnersAllPaused = false; // master mute for spawners (cars still move)
let spawnPinEl = null;
let hoverMarkerEl = null;
let previewRouteEls = [];
let hoverRouteEls = [];
let hoverRouteCar = null;
let hoverHighlightTimer = 0;
let driveMoveThrottle = 0;
let toastTimer = null;
let lastDriveMouseWorld = null;

// Spatial hash + lane occupancy — rebuilt once per tick so neighbor queries
// stay ~O(k) instead of O(n) with hundreds of cars.
const SPATIAL_CELL = 28;
const spatialBuckets = new Map();
const laneOccupancy = new Map();
const _nearbyScratch = [];
const _bucketPool = [];
const _lanePool = [];
const _pathSamples = [];
for (let i = 0; i < 14; i++) _pathSamples.push({ s: 0, x: 0, y: 0 });

function refreshCarPoseCache(car) {
  const midFromRear = ALLIE_CONFIG.CAR_LENGTH * 0.5 - ALLIE_CONFIG.REAR_OVERHANG;
  const cos = Math.cos(car.heading), sin = Math.sin(car.heading);
  car._cosH = cos;
  car._sinH = sin;
  car._cx = car.x + cos * midFromRear;
  car._cy = car.y + sin * midFromRear;
}

function rebuildCarIndexes() {
  // Recycle bucket arrays to cut GC pressure at high car counts
  spatialBuckets.forEach(bucket => {
    bucket.length = 0;
    _bucketPool.push(bucket);
  });
  spatialBuckets.clear();
  laneOccupancy.forEach(lane => {
    lane.length = 0;
    _lanePool.push(lane);
  });
  laneOccupancy.clear();

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car.state === 'despawning' || car.isProbe) continue;
    refreshCarPoseCache(car);
    const ix = Math.floor(car._cx / SPATIAL_CELL);
    const iy = Math.floor(car._cy / SPATIAL_CELL);
    const key = ix + ',' + iy;
    let bucket = spatialBuckets.get(key);
    if (!bucket) {
      bucket = _bucketPool.pop() || [];
      bucket.length = 0;
      spatialBuckets.set(key, bucket);
    }
    bucket.push(car);

    const pos = carFullSegPos(car);
    car._segPos = pos;
    if (pos) {
      const lk = pos.segId + ':' + pos.laneIdx;
      let lane = laneOccupancy.get(lk);
      if (!lane) {
        lane = _lanePool.pop() || [];
        lane.length = 0;
        laneOccupancy.set(lk, lane);
      }
      lane.push(car);
    }
  }
}

// Collect nearby cars into _nearbyScratch (reused; do not retain across calls).
function collectNearbyCars(x, y, radius) {
  const out = _nearbyScratch;
  out.length = 0;
  const cellR = Math.ceil(radius / SPATIAL_CELL);
  const ix0 = Math.floor(x / SPATIAL_CELL);
  const iy0 = Math.floor(y / SPATIAL_CELL);
  const rSq = radius * radius;
  for (let dy = -cellR; dy <= cellR; dy++) {
    for (let dx = -cellR; dx <= cellR; dx++) {
      const bucket = spatialBuckets.get((ix0 + dx) + ',' + (iy0 + dy));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const c = bucket[i];
        const ddx = c._cx - x, ddy = c._cy - y;
        if (ddx * ddx + ddy * ddy <= rSq) out.push(c);
      }
    }
  }
  return out;
}

function setSvgOpacity(el, value) {
  if (el._op === value) return;
  el._op = value;
  el.setAttribute('opacity', value);
}

function ensureCarSvgTransforms(car) {
  if (car._tfTranslate) return true;
  const root = car.el.ownerSVGElement;
  if (!root || typeof root.createSVGTransform !== 'function') return false;
  try {
    car.el.transform.baseVal.clear();
    car._tfTranslate = root.createSVGTransform();
    car._tfRotate = root.createSVGTransform();
    car._tfTranslate.setTranslate(car.x, car.y);
    car._tfRotate.setRotate(car.heading * 180 / Math.PI, 0, 0);
    car.el.transform.baseVal.appendItem(car._tfTranslate);
    car.el.transform.baseVal.appendItem(car._tfRotate);
    car._lx = car.x;
    car._ly = car.y;
    car._lh = car.heading;
    return true;
  } catch (_) {
    car._tfTranslate = null;
    return false;
  }
}

function applyCarTransform(car, scale) {
  if (scale != null && scale < 0.999) {
    car.el.setAttribute('transform',
      `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI}) scale(${scale})`);
    car._tfDirty = true;
    car._tfTranslate = null; // rebuild list next full pose
    return;
  }
  if (!car._tfDirty && car._lx === car.x && car._ly === car.y && car._lh === car.heading) return;
  car._lx = car.x;
  car._ly = car.y;
  car._lh = car.heading;
  car._tfDirty = false;

  if (ensureCarSvgTransforms(car)) {
    car._tfTranslate.setTranslate(car.x, car.y);
    car._tfRotate.setRotate(car.heading * 180 / Math.PI, 0, 0);
    return;
  }
  car.el.setAttribute('transform',
    `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI})`);
}

// Traffic spawners (advanced drive mode)
let spawners = [];
let spawnerIdCounter = 1;
let spawnerPlaceMode = false;
const SPAWNER_LANE_RADIUS = 14;
const SPAWNER_DEST_SAMPLES = [0.55, 0.9];
const SPAWNER_MAX_ROUTES = 48;
const SPAWNER_MAX_DEST_TRIES = 80;

const driveLayer = document.createElementNS(svgNS, 'g');
driveLayer.id = 'drive-layer';
driveLayer.setAttribute('pointer-events', 'none');
world.appendChild(driveLayer);
const routeHighlightLayer = document.createElementNS(svgNS, 'g');
routeHighlightLayer.id = 'route-highlight-layer';
routeHighlightLayer.setAttribute('pointer-events', 'none');
world.appendChild(routeHighlightLayer);
const carLayer = document.createElementNS(svgNS, 'g');
carLayer.id = 'car-layer';
carLayer.setAttribute('pointer-events', 'none'); // cars picked geometrically; don't block junction dots
carLayer.setAttribute('shape-rendering', 'optimizeSpeed');
world.appendChild(carLayer);
const debugLayer = document.createElementNS(svgNS, 'g');
debugLayer.id = 'debug-rings-layer';
debugLayer.setAttribute('pointer-events', 'none');
world.appendChild(debugLayer);
const laneChangeGraphLayer = document.createElementNS(svgNS, 'g');
laneChangeGraphLayer.id = 'lanechange-graph-layer';
laneChangeGraphLayer.setAttribute('pointer-events', 'none');
world.appendChild(laneChangeGraphLayer);

let followHighlightTimer = 0;
let simTime = 0;
let debugRingsOn = false;
let debugOverlayEls = [];
let laneChangeGraphVisible = false;

// Draw every lane-change window edge currently in the graph — a toggle-able
// view of exactly where (and only where) cars are allowed to change lanes,
// like connecting the parallel lanes together at each window along the road.
function rebuildLaneChangeGraphVisual() {
  while (laneChangeGraphLayer.firstChild) laneChangeGraphLayer.removeChild(laneChangeGraphLayer.firstChild);
  if (!laneChangeGraphVisible) return;
  const STEPS = 10;
  allieAtoms.forEach(atom => {
    if (atom.kind !== 'lanechange') return;
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
      const p = atom.sampleAtT(i / STEPS);
      d += (i === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ';
    }
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#7fffb0');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('stroke-dasharray', '1.3 1');
    path.setAttribute('opacity', '0.85');
    laneChangeGraphLayer.appendChild(path);

    const startP = atom.sampleAtT(0);
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', String(startP.x));
    dot.setAttribute('cy', String(startP.y));
    dot.setAttribute('r', '0.85');
    dot.setAttribute('fill', '#7fffb0');
    dot.setAttribute('opacity', '0.9');
    laneChangeGraphLayer.appendChild(dot);
  });
}

function pickToleranceWorld() {
  return ALLIE_CONFIG.PICK_TOLERANCE_PX / view.scale;
}

function clearJunctionInteraction() {
  if (typeof refreshEmphasis !== 'function') return;
  nodes.forEach((nd, key) => {
    if (!nd.interaction) return;
    if (nd.interaction.hoveredId == null && nd.interaction.selectedId == null) return;
    nd.interaction.hoveredId = null;
    nd.interaction.selectedId = null;
    refreshEmphasis(key);
  });
}

function updateDrivePointerHover(worldPt) {
  if (!driveMode || !worldPt) return;
  const carUnder = findCarAtPoint(worldPt.x, worldPt.y);
  if (carUnder !== hoveredCar) setHoveredCar(carUnder);
}

// ---------------- Drive-mode toggle & spawn/destination picking ----------------

function toggleDriveMode() {
  driveMode = !driveMode;
  const btn = document.getElementById('btn-drive-mode');
  btn.textContent = driveMode ? 'Exit' : 'Drive';
  btn.classList.toggle('active', driveMode);
  board.classList.toggle('drive-mode', driveMode);
  document.getElementById('drive-hud').classList.toggle('visible', driveMode);
  if (driveMode) {
    if (typeof setBuildMode === 'function') setBuildMode(false);
    if (typeof setDeleteMode === 'function') setDeleteMode(false);
    if (typeof setUpgradeMode === 'function') setUpgradeMode(false);
    else if (isBuilding()) cancelBuild();
    if (typeof clearSignalSelection === 'function') clearSignalSelection();
    if (typeof refreshAllSignalOpacities === 'function') refreshAllSignalOpacities();
    clearJunctionInteraction();
    if (typeof syncJunctionHitPointerEvents === 'function') syncJunctionHitPointerEvents();
    rebuildAllieGraph();
  } else {
    clearPendingSpawn();
    setSpawnerPlaceMode(false);
    clearDriveHoverPreview();
    clearHoveredCar();
    if (typeof syncJunctionHitPointerEvents === 'function') syncJunctionHitPointerEvents();
    if (typeof refreshAllSignalOpacities === 'function') refreshAllSignalOpacities();
  }
  updateDriveHudText();
}

function updateDriveHudText() {
  if (!driveMode) return;
  const meta = document.getElementById('drive-hud-meta');
  if (spawnerPlaceMode) {
    meta.innerHTML = 'Spawner mode · click a road or junction lane · <kbd>Esc</kbd> cancel';
    return;
  }
  if (hoveredCar) {
    meta.innerHTML = followedCar === hoveredCar
      ? 'Following car #' + hoveredCar.id + ' · click again or <kbd>Esc</kbd> to unfollow'
      : 'Hover a car to preview its route · click to follow';
    return;
  }
  meta.innerHTML = pendingSpawn
    ? 'Route mode · click a road for the destination · <kbd>Esc</kbd> cancel'
    : 'Route mode · click a road to set pickup · hover a car to follow';
}

function hitTestCar(wx, wy, car) {
  if (car.state === 'despawning') return false;
  const dx = wx - car.x, dy = wy - car.y;
  const cos = Math.cos(-car.heading), sin = Math.sin(-car.heading);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const rearX = -ALLIE_CONFIG.REAR_OVERHANG;
  const L = ALLIE_CONFIG.CAR_LENGTH, W = ALLIE_CONFIG.CAR_WIDTH;
  const pad = 1.6;
  return lx >= rearX - pad && lx <= rearX + L + pad && Math.abs(ly) <= W / 2 + pad;
}

function findCarAtPoint(wx, wy) {
  // Prefer spatial query when indexes are warm; fall back to full scan.
  if (spatialBuckets.size) {
    const nearby = collectNearbyCars(wx, wy, ALLIE_CONFIG.CAR_LENGTH + 4);
    for (let i = nearby.length - 1; i >= 0; i--) {
      if (hitTestCar(wx, wy, nearby[i])) return nearby[i];
    }
    return null;
  }
  for (let i = cars.length - 1; i >= 0; i--) {
    if (hitTestCar(wx, wy, cars[i])) return cars[i];
  }
  return null;
}

function updateCarHoverVisual(car) {
  if (!car || !car.hoverRing) return;
  const show = car === hoveredCar && !car.selected;
  car.hoverRing.setAttribute('opacity', show ? '0.95' : '0');
}

function setHoveredCar(car) {
  const prev = hoveredCar;
  if (prev === car) return;
  if (prev) updateCarHoverVisual(prev);
  hoveredCar = car;
  if (hoveredCar) updateCarHoverVisual(hoveredCar);
  board.classList.toggle('drive-follow-hover', !!hoveredCar);
  updateHoverRouteHighlight(hoveredCar);
  updateDriveHudText();
  updateCarOverlayVisibility();
}

function clearHoveredCar() {
  setHoveredCar(null);
}

function handleDriveMouseMove(worldPt) {
  lastDriveMouseWorld = worldPt;
  updateDrivePointerHover(worldPt);

  if (hoveredCar) {
    if (hoverMarkerEl) hoverMarkerEl.setAttribute('opacity', '0');
    return;
  }

  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - driveMoveThrottle < 40) return;
  driveMoveThrottle = now;

  const pick = findNearestAtomPoint(worldPt.x, worldPt.y, pickToleranceWorld());
  drawDriveHoverMarker(pick);

  if (spawnerPlaceMode) {
    clearPreviewRoute();
    return;
  }

  // Not over a car → route creator mode.
  if (pendingSpawn && pick) {
    drawPreviewRoute(allieFindPath(pendingSpawn, pick));
  } else if (!pendingSpawn) {
    clearPreviewRoute();
  }
}

function handleDriveClick(event) {
  const worldPt = screenToWorld(event.clientX, event.clientY);

  // Only follow when a car is actively hovered (follow mode).
  if (hoveredCar) {
    if (followedCar === hoveredCar) unfollowCar();
    else selectCar(hoveredCar);
    return;
  }

  const pick = findNearestAtomPoint(worldPt.x, worldPt.y, pickToleranceWorld());
  if (!pick) {
    showDriveToast('No road nearby — click closer to a lane');
    return;
  }

  if (spawnerPlaceMode) {
    placeSpawner(pick);
    return;
  }

  // Route creator mode — spawn pickup / destination.
  if (!pendingSpawn) {
    setPendingSpawn(pick);
    return;
  }
  if (pick.atom === pendingSpawn.atom && Math.hypot(pick.x - pendingSpawn.x, pick.y - pendingSpawn.y) < 1.5) {
    showDriveToast('Pick a destination further down the road');
    return;
  }
  const route = allieFindPath(pendingSpawn, pick);
  if (!route || route.length === 0) {
    showDriveToast('No route found — try a different destination');
    return;
  }
  spawnCarFromRoute(route, pick);
  clearPendingSpawn();
}

function setPendingSpawn(pick) {
  pendingSpawn = pick;
  if (spawnPinEl) spawnPinEl.remove();
  spawnPinEl = document.createElementNS(svgNS, 'circle');
  spawnPinEl.setAttribute('cx', pick.x);
  spawnPinEl.setAttribute('cy', pick.y);
  spawnPinEl.setAttribute('r', '2.2');
  spawnPinEl.setAttribute('fill', 'var(--enter)');
  spawnPinEl.setAttribute('stroke', '#fff');
  spawnPinEl.setAttribute('stroke-width', '0.6');
  driveLayer.appendChild(spawnPinEl);
  updateDriveHudText();
}

function clearPendingSpawn() {
  pendingSpawn = null;
  if (spawnPinEl) { spawnPinEl.remove(); spawnPinEl = null; }
  clearPreviewRoute();
  updateDriveHudText();
}

function drawDriveHoverMarker(pick) {
  if (!pick) {
    if (hoverMarkerEl) hoverMarkerEl.setAttribute('opacity', '0');
    return;
  }
  if (!hoverMarkerEl) {
    hoverMarkerEl = document.createElementNS(svgNS, 'circle');
    hoverMarkerEl.setAttribute('r', '1.8');
    hoverMarkerEl.setAttribute('fill', 'rgba(63,167,255,0.9)');
    hoverMarkerEl.setAttribute('stroke', '#fff');
    hoverMarkerEl.setAttribute('stroke-width', '0.5');
    driveLayer.appendChild(hoverMarkerEl);
  }
  hoverMarkerEl.setAttribute('cx', pick.x);
  hoverMarkerEl.setAttribute('cy', pick.y);
  hoverMarkerEl.setAttribute('opacity', '0.9');
}

function clearDriveHoverPreview() {
  if (hoverMarkerEl) { hoverMarkerEl.remove(); hoverMarkerEl = null; }
  clearHoveredCar();
}

function showDriveToast(msg) {
  const el = document.getElementById('drive-toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}

// ---------------- Route-highlight rendering (shared by preview + follow + hover) ----------------

const ROUTE_PATH_COLOR = '#52c8ff';
const ROUTE_PATH_OPACITY = 0.88;
const ROUTE_PATH_WIDTH = 4.2;
const ROUTE_TAIL_FADE = 3; // only the last N units fade out

let routeHighlightDefsReady = false;

function ensureRouteHighlightDefs() {
  if (routeHighlightDefsReady) return;
  const svg = document.getElementById('canvas');
  if (!svg) return;
  let defs = svg.querySelector('defs#route-highlight-defs');
  if (!defs) {
    defs = document.createElementNS(svgNS, 'defs');
    defs.setAttribute('id', 'route-highlight-defs');
    svg.insertBefore(defs, svg.firstChild);
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'route-blue-grad');
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.innerHTML =
      '<stop offset="0%" stop-color="#6fd4ff" stop-opacity="0.9"/>' +
      '<stop offset="100%" stop-color="#3fa7ff" stop-opacity="0.05"/>';
    defs.appendChild(grad);
  }
  routeHighlightDefsReady = true;
}

function updateRouteGradient(start, end) {
  const grad = document.getElementById('route-blue-grad');
  if (!grad || !start || !end) return;
  grad.setAttribute('x1', String(start.x));
  grad.setAttribute('y1', String(start.y));
  grad.setAttribute('x2', String(end.x));
  grad.setAttribute('y2', String(end.y));
}

function sampleRouteLegs(legs) {
  if (!legs || !legs.length) return [];
  const pts = [];
  let lastX = null, lastY = null;
  let acc = 0;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const atom = leg.atom;
    const tFrom = leg.tStart;
    const tTo = leg.tEnd;
    if (tTo - tFrom < 0.002) continue;

    const steps = atom.kind === 'lane' ? 1 : 16;
    for (let s = 0; s <= steps; s++) {
      const t = tFrom + (tTo - tFrom) * (s / steps);
      const p = atom.sampleAtT(t);
      if (lastX != null) acc += Math.hypot(p.x - lastX, p.y - lastY);
      pts.push({ x: p.x, y: p.y, s: acc });
      lastX = p.x;
      lastY = p.y;
    }
  }
  return pts;
}

function pointAtRouteDistance(pts, dist) {
  if (!pts.length) return null;
  if (dist <= 0) return { x: pts[0].x, y: pts[0].y };
  const total = pts[pts.length - 1].s;
  if (dist >= total) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.s >= dist) {
      const span = Math.max(b.s - a.s, 0.0001);
      const u = (dist - a.s) / span;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
  }
  return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
}

function pathDFromRouteSamples(pts, s0, s1) {
  if (!pts.length) return '';
  let d = '';
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (pt.s < s0 - 0.02) continue;
    if (pt.s > s1 + 0.02) break;
    if (!started) {
      const start = s0 <= pt.s ? pt : pointAtRouteDistance(pts, s0);
      d += 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2);
      started = true;
    } else {
      d += ' L ' + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2);
    }
  }
  if (started && pts[pts.length - 1].s > s1 + 0.02) {
    const end = pointAtRouteDistance(pts, s1);
    d += ' L ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2);
  }
  return d;
}

function appendRoutePathEl(d, stroke, strokeOpacity, width, targetEls) {
  if (!d) return;
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', stroke);
  if (strokeOpacity != null) path.setAttribute('stroke-opacity', String(strokeOpacity));
  path.setAttribute('stroke-width', String(width));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('class', 'route-highlight-path');
  routeHighlightLayer.appendChild(path);
  targetEls.push(path);
}

function drawRouteHighlightPath(legs, gradStart, targetEls) {
  const pts = sampleRouteLegs(legs);
  if (!pts.length) return;
  const totalLen = pts[pts.length - 1].s;
  if (totalLen < 0.08) return;

  ensureRouteHighlightDefs();

  const fadeLen = Math.min(ROUTE_TAIL_FADE, totalLen);
  const splitAt = totalLen - fadeLen;

  if (splitAt > 0.05) {
    const mainD = pathDFromRouteSamples(pts, 0, splitAt);
    appendRoutePathEl(mainD, ROUTE_PATH_COLOR, ROUTE_PATH_OPACITY, ROUTE_PATH_WIDTH, targetEls);
  }

  if (fadeLen > 0.05) {
    const tailStart = pointAtRouteDistance(pts, splitAt);
    const tailEnd = pts[pts.length - 1];
    const tailD = pathDFromRouteSamples(pts, splitAt, totalLen);
    updateRouteGradient(gradStart && splitAt < 0.05 ? gradStart : tailStart, tailEnd);
    appendRoutePathEl(tailD, 'url(#route-blue-grad)', null, ROUTE_PATH_WIDTH, targetEls);
  }
}

function remainingRouteLegs(car) {
  return car.route.slice(car.legIndex).map((leg, idx) => ({
    atom: leg.atom,
    tStart: idx === 0 ? currentLegFrac(car) : leg.tStart,
    tEnd: leg.tEnd
  }));
}

function routeGradientStartFromCar(car) {
  const p = sampleRouteAtDistance(car, car.traveledLength);
  return p ? { x: p.x, y: p.y } : null;
}

function clearHoverRouteHighlight() {
  hoverRouteEls.forEach(el => el.remove());
  hoverRouteEls = [];
  hoverRouteCar = null;
}

function updateHoverRouteHighlight(car) {
  clearHoverRouteHighlight();
  if (!driveMode || !car || car.selected || car.state === 'despawning') return;
  hoverRouteCar = car;
  drawRouteHighlightPath(remainingRouteLegs(car), routeGradientStartFromCar(car), hoverRouteEls);
}

function clearRouteHighlightEls(car) {
  (car.highlightEls || []).forEach(el => el.remove());
  car.highlightEls = [];
}

function currentLegFrac(car) {
  const leg = car.route[car.legIndex];
  const localLen = Math.max(leg.length, 0.0001);
  const localFrac = clampNum((car.traveledLength - leg.cumStart) / localLen, 0, 1);
  return leg.tStart + (leg.tEnd - leg.tStart) * localFrac;
}

function updateRouteHighlight(car) {
  clearRouteHighlightEls(car);
  drawRouteHighlightPath(remainingRouteLegs(car), routeGradientStartFromCar(car), car.highlightEls);
}

function drawPreviewRoute(route) {
  clearPreviewRoute();
  if (!route || !route.length) return;
  const legs = route.map(leg => ({
    atom: leg.atom,
    tStart: leg.tStart,
    tEnd: leg.tEnd
  }));
  drawRouteHighlightPath(legs, null, previewRouteEls);
}

function clearPreviewRoute() {
  previewRouteEls.forEach(el => el.remove());
  previewRouteEls = [];
}

// ---------------- Spawning ----------------

function spawnCarFromRoute(route, destPick) {
  let cum = 0;
  const legs = route.map(leg => {
    const length = Math.max(0.001, leg.atom.length * (leg.tEnd - leg.tStart));
    const withCum = { atom: leg.atom, tStart: leg.tStart, tEnd: leg.tEnd, length, cumStart: cum, cumEnd: cum + length };
    cum += length;
    return withCum;
  });
  const totalLength = cum;
  const first = legs[0];
  const start = first.atom.sampleAtT(first.tStart);

  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('data-car', 'true');

  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const L = ALLIE_CONFIG.CAR_LENGTH, W = ALLIE_CONFIG.CAR_WIDTH;
  const rearX = -ALLIE_CONFIG.REAR_OVERHANG;

  const body = document.createElementNS(svgNS, 'rect');
  body.setAttribute('x', String(rearX));
  body.setAttribute('y', String(-W / 2));
  body.setAttribute('width', String(L));
  body.setAttribute('height', String(W));
  body.setAttribute('rx', '0.9');
  body.setAttribute('fill', color);
  body.setAttribute('stroke', 'rgba(0,0,0,0.55)');
  body.setAttribute('stroke-width', '0.35');
  g.appendChild(body);

  const windshield = document.createElementNS(svgNS, 'rect');
  windshield.setAttribute('x', String(ALLIE_CONFIG.WHEELBASE * 0.32));
  windshield.setAttribute('y', String(-W / 2 + 0.35));
  windshield.setAttribute('width', String(ALLIE_CONFIG.WHEELBASE * 0.42));
  windshield.setAttribute('height', String(W - 0.7));
  windshield.setAttribute('rx', '0.4');
  windshield.setAttribute('fill', 'rgba(255,255,255,0.35)');
  g.appendChild(windshield);

  const lightEls = [-1, 1].map(side => {
    const l = document.createElementNS(svgNS, 'rect');
    l.setAttribute('x', String(rearX - 0.05));
    l.setAttribute('y', String(side * (W / 2 - 0.55) - 0.3));
    l.setAttribute('width', '0.55');
    l.setAttribute('height', '0.6');
    l.setAttribute('rx', '0.15');
    l.setAttribute('fill', '#ff3b3b');
    l.setAttribute('opacity', '0.15');
    g.appendChild(l);
    return l;
  });

  const frontX = rearX + L - 0.7;
  const blinkerEls = {};
  // Local +Y is driver's RIGHT after rotate(heading) in SVG (y-down).
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1; // left = −Y, right = +Y
    const el = document.createElementNS(svgNS, 'rect');
    el.setAttribute('x', String(frontX));
    el.setAttribute('y', String(sign * (W / 2 - 0.5) - 0.28));
    el.setAttribute('width', '0.62');
    el.setAttribute('height', '0.56');
    el.setAttribute('rx', '0.14');
    el.setAttribute('fill', '#ffb020');
    el.setAttribute('stroke', '#cc7a00');
    el.setAttribute('stroke-width', '0.12');
    el.setAttribute('opacity', '0.08');
    g.appendChild(el);
    blinkerEls[side] = el;
  });

  // Roof arrows — chevron + stem, same blink cadence as corner lamps.
  // Local +Y = right, −Y = left after rotate(heading).
  const roofBlinkerEls = {};
  const roofCx = rearX + L * 0.42;
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1;
    const tipY = sign * (W * 0.44);
    const headBase = sign * (W * 0.18);
    const stemEnd = sign * 0.12;
    const hw = 0.22; // half stem width
    const path = document.createElementNS(svgNS, 'path');
    // Arrow pointing outward: triangle head + rectangular stem toward center
    path.setAttribute('d', [
      'M', roofCx.toFixed(2), tipY.toFixed(2),
      'L', (roofCx - 0.62).toFixed(2), headBase.toFixed(2),
      'L', (roofCx - hw).toFixed(2), headBase.toFixed(2),
      'L', (roofCx - hw).toFixed(2), stemEnd.toFixed(2),
      'L', (roofCx + hw).toFixed(2), stemEnd.toFixed(2),
      'L', (roofCx + hw).toFixed(2), headBase.toFixed(2),
      'L', (roofCx + 0.62).toFixed(2), headBase.toFixed(2),
      'Z'
    ].join(' '));
    path.setAttribute('fill', '#ffb020');
    path.setAttribute('stroke', '#cc7a00');
    path.setAttribute('stroke-width', '0.1');
    path.setAttribute('opacity', '0.12');
    g.appendChild(path);
    roofBlinkerEls[side] = path;
  });

  const hit = document.createElementNS(svgNS, 'rect');
  hit.setAttribute('x', String(rearX - 1));
  hit.setAttribute('y', String(-W / 2 - 1));
  hit.setAttribute('width', String(L + 2));
  hit.setAttribute('height', String(W + 2));
  hit.setAttribute('fill', 'transparent');
  hit.style.pointerEvents = 'none';
  g.appendChild(hit);

  const hoverRing = document.createElementNS(svgNS, 'rect');
  hoverRing.setAttribute('x', String(rearX - 0.7));
  hoverRing.setAttribute('y', String(-W / 2 - 0.7));
  hoverRing.setAttribute('width', String(L + 1.4));
  hoverRing.setAttribute('height', String(W + 1.4));
  hoverRing.setAttribute('rx', '1.2');
  hoverRing.setAttribute('fill', 'rgba(127,212,255,0.12)');
  hoverRing.setAttribute('stroke', '#7fd4ff');
  hoverRing.setAttribute('stroke-width', '0.65');
  hoverRing.setAttribute('opacity', '0');
  hoverRing.style.pointerEvents = 'none';
  g.appendChild(hoverRing);

  const selectRing = document.createElementNS(svgNS, 'rect');
  selectRing.setAttribute('x', String(rearX - 0.55));
  selectRing.setAttribute('y', String(-W / 2 - 0.55));
  selectRing.setAttribute('width', String(L + 1.1));
  selectRing.setAttribute('height', String(W + 1.1));
  selectRing.setAttribute('rx', '1.1');
  selectRing.setAttribute('fill', 'none');
  selectRing.setAttribute('stroke', '#7fd4ff');
  selectRing.setAttribute('stroke-width', '0.55');
  selectRing.setAttribute('stroke-dasharray', '1.6 1.1');
  selectRing.setAttribute('opacity', '0');
  selectRing.style.pointerEvents = 'none';
  g.appendChild(selectRing);

  carLayer.appendChild(g);

  // Destination pick for post-lane-change route recompute
  let storedDest = destPick || null;
  if (!storedDest && legs.length) {
    const last = legs[legs.length - 1];
    storedDest = { atom: last.atom, t: last.tEnd, x: 0, y: 0 };
    const p = last.atom.sampleAtT(last.tEnd);
    storedDest.x = p.x;
    storedDest.y = p.y;
  }

  const car = {
    id: carIdCounter++,
    el: g, lightEls, blinkerEls, roofBlinkerEls, hitEl: hit, hoverRing, selectRing,
    route: legs, legIndex: 0,
    totalLength, traveledLength: 0,
    x: start.x, y: start.y, heading: Math.atan2(start.ty, start.tx),
    speed: 0, braking: false, blinkerPhase: 0,
    color, selected: false, state: 'driving', despawnT: 0,
    highlightEls: [],
    // Signal decision latch: { turnLegIndex, choice:'commit'|'stop'|'ror', rorPhase }
    signalDecision: null,
    signalTimer: 0,
    rorPhase: null,
    junctionWait: null,
    _lastObstruction: null,
    _peripheralCaution: 0,
    _yieldOther: null,
    _hardSafetyHit: null,
    _debugDesired: 0,
    _debugAccel: 0,
    _hardStuckT: 0,
    // Lane-change state
    destPick: storedDest,
    overtakeTendency: 0.25 + Math.random() * 0.55,
    courtesyTendency: 0.35 + Math.random() * 0.55,
    overtakeTimer: Math.random() * ALLIE_CONFIG.OVERTAKE_CHECK_INTERVAL,
    _pendingLaneChangeAtomId: null,
    _laneChangeBoostRoll: false,
    _laneChangeWaitT: 0,
    _laneChangeForce: false,
    _laneChangeDebug: null
  };

  g.setAttribute('transform', `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI})`);
  car._lx = car.x;
  car._ly = car.y;
  car._lh = car.heading;
  refreshCarPoseCache(car);

  cars.push(car);
  updateCarCountUI();
  return car;
}

function removeCar(car) {
  if (followedCar === car) unfollowCar();
  if (hoverRouteCar === car) clearHoverRouteHighlight();
  clearRouteHighlightEls(car);
  car.el.remove();
  const idx = cars.indexOf(car);
  if (idx >= 0) cars.splice(idx, 1);
  updateCarCountUI();
}

function beginDespawn(car) {
  if (car.state === 'despawning') return;
  car.state = 'despawning';
  car.despawnT = 0;
}

// ---------------- Selection / follow camera ----------------

function estimateTimeRemaining(car) {
  if (car.state === 'despawning') return 0;
  const remaining = Math.max(0, car.totalLength - car.traveledLength);
  if (remaining < 0.05) return 0;

  // Walk the remaining route with the same RH speed profile the car uses,
  // so ETA accounts for upcoming turn slowdowns and arrival braking.
  let s = car.traveledLength;
  let v = Math.max(car.speed, 0.5);
  let time = 0;
  const dt = 0.12;
  const maxSteps = 2500;
  for (let step = 0; step < maxSteps && s < car.totalLength - 0.05; step++) {
    // Temporary probe state for desired-speed reuse
    const probe = {
      route: car.route,
      legIndex: car.legIndex,
      traveledLength: s,
      totalLength: car.totalLength,
      speed: v,
      isProbe: true,
      signalDecision: car.signalDecision,
      signalTimer: 0,
      rorPhase: car.rorPhase
    };
    while (probe.legIndex < probe.route.length - 1 &&
           probe.traveledLength >= probe.route[probe.legIndex].cumEnd - 0.0005) {
      probe.legIndex++;
    }
    const { desired, decelRate } = computeDesiredSpeed(probe);
    if (v < desired - 0.01) v = Math.min(desired, v + ALLIE_CONFIG.ACCEL * dt);
    else if (v > desired + 0.01) v = Math.max(desired, v - decelRate * dt);
    v = Math.max(v, 0.8);
    s += v * dt;
    time += dt;
  }
  return time;
}

function formatEta(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 0.05) return '0.0 s';
  if (seconds < 60) return seconds.toFixed(1) + ' s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m + 'm ' + String(s).padStart(2, '0') + 's';
}

function selectCar(car) {
  if (followedCar && followedCar !== car) deselectCarVisual(followedCar);
  clearHoverRouteHighlight();
  clearJunctionInteraction();
  followedCar = car;
  car.selected = true;
  updateCarHoverVisual(car);
  if (car.selectRing) car.selectRing.setAttribute('opacity', '1');
  updateRouteHighlight(car);
  updateCarOverlayVisibility();
  updateDriveHudText();
}

function deselectCarVisual(car) {
  car.selected = false;
  if (car.selectRing) car.selectRing.setAttribute('opacity', '0');
  updateCarHoverVisual(car);
  clearRouteHighlightEls(car);
}

function unfollowCar() {
  if (!followedCar) return;
  deselectCarVisual(followedCar);
  followedCar = null;
  updateCarOverlayVisibility();
}

function carOverlayTarget() {
  if (followedCar && followedCar.selected) return followedCar;
  if (hoveredCar && hoveredCar.state !== 'despawning') return hoveredCar;
  return null;
}

function updateCarOverlayVisibility() {
  const el = document.getElementById('car-overlay');
  if (!el) return;
  const car = carOverlayTarget();
  if (!car || !driveMode) {
    el.classList.remove('visible', 'follow-mode', 'hover-mode', 'debug-on');
    return;
  }
  const isFollow = followedCar === car && car.selected;
  el.classList.add('visible');
  el.classList.toggle('follow-mode', isFollow);
  el.classList.toggle('hover-mode', !isFollow);
  el.classList.toggle('debug-on', debugRingsOn);

  const badge = document.getElementById('co-badge');
  const unfollowBtn = document.getElementById('co-unfollow');
  const tip = document.getElementById('co-tip');
  if (badge) badge.textContent = isFollow ? 'Following' : 'Inspect';
  if (unfollowBtn) unfollowBtn.style.display = isFollow ? '' : 'none';
  if (tip) {
    tip.textContent = isFollow ? 'click car again to unfollow' : 'click to follow';
    tip.style.display = '';
  }

  updateCarOverlayContent(car);
}

function updateFollowedCarInfo(car) {
  updateCarOverlayContent(car);
}

function updateFollowTagPosition(_car) {
  // overlay is fixed — no position tracking
}

function updateCameraFollow(car, dt) {
  const rect = board.getBoundingClientRect();
  const targetScale = Math.max(view.scale, ALLIE_CONFIG.FOLLOW_MIN_SCALE);
  if (Math.abs(targetScale - view.scale) > 0.001) {
    view.scale += (targetScale - view.scale) * Math.min(1, dt * 6);
  }
  // Lock the car to screen center — no position lag (lerp couldn't keep up at cruise speed)
  const c = carCenter(car);
  view.x = rect.width / 2 - c.x * view.scale;
  view.y = rect.height / 2 - c.y * view.scale;
  applyView();
}

function updateCarOverlayContent(car) {
  const remaining = Math.max(0, car.totalLength - car.traveledLength);
  const eta = estimateTimeRemaining(car);
  const status = car.state === 'despawning' ? 'Arrived'
    : (car._signalStatus ? car._signalStatus
      : (car.braking ? 'Braking' : (car.speed < 1 ? 'Stopped' : 'Driving')));
  const speedText = Math.round(car.speed) + ' u/s';
  const targetText = Math.round(car._debugDesired != null ? car._debugDesired : car.speed) + ' u/s';
  const remText = Math.round(remaining) + ' u';
  const etaText = formatEta(eta);

  const set = (id, text) => {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  };
  set('co-id', 'CAR #' + car.id);
  set('co-speed', speedText);
  set('co-target', targetText);
  set('co-status', status);
  set('co-eta', etaText);
  set('co-remaining', remText);

  const lcdBrief = car._laneChangeDebug;
  if (lcdBrief && lcdBrief.phase && lcdBrief.phase !== 'none') {
    const bits = [lcdBrief.phase];
    if (lcdBrief.blinker) bits.push(lcdBrief.blinker);
    if (lcdBrief.plan) bits.push(lcdBrief.plan);
    set('co-lc-brief', bits.join(' · '));
  } else {
    set('co-lc-brief', '—');
  }

  if (!debugRingsOn) return;

  const caution = car._peripheralCaution || 0;
  const nearby = gatherNearbyForDebug(car, ALLIE_CONFIG.SIDE_DETECT_RADIUS);
  const obs = car._lastObstruction;
  set('co-caution', caution.toFixed(2));
  set('co-nearby', String(nearby.length));
  set('co-lead', obs ? `#${obs.other.id} · ${obs.gap.toFixed(1)} gap` : '—');
  set('co-yield', car._yieldOther ? `#${car._yieldOther.id}` : '—');
  if (car._hardSafetyHit) {
    const win = hardSafetyLoser(car, car._hardSafetyHit) === car._hardSafetyHit;
    set('co-safety', win ? `WIN vs #${car._hardSafetyHit.id}` : `LOSE vs #${car._hardSafetyHit.id}`);
  } else {
    set('co-safety', '—');
  }

  const lcd = car._laneChangeDebug;
  if (lcd && lcd.phase && lcd.phase !== 'none') {
    set('co-lc-phase', lcd.phase);
    set('co-lc-plan', lcd.plan || '—');
    set('co-lc-blinker', lcd.blinker ? lcd.blinker.toUpperCase() : 'off');
    set('co-lc-dist', lcd.dist != null ? lcd.dist.toFixed(1) + ' u' : '—');
    set('co-lc-gap', lcd.gapOk == null ? '—'
      : (lcd.gapOk ? 'OK' : 'BLOCKED')
        + ' · A' + (lcd.gapAhead != null ? lcd.gapAhead.toFixed(1) : '—')
        + (lcd.aheadId != null ? '(#' + lcd.aheadId + ')' : '')
        + ' / B' + (lcd.gapBehind != null ? lcd.gapBehind.toFixed(1) : '—')
        + (lcd.behindId != null ? '(#' + lcd.behindId + ')' : ''));
    set('co-lc-decision', lcd.decision || '—');
    set('co-lc-wait',
      (lcd.waitT != null ? lcd.waitT.toFixed(1) + 's' : '0s')
      + (lcd.force ? ' · FORCE' : ''));
  } else {
    set('co-lc-phase', 'none');
    set('co-lc-plan', 'stay in lane');
    set('co-lc-blinker', 'off');
    set('co-lc-dist', '—');
    set('co-lc-gap', '—');
    set('co-lc-decision', '—');
    set('co-lc-wait', '—');
  }

  const tagsEl = document.getElementById('co-tags');
  if (!tagsEl) return;
  tagsEl.innerHTML = '';
  describeCarAction(car).forEach(tag => {
    const span = document.createElement('span');
    span.className = 'co-tag';
    span.textContent = tag.text;
    span.style.color = tag.color;
    span.style.borderColor = tag.color + '44';
    span.style.background = tag.color + '18';
    tagsEl.appendChild(span);
  });
}

// ---------------- Simulation controls ----------------

function clearAllCars() {
  if (followedCar) unfollowCar();
  cars.forEach(c => { clearRouteHighlightEls(c); c.el.remove(); });
  cars = [];
  clearDebugOverlay();
  updateCarCountUI();
}

function updateCarCountUI() {
  document.getElementById('car-count').textContent = String(cars.length);
}

function toggleSimPaused() {
  simPaused = !simPaused;
  const btn = document.getElementById('btn-sim-pause');
  if (btn) {
    btn.textContent = simPaused ? 'Resume' : 'Pause';
    btn.classList.toggle('active', simPaused);
  }
  // Spawners freeze with the sim — refresh their UI so it reads clearly
  updateSpawnerListUI();
  spawners.forEach(drawSpawnerMarker);
}

// ---------------- Debug rings overlay ----------------

function clearDebugOverlay() {
  debugOverlayEls.forEach(el => el.remove());
  debugOverlayEls = [];
}

// Cars route through mid-block lane-change windows when needed. This toggle
// controls whether they may also hop lanes *inside* a junction (straight
// through onto a different relative exit lane) and how close mid-block
// windows may sit to an intersection. Off by default.
function toggleAllowIntersectionLaneChanges() {
  ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES = !ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES;
  const btn = document.getElementById('btn-lane-changes');
  if (btn) {
    btn.textContent = 'Allow lane changes in intersection: '
      + (ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES ? 'On' : 'Off');
    btn.classList.toggle('active', ALLIE_CONFIG.ALLOW_INTERSECTION_LANE_CHANGES);
  }
  // Rebuild junction edges (common-sense straight hops) then the ALLIE graph
  // (rebuildAllieGraph also live-reroutes every car).
  if (typeof recomputeAllJunctions === 'function') recomputeAllJunctions();
  else rebuildAllieGraph();
}

function toggleLaneChangeGraphVisible() {
  laneChangeGraphVisible = !laneChangeGraphVisible;
  const btn = document.getElementById('btn-lanechange-graph');
  if (btn) {
    btn.textContent = 'Lane-change windows: ' + (laneChangeGraphVisible ? 'On' : 'Off');
    btn.classList.toggle('active', laneChangeGraphVisible);
  }
  rebuildLaneChangeGraphVisual();
}

function toggleDebugRings() {
  debugRingsOn = !debugRingsOn;
  const btn = document.getElementById('btn-debug-rings');
  if (btn) {
    btn.textContent = debugRingsOn ? 'Debug: On' : 'Debug: Off';
    btn.classList.toggle('active', debugRingsOn);
  }
  updateCarOverlayVisibility();
  if (!debugRingsOn) clearDebugOverlay();
  else updateDebugOverlay();
}

function appendDebugEl(el) {
  debugLayer.appendChild(el);
  debugOverlayEls.push(el);
}

function heatColor(t, alpha) {
  // 0 = cool cyan → 1 = hot red
  t = clampNum(t, 0, 1);
  const r = Math.round(40 + t * 215);
  const g = Math.round(200 - t * 160);
  const b = Math.round(255 - t * 200);
  return `rgba(${r},${g},${b},${alpha})`;
}

function describeCarAction(car) {
  const tags = [];
  const status = car._signalStatus || null;
  const desired = car._debugDesired != null ? car._debugDesired : null;
  const speed = car.speed || 0;
  const accel = car._debugAccel != null ? car._debugAccel : 0;

  if (car.state === 'despawning') tags.push({ text: 'Despawning', color: '#aaa' });
  if (status === 'Unsticking') tags.push({ text: 'Unsticking (winner)', color: '#7CFF9A' });
  else if (status === 'Blocked') tags.push({ text: 'Blocked (loser)', color: '#FF5C5C' });
  else if (status === 'Yielding') tags.push({ text: 'Yielding', color: '#FF8888' });
  else if (status === 'Stopped for traffic') tags.push({ text: 'Stopped · traffic', color: '#FF6B6B' });
  else if (status === 'Braking for traffic') tags.push({ text: 'Braking · traffic', color: '#FFB020' });
  else if (status === 'Following') tags.push({ text: 'Following', color: '#7FD4FF' });
  else if (status === 'Caution') tags.push({ text: 'Side caution', color: '#FFB347' });
  else if (status === 'Red light') tags.push({ text: 'Red light', color: '#FF4444' });
  else if (status === 'Right on red') tags.push({ text: 'Right on red', color: '#FFAA66' });
  else if (status === 'Committed (yellow)') tags.push({ text: 'Committed · yellow', color: '#FFE066' });
  else if (status === 'Letting merge') tags.push({ text: 'Letting merge', color: '#A0E7A0' });
  else if (status === 'Changing lanes') tags.push({ text: 'Changing lanes', color: '#FFD166' });
  else if (status === 'Waiting for gap') tags.push({ text: 'Waiting for gap', color: '#FFCC66' });
  else if (status === 'Speeding to merge') tags.push({ text: 'Speeding to merge', color: '#FF6B6B' });

  const lcd = car._laneChangeDebug;
  if (lcd && lcd.phase && lcd.phase !== 'none') {
    if (lcd.blinker) tags.push({
      text: 'Blinker ' + lcd.blinker.toUpperCase() + ' · L' + lcd.fromLane + '→L' + lcd.toLane,
      color: '#FFB020'
    });
    if (lcd.gapOk === false) tags.push({ text: 'Gap blocked', color: '#FF6B6B' });
    if (lcd.gapOk === true && lcd.phase !== 'merging') tags.push({ text: 'Gap clear', color: '#7CFF9A' });
    if (lcd.force) tags.push({ text: 'Force merge', color: '#FF5C5C' });
    if (lcd.decision) tags.push({ text: lcd.decision, color: '#C5A3FF' });
  }

  if (speed < 0.4) tags.push({ text: 'Stopped', color: '#ff7777' });
  else if (accel > 2.5) tags.push({ text: 'Accelerating', color: '#6DFF8A' });
  else if (accel < -2.5 || car.braking) tags.push({ text: 'Decelerating', color: '#FF9F43' });
  else if (desired != null && desired < ALLIE_CONFIG.CRUISE_SPEED * 0.55 && speed > 1)
    tags.push({ text: 'Slowing / held', color: '#FFD166' });
  else if (speed > 1) tags.push({ text: 'Cruising', color: '#9CF' });

  if (speed > 0.4 && speed <= ALLIE_CONFIG.HARD_SAFETY_CREEP + 0.8
      && (status === 'Unsticking' || status === 'Blocked' || (desired != null && desired <= ALLIE_CONFIG.HARD_SAFETY_CREEP + 0.5)))
    tags.push({ text: 'Creeping', color: '#E0B0FF' });

  // Deduplicate by text
  const seen = new Set();
  return tags.filter(t => {
    if (seen.has(t.text)) return false;
    seen.add(t.text);
    return true;
  });
}

function gatherNearbyForDebug(car, radius) {
  const egoC = car._cx != null ? { x: car._cx, y: car._cy } : carCenter(car);
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const list = [];
  const nearby = collectNearbyCars(egoC.x, egoC.y, radius);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car) continue;
    const oc = { x: other._cx, y: other._cy };
    const dx = oc.x - egoC.x, dy = oc.y - egoC.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) continue;
    const fwd = dx * cosH + dy * sinH;
    const lat = -dx * sinH + dy * cosH;
    const heat = 1 - dist / radius;
    const loser = hardSafetyLoser(car, other);
    list.push({
      other, oc, dist, fwd, lat, heat,
      weWin: loser === other,
      bearing: Math.atan2(lat, fwd)
    });
  }
  list.sort((a, b) => a.dist - b.dist);
  return list;
}

function appendDebugOBB(obb, fill, stroke, strokeWidth, pad) {
  pad = pad || 0;
  const mark = document.createElementNS(svgNS, 'rect');
  mark.setAttribute('x', String(-obb.hl - pad));
  mark.setAttribute('y', String(-obb.hw - pad));
  mark.setAttribute('width', String(obb.hl * 2 + pad * 2));
  mark.setAttribute('height', String(obb.hw * 2 + pad * 2));
  mark.setAttribute('fill', fill || 'none');
  mark.setAttribute('stroke', stroke);
  mark.setAttribute('stroke-width', String(strokeWidth));
  mark.setAttribute('transform', `translate(${obb.cx} ${obb.cy}) rotate(${obb.heading * 180 / Math.PI})`);
  appendDebugEl(mark);
}

function drawDebugSensors(car, c, radius, nearby) {
  const halfCone = (ALLIE_CONFIG.SIDE_DETECT_CONE_DEG * Math.PI / 180) * 0.5;

  // Sensor FOV boundary lines (angle edges only — no full rings)
  [-halfCone, halfCone].forEach(ang => {
    const ca = Math.cos(car.heading + ang);
    const sa = Math.sin(car.heading + ang);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(c.x));
    line.setAttribute('y1', String(c.y));
    line.setAttribute('x2', String(c.x + ca * radius));
    line.setAttribute('y2', String(c.y + sa * radius));
    line.setAttribute('stroke', 'rgba(255,180,60,0.65)');
    line.setAttribute('stroke-width', '0.5');
    appendDebugEl(line);
  });

  // Angular sensor wedges — heat by direction / closeness of nearby cars
  const SECTORS = 16;
  for (let s = 0; s < SECTORS; s++) {
    const a0 = -Math.PI + (s / SECTORS) * Math.PI * 2;
    const a1 = -Math.PI + ((s + 1) / SECTORS) * Math.PI * 2;
    const mid = (a0 + a1) * 0.5;
    let bestHeat = 0;
    for (let i = 0; i < nearby.length; i++) {
      const n = nearby[i];
      let dAng = n.bearing - mid;
      while (dAng > Math.PI) dAng -= Math.PI * 2;
      while (dAng < -Math.PI) dAng += Math.PI * 2;
      if (Math.abs(dAng) < (Math.PI / SECTORS) * 1.15) {
        if (n.heat > bestHeat) bestHeat = n.heat;
      }
    }
    if (bestHeat < 0.08) continue;
    const inner = radius * 0.35;
    const outer = radius * (0.75 + bestHeat * 0.25);
    const x0i = c.x + Math.cos(car.heading + a0) * inner;
    const y0i = c.y + Math.sin(car.heading + a0) * inner;
    const x1i = c.x + Math.cos(car.heading + a1) * inner;
    const y1i = c.y + Math.sin(car.heading + a1) * inner;
    const x0o = c.x + Math.cos(car.heading + a0) * outer;
    const y0o = c.y + Math.sin(car.heading + a0) * outer;
    const x1o = c.x + Math.cos(car.heading + a1) * outer;
    const y1o = c.y + Math.sin(car.heading + a1) * outer;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d',
      `M ${x0i.toFixed(2)} ${y0i.toFixed(2)} L ${x0o.toFixed(2)} ${y0o.toFixed(2)} ` +
      `L ${x1o.toFixed(2)} ${y1o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} Z`);
    path.setAttribute('fill', heatColor(bestHeat, 0.14 + bestHeat * 0.32));
    path.setAttribute('stroke', heatColor(bestHeat, 0.45));
    path.setAttribute('stroke-width', '0.25');
    appendDebugEl(path);
  }

  // Nearby cars as oriented rectangles (no connector lines)
  for (let i = 0; i < nearby.length; i++) {
    const n = nearby[i];
    const obb = carOBB(n.other);
    appendDebugOBB(
      obb,
      heatColor(n.heat, 0.12 + n.heat * 0.28),
      heatColor(n.heat, 0.9),
      0.55,
      0.15
    );
  }
}

function drawDebugForCar(car) {
  if (!car || car.state === 'despawning') return;
  const c = carCenter(car);
  const radius = ALLIE_CONFIG.SIDE_DETECT_RADIUS;
  const nearby = gatherNearbyForDebug(car, radius);

  drawDebugSensors(car, c, radius, nearby);

  // Hard-safety flash on ego
  if (car._hardSafetyHit) {
    appendDebugOBB(carOBB(car), 'none', '#ff2222', 0.9, 0.35);
  }

  // Lane-change thinking: draw the blend path + blinker side cue
  const lcd = car._laneChangeDebug;
  const found = findUpcomingLaneChangeLeg(car);
  let lcAtom = found ? found.leg.atom : null;
  if (!lcAtom && lcd && lcd.phase === 'planned') {
    for (let i = car.legIndex; i < car.route.length; i++) {
      if (car.route[i].atom.kind === 'lanechange') { lcAtom = car.route[i].atom; break; }
      if (car.route[i].atom.kind === 'turn') break;
    }
  }
  if (lcAtom) {
    const STEPS = 12;
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
      const p = lcAtom.sampleAtT(i / STEPS);
      d += (i === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ';
    }
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', lcd && lcd.gapOk === false ? '#ff6b6b' : '#ffb020');
    path.setAttribute('stroke-width', '1.1');
    path.setAttribute('stroke-dasharray', '2 1.2');
    path.setAttribute('opacity', '0.95');
    appendDebugEl(path);

    const target = lcAtom.sampleAtT(1);
    const blinker = blinkerSideForLaneChange(car, lcAtom);
    const sideDot = document.createElementNS(svgNS, 'circle');
    sideDot.setAttribute('cx', String(target.x));
    sideDot.setAttribute('cy', String(target.y));
    sideDot.setAttribute('r', '1.4');
    sideDot.setAttribute('fill', blinker === 'left' ? '#7fd4ff' : '#ff9d4d');
    sideDot.setAttribute('stroke', '#fff');
    sideDot.setAttribute('stroke-width', '0.35');
    appendDebugEl(sideDot);

    // Short tick on the car toward the blinker side
    if (blinker) {
      const side = blinker === 'right' ? 1 : -1;
      const rx = -Math.sin(car.heading) * side * 5;
      const ry = Math.cos(car.heading) * side * 5;
      const tick = document.createElementNS(svgNS, 'line');
      tick.setAttribute('x1', String(c.x));
      tick.setAttribute('y1', String(c.y));
      tick.setAttribute('x2', String(c.x + rx));
      tick.setAttribute('y2', String(c.y + ry));
      tick.setAttribute('stroke', blinker === 'left' ? '#7fd4ff' : '#ff9d4d');
      tick.setAttribute('stroke-width', '1.2');
      tick.setAttribute('opacity', '0.95');
      appendDebugEl(tick);
    }
  }
}

function updateDebugOverlay() {
  clearDebugOverlay();
  if (!debugRingsOn) return;
  // Prefer hover target so "hover in debug mode" always shows that car's heatmap
  const target = hoveredCar || followedCar;
  if (target) drawDebugForCar(target);
}

// ---------------- Per-frame update: speed profile + bicycle model + pure pursuit ----------------

function sampleRouteAtDistance(car, s) {
  s = clampNum(s, 0, car.totalLength);
  const route = car.route;
  const n = route.length;
  if (!n) return null;
  // Binary search on cumEnd — routes can be long; this is on the hot path.
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s > route[mid].cumEnd + 0.0005) lo = mid + 1;
    else hi = mid;
  }
  const leg = route[lo];
  const localLen = Math.max(leg.length, 0.0001);
  const localFrac = clampNum((s - leg.cumStart) / localLen, 0, 1);
  const t = leg.tStart + (leg.tEnd - leg.tStart) * localFrac;
  return leg.atom.sampleAtT(t);
}

function advanceCarLeg(car) {
  while (car.legIndex < car.route.length - 1 && car.traveledLength >= car.route[car.legIndex].cumEnd - 0.0005) {
    car.legIndex++;
    if (car.selected) updateRouteHighlight(car);
  }
}

// ================================================================
// LANE CHANGES — graph-integrated windows
//
// A lane change is no longer a reactive "detour" bolted onto a finished
// route: it's baked directly into the ALLIE road graph as a 'lanechange'
// atom (see buildLaneChangeEdge above), legal only inside a window. That
// means:
//   - Dijkstra already routes through a lane change whenever the clicked
//     destination lane needs one — no separate fallback logic required.
//   - The runtime's only two jobs are (1) hold a car back at a window's
//     entry if the target lane isn't safe yet — never shove into traffic —
//     and (2) occasionally re-path a slow-and-stuck car through a nearby
//     window to overtake, purely as a discretionary bonus.
// The blinker, courtesy easing, and rare risky boost all key off whichever
// route leg is the next/only 'lanechange' atom, so there's a single source
// of truth instead of a separate per-car state machine.
// ================================================================

// Real lane + arclength position a car currently occupies, expressed in the
// FULL segment's own t-parameterization (shared by every sibling lane and
// by lanechange edges), so positions on different sibling lanes are
// directly comparable.
function carFullSegPos(car) {
  const leg = car.route[car.legIndex];
  if (!leg) return null;
  const atom = leg.atom;
  const frac = currentLegFrac(car);
  if (atom.kind === 'lane') {
    const t0 = atom.segTStart != null ? atom.segTStart : 0;
    const t1 = atom.segTEnd != null ? atom.segTEnd : 1;
    return { segId: atom.segId, laneIdx: atom.laneIdx, segT: t0 + (t1 - t0) * frac, fullSegLen: atom.fullSegLen || atom.length };
  }
  if (atom.kind === 'lanechange') {
    return { segId: atom.segId, laneIdx: atom.toLaneIdx, segT: atom.segT0 + (atom.segT1 - atom.segT0) * frac, fullSegLen: atom.fullSegLen };
  }
  return null;
}

// The next 'lanechange' leg on this car's route within reach (or the one
// it's already inside). Stops looking past a 'turn' — windows never sit
// adjacent to a junction, so nothing relevant lies beyond it anyway.
function findUpcomingLaneChangeLeg(car) {
  if (car._lcFoundFrame === tickFrame) return car._lcFound;
  const route = car.route;
  let result = null;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind === 'turn') break;
    if (leg.atom.kind !== 'lanechange') continue;
    const active = i === car.legIndex;
    const dist = active ? 0 : (leg.cumStart - car.traveledLength);
    if (!active && dist > ALLIE_CONFIG.LANE_CHANGE_APPROACH_LOOKAHEAD) break;
    result = { leg, dist, active };
    break;
  }
  car._lcFoundFrame = tickFrame;
  car._lcFound = result;
  return result;
}

// Is the gap in (targetSegId, targetLaneIdx) safe for `car` to merge into?
// `force` relaxes thresholds after the car has waited too long at a window.
function laneChangeGapCheck(car, targetSegId, targetLaneIdx, force) {
  const myPos = carFullSegPos(car);
  if (!myPos) return { ok: false, aheadGap: 0, behindGap: 0, ahead: null, behind: null };
  const fullSegLen = myPos.fullSegLen || 1;
  const halfLen = ALLIE_CONFIG.CAR_LENGTH;
  const aheadMin = force
    ? ALLIE_CONFIG.LANE_CHANGE_GAP_AHEAD_MIN * 0.35
    : ALLIE_CONFIG.LANE_CHANGE_GAP_AHEAD_MIN;
  const behindMin = force
    ? ALLIE_CONFIG.LANE_CHANGE_GAP_BEHIND_MIN * 0.35
    : ALLIE_CONFIG.LANE_CHANGE_GAP_BEHIND_MIN;
  const ttcMin = force
    ? ALLIE_CONFIG.LANE_CHANGE_TTC_MIN * 0.45
    : ALLIE_CONFIG.LANE_CHANGE_TTC_MIN;
  let ahead = null, behind = null;
  let aheadGap = Infinity, behindGap = Infinity;

  const laneCars = laneOccupancy.get(targetSegId + ':' + targetLaneIdx);
  if (laneCars) {
    for (let i = 0; i < laneCars.length; i++) {
      const other = laneCars[i];
      if (other === car) continue;
      const pos = other._segPos || carFullSegPos(other);
      if (!pos) continue;
      const gapAlong = (pos.segT - myPos.segT) * fullSegLen;
      if (gapAlong > 0) {
        const bumperGap = gapAlong - halfLen;
        if (bumperGap < aheadGap) { aheadGap = bumperGap; ahead = other; }
      } else {
        const bumperGap = -gapAlong - halfLen;
        if (bumperGap < behindGap) { behindGap = bumperGap; behind = other; }
      }
    }
  }

  let aheadOk = aheadGap >= aheadMin;
  let behindOk = behindGap >= behindMin;
  if (behind && behindOk) {
    const closing = behind.speed - car.speed;
    if (closing > 1) {
      const ttc = behindGap / closing;
      if (ttc < ttcMin) behindOk = false;
    }
  }
  if (ahead && aheadOk) {
    const closing = car.speed - ahead.speed;
    if (closing > 1) {
      const ttc = aheadGap / closing;
      if (ttc < ttcMin * 0.7) aheadOk = false;
    }
  }

  return {
    ok: aheadOk && behindOk,
    aheadGap: isFinite(aheadGap) ? aheadGap : 999,
    behindGap: isFinite(behindGap) ? behindGap : 999,
    ahead, behind
  };
}

// Hold a car back on approach to a window if the target lane isn't clear —
// creep, don't hard-stop. Once inside the blend (active) the maneuver is committed.
function laneChangeApproachConstraintFor(car) {
  if (car.isProbe) return null;
  const found = findUpcomingLaneChangeLeg(car);
  if (!found || found.active) return null;
  const { leg, dist } = found;
  const atom = leg.atom;

  if (car._pendingLaneChangeAtomId !== atom.id) {
    car._pendingLaneChangeAtomId = atom.id;
    car._laneChangeBoostRoll = Math.random() < ALLIE_CONFIG.LANE_CHANGE_BOOST_CHANCE;
    car._laneChangeWaitT = 0;
    car._laneChangeForce = false;
  }

  const gap = laneChangeGapCheck(car, atom.segId, atom.toLaneIdx, car._laneChangeForce);
  if (gap.ok) return null;

  // Rare risky driving: gap behind is borderline-tight (not hopeless) — some
  // drivers speed up a little to slot in before it closes rather than wait.
  const borderline = gap.behindGap < ALLIE_CONFIG.LANE_CHANGE_GAP_BEHIND_MIN
    && gap.behindGap > ALLIE_CONFIG.LANE_CHANGE_GAP_BEHIND_MIN * 0.35
    && gap.aheadGap >= ALLIE_CONFIG.LANE_CHANGE_GAP_AHEAD_MIN * 0.8;
  if (borderline && car._laneChangeBoostRoll && dist < ALLIE_CONFIG.LANE_CHANGE_APPROACH_LOOKAHEAD * 0.6) {
    return {
      desired: ALLIE_CONFIG.CRUISE_SPEED * ALLIE_CONFIG.LANE_CHANGE_BOOST_FACTOR,
      decelRate: ALLIE_CONFIG.DECEL_NORMAL,
      status: 'Speeding to merge',
      boost: true
    };
  }

  // Ease down, but never park at 0 — that piles everyone up at the window.
  // Keep a crawl so traffic keeps flowing and a gap can open.
  const holdDist = Math.max(0, dist - 1.5);
  const creep = Math.max(
    ALLIE_CONFIG.LANE_CHANGE_MIN_CREEP,
    Math.min(ALLIE_CONFIG.CRUISE_SPEED * 0.4, holdDist * 1.6)
  );
  return { desired: creep, decelRate: ALLIE_CONFIG.LANE_CHANGE_HOLD_DECEL, status: 'Waiting for gap' };
}

// Free-flow speed ahead on a sibling lane — used to judge whether a
// discretionary overtake through a window is actually worth it.
function estimateLaneLeadSpeed(car, targetSegId, targetLaneIdx) {
  const myPos = carFullSegPos(car);
  if (!myPos) return ALLIE_CONFIG.CRUISE_SPEED;
  const fullSegLen = myPos.fullSegLen || 1;
  let bestGap = Infinity, bestSpeed = ALLIE_CONFIG.CRUISE_SPEED;
  const laneCars = laneOccupancy.get(targetSegId + ':' + targetLaneIdx);
  if (laneCars) {
    for (let i = 0; i < laneCars.length; i++) {
      const other = laneCars[i];
      if (other === car) continue;
      const pos = other._segPos || carFullSegPos(other);
      if (!pos || pos.segT <= myPos.segT + 0.002) continue;
      const gap = (pos.segT - myPos.segT) * fullSegLen;
      if (gap < bestGap) { bestGap = gap; bestSpeed = other.speed; }
    }
  }
  if (bestGap > ALLIE_CONFIG.DETECT_RING_OUTER) return ALLIE_CONFIG.CRUISE_SPEED;
  return bestSpeed;
}

function recomputeRouteCum(legs) {
  let cum = 0;
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    leg.length = leg.atom.isLaneChangeBlend
      ? Math.max(0.001, leg.atom.length)
      : Math.max(0.001, leg.atom.length * (leg.tEnd - leg.tStart));
    leg.cumStart = cum;
    leg.cumEnd = cum + leg.length;
    cum += leg.length;
  }
  return cum;
}

// Dijkstra from a stub (e.g. the exit of a lanechange edge) to a destination
// pick — the same machinery allieFindPath uses, just starting from a graph
// node instead of a spawn atom+t.
function pathFromStubToDest(originStub, destPick) {
  if (!destPick || !destPick.atom) return null;
  const destAtom = destPick.atom;
  if (!destAtom.originStub) return null;
  const middle = allieDijkstra(originStub, destAtom.originStub);
  if (!middle) return null;
  const legs = middle.map(atom => ({ atom, tStart: 0, tEnd: 1 }));
  legs.push({ atom: destAtom, tStart: 0, tEnd: destPick.t });
  return legs.filter(leg => leg.tEnd - leg.tStart > 0.0005);
}

// Straight-through lane atom leaving a window entry stub (the default —
// cars do NOT have to change lanes at every window).
function findStraightLaneFromStub(stub) {
  if (!stub) return null;
  const outs = allieOutByStub.get(stub) || [];
  for (let i = 0; i < outs.length; i++) {
    if (outs[i].kind === 'lane') return outs[i];
  }
  return null;
}

// Skip a blocked lane-change window: stay in the current lane through the
// window, then re-path to the destination (may pick a later window if the
// other lane is still required). Returns false if going straight can't
// reach the dest at all (force-merge instead).
function abortLaneChangeGoStraight(car) {
  const found = findUpcomingLaneChangeLeg(car);
  if (!found || found.active) return false;
  const lcAtom = found.leg.atom;
  let lcIndex = -1;
  for (let i = car.legIndex; i < car.route.length; i++) {
    if (car.route[i].atom === lcAtom) { lcIndex = i; break; }
  }
  if (lcIndex < 0) return false;

  const straight = findStraightLaneFromStub(lcAtom.originStub);
  if (!straight || !straight.destStub) return false;

  const newTail = pathFromStubToDest(straight.destStub, car.destPick);
  if (!newTail || !newTail.length) return false;

  const prefix = car.route.slice(0, lcIndex);
  const straightLeg = { atom: straight, tStart: 0, tEnd: 1, length: 0, cumStart: 0, cumEnd: 0 };
  const tailLegs = newTail.map(nl => ({
    atom: nl.atom, tStart: nl.tStart, tEnd: nl.tEnd, length: 0, cumStart: 0, cumEnd: 0
  }));
  const newLegs = [...prefix, straightLeg, ...tailLegs];
  car.totalLength = recomputeRouteCum(newLegs);
  car.route = newLegs;
  car._pendingLaneChangeAtomId = null;
  car._laneChangeWaitT = 0;
  car._laneChangeForce = false;
  if (car.selected) updateRouteHighlight(car);
  return true;
}

// Splice a discretionary overtake into the car's committed route: keep
// everything up through the window's entry, take the lanechange edge, then
// re-run Dijkstra from its exit straight to the car's real destination —
// which already accounts for any further lane changes needed downstream.
function attemptOvertakeSplice(car, viaLegIndex, lcAtom) {
  const newTail = pathFromStubToDest(lcAtom.destStub, car.destPick);
  if (!newTail || !newTail.length) return false;

  const prefix = car.route.slice(0, viaLegIndex + 1);
  const lcLeg = { atom: lcAtom, tStart: 0, tEnd: 1, length: 0, cumStart: 0, cumEnd: 0 };
  const tailLegs = newTail.map(nl => ({ atom: nl.atom, tStart: nl.tStart, tEnd: nl.tEnd, length: 0, cumStart: 0, cumEnd: 0 }));

  const newLegs = [...prefix, lcLeg, ...tailLegs];
  car.totalLength = recomputeRouteCum(newLegs);
  car.route = newLegs;
  if (car.selected) updateRouteHighlight(car);
  return true;
}

// Periodic (not per-frame) check: is there a slow car ahead and a window
// coming up that leads to a clearer lane? If so, plan to take it — the
// approach/gap negotiation above handles the actual safe execution.
function evaluateOvertakeOpportunity(car) {
  if (car.state !== 'driving') return;
  if (findUpcomingLaneChangeLeg(car)) return; // already mid-approach or merging
  if (car._laneChangeWaitT > 0) return;

  const obs = car._lastObstruction;
  if (!obs || !obs.other) return;
  if (obs.gap > ALLIE_CONFIG.DETECT_RING_MID) return;
  if (obs.speed > ALLIE_CONFIG.CRUISE_SPEED - ALLIE_CONFIG.OVERTAKE_SPEED_DEFICIT) return;
  // Most drivers just wait; only impatient ones bother weaving for an overtake
  if (Math.random() > car.overtakeTendency * 0.25) return;

  const route = car.route;
  let alts = null, viaLegIndex = -1;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind === 'turn') break;
    if (leg.atom.kind !== 'lane' || !leg.atom.destStub) continue;
    const dist = leg.cumEnd - car.traveledLength;
    if (dist > ALLIE_CONFIG.LANE_DECISION_LOOKAHEAD) break;
    const candidates = (allieOutByStub.get(leg.atom.destStub) || []).filter(a => a.kind === 'lanechange');
    if (candidates.length) { alts = candidates; viaLegIndex = i; break; }
  }
  if (!alts) return;

  let best = null, bestScore = -Infinity;
  alts.forEach(a => {
    const leadSpd = estimateLaneLeadSpeed(car, a.segId, a.toLaneIdx);
    const score = leadSpd - obs.speed;
    if (score > bestScore) { bestScore = score; best = a; }
  });
  if (!best || bestScore < ALLIE_CONFIG.OVERTAKE_MIN_GAIN) return;

  attemptOvertakeSplice(car, viaLegIndex, best);
  car._laneChangeDebug = {
    phase: 'planned',
    plan: 'L' + best.fromLaneIdx + ' → L' + best.toLaneIdx + ' · overtake',
    fromLane: best.fromLaneIdx,
    toLane: best.toLaneIdx,
    blinker: blinkerSideForLaneChange(car, best),
    dist: null,
    gapOk: null, gapAhead: null, gapBehind: null,
    decision: 'discretionary overtake spliced into route',
    waitT: 0,
    force: false
  };
}

// Called once per car per frame — paces overtakes, aborts blocked windows,
// and publishes lane-change "thinking" into car._laneChangeDebug for the overlay.
function updateLaneChangeSystem(car, dt) {
  const wantDebug = debugRingsOn || car.selected || car === hoveredCar;
  const found = findUpcomingLaneChangeLeg(car);
  if (!found) {
    car._laneChangeWaitT = 0;
    car._laneChangeForce = false;
    if (wantDebug) {
      // Still scan route further out so debug shows a planned LC beyond approach range
      let planned = null;
      for (let i = car.legIndex; i < car.route.length; i++) {
        const leg = car.route[i];
        if (leg.atom.kind === 'turn') break;
        if (leg.atom.kind !== 'lanechange') continue;
        planned = { leg, dist: Math.max(0, leg.cumStart - car.traveledLength), active: i === car.legIndex };
        break;
      }
      if (planned) {
        const atom = planned.leg.atom;
        car._laneChangeDebug = {
          phase: 'planned',
          plan: 'L' + atom.fromLaneIdx + ' → L' + atom.toLaneIdx + ' · win ' + atom.windowIdx,
          fromLane: atom.fromLaneIdx,
          toLane: atom.toLaneIdx,
          blinker: blinkerSideForLaneChange(car, atom),
          dist: planned.dist,
          gapOk: null, gapAhead: null, gapBehind: null,
          decision: 'lane change on route (not near window yet)',
          waitT: 0,
          force: false
        };
      } else {
        car._laneChangeDebug = { phase: 'none' };
      }
    } else {
      car._laneChangeDebug = null;
    }
  } else if (found.active) {
    if (wantDebug) {
      const atom = found.leg.atom;
      car._laneChangeDebug = {
        phase: 'merging',
        plan: 'L' + atom.fromLaneIdx + ' → L' + atom.toLaneIdx + ' · win ' + atom.windowIdx,
        fromLane: atom.fromLaneIdx,
        toLane: atom.toLaneIdx,
        blinker: blinkerSideForLaneChange(car, atom),
        dist: 0,
        gapOk: true, gapAhead: null, gapBehind: null,
        decision: 'committed · driving blend',
        waitT: car._laneChangeWaitT || 0,
        force: !!car._laneChangeForce
      };
    }
  } else {
    const atom = found.leg.atom;
    const gap = laneChangeGapCheck(car, atom.segId, atom.toLaneIdx, car._laneChangeForce);
    let decision = 'gap clear · proceed';
    if (!gap.ok) {
      car._laneChangeWaitT = (car._laneChangeWaitT || 0) + dt;
      decision = car._laneChangeForce
        ? 'forcing merge (relaxed gaps)'
        : 'holding · waiting for gap';
      if (car._laneChangeWaitT >= ALLIE_CONFIG.LANE_CHANGE_WAIT_ABORT) {
        if (!abortLaneChangeGoStraight(car)) {
          car._laneChangeForce = true;
          car._laneChangeWaitT = 0;
          decision = 'abort failed · forcing merge';
        } else {
          if (wantDebug) {
            car._laneChangeDebug = {
              phase: 'aborted',
              plan: 'stay in lane (skipped window)',
              fromLane: atom.fromLaneIdx,
              toLane: atom.fromLaneIdx,
              blinker: null,
              dist: null,
              gapOk: false,
              gapAhead: gap.aheadGap,
              gapBehind: gap.behindGap,
              decision: 'aborted · stayed in lane',
              waitT: ALLIE_CONFIG.LANE_CHANGE_WAIT_ABORT,
              force: false
            };
          }
          car.overtakeTimer -= dt;
          if (car.overtakeTimer <= 0) {
            car.overtakeTimer = ALLIE_CONFIG.OVERTAKE_CHECK_INTERVAL * (0.85 + Math.random() * 0.3);
            evaluateOvertakeOpportunity(car);
          }
          return;
        }
      }
    } else {
      car._laneChangeWaitT = 0;
    }

    if (wantDebug) {
      const blinker = blinkerSideForLaneChange(car, atom);
      let phase = 'approaching';
      if (!gap.ok) phase = car._laneChangeForce ? 'forcing' : 'waiting';
      car._laneChangeDebug = {
        phase,
        plan: 'L' + atom.fromLaneIdx + ' → L' + atom.toLaneIdx + ' · win ' + atom.windowIdx,
        fromLane: atom.fromLaneIdx,
        toLane: atom.toLaneIdx,
        blinker,
        dist: found.dist,
        gapOk: gap.ok,
        gapAhead: gap.aheadGap,
        gapBehind: gap.behindGap,
        aheadId: gap.ahead ? gap.ahead.id : null,
        behindId: gap.behind ? gap.behind.id : null,
        decision,
        waitT: car._laneChangeWaitT || 0,
        force: !!car._laneChangeForce
      };
    }
  }

  car.overtakeTimer -= dt;
  if (car.overtakeTimer <= 0) {
    car.overtakeTimer = ALLIE_CONFIG.OVERTAKE_CHECK_INTERVAL * (0.85 + Math.random() * 0.3);
    evaluateOvertakeOpportunity(car);
  }
}

// Courtesy: ease off for a neighbor that's approaching-or-inside a lane
// change targeting our lane, so the merge doesn't force them to stop dead.
function mergeCourtesyConstraintFor(car) {
  if (car.isProbe) return null;
  const myPos = car._segPos || carFullSegPos(car);
  if (!myPos) return null;

  let best = null;
  // Mergers into our lane are nearby; don't scan the whole fleet.
  const cx = car._cx != null ? car._cx : car.x;
  const cy = car._cy != null ? car._cy : car.y;
  const nearby = collectNearbyCars(cx, cy, ALLIE_CONFIG.COURTESY_RANGE + ALLIE_CONFIG.CAR_LENGTH * 2);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.state === 'despawning') continue;
    const found = findUpcomingLaneChangeLeg(other);
    if (!found) continue;
    const atom = found.leg.atom;
    if (atom.segId !== myPos.segId || atom.toLaneIdx !== myPos.laneIdx) continue;

    const oPos = other._segPos || carFullSegPos(other);
    if (!oPos) continue;
    const gap = (oPos.segT - myPos.segT) * (atom.fullSegLen || myPos.fullSegLen || 1);
    if (gap < -ALLIE_CONFIG.CAR_LENGTH * 0.5) continue;
    if (gap > ALLIE_CONFIG.COURTESY_RANGE) continue;

    const heat = 1 - Math.max(0, gap) / ALLIE_CONFIG.COURTESY_RANGE;
    if (!best || heat > best.heat) best = { other, heat, gap };
  }
  if (!best) return null;

  const ease = ALLIE_CONFIG.COURTESY_EASE_FACTOR * car.courtesyTendency * (0.45 + 0.55 * best.heat);
  if (ease < 0.08) return null;
  const desired = ALLIE_CONFIG.CRUISE_SPEED * (1 - ease);
  return {
    desired: Math.max(0, desired),
    decelRate: ALLIE_CONFIG.DECEL_NORMAL,
    status: 'Letting merge'
  };
}

function turnTypeToSignal(turnType) {
  if (turnType === 'left') return 'left';
  if (turnType === 'right') return 'right';
  if (turnType === 'uturn') return 'left';
  return null;
}

// Which blinker lamp should light for this lane-change atom: whichever side
// of the car the *target lane* sits on right now (not a baked path cross).
function blinkerSideForLaneChange(car, atom) {
  if (!atom || atom.kind !== 'lanechange') return null;
  // End of the blend sits fully on the target lane
  const target = atom.sampleAtT(1);
  const ddx = target.x - car.x;
  const ddy = target.y - car.y;
  const sinH = Math.sin(car.heading);
  const cosH = Math.cos(car.heading);
  // Car-local lateral: same axis as blinker lamps (local +Y = right lamp)
  const lat = -ddx * sinH + ddy * cosH;
  if (Math.abs(lat) < 0.15) return atom.signal || null;
  return lat > 0 ? 'right' : 'left';
}

// Which side should blink: null | 'left' | 'right'. Uses whichever comes
// first — a committed turn or an upcoming/active lane change — within the
// blinker lookahead window (same window the car plans braking from).
function getUpcomingSignal(car) {
  const route = car.route;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    const kind = leg.atom.kind;
    if (kind !== 'turn' && kind !== 'lanechange') continue;
    const sig = kind === 'turn'
      ? turnTypeToSignal(leg.atom.turnType)
      : blinkerSideForLaneChange(car, leg.atom);
    if (!sig) continue; // keep looking (don't abort the scan on a straight LC)
    if (i === car.legIndex) return sig;
    const dist = leg.cumStart - car.traveledLength;
    if (dist <= ALLIE_CONFIG.BLINKER_LOOKAHEAD) return sig;
    return null;
  }
  return null;
}

function updateCarBlinkers(car, dt) {
  car.blinkerPhase = (car.blinkerPhase || 0) + dt;
  // Signal side changes slowly — recompute every other frame
  if (((tickFrame + car.id) & 1) === 0 || car._blinkerSignal === undefined) {
    car._blinkerSignal = getUpcomingSignal(car);
  }
  const signal = car._blinkerSignal;
  const on = signal && (car.blinkerPhase % ALLIE_CONFIG.BLINKER_PERIOD) < ALLIE_CONFIG.BLINKER_PERIOD * 0.52;
  const leftOn = signal === 'left' && on;
  const rightOn = signal === 'right' && on;
  setSvgOpacity(car.blinkerEls.left, leftOn ? '0.98' : '0.08');
  setSvgOpacity(car.blinkerEls.right, rightOn ? '0.98' : '0.08');
  if (car.roofBlinkerEls) {
    setSvgOpacity(car.roofBlinkerEls.left, leftOn ? '1' : '0.12');
    setSvgOpacity(car.roofBlinkerEls.right, rightOn ? '1' : '0.12');
  }
}

// The "RH" speed profile: cruise, brake ahead of turns (harder for sharp
// ones), hold through the turn, then accelerate back out; brake to a stop
// on approach to the destination; obey traffic signals (yellow dilemma,
// red stop, right-on-red creep).
function findUpcomingSignalTurn(car) {
  const route = car.route;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind !== 'turn') continue;
    const dist = leg.cumStart - car.traveledLength;
    if (dist > ALLIE_CONFIG.PLANNING_LOOKAHEAD) return null;
    // Upstream lane leg provides segId / laneIdx for the approach
    let laneLeg = null;
    for (let j = i - 1; j >= 0; j--) {
      if (route[j].atom.kind === 'lane') { laneLeg = route[j]; break; }
    }
    if (!laneLeg) continue;
    return {
      turnLegIndex: i,
      turnLeg: leg,
      laneLeg,
      dist,
      nodeKey: leg.atom.nodeKey,
      turnType: leg.atom.turnType,
      segId: laneLeg.atom.segId,
      laneIdx: laneLeg.atom.laneIdx
    };
  }
  return null;
}

function signalConstraintFor(car) {
  if (typeof movementDisplay !== 'function') return null;
  if (car.isProbe) return null;

  const info = findUpcomingSignalTurn(car);
  if (!info) {
    // Clear latch once past all upcoming signals
    if (car.signalDecision && car.traveledLength >= (car.route[car.signalDecision.turnLegIndex]?.cumStart || Infinity)) {
      // past stop line of latched turn — leave cleared until next signal
    }
    return null;
  }

  const { turnLegIndex, dist, nodeKey, turnType, segId, laneIdx } = info;
  const stopDist = Math.max(0, dist - ALLIE_CONFIG.STOP_LINE_GAP);

  // Reuse latch for the same turn leg
  let decision = car.signalDecision;
  if (decision && decision.turnLegIndex !== turnLegIndex) {
    decision = null;
    car.signalDecision = null;
    car.rorPhase = null;
    car.signalTimer = 0;
  }

  const display = movementDisplay(nodeKey, segId, laneIdx, turnType);

  // Past the stop line — only clear/commit if we are allowed through.
  // On red with a stop latch, keep holding so left arrows (and balls) are obeyed.
  if (dist <= 0.15) {
    if (display === 'off' || display === 'green' || (decision && decision.choice === 'commit')) {
      car.signalDecision = { turnLegIndex, choice: 'commit' };
      car.rorPhase = null;
      return null;
    }
    if (display === 'red' && decision && decision.choice === 'stop') {
      return { desired: 0, decelRate: ALLIE_CONFIG.SIGNAL_DECEL, status: 'Red light' };
    }
  }

  if (display === 'off' || display === 'green') {
    // Green / off: clear any stop/ror latch for this leg
    if (decision && (decision.choice === 'stop' || decision.choice === 'ror')) {
      car.signalDecision = null;
      car.rorPhase = null;
      car.signalTimer = 0;
      decision = null;
    }
    if (decision && decision.choice === 'commit') return null;
    return null;
  }

  if (display === 'yellow') {
    if (decision && decision.choice === 'commit') return null;
    if (decision && decision.choice === 'stop') {
      return stopConstraint(car, stopDist);
    }
    // Dilemma zone only: commit if we cannot stop comfortably.
    // Do NOT commit just because yellow time * speed > dist — that made
    // nearly every car in PLANNING_LOOKAHEAD go, then run the next red
    // (very visible on protected lefts, where left stays red all through-green).
    const cannotStopComfortably =
      stopDist < (car.speed * car.speed) / (2 * ALLIE_CONFIG.SIGNAL_DECEL) + car.speed * ALLIE_CONFIG.SIGNAL_REACTION;
    if (cannotStopComfortably) {
      car.signalDecision = { turnLegIndex, choice: 'commit' };
      return null;
    }
    car.signalDecision = { turnLegIndex, choice: 'stop' };
    return stopConstraint(car, stopDist);
  }

  // RED
  if (decision && decision.choice === 'commit') return null;

  // Right on red: stop → creep → go
  const rorOk = turnType === 'right' && typeof isRightOnRedAllowed === 'function' && isRightOnRedAllowed(nodeKey);
  if (rorOk) {
    if (!decision || decision.choice !== 'ror') {
      car.signalDecision = { turnLegIndex, choice: 'ror' };
      car.rorPhase = 'approaching';
      car.signalTimer = 0;
      decision = car.signalDecision;
    }
    return rightOnRedConstraint(car, stopDist);
  }

  // Solid red — stop (includes protected-left red during through green)
  car.signalDecision = { turnLegIndex, choice: 'stop' };
  return stopConstraint(car, stopDist);
}

function stopConstraint(car, stopDist) {
  const rate = ALLIE_CONFIG.SIGNAL_DECEL;
  // Kinematic max speed that still allows a stop at the line
  const target = Math.sqrt(Math.max(0, 2 * rate * Math.max(stopDist, 0)));
  if (stopDist <= 0.4) {
    return { desired: 0, decelRate: rate, status: 'Red light' };
  }
  if (target >= ALLIE_CONFIG.CRUISE_SPEED - 0.5) return null;
  return { desired: Math.max(0, target), decelRate: rate, status: 'Red light' };
}

function rightOnRedConstraint(car, stopDist) {
  // Phases: approaching (brake to stop) → stopped (dwell) → creep → cleared
  if (car.rorPhase === 'cleared') return null;

  if (car.rorPhase === 'creep') {
    return {
      desired: ALLIE_CONFIG.ROR_CREEP_SPEED,
      decelRate: ALLIE_CONFIG.SIGNAL_DECEL,
      status: 'Right on red'
    };
  }

  if (car.rorPhase === 'stopped') {
    return { desired: 0, decelRate: ALLIE_CONFIG.SIGNAL_DECEL, status: 'Right on red' };
  }

  // approaching: brake to stop line
  const c = stopConstraint(car, stopDist);
  if (!c) return null;
  return { desired: c.desired, decelRate: c.decelRate, status: 'Right on red' };
}

function advanceRightOnRed(car, dt) {
  if (!car.signalDecision || car.signalDecision.choice !== 'ror') return;
  if (car.rorPhase === 'cleared') return;

  const info = findUpcomingSignalTurn(car);
  // If we've entered the turn, clear
  if (!info || info.turnLegIndex !== car.signalDecision.turnLegIndex || info.dist <= 0.15) {
    car.rorPhase = 'cleared';
    car.signalDecision = { turnLegIndex: car.signalDecision.turnLegIndex, choice: 'commit' };
    return;
  }

  if (car.rorPhase === 'approaching' || car.rorPhase == null) {
    const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
    if (stopDist <= 0.5 && car.speed <= 0.6) {
      car.rorPhase = 'stopped';
      car.signalTimer = 0;
    }
    return;
  }

  if (car.rorPhase === 'stopped') {
    car.signalTimer += dt;
    if (car.signalTimer >= ALLIE_CONFIG.ROR_DWELL) {
      car.rorPhase = 'creep';
      car.signalTimer = 0;
    }
    return;
  }

  if (car.rorPhase === 'creep') {
    car.signalTimer += dt;
    if (car.signalTimer >= ALLIE_CONFIG.ROR_CREEP_TIME || info.dist <= 0.15) {
      car.rorPhase = 'cleared';
      car.signalDecision = { turnLegIndex: car.signalDecision.turnLegIndex, choice: 'commit' };
    }
  }
}

// ---------------- Car geometry (OBB) + forward / peripheral / junction awareness ----------------

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function carCenter(car) {
  // Prefer per-tick pose cache (set by rebuildCarIndexes / refreshCarPoseCache).
  if (car._cx != null) return { x: car._cx, y: car._cy };
  const midFromRear = ALLIE_CONFIG.CAR_LENGTH * 0.5 - ALLIE_CONFIG.REAR_OVERHANG;
  const cos = Math.cos(car.heading), sin = Math.sin(car.heading);
  return { x: car.x + cos * midFromRear, y: car.y + sin * midFromRear };
}

function carOBB(car) {
  const cx = car._cx != null ? car._cx : carCenter(car).x;
  const cy = car._cy != null ? car._cy : carCenter(car).y;
  return {
    cx, cy,
    heading: car.heading,
    hl: ALLIE_CONFIG.CAR_LENGTH * 0.5,
    hw: ALLIE_CONFIG.CAR_WIDTH * 0.5
  };
}

// Separating-axis test for two oriented boxes. `margin` expands each half-extent.
function obbOverlap(a, b, margin) {
  margin = margin || 0;
  const axes = [
    { x: Math.cos(a.heading), y: Math.sin(a.heading) },
    { x: -Math.sin(a.heading), y: Math.cos(a.heading) },
    { x: Math.cos(b.heading), y: Math.sin(b.heading) },
    { x: -Math.sin(b.heading), y: Math.cos(b.heading) }
  ];
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const ahl = a.hl + margin, ahw = a.hw + margin;
  const bhl = b.hl + margin, bhw = b.hw + margin;
  for (let i = 0; i < 4; i++) {
    const ax = axes[i].x, ay = axes[i].y;
    const dist = Math.abs(dx * ax + dy * ay);
    const ra = Math.abs(axes[0].x * ax + axes[0].y * ay) * ahl
             + Math.abs(axes[1].x * ax + axes[1].y * ay) * ahw;
    const rb = Math.abs(axes[2].x * ax + axes[2].y * ay) * bhl
             + Math.abs(axes[3].x * ax + axes[3].y * ay) * bhw;
    if (dist > ra + rb) return false;
  }
  return true;
}

// Closest point on `car`'s route polyline to (wx, wy) within [sMin, sMax].
function projectPointOntoCarRoute(car, wx, wy, sMin, sMax) {
  sMin = Math.max(0, sMin);
  sMax = Math.min(car.totalLength, sMax);
  if (sMax <= sMin + 0.001) return null;

  const coarse = 3.0;
  let best = null;
  let bestDSq = Infinity;
  for (let s = sMin; s <= sMax; s += coarse) {
    const p = sampleRouteAtDistance(car, s);
    if (!p) continue;
    const ddx = wx - p.x, ddy = wy - p.y;
    const dSq = ddx * ddx + ddy * ddy;
    if (dSq < bestDSq) {
      bestDSq = dSq;
      best = { s, lat: Math.sqrt(dSq), tx: p.tx, ty: p.ty, x: p.x, y: p.y };
    }
  }
  const end = sampleRouteAtDistance(car, sMax);
  if (end) {
    const ddx = wx - end.x, ddy = wy - end.y;
    const dSq = ddx * ddx + ddy * ddy;
    if (dSq < bestDSq) {
      bestDSq = dSq;
      best = { s: sMax, lat: Math.sqrt(dSq), tx: end.tx, ty: end.ty, x: end.x, y: end.y };
    }
  }
  if (!best) return null;

  // Skip fine pass when already clearly off-corridor (saves a lot at density).
  if (best.lat > ALLIE_CONFIG.DETECT_CORRIDOR_HALF * 2.5) return best;

  const lo = Math.max(sMin, best.s - coarse);
  const hi = Math.min(sMax, best.s + coarse);
  for (let s = lo; s <= hi; s += 0.5) {
    const p = sampleRouteAtDistance(car, s);
    if (!p) continue;
    const ddx = wx - p.x, ddy = wy - p.y;
    const dSq = ddx * ddx + ddy * ddy;
    if (dSq < bestDSq) {
      bestDSq = dSq;
      best = { s, lat: Math.sqrt(dSq), tx: p.tx, ty: p.ty, x: p.x, y: p.y };
    }
  }
  return best;
}

// Nearest lead hazard on this car's upcoming route corridor (works through turns).
// Returns { gap, speed, other, proj } or null.
function findNearestObstruction(car) {
  if (car.isProbe || !car.route || car.route.length === 0) return null;

  const lookMax = ALLIE_CONFIG.DETECT_RING_OUTER + ALLIE_CONFIG.CAR_LENGTH + 4;
  const corridorHalf = ALLIE_CONFIG.DETECT_CORRIDOR_HALF;
  const corridorHalfSq = corridorHalf * corridorHalf;
  const prefilterR = lookMax + ALLIE_CONFIG.CAR_LENGTH * 0.5 + 8;
  const egoX = car._cx, egoY = car._cy;
  const cosH = car._cosH, sinH = car._sinH;
  if (egoX == null) return null;

  let best = null;
  const myPos = car._segPos;

  // Fast path: same-lane bumper gap from occupancy index (no route projection).
  if (myPos) {
    const laneCars = laneOccupancy.get(myPos.segId + ':' + myPos.laneIdx);
    if (laneCars) {
      const fullSegLen = myPos.fullSegLen || 1;
      for (let i = 0; i < laneCars.length; i++) {
        const other = laneCars[i];
        if (other === car || other.state === 'despawning') continue;
        const pos = other._segPos;
        if (!pos || pos.segT <= myPos.segT + 0.002) continue;
        const gap = (pos.segT - myPos.segT) * fullSegLen - ALLIE_CONFIG.CAR_LENGTH;
        if (gap > lookMax || gap < -1.5) continue;
        if (!best || gap < best.gap) best = { gap, speed: other.speed, other, proj: null };
      }
    }
    // Close same-lane lead dominates; skip expensive bend scan.
    if (best && best.gap <= ALLIE_CONFIG.DETECT_RING_INNER) return best;
  }

  // Sample ego path once, then test neighbors against those points (much cheaper
  // than projecting every neighbor onto the full route).
  const step = 7;
  let nSamp = 0;
  const sEnd = Math.min(car.totalLength, car.traveledLength + lookMax);
  for (let s = car.traveledLength + 1.5; s <= sEnd && nSamp < _pathSamples.length - 1; s += step) {
    const p = sampleRouteAtDistance(car, s);
    if (!p) continue;
    const samp = _pathSamples[nSamp++];
    samp.s = s; samp.x = p.x; samp.y = p.y;
  }
  {
    const p = sampleRouteAtDistance(car, sEnd);
    if (p) {
      const samp = _pathSamples[nSamp++];
      samp.s = sEnd; samp.x = p.x; samp.y = p.y;
    }
  }
  if (!nSamp) return best;

  const nearby = collectNearbyCars(egoX, egoY, prefilterR);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    // Already considered via same-lane index
    if (myPos && other._segPos
        && other._segPos.segId === myPos.segId
        && other._segPos.laneIdx === myPos.laneIdx) continue;

    const ocx = other._cx, ocy = other._cy;
    const dx = ocx - egoX, dy = ocy - egoY;
    const fwdWorld = dx * cosH + dy * sinH;
    if (fwdWorld < ALLIE_CONFIG.CAR_LENGTH * 0.15) continue;

    let bestLatSq = Infinity, bestS = 0;
    for (let k = 0; k < nSamp; k++) {
      const samp = _pathSamples[k];
      const ddx = ocx - samp.x, ddy = ocy - samp.y;
      const dSq = ddx * ddx + ddy * ddy;
      if (dSq < bestLatSq) { bestLatSq = dSq; bestS = samp.s; }
    }
    if (bestLatSq > corridorHalfSq) continue;
    if (bestS < car.traveledLength + 0.4) continue;

    const gap = (bestS - car.traveledLength) - ALLIE_CONFIG.CAR_LENGTH;
    if (gap < -1.5) continue;
    if (!best || gap < best.gap) best = { gap, speed: other.speed, other, proj: null };
  }
  return best;
}

// Soft "heat-map" caution from nearby off-path cars (adjacent lanes, converging traffic).
// Returns 0..1. Direct path hazards are handled by findNearestObstruction and skipped here.
function computePeripheralCaution(car) {
  if (car.isProbe || !cars.length) return 0;

  const radius = ALLIE_CONFIG.SIDE_DETECT_RADIUS;
  const halfCone = (ALLIE_CONFIG.SIDE_DETECT_CONE_DEG * Math.PI / 180) * 0.5;
  const cosH = car._cosH, sinH = car._sinH;
  const egoX = car._cx, egoY = car._cy;
  if (egoX == null) return 0;
  const corridorHalf = ALLIE_CONFIG.DETECT_CORRIDOR_HALF;
  const pathHazard = car._lastObstruction;

  let caution = 0;
  const nearby = collectNearbyCars(egoX, egoY, radius);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    if (pathHazard && pathHazard.other === other) continue;

    const dx = other._cx - egoX, dy = other._cy - egoY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 0.01) continue;

    const dist = Math.sqrt(distSq);
    const fwd = dx * cosH + dy * sinH;
    if (fwd < -ALLIE_CONFIG.CAR_LENGTH * 0.3) continue;
    const lat = -dx * sinH + dy * cosH;
    // On-path lead is handled by forward detection — skip with a cheap lateral test
    if (Math.abs(lat) < corridorHalf * 0.9 && fwd > 0) continue;
    const bearing = Math.atan2(lat, fwd);
    if (Math.abs(bearing) > halfCone) continue;

    const prox = 1 - dist / radius;
    const aheadBias = 0.55 + 0.45 * Math.max(0, fwd / dist);
    const score = prox * prox * aheadBias;
    if (score > caution) caution = score;
  }
  return clampNum(caution, 0, 1);
}

function trafficConstraintFor(car) {
  car._trafficStatus = null;
  const obs = findNearestObstruction(car);
  car._lastObstruction = obs;
  if (!obs) return null;

  const gap = obs.gap;
  const MID = ALLIE_CONFIG.DETECT_RING_MID;
  const INNER = ALLIE_CONFIG.DETECT_RING_INNER;
  const FOLLOW = ALLIE_CONFIG.DETECT_FOLLOW_GAP;

  // Outer ring (gap >= MID): noticed, no reaction. Reaction starts inside MID.
  if (gap >= MID) return null;

  // If we're the hard-safety winner vs this "lead" and already overlapping,
  // don't freeze forever — they'll yield / we unstick.
  if (obs.other && gap < FOLLOW * 0.5 && hardSafetyLoser(car, obs.other) === obs.other) {
    car._trafficStatus = 'Unsticking';
    return {
      desired: ALLIE_CONFIG.HARD_SAFETY_CREEP,
      decelRate: ALLIE_CONFIG.DECEL_NORMAL,
      status: car._trafficStatus
    };
  }

  const leadV = Math.max(0, obs.speed);
  const closing = Math.max(0, gap - FOLLOW);

  function matchCap(decel) {
    return Math.sqrt(Math.max(0, leadV * leadV + 2 * decel * closing));
  }

  if (gap <= INNER) {
    let desired = matchCap(ALLIE_CONFIG.DECEL_SHARP);
    if (gap <= FOLLOW) {
      // Inside hold gap: crawl with lead, or full stop if lead is nearly stopped
      // and we are inside ~60% of the follow gap (keeps a visible cushion).
      if (leadV < 1.2 && gap <= FOLLOW * 0.65) {
        desired = 0;
      } else {
        desired = Math.min(desired, Math.max(leadV * 0.85, leadV * (gap / Math.max(FOLLOW, 0.01))));
      }
    }
    car._trafficStatus = desired < 0.5 && leadV < 1.5 ? 'Stopped for traffic' : 'Braking for traffic';
    return { desired, decelRate: ALLIE_CONFIG.DECEL_SHARP, status: car._trafficStatus };
  }

  const hard = matchCap(ALLIE_CONFIG.DECEL_NORMAL);
  const t = (gap - INNER) / Math.max(0.01, MID - INNER);
  const cruise = ALLIE_CONFIG.CRUISE_SPEED;
  const desired = hard + t * (cruise - hard);
  car._trafficStatus = 'Following';
  return {
    desired: Math.min(cruise, Math.max(0, desired)),
    decelRate: ALLIE_CONFIG.DECEL_NORMAL,
    status: car._trafficStatus
  };
}

// Unsignalized junctions: first-to-arrive yield using precomputed turn-atom conflicts.
function unsignalizedJunctionConstraintFor(car) {
  if (car.isProbe) return null;

  const info = findUpcomingSignalTurn(car);
  if (!info) {
    car.junctionWait = null;
    car._yieldOther = null;
    return null;
  }

  const nd = nodes.get(info.nodeKey);
  if (!nd) return null;
  const hasActiveSignal = !!(nd.signal && nd.signal.enabled
    && (typeof signalsEnabled === 'undefined' || signalsEnabled));
  if (hasActiveSignal) return null;

  const turnAtom = info.turnLeg.atom;
  if (!turnAtom || !turnAtom.conflicts || turnAtom.conflicts.size === 0) {
    car.junctionWait = null;
    car._yieldOther = null;
    return null;
  }

  const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
  const yieldLook = ALLIE_CONFIG.JUNCTION_YIELD_LOOKAHEAD;

  if (info.dist > yieldLook) {
    car.junctionWait = null;
    car._yieldOther = null;
    return null;
  }

  if (!car.junctionWait || car.junctionWait.turnAtomId !== turnAtom.id) {
    car.junctionWait = { turnAtomId: turnAtom.id, arrivalT: simTime, nodeKey: info.nodeKey };
  }

  if (info.dist <= 0.15 || (car.legIndex === info.turnLegIndex &&
      (car.traveledLength - info.turnLeg.cumStart) / Math.max(info.turnLeg.length, 0.01)
        >= ALLIE_CONFIG.JUNCTION_COMMIT_FRAC)) {
    car._yieldOther = null;
    return null;
  }

  // Anti-deadlock: if we've been waiting too long, take the turn
  const waited = simTime - car.junctionWait.arrivalT;
  if (waited >= ALLIE_CONFIG.JUNCTION_YIELD_TIMEOUT && car.speed < 1.0) {
    car._yieldOther = null;
    return null;
  }

  const myArrival = car.junctionWait.arrivalT;
  let yieldTo = null;

  function considerOther(other, oArrival, committed) {
    if (committed) {
      yieldTo = other;
      return true;
    }
    if (oArrival < myArrival - 0.001 || (Math.abs(oArrival - myArrival) < 0.001 && other.id < car.id)) {
      if (!yieldTo || other.id < yieldTo.id) yieldTo = other;
    }
    return false;
  }

  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const nearby = collectNearbyCars(egoX, egoY, yieldLook * 2 + 30);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.state === 'despawning' || other.isProbe) continue;

    const oLeg = other.route && other.route[other.legIndex];
    if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey
        && turnAtom.conflicts.has(oLeg.atom.id)) {
      const oFrac = (other.traveledLength - oLeg.cumStart) / Math.max(oLeg.length, 0.01);
      if (oFrac >= ALLIE_CONFIG.JUNCTION_COMMIT_FRAC * 0.25) {
        if (considerOther(other, -Infinity, true)) break;
        continue;
      }
      if (oFrac < 0.85) {
        const oArrival = (other.junctionWait && other.junctionWait.turnAtomId === oLeg.atom.id)
          ? other.junctionWait.arrivalT
          : myArrival + 1;
        considerOther(other, oArrival, false);
      }
      continue;
    }

    const oInfo = findUpcomingSignalTurn(other);
    if (!oInfo || oInfo.nodeKey !== info.nodeKey) continue;
    if (!turnAtom.conflicts.has(oInfo.turnLeg.atom.id)) continue;
    if (oInfo.dist > yieldLook) continue;
    if (oInfo.turnLeg.atom.originStub === turnAtom.originStub) continue;

    const oStop = Math.max(0, oInfo.dist - ALLIE_CONFIG.STOP_LINE_GAP);
    // Ignore distant stopped peers — major early-stuck cause
    if (oStop > stopDist + 14 && other.speed < 2) continue;

    let oArrival;
    if (other.junctionWait && other.junctionWait.turnAtomId === oInfo.turnLeg.atom.id) {
      oArrival = other.junctionWait.arrivalT;
    } else {
      oArrival = myArrival + (oStop - stopDist) * 0.025;
    }
    considerOther(other, oArrival, false);
  }

  car._yieldOther = yieldTo || null;
  if (!yieldTo) return null;

  const ytLeg = yieldTo.route && yieldTo.route[yieldTo.legIndex];
  if (ytLeg && ytLeg.atom.kind === 'turn' && ytLeg.atom.nodeKey === info.nodeKey) {
    const ytFrac = (yieldTo.traveledLength - ytLeg.cumStart) / Math.max(ytLeg.length, 0.01);
    if (ytFrac > 0.92) {
      car._yieldOther = null;
      return null;
    }
  } else if (yieldTo.speed < 0.4) {
    const yc = carCenter(yieldTo);
    const ec = carCenter(car);
    if (Math.hypot(yc.x - ec.x, yc.y - ec.y) > 22) {
      car._yieldOther = null;
      return null;
    }
  }

  const c = stopConstraint(car, stopDist);
  if (!c) {
    if (stopDist < yieldLook) {
      return {
        desired: ALLIE_CONFIG.CRUISE_SPEED * clampNum(stopDist / yieldLook, 0.2, 1),
        decelRate: ALLIE_CONFIG.DECEL_NORMAL,
        status: 'Yielding'
      };
    }
    return null;
  }
  return { desired: c.desired, decelRate: c.decelRate, status: 'Yielding' };
}

// Antisymmetric priority for hard collisions: exactly ONE of the two cars yields.
// Unambiguous rear→front: rear yields. Ambiguous (crossing/side): higher id yields.
function hardSafetyLoser(a, b) {
  const ac = carCenter(a);
  const bc = carCenter(b);
  const dx = bc.x - ac.x, dy = bc.y - ac.y;
  const fwdA = dx * Math.cos(a.heading) + dy * Math.sin(a.heading); // b ahead of a?
  const fwdB = -dx * Math.cos(b.heading) - dy * Math.sin(b.heading); // a ahead of b?

  const CLEAR = ALLIE_CONFIG.CAR_LENGTH * 0.2;
  const aSeesBAhead = fwdA > CLEAR;
  const bSeesAAhead = fwdB > CLEAR;

  if (aSeesBAhead && !bSeesAAhead) return a; // a is rear
  if (bSeesAAhead && !aSeesBAhead) return b; // b is rear

  // Crossing / nose-to-nose / already overlapping: higher id always yields
  return a.id > b.id ? a : b;
}

// Hard OBB safety: returns the other car only if `car` must stop for it.
function wouldCollideAt(car, x, y, heading) {
  const probe = { x, y, heading, id: car.id };
  refreshCarPoseCache(probe);
  const a = carOBB(probe);
  const margin = ALLIE_CONFIG.HARD_SAFETY_MARGIN;
  const reach = ALLIE_CONFIG.CAR_LENGTH + ALLIE_CONFIG.CAR_WIDTH + margin * 2 + 2;
  const acx = probe._cx, acy = probe._cy;

  let worst = null;
  const nearby = collectNearbyCars(acx, acy, reach);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    if (!obbOverlap(a, carOBB(other), margin)) continue;

    // Predicted pose for priority (id + heading from probe, rest from car)
    const probeCar = { id: car.id, x, y, heading, _cx: acx, _cy: acy, _cosH: probe._cosH, _sinH: probe._sinH };
    if (hardSafetyLoser(probeCar, other) !== probeCar) continue; // we win — keep going
    if (!worst) worst = other;
  }
  return worst;
}

function resolveHardSafety(car, nextX, nextY, nextHeading, steer, dt) {
  const hit = wouldCollideAt(car, nextX, nextY, nextHeading);
  if (!hit) {
    car._hardSafetyHit = null;
    car._hardStuckT = 0;
    return { x: nextX, y: nextY, heading: nextHeading, blocked: false };
  }

  car._hardSafetyHit = hit;
  car._hardStuckT = (car._hardStuckT || 0) + dt;

  // We are the loser — stop (or creep if lead is leaving / we've been stuck too long
  // and somehow still blocked — shouldn't force through as loser).
  const oc = carCenter(hit);
  const ec = carCenter(car);
  const away = (oc.x - ec.x) * Math.cos(car.heading) + (oc.y - ec.y) * Math.sin(car.heading);
  const leadLeaving = hit.speed > 2 && away > ALLIE_CONFIG.CAR_LENGTH * 0.45;

  if (leadLeaving) {
    const creep = ALLIE_CONFIG.HARD_SAFETY_CREEP;
    const h = car.heading + (creep / ALLIE_CONFIG.WHEELBASE) * Math.tan(steer) * dt;
    const nx = car.x + Math.cos(h) * creep * dt;
    const ny = car.y + Math.sin(h) * creep * dt;
    if (!wouldCollideAt(car, nx, ny, h)) {
      car.speed = creep;
      car.braking = true;
      return { x: nx, y: ny, heading: h, blocked: true };
    }
  }

  car.speed = 0;
  car.braking = true;
  if (!car._signalStatus) car._signalStatus = 'Blocked';
  return { x: car.x, y: car.y, heading: car.heading, blocked: true };
}

// If two cars are already overlapping while both stopped, the WINNER must be
// allowed to creep out — otherwise neither ever moves (hard safety only runs
// when speed > 0, and traffic may also hold them).
function tryUnstickWinner(car, dt) {
  if (car.speed > 0.15) { car._hardStuckT = 0; return false; }

  const margin = ALLIE_CONFIG.HARD_SAFETY_MARGIN + 0.15;
  const reach = ALLIE_CONFIG.CAR_LENGTH + ALLIE_CONFIG.CAR_WIDTH + 2;
  const ac = car._cx != null ? { x: car._cx, y: car._cy } : carCenter(car);
  const a = carOBB(car);
  let overlappingLoser = null;

  const nearby = collectNearbyCars(ac.x, ac.y, reach);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    if (!obbOverlap(a, carOBB(other), margin)) continue;
    // Only unstick if WE are the winner vs this overlap
    if (hardSafetyLoser(car, other) === car) continue;
    overlappingLoser = other;
    break;
  }
  if (!overlappingLoser) {
    car._hardStuckT = 0;
    return false;
  }

  car._hardStuckT = (car._hardStuckT || 0) + dt;
  if (car._hardStuckT < ALLIE_CONFIG.HARD_SAFETY_STUCK * 0.35) return false;

  // Winner creeps forward along route / heading to break the jam
  const creep = ALLIE_CONFIG.HARD_SAFETY_CREEP;
  car.speed = creep;
  car.braking = false;
  car._signalStatus = 'Unsticking';
  const h = car.heading;
  car.x += Math.cos(h) * creep * dt;
  car.y += Math.sin(h) * creep * dt;
  car.traveledLength = Math.min(car.totalLength, car.traveledLength + creep * dt);
  refreshCarPoseCache(car);
  return true;
}

function computeDesiredSpeed(car) {
  // Approach a pending lane-change window: either a rare risky speed-up to
  // slot into a closing gap, or (applied below) a hold if it's not safe yet.
  const laneApproach = laneChangeApproachConstraintFor(car);
  let desired = (laneApproach && laneApproach.boost) ? laneApproach.desired : ALLIE_CONFIG.CRUISE_SPEED;
  let decelRate = ALLIE_CONFIG.DECEL_NORMAL;
  let signalStatus = (laneApproach && laneApproach.boost) ? laneApproach.status : null;
  const route = car.route;

  const curLeg = route[car.legIndex];
  if (curLeg && curLeg.atom.kind === 'turn' && curLeg.atom.targetSpeed < desired) {
    desired = curLeg.atom.targetSpeed;
    decelRate = curLeg.atom.sharp ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL;
  }
  // Ease off slightly while actually inside the blend — realistic caution,
  // not a hard cap, so the maneuver stays smooth.
  if (curLeg && curLeg.atom.kind === 'lanechange' && desired > ALLIE_CONFIG.CRUISE_SPEED * 0.94) {
    desired = ALLIE_CONFIG.CRUISE_SPEED * 0.94;
  }

  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    const distToLegStart = Math.max(0, leg.cumStart - car.traveledLength);
    if (distToLegStart > ALLIE_CONFIG.PLANNING_LOOKAHEAD) break;
    if (leg.atom.kind === 'turn') {
      const targetSpeed = leg.atom.targetSpeed;
      const rate = leg.atom.sharp ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL;
      const brakingDist = Math.max(0, (car.speed * car.speed - targetSpeed * targetSpeed) / (2 * rate));
      if (distToLegStart <= brakingDist + 0.001 && targetSpeed < desired) {
        desired = targetSpeed;
        decelRate = rate;
      }
    }
  }

  const remaining = Math.max(0, car.totalLength - car.traveledLength);
  const arrivalBrakingDist = Math.max(ALLIE_CONFIG.ARRIVAL_MIN_DIST, (car.speed * car.speed) / (2 * ALLIE_CONFIG.ARRIVAL_DECEL));
  if (remaining <= arrivalBrakingDist) {
    const arrivalTarget = remaining <= 0.5 ? 0 : ALLIE_CONFIG.CRUISE_SPEED * (remaining / arrivalBrakingDist);
    if (arrivalTarget < desired) { desired = Math.max(0, arrivalTarget); decelRate = ALLIE_CONFIG.ARRIVAL_DECEL; }
  }

  const sig = signalConstraintFor(car) || unsignalizedJunctionConstraintFor(car);
  if (sig && sig.desired < desired) {
    desired = sig.desired;
    decelRate = sig.decelRate;
    signalStatus = sig.status;
  }
  // Commit on yellow may still want status for HUD (only when watched)
  if (!signalStatus && car.signalDecision && car.signalDecision.choice === 'commit'
      && (car.selected || car === hoveredCar || debugRingsOn)) {
    const info = findUpcomingSignalTurn(car);
    if (info && info.turnLegIndex === car.signalDecision.turnLegIndex) {
      const d = typeof movementDisplay === 'function'
        ? movementDisplay(info.nodeKey, info.segId, info.laneIdx, info.turnType)
        : 'off';
      if (d === 'yellow') signalStatus = 'Committed (yellow)';
    }
  }
  if (!signalStatus && car.rorPhase && car.rorPhase !== 'cleared') {
    signalStatus = 'Right on red';
  }

  // Forward car detection — applied after signals so red lights still win,
  // but traffic can further cut speed when both apply.
  const traffic = trafficConstraintFor(car);
  if (traffic && traffic.desired < desired) {
    desired = traffic.desired;
    decelRate = Math.max(decelRate, traffic.decelRate);
    if (!signalStatus) signalStatus = traffic.status;
  } else if (!signalStatus && car._trafficStatus) {
    signalStatus = car._trafficStatus;
  }

  // Hold back on approach to a lane-change window if the target lane isn't
  // clear yet — never shove into traffic to force a merge.
  if (laneApproach && !laneApproach.boost && laneApproach.desired < desired) {
    desired = laneApproach.desired;
    decelRate = Math.max(decelRate, laneApproach.decelRate);
    signalStatus = laneApproach.status;
  }

  // Courtesy yield for a car signaling into our lane
  // Stagger soft checks across frames — halves work at density with little behavior change.
  if (((car.id + tickFrame) & 1) === 0) {
    const courtesy = mergeCourtesyConstraintFor(car);
    car._cachedCourtesy = courtesy;
    if (courtesy && courtesy.desired < desired) {
      desired = courtesy.desired;
      decelRate = Math.max(decelRate, courtesy.decelRate);
      if (!signalStatus) signalStatus = courtesy.status;
    }
  } else if (car._cachedCourtesy && car._cachedCourtesy.desired < desired) {
    desired = car._cachedCourtesy.desired;
    decelRate = Math.max(decelRate, car._cachedCourtesy.decelRate);
    if (!signalStatus) signalStatus = car._cachedCourtesy.status;
  }

  // Peripheral ring caution — soft speed cap for nearby off-path cars
  let caution;
  if (((car.id + tickFrame) & 1) === 1) {
    caution = computePeripheralCaution(car);
    car._peripheralCaution = caution;
  } else {
    caution = car._peripheralCaution || 0;
  }
  if (caution > 0.02) {
    const sideCap = ALLIE_CONFIG.CRUISE_SPEED * (1 - ALLIE_CONFIG.SIDE_CAUTION_MAX_SLOWDOWN * caution);
    if (sideCap < desired) {
      desired = sideCap;
      if (!signalStatus) signalStatus = 'Caution';
    }
  }

  // Actively inside the blend — this status wins over everything softer
  if (curLeg && curLeg.atom.kind === 'lanechange') {
    signalStatus = 'Changing lanes';
  }

  car._signalStatus = signalStatus;

  return { desired, decelRate };
}

function updateCar(car, dt) {
  if (car.state === 'despawning') {
    car.despawnT += dt;
    const p = Math.min(1, car.despawnT / ALLIE_CONFIG.DESPAWN_DURATION);
    applyCarTransform(car, 1 - p);
    setSvgOpacity(car.el, String(1 - p));
    if (p >= 1) removeCar(car);
    return;
  }

  // If already jammed overlapping another car, winner creeps out first
  if (tryUnstickWinner(car, dt)) {
    advanceCarLeg(car);
    applyCarTransform(car);
    const lightOpacity = '0.15';
    for (let i = 0; i < car.lightEls.length; i++) setSvgOpacity(car.lightEls[i], lightOpacity);
    updateCarBlinkers(car, dt);
    if (car.selected) {
      updateFollowedCarInfo(car);
      updateFollowTagPosition(car);
    }
    return;
  }

  updateLaneChangeSystem(car, dt);

  const prevSpeed = car.speed;
  const { desired, decelRate } = computeDesiredSpeed(car);
  car._debugDesired = desired;
  if (car.speed < desired - 0.01) {
    car.speed = Math.min(desired, car.speed + ALLIE_CONFIG.ACCEL * dt);
  } else if (car.speed > desired + 0.01) {
    car.speed = Math.max(desired, car.speed - decelRate * dt);
  }
  car._debugAccel = dt > 0.0001 ? (car.speed - prevSpeed) / dt : 0;
  car.braking = car.speed < prevSpeed - 0.01;

  advanceRightOnRed(car, dt);

  // Pure Pursuit: aim for a point Ld ahead along the route, steer toward it
  const Ld = clampNum(car.speed * ALLIE_CONFIG.LOOKAHEAD_K, ALLIE_CONFIG.LOOKAHEAD_MIN, ALLIE_CONFIG.LOOKAHEAD_MAX);
  const target = sampleRouteAtDistance(car, car.traveledLength + Ld);

  let nextX = car.x, nextY = car.y, nextHeading = car.heading;
  let steer = 0;
  if (target && car.speed > 0.02) {
    const dx = target.x - car.x, dy = target.y - car.y;
    const cosH = Math.cos(-car.heading), sinH = Math.sin(-car.heading);
    const localX = dx * cosH - dy * sinH;
    const localY = dx * sinH + dy * cosH;
    const alpha = Math.atan2(localY, localX);
    const rawLd = Math.max(Math.hypot(dx, dy), 0.5);
    steer = Math.atan2(2 * ALLIE_CONFIG.WHEELBASE * Math.sin(alpha), rawLd);
    steer = clampNum(steer, -ALLIE_CONFIG.MAX_STEER, ALLIE_CONFIG.MAX_STEER);

    nextHeading = car.heading + (car.speed / ALLIE_CONFIG.WHEELBASE) * Math.tan(steer) * dt;
    nextX = car.x + Math.cos(nextHeading) * car.speed * dt;
    nextY = car.y + Math.sin(nextHeading) * car.speed * dt;
  }

  if (car.speed > 0.02) {
    const resolved = resolveHardSafety(car, nextX, nextY, nextHeading, steer, dt);
    nextX = resolved.x;
    nextY = resolved.y;
    nextHeading = resolved.heading;
  } else {
    car._hardSafetyHit = null;
  }

  car.heading = nextHeading;
  car.x = nextX;
  car.y = nextY;
  refreshCarPoseCache(car);

  car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt);
  advanceCarLeg(car);

  if (car.traveledLength >= car.totalLength - 0.05 && car.speed <= 0.5) {
    beginDespawn(car);
  }

  applyCarTransform(car);
  const lightOpacity = car.braking ? '0.95' : '0.15';
  for (let i = 0; i < car.lightEls.length; i++) setSvgOpacity(car.lightEls[i], lightOpacity);
  updateCarBlinkers(car, dt);

  if (car.selected) {
    updateFollowedCarInfo(car);
    updateFollowTagPosition(car);
  }
}

// ---------------- Traffic spawners (advanced drive mode) ----------------

function readSpawnerSettingsFromUI() {
  const intervalEl = document.getElementById('spawner-interval');
  const durationEl = document.getElementById('spawner-duration');
  const indefEl = document.getElementById('spawner-indefinite');
  const intervalSec = Math.max(0.5, Number(intervalEl && intervalEl.value) || 3);
  const indefinite = !!(indefEl && indefEl.checked);
  const durationSec = indefinite ? null : Math.max(1, Number(durationEl && durationEl.value) || 60);
  return { intervalSec, durationSec, indefinite };
}

function findSpawnerLanePicks(spawner) {
  const radius = spawner.laneRadius || SPAWNER_LANE_RADIUS;
  const picks = [];
  for (let i = 0; i < allieAtoms.length; i++) {
    const atom = allieAtoms[i];
    if (atom.kind !== 'lane') continue;
    const dx = atom.x2 - atom.x1, dy = atom.y2 - atom.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.0001) continue;
    let t = ((spawner.x - atom.x1) * dx + (spawner.y - atom.y1) * dy) / lenSq;
    if (t < 0.04 || t > 0.96) continue;
    const px = atom.x1 + dx * t, py = atom.y1 + dy * t;
    const dist = Math.hypot(px - spawner.x, py - spawner.y);
    if (dist <= radius) picks.push({ atom, t, x: px, y: py, dist });
  }
  picks.sort((a, b) => a.dist - b.dist);
  return picks;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// Precompute ready-to-spawn routes so each tick spawn is O(1).
function buildSpawnerRouteCache(spawner) {
  const lanePicks = findSpawnerLanePicks(spawner);
  spawner.lanePicks = lanePicks;
  if (!lanePicks.length) {
    spawner.destCount = 0;
    return [];
  }

  const dests = [];
  const seen = new Set();
  for (let i = 0; i < allieAtoms.length; i++) {
    const atom = allieAtoms[i];
    if (atom.kind !== 'lane') continue;
    for (let s = 0; s < SPAWNER_DEST_SAMPLES.length; s++) {
      const frac = SPAWNER_DEST_SAMPLES[s];
      let tooClose = false;
      for (let p = 0; p < lanePicks.length; p++) {
        const probe = lanePicks[p];
        if (probe.atom === atom && frac <= probe.t + 0.08) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      const key = atom.id + ':' + frac.toFixed(2);
      if (seen.has(key)) continue;
      seen.add(key);
      const pt = atom.sampleAtT(frac);
      dests.push({ atom, t: frac, x: pt.x, y: pt.y, key });
    }
  }
  shuffleInPlace(dests);

  const routes = [];
  const destKeys = new Set();
  let tries = 0;
  for (let p = 0; p < lanePicks.length && routes.length < SPAWNER_MAX_ROUTES; p++) {
    const spawnPick = lanePicks[p];
    for (let d = 0; d < dests.length && routes.length < SPAWNER_MAX_ROUTES; d++) {
      if (tries >= SPAWNER_MAX_DEST_TRIES && routes.length > 0) break;
      tries++;
      const dest = dests[d];
      if (spawnPick.atom === dest.atom && spawnPick.t >= dest.t - 0.05) continue;
      const route = allieFindPath(spawnPick, dest);
      if (!route || !route.length) continue;
      routes.push(route);
      destKeys.add(dest.key);
    }
  }
  spawner.destCount = destKeys.size;
  return routes;
}

function refreshSpawnerDestCache(spawner) {
  spawner.routeCache = buildSpawnerRouteCache(spawner);
  spawner.destCache = spawner.routeCache; // legacy alias for UI/count checks
}

function refreshAllSpawnerDestCaches() {
  spawners.forEach(refreshSpawnerDestCache);
}

function drawSpawnerMarker(spawner) {
  if (spawner.el) spawner.el.remove();
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('data-spawner', String(spawner.id));
  const active = spawner.running && !spawnersAllPaused && !simPaused;
  const ring = document.createElementNS(svgNS, 'circle');
  ring.setAttribute('cx', String(spawner.x));
  ring.setAttribute('cy', String(spawner.y));
  ring.setAttribute('r', '3.2');
  ring.setAttribute('fill', 'rgba(255, 160, 60, 0.18)');
  ring.setAttribute('stroke', active ? '#ffb347' : '#888');
  ring.setAttribute('stroke-width', '0.65');
  ring.setAttribute('stroke-dasharray', active ? 'none' : '1.2 1');
  g.appendChild(ring);
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('cx', String(spawner.x));
  dot.setAttribute('cy', String(spawner.y));
  dot.setAttribute('r', '1.5');
  dot.setAttribute('fill', active ? '#ffb347' : '#666');
  g.appendChild(dot);
  driveLayer.appendChild(g);
  spawner.el = g;
}

function updateSpawnerPauseAllButton() {
  const btn = document.getElementById('btn-spawners-pause-all');
  if (!btn) return;
  btn.textContent = spawnersAllPaused ? 'Resume all spawners' : 'Pause all spawners';
  btn.classList.toggle('active', spawnersAllPaused);
}

function updateSpawnerListUI() {
  updateSpawnerPauseAllButton();
  const list = document.getElementById('spawner-list');
  if (!list) return;
  if (!spawners.length) {
    list.innerHTML = '<div class="spawner-empty">No spawners placed</div>';
    return;
  }
  list.innerHTML = spawners.map(sp => {
    const dests = sp.destCount != null
      ? sp.destCount
      : (sp.routeCache ? sp.routeCache.length : (sp.destCache ? sp.destCache.length : 0));
    const routes = sp.routeCache ? sp.routeCache.length : dests;
    const timeLeft = sp.indefinite ? '∞' : Math.max(0, Math.ceil((sp.durationSec || 0) - sp.elapsed)) + 's';
    let status;
    if (simPaused) status = 'sim paused';
    else if (spawnersAllPaused) status = 'all paused';
    else if (!sp.running) status = 'paused';
    else status = 'on · ' + timeLeft;
    return '<div class="spawner-row" data-spawner-id="' + sp.id + '">' +
      '<div class="spawner-row-title">#' + sp.id + ' · every ' + sp.intervalSec + 's · ' + routes + ' routes · ' + status + '</div>' +
      '<div class="spawner-row-actions">' +
      '<button type="button" class="lane-btn sig-mini" data-spawner-action="toggle">' + (sp.running ? 'Pause' : 'Start') + '</button>' +
      '<button type="button" class="lane-btn sig-mini" data-spawner-action="remove">Del</button>' +
      '</div></div>';
  }).join('');
}

function ensureSpawnerListClicks() {
  const list = document.getElementById('spawner-list');
  if (!list || list._spawnerClicksBound) return;
  list._spawnerClicksBound = true;
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-spawner-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const row = btn.closest('[data-spawner-id]');
    if (!row) return;
    const id = Number(row.getAttribute('data-spawner-id'));
    const action = btn.getAttribute('data-spawner-action');
    if (action === 'toggle') toggleSpawnerRunning(id);
    else if (action === 'remove') removeSpawner(id);
  });
}

function setSpawnerPlaceMode(on) {
  spawnerPlaceMode = !!on;
  if (spawnerPlaceMode) clearPendingSpawn();
  const btn = document.getElementById('btn-spawner-place');
  if (btn) {
    btn.textContent = spawnerPlaceMode ? 'Cancel place' : 'Place spawner';
    btn.classList.toggle('active', spawnerPlaceMode);
  }
  updateDriveHudText();
}

function toggleSpawnerPlaceMode() {
  setSpawnerPlaceMode(!spawnerPlaceMode);
}

function placeSpawner(pick) {
  const settings = readSpawnerSettingsFromUI();
  const spawner = {
    id: spawnerIdCounter++,
    x: pick.x,
    y: pick.y,
    laneRadius: SPAWNER_LANE_RADIUS,
    intervalSec: settings.intervalSec,
    durationSec: settings.durationSec,
    indefinite: settings.indefinite,
    elapsed: 0,
    timer: 0,
    running: true,
    destCache: [],
    routeCache: [],
    destCount: 0,
    el: null
  };
  refreshSpawnerDestCache(spawner);
  if (!spawner.routeCache.length) {
    showDriveToast('No reachable destinations from here');
    return;
  }
  spawners.push(spawner);
  drawSpawnerMarker(spawner);
  updateSpawnerListUI();
  showDriveToast('Spawner #' + spawner.id + ' placed · ' + spawner.routeCache.length + ' routes');
}

function removeSpawner(id) {
  id = Number(id);
  const idx = spawners.findIndex(s => s.id === id);
  if (idx < 0) return;
  if (spawners[idx].el) spawners[idx].el.remove();
  spawners.splice(idx, 1);
  updateSpawnerListUI();
}

function toggleSpawnerRunning(id) {
  id = Number(id);
  const sp = spawners.find(s => s.id === id);
  if (!sp) return;
  sp.running = !sp.running;
  if (sp.running) sp.timer = 0;
  drawSpawnerMarker(sp);
  updateSpawnerListUI();
}

function setAllSpawnersPaused(paused) {
  spawnersAllPaused = !!paused;
  spawners.forEach(drawSpawnerMarker);
  updateSpawnerListUI();
}

function toggleAllSpawnersPaused() {
  spawnersAllPaused = !spawnersAllPaused;
  if (!spawnersAllPaused) {
    // Coming back: leave individual Start/Pause states as they were, just unmute
    spawners.forEach(sp => { if (sp.running) sp.timer = 0; });
  }
  spawners.forEach(drawSpawnerMarker);
  updateSpawnerListUI();
}

function pauseAllSpawners() {
  spawnersAllPaused = true;
  spawners.forEach(drawSpawnerMarker);
  updateSpawnerListUI();
}

function clearAllSpawners() {
  spawners.forEach(sp => { if (sp.el) sp.el.remove(); });
  spawners = [];
  spawnerIdCounter = 1;
  spawnersAllPaused = false;
  updateSpawnerListUI();
}

function exportMapSpawners() {
  return spawners.map(s => ({
    id: s.id,
    x: s.x,
    y: s.y,
    laneRadius: s.laneRadius,
    intervalSec: s.intervalSec,
    durationSec: s.durationSec,
    indefinite: s.indefinite,
    elapsed: s.elapsed,
    timer: s.timer,
    running: s.running
  }));
}

function importMapSpawners(data) {
  clearAllSpawners();
  if (!Array.isArray(data) || !data.length) return;
  data.forEach(item => {
    const spawner = {
      id: item.id || spawnerIdCounter++,
      x: item.x,
      y: item.y,
      laneRadius: item.laneRadius || SPAWNER_LANE_RADIUS,
      intervalSec: item.intervalSec || 3,
      durationSec: item.durationSec,
      indefinite: item.indefinite !== false && item.durationSec == null,
      elapsed: item.elapsed || 0,
      timer: item.timer || 0,
      running: item.running !== false,
      destCache: [],
      routeCache: [],
      destCount: 0,
      el: null
    };
    if (spawner.id >= spawnerIdCounter) spawnerIdCounter = spawner.id + 1;
    refreshSpawnerDestCache(spawner);
    if (!spawner.routeCache.length) return;
    spawners.push(spawner);
    drawSpawnerMarker(spawner);
  });
  updateSpawnerListUI();
}

function resetSimulationForMapLoad() {
  if (followedCar) unfollowCar();
  clearAllCars();
  clearAllSpawners();
  clearPendingSpawn();
  setSpawnerPlaceMode(false);
  clearHoveredCar();
}

function trySpawnFromSpawner(spawner) {
  const routes = spawner.routeCache;
  if (!routes || !routes.length) return;
  const route = routes[Math.floor(Math.random() * routes.length)];
  // Clone leg descriptors so spawnCarFromRoute can own them
  const legs = route.map(leg => ({
    atom: leg.atom,
    tStart: leg.tStart,
    tEnd: leg.tEnd
  }));
  const last = legs[legs.length - 1];
  const pt = last.atom.sampleAtT(last.tEnd);
  spawnCarFromRoute(legs, { atom: last.atom, t: last.tEnd, x: pt.x, y: pt.y });
}

let spawnerUiAccum = 0;
function updateSpawners(dt) {
  if (!spawners.length || simPaused || spawnersAllPaused) return;
  let uiDirty = false;
  for (let i = 0; i < spawners.length; i++) {
    const spawner = spawners[i];
    if (!spawner.running) continue;
    if (!spawner.indefinite && spawner.durationSec != null) {
      spawner.elapsed += dt;
      if (spawner.elapsed >= spawner.durationSec) {
        spawner.running = false;
        drawSpawnerMarker(spawner);
        uiDirty = true;
        continue;
      }
    }
    if (!spawner.routeCache || !spawner.routeCache.length) {
      refreshSpawnerDestCache(spawner);
      if (!spawner.routeCache.length) continue;
    }
    spawner.timer += dt;
    // Cap catch-up so a long hitch doesn't dump a burst of cars
    let spawns = 0;
    while (spawner.timer >= spawner.intervalSec && spawns < 3) {
      spawner.timer -= spawner.intervalSec;
      trySpawnFromSpawner(spawner);
      spawns++;
    }
    if (spawner.timer >= spawner.intervalSec) spawner.timer %= spawner.intervalSec;
  }
  // Rebuild DOM list at most ~1/sec (was every frame — main lag source)
  spawnerUiAccum += dt;
  if (uiDirty || spawnerUiAccum >= 1) {
    spawnerUiAccum = 0;
    updateSpawnerListUI();
  }
}

// ---------------- Main loop ----------------

const TARGET_FPS = 50;
const FRAME_MS = 1000 / TARGET_FPS;
const FIXED_DT = 1 / TARGET_FPS;

let tickFrame = 0;
let lastTick = null;
function tick(ts) {
  requestAnimationFrame(tick);

  // Cap sim + SVG updates at ~30fps (skip surplus display refreshes).
  if (lastTick != null && ts - lastTick < FRAME_MS) return;

  tickFrame++;
  let dt = lastTick == null ? FIXED_DT : (ts - lastTick) / 1000;
  lastTick = ts;
  // Keep wall-clock time, but never more than ~2 frames after a hitch
  dt = Math.min(Math.max(dt, FIXED_DT), FIXED_DT * 2);

  // Re-check hover every few frames — cars move and the follow camera pans under a
  // stationary cursor, so mousemove alone isn't enough.
  if (driveMode && lastDriveMouseWorld && (tickFrame & 1) === 0) {
    updateDrivePointerHover(lastDriveMouseWorld);
  }

  if (!simPaused) {
    simTime += dt;
    if (typeof updateSignals === 'function') updateSignals(dt);
    updateSpawners(dt);
    rebuildCarIndexes();
    for (let i = cars.length - 1; i >= 0; i--) updateCar(cars[i], dt);
  } else {
    // Keep spatial indexes warm for hover/debug while paused
    if (cars.length) rebuildCarIndexes();
    if (typeof updateSignals === 'function') {
      // Keep lamps painted while paused (no phase advance inside updateSignals when paused)
      updateSignals(0);
    }
  }

  // Keep remaining-route highlight fresh while following or hovering.
  if (followedCar && followedCar.selected) {
    followHighlightTimer += dt;
    if (followHighlightTimer >= 0.12) {
      followHighlightTimer = 0;
      updateRouteHighlight(followedCar);
    }
  } else {
    followHighlightTimer = 0;
  }
  if (driveMode && hoveredCar && !hoveredCar.selected && hoveredCar.state !== 'despawning') {
    hoverHighlightTimer += dt;
    if (hoverHighlightTimer >= 0.12) {
      hoverHighlightTimer = 0;
      updateHoverRouteHighlight(hoveredCar);
    }
  } else {
    hoverHighlightTimer = 0;
  }

  if (debugRingsOn && (tickFrame & 1) === 0) updateDebugOverlay();

  // HUD overlay is not frame-critical
  if ((tickFrame & 3) === 0) {
    const overlayCar = carOverlayTarget();
    if (overlayCar) updateCarOverlayContent(overlayCar);
  }

  // Keep drive/car layers above roads without forcing a reparent every frame
  if ((tickFrame & 31) === 0) {
    world.appendChild(laneChangeGraphLayer);
    world.appendChild(routeHighlightLayer);
    world.appendChild(driveLayer);
    world.appendChild(debugLayer);
    world.appendChild(carLayer);
  }

  if (followedCar) updateCameraFollow(followedCar, dt);
}

rebuildAllieGraph();
ensureSpawnerListClicks();
updateSpawnerPauseAllButton();
board.addEventListener('mouseleave', () => {
  if (driveMode) {
    lastDriveMouseWorld = null;
    setHoveredCar(null);
  }
});
requestAnimationFrame(tick);