const PARK_SPOT_LEN_MUL = 1.2;
const PARK_SPOT_DEPTH_MUL = 1.2;
// Stall curb sits this far outside the centerline of the adjacent (outermost) lane —
// not a shared "road bed" half-width, so wide / asymmetric roads stay tight to their curb lane.
const PARK_LANE_GAP = 2.56;
const PARK_FILL = 'rgba(48, 52, 58, 0.32)';
const PARK_STROKE = 'rgba(255, 255, 255, 0.55)';
const PARK_LABEL = 'rgba(245, 245, 245, 0.42)';
const PARK_GHOST_FILL = 'rgba(48, 52, 58, 0.18)';
const PARK_GHOST_STROKE = 'rgba(255, 255, 255, 0.4)';
const PARK_GHOST_LABEL = 'rgba(245, 245, 245, 0.32)';
const PARK_DELETE_FILL = 'rgba(231, 76, 60, 0.38)';
const PARK_DELETE_STROKE = 'rgba(255, 120, 100, 0.95)';
const PARK_ACCENT = '#7f8c9a';

let parkingMode = false;
let parkingBays = [];
let parkingCounter = 1;
let parkingGhostBay = null;
let parkingDraft = null;
let parkingHover = null;
let parkingDragging = false;
let parkingPointerDown = false;
let parkingDragMoved = false;
let parkingIgnoreClick = false;
// Delete-mode brush: select a contiguous string of existing stalls to remove
let parkingDeleteEdit = null; // { segId, side, stalls[], i0, i1 }
let parkingDeleteHighlight = null; // corners[] for preview

function parkCarLength() {
  if (typeof ALLIE_CONFIG !== 'undefined' && ALLIE_CONFIG.CAR_LENGTH) return ALLIE_CONFIG.CAR_LENGTH;
  return 5.6;
}

function parkCarWidth() {
  if (typeof ALLIE_CONFIG !== 'undefined' && ALLIE_CONFIG.CAR_WIDTH) return ALLIE_CONFIG.CAR_WIDTH;
  return 2.6;
}

function parkSpotLength() {
  return parkCarLength() * PARK_SPOT_LEN_MUL;
}

function parkSpotDepth() {
  return parkCarWidth() * PARK_SPOT_DEPTH_MUL;
}

(function injectParkingStyles() {
  if (document.getElementById('parking-tool-styles')) return;
  const style = document.createElement('style');
  style.id = 'parking-tool-styles';
  style.textContent = `
    .board.parking-mode {
      cursor: crosshair;
      box-shadow: inset 0 0 0 3px rgba(127, 140, 154, 0.5);
    }
    .parking-tool-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    #road-toolbar .parking-tool-btn {
      width: 34px;
      min-width: 34px;
      height: 30px;
      padding: 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #road-toolbar .parking-tool-btn.active {
      background: rgba(127, 140, 154, 0.28);
      border-color: #95a5a6;
      color: #dfe6ea;
    }
    .parking-stall-icon {
      display: grid;
      grid-template-rows: 1fr 1fr 1fr;
      gap: 1.5px;
      width: 14px;
      height: 12px;
    }
    .parking-stall-icon span {
      display: block;
      height: 2px;
      border-radius: 1px;
      background: currentColor;
      opacity: 0.92;
    }
    #parking-hud {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(20, 20, 30, 0.92);
      border: 1px solid rgba(127, 140, 154, 0.55);
      border-radius: 10px;
      padding: 10px 18px;
      font-family: monospace;
      font-size: 12.5px;
      color: #ddd;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 110;
      user-select: none;
      display: none;
      align-items: center;
      gap: 14px;
      pointer-events: none;
    }
    #parking-hud.visible { display: flex; }
    #parking-hud .parking-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${PARK_ACCENT};
      box-shadow: 0 0 8px ${PARK_ACCENT};
    }
    #parking-hud .parking-title {
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #c5ced6;
    }
    #parking-hud .parking-meta { color: #aaa; }
    #parking-hud kbd {
      display: inline-block;
      padding: 1px 6px;
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      font-size: 11px;
      color: #ccc;
    }
  `;
  document.head.appendChild(style);
})();

function roadBedHalfWidth(seg) {
  // Painted road bed extent from center (for corridor cuts / hit tests) —
  // NOT used to place curb parking (see parkingCurbOffset).
  if (typeof getLaneSpecsFor === 'function') {
    const specs = getLaneSpecsFor(seg);
    if (specs && specs.length) {
      let maxAbs = 0;
      for (let i = 0; i < specs.length; i++) {
        const a = Math.abs(specs[i].offset);
        if (a > maxAbs) maxAbs = a;
      }
      return maxAbs + 0.75;
    }
  }
  return 4.75;
}

// Outermost lane centerline offset on this curb side (±1). Asymmetric roads
// can have very different extents left vs right — never reuse the other side.
function outerLaneOffsetForSide(seg, side) {
  const s = side >= 0 ? 1 : -1;
  if (typeof getLaneSpecsFor === 'function') {
    const specs = getLaneSpecsFor(seg);
    if (specs && specs.length) {
      let best = specs[0].offset;
      for (let i = 1; i < specs.length; i++) {
        if (specs[i].offset * s > best * s) best = specs[i].offset;
      }
      return best;
    }
  }
  return 0;
}

// Signed center → curb offset for parking on this side: adjacent outer lane + gap.
function parkingCurbOffset(seg, side) {
  const s = side >= 0 ? 1 : -1;
  return outerLaneOffsetForSide(seg, s) + s * PARK_LANE_GAP;
}

function parkingCurbPoint(seg, along, side) {
  const x1 = seg.startNode.x, y1 = seg.startNode.y;
  const x2 = seg.endNode.x, y2 = seg.endNode.y;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const s = side >= 0 ? 1 : -1;
  const curbOff = parkingCurbOffset(seg, s);
  const t = Math.max(0, Math.min(len, along));
  return {
    x: x1 + ux * t + px * curbOff,
    y: y1 + uy * t + py * curbOff,
    ux,
    uy,
    nx: px * s,
    ny: py * s,
    half: Math.abs(curbOff),
    len,
    along: t
  };
}

function clearParkingGhost() {
  parkingGhostBay = null;
}

function parkingBayCorners(bay, index) {
  const L = bay.spotLength;
  const D = bay.spotDepth;
  const t0 = index * L;
  const sx = bay.x1 + bay.ux * t0;
  const sy = bay.y1 + bay.uy * t0;
  const ex = sx + bay.ux * L;
  const ey = sy + bay.uy * L;
  const ox = bay.nx * D;
  const oy = bay.ny * D;
  return [
    { x: sx, y: sy },
    { x: ex, y: ey },
    { x: ex + ox, y: ey + oy },
    { x: sx + ox, y: sy + oy }
  ];
}

function appendStallMark(ctx, corners, fill, stroke, dash) {
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = dash ? 0.85 : 0.7;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  if (dash) ctx.setLineDash([2, 1.5]);
  else ctx.setLineDash([]);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function renderParkingBay(bay, ghost) {
  if (!bay) return;
  if (ghost) parkingGhostBay = bay;
  // Committed bays live in parkingBays; canvas redraws them each frame.
}

function redrawAllParking() {
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
}

function drawParkingCanvas(ctx) {
  if (!ctx) return;
  ctx.save();
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    if (!bay || bay.count < 1) continue;
    let bayAlpha = 1;
    if (typeof underpassVisibilityAt === 'function' && bay.segId != null) {
      const mx = (bay.x1 + bay.x2) * 0.5;
      const my = (bay.y1 + bay.y2) * 0.5;
      bayAlpha = underpassVisibilityAt(bay.segId, mx, my);
      if (bayAlpha < 0.99) bayAlpha = typeof UNDERPASS_PARK_ALPHA === 'number'
        ? UNDERPASS_PARK_ALPHA
        : 0.22;
    }
    for (let i = 0; i < bay.count; i++) {
      ctx.globalAlpha = bayAlpha;
      appendStallMark(ctx, parkingBayCorners(bay, i), PARK_FILL, PARK_STROKE, false);
    }
  }
  ctx.globalAlpha = 1;
  if (parkingGhostBay && parkingGhostBay.count > 0) {
    for (let i = 0; i < parkingGhostBay.count; i++) {
      appendStallMark(
        ctx,
        parkingBayCorners(parkingGhostBay, i),
        PARK_GHOST_FILL,
        PARK_GHOST_STROKE,
        true
      );
    }
  }
  if (parkingDeleteHighlight && parkingDeleteHighlight.length) {
    for (let i = 0; i < parkingDeleteHighlight.length; i++) {
      appendStallMark(ctx, parkingDeleteHighlight[i], PARK_DELETE_FILL, PARK_DELETE_STROKE, true);
    }
  }
  ctx.restore();
}

function distPointToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const hit = ((yi > p.y) !== (yj > p.y))
      && (p.x < (xj - xi) * (p.y - yi) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function quadHitsRoadCorridor(corners, ax, ay, bx, by, halfW) {
  for (let i = 0; i < corners.length; i++) {
    if (distPointToSeg(corners[i].x, corners[i].y, ax, ay, bx, by) <= halfW) return true;
  }
  if (pointInPoly({ x: ax, y: ay }, corners) || pointInPoly({ x: bx, y: by }, corners)) return true;
  const mid = { x: (ax + bx) * 0.5, y: (ay + by) * 0.5 };
  if (pointInPoly(mid, corners)) return true;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    if (segmentsIntersect(a, b, { x: ax, y: ay }, { x: bx, y: by })) return true;
    if (distPointToSeg((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, ax, ay, bx, by) <= halfW) return true;
  }
  return false;
}

function bayFromSpotRange(bay, i0, i1) {
  const n = i1 - i0 + 1;
  if (n < 1) return null;
  const L = bay.spotLength;
  const x1 = bay.x1 + bay.ux * (i0 * L);
  const y1 = bay.y1 + bay.uy * (i0 * L);
  return {
    id: parkingCounter++,
    kind: bay.kind || 'parallel',
    x1,
    y1,
    x2: x1 + bay.ux * n * L,
    y2: y1 + bay.uy * n * L,
    ux: bay.ux,
    uy: bay.uy,
    nx: bay.nx,
    ny: bay.ny,
    count: n,
    spotLength: bay.spotLength,
    spotDepth: bay.spotDepth,
    segId: bay.segId,
    side: bay.side
  };
}

function splitBayByRoad(bay, ax, ay, bx, by, halfW) {
  if (!bay || bay.count < 1) return null;
  const blocked = [];
  let anyHit = false;
  for (let i = 0; i < bay.count; i++) {
    const hit = quadHitsRoadCorridor(parkingBayCorners(bay, i), ax, ay, bx, by, halfW);
    blocked.push(hit);
    if (hit) anyHit = true;
  }
  if (!anyHit) return null;

  const pieces = [];
  let runStart = -1;
  for (let i = 0; i <= bay.count; i++) {
    const free = i < bay.count && !blocked[i];
    if (free && runStart < 0) runStart = i;
    if (!free && runStart >= 0) {
      const piece = bayFromSpotRange(bay, runStart, i - 1);
      if (piece) pieces.push(piece);
      runStart = -1;
    }
  }
  return pieces;
}

function roadHalfWidthForCut(seg) {
  if (seg) return roadBedHalfWidth(seg) + 1.25;
  if (typeof getLaneSpecs === 'function'
      && typeof currentLanesIn !== 'undefined'
      && typeof currentLanesOut !== 'undefined') {
    const specs = getLaneSpecs(currentLanesIn, currentLanesOut);
    if (specs && specs.length) {
      let maxAbs = 0;
      for (let i = 0; i < specs.length; i++) {
        const a = Math.abs(specs[i].offset);
        if (a > maxAbs) maxAbs = a;
      }
      return maxAbs + 0.75 + 1.25;
    }
  }
  return 6;
}

function cutParkingByRoad(ax, ay, bx, by, halfW) {
  if (!parkingBays.length) return false;
  if (ax === bx && ay === by) return false;
  const half = halfW != null ? halfW : roadHalfWidthForCut(null);
  let changed = false;
  const next = [];
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    const pieces = splitBayByRoad(bay, ax, ay, bx, by, half);
    if (pieces === null) {
      next.push(bay);
      continue;
    }
    changed = true;
    for (let p = 0; p < pieces.length; p++) next.push(pieces[p]);
  }
  if (!changed) return false;
  parkingBays = next;
  redrawAllParking();
  if (typeof persistParkingToStore === 'function') persistParkingToStore();
  return true;
}

function buildParkingBayFromPick(pick, count) {
  const n = Math.max(1, count | 0);
  const L = parkSpotLength();
  const span = n * L;
  const dir = pick.dragSign >= 0 ? 1 : -1;
  const ux = pick.ux * dir;
  const uy = pick.uy * dir;
  return {
    id: 0,
    kind: 'parallel',
    x1: pick.cx,
    y1: pick.cy,
    x2: pick.cx + ux * span,
    y2: pick.cy + uy * span,
    ux,
    uy,
    nx: pick.nx,
    ny: pick.ny,
    count: n,
    spotLength: L,
    spotDepth: parkSpotDepth(),
    segId: pick.seg ? pick.seg.id : null,
    side: pick.side
  };
}

function parkingClearRange(seg) {
  const x1 = seg.startNode.x, y1 = seg.startNode.y;
  const x2 = seg.endNode.x, y2 = seg.endNode.y;
  const len = Math.hypot(x2 - x1, y2 - y1);
  let minA = 0;
  let maxA = len;
  const pad = typeof STUB_R !== 'undefined' ? STUB_R : 13;
  if (typeof nodes !== 'undefined' && typeof getNodeKey === 'function') {
    const sn = nodes.get(getNodeKey(x1, y1));
    const en = nodes.get(getNodeKey(x2, y2));
    if (sn && sn.count > 1) {
      const inset = typeof getStubInset === 'function' ? getStubInset(seg, 'start') : pad;
      minA = Math.max(minA, inset);
    }
    if (en && en.count > 1) {
      const inset = typeof getStubInset === 'function' ? getStubInset(seg, 'end') : pad;
      maxA = Math.min(maxA, len - inset);
    }
  }
  if (maxA < minA) return { minA: 0, maxA: 0, len };
  return { minA, maxA, len };
}

function projectAlongSeg(seg, x, y) {
  const x1 = seg.startNode.x, y1 = seg.startNode.y;
  const x2 = seg.endNode.x, y2 = seg.endNode.y;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return 0;
  return ((x - x1) * dx + (y - y1) * dy) / len;
}

function bayAlongInterval(bay, seg) {
  if (!bay || !seg) return null;
  const a0 = projectAlongSeg(seg, bay.x1, bay.y1);
  const a1 = projectAlongSeg(seg, bay.x2, bay.y2);
  return { a0: Math.min(a0, a1), a1: Math.max(a0, a1) };
}

function segmentsIntersect(a, b, c, d) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const cdx = d.x - c.x, cdy = d.y - c.y;
  const den = abx * cdy - aby * cdx;
  if (Math.abs(den) < 1e-9) return false;
  const acx = c.x - a.x, acy = c.y - a.y;
  const t = (acx * cdy - acy * cdx) / den;
  const u = (acx * aby - acy * abx) / den;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}

function pointInQuad(p, q) {
  let cross = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (i === 0) cross = c;
    else if (c * cross < 0) return false;
  }
  return true;
}

function quadsOverlap(a, b) {
  for (let i = 0; i < 4; i++) {
    const a0 = a[i], a1 = a[(i + 1) % 4];
    for (let j = 0; j < 4; j++) {
      if (segmentsIntersect(a0, a1, b[j], b[(j + 1) % 4])) return true;
    }
  }
  if (pointInQuad(a[0], b) || pointInQuad(b[0], a)) return true;
  return false;
}

function stallsOverlapBays(bayA, bayB) {
  if (!bayA || !bayB) return false;
  for (let i = 0; i < bayA.count; i++) {
    const ca = parkingBayCorners(bayA, i);
    for (let j = 0; j < bayB.count; j++) {
      if (quadsOverlap(ca, parkingBayCorners(bayB, j))) return true;
    }
  }
  return false;
}

function bayOverlapsExisting(bay) {
  for (let i = 0; i < parkingBays.length; i++) {
    if (stallsOverlapBays(bay, parkingBays[i])) return true;
  }
  return false;
}

function bayHitsIntersection(bay, seg) {
  if (!bay || !seg) return false;
  const clear = parkingClearRange(seg);
  const iv = bayAlongInterval(bay, seg);
  if (!iv) return false;
  return iv.a0 < clear.minA - 0.35 || iv.a1 > clear.maxA + 0.35;
}

function occupiedLimitAlong(seg, side, startAlong, dragSign) {
  const clear = parkingClearRange(seg);
  let limit = dragSign >= 0 ? clear.maxA : clear.minA;
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (bay.segId !== seg.id) continue;
    if (bay.side !== side) continue;
    const iv = bayAlongInterval(bay, seg);
    if (!iv) continue;
    if (dragSign >= 0) {
      if (iv.a1 <= startAlong + 0.05) continue;
      limit = Math.min(limit, iv.a0);
    } else {
      if (iv.a0 >= startAlong - 0.05) continue;
      limit = Math.max(limit, iv.a1);
    }
  }
  return limit;
}

function maxParkingSpots(pick, dragSign) {
  if (!pick || !pick.seg) return 0;
  const spotL = parkSpotLength();
  const clear = parkingClearRange(pick.seg);
  if (clear.maxA - clear.minA < spotL * 0.5) return 0;
  const start = pick.along;
  if (start < clear.minA - 0.05 || start > clear.maxA + 0.05) return 0;

  const limit = occupiedLimitAlong(pick.seg, pick.side, start, dragSign);
  let avail = dragSign >= 0 ? (limit - start) : (start - limit);
  let n = Math.floor(avail / spotL + 1e-9);
  if (n < 1) return 0;

  while (n >= 1) {
    const bay = buildParkingBayFromPick(Object.assign({}, pick, { dragSign }), n);
    if (!bayHitsIntersection(bay, pick.seg) && !bayOverlapsExisting(bay)) return n;
    n--;
  }
  return 0;
}

function resolveParkingPick(wx, wy) {
  if (!segments || !segments.length) return null;
  const spotL = parkSpotLength();
  const scale = (typeof view !== 'undefined' && view.scale) ? view.scale : 1;
  const magnet = Math.max(18, 40 / Math.max(scale, 0.01));
  let best = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const x1 = seg.startNode.x, y1 = seg.startNode.y;
    const x2 = seg.endNode.x, y2 = seg.endNode.y;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < spotL * 0.5) continue;
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    const clear = parkingClearRange(seg);
    if (clear.maxA - clear.minA < spotL * 0.5) continue;

    let along = (wx - x1) * ux + (wy - y1) * uy;
    along = Math.max(clear.minA, Math.min(clear.maxA, along));
    const cx = x1 + ux * along;
    const cy = y1 + uy * along;
    const sideDot = (wx - cx) * px + (wy - cy) * py;
    const side = sideDot >= 0 ? 1 : -1;
    const curbOff = parkingCurbOffset(seg, side);
    const parkHalf = Math.abs(curbOff);
    const bedHalf = roadBedHalfWidth(seg);
    const outerHalf = Math.max(parkHalf, bedHalf);
    const radial = Math.abs(sideDot);
    const distToCurb = Math.abs(sideDot - curbOff);
    const distToCenter = Math.hypot(wx - cx, wy - cy);

    if (distToCenter > outerHalf + magnet) continue;
    if (radial < parkHalf * 0.15 && distToCurb > magnet * 0.35) continue;

    const curb = parkingCurbPoint(seg, along, side);
    const candidate = {
      seg,
      side,
      ux: curb.ux,
      uy: curb.uy,
      nx: curb.nx,
      ny: curb.ny,
      half: curb.half,
      len: curb.len,
      along: curb.along,
      cx: curb.x,
      cy: curb.y,
      dist: distToCurb,
      score: distToCurb + (radial < parkHalf ? parkHalf - radial : 0) * 0.25,
      roomFwd: 0,
      roomBack: 0,
      dragSign: 1
    };
    candidate.roomFwd = maxParkingSpots(candidate, 1);
    candidate.roomBack = maxParkingSpots(candidate, -1);
    if (candidate.roomFwd < 1 && candidate.roomBack < 1) continue;
    candidate.dragSign = candidate.roomFwd >= 1 ? 1 : -1;

    if (!best || candidate.score < best.score) best = candidate;
  }
  return best;
}

function drawParkingPreview(pick, count) {
  clearParkingGhost();
  if (!pick) return;
  const n = Math.max(0, count | 0);
  if (n < 1) return;
  parkingGhostBay = buildParkingBayFromPick(pick, n);
}

function commitParkingDraft() {
  if (!parkingDraft || parkingDraft.count < 1) {
    cancelParkingDraft();
    return false;
  }
  if (parkingHover && parkingHover.seg) {
    if (bayHitsIntersection(parkingDraft, parkingHover.seg) || bayOverlapsExisting(parkingDraft)) {
      cancelParkingDraft();
      return false;
    }
  } else if (bayOverlapsExisting(parkingDraft)) {
    cancelParkingDraft();
    return false;
  }
  const bay = {
    id: parkingCounter++,
    kind: 'parallel',
    x1: parkingDraft.x1,
    y1: parkingDraft.y1,
    x2: parkingDraft.x2,
    y2: parkingDraft.y2,
    ux: parkingDraft.ux,
    uy: parkingDraft.uy,
    nx: parkingDraft.nx,
    ny: parkingDraft.ny,
    count: parkingDraft.count,
    spotLength: parkingDraft.spotLength,
    spotDepth: parkingDraft.spotDepth,
    segId: parkingDraft.segId,
    side: parkingDraft.side
  };
  parkingBays.push(bay);
  parkingDraft = null;
  parkingDragging = false;
  parkingPointerDown = false;
  parkingDragMoved = false;
  parkingIgnoreClick = true;
  parkingHover = null;
  clearParkingGhost();
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
  updateParkingHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
  if (typeof persistParkingToStore === 'function') persistParkingToStore();
  return true;
}

/** Eligible: under 3 lanes, or asymmetrical roads with 3+ lanes (e.g. 1+2, 0+3). */
function segmentEligibleForAutoParking(seg) {
  if (!seg) return false;
  const dirs = typeof getRoadDirs === 'function'
    ? getRoadDirs(seg)
    : {
      lanesIn: Math.max(0, seg.lanesIn || 0),
      lanesOut: Math.max(0, seg.lanesOut || 0)
    };
  const li = dirs.lanesIn | 0;
  const lo = dirs.lanesOut | 0;
  const total = li + lo;
  if (total < 1) return false;
  if (total < 3) return true;
  return li !== lo;
}

function removeParkingForSegment(segId) {
  if (segId == null || !parkingBays.length) return false;
  let changed = false;
  const next = [];
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (bay.segId === segId) {
      changed = true;
    } else {
      next.push(bay);
    }
  }
  if (changed) parkingBays = next;
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
  return changed;
}

function findSegmentByIdLocal(segId) {
  if (segId == null || typeof segments === 'undefined' || !segments) return null;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].id === segId) return segments[i];
  }
  return null;
}

/** Flat list of stalls on one curb, sorted along the road. */
function collectParkingStallsOnSide(segId, side) {
  const seg = findSegmentByIdLocal(segId);
  const list = [];
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    if (!bay || bay.segId !== segId || bay.side !== side || bay.count < 1) continue;
    for (let i = 0; i < bay.count; i++) {
      const corners = parkingBayCorners(bay, i);
      const cx = (corners[0].x + corners[2].x) * 0.5;
      const cy = (corners[0].y + corners[2].y) * 0.5;
      let along = i + b * 1000;
      if (seg) along = projectAlongSeg(seg, cx, cy);
      else {
        const dx = bay.x2 - bay.x1, dy = bay.y2 - bay.y1;
        const len = Math.hypot(dx, dy) || 1;
        along = ((cx - bay.x1) * dx + (cy - bay.y1) * dy) / len;
      }
      list.push({ bay, bayId: bay.id, stallIndex: i, along, corners, cx, cy });
    }
  }
  list.sort((a, b) => a.along - b.along || a.bayId - b.bayId || a.stallIndex - b.stallIndex);
  return list;
}

function hitTestParkingStall(wx, wy) {
  if (!parkingBays.length) return null;
  const scale = (typeof view !== 'undefined' && view.scale) ? view.scale : 1;
  const magnet = Math.max(4.5, 14 / Math.max(scale, 0.01));
  let best = null;
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    if (!bay || bay.count < 1) continue;
    for (let i = 0; i < bay.count; i++) {
      const corners = parkingBayCorners(bay, i);
      const cx = (corners[0].x + corners[2].x) * 0.5;
      const cy = (corners[0].y + corners[2].y) * 0.5;
      const inside = pointInQuad({ x: wx, y: wy }, corners);
      const dist = Math.hypot(wx - cx, wy - cy);
      if (!inside && dist > magnet) continue;
      const score = inside ? dist * 0.25 : dist;
      if (!best || score < best.score) {
        best = { bay, stallIndex: i, corners, cx, cy, dist, score, inside };
      }
    }
  }
  return best;
}

function syncParkingDeleteHighlight() {
  if (!parkingDeleteEdit) {
    parkingDeleteHighlight = null;
    return;
  }
  const { stalls, i0, i1 } = parkingDeleteEdit;
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  const marks = [];
  for (let i = lo; i <= hi; i++) {
    if (stalls[i]) marks.push(stalls[i].corners);
  }
  parkingDeleteHighlight = marks;
}

function cancelParkingDeleteEdit() {
  const was = !!parkingDeleteEdit;
  parkingDeleteEdit = null;
  parkingDeleteHighlight = null;
  return was;
}

function beginParkingDeleteEdit(wx, wy) {
  const hit = hitTestParkingStall(wx, wy);
  if (!hit) return false;
  const stalls = collectParkingStallsOnSide(hit.bay.segId, hit.bay.side);
  let anchor = -1;
  for (let i = 0; i < stalls.length; i++) {
    if (stalls[i].bayId === hit.bay.id && stalls[i].stallIndex === hit.stallIndex) {
      anchor = i;
      break;
    }
  }
  if (anchor < 0) return false;
  parkingDeleteEdit = {
    segId: hit.bay.segId,
    side: hit.bay.side,
    stalls,
    anchor,
    i0: anchor,
    i1: anchor
  };
  syncParkingDeleteHighlight();
  return true;
}

function updateParkingDeleteEdit(wx, wy) {
  if (!parkingDeleteEdit) return false;
  const { stalls, segId, side, anchor } = parkingDeleteEdit;
  // Prefer stall under cursor on the same curb; else nearest along-road on that curb
  const hit = hitTestParkingStall(wx, wy);
  let target = anchor;
  if (hit && hit.bay.segId === segId && hit.bay.side === side) {
    for (let i = 0; i < stalls.length; i++) {
      if (stalls[i].bayId === hit.bay.id && stalls[i].stallIndex === hit.stallIndex) {
        target = i;
        break;
      }
    }
  } else {
    const seg = findSegmentByIdLocal(segId);
    if (seg) {
      const along = projectAlongSeg(seg, wx, wy);
      let bestI = anchor;
      let bestD = Infinity;
      for (let i = 0; i < stalls.length; i++) {
        const d = Math.abs(stalls[i].along - along);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      target = bestI;
    }
  }
  parkingDeleteEdit.i0 = Math.min(anchor, target);
  parkingDeleteEdit.i1 = Math.max(anchor, target);
  syncParkingDeleteHighlight();
  return true;
}

/** Remove a set of stalls (by bay id + index), keeping leftover runs as new bays. */
function deleteParkingStallRefs(refs) {
  if (!refs || !refs.length) return false;
  const remove = new Map(); // bayId -> Set(stallIndex)
  for (let i = 0; i < refs.length; i++) {
    const r = refs[i];
    if (!r || r.bayId == null) continue;
    let set = remove.get(r.bayId);
    if (!set) { set = new Set(); remove.set(r.bayId, set); }
    set.add(r.stallIndex);
  }
  if (!remove.size) return false;

  const next = [];
  let changed = false;
  for (let b = 0; b < parkingBays.length; b++) {
    const bay = parkingBays[b];
    const kill = remove.get(bay.id);
    if (!kill) {
      next.push(bay);
      continue;
    }
    changed = true;
    let runStart = -1;
    for (let i = 0; i <= bay.count; i++) {
      const keep = i < bay.count && !kill.has(i);
      if (keep && runStart < 0) runStart = i;
      if (!keep && runStart >= 0) {
        const piece = bayFromSpotRange(bay, runStart, i - 1);
        if (piece) next.push(piece);
        runStart = -1;
      }
    }
  }
  if (!changed) return false;
  parkingBays = next;
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
  if (typeof redrawAllParking === 'function') redrawAllParking();
  if (typeof updateParkingHud === 'function') updateParkingHud();
  return true;
}

function commitParkingDeleteEdit() {
  if (!parkingDeleteEdit) return false;
  const { stalls, i0, i1 } = parkingDeleteEdit;
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  const refs = [];
  for (let i = lo; i <= hi; i++) {
    if (stalls[i]) refs.push({ bayId: stalls[i].bayId, stallIndex: stalls[i].stallIndex });
  }
  parkingDeleteEdit = null;
  parkingDeleteHighlight = null;
  return deleteParkingStallRefs(refs);
}

/** True when cursor is over parking (so delete mode can prefer stall brush over road). */
function parkingDeleteHitAt(wx, wy) {
  return !!hitTestParkingStall(wx, wy);
}

function commitAutoParkingBay(draft) {
  if (!draft || draft.count < 1) return null;
  const bay = {
    id: parkingCounter++,
    kind: 'parallel',
    x1: draft.x1,
    y1: draft.y1,
    x2: draft.x2,
    y2: draft.y2,
    ux: draft.ux,
    uy: draft.uy,
    nx: draft.nx,
    ny: draft.ny,
    count: draft.count,
    spotLength: draft.spotLength,
    spotDepth: draft.spotDepth,
    segId: draft.segId,
    side: draft.side
  };
  parkingBays.push(bay);
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
  return bay;
}

/** Softer junction insets so short blocks between nodes can still fit stalls. */
function parkingClearRangeAuto(seg) {
  const x1 = seg.startNode.x, y1 = seg.startNode.y;
  const x2 = seg.endNode.x, y2 = seg.endNode.y;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const spotL = parkSpotLength();
  let minA = 0;
  let maxA = len;
  const hardPad = typeof STUB_R !== 'undefined' ? STUB_R : 13;
  const softPad = Math.max(
    typeof NODE_R !== 'undefined' ? NODE_R * 1.15 : 8,
    hardPad * 0.45
  );
  if (typeof nodes !== 'undefined' && typeof getNodeKey === 'function') {
    const sn = nodes.get(getNodeKey(x1, y1));
    const en = nodes.get(getNodeKey(x2, y2));
    if (sn && sn.count > 1) {
      let inset = typeof getStubInset === 'function' ? getStubInset(seg, 'start') : hardPad;
      inset = Math.min(inset, softPad);
      minA = Math.max(minA, inset);
    }
    if (en && en.count > 1) {
      let inset = typeof getStubInset === 'function' ? getStubInset(seg, 'end') : hardPad;
      inset = Math.min(inset, softPad);
      maxA = Math.min(maxA, len - inset);
    }
  }
  // If still too tight for one stall but the road is long enough, relax further
  if (maxA - minA < spotL * 0.9 && len >= spotL * 1.05) {
    const target = Math.min(len, spotL * 1.05);
    const mid = len * 0.5;
    minA = Math.max(0, mid - target * 0.5);
    maxA = Math.min(len, mid + target * 0.5);
  }
  if (maxA < minA) return { minA: 0, maxA: 0, len };
  return { minA, maxA, len };
}

function maxParkingSpotsInClear(pick, dragSign, clear) {
  if (!pick || !pick.seg) return 0;
  const spotL = parkSpotLength();
  if (!clear || clear.maxA - clear.minA < spotL * 0.5) return 0;
  const start = pick.along;
  if (start < clear.minA - 0.05 || start > clear.maxA + 0.05) return 0;

  let limit = dragSign >= 0 ? clear.maxA : clear.minA;
  for (let i = 0; i < parkingBays.length; i++) {
    const bay = parkingBays[i];
    if (bay.segId !== pick.seg.id || bay.side !== pick.side) continue;
    const iv = bayAlongInterval(bay, pick.seg);
    if (!iv) continue;
    if (dragSign >= 0) {
      if (iv.a1 <= start + 0.05) continue;
      limit = Math.min(limit, iv.a0);
    } else {
      if (iv.a0 >= start - 0.05) continue;
      limit = Math.max(limit, iv.a1);
    }
  }

  let avail = dragSign >= 0 ? (limit - start) : (start - limit);
  let n = Math.floor(avail / spotL + 1e-9);
  if (n < 1) return 0;

  while (n >= 1) {
    const bay = buildParkingBayFromPick(Object.assign({}, pick, { dragSign }), n);
    const iv = bayAlongInterval(bay, pick.seg);
    const inClear = iv && iv.a0 >= clear.minA - 0.4 && iv.a1 <= clear.maxA + 0.4;
    if (inClear && !bayOverlapsExisting(bay)) return n;
    n--;
  }
  return 0;
}

function autoParkAlongSide(seg, side) {
  if (!seg) return 0;
  const spotL = parkSpotLength();
  const clear = parkingClearRangeAuto(seg);
  if (clear.maxA - clear.minA < spotL * 0.55) return 0;

  let along = clear.minA;
  let added = 0;
  let guard = 0;
  const step = spotL * 0.28;

  while (along + spotL * 0.55 <= clear.maxA + 1e-6 && guard++ < 80) {
    const curb = parkingCurbPoint(seg, along, side);
    const pick = {
      seg,
      side,
      ux: curb.ux,
      uy: curb.uy,
      nx: curb.nx,
      ny: curb.ny,
      half: curb.half,
      len: curb.len,
      along: curb.along,
      cx: curb.x,
      cy: curb.y,
      dragSign: 1
    };
    const n = maxParkingSpotsInClear(pick, 1, clear);
    if (n < 1) {
      along += step;
      continue;
    }
    const draft = buildParkingBayFromPick(pick, n);
    if (bayOverlapsExisting(draft)) {
      along += step;
      continue;
    }
    commitAutoParkingBay(draft);
    added += n;
    const iv = bayAlongInterval(draft, seg);
    along = (iv ? iv.a1 : along + n * spotL) + 0.08;
  }
  return added;
}

function autoParkAlongSegment(seg) {
  if (!segmentEligibleForAutoParking(seg)) return 0;
  return autoParkAlongSide(seg, 1) + autoParkAlongSide(seg, -1);
}

async function applyParkingToAllRoads(onProgress) {
  const list = (typeof segments !== 'undefined' && segments) ? segments.slice() : [];
  // Longer roads first so short stubs lose less to corner overlap checks
  list.sort((a, b) => {
    const la = Math.hypot(a.endNode.x - a.startNode.x, a.endNode.y - a.startNode.y);
    const lb = Math.hypot(b.endNode.x - b.startNode.x, b.endNode.y - b.startNode.y);
    return lb - la;
  });
  const total = Math.max(1, list.length);
  let spots = 0;
  let roads = 0;
  let cleared = 0;
  let eligible = 0;

  // Strip existing parking on eligible roads (and orphans on those ids) up front
  for (let i = 0; i < list.length; i++) {
    if (!segmentEligibleForAutoParking(list[i])) continue;
    eligible++;
    if (removeParkingForSegment(list[i].id)) cleared++;
  }

  for (let i = 0; i < list.length; i++) {
    const seg = list[i];
    if (typeof onProgress === 'function') {
      onProgress((i + 0.15) / total, 'Optimizing road ' + (i + 1) + ' / ' + list.length + '…');
    }
    if (segmentEligibleForAutoParking(seg)) {
      const n = autoParkAlongSegment(seg);
      if (n > 0) {
        spots += n;
        roads++;
      }
    }
    if (i % 2 === 0) {
      await new Promise(r => requestAnimationFrame(r));
    }
  }

  redrawAllParking();
  updateParkingHud();
  if (typeof onProgress === 'function') {
    onProgress(1, 'Done · ' + spots + ' spots on ' + roads + ' / ' + eligible + ' roads');
  }
  if (typeof persistParkingToStore === 'function') persistParkingToStore();
  return { spots, roads, cleared, total: list.length, eligible };
}

function cancelParkingDraft() {
  parkingDraft = null;
  parkingDragging = false;
  parkingPointerDown = false;
  parkingDragMoved = false;
  parkingIgnoreClick = false;
  clearParkingGhost();
  updateParkingHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function beginParkingAt(pick) {
  const dragSign = pick.dragSign || 1;
  const room = maxParkingSpots(pick, dragSign);
  if (room < 1) return false;
  parkingHover = {
    seg: pick.seg,
    side: pick.side,
    ux: pick.ux,
    uy: pick.uy,
    nx: pick.nx,
    ny: pick.ny,
    half: pick.half,
    len: pick.len,
    along: pick.along,
    cx: pick.cx,
    cy: pick.cy,
    roomFwd: pick.roomFwd,
    roomBack: pick.roomBack,
    dragSign
  };
  parkingDragging = true;
  parkingPointerDown = true;
  parkingDragMoved = false;
  parkingIgnoreClick = true;
  parkingDraft = buildParkingBayFromPick(parkingHover, 1);
  drawParkingPreview(parkingHover, 1);
  updateParkingHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
  return true;
}

function updateParkingHud() {
  const hud = document.getElementById('parking-hud');
  if (!hud) return;
  hud.classList.toggle('visible', parkingMode);
  if (!parkingMode) return;
  const meta = hud.querySelector('.parking-meta');
  if (!meta) return;
  if (parkingDragging && parkingDraft) {
    meta.innerHTML = `Drag along curb · ${parkingDraft.count} spot${parkingDraft.count === 1 ? '' : 's'} · release or click to place · right-click cancel`;
  } else {
    meta.innerHTML = `Click & drag along curb · or click, move, click · right-click / <kbd>Esc</kbd> exit`;
  }
}

function setParkingMode(on) {
  const next = !!on;
  if (next === parkingMode) {
    updateParkingHud();
    syncParkingToolButton();
    return;
  }
  parkingMode = next;
  if (parkingMode) {
    if (typeof setZoneMode === 'function' && typeof zoneMode !== 'undefined' && zoneMode) {
      setZoneMode(false);
    }
    if (typeof setBuildMode === 'function') setBuildMode(false);
    if (typeof setDeleteMode === 'function') setDeleteMode(false);
    if (typeof setUpgradeMode === 'function') setUpgradeMode(false);
    if (typeof driveMode !== 'undefined' && driveMode && typeof toggleDriveMode === 'function') {
      toggleDriveMode();
    }
    if (typeof clearSignalSelection === 'function') clearSignalSelection();
  } else {
    cancelParkingDraft();
    parkingHover = null;
    clearParkingGhost();
  }
  if (board) board.classList.toggle('parking-mode', parkingMode);
  syncParkingToolButton();
  updateParkingHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function syncParkingToolButton() {
  const btn = document.getElementById('btn-parking-tool');
  if (btn) btn.classList.toggle('active', parkingMode);
}

function toggleParkingMode(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setParkingMode(!parkingMode);
}

function updateParkingStretch(worldPt) {
  const pick0 = parkingHover;
  if (!pick0 || !pick0.seg) return;
  const x1 = pick0.seg.startNode.x;
  const y1 = pick0.seg.startNode.y;
  const along = (worldPt.x - x1) * pick0.ux + (worldPt.y - y1) * pick0.uy;
  const delta = along - pick0.along;
  const spotL = parkSpotLength();
  let dragSign = delta >= 0 ? 1 : -1;
  if (Math.abs(delta) < spotL * 0.08) dragSign = pick0.dragSign || 1;
  let count = Math.max(1, Math.floor(Math.abs(delta) / spotL) + 1);
  const maxSpots = maxParkingSpots(pick0, dragSign);
  if (maxSpots < 1) {
    const alt = maxParkingSpots(pick0, -dragSign);
    if (alt >= 1) {
      dragSign = -dragSign;
      count = Math.min(count, alt);
    } else {
      clearParkingGhost();
      parkingDraft = null;
      updateParkingHud();
      return;
    }
  } else {
    count = Math.min(count, maxSpots);
  }
  if (Math.abs(delta) > spotL * 0.15) parkingDragMoved = true;
  const livePick = Object.assign({}, pick0, { dragSign });
  parkingDraft = buildParkingBayFromPick(livePick, count);
  drawParkingPreview(livePick, count);
  updateParkingHud();
}

function handleParkingMouseMove(worldPt) {
  if (!parkingMode) return false;
  if (parkingDragging && parkingHover) {
    updateParkingStretch(worldPt);
    return true;
  }
  const pick = resolveParkingPick(worldPt.x, worldPt.y);
  parkingHover = pick;
  if (pick) drawParkingPreview(pick, 1);
  else clearParkingGhost();
  return true;
}

function handleParkingMouseDown(event) {
  if (!parkingMode) return false;
  if (typeof spaceHeld !== 'undefined' && spaceHeld) return false;
  if (event.button !== 0) return false;
  const worldPt = screenToWorld(event.clientX, event.clientY);
  if (parkingDragging && parkingHover) {
    parkingPointerDown = true;
    updateParkingStretch(worldPt);
    return true;
  }
  const pick = resolveParkingPick(worldPt.x, worldPt.y);
  if (!pick) return true;
  beginParkingAt(pick);
  return true;
}

function handleParkingMouseUp(event) {
  if (!parkingMode) return false;
  if (event.button !== 0) return false;
  if (!parkingDragging) return false;
  const worldPt = screenToWorld(event.clientX, event.clientY);
  updateParkingStretch(worldPt);
  parkingPointerDown = false;
  if (parkingDragMoved && parkingDraft && parkingDraft.count >= 1) {
    commitParkingDraft();
    if (typeof suppressClick !== 'undefined') suppressClick = true;
  }
  return true;
}

function handleParkingClick(event) {
  if (!parkingMode) return false;
  if (typeof suppressClick !== 'undefined' && suppressClick) return true;
  if (typeof spaceHeld !== 'undefined' && spaceHeld) return true;
  if (event.button != null && event.button !== 0) return true;

  if (parkingIgnoreClick) {
    parkingIgnoreClick = false;
    return true;
  }

  const worldPt = screenToWorld(event.clientX, event.clientY);
  if (parkingDragging && parkingHover) {
    updateParkingStretch(worldPt);
    if (parkingDraft && parkingDraft.count >= 1) commitParkingDraft();
    else cancelParkingDraft();
    return true;
  }

  const pick = resolveParkingPick(worldPt.x, worldPt.y);
  if (!pick) return true;
  if (!beginParkingAt(pick)) return true;
  parkingPointerDown = false;
  return true;
}

function handleParkingEscape() {
  if (!parkingMode) return false;
  if (parkingDragging || parkingDraft) {
    cancelParkingDraft();
    return true;
  }
  setParkingMode(false);
  return true;
}

function handleParkingRightClick(event) {
  if (!parkingMode) return false;
  if (parkingDragging || parkingDraft) {
    cancelParkingDraft();
    return true;
  }
  setParkingMode(false);
  return true;
}

function serializeParking() {
  return parkingBays.map(b => ({
    id: b.id,
    kind: b.kind || 'parallel',
    x1: b.x1,
    y1: b.y1,
    x2: b.x2,
    y2: b.y2,
    ux: b.ux,
    uy: b.uy,
    nx: b.nx,
    ny: b.ny,
    count: b.count,
    spotLength: b.spotLength,
    spotDepth: b.spotDepth,
    segId: b.segId,
    side: b.side
  }));
}

function loadParking(saved) {
  clearParking(false);
  if (!Array.isArray(saved)) return;
  let maxId = 0;
  saved.forEach(raw => {
    if (!raw || raw.count < 1) return;
    const id = (raw.id | 0) || parkingCounter++;
    maxId = Math.max(maxId, id);
    const bay = {
      id,
      kind: raw.kind || 'parallel',
      x1: Number(raw.x1),
      y1: Number(raw.y1),
      x2: Number(raw.x2),
      y2: Number(raw.y2),
      ux: Number(raw.ux),
      uy: Number(raw.uy),
      nx: Number(raw.nx),
      ny: Number(raw.ny),
      count: raw.count | 0,
      spotLength: Number(raw.spotLength) || parkSpotLength(),
      spotDepth: Number(raw.spotDepth) || parkSpotDepth(),
      segId: raw.segId != null ? raw.segId : null,
      side: raw.side != null ? raw.side : 1
    };
    if (!isFinite(bay.x1) || !isFinite(bay.y1) || !isFinite(bay.ux) || !isFinite(bay.uy)) return;
    const ulen = Math.hypot(bay.ux, bay.uy);
    if (ulen < 1e-9) return;
    bay.ux /= ulen;
    bay.uy /= ulen;
    const nlen = Math.hypot(bay.nx, bay.ny);
    if (nlen > 1e-9) {
      bay.nx /= nlen;
      bay.ny /= nlen;
    }
    parkingBays.push(bay);
  });
  parkingCounter = Math.max(parkingCounter, maxId + 1);
  redrawAllParking();
}

function clearParking(updateUi) {
  cancelParkingDraft();
  parkingBays = [];
  parkingCounter = 1;
  parkingGhostBay = null;
  if (typeof invalidateParkingBayIndex === 'function') invalidateParkingBayIndex();
  if (updateUi !== false) updateParkingHud();
}

function installParkingToolbar() {
  const tools = document.querySelector('#road-toolbar .road-tools');
  let btn = document.getElementById('btn-parking-tool');
  if (!btn && tools) {
    const wrap = document.createElement('div');
    wrap.className = 'parking-tool-wrap';
    wrap.innerHTML = `
      <button class="lane-btn parking-tool-btn" id="btn-parking-tool" type="button" title="Parallel parking">
        <span class="parking-stall-icon" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
      </button>
    `;
    const zoneWrap = tools.querySelector('.zone-tool-wrap');
    if (zoneWrap && zoneWrap.parentNode === tools) {
      if (zoneWrap.nextSibling) tools.insertBefore(wrap, zoneWrap.nextSibling);
      else tools.appendChild(wrap);
    } else {
      tools.appendChild(wrap);
    }
    btn = document.getElementById('btn-parking-tool');
  }

  if (btn && !btn._parkingBound) {
    btn._parkingBound = true;
    btn.addEventListener('click', toggleParkingMode);
  }

  const zoneWrap = tools && tools.querySelector('.zone-tool-wrap');
  if (btn && zoneWrap && btn.parentNode === tools) {
    if (zoneWrap.nextSibling !== btn) {
      if (zoneWrap.nextSibling) tools.insertBefore(btn, zoneWrap.nextSibling);
      else tools.appendChild(btn);
    }
  }

  if (!document.getElementById('parking-hud')) {
    const hud = document.createElement('div');
    hud.id = 'parking-hud';
    hud.innerHTML = `
      <span class="parking-dot"></span>
      <span class="parking-title">PARKING</span>
      <span class="parking-meta">Parallel curb parking</span>
    `;
    document.body.appendChild(hud);
  }
}

function patchParkingModeExclusivity() {
  if (typeof setZoneMode === 'function' && !setZoneMode._parkingPatched) {
    const orig = setZoneMode;
    function wrappedSetZoneMode(on) {
      if (on && parkingMode) {
        parkingMode = false;
        cancelParkingDraft();
        if (board) board.classList.remove('parking-mode');
        syncParkingToolButton();
        updateParkingHud();
      }
      return orig(on);
    }
    wrappedSetZoneMode._parkingPatched = true;
    setZoneMode = wrappedSetZoneMode;
  }
  if (typeof setBuildMode === 'function' && !setBuildMode._parkingPatched) {
    const orig = setBuildMode;
    function wrappedSetBuildMode(on) {
      if (on && parkingMode) {
        parkingMode = false;
        cancelParkingDraft();
        if (board) board.classList.remove('parking-mode');
        syncParkingToolButton();
        updateParkingHud();
      }
      return orig(on);
    }
    wrappedSetBuildMode._parkingPatched = true;
    setBuildMode = wrappedSetBuildMode;
  }
  if (typeof setDeleteMode === 'function' && !setDeleteMode._parkingPatched) {
    const orig = setDeleteMode;
    function wrappedSetDeleteMode(on) {
      if (on && parkingMode) {
        parkingMode = false;
        cancelParkingDraft();
        if (board) board.classList.remove('parking-mode');
        syncParkingToolButton();
        updateParkingHud();
      }
      return orig(on);
    }
    wrappedSetDeleteMode._parkingPatched = true;
    setDeleteMode = wrappedSetDeleteMode;
  }
  if (typeof setUpgradeMode === 'function' && !setUpgradeMode._parkingPatched) {
    const orig = setUpgradeMode;
    function wrappedSetUpgradeMode(on) {
      if (on && parkingMode) {
        parkingMode = false;
        cancelParkingDraft();
        if (board) board.classList.remove('parking-mode');
        syncParkingToolButton();
        updateParkingHud();
      }
      return orig(on);
    }
    wrappedSetUpgradeMode._parkingPatched = true;
    setUpgradeMode = wrappedSetUpgradeMode;
  }
  if (typeof toggleDriveMode === 'function' && !toggleDriveMode._parkingPatched) {
    const orig = toggleDriveMode;
    function wrappedToggleDriveMode() {
      const was = typeof driveMode !== 'undefined' && driveMode;
      const result = orig();
      if (!was && typeof driveMode !== 'undefined' && driveMode && parkingMode) {
        parkingMode = false;
        cancelParkingDraft();
        if (board) board.classList.remove('parking-mode');
        syncParkingToolButton();
        updateParkingHud();
      }
      return result;
    }
    wrappedToggleDriveMode._parkingPatched = true;
    toggleDriveMode = wrappedToggleDriveMode;
  }
  if (typeof updateRoadToolbar === 'function' && !updateRoadToolbar._parkingPatched) {
    const orig = updateRoadToolbar;
    function wrappedUpdateRoadToolbar() {
      const result = orig();
      const hint = document.getElementById('road-toolbar-hint');
      if (hint && parkingMode) {
        hint.style.color = PARK_ACCENT;
        if (parkingDragging && parkingDraft) {
          hint.textContent = `Parking · ${parkingDraft.count} parallel spot${parkingDraft.count === 1 ? '' : 's'} · click to place · Esc cancel`;
        } else {
          hint.textContent = `Parking · click curb, move along side, click again · ${PARK_SPOT_LEN_MUL * 100}% car length · Esc exit`;
        }
      }
      syncParkingToolButton();
      return result;
    }
    wrappedUpdateRoadToolbar._parkingPatched = true;
    updateRoadToolbar = wrappedUpdateRoadToolbar;
  }
  if (typeof serializeCurrentMap === 'function' && !serializeCurrentMap._parkingPatched) {
    const orig = serializeCurrentMap;
    function wrappedSerializeCurrentMap(name) {
      const data = orig(name);
      data.parking = serializeParking();
      data.parkingCounter = parkingCounter;
      return data;
    }
    wrappedSerializeCurrentMap._parkingPatched = true;
    serializeCurrentMap = wrappedSerializeCurrentMap;
  }
  if (typeof loadMapData === 'function' && !loadMapData._parkingPatched) {
    const orig = loadMapData;
    function wrappedLoadMapData(data, mapName) {
      const ok = orig(data, mapName);
      if (ok) loadParking(data && data.parking);
      return ok;
    }
    wrappedLoadMapData._parkingPatched = true;
    loadMapData = wrappedLoadMapData;
  }
  if (typeof clearRoadNetwork === 'function' && !clearRoadNetwork._parkingPatched) {
    const orig = clearRoadNetwork;
    function wrappedClearRoadNetwork() {
      if (parkingMode) setParkingMode(false);
      clearParking(false);
      return orig();
    }
    wrappedClearRoadNetwork._parkingPatched = true;
    clearRoadNetwork = wrappedClearRoadNetwork;
  }
  if (typeof addSegmentBetween === 'function' && !addSegmentBetween._parkingPatched) {
    const orig = addSegmentBetween;
    function wrappedAddSegmentBetween(ax, ay, bx, by) {
      const before = segments ? segments.length : 0;
      const result = orig(ax, ay, bx, by);
      let half = roadHalfWidthForCut(null);
      let newSeg = null;
      if (segments && segments.length > before) {
        newSeg = segments[segments.length - 1];
        half = roadHalfWidthForCut(newSeg);
      }
      cutParkingByRoad(ax, ay, bx, by, half);
      // Auto curb parking on new roads — gated by build-mode "Parking with roads" toggle
      // (defaults on; when the flag is missing treat as on for older callers).
      const wantPark = (typeof buildParkingWithRoads === 'undefined') ? true : !!buildParkingWithRoads;
      if (wantPark && newSeg) {
        const n = autoParkAlongSegment(newSeg);
        if (n > 0 && typeof persistParkingToStore === 'function') persistParkingToStore();
      }
      return result;
    }
    wrappedAddSegmentBetween._parkingPatched = true;
    addSegmentBetween = wrappedAddSegmentBetween;
  }
}

function installParkingInputHooks() {
  if (!board || board._parkingHooks) return;
  board._parkingHooks = true;

  board.addEventListener('mousedown', (e) => {
    if (!parkingMode) return;
    if (handleParkingMouseDown(e)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('mouseup', (e) => {
    if (!parkingMode) return;
    if (handleParkingMouseUp(e)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  board.addEventListener('click', (e) => {
    if (!parkingMode) return;
    if (handleParkingClick(e)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  board.addEventListener('contextmenu', (e) => {
    if (!parkingMode) return;
    if (handleParkingRightClick(e)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!parkingMode) return;
    if (typeof isPanning !== 'undefined' && isPanning) return;
    if (typeof nodeDrag !== 'undefined' && nodeDrag) return;
    if (typeof approachDrag !== 'undefined' && approachDrag) return;
    if (typeof refOverlayDrag !== 'undefined' && refOverlayDrag) return;
    const worldPt = screenToWorld(e.clientX, e.clientY);
    handleParkingMouseMove(worldPt);
  }, true);

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (!parkingMode) return;
    if (handleParkingEscape()) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

function initParkingItems() {
  installParkingToolbar();
  patchParkingModeExclusivity();
  installParkingInputHooks();
  updateParkingHud();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParkingItems);
} else {
  initParkingItems();
}
