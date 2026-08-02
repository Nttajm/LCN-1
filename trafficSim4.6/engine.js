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
  STOP_LINE_GAP: 4.5, // rear-axle hold before turn entry (~bumper near stub)
  STOP_BRAKE_PAD: 0.85, // aim slightly short of the line (clamp catches overshoot)
  STOP_APPROACH_BITE: 15, // keep rolling until this close, then firm brake (no long crawl)
  STOP_APPROACH_EASE: 0.9, // cruise fraction while still outside the bite zone
  // After a queued lead clears past the painted line into the box, roll up to
  // our own limit line at this peak instead of matching their junction creep.
  STOP_PULLUP_SPEED: 15,
  STOP_PULLUP_EASE: 10, // smoothstep taper distance into the painted line
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
  // Peripheral "ring" awareness — soft slowdown for nearby off-path cars.
  // Kept narrow: side traffic should barely affect speed; real leads are
  // owned by findNearestObstruction / same-lane occupancy.
  SIDE_DETECT_RADIUS: 16,
  SIDE_DETECT_CONE_DEG: 42,
  SIDE_CAUTION_MAX_SLOWDOWN: 0.08,
  // Driver "head" — forward FOV with nested caution rings (human-like gaze).
  // Hard stops only for cars truly in front; side/adjacent barely register.
  HEAD_CONE_DEG: 38,
  HEAD_RING_FAR: 48,          // notice / begin easing
  HEAD_RING_MID: 26,          // clear caution slowdown
  HEAD_RING_NEAR: 13,         // firm brake toward a crawl
  HEAD_CAUTION_MAX_SLOWDOWN: 0.32,
  HEAD_NEAR_SPEED_CAP: 8,     // max speed when something is in the near ring
  HEAD_CRITICAL_LAT: 2.15,    // hard sensor stop: same-lane strip only (≪ LANE_OFFSET)
  // Intersection box clearance — don't enter if your path through the
  // junction is occupied; off-path cars only earn caution, not a hard hold.
  IX_CLEAR_LOOKAHEAD: 34,     // start scanning this far before the turn
  IX_PATH_HALF: 3.5,          // half-width of "my path through the box"
  IX_BOX_PAD: 10,             // how far past turn ends to treat as still "in box"
  IX_CAUTION_SLOWDOWN: 0.42,  // off-path-in-box → ease off this fraction of cruise
  IX_HOLD_TIMEOUT: 6.5,       // anti-deadlock if blocker never clears
  IDLE_CULL_SEC: 6,           // no-objective stopped cars are removed after this
  IDLE_REROUTE_SEC: 2.5,      // try one repath before culling a frozen car
  STUCK_GAS_NUDGE_AFTER: 12,  // aimlessly stopped this long → tap the gas
  STUCK_GAS_NUDGE_DUR: 1.55,  // gas hold length (player-gas style unstick)
  SPAWN_OCCUPY_RADIUS: 8.5,   // skip spawn if a car is this close to the pad
  SPAWN_GRACE_SEC: 3.5,       // new spawns ignored by idle cull / soft hard-safety
  // Unsignalized junction conflict / yield
  JUNCTION_CONFLICT_CLEARANCE: 2.8,
  JUNCTION_COMMIT_FRAC: 0.28,
  JUNCTION_YIELD_LOOKAHEAD: 28,
  JUNCTION_YIELD_TIMEOUT: 3.2, // if still waiting this long with no mover, take turn
  STOP_SIGN_DWELL: 0.55,       // full stop hold before leaving a stop sign
  STOP_SIGN_LOOKAHEAD: 32,     // when signed controls start binding
  STOP_ARRIVAL_TIE_EPS: 0.4,   // "roughly same time" window (DMV near-tie)
  STOP_HIGH_BEAM_DUR: 1.05,    // courtesy high-beam flash length
  STOP_HIGH_BEAM_PERIOD: 0.28, // flash pulse period
  YIELD_VIEW_DEG: 120,         // only yield for cars in this forward FOV (never behind)
  // T / stop / yield entry: creep up, look both ways, then go (human-like)
  JUNCTION_LOOK_RADIUS: 56,
  JUNCTION_LOOK_LEFT_DEG: 105,
  JUNCTION_LOOK_RIGHT_DEG: 105,
  JUNCTION_LOOK_FWD_DEG: 48,
  JUNCTION_CLEAR_TTC: 2.9,
  JUNCTION_CLEAR_GAP: 18,
  JUNCTION_CLEAR_HOLD: 0.28,   // must stay clear this long before creeping in
  JUNCTION_CREEP_SPEED: 4.2,
  JUNCTION_CREEP_COMMIT: 0.48, // how far into the box before "committed"
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
  SWEEP_DEG: 52,              // base arc sweep per half — tighter S-curve (was 38)
  SWEEP_MIN_DEG: 38,          // don't flatten toward a straight reverse
  STAGE_EXTRA: 0.35,          // stage closer to the stall (was 1.4)
  REVERSE_SPEED: 4.2,         // slower reverse so curves + holds read better
  REVERSE_ACCEL: 8,
  REVERSE_DECEL: 16,
  APPROACH_DECEL: 28,
  STAGE_POS_TOL: 1.6,         // was 1.1 — a little more forgiving
  STAGE_HEAD_TOL: 0.30,       // was 0.22 — allow slightly wider angle
  STAGE_SPEED_TOL: 2.0,       // was 1.2 — don't wait for a perfect stop
  STAGE_TIMEOUT: 12,          // seconds before we abort a stuck staging attempt
  PARKING_TIMEOUT: 10,        // seconds before we abort a stuck reverse maneuver
  SETTLE_TIME: 0.35,
  SEARCH_INTERVAL: 0.45,
  ROAM_MAX_ATTEMPTS: 6,       // failed roam/reroutes before giving up
  // How far ahead (in stall lengths) a driver scans the curb for an open spot.
  // They take the next free pad in that window — not a map-wide closest stall
  // that might be behind them and force a long lap.
  LOOKAHEAD_STALLS: 7,
  YIELD_LOOKAHEAD: 56,
  YIELD_GAP: 5.6 * 1.85,
  // Same-lane only — adjacent lanes must not wait for curb parkers.
  YIELD_LATERAL: 2.15,
  YIELD_LATERAL_REVERSE: 2.2,
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
let simBatchMode = false;      // true during skip-draw FF: larger steps, skip render-only work
let _batchRebuildSkip = 0;     // throttle rebuildCarIndexes while simBatchMode
let tickFrame = 0;             // advanced per physics step (and used for stagger caches)
let ffSkipSeconds = 3;         // selected skip interval (real sim seconds)
let ffSkipDraw = false;        // true = loader + no mid-skip render (faster)
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

// Lane congestion heat overlay + future routing cost source.
// Shape: laneCongestionState.bySegment[segmentId].lanes[laneIdx]
const LANE_CONGESTION_MIN_INTERVAL = 5;
const LANE_CONGESTION_MAX_INTERVAL = 10;
const LANE_CONGESTION_GAP_ALLOWANCE = 3.5;
const laneCongestionState = {
  enabled: false,
  updatedAtSimTime: 0,
  intervalSec: LANE_CONGESTION_MIN_INTERVAL,
  bySegment: Object.create(null),
  byRoad: Object.create(null),
  summary: { segments: 0, lanes: 0, cars: 0, green: 0, yellow: 0, red: 0 }
};
if (typeof window !== 'undefined') window.laneCongestionState = laneCongestionState;

let laneCongestionVisible = false;
let laneCongestionAccum = LANE_CONGESTION_MAX_INTERVAL;

function laneCongestionIntervalForLoad() {
  const n = cars ? cars.length : 0;
  return clampNum(5 + (n / 120), LANE_CONGESTION_MIN_INTERVAL, LANE_CONGESTION_MAX_INTERVAL);
}

function laneCongestionRgb(score) {
  const s = clampNum(score || 0, 0, 1);
  const g = [46, 204, 113];
  const y = [241, 196, 15];
  const r = [231, 76, 60];
  const a = s < 0.5 ? g : y;
  const b = s < 0.5 ? y : r;
  const t = s < 0.5 ? s * 2 : (s - 0.5) * 2;
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function laneCongestionLevel(score) {
  if (score >= 0.66) return 'red';
  if (score >= 0.30) return 'yellow';
  return 'green';
}

function updateLaneCongestionState(force) {
  const interval = laneCongestionIntervalForLoad();
  if (!force && laneCongestionAccum < interval) return false;
  laneCongestionAccum = 0;

  const now = typeof simTime === 'number' ? simTime : 0;
  const bySegment = Object.create(null);
  const byRoad = Object.create(null);
  const summary = { segments: 0, lanes: 0, cars: 0, green: 0, yellow: 0, red: 0 };
  const cruise = Math.max(1, ALLIE_CONFIG.CRUISE_SPEED || 1);
  const carFootprint = Math.max(1, (ALLIE_CONFIG.CAR_LENGTH || 5) + LANE_CONGESTION_GAP_ALLOWANCE);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const specs = getLaneSpecsFor(seg);
    if (!specs.length) continue;

    const dx = seg.endNode.x - seg.startNode.x;
    const dy = seg.endNode.y - seg.startNode.y;
    const roadLen = Math.max(1, Math.hypot(dx, dy));
    const capacity = Math.max(1, Math.floor(roadLen / carFootprint));
    const segKey = String(seg.id);
    const laneMap = Object.create(null);
    let segCars = 0;
    let segScore = 0;
    let segLevel = 'green';

    for (let j = 0; j < specs.length; j++) {
      const spec = specs[j];
      const laneKey = seg.id + ':' + spec.idx;
      const laneCars = laneOccupancy.get(laneKey);
      const count = laneCars ? laneCars.length : 0;
      let speedSum = 0;
      for (let k = 0; k < count; k++) speedSum += Math.max(0, laneCars[k].speed || 0);

      const avgSpeed = count ? (speedSum / count) : cruise;
      const density = clampNum(count / capacity, 0, 1);
      const speedScore = count ? clampNum(1 - (avgSpeed / cruise), 0, 1) : 0;
      let score = count ? clampNum(density * 0.55 + speedScore * 0.45, 0, 1) : 0;
      if (count >= 2 && avgSpeed < cruise * 0.18) score = Math.max(score, 0.72);
      const level = laneCongestionLevel(score);
      const rgb = laneCongestionRgb(score);
      const alpha = 0.38 + score * 0.48;
      const entry = {
        segmentId: seg.id,
        roadId: seg.id,
        laneIdx: spec.idx,
        direction: spec.forward ? 'out' : 'in',
        carCount: count,
        capacity,
        density: +density.toFixed(3),
        avgSpeed: +avgSpeed.toFixed(2),
        score: +score.toFixed(3),
        level,
        color: 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha.toFixed(3) + ')',
        updatedAtSimTime: +now.toFixed(2)
      };

      laneMap[spec.idx] = entry;
      segCars += count;
      segScore = Math.max(segScore, score);
      segLevel = laneCongestionLevel(segScore);
      summary.cars += count;
      summary.lanes++;
      summary[level]++;
    }

    const segEntry = {
      segmentId: seg.id,
      roadId: seg.id,
      updatedAtSimTime: +now.toFixed(2),
      carCount: segCars,
      maxScore: +segScore.toFixed(3),
      level: segLevel,
      lanes: laneMap
    };
    bySegment[segKey] = segEntry;
    byRoad[segKey] = segEntry;
    summary.segments++;
  }

  laneCongestionState.enabled = laneCongestionVisible;
  laneCongestionState.updatedAtSimTime = +now.toFixed(2);
  laneCongestionState.intervalSec = +interval.toFixed(2);
  laneCongestionState.bySegment = bySegment;
  laneCongestionState.byRoad = byRoad;
  laneCongestionState.summary = summary;
  return true;
}

function maybeUpdateLaneCongestion(dt) {
  if (!(dt > 0)) return;
  laneCongestionAccum += dt;
  updateLaneCongestionState(false);
}

function refreshLaneCongestionUI() {
  const btn = document.getElementById('view-btn-congestion');
  if (!btn) return;
  btn.classList.toggle('active', laneCongestionVisible);
  btn.title = laneCongestionVisible
    ? 'Lane congestion: On (updates every 5-10s; data in laneCongestionState)'
    : 'Lane congestion: Off (updates every 5-10s)';
}

function toggleLaneCongestionOverlay() {
  laneCongestionVisible = !laneCongestionVisible;
  laneCongestionState.enabled = laneCongestionVisible;
  if (laneCongestionVisible) {
    rebuildCarIndexes();
    updateLaneCongestionState(true);
  }
  refreshLaneCongestionUI();
  if (typeof renderFrame === 'function') renderFrame();
}

function congestionPieceIsVisible(p, pad) {
  if (typeof view === 'undefined' || typeof canvasW !== 'number' || typeof canvasH !== 'number') return true;
  const scale = Math.max(0.001, view.scale || 1);
  const minX = -view.x / scale - pad;
  const minY = -view.y / scale - pad;
  const maxX = (canvasW - view.x) / scale + pad;
  const maxY = (canvasH - view.y) / scale + pad;
  const px0 = Math.min(p.x1, p.x2) - pad;
  const px1 = Math.max(p.x1, p.x2) + pad;
  const py0 = Math.min(p.y1, p.y2) - pad;
  const py1 = Math.max(p.y1, p.y2) + pad;
  return px1 >= minX && px0 <= maxX && py1 >= minY && py0 <= maxY;
}

function drawCongestionBlock(c, cx1, cy1, cx2, cy2, perpX, perpY, halfW) {
  const ox = perpX * halfW;
  const oy = perpY * halfW;
  c.moveTo(cx1 + ox, cy1 + oy);
  c.lineTo(cx2 + ox, cy2 + oy);
  c.lineTo(cx2 - ox, cy2 - oy);
  c.lineTo(cx1 - ox, cy1 - oy);
  c.closePath();
}

function drawLaneCongestionSegmentCanvas(c, p, lanesIn, lanesOut, segId, alphaMul) {
  if (!laneCongestionVisible) return;
  const segData = laneCongestionState.bySegment[String(segId)];
  if (!segData || !segData.lanes) return;

  const dx = p.x2 - p.x1;
  const dy = p.y2 - p.y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  if (!congestionPieceIsVisible(p, 24)) return;

  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const scale = (typeof view !== 'undefined' && view.scale) ? Math.max(0.08, view.scale) : 1;
  const blockLen = clampNum(28 / scale, 14, 40);
  const gap = clampNum(blockLen * 0.1, 1.2, 3.2);
  const halfW = clampNum(LANE_OFFSET * 0.52, 1.8, 3.1);
  const specs = getLaneSpecs(lanesIn, lanesOut);

  c.save();
  c.lineJoin = 'round';
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const lane = segData.lanes[spec.idx];
    if (!lane) continue;
    const offX = perpX * spec.offset;
    const offY = perpY * spec.offset;
    const alpha = alphaMul == null ? 1 : alphaMul;
    const fill = lane.color.replace(/,([0-9.]+)\)$/, (_, a) => ',' + (Number(a) * alpha).toFixed(3) + ')');
    c.fillStyle = fill;
    // Soft outer glow so blocks pop against dark asphalt
    c.shadowColor = fill.replace(/,([0-9.]+)\)$/, ',0.55)');
    c.shadowBlur = 4.5 / Math.max(0.2, scale);
    c.beginPath();
    if (len <= blockLen + gap) {
      const inset = Math.min(len * 0.12, 4);
      drawCongestionBlock(
        c,
        p.x1 + ux * inset + offX,
        p.y1 + uy * inset + offY,
        p.x2 - ux * inset + offX,
        p.y2 - uy * inset + offY,
        perpX,
        perpY,
        halfW
      );
    } else {
      for (let s = 0; s < len - 0.5; s += blockLen + gap) {
        const e = Math.min(len, s + blockLen);
        if (e - s < 2) continue;
        drawCongestionBlock(
          c,
          p.x1 + ux * s + offX,
          p.y1 + uy * s + offY,
          p.x1 + ux * e + offX,
          p.y1 + uy * e + offY,
          perpX,
          perpY,
          halfW
        );
      }
    }
    c.fill();
  }
  c.shadowBlur = 0;
  c.restore();
}

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
let carWhyPanelOpen = false;
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
    if (typeof exitJunctionEditorMode === 'function') exitJunctionEditorMode();
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
    highBeamFlashT: 0,
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
    stopSignState: null,
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
    _confusedStuckT: 0,
    _stuckGasNudgeT: 0,
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
    _parkYieldInfo: null,
    _parkDebug: null,
    _parkBlockSegId: null,
    _parkBlockLaneIdx: null
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
  const ignitionOff = car.state === 'parked';
  // Parked = "off": body a touch faded, lamps dark/dim
  if (ignitionOff) opacity *= 0.78;

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
  c.fillStyle = ignitionOff ? 'rgba(180,180,190,0.18)' : 'rgba(255,255,255,0.35)';
  c.fill();

  // Brake lamps: lit bright red, idle faint, parked = very dark red
  const brakeAlpha = ignitionOff ? 0.55 : (car.brakeLit ? 0.95 : 0.15);
  c.fillStyle = ignitionOff ? '#4a1010' : '#ff3b3b';
  [-1, 1].forEach(side => {
    c.globalAlpha = opacity * brakeAlpha;
    canvasRoundRect(c, rearX - 0.05, side * (W / 2 - 0.55) - 0.3, 0.55, 0.6, 0.15);
    c.fill();
  });
  c.globalAlpha = opacity;

  const frontX = rearX + L - 0.7;
  const leftBlink = !ignitionOff && car.blinkerSide === 'left' && car.blinkerOn;
  const rightBlink = !ignitionOff && car.blinkerSide === 'right' && car.blinkerOn;
  const hbT = car.highBeamFlashT || 0;
  const highBeamPulse = !ignitionOff && hbT > 0
    && (Math.floor(hbT / Math.max(0.05, ALLIE_CONFIG.STOP_HIGH_BEAM_PERIOD)) % 2 === 0);
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1;
    const on = side === 'left' ? leftBlink : rightBlink;
    // Parked: both lamps show as faded dark orange (off look)
    const lampAlpha = ignitionOff ? 0.42 : (on ? 0.98 : 0.08);
    c.globalAlpha = opacity * lampAlpha;
    canvasRoundRect(c, frontX, sign * (W / 2 - 0.5) - 0.28, 0.62, 0.56, 0.14);
    c.fillStyle = ignitionOff ? '#6b3a12' : '#ffb020';
    c.fill();
    c.strokeStyle = ignitionOff ? '#3a2008' : '#cc7a00';
    c.lineWidth = 0.12;
    c.stroke();
  });
  // Courtesy high beams (near-tie stop-sign "after you")
  if (!ignitionOff && hbT > 0) {
    [-1, 1].forEach(sign => {
      c.globalAlpha = opacity * (highBeamPulse ? 1 : 0.22);
      canvasRoundRect(c, frontX - 0.05, sign * (W / 2 - 0.48) - 0.32, 0.78, 0.64, 0.16);
      c.fillStyle = highBeamPulse ? '#fff6d0' : '#c8c090';
      c.fill();
      if (highBeamPulse) {
        c.strokeStyle = '#ffe9a0';
        c.lineWidth = 0.14;
        c.stroke();
      }
    });
  }
  c.globalAlpha = opacity;

  const roofCx = rearX + L * 0.42;
  ['left', 'right'].forEach(side => {
    const sign = side === 'left' ? -1 : 1;
    const on = side === 'left' ? leftBlink : rightBlink;
    const tipY = sign * (W * 0.44);
    const headBase = sign * (W * 0.18);
    const stemEnd = sign * 0.12;
    const hw = 0.22;
    const lampAlpha = ignitionOff ? 0.38 : (on ? 1 : 0.12);
    c.globalAlpha = opacity * lampAlpha;
    c.beginPath();
    c.moveTo(roofCx, tipY);
    c.lineTo(roofCx - 0.62, headBase);
    c.lineTo(roofCx - hw, headBase);
    c.lineTo(roofCx - hw, stemEnd);
    c.lineTo(roofCx + hw, stemEnd);
    c.lineTo(roofCx + hw, headBase);
    c.lineTo(roofCx + 0.62, headBase);
    c.closePath();
    c.fillStyle = ignitionOff ? '#6b3a12' : '#ffb020';
    c.fill();
    c.strokeStyle = ignitionOff ? '#3a2008' : '#cc7a00';
    c.lineWidth = 0.1;
    c.stroke();
  });

  c.restore();
}

function drawCarsCanvas(c) {
  for (let i = 0; i < cars.length; i++) drawCarCanvas(c, cars[i]);
  // Yield / parking wait icons only for the currently targeted car (debug on)
  if (debugRingsOn) {
    const target = carOverlayTarget();
    if (target) drawCarWaitIndicator(c, target);
  }
}

let _yieldIndicatorImg = null;
let _parkingIndicatorImg = null;
function getYieldIndicatorImage() {
  if (_yieldIndicatorImg) return _yieldIndicatorImg;
  _yieldIndicatorImg = new Image();
  _yieldIndicatorImg.src = 'signs/yield.png';
  return _yieldIndicatorImg;
}
function getParkingIndicatorImage() {
  if (_parkingIndicatorImg) return _parkingIndicatorImg;
  _parkingIndicatorImg = new Image();
  _parkingIndicatorImg.src = 'signs/parking.png';
  return _parkingIndicatorImg;
}

function primaryTrafficYieldTarget(car) {
  if (car._stopPriorityYield) return car._stopPriorityYield;
  if (car._yieldOther) return car._yieldOther;
  if (car._juncThreat) return car._juncThreat;
  if (car._ixBlocker) return car._ixBlocker;
  return null;
}

function primaryParkYieldTarget(car) {
  if (car._parkYieldOther) return car._parkYieldOther;
  const py = car._parkYieldInfo;
  if (py && py.id != null) {
    for (let i = 0; i < cars.length; i++) {
      if (cars[i].id === py.id) return cars[i];
    }
  }
  return null;
}

function carShowsTrafficYieldIndicator(car) {
  if (!car || car.state === 'parked' || car.state === 'despawning' || car.isProbe) return false;
  // Parking wait uses its own icon — don't also flash yield
  if (car._signalStatus === 'Waiting for parking' || car._parkYieldOther) return false;
  const st = car._signalStatus;
  if (st === 'Yielding' || st === 'After you' || st === 'Yielding right on red') return true;
  if (st === 'Looking both ways' || st === 'Yield sign' || st === 'Waiting for clear') {
    return !!(car._yieldOther || car._stopPriorityYield || car._juncThreat || car._ixBlocker);
  }
  return !!(car._juncYielding && (car._yieldOther || car._stopPriorityYield || car._juncThreat));
}

function carShowsParkingYieldIndicator(car) {
  if (!car || car.state === 'parked' || car.state === 'despawning' || car.isProbe) return false;
  if (car._signalStatus === 'Waiting for parking') return true;
  return !!(car._parkYieldOther || (car._parkYieldInfo && car._parkYieldInfo.id != null));
}

/**
 * Debug-only: flashing yield.png / parking.png above a waiting car, with a
 * dashed track line to the car it's waiting for.
 */
function drawCarWaitIndicator(c, car) {
  let kind = null;
  let target = null;
  let img = null;
  let color = '#e74c3c';

  if (carShowsParkingYieldIndicator(car)) {
    kind = 'parking';
    target = primaryParkYieldTarget(car);
    img = getParkingIndicatorImage();
    color = '#7fd4ff';
  } else if (carShowsTrafficYieldIndicator(car)) {
    kind = 'yield';
    target = primaryTrafficYieldTarget(car);
    img = getYieldIndicatorImage();
    color = '#e74c3c';
  } else {
    return;
  }

  if (!img || !img.complete || !(img.naturalWidth > 0)) return;

  const opacity = (car.despawnOpacity != null) ? car.despawnOpacity : 1;
  if (opacity < 0.05) return;

  const cx = car._cx != null ? car._cx : car.x;
  const cy = car._cy != null ? car._cy : car.y;
  const iconSize = kind === 'parking' ? 4.8 : 5.2;
  const iconX = cx;
  const iconY = cy - ALLIE_CONFIG.CAR_LENGTH * 0.72 - iconSize * 0.35;

  const flash = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(simTime * Math.PI * 2 / 0.48));

  c.save();
  c.globalAlpha = opacity * flash;

  if (target && target !== car) {
    const tx = target._cx != null ? target._cx : target.x;
    const ty = target._cy != null ? target._cy : target.y;
    const dx = tx - iconX;
    const dy = ty - iconY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const endDist = Math.max(0, dist - ALLIE_CONFIG.CAR_LENGTH * 0.45);
    const ex = iconX + ux * endDist;
    const ey = iconY + uy * endDist;

    c.setLineDash([1.6, 1.1]);
    c.strokeStyle = color;
    c.lineWidth = 0.55;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(iconX, iconY + iconSize * 0.35);
    c.lineTo(ex, ey);
    c.stroke();
    c.setLineDash([]);

    const ah = 1.35;
    const ang = Math.atan2(uy, ux);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - Math.cos(ang - 0.45) * ah, ey - Math.sin(ang - 0.45) * ah);
    c.lineTo(ex - Math.cos(ang + 0.45) * ah, ey - Math.sin(ang + 0.45) * ah);
    c.closePath();
    c.fill();

    const ringPulse = 0.35 + 0.65 * flash;
    c.globalAlpha = opacity * ringPulse * 0.55;
    c.beginPath();
    c.arc(tx, ty, ALLIE_CONFIG.CAR_LENGTH * 0.55, 0, Math.PI * 2);
    c.strokeStyle = color;
    c.lineWidth = 0.5;
    c.stroke();
    c.globalAlpha = opacity * flash;
  }

  c.drawImage(img, iconX - iconSize * 0.5, iconY - iconSize * 0.5, iconSize, iconSize);
  c.restore();
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

/**
 * If a car sits still ~12s with status literally just "Stopped" (no yield /
 * light / traffic reason), tap the gas like a player for ~1.5s.
 */
function updateStuckGasNudge(car, dt) {
  if (car._stuckGasNudgeT > 0) {
    car._stuckGasNudgeT = Math.max(0, car._stuckGasNudgeT - dt);
    car._confusedStuckT = 0;
    return;
  }
  if (car.state !== 'driving' || car.isProbe || car === controlledCar) {
    car._confusedStuckT = 0;
    return;
  }
  // Overlay shows "Stopped" only when speed is low and _signalStatus is empty
  const plainStopped = car.speed < 0.55 && !car._signalStatus && !car.braking
    && carHasPathObjective(car)
    && car !== controlledCar
    && !(car.parkPhase)
    && !(car._spawnGraceT > 0);
  if (!plainStopped) {
    car._confusedStuckT = Math.max(0, (car._confusedStuckT || 0) - dt * 2);
    return;
  }
  car._confusedStuckT = (car._confusedStuckT || 0) + dt;
  if (car._confusedStuckT >= ALLIE_CONFIG.STUCK_GAS_NUDGE_AFTER) {
    car._stuckGasNudgeT = ALLIE_CONFIG.STUCK_GAS_NUDGE_DUR;
    car._confusedStuckT = 0;
  }
}

function applyStuckGasNudge(car, desired, decelRate) {
  if (!(car._stuckGasNudgeT > 0) || car === controlledCar) {
    return { desired, decelRate, status: null };
  }
  const gasTarget = Math.max(desired, ALLIE_CONFIG.CRUISE_SPEED * 1.06);
  return {
    desired: gasTarget,
    decelRate,
    status: 'Unsticking · gas'
  };
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
    el.classList.remove('visible', 'follow-mode', 'hover-mode', 'debug-on', 'why-on');
    return;
  }
  const isFollow = followedCar === car && car.selected;
  el.classList.add('visible');
  el.classList.toggle('follow-mode', isFollow);
  el.classList.toggle('hover-mode', !isFollow);
  el.classList.toggle('debug-on', debugRingsOn);
  el.classList.toggle('why-on', carWhyPanelOpen);

  const badge = document.getElementById('co-badge');
  const unfollowBtn = document.getElementById('co-unfollow');
  const controlBtn = document.getElementById('co-control');
  const tip = document.getElementById('co-tip');
  const whyBtn = document.getElementById('co-why-btn');
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
  if (whyBtn) {
    whyBtn.classList.toggle('active', carWhyPanelOpen);
    whyBtn.textContent = carWhyPanelOpen ? 'Hide why' : 'Why is it doing this?';
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
  const yieldBrief = formatYieldDebugText(car);
  const statusWithYield = (yieldBrief !== '—'
      && (status === 'Yielding' || status === 'After you' || status === 'Looking both ways'
        || status === 'Yield sign' || status === 'Waiting for clear'
        || status === 'Yielding right on red' || status === 'Intersection caution'))
    ? (status + ' → ' + yieldBrief)
    : status;
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
  set('co-status', statusWithYield);
  set('co-eta', etaText);
  set('co-remaining', remText);

  const lcdBrief = car._laneChangeDebug;
  const lcActive = !!(lcdBrief && lcdBrief.phase && lcdBrief.phase !== 'none');
  if (lcActive) {
    const bits = [lcdBrief.phase];
    if (lcdBrief.blinker) bits.push(lcdBrief.blinker);
    if (lcdBrief.plan) bits.push(lcdBrief.plan);
    set('co-lc-brief', bits.join(' · '));
  } else {
    set('co-lc-brief', '—');
  }

  // Tags stay on the summary (visible even with debug off)
  const tagsEl = document.getElementById('co-tags');
  if (tagsEl) {
    const tags = describeCarAction(car);
    let key = '';
    for (let i = 0; i < tags.length; i++) key += tags[i].text + '|' + tags[i].color + ';';
    if (tagsEl._tagKey !== key) {
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
  }

  if (carWhyPanelOpen) updateCarWhyPanel(car);

  if (!debugRingsOn) return;

  const caution = Math.max(car._peripheralCaution || 0, car._headCaution || 0);
  const nearby = gatherNearbyForDebug(car, Math.max(ALLIE_CONFIG.SIDE_DETECT_RADIUS, ALLIE_CONFIG.HEAD_RING_FAR));
  const obs = car._lastObstruction;
  const yieldTxt = formatYieldDebugText(car);
  let safetyTxt = '—';
  if (car._hardSafetyHit) {
    const win = hardSafetyLoser(car, car._hardSafetyHit) === car._hardSafetyHit;
    safetyTxt = win ? `WIN vs #${car._hardSafetyHit.id}` : `LOSE vs #${car._hardSafetyHit.id}`;
  }
  set('co-caution', caution.toFixed(2));
  set('co-nearby', String(nearby.length));
  set('co-lead', obs ? `#${obs.other.id} · ${obs.gap.toFixed(1)} gap` : '—');
  set('co-yield', yieldTxt);
  set('co-safety', safetyTxt);

  // Sensors summary chip
  const sensorBits = [];
  if (obs) sensorBits.push('lead #' + obs.other.id);
  if (yieldTxt !== '—') sensorBits.push('yield ' + yieldTxt);
  else if (caution > 0.05) sensorBits.push('caut ' + caution.toFixed(2));
  else sensorBits.push(nearby.length + ' near');
  set('co-sensors-brief', sensorBits.join(' · '));

  const lcd = car._laneChangeDebug;
  if (lcActive) {
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
    set('co-lc-sec-brief', lcd.phase + (lcd.blinker ? ' · ' + lcd.blinker : ''));
  } else {
    set('co-lc-phase', 'none');
    set('co-lc-plan', 'stay in lane');
    set('co-lc-blinker', 'off');
    set('co-lc-dist', '—');
    set('co-lc-gap', '—');
    set('co-lc-decision', '—');
    set('co-lc-wait', '—');
    set('co-lc-sec-brief', 'idle');
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

  // Show exactly which parker this car is holding for
  let parkYieldTxt = '—';
  const py = car._parkYieldInfo;
  const po = car._parkYieldOther;
  if (py || po) {
    const id = (py && py.id != null) ? py.id : (po ? po.id : '?');
    const bits = ['#' + id];
    if (py && py.phase) bits.push(py.phase);
    if (py && py.bay) bits.push(py.bay);
    if (py && py.lane) bits.push(py.lane);
    if (py && py.gap != null) bits.push('gap ' + py.gap + 'u');
    parkYieldTxt = bits.join(' · ');
  } else if (car._lastObstruction && car._lastObstruction.other
      && (car._lastObstruction.other.state === 'parking'
        || car._lastObstruction.other.parkPhase === 'staging')) {
    const o = car._lastObstruction.other;
    const phase = o.state === 'parking'
      ? ('reverse·' + (o.parkPhase || 'parking'))
      : (o.parkPhase || 'staging');
    parkYieldTxt = '#' + o.id + ' · ' + phase + ' · path lead'
      + (car._lastObstruction.gap != null
        ? (' · gap ' + car._lastObstruction.gap.toFixed(1) + 'u')
        : '');
  }
  set('co-park-yield', parkYieldTxt);
  set('co-park-sec-brief', parkPhase === 'none' ? 'none' : parkPhase);

  // Enrich main status when waiting on a specific parker
  if (car._signalStatus === 'Waiting for parking' && (py || po)) {
    const id = (py && py.id != null) ? py.id : po.id;
    set('co-status', 'Waiting for parking · #' + id
      + (py && py.phase ? (' · ' + py.phase) : ''));
  }

  // Highlight + auto-open relevant debug sections (respect manual toggle)
  const parkActive = parkPhase !== 'none'
    || !!(py || po)
    || car.state === 'parking'
    || car.state === 'parked';
  const sensorsHot = !!(obs || (yieldTxt !== '—') || car._hardSafetyHit || caution > 0.2);
  refreshCarOverlaySections({
    lcActive,
    parkActive,
    sensorsHot
  });
}

function toggleCarWhyPanel() {
  carWhyPanelOpen = !carWhyPanelOpen;
  const el = document.getElementById('car-overlay');
  if (el) el.classList.toggle('why-on', carWhyPanelOpen);
  const whyBtn = document.getElementById('co-why-btn');
  if (whyBtn) {
    whyBtn.classList.toggle('active', carWhyPanelOpen);
    whyBtn.textContent = carWhyPanelOpen ? 'Hide why' : 'Why is it doing this?';
  }
  const car = carOverlayTarget();
  if (carWhyPanelOpen && car) updateCarWhyPanel(car);
}

/** Build stop-line / lead / yield facts for the Why panel. */
function collectCarWhyFacts(car) {
  const facts = [];
  const speed = car.speed;
  const desired = car._debugDesired != null ? car._debugDesired
    : (car._constraintFinalDesired != null ? car._constraintFinalDesired : null);
  facts.push({
    k: 'Speed → target',
    v: Math.round(speed) + ' → ' + (desired != null ? Math.round(desired) : '—') + ' u/s',
    alert: speed < 0.6 && desired != null && desired < 0.6
  });

  const info = findUpcomingSignalTurn(car);
  if (info) {
    const gapCfg = ALLIE_CONFIG.STOP_LINE_GAP;
    const stopDist = Math.max(0, info.dist - gapCfg);
    facts.push({
      k: 'Turn entry',
      v: info.dist.toFixed(1) + ' u · ' + (info.turnType || '?')
    });
    facts.push({
      k: 'Stop line (gap ' + gapCfg + ')',
      v: stopDist.toFixed(1) + ' u before entry',
      alert: car.speed < 0.6 && stopDist > 3.5
    });
    const nd = nodes.get(info.nodeKey);
    if (nd && junctionHasSignedControls(nd)) {
      const ctl = effectiveApproachControl(nd, info.segId) || '—';
      facts.push({ k: 'Approach control', v: String(ctl).toUpperCase() });
    }
  } else {
    facts.push({ k: 'Upcoming turn', v: 'none in lookahead' });
  }

  const st = car.stopSignState;
  if (st && st.phase && st.phase !== 'cleared') {
    facts.push({
      k: 'Sign phase',
      v: st.phase + (st.control ? (' · ' + st.control) : '')
    });
  }
  if (car.signalDecision) {
    facts.push({
      k: 'Signal decision',
      v: car.signalDecision.choice
        + (car.rorPhase && car.rorPhase !== 'cleared' ? (' · ror ' + car.rorPhase) : '')
    });
  }

  const obs = car._lastObstruction;
  if (obs && obs.other) {
    facts.push({
      k: 'Lead car',
      v: '#' + obs.other.id + ' · gap ' + obs.gap.toFixed(1)
        + 'u · ' + Math.round(obs.speed) + ' u/s',
      alert: car.speed < 0.6 && obs.gap > ALLIE_CONFIG.DETECT_FOLLOW_GAP * 1.5
    });
  } else {
    facts.push({ k: 'Lead car', v: 'none' });
  }

  const yieldTxt = formatYieldDebugText(car);
  if (yieldTxt !== '—') {
    facts.push({ k: 'Yielding for', v: yieldTxt, alert: true });
  }
  if (car._ixBlocker) {
    facts.push({ k: 'IX blocker', v: '#' + car._ixBlocker.id, alert: true });
  }
  if (car._hardSafetyHit) {
    const win = hardSafetyLoser(car, car._hardSafetyHit) === car._hardSafetyHit;
    facts.push({
      k: 'Hard safety',
      v: (win ? 'WIN' : 'LOSE') + ' vs #' + car._hardSafetyHit.id,
      alert: !win
    });
  }
  if (car._parkYieldOther || car._parkYieldInfo) {
    const id = car._parkYieldInfo && car._parkYieldInfo.id != null
      ? car._parkYieldInfo.id
      : (car._parkYieldOther ? car._parkYieldOther.id : '?');
    facts.push({ k: 'Parking hold', v: '#' + id, alert: true });
  }

  return facts;
}

function updateCarWhyPanel(car) {
  const verdictEl = document.getElementById('co-why-verdict');
  const factsEl = document.getElementById('co-why-facts');
  const listEl = document.getElementById('co-why-list');
  if (!verdictEl || !factsEl || !listEl) return;

  const status = car._signalStatus || (car.speed < 0.55 ? 'Stopped' : 'Driving');
  const desired = car._debugDesired != null ? car._debugDesired : car._constraintFinalDesired;
  const trace = car._constraintTrace || [];
  const binders = trace.filter(t => t.binding);
  let verdict;
  if (car.speed < 0.55 && desired != null && desired < 0.55) {
    if (binders.length) {
      verdict = 'Stopped by: ' + binders.map(b => b.name + (b.status ? ' (' + b.status + ')' : '')).join(' + ');
    } else {
      verdict = 'Stopped · status “' + status + '” (no cap rows this frame)';
    }
  } else if (binders.length) {
    verdict = 'Capped by: ' + binders.map(b => b.name).join(' + ')
      + ' → ' + Math.round(desired != null ? desired : car.speed) + ' u/s';
  } else {
    verdict = status + (desired != null ? (' · target ' + Math.round(desired) + ' u/s') : '');
  }

  if (verdictEl._coText !== verdict) {
    verdictEl._coText = verdict;
    verdictEl.textContent = verdict;
  }

  const facts = collectCarWhyFacts(car);
  let factKey = '';
  for (let i = 0; i < facts.length; i++) {
    factKey += facts[i].k + '=' + facts[i].v + (facts[i].alert ? '!' : '') + ';';
  }
  if (factsEl._factKey !== factKey) {
    factsEl._factKey = factKey;
    factsEl.textContent = '';
    for (let i = 0; i < facts.length; i++) {
      const f = facts[i];
      const row = document.createElement('div');
      row.className = 'co-why-fact' + (f.alert ? ' alert' : '');
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = f.k;
      const v = document.createElement('span');
      v.className = 'v';
      v.textContent = f.v;
      row.appendChild(k);
      row.appendChild(v);
      factsEl.appendChild(row);
    }
  }

  let listKey = '';
  for (let i = 0; i < trace.length; i++) {
    const t = trace[i];
    listKey += t.name + '|' + t.desired + '|' + (t.status || '') + '|' + (t.binding ? 1 : 0) + ';';
  }
  if (listEl._listKey === listKey) return;
  listEl._listKey = listKey;
  listEl.textContent = '';
  if (!trace.length) {
    const empty = document.createElement('div');
    empty.className = 'co-why-empty';
    empty.textContent = 'No constraint sample yet — wait one tick (follow / hover the car).';
    listEl.appendChild(empty);
    return;
  }
  for (let i = 0; i < trace.length; i++) {
    const t = trace[i];
    const row = document.createElement('div');
    row.className = 'co-why-row' + (t.binding ? ' binding' : '');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = (t.binding ? '● ' : '') + t.name;
    const spd = document.createElement('span');
    spd.className = 'spd';
    spd.textContent = (t.desired < 0.05 ? '0' : t.desired.toFixed(1)) + ' u/s';
    row.appendChild(name);
    row.appendChild(spd);
    if (t.status) {
      const st = document.createElement('span');
      st.className = 'st';
      st.textContent = t.status;
      row.appendChild(st);
    }
    listEl.appendChild(row);
  }
}

/** Persist / sync collapsible debug sections on the car overlay. */
const _coSectionManual = Object.create(null);

function initCarOverlaySections() {
  const ids = ['co-sec-sensors', 'co-sec-lc', 'co-sec-park'];
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (!el) continue;
    try {
      const saved = localStorage.getItem('co-section:' + ids[i]);
      if (saved === '1') el.open = true;
      else if (saved === '0') el.open = false;
    } catch (e) { /* ignore */ }
    el.addEventListener('toggle', () => {
      _coSectionManual[ids[i]] = true;
      try {
        localStorage.setItem('co-section:' + ids[i], el.open ? '1' : '0');
      } catch (e) { /* ignore */ }
    });
  }
}

function refreshCarOverlaySections(flags) {
  const setSec = (id, hot, preferOpen) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hot', !!hot);
    // Auto-open when relevant only if the user hasn't toggled this section yet
    if (preferOpen && !_coSectionManual[id] && !el.open) el.open = true;
  };
  setSec('co-sec-sensors', flags.sensorsHot, flags.sensorsHot);
  setSec('co-sec-lc', flags.lcActive, flags.lcActive);
  setSec('co-sec-park', flags.parkActive, flags.parkActive);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarOverlaySections);
  } else {
    initCarOverlaySections();
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
  updateLaneCongestionState(true);
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

function setFfSkipDraw(on) {
  ffSkipDraw = !!on;
  const btn = document.getElementById('ff-btn-skip-draw');
  if (btn) {
    btn.textContent = ffSkipDraw ? 'On' : 'Off';
    btn.classList.toggle('active', ffSkipDraw);
    btn.title = ffSkipDraw
      ? 'On = loader + batch sim, no mid-skip drawing (faster)'
      : 'Off = animate skip on canvas · turn On for loader + faster batch skip';
  }
}

function toggleFfSkipDraw() {
  setFfSkipDraw(!ffSkipDraw);
}

/** Advance the sim by one physics step (no render). */
function stepSim(dt) {
  if (!(dt > 0)) return;
  tickFrame++;
  simTime += dt;
  if (typeof updateSignals === 'function') updateSignals(dt);
  updateSpawners(dt);
  // Batch skip: rebuild spatial/lane indexes every 6th step (~0.75s stale at 1/8 dt)
  if (!simBatchMode || (_batchRebuildSkip++ % 6 === 0)) rebuildCarIndexes();
  maybeUpdateLaneCongestion(dt);
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

function setFfLoaderUI(active, pct, title, sub) {
  // Same black full-screen loader as Apply parking / traffic-state load
  if (active) {
    if (typeof showTrafficLoadScreen === 'function') {
      showTrafficLoadScreen(pct || 0, sub || title || 'Skipping…', title || 'FAST FORWARD');
    }
  } else if (typeof hideTrafficLoadScreen === 'function') {
    hideTrafficLoadScreen();
  }
}

/**
 * Advance `seconds` of sim time.
 * Default: scrub on-canvas at ~10–100× (render each frame).
 * With ffSkipDraw: full-screen loader + batch stepSim (no mid-skip render).
 */
async function fastForwardSim(seconds, onProgress) {
  const total = Math.max(0, Number(seconds) || 0);
  if (!(total > 0) || simFastForwarding) return { skipped: 0 };
  // Don't run if the sim itself is paused by the user
  if (simPaused) return { skipped: 0 };
  simFastForwarding = true;
  const skipDraw = !!ffSkipDraw;
  // Batch skip: larger steps (fewer updateCar / rebuild passes). Safe vs signal phases (~3s+).
  const maxStep = skipDraw
    ? (1 / 8)
    : ((typeof MAX_DT === 'number' && MAX_DT > 0) ? MAX_DT : (1 / 30));
  let remaining = total;
  let advanced = 0;
  const waitFrame = () => new Promise(r => requestAnimationFrame(ts => r(ts)));

  try {
    if (skipDraw) {
      simBatchMode = true;
      _batchRebuildSkip = 0;
      const skipLabel = formatFfSkipLabel(total).replace(/^\+/, '');
      setFfLoaderUI(true, 0, 'FAST FORWARD', 'Skipping ' + skipLabel + '…');
      if (typeof onProgress === 'function') onProgress(0, 'Batch skip');
      await waitFrame(); // paint loader before first heavy chunk
      // Pack as many physics steps as fit in ~40ms of wall time per cycle, then
      // rAF so the loader bar can paint. No renderFrame until the end.
      const CHUNK_MS = 40;
      while (remaining > 1e-6) {
        const t0 = performance.now();
        while (remaining > 1e-6 && (performance.now() - t0) < CHUNK_MS) {
          const s = Math.min(remaining, maxStep);
          stepSim(s);
          remaining -= s;
          advanced += s;
        }
        const pct = Math.min(1, advanced / total);
        updateFfClockUI();
        updateCarCountUI();
        const info = formatSimClock(simTime) + ' · ' + Math.round(advanced) + 's / ' + Math.round(total) + 's';
        setFfLoaderUI(true, pct, 'FAST FORWARD', info);
        if (typeof onProgress === 'function') onProgress(pct, info);
        await waitFrame();
      }
    } else {
      const mult = ffVisualMultiplier(total);
      let lastWall = null;
      setFfScrubUI(true, 0, 'Skipping ' + formatFfSkipLabel(total).replace(/^\+/, '') + '…', mult);
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
    }

    if (typeof renderFrame === 'function') renderFrame();
    updateCarCountUI();
    updateFfClockUI();
    if (typeof onProgress === 'function') onProgress(1, 'Ready · ' + formatSimClock(simTime));
    return { skipped: advanced, skipDraw };
  } finally {
    setFfScrubUI(false, 0, '', 0);
    setFfLoaderUI(false, 0, '', '');
    simBatchMode = false;
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
  else if (status === 'Unsticking · gas') tags.push({ text: 'Unsticking · gas', color: '#6DFF8A' });
  else if (status === 'Blocked') tags.push({ text: 'Blocked (loser)', color: '#FF5C5C' });
  else if (status === 'Yielding') tags.push({ text: 'Yielding', color: '#FF8888' });
  else if (status === 'After you') tags.push({ text: 'After you · high beams', color: '#FFE066' });
  else if (status === 'Stop sign') tags.push({ text: 'Stop sign', color: '#FF6B6B' });
  else if (status === 'Yield sign') tags.push({ text: 'Yield sign', color: '#FFB347' });
  else if (status === 'Stopped for traffic') tags.push({ text: 'Stopped · traffic', color: '#FF6B6B' });
  else if (status === 'Braking for traffic') tags.push({ text: 'Braking · traffic', color: '#FFB020' });
  else if (status === 'Following') tags.push({ text: 'Following', color: '#7FD4FF' });
  else if (status === 'Caution') tags.push({ text: 'Side caution', color: '#FFB347' });
  else if (status === 'Head caution') tags.push({ text: 'Head caution', color: '#FF9F43' });
  else if (status === 'Waiting for clear') tags.push({ text: 'Waiting · intersection', color: '#FF6B6B' });
  else if (status === 'Looking both ways') tags.push({ text: 'Looking both ways', color: '#7fd4ff' });
  else if (status === 'Creeping out') tags.push({ text: 'Creeping out', color: '#9ae6b4' });
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
  else if (status === 'Waiting for parking') {
    const py = car._parkYieldInfo;
    const po = car._parkYieldOther;
    const id = (py && py.id != null) ? py.id : (po ? po.id : null);
    tags.push({
      text: id != null
        ? ('Waiting for parking · #' + id
          + (py && py.phase ? (' · ' + py.phase) : '')
          + (py && py.gap != null ? (' · ' + py.gap + 'u') : ''))
        : 'Waiting for parking',
      color: '#7fd4ff'
    });
  }

  // Who this car is actually waiting on (stop seniority / coast / IX / park)
  const yieldTargets = collectYieldDebugTargets(car);
  for (let yi = 0; yi < yieldTargets.length; yi++) {
    const yt = yieldTargets[yi];
    tags.push({
      text: 'Yield → #' + yt.id + (yt.why ? (' · ' + yt.why) : ''),
      color: yt.color || '#FF8888'
    });
  }

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

  // Highlight who this car is actually yielding for (stop / coast / park)
  drawDebugYieldTargets(c, car, center);
  // Target follow / stop-line gap bar (only while those holds are active)
  drawDebugGapHold(c, car);
}

/**
 * When following traffic or holding for a stop/yield/signal line, draw the
 * clearance the car is trying to keep: a lane-width bar ahead of the nose
 * ending at a cross-line. Hidden otherwise so debug stays quiet.
 */
function drawDebugGapHold(c, car) {
  if (!car || car.state === 'parked' || car.state === 'parking' || car.state === 'despawning') return;

  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const halfW = ALLIE_CONFIG.CAR_WIDTH * 0.42;
  const nose = ALLIE_CONFIG.CAR_LENGTH - ALLIE_CONFIG.REAR_OVERHANG;
  const fx = car.x + cosH * nose;
  const fy = car.y + sinH * nose;
  const rx = -sinH, ry = cosH; // right lateral

  const FOLLOW = ALLIE_CONFIG.DETECT_FOLLOW_GAP;
  const MID = ALLIE_CONFIG.DETECT_RING_MID;
  const obs = car._lastObstruction;
  const following = !!(obs && obs.other && obs.gap != null && isFinite(obs.gap) && obs.gap < MID);

  const stopGap = debugStopGapHold(car);

  if (!following && !stopGap) return;

  function drawGapBar(dist, fill, stroke, label) {
    if (!(dist > 0.15)) return;
    const ex = fx + cosH * dist;
    const ey = fy + sinH * dist;
    c.save();
    c.globalAlpha = 0.9;
    // Soft corridor fill
    c.beginPath();
    c.moveTo(fx + rx * halfW, fy + ry * halfW);
    c.lineTo(ex + rx * halfW, ey + ry * halfW);
    c.lineTo(ex - rx * halfW, ey - ry * halfW);
    c.lineTo(fx - rx * halfW, fy - ry * halfW);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    // Side rails
    c.strokeStyle = stroke;
    c.lineWidth = 0.35;
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(fx + rx * halfW, fy + ry * halfW);
    c.lineTo(ex + rx * halfW, ey + ry * halfW);
    c.moveTo(fx - rx * halfW, fy - ry * halfW);
    c.lineTo(ex - rx * halfW, ey - ry * halfW);
    c.stroke();
    // Target gap / stop line across the lane
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(ex + rx * (halfW + 0.35), ey + ry * (halfW + 0.35));
    c.lineTo(ex - rx * (halfW + 0.35), ey - ry * (halfW + 0.35));
    c.stroke();
    // Tick marks on the hold line
    c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - cosH * 0.7, ey - sinH * 0.7);
    c.stroke();
    if (label) {
      c.fillStyle = stroke;
      c.font = '600 2.1px ui-monospace, Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(label, ex - rx * (halfW + 0.2), ey - ry * (halfW + 0.55));
    }
    c.restore();
  }

  // Follow cushion — drawn first (closer). Tint hotter when inside the hold gap.
  if (following) {
    const tight = obs.gap <= FOLLOW;
    const fill = tight ? 'rgba(255,90,70,0.18)' : 'rgba(255,180,60,0.14)';
    const stroke = tight ? 'rgba(255,100,80,0.95)' : 'rgba(255,190,70,0.9)';
    drawGapBar(FOLLOW, fill, stroke, 'gap ' + FOLLOW.toFixed(1));
    // Actual lead bumper mark along the same corridor (if within mid ring)
    if (obs.gap > 0.2 && obs.gap < MID) {
      const ax = fx + cosH * Math.max(0.2, obs.gap);
      const ay = fy + sinH * Math.max(0.2, obs.gap);
      c.save();
      c.globalAlpha = 0.85;
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      c.lineWidth = 0.45;
      c.setLineDash([1.2, 0.8]);
      c.beginPath();
      c.moveTo(ax + rx * halfW, ay + ry * halfW);
      c.lineTo(ax - rx * halfW, ay - ry * halfW);
      c.stroke();
      c.restore();
    }
  }

  // Intersection / signal stop line — fixed on the road at the hold point
  if (stopGap) {
    const stopS = stopGap.stopS != null
      ? stopGap.stopS
      : (car.traveledLength + stopGap.dist);
    let ex = fx + cosH * Math.max(0.2, stopGap.dist);
    let ey = fy + sinH * Math.max(0.2, stopGap.dist);
    let tx = cosH, ty = sinH;
    const p = sampleRouteAtDistance(car, stopS);
    if (p) {
      ex = p.x; ey = p.y;
      if (p.tx != null && p.ty != null) { tx = p.tx; ty = p.ty; }
    }
    // Don't draw if the hold line is well behind the nose already
    const along = (ex - fx) * cosH + (ey - fy) * sinH;
    if (along < -ALLIE_CONFIG.CAR_LENGTH * 0.4) {
      // past the line — skip
    } else {
      const prx = -ty, pry = tx;
      const lineHalf = halfW + 0.55;
      const colors = stopGap.kind === 'stop' || stopGap.kind === 'signal'
        ? { fill: 'rgba(255,70,70,0.12)', stroke: 'rgba(255,90,90,0.95)', label: 'stop' }
        : stopGap.kind === 'yield'
          ? { fill: 'rgba(255,170,50,0.12)', stroke: 'rgba(255,180,70,0.95)', label: 'yield' }
          : { fill: 'rgba(120,200,255,0.12)', stroke: 'rgba(140,210,255,0.95)', label: 'hold' };

      c.save();
      c.globalAlpha = 0.9;
      if (along > 0.4 && !(following && along < FOLLOW * 1.35)) {
        c.beginPath();
        c.moveTo(fx + rx * halfW * 0.85, fy + ry * halfW * 0.85);
        c.lineTo(ex + prx * halfW * 0.85, ey + pry * halfW * 0.85);
        c.lineTo(ex - prx * halfW * 0.85, ey - pry * halfW * 0.85);
        c.lineTo(fx - rx * halfW * 0.85, fy - ry * halfW * 0.85);
        c.closePath();
        c.fillStyle = colors.fill;
        c.fill();
      }
      c.strokeStyle = colors.stroke;
      c.lineWidth = 1.05;
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(ex + prx * lineHalf, ey + pry * lineHalf);
      c.lineTo(ex - prx * lineHalf, ey - pry * lineHalf);
      c.stroke();
      c.fillStyle = colors.stroke;
      c.font = '600 2.1px ui-monospace, Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(colors.label, ex, ey - 1.1);
      c.restore();
    }
  }
}

/** Active stop/yield/signal hold distance ahead of the rear axle along the route. */
function debugStopGapHold(car) {
  const info = findUpcomingSignalTurn(car);
  if (!info || info.dist == null) return null;
  const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
  // Only while the car is actually in a junction / signal hold scenario
  const st = car.stopSignState;
  const signedHold = !!(st && st.phase && st.phase !== 'cleared'
    && (st.phase === 'approach' || st.phase === 'dwell' || st.phase === 'look'
      || st.phase === 'creep'));
  const status = car._signalStatus || '';
  const statusHold = /Stop sign|Yield sign|Yielding|Looking both|Waiting for clear|Red light|Right on red|Creeping|After you|Intersection caution/.test(status);
  const signalHold = !!(car.signalDecision
    && (car.signalDecision.choice === 'stop' || car.signalDecision.choice === 'ror')
    && car.rorPhase !== 'cleared');
  const unsigHold = !!(car.junctionWait && info.dist <= ALLIE_CONFIG.JUNCTION_YIELD_LOOKAHEAD + 2
    && (status === 'Yielding' || car._yieldOther));

  if (!signedHold && !statusHold && !signalHold && !unsigHold) return null;
  // Don't draw when still far out (not yet "at" the intersection hold)
  if (info.dist > ALLIE_CONFIG.STOP_SIGN_LOOKAHEAD + 4) return null;
  if (stopDist > 26) return null;

  let kind = 'hold';
  if (st && st.control === 'stop') kind = 'stop';
  else if (st && st.control === 'yield') kind = 'yield';
  else if (/Red light|Right on red/.test(status) || (car.signalDecision && car.signalDecision.choice === 'stop')) kind = 'signal';
  else if (/Yield/.test(status)) kind = 'yield';
  else if (/Stop sign/.test(status)) kind = 'stop';

  return { dist: stopDist, stopS: info.turnLeg.cumStart - ALLIE_CONFIG.STOP_LINE_GAP, kind };
}

/** Gather distinct cars this vehicle is currently yielding to, with reason labels. */
function collectYieldDebugTargets(car) {
  const out = [];
  const seen = new Set();

  function add(other, why, color) {
    if (!other || other.id == null || seen.has(other.id)) return;
    seen.add(other.id);
    out.push({ other, id: other.id, why: why || '', color: color || '#FF8888' });
  }

  if (car._stopPriorityYield) {
    const courtesy = !!(car.highBeamFlashT > 0 || car._stopCourtesyFlash
      || car._signalStatus === 'After you');
    add(car._stopPriorityYield, courtesy ? 'stop · after you' : 'stop · seniority', '#FFE066');
  }
  if (car._juncThreat && car._juncThreat !== car._stopPriorityYield) {
    add(car._juncThreat, 'coast threat', '#FF9F43');
  }
  if (car._yieldOther
      && car._yieldOther !== car._stopPriorityYield
      && car._yieldOther !== car._juncThreat
      && car._yieldOther !== car._ixBlocker) {
    add(car._yieldOther, 'yield', '#FF8888');
  }
  if (car._ixBlocker) {
    add(car._ixBlocker, 'intersection path', '#FF3333');
  }
  const po = car._parkYieldOther;
  if (po) add(po, 'parking', '#7fd4ff');
  const py = car._parkYieldInfo;
  if (py && py.id != null && !seen.has(py.id)) {
    const match = cars.find(c => c.id === py.id);
    if (match) add(match, 'parking', '#7fd4ff');
    else out.push({ other: null, id: py.id, why: 'parking', color: '#7fd4ff' });
  }
  return out;
}

function formatYieldDebugText(car) {
  const targets = collectYieldDebugTargets(car);
  if (!targets.length) return '—';
  return targets.map(t => '#' + t.id + (t.why ? ' ' + t.why : '')).join(' · ');
}

function drawDebugYieldTargets(c, car, center) {
  const targets = collectYieldDebugTargets(car);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const other = t.other;
    if (!other) continue;
    const ocx = other._cx != null ? other._cx : other.x;
    const ocy = other._cy != null ? other._cy : other.y;
    const stroke = t.color || '#FF8888';
    // Link line: ego → yield target
    c.save();
    c.globalAlpha = 0.9;
    c.setLineDash([1.8, 1.2]);
    canvasStrokeLine(c, center.x, center.y, ocx, ocy, stroke, 0.75);
    c.setLineDash([]);
    c.restore();
    drawDebugOBB(c, carOBB(other), 'rgba(255,200,60,0.18)', stroke, 1.05, 0.45);
    // ID label near target
    c.save();
    c.font = '2.4px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillStyle = stroke;
    c.strokeStyle = 'rgba(0,0,0,0.65)';
    c.lineWidth = 0.45;
    const label = '#' + other.id;
    c.strokeText(label, ocx, ocy - ALLIE_CONFIG.CAR_WIDTH);
    c.fillText(label, ocx, ocy - ALLIE_CONFIG.CAR_WIDTH);
    c.restore();
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
  if (car.highBeamFlashT > 0) {
    car.highBeamFlashT = Math.max(0, car.highBeamFlashT - dt);
  }
  // Blinkers are draw-only — skip during batch FF
  if (simBatchMode) return;
  // Parked cars are ignition-off — no active signals
  if (car.state === 'parked') {
    car.blinkerSide = null;
    car.blinkerOn = false;
    car._parkBlinker = null;
    car._blinkerSignal = null;
    car._blinkerIdle = true;
    car.highBeamFlashT = 0;
    return;
  }
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
  // Aim short of the painted line so timestep + reaction don't blow past it
  const pad = ALLIE_CONFIG.STOP_BRAKE_PAD != null ? ALLIE_CONFIG.STOP_BRAKE_PAD : 0;
  const d = Math.max(0, stopDist - pad);
  // Kinematic max speed that still allows a stop at (line − pad)
  const target = Math.sqrt(Math.max(0, 2 * rate * d));
  if (stopDist <= 0.55) {
    return { desired: 0, decelRate: Math.max(rate, ALLIE_CONFIG.DECEL_SHARP), status: 'Red light' };
  }
  if (target >= ALLIE_CONFIG.CRUISE_SPEED - 0.5) return null;
  return { desired: Math.max(0, target), decelRate: rate, status: 'Red light' };
}

/**
 * While approaching / dwelling at a stop sign, never roll the rear axle past
 * the limit line (stopDist = 0). Snaps pose back onto the line if needed.
 */
function clampStopSignLimitLine(car) {
  const st = car.stopSignState;
  if (!st || st.control !== 'stop') return;
  if (st.phase !== 'approach' && st.phase !== 'dwell') return;
  const info = findUpcomingSignalTurn(car);
  if (!info || info.turnLegIndex !== st.turnLegIndex) return;
  const stopS = info.turnLeg.cumStart - ALLIE_CONFIG.STOP_LINE_GAP;
  if (!(car.traveledLength > stopS + 0.02)) return;
  car.traveledLength = stopS;
  car.speed = 0;
  car.braking = true;
  const p = sampleRouteAtDistance(car, stopS);
  if (p) {
    car.x = p.x;
    car.y = p.y;
    if (p.tx != null && p.ty != null) car.heading = Math.atan2(p.ty, p.tx);
    refreshCarPoseCache(car);
  }
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
  const frontPeers = (conflicts && info && info.nodeKey)
    ? frontConflictPeers(car, nearby, info.nodeKey, conflicts, myOrigin)
    : null;
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

    // Don't ROR-yield for a car 2+ deep in a conflicting approach queue
    if (conflictHit && frontPeers && frontPeers.size > 0 && !frontPeers.has(other)) continue;

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

/**
 * Look LEFT + RIGHT + FORWARD at a stop/yield line (T-intersection entry).
 * Returns true when the coast is clear enough to creep / commit.
 * Uses gap + TTC — distant through traffic alone must not freeze the stem forever.
 */
function junctionCoastClear(car, info) {
  if (car._juncClearFrame === tickFrame) return !!car._juncClearCached;

  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const radius = ALLIE_CONFIG.JUNCTION_LOOK_RADIUS;
  const leftHalf = (ALLIE_CONFIG.JUNCTION_LOOK_LEFT_DEG * Math.PI / 180) * 0.5;
  const rightHalf = (ALLIE_CONFIG.JUNCTION_LOOK_RIGHT_DEG * Math.PI / 180) * 0.5;
  const fwdHalf = (ALLIE_CONFIG.JUNCTION_LOOK_FWD_DEG * Math.PI / 180) * 0.5;
  const leftCenter = -Math.PI / 2;
  const rightCenter = Math.PI / 2;

  const turnAtom = info.turnLeg && info.turnLeg.atom;
  const myOrigin = turnAtom && turnAtom.originStub;
  const conflicts = turnAtom && turnAtom.conflicts;
  const nd = nodes.get(info.nodeKey);
  const myControl = nd ? effectiveApproachControl(nd, info.segId) : null;

  const pathPts = [];
  const s0 = car.traveledLength;
  const s1 = Math.min(car.totalLength, s0 + ALLIE_CONFIG.ROR_PATH_LOOKAHEAD);
  for (let s = s0 + 2; s <= s1; s += 5) {
    const p = sampleRouteAtDistance(car, s);
    if (p) pathPts.push(p);
  }

  let threat = null;
  const nearby = collectNearbyCars(egoX, egoY, radius);
  // Front-of-queue only for graph conflict peers (ignore deep queued cross traffic)
  const frontPeers = (conflicts && info && info.nodeKey)
    ? frontConflictPeers(car, nearby, info.nodeKey, conflicts, myOrigin)
    : null;
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning' || other.state === 'parked') continue;
    // Yield / coast threats only inside forward yield FOV — never behind
    if (!isCarInYieldForwardView(car, other)) continue;

    const ocx = other._cx != null ? other._cx : other.x;
    const ocy = other._cy != null ? other._cy : other.y;
    const dx = ocx - egoX, dy = ocy - egoY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5 || dist > radius) continue;

    const fwd = dx * cosH + dy * sinH;
    const lat = -dx * sinH + dy * cosH;
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.12) continue;

    const bearing = Math.atan2(lat, Math.max(0.2, fwd));
    let dLeft = bearing - leftCenter;
    while (dLeft > Math.PI) dLeft -= Math.PI * 2;
    while (dLeft < -Math.PI) dLeft += Math.PI * 2;
    let dRight = bearing - rightCenter;
    while (dRight > Math.PI) dRight -= Math.PI * 2;
    while (dRight < -Math.PI) dRight += Math.PI * 2;
    const inLeft = Math.abs(dLeft) <= leftHalf && lat < -1.0;
    const inRight = Math.abs(dRight) <= rightHalf && lat > 1.0;
    const inFwd = Math.abs(bearing) <= fwdHalf && fwd > 1.0;
    if (!inLeft && !inRight && !inFwd) continue;

    const oInfo = findUpcomingSignalTurn(other);
    const oTurn = (other.route && other.route[other.legIndex] && other.route[other.legIndex].atom.kind === 'turn')
      ? other.route[other.legIndex].atom
      : (oInfo && oInfo.turnLeg && oInfo.turnLeg.atom);
    // Same approach queue — not cross traffic
    if (oTurn && myOrigin && oTurn.originStub === myOrigin) continue;
    if (oInfo && oInfo.nodeKey === info.nodeKey && oInfo.segId === info.segId) continue;

    let conflictHit = false;
    if (conflicts && oTurn && oTurn.nodeKey === info.nodeKey && conflicts.has(oTurn.id)) {
      conflictHit = true;
    } else if (conflicts && oInfo && oInfo.nodeKey === info.nodeKey
        && oInfo.turnLeg && conflicts.has(oInfo.turnLeg.atom.id)
        && oInfo.dist < radius) {
      conflictHit = true;
    }

    // Don't coast-yield for a car 2+ deep in a conflicting approach queue
    if (conflictHit && frontPeers && frontPeers.size > 0 && !frontPeers.has(other)) continue;

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

    // Side look: only care about movers that can reach us soon
    if (!conflictHit && !nearPath && (inLeft || inRight)) {
      if (other.speed < 0.9 && dist > ALLIE_CONFIG.JUNCTION_CLEAR_GAP) continue;
    }

    const oCos = other._cosH != null ? other._cosH : Math.cos(other.heading);
    const oSin = other._sinH != null ? other._sinH : Math.sin(other.heading);
    const relVx = oCos * other.speed - cosH * car.speed;
    const relVy = oSin * other.speed - sinH * car.speed;
    const closing = Math.max(0, -(relVx * dx + relVy * dy) / dist);
    const ttc = closing > 0.35 ? dist / closing : Infinity;

    // ROW through-traffic: only block if actually closing into the conflict
    let oControl = null;
    if (nd) {
      const oMetaSeg = oInfo && oInfo.nodeKey === info.nodeKey ? oInfo.segId : null;
      if (oMetaSeg != null) oControl = effectiveApproachControl(nd, oMetaSeg);
    }
    if (oControl == null && other.stopSignState && other.stopSignState.nodeKey === info.nodeKey) {
      oControl = other.stopSignState.control || 'stop';
    }
    const otherHasRow = oControl === 'row' && (myControl === 'yield' || myControl === 'stop');

    // All-way / equal stop peers waiting their turn must not mutual-deadlock
    if (shouldIgnoreStopPeerThreat(car, other, info, myControl, oControl)) {
      continue;
    }

    const inBox = otherIsInIntersection(other, info.nodeKey);
    const committedThreat = inBox || (conflictHit && (
      (oTurn && other.route[other.legIndex] && other.route[other.legIndex].atom === oTurn)
      || (oInfo && oInfo.dist < 12 && other.speed > 0.8)
      || nearPath
    ));

    const movingThreat = other.speed > 1.4 && (
      dist < ALLIE_CONFIG.JUNCTION_CLEAR_GAP
      || ttc < ALLIE_CONFIG.JUNCTION_CLEAR_TTC
      || ((inLeft || inRight) && closing > 1.0 && dist < radius * 0.9
          && ttc < ALLIE_CONFIG.JUNCTION_CLEAR_TTC * 1.35)
    );

    // Far ROW cars with comfortable TTC: do NOT block (this was the T-stem freeze)
    if (otherHasRow && !committedThreat && !inBox) {
      if (!(movingThreat && (ttc < ALLIE_CONFIG.JUNCTION_CLEAR_TTC || dist < ALLIE_CONFIG.JUNCTION_CLEAR_GAP * 0.85))) {
        continue;
      }
    }

    const pathThreat = nearPath && (other.speed > 0.6 || dist < ALLIE_CONFIG.JUNCTION_CLEAR_GAP * 0.65);

    if (committedThreat || movingThreat || pathThreat) {
      threat = other;
      break;
    }
  }

  car._juncThreat = threat || null;
  // Don't sticky-keep a stale yield target once coast is clear
  if (threat) car._yieldOther = threat;
  else if (car._yieldOther === car._juncThreat) car._yieldOther = null;
  car._juncClearCached = !threat;
  car._juncClearFrame = tickFrame;
  return car._juncClearCached;
}

function advanceSignedJunction(car, dt) {
  const st = car.stopSignState;
  if (!st || !st.phase || st.phase === 'cleared' || st.phase === 'approach' || st.phase === 'dwell') {
    return;
  }

  const info = findUpcomingSignalTurn(car);
  if (!info || info.turnLegIndex !== st.turnLegIndex) {
    car.stopSignState = null;
    return;
  }

  // Entered the turn — commit
  if (info.dist <= 0.12 || (car.legIndex === info.turnLegIndex
      && (car.traveledLength - info.turnLeg.cumStart) / Math.max(info.turnLeg.length, 0.01)
        >= ALLIE_CONFIG.JUNCTION_CREEP_COMMIT)) {
    st.phase = 'cleared';
    car._yieldOther = null;
    car._stopPriorityYield = null;
    car._juncClearT = 0;
    return;
  }

  if (st.phase !== 'look' && st.phase !== 'creep') return;

  // Priority hold from stop seniority (set by signedJunctionConstraintFor)
  const priorityHold = !!car._stopPriorityYield;
  const clear = !priorityHold && junctionCoastClear(car, info);
  car._juncYielding = !clear;
  if (clear) car._juncClearT = (car._juncClearT || 0) + dt;
  else car._juncClearT = 0;

  // Patience: only force when no seniority hold and no imminent mover
  const waitedFrom = st.arrivalT != null ? st.arrivalT : (st.approachT || simTime);
  const waited = simTime - waitedFrom;
  const forceGo = !priorityHold
    && waited >= ALLIE_CONFIG.JUNCTION_YIELD_TIMEOUT + (st.control === 'stop' ? ALLIE_CONFIG.STOP_SIGN_DWELL : 0)
    && (!car._juncThreat || car._juncThreat.speed < 1.2);

  if (st.phase === 'look') {
    if ((car._juncClearT || 0) >= ALLIE_CONFIG.JUNCTION_CLEAR_HOLD || forceGo) {
      st.phase = 'creep';
      st.creepStart = simTime;
      st.unclearT = 0;
    }
    return;
  }

  // creep — once rolling into the box, don't bounce back to look on soft
  // coast flicker (that caused accel↔stop pulsing). Only seniority hard-yield
  // holds speed at 0 via the constraint; phase stays creep until cleared.
  if (!clear && !forceGo) {
    if (priorityHold) {
      st.unclearT = (st.unclearT || 0) + dt;
      // keep phase as creep — desired=0 from hardYield handles the hold
    } else {
      st.unclearT = 0;
    }
    return;
  }
  st.unclearT = 0;
  if (info.dist <= 0.15 || (simTime - (st.creepStart || simTime)) > 2.0) {
    st.phase = 'cleared';
    car._yieldOther = null;
    car._stopPriorityYield = null;
    car._juncClearT = 0;
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

  // Parking stage hold: reversing cars leave the lane corridor, so also treat
  // their fixed stage point as a stopped on-path lead — but ONLY if that stage
  // point sits in *this* car's lane corridor (adjacent lanes keep moving).
  {
    const stageHalf = Math.min(corridorHalf, PARKING_CONFIG.YIELD_LATERAL);
    const stageHalfSq = stageHalf * stageHalf;
    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other === car || other.isProbe) continue;
      if (other.state !== 'parking' && other.parkPhase !== 'staging') continue;
      if (!parkerBlocksEgoLane(car, other)) continue;
      // Don't treat a parker behind us as an on-path lead via stage ghost
      if (!shouldYieldForParker(car, other)) continue;
      const sp = other._parkStagePoint || (other._parkPlan && other._parkPlan.stagePoint);
      if (!sp) continue;
      const dx = sp.x - egoX, dy = sp.y - egoY;
      if (dx * cosH + dy * sinH < ALLIE_CONFIG.CAR_LENGTH * 0.1) continue;
      // Cheap world-frame reject before path projection
      const latWorld = Math.abs(-dx * sinH + dy * cosH);
      if (latWorld > stageHalf * 1.15) continue;
      let bestLatSq = Infinity, bestS = 0;
      for (let k = 0; k < nSamp; k++) {
        const samp = _pathSamples[k];
        const ddx = sp.x - samp.x, ddy = sp.y - samp.y;
        const dSq = ddx * ddx + ddy * ddy;
        if (dSq < bestLatSq) { bestLatSq = dSq; bestS = samp.s; }
      }
      if (bestLatSq > stageHalfSq) continue;
      if (bestS < car.traveledLength + 0.4) continue;
      const gap = (bestS - car.traveledLength) - ALLIE_CONFIG.CAR_LENGTH;
      if (gap < -1.5) continue;
      // Stage is a hard hold — treat as stopped lead
      if (!best || gap < best.gap) best = { gap, speed: 0, other, proj: null };
    }
  }
  return best;
}

// Soft "heat-map" caution from nearby off-path cars (adjacent lanes, converging traffic).
// Returns 0..1. Direct path hazards are handled by findNearestObstruction and skipped here.
// Side cars barely register — only threats nearly ahead in a narrow cone matter.
function computePeripheralCaution(car) {
  if (car.isProbe || !cars.length) return 0;

  const radius = ALLIE_CONFIG.SIDE_DETECT_RADIUS;
  const halfCone = (ALLIE_CONFIG.SIDE_DETECT_CONE_DEG * Math.PI / 180) * 0.5;
  const cosH = car._cosH, sinH = car._sinH;
  const egoX = car._cx, egoY = car._cy;
  if (egoX == null) return 0;
  const corridorHalf = ALLIE_CONFIG.DETECT_CORRIDOR_HALF;
  const pathHazard = car._lastObstruction;
  const myPos = car._segPos;

  let caution = 0;
  const nearby = collectNearbyCars(egoX, egoY, radius);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning' || other.state === 'parked') continue;
    if (pathHazard && pathHazard.other === other) continue;
    // Adjacent-lane / different-road traffic: ignore for soft side caution
    if (myPos && other._segPos
        && (other._segPos.segId !== myPos.segId || other._segPos.laneIdx !== myPos.laneIdx)) {
      continue;
    }
    // Parkers only matter if their blocked lane matches ours and they aren't behind
    if (other.state === 'parking' || other.parkPhase === 'staging') {
      if (!parkerBlocksEgoLane(car, other)) continue;
      if (!shouldYieldForParker(car, other)) continue;
      const sp = other._parkStagePoint || (other._parkPlan && other._parkPlan.stagePoint);
      if (sp) {
        const sdx = sp.x - egoX, sdy = sp.y - egoY;
        const slat = Math.abs(-sdx * sinH + sdy * cosH);
        if (slat > corridorHalf * 1.15) continue;
      }
    }

    const dx = other._cx - egoX, dy = other._cy - egoY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 0.01) continue;

    const dist = Math.sqrt(distSq);
    const fwd = dx * cosH + dy * sinH;
    // Must be clearly ahead — not beside the bumper
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.55) continue;
    const lat = -dx * sinH + dy * cosH;
    // Pure side / adjacent: ignore (hard leads already owned by corridor detect)
    if (Math.abs(lat) > corridorHalf * 1.35) continue;
    if (Math.abs(lat) < corridorHalf * 0.9 && fwd > 0) continue;
    const bearing = Math.atan2(lat, fwd);
    if (Math.abs(bearing) > halfCone) continue;

    const prox = 1 - dist / radius;
    const aheadBias = 0.35 + 0.65 * Math.max(0, fwd / dist);
    const score = prox * prox * aheadBias * 0.55;
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
  // Hard stop strip must stay inside one lane (LANE_OFFSET ≈ 4)
  const criticalLat = Math.min(
    corridorHalf,
    ALLIE_CONFIG.HEAD_CRITICAL_LAT != null
      ? ALLIE_CONFIG.HEAD_CRITICAL_LAT
      : corridorHalf
  );
  const pathHazard = car._lastObstruction;
  const myPos = car._segPos;

  let caution = 0;
  let nearThreat = null, midThreat = null, farThreat = null;
  let criticalThreat = null;
  let criticalGap = Infinity;
  let nearestDist = Infinity;

  const nearby = collectNearbyCars(egoX, egoY, FAR + ALLIE_CONFIG.CAR_LENGTH);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning' || other.state === 'parked') continue;

    // Prefer stage-point for parkers so we test the blocked lane, not the curb swing
    let ox = other._cx, oy = other._cy;
    const parking = other.state === 'parking' || other.parkPhase === 'staging';
    if (parking) {
      // Never head-scan parkers outside our travel lane
      if (!parkerBlocksEgoLane(car, other)) continue;
      // Never sensor-yield for a parking car behind us
      if (!shouldYieldForParker(car, other)) continue;
      const sp = other._parkStagePoint || (other._parkPlan && other._parkPlan.stagePoint);
      if (sp) { ox = sp.x; oy = sp.y; }
    }

    const dx = ox - egoX, dy = oy - egoY;
    const distSq = dx * dx + dy * dy;
    if (distSq < 0.25) continue;
    const dist = Math.sqrt(distSq);
    if (dist > FAR) continue;

    const fwd = dx * cosH + dy * sinH;
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.35) continue;
    const lat = -dx * sinH + dy * cosH;
    const absLat = Math.abs(lat);

    const oPos = other._segPos;
    const sameLane = !!(myPos && oPos
      && myPos.segId === oPos.segId
      && myPos.laneIdx === oPos.laneIdx);
    // Known different lane → never a head / sensor threat
    if (myPos && oPos && !sameLane && !parking) continue;
    if (parking && myPos && oPos && !sameLane && other.parkPhase === 'staging') continue;

    // Must be roughly co-directional (crossing / opposing handled elsewhere)
    const oCos = other._cosH != null ? other._cosH : Math.cos(other.heading);
    const oSin = other._sinH != null ? other._sinH : Math.sin(other.heading);
    const align = oCos * cosH + oSin * sinH;
    if (align < 0.2 && !parking) continue;

    // Critical forward sensor: same-lane / on-path strip ONLY
    const bumperGap = fwd - ALLIE_CONFIG.CAR_LENGTH;
    const onPathStrip = absLat <= criticalLat;
    if (onPathStrip
        && fwd <= NEAR + ALLIE_CONFIG.CAR_LENGTH
        && (sameLane || (!oPos && !myPos) || parking)) {
      // If either car has a lane tag, require same lane for hard stop
      if ((myPos && oPos && !sameLane) || absLat > corridorHalf) {
        // skip critical
      } else if (!criticalThreat || bumperGap < criticalGap) {
        criticalThreat = other;
        criticalGap = bumperGap;
      }
    }

    // Exact on-path lead is owned by findNearestObstruction / trafficConstraint
    if (pathHazard && pathHazard.other === other) continue;
    // Skip pure same-lane corridor (traffic constraint already owns these)
    if (absLat < corridorHalf * 0.85 && fwd > 0) continue;
    // Side / adjacent — do not soft-brake for cars beside us
    if (absLat > criticalLat) continue;

    const bearing = Math.atan2(lat, fwd);
    if (Math.abs(bearing) > halfCone) continue;

    // Closing-speed bias: cars coming at us feel hotter than receding ones
    const relVx = oCos * other.speed - cosH * car.speed;
    const relVy = oSin * other.speed - sinH * car.speed;
    const closing = Math.max(0, -(relVx * dx + relVy * dy) / dist);
    const closeBoost = 1 + clampNum(closing / 28, 0, 0.55);

    // Ring heat: near=1, mid~0.65, far~0.3, with distance falloff inside each band
    let ringHeat;
    if (dist <= NEAR) {
      ringHeat = 0.55 + 0.25 * (1 - dist / NEAR);
      if (!nearThreat || dist < nearestDist) nearThreat = other;
    } else if (dist <= MID) {
      ringHeat = 0.28 + 0.22 * (1 - (dist - NEAR) / Math.max(0.01, MID - NEAR));
      if (!midThreat) midThreat = other;
    } else {
      ringHeat = 0.08 + 0.14 * (1 - (dist - MID) / Math.max(0.01, FAR - MID));
      if (!farThreat) farThreat = other;
    }

    // Center-of-gaze bias (things straight ahead matter more than cone edge)
    const gaze = 1 - (Math.abs(bearing) / halfCone) * 0.85;
    const score = ringHeat * gaze * closeBoost * 0.55;
    if (score > caution) caution = score;
    if (dist < nearestDist) nearestDist = dist;
  }

  return {
    caution: clampNum(caution, 0, 1),
    nearThreat, midThreat, farThreat,
    criticalThreat,
    criticalGap,
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
    head = car._headScan || { caution: 0, nearThreat: null, criticalThreat: null, criticalGap: Infinity, nearestDist: Infinity };
  }
  car._headCaution = head.caution || 0;

  // Hard Sensor stop only for cars already treated as on-path leads, or true
  // same-lane occupancy. Adjacent / other-lane cars never hard-stop here.
  if (head.criticalThreat) {
    const other = head.criticalThreat;
    const myPos = car._segPos;
    const oPos = other._segPos;
    const sameLane = !!(myPos && oPos
      && myPos.segId === oPos.segId
      && myPos.laneIdx === oPos.laneIdx);
    const pathLead = !!(car._lastObstruction && car._lastObstruction.other === other);
    const parkingInLane = (other.state === 'parking' || other.parkPhase === 'staging')
      && parkerBlocksEgoLane(car, other);
    if (sameLane || pathLead || parkingInLane) {
      const leadV = Math.max(0, other.speed || 0);
      const pullUp = stopSignLeadPastLimitLine(car, other);
      const holdGap = pullUp
        ? Math.max(1.6, ALLIE_CONFIG.DETECT_FOLLOW_GAP * 0.32)
        : Math.max(ALLIE_CONFIG.DETECT_FOLLOW_GAP, ALLIE_CONFIG.CAR_LENGTH * 0.9);
      const gap = isFinite(head.criticalGap) ? head.criticalGap : 0;
      const closing = Math.max(0, gap - holdGap);
      let desired = Math.sqrt(Math.max(0, leadV * leadV + 2 * ALLIE_CONFIG.DECEL_SHARP * closing));
      if (!pullUp && (gap <= holdGap || leadV < 1.2)) desired = 0;
      else if (pullUp && gap < holdGap * 0.5) desired = Math.min(desired, Math.max(leadV, 0));
      const speedCap = pullUp
        ? (ALLIE_CONFIG.STOP_PULLUP_SPEED != null ? ALLIE_CONFIG.STOP_PULLUP_SPEED : 15)
        : ALLIE_CONFIG.HEAD_NEAR_SPEED_CAP;
      return {
        desired: Math.max(0, Math.min(desired, speedCap)),
        decelRate: ALLIE_CONFIG.DECEL_SHARP,
        status: desired <= 0.2 ? 'Sensor stop' : 'Sensor yield'
      };
    }
    // Other-lane geometric near-miss → soft caution only (below)
  }

  if (!head.caution || head.caution < 0.08) return null;

  const cruise = ALLIE_CONFIG.CRUISE_SPEED;
  let desired = cruise * (1 - ALLIE_CONFIG.HEAD_CAUTION_MAX_SLOWDOWN * head.caution);
  if (head.nearThreat) {
    desired = Math.min(desired, cruise * (0.55 + 0.45 * (1 - head.caution)));
  } else if (head.midThreat && head.caution > 0.5) {
    desired = Math.min(desired, cruise * 0.7);
  }

  if (desired >= cruise - 0.5) return null;
  return {
    desired: Math.max(0, desired),
    decelRate: ALLIE_CONFIG.DECEL_NORMAL,
    status: 'Caution'
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
  const frontPeers = (conflicts && info && info.nodeKey)
    ? frontConflictPeers(car, nearby, info.nodeKey, conflicts, myOrigin)
    : null;
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    // Don't hold for cars outside forward yield FOV (never behind)
    if (!isCarInYieldForwardView(car, other)) continue;

    // All-way stop: car with ROW must not hold for a waiting peer
    if (shouldIgnoreStopPeerForIx(car, other, info)) continue;

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
      // Queued-behind peers (not front, not in box) are the lead car's problem
      const queuedBehind = !inBox && frontPeers && frontPeers.size > 0 && !frontPeers.has(other);
      if (!queuedBehind && (inBox || (oInfo && oInfo.dist < ALLIE_CONFIG.IX_CLEAR_LOOKAHEAD * 0.7 && other.speed > 1.0))) {
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

/**
 * Ego is still approaching a stop limit line, and `other` (same-queue lead)
 * has already crossed past that painted line into the junction. Used so the
 * follower can pull up briskly instead of crawl-matching junction creep.
 */
function stopSignLeadPastLimitLine(car, other) {
  if (!car || !other) return false;
  const st = car.stopSignState;
  if (!st || st.control !== 'stop') return false;
  if (st.phase !== 'approach' && st.phase !== 'dwell') return false;
  const info = findUpcomingSignalTurn(car);
  if (!info || info.turnLegIndex !== st.turnLegIndex) return false;
  const stopS = info.turnLeg.cumStart - ALLIE_CONFIG.STOP_LINE_GAP;
  if (other.traveledLength > stopS + 0.35) return true;
  const oLeg = other.route && other.route[other.legIndex];
  if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey) return true;
  return false;
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

  // Lead already past our stop line into the box — pull up to the painted
  // line. Peak is STOP_PULLUP_SPEED, but ease in/out so it doesn't lurch
  // from a standstill or slam into the line.
  if (obs.other && stopSignLeadPastLimitLine(car, obs.other)) {
    const info = findUpcomingSignalTurn(car);
    const stopDist = info
      ? Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP)
      : gap;
    const pad = ALLIE_CONFIG.STOP_BRAKE_PAD != null ? ALLIE_CONFIG.STOP_BRAKE_PAD : 0;
    const holdGap = Math.max(1.6, FOLLOW * 0.32);
    const closingPull = Math.max(0, gap - holdGap);
    const gapCap = Math.sqrt(Math.max(0,
      leadV * leadV + 2 * ALLIE_CONFIG.DECEL_NORMAL * closingPull));
    const dAvail = Math.max(0, stopDist - pad);
    // Gentle brake curve into the painted line (not DECEL_SHARP slam)
    const lineCap = Math.sqrt(Math.max(0, 2 * ALLIE_CONFIG.DECEL_NORMAL * dAvail));
    const pull = ALLIE_CONFIG.STOP_PULLUP_SPEED != null
      ? ALLIE_CONFIG.STOP_PULLUP_SPEED : 15;
    const easeLen = ALLIE_CONFIG.STOP_PULLUP_EASE != null
      ? ALLIE_CONFIG.STOP_PULLUP_EASE : 10;
    // smoothstep on remaining distance: soft launch + soft settle at the line
    const u = clampNum(dAvail / Math.max(0.01, easeLen), 0, 1);
    const smooth = u * u * (3 - 2 * u);
    const profile = pull * (0.28 + 0.72 * smooth);
    let desired = Math.min(profile, gapCap, lineCap);
    // Don't outrun what we can still ease down for; keep a little forward
    // intent until the signed approach owns the final stop.
    if (stopDist <= pad + 0.2) {
      desired = 0;
    } else if (car.speed > 0.4) {
      // Anti-lurch: don't yank desired far above current while already rolling
      desired = Math.min(desired, Math.max(car.speed + 4.5, car.speed * 1.15));
    }
    if (gap < holdGap) {
      desired = Math.min(desired, Math.max(leadV, gapCap * 0.5));
    }
    car._trafficStatus = desired < 0.5 ? 'Stopped for traffic' : 'Following';
    return {
      desired,
      decelRate: ALLIE_CONFIG.DECEL_NORMAL,
      status: car._trafficStatus
    };
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

// ---- Signed junction controls (stop / yield / R.O.W.) --------------------

function junctionHasSignedControls(nd) {
  if (!nd || !nd.approachControls) return false;
  const keys = Object.keys(nd.approachControls);
  for (let i = 0; i < keys.length; i++) {
    const t = nd.approachControls[keys[i]];
    if (t === 'stop' || t === 'yield' || t === 'row') return true;
  }
  return false;
}

function effectiveApproachControl(nd, segId) {
  if (!nd) return null;
  let t = null;
  if (typeof getApproachControl === 'function') t = getApproachControl(nd, segId);
  else if (nd.approachControls) t = nd.approachControls[String(segId)] || null;
  if (t === 'stop' || t === 'yield' || t === 'row') return t;
  // Unmarked approach at a signed junction acts as free R.O.W.
  if (junctionHasSignedControls(nd)) return 'row';
  return null;
}

function controlPriorityRank(type) {
  if (type === 'row') return 0;
  if (type === 'yield') return 1;
  if (type === 'stop') return 2;
  return 1;
}

/** DMV clock: when the car completed its stop (dwell), else null. */
function getStopArrivalT(car) {
  const st = car.stopSignState;
  return (st && st.arrivalT != null) ? st.arrivalT : null;
}

function stopSignPhaseReady(st) {
  if (!st) return false;
  return st.phase === 'look' || st.phase === 'creep' || st.phase === 'cleared'
    || (st.phase === 'dwell' && st.arrivalT != null);
}

function stopSignStillWaiting(st) {
  if (!st) return false;
  return st.phase === 'approach' || st.phase === 'dwell' || st.phase === 'look'
    || (st.phase === 'creep' && true);
}

/** Steady creep target for stop/yield roll-out (avoid stop↔creep pulsing). */
function signedJunctionCreepDesired(clear, hardYield) {
  const creep = ALLIE_CONFIG.JUNCTION_CREEP_SPEED;
  if (hardYield) return 0;
  if (clear) return creep;
  // Soft coast threat — keep rolling, don't slam to a stop
  return creep * 0.55;
}

function triggerStopHighBeamFlash(car) {
  const dur = ALLIE_CONFIG.STOP_HIGH_BEAM_DUR;
  if ((car.highBeamFlashT || 0) < dur * 0.35) car.highBeamFlashT = dur;
}

/** True when `other` sits to the right of `car` (yield-to-the-right). */
function vehicleOnMyRight(car, other) {
  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const ocx = other._cx != null ? other._cx : other.x;
  const ocy = other._cy != null ? other._cy : other.y;
  const dx = ocx - egoX, dy = ocy - egoY;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const fwd = dx * cosH + dy * sinH;
  const lat = -dx * sinH + dy * cosH;
  return lat > ALLIE_CONFIG.CAR_LENGTH * 0.4 && fwd > -ALLIE_CONFIG.CAR_LENGTH * 0.85;
}

/**
 * Yield FOV: only cars inside a forward cone (default 120°) count.
 * Anything beside-behind / behind is ignored for yielding.
 * @param {object} car
 * @param {number} wx world x of target (car center or stage point)
 * @param {number} wy world y
 */
function isInYieldForwardView(car, wx, wy) {
  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const dx = wx - egoX, dy = wy - egoY;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.35) return false;
  const fwd = dx * cosH + dy * sinH;
  // Must be ahead of the bumper plane
  if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.12) return false;
  const lat = -dx * sinH + dy * cosH;
  const half = ((ALLIE_CONFIG.YIELD_VIEW_DEG || 120) * Math.PI / 180) * 0.5;
  const bearing = Math.atan2(lat, fwd);
  return Math.abs(bearing) <= half;
}

function isCarInYieldForwardView(car, other) {
  if (!car || !other) return false;
  const wx = other._cx != null ? other._cx : other.x;
  const wy = other._cy != null ? other._cy : other.y;
  return isInYieldForwardView(car, wx, wy);
}

/**
 * Approach key for grouping conflict peers into the same queue.
 * Same origin stub (or same incoming seg) = same approach line.
 */
function conflictPeerApproachKey(other, nodeKey) {
  if (!other || !nodeKey) return null;
  const oLeg = other.route && other.route[other.legIndex];
  if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === nodeKey) {
    if (oLeg.atom.originStub) return oLeg.atom.originStub;
  }
  const oInfo = findUpcomingSignalTurn(other);
  if (oInfo && oInfo.nodeKey === nodeKey) {
    const atom = oInfo.turnLeg && oInfo.turnLeg.atom;
    if (atom && atom.originStub) return atom.originStub;
    if (oInfo.segId != null) return 'seg:' + oInfo.segId;
  }
  return null;
}

/**
 * Lower score = closer to / further into the junction (front of that approach queue).
 * Cars already on the turn atom rank ahead of anyone still approaching.
 */
function conflictPeerFrontScore(other, nodeKey) {
  if (!other || !nodeKey) return Infinity;
  const oLeg = other.route && other.route[other.legIndex];
  if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === nodeKey) {
    const frac = (other.traveledLength - oLeg.cumStart) / Math.max(oLeg.length, 0.01);
    return -1000 - frac;
  }
  const oInfo = findUpcomingSignalTurn(other);
  if (oInfo && oInfo.nodeKey === nodeKey) return oInfo.dist;
  return Infinity;
}

/** True if other has a turn that conflicts with ego's conflict set at nodeKey. */
function isConflictingPeerAtNode(other, nodeKey, conflicts, myOrigin) {
  if (!other || !nodeKey || !conflicts || conflicts.size === 0) return false;
  const oLeg = other.route && other.route[other.legIndex];
  if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === nodeKey
      && conflicts.has(oLeg.atom.id)) {
    if (myOrigin && oLeg.atom.originStub === myOrigin) return false;
    return true;
  }
  const oInfo = findUpcomingSignalTurn(other);
  if (!oInfo || oInfo.nodeKey !== nodeKey) return false;
  if (!oInfo.turnLeg || !conflicts.has(oInfo.turnLeg.atom.id)) return false;
  if (myOrigin && oInfo.turnLeg.atom.originStub === myOrigin) return false;
  return true;
}

/**
 * Front-of-queue conflict peers only: one car per approach (closest to / into the box).
 * Deeper queued cars are the intervening car's problem — ego must not yield to them.
 * @returns {Set<object>}
 */
function frontConflictPeers(car, nearby, nodeKey, conflicts, myOrigin) {
  const front = new Set();
  if (!car || !nearby || !nodeKey || !conflicts || conflicts.size === 0) return front;
  const best = new Map();
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.state === 'despawning' || other.isProbe || other.state === 'parked') continue;
    if (!isConflictingPeerAtNode(other, nodeKey, conflicts, myOrigin)) continue;
    const key = conflictPeerApproachKey(other, nodeKey);
    if (key == null) continue;
    const score = conflictPeerFrontScore(other, nodeKey);
    const prev = best.get(key);
    if (!prev || score < prev.score) best.set(key, { car: other, score });
  }
  for (const v of best.values()) front.add(v.car);
  return front;
}

function headingsAreOpposing(car, other) {
  let d = other.heading - car.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) > 2.45;
}

/**
 * All-way / equal-rank stop seniority (DMV + courtesy):
 * 1) Clear earlier stopper goes first
 * 2) Near-tie: later stopper flashes high beams and yields (FIFO courtesy)
 * 3) Exact same clock: yield to the right; opposing left yields to straight
 * @returns {{ yield: boolean, flash: boolean }}
 */
function resolveAllWayStopPeer(car, other, myArrival, oArrival, myTurnType, oTurnType) {
  const eps = ALLIE_CONFIG.STOP_ARRIVAL_TIE_EPS;
  const exactEps = 0.05; // true simultaneous — use right / turn rules

  // Clearly earlier / later
  if (oArrival < myArrival - eps) return { yield: true, flash: false };
  if (myArrival < oArrival - eps) return { yield: false, flash: false };

  // Near-tie but not identical: later lets earlier go (high-beam courtesy)
  if (myArrival > oArrival + exactEps) return { yield: true, flash: true };
  if (oArrival > myArrival + exactEps) return { yield: false, flash: false };

  // Effectively simultaneous — DMV: yield to the right, left yields to straight
  const onRight = vehicleOnMyRight(car, other);
  const iAmOnTheirRight = vehicleOnMyRight(other, car);
  if (onRight && !iAmOnTheirRight) return { yield: true, flash: true };
  if (iAmOnTheirRight && !onRight) return { yield: false, flash: false };

  if (headingsAreOpposing(car, other)) {
    const myLeft = myTurnType === 'left' || myTurnType === 'uturn';
    const oLeft = oTurnType === 'left' || oTurnType === 'uturn';
    const myThru = myTurnType === 'straight' || myTurnType === 'right';
    const oThru = oTurnType === 'straight' || oTurnType === 'right';
    if (myLeft && oThru) return { yield: true, flash: true };
    if (oLeft && myThru) return { yield: false, flash: false };
  }

  if (onRight) return { yield: true, flash: true };
  return { yield: false, flash: false };
}

function turnAtomForCarAtNode(car, nodeKey) {
  const leg = car.route && car.route[car.legIndex];
  if (leg && leg.atom.kind === 'turn' && leg.atom.nodeKey === nodeKey) {
    return leg.atom;
  }
  const info = findUpcomingSignalTurn(car);
  if (info && info.nodeKey === nodeKey && info.turnLeg && info.turnLeg.atom) {
    return info.turnLeg.atom;
  }
  return null;
}

/**
 * T / multi-way pairs that can leave together even if the sampled conflict
 * matrix is a bit conservative (paths graze but don't really cross).
 * Examples: both turning right; me right + peer on my right turning left.
 */
function stopMovesAreCompatibleOverride(myTurn, oTurn, car, other) {
  if (!myTurn || !oTurn) return false;
  if (myTurn.originStub && oTurn.originStub === myTurn.originStub) return false;
  const mt = myTurn.turnType;
  const ot = oTurn.turnType;

  // Twin rights from different approaches — diverge / merge without crossing
  if (mt === 'right' && ot === 'right') return true;

  // Right vs left: the left-turner is on the right-turner's right (classic T)
  if (mt === 'right' && ot === 'left' && vehicleOnMyRight(car, other)) return true;
  if (mt === 'left' && ot === 'right' && vehicleOnMyRight(other, car)) return true;

  return false;
}

function stopPeerPathsDoNotConflict(car, other, info, myControl, oControl) {
  if (myControl !== 'stop' || oControl !== 'stop') return false;
  const myTurn = info && info.turnLeg && info.turnLeg.atom;
  if (!myTurn || !myTurn.conflicts) return false;
  const oTurn = turnAtomForCarAtNode(other, info.nodeKey);
  if (!oTurn || oTurn.nodeKey !== info.nodeKey) return false;
  // Same approach is handled as a normal following queue, not stop-sign ROW.
  if (myTurn.originStub && oTurn.originStub === myTurn.originStub) return false;

  // Authoritative: sampled paths never get near each other
  if (!myTurn.conflicts.has(oTurn.id)) return true;

  // Soft T-style overrides (matrix can flag grazing merge paths as conflicts)
  if (!stopMovesAreCompatibleOverride(myTurn, oTurn, car, other)) return false;
  // Still respect a peer already punching through the box at speed
  if (otherIsInIntersection(other, info.nodeKey) && other.speed > 1.2) return false;
  return true;
}

/**
 * Ignore a stopped peer in coast-clear when we outrank them (prevents mutual Yielding deadlock).
 */
function shouldIgnoreStopPeerThreat(car, other, info, myControl, oControl) {
  if (!(myControl === 'stop' || myControl === 'yield')) return false;
  if (!(oControl === 'stop' || oControl === 'yield')) return false;
  // Two stop-sign cars whose planned paths do not cross may leave together.
  if (stopPeerPathsDoNotConflict(car, other, info, myControl, oControl)) return true;
  if (otherIsInIntersection(other, info.nodeKey)) return false;
  // Only ignore while they're still waiting / hesitating — not once they're moving through
  if (other.speed > 1.15) return false;

  const oSt = other.stopSignState;
  if (!oSt || oSt.nodeKey !== info.nodeKey) return false;
  if (oSt.phase === 'cleared' && other.speed > 0.5) return false;
  if (oSt.phase === 'creep' && other.speed > 0.85) return false;

  const myArrival = getStopArrivalT(car);
  const oArrival = getStopArrivalT(other);
  // I haven't finished my stop yet — don't claim priority ignore
  if (myControl === 'stop' && myArrival == null) return false;
  // They haven't stopped; if I'm ready I can ignore them for seniority
  if (oArrival == null) {
    return myArrival != null && stopSignPhaseReady(car.stopSignState);
  }
  if (myArrival == null) return false;

  const myTurn = (info.turnType != null) ? info.turnType
    : (info.turnLeg && info.turnLeg.atom && info.turnLeg.atom.turnType);
  let oTurn = null;
  const oLeg = other.route && other.route[other.legIndex];
  if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey) {
    oTurn = oLeg.atom.turnType;
  } else {
    const oInfo = findUpcomingSignalTurn(other);
    if (oInfo && oInfo.nodeKey === info.nodeKey) oTurn = oInfo.turnType;
  }

  const decision = resolveAllWayStopPeer(car, other, myArrival, oArrival, myTurn, oTurn);
  // We have priority — ignore them while they're still waiting / hesitating
  if (!decision.yield && stopSignStillWaiting(oSt)) return true;
  // Also ignore if they haven't committed into the box yet and we outrank them
  if (!decision.yield && !otherIsInIntersection(other, info.nodeKey) && other.speed < 0.9) {
    return true;
  }
  return false;
}

/** Same seniority ignore for intersection-box clearance holds. */
function shouldIgnoreStopPeerForIx(car, other, info) {
  if (!info || !other) return false;
  const nd = nodes.get(info.nodeKey);
  if (!nd) return false;
  const myControl = effectiveApproachControl(nd, info.segId);
  let oControl = null;
  const oInfo = findUpcomingSignalTurn(other);
  if (oInfo && oInfo.nodeKey === info.nodeKey) {
    oControl = effectiveApproachControl(nd, oInfo.segId);
  }
  if (oControl == null && other.stopSignState && other.stopSignState.nodeKey === info.nodeKey) {
    oControl = other.stopSignState.control || 'stop';
  }
  return shouldIgnoreStopPeerThreat(car, other, info, myControl, oControl);
}

function signedJunctionConstraintFor(car) {
  if (car.isProbe) return null;

  const info = findUpcomingSignalTurn(car);
  if (!info) {
    car.stopSignState = null;
    return null;
  }

  const nd = nodes.get(info.nodeKey);
  if (!nd || !junctionHasSignedControls(nd)) {
    car.stopSignState = null;
    return null;
  }

  const hasActiveSignal = !!(nd.signal && nd.signal.enabled
    && (typeof signalsEnabled === 'undefined' || signalsEnabled));
  if (hasActiveSignal) {
    car.stopSignState = null;
    return null;
  }

  const myControl = effectiveApproachControl(nd, info.segId);
  if (!myControl) {
    car.stopSignState = null;
    return null;
  }

  const turnAtom = info.turnLeg.atom;
  const stopDist = Math.max(0, info.dist - ALLIE_CONFIG.STOP_LINE_GAP);
  const look = ALLIE_CONFIG.STOP_SIGN_LOOKAHEAD;

  if (info.dist > look) {
    car.stopSignState = null;
    car._yieldOther = null;
    return null;
  }

  // Committed into the junction — release control hold
  if (info.dist <= 0.15 || (car.legIndex === info.turnLegIndex &&
      (car.traveledLength - info.turnLeg.cumStart) / Math.max(info.turnLeg.length, 0.01)
        >= ALLIE_CONFIG.JUNCTION_COMMIT_FRAC)) {
    if (car.stopSignState) car.stopSignState.phase = 'cleared';
    car._yieldOther = null;
    return null;
  }

  if (!car.stopSignState || car.stopSignState.turnLegIndex !== info.turnLegIndex) {
    car.stopSignState = {
      turnLegIndex: info.turnLegIndex,
      phase: 'approach',
      timer: 0,
      approachT: simTime,
      arrivalT: null, // stamped when complete stop (dwell) begins — DMV clock
      nodeKey: info.nodeKey,
      control: myControl
    };
  }
  car.stopSignState.control = myControl;
  car._stopPriorityYield = null;
  car._stopCourtesyFlash = false;

  const conflicts = (turnAtom && turnAtom.conflicts) || null;

  function otherApproachControl(other) {
    const oInfo = findUpcomingSignalTurn(other);
    let oSeg = null;
    if (oInfo && oInfo.nodeKey === info.nodeKey) oSeg = oInfo.segId;
    else {
      const oLeg = other.route && other.route[other.legIndex];
      if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey) {
        // Infer approach from origin stub's lane node
        const stub = oLeg.atom.originStub;
        const nd2 = nodes.get(info.nodeKey);
        if (nd2 && nd2.laneNodes && stub) {
          const idPart = stub.split('#')[1];
          const ln = nd2.laneNodes.find(l => String(l.id) === String(idPart));
          if (ln) oSeg = ln.segId;
        }
      } else return null;
    }
    if (oSeg == null) return null;
    return {
      control: effectiveApproachControl(nd, oSeg),
      info: oInfo,
      segId: oSeg
    };
  }

  function peerTurnType(other, oInfoHint) {
    const oLeg = other.route && other.route[other.legIndex];
    if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey) {
      return oLeg.atom.turnType;
    }
    const oInfo = oInfoHint || findUpcomingSignalTurn(other);
    if (oInfo && oInfo.nodeKey === info.nodeKey) return oInfo.turnType;
    return null;
  }

  /** @returns {{ other: object, flash: boolean } | null} */
  function conflictingThreat() {
    if (!conflicts || conflicts.size === 0) return null;
    let yieldTo = null;
    let yieldFlash = false;
    let yieldArrival = Infinity;
    const egoX = car._cx != null ? car._cx : car.x;
    const egoY = car._cy != null ? car._cy : car.y;
    const nearby = collectNearbyCars(egoX, egoY, look * 2 + 30);
    // Only the front car on each conflicting approach — ignore queue depth 2+
    const frontPeers = frontConflictPeers(car, nearby, info.nodeKey, conflicts, turnAtom.originStub);
    const myRank = controlPriorityRank(myControl);
    const myArrival = getStopArrivalT(car);
    const myTurnType = info.turnType;

    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other === car || other.state === 'despawning' || other.isProbe) continue;
      // Never yield for cars outside the forward yield FOV (incl. behind)
      if (!isCarInYieldForwardView(car, other)) continue;
      // Skip cars queued behind another conflict peer on the same approach
      if (frontPeers.size > 0 && !frontPeers.has(other)
          && isConflictingPeerAtNode(other, info.nodeKey, conflicts, turnAtom.originStub)) {
        continue;
      }

      const oLeg = other.route && other.route[other.legIndex];
      let conflictsWith = false;
      let committed = false;
      let oInfo = null;
      let oArrival = null;

      if (oLeg && oLeg.atom.kind === 'turn' && oLeg.atom.nodeKey === info.nodeKey
          && conflicts.has(oLeg.atom.id)) {
        const oFrac = (other.traveledLength - oLeg.cumStart) / Math.max(oLeg.length, 0.01);
        if (oFrac >= ALLIE_CONFIG.JUNCTION_COMMIT_FRAC * 0.2) committed = true;
        if (oFrac < 0.92) conflictsWith = true;
        oArrival = getStopArrivalT(other);
      } else {
        oInfo = findUpcomingSignalTurn(other);
        if (!oInfo || oInfo.nodeKey !== info.nodeKey) continue;
        if (!conflicts.has(oInfo.turnLeg.atom.id)) continue;
        if (oInfo.dist > look + 8) continue;
        if (oInfo.turnLeg.atom.originStub === turnAtom.originStub) continue;
        conflictsWith = true;
        oArrival = getStopArrivalT(other);
        if (oArrival == null) {
          // Not yet at their stop line — estimate so ROW/yield still works
          const oStop = Math.max(0, oInfo.dist - ALLIE_CONFIG.STOP_LINE_GAP);
          const base = myArrival != null ? myArrival : simTime;
          oArrival = base + (oStop - stopDist) * 0.025;
        }
        if (oInfo.dist <= 0.2) committed = true;
      }
      if (!conflictsWith) continue;

      const oMeta = otherApproachControl(other);
      const oControl = oMeta ? oMeta.control : 'row';
      const oRank = controlPriorityRank(oControl);

      // Compatible paths (non-crossing / twin rights / right-vs-left T) — both may go
      if (stopPeerPathsDoNotConflict(car, other, info, myControl, oControl)) continue;

      // Always yield to someone already committed through the box
      if (committed) {
        yieldTo = other;
        yieldFlash = false;
        break;
      }

      // Higher priority (lower rank) wins
      if (oRank < myRank) {
        if (!yieldTo || (oArrival != null && oArrival < yieldArrival)) {
          yieldTo = other;
          yieldArrival = oArrival != null ? oArrival : yieldArrival;
          yieldFlash = false;
        }
        continue;
      }
      if (oRank > myRank) continue;

      // Same rank: DMV all-way / mutual yield seniority
      if (myControl === 'stop' && oControl === 'stop') {
        const oReady = stopSignPhaseReady(other.stopSignState);
        const iReady = stopSignPhaseReady(car.stopSignState)
          || (car.stopSignState && car.stopSignState.phase === 'dwell');

        if (!oReady && iReady) continue; // they haven't finished stop — I don't wait on seniority
        if (oReady && !iReady) {
          // They stopped; I haven't — yield
          if (!yieldTo) { yieldTo = other; yieldFlash = false; }
          continue;
        }
        if (!(iReady && oReady)) continue;

        const oa = getStopArrivalT(other);
        const ma = myArrival;
        if (oa == null || ma == null) continue;
        const oTurn = peerTurnType(other, oInfo || (oMeta && oMeta.info));
        const decision = resolveAllWayStopPeer(car, other, ma, oa, myTurnType, oTurn);
        if (decision.yield) {
          if (!yieldTo || oa < yieldArrival) {
            yieldTo = other;
            yieldArrival = oa;
            yieldFlash = decision.flash;
          } else if (decision.flash) {
            yieldFlash = true;
          }
        }
        continue;
      }

      // Same-rank yield / mixed: FIFO with yield-to-right near-tie (no id bias)
      const ma = myArrival != null ? myArrival
        : (car.stopSignState && car.stopSignState.approachT != null
          ? car.stopSignState.approachT : simTime);
      let oa = oArrival;
      if (oa == null) {
        oa = (other.stopSignState && other.stopSignState.approachT != null)
          ? other.stopSignState.approachT : ma + 1;
      }
      const oTurn = peerTurnType(other, oInfo || (oMeta && oMeta.info));
      const decision = resolveAllWayStopPeer(car, other, ma, oa, myTurnType, oTurn);
      if (decision.yield) {
        if (!yieldTo || oa < yieldArrival) {
          yieldTo = other;
          yieldArrival = oa;
          yieldFlash = decision.flash;
        }
      }
    }
    if (!yieldTo) return null;
    return { other: yieldTo, flash: yieldFlash };
  }

  // ---- R.O.W.: only hold for committed cross traffic / earlier same-rank ----
  if (myControl === 'row') {
    const threatInfo = conflictingThreat();
    const threat = threatInfo ? threatInfo.other : null;
    car._yieldOther = threat || null;
    car._stopPriorityYield = threat || null;
    if (!threat) return null;
    // Soft yield — don't full-stop unless they're in/near the box
    const c = stopConstraint(car, stopDist);
    if (!c) {
      return {
        desired: ALLIE_CONFIG.CRUISE_SPEED * 0.55,
        decelRate: ALLIE_CONFIG.DECEL_NORMAL,
        status: 'Yielding'
      };
    }
    return { desired: c.desired, decelRate: c.decelRate, status: 'Yielding' };
  }

  // ---- STOP: full stop + dwell, then look both ways, creep, go ----
  if (myControl === 'stop') {
    const st = car.stopSignState;
    const arriveSlop = Math.max(0.9, (ALLIE_CONFIG.STOP_BRAKE_PAD || 0) + 0.35);

    if (st.phase === 'approach' || st.phase === 'dwell') {
      const nearLine = stopDist <= arriveSlop;
      const stoppedEnough = car.speed <= 0.55;

      // Finished the stop → dwell (even if still a bit short of the stub due to pad)
      if (nearLine && stoppedEnough) {
        if (st.phase !== 'dwell') {
          st.phase = 'dwell';
          st.dwellStart = simTime;
          st.arrivalT = simTime;
        }
        if (simTime - (st.dwellStart || simTime) < ALLIE_CONFIG.STOP_SIGN_DWELL) {
          car._yieldOther = null;
          car._stopPriorityYield = null;
          return { desired: 0, decelRate: ALLIE_CONFIG.SIGNAL_DECEL, status: 'Stop sign' };
        }
        st.phase = 'look';
        car._juncClearT = 0;
      } else {
        st.phase = 'approach';
        // In the arrive zone while still rolling — finish the stop, no creep past
        if (nearLine) {
          return {
            desired: 0,
            decelRate: ALLIE_CONFIG.DECEL_SHARP,
            status: 'Stop sign'
          };
        }
        // Human-like approach: keep a brisk pace until the bite zone, then
        // firm brake. Using the long kinematic cruise curve felt like a weird crawl.
        const bite = ALLIE_CONFIG.STOP_APPROACH_BITE != null
          ? ALLIE_CONFIG.STOP_APPROACH_BITE : 15;
        if (stopDist > bite) {
          return {
            desired: ALLIE_CONFIG.CRUISE_SPEED * (ALLIE_CONFIG.STOP_APPROACH_EASE != null
              ? ALLIE_CONFIG.STOP_APPROACH_EASE : 0.9),
            decelRate: ALLIE_CONFIG.DECEL_NORMAL,
            status: 'Stop sign'
          };
        }
        const rate = ALLIE_CONFIG.DECEL_SHARP;
        const pad = ALLIE_CONFIG.STOP_BRAKE_PAD != null ? ALLIE_CONFIG.STOP_BRAKE_PAD : 0;
        const dAvail = Math.max(0, stopDist - pad);
        let desired = Math.sqrt(Math.max(0, 2 * rate * dAvail));
        // Anti-hunt: don't accelerate back up while already in the bite
        if (car.speed > 0.85) desired = Math.min(desired, car.speed);
        return {
          desired,
          decelRate: rate,
          status: 'Stop sign'
        };
      }
    }

    if (st.phase === 'look' || st.phase === 'creep') {
      const threatInfo = conflictingThreat();
      const priorityOther = threatInfo ? threatInfo.other : null;
      if (threatInfo && threatInfo.flash) {
        triggerStopHighBeamFlash(car);
        car._stopCourtesyFlash = true;
      }
      car._stopPriorityYield = priorityOther;
      car._juncClearFrame = -1;
      let coastClear = !priorityOther && junctionCoastClear(car, info);
      if (!coastClear && !priorityOther && car._juncThreat
          && shouldIgnoreStopPeerForIx(car, car._juncThreat, info)) {
        coastClear = true;
        car._juncThreat = null;
      }
      const clear = coastClear && !priorityOther;
      car._yieldOther = priorityOther || (clear ? null : (car._juncThreat || null));

      const courtesy = !!(car.highBeamFlashT > 0 && (priorityOther || car._stopCourtesyFlash));
      const hardYield = !!priorityOther;
      // After a full stop: only hard seniority zeros us. Soft coast → slow creep,
      // never 0↔creep hunting from stopConstraint.
      const creepTarget = hardYield
        ? 0
        : (clear ? ALLIE_CONFIG.JUNCTION_CREEP_SPEED : ALLIE_CONFIG.JUNCTION_CREEP_SPEED * 0.55);
      const waitStatus = courtesy ? 'After you' : 'Yielding';
      const lookStatus = clear ? 'Looking both ways' : waitStatus;

      if (st.phase === 'look') {
        return {
          desired: creepTarget,
          decelRate: hardYield ? ALLIE_CONFIG.SIGNAL_DECEL : ALLIE_CONFIG.DECEL_NORMAL,
          status: lookStatus
        };
      }

      return {
        desired: creepTarget,
        decelRate: hardYield ? ALLIE_CONFIG.SIGNAL_DECEL : ALLIE_CONFIG.DECEL_NORMAL,
        status: clear ? 'Creeping out' : waitStatus
      };
    }

    car._yieldOther = null;
    car._stopPriorityYield = null;
    return null;
  }

  // ---- YIELD: slow to line, look both ways, creep when clear (no mandatory full stop) ----
  {
    const st = car.stopSignState;
    // Pull up to the line first
    if (st.phase === 'approach' || !st.phase) {
      if (stopDist > 1.1) {
        st.phase = 'approach';
        // Approach cautiously — don't freeze for distant through traffic yet
        const clearFar = junctionCoastClear(car, info);
        const cap = clearFar
          ? ALLIE_CONFIG.CRUISE_SPEED * 0.62
          : Math.min(ALLIE_CONFIG.CRUISE_SPEED * 0.4, Math.sqrt(Math.max(0, 2 * ALLIE_CONFIG.DECEL_NORMAL * Math.max(stopDist, 0.5))));
        car._yieldOther = clearFar ? null : (car._juncThreat || null);
        return {
          desired: cap,
          decelRate: ALLIE_CONFIG.DECEL_NORMAL,
          status: clearFar ? 'Yield sign' : 'Yielding'
        };
      }
      // Treat arriving at the yield line as seniority stamp for equal-rank ties
      if (st.arrivalT == null) st.arrivalT = simTime;
      st.phase = 'look';
      car._juncClearT = 0;
    }

    if (st.phase === 'look' || st.phase === 'creep') {
      const threatInfo = conflictingThreat();
      const priorityOther = threatInfo ? threatInfo.other : null;
      if (threatInfo && threatInfo.flash) triggerStopHighBeamFlash(car);
      car._stopPriorityYield = priorityOther;
      car._juncClearFrame = -1;
      let coastClear = !priorityOther && junctionCoastClear(car, info);
      if (!coastClear && !priorityOther && car._juncThreat
          && shouldIgnoreStopPeerForIx(car, car._juncThreat, info)) {
        coastClear = true;
        car._juncThreat = null;
      }
      const clear = coastClear && !priorityOther;
      car._yieldOther = priorityOther || (clear ? null : (car._juncThreat || null));

      const hardYield = !!priorityOther;
      const creepTarget = signedJunctionCreepDesired(clear, hardYield);

      if (st.phase === 'look') {
        if (stopDist > 0.4 && !clear) {
          const c = stopConstraint(car, stopDist);
          if (c) {
            return {
              desired: Math.min(Math.max(c.desired, creepTarget), ALLIE_CONFIG.JUNCTION_CREEP_SPEED),
              decelRate: ALLIE_CONFIG.DECEL_NORMAL,
              status: clear ? 'Looking both ways' : 'Yielding'
            };
          }
        }
        return {
          desired: creepTarget,
          decelRate: ALLIE_CONFIG.DECEL_NORMAL,
          status: clear ? 'Looking both ways' : 'Yielding'
        };
      }

      return {
        desired: creepTarget,
        decelRate: hardYield ? ALLIE_CONFIG.SIGNAL_DECEL : ALLIE_CONFIG.DECEL_NORMAL,
        status: clear ? 'Creeping out' : 'Yielding'
      };
    }

    car._yieldOther = null;
    car._stopPriorityYield = null;
    return null;
  }
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
  // Signed stop/yield/R.O.W. controls replace first-arrival rules
  if (junctionHasSignedControls(nd)) return null;

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
  // Only yield to the front conflict peer on each approach (not queue depth 2+)
  const frontPeers = frontConflictPeers(car, nearby, info.nodeKey, turnAtom.conflicts, turnAtom.originStub);
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.state === 'despawning' || other.isProbe) continue;
    if (!isCarInYieldForwardView(car, other)) continue;
    if (frontPeers.size > 0 && !frontPeers.has(other)
        && isConflictingPeerAtNode(other, info.nodeKey, turnAtom.conflicts, turnAtom.originStub)) {
      continue;
    }

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
  const wantTrace = !!(car.selected || car === hoveredCar || carWhyPanelOpen && followedCar === car);
  const trace = wantTrace ? [] : null;
  function note(name, c) {
    if (!trace || !c) return;
    trace.push({
      name,
      desired: c.desired,
      status: c.status || null,
      decel: c.decelRate != null ? c.decelRate : null
    });
  }

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
  if (laneApproach && laneApproach.boost) note('Lane approach boost', laneApproach);

  const curLeg = route[car.legIndex];
  if (curLeg && curLeg.atom.kind === 'turn' && curLeg.atom.targetSpeed < desired) {
    desired = curLeg.atom.targetSpeed;
    decelRate = curLeg.atom.sharp ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL;
    if (trace) note('Turn (current)', { desired, decelRate, status: 'Turn speed' });
  }
  if (curLeg && curLeg.atom.kind === 'lanechange' && car._emergencyLaneChange) {
    // Sharp escape blend: creep through it slowly rather than near-cruise —
    // this is a tight, deliberate turn-out, not a smooth courteous merge.
    desired = Math.min(desired, ALLIE_CONFIG.EMERGENCY_LANE_CHANGE_SPEED);
    decelRate = ALLIE_CONFIG.DECEL_NORMAL;
    signalStatus = 'Forcing jam escape';
    note('Jam escape', { desired, decelRate, status: signalStatus });
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
        if (trace) note('Upcoming turn', { desired, decelRate, status: 'Turn ahead' });
      }
    }
  }

  const remaining = Math.max(0, car.totalLength - car.traveledLength);
  const arrivalBrakingDist = Math.max(ALLIE_CONFIG.ARRIVAL_MIN_DIST, (car.speed * car.speed) / (2 * ALLIE_CONFIG.ARRIVAL_DECEL));
  if (remaining <= arrivalBrakingDist) {
    const arrivalTarget = remaining <= 0.5 ? 0 : ALLIE_CONFIG.CRUISE_SPEED * (remaining / arrivalBrakingDist);
    if (arrivalTarget < desired) {
      desired = Math.max(0, arrivalTarget);
      decelRate = ALLIE_CONFIG.ARRIVAL_DECEL;
      if (trace) note('Arrival', { desired, decelRate, status: 'Arriving' });
    }
  }

  const sigLight = signalConstraintFor(car);
  note('Traffic light', sigLight);
  const sigSigned = (!sigLight) ? signedJunctionConstraintFor(car) : null;
  note('Stop / yield sign', sigSigned);
  const sigUnsig = (!sigLight && !sigSigned) ? unsignalizedJunctionConstraintFor(car) : null;
  note('Unsignalized yield', sigUnsig);
  const sig = sigLight || sigSigned || sigUnsig;
  if (sig && sig.desired < desired) {
    desired = sig.desired;
    decelRate = sig.decelRate;
    signalStatus = sig.status;
  }

  // Don't enter a junction whose path is occupied (green light does not mean "go
  // into a blocked box"). Off-path cars in the box only earn caution.
  const ixClear = intersectionClearanceConstraintFor(car);
  note('Intersection clear', ixClear);
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
  note('Traffic / lead', traffic);
  if (traffic && traffic.desired < desired) {
    desired = traffic.desired;
    decelRate = Math.max(decelRate, traffic.decelRate);
    if (!signalStatus) signalStatus = traffic.status;
  } else if (!signalStatus && car._trafficStatus) {
    signalStatus = car._trafficStatus;
  }

  // Hold behind a car that is staging / reversing into a parking stall
  const parkYield = parkingYieldConstraintFor(car);
  note('Parking yield', parkYield);
  if (parkYield && parkYield.desired < desired) {
    desired = parkYield.desired;
    decelRate = Math.max(decelRate, parkYield.decelRate);
    signalStatus = parkYield.status;
  }

  // Staging approach — brake toward the stage point beside the stall
  const parkApproach = parkingApproachConstraintFor(car);
  note('Parking approach', parkApproach);
  if (parkApproach && parkApproach.desired < desired) {
    desired = parkApproach.desired;
    decelRate = Math.max(decelRate, parkApproach.decelRate);
    signalStatus = parkApproach.status;
  }

  // Hold back on approach to a lane-change window if the target lane isn't
  // clear yet — never shove into traffic to force a merge.
  if (laneApproach && !laneApproach.boost) note('Lane change hold', laneApproach);
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
    note('Merge courtesy', courtesy);
    if (courtesy && courtesy.desired < desired) {
      desired = courtesy.desired;
      decelRate = Math.max(decelRate, courtesy.decelRate);
      if (!signalStatus) signalStatus = courtesy.status;
    }
  } else if (car._cachedCourtesy && car._cachedCourtesy.desired < desired) {
    note('Merge courtesy', car._cachedCourtesy);
    desired = car._cachedCourtesy.desired;
    decelRate = Math.max(decelRate, car._cachedCourtesy.decelRate);
    if (!signalStatus) signalStatus = car._cachedCourtesy.status;
  }

  // Scootch forward for a merger squeezing in *behind* when we have spare gap
  // ahead — opposite of ease-off courtesy (raises desired a little).
  if (((car.id + tickFrame) & 1) === 1) {
    const scootch = mergeScootchConstraintFor(car);
    car._cachedScootch = scootch;
    if (scootch) note('Merge scootch', scootch);
    if (scootch && scootch.boost && scootch.desired > desired) {
      desired = scootch.desired;
      if (!signalStatus || signalStatus === 'Following' || signalStatus === 'Caution'
          || signalStatus === 'Letting merge') {
        signalStatus = scootch.status;
      }
    }
  } else if (car._cachedScootch && car._cachedScootch.boost && car._cachedScootch.desired > desired) {
    note('Merge scootch', car._cachedScootch);
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
      if (trace) note('Side caution', { desired: sideCap, decelRate: ALLIE_CONFIG.DECEL_NORMAL, status: 'Caution' });
    }
  }

  // Forward driver-head cone — looks further (±30°) with nested caution rings
  const head = headAwarenessConstraintFor(car);
  note('Driver head', head);
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
  if (player.status) {
    signalStatus = player.status;
    if (trace) note('Player control', { desired, decelRate, status: player.status });
  }

  // Aimless soft-freeze: brief player-style gas tap
  const nudge = applyStuckGasNudge(car, desired, decelRate);
  desired = nudge.desired;
  decelRate = nudge.decelRate;
  if (nudge.status) {
    signalStatus = nudge.status;
    if (trace) note('Stuck nudge', { desired, decelRate, status: nudge.status });
  }

  car._signalStatus = signalStatus;
  if (trace) {
    const bindingFloor = desired + 0.05;
    for (let i = 0; i < trace.length; i++) {
      trace[i].binding = trace[i].desired <= bindingFloor;
    }
    // Sort binding first, then by desired ascending
    trace.sort((a, b) => {
      if (a.binding !== b.binding) return a.binding ? -1 : 1;
      return a.desired - b.desired;
    });
    car._constraintTrace = trace;
    car._constraintFinalDesired = desired;
  } else {
    car._constraintTrace = null;
  }

  return { desired, decelRate };
}

/**
 * Slim desired-speed for skip-draw batch FF.
 * Keeps signals / stop-yield / same-lane traffic / turns / parking approach.
 * Drops soft awareness, intersection box clearance, courtesy/scootch, head cone.
 */
function computeDesiredSpeedBatch(car) {
  const route = car.route;

  if (car._emergencyLaneChange && car._emergencyLaneChangeStarted) {
    const legNow = route[car.legIndex];
    if (!legNow || legNow.atom.kind !== 'lanechange') {
      car._emergencyLaneChange = false;
      car._emergencyLaneChangeStarted = false;
      car._postMergeEaseT = ALLIE_CONFIG.EMERGENCY_POST_MERGE_EASE_TIME;
    }
  }

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
    desired = Math.min(desired, ALLIE_CONFIG.EMERGENCY_LANE_CHANGE_SPEED);
    decelRate = ALLIE_CONFIG.DECEL_NORMAL;
    signalStatus = 'Forcing jam escape';
  } else if (curLeg && curLeg.atom.kind === 'lanechange' && desired > ALLIE_CONFIG.CRUISE_SPEED * 0.94) {
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

  const sig = signalConstraintFor(car) || signedJunctionConstraintFor(car) || unsignalizedJunctionConstraintFor(car);
  if (sig && sig.desired < desired) {
    desired = sig.desired;
    decelRate = sig.decelRate;
    signalStatus = sig.status;
  }

  if (!signalStatus && car.rorPhase && car.rorPhase !== 'cleared') {
    signalStatus = 'Right on red';
  }

  const traffic = trafficConstraintFor(car);
  if (traffic && traffic.desired < desired) {
    desired = traffic.desired;
    decelRate = Math.max(decelRate, traffic.decelRate);
    if (!signalStatus) signalStatus = traffic.status;
  } else if (!signalStatus && car._trafficStatus) {
    signalStatus = car._trafficStatus;
  }

  // Same as full path: every car must hold behind an active parker, not only
  // cars that themselves have a parkingIntent.
  const parkYield = parkingYieldConstraintFor(car);
  if (parkYield && parkYield.desired < desired) {
    desired = parkYield.desired;
    decelRate = Math.max(decelRate, parkYield.decelRate);
    signalStatus = parkYield.status;
  }
  const parkApproach = parkingApproachConstraintFor(car);
  if (parkApproach && parkApproach.desired < desired) {
    desired = parkApproach.desired;
    decelRate = Math.max(decelRate, parkApproach.decelRate);
    signalStatus = parkApproach.status;
  }

  if (laneApproach && !laneApproach.boost && laneApproach.desired < desired) {
    desired = laneApproach.desired;
    decelRate = Math.max(decelRate, laneApproach.decelRate);
    signalStatus = laneApproach.status;
  }

  const head = headAwarenessConstraintFor(car);
  if (head && head.desired < desired) {
    desired = head.desired;
    decelRate = Math.max(decelRate, head.decelRate);
    if (!signalStatus || signalStatus === 'Caution') signalStatus = head.status;
  }

  if (curLeg && curLeg.atom.kind === 'lanechange') {
    signalStatus = 'Changing lanes';
  }

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

/** Nearest surviving stall pad to a world point, or null. */
function findParkingStallNear(wx, wy, maxDist) {
  if (!parkingBaysAvailable() || !parkingBays.length) return null;
  const lim = maxDist != null ? maxDist : 4.5;
  let best = null;
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    if (!bay || bay.count < 1) continue;
    const rad = Math.max(bay.spotLength, bay.spotDepth) * 0.55;
    for (let s = 0; s < bay.count; s++) {
      const sc = stallCenterWorld(bay, s);
      const d = Math.hypot(sc.x - wx, sc.y - wy);
      if (d > lim && d > rad) continue;
      if (typeof parkingBayCorners === 'function') {
        const corners = parkingBayCorners(bay, s);
        if (corners && typeof pointInQuad === 'function'
            && !pointInQuad({ x: wx, y: wy }, corners) && d > lim) {
          continue;
        }
      }
      if (!best || d < best.dist) best = { bay, stallIndex: s, dist: d };
    }
  }
  return best;
}

/**
 * After parking bays/stalls are deleted or rebuilt: remove cars whose pad is
 * gone, rebind survivors onto the new bay objects, and send staging cars back
 * to roam.
 */
function syncCarsAfterParkingGeometryChange() {
  if (typeof cars === 'undefined' || !cars || !cars.length) return 0;
  let removed = 0;
  const doomed = [];

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (!car || car.isProbe || car.state === 'despawning') continue;

    const plan = car._parkPlan;
    const involved = car.state === 'parked' || car.state === 'parking'
      || car.parkPhase === 'staging'
      || (plan && plan.bay != null);
    if (!involved) continue;

    let still = null;
    if (plan && plan.bay && parkingBaysAvailable()
        && parkingBays.indexOf(plan.bay) >= 0
        && plan.stallIndex >= 0
        && plan.stallIndex < plan.bay.count) {
      still = { bay: plan.bay, stallIndex: plan.stallIndex };
    } else {
      let tx = car.x, ty = car.y;
      if (plan && plan.bay != null && plan.stallIndex != null) {
        const sc = stallCenterWorld(plan.bay, plan.stallIndex);
        if (sc) { tx = sc.x; ty = sc.y; }
      }
      const tol = plan && plan.bay
        ? Math.max(plan.bay.spotLength, plan.bay.spotDepth) * 0.65
        : 5;
      still = findParkingStallNear(tx, ty, tol);
    }

    if (still) {
      if (!plan) car._parkPlan = { bay: still.bay, stallIndex: still.stallIndex };
      else {
        car._parkPlan.bay = still.bay;
        car._parkPlan.stallIndex = still.stallIndex;
      }
      if (car.state === 'parked') occupyStall(still.bay, still.stallIndex, car);
      else reserveStall(still.bay, still.stallIndex, car);
      continue;
    }

    // Stall gone
    if (car.state === 'parked' || car.state === 'parking') {
      doomed.push(car);
    } else {
      // Staging / reserved — drop claim and keep looking
      if (typeof resumeParkingRoam === 'function') resumeParkingRoam(car);
      else if (typeof clearParkingIntent === 'function') clearParkingIntent(car);
    }
  }

  for (let i = 0; i < doomed.length; i++) {
    const car = doomed[i];
    // Parked/parking refuse beginOuttaHere — fade them out directly
    car._parkPlan = null;
    car.parkingIntent = null;
    car.parkPhase = null;
    noteParkerInactive(car);
    beginDespawn(car);
    removed++;
  }
  return removed;
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
  car._parkBlockSegId = null;
  car._parkBlockLaneIdx = null;
}

/** Drop current stall claim and keep hunting elsewhere (or leave if none free). */
function resumeParkingRoam(car) {
  if (!car) return false;
  clearParkingIntent(car);
  car.state = 'driving';
  if (!anyFreeParkingStallExists()) {
    beginOuttaHere(car);
    return false;
  }
  car.parkingIntent = { segId: null, roaming: true };
  car.parkPhase = null;
  car._parkSearchT = 0;
  car._stagingT = 0;
  car._parkRoamAttempts = 0;
  car._parkDebug = { phase: 'roaming', spot: 'looking again' };
  return true;
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
  car._parkRoamRejected = null;
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

/**
 * Live OBB probe while reversing into a stall.
 * Same winner/loser rule as wouldCollideAt — only blocks the parker when it
 * would be the hard-safety LOSER of the overlap, so a stuck pair still has
 * exactly one car declared free to creep clear instead of both freezing forever.
 * Parked cars are not in the spatial hash — skip them here (neighbor stalls were
 * already checked when the plan was built).
 */
function parkReverseBlockedBy(car, x, y, heading) {
  const probe = { x, y, heading, id: car.id };
  refreshCarPoseCache(probe);
  const a = carOBB(probe);
  const margin = ALLIE_CONFIG.HARD_SAFETY_MARGIN + 0.1;
  const reach = ALLIE_CONFIG.CAR_LENGTH + ALLIE_CONFIG.CAR_WIDTH + margin * 2 + 2;
  const nearby = collectNearbyCars(probe._cx, probe._cy, reach);
  let worst = null;
  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe || other.state === 'despawning') continue;
    if (other.state === 'parked') continue;
    if (!obbOverlap(a, carOBB(other), margin)) continue;
    const probeCar = { id: car.id, x, y, heading, _cx: probe._cx, _cy: probe._cy, _cosH: probe._cosH, _sinH: probe._sinH };
    if (hardSafetyLoser(probeCar, other) !== probeCar) continue; // we win — keep reversing
    if (!worst) worst = other;
  }
  return worst;
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
  // Prefer a slightly smaller lateral for a snugger curb approach when geometry allows
  D = clampNum(D * 0.92, 1.35, 10);

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
    // Larger sweep → smaller R → tighter S-curve into the stall
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

  const lookStalls = PARKING_CONFIG.LOOKAHEAD_STALLS != null
    ? PARKING_CONFIG.LOOKAHEAD_STALLS : 7;
  const minAhead = ALLIE_CONFIG.CAR_LENGTH * 2.0;

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
      const claimMax = (claimedBay.spotLength || ALLIE_CONFIG.CAR_LENGTH * 1.2) * (lookStalls + 1);
      // Soft runway: claimed stalls only need to be roughly ahead in the look window
      if (ahead > -ALLIE_CONFIG.CAR_LENGTH * 0.5 && ahead < claimMax) {
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
    const maxAhead = (bay.spotLength || ALLIE_CONFIG.CAR_LENGTH * 1.2) * lookStalls;
    for (let i = 0; i < bay.count; i++) {
      if (!stallIsFree(bay, i, car)) continue;
      const sc = stallCenterWorld(bay, i);
      const along = typeof projectAlongSeg === 'function'
        ? projectAlongSeg(seg, sc.x, sc.y)
        : 0;
      // Ahead in travel direction
      const ahead = (along - carAlong) * (bayDot >= 0 ? 1 : -1);
      // Need enough runway to reach the stage point before the stall
      if (ahead < minAhead) continue;
      if (ahead > maxAhead) continue;
      if (!best || ahead < best.ahead) {
        best = { bay, stallIndex: i, ahead, approachUx, approachUy, laneX: sample.x, laneY: sample.y };
      }
    }
  }
  return best;
}

/**
 * Cruise-and-scan: next free curb stall ahead of the car on the current road,
 * within LOOKAHEAD_STALLS. Prefers the curb matching the travel lane (right or
 * left), then the other same-direction curb. Never returns a stall behind.
 */
function findLocalParkingAhead(car) {
  if (!car || !car.route || !parkingBaysAvailable()) return null;
  const curLeg = car.route[car.legIndex];
  if (!curLeg || curLeg.atom.kind !== 'lane') return null;
  const segId = curLeg.atom.segId;
  const seg = findSegmentById(segId);
  if (!seg) return null;

  const sample = curLeg.atom.sampleAtT(currentLegFrac(car));
  if (!sample) return null;
  const approachUx = sample.tx, approachUy = sample.ty;
  const side = laneOffsetSignForAtom(curLeg.atom);
  const carAlong = typeof projectAlongSeg === 'function'
    ? projectAlongSeg(seg, car.x, car.y) : 0;

  const bayList = ensureParkingBayIndex().get(segId);
  if (!bayList || !bayList.length) return null;

  const lookStalls = PARKING_CONFIG.LOOKAHEAD_STALLS != null
    ? PARKING_CONFIG.LOOKAHEAD_STALLS : 7;
  const minAhead = ALLIE_CONFIG.CAR_LENGTH * 2.0;

  let bestSame = null;
  let bestOther = null;
  for (let b = 0; b < bayList.length; b++) {
    const bay = bayList[b];
    // Only same travel direction along this curb (skip opposite-way pads)
    const bayDot = bay.ux * approachUx + bay.uy * approachUy;
    if (bayDot < 0.25) continue;
    const maxAhead = (bay.spotLength || ALLIE_CONFIG.CAR_LENGTH * 1.2) * lookStalls;
    for (let i = 0; i < bay.count; i++) {
      if (!stallIsFree(bay, i, car)) continue;
      const sc = stallCenterWorld(bay, i);
      const along = typeof projectAlongSeg === 'function'
        ? projectAlongSeg(seg, sc.x, sc.y) : 0;
      const ahead = along - carAlong;
      if (ahead < minAhead || ahead > maxAhead) continue;
      const cand = {
        bay, stallIndex: i, ahead,
        approachUx, approachUy,
        laneX: sample.x, laneY: sample.y
      };
      const sideMatch = (side === 0 || bay.side === side);
      if (sideMatch) {
        if (!bestSame || ahead < bestSame.ahead) bestSame = cand;
      } else if (!bestOther || ahead < bestOther.ahead) {
        bestOther = cand;
      }
    }
  }
  // Prefer the curb beside this lane; fall back to the other same-way curb
  return bestSame || bestOther;
}

/**
 * Fallback when the current curb is empty: nearest free stall still roughly
 * ahead of the nose (no behind-the-car / lap-around picks).
 */
function findForwardParkingStall(car, rejected) {
  if (!car || !parkingBaysAvailable()) return null;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const lookStalls = PARKING_CONFIG.LOOKAHEAD_STALLS != null
    ? PARKING_CONFIG.LOOKAHEAD_STALLS : 7;
  // Allow a bit further than one curb window when hopping to the next block
  const maxFwd = ALLIE_CONFIG.CAR_LENGTH * 1.2 * lookStalls * 2.5;

  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (!bay || bay.count < 1) continue;
    for (let s = 0; s < bay.count; s++) {
      if (rejected && rejected.has(bay.id + ':' + s)) continue;
      if (!stallIsFree(bay, s, car)) continue;
      const sc = stallCenterWorld(bay, s);
      const dx = sc.x - egoX, dy = sc.y - egoY;
      const fwd = dx * cosH + dy * sinH;
      if (fwd < ALLIE_CONFIG.CAR_LENGTH * 1.5) continue; // behind / beside
      if (fwd > maxFwd) continue;
      const lat = Math.abs(-dx * sinH + dy * cosH);
      // Prefer forward + not way across town sideways
      const score = fwd + lat * 1.4;
      if (score < bestScore) {
        bestScore = score;
        best = { bay, stallIndex: s, ahead: fwd };
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

function stampParkerBlockedLane(car) {
  if (!car) return;
  const pos = car._segPos || (typeof carFullSegPos === 'function' ? carFullSegPos(car) : null);
  if (pos) {
    car._parkBlockSegId = pos.segId;
    car._parkBlockLaneIdx = pos.laneIdx;
    return;
  }
  if (car.parkingIntent && car.parkingIntent.segId != null) {
    car._parkBlockSegId = car.parkingIntent.segId;
  }
}

/** True only when a staging/reversing parker is blocking ego's travel lane. */
function parkerBlocksEgoLane(ego, other) {
  if (!ego || !other) return false;
  const myPos = ego._segPos;
  if (!myPos) return false;

  // Preferred: lane stamped when parking began (survives reverse when _segPos is cleared)
  if (other._parkBlockSegId != null && other._parkBlockLaneIdx != null) {
    return other._parkBlockSegId === myPos.segId
      && other._parkBlockLaneIdx === myPos.laneIdx;
  }

  // Staging cars still have occupancy
  const oPos = other._segPos;
  if (oPos) {
    return oPos.segId === myPos.segId && oPos.laneIdx === myPos.laneIdx;
  }

  // No lane identity → do not block other lanes
  return false;
}

/**
 * Parker body is at/behind ego's bumper plane — already passed them.
 * Never yield / sensor-hold for these (stage-point ghosts must not freeze us).
 */
function isParkerBodyBehind(car, other) {
  if (!car || !other) return true;
  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const ox = other._cx != null ? other._cx : other.x;
  const oy = other._cy != null ? other._cy : other.y;
  return ((ox - egoX) * cosH + (oy - egoY) * sinH) < ALLIE_CONFIG.CAR_LENGTH * 0.12;
}

/**
 * May this parker hold ego? Body must not be behind; stage (or body) must be
 * ahead in the forward yield FOV.
 */
function shouldYieldForParker(car, other) {
  if (!car || !other) return false;
  if (isParkerBodyBehind(car, other)) return false;
  const sp = other._parkStagePoint || (other._parkPlan && other._parkPlan.stagePoint);
  if (sp) {
    const egoX = car._cx != null ? car._cx : car.x;
    const egoY = car._cy != null ? car._cy : car.y;
    const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
    const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
    const fwd = (sp.x - egoX) * cosH + (sp.y - egoY) * sinH;
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.15) return false;
    return isInYieldForwardView(car, sp.x, sp.y);
  }
  return isCarInYieldForwardView(car, other);
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
  stampParkerBlockedLane(car);
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
      // Abort this stall and keep looking for another
      resumeParkingRoam(car);
      return;
    }

    // Claim stolen / stall now blocked — abort before we reverse into someone
    if (car._parkPlan && car._parkPlan.bay != null && car._parkPlan.stallIndex != null) {
      if (!stallIsFree(car._parkPlan.bay, car._parkPlan.stallIndex, car)) {
        resumeParkingRoam(car);
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
      resumeParkingRoam(car);
      return;
    }

    if (car._parkDebug) car._parkDebug.dist = dist;

    if (dist <= PARKING_CONFIG.STAGE_POS_TOL && car.speed <= PARKING_CONFIG.STAGE_SPEED_TOL) {
      // Final claim check before committing to reverse
      if (car._parkPlan && !stallIsFree(car._parkPlan.bay, car._parkPlan.stallIndex, car)) {
        resumeParkingRoam(car);
        return;
      }
      // Close enough — snap heading to required and begin reversing.
      // Don't require heading match: Pure Pursuit can't correct heading at speed=0.
      car.heading = car._parkStageHeading != null ? car._parkStageHeading : car.heading;
      refreshCarPoseCache(car);
      if (car._parkBlockSegId == null) stampParkerBlockedLane(car);
      car.state = 'parking';
      car.parkPhase = 'reverse1';
      car._parkArcS = 0;
      car._stagingT = 0;
      car.speed = 0;
      if (car._parkDebug) car._parkDebug.phase = 'reverse1';
    }
    return;
  }

  // ── Roaming mode: cruise and scan curb L/R ahead (no lap-to-behind) ──
  if (car.parkingIntent.roaming) {
    car._parkSearchT = (car._parkSearchT || 0) + dt;
    if (car._parkSearchT < PARKING_CONFIG.SEARCH_INTERVAL) return;
    car._parkSearchT = 0;

    // If there are literally no free stalls anywhere, give up now
    if (!anyFreeParkingStallExists()) {
      if (car._parkDebug) car._parkDebug = { phase: 'outta', spot: 'no parking anywhere' };
      beginOuttaHere(car);
      return;
    }

    if (!car._parkRoamRejected) car._parkRoamRejected = new Set();
    const rejected = car._parkRoamRejected;

    // 1) Prefer the next open pad on this road's curb within LOOKAHEAD_STALLS
    let pick = findLocalParkingAhead(car);
    if (pick && rejected.has(pick.bay.id + ':' + pick.stallIndex)) pick = null;

    // 2) Still nothing beside us — only consider stalls still ahead of the nose
    //    (never a closer-behind spot that would force a whole lap).
    let needReroute = false;
    if (!pick) {
      const fwd = findForwardParkingStall(car, rejected);
      if (fwd) {
        pick = fwd;
        needReroute = true;
      }
    }

    if (!pick) {
      // Keep cruising; count a miss only when the current route is nearly done
      const remaining = Math.max(0, (car.totalLength || 0) - (car.traveledLength || 0));
      if (remaining < ALLIE_CONFIG.CAR_LENGTH * 1.5) {
        car._parkRoamAttempts = (car._parkRoamAttempts || 0) + 1;
        if (car._parkRoamAttempts > PARKING_CONFIG.ROAM_MAX_ATTEMPTS) {
          if (car._parkDebug) car._parkDebug = { phase: 'outta', spot: 'roam exhausted' };
          beginOuttaHere(car);
        } else if (car._parkDebug) {
          car._parkDebug = { phase: 'roaming', spot: 'scanning ahead' };
        }
      } else if (car._parkDebug) {
        car._parkDebug = { phase: 'roaming', spot: 'scanning ahead' };
      }
      return;
    }

    // Local curb hit on the road we're already on — claim and stage immediately
    const curLeg = car.route && car.route[car.legIndex];
    const onSameSeg = curLeg && curLeg.atom.kind === 'lane'
      && curLeg.atom.segId === pick.bay.segId;
    if (onSameSeg && !needReroute) {
      // Ensure approach fields exist (forward pick may lack lane sample)
      if (pick.approachUx == null) {
        const sample = curLeg.atom.sampleAtT(currentLegFrac(car));
        if (!sample) return;
        pick.approachUx = sample.tx;
        pick.approachUy = sample.ty;
        pick.laneX = sample.x;
        pick.laneY = sample.y;
      }
      const side = laneOffsetSignForAtom(curLeg.atom);
      // Other curb on a two-way: we'd need to be on that side — skip & reject
      if (side !== 0 && pick.bay.side !== 0 && side !== pick.bay.side) {
        rejected.add(pick.bay.id + ':' + pick.stallIndex);
        return;
      }
      car.parkingIntent = {
        segId: pick.bay.segId,
        side: pick.bay.side || 0,
        roaming: false,
        bayId: pick.bay.id,
        stallIndex: pick.stallIndex
      };
      if (beginParkingStaging(car, pick)) {
        if (car._parkDebug) {
          car._parkDebug = {
            phase: 'staging',
            spot: 'bay#' + pick.bay.id + '[' + pick.stallIndex + ']',
            blinker: car._parkBlinker,
            dist: null
          };
        }
      } else {
        rejected.add(pick.bay.id + ':' + pick.stallIndex);
        car.parkingIntent = { segId: null, roaming: true };
      }
      return;
    }

    // Stall ahead but on another block — soft reroute toward that curb (still
    // forward-biased). Reserve first so parallel roamers don't collide.
    car._parkPlan = { bay: pick.bay, stallIndex: pick.stallIndex };
    if (!reserveStall(pick.bay, pick.stallIndex, car)) {
      car._parkPlan = null;
      return;
    }

    const seg = findSegmentById(pick.bay.segId);
    if (!seg) {
      rejected.add(pick.bay.id + ':' + pick.stallIndex);
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    car.parkingIntent = {
      segId: pick.bay.segId,
      side: pick.bay.side || 0,
      roaming: false,
      bayId: pick.bay.id,
      stallIndex: pick.stallIndex
    };
    car.parkPhase = null;
    car._parkDebug = { phase: 'rerouting', spot: 'bay#' + pick.bay.id + '[' + pick.stallIndex + ']' };

    const origin = findNearestAtomPoint(car.x, car.y, 40, true);
    if (!origin) {
      rejected.add(pick.bay.id + ':' + pick.stallIndex);
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    const destPick = findLanePickForParkingBay(pick.bay, pick.stallIndex);
    if (!destPick) {
      rejected.add(pick.bay.id + ':' + pick.stallIndex);
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    const raw = allieFindPath(origin, destPick);
    if (!raw || !raw.length) {
      rejected.add(pick.bay.id + ':' + pick.stallIndex);
      releaseStallReservation(car);
      car._parkPlan = null;
      car.parkingIntent = { segId: null, roaming: true };
      return;
    }
    car._parkRoamAttempts = (car._parkRoamAttempts || 0) + 1;
    if (car._parkRoamAttempts > PARKING_CONFIG.ROAM_MAX_ATTEMPTS) {
      releaseStallReservation(car);
      car._parkPlan = null;
      if (car._parkDebug) car._parkDebug = { phase: 'outta', spot: 'roam exhausted' };
      beginOuttaHere(car);
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
      // Left the segment without parking — keep looking elsewhere
      resumeParkingRoam(car);
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
    // Spot taken / none ahead — keep looking on another curb
    resumeParkingRoam(car);
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
  if (car.state === 'parking' || car.state === 'parked') {
    car._parkYieldOther = null;
    car._parkYieldInfo = null;
    return null;
  }
  if (car.parkPhase === 'staging') {
    car._parkYieldOther = null;
    car._parkYieldInfo = null;
    return null;
  }
  if (car.isProbe) return null;
  // Stagger soft yield scans — reuse last result on off frames.
  // Skip stagger once we're already in an imminent hold so reaction stays fresh.
  const cachedYield = car._cachedParkYield;
  const imminentHold = !!(cachedYield && cachedYield.desired <= 1.0);
  if (!imminentHold && ((car.id + tickFrame) & 1) === 1) {
    if (cachedYield && cachedYield.other) {
      // Drop stale holds if the parker is now behind us / out of FOV
      if (shouldYieldForParker(car, cachedYield.other)) {
        car._parkYieldOther = cachedYield.other;
        car._parkYieldInfo = cachedYield.info || null;
        return cachedYield;
      }
      car._parkYieldOther = null;
      car._parkYieldInfo = null;
      car._cachedParkYield = null;
      return null;
    }
    return cachedYield || null;
  }

  car._parkYieldOther = null;
  car._parkYieldInfo = null;

  const egoX = car._cx != null ? car._cx : car.x;
  const egoY = car._cy != null ? car._cy : car.y;
  const cosH = car._cosH != null ? car._cosH : Math.cos(car.heading);
  const sinH = car._sinH != null ? car._sinH : Math.sin(car.heading);
  const look = PARKING_CONFIG.YIELD_LOOKAHEAD;
  const myPos = car._segPos;
  // Without a lane tag we cannot safely decide — don't hold for parkers
  if (!myPos) {
    car._cachedParkYield = null;
    return null;
  }
  const nearby = collectNearbyCars(egoX, egoY, look + 14);
  let best = null;

  for (let i = 0; i < nearby.length; i++) {
    const other = nearby[i];
    if (other === car || other.isProbe) continue;
    const reversing = other.state === 'parking';
    const staging = other.parkPhase === 'staging';
    if (!reversing && !staging) continue;

    // Hard gate: only the parker's blocked travel lane may hold us
    if (!parkerBlocksEgoLane(car, other)) continue;
    // Never yield for a parking car whose body is behind us
    if (!shouldYieldForParker(car, other)) continue;

    // Only the in-lane stage point — never the curb-swung body
    const sp = other._parkStagePoint || (other._parkPlan && other._parkPlan.stagePoint);
    if (!sp) continue;
    const dx = sp.x - egoX, dy = sp.y - egoY;
    const fwd = dx * cosH + dy * sinH;
    if (fwd < ALLIE_CONFIG.CAR_LENGTH * 0.15 || fwd > look) continue;
    const lat = Math.abs(-dx * sinH + dy * cosH);
    if (lat > PARKING_CONFIG.YIELD_LATERAL_REVERSE) continue;
    const gap = fwd - ALLIE_CONFIG.CAR_LENGTH;
    if (!best || gap < best.gap) best = { other, gap, lat, fwd, sp };
  }
  if (!best) {
    car._cachedParkYield = null;
    return null;
  }

  const other = best.other;
  const phase = other.state === 'parking'
    ? ('reverse·' + (other.parkPhase || 'parking'))
    : (other.parkPhase || 'staging');
  const bay = other._parkPlan && other._parkPlan.bay;
  const stall = other._parkPlan ? other._parkPlan.stallIndex : null;
  const laneTxt = (other._parkBlockSegId != null && other._parkBlockLaneIdx != null)
    ? ('seg' + other._parkBlockSegId + ':L' + other._parkBlockLaneIdx)
    : (other._segPos
      ? ('seg' + other._segPos.segId + ':L' + other._segPos.laneIdx)
      : 'lane?');
  const info = {
    id: other.id,
    phase,
    gap: +best.gap.toFixed(1),
    lat: +best.lat.toFixed(1),
    bay: bay ? ('bay#' + bay.id + (stall != null ? '[' + stall + ']' : '')) : null,
    lane: laneTxt,
    color: other.color || null
  };

  car._parkYieldOther = other;
  car._parkYieldInfo = info;
  const holdGap = PARKING_CONFIG.YIELD_GAP;
  const closing = Math.max(0, best.gap - holdGap);
  const rate = ALLIE_CONFIG.DECEL_NORMAL;
  const desired = best.gap <= holdGap
    ? 0
    : Math.sqrt(Math.max(0, 2 * rate * closing));
  const result = {
    desired: Math.min(desired, ALLIE_CONFIG.CRUISE_SPEED * 0.45),
    decelRate: Math.max(rate, ALLIE_CONFIG.DECEL_SHARP * 0.85),
    status: 'Waiting for parking',
    other,
    info
  };
  car._cachedParkYield = result;
  return result;
}

function updateParkingMotion(car, dt) {
  if (car.state === 'parked') {
    car.speed = 0;
    car.braking = false;
    car.brakeLit = false;
    if (car.blinkerSide || car.blinkerOn || car._parkBlinker) {
      car.blinkerSide = null;
      car.blinkerOn = false;
      car._parkBlinker = null;
      car._blinkerSignal = null;
      car._blinkerIdle = true;
    }
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
    // Snap gently to final pose (shortest-angle heading — ±π vs π must not spin 360°)
    const fp = plan.finalPose;
    const k = Math.min(1, dt * 6);
    car.x += (fp.x - car.x) * k;
    car.y += (fp.y - car.y) * k;
    car.heading = wrapAngle(car.heading + wrapAngle(fp.heading - car.heading) * k);
    refreshCarPoseCache(car);
    applyCarTransform(car);
    updateCarBlinkers(car, dt);
    if (car._parkSettleT >= PARKING_CONFIG.SETTLE_TIME) {
      car.x = fp.x;
      car.y = fp.y;
      car.heading = wrapAngle(fp.heading);
      car.state = 'parked';
      car.parkPhase = 'parked';
      car._parkBlinker = null;
      car.blinkerSide = null;
      car.blinkerOn = false;
      car._blinkerSignal = null;
      car._blinkerIdle = true;
      car.braking = false;
      car.brakeLit = false;
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

  // Probe next pose along the reverse arc — hold if we'd drive through someone
  const step = car.speed * dt;
  const nextS = Math.min(arcLen, (car._parkArcS || 0) + Math.max(step, 0.08));
  const nextPose = arc.sampleAtS(nextS);
  if (nextPose) {
    const nextH = Math.atan2(nextPose.ty, nextPose.tx);
    const blocked = parkReverseBlockedBy(car, nextPose.x, nextPose.y, nextH);
    if (blocked) {
      car.speed = 0;
      car.braking = true;
      refreshCarPoseCache(car);
      applyCarTransform(car);
      car.brakeLit = true;
      updateCarBlinkers(car, dt);
      if (car._parkDebug) car._parkDebug.phase = (car.parkPhase || 'reverse') + ' · waiting';
      if (car.selected) {
        updateFollowedCarInfo(car);
        updateFollowTagPosition(car);
      }
      return;
    }
  }

  car._parkArcS = (car._parkArcS || 0) + step;
  car.braking = remaining < 1.2;

  if (car._parkArcS >= arcLen - 0.02) {
    const end = arc.sampleAtS(arcLen);
    car.x = end.x;
    car.y = end.y;
    // Keep continuous heading across arc1→arc2 / reverse→settle (avoid ±π flip)
    const endH = Math.atan2(end.ty, end.tx);
    car.heading = wrapAngle(car.heading + wrapAngle(endH - car.heading));
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
    const h = Math.atan2(p.ty, p.tx);
    car.heading = wrapAngle(car.heading + wrapAngle(h - car.heading));
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

/**
 * Coarse route integrator for skip-draw batch FF.
 * Snaps pose along the route; no Pure Pursuit / soft awareness / LC systems.
 * Still applies parking yield + a cheap OBB hard-stop so cars cannot drive through each other.
 */
function updateCarBatch(car, dt) {
  // Staging arrival needs frequent checks; roam/search bay scans are expensive — throttle those.
  if (car.parkingIntent) {
    if (car.parkPhase === 'staging') {
      updateParkingSearch(car, dt);
    } else {
      car._batchParkSearchT = (car._batchParkSearchT || 0) + dt;
      if (car._batchParkSearchT >= 2) {
        car._batchParkSearchT = 0;
        updateParkingSearch(car, dt);
      }
    }
    if (car.state === 'parking' || car.state === 'parked') {
      updateParkingMotion(car, dt);
      return;
    }
  }

  const prevSpeed = car.speed;
  const { desired, decelRate } = computeDesiredSpeedBatch(car);
  car._debugDesired = desired;
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
  advanceSignedJunction(car, dt);
  if (car.highBeamFlashT > 0) {
    car.highBeamFlashT = Math.max(0, car.highBeamFlashT - dt);
  }

  const oldX = car.x, oldY = car.y, oldH = car.heading, oldTL = car.traveledLength;

  if (car.parkPhase === 'staging' && car._parkStagePoint) {
    // Creep toward stage point without Pure Pursuit / OBB
    const sp = car._parkStagePoint;
    const dx = sp.x - car.x, dy = sp.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.05 && car.speed > 0.02) {
      const step = Math.min(dist, car.speed * dt);
      car.x += (dx / dist) * step;
      car.y += (dy / dist) * step;
      if (car._parkStageHeading != null) car.heading = car._parkStageHeading;
    }
    car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt * 0.15);
    advanceCarLeg(car);
    refreshCarPoseCache(car);
    updateParkingSearch(car, 0);
    if (car.state === 'parking') {
      applyCarTransform(car);
      car.brakeLit = !!car.braking;
      return;
    }
  } else {
    car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt);
    advanceCarLeg(car);
    const pose = sampleRouteAtDistance(car, car.traveledLength);
    if (pose) {
      car.x = pose.x;
      car.y = pose.y;
      car.heading = Math.atan2(pose.ty, pose.tx);
    }
    refreshCarPoseCache(car);

    if (car.traveledLength >= car.totalLength - 0.05 && car.speed <= 0.5) {
      if (parkingSearchEnabled && car.state === 'driving') {
        let staged = false;
        if (car.parkingIntent && !car.parkingIntent.roaming) {
          const candidate = findParkingCandidate(car);
          if (candidate) staged = beginParkingStaging(car, candidate);
        }
        if (!staged) {
          if (car.parkingIntent && car.parkingIntent.roaming) {
            // leave throttled updateParkingSearch to reroute
          } else if (car.parkingIntent) {
            resumeParkingRoam(car);
          } else {
            beginOuttaHere(car);
          }
        }
      } else if (car.state === 'driving') {
        beginDespawn(car);
      }
    }
  }

  // Cheap hard-stop: only when near an active parker or a tight lead — restores
  // "cannot drive through" during batch FF without full per-frame OBB for every car.
  if (car.speed > 0.02 && cars.length > 1) {
    const obs = car._lastObstruction;
    const nearParkHold = !!car._parkYieldOther
      || (car._cachedParkYield && car._cachedParkYield.desired < ALLIE_CONFIG.CRUISE_SPEED * 0.5)
      || (activeParkersCount > 0 && obs && obs.gap < PARKING_CONFIG.YIELD_LOOKAHEAD);
    const tightLead = obs && obs.gap < ALLIE_CONFIG.DETECT_RING_INNER;
    if (nearParkHold || tightLead) {
      const hit = wouldCollideAt(car, car.x, car.y, car.heading);
      if (hit) {
        car.x = oldX;
        car.y = oldY;
        car.heading = oldH;
        car.traveledLength = oldTL;
        car.speed = 0;
        car.braking = true;
        refreshCarPoseCache(car);
        if (!car._signalStatus) car._signalStatus = 'Blocked';
      }
    }
  }

  applyCarTransform(car);
  car.brakeLit = !!car.braking;
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

  // Skip-draw FF: coarse route snap (no PP / OBB / soft awareness / LC systems)
  if (simBatchMode) {
    updateCarBatch(car, dt);
    return;
  }

  // If already jammed overlapping another car, winner creeps out first
  if (tryUnstickWinner(car, dt)) {
    advanceCarLeg(car);
    applyCarTransform(car);
    car.brakeLit = false;
    updateCarBlinkers(car, dt);
    updateStuckGasNudge(car, dt);
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
  updateStuckGasNudge(car, dt);

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
  advanceSignedJunction(car, dt);

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
    // Stagger full OBB checks across frames when not recently blocked —
    // but always run near an active parking maneuver so we can't skip a frame
    // and plow into a staging / reversing car.
    let forceObb = !!car._hardSafetyHit;
    if (!forceObb && car._parkYieldOther) {
      forceObb = true;
    } else if (!forceObb && activeParkersCount > 0) {
      const obs = car._lastObstruction;
      if (obs && obs.gap < PARKING_CONFIG.YIELD_LOOKAHEAD) forceObb = true;
    }
    if (forceObb || ((car.id + tickFrame) & 1) === 0) {
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
    clampStopSignLimitLine(car);

    if (car.traveledLength >= car.totalLength - 0.05 && car.speed <= 0.5) {
      if (parkingSearchEnabled && car.state === 'driving') {
        // Last chance at destination; if the spot is gone, keep looking
        let staged = false;
        if (car.parkingIntent && !car.parkingIntent.roaming) {
          const candidate = findParkingCandidate(car);
          if (candidate) staged = beginParkingStaging(car, candidate);
        }
        if (!staged) {
          if (car.parkingIntent && car.parkingIntent.roaming) {
            // Already hunting another stall — leave updateParkingSearch to reroute
          } else if (car.parkingIntent) {
            resumeParkingRoam(car);
          } else {
            beginOuttaHere(car);
          }
        }
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
      || status === 'After you' || status === 'Looking both ways' || status === 'Creeping out'
      || status === 'Right on red' || status === 'Red light'
      || status === 'Stop sign' || status === 'Yield sign'
      || status === 'Blocked' || status === 'Unsticking' || status === 'Unsticking · gas'
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
  if (car.stopSignState && car.stopSignState.phase && car.stopSignState.phase !== 'cleared') return true;
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

function formatSpawnerRowTitle(sp) {
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
  return '#' + sp.id + ' · every ' + sp.intervalSec + 's · ' + routes + ' routes · ' + status;
}

function updateSpawnerListUI() {
  updateSpawnerPauseAllButton();
  const list = document.getElementById('spawner-list');
  if (!list) return;
  if (!spawners.length) {
    if (list._spawnerEmpty) return;
    list._spawnerEmpty = true;
    list._spawnerTitleById = null;
    list.innerHTML = '<div class="spawner-empty">No spawners placed</div>';
    return;
  }
  list._spawnerEmpty = false;
  list.innerHTML = spawners.map(sp => {
    const title = formatSpawnerRowTitle(sp);
    return '<div class="spawner-row" data-spawner-id="' + sp.id + '">' +
      '<div class="spawner-row-title">' + title + '</div>' +
      '<div class="spawner-row-actions">' +
      '<button type="button" class="lane-btn sig-mini" data-spawner-action="toggle">' + (sp.running ? 'Pause' : 'Start') + '</button>' +
      '<button type="button" class="lane-btn sig-mini" data-spawner-action="remove">Del</button>' +
      '</div></div>';
  }).join('');
  // Cache row-title nodes once; per-second refresh avoids repeated querySelector scans.
  const titleById = Object.create(null);
  const rows = list.querySelectorAll('[data-spawner-id]');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = Number(row.getAttribute('data-spawner-id'));
    const title = row.querySelector('.spawner-row-title');
    if (!Number.isFinite(id) || !title) continue;
    titleById[id] = title;
  }
  list._spawnerTitleById = titleById;
}

/** Light countdown refresh — textContent only, no list rebuild / layout thrash. */
function refreshSpawnerCountdowns() {
  const list = document.getElementById('spawner-list');
  if (!list || !spawners.length) return;
  const titleById = list._spawnerTitleById || null;
  for (let i = 0; i < spawners.length; i++) {
    const sp = spawners[i];
    const title = titleById ? titleById[sp.id] : null;
    if (!title) continue;
    const next = formatSpawnerRowTitle(sp);
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
        if (!simBatchMode) drawSpawnerMarker(spawner);
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
  // Batch FF covers the screen with the loader — skip all spawner DOM work.
  if (simBatchMode) return;
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
    // tickFrame advances inside each stepSim for stagger/caches
    let budget = dt * (simSpeed > 0 ? simSpeed : 1);
    while (budget > 1e-8) {
      const step = Math.min(budget, MAX_DT);
      stepSim(step);
      budget -= step;
    }
  } else {
    tickFrame++; // keep stagger clocks moving while paused (no stepSim)
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
setFfSkipDraw(false);
refreshLaneCongestionUI();
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