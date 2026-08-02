# trafficSim 4.4 — codebase map

Short guide for humans and AIs. Open `index4_4.html` in a browser; scripts load in order:

`signals.js` → `engine.js` → `units.js` → `items.js`  
(map / roads / UI live in the HTML; driving physics live in `engine.js`)

Changelog: `helpers/updates.md`.

---

## What this is

A 2D traffic city builder / simulator. You draw roads, junctions get lane stubs + bezier turns, cars spawn and Dijkstra-route along an “ALLIE” atom graph, then drive with pure-pursuit steering, traffic rules, signals, lane changes, and optional parallel parking.

**4.4 rendering:** one HTML5 Canvas full redraw per frame (`renderFrame`), not SVG DOM nodes. Entities are plain JS objects; pan/zoom uses `ctx.setTransform` + a `view` transform.

---

## File roles

| File | Owns |
|------|------|
| `index4_4.html` | UI panels, road drawing, `segments` / `nodes` / spawners, map save/load, canvas + input, calls into engine |
| `engine.js` | ALLIE graph, cars, routing, motion, traffic, lane changes, parking *motion*, tick + draw cars |
| `signals.js` | Signal heads + phase timing; cars query `movementDisplay(nodeKey, segId, laneIdx, turnType)` |
| `units.js` | Zoning polygons (residential / commercial / …) |
| `items.js` | Parking bay place/edit data (`parkingBays`); engine consumes them for RH park maneuvers |

There is no build step — plain scripts, shared globals.

---

## Core world data (HTML)

- **`segments`**: road links with endpoints, lane counts, direction. Lane geometry via `getLaneSpecs` / helpers in HTML.
- **`nodes`**: junction map keyed by `nodeKey`. Multi-way nodes get `laneNodes` (in/out stubs) and `edges` (bezier turns from `calculateCurves()`).
- **Spawners**: timed car sources; routes cached against ALLIE destinations.
- **Map serialize/load**: roads + parking + zones + signals as configured in HTML.

When roads change, rebuild junction curves, then **`rebuildAllieGraph()`**.

---

## ALLIE graph (`engine.js`)

Routing is a directed graph of **atoms** (edges) between **stubs** (nodes).

**Stub key:** `"<nodeKey>#<laneNodeId>"` (or synthetic `rung:…` for mid-block lane-change windows).

**Atom kinds:**

| Kind | Meaning |
|------|---------|
| `lane` | Drive along one lane slice (may be window-split on multi-lane roads) |
| `turn` | Junction bezier lane→lane; has length, `targetSpeed`, conflict set |
| `lanechange` | Mid-block blend between sibling lanes at a **window** |

Globals: `allieAtoms[]`, `allieOutByStub` (stub → outgoing atoms).

**Pathfinding:** `allieDijkstra` / `allieFindPath(spawnPick, destPick)` → list of `{ atom, tStart, tEnd }`. Route cost ≈ arclength (+ `LANE_CHANGE_GRAPH_PENALTY` so Dijkstra prefers stay-in-lane unless a change helps).

Lane-change windows: short legal merge zones along multi-lane groups (`LANE_WINDOW_*` in `ALLIE_CONFIG`). Cars only merge at those atoms — not arbitrary mid-lane cuts (unless jam-escape splices an existing window into the route).

---

## Cars

Spawn: `spawnCarFromRoute(route, destPick)`.

Important fields:

- `route`, `legIndex`, `traveledLength`, `totalLength`
- `x, y, heading, speed` (rear-axle pose; center cached as `_cx/_cy`)
- `state`: `driving` | `parking` | `parked` | `despawning`
- Personality: `overtakeTendency`, `courtesyTendency`
- Lane-change: `_laneChangeWaitT`, `_laneChangeForce`, `_emergencyLaneChange`, `_trafficStuckT`, …
- Parking: `parkingIntent`, `parkPhase`, `_parkPlan`, …

**Per-tick (driving):** `updateCar(car, dt)` roughly:

1. Stuck / parking / lane-change systems  
2. `computeDesiredSpeed` — cruise, turns, signals, yield, traffic gap, LC hold, jam-escape caps  
3. Accel / brake  
4. Pure pursuit toward a lookahead point on the route  
5. Hard OBB safety (`resolveHardSafety`)  
6. Advance `traveledLength`, `advanceCarLeg`  
7. Blinkers, idle watchdog  

Indexes rebuilt each frame: spatial hash + `laneOccupancy` (`rebuildCarIndexes`).

---

## Desired speed stack

`computeDesiredSpeed` takes the **minimum** of many constraints (order matters for status HUD):

- Cruise / turn targets / arrival brake  
- Signal + unsignalized junction yield  
- Intersection box clearance  
- Forward traffic (`trafficConstraintFor` → `_lastObstruction`)  
- Parking yield / stage approach  
- Lane-change gap hold (`laneChangeApproachConstraintFor`)  
- Merge courtesy (ease off) / scootch-up (make room ahead for a behind merger)  
- Peripheral / head caution  

Status string → `car._signalStatus` (HUD / idle-busy checks).

---

## Lane changes

**Normal:** route already contains a `lanechange` atom, or discretionary overtake splices one (`evaluateOvertakeOpportunity` → `attemptOvertakeSplice`). Approach holds for a gap (`laneChangeGapCheck`); after ~1.8s wait may abort straight (`abortLaneChangeGoStraight`) or force with relaxed gaps.

**Jam escape:** if nearly stopped and blocked ~15–25s (patience from `overtakeTendency`), `attemptEmergencyLaneEscape` picks a clearer sibling lane via density, splices a window, drives a **tighter** blend (slow speed + short lookahead), never aborts back into the jam, then eases accel after merge.

Debug: lane-change overlay / `_laneChangeDebug` when selected or rings on.

---

## Signals & junctions

- `signals.js` builds heads + phases for 3+ way nodes.  
- Engine: `signalConstraintFor`, right-on-red, yellow commit latch (`signalDecision`).  
- Unsignalized: first-arrival + `turnAtom.conflicts`.  
- **Signed controls:** `nd.approachControls` stop / yield / R.O.W.; `signedJunctionConstraintFor` when lights are off (replaces first-arrival at that node). Same-approach queues use normal following; once the lead clears past the painted limit line, `stopSignLeadPastLimitLine` / `STOP_PULLUP_SPEED` lets the next car roll up briskly instead of matching junction creep.  
- **Auto signs:** on junction rebuild, `autoApplyJunctionControls` sets T / major-minor / all-way stop (one-way stem often **yield** into a larger through). Skipped when `nd.controlsManual` (editor or saved).  
- Cars never treat green as “enter a blocked box” — `intersectionClearanceConstraintFor`.

**View chrome (`#view-bar`, top-middle):**

- **Lane graph color** — toggle `laneGraphColorMode` between `light` (default: each junction edge colored by `movementDisplay` red/yellow/green) and `turn` (classic straight/left/right/uturn palette).
- **Traffic lights** — cycle `signalVisibilityMode` through Off → Faint → Medium → Full. Default is **Off** (heads not drawn; icon stays very dim). Icon opacity tracks the preset. Drive-panel / signal-panel buttons stay in sync via `refreshSignalVisibilityUI()`.
- **Junction editor** — stop-sign button toggles `junctionEditorMode`. Center-tap cycles stop/yield/R.O.W. presets on a junction; tap a sign to cycle that approach (`nd.approachControls[segId]` = `stop` | `yield` | `row`). Engine: `signedJunctionConstraintFor`.

---

## Parking

- **Place bays:** `items.js` → `parkingBays[]`. Curb sits `PARK_LANE_GAP` (6.25) outside the adjacent outer lane (`parkingCurbOffset`), not a shared road-bed half-width.  

- **Drive in:** engine RH reverse S-curve (`PARKING_CONFIG`, `beginParkingStaging`, `updateParkingMotion`).  
- **Claims:** stalls are reserved as soon as a car targets them (including roam), re-checked before reverse, and held through abort-despawn so nobody double-books. Free checks also look for a car already sitting in the pad.  
- Intent: cars may seek curb stalls while searching / at destination. Hunt is **cruise-and-scan**: look at the curb beside you (L/R matching travel) up to `LOOKAHEAD_STALLS` (7) ahead and take the next free pad (`findLocalParkingAhead` / `findParkingCandidate`). Roam no longer pathfinds to the map-wide closest stall (that caused laps to spots behind). Forward-only fallback: `findForwardParkingStall`.  
- If the target stall is taken / blocked / overshot, `resumeParkingRoam()` drops the claim and keeps hunting ahead (fresh roam budget) instead of despawning right away.  
- Deleting parking (`syncCarsAfterParkingGeometryChange`) despawns cars parked / mid-park in removed stalls; staging cars re-roam. Surviving stalls after a partial delete rebind onto the new bay objects.

---

## Rendering & modes

- `renderFrame()`: roads, junctions, signs, signals, zones, parking, ghosts, cars, debug, route chrome.  
- Drive mode: click spawn / select / follow cars; hit-tests are geometric (no SVG targets).  
- Fast-forward panel: realtime 1×–8× and skip N sim seconds. Default skip animates on-canvas; **Skip drawing** uses the shared `traffic-load-screen` loader + batch `stepSim` (no mid-skip `renderFrame`).
- Junction lane curves drawn in `drawAllJunctionsCanvas` using `laneGraphColorForEdge`.

Tunables: **`ALLIE_CONFIG`** (and `PARKING_CONFIG`) near the top of `engine.js`.

---

## Mental model (one diagram)

```
segments + nodes
      ↓ calculateCurves()
laneNodes + turn edges
      ↓ rebuildAllieGraph()
lane / turn / lanechange atoms
      ↓ Dijkstra
car.route (legs)
      ↓ updateCar each dt
pose + speed constraints + safety
      ↓ renderFrame
canvas
```

---

## Where to change what

| Goal | Start here |
|------|------------|
| Car speed / gaps / rings | `ALLIE_CONFIG`, `trafficConstraintFor`, `computeDesiredSpeed` |
| Routing / graph | `rebuildAllieGraph`, `buildLaneAtoms`, `allieDijkstra` |
| Lane-change feel | `buildLaneChangeEdge`, `updateLaneChangeSystem`, jam-escape helpers |
| Signals | `signals.js` + `signalConstraintFor` |
| Light visibility / view bar | `SIGNAL_VISIBILITY_PRESETS`, `cycleSignalVisibility`, `#view-bar` in `index4_4.html` |
| Junction stop / yield / R.O.W. | `junctionEditorMode`, `approachControls`, `signedJunctionConstraintFor` |
| Auto junction signs toggle | `autoJunctionControls` / `#view-btn-auto-junction` (T icon) in `index4_4.html` |
| Lane-graph edge colors | `laneGraphColorMode`, `laneGraphColorForEdge`, `drawAllJunctionsCanvas` |
| Parking geometry UI | `items.js` |
| Parking drive | `computeParkingManeuver`, `updateParkingMotion`, `parkingYieldConstraintFor` (stage-point hold) |
| Zones | `units.js` |
| Draw / UI / roads | `index4_4.html` |
| Build options (parking-with-roads, auto intersections, crossing above/below) | `#build-toggles` in `index4_4.html`; underpass zones on `seg.underpasses`; parking gate in `items.js` |
| Underpass paint (darker gray bed + desat lanes) | `drawSegmentGeometryCanvas` / `underpassLaneColorFor` / `UNDERPASS_BED*` in `index4_4.html` |
| Perf | `rebuildCarIndexes`, canvas path, avoid per-frame DOM rebuilds |

---

## Conventions

- **Meters** in world space; headings in radians.  
- Car length/width in `ALLIE_CONFIG`; rear overhang matters for OBB.  
- Prefer extending existing constraint functions over a second parallel AI.  
- After editing roads/lanes: rebuild curves + ALLIE + reroute (`rerouteAllCars` when appropriate).  
- Don’t invent mid-block merges outside window atoms unless you also add graph edges.

---

## Quick glossary

- **Atom** — driveline edge (lane / turn / lanechange).  
- **Stub** — graph node at a lane entrance/exit.  
- **Window** — mid-block LC legal zone.  
- **Leg** — one atom slice on a car’s route.  
- **Pick** — `{ atom, t, x, y }` spawn or dest point.  
- **RH** — reverse-head-in parallel park maneuver.


## update me please
