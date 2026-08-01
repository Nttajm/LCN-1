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
        tdx, tdy
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
      tdx, tdy
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
    // Lamps only change on phase transitions — skip repaint when unchanged
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

// ---------------- Rendering (Canvas 2D data model) ----------------

function drawSignalHeads(nodeKey, nodeX, nodeY, sig) {
  // Store drawable geometry on the signal / heads — no DOM.
  delete sig.centerHitEl;
  sig.nodeKey = nodeKey;
  sig.nodeX = nodeX;
  sig.nodeY = nodeY;
  sig.centerHitR = (typeof NODE_R !== 'undefined' ? NODE_R : 7) * 0.55;
  if (sig.opacity == null) sig.opacity = getSignalIdleOpacity();

  const hw = SIGNAL_HOUSING_W;
  const hh = SIGNAL_HOUSING_H;
  const lampYs = [-hh / 3.2, 0, hh / 3.2];
  const lampKeys = ['red', 'yellow', 'green'];

  sig.heads.forEach(head => {
    delete head.els;
    // Housing: vertical stack of 3 lamps, long axis perpendicular to travel.
    // After rotate(+90 from travel), local +Y is "up the pole" / across roadway.
    head.housing = {
      x: -hw / 2,
      y: -hh / 2,
      w: hw,
      h: hh,
      rx: 0.55,
      fill: '#1a1c22',
      stroke: '#0a0b0e',
      strokeWidth: 0.35
    };
    head.hitRect = {
      x: -hw / 2 - 0.6,
      y: -hh / 2 - 0.6,
      w: hw + 1.2,
      h: hh + 1.2
    };

    const showArrows = headNeedsArrows(head);
    head.showArrows = showArrows;
    head.arrowPaths = showArrows
      ? buildMovementArrowPaths(head.movements, SIGNAL_LAMP_R * 0.78)
      : [];

    const lamps = {};
    lampKeys.forEach((color, i) => {
      lamps[color] = {
        cx: 0,
        cy: lampYs[i],
        r: SIGNAL_LAMP_R,
        fill: SIGNAL_COLORS.off,
        opacity: 0.55,
        stroke: '#0a0b0e',
        strokeWidth: 0.2,
        arrowFill: '#4a4e5a',
        arrowOpacity: 0.7,
        arrowGroupOpacity: 0.85
      };
    });
    head.lamps = lamps;
    head._lit = undefined;
    head._litForced = undefined;
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
 * Build movement arrow glyph polygons (arrays of [x,y] points) in lamp-local
 * coords: -Y = straight (up for the driver), -X = left, +X = right.
 */
function buildMovementArrowPaths(movements, scale) {
  const hasL = movements.includes('left');
  const hasS = movements.includes('straight');
  const hasR = movements.includes('right');
  const n = (hasL ? 1 : 0) + (hasS ? 1 : 0) + (hasR ? 1 : 0);
  const s = scale;
  const paths = [];

  const push = (kind, ox, oy, sc) => {
    paths.push(arrowGlyphPoints(kind, ox, oy, sc));
  };

  // Combined layouts squeeze arrows side-by-side; single fills the lamp.
  if (n === 1) {
    if (hasL) push('left', 0, 0, s);
    else if (hasR) push('right', 0, 0, s);
    else push('straight', 0, 0, s);
    return paths;
  }
  if (hasL && hasS && !hasR) {
    push('left', -s * 0.28, 0, s * 0.72);
    push('straight', s * 0.32, 0, s * 0.72);
    return paths;
  }
  if (hasR && hasS && !hasL) {
    push('straight', -s * 0.32, 0, s * 0.72);
    push('right', s * 0.28, 0, s * 0.72);
    return paths;
  }
  if (hasL && hasR && !hasS) {
    push('left', -s * 0.32, 0, s * 0.7);
    push('right', s * 0.32, 0, s * 0.7);
    return paths;
  }
  // All three (or fallback): compact triad
  push('left', -s * 0.38, s * 0.05, s * 0.55);
  push('straight', 0, -s * 0.08, s * 0.55);
  push('right', s * 0.38, s * 0.05, s * 0.55);
  return paths;
}

function arrowGlyphPoints(kind, ox, oy, s) {
  if (kind === 'straight') {
    // Shaft + head pointing -Y (up toward destination for the driver)
    const w = s * 0.2;
    return [
      [ox - w, oy + s * 0.72],
      [ox + w, oy + s * 0.72],
      [ox + w, oy - s * 0.08],
      [ox + s * 0.45, oy - s * 0.08],
      [ox, oy - s * 0.88],
      [ox - s * 0.45, oy - s * 0.08],
      [ox - w, oy - s * 0.08]
    ];
  }
  return arrowTurnPoints(ox, oy, s, kind === 'left' ? -1 : 1);
}

/** Horizontal turn arrow: sign -1 = left (−X), +1 = right (+X). */
function arrowTurnPoints(ox, oy, s, sign) {
  // Stem rises, then bends sideways into a chevron tip
  const tip = ox + sign * s * 0.88;
  const elbow = ox + sign * s * 0.08;
  const back = ox - sign * s * 0.42;
  const w = s * 0.18;
  return [
    [back, oy + s * 0.7],
    [elbow, oy + s * 0.7],
    [elbow, oy + w],
    [ox + sign * s * 0.22, oy + w],
    [ox + sign * s * 0.22, oy + s * 0.42],
    [tip, oy],
    [ox + sign * s * 0.22, oy - s * 0.42],
    [ox + sign * s * 0.22, oy - w],
    [back, oy - w]
  ];
}

function paintSignalLamps(sig, forceOff) {
  const phase = (!forceOff && sig.phases && sig.phases[sig.phaseIndex]) ? sig.phases[sig.phaseIndex] : null;
  const heads = sig.heads || [];

  for (let hi = 0; hi < heads.length; hi++) {
    const head = heads[hi];
    if (!head.lamps) continue;
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

    // Skip when this head's lit color is unchanged
    if (head._lit === lit && head._litForced === !!forceOff) continue;
    head._lit = lit;
    head._litForced = !!forceOff;

    const lampColors = ['red', 'yellow', 'green'];
    for (let ci = 0; ci < 3; ci++) {
      const color = lampColors[ci];
      const lamp = head.lamps[color];
      if (!lamp) continue;
      const on = lit === color;
      lamp.fill = on ? SIGNAL_COLORS[color] : SIGNAL_COLORS.off;
      lamp.opacity = on ? 1 : 0.55;
      if (on) {
        lamp.stroke = SIGNAL_COLORS[color];
        lamp.strokeWidth = 0.35;
      } else {
        lamp.stroke = '#0a0b0e';
        lamp.strokeWidth = 0.2;
      }
      // Arrow glyphs: bright when lit, dark when off
      lamp.arrowFill = on ? '#0a0b0e' : '#4a4e5a';
      lamp.arrowOpacity = on ? 0.92 : 0.7;
      lamp.arrowGroupOpacity = on ? 1 : 0.85;
    }
  }
}

function updateSignalOpacity(nodeKey) {
  const nd = nodes.get(nodeKey);
  if (!nd || !nd.signal) return;
  const selected = selectedSignalNodeKey === nodeKey;
  const inEditor = (typeof driveMode === 'undefined' || !driveMode)
    && (typeof buildMode === 'undefined' || !buildMode)
    && (typeof deleteMode === 'undefined' || !deleteMode)
    && (typeof upgradeMode === 'undefined' || !upgradeMode);
  const idle = getSignalIdleOpacity();
  nd.signal.opacity = (selected && inEditor) ? 1 : idle;
}

/**
 * Immediate-mode Canvas draw of all signalized junctions.
 * Call from renderFrame() after the world transform is set.
 */
function drawAllSignalsCanvas(c) {
  if (!c || typeof nodes === 'undefined') return;

  const entries = [];
  nodes.forEach((nd, nodeKey) => {
    if (nd.signal && nd.signal.heads && nd.signal.heads.length) {
      entries.push([nodeKey, nd]);
    }
  });
  // Selected junction last so it paints above neighbors (SVG used appendChild).
  entries.sort((a, b) => {
    const aSel = a[0] === selectedSignalNodeKey ? 1 : 0;
    const bSel = b[0] === selectedSignalNodeKey ? 1 : 0;
    return aSel - bSel;
  });

  for (let ei = 0; ei < entries.length; ei++) {
    const nodeKey = entries[ei][0];
    const nd = entries[ei][1];
    const sig = nd.signal;
    const opacity = sig.opacity != null ? sig.opacity : getSignalIdleOpacity();
    if (opacity <= 0) continue;

    c.save();
    c.globalAlpha = opacity;

    const nx = sig.nodeX != null ? sig.nodeX : Number(String(nodeKey).split(',')[0]);
    const ny = sig.nodeY != null ? sig.nodeY : Number(String(nodeKey).split(',')[1]);
    const hitR = sig.centerHitR != null
      ? sig.centerHitR
      : (typeof NODE_R !== 'undefined' ? NODE_R : 7) * 0.55;

    // Center hit circle (dashed yellow) — visual cue / grab target
    c.beginPath();
    c.arc(nx, ny, hitR, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,224,102,0.08)';
    c.fill();
    c.strokeStyle = 'rgba(255,224,102,0.35)';
    c.lineWidth = 0.5;
    c.setLineDash([1.5, 1.2]);
    c.stroke();
    c.setLineDash([]);

    const heads = sig.heads;
    for (let hi = 0; hi < heads.length; hi++) {
      drawSignalHeadCanvas(c, heads[hi]);
    }

    c.restore();
  }
}

function drawSignalHeadCanvas(c, head) {
  if (!head) return;
  const housing = head.housing;
  const lamps = head.lamps;
  if (!housing || !lamps) return;

  c.save();
  c.translate(head.x, head.y);
  c.rotate((head.angleDeg || 0) * Math.PI / 180);

  // Housing roundRect
  signalRoundRectPath(c, housing.x, housing.y, housing.w, housing.h, housing.rx || 0.55);
  c.fillStyle = housing.fill || '#1a1c22';
  c.fill();
  c.strokeStyle = housing.stroke || '#0a0b0e';
  c.lineWidth = housing.strokeWidth != null ? housing.strokeWidth : 0.35;
  c.stroke();

  const lampKeys = ['red', 'yellow', 'green'];
  const arrowPaths = head.showArrows ? (head.arrowPaths || []) : [];
  for (let ci = 0; ci < 3; ci++) {
    const color = lampKeys[ci];
    const lamp = lamps[color];
    if (!lamp) continue;

    c.save();
    c.globalAlpha *= (lamp.opacity != null ? lamp.opacity : 1);
    c.beginPath();
    c.arc(lamp.cx || 0, lamp.cy || 0, lamp.r != null ? lamp.r : SIGNAL_LAMP_R, 0, Math.PI * 2);
    c.fillStyle = lamp.fill || SIGNAL_COLORS.off;
    c.fill();
    c.strokeStyle = lamp.stroke || '#0a0b0e';
    c.lineWidth = lamp.strokeWidth != null ? lamp.strokeWidth : 0.2;
    c.stroke();
    c.restore();

    if (arrowPaths.length) {
      c.save();
      c.translate(lamp.cx || 0, lamp.cy || 0);
      c.globalAlpha *= (lamp.arrowGroupOpacity != null ? lamp.arrowGroupOpacity : 1)
        * (lamp.arrowOpacity != null ? lamp.arrowOpacity : 1);
      c.fillStyle = lamp.arrowFill || '#4a4e5a';
      for (let pi = 0; pi < arrowPaths.length; pi++) {
        fillPolygonPoints(c, arrowPaths[pi]);
      }
      c.restore();
    }
  }

  c.restore();
}

function signalRoundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  if (typeof c.roundRect === 'function') {
    c.beginPath();
    c.roundRect(x, y, w, h, rr);
    return;
  }
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function fillPolygonPoints(c, pts) {
  if (!pts || pts.length < 3) return;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
}

/**
 * Hit-test signal geometry in world space.
 * Returns { nodeKey, headKey } (headKey null for center) or null.
 */
function hitTestSignalAt(worldX, worldY) {
  if (typeof nodes === 'undefined') return null;
  let centerHit = null;

  for (const [nodeKey, nd] of nodes) {
    const sig = nd.signal;
    if (!sig || !sig.heads || !sig.heads.length) continue;

    for (let hi = 0; hi < sig.heads.length; hi++) {
      const head = sig.heads[hi];
      const hr = head.hitRect || {
        x: -SIGNAL_HOUSING_W / 2 - 0.6,
        y: -SIGNAL_HOUSING_H / 2 - 0.6,
        w: SIGNAL_HOUSING_W + 1.2,
        h: SIGNAL_HOUSING_H + 1.2
      };
      if (pointInRotatedRect(worldX, worldY, head.x, head.y, head.angleDeg || 0, hr)) {
        return { nodeKey, headKey: head.key };
      }
    }

    const nx = sig.nodeX != null ? sig.nodeX : Number(String(nodeKey).split(',')[0]);
    const ny = sig.nodeY != null ? sig.nodeY : Number(String(nodeKey).split(',')[1]);
    const r = sig.centerHitR != null
      ? sig.centerHitR
      : (typeof NODE_R !== 'undefined' ? NODE_R : 7) * 0.55;
    if (Math.hypot(worldX - nx, worldY - ny) <= r) {
      if (!centerHit) centerHit = { nodeKey, headKey: null };
    }
  }
  return centerHit;
}

/** Inverse of Canvas/SVG translate(ox,oy) rotate(angleDeg); test axis-aligned local rect. */
function pointInRotatedRect(wx, wy, ox, oy, angleDeg, rect) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = wx - ox;
  const dy = wy - oy;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  return lx >= rect.x && lx <= rect.x + rect.w
      && ly >= rect.y && ly <= rect.y + rect.h;
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
