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

// True when this approach lane is the driver's rightmost inbound lane on
// its segment at the junction (the only lane that may take right-on-red).
function isRightmostApproachLane(nodeKey, segId, laneIdx) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.laneNodes) return true;
  const enters = nd.laneNodes
    .filter(l => l.type === 'in' && l.segId === segId)
    .slice()
    .sort((a, b) => laneRightnessAllie(a) - laneRightnessAllie(b));
  if (!enters.length) return true;
  return enters[enters.length - 1].laneIdx === laneIdx;
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

// Pick a reachable lane destination near (nearX, nearY), preferably a short
// drive away from `origin` — used when a forced maneuver orphans the old dest.
function pickNearbyReachableDest(origin, nearX, nearY) {
  if (!origin || !allieAtoms.length) return null;
  const candidates = [];
  for (let i = 0; i < allieAtoms.length; i++) {
    const atom = allieAtoms[i];
    if (atom.kind !== 'lane' || !atom.originStub) continue;
    for (let k = 0; k < 4; k++) {
      const t = 0.25 + k * 0.2;
      const p = atom.sampleAtT(t);
      const d = Math.hypot(p.x - nearX, p.y - nearY);
      if (d < 28 || d > 220) continue;
      candidates.push({ atom, t, x: p.x, y: p.y, dist: d });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  // Try a spread of near→mid distances so we don't always pick the closest stub
  const tries = [];
  for (let i = 0; i < candidates.length; i += Math.max(1, (candidates.length / 18) | 0)) {
    tries.push(candidates[i]);
    if (tries.length >= 18) break;
  }
  for (let i = 0; i < tries.length; i++) {
    const c = tries[i];
    const path = allieFindPath(origin, c);
    if (path && path.length) return c;
  }
  // Last resort: anything reachable
  for (let i = 0; i < Math.min(candidates.length, 40); i++) {
    const c = candidates[i];
    const path = allieFindPath(origin, c);
    if (path && path.length) return c;
  }
  return null;
}

function applyRouteToCar(car, rawLegs, destPick) {
  const legs = rawLegs.map(leg => ({
    atom: leg.atom, tStart: leg.tStart, tEnd: leg.tEnd,
    length: 0, cumStart: 0, cumEnd: 0
  }));
  car.route = legs;
  car.legIndex = 0;
  car.traveledLength = 0;
  car.totalLength = recomputeRouteCum(legs);
  if (destPick) {
    car.destPick = { atom: destPick.atom, t: destPick.t, x: destPick.x, y: destPick.y };
  }
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
  car._lcFoundFrame = -1;
  evaluateParkingIntent(car);
  if (car.selected) updateRouteHighlight(car);
}

// Live re-route one car from its current world pose to its destination using
// the freshly rebuilt graph. Falls back to a nearby reachable dest if the
// old one is orphaned. Returns true if a new path was applied.
function rerouteCar(car) {
  if (!car || car.state === 'despawning') return false;
  if (car.state === 'parking' || car.state === 'parked') return false;

  const origin = findNearestAtomPoint(car.x, car.y, 22, true);
  if (!origin) {
    beginDespawn(car);
    return false;
  }

  let dest = rematchDestPick(car);
  let raw = dest ? allieFindPath(origin, dest) : null;
  if (!raw || !raw.length) {
    dest = pickNearbyReachableDest(origin, car.x, car.y);
    raw = dest ? allieFindPath(origin, dest) : null;
  }
  if (!raw || !raw.length || !dest) {
    beginDespawn(car);
    return false;
  }

  applyRouteToCar(car, raw, dest);
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
  CRUISE_SPEED: 32,
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
  FOLLOW_MIN_SCALE: 2.6, // only used as a one-shot zoom-in when starting follow
  PICK_TOLERANCE_PX: 20,
  SIGNAL_DECEL: 30,
  SIGNAL_REACTION: 0.35,
  STOP_LINE_GAP: 9.5, // hold this far before the turn / intersection centerline
  ROR_DWELL: 0.9,
  ROR_CREEP_SPEED: 3.2,
  ROR_CREEP_TIME: 1.15,
  // Right-on-red yield sensors — look LEFT + FORWARD with the far rings
  // before creeping into the intersection (classic "coast clear?" check).
  ROR_LOOK_RADIUS: 52,       // far sensor reach (≥ DETECT_RING_OUTER)
  ROR_LEFT_CONE_DEG: 110,    // driver's-left sweep (cross traffic)
  ROR_FWD_CONE_DEG: 55,      // straight-ahead receiving / conflict path
  ROR_CLEAR_TTC: 3.2,        // required time-to-conflict gap
  ROR_CLEAR_GAP: 20,         // min distance for moving threats
  ROR_CLEAR_HOLD: 0.35,      // must stay clear this long before creep/commit
  ROR_PATH_LOOKAHEAD: 38,    // how far along our turn path to treat as "forward"
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
  SIDE_CAUTION_MAX_SLOWDOWN: 0.22,
  // Driver "head" — forward FOV with nested caution rings (human-like gaze).
  // Primary cone looks further than side rings; threats in-cone but off the
  // exact lane corridor still get a soft brake / caution response.
  HEAD_CONE_DEG: 60,
  HEAD_RING_FAR: 56,          // notice / begin easing
  HEAD_RING_MID: 30,          // clear caution slowdown
  HEAD_RING_NEAR: 15,         // firm brake toward a crawl
  HEAD_CAUTION_MAX_SLOWDOWN: 0.55,
  HEAD_NEAR_SPEED_CAP: 8,     // max speed when something is in the near ring
  // Intersection box clearance — don't enter if your path through the
  // junction is occupied; off-path cars only earn caution, not a hard hold.
  IX_CLEAR_LOOKAHEAD: 34,     // start scanning this far before the turn
  IX_PATH_HALF: 3.5,          // half-width of "my path through the box"
  IX_BOX_PAD: 10,             // how far past turn ends to treat as still "in box"
  IX_CAUTION_SLOWDOWN: 0.42,  // off-path-in-box → ease off this fraction of cruise
  IX_HOLD_TIMEOUT: 6.5,       // anti-deadlock if blocker never clears
  IDLE_CULL_SEC: 6,           // no-objective stopped cars are removed after this
  IDLE_REROUTE_SEC: 2.5,      // try one repath before culling a frozen car
  SPAWN_OCCUPY_RADIUS: 8.5,   // skip spawn if a car is this close to the pad
  SPAWN_GRACE_SEC: 3.5,       // new spawns ignored by idle cull / soft hard-safety
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

// Parallel-parking RH maneuver — reverse two-arc S-curve sized from each stall.
const PARKING_CONFIG = {
  SWEEP_DEG: 38,              // base arc sweep per half of the S-curve
  SWEEP_MIN_DEG: 22,          // shrink toward this if neighbor collision
  STAGE_EXTRA: 1.4,           // extra meters past geometric stage point
  REVERSE_SPEED: 6.5,
  REVERSE_ACCEL: 10,
  REVERSE_DECEL: 14,
  APPROACH_DECEL: 28,
  STAGE_POS_TOL: 1.1,
  STAGE_HEAD_TOL: 0.22,       // radians
  SETTLE_TIME: 0.35,
  SEARCH_INTERVAL: 0.25,
  YIELD_LOOKAHEAD: 42,
  YIELD_GAP: 5.6 * 1.6,       // ~CAR_LENGTH * 1.6
  YIELD_LATERAL: 5.5,
  NEIGHBOR_SAMPLES: 10,
  NEIGHBOR_MARGIN: 0.15
};

const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#2ecc71', '#ff6fae'];

let parkingSearchEnabled = true;

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
const _ixPathSamples = [];
for (let i = 0; i < 16; i++) _ixPathSamples.push({ s: 0, x: 0, y: 0 });

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

    if (car.state === 'parked' || car.state === 'parking') {
      car._segPos = null;
      continue;
    }

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

function setDriveMode(on) {
  if (!!on === !!driveMode) return;
  toggleDriveMode();
}

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
    if (controlledCar) exitCarControl();
    if (followedCar) unfollowCar();
    if (typeof syncJunctionHitPointerEvents === 'function') syncJunctionHitPointerEvents();
    if (typeof refreshAllSignalOpacities === 'function') refreshAllSignalOpacities();
  }
  updateDriveHudText();
  updateCarOverlayVisibility();
  updateCarControlHud();
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

function spawnCarFromRoute(route, destPick, opts) {
  opts = opts || {};
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

  const color = opts.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
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
    _laneChangeDebug: null,
    _spawnGraceT: 0,
    _idleStuckT: 0,
    _idleRerouteTried: false,
    parkingIntent: null,
    parkPhase: null,
    _parkPlan: null,
    _parkStagePoint: null,
    _parkStageHeading: null,
    _parkBlinker: null,
    _parkArcS: 0,
    _parkSearchT: 0,
    _parkSettleT: 0,
    _parkYieldOther: null,
    _parkDebug: null
  };

  g.setAttribute('transform', `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI})`);
  car._lx = car.x;
  car._ly = car.y;
  car._lh = car.heading;
  car._tfDirty = true;
  refreshCarPoseCache(car);
  ensureCarSvgTransforms(car);
  evaluateParkingIntent(car);

  cars.push(car);
  updateCarCountUI();
  return car;
}

function removeCar(car) {
  if (controlledCar === car) exitCarControl();
  if (followedCar === car) unfollowCar();
  if (hoveredCar === car) clearHoveredCar();
  if (hoverRouteCar === car) clearHoverRouteHighlight();
  // Free reserved/occupied stall if this car held one
  if (car._parkPlan && car._parkPlan.bay && car._parkPlan.stallIndex != null) {
    const bay = car._parkPlan.bay;
    const idx = car._parkPlan.stallIndex;
    if (bay._stalls && bay._stalls[idx] && bay._stalls[idx].carId === car.id) {
      bay._stalls[idx] = null;
    }
  }
  clearRouteHighlightEls(car);
  car.el.remove();
  const idx = cars.indexOf(car);
  if (idx >= 0) cars.splice(idx, 1);
  updateCarCountUI();
}

// Delete the followed car, or the hovered one if nothing is followed.
function deleteSelectedCar() {
  const target = followedCar || hoveredCar;
  if (!target || target.isProbe) {
    showDriveToast('Select or hover a car to delete');
    return false;
  }
  const id = target.id;
  removeCar(target);
  showDriveToast('Deleted car #' + id);
  return true;
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
  // One-shot nudge in if very zoomed out — user can still zoom out freely after.
  if (view.scale < ALLIE_CONFIG.FOLLOW_MIN_SCALE) {
    view.scale = ALLIE_CONFIG.FOLLOW_MIN_SCALE;
  }
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
  if (controlledCar === followedCar) exitCarControl();
  deselectCarVisual(followedCar);
  followedCar = null;
  updateCarOverlayVisibility();
}

// ================================================================
// PLAYER CONTROL — take over a followed car from the inspect overlay.
// Gas/brake are momentary (release → AI resumes). Blinker forces a
// lane-change if a window is ahead, otherwise a turn at the junction.
// Forced turns that orphan the destination pick a nearby reachable one.
// ================================================================

let controlledCar = null;

function ensurePlayerControl(car) {
  if (!car.playerControl) {
    car.playerControl = {
      gas: false,
      brake: false,
      holdStop: false,
      blinker: null,
      intent: null // 'lanechange' | 'turn' | null
    };
  }
  return car.playerControl;
}

function updateCarControlHud() {
  const hud = document.getElementById('car-control-hud');
  if (!hud) return;
  const on = !!(controlledCar && controlledCar.state === 'driving');
  hud.classList.toggle('visible', on);
  if (!on) return;
  const pc = ensurePlayerControl(controlledCar);
  const setActive = (id, active) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', !!active);
  };
  setActive('cc-blink-left', pc.blinker === 'left');
  setActive('cc-blink-right', pc.blinker === 'right');
  setActive('cc-gas', pc.gas);
  setActive('cc-brake', pc.brake);
  setActive('cc-stop', pc.holdStop);
  const idEl = document.getElementById('cc-car-id');
  if (idEl) idEl.textContent = 'CAR #' + controlledCar.id;
}

function setCarControl(car, on) {
  if (on) {
    if (!car || car.state === 'despawning') return;
    if (controlledCar && controlledCar !== car) exitCarControl();
    if (followedCar !== car) selectCar(car);
    controlledCar = car;
    ensurePlayerControl(car);
    showDriveToast('Controlling car #' + car.id);
  } else if (controlledCar === car || !car) {
    if (controlledCar) {
      const pc = controlledCar.playerControl;
      if (pc) {
        pc.gas = false;
        pc.brake = false;
        pc.holdStop = false;
        pc.blinker = null;
        pc.intent = null;
      }
    }
    controlledCar = null;
  }
  updateCarControlHud();
  updateCarOverlayVisibility();
}

function toggleCarControl() {
  const car = followedCar;
  if (!car) {
    showDriveToast('Follow a car first');
    return;
  }
  if (controlledCar === car) {
    setCarControl(car, false);
    showDriveToast('Released car #' + car.id);
  } else {
    setCarControl(car, true);
  }
}

function exitCarControl() {
  setCarControl(null, false);
}

function playerSetGas(on) {
  if (!controlledCar) return;
  const pc = ensurePlayerControl(controlledCar);
  pc.gas = !!on;
  if (on) pc.holdStop = false;
  updateCarControlHud();
}

function playerSetBrake(on) {
  if (!controlledCar) return;
  const pc = ensurePlayerControl(controlledCar);
  pc.brake = !!on;
  updateCarControlHud();
}

function playerToggleStop() {
  if (!controlledCar) return;
  const pc = ensurePlayerControl(controlledCar);
  pc.holdStop = !pc.holdStop;
  if (pc.holdStop) {
    pc.gas = false;
    showDriveToast('Hold stop');
  } else {
    showDriveToast('Resume');
  }
  updateCarControlHud();
}

function playerClearBlinker() {
  if (!controlledCar) return;
  const pc = ensurePlayerControl(controlledCar);
  pc.blinker = null;
  pc.intent = null;
  updateCarControlHud();
}

// After a forced splice, keep prefix up to viaLegIndex, then append new legs
// without resetting traveledLength (unlike full reroute).
function spliceRouteFrom(car, viaLegIndex, appendLegs) {
  const prefix = car.route.slice(0, viaLegIndex + 1);
  const traveled = car.traveledLength;
  const legIndex = car.legIndex;
  const newLegs = prefix.concat(appendLegs.map(nl => ({
    atom: nl.atom, tStart: nl.tStart, tEnd: nl.tEnd,
    length: 0, cumStart: 0, cumEnd: 0
  })));
  car.totalLength = recomputeRouteCum(newLegs);
  car.route = newLegs;
  car.legIndex = Math.min(legIndex, newLegs.length - 1);
  car.traveledLength = Math.min(traveled, car.totalLength);
  car.signalDecision = null;
  car.signalTimer = 0;
  car.rorPhase = null;
  car.junctionWait = null;
  car._lcFoundFrame = -1;
  if (car.selected) updateRouteHighlight(car);
}

function resolveDestAfterForcedMove(car, fromStub) {
  // Try keep existing dest if still reachable from the exit stub
  let dest = rematchDestPick(car);
  if (dest && fromStub) {
    const tail = pathFromStubToDest(fromStub, dest);
    if (tail && tail.length) return { dest, tail };
  }
  // Nearby fallback from a synthetic origin on the exit
  const originAtom = (allieOutByStub.get(fromStub) || []).find(a => a.kind === 'lane')
    || (allieAtoms.find(a => a.originStub === fromStub && a.kind === 'lane'));
  let originPick = null;
  if (originAtom) {
    const p = originAtom.sampleAtT(0.05);
    originPick = { atom: originAtom, t: 0.05, x: p.x, y: p.y };
  } else {
    originPick = findNearestAtomPoint(car.x, car.y, 30, true);
  }
  if (!originPick) return null;
  dest = pickNearbyReachableDest(originPick, car.x, car.y);
  if (!dest) return null;
  const tail = pathFromStubToDest(fromStub, dest);
  if (!tail || !tail.length) {
    // Build full path from origin if stub path failed
    const full = allieFindPath(originPick, dest);
    if (!full || !full.length) return null;
    return { dest, tail: full, fullReplace: true };
  }
  return { dest, tail };
}

function tryForceLaneChange(car, side) {
  const route = car.route;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind === 'turn') break;
    if (leg.atom.kind === 'lanechange') {
      if (blinkerSideForLaneChange(car, leg.atom) === side) {
        car._laneChangeForce = true;
        return { ok: true, already: true, atom: leg.atom };
      }
      continue;
    }
    if (leg.atom.kind !== 'lane' || !leg.atom.destStub) continue;
    const candidates = (allieOutByStub.get(leg.atom.destStub) || []).filter(a =>
      a.kind === 'lanechange' && blinkerSideForLaneChange(car, a) === side
    );
    if (!candidates.length) continue;
    const lcAtom = candidates[0];
    const newTail = pathFromStubToDest(lcAtom.destStub, car.destPick);
    let tail = newTail;
    let dest = car.destPick;
    if (!tail || !tail.length) {
      const resolved = resolveDestAfterForcedMove(car, lcAtom.destStub);
      if (!resolved) continue;
      dest = resolved.dest;
      tail = resolved.tail;
      if (resolved.fullReplace) {
        applyRouteToCar(car, tail, dest);
        car._laneChangeForce = true;
        return { ok: true, atom: lcAtom, newDest: true };
      }
    }
    const lcLeg = { atom: lcAtom, tStart: 0, tEnd: 1 };
    const append = [lcLeg].concat(tail.map(nl => ({
      atom: nl.atom, tStart: nl.tStart, tEnd: nl.tEnd
    })));
    spliceRouteFrom(car, i, append);
    if (dest) car.destPick = { atom: dest.atom, t: dest.t, x: dest.x, y: dest.y };
    car._pendingLaneChangeAtomId = lcAtom.id;
    car._laneChangeForce = true;
    car._laneChangeWaitT = 0;
    return { ok: true, atom: lcAtom, newDest: !newTail || !newTail.length };
  }
  return { ok: false };
}

function pickTurnAtomForSide(car, turns, side) {
  if (turns.length === 1) return turns[0];
  // Prefer the geometrically "outer" turn for that side
  let best = turns[0], bestScore = -Infinity;
  for (let i = 0; i < turns.length; i++) {
    const a = turns[i];
    const mid = a.sampleAtT(0.5);
    const dx = mid.x - car.x, dy = mid.y - car.y;
    const lat = -dx * Math.sin(car.heading) + dy * Math.cos(car.heading);
    const score = side === 'right' ? lat : -lat;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

// Next junction the car will meet: either the upcoming turn leg, or the first
// lane stub that has turn outs (the approach to an intersection).
function findNextIntersectionApproach(car) {
  const route = car.route;
  if (!route || !route.length) return null;

  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind === 'turn') {
      let feedIdx = i;
      for (let j = i - 1; j >= car.legIndex; j--) {
        if (route[j].atom.kind === 'lane' && route[j].atom.destStub === leg.atom.originStub) {
          feedIdx = j;
          break;
        }
      }
      return {
        feedLegIndex: feedIdx,
        originStub: leg.atom.originStub,
        nodeKey: leg.atom.nodeKey,
        existingTurnIndex: i,
        existingTurn: leg.atom
      };
    }
    if (leg.atom.kind !== 'lane' || !leg.atom.destStub) continue;
    const outs = allieOutByStub.get(leg.atom.destStub) || [];
    let sampleTurn = null;
    for (let k = 0; k < outs.length; k++) {
      if (outs[k].kind === 'turn') { sampleTurn = outs[k]; break; }
    }
    if (!sampleTurn) continue;
    return {
      feedLegIndex: i,
      originStub: leg.atom.destStub,
      nodeKey: sampleTurn.nodeKey,
      existingTurnIndex: -1,
      existingTurn: null
    };
  }
  return null;
}

// Force a left/right at the *next* intersection only. Does not hunt for
// distant turns — caller should fall back to blinker if this fails.
function tryForceTurnAtNextIntersection(car, side) {
  const turnType = side; // 'left' | 'right'
  const approach = findNextIntersectionApproach(car);
  if (!approach) return { ok: false, reason: 'no-intersection' };

  const cur = car.route[car.legIndex];
  if (cur && cur.atom.kind === 'turn' && cur.atom.turnType === turnType) {
    return { ok: true, already: true, atom: cur.atom };
  }
  if (approach.existingTurn && approach.existingTurn.turnType === turnType
      && approach.existingTurnIndex >= 0) {
    return { ok: true, already: true, atom: approach.existingTurn };
  }

  // Too deep into a different turn at this junction — can't swap mid-curve
  if (approach.existingTurnIndex === car.legIndex && cur && cur.atom.kind === 'turn') {
    const frac = (car.traveledLength - cur.cumStart) / Math.max(cur.length, 0.01);
    if (frac > 0.2) return { ok: false, reason: 'committed' };
  }

  const outs = allieOutByStub.get(approach.originStub) || [];
  const turns = outs.filter(a => a.kind === 'turn' && a.turnType === turnType);
  if (!turns.length) return { ok: false, reason: 'no-turn' };

  const turnAtom = pickTurnAtomForSide(car, turns, side);
  let tail = pathFromStubToDest(turnAtom.destStub, car.destPick);
  let dest = car.destPick;
  let newDest = false;
  if (!tail || !tail.length) {
    const resolved = resolveDestAfterForcedMove(car, turnAtom.destStub);
    if (!resolved) return { ok: false, reason: 'no-dest' };
    dest = resolved.dest;
    tail = resolved.tail;
    newDest = true;
    if (resolved.fullReplace) {
      applyRouteToCar(car, tail, dest);
      return { ok: true, atom: turnAtom, newDest: true };
    }
  }

  const turnLeg = { atom: turnAtom, tStart: 0, tEnd: 1 };
  const append = [turnLeg].concat(tail.map(nl => ({
    atom: nl.atom, tStart: nl.tStart, tEnd: nl.tEnd
  })));
  spliceRouteFrom(car, approach.feedLegIndex, append);
  if (dest) car.destPick = { atom: dest.atom, t: dest.t, x: dest.x, y: dest.y };
  return { ok: true, atom: turnAtom, newDest, nodeKey: approach.nodeKey };
}

// Kept as a thin alias so older call sites stay valid.
function tryForceTurnAtJunction(car, side) {
  return tryForceTurnAtNextIntersection(car, side);
}

function playerBlinker(side) {
  if (!controlledCar || (side !== 'left' && side !== 'right')) return;
  const car = controlledCar;
  const pc = ensurePlayerControl(car);

  // Toggle off if same blinker hit again with no pending intent
  if (pc.blinker === side && !pc.intent) {
    pc.blinker = null;
    updateCarControlHud();
    return;
  }

  pc.blinker = side;
  const lc = tryForceLaneChange(car, side);
  if (lc.ok) {
    pc.intent = 'lanechange';
    showDriveToast(lc.already
      ? ('Forcing lane change ' + side)
      : ('Lane change ' + side + (lc.newDest ? ' · new destination' : '')));
    updateCarControlHud();
    if (car.selected) updateCarOverlayContent(car);
    return;
  }

  // Past last window / no LC available → same as turn at next intersection
  const tr = tryForceTurnAtNextIntersection(car, side);
  if (tr.ok) {
    pc.intent = 'turn';
    showDriveToast(tr.already
      ? ('Already turning ' + side)
      : ('Turn ' + side + (tr.newDest ? ' · new destination' : '')));
    updateCarControlHud();
    if (car.selected) updateCarOverlayContent(car);
    return;
  }

  // Still show blinker even if nothing to splice
  pc.intent = null;
  showDriveToast('Blinker ' + side);
  updateCarControlHud();
}

function playerForceTurn(side) {
  if (!controlledCar || (side !== 'left' && side !== 'right')) return;
  const car = controlledCar;
  const pc = ensurePlayerControl(car);
  pc.blinker = side;

  const tr = tryForceTurnAtNextIntersection(car, side);
  if (tr.ok) {
    pc.intent = 'turn';
    showDriveToast(tr.already
      ? ('Already turning ' + side)
      : ('Next junction · turn ' + side + (tr.newDest ? ' · new destination' : '')));
    updateCarControlHud();
    if (car.selected) updateCarOverlayContent(car);
    return;
  }

  // Can't turn at the next intersection — just blinker (lane change if possible)
  const lc = tryForceLaneChange(car, side);
  if (lc.ok) {
    pc.intent = 'lanechange';
    showDriveToast('No ' + side + ' at next junction · lane change');
  } else {
    pc.intent = null;
    showDriveToast('No ' + side + ' at next junction · blinker on');
  }
  updateCarControlHud();
  if (car.selected) updateCarOverlayContent(car);
}

function applyPlayerSpeedOverride(car, desired, decelRate) {
  if (car !== controlledCar || !car.playerControl) return { desired, decelRate, status: null };
  const pc = car.playerControl;
  let status = null;
  if (pc.holdStop) {
    return { desired: 0, decelRate: ALLIE_CONFIG.DECEL_SHARP, status: 'Player stop' };
  }
  if (pc.brake) {
    // Cut target hard so the normal decel loop pulls speed down; release → AI resumes
    const brakeTarget = Math.max(0, Math.min(desired, car.speed * 0.35));
    return {
      desired: brakeTarget,
      decelRate: ALLIE_CONFIG.DECEL_SHARP,
      status: 'Player brake'
    };
  }
  if (pc.gas) {
    const gasTarget = Math.max(desired, ALLIE_CONFIG.CRUISE_SPEED * 1.08);
    return {
      desired: gasTarget,
      decelRate: decelRate,
      status: desired < gasTarget - 0.5 ? 'Player gas' : null
    };
  }
  return { desired, decelRate, status: null };
}

function tickPlayerControl(car) {
  if (car !== controlledCar || !car.playerControl) return;
  const pc = car.playerControl;
  // Clear blinker intent once the maneuver is done / no longer on route
  if (pc.intent === 'lanechange') {
    const found = findUpcomingLaneChangeLeg(car);
    const cur = car.route[car.legIndex];
    if (!found && !(cur && cur.atom.kind === 'lanechange')) {
      pc.blinker = null;
      pc.intent = null;
      updateCarControlHud();
    }
  } else if (pc.intent === 'turn') {
    const info = findUpcomingSignalTurn(car);
    const cur = car.route[car.legIndex];
    const stillTurning = cur && cur.atom.kind === 'turn'
      && turnTypeToSignal(cur.atom.turnType) === pc.blinker;
    const upcoming = info && turnTypeToSignal(info.turnType) === pc.blinker
      && info.dist < ALLIE_CONFIG.BLINKER_LOOKAHEAD;
    if (!stillTurning && !upcoming) {
      pc.blinker = null;
      pc.intent = null;
      updateCarControlHud();
    }
  }
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
  const controlBtn = document.getElementById('co-control');
  const tip = document.getElementById('co-tip');
  if (badge) {
    badge.textContent = (controlledCar === car) ? 'Controlling'
      : (isFollow ? 'Following' : 'Inspect');
  }
  if (unfollowBtn) unfollowBtn.style.display = isFollow ? '' : 'none';
  if (controlBtn) {
    controlBtn.style.display = isFollow ? '' : 'none';
    controlBtn.textContent = (controlledCar === car) ? 'Release' : 'Control car';
    controlBtn.classList.toggle('active', controlledCar === car);
  }
  if (tip) {
    tip.textContent = (controlledCar === car)
      ? 'use control pad · Release to hand back to AI'
      : (isFollow ? 'click again to unfollow · Del to delete' : 'click to follow');
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
  const rect = getBoardRectCached();
  // Keep current zoom (scroll wheel works in follow). Do not pull scale back up.
  const cx = car._cx != null ? car._cx : carCenter(car).x;
  const cy = car._cy != null ? car._cy : carCenter(car).y;
  view.x = rect.width / 2 - cx * view.scale;
  view.y = rect.height / 2 - cy * view.scale;
  applyView();
}

function updateCarOverlayContent(car) {
  const remaining = Math.max(0, car.totalLength - car.traveledLength);
  const eta = estimateTimeRemaining(car);
  const status = car.state === 'despawning' ? 'Arrived'
    : (car.state === 'parked' ? 'Parked'
      : (car.state === 'parking' ? ('Parking · ' + (car.parkPhase || 'reverse'))
        : (car._signalStatus ? car._signalStatus
          : (car.braking ? 'Braking' : (car.speed < 1 ? 'Stopped' : 'Driving')))));
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

  const caution = Math.max(car._peripheralCaution || 0, car._headCaution || 0);
  const nearby = gatherNearbyForDebug(car, Math.max(ALLIE_CONFIG.SIDE_DETECT_RADIUS, ALLIE_CONFIG.HEAD_RING_FAR));
  const obs = car._lastObstruction;
  set('co-caution', caution.toFixed(2));
  set('co-nearby', String(nearby.length));
  set('co-lead', obs ? `#${obs.other.id} · ${obs.gap.toFixed(1)} gap` : '—');
  set('co-yield', car._ixBlocker ? `IX #${car._ixBlocker.id}`
    : (car._yieldOther ? `#${car._yieldOther.id}` : '—'));
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

  // Parking debug rows
  const pd = car._parkDebug;
  const parkPhase = car.state === 'parked' ? 'parked'
    : (car.state === 'parking' ? (car.parkPhase || 'parking')
      : (car.parkPhase || (car.parkingIntent ? 'armed' : 'none')));
  set('co-park-phase', parkPhase);
  set('co-park-spot', (pd && pd.spot) || (car._parkPlan
    ? ('bay#' + car._parkPlan.bay.id + '[' + car._parkPlan.stallIndex + ']')
    : '—'));
  let parkDist = '—';
  if (car.parkPhase === 'staging' && car._parkStagePoint) {
    parkDist = Math.hypot(car.x - car._parkStagePoint.x, car.y - car._parkStagePoint.y).toFixed(1) + ' u → stage';
  } else if (car.state === 'parking' && car._parkPlan) {
    const arc = car.parkPhase === 'reverse1' ? car._parkPlan.arc1 : car._parkPlan.arc2;
    if (arc) {
      parkDist = Math.max(0, arc.length - (car._parkArcS || 0)).toFixed(1) + ' u left on arc';
    }
  } else if (car.state === 'parked') {
    parkDist = 'done';
  }
  set('co-park-dist', parkDist);
  set('co-park-blinker', car._parkBlinker ? car._parkBlinker.toUpperCase() : 'off');
  set('co-park-yield', car._parkYieldOther ? ('#' + car._parkYieldOther.id) : '—');

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
  if (controlledCar) exitCarControl();
  if (followedCar) unfollowCar();
  cars.forEach(c => { clearRouteHighlightEls(c); c.el.remove(); });
  cars = [];
  clearAllParkingStalls();
  clearDebugOverlay();
  updateCarCountUI();
}

function updateCarCountUI() {
  document.getElementById('car-count').textContent = String(cars.length);
}

function setSimPaused(paused) {
  simPaused = !!paused;
  const btn = document.getElementById('btn-sim-pause');
  if (btn) {
    btn.textContent = simPaused ? 'Resume' : 'Pause';
    btn.classList.toggle('active', simPaused);
  }
  updateSpawnerListUI();
  spawners.forEach(drawSpawnerMarker);
}

function toggleSimPaused() {
  setSimPaused(!simPaused);
}

// ---------------- Traffic state save / restore ----------------

function findAllieAtomById(id) {
  if (!id) return null;
  for (let i = 0; i < allieAtoms.length; i++) {
    if (allieAtoms[i].id === id) return allieAtoms[i];
  }
  return null;
}

function serializeCarState(car) {
  return {
    id: car.id,
    color: car.color,
    x: car.x,
    y: car.y,
    heading: car.heading,
    speed: car.speed,
    braking: !!car.braking,
    traveledLength: car.traveledLength,
    legIndex: car.legIndex,
    blinkerPhase: car.blinkerPhase || 0,
    signalDecision: car.signalDecision
      ? { turnLegIndex: car.signalDecision.turnLegIndex, choice: car.signalDecision.choice }
      : null,
    signalTimer: car.signalTimer || 0,
    rorPhase: car.rorPhase || null,
    overtakeTendency: car.overtakeTendency,
    courtesyTendency: car.courtesyTendency,
    route: (car.route || []).map(leg => ({
      atomId: leg.atom && leg.atom.id,
      tStart: leg.tStart,
      tEnd: leg.tEnd
    })),
    destPick: (car.destPick && car.destPick.atom)
      ? { atomId: car.destPick.atom.id, t: car.destPick.t, x: car.destPick.x, y: car.destPick.y }
      : null
  };
}

function exportTrafficState() {
  return {
    version: 1,
    kind: 'trafficState',
    savedAt: new Date().toISOString(),
    simTime: simTime,
    simPaused: !!simPaused,
    spawnersAllPaused: !!spawnersAllPaused,
    driveMode: !!driveMode,
    signalsEnabled: (typeof signalsEnabled === 'undefined') ? true : !!signalsEnabled,
    view: { x: view.x, y: view.y, scale: view.scale },
    spawners: exportMapSpawners(),
    cars: cars.filter(c => c.state !== 'despawning').map(serializeCarState),
    signals: (typeof serializeMapSignals === 'function') ? serializeMapSignals() : null
  };
}

function restoreCarFromState(saved) {
  if (!saved) return null;

  let car = null;
  // Prefer rebuilding from saved route atom ids when the graph still matches.
  if (saved.route && saved.route.length) {
    const legs = [];
    let routeOk = true;
    for (let i = 0; i < saved.route.length; i++) {
      const leg = saved.route[i];
      const atom = findAllieAtomById(leg.atomId);
      if (!atom) { routeOk = false; break; }
      legs.push({ atom, tStart: leg.tStart, tEnd: leg.tEnd });
    }
    if (routeOk && legs.length) {
      let destPick = null;
      if (saved.destPick && saved.destPick.atomId) {
        const da = findAllieAtomById(saved.destPick.atomId);
        if (da) {
          destPick = {
            atom: da,
            t: saved.destPick.t,
            x: saved.destPick.x,
            y: saved.destPick.y
          };
        }
      }
      car = spawnCarFromRoute(legs, destPick, { color: saved.color });
    }
  }

  // Route atoms missing/changed — spawn a short placeholder then revive from pose.
  if (!car) {
    const origin = (saved.x != null && saved.y != null)
      ? findNearestAtomPoint(saved.x, saved.y, 30, true)
      : null;
    if (!origin) return null;
    const dest = pickNearbyReachableDest(origin, saved.x, saved.y);
    if (!dest) return null;
    const raw = allieFindPath(origin, dest);
    if (!raw || !raw.length) return null;
    car = spawnCarFromRoute(raw, dest, { color: saved.color });
  }
  if (!car) return null;

  if (saved.id != null) {
    car.id = saved.id;
    if (saved.id >= carIdCounter) carIdCounter = saved.id + 1;
  }
  car.x = saved.x != null ? saved.x : car.x;
  car.y = saved.y != null ? saved.y : car.y;
  car.heading = saved.heading != null ? saved.heading : car.heading;
  car.speed = Math.max(0, saved.speed || 0);
  car.braking = !!saved.braking;
  car.blinkerPhase = saved.blinkerPhase || 0;
  // Don't restore stop/ror latches — signal phase may not match the snapshot,
  // and stale "stop" decisions park restored cars mid-block forever.
  car.signalDecision = null;
  car.signalTimer = 0;
  car.rorPhase = null;
  if (saved.overtakeTendency != null) car.overtakeTendency = saved.overtakeTendency;
  if (saved.courtesyTendency != null) car.courtesyTendency = saved.courtesyTendency;
  if (saved.destPick && saved.destPick.x != null) {
    car.destPick = car.destPick || {};
    car.destPick.x = saved.destPick.x;
    car.destPick.y = saved.destPick.y;
    if (saved.destPick.t != null) car.destPick.t = saved.destPick.t;
  }
  car._idleStuckT = 0;
  car._idleRerouteTried = false;
  car._tfDirty = true;
  refreshCarPoseCache(car);
  applyCarTransform(car);
  return car;
}

// After a traffic-state load (or any freeze), rebuild a live path from the
// car's current pose so it isn't stranded on a stale route mid-road.
function reviveCarOnRoad(car) {
  if (!car || car.state === 'despawning') return false;

  const origin = findNearestAtomPoint(car.x, car.y, 30, true);
  if (!origin) {
    beginDespawn(car);
    return false;
  }

  let dest = rematchDestPick(car);
  let raw = dest ? allieFindPath(origin, dest) : null;
  if (!raw || !raw.length) {
    dest = pickNearbyReachableDest(origin, car.x, car.y);
    raw = dest ? allieFindPath(origin, dest) : null;
  }
  if (!raw || !raw.length || !dest) {
    beginDespawn(car);
    return false;
  }

  const keepSpeed = car.speed;
  applyRouteToCar(car, raw, dest);
  // Fresh path starts at origin under the car — keep world pose.
  car.signalDecision = null;
  car.signalTimer = 0;
  car.rorPhase = null;
  car.junctionWait = null;
  car._idleStuckT = 0;
  car._idleRerouteTried = false;
  // Nudge so restored/paused cars aren't left dead-stopped mid-block.
  // Legitimate red/traffic waits re-assert themselves on the next tick.
  if (keepSpeed < 2) car.speed = Math.max(keepSpeed, ALLIE_CONFIG.CRUISE_SPEED * 0.4);
  else car.speed = keepSpeed;
  refreshCarPoseCache(car);
  applyCarTransform(car);
  return true;
}

/**
 * Restore a saved traffic snapshot with progress callbacks.
 * onProgress(pct 0..1, infoString) — called between steps.
 * Returns a Promise that resolves with { cars, skipped }.
 */
function importTrafficState(data, onProgress) {
  const report = (pct, info) => {
    if (typeof onProgress === 'function') onProgress(pct, info);
  };

  return new Promise((resolve, reject) => {
    if (!data || data.kind !== 'trafficState' || !Array.isArray(data.cars)) {
      reject(new Error('Invalid traffic state file'));
      return;
    }

    const waitFrame = () => new Promise(r => requestAnimationFrame(() => r()));

    (async () => {
      try {
        report(0.02, 'Pausing simulation…');
        setSimPaused(true);
        await waitFrame();

        report(0.06, 'Clearing live traffic…');
        if (followedCar) unfollowCar();
        clearAllCars();
        clearPendingSpawn();
        clearHoveredCar();
        await waitFrame();

        report(0.12, 'Ensuring drive mode…');
        if (!driveMode) setDriveMode(true);
        await waitFrame();

        report(0.18, 'Rebuilding routing graph…');
        if (typeof rebuildAllieGraph === 'function') rebuildAllieGraph();
        await waitFrame();

        report(0.24, 'Restoring spawners…');
        importMapSpawners(data.spawners || []);
        spawnersAllPaused = !!data.spawnersAllPaused;
        updateSpawnerPauseAllButton();
        spawners.forEach(drawSpawnerMarker);
        await waitFrame();

        if (typeof data.signalsEnabled === 'boolean' && typeof signalsEnabled !== 'undefined') {
          if (signalsEnabled !== data.signalsEnabled && typeof toggleSignalsMaster === 'function') {
            toggleSignalsMaster();
          } else if (signalsEnabled !== data.signalsEnabled) {
            signalsEnabled = data.signalsEnabled;
          }
        }

        if (data.signals && typeof applySavedSignals === 'function') {
          report(0.28, 'Syncing signal phases…');
          applySavedSignals(data.signals);
          if (typeof updateSignals === 'function') updateSignals(0);
          // Force a full lamp refresh after restore (paint caches may be stale)
          nodes.forEach((nd) => {
            const sig = nd.signal;
            if (!sig || !sig.heads || !sig.heads.length) return;
            sig._paintKey = null;
            for (let i = 0; i < sig.heads.length; i++) {
              sig.heads[i]._lit = undefined;
              sig.heads[i]._litForced = undefined;
            }
            if (typeof paintSignalLamps === 'function') {
              paintSignalLamps(sig, !sig.enabled || !signalsEnabled);
            }
          });
          await waitFrame();
        }

        if (data.view && typeof data.view.scale === 'number') {
          view.x = data.view.x;
          view.y = data.view.y;
          view.scale = data.view.scale;
          applyView();
        }

        const list = data.cars;
        let restored = 0;
        let skipped = 0;
        const batch = Math.max(1, Math.ceil(list.length / 20));
        report(0.32, 'Restoring cars 0/' + list.length + '…');

        for (let i = 0; i < list.length; i++) {
          const car = restoreCarFromState(list[i]);
          if (car) restored++;
          else skipped++;
          if ((i % batch) === 0 || i === list.length - 1) {
            const t = 0.32 + 0.38 * ((i + 1) / Math.max(1, list.length));
            report(t, 'Restoring cars ' + (i + 1) + '/' + list.length
              + (skipped ? ' · skipped ' + skipped : '') + '…');
            await waitFrame();
          }
        }

        if (typeof data.simTime === 'number') simTime = data.simTime;

        report(0.72, 'Repathing restored cars…');
        rebuildCarIndexes();
        {
          const live = cars.slice();
          let revived = 0, culled = 0;
          for (let i = 0; i < live.length; i++) {
            if (reviveCarOnRoad(live[i])) revived++;
            else culled++;
          }
          // beginDespawn won't finish while paused — drop failures now
          cars.slice().forEach(c => {
            if (c.state === 'despawning') removeCar(c);
          });
          skipped += culled;
          restored = cars.length;
          report(0.78, 'Repathed ' + revived + ' · culled ' + culled);
        }
        await waitFrame();

        report(0.80, 'Building spatial indexes…');
        rebuildCarIndexes();
        updateCarCountUI();
        await waitFrame();

        report(0.84, 'Warming systems…');
        if (typeof updateSignals === 'function') updateSignals(0);
        for (let w = 0; w < 3; w++) {
          rebuildCarIndexes();
          await waitFrame();
        }

        // Calibrate: wait until a few frames land under budget so load doesn't hitch.
        report(0.86, 'Calibrating frame timing…');
        const samples = [];
        let last = performance.now();
        for (let f = 0; f < 14; f++) {
          await waitFrame();
          const now = performance.now();
          samples.push(now - last);
          last = now;
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          report(0.86 + 0.10 * ((f + 1) / 14),
            'Calibrating… ' + Math.round(avg) + 'ms/frame · cars ' + cars.length);
        }

        report(0.98, 'Finalizing…');
        rebuildCarIndexes();
        updateSpawnerListUI();
        await waitFrame();

        // Resume only if the snapshot was running
        setSimPaused(!!data.simPaused);
        report(1, 'Ready · ' + restored + ' cars'
          + (skipped ? ' · ' + skipped + ' skipped' : ''));
        await waitFrame();

        resolve({ cars: restored, skipped, total: list.length });
      } catch (err) {
        reject(err);
      }
    })();
  });
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

function toggleParkingSearch() {
  parkingSearchEnabled = !parkingSearchEnabled;
  const btn = document.getElementById('btn-parking-search');
  if (btn) {
    btn.textContent = 'Cars use parking: ' + (parkingSearchEnabled ? 'On' : 'Off');
    btn.classList.toggle('active', parkingSearchEnabled);
  }
  if (!parkingSearchEnabled) {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (!car || car.state === 'parking' || car.state === 'parked') continue;
      clearParkingIntent(car);
    }
  }
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
  else if (status === 'Head caution') tags.push({ text: 'Head caution', color: '#FF9F43' });
  else if (status === 'Waiting for clear') tags.push({ text: 'Waiting · intersection', color: '#FF6B6B' });
  else if (status === 'Intersection caution') tags.push({ text: 'Intersection caution', color: '#FFB347' });
  else if (status === 'Clearing intersection') tags.push({ text: 'Clearing intersection', color: '#7CFF9A' });
  else if (status === 'Player stop') tags.push({ text: 'Player · stop', color: '#FF5C5C' });
  else if (status === 'Player brake') tags.push({ text: 'Player · brake', color: '#FF9F43' });
  else if (status === 'Player gas') tags.push({ text: 'Player · gas', color: '#6DFF8A' });
  else if (status === 'Red light') tags.push({ text: 'Red light', color: '#FF4444' });
  else if (status === 'Right on red') tags.push({ text: 'Right on red', color: '#FFAA66' });
  else if (status === 'Yielding right on red') tags.push({ text: 'Yielding · right on red', color: '#FF8888' });
  else if (status === 'Committed (yellow)') tags.push({ text: 'Committed · yellow', color: '#FFE066' });
  else if (status === 'Letting merge') tags.push({ text: 'Letting merge', color: '#A0E7A0' });
  else if (status === 'Changing lanes') tags.push({ text: 'Changing lanes', color: '#FFD166' });
  else if (status === 'Waiting for gap') tags.push({ text: 'Waiting for gap', color: '#FFCC66' });
  else if (status === 'Speeding to merge') tags.push({ text: 'Speeding to merge', color: '#FF6B6B' });
  else if (status === 'Pulling in to park') tags.push({ text: 'Pulling in to park', color: '#7fd4ff' });
  else if (status === 'Waiting for parking') tags.push({ text: 'Waiting for parking', color: '#7fd4ff' });

  if (car.state === 'parked') tags.push({ text: 'Parked', color: '#95a5a6' });
  else if (car.state === 'parking') tags.push({ text: 'Parking · ' + (car.parkPhase || ''), color: '#ffb020' });
  else if (car.parkPhase === 'staging') tags.push({ text: 'Staging to park', color: '#ffb020' });
  else if (car.parkPhase === 'searching') tags.push({ text: 'Looking for parking', color: '#7fd4ff' });

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
  const headHalf = (ALLIE_CONFIG.HEAD_CONE_DEG * Math.PI / 180) * 0.5;
  const headFar = ALLIE_CONFIG.HEAD_RING_FAR;
  const headMid = ALLIE_CONFIG.HEAD_RING_MID;
  const headNear = ALLIE_CONFIG.HEAD_RING_NEAR;

  // Driver-head FOV wedges — nested far / mid / near rings (cyan → amber → red)
  const headRings = [
    { r: headFar, fill: 'rgba(120,210,255,0.06)', stroke: 'rgba(120,210,255,0.45)' },
    { r: headMid, fill: 'rgba(255,190,70,0.08)', stroke: 'rgba(255,180,60,0.55)' },
    { r: headNear, fill: 'rgba(255,80,60,0.10)', stroke: 'rgba(255,90,70,0.7)' }
  ];
  for (let i = 0; i < headRings.length; i++) {
    const ring = headRings[i];
    const a0 = car.heading - headHalf;
    const a1 = car.heading + headHalf;
    const x0 = c.x + Math.cos(a0) * ring.r;
    const y0 = c.y + Math.sin(a0) * ring.r;
    const x1 = c.x + Math.cos(a1) * ring.r;
    const y1 = c.y + Math.sin(a1) * ring.r;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d',
      `M ${c.x.toFixed(2)} ${c.y.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} ` +
      `A ${ring.r.toFixed(2)} ${ring.r.toFixed(2)} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`);
    path.setAttribute('fill', ring.fill);
    path.setAttribute('stroke', ring.stroke);
    path.setAttribute('stroke-width', '0.4');
    appendDebugEl(path);
  }

  // Head FOV boundary rays (draw furthest)
  [-headHalf, headHalf].forEach(ang => {
    const ca = Math.cos(car.heading + ang);
    const sa = Math.sin(car.heading + ang);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(c.x));
    line.setAttribute('y1', String(c.y));
    line.setAttribute('x2', String(c.x + ca * headFar));
    line.setAttribute('y2', String(c.y + sa * headFar));
    line.setAttribute('stroke', 'rgba(120,210,255,0.75)');
    line.setAttribute('stroke-width', '0.55');
    appendDebugEl(line);
  });

  // Side sensor FOV boundary lines (angle edges only — no full rings)
  [-halfCone, halfCone].forEach(ang => {
    const ca = Math.cos(car.heading + ang);
    const sa = Math.sin(car.heading + ang);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(c.x));
    line.setAttribute('y1', String(c.y));
    line.setAttribute('x2', String(c.x + ca * radius));
    line.setAttribute('y2', String(c.y + sa * radius));
    line.setAttribute('stroke', 'rgba(255,180,60,0.45)');
    line.setAttribute('stroke-width', '0.4');
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

  // Highlight intersection blocker if holding
  if (car._ixBlocker) {
    appendDebugOBB(carOBB(car._ixBlocker), 'rgba(255,60,60,0.2)', '#ff3333', 0.9, 0.4);
  }
}

function drawDebugForCar(car) {
  if (!car || car.state === 'despawning') return;
  const c = carCenter(car);
  const radius = Math.max(ALLIE_CONFIG.SIDE_DETECT_RADIUS, ALLIE_CONFIG.HEAD_RING_FAR);
  const nearby = gatherNearbyForDebug(car, radius);

  if (car.state !== 'parked' && car.state !== 'parking') {
    drawDebugSensors(car, c, ALLIE_CONFIG.SIDE_DETECT_RADIUS, nearby);
  }

  // Hard-safety flash on ego
  if (car._hardSafetyHit) {
    appendDebugOBB(carOBB(car), 'none', '#ff2222', 0.9, 0.35);
  }

  // Lane-change thinking: draw the blend path + blinker side cue
  const lcd = car._laneChangeDebug;
  const found = (car.state === 'driving') ? findUpcomingLaneChangeLeg(car) : null;
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

  drawDebugParking(car);
  if (car._parkYieldOther && !car._parkPlan) {
    const a = carCenter(car);
    const b = carCenter(car._parkYieldOther);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    line.setAttribute('stroke', '#7fd4ff');
    line.setAttribute('stroke-width', '0.9');
    line.setAttribute('stroke-dasharray', '2 1.5');
    line.setAttribute('opacity', '0.9');
    appendDebugEl(line);
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
  if (obs.other.state === 'parking' || obs.other.parkPhase === 'staging') return;
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
  if (car === controlledCar && car.playerControl && car.playerControl.blinker) {
    return car.playerControl.blinker;
  }
  if (car._parkBlinker) return car._parkBlinker;
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
  if (!signal) {
    // Idle lamps — write once, then skip
    if (car._blinkerIdle) return;
    car._blinkerIdle = true;
    setSvgOpacity(car.blinkerEls.left, '0.08');
    setSvgOpacity(car.blinkerEls.right, '0.08');
    if (car.roofBlinkerEls) {
      setSvgOpacity(car.roofBlinkerEls.left, '0.12');
      setSvgOpacity(car.roofBlinkerEls.right, '0.12');
    }
    return;
  }
  car._blinkerIdle = false;
  const on = (car.blinkerPhase % ALLIE_CONFIG.BLINKER_PERIOD) < ALLIE_CONFIG.BLINKER_PERIOD * 0.52;
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

  // Right on red: stop → creep → go — only from the rightmost approach lane
  const rorOk = turnType === 'right'
    && typeof isRightOnRedAllowed === 'function'
    && isRightOnRedAllowed(nodeKey)
    && isRightmostApproachLane(nodeKey, segId, laneIdx);
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
  // Phases: approaching → stopped (dwell + yield) → creep → cleared
  if (car.rorPhase === 'cleared') return null;

  if (car.rorPhase === 'stopped' || car.rorPhase === 'creep') {
    const info = findUpcomingSignalTurn(car);
    if (info) {
      const clear = rorCoastClear(car, info);
      car._rorYielding = !clear;
      // Threat while creeping: hold at the line this frame (phase flips in advance)
      if (car.rorPhase === 'creep' && !clear) {
        return {
          desired: 0,
          decelRate: ALLIE_CONFIG.SIGNAL_DECEL,
          status: 'Yielding right on red'
        };
      }
    }
  }

  if (car.rorPhase === 'creep') {
    return {
      desired: ALLIE_CONFIG.ROR_CREEP_SPEED,
      decelRate: ALLIE_CONFIG.SIGNAL_DECEL,
      status: car._rorYielding ? 'Yielding right on red' : 'Right on red'
    };
  }

  if (car.rorPhase === 'stopped') {
    return {
      desired: 0,
      decelRate: ALLIE_CONFIG.SIGNAL_DECEL,
      status: car._rorYielding ? 'Yielding right on red' : 'Right on red'
    };
  }

  // approaching: brake to stop line
  const c = stopConstraint(car, stopDist);
  if (!c) return null;
  return { desired: c.desired, decelRate: c.decelRate, status: 'Right on red' };
}

// Far left + forward sensor scan for right-on-red. Returns whether the
// intersection coast is clear enough to creep / commit the turn.
function rorCoastClear(car, info) {
  // Once per car per tick — constraint + advance both call this.
  if (car._rorClearFrame === tickFrame) return !!car._rorClearCached;

  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const radius = ALLIE_CONFIG.ROR_LOOK_RADIUS;
  const leftHalf = (ALLIE_CONFIG.ROR_LEFT_CONE_DEG * Math.PI / 180) * 0.5;
  const fwdHalf = (ALLIE_CONFIG.ROR_FWD_CONE_DEG * Math.PI / 180) * 0.5;
  // Left cone is centered on driver's left (−90°); forward cone on heading (0°).
  const leftCenter = -Math.PI / 2;

  const turnAtom = info.turnLeg && info.turnLeg.atom;
  const myOrigin = turnAtom && turnAtom.originStub;
  const conflicts = turnAtom && turnAtom.conflicts;

  // Sample our upcoming turn path — "forward" threats near this polyline count.
  const pathPts = [];
  const s0 = car.traveledLength;
  const s1 = Math.min(car.totalLength, s0 + ALLIE_CONFIG.ROR_PATH_LOOKAHEAD);
  for (let s = s0 + 2; s <= s1; s += 5) {
    const p = sampleRouteAtDistance(car, s);
    if (p) pathPts.push(p);
  }

  let threat = null;
  const nearby = collectNearbyCars(egoX, egoY, radius);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;

    const ocx = other._cx != null ? other._cx : other.x;
    const ocy = other._cy != null ? other._cy : other.y;
    const dx = ocx - egoX, dy = ocy - egoY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) continue;

    const fwd = dx * cosH + dy * sinH;
    const lat = -dx * sinH + dy * cosH; // +right / −left
    if (fwd < -ALLIE_CONFIG.CAR_LENGTH * 0.6) continue; // fully behind

    const bearing = Math.atan2(lat, fwd);
    let dLeft = bearing - leftCenter;
    while (dLeft > Math.PI) dLeft -= Math.PI * 2;
    while (dLeft < -Math.PI) dLeft += Math.PI * 2;
    const inLeft = Math.abs(dLeft) <= leftHalf && lat < -0.8;
    const inFwd = Math.abs(bearing) <= fwdHalf && fwd > 1.0;
    if (!inLeft && !inFwd) continue;

    // Same approach queue (car ahead/behind on our stub) is not cross traffic.
    const oInfo = findUpcomingSignalTurn(other);
    const oTurn = (other.route && other.route[other.legIndex] && other.route[other.legIndex].atom.kind === 'turn')
      ? other.route[other.legIndex].atom
      : (oInfo && oInfo.turnLeg && oInfo.turnLeg.atom);
    if (oTurn && myOrigin && oTurn.originStub === myOrigin) continue;
    if (oInfo && oInfo.nodeKey === info.nodeKey && oInfo.turnType === 'right'
        && oInfo.segId === info.segId) continue;

    // Conflicting junction movement (already in or aimed at our turn box)
    let conflictHit = false;
    if (conflicts && oTurn && oTurn.nodeKey === info.nodeKey && conflicts.has(oTurn.id)) {
      conflictHit = true;
    } else if (conflicts && oInfo && oInfo.nodeKey === info.nodeKey
        && oInfo.turnLeg && conflicts.has(oInfo.turnLeg.atom.id)
        && oInfo.dist < ALLIE_CONFIG.ROR_LOOK_RADIUS) {
      conflictHit = true;
    }

    // Near our forward turn path (receiving lane / cut-across)
    let nearPath = false;
    if (inFwd && pathPts.length) {
      const pathR = ALLIE_CONFIG.DETECT_CORRIDOR_HALF * 2.2;
      const pathRSq = pathR * pathR;
      for (let k = 0; k < pathPts.length; k++) {
        const p = pathPts[k];
        const ddx = ocx - p.x, ddy = ocy - p.y;
        if (ddx * ddx + ddy * ddy <= pathRSq) { nearPath = true; break; }
      }
    }

    if (!conflictHit && !nearPath && !inLeft) continue;
    // Left-cone cars count even without a graph conflict (cross traffic from left).
    if (!conflictHit && !nearPath && inLeft) {
      // Ignore parked/stopped cars deep left that aren't approaching the box
      if (other.speed < 0.8 && dist > ALLIE_CONFIG.ROR_CLEAR_GAP * 0.85) continue;
    }

    // Closing speed toward us (other's velocity projected onto vector to ego)
    const oCos = other._cosH != null ? other._cosH : Math.cos(other.heading);
    const oSin = other._sinH != null ? other._sinH : Math.sin(other.heading);
    const relVx = oCos * other.speed - cosH * car.speed;
    const relVy = oSin * other.speed - sinH * car.speed;
    const closing = Math.max(0, -(relVx * dx + relVy * dy) / dist);
    const ttc = closing > 0.4 ? dist / closing : Infinity;

    const movingThreat = other.speed > 1.2 && (
      dist < ALLIE_CONFIG.ROR_CLEAR_GAP
      || ttc < ALLIE_CONFIG.ROR_CLEAR_TTC
      || (inLeft && fwd > -2 && dist < radius * 0.92 && closing > 0.8)
    );
    const committedThreat = conflictHit && (
      (oTurn && other.route[other.legIndex] && other.route[other.legIndex].atom === oTurn
        && (other.traveledLength - other.route[other.legIndex].cumStart) >= 0)
      || (oInfo && oInfo.dist < 14 && other.speed > 0.6)
      || nearPath
    );
    const pathThreat = nearPath && (other.speed > 0.5 || dist < ALLIE_CONFIG.ROR_CLEAR_GAP * 0.7);

    if (movingThreat || committedThreat || pathThreat) {
      threat = other;
      break;
    }
  }

  // Also use the far forward route sensor (outer ring) for on-path leads
  // that aren't same-approach queued traffic already handled above.
  const obs = findNearestObstruction(car);
  if (!threat && obs && obs.other && obs.gap < ALLIE_CONFIG.DETECT_RING_OUTER) {
    const o = obs.other;
    const oInfo2 = findUpcomingSignalTurn(o);
    const sameApproach = oInfo2 && oInfo2.nodeKey === info.nodeKey
      && oInfo2.segId === info.segId && oInfo2.turnType === 'right';
    if (!sameApproach && (o.speed > 1 || obs.gap < ALLIE_CONFIG.ROR_CLEAR_GAP * 0.6)) {
      threat = o;
    }
  }

  car._rorThreat = threat || null;
  car._rorClearCached = !threat;
  car._rorClearFrame = tickFrame;
  return car._rorClearCached;
}

function advanceRightOnRed(car, dt) {
  if (!car.signalDecision || car.signalDecision.choice !== 'ror') return;
  if (car.rorPhase === 'cleared') {
    car._rorYielding = false;
    car._rorClearT = 0;
    return;
  }

  const info = findUpcomingSignalTurn(car);
  // If we've entered the turn, commit
  if (!info || info.turnLegIndex !== car.signalDecision.turnLegIndex || info.dist <= 0.15) {
    car.rorPhase = 'cleared';
    car.signalDecision = { turnLegIndex: car.signalDecision.turnLegIndex, choice: 'commit' };
    car._rorYielding = false;
    car._rorClearT = 0;
    return;
  }

  if (car.rorPhase === 'approaching' || car.rorPhase == null) {
    const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
    if (stopDist <= 0.5 && car.speed <= 0.6) {
      car.rorPhase = 'stopped';
      car.signalTimer = 0;
      car._rorClearT = 0;
      car._rorYielding = false;
    }
    return;
  }

  // Sensor check every tick while stopped / creeping (cached if constraint already ran)
  const coastClear = rorCoastClear(car, info);
  if (coastClear) {
    car._rorClearT = (car._rorClearT || 0) + dt;
    car._rorYielding = false;
  } else {
    car._rorClearT = 0;
    car._rorYielding = true;
  }
  const heldClear = (car._rorClearT || 0) >= ALLIE_CONFIG.ROR_CLEAR_HOLD;

  if (car.rorPhase === 'stopped') {
    car.signalTimer += dt;
    // Full stop dwell, then only creep once left+forward far sensors say clear
    if (car.signalTimer >= ALLIE_CONFIG.ROR_DWELL && heldClear) {
      car.rorPhase = 'creep';
      car.signalTimer = 0;
      car._rorYielding = false;
    }
    return;
  }

  if (car.rorPhase === 'creep') {
    // Traffic appeared — abort back to the stop line
    if (!coastClear) {
      car.rorPhase = 'stopped';
      car.signalTimer = Math.min(car.signalTimer, ALLIE_CONFIG.ROR_DWELL * 0.35);
      car._rorClearT = 0;
      car._rorYielding = true;
      return;
    }
    car.signalTimer += dt;
    if ((car.signalTimer >= ALLIE_CONFIG.ROR_CREEP_TIME && heldClear) || info.dist <= 0.15) {
      car.rorPhase = 'cleared';
      car.signalDecision = { turnLegIndex: car.signalDecision.turnLegIndex, choice: 'commit' };
      car._rorYielding = false;
      car._rorClearT = 0;
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
  if (car._cx == null) refreshCarPoseCache(car);
  return {
    cx: car._cx, cy: car._cy,
    heading: car.heading,
    _cosH: car._cosH, _sinH: car._sinH,
    hl: ALLIE_CONFIG.CAR_LENGTH * 0.5,
    hw: ALLIE_CONFIG.CAR_WIDTH * 0.5
  };
}

// Separating-axis test for two oriented boxes. `margin` expands each half-extent.
function obbOverlap(a, b, margin) {
  margin = margin || 0;
  const cosA = a._cosH != null ? a._cosH : Math.cos(a.heading);
  const sinA = a._sinH != null ? a._sinH : Math.sin(a.heading);
  const cosB = b._cosH != null ? b._cosH : Math.cos(b.heading);
  const sinB = b._sinH != null ? b._sinH : Math.sin(b.heading);
  // Inline axes (no alloc): [aFwd, aRight, bFwd, bRight]
  const ax0x = cosA, ax0y = sinA, ax1x = -sinA, ax1y = cosA;
  const ax2x = cosB, ax2y = sinB, ax3x = -sinB, ax3y = cosB;
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  const ahl = a.hl + margin, ahw = a.hw + margin;
  const bhl = b.hl + margin, bhw = b.hw + margin;
  // Unrolled SAT — avoids per-call axis object allocations
  {
    const px = Math.abs(dx * ax0x + dy * ax0y);
    if (px > ahl + Math.abs(ax2x * ax0x + ax2y * ax0y) * bhl + Math.abs(ax3x * ax0x + ax3y * ax0y) * bhw) return false;
  }
  {
    const px = Math.abs(dx * ax1x + dy * ax1y);
    if (px > ahw + Math.abs(ax2x * ax1x + ax2y * ax1y) * bhl + Math.abs(ax3x * ax1x + ax3y * ax1y) * bhw) return false;
  }
  {
    const px = Math.abs(dx * ax2x + dy * ax2y);
    if (px > bhl + Math.abs(ax0x * ax2x + ax0y * ax2y) * ahl + Math.abs(ax1x * ax2x + ax1y * ax2y) * ahw) return false;
  }
  {
    const px = Math.abs(dx * ax3x + dy * ax3y);
    if (px > bhw + Math.abs(ax0x * ax3x + ax0y * ax3y) * ahl + Math.abs(ax1x * ax3x + ax1y * ax3y) * ahw) return false;
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
  // Through junctions, use a slightly wider corridor so cars already in the
  // box still register as on-path leads (not only exact lane centerline).
  let corridorHalf = ALLIE_CONFIG.DETECT_CORRIDOR_HALF;
  const curLeg = car.route[car.legIndex];
  if (curLeg && curLeg.atom.kind === 'turn') {
    corridorHalf = Math.max(corridorHalf, ALLIE_CONFIG.IX_PATH_HALF * 0.9);
  } else {
    for (let i = car.legIndex; i < car.route.length; i++) {
      const leg = car.route[i];
      if (leg.cumStart - car.traveledLength > lookMax) break;
      if (leg.atom.kind === 'turn') {
        corridorHalf = Math.max(corridorHalf, ALLIE_CONFIG.IX_PATH_HALF * 0.85);
        break;
      }
    }
  }
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
        if (other === car || other.state === 'despawning' || other.state === 'parked') continue;
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
    if (other === car || other.isProbe || other.state === 'despawning' || other.state === 'parked') continue;
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

// Driver-head scan: ±HEAD_CONE_DEG/2 forward FOV with nested far/mid/near rings.
// Catches off-corridor threats the lane sensor misses (cutting across, angled
// approach, cars lingering just outside DETECT_CORRIDOR_HALF).
// Returns { caution:0..1, nearThreat, midThreat, farThreat, nearestDist }.
function scanDriverHead(car) {
  if (car.isProbe || !cars.length) {
    return { caution: 0, nearThreat: null, midThreat: null, farThreat: null, nearestDist: Infinity };
  }
  const egoX = car._cx, egoY = car._cy;
  const cosH = car._cosH, sinH = car._sinH;
  if (egoX == null) {
    return { caution: 0, nearThreat: null, midThreat: null, farThreat: null, nearestDist: Infinity };
  }

  const halfCone = (ALLIE_CONFIG.HEAD_CONE_DEG * Math.PI / 180) * 0.5;
  const FAR = ALLIE_CONFIG.HEAD_RING_FAR;
  const MID = ALLIE_CONFIG.HEAD_RING_MID;
  const NEAR = ALLIE_CONFIG.HEAD_RING_NEAR;
  const corridorHalf = ALLIE_CONFIG.DETECT_CORRIDOR_HALF;
  const pathHazard = car._lastObstruction;

  let caution = 0;
  let nearThreat = null, midThreat = null, farThreat = null;
  let nearestDist = Infinity;

  const nearby = collectNearbyCars(egoX, egoY, FAR + ALLIE_CONFIG.CAR_LENGTH);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    // Exact on-path lead is owned by findNearestObstruction / trafficConstraint
    if (pathHazard && pathHazard.other === other) continue;

    const dx = other._cx - egoX, dy = other._cy - egoY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 0.25) continue;
    const dist = Math.sqrt(distSq);
    if (dist > FAR) continue;

    const fwd = dx * cosH + dy * sinH;
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.25) continue;
    const lat = -dx * sinH + dy * cosH;
    // Skip pure same-lane corridor (traffic constraint already owns these)
    if (Math.abs(lat) < corridorHalf * 0.85 && fwd > 0) continue;

    const bearing = Math.atan2(lat, fwd);
    if (Math.abs(bearing) > halfCone) continue;

    // Closing-speed bias: cars coming at us feel hotter than receding ones
    const oCos = other._cosH != null ? other._cosH : Math.cos(other.heading);
    const oSin = other._sinH != null ? other._sinH : Math.sin(other.heading);
    const relVx = oCos * other.speed - cosH * car.speed;
    const relVy = oSin * other.speed - sinH * car.speed;
    const closing = Math.max(0, -(relVx * dx + relVy * dy) / dist);
    const closeBoost = 1 + clampNum(closing / 28, 0, 0.7);

    // Ring heat: near=1, mid~0.65, far~0.3, with distance falloff inside each band
    let ringHeat;
    if (dist <= NEAR) {
      ringHeat = 0.75 + 0.25 * (1 - dist / NEAR);
      if (!nearThreat || dist < nearestDist) nearThreat = other;
    } else if (dist <= MID) {
      ringHeat = 0.4 + 0.35 * (1 - (dist - NEAR) / Math.max(0.01, MID - NEAR));
      if (!midThreat) midThreat = other;
    } else {
      ringHeat = 0.12 + 0.28 * (1 - (dist - MID) / Math.max(0.01, FAR - MID));
      if (!farThreat) farThreat = other;
    }

    // Center-of-gaze bias (things straight ahead matter more than cone edge)
    const gaze = 1 - (Math.abs(bearing) / halfCone) * 0.45;
    const score = ringHeat * gaze * closeBoost;
    if (score > caution) caution = score;
    if (dist < nearestDist) nearestDist = dist;
  }

  return {
    caution: clampNum(caution, 0, 1),
    nearThreat, midThreat, farThreat,
    nearestDist
  };
}

function headAwarenessConstraintFor(car) {
  // Stagger soft scans; keep last result on off frames
  let head;
  if (((car.id + tickFrame) & 1) === 0) {
    head = scanDriverHead(car);
    car._headScan = head;
  } else {
    head = car._headScan || { caution: 0, nearThreat: null, nearestDist: Infinity };
  }
  car._headCaution = head.caution || 0;
  if (!head.caution || head.caution < 0.05) return null;

  const cruise = ALLIE_CONFIG.CRUISE_SPEED;
  let desired = cruise * (1 - ALLIE_CONFIG.HEAD_CAUTION_MAX_SLOWDOWN * head.caution);
  if (head.nearThreat) {
    desired = Math.min(desired, ALLIE_CONFIG.HEAD_NEAR_SPEED_CAP * (0.35 + 0.65 * (1 - head.caution)));
  } else if (head.midThreat && head.caution > 0.45) {
    desired = Math.min(desired, cruise * 0.55);
  }

  if (desired >= cruise - 0.5) return null;
  return {
    desired: Math.max(0, desired),
    decelRate: head.nearThreat ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL,
    status: head.nearThreat ? 'Head caution' : 'Caution'
  };
}

// Sample the upcoming turn polyline into `_ixPathSamples`. Returns sample count.
function sampleIntersectionPath(car, info) {
  const turnLeg = info.turnLeg;
  const s0 = Math.max(car.traveledLength, turnLeg.cumStart);
  const s1 = Math.min(car.totalLength, turnLeg.cumEnd + ALLIE_CONFIG.IX_BOX_PAD);
  let n = 0;
  const step = Math.max(2.2, (s1 - s0) / 12);
  for (let s = s0; s <= s1 && n < _ixPathSamples.length - 1; s += step) {
    const p = sampleRouteAtDistance(car, s);
    if (!p) continue;
    const samp = _ixPathSamples[n++];
    samp.s = s; samp.x = p.x; samp.y = p.y;
  }
  const end = sampleRouteAtDistance(car, s1);
  if (end && n < _ixPathSamples.length) {
    const samp = _ixPathSamples[n++];
    samp.s = s1; samp.x = end.x; samp.y = end.y;
  }
  return n;
}

function otherIsInIntersection(other, nodeKey) {
  const leg = other.route && other.route[other.legIndex];
  if (leg && leg.atom.kind === 'turn' && leg.atom.nodeKey === nodeKey) {
    const frac = (other.traveledLength - leg.cumStart) / Math.max(leg.length, 0.01);
    // Still in the box (not already exited)
    return frac < 0.98;
  }
  const oInfo = findUpcomingSignalTurn(other);
  if (!oInfo || oInfo.nodeKey !== nodeKey) return false;
  // Creeping past / very close to the stop line counts as occupying the box
  return oInfo.dist < ALLIE_CONFIG.STOP_LINE_GAP * 0.55 && other.speed > 0.4;
}

// Don't barge into a junction whose path is occupied. Cars off your path
// only earn caution (slow), never a hard hold.
function intersectionClearanceConstraintFor(car) {
  if (car.isProbe) return null;

  const info = findUpcomingSignalTurn(car);
  if (!info) {
    car._ixHoldT = 0;
    car._ixBlocker = null;
    return null;
  }

  // Already committed deep into the turn — mid-box freezes are traffic/hard-safety's job
  if (car.legIndex === info.turnLegIndex) {
    const frac = (car.traveledLength - info.turnLeg.cumStart) / Math.max(info.turnLeg.length, 0.01);
    if (frac >= ALLIE_CONFIG.JUNCTION_COMMIT_FRAC) {
      car._ixHoldT = 0;
      car._ixBlocker = null;
      return null;
    }
  }

  if (info.dist > ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD) {
    car._ixHoldT = 0;
    car._ixBlocker = null;
    return null;
  }

  const turnAtom = info.turnLeg.atom;
  const conflicts = turnAtom && turnAtom.conflicts;
  const myOrigin = turnAtom && turnAtom.originStub;
  const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
  const nSamp = sampleIntersectionPath(car, info);
  if (!nSamp) return null;

  const pathHalfSq = ALLIE_CONFIG.IX_PATH_HALF * ALLIE_CONFIG.IX_PATH_HALF;
  const softHalfSq = (ALLIE_CONFIG.IX_PATH_HALF * 2.4) * (ALLIE_CONFIG.IX_PATH_HALF * 2.4);
  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const halfCone = (ALLIE_CONFIG.HEAD_CONE_DEG * Math.PI / 180) * 0.5;

  let blocker = null;
  let blockerGap = Infinity;
  let cautionScore = 0;

  const nearby = collectNearbyCars(egoX, egoY, ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD + 40);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;

    // Same-approach queue is handled by forward traffic sensors
    const oLeg = other.route && other.route[other.legIndex];
    const oTurn = (oLeg && oLeg.atom.kind === 'turn') ? oLeg.atom : null;
    const oInfo = findUpcomingSignalTurn(other);
    const oTurnAtom = oTurn || (oInfo && oInfo.turnLeg && oInfo.turnLeg.atom);
    if (oTurnAtom && myOrigin && oTurnAtom.originStub === myOrigin) continue;
    if (oInfo && oInfo.nodeKey === info.nodeKey && oInfo.segId === info.segId
        && oInfo.turnType === info.turnType) continue;

    const ocx = other._cx, ocy = other._cy;
    const dx = ocx - egoX, dy = ocy - egoY;
    const dist = Math.hypot(dx, dy);
    const fwd = dx * cosH + dy * sinH;
    const lat = -dx * sinH + dy * cosH;
    const bearing = Math.atan2(lat, Math.max(0.01, fwd));
    const inHead = fwd > 0 && Math.abs(bearing) <= halfCone;

    let bestLatSq = Infinity, bestS = 0;
    for (let k = 0; k < nSamp; k++) {
      const samp = _ixPathSamples[k];
      const ddx = ocx - samp.x, ddy = ocy - samp.y;
      const dSq = ddx * ddx + ddy * ddy;
      if (dSq < bestLatSq) { bestLatSq = dSq; bestS = samp.s; }
    }

    const inBox = otherIsInIntersection(other, info.nodeKey);
    const onMyPath = bestLatSq <= pathHalfSq && bestS >= info.turnLeg.cumStart - 1;
    const nearMyPath = bestLatSq <= softHalfSq && bestS >= info.turnLeg.cumStart - 2;

    // Graph conflict + currently occupying / aiming at the box
    let conflictHit = false;
    if (conflicts && oTurnAtom && oTurnAtom.nodeKey === info.nodeKey && conflicts.has(oTurnAtom.id)) {
      if (inBox || (oInfo && oInfo.dist < ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD * 0.7 && other.speed > 1.0)) {
        conflictHit = true;
      }
    }

    // Hard hold only when the threat is inside the driver-head 60° sensor wedge
    if (inHead && onMyPath && (inBox || conflictHit || other.speed < 1.5)) {
      const gap = bestS - car.traveledLength;
      if (gap < blockerGap) {
        blockerGap = gap;
        blocker = other;
      }
      continue;
    }

    // Off path but in/near the box → caution only (human "watch them")
    if (!nearMyPath && !conflictHit && !inBox) continue;

    if (inHead && conflictHit && inBox) {
      // Conflicting mover in the box but not on our polyline — still hold if close
      if (bestLatSq < softHalfSq * 0.7 || dist < 14) {
        const gap = Math.max(0, bestS - car.traveledLength);
        if (gap < blockerGap) {
          blockerGap = gap;
          blocker = other;
        }
        continue;
      }
    }

    if (inBox || (nearMyPath && inHead) || (conflictHit && inHead)) {
      const prox = 1 - clampNum(dist / (ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD + 20), 0, 1);
      const pathProx = 1 - clampNum(Math.sqrt(bestLatSq) / (ALLIE_CONFIG.IX_PATH_HALF * 2.4), 0, 1);
      const score = Math.max(prox * 0.55, pathProx * 0.85) * (inHead ? 1 : 0.65);
      if (score > cautionScore) cautionScore = score;
    }
  }

  // Drop hold if the blocker left the head sensor wedge (e.g. passed behind / aside)
  if (blocker) {
    const bdx = blocker._cx - egoX, bdy = blocker._cy - egoY;
    const bfwd = bdx * cosH + bdy * sinH;
    if (bfwd <= 0) blocker = null;
    else {
      const blat = -bdx * sinH + bdy * cosH;
      const bbearing = Math.atan2(blat, bfwd);
      if (Math.abs(bbearing) > halfCone) blocker = null;
    }
  }

  car._ixBlocker = blocker || null;

  if (blocker) {
    if (car._ixHoldSince == null) car._ixHoldSince = simTime;
    const waited = simTime - car._ixHoldSince;
    const stillBlocking = (otherIsInIntersection(blocker, info.nodeKey)
      || blocker.speed > 0.8);
    if (waited >= ALLIE_CONFIG.IX_HOLD_TIMEOUT && !stillBlocking) {
      car._ixHoldSince = null;
      car._ixBlocker = null;
      return null;
    }
    if (waited >= ALLIE_CONFIG.IX_HOLD_TIMEOUT && blocker.speed < 0.3) {
      // Frozen corpse off to the side of a nearly-cleared path — creep past
      const bc = carCenter(blocker);
      let minLat = Infinity;
      for (let k = 0; k < nSamp; k++) {
        const samp = _ixPathSamples[k];
        const d = Math.hypot(bc.x - samp.x, bc.y - samp.y);
        if (d < minLat) minLat = d;
      }
      if (minLat > ALLIE_CONFIG.IX_PATH_HALF * 1.15) {
        car._ixHoldSince = null;
        return {
          desired: ALLIE_CONFIG.HARD_SAFETY_CREEP,
          decelRate: ALLIE_CONFIG.DECEL_NORMAL,
          status: 'Clearing intersection'
        };
      }
    }

    const c = stopConstraint(car, stopDist);
    if (c) {
      return { desired: c.desired, decelRate: c.decelRate, status: 'Waiting for clear' };
    }
    if (stopDist < 1.5) {
      return { desired: 0, decelRate: ALLIE_CONFIG.SIGNAL_DECEL, status: 'Waiting for clear' };
    }
    return {
      desired: ALLIE_CONFIG.CRUISE_SPEED * clampNum(stopDist / ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD, 0.15, 0.7),
      decelRate: ALLIE_CONFIG.DECEL_NORMAL,
      status: 'Waiting for clear'
    };
  }

  car._ixHoldSince = null;
  car._ixHoldT = 0;

  if (cautionScore > 0.12) {
    const cap = ALLIE_CONFIG.CRUISE_SPEED * (1 - ALLIE_CONFIG.IX_CAUTION_SLOWDOWN * cautionScore);
    return {
      desired: Math.max(ALLIE_CONFIG.MIN_TURN_SPEED * 0.7, cap),
      decelRate: ALLIE_CONFIG.DECEL_NORMAL,
      status: 'Intersection caution'
    };
  }
  return null;
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
  const ax = a._cx != null ? a._cx : carCenter(a).x;
  const ay = a._cy != null ? a._cy : carCenter(a).y;
  const bx = b._cx != null ? b._cx : carCenter(b).x;
  const by = b._cy != null ? b._cy : carCenter(b).y;
  const dx = bx - ax, dy = by - ay;
  const cosA = a._cosH != null ? a._cosH : Math.cos(a.heading);
  const sinA = a._sinH != null ? a._sinH : Math.sin(a.heading);
  const cosB = b._cosH != null ? b._cosH : Math.cos(b.heading);
  const sinB = b._sinH != null ? b._sinH : Math.sin(b.heading);
  const fwdA = dx * cosA + dy * sinA; // b ahead of a?
  const fwdB = -dx * cosB - dy * sinB; // a ahead of b?

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

  const nearby = collectNearbyCars(acx, acy, reach);
  if (!nearby.length) return null;

  let worst = null;
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
  // Brand-new spawns: crawl instead of hard-freezing on the pad so the
  // spawner queue can keep feeding even when the nose is already occupied.
  if (car._spawnGraceT > 0) {
    const creep = ALLIE_CONFIG.HARD_SAFETY_CREEP;
    const h = car.heading + (creep / ALLIE_CONFIG.WHEELBASE) * Math.tan(steer) * dt;
    const nx = car.x + Math.cos(h) * creep * dt;
    const ny = car.y + Math.sin(h) * creep * dt;
    if (!wouldCollideAt(car, nx, ny, h)) {
      car.speed = creep;
      return { x: nx, y: ny, heading: h, blocked: true };
    }
  }
  return { x: car.x, y: car.y, heading: car.heading, blocked: true };
}

// If two cars are already overlapping while both stopped, the WINNER must be
// allowed to creep out — otherwise neither ever moves (hard safety only runs
// when speed > 0, and traffic may also hold them).
function tryUnstickWinner(car, dt) {
  if (car.speed > 0.15) { car._hardStuckT = 0; return false; }
  if (cars.length < 2) { car._hardStuckT = 0; return false; }
  // Cheap stagger — jammed pairs still resolve within ~2 frames
  if (((car.id + tickFrame) & 1) === 1 && !car._hardStuckT) return false;

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

  // Don't enter a junction whose path is occupied (green light does not mean "go
  // into a blocked box"). Off-path cars in the box only earn caution.
  const ixClear = intersectionClearanceConstraintFor(car);
  if (ixClear && ixClear.desired < desired) {
    desired = ixClear.desired;
    decelRate = Math.max(decelRate, ixClear.decelRate);
    signalStatus = ixClear.status;
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

  // Hold behind a car that is staging / reversing into a parking stall
  const parkYield = parkingYieldConstraintFor(car);
  if (parkYield && parkYield.desired < desired) {
    desired = parkYield.desired;
    decelRate = Math.max(decelRate, parkYield.decelRate);
    signalStatus = parkYield.status;
  }

  // Staging approach — brake toward the stage point beside the stall
  const parkApproach = parkingApproachConstraintFor(car);
  if (parkApproach && parkApproach.desired < desired) {
    desired = parkApproach.desired;
    decelRate = Math.max(decelRate, parkApproach.decelRate);
    signalStatus = parkApproach.status;
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

  // Forward driver-head cone — looks further (±30°) with nested caution rings
  const head = headAwarenessConstraintFor(car);
  if (head && head.desired < desired) {
    desired = head.desired;
    decelRate = Math.max(decelRate, head.decelRate);
    if (!signalStatus || signalStatus === 'Caution') signalStatus = head.status;
  }

  // Actively inside the blend — this status wins over everything softer
  if (curLeg && curLeg.atom.kind === 'lanechange') {
    signalStatus = 'Changing lanes';
  }

  // Player takeover — gas/brake/stop override AI target; release resumes AI
  const player = applyPlayerSpeedOverride(car, desired, decelRate);
  desired = player.desired;
  decelRate = player.decelRate;
  if (player.status) signalStatus = player.status;

  car._signalStatus = signalStatus;

  return { desired, decelRate };
}

// ================================================================
// PARALLEL PARKING — destination-triggered reverse RH maneuver
//
// When a car's destination lands on a road with curb parking (and the
// drive-panel toggle is on), it searches for a free stall on approach,
// stages past it with blinker on, then backs in along a two-arc S-curve
// sized from that stall's geometry. Trailing cars hold and wait.
// ================================================================

function parkingBaysAvailable() {
  return typeof parkingBays !== 'undefined' && Array.isArray(parkingBays) && parkingBays.length > 0;
}

function findSegmentById(segId) {
  if (!segments || segId == null) return null;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].id === segId) return segments[i];
  }
  return null;
}

function ensureBayStalls(bay) {
  if (!bay) return null;
  if (!bay._stalls || bay._stalls.length !== bay.count) {
    bay._stalls = new Array(bay.count).fill(null);
  }
  return bay._stalls;
}

function stallIsFree(bay, index) {
  const stalls = ensureBayStalls(bay);
  return !stalls[index];
}

function reserveStall(bay, index, car) {
  const stalls = ensureBayStalls(bay);
  if (stalls[index] && stalls[index].carId !== car.id) return false;
  stalls[index] = { carId: car.id, status: 'reserved' };
  return true;
}

function occupyStall(bay, index, car) {
  const stalls = ensureBayStalls(bay);
  stalls[index] = { carId: car.id, status: 'occupied' };
}

function releaseStallReservation(car) {
  if (!car || !car._parkPlan) return;
  const bay = car._parkPlan.bay;
  const idx = car._parkPlan.stallIndex;
  if (!bay || !bay._stalls || idx == null) return;
  const slot = bay._stalls[idx];
  if (slot && slot.carId === car.id && slot.status === 'reserved') {
    bay._stalls[idx] = null;
  }
}

function clearAllParkingStalls() {
  if (!parkingBaysAvailable()) return;
  for (let i = 0; i < parkingBays.length; i++) {
    parkingBays[i]._stalls = null;
  }
}

function clearParkingIntent(car) {
  if (!car) return;
  releaseStallReservation(car);
  car.parkingIntent = null;
  car.parkPhase = null;
  car._parkPlan = null;
  car._parkStagePoint = null;
  car._parkStageHeading = null;
  car._parkBlinker = null;
  car._parkArcS = 0;
  car._parkSearchT = 0;
  car._parkSettleT = 0;
  car._parkDebug = null;
}

function segmentHasParkingForLane(seg, laneOffsetSign) {
  if (!seg || !parkingBaysAvailable()) return false;
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (bay.segId !== seg.id) continue;
    if (laneOffsetSign === 0 || laneOffsetSign == null) return true;
    if (bay.side === laneOffsetSign) return true;
  }
  return false;
}

function laneOffsetSignForAtom(atom) {
  if (!atom || atom.kind !== 'lane') return 0;
  const seg = findSegmentById(atom.segId);
  if (!seg || typeof getLaneSpecsFor !== 'function') return 0;
  const specs = getLaneSpecsFor(seg);
  if (!specs) return 0;
  for (let i = 0; i < specs.length; i++) {
    if (specs[i].idx === atom.laneIdx) {
      const o = specs[i].offset;
      if (Math.abs(o) < 1e-6) return 0;
      return o > 0 ? 1 : -1;
    }
  }
  return 0;
}

function evaluateParkingIntent(car) {
  if (!car) return;
  if (car.state === 'parking' || car.state === 'parked') return;
  if (car.parkPhase === 'staging' || car.parkPhase === 'reverse1'
      || car.parkPhase === 'reverse2' || car.parkPhase === 'settle') return;
  clearParkingIntent(car);
  if (!parkingSearchEnabled || !parkingBaysAvailable()) return;
  const dest = car.destPick;
  if (!dest || !dest.atom || dest.atom.kind !== 'lane') return;
  const seg = findSegmentById(dest.atom.segId);
  if (!seg) return;
  const side = laneOffsetSignForAtom(dest.atom);
  if (!segmentHasParkingForLane(seg, side || 0)) return;
  car.parkingIntent = { segId: dest.atom.segId, side: side || 0 };
  car.parkPhase = null;
  car._parkDebug = { phase: 'armed', spot: '—' };
}

function stallCenterWorld(bay, index) {
  const L = bay.spotLength;
  const D = bay.spotDepth;
  const t0 = index * L + L * 0.5;
  return {
    x: bay.x1 + bay.ux * t0 + bay.nx * D * 0.5,
    y: bay.y1 + bay.uy * t0 + bay.ny * D * 0.5
  };
}

function makeParkArc(cx, cy, r, a0, sweep) {
  const length = Math.max(0.001, Math.abs(sweep) * r);
  return {
    cx, cy, r, a0, sweep, length,
    sampleAtS(s) {
      const t = clampNum(s / length, 0, 1);
      const a = a0 + sweep * t;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      // Path tangent in +s direction (stage → goal). Car reverses along +s,
      // so nose (heading) points opposite the path travel direction.
      const sgn = sweep >= 0 ? 1 : -1;
      const ptx = -Math.sin(a) * sgn;
      const pty = Math.cos(a) * sgn;
      return { x, y, tx: -ptx, ty: -pty };
    }
  };
}

function parkPoseOBB(x, y, heading) {
  const midFromRear = ALLIE_CONFIG.CAR_LENGTH * 0.5 - ALLIE_CONFIG.REAR_OVERHANG;
  const cos = Math.cos(heading), sin = Math.sin(heading);
  return {
    cx: x + cos * midFromRear,
    cy: y + sin * midFromRear,
    heading,
    _cosH: cos,
    _sinH: sin,
    hl: ALLIE_CONFIG.CAR_LENGTH * 0.5,
    hw: ALLIE_CONFIG.CAR_WIDTH * 0.5
  };
}

function stallQuadAsOBB(corners) {
  // Approximate stall as axis-aligned-to-stall OBB from corners 0..3
  let cx = 0, cy = 0;
  for (let i = 0; i < 4; i++) { cx += corners[i].x; cy += corners[i].y; }
  cx *= 0.25; cy *= 0.25;
  const ux = corners[1].x - corners[0].x, uy = corners[1].y - corners[0].y;
  const ul = Math.hypot(ux, uy) || 1;
  const nx = corners[3].x - corners[0].x, ny = corners[3].y - corners[0].y;
  const nl = Math.hypot(nx, ny) || 1;
  const heading = Math.atan2(uy / ul, ux / ul);
  return {
    cx, cy, heading,
    _cosH: Math.cos(heading), _sinH: Math.sin(heading),
    hl: ul * 0.5,
    hw: nl * 0.5
  };
}

function parkingManeuverClearOfNeighbors(plan, bay, stallIndex) {
  if (typeof parkingBayCorners !== 'function') return true;
  const neighbors = [];
  if (stallIndex > 0) neighbors.push(stallIndex - 1);
  if (stallIndex < bay.count - 1) neighbors.push(stallIndex + 1);
  if (!neighbors.length) return true;

  const samples = [];
  const n = PARKING_CONFIG.NEIGHBOR_SAMPLES;
  for (let i = 0; i <= n; i++) {
    const s1 = (i / n) * plan.arc1.length;
    samples.push(plan.arc1.sampleAtS(s1));
  }
  for (let i = 1; i <= n; i++) {
    const s2 = (i / n) * plan.arc2.length;
    samples.push(plan.arc2.sampleAtS(s2));
  }

  for (let nIdx = 0; nIdx < neighbors.length; nIdx++) {
    const ni = neighbors[nIdx];
    // Only check occupied (or reserved-by-other) neighbors — empty pads are fine
    const slot = bay._stalls && bay._stalls[ni];
    if (!slot || slot.status !== 'occupied') continue;
    const corners = parkingBayCorners(bay, ni);
    const stallObb = stallQuadAsOBB(corners);
    for (let s = 0; s < samples.length; s++) {
      const p = samples[s];
      const heading = Math.atan2(p.ty, p.tx);
      const carObb = parkPoseOBB(p.x, p.y, heading);
      if (obbOverlap(carObb, stallObb, PARKING_CONFIG.NEIGHBOR_MARGIN)) return false;
    }
  }
  return true;
}

function computeParkingManeuver(bay, stallIndex, approachUx, approachUy, laneX, laneY) {
  const midFromRear = ALLIE_CONFIG.CAR_LENGTH * 0.5 - ALLIE_CONFIG.REAR_OVERHANG;
  const alen = Math.hypot(approachUx, approachUy) || 1;
  const tx = approachUx / alen, ty = approachUy / alen;
  // Curb normal must point from lane toward stall
  let nx = bay.nx, ny = bay.ny;
  const center = stallCenterWorld(bay, stallIndex);
  const toStallX = center.x - laneX, toStallY = center.y - laneY;
  if (toStallX * nx + toStallY * ny < 0) {
    nx = -nx; ny = -ny;
  }

  const goalHeading = Math.atan2(ty, tx);
  const goalX = center.x - tx * midFromRear;
  const goalY = center.y - ty * midFromRear;

  // Lateral shift from travel-lane rear-axle line to stall goal (toward curb)
  const laneLat = (laneX - goalX) * nx + (laneY - goalY) * ny;
  let D = Math.abs(laneLat);
  if (D < 1.2) {
    const seg = findSegmentById(bay.segId);
    const half = (typeof roadBedHalfWidth === 'function' && seg)
      ? roadBedHalfWidth(seg) : 4.75;
    // Typical: from outermost lane center (~half - 0.75) out to stall mid-depth
    D = Math.max(1.8, half * 0.55 + bay.spotDepth * 0.45);
  }
  D = clampNum(D, 1.5, 12);

  // Blinker: curb on driver's right if n cross heading > 0 in SVG local-right frame
  // local right = (-ty, tx); curb is "right" if n · right > 0
  const rightDot = nx * (-ty) + ny * tx;
  const blinker = rightDot >= 0 ? 'right' : 'left';

  let sweepDeg = PARKING_CONFIG.SWEEP_DEG;
  let plan = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const theta = sweepDeg * Math.PI / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const R = D / (2 * Math.max(1e-4, 1 - cosT));
    const L = 2 * R * sinT + PARKING_CONFIG.STAGE_EXTRA;

    // Stage is ahead of goal along travel, and out in the lane (away from curb)
    const stageX = goalX + tx * L - nx * D;
    const stageY = goalY + ty * L - ny * D;

    const Sx = stageX, Sy = stageY;
    const Gx = goalX, Gy = goalY;

    const C1x = Sx + nx * R, C1y = Sy + ny * R;
    const C2x = Gx - nx * R, C2y = Gy - ny * R;

    const aS = Math.atan2(Sy - C1y, Sx - C1x);
    // Midpoint between circle centers (external touch point)
    const mx = (C1x + C2x) * 0.5, my = (C1y + C2y) * 0.5;
    const aM1 = Math.atan2(my - C1y, mx - C1x);
    let sweep1 = aM1 - aS;
    while (sweep1 > Math.PI) sweep1 -= Math.PI * 2;
    while (sweep1 < -Math.PI) sweep1 += Math.PI * 2;
    // Prefer the shorter rotation whose magnitude ≈ θ
    if (Math.abs(Math.abs(sweep1) - theta) > 0.35) {
      // flip to the other way if needed
      if (sweep1 > 0) sweep1 -= Math.PI * 2;
      else sweep1 += Math.PI * 2;
    }

    const aM2 = Math.atan2(my - C2y, mx - C2x);
    const aG = Math.atan2(Gy - C2y, Gx - C2x);
    let sweep2 = aG - aM2;
    while (sweep2 > Math.PI) sweep2 -= Math.PI * 2;
    while (sweep2 < -Math.PI) sweep2 += Math.PI * 2;
    if (Math.abs(Math.abs(sweep2) - theta) > 0.35) {
      if (sweep2 > 0) sweep2 -= Math.PI * 2;
      else sweep2 += Math.PI * 2;
    }

    const arc1 = makeParkArc(C1x, C1y, R, aS, sweep1);
    const arc2 = makeParkArc(C2x, C2y, R, aM2, sweep2);
    const candidate = {
      bay,
      stallIndex,
      stagePoint: { x: Sx, y: Sy },
      stageHeading: goalHeading,
      goalPoint: { x: Gx, y: Gy },
      goalHeading,
      arc1,
      arc2,
      length1: arc1.length,
      length2: arc2.length,
      blinker,
      D,
      R,
      sweepDeg,
      finalPose: { x: Gx, y: Gy, heading: goalHeading }
    };

    if (parkingManeuverClearOfNeighbors(candidate, bay, stallIndex)) {
      plan = candidate;
      break;
    }
    sweepDeg = Math.max(PARKING_CONFIG.SWEEP_MIN_DEG, sweepDeg - 3);
    plan = candidate; // keep last even if not clear — best effort
  }

  // Last-resort: nudge goal slightly forward if still colliding
  if (plan && !parkingManeuverClearOfNeighbors(plan, bay, stallIndex)) {
    const nudge = 0.6;
    plan.goalPoint.x += tx * nudge;
    plan.goalPoint.y += ty * nudge;
    plan.finalPose.x = plan.goalPoint.x;
    plan.finalPose.y = plan.goalPoint.y;
  }
  return plan;
}

function findParkingCandidate(car) {
  if (!car.parkingIntent || !parkingBaysAvailable()) return null;
  const segId = car.parkingIntent.segId;
  const seg = findSegmentById(segId);
  if (!seg) return null;

  const pos = carFullSegPos(car);
  const curLeg = car.route[car.legIndex];
  if (!curLeg || curLeg.atom.kind !== 'lane' || curLeg.atom.segId !== segId) return null;

  // Travel direction from current lane sample
  const sample = curLeg.atom.sampleAtT(currentLegFrac(car));
  if (!sample) return null;
  const approachUx = sample.tx, approachUy = sample.ty;

  const side = laneOffsetSignForAtom(curLeg.atom);
  const carAlong = typeof projectAlongSeg === 'function'
    ? projectAlongSeg(seg, car.x, car.y)
    : 0;

  let best = null;
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    if (bay.segId !== segId) continue;
    if (side !== 0 && bay.side !== side) continue;
    // Bay travel vs car travel: stall must be ahead
    const bayDot = bay.ux * approachUx + bay.uy * approachUy;
    for (let i = 0; i < bay.count; i++) {
      if (!stallIsFree(bay, i)) continue;
      const sc = stallCenterWorld(bay, i);
      const along = typeof projectAlongSeg === 'function'
        ? projectAlongSeg(seg, sc.x, sc.y)
        : 0;
      // Ahead in travel direction
      const ahead = (along - carAlong) * (bayDot >= 0 ? 1 : -1);
      // Need room to stage past the stall
      if (ahead < ALLIE_CONFIG.CAR_LENGTH * 0.4) continue;
      if (ahead > 120) continue;
      if (!best || ahead < best.ahead) {
        best = { bay, stallIndex: i, ahead, approachUx, approachUy, laneX: sample.x, laneY: sample.y };
      }
    }
  }
  return best;
}

function beginParkingStaging(car, candidate) {
  if (!reserveStall(candidate.bay, candidate.stallIndex, car)) return false;
  const plan = computeParkingManeuver(
    candidate.bay, candidate.stallIndex,
    candidate.approachUx, candidate.approachUy,
    candidate.laneX, candidate.laneY
  );
  if (!plan) {
    releaseStallReservation(car);
    return false;
  }
  car._parkPlan = plan;
  car._parkStagePoint = plan.stagePoint;
  car._parkStageHeading = plan.stageHeading;
  car._parkBlinker = plan.blinker;
  car.parkPhase = 'staging';
  car._parkArcS = 0;
  car._parkSettleT = 0;
  car._parkDebug = {
    phase: 'staging',
    spot: 'bay#' + candidate.bay.id + '[' + candidate.stallIndex + ']',
    blinker: plan.blinker,
    dist: null
  };
  return true;
}

function updateParkingSearch(car, dt) {
  if (!car.parkingIntent || car.state !== 'driving') return;
  if (car.parkPhase === 'staging') {
    // Check arrival at stage pose
    const sp = car._parkStagePoint;
    if (!sp) return;
    const dist = Math.hypot(car.x - sp.x, car.y - sp.y);
    let dHead = car.heading - (car._parkStageHeading || car.heading);
    while (dHead > Math.PI) dHead -= Math.PI * 2;
    while (dHead < -Math.PI) dHead += Math.PI * 2;
    if (car._parkDebug) car._parkDebug.dist = dist;
    if (dist <= PARKING_CONFIG.STAGE_POS_TOL
        && Math.abs(dHead) <= PARKING_CONFIG.STAGE_HEAD_TOL
        && car.speed <= 1.2) {
      car.state = 'parking';
      car.parkPhase = 'reverse1';
      car._parkArcS = 0;
      car.speed = 0;
      if (car._parkDebug) car._parkDebug.phase = 'reverse1';
    }
    return;
  }

  const curLeg = car.route[car.legIndex];
  if (!curLeg || curLeg.atom.kind !== 'lane') return;
  if (curLeg.atom.segId !== car.parkingIntent.segId) {
    // Not yet on the parking street (or already past) — arm when we arrive
    if (car.parkPhase === 'searching') {
      // Left the segment without parking
      clearParkingIntent(car);
    }
    return;
  }

  if (!car.parkPhase) car.parkPhase = 'searching';
  if (car.parkPhase !== 'searching') return;

  car._parkSearchT = (car._parkSearchT || 0) + dt;
  if (car._parkSearchT < PARKING_CONFIG.SEARCH_INTERVAL) return;
  car._parkSearchT = 0;

  const candidate = findParkingCandidate(car);
  if (candidate) {
    beginParkingStaging(car, candidate);
    return;
  }

  // Running out of road on this destination leg with no stall
  const remainingOnSeg = Math.max(0, curLeg.cumEnd - car.traveledLength);
  if (remainingOnSeg < ALLIE_CONFIG.CAR_LENGTH * 1.2) {
    clearParkingIntent(car);
  } else if (car._parkDebug) {
    car._parkDebug = { phase: 'searching', spot: 'none free', blinker: null, dist: null };
  }
}

function parkingApproachConstraintFor(car) {
  if (car.parkPhase !== 'staging' || !car._parkStagePoint) return null;
  const sp = car._parkStagePoint;
  const dist = Math.hypot(car.x - sp.x, car.y - sp.y);
  const rate = PARKING_CONFIG.APPROACH_DECEL;
  const target = Math.sqrt(Math.max(0, 2 * rate * Math.max(dist - 0.3, 0)));
  if (dist <= PARKING_CONFIG.STAGE_POS_TOL * 1.15) {
    return { desired: 0, decelRate: rate, status: 'Pulling in to park' };
  }
  return {
    desired: Math.min(ALLIE_CONFIG.CRUISE_SPEED * 0.45, Math.max(0, target)),
    decelRate: rate,
    status: 'Pulling in to park'
  };
}

function parkingYieldConstraintFor(car) {
  car._parkYieldOther = null;
  if (car.state === 'parking' || car.state === 'parked') return null;
  if (car.parkPhase === 'staging') return null;
  if (car.isProbe) return null;

  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const look = PARKING_CONFIG.YIELD_LOOKAHEAD;
  const nearby = collectNearbyCars(egoX, egoY, look + 10);
  let best = null;

  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe) continue;
    const parking = other.state === 'parking'
      || other.parkPhase === 'staging';
    if (!parking) continue;
    const ocx = other._cx != null ? other._cx : other.x;
    const ocy = other._cy != null ? other._cy : other.y;
    const dx = ocx - egoX, dy = ocy - egoY;
    const fwd = dx * cosH + dy * sinH;
    if (fwd < 1.5 || fwd > look) continue;
    const lat = Math.abs(-dx * sinH + dy * cosH);
    if (lat > PARKING_CONFIG.YIELD_LATERAL) continue;
    const gap = fwd - ALLIE_CONFIG.CAR_LENGTH;
    if (!best || gap < best.gap) best = { other, gap };
  }
  if (!best) return null;
  car._parkYieldOther = best.other;
  const holdGap = PARKING_CONFIG.YIELD_GAP;
  const closing = Math.max(0, best.gap - holdGap);
  const rate = ALLIE_CONFIG.DECEL_NORMAL;
  const desired = best.gap <= holdGap
    ? 0
    : Math.sqrt(Math.max(0, 2 * rate * closing));
  return {
    desired: Math.min(desired, ALLIE_CONFIG.CRUISE_SPEED * 0.5),
    decelRate: rate,
    status: 'Waiting for parking'
  };
}

function updateParkingMotion(car, dt) {
  if (car.state === 'parked') {
    car.speed = 0;
    applyCarTransform(car);
    return;
  }
  if (car.state !== 'parking') return;

  const plan = car._parkPlan;
  if (!plan) {
    car.state = 'driving';
    clearParkingIntent(car);
    return;
  }

  if (car.parkPhase === 'settle') {
    car.speed = 0;
    car._parkSettleT = (car._parkSettleT || 0) + dt;
    // Snap gently to final pose
    const fp = plan.finalPose;
    car.x += (fp.x - car.x) * Math.min(1, dt * 6);
    car.y += (fp.y - car.y) * Math.min(1, dt * 6);
    car.heading += (fp.heading - car.heading) * Math.min(1, dt * 6);
    refreshCarPoseCache(car);
    applyCarTransform(car);
    updateCarBlinkers(car, dt);
    if (car._parkSettleT >= PARKING_CONFIG.SETTLE_TIME) {
      car.x = fp.x;
      car.y = fp.y;
      car.heading = fp.heading;
      car.state = 'parked';
      car.parkPhase = 'parked';
      car._parkBlinker = null;
      car.speed = 0;
      occupyStall(plan.bay, plan.stallIndex, car);
      if (car._parkDebug) car._parkDebug.phase = 'parked';
      refreshCarPoseCache(car);
      applyCarTransform(car);
    }
    if (car.selected) {
      updateFollowedCarInfo(car);
      updateFollowTagPosition(car);
    }
    return;
  }

  const arc = car.parkPhase === 'reverse1' ? plan.arc1 : plan.arc2;
  const arcLen = arc.length;
  const targetSpeed = PARKING_CONFIG.REVERSE_SPEED;
  if (car.speed < targetSpeed) {
    car.speed = Math.min(targetSpeed, car.speed + PARKING_CONFIG.REVERSE_ACCEL * dt);
  } else {
    car.speed = Math.max(targetSpeed, car.speed - PARKING_CONFIG.REVERSE_DECEL * dt);
  }

  // Ease to stop near end of arc
  const remaining = arcLen - (car._parkArcS || 0);
  const stopDist = (car.speed * car.speed) / (2 * PARKING_CONFIG.REVERSE_DECEL);
  if (remaining <= stopDist + 0.15) {
    car.speed = Math.min(car.speed, Math.sqrt(Math.max(0, 2 * PARKING_CONFIG.REVERSE_DECEL * Math.max(remaining, 0))));
  }

  car._parkArcS = (car._parkArcS || 0) + car.speed * dt;
  car.braking = remaining < 1.2;

  if (car._parkArcS >= arcLen - 0.02) {
    const end = arc.sampleAtS(arcLen);
    car.x = end.x;
    car.y = end.y;
    car.heading = Math.atan2(end.ty, end.tx);
    car._parkArcS = 0;
    if (car.parkPhase === 'reverse1') {
      car.parkPhase = 'reverse2';
      if (car._parkDebug) car._parkDebug.phase = 'reverse2';
    } else {
      car.parkPhase = 'settle';
      car._parkSettleT = 0;
      car.speed = 0;
      if (car._parkDebug) car._parkDebug.phase = 'settle';
    }
  } else {
    const p = arc.sampleAtS(car._parkArcS);
    car.x = p.x;
    car.y = p.y;
    car.heading = Math.atan2(p.ty, p.tx);
  }

  refreshCarPoseCache(car);
  applyCarTransform(car);
  const lightOpacity = car.braking ? '0.95' : '0.15';
  for (let i = 0; i < car.lightEls.length; i++) setSvgOpacity(car.lightEls[i], lightOpacity);
  updateCarBlinkers(car, dt);

  if (car.selected) {
    updateFollowedCarInfo(car);
    updateFollowTagPosition(car);
  }
}

function drawDebugParking(car) {
  const plan = car._parkPlan;
  if (!plan) return;

  // Stall outline
  if (typeof parkingBayCorners === 'function' && plan.bay) {
    const corners = parkingBayCorners(plan.bay, plan.stallIndex);
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', corners.map(p => p.x + ',' + p.y).join(' '));
    poly.setAttribute('fill', 'rgba(127, 212, 255, 0.18)');
    poly.setAttribute('stroke', '#7fd4ff');
    poly.setAttribute('stroke-width', '0.7');
    poly.setAttribute('stroke-dasharray', '1.5 1');
    appendDebugEl(poly);
  }

  // Stage point
  if (plan.stagePoint) {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', String(plan.stagePoint.x));
    c.setAttribute('cy', String(plan.stagePoint.y));
    c.setAttribute('r', '1.3');
    c.setAttribute('fill', '#ffb020');
    c.setAttribute('stroke', '#fff');
    c.setAttribute('stroke-width', '0.3');
    appendDebugEl(c);
  }

  // Two arcs as polylines
  function drawArc(arc, color) {
    if (!arc) return;
    const STEPS = 14;
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
      const p = arc.sampleAtS((i / STEPS) * arc.length);
      d += (i === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ';
    }
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1.15');
    path.setAttribute('stroke-dasharray', '2 1.1');
    path.setAttribute('opacity', '0.95');
    appendDebugEl(path);
  }
  drawArc(plan.arc1, '#ff9d4d');
  drawArc(plan.arc2, '#7CFF9A');

  if (car._parkYieldOther) {
    const a = carCenter(car);
    const b = carCenter(car._parkYieldOther);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    line.setAttribute('stroke', '#7fd4ff');
    line.setAttribute('stroke-width', '0.9');
    line.setAttribute('stroke-dasharray', '2 1.5');
    line.setAttribute('opacity', '0.9');
    appendDebugEl(line);
  }
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

  if (car.state === 'parked' || car.state === 'parking') {
    updateParkingMotion(car, dt);
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

  if (car.parkingIntent) updateParkingSearch(car, dt);
  // May have flipped into parking during search/staging check
  if (car.state === 'parking' || car.state === 'parked') {
    updateParkingMotion(car, dt);
    return;
  }

  updateLaneChangeSystem(car, dt);
  tickPlayerControl(car);

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
  // (or the parking stage point while lining up beside a stall).
  const Ld = clampNum(car.speed * ALLIE_CONFIG.LOOKAHEAD_K, ALLIE_CONFIG.LOOKAHEAD_MIN, ALLIE_CONFIG.LOOKAHEAD_MAX);
  let target = null;
  if (car.parkPhase === 'staging' && car._parkStagePoint) {
    target = {
      x: car._parkStagePoint.x,
      y: car._parkStagePoint.y,
      tx: Math.cos(car._parkStageHeading || car.heading),
      ty: Math.sin(car._parkStageHeading || car.heading)
    };
  } else {
    target = sampleRouteAtDistance(car, car.traveledLength + Ld);
  }

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

  if (car.speed > 0.02 && cars.length > 1) {
    // Stagger full OBB checks across frames when not recently blocked
    if (car._hardSafetyHit || ((car.id + tickFrame) & 1) === 0) {
      const resolved = resolveHardSafety(car, nextX, nextY, nextHeading, steer, dt);
      nextX = resolved.x;
      nextY = resolved.y;
      nextHeading = resolved.heading;
    }
  } else {
    car._hardSafetyHit = null;
  }

  car.heading = nextHeading;
  car.x = nextX;
  car.y = nextY;
  refreshCarPoseCache(car);

  if (car.parkPhase !== 'staging') {
    car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt);
    advanceCarLeg(car);

    if (car.traveledLength >= car.totalLength - 0.05 && car.speed <= 0.5) {
      beginDespawn(car);
    }
  } else {
    // Still advance legs slowly so we don't look "stuck" on HUD remaining,
    // but don't despawn while lining up to park.
    car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt * 0.15);
    advanceCarLeg(car);
    // Re-check stage arrival after motion
    updateParkingSearch(car, 0);
    if (car.state === 'parking') {
      applyCarTransform(car);
      updateCarBlinkers(car, dt);
      if (car.selected) {
        updateFollowedCarInfo(car);
        updateFollowTagPosition(car);
      }
      return;
    }
  }

  applyCarTransform(car);
  const lightOpacity = car.braking ? '0.95' : '0.15';
  for (let i = 0; i < car.lightEls.length; i++) setSvgOpacity(car.lightEls[i], lightOpacity);
  updateCarBlinkers(car, dt);

  if (car.selected) {
    updateFollowedCarInfo(car);
    updateFollowTagPosition(car);
  }

  updateIdleCarWatchdog(car, dt);
}

// True when the car is waiting on something it understands (traffic, signals,
// junction yield, player input, etc.) — do NOT cull these as idle zombies.
function carKnowsItIsBusy(car) {
  if (car === controlledCar) return true;
  if (car.state === 'despawning') return true;
  if (car.state === 'parking' || car.state === 'parked') return true;
  if (car.parkPhase === 'staging' || car.parkPhase === 'searching') return true;
  if (car.parkingIntent) return true;
  if (car._spawnGraceT > 0) return true;

  const status = car._signalStatus;
  if (status === 'Stopped for traffic' || status === 'Braking for traffic'
      || status === 'Following' || status === 'Waiting for clear'
      || status === 'Intersection caution' || status === 'Waiting for gap'
      || status === 'Yielding' || status === 'Yielding right on red'
      || status === 'Right on red' || status === 'Red light'
      || status === 'Blocked' || status === 'Unsticking'
      || status === 'Player stop' || status === 'Player brake' || status === 'Player gas'
      || status === 'Changing lanes' || status === 'Committed (yellow)'
      || status === 'Letting merge' || status === 'Speeding to merge'
      || status === 'Head caution' || status === 'Caution'
      || status === 'Clearing intersection'
      || status === 'Pulling in to park' || status === 'Waiting for parking') {
    return true;
  }

  if (car._lastObstruction && car._lastObstruction.gap < ALLIE_CONFIG.DETECT_RING_MID) return true;
  if (car._trafficStatus) return true;
  if (car._yieldOther || car._ixBlocker || car._hardSafetyHit) return true;
  if (car.junctionWait) return true;
  if (car.rorPhase && car.rorPhase !== 'cleared') return true;
  if (car.signalDecision && (car.signalDecision.choice === 'stop'
      || car.signalDecision.choice === 'ror')) return true;
  if (car._pendingLaneChangeAtomId && car._laneChangeWaitT > 0) return true;
  return false;
}

function carHasPathObjective(car) {
  if (!car.route || !car.route.length) return false;
  if (!car.destPick) return false;
  return (car.totalLength - car.traveledLength) > 1.5;
}

// Stopped cars with no real objective (and not waiting in known traffic) get
// one repath attempt, then are deleted after IDLE_CULL_SEC.
function updateIdleCarWatchdog(car, dt) {
  if (car.state === 'despawning') return;
  if (car._spawnGraceT > 0) {
    car._spawnGraceT = Math.max(0, car._spawnGraceT - dt);
    car._idleStuckT = 0;
    return;
  }
  if (car.speed > 0.75 || carKnowsItIsBusy(car)) {
    car._idleStuckT = 0;
    car._idleRerouteTried = false;
    return;
  }

  car._idleStuckT = (car._idleStuckT || 0) + dt;

  if (car._idleStuckT >= ALLIE_CONFIG.IDLE_REROUTE_SEC && !car._idleRerouteTried) {
    car._idleRerouteTried = true;
    if (reviveCarOnRoad(car)) return;
  }

  if (car._idleStuckT < ALLIE_CONFIG.IDLE_CULL_SEC) return;

  // Only cull when there's no objective — or the repath already failed and
  // the car is still a motionless zombie with nothing useful to do.
  if (carKnowsItIsBusy(car)) {
    car._idleStuckT = 0;
    return;
  }
  if (carHasPathObjective(car) && !car._idleRerouteTried) return;

  removeCar(car);
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

function isSpawnerPadOccupied(spawnX, spawnY) {
  const rSq = ALLIE_CONFIG.SPAWN_OCCUPY_RADIUS * ALLIE_CONFIG.SPAWN_OCCUPY_RADIUS;
  for (let i = 0; i < cars.length; i++) {
    const other = cars[i];
    if (!other || other.state === 'despawning') continue;
    const ox = other._cx != null ? other._cx : other.x;
    const oy = other._cy != null ? other._cy : other.y;
    const dx = ox - spawnX, dy = oy - spawnY;
    if (dx * dx + dy * dy < rSq) return true;
  }
  return false;
}

// Returns true if a car was spawned, false if skipped (pad crowded).
function trySpawnFromSpawner(spawner) {
  const routes = spawner.routeCache;
  if (!routes || !routes.length) return false;
  const route = routes[Math.floor(Math.random() * routes.length)];
  const legs = route.map(leg => ({
    atom: leg.atom,
    tStart: leg.tStart,
    tEnd: leg.tEnd
  }));
  const first = legs[0];
  if (!first) return false;
  const start = first.atom.sampleAtT(first.tStart);
  // Don't pile onto a car already sitting on the pad
  if (isSpawnerPadOccupied(start.x, start.y)) return false;

  const last = legs[legs.length - 1];
  const pt = last.atom.sampleAtT(last.tEnd);
  const car = spawnCarFromRoute(legs, { atom: last.atom, t: last.tEnd, x: pt.x, y: pt.y });
  if (!car) return false;

  car._spawnGraceT = ALLIE_CONFIG.SPAWN_GRACE_SEC;
  if (car.speed < 1) car.speed = ALLIE_CONFIG.CRUISE_SPEED * 0.35;
  refreshCarPoseCache(car);
  applyCarTransform(car);
  return true;
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
      if (!trySpawnFromSpawner(spawner)) {
        // Pad occupied — hold nearly-ready so we retry soon when clear
        spawner.timer = Math.max(spawner.timer, spawner.intervalSec * 0.75);
        break;
      }
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

const TARGET_FPS = 45;
const FRAME_MS = 1000 / TARGET_FPS;
const FIXED_DT = 1 / TARGET_FPS;
const MAX_DT = 1 / 20; // absorb hitches without huge sim jumps

let tickFrame = 0;
let lastTick = null;
let _boardRectCache = null;
let _boardRectCacheT = 0;

function getBoardRectCached(force) {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (!force && _boardRectCache && (now - _boardRectCacheT) < 250) return _boardRectCache;
  _boardRectCache = board.getBoundingClientRect();
  _boardRectCacheT = now;
  return _boardRectCache;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { _boardRectCache = null; }, { passive: true });
}

function tick(ts) {
  requestAnimationFrame(tick);

  // Target ~60fps; skip only if we're ahead of the display budget.
  if (lastTick != null && ts - lastTick < FRAME_MS * 0.85) return;

  tickFrame++;
  let dt = lastTick == null ? FIXED_DT : (ts - lastTick) / 1000;
  lastTick = ts;
  dt = Math.min(Math.max(dt, FIXED_DT * 0.5), MAX_DT);

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
    if (followHighlightTimer >= 0.2) {
      followHighlightTimer = 0;
      updateRouteHighlight(followedCar);
    }
  } else {
    followHighlightTimer = 0;
  }
  if (driveMode && hoveredCar && !hoveredCar.selected && hoveredCar.state !== 'despawning') {
    hoverHighlightTimer += dt;
    if (hoverHighlightTimer >= 0.2) {
      hoverHighlightTimer = 0;
      updateHoverRouteHighlight(hoveredCar);
    }
  } else {
    hoverHighlightTimer = 0;
  }

  if (debugRingsOn && (tickFrame & 1) === 0) updateDebugOverlay();

  // HUD overlay is not frame-critical
  if ((tickFrame & 7) === 0) {
    const overlayCar = carOverlayTarget();
    if (overlayCar) updateCarOverlayContent(overlayCar);
  }

  // Keep drive/car layers above roads without forcing a reparent every frame
  if ((tickFrame & 63) === 0) {
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