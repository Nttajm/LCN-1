(function () {
  const PATH_FLOW_HINT =
    'Paths · click a road or intersection to inspect corridors · filters in the Paths panel · Esc clears selection, then exits';

  const PATH_FLOW_SCALE = [
    [62, 118, 148],
    [92, 168, 168],
    [212, 180, 78],
    [232, 118, 64],
    [214, 68, 72]
  ];

  const PATH_FLOW_FILTERS = ['all', 'arriving', 'leaving', 'top'];

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function pathFlowCorridorWeight(corr) {
    if (!corr) return 0;
    return Math.max(0, (corr.liveCount || 0) * 3 + (corr.lifetimeCount || 0));
  }

  function pathFlowVolumeRgb(t) {
    const stops = PATH_FLOW_SCALE;
    const u = clamp01(t);
    if (stops.length === 1) return stops[0].slice();
    const scaled = u * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(scaled));
    const f = scaled - i;
    const a = stops[i];
    const b = stops[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f)
    ];
  }

  function pathFlowVolumeColor(t, alpha) {
    const rgb = pathFlowVolumeRgb(t);
    const a = alpha == null ? 1 : alpha;
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function pathFlowVolumeHex(t) {
    const rgb = pathFlowVolumeRgb(t);
    return '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
  }

  let pathFlowMode = false;
  let pathFlowFocus = null;
  let pathFlowHover = null;
  let pathFlowFilter = 'all';
  let pathFlowLifetime = Object.create(null);
  let pathFlowSeen = Object.create(null);
  let pathFlowBundle = null;
  let pathFlowAccum = 0;
  let pathFlowDirty = true;

  if (typeof window !== 'undefined') {
    window.pathFlowMode = false;
    window.pathFlowFocus = null;
    window.pathFlowState = () => ({
      mode: pathFlowMode,
      focus: pathFlowFocus,
      filter: pathFlowFilter,
      bundle: pathFlowBundle,
      lifetime: pathFlowLifetime
    });
  }

  function injectPathFlowStyles() {
    if (document.getElementById('path-flow-styles')) return;
    const style = document.createElement('style');
    style.id = 'path-flow-styles';
    style.textContent = `
      .board.path-flow-mode {
        cursor: crosshair;
        box-shadow: inset 0 0 0 0.1875rem rgba(62, 198, 255, 0.42);
      }
      #view-btn-flow.active {
        background: rgba(62, 198, 255, 0.18);
        border-color: rgba(62, 198, 255, 0.72);
        box-shadow: 0 0 0 0.0625rem rgba(62, 198, 255, 0.28);
      }
      #view-flow-icon {
        display: block;
        width: 1.375rem;
        height: 1.125rem;
        position: relative;
      }
      #view-flow-icon svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      #path-flow-panel {
        display: none;
        position: fixed;
        top: 4.25rem;
        right: 1rem;
        width: 17.5rem;
        max-height: calc(100vh - 7rem);
        overflow: auto;
        background: var(--ui-bg);
        border: 0.0625rem solid var(--ui-border);
        border-radius: var(--ui-radius);
        box-shadow: var(--ui-shadow);
        z-index: 125;
        color: var(--ui-text);
        font-family: var(--ui-font);
        user-select: none;
      }
      #path-flow-panel.visible { display: block; }
      #path-flow-panel .pf-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.625rem 0.75rem;
        border-bottom: 0.0625rem solid var(--ui-divider);
        background: var(--ui-bg-raised);
        cursor: grab;
        touch-action: none;
      }
      #path-flow-panel .pf-head.dragging {
        cursor: grabbing;
      }
      #path-flow-panel .pf-title {
        font: 700 0.6875rem/1 var(--ui-font-mono);
        letter-spacing: 0.08em;
        color: var(--ui-text-dim);
      }
      #path-flow-panel .pf-close {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: var(--ui-radius-sm);
        border: 0.0625rem solid var(--control-border);
        background: var(--control-bg);
        color: var(--ui-muted);
        cursor: pointer;
        font: 600 0.75rem/1 var(--ui-font-mono);
      }
      #path-flow-panel .pf-close:hover {
        background: var(--control-bg-hover);
        color: var(--ui-text);
      }
      #path-flow-panel .pf-body {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      #path-flow-panel .pf-focus {
        font: 600 0.8125rem/1.35 var(--ui-font);
        color: var(--ui-text);
      }
      #path-flow-panel .pf-focus-sub {
        margin-top: 0.2rem;
        font: 500 0.6875rem/1.35 var(--ui-font-mono);
        color: var(--ui-muted);
      }
      #path-flow-panel .pf-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.375rem;
      }
      #path-flow-panel .pf-stat {
        background: var(--ui-bg-raised);
        border: 0.0625rem solid var(--ui-border-soft);
        border-radius: var(--ui-radius-sm);
        padding: 0.4375rem 0.375rem;
        text-align: center;
      }
      #path-flow-panel .pf-stat-n {
        font: 700 0.9375rem/1 var(--ui-font-mono);
        color: var(--ui-text);
      }
      #path-flow-panel .pf-stat-l {
        margin-top: 0.25rem;
        font: 500 0.5625rem/1 var(--ui-font-mono);
        letter-spacing: 0.04em;
        color: var(--ui-faint);
        text-transform: uppercase;
      }
      #path-flow-panel .pf-filters {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.25rem;
      }
      #path-flow-panel .pf-filter {
        border-radius: var(--ui-radius-sm);
        border: 0.0625rem solid var(--control-border);
        background: var(--control-bg);
        color: var(--ui-muted);
        cursor: pointer;
        padding: 0.375rem 0.15rem;
        font: 600 0.625rem/1 var(--ui-font-mono);
        letter-spacing: 0.02em;
      }
      #path-flow-panel .pf-filter:hover {
        background: var(--control-bg-hover);
        color: var(--ui-text-dim);
      }
      #path-flow-panel .pf-filter.active {
        background: var(--acc-info-soft);
        border-color: var(--acc-info);
        color: #c5e7f7;
      }
      #path-flow-panel .pf-legend {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      #path-flow-panel .pf-legend-title {
        font: 600 0.625rem/1 var(--ui-font-mono);
        letter-spacing: 0.06em;
        color: var(--ui-faint);
        text-transform: uppercase;
      }
      #path-flow-panel .pf-row {
        display: grid;
        grid-template-columns: 0.55rem 1fr auto;
        gap: 0.45rem;
        align-items: center;
        padding: 0.3rem 0.25rem;
        border-radius: var(--ui-radius-sm);
      }
      #path-flow-panel .pf-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      #path-flow-panel .pf-swatch {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 0.0625rem;
      }
      #path-flow-panel .pf-row-label {
        font: 500 0.6875rem/1.25 var(--ui-font);
        color: var(--ui-text-dim);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #path-flow-panel .pf-row-count {
        font: 600 0.6875rem/1 var(--ui-font-mono);
        color: var(--ui-text);
      }
      #path-flow-panel .pf-empty {
        font: 500 0.75rem/1.4 var(--ui-font);
        color: var(--ui-muted);
      }
      #path-flow-panel .pf-key {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding-top: 0.25rem;
        border-top: 0.0625rem solid var(--ui-divider);
      }
      #path-flow-panel .pf-key-labels {
        display: flex;
        justify-content: space-between;
        font: 500 0.625rem/1 var(--ui-font-mono);
        color: var(--ui-muted);
      }
      #path-flow-panel .pf-scale {
        height: 0.375rem;
        border-radius: 0.0625rem;
        background: linear-gradient(90deg,
          rgb(62, 118, 148) 0%,
          rgb(92, 168, 168) 25%,
          rgb(212, 180, 78) 55%,
          rgb(232, 118, 64) 80%,
          rgb(214, 68, 72) 100%);
        border: 0.0625rem solid var(--ui-border-soft);
      }
    `;
    document.head.appendChild(style);
  }

  function installPathFlowButton() {
    const bar = document.getElementById('view-bar');
    if (!bar || document.getElementById('view-btn-flow')) return;
    const congestion = document.getElementById('view-btn-congestion');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'view-btn';
    btn.id = 'view-btn-flow';
    btn.title = 'Paths: Off (click a road or intersection to see corridors)';
    btn.innerHTML = `
      <span id="view-flow-icon" aria-hidden="true">
        <svg viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="9" r="2.2" fill="#eef3ee"/>
          <path d="M11 9 C7 9, 4 6, 2 3" stroke="#3e7694" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M11 9 C7.5 10.5, 4 14, 2.5 16" stroke="#5ca8a8" stroke-width="1.45" stroke-linecap="round"/>
          <path d="M11 9 C15 8, 18 5, 20 2.5" stroke="#e87640" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M11 9 C15 10.5, 18 13.5, 20 16" stroke="#d64448" stroke-width="1.45" stroke-linecap="round"/>
        </svg>
      </span>
    `;
    btn.addEventListener('click', togglePathFlowMode);
    if (congestion) bar.insertBefore(btn, congestion);
    else bar.appendChild(btn);
  }

  function installPathFlowPanel() {
    if (document.getElementById('path-flow-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'path-flow-panel';
    panel.innerHTML = `
      <div class="pf-head">
        <span class="pf-title">PATHS</span>
        <button type="button" class="pf-close" id="path-flow-close" title="Exit Paths">×</button>
      </div>
      <div class="pf-body">
        <div>
          <div class="pf-focus" id="path-flow-focus">Select a road or intersection</div>
          <div class="pf-focus-sub" id="path-flow-focus-sub">Live corridors through the focus point</div>
        </div>
        <div class="pf-stats">
          <div class="pf-stat"><div class="pf-stat-n" id="path-flow-n-live">0</div><div class="pf-stat-l">Live</div></div>
          <div class="pf-stat"><div class="pf-stat-n" id="path-flow-n-corr">0</div><div class="pf-stat-l">Routes</div></div>
          <div class="pf-stat"><div class="pf-stat-n" id="path-flow-n-life">0</div><div class="pf-stat-l">Seen</div></div>
        </div>
        <div class="pf-filters" id="path-flow-filters">
          <button type="button" class="pf-filter active" data-filter="all">All</button>
          <button type="button" class="pf-filter" data-filter="arriving">In</button>
          <button type="button" class="pf-filter" data-filter="leaving">Out</button>
          <button type="button" class="pf-filter" data-filter="top">Top</button>
        </div>
        <div class="pf-legend">
          <div class="pf-legend-title">Corridors</div>
          <div id="path-flow-rows"></div>
        </div>
        <div class="pf-key">
          <div class="pf-key-labels"><span>Least traveled</span><span>Most traveled</span></div>
          <div class="pf-scale" aria-hidden="true"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    document.getElementById('path-flow-close').addEventListener('click', () => {
      if (pathFlowFocus) clearPathFlowFocus();
      else setPathFlowMode(false);
    });
    panel.querySelectorAll('.pf-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        pathFlowFilter = btn.getAttribute('data-filter') || 'all';
        pathFlowDirty = true;
        refreshPathFlowPanel();
        if (typeof invalidateWorldCache === 'function') invalidateWorldCache();
        if (typeof renderFrame === 'function') renderFrame();
      });
    });
    installPathFlowPanelDrag(panel);
  }

  function clampPathFlowPanelPos(panel, left, top) {
    const pad = 8;
    const w = panel.offsetWidth || 280;
    const h = panel.offsetHeight || 200;
    const maxL = Math.max(pad, window.innerWidth - w - pad);
    const maxT = Math.max(pad, window.innerHeight - h - pad);
    return {
      left: Math.max(pad, Math.min(maxL, left)),
      top: Math.max(pad, Math.min(maxT, top))
    };
  }

  function applyPathFlowPanelPos(panel, left, top) {
    const pos = clampPathFlowPanelPos(panel, left, top);
    panel.style.left = pos.left + 'px';
    panel.style.top = pos.top + 'px';
    panel.style.right = 'auto';
    panel._pathFlowPos = pos;
  }

  function installPathFlowPanelDrag(panel) {
    const head = panel.querySelector('.pf-head');
    if (!head || head._pathFlowDrag) return;
    head._pathFlowDrag = true;
    let drag = null;

    head.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('.pf-close')) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        id: e.pointerId,
        ox: e.clientX - rect.left,
        oy: e.clientY - rect.top
      };
      head.classList.add('dragging');
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    head.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      applyPathFlowPanelPos(panel, e.clientX - drag.ox, e.clientY - drag.oy);
    });

    function endDrag(e) {
      if (!drag || (e.pointerId != null && drag.id !== e.pointerId)) return;
      drag = null;
      head.classList.remove('dragging');
      try { head.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => {
      if (!panel._pathFlowPos) return;
      applyPathFlowPanelPos(panel, panel._pathFlowPos.left, panel._pathFlowPos.top);
    });
  }

  function stubNodeKey(stub) {
    if (!stub || typeof stub !== 'string') return null;
    const i = stub.indexOf('#');
    return i > 0 ? stub.slice(0, i) : null;
  }

  function turnLabel(turnType) {
    if (turnType === 'left') return 'Left';
    if (turnType === 'right') return 'Right';
    if (turnType === 'uturn' || turnType === 'u-turn') return 'U-turn';
    if (turnType === 'straight') return 'Straight';
    return 'Move';
  }

  function segShortLabel(segId) {
    if (segId == null) return '?';
    return 'R' + String(segId);
  }

  function focusLabel(focus) {
    if (!focus) return 'Select a road or intersection';
    if (focus.type === 'junction') return 'Intersection ' + focus.nodeKey;
    return 'Road ' + focus.segId;
  }

  function clearPathFlowHistory() {
    pathFlowLifetime = Object.create(null);
    pathFlowSeen = Object.create(null);
    pathFlowBundle = null;
    pathFlowDirty = true;
  }

  function clearPathFlowFocus() {
    pathFlowFocus = null;
    if (typeof window !== 'undefined') window.pathFlowFocus = null;
    clearPathFlowHistory();
    refreshPathFlowPanel();
    if (typeof invalidateWorldCache === 'function') invalidateWorldCache();
    if (typeof renderFrame === 'function') renderFrame();
  }

  function setPathFlowFocus(focus) {
    pathFlowFocus = focus;
    if (typeof window !== 'undefined') window.pathFlowFocus = focus;
    clearPathFlowHistory();
    rebuildPathFlowBundle(true);
    refreshPathFlowPanel();
    if (typeof invalidateWorldCache === 'function') invalidateWorldCache();
    if (typeof renderFrame === 'function') renderFrame();
  }

  function refreshPathFlowUI() {
    const btn = document.getElementById('view-btn-flow');
    if (btn) {
      btn.classList.toggle('active', pathFlowMode);
      btn.title = pathFlowMode
        ? 'Paths: On (click a road or intersection · click again to exit)'
        : 'Paths: Off (click a road or intersection to see corridors)';
    }
    const board = document.getElementById('board');
    if (board) board.classList.toggle('path-flow-mode', pathFlowMode);
    const panel = document.getElementById('path-flow-panel');
    if (panel) panel.classList.toggle('visible', pathFlowMode);
    refreshPathFlowPanel();
    refreshPathFlowHint();
  }

  function refreshPathFlowHint() {
    const hint = document.getElementById('mode-hint');
    if (!hint || !pathFlowMode) return;
    hint.innerHTML = PATH_FLOW_HINT;
  }

  function refreshPathFlowPanel() {
    const panel = document.getElementById('path-flow-panel');
    if (!panel) return;
    const focusEl = document.getElementById('path-flow-focus');
    const subEl = document.getElementById('path-flow-focus-sub');
    const liveEl = document.getElementById('path-flow-n-live');
    const corrEl = document.getElementById('path-flow-n-corr');
    const lifeEl = document.getElementById('path-flow-n-life');
    const rowsEl = document.getElementById('path-flow-rows');
    if (!focusEl || !rowsEl) return;

    focusEl.textContent = focusLabel(pathFlowFocus);
    if (!pathFlowFocus) {
      subEl.textContent = 'Live corridors through the focus point';
      liveEl.textContent = '0';
      corrEl.textContent = '0';
      lifeEl.textContent = '0';
      rowsEl.innerHTML = '<div class="pf-empty">Click a road or intersection on the map.</div>';
    } else {
      const b = pathFlowBundle || { liveCars: 0, corridors: [], lifetimeTotal: 0 };
      subEl.textContent = pathFlowFocus.type === 'junction'
        ? 'Movements through this intersection'
        : 'Corridors using this road';
      liveEl.textContent = String(b.liveCars || 0);
      corrEl.textContent = String((b.corridors || []).length);
      lifeEl.textContent = String(b.lifetimeTotal || 0);

      const list = filteredCorridors(b.corridors || []);
      if (!list.length) {
        rowsEl.innerHTML = '<div class="pf-empty">No cars on routes through this point yet.</div>';
      } else {
        rowsEl.innerHTML = list.slice(0, 12).map(c => `
          <div class="pf-row" title="${c.label}">
            <span class="pf-swatch" style="background:${c.color}"></span>
            <span class="pf-row-label">${c.label}</span>
            <span class="pf-row-count">${c.liveCount}${c.lifetimeCount > c.liveCount ? ' · ' + c.lifetimeCount : ''}</span>
          </div>
        `).join('');
      }
    }

    panel.querySelectorAll('.pf-filter').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === pathFlowFilter);
    });
  }

  function filteredCorridors(list) {
    let out = list.slice();
    if (pathFlowFilter === 'arriving') out = out.filter(c => c.arriving > 0);
    else if (pathFlowFilter === 'leaving') out = out.filter(c => c.leaving > 0);
    else if (pathFlowFilter === 'top') out = out.slice(0, 5);
    return out;
  }

  function exitOtherModesForPathFlow() {
    if (typeof setDriveMode === 'function') setDriveMode(false);
    if (typeof setBuildMode === 'function') setBuildMode(false);
    if (typeof setDeleteMode === 'function') setDeleteMode(false);
    if (typeof setUpgradeMode === 'function') setUpgradeMode(false);
    if (typeof exitLaneGraphEditMode === 'function') exitLaneGraphEditMode();
    if (typeof exitJunctionEditorMode === 'function') exitJunctionEditorMode();
    if (typeof setParkingMode === 'function') setParkingMode(false);
    if (typeof setZoneMode === 'function') setZoneMode(false);
    if (typeof clearSignalSelection === 'function') clearSignalSelection();
  }

  function setPathFlowMode(on) {
    pathFlowMode = !!on;
    if (typeof window !== 'undefined') window.pathFlowMode = pathFlowMode;
    if (pathFlowMode) {
      exitOtherModesForPathFlow();
      pathFlowFilter = 'all';
    } else {
      pathFlowFocus = null;
      pathFlowHover = null;
      if (typeof window !== 'undefined') window.pathFlowFocus = null;
      clearPathFlowHistory();
    }
    refreshPathFlowUI();
    if (typeof invalidateWorldCache === 'function') invalidateWorldCache();
    if (typeof renderFrame === 'function') renderFrame();
  }

  function togglePathFlowMode() {
    setPathFlowMode(!pathFlowMode);
  }

  function pickPathFlowTarget(wx, wy) {
    let jk = null;
    if (typeof hitTestJunctionNode === 'function') jk = hitTestJunctionNode(wx, wy);
    if (jk) {
      return { type: 'junction', nodeKey: jk, label: 'Intersection ' + jk };
    }
    let seg = null;
    if (typeof findSegmentNearPoint === 'function') {
      const tol = typeof segmentPickTolerance === 'function' ? segmentPickTolerance() : 8;
      seg = findSegmentNearPoint(wx, wy, tol);
    }
    if (seg) {
      return { type: 'road', segId: seg.id, label: 'Road ' + seg.id };
    }
    return null;
  }

  function routeTouchesFocus(route, focus) {
    if (!route || !focus) return -1;
    for (let i = 0; i < route.length; i++) {
      const atom = route[i] && route[i].atom;
      if (!atom) continue;
      if (focus.type === 'junction') {
        if (atom.kind === 'turn' && atom.nodeKey === focus.nodeKey) return i;
        if (stubNodeKey(atom.originStub) === focus.nodeKey) return i;
        if (stubNodeKey(atom.destStub) === focus.nodeKey) return i;
      } else if (focus.type === 'road') {
        if ((atom.kind === 'lane' || atom.kind === 'lanechange') && atom.segId === focus.segId) return i;
      }
    }
    return -1;
  }

  function corridorKeyForCar(car, focus, focusIdx) {
    const route = car.route;
    if (focus.type === 'junction') {
      let enterSeg = null;
      let exitSeg = null;
      let turnType = null;
      const focusAtom = route[focusIdx].atom;
      if (focusAtom.kind === 'turn') {
        turnType = focusAtom.turnType || null;
        for (let i = focusIdx - 1; i >= 0; i--) {
          if (route[i].atom.kind === 'lane') { enterSeg = route[i].atom.segId; break; }
        }
        for (let i = focusIdx + 1; i < route.length; i++) {
          if (route[i].atom.kind === 'lane') { exitSeg = route[i].atom.segId; break; }
        }
      } else {
        if (stubNodeKey(focusAtom.destStub) === focus.nodeKey) {
          enterSeg = focusAtom.segId;
          for (let i = focusIdx + 1; i < route.length; i++) {
            const a = route[i].atom;
            if (a.kind === 'turn' && a.nodeKey === focus.nodeKey) {
              turnType = a.turnType || null;
              for (let j = i + 1; j < route.length; j++) {
                if (route[j].atom.kind === 'lane') { exitSeg = route[j].atom.segId; break; }
              }
              break;
            }
            if (a.kind === 'lane' && stubNodeKey(a.originStub) === focus.nodeKey) {
              exitSeg = a.segId;
              break;
            }
          }
        } else if (stubNodeKey(focusAtom.originStub) === focus.nodeKey) {
          exitSeg = focusAtom.segId;
          for (let i = focusIdx - 1; i >= 0; i--) {
            const a = route[i].atom;
            if (a.kind === 'turn' && a.nodeKey === focus.nodeKey) {
              turnType = a.turnType || null;
              for (let j = i - 1; j >= 0; j--) {
                if (route[j].atom.kind === 'lane') { enterSeg = route[j].atom.segId; break; }
              }
              break;
            }
            if (a.kind === 'lane' && stubNodeKey(a.destStub) === focus.nodeKey) {
              enterSeg = a.segId;
              break;
            }
          }
        }
      }
      const key = 'j:' + focus.nodeKey + ':' + (enterSeg == null ? '?' : enterSeg) + '>' + (exitSeg == null ? '?' : exitSeg) + ':' + (turnType || 'x');
      const label = (enterSeg != null ? segShortLabel(enterSeg) : '?')
        + ' → ' + (exitSeg != null ? segShortLabel(exitSeg) : '?')
        + (turnType ? ' · ' + turnLabel(turnType) : '');
      return { key, label, enterSeg, exitSeg, turnType };
    }

    const atom = route[focusIdx].atom;
    let fromNode = stubNodeKey(atom.originStub);
    let toNode = stubNodeKey(atom.destStub);
    if (!fromNode || !toNode) {
      const seg = typeof findSegmentById === 'function' ? findSegmentById(focus.segId) : null;
      if (seg && typeof getNodeKey === 'function') {
        fromNode = getNodeKey(seg.startNode.x, seg.startNode.y);
        toNode = getNodeKey(seg.endNode.x, seg.endNode.y);
      }
    }
    let originSeg = null;
    let destSeg = null;
    for (let i = 0; i < route.length; i++) {
      if (route[i].atom.kind === 'lane') { originSeg = route[i].atom.segId; break; }
    }
    for (let i = route.length - 1; i >= 0; i--) {
      if (route[i].atom.kind === 'lane') { destSeg = route[i].atom.segId; break; }
    }
    const key = 'r:' + focus.segId + ':' + (fromNode || '?') + '>' + (toNode || '?') + ':' + (originSeg || '?') + '>' + (destSeg || '?');
    const label = (originSeg != null ? segShortLabel(originSeg) : '?')
      + ' → ' + (destSeg != null ? segShortLabel(destSeg) : '?');
    return { key, label, enterSeg: originSeg, exitSeg: destSeg, turnType: null };
  }

  function phaseForCar(car, focusIdx) {
    if (car.legIndex < focusIdx) return 'arriving';
    if (car.legIndex === focusIdx) return 'at';
    return 'leaving';
  }

  function sampleCorridorRibbon(route, maxPts) {
    if (!route || !route.length) return null;
    const legs = route.map(leg => ({
      atom: leg.atom,
      tStart: leg.tStart != null ? leg.tStart : 0,
      tEnd: leg.tEnd != null ? leg.tEnd : 1
    }));
    if (typeof sampleRouteLegs !== 'function') {
      const out = [];
      const budget = maxPts || 64;
      const perLeg = Math.max(2, Math.ceil(budget / legs.length));
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (!leg.atom || typeof leg.atom.sampleAtT !== 'function') continue;
        for (let s = 0; s <= perLeg; s++) {
          const t = leg.tStart + (leg.tEnd - leg.tStart) * (s / perLeg);
          const p = leg.atom.sampleAtT(t);
          if (out.length) {
            const last = out[out.length - 1];
            if (Math.hypot(p.x - last.x, p.y - last.y) < 0.35) continue;
          }
          out.push({ x: p.x, y: p.y });
        }
      }
      return out.length >= 2 ? out : null;
    }
    const samples = sampleRouteLegs(legs);
    if (!samples.length) return null;
    const total = samples[samples.length - 1].s;
    const budget = maxPts || 72;
    const step = Math.max(total / budget, 1.2);
    const out = [];
    for (let s = 0; s <= total + 0.001; s += step) {
      const p = typeof pointAtRouteDistance === 'function'
        ? pointAtRouteDistance(samples, Math.min(s, total))
        : null;
      if (!p) continue;
      out.push({ x: p.x, y: p.y, s: Math.min(s, total) });
    }
    if (out.length && out[out.length - 1].s < total - 0.01) {
      const end = samples[samples.length - 1];
      out.push({ x: end.x, y: end.y, s: total });
    }
    return out.length >= 2 ? out : null;
  }

  function focusSplitDistance(pts, focus) {
    if (!pts || pts.length < 2 || !focus) return pts[Math.floor(pts.length / 2)].s || 0;
    let bestI = 0;
    let bestD = Infinity;
    if (focus.type === 'junction') {
      const [nx, ny] = focus.nodeKey.split(',').map(Number);
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - nx, pts[i].y - ny);
        if (d < bestD) { bestD = d; bestI = i; }
      }
    } else {
      const seg = typeof findSegmentById === 'function' ? findSegmentById(focus.segId) : null;
      if (!seg) return pts[Math.floor(pts.length / 2)].s || 0;
      const midX = (seg.startNode.x + seg.endNode.x) * 0.5;
      const midY = (seg.startNode.y + seg.endNode.y) * 0.5;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - midX, pts[i].y - midY);
        if (d < bestD) { bestD = d; bestI = i; }
      }
    }
    return pts[bestI].s != null ? pts[bestI].s : bestI;
  }

  function rebuildPathFlowBundle(force) {
    if (!pathFlowMode || !pathFlowFocus) {
      pathFlowBundle = null;
      return false;
    }
    if (!force && !pathFlowDirty && pathFlowAccum < 0.45) return false;
    pathFlowAccum = 0;
    pathFlowDirty = false;

    const byKey = Object.create(null);
    let liveCars = 0;
    const carsList = typeof cars !== 'undefined' ? cars : [];

    for (let i = 0; i < carsList.length; i++) {
      const car = carsList[i];
      if (!car || !car.route || !car.route.length) continue;
      if (car.state === 'despawning' || car.isProbe) continue;
      const focusIdx = routeTouchesFocus(car.route, pathFlowFocus);
      if (focusIdx < 0) continue;
      liveCars++;
      const meta = corridorKeyForCar(car, pathFlowFocus, focusIdx);
      const phase = phaseForCar(car, focusIdx);
      let entry = byKey[meta.key];
      const life = pathFlowLifetime[meta.key];
      if (!entry) {
        entry = {
          key: meta.key,
          label: meta.label,
          enterSeg: meta.enterSeg,
          exitSeg: meta.exitSeg,
          turnType: meta.turnType,
          liveCount: 0,
          arriving: 0,
          leaving: 0,
          at: 0,
          lifetimeCount: life ? life.count : 0,
          pts: life && life.pts ? life.pts : null,
          splitS: life && life.splitS != null ? life.splitS : 0
        };
        byKey[meta.key] = entry;
      }
      entry.liveCount++;
      entry[phase]++;
      if (!pathFlowSeen[car.id + ':' + meta.key]) {
        pathFlowSeen[car.id + ':' + meta.key] = 1;
        const prev = pathFlowLifetime[meta.key];
        pathFlowLifetime[meta.key] = {
          count: (prev ? prev.count : 0) + 1,
          label: meta.label,
          pts: prev && prev.pts ? prev.pts : null,
          splitS: prev && prev.splitS != null ? prev.splitS : 0
        };
        entry.lifetimeCount = pathFlowLifetime[meta.key].count;
      }
      if (!entry.pts) {
        const ribbon = sampleCorridorRibbon(car.route, 80);
        if (ribbon) {
          entry.pts = ribbon;
          entry.splitS = focusSplitDistance(ribbon, pathFlowFocus);
          const lifeEntry = pathFlowLifetime[meta.key];
          if (lifeEntry) {
            lifeEntry.pts = ribbon;
            lifeEntry.splitS = entry.splitS;
            lifeEntry.label = meta.label;
          }
        }
      }
    }

    Object.keys(pathFlowLifetime).forEach(key => {
      if (byKey[key]) return;
      const life = pathFlowLifetime[key];
      if (!life || !life.pts) return;
      byKey[key] = {
        key,
        label: life.label || key,
        enterSeg: null,
        exitSeg: null,
        turnType: null,
        liveCount: 0,
        arriving: 0,
        leaving: 0,
        at: 0,
        lifetimeCount: life.count,
        pts: life.pts,
        splitS: life.splitS || 0
      };
    });

    const corridors = Object.keys(byKey).map(k => byKey[k]);
    corridors.sort((a, b) => pathFlowCorridorWeight(b) - pathFlowCorridorWeight(a));
    let minW = Infinity;
    let maxW = 0;
    for (let i = 0; i < corridors.length; i++) {
      const w = pathFlowCorridorWeight(corridors[i]);
      corridors[i].weight = w;
      if (w < minW) minW = w;
      if (w > maxW) maxW = w;
    }
    if (!corridors.length) {
      minW = 0;
      maxW = 1;
    }
    const span = maxW - minW;
    for (let i = 0; i < corridors.length; i++) {
      let t = 1;
      if (corridors.length > 1 && span > 0) {
        t = clamp01((corridors[i].weight - minW) / span);
      }
      corridors[i].volumeT = t;
      corridors[i].color = pathFlowVolumeHex(t);
      corridors[i].rank = i;
    }

    let lifetimeTotal = 0;
    Object.keys(pathFlowLifetime).forEach(k => {
      const life = pathFlowLifetime[k];
      lifetimeTotal += life && life.count ? life.count : 0;
    });

    pathFlowBundle = {
      focus: pathFlowFocus,
      liveCars,
      lifetimeTotal,
      corridors,
      updatedAt: typeof simTime === 'number' ? simTime : 0
    };
    refreshPathFlowPanel();
    return true;
  }

  function maybeUpdatePathFlow(dt) {
    if (!pathFlowMode || !pathFlowFocus) return;
    if (!(dt > 0)) return;
    pathFlowAccum += dt;
    if (rebuildPathFlowBundle(false) && typeof invalidateWorldCache === 'function') {
      invalidateWorldCache();
    }
  }

  function strokeRibbon(c, pts, color, width, alpha) {
    if (!pts || pts.length < 2) return;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.restore();
  }

  function slicePtsByS(pts, s0, s1) {
    if (!pts || pts.length < 2) return null;
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i].s != null ? pts[i].s : i;
      if (s < s0 - 0.01) continue;
      if (s > s1 + 0.01) break;
      out.push(pts[i]);
    }
    if (out.length < 2) return null;
    return out;
  }

  function drawFocusHalo(c, focus) {
    if (!focus) return;
    c.save();
    if (focus.type === 'junction') {
      const [nx, ny] = focus.nodeKey.split(',').map(Number);
      const r = (typeof NODE_R === 'number' ? NODE_R : 10) * 1.55;
      c.beginPath();
      c.arc(nx, ny, r * 1.8, 0, Math.PI * 2);
      c.fillStyle = 'rgba(62, 198, 255, 0.10)';
      c.fill();
      c.beginPath();
      c.arc(nx, ny, r, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(62, 198, 255, 0.95)';
      c.lineWidth = 1.4;
      c.stroke();
      c.beginPath();
      c.arc(nx, ny, 2.2, 0, Math.PI * 2);
      c.fillStyle = '#eef3ee';
      c.fill();
    } else {
      const seg = typeof findSegmentById === 'function' ? findSegmentById(focus.segId) : null;
      if (!seg) { c.restore(); return; }
      const lanesIn = seg.lanesIn != null ? seg.lanesIn : 1;
      const lanesOut = seg.lanesOut != null ? seg.lanesOut : 1;
      const half = ((lanesIn + lanesOut) * (typeof LANE_OFFSET === 'number' ? LANE_OFFSET : 3.2)) * 0.55 + 2.5;
      const dx = seg.endNode.x - seg.startNode.x;
      const dy = seg.endNode.y - seg.startNode.y;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len;
      const py = dx / len;
      c.beginPath();
      c.moveTo(seg.startNode.x + px * half, seg.startNode.y + py * half);
      c.lineTo(seg.endNode.x + px * half, seg.endNode.y + py * half);
      c.lineTo(seg.endNode.x - px * half, seg.endNode.y - py * half);
      c.lineTo(seg.startNode.x - px * half, seg.startNode.y - py * half);
      c.closePath();
      c.fillStyle = 'rgba(62, 198, 255, 0.12)';
      c.fill();
      c.strokeStyle = 'rgba(62, 198, 255, 0.85)';
      c.lineWidth = 1.2;
      c.stroke();
    }
    c.restore();
  }

  function drawHoverHalo(c, hover) {
    if (!hover || (pathFlowFocus && hover.type === pathFlowFocus.type
      && hover.nodeKey === pathFlowFocus.nodeKey
      && hover.segId === pathFlowFocus.segId)) return;
    c.save();
    c.globalAlpha = 0.55;
    if (hover.type === 'junction') {
      const [nx, ny] = hover.nodeKey.split(',').map(Number);
      c.beginPath();
      c.arc(nx, ny, (typeof NODE_R === 'number' ? NODE_R : 10) * 1.2, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(238, 243, 238, 0.7)';
      c.lineWidth = 1.1;
      c.setLineDash([2.5, 2]);
      c.stroke();
      c.setLineDash([]);
    } else {
      const seg = typeof findSegmentById === 'function' ? findSegmentById(hover.segId) : null;
      if (seg) {
        c.strokeStyle = 'rgba(238, 243, 238, 0.55)';
        c.lineWidth = 2.2;
        c.setLineDash([3, 2.5]);
        c.beginPath();
        c.moveTo(seg.startNode.x, seg.startNode.y);
        c.lineTo(seg.endNode.x, seg.endNode.y);
        c.stroke();
        c.setLineDash([]);
      }
    }
    c.restore();
  }

  function drawPathFlowOverlayCanvas(c) {
    if (!pathFlowMode || !c) return;
    drawHoverHalo(c, pathFlowHover);
    if (!pathFlowFocus) return;
    if (!pathFlowBundle || pathFlowDirty) rebuildPathFlowBundle(true);

    const corridors = filteredCorridors((pathFlowBundle && pathFlowBundle.corridors) || [])
      .filter(x => x.pts && x.pts.length >= 2)
      .slice()
      .sort((a, b) => pathFlowCorridorWeight(a) - pathFlowCorridorWeight(b));

    drawFocusHalo(c, pathFlowFocus);

    for (let i = 0; i < corridors.length; i++) {
      const corr = corridors[i];
      const t = corr.volumeT != null ? corr.volumeT : 0.5;
      const heat = Math.sqrt(clamp01(t));
      const baseW = 1.5 + heat * 8.2;
      const color = corr.color || pathFlowVolumeHex(t);
      const glow = pathFlowVolumeColor(t, 0.18 + heat * 0.22);
      const core = pathFlowVolumeColor(t, 0.55 + heat * 0.35);
      const split = corr.splitS || 0;
      const totalS = corr.pts[corr.pts.length - 1].s != null
        ? corr.pts[corr.pts.length - 1].s
        : corr.pts.length;

      const showArrive = pathFlowFilter !== 'leaving';
      const showLeave = pathFlowFilter !== 'arriving';
      let drawPts = corr.pts;
      if (showArrive && !showLeave) drawPts = slicePtsByS(corr.pts, 0, split) || corr.pts;
      else if (showLeave && !showArrive) drawPts = slicePtsByS(corr.pts, split, totalS) || corr.pts;

      strokeRibbon(c, drawPts, glow, baseW + 2.4, 1);
      strokeRibbon(c, drawPts, core, baseW, 1);
      strokeRibbon(c, drawPts, color, Math.max(1.05, baseW * 0.42), 0.92);

      if (drawPts.length >= 2) {
        const mid = drawPts[Math.floor(drawPts.length * 0.62)];
        const prev = drawPts[Math.max(0, Math.floor(drawPts.length * 0.62) - 1)];
        const ang = Math.atan2(mid.y - prev.y, mid.x - prev.x);
        const ah = Math.max(2.2, baseW * 0.7);
        c.save();
        c.translate(mid.x, mid.y);
        c.rotate(ang);
        c.beginPath();
        c.moveTo(ah, 0);
        c.lineTo(-ah * 0.55, ah * 0.55);
        c.lineTo(-ah * 0.55, -ah * 0.55);
        c.closePath();
        c.fillStyle = color;
        c.globalAlpha = 0.9;
        c.fill();
        c.restore();
      }
    }
  }

  function handlePathFlowClick(event) {
    if (!pathFlowMode) return false;
    if (event.button != null && event.button !== 0) return false;
    if (typeof suppressClick !== 'undefined' && suppressClick) return false;
    if (typeof screenToWorld !== 'function') return false;
    const wp = screenToWorld(event.clientX, event.clientY);
    const hit = pickPathFlowTarget(wp.x, wp.y);
    if (hit) {
      if (pathFlowFocus
        && pathFlowFocus.type === hit.type
        && pathFlowFocus.nodeKey === hit.nodeKey
        && pathFlowFocus.segId === hit.segId) {
        clearPathFlowFocus();
      } else {
        setPathFlowFocus(hit);
      }
      return true;
    }
    if (pathFlowFocus) {
      clearPathFlowFocus();
      return true;
    }
    return false;
  }

  function handlePathFlowMove(event) {
    if (!pathFlowMode || typeof screenToWorld !== 'function') return;
    const wp = screenToWorld(event.clientX, event.clientY);
    const hit = pickPathFlowTarget(wp.x, wp.y);
    const same = hit && pathFlowHover
      && hit.type === pathFlowHover.type
      && hit.nodeKey === pathFlowHover.nodeKey
      && hit.segId === pathFlowHover.segId;
    if (!hit && !pathFlowHover) return;
    if (same) return;
    pathFlowHover = hit;
    if (typeof renderFrame === 'function') renderFrame();
  }

  function patchModeExclusivity() {
    if (typeof setBuildMode === 'function' && !setBuildMode._pathFlowPatched) {
      const orig = setBuildMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setBuildMode = wrapped;
    }
    if (typeof setDeleteMode === 'function' && !setDeleteMode._pathFlowPatched) {
      const orig = setDeleteMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setDeleteMode = wrapped;
    }
    if (typeof setUpgradeMode === 'function' && !setUpgradeMode._pathFlowPatched) {
      const orig = setUpgradeMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setUpgradeMode = wrapped;
    }
    if (typeof setDriveMode === 'function' && !setDriveMode._pathFlowPatched) {
      const orig = setDriveMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setDriveMode = wrapped;
    }
    if (typeof toggleLaneGraphEditMode === 'function' && !toggleLaneGraphEditMode._pathFlowPatched) {
      const orig = toggleLaneGraphEditMode;
      function wrapped() {
        if (pathFlowMode) setPathFlowMode(false);
        return orig();
      }
      wrapped._pathFlowPatched = true;
      toggleLaneGraphEditMode = wrapped;
    }
    if (typeof toggleJunctionEditorMode === 'function' && !toggleJunctionEditorMode._pathFlowPatched) {
      const orig = toggleJunctionEditorMode;
      function wrapped() {
        if (pathFlowMode) setPathFlowMode(false);
        return orig();
      }
      wrapped._pathFlowPatched = true;
      toggleJunctionEditorMode = wrapped;
    }
    if (typeof setParkingMode === 'function' && !setParkingMode._pathFlowPatched) {
      const orig = setParkingMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setParkingMode = wrapped;
    }
    if (typeof setZoneMode === 'function' && !setZoneMode._pathFlowPatched) {
      const orig = setZoneMode;
      function wrapped(on) {
        if (on && pathFlowMode) setPathFlowMode(false);
        return orig(on);
      }
      wrapped._pathFlowPatched = true;
      setZoneMode = wrapped;
    }
  }

  function installRenderHook() {
    if (typeof drawCarsCanvas === 'function' && !drawCarsCanvas._pathFlowWrapped) {
      const orig = drawCarsCanvas;
      function wrapped(c) {
        drawPathFlowOverlayCanvas(c);
        return orig(c);
      }
      wrapped._pathFlowWrapped = true;
      drawCarsCanvas = wrapped;
      return;
    }
    if (typeof drawRouteHighlightsCanvas === 'function' && !drawRouteHighlightsCanvas._pathFlowWrapped) {
      const orig = drawRouteHighlightsCanvas;
      function wrapped(c) {
        orig(c);
        drawPathFlowOverlayCanvas(c);
      }
      wrapped._pathFlowWrapped = true;
      drawRouteHighlightsCanvas = wrapped;
    }
  }

  function installTickHook() {
    if (typeof maybeUpdateLaneCongestion === 'function' && !maybeUpdateLaneCongestion._pathFlowPatched) {
      const orig = maybeUpdateLaneCongestion;
      function wrapped(dt) {
        const r = orig(dt);
        maybeUpdatePathFlow(dt);
        return r;
      }
      wrapped._pathFlowPatched = true;
      maybeUpdateLaneCongestion = wrapped;
      return;
    }
    if (typeof updateSim === 'function' && !updateSim._pathFlowPatched) {
      const orig = updateSim;
      function wrapped(dt) {
        const r = orig(dt);
        maybeUpdatePathFlow(dt);
        return r;
      }
      wrapped._pathFlowPatched = true;
      updateSim = wrapped;
    }
  }

  function installInputHooks() {
    const board = document.getElementById('board');
    if (!board || board._pathFlowHooks) return;
    board._pathFlowHooks = true;
    board.addEventListener('click', (e) => {
      if (!pathFlowMode) return;
      if (handlePathFlowClick(e)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);
    board.addEventListener('mousemove', (e) => {
      if (!pathFlowMode) return;
      handlePathFlowMove(e);
    }, true);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !pathFlowMode) return;
      if (pathFlowFocus) {
        clearPathFlowFocus();
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      setPathFlowMode(false);
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);
  }

  function patchRefreshViewModeHint() {
    if (typeof refreshViewModeHint !== 'function' || refreshViewModeHint._pathFlowPatched) return;
    const orig = refreshViewModeHint;
    function wrapped() {
      if (pathFlowMode) {
        refreshPathFlowHint();
        return;
      }
      return orig();
    }
    wrapped._pathFlowPatched = true;
    refreshViewModeHint = wrapped;
  }

  function initPathFlowTool() {
    injectPathFlowStyles();
    installPathFlowButton();
    installPathFlowPanel();
    patchModeExclusivity();
    installRenderHook();
    installTickHook();
    installInputHooks();
    patchRefreshViewModeHint();
    refreshPathFlowUI();
  }

  if (typeof window !== 'undefined') {
    window.togglePathFlowMode = togglePathFlowMode;
    window.setPathFlowMode = setPathFlowMode;
    window.drawPathFlowOverlayCanvas = drawPathFlowOverlayCanvas;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPathFlowTool);
  } else {
    initPathFlowTool();
  }
})();
