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



## 4.4.1 — Light-status lane graph + view bar



Junction lane-graph edges can show **signal state** instead of turn-type colors, and traffic light sprites stay hidden until you ask for them.



- Top-middle **view bar** (`#view-bar`): pill with two circle buttons.
  - **Graph color** — toggle between light-status coloring (default) and classic turn colors (straight / left / right / uturn).
  - **Lights** — cycles Off → Faint → Medium → Full. Default **Off** (heads not drawn). The traffic-light icon opacity tracks the preset.
- In light-status mode each bezier edge uses `movementDisplay(...)` → red / yellow / green (grey when signals are off / free-flow).
- Drive-panel + signal-panel “Lights” controls stay synced with the view-bar cycle.




## 4.4.2 — Keep looking when a parking spot is taken

If another car takes the stall you were lining up for (or you reach the curb with nothing free), you no longer bail immediately — you drop the claim and **roam for another free stall**.

- New `resumeParkingRoam()` clears the current reservation, resets the roam attempt budget, and re-arms map-wide search (or leaves only if nothing is free anywhere).
- Staging aborts (stolen claim, timeout, overshoot), end-of-destination arrival, and "passed the curb with no stall" all use it.
- Roam scan races that find no bay mid-tick retry next interval instead of despawning.


## 4.4.3 — Deleting parking removes parked cars

When curb parking is deleted (stall brush, clear all, strip for road edit / Apply parking, or cut by a new road), cars parked or mid-maneuver in those stalls despawn. Staging cars that lost their pad drop the claim and keep roaming. Cars on stalls that survive a partial delete are rebound onto the rebuilt bay objects.


## 4.4.4 — Parked cars look ignition-off

Parked cars render slightly faded with very dark red brake lamps and both blinkers as faded dark orange (not flashing). Blinkers / brake lit flags are cleared when settle finishes so signals do not stay stuck on after parking.


## 4.4.5 — Junction editor (stop / yield / R.O.W.)

Top view-bar gains a **stop-sign button** that enters **junction editor** mode.

- Tap the **middle of an intersection** to cycle auto presets: all-way stop → through R.O.W. with stem/cross **stop** (T / 2-way stop) → through R.O.W. with **yield** → all-way yield (3+ ways) → clear.
- Tap an approach **sign** to cycle that road alone: none → Stop → Yield → **R.O.W.** → none.
- Stop / yield use `signs/stop.png` and `signs/yield.png`; right-of-way draws as an **R.O.W.** label.
- Cars obey signed controls when lights are off: full stop + dwell at stop signs, yield to higher priority / conflicts, R.O.W. keeps priority.
- Saved with the map as `approachControls`.

## 4.4.6 — Auto stop / yield on new junctions

When a 3+ way junction is built or rebuilt (T from mid-road attach, one-way into two-lane, etc.), controls are applied automatically:

- **T / stem:** through road **R.O.W.**; stem **stop** (or **yield** if a one-way merges into a clearly larger / two-way through).
- **Major vs minor 4-way:** wider corridor **R.O.W.**, others **stop**.
- **Equal multi-way:** all-way **stop** (signals turned off for that node).
- Manual editor changes and saved maps keep `controlsManual` so auto does not overwrite them.



## 4.4.7 — Clearer underpass look

Underpass (grade-below) road stretches read more obviously as under the overpass:

- Soft gray asphalt bed (lighter wash) drawn as a **square-ended** quad — no round line caps.
- Lane lines / arrows use desaturated gray tones instead of yellow/black; underpass lane strokes use butt caps.
- Slightly higher underpass lane/arrow opacity so the gray still reads on the bed.
- Car dimming only applies when the car’s own segment has an underpass at its `segT` — overpass traffic no longer fades just because it shares world XY with the under road.



## 4.4.8 — Auto junction signs toggle

View bar gains a **T-intersection** button that toggles automatic stop / yield / R.O.W. on new or rebuilt junctions (the 4.4.6 auto rules).

- Default **On** (yellow accent) — same auto behavior as before.
- **Off** — new junctions stay unsigned until you set them in the junction editor. Manual / saved controls are unchanged.



## 4.4.9 — Yield for cars that are parking

Cars behind a vehicle that is staging or reversing into a stall now wait until the park finishes, instead of driving through once the body leaves the lane.

- Hold is anchored on the parking **stage point** (travel-lane pose) for the whole reverse / settle, not only the moving body.
- `findNearestObstruction` also treats that stage point as a stopped on-path lead.
- Wider lateral yield while the parker is in the stall swing.



## 4.4.10 — Fast-forward skip drawing

FF panel gains a **Skip drawing** toggle (default **Off**).

- **Off** — same as before: skip scrubs on-canvas at ~10–100× with live `renderFrame`.
- **On** — skip uses the same black `traffic-load-screen` loader as Apply parking; physics batches as fast as the CPU allows (no mid-skip draw), then paints once at the end. Better for long minute jumps.

- Batch path also uses larger steps (`1/8` s), skips blinker + spawner DOM work (`simBatchMode`), and rebuilds car spatial indexes every 6th step so long skips run much faster.
- **Coarse batch integrator** (`updateCarBatch`): while Skip drawing is On, cars snap along routes with signals + same-lane lead gaps only — no Pure Pursuit, OBB hard-safety, soft awareness, discretionary lane changes, or stuck/parking Dijkstra thrash. Final `renderFrame` shows the result.



## 4.4.11 — Parking yield + roam stuck fixes

Cars no longer plow through a vehicle that is staging / reversing into a stall, and roamers no longer loop forever on an unreachable stall.

- **Batch FF parking yield:** `computeDesiredSpeedBatch` now applies `parkingYieldConstraintFor` / `parkingApproachConstraintFor` for *every* car (same as the full path), not only cars with `parkingIntent`.
- **Batch collision guard:** `updateCarBatch` hard-stops (reverts pose, speed 0) when a snapped pose would OBB-overlap another car near an active parker or tight lead.
- **Normal-play hardening:** parking yield and hard-safety OBB no longer skip a frame when a hold is imminent / near an active parker; slightly longer `YIELD_LOOKAHEAD` / `YIELD_GAP`.
- **Roam stuck:** failed path/pick stalls are blacklisted per car (`_parkRoamRejected`) so the next interval tries a different stall; roam attempts are no longer decremented on failure, so `ROAM_MAX_ATTEMPTS` can actually fire and send the car outta-here.



## 4.4.12 — Tighter parallel-park reverse + no back-through

Parallel park reverse S-curves are tighter / closer, and reversing cars hold instead of driving through traffic on the path.

- Higher base sweep (`52°`, min `38°`), less stage overrun, slightly snugger lateral, slower reverse speed — more curved, less “straight back into the stall.”
- `parkReverseBlockedBy` + hold in `updateParkingMotion`: if the next reverse pose would OBB-overlap another (non-parked) car, speed goes to 0 until clear (or the parking timeout aborts).
- Fixed a stuck-forever regression: the block above used to freeze on *any* overlap with no priority rule, so two overlapping cars could both sit dead with nothing resolving it. `parkReverseBlockedBy` now uses the same `hardSafetyLoser` winner/loser rule as normal traffic — only the loser stops, the winner keeps reversing clear.
- Parking yield no longer depends on the global active-parker counter being correct. Followers scan nearby staging/reversing cars directly, hold a wider "blocked lane" zone around the stage point, and force an OBB safety check once a parking-yield target is detected.
- Driver-head sensors now have a hard **critical zone**: any car occupying the forward lane-sized sensor box forces `Sensor stop` / `Sensor yield`, even if normal route/parking hierarchy missed it. Batch fast-forward uses the same critical head check.



## 4.4.13 — Don't yield for cars 2+ deep in a conflict queue

Junction yield no longer latches onto a conflicting car that is queued **behind** another car on the same approach. Only the front conflict peer per approach matters; deeper cars are the intervening lead's problem.

- Shared helpers: `conflictPeerApproachKey`, `conflictPeerFrontScore`, `frontConflictPeers`.
- Wired into signed `conflictingThreat`, unsignalized first-arrival, `junctionCoastClear`, `rorCoastClear`, and intersection clearance `conflictHit`.
- Same-lane following (`trafficConstraintFor`) unchanged. All-way stop seniority still applies among **front** cars on different approaches.



## 4.4.14 — Don't yield for parking cars behind you

Cars no longer soft-yield / sensor-hold for a staging or reversing parker whose **body is already behind** them. Stage-point ghosts in the travel lane must not freeze a car that has already passed the parking vehicle.

- Helpers: `isParkerBodyBehind`, `shouldYieldForParker`.
- Applied in `parkingYieldConstraintFor`, `findNearestObstruction` stage hold, `scanDriverHead`, and peripheral caution.



## 4.4.15 — Stop closer at stop signs / stop lines

Cars were holding too far back from junctions. `STOP_LINE_GAP` reduced `9.5 → 4.5` (rear-axle distance before turn entry) so stop signs, yield lines, and red lights stop nearer the stub / stop line.



## 4.4.16 — Car debug overlay redesign

Car inspect / follow panel is clearer and less noisy.

- Summary first: status hero, 2×2 speed/target/ETA/left metrics, action tags always visible.
- Debug details (Sensors / Lane change / Parking) sit in collapsible dropdowns with a one-line brief on the closed header.
- Active sections highlight and auto-open when relevant; open/closed state persists in `localStorage`.
- Panel is clickable for dropdowns; slightly wider with cleaner spacing.



## 4.4.17 — Debug gap hold bar

With Debug On, the selected/hovered car shows the clearance it is trying to keep — only in those scenarios:

- **Following** — orange/red bar ahead of the nose ending at `DETECT_FOLLOW_GAP`, plus a dashed mark at the actual lead bumper.
- **Stop / yield / signal / intersection hold** — corridor + cross-line on the road at the stop/hold point (`stop` / `yield` / `hold` label).

Hidden when cruising with no lead and no junction constraint.



## 4.4.18 — Why is it doing this?

Car overlay gains a **Why is it doing this?** button (works with or without Debug rings).

- Live verdict: which speed caps are binding (often why a car is stopped).
- Facts: speed→target, distance to turn entry, stop-line gap + remaining stopDist (alerts if stopped far from the line), sign phase, lead gap, yield targets, hard safety, parking hold.
- Full constraint list with each cap’s desired speed + status; binding rows highlighted.

Use this to debug early stops at stop signs — if stopDist is still large but Traffic/lead or another cap is binding at 0, that is the real reason.



## 4.4.19 — Stop-sign early freeze

Stop-sign approach used `desired = min(speed, 4)` when still outside the braking envelope for the line. A car that was already at 0 (or got stopped) would stay frozen mid-block 20–30u before the sign while Why showed **Stop / yield sign @ 0**.

Far-from-line approach now returns `null` (keep cruising) until `stopConstraint` actually needs to brake for the stop line.



## update me after each read thank you, bye [exp: 1.1.n+1 (foldername)]
