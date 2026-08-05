# trafficSim 4.6 — Codebase Guide

Deep reference for the Canvas 2D traffic simulator. Changelog detail lives in [`updates.md`](./updates.md); this file explains **how the pieces fit together** and where to look when changing behavior.

**Version lineage:** 4.3.x → 4.6.x (Canvas rewrite, FF panel, jam-escape LC, build grade toggles, parking claims/roam, junction stop/yield/ROW, batch FF, stop-sign polish, curb-ahead parking hunt, don’t-block-the-box).

---

## 1. File inventory

| Path | ~Lines | Owns |
|------|--------|------|
| `index4_7.html` | ~9800 | Shell CSS/DOM, road & junction editor, pan/zoom, `renderFrame()`, map serialize/load, ref-overlay (Leaflet), boot |
| `engine.js` | ~11500 | ALLIE routing graph, cars, AI constraints, parking motion, spawners, `tick`/`stepSim`, FF, debug overlays |
| `lanes.js` | ~700 | MUTCD road skins (pavement + yellow/white markings, approach limit lines, 2-leg curve/taper paint); Realistic/Debug view-bar toggle |
| `items.js` | ~1700 | Parallel curb parking authoring + serialize; monkey-patches map save/load |
| `units.js` | ~820 | Zoning polygons; monkey-patches map save/load |
| `signals.js` | ~1010 | Signal heads, phase rings, `movementDisplay`, canvas draw + hit-test, signal panel |
| `helpers/updates.md` | — | Feature changelog (source of “why”) |
| `helpers/CODEBASE.md` | — | This guide |
| `signs/` | PNGs | `stop`, `yield`, `oneway`, `parking`, `turn/{straight,left,right,left_straight,right_straight,no-uturn}` |

Ignore: `Untitled.html` (scratch), root `yield.png` (likely leftover duplicate of `signs/yield.png`).

### Script load order

At the bottom of `index4_7.html`:

1. Large inline `<script>` — geometry, modes, `renderFrame`, maps
2. `signals.js`
3. `engine.js` — starts `requestAnimationFrame(tick)` at end of file
4. `lanes.js` — monkey-patches segment/junction canvas paint; injects view-bar skin toggle
5. `units.js` → `initUnitsZoning()`
6. `items.js` → `initParkingItems()`
7. Trailing inline — traffic-state store, `tryAutoLoadLastMap()`, `resizeSimCanvas()`

No bundler / ES modules. Everything shares **window globals**: `segments`, `nodes`, `view`, `canvas`/`ctx`, `cars`, `parkingBays`, `zones`, `allieAtoms`, signal helpers, etc.

---

## 2. Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│ index4_6.html — world geometry + build UI + Canvas paint      │
│  segments[], nodes(Map), view{x,y,scale}, renderFrame()       │
└────────────┬───────────────────────────────┬─────────────────┘
             │ calculateCurves / edges        │ paint layers
             ▼                                ▼
┌────────────────────┐             ┌───────────────────────────┐
│ signals.js         │◄────────────│ engine.js tick / stepSim  │
│ nd.signal heads    │ movement    │ rebuildAllieGraph()       │
│ phase rings        │ Display     │ cars[] Pure Pursuit       │
└────────────────────┘             │ updateSignals / spawners  │
                                   └──────────┬────────────────┘
┌────────────────────┐                        │
│ items.js parking   │◄── stall claims ───────┤
│ units.js zones     │   (zones mostly visual)│
└────────────────────┘                        │
                                   localStorage maps + traffic states
```

**One unpaused frame**

`tick(ts)` → clamp `dt` → for `simSpeed` budget: `stepSim(dt)` → `updateSignals` → `updateSpawners` → `rebuildCarIndexes` → each `updateCar` → always `renderFrame()`.

**Network rebuild**

Any road/junction edit → `refreshJunctionVisuals` → `calculateCurves` → `syncJunctionSignals` / `autoApplyJunctionControls` → usually `rebuildAllieGraph()` → `rerouteAllCars()`.

---

## 3. Core data model

### 3.1 Segment (road) — `segments[]`

```
{
  id, startNode:{x,y}, endNode:{x,y},
  lanesIn, lanesOut, laneCount,
  stubInsetStart?, stubInsetEnd?,       // approach pullback overrides
  laneTurnsStart:{}, laneTurnsEnd:{},   // per-lane turn modes at ends
  underpasses?: [{ t0, t1, otherId, x, y }],  // grade-below ranges in param t
  lineElements: []                      // legacy SVG stub (unused)
}
```

Lane layout via `getLaneSpecs(lanesIn, lanesOut)` → `{ offset, forward, idx }` with spacing `LANE_OFFSET = 4`.

Presets: 1 Way `(0,1)`, 2 Lane `(1,1)`, 4 Lane `(2,2)`, Advanced nudge In/Out + Swap.

### 3.2 Node / junction — `nodes: Map<"x,y", nd>`

```
{
  count, segments[],
  laneNodes: [{ id, segId, laneIdx, type:'in'|'out', x,y, tdx,tdy, ... }],
  edges: [{ from, to, turn:'straight'|'left'|'right'|'uturn', curve }],
  interaction: { selectedId, hoveredId },
  laneTurns: {},                        // overrides by laneTurnKey
  approachControls: { [segId]: 'stop'|'yield'|'row' },
  controlPresetIdx?, controlsManual?,
  signal: { ... },                      // 3+ way only
  approachHandles: [...],               // inset drag hit geometry
  signs: [], controlSignHits: [],
  marker: null
}
```

- Junction when `count >= 2`
- Dead-end turnaround when `count === 1` on a two-way road (`lanesIn > 0 && lanesOut > 0`): U-turn bulb only (always on, not gated by `includeUturns`)
- Signals when `count >= 3`
- Node key: `"x,y"` string from `getNodeKey`
- Helpers: `isDeadEndTurnaround(nd)`, `nodeHasLaneGraph(nd)`

### 3.3 ALLIE atoms — `allieAtoms[]`

Routing graph built by `rebuildAllieGraph()`. Three kinds:

| `kind` | Role | Key fields |
|--------|------|------------|
| `'lane'` | Straight run on a segment (window-split) | `segId`, `laneIdx`, `x1,y1,x2,y2`, `length`, `originStub`, `destStub`, `segTStart/End`, `sampleAtT` |
| `'turn'` | Junction bezier | `nodeKey`, `turnType`, `targetSpeed`, stubs, conflicts |
| `'lanechange'` | Mid-road blend window | `fromLaneIdx`→`toLaneIdx`, `windowIdx`, `segT0/T1`, `isLaneChangeBlend` |

**Stubs** connect atoms:

- Junction / dead-end turnaround: `stubKey(nodeKey, laneNodeId)` → `"x,y#laneNodeId"`
- Mid-road rungs: `rungStubKey(segId, splitIdx, laneIdx)`
- One-way free ends still have no stub (cars cannot U-turn there)

Adjacency: `allieOutByStub: Map<stub, atom[]>`. Pathfinding: `allieDijkstra` / `allieFindPath`. Lane-change edges are cost-penalized by `LANE_CHANGE_GRAPH_PENALTY` (55) so Dijkstra prefers stay-in-lane unless a change is needed.

#### How lane atoms are built

`buildLaneAtoms(segment)`:

1. Compute shortened endpoints (stub insets) via `computeShortenedEndpoints`
2. Build per-lane sample lines (offset by `LANE_OFFSET`)
3. `buildWindowSplitTable(segLen)` → arclength split fractions at each window entry/exit
4. Slice each lane into run atoms (`makeLaneRunAtom`) between splits
5. For each window, add `buildLaneChangeEdge` atoms between adjacent sibling lanes (smoothstep S-curve; blinker `signal` L/R from lateral sign)

`computeLaneWindows(segLen)` places up to `LANE_WINDOW_MAX_COUNT` (14) windows of length `LANE_WINDOW_LEN` (12), spaced by `LANE_WINDOW_SPACING` (5), inside the usable middle after entry/exit clearances. Short blocks with usable span &lt; one window get **zero** windows. Cluster is centered in the usable span.

Clearances tighten when `ALLOW_INTERSECTION_LANE_CHANGES` is on (`LANE_WINDOW_ENTRY_CLEAR_TIGHT` / `EXIT_CLEAR_TIGHT`).

Interior stubs use `rungStubKey(segId, splitIdx, laneIdx)` so every sibling lane shares a rung at that split — Dijkstra can hop across like a mini-junction.

#### How turn atoms are built

`buildTurnAtom(nodeKey, edge)` samples the junction bezier (`TURN_ATOM_SAMPLES` = 22), sets `targetSpeed` from turn severity, stores origin/dest stubs, and later `computeTurnConflicts` marks pairwise conflicting turns for yield / clearance logic.

When `ALLOW_INTERSECTION_LANE_CHANGES` is false, `isCrossLaneStraightEdge` drops straight edges that hop relative lane index inside the box (prevents free mid-junction lane changes via Dijkstra).

### 3.4 Car — `cars[]`

Created by `spawnCarFromRoute(route, destPick, opts)`:

| Area | Fields |
|------|--------|
| Pose / route | `id`, `route` legs `{atom,tStart,tEnd,length,cumStart,cumEnd}`, `legIndex`, `totalLength`, `traveledLength`, `x,y,heading,speed` |
| Visual | `color`, `brakeLit`, `blinkerSide/On/Phase`, `highBeamFlashT`, `despawnScale/Opacity` |
| State | `state: 'driving'\|'parking'\|'parked'\|'despawning'`, selection/hover |
| Junction | `signalDecision`, `rorPhase`, `junctionWait`, `stopSignState` |
| Personality | `overtakeTendency` (0.25–0.8), `courtesyTendency` (0.35–0.9) |
| Lane change | `_pendingLaneChangeAtomId`, `_laneChangeForce`, `_emergencyLaneChange`, `_trafficStuckT`, `_stuckLaneChangeThreshold`, `_postMergeEaseT` |
| Parking | `parkingIntent`, `parkPhase`, `_parkPlan`, `_parkStagePoint`, `_parkRoamRejected`, stall claim on bay |

### 3.5 Signal — `nd.signal`

```
{
  enabled, rightOnRed, protectedLeft,   // protectedLeft = mirror of any P/P or protected approach
  leftModePolicy: 'auto'|'permissive'|'protPerm'|'protected',
  leftModeBySeg: { [segId]: mode },
  groupGreen: [seconds per barrier group],
  timing: { green, yellow, allRed, protLeft },  // DEFAULT_TIMING
  timingManual, signalManual,
  heads: [{ segId, laneIdxs, movements, groupIndex, ... }],
  groups, phases: [{ kind, duration, groupIndex, allow, byApproach? }],
  phaseIndex, phaseT, overrides: Map
}
```

Cars read lamps via `movementDisplay(nodeKey, segId, laneIdx, turn)` → `'red'|'yellow'|'green'|'off'` (uses `phase.byApproach[segId]` when present).

### 3.6 Parking bay — `parkingBays[]` (`items.js`)

```
{
  id, kind:'parallel',
  x1,y1,x2,y2, ux,uy, nx,ny,
  count, spotLength, spotDepth,
  segId, side,          // side ±1 curb
  _stalls?: [...]       // runtime only — not serialized
}
```

Curb baseline: outermost lane center on that side + `PARK_LANE_GAP` (**2.56** in code). Claims: `bay._stalls[i] = { carId, status:'reserved'|'occupied' }`.

### 3.7 Zone — `zones[]` (`units.js`)

`{ id, type: residential|highResidential|commercial|office, points:[{x,y},...] }`

Zones are planning/visual only — traffic does **not** spawn from them.

### 3.8 Spawner — `spawners[]`

```
{
  id, x, y, laneRadius: SPAWNER_LANE_RADIUS (14),
  intervalSec, durationSec, indefinite,
  elapsed, timer, running,
  destCache, routeCache, destCount, marker
}
```

---

## 4. Engine loop

### Timing constants (`engine.js`)

- `TARGET_FPS = 60`, `FIXED_DT = 1/60`, `MAX_DT = 1/30`, `FRAME_MS = 1000/60`

### `tick(ts)`

1. Drop ultra-early frames (`< FRAME_MS * 0.55`)
2. If `simFastForwarding` → return (FF owns stepping)
3. If `!simPaused`: `budget = dt * simSpeed`; while budget: `stepSim(min(budget, MAX_DT))`
4. Else: warm indexes + `updateSignals(0)` (paint lamps, no phase advance)
5. Follow/hover route highlight ~every 0.2s; overlay/HUD every 8 frames
6. `updateCameraFollow` if following
7. **`renderFrame()` always**

### `stepSim(dt)`

`tickFrame++` → `simTime += dt` → `updateSignals(dt)` → `updateSpawners(dt)` → `rebuildCarIndexes` (every 6th step if `simBatchMode`) → `maybeUpdateLaneCongestion` → reverse-iterate `updateCar`.

### Sim globals

| Global | Meaning |
|--------|---------|
| `simTime` | Accumulated sim seconds (clock UI via `formatSimClock`) |
| `simPaused` | Physics frozen |
| `simSpeed` | Playback ∈ {1, 2, 4, 8} |
| `simFastForwarding` | FF owns the loop |
| `simBatchMode` | Coarse integrator + skipped render work |
| `ffSkipSeconds` | Selected skip interval |
| `ffSkipDraw` | Loader + batch vs on-canvas scrub |

### Fast-forward (`fastForwardSim`)

- **Skip drawing Off:** scrub on-canvas ~10–100× (`ffVisualMultiplier`); each rAF: `stepSim` + `renderFrame`; thin progress on FF panel.
- **Skip drawing On:** black `traffic-load-screen`, `simBatchMode`, steps of `1/8` s, `updateCarBatch` (no Pure Pursuit / OBB soft / discretionary LC), one final paint.

Clock: 12-hour day clock from `simTime` starting at `12:00:00 AM`.

---

## 5. Rendering (Canvas 2D)

Since **4.3.1** the sim is a single full-frame Canvas redraw. SVG APIs are no-ops/shims (`setSvgOpacity`, etc.). Entities hold plain data only.

### `renderFrame()` paint order

1. `resizeSimCanvas` / clear / `setTransform(view.scale*dpr, …, view.x*dpr, view.y*dpr)`
2. `drawAllSegmentsCanvas` — roads + underpass beds (when Realistic skin is on, `lanes.js` replaces centerline strokes with MUTCD pavement + yellow/white markings, then paints approach limit lines)
3. `drawAllJunctionsCanvas` — markers, edges, lane dots, turn signs, approach controls, editor overlay, inset handles (Realistic skin first paints seamless pavement + MUTCD markings at plain 2-leg connectors via `drawLaneTransitionsCanvas` — same asphalt / edges / yellow center / white lane lines as mid-block; yellow omitted on one-ways; debug curves/dots hidden on those connectors unless Path edit is on)
4. `drawAllSignalsCanvas`
5. `drawZonesCanvas`
6. `drawParkingCanvas`
7. `drawGhostPreviewCanvas` — build / upgrade / delete brush
8. `drawLaneChangeGraphCanvas`
9. `drawRouteHighlightsCanvas`
10. `drawDriveOverlaysCanvas` — spawn pin, spawners, hover marker
11. `drawDebugOverlayCanvas`
12. `drawCarsCanvas`
13. `drawRefOverlayChromeCanvas`

**Road skins (`lanes.js`):** default **Realistic** MUTCD paint (flat asphalt fill, broken/double yellow centers, broken white lane lines, solid edge lines, stop/limit bars on controlled approaches, curved paint at `count === 2` bends / lane-count transitions). View-bar **Road skin** toggle switches back to the legacy debug colored-centerline look. 3+ way intersection interiors, dead-end U-turn bulbs, and junction editor overlays stay on the existing path.

### View / camera

`view = { x, y, scale }` — pixel pan + zoom. `MIN_SCALE = 0.25`, `MAX_SCALE = 40`. Helpers: `screenToWorld`, `zoomAt`, Space/middle-drag pan. Follow: `updateCameraFollow` + `FOLLOW_LERP` (0.08).

### Geometric hit tests (no SVG targets)

| Helper | Hits |
|--------|------|
| `hitTestJunctionNode` | Junction center |
| `hitTestApproachHandle` | Stub inset drag |
| `hitTestLaneNode` | Entering/exit stubs (turn cycle) |
| `hitTestControlSign` | Stop / yield / ROW signs |
| `hitTestSignalAt` | Signal heads |
| `hitTestCar` / `findCarAtPoint` | Cars |
| `hitTestParkingStall` | Curb stalls |
| `findSegmentNearPoint` | Road corridor |
| `findNearestAtomPoint` | Drive spawn/dest on ALLIE |

---

## 6. Road & junction system

### World constants (`index4_6.html`)

| Name | Value | Role |
|------|-------|------|
| `LANE_OFFSET` | 4 | Lane center spacing |
| `NODE_R` | 7 | Junction footprint half-width |
| `STUB_R` | 13 | Default approach stub pullback |
| `GRID` | 25 | Visual block grid |
| `SNAP` | 12.5 | Placement / junction snap |
| `ROAD_SECTION_EDIT_LEN` | 3 | Upgrade/delete brush cell length |

Underpass look: `UNDERPASS_BED`, lane/arrow opacities, `UNDERPASS_CAR_ALPHA` (0.28). Car dimming only when **that car’s** segment has an underpass at its `segT`.

### Placement (Build)

Two-click place → `beginBuild` / `placeSegment`.

- **`buildAutoIntersections` On (default):** `findCrossingPoints` → `splitSegmentAtPoint` → chain of `addSegmentBetween`.
- **Off:** single segment + `applyGradeSeparationForNewRoad` using `buildCrossingGrade` `'above'|'below'` → writes `underpasses` on the under road.

Build toggles bar (`#build-toggles`, visible in Build or Upgrade):

| Toggle | Global | Default |
|--------|--------|---------|
| Parking with roads | `buildParkingWithRoads` | On |
| Auto intersections | `buildAutoIntersections` | On |
| Crossing: Above / Below | `buildCrossingGrade` | `'above'` |

Upgrade (`!`) honors the same toggles (4.3.12).

### Junction rebuild — `calculateCurves`

Builds `laneNodes` + `edges` (U-turns gated by `includeUturns`; filter `commonSense` / per-lane turn override). Then turn signs, `syncJunctionSignals`, `autoApplyJunctionControls`, approach inset handles.

Dead-end turnarounds (`count === 1`, two-way): same lane-node layout, but edges are always same-road U-turns (paired left→left when common sense is on). No signals/control signs — only the bulb + optional approach insets.

Approach inset: clamps `MIN_STUB_INSET`–`MAX_STUB_INSET`; drag via `approachInsetEdit`. Dead ends also pull painted roads back via `shortenSegment` / `computeShortenedEndpoints`.

### Section brush (4.3.8)

Upgrade / Delete paint contiguous 3-unit cells along a segment → `isolateSegmentInterval` / `commitRoadSectionEdit`. Hover shows faint whole-segment ribbon + stronger brush highlight. RMB / Esc cancels.

Delete also: parking string brush when cursor is on stalls; re-lays parking only on remnants that already had parking (4.3.14).

---

## 7. Traffic AI

### Routing

1. Pick spawn/dest via `findNearestAtomPoint`
2. `allieFindPath` / `allieDijkstra` over atoms
3. `applyRouteToCar(car, rawLegs, destPick, opts)` — builds cumulative legs; `{ keepParkingIntent: true }` preserves parking claim during roam reroutes
4. Network edits → `rerouteAllCars()`

### Motion

Pure Pursuit with `LOOKAHEAD_K` / `LOOKAHEAD_MIN` / `LOOKAHEAD_MAX`. Emergency LC uses tight `EMERGENCY_LANE_CHANGE_LD` (3.2) for sharper steering.

### `computeDesiredSpeed` — constraint stack (min wins)

Typical order of influence (see also Why panel):

1. Cruise / turn targets / arrival
2. Lane-change approach boost or hold
3. Emergency LC creep
4. Signal / signed stop-yield / unsignalized
5. Intersection clearance (incl. exit-room / don’t-block-box)
6. Lead traffic (`trafficConstraintFor`)
7. Parking yield / parking approach
8. LC hold / merge courtesy / scootch (can raise)
9. Driver-head awareness
10. Hard OBB safety (last resort in `updateCar`)

Batch FF uses `computeDesiredSpeedBatch` — signals + same-lane leads + parking yield; skips soft awareness and discretionary LC.

### Lane changes

Windows from `LANE_WINDOW_*` (len 12, spacing 5, entry clear 14, exit clear 18). Discretionary: `evaluateOvertakeOpportunity`.

**Jam escape (4.3.3):** `updateTrafficStuckWatchdog` tracks near-zero speed + car ahead within `DETECT_RING_MID`. Patience `_stuckLaneChangeThreshold` ∈ [15, 25] from `overtakeTendency`. Then `attemptEmergencyLaneEscape` — scan up to `EMERGENCY_LANE_CHANGE_LOOKAHEAD` (130), require clearer sibling via `laneDensityNear`, splice LC into route. Escape never abort-and-go-straight; creeps at `EMERGENCY_LANE_CHANGE_SPEED` (4.5); post-merge ease via `_postMergeEaseT`.

### Junction behavior

| Mode | Entry point | Notes |
|------|-------------|-------|
| Signals | `signalConstraintFor` | ROR via rightmost approach + coast clear |
| Signed | `signedJunctionConstraintFor` | Stop dwell `STOP_SIGN_DWELL`, bite `STOP_APPROACH_BITE` (15), pad `STOP_BRAKE_PAD` (0.85) |
| Unsignalized | `unsignalizedJunctionConstraintFor` | First-arrival / look both ways |

Conflict peers: `frontConflictPeers` — only the **front** car per approach (4.5.13). Don’t-block-box: `IX_EXIT_ROOM` (7.5), `IX_EXIT_SCAN` (20), `IX_EXIT_SLOW_SPEED` (3.5).

Stop-sign approach (4.6.x): cruise ~90% until bite zone, firm brake, latch monotonic desired, dwell in arrive zone, pull-up after lead clears (`STOP_PULLUP_SPEED` 15).

### Spawners

Pick lane near pin, cache routes (`SPAWNER_MAX_ROUTES`), spawn on interval if pad free (`SPAWN_OCCUPY_RADIUS` 8.5). Master mute: `spawnersAllPaused`.

### Idle cull

`IDLE_CULL_SEC` (6), `IDLE_REROUTE_SEC` (2.5), stuck gas nudge after `STUCK_GAS_NUDGE_AFTER` (12).

### `updateCar` pipeline (full fidelity)

Order inside `updateCar(car, dt)` when not batching:

1. **Despawn** — scale/fade out, then `removeCar`
2. **Parked / parking** — hand off to `updateParkingMotion`
3. **Batch mode** — `updateCarBatch` and return
4. **Hard unstick** — `tryUnstickWinner` if OBB-jammed
5. **Parking search** — `updateParkingSearch` if `parkingIntent` (may flip into parking)
6. **Stuck / LC** — `updateTrafficStuckWatchdog`, `updateLaneChangeSystem`
7. **Player** — `tickPlayerControl` (WASD etc. on selected player car)
8. **Speed** — `computeDesiredSpeed` → accel/decel toward desired (post-merge ease applies)
9. **Latches** — `advanceRightOnRed`, `advanceSignedJunction`
10. **Steer** — Pure Pursuit toward lookahead (or staging pose); emergency LC uses tight Ld
11. **Integrate** — pose update, hard-safety OBB, advance along route length, blinkers, transform

`updateCarBatch` snaps along route with signals + lead gaps + parking yield only — used for Skip-drawing FF. It hard-stops on OBB overlap near active parkers.

### Lane-change runtime (`updateLaneChangeSystem`)

- Honors pending graph LC atoms already in the route
- Evaluates discretionary overtakes on an interval (`OVERTAKE_CHECK_INTERVAL`)
- Gap / TTC checks: `LANE_CHANGE_GAP_AHEAD_MIN`, `GAP_BEHIND_MIN`, `TTC_MIN`
- Waiting too long at a window (`LANE_CHANGE_WAIT_ABORT`) → abort and go straight (unless `_emergencyLaneChange` / `_laneChangeForce`)
- Approach constraint can boost (`LANE_CHANGE_BOOST_CHANCE`) or hold (`LANE_CHANGE_HOLD_DECEL`)
- Courtesy: other cars ease when a merger is nearby (`COURTESY_*`); scootch opens a hole behind (`SCOOTCH_*`)

### Spawners (detail)

| Step | Function |
|------|----------|
| Place | `placeSpawner(pick)` — pin near a lane atom |
| Tick | `updateSpawners(dt)` — timers, duration / indefinite |
| Spawn | `trySpawnFromSpawner` — pad clear + cached route → `spawnCarFromRoute` |
| Persist | `exportMapSpawners` / import on map load |

Spawners keep `destCache` / `routeCache` refreshed when the ALLIE graph rebuilds (`refreshAllSpawnerDestCaches`). UI list patches countdown text in place (no full rebuild every second).

---

## 8. Signals & signs

### Traffic lights (`signals.js`)

Only **3+ way** junctions get heads. Heads merge by approach/turn set; phases: green / yellow / allRed / optional protLeft.

| API | Role |
|-----|------|
| `syncJunctionSignals` | Rebuild heads from laneNodes/edges; runs `autoConfigureSignalPlan` |
| `autoConfigureSignalPlan` | Per-approach left modes + green splits from geometry |
| `rebuildPhaseRing` | Build phase list from groups + left modes + timing |
| `updateSignals(dt)` | Advance phaseT / phaseIndex |
| `movementDisplay` | Color for a movement (engine + light-status graph) |
| `cycleSignalVisibility` | Off → Faint → Medium → Full |
| `toggleSignalsMaster` | Global `signalsEnabled` |
| `hitTestSignalAt` | Editor pick |

`DEFAULT_TIMING = { green: 10, yellow: 3.5, allRed: 1.5, protLeft: 5.0 }`. Heads sit `SIGNAL_OUT_NUDGE` (4.2) back from stubs. `autoConfigureSignalPlan` picks per-approach left modes from geometry and splits green across barrier groups by enter-lane weight.

#### Phase ring (`rebuildPhaseRing`)

NEMA-style **barrier groups** (opposing approaches share a group). Within each group (concurrent dual-ring lead-lead):

1. Optional **leading protected left** green + yellow for approaches with `protPerm` or `protected` mode (`byApproach` map — other approaches stay red)
2. **Main green** — thru/right green; left green if permissive or P/P, left red if protected-only
3. **Yellow** — active greens become yellow
4. **All-red** — full red clearance between barrier sides

Left-mode Auto warrants (geometry proxies for FHWA guidance): exclusive double left or ≥3 opposing thru → protected-only; exclusive left or ≥2 opposing thru → protected/permissive; else permissive.

`updateSignals(dt)` advances `phaseT` / `phaseIndex` when master-enabled and not paused. Batch FF advances timers but skips mid-skip lamp paint. Master-off forces lamps dark once via `paintSignalLamps(..., true)`.

Cars latch decisions in `signalDecision` (`commit` / `stop` / `ror`) so they do not flicker on phase boundaries. Right-on-red: only rightmost approach lane; `rorCoastClear` looks left + forward with `ROR_*` cones / TTC before creep.

Auto Junction on equal 4-ways prefers **signals** (clears stop signs). T / stem junctions still get stop/yield. **Mutual exclusion:** lights On clears stop/yield/ROW (and skips drawing those glyphs); signed approaches force lights Off via `disableSignalsForControls`.

#### Signal editor panel

Select junction/head → `updateSignalPanel`. Per-junction: enable, right-on-red, **Left turns** cycle (Auto / Perm / P/P / Prot), timing fields (`applySignalTiming`). Per-head: toggle movements, style, remove/add (`toggleHeadMovement`, `addSignalHead`, …). Overrides live in `sig.overrides` Map and survive resync via `ensureOverride`.

### Turn restriction signs

Click entering lane node → `cycleLaneTurnMode` / `setLaneTurnOverride` → PNGs under `signs/turn/`.

### Junction editor (4.4.5)

View-bar stop-sign button → `junctionEditorMode`.

- **Center click:** cycle presets — all-way stop → through+stop → through+yield → all-way yield → clear (`cycleJunctionControlPreset`)
- **Sign click:** cycle that approach alone via `CONTROL_SIGN_CYCLE = [null, 'stop', 'yield', 'row']`

Assets: `signs/stop.png`, `signs/yield.png`; ROW is text label. Persisted as `approachControls` (+ `controlsManual` / preset idx).

### Auto junction signs (4.4.6 / 4.4.8)

When `autoJunctionControls` On (off by default): `pickAutoControlPlan` / `autoApplyJunctionControls`

- **T / stem:** through ROW; stem stop (or yield if one-way into larger through)
- **Major vs minor 4-way:** wider corridor ROW, others stop
- **Equal multi-way:** all-way stop (signals off)

Manual / saved maps keep `controlsManual` so auto does not overwrite.

---

## 9. Parking system

### Authoring (`items.js`)

| Action | Functions |
|--------|-----------|
| Manual place | Drag along curb → `buildParkingBayFromPick` / `commitParkingDraft` |
| Apply all | `applyParkingToAllRoads` (progress loader) |
| Auto with roads | `autoParkAlongSegment` when `buildParkingWithRoads` |
| Delete string | Delete mode stall brush → `deleteParkingStallRefs` |
| Road cuts | `cutParkingByRoad` when new roads cross stalls |

Eligibility (`segmentEligibleForAutoParking`): under 3 lanes, or asymmetrical 3+ (e.g. 1+2, 0+3).

Spot size: car length/width × `PARK_SPOT_LEN_MUL` / `PARK_SPOT_DEPTH_MUL` (1.2).

### Runtime (`engine.js` + `PARKING_CONFIG`)

**Intent**

- Dest near curb parking → hunt
- Else roam (`parkingIntent.roaming`)

**Hunt (4.6.25)** — curb ahead, not map-wide closest:

- `findLocalParkingAhead` / `LOOKAHEAD_STALLS` (7)
- Roam: `findForwardParkingStall` + blacklist `_parkRoamRejected`
- Give up after `ROAM_MAX_ATTEMPTS` (6) → outta-here

**Phases:** stage → reverse1/2 (S-curve `SWEEP_DEG` 52°) → settle → parked.

**Claims (4.3.5):** `reserveStall` / `occupyStall` / `stallIsFree` (own reservation OK; ghost claims from deleted cars dropped; reject pads with parked/parking body). Staging re-checks; reverse abort can `beginOuttaHere(..., { keepStall: true })`.

**Abort early (4.6.30):** `abortBadParkingStage` — bad lateral / heading / no progress → blacklist + `resumeParkingRoam`.

**Others yield (4.4.9 / 4.5.14):** `parkingYieldConstraintFor`, `shouldYieldForParker` — not if parker body already behind ego. Stage point treated as stopped lead in `findNearestObstruction`.

Deleting parking despawns cars on those stalls; staging cars resume roam (4.4.3). Parked cars render ignition-off (faded, dark lamps) (4.4.4).

---

## 10. UI modes & panels

### Design system (chrome only, not game objects)

All interactive UI (panels, HUDs, toolbars, overlays, popups — not roads/cars/lanes/canvas drawing) shares one token set defined in `:root` at the top of `index4_7.html`'s `<style>` block:

- Surfaces: `--ui-bg` / `--ui-bg-strong` / `--ui-bg-raised` (translucent sage-green, `#536e5e`-based) + `--ui-border` / `--ui-border-soft` / `--ui-divider`.
- Shape: `--ui-radius` (panels) / `--ui-radius-sm` (controls, chips) — small, rectangular, not pill-shaped.
- Type: `--ui-font` (IBM Plex Sans, general UI text) / `--ui-font-mono` (IBM Plex Mono, numeric/data readouts).
- Semantic accents: `--acc-info` / `--acc-go` / `--acc-warn` / `--acc-danger` / `--acc-signal` (+ `-soft` background variants) — use these instead of new hex colors for state/feedback.
- Shared control look: `--control-bg` / `--control-bg-hover` / `--control-border` / `--control-border-hover`, consumed by `.lane-btn` and friends.
- `units.js` / `items.js` inject their own `<style>` tags at runtime (zone + parking toolbar buttons/HUD/popups) but reference the same `:root` variables since they're appended to the same document.
- `#ff-panel` uses the same tokens and layout patterns (title, raised control group, `.opt-row` chips) as the drive panel.

### Mode exclusivity

Only one authoring tool owns clicks at a time (patched helpers):

`buildMode` · `deleteMode` · `upgradeMode` · `driveMode` · `parkingMode` · `zoneMode` · `junctionEditorMode` · `spawnerPlaceMode` · `approachInsetEdit`

### Road toolbar

Build · Upgrade `!` (Brush/Whole) · inset `↕` · Delete (Brush/Whole) · Parking · Zone (injected by `units.js`) · lane type presets.

### Drive panel

Drive · Pause · Clear cars · Signals · Lights · Debug · Cars use parking · Allow LC in intersection · Lane-change windows overlay · Advanced spawners.

**Drive interaction**

1. Click road → pending spawn pick (`findNearestAtomPoint`)
2. Second click dest → route preview → `spawnCarFromRoute`
3. Click car → select / follow
4. Player control: W/S gas/brake, A/D blinkers, Q/E force turn, Space stop, Esc exit
5. Del deletes selected car

### FF panel (left of drive)

Clock · car count · pause · speed chevrons 1/2/4/8× · skip presets (+3s…+1min) · custom minutes (1–180) · Skip drawing toggle.

### View bar (top middle)

| Control | Behavior |
|---------|----------|
| Graph color | Light-status coloring ↔ classic turn colors (`TURN_COLORS`) |
| Lights | Off → Faint → Medium → Full |
| Stop sign | Junction editor |
| T icon | Auto junction signs on/off |
| Congestion | Lane congestion overlay |

### Zoning (`units.js`)

Polygon draft snapped near roads (`ZONE_ROAD_OFFSET = SNAP`). Types: residential, highResidential, commercial, office. Edges must not cross roads; close when near start.

---

## 11. Persistence

| Store | Key | Contents |
|-------|-----|----------|
| Maps | `trafficSim3_8_saved_maps` | `{ maps: { name: serializeCurrentMap }, lastLoaded }` |
| Traffic states | `trafficSim4_1_traffic_states` | cars + signals snapshot |
| Overlay sections | `co-section:*` | car overlay dropdown open state |

**No auto-save of map edits (4.3.9)** — only explicit **Save**. Refresh reloads last explicit save (or blank). Boot: `tryAutoLoadLastMap()`.

### `serializeCurrentMap`

```
{
  version: 1, name, savedAt,
  includeUturns, commonSense, segmentCounter,
  segments: [... underpasses, laneTurns*, stubInsets ...],
  signals, laneTurns (legacy), approachControls,
  spawners, parking, parkingCounter,
  zones, zoneCounter, refOverlay
}
```

`items.js` / `units.js` wrap `serializeCurrentMap` / `loadMapData` (once each via `._parkingPatched` / `._zonePatched`) so parking and zones always attach.

### Map load sequence (`loadMapData`)

1. Validate `data.segments`
2. `clearRoadNetwork` — cancel modes, `resetSimulationForMapLoad`, clear parking/zones
3. Restore settings (`includeUturns`, `commonSense`)
4. Rebuild `segments[]` from saved geometry (including underpasses / laneTurns / stubInsets)
5. `rebuildNodesFromSegments` → `refreshJunctionVisuals` / `calculateCurves` for every junction
6. `applySavedSignals` — stub or patch live `nd.signal`
7. Restore approach controls, lane turns, spawners
8. Parking / zones via patched loaders
9. Ref-overlay restore
10. `rebuildAllieGraph()` (and usually empty cars unless loading a traffic state)

### Traffic states

Separate store from maps. Saves live `cars[]` + signal phase snapshots so you can restore a running scene onto the current/loaded map. Uses the same signal apply path carefully — never replace a live `nd.signal` object wholesale if heads already exist (that historically wiped lamp links).

### Ref overlay (Leaflet)

`refOverlay` object: geographic bounds (N/S/E/W), world rect `{x,y,w,h}`, `rotation`, `scaleMul`, `opacity`, `visible`, `locked`, `editing`. While editing, canvas chrome draws handles (`drawRefOverlayChromeCanvas`). Used to trace real street imagery while building the network — not part of the sim physics.

---

## 12. Key constants (quick reference)

### World / roads

`LANE_OFFSET`, `NODE_R`, `STUB_R`, `GRID`, `SNAP`, `ROAD_SECTION_EDIT_LEN`, underpass opacities, `TURN_COLORS`, `CONTROL_SIGN_CYCLE`.

### `ALLIE_CONFIG` (high-signal)

| Group | Names |
|-------|-------|
| Body | `CAR_LENGTH` 5.6, `CAR_WIDTH` 2.6, `WHEELBASE` 3.4 |
| Speed | `CRUISE_SPEED` 37, `ACCEL` 20, `DECEL_NORMAL` 30, `DECEL_SHARP` 46 |
| Pursuit | `LOOKAHEAD_MIN/MAX/K`, `PLANNING_LOOKAHEAD` 60 |
| Stop line | `STOP_LINE_GAP` 4.5, `STOP_BRAKE_PAD` 0.85, `STOP_APPROACH_BITE` 15, `STOP_PULLUP_*` |
| Detect | `DETECT_RING_OUTER/MID/INNER`, `DETECT_FOLLOW_GAP` 5.5 |
| Head | `HEAD_CONE_DEG`, `HEAD_RING_*`, `HEAD_CRITICAL_LAT` |
| Box | `IX_CLEAR_LOOKAHEAD`, `IX_EXIT_ROOM/SCAN/SLOW_SPEED`, `IX_HOLD_TIMEOUT` |
| Signed | `STOP_SIGN_DWELL`, `JUNCTION_LOOK_*`, `JUNCTION_CREEP_*` |
| LC | `LANE_WINDOW_*`, `STUCK_LANECHANGE_MIN/MAX`, `EMERGENCY_LANE_*` |
| Overtake | `OVERTAKE_*`, `COURTESY_*`, `SCOOTCH_*` |
| Safety | `HARD_SAFETY_MARGIN/CREEP/STUCK` |

### `PARKING_CONFIG`

`SWEEP_DEG` 52, `STAGE_TIMEOUT` 6.5, `ROAM_MAX_ATTEMPTS` 6, `LOOKAHEAD_STALLS` 7, `YIELD_*`, stage abort thresholds.

### Items / signals / timing

`PARK_LANE_GAP` 2.56 · `DEFAULT_TIMING` · `SIGNAL_VISIBILITY_PRESETS` · `TARGET_FPS` / `MAX_DT`.

---

## 13. Major functions by module

### `index4_6.html` (selected)

**View / editor:** `toggleLaneGraphColorMode`, `laneGraphColorForEdge`, `toggleJunctionEditorMode`, `pickAutoControlPlan`, `autoApplyJunctionControls`, `cycleJunctionControlPreset`, `cycleApproachControlAt`, `drawApproachControlSigns`, `hitTestControlSign`.

**Canvas:** `renderFrame`, `drawAllSegmentsCanvas`, `drawAllJunctionsCanvas`, `drawGhostPreviewCanvas`, `segmentDrawPieces`, `applyGradeSeparationForNewRoad`, `joinSegmentAtCrossings`.

**Build:** `setBuildMode`, `placeSegment`, `addSegmentBetween`, `splitSegmentAtPoint`, `upgradeSegment`, `beginRoadSectionEdit`, `commitRoadSectionEdit`, `toggleBuildParkingWithRoads` / `AutoIntersections` / `CrossingGrade`.

**Junctions:** `calculateCurves`, `classifyTurn`, `isCommonSenseAllowed`, `buildLaneCurve`, `cycleLaneTurnMode`, `refreshJunctionVisuals`, `moveJunctionNode`.

**Input / view:** `screenToWorld`, `applyView`, `handleClick`, `hitTestJunctionNode` / `LaneNode` / `ApproachHandle`.

**Persist:** `serializeCurrentMap`, `loadMapData`, `saveCurrentMap`, `serializeApproachControls`, `serializeMapSignals`.

### `engine.js` (selected)

**Graph:** `rebuildAllieGraph`, `buildLaneAtoms`, `buildTurnAtom`, `buildLaneChangeEdge`, `allieDijkstra`, `allieFindPath`, `applyRouteToCar`, `findNearestAtomPoint`.

**Loop / UI:** `tick`, `stepSim`, `fastForwardSim`, `setSimSpeed`, `toggleSimPaused`, `runFastForwardSkip` / `Minutes`.

**Cars:** `spawnCarFromRoute`, `updateCar`, `updateCarBatch`, `computeDesiredSpeed`, `computeDesiredSpeedBatch`, `drawCarsCanvas`, `removeCar`, `beginOuttaHere`.

**Constraints:** `signalConstraintFor`, `signedJunctionConstraintFor`, `unsignalizedJunctionConstraintFor`, `trafficConstraintFor`, `intersectionClearanceConstraintFor`, `parkingYieldConstraintFor`, `headAwarenessConstraintFor`, `resolveHardSafety`, `frontConflictPeers`.

**LC:** `updateLaneChangeSystem`, `evaluateOvertakeOpportunity`, `attemptEmergencyLaneEscape`, `updateTrafficStuckWatchdog`.

**Parking:** `evaluateParkingIntent`, `updateParkingSearch`, `beginParkingStaging`, `updateParkingMotion`, `resumeParkingRoam`, `abortBadParkingStage`, `reserveStall`, `findLocalParkingAhead`.

**Spawners:** `placeSpawner`, `updateSpawners`, `trySpawnFromSpawner`, `exportMapSpawners`.

**Debug:** `drawDebugOverlayCanvas`, `collectCarWhyFacts`, `toggleCarWhyPanel`, `describeCarAction`, gap-hold bars.

### `signals.js`

`syncJunctionSignals`, `rebuildPhaseRing`, `updateSignals`, `movementDisplay`, `drawAllSignalsCanvas`, `hitTestSignalAt`, `cycleSignalVisibility`, `toggleSignalsMaster`, `updateSignalPanel`, head override toggles.

### `items.js`

`parkingCurbOffset` / `Point`, `buildParkingBayFromPick`, `applyParkingToAllRoads`, `hitTestParkingStall`, parking delete brush, `serializeParking` / `loadParking`, `initParkingItems`.

### `units.js`

`ZONE_TYPES`, zone draft/commit, `serializeZones` / `loadZones`, `initUnitsZoning`.

### `lanes.js`

`paintSegmentSkin` (mid-block MUTCD pavement + markings), `drawApproachLimitLinesCanvas` (solid approach + stop bar), `drawLaneTransitionsCanvas` (2-leg curve/taper paint), `toggleRoadSkinMode` / `setRoadSkinRealistic`, view-bar inject + monkey-patches on segment/junction draw.

---

## 14. Interaction cheat sheet

| Input | Behavior |
|-------|----------|
| Scroll | Zoom at cursor |
| Middle-drag / Space+drag | Pan |
| LMB (view) | Lane node cycle turns; junction/signal select; empty deselect |
| Junction editor | Center = preset cycle; sign = per-approach cycle |
| Build | Two-click place; Esc cancel |
| Upgrade / Delete brush | Hover cell → drag → release commit; RMB/Esc cancel |
| Delete on stall | Parking string delete |
| Drive | Atom pick spawn/dest; car click follow; Del delete car |
| Player car | W/S A/D Q/E Space Esc |
| Ref overlay | Leaflet picker + move/rotate/scale handles |

---

## 15. Spatial indexes & perf notes

- **Car spatial hash:** `SPATIAL_CELL = 28`, `spatialBuckets`, `collectNearbyCars`
- **Lane occupancy:** `laneOccupancy` map for same-lane leads
- **Parking bay index:** `parkingBaysBySeg` rebuilt when bay list length changes
- **Congestion overlay:** `updateLaneCongestionState` on interval scaled by load
- **Spawner list UI:** countdown patched in place (no full `innerHTML` rebuild every second)
- **Canvas resize:** avoids `getBoundingClientRect` every frame
- **Batch FF:** larger dt, throttle `rebuildCarIndexes`, `updateCarBatch` for long skips

---

## 16. Debugging cars

With a car selected / followed:

1. **Debug On** — rings, gap-hold bar (follow gap / stop-hold corridor), sensor overlays
2. **Why is it doing this?** — live binding constraints (`collectCarWhyFacts`); highlights which cap is holding speed at 0
3. Overlay sections (Sensors / Lane change / Parking) persist open/closed in `localStorage` (`co-section:*`)

When debugging early stop-sign freezes: check Why for **stopDist** still large while Traffic/lead or another cap binds at 0 — that cap is the real reason (see 4.6.18+ stop-sign notes in `updates.md`).

---

## 17. Mental model for common edits

| Want to… | Start here |
|----------|------------|
| Change how cars brake for reds | `signalConstraintFor`, `ALLIE_CONFIG.SIGNAL_*` |
| Change stop-sign feel | `signedJunctionConstraintFor`, `STOP_*` / `STOP_SIGN_*` |
| Change follow gap | `DETECT_*`, `trafficConstraintFor` |
| Change LC windows | `LANE_WINDOW_*`, `buildLaneAtoms` / `computeLaneWindows` |
| Change jam escape | `attemptEmergencyLaneEscape`, `EMERGENCY_*`, `STUCK_LANECHANGE_*` |
| Change park reverse shape | `PARKING_CONFIG.SWEEP_*`, `updateParkingMotion` |
| Change curb offset | `PARK_LANE_GAP`, `parkingCurbOffset` |
| Change paint order | `renderFrame` layer list |
| Change map JSON shape | `serializeCurrentMap` / `loadMapData` + parking/zone wrappers |
| Change signal timing defaults | `DEFAULT_TIMING`, signal panel `applySignalTiming` |
| Change auto stop/yield rules | `pickAutoControlPlan` |
| Add a new authoring tool | Mode flag + exclusivity patch + hit-test branch in click handlers |

---

## 18. Gotchas

1. **Canvas-only** since 4.3.1 — do not reintroduce per-entity SVG nodes.
2. **`PARK_LANE_GAP` is 2.56** in `items.js` (older changelog once said 6.25 — trust code).
3. Map storage key is still `trafficSim3_8_*`; traffic states `trafficSim4_1_*`.
4. Zones do not drive spawn demand in this version.
5. Batch FF intentionally degrades fidelity — document when comparing Skip-drawing results to realtime.
6. `controlsManual` / saved `approachControls` block auto sign overwrite — clear manually if auto seems “broken.”
7. Cross-lane straight edges inside junctions are stripped from ALLIE when `ALLOW_INTERSECTION_LANE_CHANGES` is false — that is intentional (prevents free mid-box lane hops).
8. Parking `_stalls` are runtime-only; claims are not in map JSON.
9. After road edits, always expect `rebuildAllieGraph` + full car reroute cost on big networks.
10. Keep `updates.md` in sync when shipping behavior changes (version bump `.n+1` under folder `4.6`).

---

## 19. Constraint inventory (engine)

Each returns `{ desired, status?, decelRate? }` or `null` (no opinion). `computeDesiredSpeed` takes the **minimum** desired among active constraints (scootch can raise above cruise slightly).

| Constraint helper | What it caps |
|-------------------|--------------|
| Turn lookahead | Upcoming turn `targetSpeed` |
| `laneChangeApproachConstraintFor` | Hold / rare boost into a window |
| `signalConstraintFor` | Red / yellow / ROR creep |
| `signedJunctionConstraintFor` | Stop dwell, yield, ROW, look/creep |
| `unsignalizedJunctionConstraintFor` | First-arrival / coast clear |
| `intersectionClearanceConstraintFor` | Path through box + exit-room queue |
| `trafficConstraintFor` | Same-lane lead / stop-queue pull-up |
| `parkingYieldConstraintFor` | Hold for staging/reversing parkers |
| `parkingApproachConstraintFor` | Decel to stage / stall hunt |
| `headAwarenessConstraintFor` | Driver-head FOV rings + critical stop |
| Peripheral / side detect | Soft cruise fraction cut |
| Arrival / dest | Slow into end of route |
| Hard safety | OBB overlap winner/loser (`hardSafetyLoser`) |

Why panel (`collectCarWhyFacts`) re-runs / reads the same stack so the UI matches the live integrator.

---

## 20. Signed junction state machine (sketch)

`car.stopSignState` progresses roughly:

```
approach  →  (bite brake / latch)  →  dwell  →  look  →  creep  →  commit
                 ↑                      │         │
                 └── mid-block resume ──┘         └── seniority hard-yield → hold 0
```

Important tunables: `STOP_APPROACH_BITE`, `STOP_BRAKE_PAD`, `STOP_SIGN_DWELL`, `JUNCTION_CREEP_SPEED`, `JUNCTION_CLEAR_HOLD`. Limit-line clamp (`clampStopSignLimitLine`) holds the axle during approach/dwell and while look/creep is still waiting on a clear grant (`_stopHoldAtLine` / yield peers). Soft unclear creep only noses up to the painted line; past it needs a full clear. Intersection clearance hard-holds graph-conflicting peers already in the box even outside the head cone. Queue pull-up uses `stopSignLeadPastLimitLine` so followers do not crawl-match junction creep all the way to the line.

---

## 21. Parking phase state machine (sketch)

```
driving + parkingIntent
    → hunt (LOOKAHEAD_STALLS / roam forward)
    → reserveStall
    → beginParkingStaging (reject bad stage → abortBadParkingStage → roam)
    → parkPhase: staging → reverse1 → reverse2 → settle → parked
         │              └── parkReverseBlockedBy (hardSafetyLoser) may hold
         └── stolen / timeout / miss → resumeParkingRoam
```

Parallel reverse is a two-arc S-curve sized from stall geometry (`SWEEP_DEG`). Neighbor clearance samples treat **reserved** neighbors as occupied. `activeParkersCount` tracks staging/reversing cars (yield logic also scans nearby parkers directly so it does not depend only on the counter).

---

## 22. Related docs

- [`updates.md`](./updates.md) — chronological feature / fix notes (4.3.1 → 4.6.x)
- Sign assets under `../signs/`
- Entry point: open `../index4_6.html` in a browser (file:// or local static server)

When you ship a behavior change, bump the changelog as `4.6.n+1` per the note at the end of `updates.md`, and update the relevant section(s) here if the mental model changed.
