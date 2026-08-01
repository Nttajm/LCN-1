## 4.3.1 — Canvas 2D renderer



Switched the whole sim from SVG DOM drawing to a single HTML5 **Canvas 2D** full-frame redraw for performance (SVG element thrash was making the game laggy).



- `<svg id="canvas">` → `<canvas id="canvas">`; one `renderFrame()` paints roads, junctions, signs, signals, zones, parking, ghosts, cars, debug, and ref-overlay chrome each tick.

- Entities keep plain data only (no per-shape DOM nodes). Pan/zoom uses `ctx.setTransform` with the same `view` math as before.

- Interactions that used to rely on SVG hit targets (junction drag, approach handles, lane nodes, signal heads) now use geometric hit-tests on the board.

- Also smoothed a ~1s hitch: spawner list no longer does a full `innerHTML` rebuild every second (countdown text is patched in place), and canvas resize stopped calling `getBoundingClientRect` every frame.

- Parking is included in map serialize/load again and auto-persists to the current saved map after Apply parking / place / road-cut changes.

- No intentional gameplay/feature changes — rendering backend only.



## 4.3.2 — Fast-forward panel



Added a **fast-forwarder** UI fixed to the left of the drive panel for speeding up and skipping sim time in **real simulation seconds** (not calendar clock jumps).



- Clock shows sim time as a 12-hour day clock from `simTime` (starts `12:00:00 AM`).

- Speed chevrons: **1× / 2× / 4× / 8×** realtime playback (sub-steps stay within physics `MAX_DT`).

- Skip button + dropdown presets: **+3s, +5s, +10s, +30s, +1min**.

- Clock icon opens a **custom minutes** field (1–180); Go / Enter jumps that many minutes.

- Pause on the FF panel mirrors the drive-panel Pause/Resume control.

- Skips **scrub on-canvas** at ~10–100× (no black full-screen loader): each animation frame advances sim time, then `renderFrame()` so cars/spawners/signals stay visible; a thin progress bar on the FF panel shows multiplier + %.


## 4.3.3 — Jam-escape lane changes



Cars that are genuinely stuck (near-stopped, blocked by traffic — not just idle) for a while now try to force their own lane change into a visibly clearer sibling lane, instead of waiting forever for a textbook-safe gap.



- New per-car patience stat (`_stuckLaneChangeThreshold`, 15–25s) derived from the existing `overtakeTendency` personality stat — more aggressive/hurried drivers snap sooner.

- `updateTrafficStuckWatchdog()` tracks real stuck time (speed near 0 + a car ahead within `DETECT_RING_MID`); once patience runs out it calls `attemptEmergencyLaneEscape()`, which scans up to `EMERGENCY_LANE_CHANGE_LOOKAHEAD` ahead for any reachable lane-change window into a lane with meaningfully fewer cars nearby (`laneDensityNear()`), and splices it into the route the same way discretionary overtakes do.

- Escapes are flagged `car._emergencyLaneChange` and driven differently: they never abort-and-go-straight (they keep creeping on relaxed force-gaps instead of retreating back into the jam), they drive the actual blend as a tight, sharp turn-out (slow `EMERGENCY_LANE_CHANGE_SPEED` creep + a much shorter pure-pursuit lookahead `EMERGENCY_LANE_CHANGE_LD` for sharper steering) rather than the normal smooth courteous merge, and they ease back up to cruise speed gradually afterward (`_postMergeEaseT` / `EMERGENCY_POST_MERGE_ACCEL_MULT`) instead of snapping back to full throttle.

- Still fully gap- and collision-checked (relaxed thresholds, not zero) — it never shoves into oncoming traffic in the target lane, it just stops being polite about waiting for a perfect gap.



## 4.3.4 — Build-mode toggles



While **Build** is active, a small options bar sits above the road toolbar:



- **Parking with roads** (default On) — newly placed roads get curb parking using the same eligibility rules as Apply parking. Off = place bare roads only.

- **Auto intersections** (default On) — crossings and mid-road attaches split into junctions. Off = roads may overlap without auto-splitting.

- **Crossing: Above / Below** — only applies when Auto intersections is Off. **Above** = the road you build/upgrade goes over (the existing crossed road fades as an underpass). **Below** = your road goes under (your crossing section fades). Underpass sections also dim cars and curb parking on that stretch. Saved with the map.

- **Upgrade (!)** uses the same options bar: click a road to re-apply lane type + parking refresh, join mid crossings into intersections (Auto On), or re-stamp Above/Below grade (Auto Off). Underpass roads now still shorten into junction stubs so they connect visually.



## 4.3.5 — Parking claim + stuck-car fixes



Cars could reverse into a stall another car already had, or loop forever while “roaming” for parking. Both came from weak stall claims and a roam reroute that wiped its own target.



- Roam now **reserves** the chosen stall immediately, pathfinds to a **curb-side lane past that stall** (`findLanePickForParkingBay`), and calls `applyRouteToCar(..., { keepParkingIntent: true })` so `evaluateParkingIntent` does not clear the claim mid-reroute.

- `stallIsFree` treats the caller’s own reservation as OK, drops ghost claims from deleted cars, and also rejects pads that already have a parked/parking/despawning body in them.

- Staging re-checks the claim before reverse; reverse abort holds the stall through despawn (`beginOuttaHere(..., { keepStall: true })`) so a second car cannot book the pad under a fading body.

- Neighbor clearance treats **reserved** neighbors like occupied. Roam gives up after `ROAM_MAX_ATTEMPTS` instead of searching forever.



## 4.3.6 — Parking sits off the adjacent lane



Curb parking no longer uses one shared “road bed half-width” for both sides (which floated stalls way out on the skinny side of wide / asymmetric multi-lane roads).



- Stall curb baseline is now **outermost lane center on that side + `PARK_LANE_GAP` (6.25)**, via `parkingCurbOffset` / `parkingCurbPoint` in `items.js`.

- Manual magnet pick and Apply parking / auto-park both use the same per-side offset. Re-run **Apply parking** (or re-place) to refresh existing maps.



## 4.3.7 — Upgrade re-lays curb parking



Upgrading a road (!) now always strips that road’s old parking (including corridor orphans / stale curb offsets) and lays a fresh run for the new lane layout — same eligibility rules as Apply parking.



## 4.3.8 — Section brush for upgrade / delete



Upgrade (!) and Delete no longer hit a whole road in one click. Both use a **3-unit brush** along the picked segment:



- Hover / press shows one 3-unit cell preview under the cursor.

- Hold and drag to paint more contiguous 3-unit cells along that road (preview only).

- Release commits (split out that interval, then upgrade or delete it). Right-click or Esc cancels the in-progress brush without applying.



## 4.3.9 — No auto-save of map edits



Parking / lane-turn / road edits no longer silently rewrite the current saved map in `localStorage`. Only **Save** persists; refresh reloads the last explicit save (or a blank board if none).



## 4.3.10 — Delete clears + re-lays parking



Section / road delete now strips curb parking for that stretch (including stalls left on a destroyed seg id), then **re-applies** parking on any leftover pieces of the same road so the remaining curb is reformatted cleanly.



## 4.3.11 — Delete parking strings



In **Delete** mode you can also paint-select curb parking: hover a stall (red preview), drag along the curb to grow a contiguous string, release to remove those stalls. Road brush still works when the cursor is on the roadway. Right-click / Esc cancels.



## 4.3.12 — Upgrade respects build toggles



Upgrade (!) honors the options bar: **Parking with roads Off** strips old curb parking and does not re-lay it; On re-lays after the lane change. Auto intersections / Above-Below already applied on upgrade.



## 4.3.13 — Clearer upgrade / delete segment highlight



Upgrade and Delete previews show a **faint ribbon on the whole segment** (so you can see which road you’re on) plus a stronger highlight on the brush portion you’re about to edit.



## 4.3.14 — Delete only re-parks roads that already had parking



Cutting a road no longer auto-adds curb parking to bare leftovers. Remnants are only re-laid if that road already had parking before the delete.



## 4.3.15 — Scootch up for behind merges



When a car is merging into your lane **behind** you and sitting too close, and you still have spare gap to the lead, you ease forward a little (`Making room`) to open the hole — without eating the follow cushion ahead. Classic ease-off courtesy still covers mergers ahead/alongside.



## update me after each read thank you, bye [exp: 1.1.n+1 (foldername)]