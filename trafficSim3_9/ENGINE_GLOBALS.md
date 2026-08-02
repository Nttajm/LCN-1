# engine.js — host environment contract

Read this before changing `engine.js`. Do **not** assume you have the full HTML file. Everything below is what the engine already expects from the page and from `signals.js`.

`engine.js` is a classic script (no modules). It shares one global scope with the inline script in `index3_8.html` and with `signals.js`.

---

## Load order

```html
<script>/* inline: road network, camera, input */</script>
<script src="signals.js"></script>
<script src="engine.js"></script>   <!-- last -->
```

When `engine.js` runs, HTML globals already exist. At the bottom it calls `rebuildAllieGraph()` and starts `requestAnimationFrame(tick)`.

---

## Required globals (from HTML inline script)

These must exist. Engine uses them directly (no `typeof` guards).

### DOM / SVG

| Name | Type | Notes |
|------|------|--------|
| `svgNS` | string | `'http://www.w3.org/2000/svg'` |
| `world` | SVG `<g>` | `#world` — engine appends `drive-layer`, `route-highlight-layer`, `car-layer` here |
| `board` | HTMLElement | `#board` — pan/zoom container; engine toggles classes `drive-mode`, `drive-follow-hover` |

### Camera

| Name | Type | Notes |
|------|------|--------|
| `view` | `{ x, y, scale }` | Pan in px + zoom. World coords = screen via `screenToWorld` / `applyView` |
| `applyView()` | function | Applies `view` to `world` transform (+ grid background) |
| `screenToWorld(clientX, clientY)` | function | → `{ x, y }` in world space |

### Road network data

| Name | Type | Notes |
|------|------|--------|
| `segments` | array | Road segments; each has `id`, `startNode`/`endNode` `{x,y}`, `lanesIn`, `lanesOut` (and/or legacy `laneCount`) |
| `nodes` | `Map<nodeKey, node>` | Junctions keyed by `getNodeKey(x,y)` → `"x,y"` |

**Node fields the engine cares about:**

- `count` — junction if `count > 1`
- `laneNodes` — array of stub objects (`id`, `segId`, `laneIdx`, `type` `'in'|'out'`, plus geometry used by curves)
- `edges` — lane-to-lane connections inside the junction (`from`, `to`, `turn`)

### Geometry / lane helpers

| Name | Role |
|------|------|
| `getNodeKey(x, y)` | `"x,y"` string key |
| `shortenLine(x1,y1,x2,y2, shortenStart, shortenEnd)` | Pull endpoints back from junction (`STUB_R`) |
| `getRoadDirs(seg)` | → `{ lanesIn, lanesOut }` |
| `getLaneSpecs(lanesIn, lanesOut)` | → `[{ offset, forward, idx }, ...]` |
| `getLaneSpecsFor(seg)` | Convenience wrapper (available; engine mostly uses the two above) |
| `laneColorFor(spec, lanesIn, lanesOut)` | Lane draw color (used when building lane atoms) |
| `buildLaneCurve(a, b)` | Cubic bezier between two lane stubs (uses `a.tdx/tdy`, `b.tdx/tdy`) |
| `TURN_COLORS` | `{ straight, left, right, uturn }` hex colors |

### Build-mode helpers

| Name | Role |
|------|------|
| `isBuilding()` | True while user is placing a road |
| `cancelBuild()` | Cancel road placement (called when entering drive mode) |

### Constants (defined in HTML; engine does not redefine them)

Useful if you need matching geometry:

- `LANE_OFFSET` (4) — lateral spacing between lanes
- `NODE_R` (7) — dashed junction footprint half-width
- `STUB_R` (13) — how far painted roads + lane stubs sit back from the junction center (turn box)

---

## Optional globals (from `signals.js`)

Engine always checks `typeof … === 'function'` before calling. Safe if missing.

| Name | Used for |
|------|----------|
| `movementDisplay(nodeKey, segId, laneIdx, turnType)` | `'off' \| 'green' \| 'yellow' \| 'red'` for a movement |
| `yellowRemaining(nodeKey)` | Seconds left in yellow |
| `isRightOnRedAllowed(nodeKey)` | Right-on-red policy |
| `updateSignals(dt)` | Advance / paint signals each tick (`dt` or `0` when paused) |
| `clearSignalSelection()` | Clear signal UI selection when entering drive mode |
| `refreshAllSignalOpacities()` | Opacity refresh on drive mode toggle |

---

## What HTML calls on the engine

HTML does **not** own car/sim logic. It forwards input and buttons:

| Trigger | Engine API |
|---------|------------|
| Drive button | `toggleDriveMode()` |
| Pause button | `toggleSimPaused()` |
| Clear cars | `clearAllCars()` |
| Unfollow | `unfollowCar()` |
| `mousemove` while `driveMode` | `handleDriveMouseMove(worldPt)` |
| `click` while `driveMode` | `handleDriveClick(event)` |
| Esc while following | `unfollowCar()` |
| Esc with pending spawn | `clearPendingSpawn()` |

HTML also reads engine flags: `driveMode`, `followedCar`, `pendingSpawn`.

---

## DOM IDs the engine writes to

Engine assumes these elements exist in the page:

| ID | Purpose |
|----|---------|
| `btn-drive-mode` | Drive toggle label / active class |
| `drive-hud` | Drive mode banner (`.visible`) |
| `drive-hud-meta` | Drive hint text |
| `drive-toast` | Temporary toast messages |
| `car-info` | Followed-car panel |
| `ci-id`, `ci-speed`, `ci-status`, `ci-eta`, `ci-remaining` | Car info fields |
| `car-follow-tag` | Floating follow tag |
| `cft-id`, `cft-speed`, `cft-eta`, `cft-remaining` | Tag fields |
| `car-count` | Live car count |
| `btn-sim-pause` | Pause / Resume |

Do not rename these without updating both HTML and engine.

---

## Engine-owned state (do not redefine in HTML)

Defined in `engine.js`:

- `driveMode`, `pendingSpawn`, `cars`, `carIdCounter`
- `followedCar`, `hoveredCar`, `simPaused`
- `allieAtoms`, `allieOutByStub`
- `ALLIE_CONFIG`, layers (`driveLayer`, `routeHighlightLayer`, `carLayer`)

---

## Car object (for any sim logic you add)

Each entry in `cars[]`:

```js
{
  id, el, lightEls, blinkerEls, hitEl, hoverRing, selectRing,
  route,        // legs: { atom, tStart, tEnd, length, cumStart, cumEnd }
  legIndex,
  totalLength, traveledLength,
  x, y,         // REAR AXLE position in world space
  heading,      // radians; forward = (cos(heading), sin(heading))
  speed, braking, blinkerPhase,
  color, selected,
  state,        // 'driving' | 'despawning'
  despawnT,
  highlightEls,
  signalDecision, signalTimer, rorPhase
}
```

Size / kinematics live in `ALLIE_CONFIG` (e.g. `CAR_LENGTH`, `CAR_WIDTH`, `REAR_OVERHANG`, `WHEELBASE`, cruise/accel/decel).

---

## Main loop hook

```js
function tick(ts) {
  // hover refresh in drive mode
  if (!simPaused) {
    updateSignals?.(dt);
    for each car: updateCar(car, dt);
  }
  // follow camera, layer z-order, rAF
}
```

New simulation behavior usually belongs in `updateCar()` or a helper called from `tick()`. Prefer engine-only changes unless you need new DOM, CSS, or input wiring.

---

## Rules of thumb for Claude

1. Prefer editing **only** `engine.js` when possible.
2. Do not invent new HTML globals — use the tables above.
3. Guard optional signal APIs with `typeof fn === 'function'`.
4. Keep load order: HTML inline → `signals.js` → `engine.js`.
5. `(car.x, car.y)` is the **rear axle**, not the visual center of the body.
6. Rebuild the routing graph with `rebuildAllieGraph()` after the road network changes (engine already does this on drive-mode enter and at startup).
)
