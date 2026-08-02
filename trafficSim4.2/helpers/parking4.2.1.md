## Verdict

**Parallel curb parking already exists** as a full manual tool in `items.js` (not in `engine.js` / `signals.js` / `units.js`). There is **no auto-parking after road build** and **no “Apply parking” button**. The only apply-with-loader pattern is **Traffic State** load (`#traffic-load-screen`), not Saved Maps.

Script order: inline `index4_2.html` → `signals.js` → `engine.js` → `units.js` → `items.js` → traffic-state script.

---

## 1. How parking works

### Location
All real parking logic is in **`trafficSim4.2/items.js`** (~1237 lines). Toolbar button also exists in HTML:

| What | Where |
|------|--------|
| Toolbar button | `index4_2.html` **1448–1450** |
| HUD / layers / modes | `items.js` **1–1236** |
| Standalone kinematic demo (not wired in) | `Untitled.html` |
| Metaphorical “park” (stopped cars) | `engine.js` only |

### Data structures

Global state (`items.js` **11–21**):

```js
let parkingMode = false;
let parkingBays = [];      // committed bays
let parkingCounter = 1;
let parkingDraft = null;   // in-progress bay
let parkingHover = null;
```

**Bay object** (created in `commitParkingDraft` / `buildParkingBayFromPick` / `loadParking`):

```js
{
  id, kind: 'parallel',
  x1, y1, x2, y2,     // curb baseline
  ux, uy,             // along-road unit
  nx, ny,             // outward normal (into curb)
  count,              // number of stalls
  spotLength, spotDepth,
  segId, side,        // ±1 which curb
  el                  // SVG group (runtime only)
}
```

Serialized map fields (`serializeParking` **900–918**, patched into maps **1120–1129**):

```js
data.parking = serializeParking();
data.parkingCounter = parkingCounter;
```

### Key parking functions

| Function | Lines | Role |
|----------|-------|------|
| `parkSpotLength/Depth` | 33–38 | Stall size = car × 1.2 |
| `roadBedHalfWidth` | 150–163 | Curb offset from lane specs |
| `parkingCurbPoint` | 165–185 | Point on curb for side ±1 |
| `parkingClearRange` | 419–440 | Usable along-seg range (avoids junction stubs) |
| `resolveParkingPick` | 559–619 | Magnet to nearest curb under cursor |
| `maxParkingSpots` | 538–557 | How many stalls fit in one drag direction |
| `buildParkingBayFromPick` | 392–417 | Build bay geometry |
| `commitParkingDraft` | 632–676 | Push bay + render |
| `cutParkingByRoad` | 369–390 | Split/remove stalls when a new road cuts them |
| `serializeParking` / `loadParking` / `clearParking` | 900–973 | Persist / restore |
| `setParkingMode` / `toggleParkingMode` | 734–776 | Mode toggle |
| `initParkingItems` | 1224–1230 | Boot |

### UX flow
1. Click parking toolbar → `setParkingMode(true)` (disables build/delete/upgrade/zone/drive).
2. Click/drag along curb → ghost stalls → `commitParkingDraft`.
3. Esc / right-click cancels or exits.
4. New roads **cut** overlapping parking via patched `addSegmentBetween` (**1151–1165**).

**No car-parking behavior** — stalls are visual geometry only; `engine.js` does not route into them.

---

## 2. Road build / completion flow

### Entry
Build mode → click start → click end (`handleClick` **4099–4161**).

### After a road is completed

```
handleClick (build)
  → placeSegment(x, y)           // 4023–4057
      → findCrossingPoints + splitSegmentAtPoint
      → for each chain piece:
           addSegmentBetween(ax,ay,bx,by)   // 4059–4097
  → beginBuild(x,y)              // chain continues from end
```

### `addSegmentBetween` (**4059–4097**) — the real “road created” hook

```js
const segment = {
  id: segmentCounter,
  startNode: { x: ax, y: ay },
  endNode: { x: bx, y: by },
  laneCount: currentLanesIn + currentLanesOut,
  lanesIn: currentLanesIn,
  lanesOut: currentLanesOut,
  lineElements: []
};
segments.push(segment);
// update node counts…
redrawSegment(seg);
refreshJunctionVisuals(startKey);  // → calculateCurves
refreshJunctionVisuals(endKey);
```

Then **`items.js` wrapper** (**1151–1165**) runs `cutParkingByRoad(...)`.

**Not called on add:** `rebuildAllieGraph()` — that runs on remove/upgrade/map-load/enter-drive (`engine.js` `setDriveMode` ~1121). Junction lane graphs **are** rebuilt via `refreshJunctionVisuals` → `calculateCurves` (**3016–3024**, **3342+**).

### Related road functions

| Function | Lines | Role |
|----------|-------|------|
| `placeSegment` | 4023–4057 | Crossings → chain → add pieces |
| `addSegmentBetween` | 4059–4097 | Create segment object + draw |
| `beginBuild` / `cancelBuild` | 2409–2435 | Placement state |
| `splitSegmentAtPoint` | 2718–2768 | T-junction / crossing split |
| `redrawSegment` | 3689+ | Paint lane lines |
| `removeSegment` | 2692–2716 | Delete + `rebuildAllieGraph` |
| `applySegmentLaneConfig` / `upgradeSegment` | 2077–2091 | Change lane type on existing road |

---

## 3. Lane counts & one-ways

### State (`index4_2.html` **1760–1765**)
```js
let currentLanesIn = 1;   // travel end → start
let currentLanesOut = 1;  // travel start → end
const MAX_DIR_LANES = 4;
```

### Presets (toolbar **1454–1457**)
| Button | Call | Meaning |
|--------|------|---------|
| 1 Way | `setPresetMode(0,1)` | one-way outbound |
| 2 Lane | `setPresetMode(1,1)` | 1 each way (default) |
| 4 Lane | `setPresetMode(2,2)` | 2 each way |
| Advanced | `setAdvancedMode()` | nudge In/Out 0–4 independently |

**No dedicated “3-lane” preset.** Total of 3 = Advanced e.g. `1 in · 2 out` (default Advanced asymmetry **2010–2016**).

### Core helpers (**1918–1975**)
- `getRoadDirs(seg)` — resolve `{lanesIn, lanesOut}` (legacy `laneCount` supported)
- `getLaneSpecs(lanesIn, lanesOut)` — offsets; `LANE_OFFSET = 4` (**1683**)
- `getLaneSpecsFor(seg)`
- `isPureOneWay` — one side is 0
- `roadLabel` — UI string
- One-way paint color `#ff8800`; flip via upgrade right-click → `flipSegmentDirection` (**2093–2098**)

---

## 4. Saved Maps UI & load path

### UI structure (`index4_2.html` **1341–1356**)

```
<details id="maps-section"> SAVED MAPS
  #map-name (text)
  #map-list (select)
  .maps-actions
    Save / Load / Delete / New blank / Export / Import
  #map-file-input
  #maps-status
```

CSS: **460–508** (2-column `.maps-actions` grid). Sibling sections: TRACE MAP, TRAFFIC STATE.

### Persistence
- Key: `trafficSim3_8_saved_maps` (**4991**)
- `serializeCurrentMap` **5150–5184** — segments, signals, laneTurns, spawners, refOverlay  
  (+ `parking` via `items.js` patch)
- `loadMapData` **5269–5315** — clear → rebuild segments/nodes → redraw → junctions → `rebuildAllieGraph` → spawners → overlay  
  (+ `loadParking` via patch **1131–1139**)
- Auto-load last map on boot **5634–5642**

### Load is synchronous
`loadSelectedMap` (**5333–5354**) calls `loadMapData` immediately — **no splash/loader**.

---

## 5. Existing apply + loader pattern

**Only Traffic State** uses a progress overlay:

| Piece | Location |
|-------|----------|
| Markup | **1407–1414** `#traffic-load-screen` |
| CSS | **527–576** |
| `showTrafficLoadScreen` / `hideTrafficLoadScreen` | **5476–5492** |
| `runTrafficStateLoad` | **5522–5546** |
| Engine progress | `engine.js` `importTrafficState` **2733+** |

Hint text: *“Load runs a calibrating splash first”* (**1391**).

Saved Maps Load / `applyMapPickerArea` (**4980–4986**) / upgrade “apply lane type” have **no** progress UI.

There is **no** existing “Apply parking” action.

---

## Hook points (concrete)

### A. Auto-parking after road build

**Best hook:** extend the existing `addSegmentBetween` patch in `items.js` **1151–1165**:

```1151:1165:trafficSim4.2/items.js
  if (typeof addSegmentBetween === 'function' && !addSegmentBetween._parkingPatched) {
    const orig = addSegmentBetween;
    function wrappedAddSegmentBetween(ax, ay, bx, by) {
      const before = segments ? segments.length : 0;
      const result = orig(ax, ay, bx, by);
      let half = roadHalfWidthForCut(null);
      if (segments && segments.length > before) {
        half = roadHalfWidthForCut(segments[segments.length - 1]);
      }
      cutParkingByRoad(ax, ay, bx, by, half);
      return result;
    }
```

After `cutParkingByRoad`, call something like `autoParkAlongSegment(segments[segments.length - 1])` using:
- `parkingClearRange(seg)`
- `parkingCurbPoint(seg, along, side)` for `side = ±1`
- `maxParkingSpots` / `buildParkingBayFromPick` / `bayOverlapsExisting`
- `parkingBays.push` + `renderParkingBay`

**Alternate:** end of `placeSegment` (**4054–4056**) after the chain loop (one shot per click, after all splits).

**Do not** put auto-park only in `placeSegment` without also covering splits if you want parking on every new piece — `addSegmentBetween` already runs per piece (including chain fragments).

### B. “Apply parking” button in Saved Maps

Add next to Load in **1346–1353**:

```html
<button class="lane-btn" onclick="applyParkingToMap()">Apply parking</button>
```

Reuse loader:

```js
showTrafficLoadScreen(pct, info);  // 5476
hideTrafficLoadScreen();           // 5489
```

Iterate `segments`, fill both curbs, yield frames like `importTrafficState` (`await requestAnimationFrame`). Status via `setMapsStatus` (**4994**).

---

## File map (quick)

| File | Parking / roads / maps role |
|------|-----------------------------|
| `items.js` | Parking tool, bay data, map serialize/load patches, road-cut |
| `index4_2.html` | Road build, lanes, Saved Maps UI, traffic loader |
| `engine.js` | Routing; traffic-state progress; no parking geometry |
| `units.js` | Zoning (parallel tool pattern; no parking) |
| `signals.js` | Signals only |
| `Untitled.html` | Isolated parking kinematics demo |

## update me after each read please, thank you