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

function applyRouteToCar(car, rawLegs, destPick, opts) {
  // Roaming-to-parking sets a targeted intent + stall reservation, then
  // pathfinds here. evaluateParkingIntent would wipe that claim and can
  // flip the car back into endless roam — preserve when asked.
  const keepParking = !!(opts && opts.keepParkingIntent);
  const savedIntent = keepParking ? car.parkingIntent : null;
  const savedPhase = keepParking ? car.parkPhase : null;
  const savedPlan = keepParking ? car._parkPlan : null;
  const savedSearchT = keepParking ? car._parkSearchT : null;
  const savedRoamN = keepParking ? car._parkRoamAttempts : null;

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
  if (keepParking && savedIntent) {
    car.parkingIntent = savedIntent;
    car.parkPhase = savedPhase;
    car._parkPlan = savedPlan;
    car._parkSearchT = savedSearchT || 0;
    car._parkRoamAttempts = savedRoamN || 0;
  } else {
    evaluateParkingIntent(car);
  }
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
  // Jam-escape lane changes: a car dead-stopped in gridlock for a while (how
  // long depends on how impatient the driver is) will hunt for *any* reachable
  // window into a visibly clearer sibling lane and force its way over — a
  // tighter, sharper blend than a normal courteous lane change, creeping out
  // only once the other lane is actually clear, then easing back up to speed.
  STUCK_LANECHANGE_MIN: 15,            // most impatient drivers snap after this long stuck
  STUCK_LANECHANGE_MAX: 25,            // calmest drivers wait this long before trying
  STUCK_SPEED_THRESHOLD: 1.0,          // below this speed (and blocked) counts as "stuck"
  EMERGENCY_LANE_CHANGE_LOOKAHEAD: 130, // how far ahead to hunt for an escape window
  EMERGENCY_LANE_DENSITY_RANGE: 35,     // meters of lane sampled when judging congestion
  EMERGENCY_LANE_DENSITY_MIN_GAIN: 1.5, // target lane must look at least this much clearer
  EMERGENCY_LANE_CHANGE_SPEED: 4.5,     // slow, deliberate creep through the sharp blend
  EMERGENCY_LANE_CHANGE_LD: 3.2,        // tight pure-pursuit lookahead → sharper turn-out
  EMERGENCY_POST_MERGE_EASE_TIME: 3.5,  // seconds spent gently accelerating after escaping
  EMERGENCY_POST_MERGE_ACCEL_MULT: 0.35, // fraction of normal accel during that ease-in
  LANE_DECISION_LOOKAHEAD: 70,        // how far ahead discretionary overtakes scan for a window
  OVERTAKE_CHECK_INTERVAL: 2.8,
  OVERTAKE_SPEED_DEFICIT: 16,
  OVERTAKE_MIN_GAIN: 10,
  COURTESY_EASE_FACTOR: 0.4,
  COURTESY_RANGE: 22,
  // Scootch-up: merger squeezing in behind + spare gap ahead → ease forward
  // a few meters to open the hole, without eating the follow cushion.
  SCOOTCH_BEHIND_RANGE: 18,       // notice a merger this far back
  SCOOTCH_BEHIND_TIGHT: 10,       // "too close" — start scootching
  SCOOTCH_AHEAD_SPARE_MIN: 5.5,   // need this much beyond follow gap ahead
  SCOOTCH_SPEED_NUDGE: 5.5,       // how hard we ease up relative to the lead
  SCOOTCH_MAX_CRUISE_FRAC: 1.06   // never punch past a mild over-cruise
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
  STAGE_POS_TOL: 1.6,         // was 1.1 — a little more forgiving
  STAGE_HEAD_TOL: 0.30,       // was 0.22 — allow slightly wider angle
  STAGE_SPEED_TOL: 2.0,       // was 1.2 — don't wait for a perfect stop
  STAGE_TIMEOUT: 12,          // seconds before we abort a stuck staging attempt
  PARKING_TIMEOUT: 10,        // seconds before we abort a stuck reverse maneuver
  SETTLE_TIME: 0.35,
  SEARCH_INTERVAL: 0.45,
  ROAM_MAX_ATTEMPTS: 6,       // failed roam/reroutes before giving up
  YIELD_LOOKAHEAD: 42,
  YIELD_GAP: 5.6 * 1.6,
  YIELD_LATERAL: 5.5,
  NEIGHBOR_SAMPLES: 10,
  NEIGHBOR_MARGIN: 0.15
};

const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#2ecc71', '#ff6fae'];

let parkingSearchEnabled = true;
let activeParkersCount = 0; // cars staging / reversing into stalls
const parkingBaysBySeg = new Map();
let parkingBaysIndexLen = -1;

function invalidateParkingBayIndex() {
  parkingBaysIndexLen = -1;
}

function ensureParkingBayIndex() {
  if (!parkingBaysAvailable()) {
    if (parkingBaysIndexLen !== 0) {
      parkingBaysBySeg.clear();
      parkingBaysIndexLen = 0;
    }
    return parkingBaysBySeg;
  }
  if (parkingBaysIndexLen === parkingBays.length) return parkingBaysBySeg;
  parkingBaysBySeg.clear();
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (!bay || bay.segId == null) continue;
    let list = parkingBaysBySeg.get(bay.segId);
    if (!list) {
      list = [];
      parkingBaysBySeg.set(bay.segId, list);
    }
    list.push(bay);
  }
  parkingBaysIndexLen = parkingBays.length;
  return parkingBaysBySeg;
}

function noteParkerActive(car) {
  if (!car || car._parkerCounted) return;
  car._parkerCounted = true;
  activeParkersCount++;
}

function noteParkerInactive(car) {
  if (!car || !car._parkerCounted) return;
  car._parkerCounted = false;
  activeParkersCount = Math.max(0, activeParkersCount - 1);
}

let driveMode = false;
let pendingSpawn = null;
let cars = [];
let carIdCounter = 1;
let followedCar = null;
let hoveredCar = null;
let simPaused = false;
let simSpeed = 1;              // realtime playback multiplier (1 / 2 / 4 / 8)
let simFastForwarding = false; // true while batch-skipping under the loader
let ffSkipSeconds = 3;         // selected skip interval (real sim seconds)
let spawnersAllPaused = false; // master mute for spawners (cars still move)
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
    // Parked curb cars stay out of traffic spatial queries (huge win with auto-parking)
    if (car.state === 'parked') {
      car._segPos = null;
      continue;
    }
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

    if (car.state === 'parking') {
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

// Canvas 2D: transforms are applied at draw time — just cache pose/scale state.
function setSvgOpacity(_el, _value) { /* no-op (compat) */ }

function ensureCarSvgTransforms(_car) { return false; }

function applyCarTransform(car, scale) {
  if (!car) return;
  car.despawnScale = (scale != null) ? scale : 1;
  car._lx = car.x;
  car._ly = car.y;
  car._lh = car.heading;
}

// Traffic spawners (advanced drive mode)
let spawners = [];
let spawnerIdCounter = 1;
let spawnerPlaceMode = false;
const SPAWNER_LANE_RADIUS = 14;
const SPAWNER_DEST_SAMPLES = [0.55, 0.9];
const SPAWNER_MAX_ROUTES = 48;
const SPAWNER_MAX_DEST_TRIES = 80;

// Drive / route / overlay state (Canvas immediate-mode — no SVG layers)
let spawnPin = null;           // { x, y } | null
let driveHoverMarker = null;   // { x, y, opacity } | null
let previewRoutePaths = [];    // [{ pts, stroke, opacity, width, gradStart?, gradEnd? }, ...]
let hoverRoutePaths = [];
let followRoutePaths = [];
let followRouteCar = null;

let followHighlightTimer = 0;
let simTime = 0;
let debugRingsOn = false;
let laneChangeGraphVisible = false;

// Draw every lane-change window edge currently in the graph — a toggle-able
// view of exactly where (and only where) cars are allowed to change lanes,
// like connecting the parallel lanes together at each window along the road.
function rebuildLaneChangeGraphVisual() {
  // Canvas redraws from allieAtoms each frame when laneChangeGraphVisible.
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
  if (!car) return;
  car.hovered = (car === hoveredCar && !car.selected);
}

function setHoveredCar(car) {
  const prev = hoveredCar;
  if (prev === car) return;
  hoveredCar = car;
  if (prev) updateCarHoverVisual(prev);
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
    if (driveHoverMarker) driveHoverMarker.opacity = 0;
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
  spawnPin = { x: pick.x, y: pick.y };
  updateDriveHudText();
}

function clearPendingSpawn() {
  pendingSpawn = null;
  spawnPin = null;
  clearPreviewRoute();
  updateDriveHudText();
}

function drawDriveHoverMarker(pick) {
  if (!pick) {
    if (driveHoverMarker) driveHoverMarker.opacity = 0;
    return;
  }
  driveHoverMarker = { x: pick.x, y: pick.y, opacity: 0.9 };
}

function clearDriveHoverPreview() {
  driveHoverMarker = null;
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

function ptsSliceFromRouteSamples(pts, s0, s1) {
  if (!pts.length) return [];
  const out = [];
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (pt.s < s0 - 0.02) continue;
    if (pt.s > s1 + 0.02) break;
    if (!started) {
      const start = s0 <= pt.s ? pt : pointAtRouteDistance(pts, s0);
      out.push({ x: start.x, y: start.y });
      started = true;
    } else {
      out.push({ x: pt.x, y: pt.y });
    }
  }
  if (started && pts[pts.length - 1].s > s1 + 0.02) {
    const end = pointAtRouteDistance(pts, s1);
    out.push({ x: end.x, y: end.y });
  }
  return out;
}

function buildRouteHighlightPaths(legs, gradStart) {
  const result = [];
  const pts = sampleRouteLegs(legs);
  if (!pts.length) return result;
  const totalLen = pts[pts.length - 1].s;
  if (totalLen < 0.08) return result;

  const fadeLen = Math.min(ROUTE_TAIL_FADE, totalLen);
  const splitAt = totalLen - fadeLen;

  if (splitAt > 0.05) {
    const mainPts = ptsSliceFromRouteSamples(pts, 0, splitAt);
    if (mainPts.length >= 2) {
      result.push({
        pts: mainPts,
        stroke: ROUTE_PATH_COLOR,
        opacity: ROUTE_PATH_OPACITY,
        width: ROUTE_PATH_WIDTH,
        gradStart: null,
        gradEnd: null
      });
    }
  }

  if (fadeLen > 0.05) {
    const tailStart = pointAtRouteDistance(pts, splitAt);
    const tailEnd = pts[pts.length - 1];
    const tailPts = ptsSliceFromRouteSamples(pts, splitAt, totalLen);
    if (tailPts.length >= 2) {
      result.push({
        pts: tailPts,
        stroke: ROUTE_PATH_COLOR,
        opacity: ROUTE_PATH_OPACITY,
        width: ROUTE_PATH_WIDTH,
        gradStart: (gradStart && splitAt < 0.05) ? gradStart : tailStart,
        gradEnd: { x: tailEnd.x, y: tailEnd.y }
      });
    }
  }
  return result;
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
  hoverRoutePaths = [];
  hoverRouteCar = null;
}

function updateHoverRouteHighlight(car) {
  clearHoverRouteHighlight();
  if (!driveMode || !car || car.selected || car.state === 'despawning') return;
  hoverRouteCar = car;
  hoverRoutePaths = buildRouteHighlightPaths(remainingRouteLegs(car), routeGradientStartFromCar(car));
}

function clearRouteHighlightEls(car) {
  if (followRouteCar === car) {
    followRoutePaths = [];
    followRouteCar = null;
  }
  if (car) car.routeHighlightPaths = [];
}

function currentLegFrac(car) {
  const leg = car.route[car.legIndex];
  const localLen = Math.max(leg.length, 0.0001);
  const localFrac = clampNum((car.traveledLength - leg.cumStart) / localLen, 0, 1);
  return leg.tStart + (leg.tEnd - leg.tStart) * localFrac;
}

function updateRouteHighlight(car) {
  followRouteCar = car;
  followRoutePaths = buildRouteHighlightPaths(remainingRouteLegs(car), routeGradientStartFromCar(car));
  car.routeHighlightPaths = followRoutePaths;
}

function drawPreviewRoute(route) {
  clearPreviewRoute();
  if (!route || !route.length) return;
  const legs = route.map(leg => ({
    atom: leg.atom,
    tStart: leg.tStart,
    tEnd: leg.tEnd
  }));
  previewRoutePaths = buildRouteHighlightPaths(legs, null);
}

function clearPreviewRoute() {
  previewRoutePaths = [];
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

  const color = opts.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

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
    route: legs, legIndex: 0,
    totalLength, traveledLength: 0,
    x: start.x, y: start.y, heading: Math.atan2(start.ty, start.tx),
    speed: 0, braking: false, blinkerPhase: 0,
    color,
    brakeLit: false,
    blinkerSide: null,
    blinkerOn: false,
    hovered: false,
    selected: false,
    despawnScale: 1,
    despawnOpacity: 1,
    routeHighlightPaths: [],
    state: 'driving', despawnT: 0,
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
    // Jam-escape state: how long we've been genuinely stuck, this driver's
    // patience before forcing an escape lane change, and whether we're
    // currently mid-escape (sharper blend + slow creep + gentle re-accel).
    _trafficStuckT: 0,
    _stuckLaneChangeThreshold: 0,
    _emergencyLaneChange: false,
    _emergencyLaneChangeStarted: false,
    _postMergeEaseT: 0,
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

  // More impatient/aggressive drivers (higher overtakeTendency) snap toward
  // STUCK_LANECHANGE_MIN; calmer drivers give the jam longer to clear first.
  const impatience = clampNum((car.overtakeTendency - 0.25) / 0.55, 0, 1);
  car._stuckLaneChangeThreshold = ALLIE_CONFIG.STUCK_LANECHANGE_MAX
    - impatience * (ALLIE_CONFIG.STUCK_LANECHANGE_MAX - ALLIE_CONFIG.STUCK_LANECHANGE_MIN);

  car._lx = car.x;
  car._ly = car.y;
  car._lh = car.heading;
  refreshCarPoseCache(car);
  evaluateParkingIntent(car);

  cars.push(car);
  updateCarCountUI();
  return car;
}

function drawCarCanvas(c, car) {
  if (!car) return;
  const L = ALLIE_CONFIG.CAR_LENGTH, W = ALLIE_CONFIG.CAR_WIDTH;
  const rearX = -ALLIE_CONFIG.REAR_OVERHANG;
  const scale = (car.despawnScale != null) ? car.despawnScale : 1;
  let opacity = (car.despawnOpacity != null) ? car.despawnOpacity : 1;
  if (typeof carUnderpassAlpha === 'function') {
    opacity *= carUnderpassAlpha(car);
  }

  c.save();
  c.globalAlpha = opacity;
  c.translate(car.x, car.y);
  c.rotate(car.heading);
  if (scale < 0.999) c.scale(scale, scale);

  if (car.hovered && !car.selected) {
    canvasRoundRect(c, rearX - 0.7, -W / 2 - 0.7, L + 1.4, W + 1.4, 1.2);
    c.fillStyle = 'rgba(127,212,255,0.12)';
    c.fill();
    c.strokeStyle = '#7fd4ff';
    c.lineWidth = 0.65;
    c.globalAlpha = opacity * 0.95;
    c.stroke();
    c.globalAlpha = opacity;
  }

  if (car.selected) {
    canvasRoundRect(c, rearX - 0.55, -W / 2 - 0.55, L + 1.1, W + 1.1, 1.1);
    c.strokeStyle = '#7fd4ff';
    c.lineWidth = 0.55;
    c.setLineDash([1.6, 1.1]);
    c.stroke();
    c.setLineDash([]);
  }

  canvasRoundRect(c, rearX, -W / 2, L, W, 0.9);
  c.fillStyle = car.color || '#888';
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.lineWidth = 0.35;
  c.stroke();

  canvasRoundRect(c,
    ALLIE_CONFIG.WHEELBASE * 0.32, -W / 2 + 0.35,
    ALLIE_CONFIG.WHEELBASE * 0.42, W - 0.7, 0.4);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fill();

  const brakeAlpha = car.brakeLit ? 0.95 : 0.15;
  c.fillStyle = '#ff3b3b';
  [-1, 1].forEach(side => {
    c.globalAlpha = opacity * brakeAlpha;
    canvasRoundRect(c, rearX - 0.05, side * (W / 2 - 0.55) - 0.3, 0.55, 0.6, 0.15);
    c.fill();
  });
  c.globalAlpha = opacity;

  const frontX = rearX + L - 0.7;
  const leftBlink = car.blinkerSide === 'left' && car.blinkerOn;
  const rightBlink = car.blinkerSide === 'right' && car.blinkerOn;
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1;
    const on = side === 'left' ? leftBlink : rightBlink;
    c.globalAlpha = opacity * (on ? 0.98 : 0.08);
    canvasRoundRect(c, frontX, sign * (W / 2 - 0.5) - 0.28, 0.62, 0.56, 0.14);
    c.fillStyle = '#ffb020';
    c.fill();
    c.strokeStyle = '#cc7a00';
    c.lineWidth = 0.12;
    c.stroke();
  });
  c.globalAlpha = opacity;

  const roofCx = rearX + L * 0.42;
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1;
    const on = side === 'left' ? leftBlink : rightBlink;
    const tipY = sign * (W * 0.44);
    const headBase = sign * (W * 0.18);
    const stemEnd = sign * 0.12;
    const hw = 0.22;
    c.globalAlpha = opacity * (on ? 1 : 0.12);
    c.beginPath();
    c.moveTo(roofCx, tipY);
    c.lineTo(roofCx - 0.62, headBase);
    c.lineTo(roofCx - hw, headBase);
    c.lineTo(roofCx - hw, stemEnd);
    c.lineTo(roofCx + hw, stemEnd);
    c.lineTo(roofCx + hw, headBase);
    c.lineTo(roofCx + 0.62, headBase);
    c.closePath();
    c.fillStyle = '#ffb020';
    c.fill();
    c.strokeStyle = '#cc7a00';
    c.lineWidth = 0.1;
    c.stroke();
  });

  c.restore();
}

function drawCarsCanvas(c) {
  for (let i = 0; i < cars.length; i++) drawCarCanvas(c, cars[i]);
}

function strokeRoutePathCanvas(c, path) {
  if (!path || !path.pts || path.pts.length < 2) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = path.width != null ? path.width : ROUTE_PATH_WIDTH;
  c.beginPath();
  c.moveTo(path.pts[0].x, path.pts[0].y);
  for (let i = 1; i < path.pts.length; i++) c.lineTo(path.pts[i].x, path.pts[i].y);
  if (path.gradStart && path.gradEnd) {
    const g = c.createLinearGradient(
      path.gradStart.x, path.gradStart.y,
      path.gradEnd.x, path.gradEnd.y
    );
    g.addColorStop(0, 'rgba(111,212,255,0.9)');
    g.addColorStop(1, 'rgba(63,167,255,0.05)');
    c.strokeStyle = g;
  } else {
    c.globalAlpha = path.opacity != null ? path.opacity : ROUTE_PATH_OPACITY;
    c.strokeStyle = path.stroke || ROUTE_PATH_COLOR;
  }
  c.stroke();
  c.restore();
}

function drawRouteHighlightsCanvas(c) {
  for (let i = 0; i < previewRoutePaths.length; i++) strokeRoutePathCanvas(c, previewRoutePaths[i]);
  for (let i = 0; i < hoverRoutePaths.length; i++) strokeRoutePathCanvas(c, hoverRoutePaths[i]);
  for (let i = 0; i < followRoutePaths.length; i++) strokeRoutePathCanvas(c, followRoutePaths[i]);
}

function drawDriveOverlaysCanvas(c) {
  const enterColor = (typeof COLOR_ENTER !== 'undefined' && COLOR_ENTER) ? COLOR_ENTER : '#2ecc71';
  if (spawnPin) {
    canvasFillCircle(c, spawnPin.x, spawnPin.y, 2.2, enterColor, '#fff', 0.6);
  }
  if (driveHoverMarker && driveHoverMarker.opacity > 0.01) {
    c.save();
    c.globalAlpha = driveHoverMarker.opacity;
    canvasFillCircle(c, driveHoverMarker.x, driveHoverMarker.y, 1.8, 'rgba(63,167,255,0.9)', '#fff', 0.5);
    c.restore();
  }
  for (let i = 0; i < spawners.length; i++) {
    const sp = spawners[i];
    const m = sp.marker || { x: sp.x, y: sp.y };
    const active = sp.running && !spawnersAllPaused && !simPaused;
    c.save();
    c.beginPath();
    c.arc(m.x, m.y, 3.2, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255, 160, 60, 0.18)';
    c.fill();
    c.strokeStyle = active ? '#ffb347' : '#888';
    c.lineWidth = 0.65;
    if (!active) c.setLineDash([1.2, 1]);
    c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
    c.fillStyle = active ? '#ffb347' : '#666';
    c.fill();
    c.restore();
  }
}

function drawLaneChangeGraphCanvas(c) {
  if (!laneChangeGraphVisible) return;
  const STEPS = 10;
  for (let a = 0; a < allieAtoms.length; a++) {
    const atom = allieAtoms[a];
    if (atom.kind !== 'lanechange') continue;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = atom.sampleAtT(i / STEPS);
      pts.push({ x: p.x, y: p.y });
    }
    c.save();
    c.globalAlpha = 0.85;
    c.strokeStyle = '#7fffb0';
    c.lineWidth = 0.5;
    c.setLineDash([1.3, 1]);
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(pts[0].x, pts[0].y, 0.85, 0, Math.PI * 2);
    c.fillStyle = '#7fffb0';
    c.fill();
    c.restore();
  }
}

function removeCar(car) {
  if (controlledCar === car) exitCarControl();
  if (followedCar === car) unfollowCar();
  if (hoveredCar === car) clearHoveredCar();
  if (hoverRouteCar === car) clearHoverRouteHighlight();
  noteParkerInactive(car);
  // Free reserved/occupied stall if this car held one
  if (car._parkPlan && car._parkPlan.bay && car._parkPlan.stallIndex != null) {
    const bay = car._parkPlan.bay;
    const idx = car._parkPlan.stallIndex;
    if (bay._stalls && bay._stalls[idx] && bay._stalls[idx].carId === car.id) {
      bay._stalls[idx] = null;
    }
  }
  clearRouteHighlightEls(car);
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

function beginOuttaHere(car, opts) {
  if (!car || car.state === 'despawning' || car.state === 'parked' || car.state === 'parking') return;
  // keepStall: aborting while physically in/near a stall — hold the claim
  // until removeCar so another car doesn't reverse into us mid-despawn.
  if (opts && opts.keepStall && car._parkPlan && car._parkPlan.bay != null) {
    noteParkerInactive(car);
    car.parkingIntent = null;
    car.parkPhase = null;
    car._parkStagePoint = null;
    car._parkStageHeading = null;
    car._parkBlinker = null;
    car._parkArcS = 0;
    car._parkSearchT = 0;
    car._parkSettleT = 0;
    car._stagingT = 0;
    car._parkingT = 0;
    car._parkDebug = null;
    car._cachedParkYield = null;
    // leave _parkPlan so removeCar frees the stall
  } else if (typeof clearParkingIntent === 'function') {
    clearParkingIntent(car);
  }
  car._outtaHere = true;
  car.parkPhase = 'outta';
  car._signalStatus = 'is outta here';
  car._parkDebug = { phase: 'outta', spot: 'none', blinker: null, dist: null };
  beginDespawn(car);
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
  updateRouteHighlight(car);
  updateCarOverlayVisibility();
  updateDriveHudText();
}

function deselectCarVisual(car) {
  car.selected = false;
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
  const status = car.state === 'despawning'
    ? (car._outtaHere ? 'is outta here' : 'Arrived')
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
    if (node && node._coText !== text) {
      node._coText = text;
      node.textContent = text;
    }
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
      : (car.parkPhase || (car.parkingIntent
          ? (car.parkingIntent.roaming ? 'roaming' : 'armed')
          : 'none')));
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
  const tags = describeCarAction(car);
  let key = '';
  for (let i = 0; i < tags.length; i++) key += tags[i].text + '|' + tags[i].color + ';';
  if (tagsEl._tagKey === key) return;
  tagsEl._tagKey = key;
  tagsEl.textContent = '';
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const span = document.createElement('span');
    span.className = 'co-tag';
    span.textContent = tag.text;
    span.style.color = tag.color;
    span.style.borderColor = tag.color + '44';
    span.style.background = tag.color + '18';
    tagsEl.appendChild(span);
  }
}

// ---------------- Simulation controls ----------------

function clearAllCars() {
  if (controlledCar) exitCarControl();
  if (followedCar) unfollowCar();
  cars.forEach(c => {
    noteParkerInactive(c);
    clearRouteHighlightEls(c);
  });
  cars = [];
  activeParkersCount = 0;
  clearAllParkingStalls();
  clearDebugOverlay();
  updateCarCountUI();
}

function updateCarCountUI() {
  const n = String(cars.length);
  const el = document.getElementById('car-count');
  if (el) el.textContent = n;
  const ffStatus = document.getElementById('ff-status');
  if (ffStatus) ffStatus.textContent = 'Cars: ' + n;
}

function formatSimClock(t) {
  const s = Math.floor(Math.max(0, t || 0)) % 86400;
  const h24 = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const am = h24 < 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return h12 + ':'
    + String(m).padStart(2, '0') + ':'
    + String(sec).padStart(2, '0')
    + (am ? ' AM' : ' PM');
}

function updateFfClockUI() {
  const el = document.getElementById('ff-clock');
  if (el) el.textContent = formatSimClock(simTime);
}

function setSimPaused(paused) {
  simPaused = !!paused;
  const btn = document.getElementById('btn-sim-pause');
  if (btn) {
    btn.textContent = simPaused ? 'Resume' : 'Pause';
    btn.classList.toggle('active', simPaused);
  }
  const ffPause = document.getElementById('ff-btn-pause');
  if (ffPause) {
    ffPause.textContent = simPaused ? '▶' : '❚❚';
    ffPause.classList.toggle('active', simPaused);
    ffPause.title = simPaused ? 'Resume' : 'Pause';
  }
  updateSpawnerListUI();
  spawners.forEach(drawSpawnerMarker);
}

function toggleSimPaused() {
  setSimPaused(!simPaused);
}

function setSimSpeed(mult) {
  const allowed = [1, 2, 4, 8];
  const m = Number(mult);
  simSpeed = allowed.includes(m) ? m : 1;
  const wrap = document.getElementById('ff-speeds');
  if (wrap) {
    wrap.querySelectorAll('.ff-speed-chevron').forEach(btn => {
      const sp = Number(btn.getAttribute('data-speed'));
      btn.classList.toggle('on', sp > 0 && sp <= simSpeed);
    });
  }
}

function formatFfSkipLabel(sec) {
  if (sec >= 60 && sec % 60 === 0) return '+' + (sec / 60) + 'min';
  return '+' + sec + 's';
}

function pickFfSkip(sec) {
  const allowed = [3, 5, 10, 30, 60];
  const s = Number(sec);
  ffSkipSeconds = allowed.includes(s) ? s : 3;
  const main = document.getElementById('ff-skip-main');
  if (main) main.textContent = formatFfSkipLabel(ffSkipSeconds);
  const menu = document.getElementById('ff-skip-menu');
  if (menu) {
    menu.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', Number(btn.getAttribute('data-sec')) === ffSkipSeconds);
    });
    menu.classList.remove('open');
  }
}

function toggleFfSkipMenu(ev) {
  if (ev) ev.stopPropagation();
  const menu = document.getElementById('ff-skip-menu');
  if (!menu) return;
  menu.classList.toggle('open');
}

function toggleFfMinutes() {
  const box = document.getElementById('ff-minutes');
  const clockBtn = document.getElementById('ff-btn-clock');
  if (!box) return;
  const open = !box.classList.contains('open');
  box.classList.toggle('open', open);
  if (clockBtn) clockBtn.classList.toggle('active', open);
  if (open) {
    const menu = document.getElementById('ff-skip-menu');
    if (menu) menu.classList.remove('open');
    const input = document.getElementById('ff-minutes-input');
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function closeFfMenus() {
  const menu = document.getElementById('ff-skip-menu');
  if (menu) menu.classList.remove('open');
}

/** Advance the sim by one physics step (no render). */
function stepSim(dt) {
  if (!(dt > 0)) return;
  simTime += dt;
  if (typeof updateSignals === 'function') updateSignals(dt);
  updateSpawners(dt);
  rebuildCarIndexes();
  for (let i = cars.length - 1; i >= 0; i--) updateCar(cars[i], dt);
}

/** Pick a scrub multiplier so skips are watchable (~10–100×), not a black flash. */
function ffVisualMultiplier(totalSec) {
  const t = Math.max(0.1, totalSec);
  // Aim for ~8–20s of wall time on long jumps; keep short jumps readable.
  let mult = t / 12;
  if (mult < 10) mult = 10;
  if (mult > 100) mult = 100;
  // Tiny skips (<2s) still play at least ~0.8s wall so frames paint.
  if (t / mult < 0.8) mult = Math.max(10, t / 0.8);
  return mult;
}

function setFfScrubUI(active, pct, label, mult) {
  const panel = document.getElementById('ff-panel');
  const fill = document.getElementById('ff-scrub-fill');
  const lab = document.getElementById('ff-scrub-label');
  if (panel) panel.classList.toggle('ff-running', !!active);
  if (fill) fill.style.width = (Math.max(0, Math.min(1, pct || 0)) * 100).toFixed(1) + '%';
  if (lab) {
    if (!active) lab.textContent = '';
    else {
      const m = mult ? Math.round(mult) + '× · ' : '';
      lab.textContent = m + (label || 'Scrubbing…');
    }
  }
}

/**
 * Scrub `seconds` of sim time on-canvas at ~10–100×.
 * Each animation frame: step physics, then renderFrame so cars/spawners are visible.
 */
async function fastForwardSim(seconds, onProgress) {
  const total = Math.max(0, Number(seconds) || 0);
  if (!(total > 0) || simFastForwarding) return { skipped: 0 };
  // Don't run if the sim itself is paused by the user
  if (simPaused) return { skipped: 0 };
  simFastForwarding = true;
  const maxStep = (typeof MAX_DT === 'number' && MAX_DT > 0) ? MAX_DT : (1 / 30);
  const mult = ffVisualMultiplier(total);
  let remaining = total;
  let advanced = 0;
  let lastWall = null;
  const waitFrame = () => new Promise(r => requestAnimationFrame(ts => r(ts)));

  setFfScrubUI(true, 0, 'Skipping ' + formatFfSkipLabel(total).replace(/^\+/, '') + '…', mult);
  try {
    if (typeof onProgress === 'function') onProgress(0, 'Scrubbing @ ' + Math.round(mult) + '×');
    while (remaining > 1e-6) {
      const ts = await waitFrame();
      let wallDt = lastWall == null ? (1 / 60) : (ts - lastWall) / 1000;
      lastWall = ts;
      if (wallDt > 0.08) wallDt = 0.08;
      if (wallDt < 0.001) wallDt = 0.001;

      let budget = wallDt * mult;
      if (budget > remaining) budget = remaining;
      while (budget > 1e-8) {
        const s = Math.min(budget, remaining, maxStep);
        stepSim(s);
        budget -= s;
        remaining -= s;
        advanced += s;
      }

      if (followedCar) {
        try { updateCameraFollow(followedCar, wallDt); } catch (_) { /* ignore */ }
      }
      if (typeof renderFrame === 'function') renderFrame();

      const pct = Math.min(1, advanced / total);
      updateFfClockUI();
      if ((Math.floor(advanced * 4) % 2) === 0) updateCarCountUI();
      const info = Math.round(pct * 100) + '% · ' + formatSimClock(simTime);
      setFfScrubUI(true, pct, info, mult);
      if (typeof onProgress === 'function') onProgress(pct, info);
    }

    if (typeof renderFrame === 'function') renderFrame();
    updateCarCountUI();
    updateFfClockUI();
    if (typeof onProgress === 'function') onProgress(1, 'Ready · ' + formatSimClock(simTime));
    return { skipped: advanced, mult };
  } finally {
    setFfScrubUI(false, 0, '', 0);
    simFastForwarding = false;
    lastTick = null;
  }
}

async function runFastForwardSkip() {
  closeFfMenus();
  if (simFastForwarding) return;
  await fastForwardSim(ffSkipSeconds);
}

async function runFastForwardMinutes() {
  const input = document.getElementById('ff-minutes-input');
  let mins = input ? Number(input.value) : 5;
  if (!Number.isFinite(mins) || mins < 1) mins = 1;
  if (mins > 180) mins = 180;
  if (input) input.value = String(mins);
  closeFfMenus();
  if (simFastForwarding) return;
  await fastForwardSim(mins * 60);
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

function clearDebugOverlay() { /* canvas redraws from sensor state */ }

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
  else if (status === 'Making room') tags.push({ text: 'Making room', color: '#7DCEA0' });
  else if (status === 'Changing lanes') tags.push({ text: 'Changing lanes', color: '#FFD166' });
  else if (status === 'Waiting for gap') tags.push({ text: 'Waiting for gap', color: '#FFCC66' });
  else if (status === 'Speeding to merge') tags.push({ text: 'Speeding to merge', color: '#FF6B6B' });
  else if (status === 'Pulling in to park') tags.push({ text: 'Pulling in to park', color: '#7fd4ff' });
  else if (status === 'Waiting for parking') tags.push({ text: 'Waiting for parking', color: '#7fd4ff' });

  if (car.state === 'parked') tags.push({ text: 'Parked', color: '#95a5a6' });
  else if (car.state === 'parking') tags.push({ text: 'Parking · ' + (car.parkPhase || ''), color: '#ffb020' });
  else if (car.parkPhase === 'staging') tags.push({ text: 'Staging to park', color: '#ffb020' });
  else if (car.parkPhase === 'searching') tags.push({ text: 'Looking for parking', color: '#7fd4ff' });
  else if (car.parkPhase === 'rerouting') tags.push({ text: 'Rerouting to parking', color: '#7fd4ff' });
  else if (car.parkingIntent && car.parkingIntent.roaming) tags.push({ text: 'Roaming for parking', color: '#7fd4ff' });
  else if (car._outtaHere || car.parkPhase === 'outta') tags.push({ text: 'is outta here', color: '#FF8A65' });

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

function canvasStrokePolyline(c, pts, stroke, width, dash, alpha) {
  if (!pts || pts.length < 2) return;
  c.save();
  if (alpha != null) c.globalAlpha = alpha;
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (dash) c.setLineDash(dash);
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.stroke();
  c.restore();
}

function drawDebugOBB(c, obb, fill, stroke, strokeWidth, pad) {
  pad = pad || 0;
  c.save();
  c.translate(obb.cx, obb.cy);
  c.rotate(obb.heading);
  const x = -obb.hl - pad;
  const y = -obb.hw - pad;
  const w = obb.hl * 2 + pad * 2;
  const h = obb.hw * 2 + pad * 2;
  c.beginPath();
  c.rect(x, y, w, h);
  if (fill && fill !== 'none') { c.fillStyle = fill; c.fill(); }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = strokeWidth;
    c.stroke();
  }
  c.restore();
}

function drawDebugSensors(c, car, center, radius, nearby) {
  const halfCone = (ALLIE_CONFIG.SIDE_DETECT_CONE_DEG * Math.PI / 180) * 0.5;
  const headHalf = (ALLIE_CONFIG.HEAD_CONE_DEG * Math.PI / 180) * 0.5;
  const headFar = ALLIE_CONFIG.HEAD_RING_FAR;
  const headMid = ALLIE_CONFIG.HEAD_RING_MID;
  const headNear = ALLIE_CONFIG.HEAD_RING_NEAR;

  const headRings = [
    { r: headFar, fill: 'rgba(120,210,255,0.06)', stroke: 'rgba(120,210,255,0.45)' },
    { r: headMid, fill: 'rgba(255,190,70,0.08)', stroke: 'rgba(255,180,60,0.55)' },
    { r: headNear, fill: 'rgba(255,80,60,0.10)', stroke: 'rgba(255,90,70,0.7)' }
  ];
  for (let i = 0; i < headRings.length; i++) {
    const ring = headRings[i];
    const a0 = car.heading - headHalf;
    const a1 = car.heading + headHalf;
    const x0 = center.x + Math.cos(a0) * ring.r;
    const y0 = center.y + Math.sin(a0) * ring.r;
    const x1 = center.x + Math.cos(a1) * ring.r;
    const y1 = center.y + Math.sin(a1) * ring.r;
    c.beginPath();
    c.moveTo(center.x, center.y);
    c.lineTo(x0, y0);
    c.arc(center.x, center.y, ring.r, a0, a1, false);
    c.closePath();
    c.fillStyle = ring.fill;
    c.fill();
    c.strokeStyle = ring.stroke;
    c.lineWidth = 0.4;
    c.stroke();
  }

  [-headHalf, headHalf].forEach(ang => {
    const ca = Math.cos(car.heading + ang);
    const sa = Math.sin(car.heading + ang);
    canvasStrokeLine(c, center.x, center.y, center.x + ca * headFar, center.y + sa * headFar, 'rgba(120,210,255,0.75)', 0.55);
  });

  [-halfCone, halfCone].forEach(ang => {
    const ca = Math.cos(car.heading + ang);
    const sa = Math.sin(car.heading + ang);
    canvasStrokeLine(c, center.x, center.y, center.x + ca * radius, center.y + sa * radius, 'rgba(255,180,60,0.45)', 0.4);
  });

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
    const x0i = center.x + Math.cos(car.heading + a0) * inner;
    const y0i = center.y + Math.sin(car.heading + a0) * inner;
    const x1i = center.x + Math.cos(car.heading + a1) * inner;
    const y1i = center.y + Math.sin(car.heading + a1) * inner;
    const x0o = center.x + Math.cos(car.heading + a0) * outer;
    const y0o = center.y + Math.sin(car.heading + a0) * outer;
    const x1o = center.x + Math.cos(car.heading + a1) * outer;
    const y1o = center.y + Math.sin(car.heading + a1) * outer;
    c.beginPath();
    c.moveTo(x0i, y0i);
    c.lineTo(x0o, y0o);
    c.lineTo(x1o, y1o);
    c.lineTo(x1i, y1i);
    c.closePath();
    c.fillStyle = heatColor(bestHeat, 0.14 + bestHeat * 0.32);
    c.fill();
    c.strokeStyle = heatColor(bestHeat, 0.45);
    c.lineWidth = 0.25;
    c.stroke();
  }

  for (let i = 0; i < nearby.length; i++) {
    const n = nearby[i];
    const obb = carOBB(n.other);
    drawDebugOBB(c, obb, heatColor(n.heat, 0.12 + n.heat * 0.28), heatColor(n.heat, 0.9), 0.55, 0.15);
  }

  if (car._ixBlocker) {
    drawDebugOBB(c, carOBB(car._ixBlocker), 'rgba(255,60,60,0.2)', '#ff3333', 0.9, 0.4);
  }
}

function drawDebugParking(c, car) {
  const plan = car._parkPlan;
  if (!plan) return;

  if (typeof parkingBayCorners === 'function' && plan.bay) {
    const corners = parkingBayCorners(plan.bay, plan.stallIndex);
    if (corners && corners.length) {
      c.beginPath();
      c.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) c.lineTo(corners[i].x, corners[i].y);
      c.closePath();
      c.fillStyle = 'rgba(127, 212, 255, 0.18)';
      c.fill();
      c.strokeStyle = '#7fd4ff';
      c.lineWidth = 0.7;
      c.setLineDash([1.5, 1]);
      c.stroke();
      c.setLineDash([]);
    }
  }

  if (plan.stagePoint) {
    canvasFillCircle(c, plan.stagePoint.x, plan.stagePoint.y, 1.3, '#ffb020', '#fff', 0.3);
  }

  function drawArc(arc, color) {
    if (!arc) return;
    const STEPS = 14;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = arc.sampleAtS((i / STEPS) * arc.length);
      pts.push({ x: p.x, y: p.y });
    }
    canvasStrokePolyline(c, pts, color, 1.15, [2, 1.1], 0.95);
  }
  drawArc(plan.arc1, '#ff9d4d');
  drawArc(plan.arc2, '#7CFF9A');

  if (car._parkYieldOther) {
    const a = carCenter(car);
    const b = carCenter(car._parkYieldOther);
    c.save();
    c.globalAlpha = 0.9;
    c.strokeStyle = '#7fd4ff';
    c.lineWidth = 0.9;
    c.setLineDash([2, 1.5]);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.restore();
  }
}

function drawDebugForCar(c, car) {
  if (!car || car.state === 'despawning') return;
  const center = carCenter(car);
  const radius = Math.max(ALLIE_CONFIG.SIDE_DETECT_RADIUS, ALLIE_CONFIG.HEAD_RING_FAR);
  const nearby = gatherNearbyForDebug(car, radius);

  if (car.state !== 'parked' && car.state !== 'parking') {
    drawDebugSensors(c, car, center, ALLIE_CONFIG.SIDE_DETECT_RADIUS, nearby);
  }

  if (car._hardSafetyHit) {
    drawDebugOBB(c, carOBB(car), 'none', '#ff2222', 0.9, 0.35);
  }

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
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = lcAtom.sampleAtT(i / STEPS);
      pts.push({ x: p.x, y: p.y });
    }
    canvasStrokePolyline(c, pts, lcd && lcd.gapOk === false ? '#ff6b6b' : '#ffb020', 1.1, [2, 1.2], 0.95);

    const target = lcAtom.sampleAtT(1);
    const blinker = blinkerSideForLaneChange(car, lcAtom);
    canvasFillCircle(c, target.x, target.y, 1.4, blinker === 'left' ? '#7fd4ff' : '#ff9d4d', '#fff', 0.35);

    if (blinker) {
      const side = blinker === 'right' ? 1 : -1;
      const rx = -Math.sin(car.heading) * side * 5;
      const ry = Math.cos(car.heading) * side * 5;
      canvasStrokeLine(c, center.x, center.y, center.x + rx, center.y + ry,
        blinker === 'left' ? '#7fd4ff' : '#ff9d4d', 1.2, 0.95);
    }
  }

  drawDebugParking(c, car);
  if (car._parkYieldOther && !car._parkPlan) {
    const a = carCenter(car);
    const b = carCenter(car._parkYieldOther);
    c.save();
    c.globalAlpha = 0.9;
    c.strokeStyle = '#7fd4ff';
    c.lineWidth = 0.9;
    c.setLineDash([2, 1.5]);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.restore();
  }
}

function updateDebugOverlay() {
  // Drawing happens in drawDebugOverlayCanvas each frame.
}

function drawDebugOverlayCanvas(c) {
  if (!debugRingsOn) return;
  const target = hoveredCar || followedCar;
  if (target) drawDebugForCar(c, target);
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
    // Jam escapes start pre-forced — they already know the target lane is
    // clearer and shouldn't wait politely for a perfect textbook gap.
    car._laneChangeForce = !!car._emergencyLaneChange;
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

// Rough congestion read for one lane near a reference point: how many cars
// sit within `range` meters (either direction) of `myPos` along that lane.
// Cheap stand-in for density since laneOccupancy is already indexed per-tick.
function laneDensityNear(segId, laneIdx, myPos, range) {
  const laneCars = laneOccupancy.get(segId + ':' + laneIdx);
  if (!laneCars || !laneCars.length) return 0;
  const fullSegLen = myPos.fullSegLen || 1;
  let count = 0;
  for (let i = 0; i < laneCars.length; i++) {
    const pos = laneCars[i]._segPos;
    if (!pos) continue;
    const gapAlong = Math.abs((pos.segT - myPos.segT) * fullSegLen);
    if (gapAlong <= range) count++;
  }
  return count;
}

// A car that's been genuinely stuck (near-zero speed, blocked by traffic) for
// longer than its own patience allows stops waiting politely for a proper
// window and instead hunts for ANY reachable lane change into a sibling lane
// that visibly has fewer cars nearby. If one exists, splice it into the route
// and flag it as an emergency escape — the runtime drives it as a tighter,
// sharper blend (see computeDesiredSpeed / the Ld override in the main tick)
// instead of the normal courteous merge, but still gap-checks before
// committing and eases back up to speed afterward rather than lurching.
function attemptEmergencyLaneEscape(car) {
  if (car.state !== 'driving' || car.isProbe) return false;
  if (findUpcomingLaneChangeLeg(car)) return false; // already negotiating one

  const myPos = carFullSegPos(car);
  if (!myPos) return false;

  const route = car.route;
  let best = null, bestViaLegIndex = -1, bestScore = -Infinity;
  for (let i = car.legIndex; i < route.length; i++) {
    const leg = route[i];
    if (leg.atom.kind === 'turn') break;
    if (leg.atom.kind !== 'lane' || !leg.atom.destStub) continue;
    const dist = leg.cumEnd - car.traveledLength;
    if (dist > ALLIE_CONFIG.EMERGENCY_LANE_CHANGE_LOOKAHEAD) break;
    const candidates = (allieOutByStub.get(leg.atom.destStub) || []).filter(a => a.kind === 'lanechange');
    if (!candidates.length) continue;
    const curDensity = laneDensityNear(leg.atom.segId, leg.atom.laneIdx, myPos, ALLIE_CONFIG.EMERGENCY_LANE_DENSITY_RANGE);
    for (let c = 0; c < candidates.length; c++) {
      const a = candidates[c];
      const tgtDensity = laneDensityNear(a.segId, a.toLaneIdx, myPos, ALLIE_CONFIG.EMERGENCY_LANE_DENSITY_RANGE);
      const score = curDensity - tgtDensity;
      if (score > bestScore) { bestScore = score; best = a; bestViaLegIndex = i; }
    }
  }

  if (!best || bestScore < ALLIE_CONFIG.EMERGENCY_LANE_DENSITY_MIN_GAIN) return false;
  if (!attemptOvertakeSplice(car, bestViaLegIndex, best)) return false;

  car._emergencyLaneChange = true;
  car._emergencyLaneChangeStarted = false;
  car._laneChangeForce = true;
  car._laneChangeWaitT = 0;
  car._laneChangeDebug = {
    phase: 'planned',
    plan: 'L' + best.fromLaneIdx + ' → L' + best.toLaneIdx + ' · jam escape',
    fromLane: best.fromLaneIdx,
    toLane: best.toLaneIdx,
    blinker: blinkerSideForLaneChange(car, best),
    dist: null,
    gapOk: null, gapAhead: null, gapBehind: null,
    decision: 'stuck too long · forcing escape to clearer lane',
    waitT: 0,
    force: true
  };
  return true;
}

// Tracks how long a car has sat there genuinely blocked by traffic (not just
// idle with nowhere to go). Once it exceeds this driver's own patience, try
// to force an escape lane change. Resets on any real progress so a car that
// nudges forward and stops again just restarts the clock, matching how an
// actually-impatient driver behaves in gridlock.
function updateTrafficStuckWatchdog(car, dt) {
  if (car.state !== 'driving' || car.isProbe) { car._trafficStuckT = 0; return; }
  if (car._emergencyLaneChange) { car._trafficStuckT = 0; return; } // already acting on it

  const obs = car._lastObstruction;
  const genuinelyBlocked = car.speed < ALLIE_CONFIG.STUCK_SPEED_THRESHOLD
    && obs && obs.gap < ALLIE_CONFIG.DETECT_RING_MID;

  if (!genuinelyBlocked) {
    car._trafficStuckT = 0;
    return;
  }

  car._trafficStuckT += dt;
  if (car._trafficStuckT >= car._stuckLaneChangeThreshold) {
    attemptEmergencyLaneEscape(car);
    car._trafficStuckT = 0; // either escaped, or try again after another full patience window
  }
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
    if (car._emergencyLaneChange) car._emergencyLaneChangeStarted = true;
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
        decision: car._emergencyLaneChange ? 'jam escape · sharp committed blend' : 'committed · driving blend',
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
      // Emergency escapes never give up and retreat to the jam they're
      // fleeing — they just keep creeping/holding on relaxed force-gaps
      // until the (already sparser) target lane opens up.
      if (!car._emergencyLaneChange && car._laneChangeWaitT >= ALLIE_CONFIG.LANE_CHANGE_WAIT_ABORT) {
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
    // Clearly behind → scootch-up handles that case instead of braking.
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

// Scootch forward: a car is merging into our lane *behind* us and sitting too
// close, but we still have spare gap to the lead — ease up just enough to open
// a hole while keeping a healthy follow cushion ahead.
function mergeScootchConstraintFor(car) {
  if (car.isProbe) return null;
  const myPos = car._segPos || carFullSegPos(car);
  if (!myPos) return null;

  const followGap = ALLIE_CONFIG.DETECT_FOLLOW_GAP;
  const cruise = ALLIE_CONFIG.CRUISE_SPEED;
  const courtesy = (car.courtesyTendency != null) ? car.courtesyTendency : 0.5;

  // Space ahead (reuse traffic scan when fresh)
  const obs = car._lastObstruction;
  let aheadGap = Infinity;
  let leadV = cruise;
  if (obs && obs.gap != null && isFinite(obs.gap)) {
    aheadGap = obs.gap;
    leadV = Math.max(0, obs.speed);
  }
  const spare = aheadGap - followGap;
  if (!(spare >= ALLIE_CONFIG.SCOOTCH_AHEAD_SPARE_MIN)) return null;

  const cx = car._cx != null ? car._cx : car.x;
  const cy = car._cy != null ? car._cy : car.y;
  const look = ALLIE_CONFIG.SCOOTCH_BEHIND_RANGE + ALLIE_CONFIG.CAR_LENGTH * 2;
  const nearby = collectNearbyCars(cx, cy, look);
  let best = null;

  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.state === 'despawning') continue;
    const found = findUpcomingLaneChangeLeg(other);
    if (!found) continue;
    const atom = found.leg.atom;
    if (atom.segId !== myPos.segId || atom.toLaneIdx !== myPos.laneIdx) continue;

    const oPos = other._segPos || carFullSegPos(other);
    if (!oPos) continue;
    const gapAlong = (oPos.segT - myPos.segT) * (atom.fullSegLen || myPos.fullSegLen || 1);
    // Must be behind (or just kissing our bumper from rear)
    if (gapAlong > -ALLIE_CONFIG.CAR_LENGTH * 0.35) continue;
    const behindGap = -gapAlong - ALLIE_CONFIG.CAR_LENGTH;
    if (behindGap > ALLIE_CONFIG.SCOOTCH_BEHIND_RANGE) continue;
    // Approaching merges only count when already tight; active blends always count.
    if (!found.active && behindGap > ALLIE_CONFIG.SCOOTCH_BEHIND_TIGHT) continue;

    const tightness = 1 - clampNum(behindGap / Math.max(0.01, ALLIE_CONFIG.SCOOTCH_BEHIND_TIGHT), 0, 1);
    const score = tightness + (found.active ? 0.35 : 0);
    if (!best || score > best.score) {
      best = { other, behindGap, tightness, active: found.active, score };
    }
  }
  if (!best) return null;

  // Selfish drivers only scootch once the merge is already underway
  if (courtesy < 0.28 && !best.active) return null;

  // Leave a little extra cushion beyond the nominal follow gap
  const usable = Math.max(0, spare - followGap * 0.12);
  if (usable < 2.2) return null;

  const nudge = ALLIE_CONFIG.SCOOTCH_SPEED_NUDGE
    * (0.4 + 0.6 * courtesy)
    * (0.35 + 0.65 * best.tightness)
    * (best.active ? 1.15 : 1);
  const kinCap = Math.sqrt(Math.max(0, leadV * leadV + 2 * ALLIE_CONFIG.ACCEL * usable));
  const cruiseCap = cruise * ALLIE_CONFIG.SCOOTCH_MAX_CRUISE_FRAC;
  let desired = Math.min(cruiseCap, leadV + nudge, kinCap);

  // Open road ahead of outer ring — still ease up a touch from current pace
  if (!isFinite(aheadGap) || aheadGap > ALLIE_CONFIG.DETECT_RING_OUTER) {
    desired = Math.min(cruiseCap, Math.max(car.speed, cruise * 0.8) + nudge * 0.55);
  }

  // Only fire when we're actually asking to go a bit faster than a pure follow
  const followOnly = Math.sqrt(Math.max(0, leadV * leadV + 2 * ALLIE_CONFIG.DECEL_NORMAL * Math.max(0, aheadGap - followGap)));
  if (desired < car.speed + 0.4 && desired <= followOnly + 0.8) return null;

  return {
    desired: Math.max(0, desired),
    boost: true,
    decelRate: ALLIE_CONFIG.DECEL_NORMAL,
    status: 'Making room'
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
    if (car._blinkerIdle) return;
    car._blinkerIdle = true;
    car.blinkerSide = null;
    car.blinkerOn = false;
    return;
  }
  car._blinkerIdle = false;
  const on = (car.blinkerPhase % ALLIE_CONFIG.BLINKER_PERIOD) < ALLIE_CONFIG.BLINKER_PERIOD * 0.52;
  car.blinkerSide = signal;
  car.blinkerOn = !!on;
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
  const route = car.route;

  // Detect the moment an emergency escape blend finishes (legIndex moved
  // past the 'lanechange' atom) so we can start gently re-accelerating
  // instead of snapping straight back to cruise speed.
  if (car._emergencyLaneChange && car._emergencyLaneChangeStarted) {
    const legNow = route[car.legIndex];
    if (!legNow || legNow.atom.kind !== 'lanechange') {
      car._emergencyLaneChange = false;
      car._emergencyLaneChangeStarted = false;
      car._postMergeEaseT = ALLIE_CONFIG.EMERGENCY_POST_MERGE_EASE_TIME;
    }
  }

  // Approach a pending lane-change window: either a rare risky speed-up to
  // slot into a closing gap, or (applied below) a hold if it's not safe yet.
  const laneApproach = laneChangeApproachConstraintFor(car);
  let desired = (laneApproach && laneApproach.boost) ? laneApproach.desired : ALLIE_CONFIG.CRUISE_SPEED;
  let decelRate = ALLIE_CONFIG.DECEL_NORMAL;
  let signalStatus = (laneApproach && laneApproach.boost) ? laneApproach.status : null;

  const curLeg = route[car.legIndex];
  if (curLeg && curLeg.atom.kind === 'turn' && curLeg.atom.targetSpeed < desired) {
    desired = curLeg.atom.targetSpeed;
    decelRate = curLeg.atom.sharp ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL;
  }
  if (curLeg && curLeg.atom.kind === 'lanechange' && car._emergencyLaneChange) {
    // Sharp escape blend: creep through it slowly rather than near-cruise —
    // this is a tight, deliberate turn-out, not a smooth courteous merge.
    desired = Math.min(desired, ALLIE_CONFIG.EMERGENCY_LANE_CHANGE_SPEED);
    decelRate = ALLIE_CONFIG.DECEL_NORMAL;
    signalStatus = 'Forcing jam escape';
  } else if (curLeg && curLeg.atom.kind === 'lanechange' && desired > ALLIE_CONFIG.CRUISE_SPEED * 0.94) {
    // Ease off slightly while actually inside the blend — realistic caution,
    // not a hard cap, so the maneuver stays smooth.
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

  // Scootch forward for a merger squeezing in *behind* when we have spare gap
  // ahead — opposite of ease-off courtesy (raises desired a little).
  if (((car.id + tickFrame) & 1) === 1) {
    const scootch = mergeScootchConstraintFor(car);
    car._cachedScootch = scootch;
    if (scootch && scootch.boost && scootch.desired > desired) {
      desired = scootch.desired;
      if (!signalStatus || signalStatus === 'Following' || signalStatus === 'Caution'
          || signalStatus === 'Letting merge') {
        signalStatus = scootch.status;
      }
    }
  } else if (car._cachedScootch && car._cachedScootch.boost && car._cachedScootch.desired > desired) {
    desired = car._cachedScootch.desired;
    if (!signalStatus || signalStatus === 'Following' || signalStatus === 'Caution'
        || signalStatus === 'Letting merge') {
      signalStatus = car._cachedScootch.status;
    }
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

function findCarById(id) {
  if (id == null) return null;
  for (let i = 0; i < cars.length; i++) {
    if (cars[i].id === id) return cars[i];
  }
  return null;
}

function findBayById(id) {
  if (!parkingBaysAvailable() || id == null) return null;
  for (let i = 0; i < parkingBays.length; i++) {
    if (parkingBays[i].id === id) return parkingBays[i];
  }
  return null;
}

/** True if another car is already sitting in / reversing through this stall. */
function stallPhysicallyBlocked(bay, index, exceptCar) {
  if (!bay) return false;
  const sc = stallCenterWorld(bay, index);
  const rad = Math.max(bay.spotLength, bay.spotDepth) * 0.55;
  const nearby = collectNearbyCars(sc.x, sc.y, rad + ALLIE_CONFIG.CAR_LENGTH);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === exceptCar || other.isProbe) continue;
    // Only bodies that are (or were) using a stall — not drive-by traffic
    const usingStall = other.state === 'parked' || other.state === 'parking'
      || other.state === 'despawning'
      || (other._parkPlan && other._parkPlan.bay === bay
          && other._parkPlan.stallIndex === index);
    if (!usingStall) continue;
    const ox = other.x, oy = other.y;
    if (Math.hypot(ox - sc.x, oy - sc.y) <= rad) return true;
  }
  return false;
}

function stallIsFree(bay, index, forCar) {
  const stalls = ensureBayStalls(bay);
  if (!stalls) return false;
  const slot = stalls[index];
  if (slot) {
    // Our own reservation counts as free for us
    if (forCar && slot.carId === forCar.id) {
      return !stallPhysicallyBlocked(bay, index, forCar);
    }
    // Ghost claim: claimant left without releasing
    const holder = findCarById(slot.carId);
    if (!holder) {
      stalls[index] = null;
    } else {
      return false;
    }
  }
  return !stallPhysicallyBlocked(bay, index, forCar || null);
}

function reserveStall(bay, index, car) {
  const stalls = ensureBayStalls(bay);
  if (!stalls) return false;
  if (!stallIsFree(bay, index, car)) return false;
  stalls[index] = { carId: car.id, status: 'reserved' };
  return true;
}

function occupyStall(bay, index, car) {
  const stalls = ensureBayStalls(bay);
  if (!stalls) return;
  // Refuse to overwrite another living car's claim
  const slot = stalls[index];
  if (slot && slot.carId !== car.id) {
    const holder = findCarById(slot.carId);
    if (holder) return;
  }
  stalls[index] = { carId: car.id, status: 'occupied' };
}

function releaseStallReservation(car) {
  if (!car || !car._parkPlan) return;
  const bay = car._parkPlan.bay;
  const idx = car._parkPlan.stallIndex;
  if (!bay || !bay._stalls || idx == null) return;
  const slot = bay._stalls[idx];
  // Only drop a reservation — occupied stalls are freed by removeCar
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
  noteParkerInactive(car);
  car.parkingIntent = null;
  car.parkPhase = null;
  car._parkPlan = null;
  car._parkStagePoint = null;
  car._parkStageHeading = null;
  car._parkBlinker = null;
  car._parkArcS = 0;
  car._parkSearchT = 0;
  car._parkSettleT = 0;
  car._stagingT = 0;
  car._parkingT = 0;
  car._parkDebug = null;
  car._cachedParkYield = null;
}

function segmentHasParkingForLane(seg, laneOffsetSign) {
  if (!seg || !parkingBaysAvailable()) return false;
  const list = ensureParkingBayIndex().get(seg.id);
  if (!list || !list.length) return false;
  if (laneOffsetSign === 0 || laneOffsetSign == null) return true;
  for (let i = 0; i < list.length; i++) {
    if (list[i].side === laneOffsetSign) return true;
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

function anyFreeParkingStallExists() {
  if (!parkingBaysAvailable()) return false;
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    for (let s = 0; s < bay.count; s++) {
      if (stallIsFree(bay, s, null)) return true;
    }
  }
  return false;
}

function evaluateParkingIntent(car) {
  if (!car) return;
  if (car.state === 'parking' || car.state === 'parked') return;
  if (car.parkPhase === 'staging' || car.parkPhase === 'reverse1'
      || car.parkPhase === 'reverse2' || car.parkPhase === 'settle') return;
  clearParkingIntent(car);
  car._parkRoamAttempts = 0;
  if (!parkingSearchEnabled) return;
  if (!parkingBaysAvailable()) return;
  const dest = car.destPick;
  if (!dest || !dest.atom || dest.atom.kind !== 'lane') return;
  const seg = findSegmentById(dest.atom.segId);
  const side = seg ? laneOffsetSignForAtom(dest.atom) : 0;
  if (seg && segmentHasParkingForLane(seg, side || 0)) {
    // Destination road has parking — normal targeted intent
    car.parkingIntent = { segId: dest.atom.segId, side: side || 0 };
  } else {
    // Destination road has no parking — roam the whole map for a free stall
    car.parkingIntent = { segId: null, roaming: true };
  }
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
    // Treat reserved-by-other the same as occupied — don't clip a car mid-maneuver
    const slot = bay._stalls && bay._stalls[ni];
    if (!slot) continue;
    if (slot.status !== 'occupied' && slot.status !== 'reserved') continue;
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

  // Prefer a stall we already reserved while roaming / staging setup
  const claimedBay = car._parkPlan && car._parkPlan.bay;
  const claimedIdx = car._parkPlan ? car._parkPlan.stallIndex : null;
  if (claimedBay && claimedIdx != null && claimedBay.segId === segId) {
    if (stallIsFree(claimedBay, claimedIdx, car)) {
      const sc = stallCenterWorld(claimedBay, claimedIdx);
      const along = typeof projectAlongSeg === 'function'
        ? projectAlongSeg(seg, sc.x, sc.y) : 0;
      const bayDot = claimedBay.ux * approachUx + claimedBay.uy * approachUy;
      const ahead = (along - carAlong) * (bayDot >= 0 ? 1 : -1);
      // Soft runway: claimed stalls only need to be roughly ahead
      if (ahead > -ALLIE_CONFIG.CAR_LENGTH * 0.5 && ahead < 140) {
        if (side === 0 || claimedBay.side === side) {
          return {
            bay: claimedBay, stallIndex: claimedIdx, ahead,
            approachUx, approachUy, laneX: sample.x, laneY: sample.y
          };
        }
      }
    }
  }

  let best = null;
  const bayList = ensureParkingBayIndex().get(segId);
  if (!bayList || !bayList.length) return null;
  for (let b = 0; b < bayList.length; b++) {
    const bay = bayList[b];
    if (side !== 0 && bay.side !== side) continue;
    // Bay travel vs car travel: stall must be ahead
    const bayDot = bay.ux * approachUx + bay.uy * approachUy;
    for (let i = 0; i < bay.count; i++) {
      if (!stallIsFree(bay, i, car)) continue;
      const sc = stallCenterWorld(bay, i);
      const along = typeof projectAlongSeg === 'function'
        ? projectAlongSeg(seg, sc.x, sc.y)
        : 0;
      // Ahead in travel direction
      const ahead = (along - carAlong) * (bayDot >= 0 ? 1 : -1);
      // Need enough runway to reach the stage point before the stall
      if (ahead < ALLIE_CONFIG.CAR_LENGTH * 2.0) continue;
      if (ahead > 120) continue;
      if (!best || ahead < best.ahead) {
        best = { bay, stallIndex: i, ahead, approachUx, approachUy, laneX: sample.x, laneY: sample.y };
      }
    }
  }
  return best;
}

/** Lane pick on the curb side of a bay, past the stall so search sees it ahead. */
function findLanePickForParkingBay(bay, stallIndex) {
  if (!bay || !allieAtoms.length) return null;
  const sc = stallCenterWorld(bay, stallIndex);
  let best = null;
  for (let i = 0; i < allieAtoms.length; i++) {
    const atom = allieAtoms[i];
    if (atom.kind !== 'lane' || atom.segId !== bay.segId) continue;
    if (!atom.originStub) continue;
    const side = laneOffsetSignForAtom(atom);
    if (side !== 0 && bay.side !== 0 && side !== bay.side) continue;

    // Sample several t values; prefer a point slightly past the stall along travel
    for (let k = 0; k < 9; k++) {
      const t = 0.12 + k * 0.1;
      if (t > 0.92) break;
      const p = atom.sampleAtT(t);
      const dx = sc.x - p.x, dy = sc.y - p.y;
      const along = dx * p.tx + dy * p.ty;   // stall ahead of sample if > 0
      const lat = Math.abs(-dx * p.ty + dy * p.tx);
      if (along < ALLIE_CONFIG.CAR_LENGTH * 1.5) continue; // need runway before stall
      if (along > 55) continue;
      if (lat > 10) continue;
      const score = along + lat * 2;
      if (!best || score < best.score) {
        best = { atom, t, x: p.x, y: p.y, score };
      }
    }
  }
  if (best) return { atom: best.atom, t: best.t, x: best.x, y: best.y };

  // Fallback: any curb-side lane mid-point
  for (let i = 0; i < allieAtoms.length; i++) {
    const atom = allieAtoms[i];
    if (atom.kind !== 'lane' || atom.segId !== bay.segId) continue;
    const side = laneOffsetSignForAtom(atom);
    if (side !== 0 && bay.side !== 0 && side !== bay.side) continue;
    const p = atom.sampleAtT(0.55);
    return { atom, t: 0.55, x: p.x, y: p.y };
  }
  return null;
}

function beginParkingStaging(car, candidate) {
  // Drop a previous claim if we're switching stalls
  if (car._parkPlan && (car._parkPlan.bay !== candidate.bay
      || car._parkPlan.stallIndex !== candidate.stallIndex)) {
    releaseStallReservation(car);
  }
  car._parkPlan = { bay: candidate.bay, stallIndex: candidate.stallIndex };
  if (!reserveStall(candidate.bay, candidate.stallIndex, car)) {
    car._parkPlan = null;
    return false;
  }
  const plan = computeParkingManeuver(
    candidate.bay, candidate.stallIndex,
    candidate.approachUx, candidate.approachUy,
    candidate.laneX, candidate.laneY
  );
  if (!plan) {
    releaseStallReservation(car);
    car._parkPlan = null;
    return false;
  }
  car._parkPlan = plan;
  car._parkStagePoint = plan.stagePoint;
  car._parkStageHeading = plan.stageHeading;
  car._parkBlinker = plan.blinker;
  car.parkPhase = 'staging';
  car._parkArcS = 0;
  car._parkSettleT = 0;
  car._stagingT = 0;
  car._parkingT = 0;
  noteParkerActive(car);
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
    // Accumulate staging time — bail if we've been stuck too long
    car._stagingT = (car._stagingT || 0) + dt;
    if (car._stagingT > PARKING_CONFIG.STAGE_TIMEOUT) {
      // Abort this stall and try to find another one
      clearParkingIntent(car);
      if (anyFreeParkingStallExists()) {
        car.parkingIntent = { segId: null, roaming: true };
        car.parkPhase = null;
        car._parkSearchT = 0;
        car._stagingT = 0;
      } else {
        beginOuttaHere(car);
      }
      return;
    }

    // Claim stolen / stall now blocked — abort before we reverse into someone
    if (car._parkPlan && car._parkPlan.bay != null && car._parkPlan.stallIndex != null) {
      if (!stallIsFree(car._parkPlan.bay, car._parkPlan.stallIndex, car)) {
        clearParkingIntent(car);
        if (anyFreeParkingStallExists()) {
          car.parkingIntent = { segId: null, roaming: true };
          car.parkPhase = null;
          car._parkSearchT = 0;
          car._stagingT = 0;
        } else {
          beginOuttaHere(car);
        }
        return;
      }
    }

    // Check arrival at stage pose
    const sp = car._parkStagePoint;
    if (!sp) return;
    const dist = Math.hypot(car.x - sp.x, car.y - sp.y);

    // Overshoot detection: stage point is clearly behind us — abort this stall
    const cosH = Math.cos(car.heading), sinH = Math.sin(car.heading);
    const toFwdSp = (sp.x - car.x) * cosH + (sp.y - car.y) * sinH;
    if (toFwdSp < -(ALLIE_CONFIG.CAR_LENGTH * 0.6) && dist > PARKING_CONFIG.STAGE_POS_TOL) {
      clearParkingIntent(car);
      if (anyFreeParkingStallExists()) {
        car.parkingIntent = { segId: null, roaming: true };
        car.parkPhase = null;
        car._parkSearchT = 0;
        car._stagingT = 0;
      } else {
        beginOuttaHere(car);
      }
      return;
    }

    if (car._parkDebug) car._parkDebug.dist = dist;

    if (dist <= PARKING_CONFIG.STAGE_POS_TOL && car.speed <= PARKING_CONFIG.STAGE_SPEED_TOL) {
      // Final claim check before committing to reverse
      if (car._parkPlan && !stallIsFree(car._parkPlan.bay, car._parkPlan.stallIndex, car)) {
        clearParkingIntent(car);
        if (anyFreeParkingStallExists()) {
          car.parkingIntent = { segId: null, roaming: true };
          car.parkPhase = null;
          car._parkSearchT = 0;
        } else {
          beginOuttaHere(car);
        }
        return;
      }
      // Close enough — snap heading to required and begin reversing.
      // Don't require heading match: Pure Pursuit can't correct heading at speed=0.
      car.heading = car._parkStageHeading != null ? car._parkStageHeading : car.heading;
      refreshCarPoseCache(car);
      car.state = 'parking';
      car.parkPhase = 'reverse1';
      car._parkArcS = 0;
      car._stagingT = 0;
      car.speed = 0;
      if (car._parkDebug) car._parkDebug.phase = 'reverse1';
    }
    return;
  }

  // ── Roaming mode: no parking on destination road, scan whole map ──
  if (car.parkingIntent.roaming) {
    car._parkSearchT = (car._parkSearchT || 0) + dt;
    if (car._parkSearchT < PARKING_CONFIG.SEARCH_INTERVAL) return;
    car._parkSearchT = 0;

    car._parkRoamAttempts = (car._parkRoamAttempts || 0) + 1;
    if (car._parkRoamAttempts > PARKING_CONFIG.ROAM_MAX_ATTEMPTS) {
      if (car._parkDebug) car._parkDebug = { phase: 'outta', spot: 'roam exhausted' };
      beginOuttaHere(car);
      return;
    }

    // If there are literally no free stalls anywhere, give up now
    if (!anyFreeParkingStallExists()) {
      if (car._parkDebug) car._parkDebug = { phase: 'outta', spot: 'no parking anywhere' };
      beginOuttaHere(car);
      return;
    }

    // Closest free stall — reserve immediately so parallel roamers don't collide
    let bestBay = null, bestStall = -1, bestDist = Infinity;
    for (let i = 0; i < parkingBays.length; i++) {
      const bay = parkingBays[i];
      for (let s = 0; s < bay.count; s++) {
        if (!stallIsFree(bay, s, car)) continue;
        const sc = stallCenterWorld(bay, s);
        const d = Math.hypot(sc.x - car.x, sc.y - car.y);
        if (d < bestDist) { bestDist = d; bestBay = bay; bestStall = s; }
      }
    }
    if (!bestBay) {
      beginOuttaHere(car);
      return;
    }

    car._parkPlan = { bay: bestBay, stallIndex: bestStall };
    if (!reserveStall(bestBay, bestStall, car)) {
      car._parkPlan = null;
      return; // try again next interval
    }

    const seg = findSegmentById(bestBay.segId);
    if (!seg) {
      releaseStallReservation(car);
      car._parkPlan = null;
      beginOuttaHere(car);
      return;
    }
    car.parkingIntent = {
      segId: bestBay.segId,
      side: bestBay.side || 0,
      roaming: false,
      bayId: bestBay.id,
      stallIndex: bestStall
    };
    car.parkPhase = null;
    car._parkDebug = { phase: 'rerouting', spot: 'bay#' + bestBay.id + '[' + bestStall + ']' };

    const origin = findNearestAtomPoint(car.x, car.y, 40, true);
    if (!origin) {
      releaseStallReservation(car);
      car._parkPlan = null;
      beginOuttaHere(car);
      return;
    }
    const destPick = findLanePickForParkingBay(bestBay, bestStall);
    if (!destPick) {
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    const raw = allieFindPath(origin, destPick);
    if (!raw || !raw.length) {
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    // Keep the claim — evaluateParkingIntent would wipe it
    applyRouteToCar(car, raw, destPick, { keepParkingIntent: true });
    return;
  }

  // ── Normal targeted mode ──
  const curLeg = car.route[car.legIndex];
  if (!curLeg || curLeg.atom.kind !== 'lane') return;
  if (curLeg.atom.segId !== car.parkingIntent.segId) {
    // Not yet on the parking street (or already past) — arm when we arrive
    if (car.parkPhase === 'searching') {
      // Left the segment without parking — try roaming if any stalls exist
      if (car._parkPlan) {
        releaseStallReservation(car);
        car._parkPlan = null;
      }
      if (anyFreeParkingStallExists()) {
        car.parkingIntent = { segId: null, roaming: true };
        car.parkPhase = null;
        car._parkSearchT = 0;
      } else {
        clearParkingIntent(car);
      }
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
    // Try roaming to another segment if stalls exist elsewhere
    if (car._parkPlan) {
      releaseStallReservation(car);
      car._parkPlan = null;
    }
    if (anyFreeParkingStallExists()) {
      car.parkingIntent = { segId: null, roaming: true };
      car.parkPhase = null;
      car._parkSearchT = 0;
    } else {
      beginOuttaHere(car);
    }
  } else if (car._parkDebug) {
    car._parkDebug = { phase: 'searching', spot: 'none free', blinker: null, dist: null };
  }
}

function parkingApproachConstraintFor(car) {
  if (car.parkPhase !== 'staging' || !car._parkStagePoint) return null;
  const sp = car._parkStagePoint;
  const dx = sp.x - car.x, dy = sp.y - car.y;
  const dist = Math.hypot(dx, dy);
  const rate = PARKING_CONFIG.APPROACH_DECEL;

  // Stage point is behind us — don't brake; let the staging timeout recover it
  const cosH = Math.cos(car.heading), sinH = Math.sin(car.heading);
  const fwd = dx * cosH + dy * sinH;
  if (fwd < 0 && dist > PARKING_CONFIG.STAGE_POS_TOL) return null;

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
  if (activeParkersCount <= 0) return null;
  if (car.state === 'parking' || car.state === 'parked') return null;
  if (car.parkPhase === 'staging') return null;
  if (car.isProbe) return null;
  // Stagger soft yield scans — reuse last result on off frames
  if (((car.id + tickFrame) & 1) === 1) {
    return car._cachedParkYield || null;
  }

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
  if (!best) {
    car._cachedParkYield = null;
    return null;
  }
  car._parkYieldOther = best.other;
  const holdGap = PARKING_CONFIG.YIELD_GAP;
  const closing = Math.max(0, best.gap - holdGap);
  const rate = ALLIE_CONFIG.DECEL_NORMAL;
  const desired = best.gap <= holdGap
    ? 0
    : Math.sqrt(Math.max(0, 2 * rate * closing));
  const result = {
    desired: Math.min(desired, ALLIE_CONFIG.CRUISE_SPEED * 0.5),
    decelRate: rate,
    status: 'Waiting for parking'
  };
  car._cachedParkYield = result;
  return result;
}

function updateParkingMotion(car, dt) {
  if (car.state === 'parked') {
    car.speed = 0;
    return;
  }
  if (car.state !== 'parking') return;

  const plan = car._parkPlan;
  if (!plan) {
    car.state = 'driving';
    clearParkingIntent(car);
    return;
  }

  // Watchdog: if we've been in reverse too long without finishing, eject
  car._parkingT = (car._parkingT || 0) + dt;
  if (car._parkingT > PARKING_CONFIG.PARKING_TIMEOUT) {
    car.state = 'driving';
    car._parkingT = 0;
    // Hold stall claim through despawn so nobody reverses into our body
    beginOuttaHere(car, { keepStall: true });
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
      car._parkingT = 0;
      noteParkerInactive(car);
      occupyStall(plan.bay, plan.stallIndex, car);
      if (car._parkDebug) car._parkDebug.phase = 'parked';
      refreshCarPoseCache(car);
      applyCarTransform(car);
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
  car.brakeLit = !!car.braking;
  updateCarBlinkers(car, dt);

  if (car.selected) {
    updateFollowedCarInfo(car);
    updateFollowTagPosition(car);
  }
}

function updateCar(car, dt) {
  if (car.state === 'despawning') {
    car.despawnT += dt;
    const p = Math.min(1, car.despawnT / ALLIE_CONFIG.DESPAWN_DURATION);
    applyCarTransform(car, 1 - p);
    car.despawnOpacity = 1 - p;
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
    car.brakeLit = false;
    updateCarBlinkers(car, dt);
    return;
  }

  if (car.parkingIntent) updateParkingSearch(car, dt);
  // May have flipped into parking during search/staging check
  if (car.state === 'parking' || car.state === 'parked') {
    updateParkingMotion(car, dt);
    return;
  }

  updateTrafficStuckWatchdog(car, dt);
  updateLaneChangeSystem(car, dt);
  tickPlayerControl(car);

  const prevSpeed = car.speed;
  const { desired, decelRate } = computeDesiredSpeed(car);
  car._debugDesired = desired;
  // Just escaped a jam: ease back up to speed instead of snapping to cruise.
  let accelRate = ALLIE_CONFIG.ACCEL;
  if (car._postMergeEaseT > 0) {
    accelRate = ALLIE_CONFIG.ACCEL * ALLIE_CONFIG.EMERGENCY_POST_MERGE_ACCEL_MULT;
    car._postMergeEaseT = Math.max(0, car._postMergeEaseT - dt);
  }
  if (car.speed < desired - 0.01) {
    car.speed = Math.min(desired, car.speed + accelRate * dt);
  } else if (car.speed > desired + 0.01) {
    car.speed = Math.max(desired, car.speed - decelRate * dt);
  }
  car._debugAccel = dt > 0.0001 ? (car.speed - prevSpeed) / dt : 0;
  car.braking = car.speed < prevSpeed - 0.01;

  advanceRightOnRed(car, dt);

  // Pure Pursuit: aim for a point Ld ahead along the route, steer toward it
  // (or the parking stage point while lining up beside a stall).
  let Ld = clampNum(car.speed * ALLIE_CONFIG.LOOKAHEAD_K, ALLIE_CONFIG.LOOKAHEAD_MIN, ALLIE_CONFIG.LOOKAHEAD_MAX);
  const curLegNow = car.route[car.legIndex];
  if (car._emergencyLaneChange && curLegNow && curLegNow.atom.kind === 'lanechange') {
    // Tight lookahead → the pursuit target sits close ahead on the target
    // lane, so steering bites harder and the car cuts across in a much
    // sharper, more decisive turn-out than a normal courteous blend.
    Ld = ALLIE_CONFIG.EMERGENCY_LANE_CHANGE_LD;
  }
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
      if (parkingSearchEnabled && car.state === 'driving') {
        // Last chance at destination; otherwise leave
        let staged = false;
        if (car.parkingIntent) {
          const candidate = findParkingCandidate(car);
          if (candidate) staged = beginParkingStaging(car, candidate);
        }
        if (!staged) beginOuttaHere(car);
      } else if (car.state === 'driving') {
        beginDespawn(car);
      }
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
      return;
    }
  }

  applyCarTransform(car);
  car.brakeLit = !!car.braking;
  updateCarBlinkers(car, dt);

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
      || status === 'Changing lanes' || status === 'Forcing jam escape' || status === 'Committed (yellow)'
      || status === 'Letting merge' || status === 'Making room' || status === 'Speeding to merge'
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
  spawner.marker = { x: spawner.x, y: spawner.y };
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
    if (list._spawnerEmpty) return;
    list._spawnerEmpty = true;
    list.innerHTML = '<div class="spawner-empty">No spawners placed</div>';
    return;
  }
  list._spawnerEmpty = false;
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

/** Light countdown refresh — textContent only, no list rebuild / layout thrash. */
function refreshSpawnerCountdowns() {
  const list = document.getElementById('spawner-list');
  if (!list || !spawners.length) return;
  for (let i = 0; i < spawners.length; i++) {
    const sp = spawners[i];
    const row = list.querySelector('[data-spawner-id="' + sp.id + '"]');
    if (!row) continue;
    const title = row.querySelector('.spawner-row-title');
    if (!title) continue;
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
    const next = '#' + sp.id + ' · every ' + sp.intervalSec + 's · ' + routes + ' routes · ' + status;
    if (title._spText !== next) {
      title._spText = next;
      title.textContent = next;
    }
  }
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
    marker: { x: pick.x, y: pick.y }
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
      marker: { x: item.x, y: item.y }
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
  // Full DOM rebuild only when spawners are added/removed/toggled.
  // Countdown text is patched in place ~1/sec (innerHTML rebuild was the hitch).
  if (uiDirty) {
    spawnerUiAccum = 0;
    updateSpawnerListUI();
  } else {
    spawnerUiAccum += dt;
    if (spawnerUiAccum >= 1) {
      spawnerUiAccum = 0;
      refreshSpawnerCountdowns();
    }
  }
}

// ---------------- Main loop ----------------

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
const FIXED_DT = 1 / TARGET_FPS;
const MAX_DT = 1 / 30; // keep steps even when a hitch occurs

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

  // Stay close to display refresh; only drop ultra-early frames
  if (lastTick != null && ts - lastTick < FRAME_MS * 0.55) {
    // Skip paint on ultra-early frames — pan/zoom already call renderFrame directly
    return;
  }

  tickFrame++;
  let dt = lastTick == null ? FIXED_DT : (ts - lastTick) / 1000;
  lastTick = ts;
  // Prefer steady steps — avoid large catch-up jumps that feel choppy
  if (dt > MAX_DT) dt = FIXED_DT;
  else dt = Math.min(Math.max(dt, FIXED_DT * 0.75), MAX_DT);

  // Batch scrub owns stepping + paint; don't fight it with a stale frame
  if (simFastForwarding) return;

  // Re-check hover every few frames — cars move and the follow camera pans under a
  // stationary cursor, so mousemove alone isn't enough.
  if (driveMode && lastDriveMouseWorld && (tickFrame & 1) === 0) {
    updateDrivePointerHover(lastDriveMouseWorld);
  }

  if (!simPaused) {
    // Speed chevrons: run multiple fixed steps when simSpeed > 1
    let budget = dt * (simSpeed > 0 ? simSpeed : 1);
    while (budget > 1e-8) {
      const step = Math.min(budget, MAX_DT);
      stepSim(step);
      budget -= step;
    }
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

  // HUD overlay is not frame-critical
  if ((tickFrame & 7) === 0) {
    const overlayCar = carOverlayTarget();
    if (overlayCar) updateCarOverlayContent(overlayCar);
    updateFfClockUI();
  }

  if (followedCar) updateCameraFollow(followedCar, dt);

  if (typeof renderFrame === 'function') renderFrame();
}

rebuildAllieGraph();
ensureSpawnerListClicks();
updateSpawnerPauseAllButton();
updateFfClockUI();
updateCarCountUI();
setSimSpeed(1);
board.addEventListener('mouseleave', () => {
  if (driveMode) {
    lastDriveMouseWorld = null;
    setHoveredCar(null);
  }
});
document.addEventListener('click', (e) => {
  const menu = document.getElementById('ff-skip-menu');
  if (!menu || !menu.classList.contains('open')) return;
  const wrap = e.target && e.target.closest ? e.target.closest('.ff-skip-wrap') : null;
  if (!wrap) menu.classList.remove('open');
});
const ffMinutesInput = document.getElementById('ff-minutes-input');
if (ffMinutesInput) {
  ffMinutesInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runFastForwardMinutes();
    }
  });
}
requestAnimationFrame(tick);