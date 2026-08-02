// ================================================================
// TRAFFIC SIGNALS — American-style heads + phase cycle for 3+ way
// junctions. Heads sit at entering lane-node positions; cars query
// movementDisplay() from the engine's RH speed profile.
// ================================================================

const SIGNAL_OUT_NUDGE = 4.2; // distance back from lane stub toward the approach (away from node)
const SIGNAL_VISIBILITY_PRESETS = [
  { id: 'faint', label: 'Faint', opacity: 0.26 },
  { id: 'medium', label: 'Medium', opacity: 0.62 },
  { id: 'full', label: 'Full', opacity: 1.0 }
];
const SIGNAL_HOUSING_W = 2.4;
const SIGNAL_HOUSING_H = 6.2;
const SIGNAL_LAMP_R = 0.72;
const SIGNAL_COLORS = {
  red: '#e74c3c',
  yellow: '#f1c40f',
  green: '#2ecc71',
  off: '#1a1a22'
};

let signalsEnabled = true;
let signalVisibilityMode = 0; // index into SIGNAL_VISIBILITY_PRESETS
let selectedSignalNodeKey = null;
let selectedSignalHeadKey = null;

function getSignalIdleOpacity() {
  return SIGNAL_VISIBILITY_PRESETS[signalVisibilityMode].opacity;
}

const DEFAULT_TIMING = { green: 8, yellow: 3.2, allRed: 1.6, protLeft: 4.5 };

// ---------------- Public API ----------------

function syncJunctionSignals(nodeKey, nodeX, nodeY, directions, laneNodes, edges) {
  const nd = nodes.get(nodeKey);
  if (!nd) return;

  // Only 3+ way junctions get signals
  if (nd.count < 3) {
    if (nd.signal) {
      // Keep overrides/settings but clear live geometry
      nd.signal.heads = [];
      nd.signal.groups = [];
      nd.signal.phases = [];
    }
    return;
  }

  if (!nd.signal) {
    nd.signal = {
      enabled: true,
      rightOnRed: true,
      protectedLeft: false,
      timing: Object.assign({}, DEFAULT_TIMING),
      heads: [],
      groups: [],
      phases: [],
      phaseIndex: 0,
      phaseT: 0,
      overrides: new Map()
    };
  }
  const sig = nd.signal;
  if (!(sig.overrides instanceof Map)) {
    // Survive JSON round-trips if ever serialized
    const raw = sig.overrides || {};
    sig.overrides = new Map(Object.entries(raw));
  }

  // Build heads from entering lanes, merging adjacent identical turn sets
  const enters = (laneNodes || []).filter(l => l.type === 'in');
  const bySeg = new Map();
  enters.forEach(ln => {
    if (!bySeg.has(ln.segId)) bySeg.set(ln.segId, []);
    bySeg.get(ln.segId).push(ln);
  });
  bySeg.forEach(arr => arr.sort((a, b) => laneRightness(a) - laneRightness(b)));

  const heads = [];
  bySeg.forEach((lanes, segId) => {
    // Annotate each lane with its turn set
    const annotated = lanes.map(ln => {
      const turns = new Set();
      (edges || []).forEach(e => {
        if (e.from === ln || (e.from.segId === ln.segId && e.from.laneIdx === ln.laneIdx && e.from.type === 'in')) {
          if (e.turn !== 'uturn') turns.add(e.turn);
        }
      });
      const movements = [];
      if (turns.has('left')) movements.push('left');
      if (turns.has('straight')) movements.push('straight');
      if (turns.has('right')) movements.push('right');
      if (movements.length === 0) movements.push('straight');
      return { ln, movements, key: movements.slice().sort().join('+') };
    });

    // Merge adjacent lanes with identical movement keys
    let i = 0;
    while (i < annotated.length) {
      let j = i + 1;
      while (j < annotated.length && annotated[j].key === annotated[i].key) j++;
      const group = annotated.slice(i, j);
      const laneIdxs = group.map(g => g.ln.laneIdx);
      const overrideKey = headOverrideKey(segId, laneIdxs);
      const ov = sig.overrides.get(overrideKey);
      if (ov && ov.removed) { i = j; continue; }

      let movements = group[0].movements.slice();
      let style = movements.length === 1 && movements[0] !== 'straight' ? 'arrow' : 'ball';
      if (ov) {
        if (ov.movements) movements = ov.movements.slice();
        if (ov.style) style = ov.style;
      }

      // Position: mean of lane nodes, nudged outward from junction center
      let mx = 0, my = 0, tdx = 0, tdy = 0;
      group.forEach(g => { mx += g.ln.x; my += g.ln.y; tdx += g.ln.tdx; tdy += g.ln.tdy; });
      mx /= group.length; my /= group.length;
      const tlen = Math.hypot(tdx, tdy) || 1;
      tdx /= tlen; tdy /= tlen;
      // Travel is INTO the junction; nudge back along -travel (toward approach)
      const nx = mx - tdx * SIGNAL_OUT_NUDGE;
      const ny = my - tdy * SIGNAL_OUT_NUDGE;
      const angleDeg = Math.atan2(tdy, tdx) * 180 / Math.PI + 90;

      heads.push({
        key: overrideKey,
        segId,
        laneIdxs,
        movements,
        style,
        groupIndex: -1,
        x: nx, y: ny,
        angleDeg,
        tdx, tdy,
        els: null
      });
      i = j;
    }
  });

  // Apply any user-added custom heads from overrides
  sig.overrides.forEach((ov, key) => {
    if (!ov || !ov.custom || ov.removed) return;
    if (heads.some(h => h.key === key)) return;
    const parts = key.split(':');
    const segId = Number(parts[0]);
    const laneIdxs = (parts[1] || '').split(',').map(Number).filter(n => !isNaN(n));
    const sample = enters.find(ln => ln.segId === segId) || enters[0];
    if (!sample) return;
    const tdx = sample.tdx, tdy = sample.tdy;
    heads.push({
      key,
      segId,
      laneIdxs: laneIdxs.length ? laneIdxs : [sample.laneIdx],
      movements: (ov.movements && ov.movements.length) ? ov.movements.slice() : ['straight'],
      style: ov.style || 'ball',
      groupIndex: -1,
      x: sample.x - tdx * SIGNAL_OUT_NUDGE,
      y: sample.y - tdy * SIGNAL_OUT_NUDGE,
      angleDeg: Math.atan2(tdy, tdx) * 180 / Math.PI + 90,
      tdx, tdy,
      els: null
    });
  });

  // Barrier groups: pair opposing approaches
  const approachSegs = [...bySeg.keys()];
  const dirBySeg = new Map();
  directions.forEach(d => dirBySeg.set(d.segment.id, d));
  const used = new Set();
  const groups = [];
  approachSegs.forEach(segId => {
    if (used.has(segId)) return;
    const dirA = dirBySeg.get(segId);
    if (!dirA) { groups.push([segId]); used.add(segId); return; }
    let partner = null;
    for (const other of approachSegs) {
      if (other === segId || used.has(other)) continue;
      const dirB = dirBySeg.get(other);
      if (!dirB) continue;
      const dot = dirA.dx * dirB.dx + dirA.dy * dirB.dy;
      if (dot < -0.8) { partner = other; break; }
    }
    if (partner != null) {
      groups.push([segId, partner]);
      used.add(segId); used.add(partner);
    } else {
      groups.push([segId]);
      used.add(segId);
    }
  });

  heads.forEach(h => {
    h.groupIndex = groups.findIndex(g => g.includes(h.segId));
  });

  sig.heads = heads;
  sig.groups = groups;
  rebuildPhaseRing(sig);

  // Clamp phase index
  if (sig.phaseIndex >= sig.phases.length) {
    sig.phaseIndex = 0;
    sig.phaseT = 0;
  }

  drawSignalHeads(nodeKey, nodeX, nodeY, sig);
  updateSignalOpacity(nodeKey);
}

function rebuildPhaseRing(sig) {
  const t = sig.timing || DEFAULT_TIMING;
  const phases = [];
  const groups = sig.groups || [];

  groups.forEach((groupSegs, gi) => {
    const hasLeftHead = (sig.heads || []).some(h =>
      h.groupIndex === gi && h.movements.includes('left')
    );

    if (sig.protectedLeft && hasLeftHead) {
      phases.push({
        kind: 'protLeft',
        groupIndex: gi,
        duration: t.protLeft,
        allow: { left: 'green', straight: 'red', right: 'red' }
      });
      phases.push({
        kind: 'protLeftYellow',
        groupIndex: gi,
        duration: t.yellow,
        allow: { left: 'yellow', straight: 'red', right: 'red' }
      });
    }

    // Main green for this barrier group
    const mainAllow = sig.protectedLeft
      ? { left: 'red', straight: 'green', right: 'green' }
      : { left: 'green', straight: 'green', right: 'green' };
    phases.push({
      kind: 'green',
      groupIndex: gi,
      duration: t.green,
      allow: mainAllow
    });
    phases.push({
      kind: 'yellow',
      groupIndex: gi,
      duration: t.yellow,
      allow: Object.fromEntries(
        Object.entries(mainAllow).map(([k, v]) => [k, v === 'green' ? 'yellow' : 'red'])
      )
    });
    phases.push({
      kind: 'allRed',
      groupIndex: gi,
      duration: t.allRed,
      allow: { left: 'red', straight: 'red', right: 'red' }
    });
  });

  if (phases.length === 0) {
    phases.push({
      kind: 'green',
      groupIndex: 0,
      duration: t.green,
      allow: { left: 'green', straight: 'green', right: 'green' }
    });
  }
  sig.phases = phases;
}

function updateSignals(dt) {
  if (!signalsEnabled) {
    // Still repaint so lamps go dark when master-off (once until re-enabled)
    nodes.forEach((nd, key) => {
      if (nd.signal && nd.signal.heads && nd.signal.heads.length) {
        if (nd.signal._paintKey !== 'off') {
          paintSignalLamps(nd.signal, true);
          nd.signal._paintKey = 'off';
        }
      }
    });
    return;
  }
  nodes.forEach((nd, key) => {
    const sig = nd.signal;
    if (!sig || !sig.heads || sig.heads.length === 0) return;
    if (!sig.enabled) {
      if (sig._paintKey !== 'disabled') {
        paintSignalLamps(sig, true);
        sig._paintKey = 'disabled';
      }
      return;
    }
    if (!sig.phases || sig.phases.length === 0) rebuildPhaseRing(sig);
    if (typeof simPaused !== 'undefined' && simPaused) {
      const keyPaused = 'p:' + sig.phaseIndex;
      if (sig._paintKey !== keyPaused) {
        paintSignalLamps(sig, false);
        sig._paintKey = keyPaused;
      }
      return;
    }

    const prevIndex = sig.phaseIndex;
    sig.phaseT += dt;
    let guard = 0;
    while (guard++ < 20) {
      const phase = sig.phases[sig.phaseIndex];
      if (!phase) { sig.phaseIndex = 0; sig.phaseT = 0; break; }
      if (sig.phaseT < phase.duration) break;
      sig.phaseT -= phase.duration;
      sig.phaseIndex = (sig.phaseIndex + 1) % sig.phases.length;
    }
    // Lamps only change on phase transitions — skip DOM thrash every frame
    const paintKey = 'g:' + sig.phaseIndex;
    if (sig.phaseIndex !== prevIndex || sig._paintKey !== paintKey) {
      paintSignalLamps(sig, false);
      sig._paintKey = paintKey;
    }
  });
}

/**
 * Returns 'green' | 'yellow' | 'red' | 'off' for a movement arriving at a junction.
 * 'off' means free-flow (signals disabled globally or for this junction).
 */
function movementDisplay(nodeKey, segId, laneIdx, turn) {
  if (!signalsEnabled) return 'off';
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return 'off';
  const sig = nd.signal;
  if (!sig.enabled || !sig.heads || sig.heads.length === 0) return 'off';
  if (!sig.phases || sig.phases.length === 0) return 'off';

  const move = (turn === 'uturn') ? 'left' : (turn || 'straight');
  let head = (sig.heads || []).find(h =>
    h.segId == segId && h.laneIdxs.includes(laneIdx)
  );
  // Fall back to any head on this approach — better to obey that group than
  // treat a signalized junction as free-flow ('off').
  if (!head) {
    head = (sig.heads || []).find(h => h.segId == segId);
  }
  if (!head) return 'off';

  const phase = sig.phases[sig.phaseIndex];
  if (!phase) return 'off';

  // Heads not in the active barrier group are red (except allRed which is all red)
  if (phase.kind !== 'allRed' && head.groupIndex !== phase.groupIndex) {
    return 'red';
  }
  return phase.allow[move] || 'red';
}

function yellowRemaining(nodeKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return 0;
  const sig = nd.signal;
  const phase = sig.phases && sig.phases[sig.phaseIndex];
  if (!phase) return 0;
  if (phase.kind !== 'yellow' && phase.kind !== 'protLeftYellow') return 0;
  return Math.max(0, phase.duration - sig.phaseT);
}

function isRightOnRedAllowed(nodeKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return false;
  return !!(nd.signal.rightOnRed && nd.signal.enabled && signalsEnabled);
}

function headOverrideKey(segId, laneIdxs) {
  return segId + ':' + laneIdxs.slice().sort((a, b) => a - b).join(',');
}

// ---------------- Rendering ----------------

function drawSignalHeads(nodeKey, nodeX, nodeY, sig) {
  // Remove any previous signal visuals for this node (calculateCurves already
  // wiped data-junction, but be safe if called standalone).
  svg.querySelectorAll(`[data-signal-node="${nodeKey}"]`).forEach(el => el.remove());

  const gRoot = document.createElementNS(svgNS, 'g');
  gRoot.setAttribute('data-junction', nodeKey);
  gRoot.setAttribute('data-signal-node', nodeKey);
  gRoot.setAttribute('class', 'signal-root');
  world.appendChild(gRoot);

  // Center hit target for selecting the intersection
  const hitR = NODE_R * 0.55;
  const centerHit = document.createElementNS(svgNS, 'circle');
  centerHit.setAttribute('cx', nodeX);
  centerHit.setAttribute('cy', nodeY);
  centerHit.setAttribute('r', String(hitR));
  centerHit.setAttribute('fill', 'rgba(255,224,102,0.08)');
  centerHit.setAttribute('stroke', 'rgba(255,224,102,0.35)');
  centerHit.setAttribute('stroke-width', '0.5');
  centerHit.setAttribute('stroke-dasharray', '1.5 1.2');
  centerHit.setAttribute('data-junction', nodeKey);
  centerHit.setAttribute('data-signal-node', nodeKey);
  centerHit.style.pointerEvents = 'auto';
  centerHit.style.cursor = 'grab';
  centerHit.addEventListener('mousedown', (e) => {
    if (typeof beginNodeDrag === 'function') beginNodeDrag(nodeKey, e);
  });
  centerHit.addEventListener('click', (e) => {
    if (typeof driveMode !== 'undefined' && driveMode) return;
    if (typeof buildMode !== 'undefined' && buildMode) return;
    if (typeof deleteMode !== 'undefined' && deleteMode) return;
    if (typeof upgradeMode !== 'undefined' && upgradeMode) return;
    e.stopPropagation();
    selectSignalJunction(nodeKey, null);
  });
  gRoot.appendChild(centerHit);
  sig.centerHitEl = centerHit;

  sig.heads.forEach(head => {
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('data-junction', nodeKey);
    g.setAttribute('data-signal-node', nodeKey);
    g.setAttribute('data-signal-head', head.key);
    g.setAttribute('transform', `translate(${head.x} ${head.y}) rotate(${head.angleDeg})`);

    // Housing: vertical stack of 3 lamps, long axis perpendicular to travel
    // After rotate(+90 from travel), local +Y is "up the pole" / across roadway.
    const hw = SIGNAL_HOUSING_W;
    const hh = SIGNAL_HOUSING_H;
    const housing = document.createElementNS(svgNS, 'rect');
    housing.setAttribute('x', String(-hw / 2));
    housing.setAttribute('y', String(-hh / 2));
    housing.setAttribute('width', String(hw));
    housing.setAttribute('height', String(hh));
    housing.setAttribute('rx', '0.55');
    housing.setAttribute('fill', '#1a1c22');
    housing.setAttribute('stroke', '#0a0b0e');
    housing.setAttribute('stroke-width', '0.35');
    g.appendChild(housing);

    // Hit rect for editor selection
    const hit = document.createElementNS(svgNS, 'rect');
    hit.setAttribute('x', String(-hw / 2 - 0.6));
    hit.setAttribute('y', String(-hh / 2 - 0.6));
    hit.setAttribute('width', String(hw + 1.2));
    hit.setAttribute('height', String(hh + 1.2));
    hit.setAttribute('fill', 'transparent');
    hit.style.pointerEvents = 'auto';
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', (e) => {
      if (typeof driveMode !== 'undefined' && driveMode) return;
      if (typeof buildMode !== 'undefined' && buildMode) return;
      if (typeof deleteMode !== 'undefined' && deleteMode) return;
    if (typeof upgradeMode !== 'undefined' && upgradeMode) return;
      e.stopPropagation();
      selectSignalJunction(nodeKey, head.key);
    });
    g.appendChild(hit);

    // Three lamps: red (top / -Y), yellow (mid), green (bottom / +Y)
    // In American signals facing the driver: red on top.
    // Balls always; arrow glyphs drawn inside when movements are turns / combined.
    const lampYs = [-hh / 3.2, 0, hh / 3.2];
    const lampKeys = ['red', 'yellow', 'green'];
    const lamps = {};
    const arrowEls = {};
    const showArrows = headNeedsArrows(head);
    lampKeys.forEach((color, i) => {
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', '0');
      c.setAttribute('cy', String(lampYs[i]));
      c.setAttribute('r', String(SIGNAL_LAMP_R));
      c.setAttribute('fill', SIGNAL_COLORS.off);
      c.setAttribute('stroke', '#0a0b0e');
      c.setAttribute('stroke-width', '0.2');
      g.appendChild(c);
      lamps[color] = c;

      if (showArrows) {
        const ag = document.createElementNS(svgNS, 'g');
        ag.setAttribute('transform', `translate(0 ${lampYs[i]})`);
        ag.setAttribute('pointer-events', 'none');
        drawMovementArrows(ag, head.movements, SIGNAL_LAMP_R * 0.78);
        g.appendChild(ag);
        arrowEls[color] = ag;
      }
    });

    gRoot.appendChild(g);
    head.els = { g, housing, lamps, arrowEls, hit };
  });

  paintSignalLamps(sig, !sig.enabled || !signalsEnabled);
}

/** True when the head should show arrow glyphs (any turn, or multi-move). */
function headNeedsArrows(head) {
  if (head.style === 'arrow') return true;
  const m = head.movements || [];
  if (m.length === 0) return false;
  if (m.length === 1 && m[0] === 'straight') return false;
  return true;
}

/**
 * Draw movement arrow glyphs inside a lamp.
 * Local coords: -Y = straight (up for the driver), -X = left, +X = right.
 */
function drawMovementArrows(parent, movements, scale) {
  const hasL = movements.includes('left');
  const hasS = movements.includes('straight');
  const hasR = movements.includes('right');
  const n = (hasL ? 1 : 0) + (hasS ? 1 : 0) + (hasR ? 1 : 0);
  const s = scale;

  // Combined layouts squeeze arrows side-by-side; single fills the lamp.
  if (n === 1) {
    if (hasL) appendArrowPath(parent, 'left', 0, 0, s);
    else if (hasR) appendArrowPath(parent, 'right', 0, 0, s);
    else appendArrowPath(parent, 'straight', 0, 0, s);
    return;
  }
  if (hasL && hasS && !hasR) {
    appendArrowPath(parent, 'left', -s * 0.28, 0, s * 0.72);
    appendArrowPath(parent, 'straight', s * 0.32, 0, s * 0.72);
    return;
  }
  if (hasR && hasS && !hasL) {
    appendArrowPath(parent, 'straight', -s * 0.32, 0, s * 0.72);
    appendArrowPath(parent, 'right', s * 0.28, 0, s * 0.72);
    return;
  }
  if (hasL && hasR && !hasS) {
    appendArrowPath(parent, 'left', -s * 0.32, 0, s * 0.7);
    appendArrowPath(parent, 'right', s * 0.32, 0, s * 0.7);
    return;
  }
  // All three (or fallback): compact triad
  appendArrowPath(parent, 'left', -s * 0.38, s * 0.05, s * 0.55);
  appendArrowPath(parent, 'straight', 0, -s * 0.08, s * 0.55);
  appendArrowPath(parent, 'right', s * 0.38, s * 0.05, s * 0.55);
}

function appendArrowPath(parent, kind, ox, oy, s) {
  const path = document.createElementNS(svgNS, 'path');
  let d;
  if (kind === 'straight') {
    // Shaft + head pointing -Y (up toward destination for the driver)
    const w = s * 0.2;
    d = [
      `M ${ox - w} ${oy + s * 0.72}`,
      `L ${ox + w} ${oy + s * 0.72}`,
      `L ${ox + w} ${oy - s * 0.08}`,
      `L ${ox + s * 0.45} ${oy - s * 0.08}`,
      `L ${ox} ${oy - s * 0.88}`,
      `L ${ox - s * 0.45} ${oy - s * 0.08}`,
      `L ${ox - w} ${oy - s * 0.08}`,
      'Z'
    ].join(' ');
  } else if (kind === 'left') {
    d = arrowTurnPath(ox, oy, s, -1);
  } else {
    d = arrowTurnPath(ox, oy, s, 1);
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', '#3a3d48');
  path.setAttribute('stroke', 'none');
  path.setAttribute('class', 'signal-arrow-glyph');
  parent.appendChild(path);
}

/** Horizontal turn arrow: sign -1 = left (−X), +1 = right (+X). */
function arrowTurnPath(ox, oy, s, sign) {
  // Stem rises, then bends sideways into a chevron tip
  const tip = ox + sign * s * 0.88;
  const elbow = ox + sign * s * 0.08;
  const back = ox - sign * s * 0.42;
  const w = s * 0.18;
  return [
    `M ${back} ${oy + s * 0.7}`,
    `L ${elbow} ${oy + s * 0.7}`,
    `L ${elbow} ${oy + w}`,
    `L ${ox + sign * s * 0.22} ${oy + w}`,
    `L ${ox + sign * s * 0.22} ${oy + s * 0.42}`,
    `L ${tip} ${oy}`,
    `L ${ox + sign * s * 0.22} ${oy - s * 0.42}`,
    `L ${ox + sign * s * 0.22} ${oy - w}`,
    `L ${back} ${oy - w}`,
    'Z'
  ].join(' ');
}

function paintSignalLamps(sig, forceOff) {
  const phase = (!forceOff && sig.phases && sig.phases[sig.phaseIndex]) ? sig.phases[sig.phaseIndex] : null;
  const heads = sig.heads || [];

  for (let hi = 0; hi < heads.length; hi++) {
    const head = heads[hi];
    if (!head.els || !head.els.lamps) continue;
    // Determine which color this head should show
    let lit = null; // 'red'|'yellow'|'green'|null
    if (phase) {
      // Pick the "most permissive" color among this head's movements for the active group
      if (phase.kind === 'allRed' || head.groupIndex !== phase.groupIndex) {
        lit = 'red';
      } else {
        const allow = phase.allow;
        const moves = head.movements;
        for (let mi = 0; mi < moves.length; mi++) {
          const c = allow[moves[mi]];
          if (c === 'green') { lit = 'green'; break; }
          if (c === 'yellow' && lit !== 'green') lit = 'yellow';
          else if (c === 'red' && !lit) lit = 'red';
        }
        if (!lit) lit = 'red';
      }
    }

    // Skip DOM writes when this head's lit color is unchanged
    if (head._lit === lit && head._litForced === !!forceOff) continue;
    head._lit = lit;
    head._litForced = !!forceOff;

    const lampColors = ['red', 'yellow', 'green'];
    for (let ci = 0; ci < 3; ci++) {
      const color = lampColors[ci];
      const el = head.els.lamps[color];
      if (!el) continue;
      const on = lit === color;
      el.setAttribute('fill', on ? SIGNAL_COLORS[color] : SIGNAL_COLORS.off);
      el.setAttribute('opacity', on ? '1' : '0.55');
      if (on) {
        el.setAttribute('stroke', SIGNAL_COLORS[color]);
        el.setAttribute('stroke-width', '0.35');
      } else {
        el.setAttribute('stroke', '#0a0b0e');
        el.setAttribute('stroke-width', '0.2');
      }
      // Arrow glyphs: bright when lit, dark when off
      const ag = head.els.arrowEls && head.els.arrowEls[color];
      if (ag) {
        const glyphFill = on ? '#0a0b0e' : '#4a4e5a';
        const glyphOpacity = on ? '0.92' : '0.7';
        const glyphs = ag._glyphCache || (ag._glyphCache = ag.querySelectorAll('.signal-arrow-glyph'));
        for (let gi = 0; gi < glyphs.length; gi++) {
          glyphs[gi].setAttribute('fill', glyphFill);
          glyphs[gi].setAttribute('opacity', glyphOpacity);
        }
        ag.setAttribute('opacity', on ? '1' : '0.85');
      }
    }
  }
}

function updateSignalOpacity(nodeKey) {
  const selected = selectedSignalNodeKey === nodeKey;
  const inEditor = (typeof driveMode === 'undefined' || !driveMode)
    && (typeof buildMode === 'undefined' || !buildMode)
    && (typeof deleteMode === 'undefined' || !deleteMode)
    && (typeof upgradeMode === 'undefined' || !upgradeMode);
  const idle = getSignalIdleOpacity();
  const opacity = (selected && inEditor) ? '1' : String(idle);
  svg.querySelectorAll(`[data-signal-node="${nodeKey}"]`).forEach(el => {
    // Only set opacity on the root groups, not nested (nested inherit)
    if (el.getAttribute('class') === 'signal-root' || el.parentNode === world) {
      el.setAttribute('opacity', opacity);
    }
  });
  // Also bump the root specifically
  const roots = svg.querySelectorAll(`g.signal-root[data-signal-node="${nodeKey}"]`);
  roots.forEach(r => {
    r.setAttribute('opacity', opacity);
    // Selected signal editor: raise lights above roads, signs, lane graphs, etc.
    if (selected && inEditor && typeof world !== 'undefined' && world) {
      world.appendChild(r);
    }
  });
}

function refreshAllSignalOpacities() {
  nodes.forEach((nd, key) => {
    if (nd.signal && nd.signal.heads && nd.signal.heads.length) {
      updateSignalOpacity(key);
    }
  });
}

// ---------------- Editor selection + panel ----------------

function selectSignalJunction(nodeKey, headKey) {
  const prev = selectedSignalNodeKey;
  if (selectedSignalNodeKey === nodeKey && selectedSignalHeadKey === headKey) {
    // Toggle off if clicking same head/center again
    selectedSignalNodeKey = null;
    selectedSignalHeadKey = null;
  } else {
    selectedSignalNodeKey = nodeKey;
    selectedSignalHeadKey = headKey;
  }
  if (prev) updateSignalOpacity(prev);
  if (selectedSignalNodeKey) updateSignalOpacity(selectedSignalNodeKey);
  updateSignalPanel();
}

function clearSignalSelection() {
  const prev = selectedSignalNodeKey;
  selectedSignalNodeKey = null;
  selectedSignalHeadKey = null;
  if (prev) updateSignalOpacity(prev);
  updateSignalPanel();
}

function toggleSignalsMaster() {
  signalsEnabled = !signalsEnabled;
  const btn = document.getElementById('btn-signals');
  if (btn) {
    btn.textContent = signalsEnabled ? 'Signals: On' : 'Signals: Off';
    btn.classList.toggle('active', signalsEnabled);
  }
  // Force a lamp repaint
  updateSignals(0);
  refreshAllSignalOpacities();
}

function cycleSignalVisibility() {
  signalVisibilityMode = (signalVisibilityMode + 1) % SIGNAL_VISIBILITY_PRESETS.length;
  refreshSignalVisibilityUI();
  refreshAllSignalOpacities();
}

function refreshSignalVisibilityUI() {
  const preset = SIGNAL_VISIBILITY_PRESETS[signalVisibilityMode];
  const btn = document.getElementById('btn-signal-vis');
  if (btn) {
    btn.textContent = 'Lights: ' + preset.label;
    btn.classList.toggle('active', preset.opacity >= 0.99);
  }
  const panelBtn = document.getElementById('sig-vis-panel');
  if (panelBtn) {
    panelBtn.textContent = preset.label;
    panelBtn.classList.toggle('active', preset.opacity >= 0.99);
  }
}

function updateSignalPanel() {
  const panel = document.getElementById('signal-panel');
  if (!panel) return;

  if (!selectedSignalNodeKey || (typeof driveMode !== 'undefined' && driveMode)
      || (typeof buildMode !== 'undefined' && buildMode)
      || (typeof deleteMode !== 'undefined' && deleteMode)
      || (typeof upgradeMode !== 'undefined' && upgradeMode)) {
    panel.classList.remove('visible');
    return;
  }
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal || !nd.signal.heads || nd.signal.heads.length === 0) {
    panel.classList.remove('visible');
    return;
  }
  const sig = nd.signal;
  panel.classList.add('visible');

  const enBtn = document.getElementById('sig-enabled');
  if (enBtn) {
    enBtn.textContent = sig.enabled ? 'On' : 'Off';
    enBtn.classList.toggle('active', sig.enabled);
  }
  const rorBtn = document.getElementById('sig-ror');
  if (rorBtn) {
    rorBtn.textContent = sig.rightOnRed ? 'On' : 'Off';
    rorBtn.classList.toggle('active', sig.rightOnRed);
  }
  const plBtn = document.getElementById('sig-protleft');
  if (plBtn) {
    plBtn.textContent = sig.protectedLeft ? 'On' : 'Off';
    plBtn.classList.toggle('active', sig.protectedLeft);
  }

  const setInput = (id, val) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = String(val);
  };
  setInput('sig-green', sig.timing.green);
  setInput('sig-yellow', sig.timing.yellow);
  setInput('sig-allred', sig.timing.allRed);
  setInput('sig-protleft-t', sig.timing.protLeft);

  // Heads list
  const list = document.getElementById('sig-heads-list');
  if (!list) return;
  list.innerHTML = '';
  sig.heads.forEach(head => {
    const row = document.createElement('div');
    row.className = 'sig-head-row' + (selectedSignalHeadKey === head.key ? ' selected' : '');
    row.dataset.headKey = head.key;

    const title = document.createElement('div');
    title.className = 'sig-head-title';
    title.textContent = 'Seg ' + head.segId + ' · L' + head.laneIdxs.join(',') + ' · ' + head.style;
    row.appendChild(title);

    const moves = document.createElement('div');
    moves.className = 'sig-move-btns';
    [['left', 'L'], ['straight', '↑'], ['right', 'R']].forEach(([m, label]) => {
      const b = document.createElement('button');
      b.className = 'lane-btn sig-mini' + (head.movements.includes(m) ? ' active' : '');
      b.textContent = label;
      b.title = m;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHeadMovement(selectedSignalNodeKey, head.key, m);
      });
      moves.appendChild(b);
    });
    const styleBtn = document.createElement('button');
    styleBtn.className = 'lane-btn sig-mini' + (head.style === 'arrow' || headNeedsArrows(head) ? ' active' : '');
    styleBtn.textContent = headNeedsArrows(head) ? '➤' : '●';
    styleBtn.title = 'Force arrows (on for turns / combined)';
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHeadStyle(selectedSignalNodeKey, head.key);
    });
    moves.appendChild(styleBtn);

    const rem = document.createElement('button');
    rem.className = 'lane-btn sig-mini';
    rem.textContent = '✕';
    rem.title = 'Remove head';
    rem.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSignalHead(selectedSignalNodeKey, head.key);
    });
    moves.appendChild(rem);

    row.appendChild(moves);
    row.addEventListener('click', () => {
      selectedSignalHeadKey = head.key;
      updateSignalOpacity(selectedSignalNodeKey);
      updateSignalPanel();
    });
    list.appendChild(row);
  });
}

function toggleSignalEnabled() {
  if (!selectedSignalNodeKey) return;
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal) return;
  nd.signal.enabled = !nd.signal.enabled;
  updateSignals(0);
  updateSignalPanel();
}

function toggleSignalRor() {
  if (!selectedSignalNodeKey) return;
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal) return;
  nd.signal.rightOnRed = !nd.signal.rightOnRed;
  updateSignalPanel();
}

function toggleSignalProtLeft() {
  if (!selectedSignalNodeKey) return;
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal) return;
  nd.signal.protectedLeft = !nd.signal.protectedLeft;
  rebuildPhaseRing(nd.signal);
  nd.signal.phaseIndex = 0;
  nd.signal.phaseT = 0;
  updateSignals(0);
  updateSignalPanel();
}

function applySignalTiming() {
  if (!selectedSignalNodeKey) return;
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal) return;
  const num = (id, fallback) => {
    const el = document.getElementById(id);
    const v = el ? parseFloat(el.value) : NaN;
    return (isFinite(v) && v > 0) ? v : fallback;
  };
  nd.signal.timing.green = num('sig-green', DEFAULT_TIMING.green);
  nd.signal.timing.yellow = num('sig-yellow', DEFAULT_TIMING.yellow);
  nd.signal.timing.allRed = num('sig-allred', DEFAULT_TIMING.allRed);
  nd.signal.timing.protLeft = num('sig-protleft-t', DEFAULT_TIMING.protLeft);
  rebuildPhaseRing(nd.signal);
  nd.signal.phaseIndex = 0;
  nd.signal.phaseT = 0;
  updateSignals(0);
}

function ensureOverride(sig, headKey) {
  if (!sig.overrides.has(headKey)) {
    const head = (sig.heads || []).find(h => h.key === headKey);
    sig.overrides.set(headKey, {
      movements: head ? head.movements.slice() : ['straight'],
      style: head ? head.style : 'ball',
      removed: false
    });
  }
  return sig.overrides.get(headKey);
}

function toggleHeadMovement(nodeKey, headKey, move) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return;
  const ov = ensureOverride(nd.signal, headKey);
  const set = new Set(ov.movements || []);
  if (set.has(move)) {
    if (set.size <= 1) return; // keep at least one
    set.delete(move);
  } else {
    set.add(move);
  }
  ov.movements = [];
  if (set.has('left')) ov.movements.push('left');
  if (set.has('straight')) ov.movements.push('straight');
  if (set.has('right')) ov.movements.push('right');
  resyncSignalNode(nodeKey);
}

function toggleHeadStyle(nodeKey, headKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return;
  const ov = ensureOverride(nd.signal, headKey);
  ov.style = ov.style === 'arrow' ? 'ball' : 'arrow';
  resyncSignalNode(nodeKey);
}

function removeSignalHead(nodeKey, headKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return;
  const ov = ensureOverride(nd.signal, headKey);
  ov.removed = true;
  if (selectedSignalHeadKey === headKey) selectedSignalHeadKey = null;
  resyncSignalNode(nodeKey);
}

function addSignalHead() {
  if (!selectedSignalNodeKey) return;
  const nd = nodes.get(selectedSignalNodeKey);
  if (!nd || !nd.signal) return;
  const enters = (nd.laneNodes || []).filter(l => l.type === 'in');
  if (enters.length === 0) return;
  // Pick first approach that has an entering lane
  const ln = enters[0];
  const key = headOverrideKey(ln.segId, [ln.laneIdx]) + ':custom' + Date.now();
  nd.signal.overrides.set(key, {
    movements: ['straight'],
    style: 'ball',
    removed: false,
    custom: true
  });
  // Use a simpler key the sync can find — store under segId:laneIdx with custom flag
  // Actually sync looks for ov.custom on any override key. Re-key properly:
  nd.signal.overrides.delete(key);
  const properKey = 'custom:' + ln.segId + ':' + ln.laneIdx + ':' + Date.now();
  // Better: use segId with a fake lane index that sync's custom branch handles
  const customKey = ln.segId + ':' + ln.laneIdx + ',c' + Date.now();
  nd.signal.overrides.set(customKey, {
    movements: ['straight'],
    style: 'ball',
    removed: false,
    custom: true
  });
  resyncSignalNode(selectedSignalNodeKey);
}

function resyncSignalNode(nodeKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || nd.count < 2) return;
  const [nx, ny] = nodeKey.split(',').map(Number);
  // Full rebuild of junction visuals (clears data-junction including signals, then redraws)
  calculateCurves(nx, ny);
  if (selectedSignalNodeKey === nodeKey) {
    updateSignalOpacity(nodeKey);
    updateSignalPanel();
  }
}

refreshSignalVisibilityUI();
