const ZONE_TYPES = {
  residential: {
    id: 'residential',
    label: 'Residential',
    fill: 'rgba(46, 204, 113, 0.32)',
    stroke: '#2ecc71',
    swatch: '#2ecc71'
  },
  highResidential: {
    id: 'highResidential',
    label: 'High residential',
    fill: 'rgba(25, 111, 61, 0.38)',
    stroke: '#196f3d',
    swatch: '#196f3d'
  },
  commercial: {
    id: 'commercial',
    label: 'Commercial',
    fill: 'rgba(52, 152, 219, 0.32)',
    stroke: '#3498db',
    swatch: '#3498db'
  },
  office: {
    id: 'office',
    label: 'Office',
    fill: 'rgba(127, 140, 141, 0.36)',
    stroke: '#95a5a6',
    swatch: '#7f8c8d'
  }
};

const ZONE_ROAD_OFFSET = typeof SNAP !== 'undefined' ? SNAP : 12.5;
const ZONE_CLOSE_TOL = ZONE_ROAD_OFFSET * 0.55;

let zoneMode = false;
let zoneType = 'residential';
let zonePanelOpen = false;
let zones = [];
let zoneCounter = 1;
let zoneDraft = null;
let zoneLayer = null;
let zoneGhostLayer = null;
let zoneCursorEl = null;

(function injectZoneStyles() {
  if (document.getElementById('zone-tool-styles')) return;
  const style = document.createElement('style');
  style.id = 'zone-tool-styles';
  style.textContent = `
    .board.zone-mode {
      cursor: crosshair;
      box-shadow: inset 0 0 0 3px rgba(52, 152, 219, 0.45);
    }
    .zone-tool-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    #road-toolbar .zone-tool-btn {
      width: 34px;
      min-width: 34px;
      height: 30px;
      padding: 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #road-toolbar .zone-tool-btn.active {
      background: rgba(52, 152, 219, 0.22);
      border-color: #3498db;
      color: #bfe4ff;
    }
    .zone-grid-icon {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 2px;
      width: 14px;
      height: 14px;
    }
    .zone-grid-icon span {
      display: block;
      border-radius: 1px;
      background: currentColor;
      opacity: 0.9;
    }
    .zone-modes {
      display: none;
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(20, 20, 30, 0.96);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      padding: 8px;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 120;
    }
    .zone-modes.open { display: grid; }
    .zone-mode-btn {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      border: 2px solid rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.06);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .zone-mode-btn:hover {
      transform: translateY(-1px);
      border-color: rgba(255,255,255,0.45);
    }
    .zone-mode-btn.active {
      box-shadow: 0 0 0 2px rgba(255,255,255,0.35);
      border-color: #fff;
    }
    .zone-mode-btn .zone-swatch {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 1px solid rgba(0,0,0,0.25);
    }
    #zone-hud {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(20, 20, 30, 0.92);
      border: 1px solid rgba(52, 152, 219, 0.45);
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
    #zone-hud.visible { display: flex; }
    #zone-hud .zone-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      box-shadow: 0 0 8px currentColor;
    }
    #zone-hud .zone-title { font-weight: 700; letter-spacing: 0.5px; }
    #zone-hud .zone-meta { color: #aaa; }
    #zone-hud kbd {
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

function ensureZoneLayers() {
  if (!world) return;
  if (!zoneLayer) {
    zoneLayer = document.createElementNS(svgNS, 'g');
    zoneLayer.setAttribute('id', 'zone-layer');
    zoneLayer.setAttribute('pointer-events', 'none');
    const ref = document.getElementById('ref-overlay-layer');
    if (ref && ref.parentNode === world) {
      if (ref.nextSibling) world.insertBefore(zoneLayer, ref.nextSibling);
      else world.appendChild(zoneLayer);
    } else {
      world.insertBefore(zoneLayer, world.firstChild);
    }
  }
  if (!zoneGhostLayer) {
    zoneGhostLayer = document.createElementNS(svgNS, 'g');
    zoneGhostLayer.setAttribute('id', 'zone-ghost-layer');
    zoneGhostLayer.setAttribute('pointer-events', 'none');
    world.appendChild(zoneGhostLayer);
  }
}

function zoneTypeInfo(type) {
  return ZONE_TYPES[type] || ZONE_TYPES.residential;
}

function clearZoneGhost() {
  if (!zoneGhostLayer) return;
  while (zoneGhostLayer.firstChild) zoneGhostLayer.removeChild(zoneGhostLayer.firstChild);
  zoneCursorEl = null;
}

function setZoneCursor(x, y, valid, type) {
  ensureZoneLayers();
  const info = zoneTypeInfo(type || zoneType);
  if (!zoneCursorEl) {
    zoneCursorEl = document.createElementNS(svgNS, 'circle');
    zoneCursorEl.setAttribute('r', '2.2');
    zoneCursorEl.setAttribute('stroke', '#fff');
    zoneCursorEl.setAttribute('stroke-width', '0.55');
    zoneGhostLayer.appendChild(zoneCursorEl);
  }
  zoneCursorEl.setAttribute('cx', x);
  zoneCursorEl.setAttribute('cy', y);
  zoneCursorEl.setAttribute('fill', valid ? info.stroke : 'rgba(231,76,60,0.9)');
  zoneCursorEl.setAttribute('opacity', valid ? '0.95' : '0.75');
}

function edgeCrossesRoad(ax, ay, bx, by) {
  if (!segments || !segments.length) return false;
  const hitFn = typeof segInteriorIntersection === 'function' ? segInteriorIntersection : null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const x1 = seg.startNode.x, y1 = seg.startNode.y;
    const x2 = seg.endNode.x, y2 = seg.endNode.y;
    if (hitFn) {
      if (hitFn(ax, ay, bx, by, x1, y1, x2, y2)) return true;
    } else {
      const abx = bx - ax, aby = by - ay;
      const cdx = x2 - x1, cdy = y2 - y1;
      const den = abx * cdy - aby * cdx;
      if (Math.abs(den) < 1e-9) continue;
      const acx = x1 - ax, acy = y1 - ay;
      const t = (acx * cdy - acy * cdx) / den;
      const u = (acx * aby - acy * abx) / den;
      if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6) return true;
    }
  }
  return false;
}

function pointTooCloseToRoad(x, y, minDist) {
  if (!segments || !segments.length) return false;
  const limit = minDist != null ? minDist : ZONE_ROAD_OFFSET * 0.55;
  for (let i = 0; i < segments.length; i++) {
    const cp = closestPointOnSegment(x, y, segments[i]);
    if (cp.dist < limit) return true;
  }
  return false;
}

function snapZoneStartPoint(wx, wy) {
  if (!segments || !segments.length) return null;
  const magnet = Math.max(ZONE_ROAD_OFFSET * 8, 140 / Math.max(view.scale, 0.01));
  const accept = Math.max(ZONE_ROAD_OFFSET * 5, 90 / Math.max(view.scale, 0.01));
  let best = null;

  function consider(x, y, sideBias) {
    const score = Math.hypot(wx - x, wy - y) + (sideBias || 0);
    if (score > accept) return;
    if (!best || score < best.score) best = { x, y, score };
  }

  const gx = snapToGrid(wx);
  const gy = snapToGrid(wy);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const x1 = seg.startNode.x, y1 = seg.startNode.y;
    const x2 = seg.endNode.x, y2 = seg.endNode.y;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;

    const cp = closestPointOnSegment(wx, wy, seg);
    if (cp.dist > magnet) continue;

    let tMid = (wx - x1) * ux + (wy - y1) * uy;
    tMid = Math.round(tMid / ZONE_ROAD_OFFSET) * ZONE_ROAD_OFFSET;

    for (let k = -2; k <= 2; k++) {
      let t = tMid + k * ZONE_ROAD_OFFSET;
      if (t < -0.01 || t > len + 0.01) continue;
      t = Math.max(0, Math.min(len, t));
      const cx = x1 + ux * t;
      const cy = y1 + uy * t;
      const sideDot = (wx - cx) * px + (wy - cy) * py;
      for (const side of [-1, 1]) {
        const x = quantizeCoord(cx + px * side * ZONE_ROAD_OFFSET);
        const y = quantizeCoord(cy + py * side * ZONE_ROAD_OFFSET);
        const bias = sideDot * side >= 0 ? 0 : ZONE_ROAD_OFFSET * 0.85;
        consider(x, y, bias);
      }
    }

    const gcp = closestPointOnSegment(gx, gy, seg);
    if (Math.abs(gcp.dist - ZONE_ROAD_OFFSET) <= ZONE_ROAD_OFFSET * 0.35) {
      consider(gx, gy, 0);
    }
  }

  if (!best) return null;
  return { x: best.x, y: best.y, onRoadSide: true };
}

function snapZoneVertex(wx, wy) {
  const x = snapToGrid(wx);
  const y = snapToGrid(wy);
  return { x, y };
}

function draftEdgeValid(from, to) {
  if (!from || !to) return false;
  if (from.x === to.x && from.y === to.y) return false;
  if (edgeCrossesRoad(from.x, from.y, to.x, to.y)) return false;
  if (pointTooCloseToRoad(to.x, to.y, 1.25)) return false;
  return true;
}

function canCloseZoneDraft() {
  if (!zoneDraft || zoneDraft.points.length < 3) return false;
  const first = zoneDraft.points[0];
  const last = zoneDraft.points[zoneDraft.points.length - 1];
  if (edgeCrossesRoad(last.x, last.y, first.x, first.y)) return false;
  return true;
}

function drawZoneDraftPreview(cursor) {
  ensureZoneLayers();
  clearZoneGhost();
  if (!zoneDraft || !zoneDraft.points.length) {
    if (cursor) setZoneCursor(cursor.x, cursor.y, !!cursor.valid, zoneType);
    return;
  }

  const info = zoneTypeInfo(zoneDraft.type);
  const pts = zoneDraft.points.slice();
  let previewOk = true;
  if (cursor && cursor.valid) {
    const last = pts[pts.length - 1];
    previewOk = draftEdgeValid(last, cursor);
    if (previewOk) pts.push({ x: cursor.x, y: cursor.y });
  }

  const closing = cursor && cursor.close && canCloseZoneDraft();
  const polyPts = closing ? zoneDraft.points : pts;
  if (polyPts.length >= 2) {
    const poly = document.createElementNS(svgNS, 'polyline');
    poly.setAttribute('points', polyPts.map(p => p.x + ',' + p.y).join(' '));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', previewOk || closing ? info.stroke : '#e74c3c');
    poly.setAttribute('stroke-width', '1.4');
    poly.setAttribute('stroke-opacity', '0.95');
    poly.setAttribute('stroke-dasharray', '3 2');
    zoneGhostLayer.appendChild(poly);
  }

  if (closing && zoneDraft.points.length >= 3) {
    const fill = document.createElementNS(svgNS, 'polygon');
    fill.setAttribute('points', zoneDraft.points.map(p => p.x + ',' + p.y).join(' '));
    fill.setAttribute('fill', info.fill);
    fill.setAttribute('stroke', info.stroke);
    fill.setAttribute('stroke-width', '1.2');
    fill.setAttribute('stroke-dasharray', '3 2');
    zoneGhostLayer.appendChild(fill);
  }

  zoneDraft.points.forEach((p, i) => {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', i === 0 ? '2.6' : '1.8');
    c.setAttribute('fill', info.stroke);
    c.setAttribute('stroke', '#fff');
    c.setAttribute('stroke-width', '0.5');
    zoneGhostLayer.appendChild(c);
  });

  if (cursor) {
    setZoneCursor(cursor.x, cursor.y, !!(cursor.valid || cursor.close), zoneDraft.type);
  }
}

function renderZone(zone) {
  ensureZoneLayers();
  if (zone.el && zone.el.parentNode) zone.el.parentNode.removeChild(zone.el);
  const info = zoneTypeInfo(zone.type);
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('data-zone', String(zone.id));
  const poly = document.createElementNS(svgNS, 'polygon');
  poly.setAttribute('points', zone.points.map(p => p.x + ',' + p.y).join(' '));
  poly.setAttribute('fill', info.fill);
  poly.setAttribute('stroke', info.stroke);
  poly.setAttribute('stroke-width', '1.1');
  poly.setAttribute('stroke-opacity', '0.9');
  g.appendChild(poly);

  let cx = 0, cy = 0;
  zone.points.forEach(p => { cx += p.x; cy += p.y; });
  cx /= zone.points.length;
  cy /= zone.points.length;
  const label = document.createElementNS(svgNS, 'text');
  label.setAttribute('x', cx);
  label.setAttribute('y', cy);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('fill', info.stroke);
  label.setAttribute('font-size', '4.5');
  label.setAttribute('font-family', 'monospace');
  label.setAttribute('opacity', '0.85');
  label.setAttribute('pointer-events', 'none');
  label.textContent = info.label;
  g.appendChild(label);

  zone.el = g;
  zoneLayer.appendChild(g);
}

function redrawAllZones() {
  ensureZoneLayers();
  while (zoneLayer.firstChild) zoneLayer.removeChild(zoneLayer.firstChild);
  zones.forEach(z => {
    z.el = null;
    renderZone(z);
  });
}

function cancelZoneDraft() {
  zoneDraft = null;
  clearZoneGhost();
  updateZoneHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function commitZoneDraft() {
  if (!canCloseZoneDraft()) return false;
  const zone = {
    id: zoneCounter++,
    type: zoneDraft.type,
    points: zoneDraft.points.map(p => ({ x: p.x, y: p.y })),
    el: null
  };
  zones.push(zone);
  renderZone(zone);
  zoneDraft = null;
  clearZoneGhost();
  updateZoneHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
  return true;
}

function beginZoneDraft(pt) {
  zoneDraft = {
    type: zoneType,
    points: [{ x: pt.x, y: pt.y }]
  };
  drawZoneDraftPreview(null);
  updateZoneHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function resolveZoneCursor(wx, wy) {
  if (!zoneDraft) {
    const start = snapZoneStartPoint(wx, wy);
    if (!start) {
      const raw = snapZoneVertex(wx, wy);
      return { x: raw.x, y: raw.y, valid: false, close: false };
    }
    return { x: start.x, y: start.y, valid: true, close: false };
  }

  const first = zoneDraft.points[0];
  const last = zoneDraft.points[zoneDraft.points.length - 1];
  const raw = snapZoneVertex(wx, wy);
  const distFirst = Math.hypot(raw.x - first.x, raw.y - first.y);
  if (zoneDraft.points.length >= 3 && distFirst <= ZONE_CLOSE_TOL) {
    return { x: first.x, y: first.y, valid: canCloseZoneDraft(), close: true };
  }
  const ok = draftEdgeValid(last, raw);
  return { x: raw.x, y: raw.y, valid: ok, close: false };
}

function handleZoneMouseMove(worldPt) {
  if (!zoneMode) return false;
  const cursor = resolveZoneCursor(worldPt.x, worldPt.y);
  drawZoneDraftPreview(cursor);
  return true;
}

function handleZoneClick(event) {
  if (!zoneMode) return false;
  if (typeof suppressClick !== 'undefined' && suppressClick) return true;
  if (typeof spaceHeld !== 'undefined' && spaceHeld) return true;
  if (event.button !== 0) return true;

  const worldPt = screenToWorld(event.clientX, event.clientY);
  const cursor = resolveZoneCursor(worldPt.x, worldPt.y);

  if (!zoneDraft) {
    if (!cursor.valid) return true;
    beginZoneDraft(cursor);
    return true;
  }

  if (cursor.close) {
    commitZoneDraft();
    return true;
  }

  if (!cursor.valid) return true;
  const last = zoneDraft.points[zoneDraft.points.length - 1];
  if (last.x === cursor.x && last.y === cursor.y) return true;
  zoneDraft.points.push({ x: cursor.x, y: cursor.y });
  drawZoneDraftPreview(null);
  updateZoneHud();
  return true;
}

function handleZoneEscape() {
  if (!zoneMode) return false;
  if (zoneDraft) {
    cancelZoneDraft();
    return true;
  }
  setZoneMode(false);
  return true;
}

function updateZoneHud() {
  const hud = document.getElementById('zone-hud');
  if (!hud) return;
  hud.classList.toggle('visible', zoneMode);
  if (!zoneMode) return;
  const info = zoneTypeInfo(zoneType);
  const title = hud.querySelector('.zone-title');
  const meta = hud.querySelector('.zone-meta');
  const dot = hud.querySelector('.zone-dot');
  if (dot) {
    dot.style.background = info.swatch;
    dot.style.color = info.swatch;
  }
  if (title) {
    title.textContent = info.label.toUpperCase();
    title.style.color = info.stroke;
  }
  if (meta) {
    if (!zoneDraft) {
      meta.innerHTML = 'Click beside a road (12.5 out) to start · <kbd>Esc</kbd> exit';
    } else if (zoneDraft.points.length < 3) {
      meta.innerHTML = 'Place vertices · snap 12.5 · cannot cross roads · <kbd>Esc</kbd> cancel';
    } else {
      meta.innerHTML = 'Click first point to close · <kbd>Esc</kbd> cancel';
    }
  }
}

function setZonePanelOpen(open) {
  zonePanelOpen = !!open;
  const panel = document.getElementById('zone-modes');
  if (panel) panel.classList.toggle('open', zonePanelOpen);
}

function setZoneType(type, activate) {
  if (!ZONE_TYPES[type]) return;
  zoneType = type;
  document.querySelectorAll('.zone-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-zone') === type);
  });
  if (activate !== false) {
    setZoneMode(true);
    setZonePanelOpen(true);
  }
  updateZoneHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function setZoneMode(on) {
  const next = !!on;
  if (next === zoneMode) {
    updateZoneHud();
    syncZoneToolButton();
    return;
  }
  zoneMode = next;
  if (zoneMode) {
    if (typeof setBuildMode === 'function') setBuildMode(false);
    if (typeof setDeleteMode === 'function') setDeleteMode(false);
    if (typeof setUpgradeMode === 'function') setUpgradeMode(false);
    if (typeof driveMode !== 'undefined' && driveMode && typeof toggleDriveMode === 'function') {
      toggleDriveMode();
    }
    if (typeof clearSignalSelection === 'function') clearSignalSelection();
    ensureZoneLayers();
  } else {
    cancelZoneDraft();
    setZonePanelOpen(false);
  }
  if (board) board.classList.toggle('zone-mode', zoneMode);
  syncZoneToolButton();
  updateZoneHud();
  if (typeof updateRoadToolbar === 'function') updateRoadToolbar();
}

function syncZoneToolButton() {
  const btn = document.getElementById('btn-zone-tool');
  if (btn) btn.classList.toggle('active', zoneMode);
}

function toggleZonePanel(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!zoneMode) {
    setZoneType(zoneType, true);
    return;
  }
  setZonePanelOpen(!zonePanelOpen);
}

function serializeZones() {
  return zones.map(z => ({
    id: z.id,
    type: z.type,
    points: z.points.map(p => ({ x: p.x, y: p.y }))
  }));
}

function loadZones(saved) {
  clearZones(false);
  if (!Array.isArray(saved)) return;
  let maxId = 0;
  saved.forEach(z => {
    if (!z || !Array.isArray(z.points) || z.points.length < 3) return;
    const type = ZONE_TYPES[z.type] ? z.type : 'residential';
    const id = (z.id | 0) || zoneCounter++;
    maxId = Math.max(maxId, id);
    const zone = {
      id,
      type,
      points: z.points.map(p => ({
        x: quantizeCoord(p.x),
        y: quantizeCoord(p.y)
      })),
      el: null
    };
    zones.push(zone);
  });
  zoneCounter = Math.max(zoneCounter, maxId + 1);
  redrawAllZones();
}

function clearZones(updateUi) {
  cancelZoneDraft();
  zones.forEach(z => {
    if (z.el && z.el.parentNode) z.el.parentNode.removeChild(z.el);
  });
  zones = [];
  zoneCounter = 1;
  if (zoneLayer) {
    while (zoneLayer.firstChild) zoneLayer.removeChild(zoneLayer.firstChild);
  }
  if (updateUi !== false) {
    updateZoneHud();
  }
}

function installZoneToolbar() {
  const tools = document.querySelector('#road-toolbar .road-tools');
  if (!tools || document.getElementById('btn-zone-tool')) return;

  const wrap = document.createElement('div');
  wrap.className = 'zone-tool-wrap';
  wrap.innerHTML = `
    <button class="lane-btn zone-tool-btn" id="btn-zone-tool" type="button" title="Zoning blocks">
      <span class="zone-grid-icon" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </span>
    </button>
    <div class="zone-modes" id="zone-modes" role="menu">
      <button type="button" class="zone-mode-btn" data-zone="residential" title="Residential">
        <span class="zone-swatch" style="background:${ZONE_TYPES.residential.swatch}"></span>
      </button>
      <button type="button" class="zone-mode-btn" data-zone="highResidential" title="High residential">
        <span class="zone-swatch" style="background:${ZONE_TYPES.highResidential.swatch}"></span>
      </button>
      <button type="button" class="zone-mode-btn" data-zone="commercial" title="Commercial">
        <span class="zone-swatch" style="background:${ZONE_TYPES.commercial.swatch}"></span>
      </button>
      <button type="button" class="zone-mode-btn" data-zone="office" title="Office">
        <span class="zone-swatch" style="background:${ZONE_TYPES.office.swatch}"></span>
      </button>
    </div>
  `;
  tools.appendChild(wrap);

  document.getElementById('btn-zone-tool').addEventListener('click', toggleZonePanel);
  wrap.querySelectorAll('.zone-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setZoneType(btn.getAttribute('data-zone'), true);
    });
  });

  if (!document.getElementById('zone-hud')) {
    const hud = document.createElement('div');
    hud.id = 'zone-hud';
    hud.innerHTML = `
      <span class="zone-dot"></span>
      <span class="zone-title">ZONE</span>
      <span class="zone-meta">Pick a zone type</span>
    `;
    document.body.appendChild(hud);
  }

  document.querySelectorAll('.zone-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-zone') === zoneType);
  });
}

function patchZoneModeExclusivity() {
  if (typeof setBuildMode === 'function' && !setBuildMode._zonePatched) {
    const orig = setBuildMode;
    function wrappedSetBuildMode(on) {
      if (on && zoneMode) {
        zoneMode = false;
        cancelZoneDraft();
        setZonePanelOpen(false);
        if (board) board.classList.remove('zone-mode');
        syncZoneToolButton();
        updateZoneHud();
      }
      return orig(on);
    }
    wrappedSetBuildMode._zonePatched = true;
    setBuildMode = wrappedSetBuildMode;
  }
  if (typeof setDeleteMode === 'function' && !setDeleteMode._zonePatched) {
    const orig = setDeleteMode;
    function wrappedSetDeleteMode(on) {
      if (on && zoneMode) {
        zoneMode = false;
        cancelZoneDraft();
        setZonePanelOpen(false);
        if (board) board.classList.remove('zone-mode');
        syncZoneToolButton();
        updateZoneHud();
      }
      return orig(on);
    }
    wrappedSetDeleteMode._zonePatched = true;
    setDeleteMode = wrappedSetDeleteMode;
  }
  if (typeof setUpgradeMode === 'function' && !setUpgradeMode._zonePatched) {
    const orig = setUpgradeMode;
    function wrappedSetUpgradeMode(on) {
      if (on && zoneMode) {
        zoneMode = false;
        cancelZoneDraft();
        setZonePanelOpen(false);
        if (board) board.classList.remove('zone-mode');
        syncZoneToolButton();
        updateZoneHud();
      }
      return orig(on);
    }
    wrappedSetUpgradeMode._zonePatched = true;
    setUpgradeMode = wrappedSetUpgradeMode;
  }
  if (typeof toggleDriveMode === 'function' && !toggleDriveMode._zonePatched) {
    const orig = toggleDriveMode;
    function wrappedToggleDriveMode() {
      const was = typeof driveMode !== 'undefined' && driveMode;
      const result = orig();
      if (!was && typeof driveMode !== 'undefined' && driveMode && zoneMode) {
        zoneMode = false;
        cancelZoneDraft();
        setZonePanelOpen(false);
        if (board) board.classList.remove('zone-mode');
        syncZoneToolButton();
        updateZoneHud();
      }
      return result;
    }
    wrappedToggleDriveMode._zonePatched = true;
    toggleDriveMode = wrappedToggleDriveMode;
  }
  if (typeof updateRoadToolbar === 'function' && !updateRoadToolbar._zonePatched) {
    const orig = updateRoadToolbar;
    function wrappedUpdateRoadToolbar() {
      const result = orig();
      const hint = document.getElementById('road-toolbar-hint');
      if (hint && zoneMode) {
        const info = zoneTypeInfo(zoneType);
        hint.style.color = info.stroke;
        if (zoneDraft) {
          hint.textContent = `Zone · ${info.label} · ${zoneDraft.points.length} pts · click to add · close on first point · Esc cancel`;
        } else {
          hint.textContent = `Zone · ${info.label} · start 12.5 from a road side · half-grid snap · Esc exit`;
        }
      }
      syncZoneToolButton();
      return result;
    }
    wrappedUpdateRoadToolbar._zonePatched = true;
    updateRoadToolbar = wrappedUpdateRoadToolbar;
  }
  if (typeof serializeCurrentMap === 'function' && !serializeCurrentMap._zonePatched) {
    const orig = serializeCurrentMap;
    function wrappedSerializeCurrentMap(name) {
      const data = orig(name);
      data.zones = serializeZones();
      data.zoneCounter = zoneCounter;
      return data;
    }
    wrappedSerializeCurrentMap._zonePatched = true;
    serializeCurrentMap = wrappedSerializeCurrentMap;
  }
  if (typeof loadMapData === 'function' && !loadMapData._zonePatched) {
    const orig = loadMapData;
    function wrappedLoadMapData(data, mapName) {
      const ok = orig(data, mapName);
      if (ok) loadZones(data && data.zones);
      return ok;
    }
    wrappedLoadMapData._zonePatched = true;
    loadMapData = wrappedLoadMapData;
  }
  if (typeof clearRoadNetwork === 'function' && !clearRoadNetwork._zonePatched) {
    const orig = clearRoadNetwork;
    function wrappedClearRoadNetwork() {
      if (zoneMode) setZoneMode(false);
      clearZones(false);
      return orig();
    }
    wrappedClearRoadNetwork._zonePatched = true;
    clearRoadNetwork = wrappedClearRoadNetwork;
  }
}

function installZoneInputHooks() {
  if (!board) return;
  board.addEventListener('click', (e) => {
    if (!zoneMode) return;
    if (handleZoneClick(e)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!zoneMode) return;
    if (typeof isPanning !== 'undefined' && isPanning) return;
    if (typeof nodeDrag !== 'undefined' && nodeDrag) return;
    if (typeof approachDrag !== 'undefined' && approachDrag) return;
    if (typeof refOverlayDrag !== 'undefined' && refOverlayDrag) return;
    const worldPt = screenToWorld(e.clientX, e.clientY);
    handleZoneMouseMove(worldPt);
  }, true);

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (!zoneMode) return;
    if (handleZoneEscape()) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (!zonePanelOpen) return;
    const wrap = e.target.closest && e.target.closest('.zone-tool-wrap');
    if (!wrap) setZonePanelOpen(false);
  });
}

function initUnitsZoning() {
  ensureZoneLayers();
  installZoneToolbar();
  patchZoneModeExclusivity();
  installZoneInputHooks();
  updateZoneHud();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnitsZoning);
} else {
  initUnitsZoning();
}
