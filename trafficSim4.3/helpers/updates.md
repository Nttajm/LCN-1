## 4.3.1 — Canvas 2D renderer

Switched the whole sim from SVG DOM drawing to a single HTML5 **Canvas 2D** full-frame redraw for performance (SVG element thrash was making the game laggy).

- `<svg id="canvas">` → `<canvas id="canvas">`; one `renderFrame()` paints roads, junctions, signs, signals, zones, parking, ghosts, cars, debug, and ref-overlay chrome each tick.
- Entities keep plain data only (no per-shape DOM nodes). Pan/zoom uses `ctx.setTransform` with the same `view` math as before.
- Interactions that used to rely on SVG hit targets (junction drag, approach handles, lane nodes, signal heads) now use geometric hit-tests on the board.
- No intentional gameplay/feature changes — rendering backend only.
