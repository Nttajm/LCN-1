// ================================================================
// lanes.js — MUTCD-style road skins (pavement + lane markings)
//
// Replaces the debug colored-centerline road paint with realistic
// asphalt + yellow/white markings, driven by the same lane-graph
// offsets cars already drive on (getLaneSpecs).
//
// Sections:
//   A — mid-block pavement + markings (overrides drawSegmentGeometryCanvas)
//   B — approach solid lane lines + limit/stop bar (after drawAllSegmentsCanvas)
//   C — seamless pavement + MUTCD markings at plain 2-road connectors
//       (same asphalt / edges / yellow center / white lane lines as mid-block;
//       yellow omitted on one-ways; unpaired lane-add/drop lines skipped)
//
// Toggle: view-bar "Road skin" button (Realistic ↔ Debug). Default Realistic.
// Intersection interiors (3+ way), dead-end bulbs, signals — left alone.
// ================================================================

(function initRoadLaneSkins() {
  // NOTE: not 'use strict' — we reassign global draw* helpers the same way
  // items.js patches serializeCurrentMap (bare identifier = global binding).

  // ------------------------------------------------------------------
  // Constants (MUTCD Part 3B, scaled to world units ≈ meters)
  // ------------------------------------------------------------------
  // 1 world unit ≈ 1 m ≈ 3.28 ft. LANE_OFFSET (4) ≈ 13 ft lane centers.
  const FT = 0.3048;

  const SKIN = {
    asphalt: '#6a6e74',
    asphaltEdge: 'rgba(48, 52, 58, 0.55)',
    yellow: '#f1d145',
    white: '#f4f6f8',
    arrow: 'rgba(235, 238, 242, 0.55)',
    underAsphalt: null, // filled from UNDERPASS_BED when available
    underYellow: '#9a9aa0',
    underWhite: '#b0b4ba',
    underArrow: 'rgba(160, 164, 172, 0.35)',

    // Line widths (world units). MUTCD normal ≈ 4–6 in; stop ≈ 12–24 in.
    // Slightly thickened so they stay readable at typical zoom.
    lineW: 0.28,
    edgeW: 0.32,
    doubleGap: 0.38,
    stopW: 0.55,

    // Broken line: MUTCD 10 ft / 30 ft → ~1:3
    dashOn: 10 * FT,   // ≈ 3.05
    dashOff: 30 * FT,  // ≈ 9.14
    // Short dotted (lane addition / merge): 2 ft / 4 ft
    dotOn: 2 * FT,
    dotOff: 4 * FT,

    shoulder: 0.35,          // past outer half-lane for pavement edge
    approachZone: 14,        // solid lane lines before controlled stub
    stopBarInset: 0.15,      // pull bar slightly back from stub tip
    curveSamples: 18
  };

  function laneOffset() {
    return (typeof LANE_OFFSET === 'number') ? LANE_OFFSET : 4;
  }

  function ribbonHalf() {
    return laneOffset() * 0.5;
  }

  // ------------------------------------------------------------------
  // Toggle
  // ------------------------------------------------------------------
  let roadSkinRealistic = true;
  try {
    const saved = localStorage.getItem('trafficSim4_7_road_skin');
    if (saved === 'debug') roadSkinRealistic = false;
    if (saved === 'realistic') roadSkinRealistic = true;
  } catch (_) {}

  window.roadSkinRealistic = roadSkinRealistic;

  function setRoadSkinRealistic(on) {
    roadSkinRealistic = !!on;
    window.roadSkinRealistic = roadSkinRealistic;
    try {
      localStorage.setItem('trafficSim4_7_road_skin', roadSkinRealistic ? 'realistic' : 'debug');
    } catch (_) {}
    syncSkinToggleBtn();
    if (typeof invalidateWorldCache === 'function') invalidateWorldCache();
    if (typeof renderFrame === 'function') renderFrame();
  }

  function toggleRoadSkinMode() {
    setRoadSkinRealistic(!roadSkinRealistic);
  }
  window.toggleRoadSkinMode = toggleRoadSkinMode;

  function syncSkinToggleBtn() {
    const btn = document.getElementById('view-btn-road-skin');
    if (!btn) return;
    btn.classList.toggle('active', roadSkinRealistic);
    btn.title = roadSkinRealistic
      ? 'Road skin: Realistic (click for debug lane colors)'
      : 'Road skin: Debug (click for realistic MUTCD paint)';
  }

  function injectSkinToggle() {
    const bar = document.getElementById('view-bar');
    if (!bar || document.getElementById('view-btn-road-skin')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'view-btn' + (roadSkinRealistic ? ' active' : '');
    btn.id = 'view-btn-road-skin';
    btn.title = '';
    btn.setAttribute('aria-label', 'Toggle road skin');
    btn.onclick = toggleRoadSkinMode;
    btn.innerHTML =
      '<span aria-hidden="true" style="display:block;width:18px;height:14px;position:relative">' +
      '<span style="position:absolute;left:1px;right:1px;top:1px;height:12px;border-radius:2px;background:#6a6e74;border:1px solid #4a4e54"></span>' +
      '<span style="position:absolute;left:8px;top:1px;width:2px;height:12px;background:#f1d145"></span>' +
      '<span style="position:absolute;left:2px;top:1px;width:1.5px;height:12px;background:#fff"></span>' +
      '<span style="position:absolute;right:2px;top:1px;width:1.5px;height:12px;background:#fff"></span>' +
      '</span>';
    // Insert after graph-color so it sits near other visual toggles
    const after = document.getElementById('view-btn-graph-color');
    if (after && after.nextSibling) bar.insertBefore(btn, after.nextSibling);
    else bar.appendChild(btn);
    syncSkinToggleBtn();
  }

  // ------------------------------------------------------------------
  // Geometry helpers
  // ------------------------------------------------------------------
  function bezierPoint(c, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * c.x1 + 3 * mt * mt * t * c.c1x + 3 * mt * t * t * c.c2x + t * t * t * c.x2,
      y: mt * mt * mt * c.y1 + 3 * mt * mt * t * c.c1y + 3 * mt * t * t * c.c2y + t * t * t * c.y2
    };
  }

  function bezierTangent(c, t) {
    const mt = 1 - t;
    const dx = 3 * mt * mt * (c.c1x - c.x1) + 6 * mt * t * (c.c2x - c.c1x) + 3 * t * t * (c.x2 - c.c2x);
    const dy = 3 * mt * mt * (c.c1y - c.y1) + 6 * mt * t * (c.c2y - c.c1y) + 3 * t * t * (c.y2 - c.c2y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function sampleBezier(curve, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = bezierPoint(curve, t);
      const tan = bezierTangent(curve, t);
      pts.push({ x: p.x, y: p.y, tx: tan.x, ty: tan.y, nx: -tan.y, ny: tan.x, t });
    }
    return pts;
  }

  function strokePolyline(c, pts, closed) {
    if (!pts || pts.length < 2) return;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    if (closed) c.closePath();
  }

  function strokeAlong(c, pts, style, width, dash) {
    if (!pts || pts.length < 2) return;
    c.save();
    c.strokeStyle = style;
    c.lineWidth = width;
    c.lineCap = 'butt';
    c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    strokePolyline(c, pts, false);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  // ------------------------------------------------------------------
  // Marking layout from lane specs
  // ------------------------------------------------------------------
  function layoutFromSpecs(specs, lanesIn, lanesOut) {
    const LO = laneOffset();
    const oneWay = (typeof isPureOneWay === 'function')
      ? isPureOneWay(lanesIn, lanesOut)
      : ((lanesIn === 0 && lanesOut > 0) || (lanesOut === 0 && lanesIn > 0));
    const total = specs.length;
    let maxAbs = 0;
    for (let i = 0; i < specs.length; i++) {
      const a = Math.abs(specs[i].offset);
      if (a > maxAbs) maxAbs = a;
    }
    const halfLane = LO * 0.5;
    const bedHalf = maxAbs + halfLane + SKIN.shoulder;

    // Center line offset: midpoint between last inbound and first outbound
    let centerOff = 0;
    if (!oneWay && lanesIn > 0 && lanesOut > 0) {
      const lastIn = specs[lanesIn - 1];
      const firstOut = specs[lanesIn];
      centerOff = (lastIn.offset + firstOut.offset) * 0.5;
    }

    const whiteLaneLines = [];
    for (let i = 0; i < specs.length - 1; i++) {
      const a = specs[i], b = specs[i + 1];
      if (a.forward !== b.forward) continue; // opposing — yellow owns this gap
      whiteLaneLines.push((a.offset + b.offset) * 0.5);
    }

    // Outer edges: left = min offset - halfLane, right = max + halfLane
    let minOff = Infinity, maxOff = -Infinity;
    for (let i = 0; i < specs.length; i++) {
      if (specs[i].offset < minOff) minOff = specs[i].offset;
      if (specs[i].offset > maxOff) maxOff = specs[i].offset;
    }
    if (!isFinite(minOff)) { minOff = -halfLane; maxOff = halfLane; }
    const leftEdge = minOff - halfLane;
    const rightEdge = maxOff + halfLane;

    // Yellow style
    let yellowStyle = 'none'; // none | broken | double
    if (!oneWay) {
      if (total <= 2) yellowStyle = 'broken';
      else yellowStyle = 'double';
    }

    return {
      oneWay, total, bedHalf, centerOff, whiteLaneLines,
      leftEdge, rightEdge, yellowStyle, halfLane
    };
  }

  function palette(under) {
    if (under) {
      return {
        asphalt: (typeof UNDERPASS_BED === 'string') ? UNDERPASS_BED : 'rgba(70, 74, 84, 0.42)',
        edge: (typeof UNDERPASS_BED_EDGE === 'string') ? UNDERPASS_BED_EDGE : 'rgba(48, 52, 60, 0.28)',
        yellow: SKIN.underYellow,
        white: SKIN.underWhite,
        arrow: SKIN.underArrow,
        alpha: (typeof UNDERPASS_LANE_OPACITY === 'number') ? UNDERPASS_LANE_OPACITY : 0.28
      };
    }
    return {
      asphalt: SKIN.asphalt,
      edge: SKIN.asphaltEdge,
      yellow: SKIN.yellow,
      white: SKIN.white,
      arrow: SKIN.arrow,
      alpha: 1
    };
  }

  // ------------------------------------------------------------------
  // Section A — mid-block skin
  // ------------------------------------------------------------------
  function paintSegmentSkin(c, x1, y1, x2, y2, lanesIn, lanesOut, laneAlpha, arrowAlpha, dash) {
    const getSpecs = (typeof getLaneSpecs === 'function') ? getLaneSpecs : null;
    if (!getSpecs) return;
    const specs = getSpecs(lanesIn, lanesOut);
    const dx = x2 - x1, dy = y2 - y1;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.01 || !specs.length) return;

    const ux = dx / segLen, uy = dy / segLen;
    const perpX = -uy, perpY = ux;
    const under = !!dash;
    const pal = palette(under);
    const lay = layoutFromSpecs(specs, lanesIn, lanesOut);
    const alphaMul = (laneAlpha != null ? laneAlpha : 1) * (under ? 1 : 1);
    const lod = typeof getRoadLodLevel === 'function'
      ? getRoadLodLevel(typeof view !== 'undefined' ? view.scale : 1)
      : 2;

    c.save();
    c.globalAlpha = Math.min(1, alphaMul * (under ? 1 : 0.95));

    const ox = perpX * lay.bedHalf, oy = perpY * lay.bedHalf;
    c.fillStyle = pal.asphalt;
    c.beginPath();
    c.moveTo(x1 + ox, y1 + oy);
    c.lineTo(x2 + ox, y2 + oy);
    c.lineTo(x2 - ox, y2 - oy);
    c.lineTo(x1 - ox, y1 - oy);
    c.closePath();
    c.fill();

    if (lod === 0) {
      c.restore();
      return;
    }

    c.strokeStyle = pal.edge;
    c.lineWidth = 0.8;
    c.lineCap = 'butt';
    c.lineJoin = 'miter';
    c.beginPath();
    c.moveTo(x1 + ox, y1 + oy);
    c.lineTo(x2 + ox, y2 + oy);
    c.stroke();
    c.beginPath();
    c.moveTo(x1 - ox, y1 - oy);
    c.lineTo(x2 - ox, y2 - oy);
    c.stroke();

    function strokeOffset(off, color, width, dashArr) {
      const a = { x: x1 + perpX * off, y: y1 + perpY * off };
      const b = { x: x2 + perpX * off, y: y2 + perpY * off };
      c.save();
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = 'butt';
      c.globalAlpha = Math.min(1, (under ? pal.alpha + 0.35 : 0.92) * alphaMul);
      if (dashArr) c.setLineDash(dashArr);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }

    const broken = [SKIN.dashOn, SKIN.dashOff];

    if (lay.oneWay) {
      const outOnly = lanesIn === 0 && lanesOut > 0;
      if (outOnly) {
        strokeOffset(lay.rightEdge, pal.yellow, SKIN.edgeW, null);
        strokeOffset(lay.leftEdge, pal.white, SKIN.edgeW, null);
      } else {
        strokeOffset(lay.leftEdge, pal.yellow, SKIN.edgeW, null);
        strokeOffset(lay.rightEdge, pal.white, SKIN.edgeW, null);
      }
    } else {
      strokeOffset(lay.leftEdge, pal.white, SKIN.edgeW, null);
      strokeOffset(lay.rightEdge, pal.white, SKIN.edgeW, null);
    }

    if (lay.yellowStyle === 'broken') {
      if (lod >= 2) strokeOffset(lay.centerOff, pal.yellow, SKIN.lineW, broken);
      else strokeOffset(lay.centerOff, pal.yellow, SKIN.lineW, null);
    } else if (lay.yellowStyle === 'double') {
      const g = SKIN.doubleGap * 0.5;
      strokeOffset(lay.centerOff - g, pal.yellow, SKIN.lineW, null);
      strokeOffset(lay.centerOff + g, pal.yellow, SKIN.lineW, null);
    }

    if (lod >= 2) {
      for (let i = 0; i < lay.whiteLaneLines.length; i++) {
        strokeOffset(lay.whiteLaneLines[i], pal.white, SKIN.lineW, broken);
      }
    }

    c.restore();

    if (lod >= 2 && typeof drawLaneArrowsCanvas === 'function') {
      const aAlpha = arrowAlpha != null ? arrowAlpha * 0.7 : 0.35;
      const arrowLen = under ? 5 : 6;
      const spacing = 28;
      specs.forEach(spec => {
        drawLaneArrowsCanvas(
          c, x1, y1, x2, y2, ux, uy, perpX, perpY,
          spec.offset, spec.forward, pal.arrow,
          arrowLen, 0.45, spacing, aAlpha
        );
      });
    }
  }

  // ------------------------------------------------------------------
  // Section B — approach solid lines + limit / stop bar
  // ------------------------------------------------------------------
  function approachIsControlled(nd, segId) {
    if (!nd) return false;
    const ctrl = nd.approachControls && nd.approachControls[segId];
    if (ctrl === 'stop' || ctrl === 'yield') return true;
    if (nd.signal && nd.signal.enabled) return true;
    return false;
  }

  function isPlainTwoWayConnector(nd) {
    if (!nd || nd.count !== 2) return false;
    if (nd.signal && nd.signal.enabled) return false;
    if (typeof junctionHasApproachControls === 'function' && junctionHasApproachControls(nd)) {
      return false;
    }
    // No stop/yield on any approach
    if (nd.approachControls) {
      const keys = Object.keys(nd.approachControls);
      for (let i = 0; i < keys.length; i++) {
        const v = nd.approachControls[keys[i]];
        if (v === 'stop' || v === 'yield') return false;
      }
    }
    return true;
  }

  function drawApproachLimitLinesCanvas(c) {
    if (!roadSkinRealistic) return;
    if (typeof segments === 'undefined' || !segments || !segments.length) return;
    if (typeof nodes === 'undefined' || !nodes) return;
    const lod = typeof getRoadLodLevel === 'function'
      ? getRoadLodLevel(typeof view !== 'undefined' ? view.scale : 1)
      : 2;
    if (lod < 1) return;
    const vp = (typeof _drawVp !== 'undefined' && _drawVp)
      || (typeof getWorldViewport === 'function' ? getWorldViewport(40) : null);

    const zone = SKIN.approachZone;
    const pal = palette(false);

    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      if (seg.underpasses && seg.underpasses.length) {
        // Skip underpass segments for approach bars (still painted mid-block by A)
        // Actually still paint if the end itself isn't under — keep simple: paint all.
      }
      const short = (typeof shortenSegment === 'function')
        ? shortenSegment(seg)
        : { x1: seg.startNode.x, y1: seg.startNode.y, x2: seg.endNode.x, y2: seg.endNode.y };
      if (typeof segIntersectsView === 'function'
          && !segIntersectsView(short.x1, short.y1, short.x2, short.y2, 20, vp)) {
        continue;
      }

      const dx = short.x2 - short.x1, dy = short.y2 - short.y1;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 0.5) continue;
      const ux = dx / segLen, uy = dy / segLen;
      const perpX = -uy, perpY = ux;

      const dirs = (typeof getRoadDirs === 'function')
        ? getRoadDirs(seg)
        : { lanesIn: seg.lanesIn || 0, lanesOut: seg.lanesOut || 0 };
      const specs = (typeof getLaneSpecs === 'function')
        ? getLaneSpecs(dirs.lanesIn, dirs.lanesOut)
        : [];
      if (!specs.length) continue;
      const lay = layoutFromSpecs(specs, dirs.lanesIn, dirs.lanesOut);

      // ends: 'start' and 'end' of the painted short segment
      const ends = [
        {
          which: 'start',
          nodeKey: (typeof getNodeKey === 'function')
            ? getNodeKey(seg.startNode.x, seg.startNode.y)
            : (seg.startNode.x + ',' + seg.startNode.y),
          stubX: short.x1, stubY: short.y1,
          // travel toward stub = opposite of start→end
          towardUx: -ux, towardUy: -uy,
          // lanes entering this node from this segment: travel toward start
          // type 'in' when isStart !== spec.forward → at start, in = !forward
          approaching: specs.filter(s => !s.forward)
        },
        {
          which: 'end',
          nodeKey: (typeof getNodeKey === 'function')
            ? getNodeKey(seg.endNode.x, seg.endNode.y)
            : (seg.endNode.x + ',' + seg.endNode.y),
          stubX: short.x2, stubY: short.y2,
          towardUx: ux, towardUy: uy,
          // at end node, in = forward
          approaching: specs.filter(s => s.forward)
        }
      ];

      for (let ei = 0; ei < ends.length; ei++) {
        const end = ends[ei];
        const nd = nodes.get(end.nodeKey);
        if (!approachIsControlled(nd, seg.id)) continue;
        // Skip plain 2-leg connectors (no bars there)
        if (isPlainTwoWayConnector(nd)) continue;
        // Need a real junction (count >= 2) or signed approach
        if (!nd || (nd.count < 2 && !(typeof isDeadEndTurnaround === 'function' && isDeadEndTurnaround(nd)))) {
          continue;
        }
        // Dead-end bulbs: no stop bar
        if (typeof isDeadEndTurnaround === 'function' && isDeadEndTurnaround(nd) && nd.count === 1) {
          continue;
        }

        const app = end.approaching;
        if (!app.length) continue;

        // Zone along segment: from stub back `zone` units along -toward
        const backX = -end.towardUx;
        const backY = -end.towardUy;
        const zLen = Math.min(zone, segLen * 0.45);
        const z0x = end.stubX + backX * zLen;
        const z0y = end.stubY + backY * zLen;
        const z1x = end.stubX - end.towardUx * SKIN.stopBarInset;
        const z1y = end.stubY - end.towardUy * SKIN.stopBarInset;

        // Solidify same-direction white lane lines in the approach zone
        const appLayWhite = [];
        for (let i = 0; i < app.length - 1; i++) {
          appLayWhite.push((app[i].offset + app[i + 1].offset) * 0.5);
        }

        c.save();
        c.strokeStyle = pal.white;
        c.lineWidth = SKIN.lineW;
        c.lineCap = 'butt';
        c.globalAlpha = 0.95;
        for (let i = 0; i < appLayWhite.length; i++) {
          const off = appLayWhite[i];
          c.beginPath();
          c.moveTo(z0x + perpX * off, z0y + perpY * off);
          c.lineTo(z1x + perpX * off, z1y + perpY * off);
          c.stroke();
        }

        // Solidify yellow if broken (2-lane approach often goes solid / double)
        if (lay.yellowStyle === 'broken' && !lay.oneWay) {
          c.strokeStyle = pal.yellow;
          // Paint double solid yellow through the approach zone
          const g = SKIN.doubleGap * 0.5;
          for (const goff of [-g, g]) {
            const off = lay.centerOff + goff;
            c.beginPath();
            c.moveTo(z0x + perpX * off, z0y + perpY * off);
            c.lineTo(z1x + perpX * off, z1y + perpY * off);
            c.stroke();
          }
        }

        // Limit / stop bar across approaching lanes only
        let minA = Infinity, maxA = -Infinity;
        for (let i = 0; i < app.length; i++) {
          const o = app[i].offset;
          if (o < minA) minA = o;
          if (o > maxA) maxA = o;
        }
        const half = ribbonHalf();
        const barLeft = minA - half;
        const barRight = maxA + half;
        // On one-way, span full bed; already covered by app = all specs

        c.strokeStyle = pal.white;
        c.lineWidth = SKIN.stopW;
        c.lineCap = 'butt';
        c.beginPath();
        c.moveTo(z1x + perpX * barLeft, z1y + perpY * barLeft);
        c.lineTo(z1x + perpX * barRight, z1y + perpY * barRight);
        c.stroke();
        c.restore();
      }
    }
  }

  // ------------------------------------------------------------------
  // Section C — seamless pavement + markings at plain 2-road connectors
  //
  // Same asphalt / outer edges / yellow center / white lane lines as
  // Section A, flowing along tangent-matched beziers between the two
  // roads' stub tips. Yellow is omitted when either side is one-way.
  // Lane-count changes only keep lines that exist on both sides.
  // ------------------------------------------------------------------

  // Reconstruct per-segment "direction away from this node" data, the same
  // way index4_7.html's calculateCurves does internally (kept local so
  // lanes.js does not depend on that closure).
  function computeNodeDirections(nd, nodeX, nodeY) {
    const dirs = [];
    (nd.segments || []).forEach(segment => {
      const isStart = segment.startNode.x === nodeX && segment.startNode.y === nodeY;
      const otherX = isStart ? segment.endNode.x : segment.startNode.x;
      const otherY = isStart ? segment.endNode.y : segment.startNode.y;
      const dx = otherX - nodeX, dy = otherY - nodeY;
      const length = Math.hypot(dx, dy);
      if (length === 0) return;
      const rd = (typeof getRoadDirs === 'function')
        ? getRoadDirs(segment)
        : { lanesIn: segment.lanesIn || 0, lanesOut: segment.lanesOut || 0 };
      dirs.push({
        segment, isStart,
        awayX: dx / length, awayY: dy / length,
        lanesIn: rd.lanesIn, lanesOut: rd.lanesOut
      });
    });
    return dirs;
  }

  function stubPointFor(dir) {
    const seg = dir.segment;
    const short = (typeof shortenSegment === 'function')
      ? shortenSegment(seg)
      : { x1: seg.startNode.x, y1: seg.startNode.y, x2: seg.endNode.x, y2: seg.endNode.y };
    return dir.isStart ? { x: short.x1, y: short.y1 } : { x: short.x2, y: short.y2 };
  }

  // Pavement + marking edge corners for one approach, in the segment's
  // OWN start->end frame (same frame Section A uses) so they line up
  // exactly with that road's already-painted bed and edge lines.
  //   bed*  = outer asphalt outline (±bedHalf, includes shoulder)
  //   mark* = MUTCD edge-line offsets (leftEdge / rightEdge)
  function directionEdgeInfo(dir) {
    const seg = dir.segment;
    const sdx = seg.endNode.x - seg.startNode.x, sdy = seg.endNode.y - seg.startNode.y;
    const slen = Math.hypot(sdx, sdy) || 1;
    const perpX = -sdy / slen, perpY = sdx / slen;
    const specs = (typeof getLaneSpecs === 'function') ? getLaneSpecs(dir.lanesIn, dir.lanesOut) : [];
    if (!specs.length) return null;
    const lay = layoutFromSpecs(specs, dir.lanesIn, dir.lanesOut);
    const stub = stubPointFor(dir);
    function at(off) {
      return { x: stub.x + perpX * off, y: stub.y + perpY * off };
    }
    return {
      dir, lay, specs, at,
      bedA: at(-lay.bedHalf), bedB: at(lay.bedHalf),
      markA: at(lay.leftEdge), markB: at(lay.rightEdge)
    };
  }

  // MUTCD edge colors for one approach (geometric leftEdge / rightEdge).
  function edgeColorsFor(info) {
    const lay = info.lay;
    const palW = 'white', palY = 'yellow';
    if (!lay.oneWay) return { left: palW, right: palW };
    const outOnly = info.dir.lanesIn === 0 && info.dir.lanesOut > 0;
    // Same mapping as Section A paintSegmentSkin.
    return outOnly
      ? { left: palW, right: palY }
      : { left: palY, right: palW };
  }

  function pairedEdgeColor(pal, aKey, bKey) {
    return (aKey === 'yellow' && bKey === 'yellow') ? pal.yellow : pal.white;
  }

  // Standard segment-segment crossing test (proper intersection only).
  function segmentsCross(p1, p2, p3, p4) {
    function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
    const d1 = cross(p3, p4, p1);
    const d2 = cross(p3, p4, p2);
    const d3 = cross(p1, p2, p3);
    const d4 = cross(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  // Tangent-matched cubic bezier from corner A (pulling back into road A)
  // to corner B (continuing out into road B) — same construction as
  // buildLaneCurve, just applied to pavement edge / marking offsets.
  function buildEdgeCurve(cornerA, awayA, cornerB, awayB) {
    const dist = Math.hypot(cornerB.x - cornerA.x, cornerB.y - cornerA.y);
    const stubR = (typeof STUB_R === 'number') ? STUB_R : 13;
    const handle = Math.max(dist * 0.55, stubR * 0.4);
    return {
      x1: cornerA.x, y1: cornerA.y,
      c1x: cornerA.x - awayA.x * handle, c1y: cornerA.y - awayA.y * handle,
      c2x: cornerB.x - awayB.x * handle, c2y: cornerB.y - awayB.y * handle,
      x2: cornerB.x, y2: cornerB.y
    };
  }

  function sampleMarkingCurve(cornerA, awayA, cornerB, awayB, nSamp) {
    return sampleBezier(buildEdgeCurve(cornerA, awayA, cornerB, awayB), nSamp);
  }

  // Map a lateral offset across the connector when edge pairing is flipped.
  function mapOffsetAcross(infoFrom, offFrom, infoTo, flipped) {
    const h0 = infoFrom.lay.bedHalf || 1;
    const h1 = infoTo.lay.bedHalf || 1;
    let u = (offFrom + h0) / (2 * h0);
    if (flipped) u = 1 - u;
    return -h1 + u * (2 * h1);
  }

  function strokeAlongAlpha(c, pts, style, width, dash, alpha) {
    if (!pts || pts.length < 2) return;
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = style;
    c.lineWidth = width;
    c.lineCap = 'butt';
    c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    strokePolyline(c, pts, false);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  // Same asphalt gray + opacity as Section A (which multiplies ROAD_LANE_OPACITY
  // * 0.95 — using 0.95 alone made connectors look much darker over the light
  // board). Only the two long sides are edged (not the stub tips).
  function fillBetweenCurves(c, ptsLeft, ptsRight, pal) {
    if (!ptsLeft.length || !ptsRight.length) return;
    const roadAlpha = (typeof ROAD_LANE_OPACITY === 'number') ? ROAD_LANE_OPACITY : 0.55;
    c.save();
    c.globalAlpha = Math.min(1, roadAlpha * 0.95);
    c.fillStyle = pal.asphalt;
    c.beginPath();
    c.moveTo(ptsLeft[0].x, ptsLeft[0].y);
    for (let i = 1; i < ptsLeft.length; i++) c.lineTo(ptsLeft[i].x, ptsLeft[i].y);
    for (let i = ptsRight.length - 1; i >= 0; i--) c.lineTo(ptsRight[i].x, ptsRight[i].y);
    c.closePath();
    c.fill();
    c.strokeStyle = pal.edge;
    c.lineWidth = 0.8;
    c.lineCap = 'butt';
    c.lineJoin = 'miter';
    c.beginPath();
    c.moveTo(ptsLeft[0].x, ptsLeft[0].y);
    for (let i = 1; i < ptsLeft.length; i++) c.lineTo(ptsLeft[i].x, ptsLeft[i].y);
    c.stroke();
    c.beginPath();
    c.moveTo(ptsRight[0].x, ptsRight[0].y);
    for (let i = 1; i < ptsRight.length; i++) c.lineTo(ptsRight[i].x, ptsRight[i].y);
    c.stroke();
    c.restore();
  }

  function drawLaneTransitionsCanvas(c) {
    if (!roadSkinRealistic) return;
    if (typeof nodes === 'undefined' || !nodes) return;
    const lod = typeof getRoadLodLevel === 'function'
      ? getRoadLodLevel(typeof view !== 'undefined' ? view.scale : 1)
      : 2;
    if (lod < 1) return;
    const vp = (typeof _drawVp !== 'undefined' && _drawVp)
      || (typeof getWorldViewport === 'function' ? getWorldViewport(40) : null);

    const pal = palette(false);
    const nSamp = SKIN.curveSamples;
    const roadAlpha = (typeof ROAD_LANE_OPACITY === 'number') ? ROAD_LANE_OPACITY : 0.55;
    const markAlpha = Math.min(1, roadAlpha * 0.92);
    const broken = [SKIN.dashOn, SKIN.dashOff];

    nodes.forEach((nd, nodeKey) => {
      if (!isPlainTwoWayConnector(nd)) return;
      if (!nd.segments || nd.segments.length !== 2) return;

      const parts = String(nodeKey).split(',');
      const nodeX = Number(parts[0]), nodeY = Number(parts[1]);
      if (typeof pointInView === 'function' && !pointInView(nodeX, nodeY, vp, 40)) return;
      const dirs = computeNodeDirections(nd, nodeX, nodeY);
      if (dirs.length !== 2) return;

      const infoA = directionEdgeInfo(dirs[0]);
      const infoB = directionEdgeInfo(dirs[1]);
      if (!infoA || !infoB) return;

      const awayA = { x: infoA.dir.awayX, y: infoA.dir.awayY };
      const awayB = { x: infoB.dir.awayX, y: infoB.dir.awayY };
      const layA = infoA.lay, layB = infoB.lay;

      // Pair by marking-edge corners (same lateral frame as Section A lines);
      // apply the same pairing to the wider asphalt bed corners.
      const crossed = segmentsCross(infoA.markA, infoB.markA, infoA.markB, infoB.markB);
      const bedLeft = crossed
        ? { a: infoA.bedA, b: infoB.bedB }
        : { a: infoA.bedA, b: infoB.bedA };
      const bedRight = crossed
        ? { a: infoA.bedB, b: infoB.bedA }
        : { a: infoA.bedB, b: infoB.bedB };
      const markLeft = crossed
        ? { a: infoA.markA, b: infoB.markB }
        : { a: infoA.markA, b: infoB.markA };
      const markRight = crossed
        ? { a: infoA.markB, b: infoB.markA }
        : { a: infoA.markB, b: infoB.markB };

      const bedPtsL = sampleMarkingCurve(bedLeft.a, awayA, bedLeft.b, awayB, nSamp);
      const bedPtsR = sampleMarkingCurve(bedRight.a, awayA, bedRight.b, awayB, nSamp);
      fillBetweenCurves(c, bedPtsL, bedPtsR, pal);

      // Outer MUTCD edges (white, or yellow on one-way driver-left when both ends agree)
      const colA = edgeColorsFor(infoA);
      const colB = edgeColorsFor(infoB);
      const leftCol = pairedEdgeColor(
        pal,
        colA.left,
        crossed ? colB.right : colB.left
      );
      const rightCol = pairedEdgeColor(
        pal,
        colA.right,
        crossed ? colB.left : colB.right
      );
      strokeAlongAlpha(
        c, sampleMarkingCurve(markLeft.a, awayA, markLeft.b, awayB, nSamp),
        leftCol, SKIN.edgeW, null, markAlpha
      );
      strokeAlongAlpha(
        c, sampleMarkingCurve(markRight.a, awayA, markRight.b, awayB, nSamp),
        rightCol, SKIN.edgeW, null, markAlpha
      );

      // Center yellow — only when BOTH approaches are two-way (one-ways have none)
      if (layA.yellowStyle !== 'none' && layB.yellowStyle !== 'none') {
        const yA = infoA.at(layA.centerOff);
        const yB = infoB.at(layB.centerOff);
        const yPts = sampleMarkingCurve(yA, awayA, yB, awayB, nSamp);
        // Prefer double solid if either side is multi-lane two-way
        const useDouble = layA.yellowStyle === 'double' || layB.yellowStyle === 'double';
        if (useDouble) {
          // Offset double lines along the local normal of the center curve
          const g = SKIN.doubleGap * 0.5;
          const left = yPts.map(p => ({ x: p.x + p.nx * g, y: p.y + p.ny * g }));
          const right = yPts.map(p => ({ x: p.x - p.nx * g, y: p.y - p.ny * g }));
          strokeAlongAlpha(c, left, pal.yellow, SKIN.lineW, null, markAlpha);
          strokeAlongAlpha(c, right, pal.yellow, SKIN.lineW, null, markAlpha);
        } else {
          strokeAlongAlpha(c, yPts, pal.yellow, SKIN.lineW, broken, markAlpha);
        }
      }

      // Same-direction white lane lines — pair by sorted offset; extras (lane
      // add/drop) are skipped so we don't invent lines the other road lacks.
      const whitesA = layA.whiteLaneLines.slice().sort((a, b) => a - b);
      const whitesB = layB.whiteLaneLines.slice().sort((a, b) => a - b);
      if (whitesA.length && whitesB.length) {
        const mappedB = whitesA.map(offA => mapOffsetAcross(infoA, offA, infoB, crossed));
        // Pair each A line to nearest B line (greedy), draw only solid pairs
        const usedB = new Set();
        for (let i = 0; i < mappedB.length; i++) {
          let bestJ = -1, bestD = Infinity;
          for (let j = 0; j < whitesB.length; j++) {
            if (usedB.has(j)) continue;
            const d = Math.abs(mappedB[i] - whitesB[j]);
            if (d < bestD) { bestD = d; bestJ = j; }
          }
          // Require a reasonably close match (within ~one lane) so a 3→2 drop
          // doesn't stretch a vanished lane line across the taper.
          if (bestJ < 0 || bestD > laneOffset() * 0.75) continue;
          usedB.add(bestJ);
          const pts = sampleMarkingCurve(
            infoA.at(whitesA[i]), awayA,
            infoB.at(whitesB[bestJ]), awayB,
            nSamp
          );
          strokeAlongAlpha(c, pts, pal.white, SKIN.lineW, broken, markAlpha);
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // Monkey-patch render hooks (same pattern as items.js)
  // ------------------------------------------------------------------
  function installPatches() {
    if (typeof drawSegmentGeometryCanvas === 'function' && !drawSegmentGeometryCanvas._laneSkinPatched) {
      const orig = drawSegmentGeometryCanvas;
      function wrappedDrawSegmentGeometry(c, x1, y1, x2, y2, lanesIn, lanesOut, laneAlpha, arrowAlpha, dash) {
        if (!roadSkinRealistic) {
          return orig(c, x1, y1, x2, y2, lanesIn, lanesOut, laneAlpha, arrowAlpha, dash);
        }
        return paintSegmentSkin(c, x1, y1, x2, y2, lanesIn, lanesOut, laneAlpha, arrowAlpha, dash);
      }
      wrappedDrawSegmentGeometry._laneSkinPatched = true;
      drawSegmentGeometryCanvas = wrappedDrawSegmentGeometry;
    }

    if (typeof drawAllSegmentsCanvas === 'function' && !drawAllSegmentsCanvas._laneSkinPatched) {
      const orig = drawAllSegmentsCanvas;
      function wrappedDrawAllSegments(c) {
        orig(c);
        if (roadSkinRealistic) drawApproachLimitLinesCanvas(c);
      }
      wrappedDrawAllSegments._laneSkinPatched = true;
      drawAllSegmentsCanvas = wrappedDrawAllSegments;
    }

    if (typeof drawAllJunctionsCanvas === 'function' && !drawAllJunctionsCanvas._laneSkinPatched) {
      const orig = drawAllJunctionsCanvas;
      function wrappedDrawAllJunctions(c) {
        // Pavement first so turn signs / path-edit overlays stay on top.
        if (roadSkinRealistic) drawLaneTransitionsCanvas(c);
        orig(c);
      }
      wrappedDrawAllJunctions._laneSkinPatched = true;
      drawAllJunctionsCanvas = wrappedDrawAllJunctions;
    }

    // Hide colored debug lane curves on plain 2-leg connectors in Realistic
    // mode (unless Path edit is on) — they were tinting the asphalt black/dark.
    if (typeof laneGraphColorForEdge === 'function' && !laneGraphColorForEdge._laneSkinPatched) {
      const origColor = laneGraphColorForEdge;
      function wrappedLaneGraphColor(nodeKey, edge) {
        if (roadSkinRealistic
            && (typeof laneGraphEditMode === 'undefined' || !laneGraphEditMode)) {
          const nd = (typeof nodes !== 'undefined' && nodes) ? nodes.get(nodeKey) : null;
          if (isPlainTwoWayConnector(nd)) return 'rgba(0,0,0,0)';
        }
        return origColor(nodeKey, edge);
      }
      wrappedLaneGraphColor._laneSkinPatched = true;
      laneGraphColorForEdge = wrappedLaneGraphColor;
    }
  }

  // Expose for debugging
  window.drawApproachLimitLinesCanvas = drawApproachLimitLinesCanvas;
  window.drawLaneTransitionsCanvas = drawLaneTransitionsCanvas;
  window.paintSegmentSkin = paintSegmentSkin;
  window.setRoadSkinRealistic = setRoadSkinRealistic;

  function boot() {
    injectSkinToggle();
    installPatches();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
