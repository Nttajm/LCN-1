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

let allieAtoms = [];          // every LANE + TURN atom currently in the network
let allieOutByStub = new Map(); // stubKey -> [atom, ...] leaving that stub

function stubKey(nodeKey, laneNodeId) {
  return nodeKey + '#' + laneNodeId;
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

// Build the (up to) two LANE atoms — well, one per lane — for one road segment
function buildLaneAtoms(segment) {
  const { x1, y1, x2, y2, startKey, endKey } = computeShortenedEndpoints(segment);
  const dx = x2 - x1, dy = y2 - y1;
  const segLen = Math.hypot(dx, dy);
  if (segLen < 0.001) return [];
  const ux = dx / segLen, uy = dy / segLen;
  const perpX = -uy, perpY = ux;
  const { lanesIn, lanesOut } = getRoadDirs(segment);
  const specs = getLaneSpecs(lanesIn, lanesOut);
  const atoms = [];

  specs.forEach(spec => {
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

    atoms.push({
      kind: 'lane',
      id: 'lane:' + segment.id + ':' + spec.idx,
      segId: segment.id,
      laneIdx: spec.idx,
      x1: ax1, y1: ay1, x2: ax2, y2: ay2,
      length: segLen,
      originStub: originStubObj ? stubKey(originKey, originStubObj.id) : null,
      destStub: destStubObj ? stubKey(destKey, destStubObj.id) : null,
      color: laneColorFor(spec, lanesIn, lanesOut),
      sampleAtT(frac) {
        const t = Math.max(0, Math.min(1, frac));
        return { x: ax1 + tux*segLen*t, y: ay1 + tuy*segLen*t, tx: tux, ty: tuy };
      },
      pathD: null // straight lane: rendered as a plain line by the caller
    });
  });

  return atoms;
}

function rebuildAllieGraph() {
  const atoms = [];
  segments.forEach(seg => { atoms.push(...buildLaneAtoms(seg)); });
  nodes.forEach((nd, nodeKey) => {
    if (nd.count > 1 && nd.edges) {
      nd.edges.forEach(edge => atoms.push(buildTurnAtom(nodeKey, edge)));
    }
  });

  const outByStub = new Map();
  atoms.forEach(atom => {
    if (!atom.originStub) return;
    if (!outByStub.has(atom.originStub)) outByStub.set(atom.originStub, []);
    outByStub.get(atom.originStub).push(atom);
  });

  allieAtoms = atoms;
  allieOutByStub = outByStub;
}

// Find the closest point (spawn/destination candidate) to a world-space
// click, searching both straight lane atoms and curved turn atoms.
// Returns { atom, t (arclength fraction 0..1), x, y, dist } or null.
function findNearestAtomPoint(wx, wy, maxDist) {
  let best = null;
  allieAtoms.forEach(atom => {
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
      // Sample the precomputed table indirectly via sampleAtT
      const STEPS = 18;
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
// Returns an array of atoms (each traversed in FULL, t 0->1) or null.
function allieDijkstra(startStub, targetStub) {
  if (startStub === targetStub) return [];
  const dist = new Map([[startStub, 0]]);
  const prevAtom = new Map();
  const visited = new Set();
  // Small graphs -> a simple O(V^2) selection Dijkstra is plenty fast
  while (true) {
    let u = null, ud = Infinity;
    dist.forEach((d, key) => { if (!visited.has(key) && d < ud) { ud = d; u = key; } });
    if (u == null) break;
    if (u === targetStub) break;
    visited.add(u);
    const outs = allieOutByStub.get(u) || [];
    outs.forEach(atom => {
      if (!atom.destStub) return;
      const nd = ud + atom.length;
      if (nd < (dist.has(atom.destStub) ? dist.get(atom.destStub) : Infinity)) {
        dist.set(atom.destStub, nd);
        prevAtom.set(atom.destStub, { atom, from: u });
      }
    });
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
// atoms (harder for sharp ones, using the turn's own radius), and
// brake to a stop approaching the destination before despawning.
// ================================================================

const ALLIE_CONFIG = {
  CAR_LENGTH: 5.6,
  CAR_WIDTH: 2.6,
  WHEELBASE: 3.4,
  REAR_OVERHANG: 1.2,
  CRUISE_SPEED: 42,
  MIN_TURN_SPEED: 9,
  ACCEL: 20,
  DECEL_NORMAL: 26,
  DECEL_SHARP: 46,
  ARRIVAL_DECEL: 24,
  ARRIVAL_MIN_DIST: 10,
  LOOKAHEAD_MIN: 4,
  LOOKAHEAD_MAX: 13,
  LOOKAHEAD_K: 0.55,
  PLANNING_LOOKAHEAD: 60,
  MAX_STEER: Math.PI / 2.1,
  DESPAWN_DURATION: 0.55,
  FOLLOW_LERP: 0.08,
  FOLLOW_MIN_SCALE: 2.6,
  PICK_TOLERANCE_PX: 20
};

const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#2ecc71', '#ff6fae'];

let driveMode = false;
let pendingSpawn = null;
let cars = [];
let carIdCounter = 1;
let followedCar = null;
let simPaused = false;
let spawnPinEl = null;
let hoverMarkerEl = null;
let previewRouteEls = [];
let driveMoveThrottle = 0;
let toastTimer = null;

const driveLayer = document.createElementNS(svgNS, 'g');
driveLayer.id = 'drive-layer';
world.appendChild(driveLayer);
const routeHighlightLayer = document.createElementNS(svgNS, 'g');
routeHighlightLayer.id = 'route-highlight-layer';
world.appendChild(routeHighlightLayer);
const carLayer = document.createElementNS(svgNS, 'g');
carLayer.id = 'car-layer';
world.appendChild(carLayer);

function pickToleranceWorld() {
  return ALLIE_CONFIG.PICK_TOLERANCE_PX / view.scale;
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
    if (isBuilding()) cancelBuild();
    rebuildAllieGraph();
  } else {
    clearPendingSpawn();
    clearDriveHoverPreview();
  }
  updateDriveHudText();
}

function updateDriveHudText() {
  if (!driveMode) return;
  const meta = document.getElementById('drive-hud-meta');
  meta.innerHTML = pendingSpawn
    ? 'Pickup set · click a road for the destination · <kbd>Esc</kbd> cancel'
    : 'Click a road to set the pickup point';
}

function handleDriveMouseMove(worldPt) {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - driveMoveThrottle < 40) return;
  driveMoveThrottle = now;
  const pick = findNearestAtomPoint(worldPt.x, worldPt.y, pickToleranceWorld());
  drawDriveHoverMarker(pick);
  if (pendingSpawn && pick) {
    drawPreviewRoute(allieFindPath(pendingSpawn, pick));
  } else if (!pendingSpawn) {
    clearPreviewRoute();
  }
}

function handleDriveClick(event) {
  const worldPt = screenToWorld(event.clientX, event.clientY);
  const pick = findNearestAtomPoint(worldPt.x, worldPt.y, pickToleranceWorld());
  if (!pick) {
    showDriveToast('No road nearby — click closer to a lane');
    return;
  }
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
  spawnCarFromRoute(route);
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
}

function showDriveToast(msg) {
  const el = document.getElementById('drive-toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}

// ---------------- Route-highlight rendering (shared by preview + follow) ----------------

function drawHighlightSegment(atom, tFrom, tTo) {
  if (tTo - tFrom < 0.002) return null;
  let el;
  if (atom.kind === 'lane') {
    const a = atom.sampleAtT(tFrom), b = atom.sampleAtT(tTo);
    el = document.createElementNS(svgNS, 'line');
    el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
    el.setAttribute('x2', b.x); el.setAttribute('y2', b.y);
  } else {
    const STEPS = 14;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = tFrom + (tTo - tFrom) * (i / STEPS);
      const p = atom.sampleAtT(t);
      pts.push(p.x.toFixed(2) + ',' + p.y.toFixed(2));
    }
    el = document.createElementNS(svgNS, 'polyline');
    el.setAttribute('points', pts.join(' '));
    el.setAttribute('fill', 'none');
  }
  el.setAttribute('stroke', '#ffe066');
  el.setAttribute('stroke-width', '1.6');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-opacity', '0.9');
  el.setAttribute('stroke-dasharray', '3 2.2');
  el.setAttribute('class', 'route-highlight-dash');
  routeHighlightLayer.appendChild(el);
  return el;
}

function drawPreviewRoute(route) {
  clearPreviewRoute();
  if (!route) return;
  route.forEach(leg => {
    const el = drawHighlightSegment(leg.atom, leg.tStart, leg.tEnd);
    if (el) {
      el.setAttribute('class', '');
      el.setAttribute('stroke', 'rgba(63,167,255,0.85)');
      el.setAttribute('stroke-width', '1.1');
      previewRouteEls.push(el);
    }
  });
}

function clearPreviewRoute() {
  previewRouteEls.forEach(el => el.remove());
  previewRouteEls = [];
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
  for (let i = car.legIndex; i < car.route.length; i++) {
    const leg = car.route[i];
    const tFrom = i === car.legIndex ? currentLegFrac(car) : leg.tStart;
    const el = drawHighlightSegment(leg.atom, tFrom, leg.tEnd);
    if (el) car.highlightEls.push(el);
  }
}

// ---------------- Spawning ----------------

function spawnCarFromRoute(route) {
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

  const hit = document.createElementNS(svgNS, 'rect');
  hit.setAttribute('x', String(rearX - 1));
  hit.setAttribute('y', String(-W / 2 - 1));
  hit.setAttribute('width', String(L + 2));
  hit.setAttribute('height', String(W + 2));
  hit.setAttribute('fill', 'transparent');
  hit.style.pointerEvents = 'auto';
  hit.style.cursor = 'pointer';
  g.appendChild(hit);

  carLayer.appendChild(g);

  const car = {
    id: carIdCounter++,
    el: g, lightEls, hitEl: hit,
    route: legs, legIndex: 0,
    totalLength, traveledLength: 0,
    x: start.x, y: start.y, heading: Math.atan2(start.ty, start.tx),
    speed: 0, braking: false,
    color, selected: false, state: 'driving', despawnT: 0,
    highlightEls: []
  };

  hit.addEventListener('click', (e) => {
    e.stopPropagation();
    if (followedCar === car) unfollowCar();
    else selectCar(car);
  });

  g.setAttribute('transform', `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI})`);

  cars.push(car);
  updateCarCountUI();
  return car;
}

function removeCar(car) {
  if (followedCar === car) unfollowCar();
  clearRouteHighlightEls(car);
  car.el.remove();
  cars = cars.filter(c => c !== car);
  updateCarCountUI();
}

function beginDespawn(car) {
  if (car.state === 'despawning') return;
  car.state = 'despawning';
  car.despawnT = 0;
}

// ---------------- Selection / follow camera ----------------

function selectCar(car) {
  if (followedCar && followedCar !== car) deselectCarVisual(followedCar);
  followedCar = car;
  car.selected = true;
  updateRouteHighlight(car);
  document.getElementById('car-info').classList.add('visible');
  document.getElementById('ci-id').textContent = '#' + car.id;
  updateFollowedCarInfo(car);
}

function deselectCarVisual(car) {
  car.selected = false;
  clearRouteHighlightEls(car);
}

function unfollowCar() {
  if (!followedCar) return;
  deselectCarVisual(followedCar);
  followedCar = null;
  document.getElementById('car-info').classList.remove('visible');
}

function updateFollowedCarInfo(car) {
  document.getElementById('ci-speed').textContent = Math.round(car.speed) + ' u/s';
  const status = car.state === 'despawning' ? 'Arrived' : (car.braking ? 'Braking' : (car.speed < 1 ? 'Stopped' : 'Driving'));
  document.getElementById('ci-status').textContent = status;
  document.getElementById('ci-remaining').textContent = Math.max(0, Math.round(car.totalLength - car.traveledLength)) + ' u';
}

function updateCameraFollow(car, dt) {
  const rect = board.getBoundingClientRect();
  const targetScale = Math.max(view.scale, ALLIE_CONFIG.FOLLOW_MIN_SCALE);
  if (Math.abs(targetScale - view.scale) > 0.001) {
    view.scale += (targetScale - view.scale) * Math.min(1, dt * 4);
  }
  const desiredX = rect.width / 2 - car.x * view.scale;
  const desiredY = rect.height / 2 - car.y * view.scale;
  view.x += (desiredX - view.x) * ALLIE_CONFIG.FOLLOW_LERP;
  view.y += (desiredY - view.y) * ALLIE_CONFIG.FOLLOW_LERP;
  applyView();
}

// ---------------- Simulation controls ----------------

function clearAllCars() {
  if (followedCar) unfollowCar();
  cars.forEach(c => { clearRouteHighlightEls(c); c.el.remove(); });
  cars = [];
  updateCarCountUI();
}

function updateCarCountUI() {
  document.getElementById('car-count').textContent = String(cars.length);
}

function toggleSimPaused() {
  simPaused = !simPaused;
  const btn = document.getElementById('btn-sim-pause');
  btn.textContent = simPaused ? 'Resume' : 'Pause';
  btn.classList.toggle('active', simPaused);
}

// ---------------- Per-frame update: speed profile + bicycle model + pure pursuit ----------------

function sampleRouteAtDistance(car, s) {
  s = clampNum(s, 0, car.totalLength);
  const route = car.route;
  for (let i = 0; i < route.length; i++) {
    const leg = route[i];
    if (s <= leg.cumEnd + 0.0005 || i === route.length - 1) {
      const localLen = Math.max(leg.length, 0.0001);
      const localFrac = clampNum((s - leg.cumStart) / localLen, 0, 1);
      const t = leg.tStart + (leg.tEnd - leg.tStart) * localFrac;
      return leg.atom.sampleAtT(t);
    }
  }
  return null;
}

function advanceCarLeg(car) {
  while (car.legIndex < car.route.length - 1 && car.traveledLength >= car.route[car.legIndex].cumEnd - 0.0005) {
    car.legIndex++;
    if (car.selected) updateRouteHighlight(car);
  }
}

// The "RH" speed profile: cruise, brake ahead of turns (harder for sharp
// ones), hold through the turn, then accelerate back out; brake to a stop
// on approach to the destination.
function computeDesiredSpeed(car) {
  let desired = ALLIE_CONFIG.CRUISE_SPEED;
  let decelRate = ALLIE_CONFIG.DECEL_NORMAL;
  const route = car.route;

  const curLeg = route[car.legIndex];
  if (curLeg && curLeg.atom.kind === 'turn' && curLeg.atom.targetSpeed < desired) {
    desired = curLeg.atom.targetSpeed;
    decelRate = curLeg.atom.sharp ? ALLIE_CONFIG.DECEL_SHARP : ALLIE_CONFIG.DECEL_NORMAL;
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

  return { desired, decelRate };
}

function updateCar(car, dt) {
  if (car.state === 'despawning') {
    car.despawnT += dt;
    const p = Math.min(1, car.despawnT / ALLIE_CONFIG.DESPAWN_DURATION);
    car.el.setAttribute('transform', `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI}) scale(${1 - p})`);
    car.el.setAttribute('opacity', String(1 - p));
    if (p >= 1) removeCar(car);
    return;
  }

  const prevSpeed = car.speed;
  const { desired, decelRate } = computeDesiredSpeed(car);
  if (car.speed < desired - 0.01) {
    car.speed = Math.min(desired, car.speed + ALLIE_CONFIG.ACCEL * dt);
  } else if (car.speed > desired + 0.01) {
    car.speed = Math.max(desired, car.speed - decelRate * dt);
  }
  car.braking = car.speed < prevSpeed - 0.01;

  // Pure Pursuit: aim for a point Ld ahead along the route, steer toward it
  const Ld = clampNum(car.speed * ALLIE_CONFIG.LOOKAHEAD_K, ALLIE_CONFIG.LOOKAHEAD_MIN, ALLIE_CONFIG.LOOKAHEAD_MAX);
  const target = sampleRouteAtDistance(car, car.traveledLength + Ld);

  if (target && car.speed > 0.02) {
    const dx = target.x - car.x, dy = target.y - car.y;
    const cosH = Math.cos(-car.heading), sinH = Math.sin(-car.heading);
    const localX = dx * cosH - dy * sinH;
    const localY = dx * sinH + dy * cosH;
    const alpha = Math.atan2(localY, localX);
    const rawLd = Math.max(Math.hypot(dx, dy), 0.5);
    let steer = Math.atan2(2 * ALLIE_CONFIG.WHEELBASE * Math.sin(alpha), rawLd);
    steer = clampNum(steer, -ALLIE_CONFIG.MAX_STEER, ALLIE_CONFIG.MAX_STEER);

    // Kinematic Bicycle Model, integrated at the rear axle
    car.heading += (car.speed / ALLIE_CONFIG.WHEELBASE) * Math.tan(steer) * dt;
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.y += Math.sin(car.heading) * car.speed * dt;
  }

  car.traveledLength = Math.min(car.totalLength, car.traveledLength + car.speed * dt);
  advanceCarLeg(car);

  if (car.traveledLength >= car.totalLength - 0.05 && car.speed <= 0.5) {
    beginDespawn(car);
  }

  car.el.setAttribute('transform', `translate(${car.x} ${car.y}) rotate(${car.heading * 180 / Math.PI})`);
  const lightOpacity = car.braking ? '0.95' : '0.15';
  car.lightEls.forEach(l => l.setAttribute('opacity', lightOpacity));

  if (car.selected) updateFollowedCarInfo(car);
}

// ---------------- Main loop ----------------

let lastTick = null;
function tick(ts) {
  if (lastTick == null) lastTick = ts;
  let dt = (ts - lastTick) / 1000;
  lastTick = ts;
  dt = Math.min(dt, 0.05);

  if (!simPaused) {
    for (let i = cars.length - 1; i >= 0; i--) updateCar(cars[i], dt);
  }

  world.appendChild(routeHighlightLayer);
  world.appendChild(carLayer);
  world.appendChild(driveLayer);

  if (followedCar) updateCameraFollow(followedCar, dt);

  requestAnimationFrame(tick);
}

rebuildAllieGraph();
requestAnimationFrame(tick);