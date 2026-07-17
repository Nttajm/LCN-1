# Crossshare — App Explanation for AI Assistants

> **Purpose of this document:** Give other AI models enough context to work on `crossshare/` without re-exploring the codebase. Read this before making changes.

---

## What Crossshare Is

**Crossshare** is a browser-based, **local-first** media presentation and streaming tool. It is modeled after **Adobe Premiere Pro** (dark Spectrum-style desktop UI) and is intended for building timed slideshows / video compositions and outputting them to one or more **streams** that can be viewed in a separate **viewer** window.

Think of it as a lightweight NLE (non-linear editor) for presentations:

- Import images, video, and audio into a project media library
- Arrange media and nested presentations on a timeline-like **Content Editor**
- Preview output in a **Program** monitor (live vs. preview modes)
- Open a standalone **Viewer** (`v/index.html`) that plays the same presentation in real time, synced with the manager

**Current state:** The app runs entirely in the browser. Project metadata lives in `localStorage`; binary media lives in `IndexedDB`. There is **no server sync, no cloud upload, and no Firebase integration in the running app yet** — though `js/firebase.js` and `firebase.rules` exist in the folder for future LCN-apps work.

---



## Pages & Entry Points


| File                                               | Role                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app.html`                                         | **Home / launcher.** Lists recent streams from `localStorage`, lets user create a new stream project.        |
| `manager.html?proj=<name>`                         | **Main workspace.** Premiere-style dockable panel UI for editing streams, media, and presentations.          |
| `v/index.html?project=<id|name>&stream=<streamId>` | **Standalone viewer.** Renders the selected stream's presentation full-screen.                               |
| `js/presentation-engine.js`                        | **Shared rendering engine.** Timeline math, layer resolution, DOM renderer. Used by both manager and viewer. |
| `adobe-design-patterns.md`                         | **UI design spec.** Adobe Spectrum dark tokens and layout rules — follow this for any UI work.               |




### Typical user flow

1. Open `app.html` → click **New Stream** → name project (optional 4-digit PIN, optional custom "no content" placeholder image).
2. Redirected to `manager.html?proj=<name>`.
3. Import media → drag assets into **Content Editor** → play/preview in **Program**.
4. Open **Viewer** link from the Streams table → `v/index.html` plays the same output in another tab/window.

---



## Core Concepts & Terminology



### Project (aka "Stream instance")

A **project** is one Crossshare workspace, stored as an object in the `crossshare_streams` localStorage array. The UI often calls it a "stream" on the home screen, but in the manager it is the full project containing multiple **project streams**, media, and presentations.

Created in `app.html` with this shape (simplified):

```js
{
  id: "<uuid>",
  name: "My Show",
  pin: null | "1234",           // optional 4-digit PIN (stored locally; not enforced yet in viewer)
  created: "<ISO date>",
  managerLink: "manager.html?proj=My%20Show",
  customEmptyImage: false,      // true if user uploaded a custom placeholder
  instanceGroups: [
    { id: "default", name: "Default", theme: "blue" }
  ],
  projectStreams: [ /* see below */ ],
  presentations: [ /* see below */ ],
  media: { folders: [], items: [], ui: { view, scale, currentFolderId, filter } }
}
```



### Project stream (output channel)

Each project can have **multiple output streams** (e.g. "Main Stream", "Lobby Display"). Each stream has its own aspect ratio, instance group, optional access code flag, and **one linked presentation**.

```js
{
  id: "main",
  name: "Main Stream",
  instanceGroup: "Default",
  aspectRatio: { preset: "16:9", width: 16, height: 9 },
  requireCode: false,
  content: false,               // true once a presentation is linked
  presentationId: null,       // set when first content is added
  instances: 0                  // viewer instance counter (reserved for future use)
}
```

- `ensureStreamPresentation(stream)` auto-creates a top-level presentation when content is first dropped in.
- Viewer URL: `v/index.html?project=<projectId>&stream=<streamId>`



### Instance groups

**Instance groups** are labeled buckets (with Adobe-style color themes) used to organize which streams belong together. They are stored on the project as `instanceGroups[]`. Legacy per-project theme data may still exist under `crossshare_instance_group_themes:<projName>` in localStorage but is migrated into the project object on load.

### Presentation

A **presentation** is a composable timeline of **items**. Presentations can be nested (a presentation item references another presentation by ID).

```js
{
  id: "<uuid>",
  name: "Main Stream Presentation",
  streamId: "<streamId>" | null,
  topLevel: true,
  created: "<ISO date>",
  timebase: 30,
  color: "blue",                // Adobe label color
  viewZoom: 100,                // 10–400, scales child layout
  items: [ /* presentation items */ ]
}
```



### Presentation item

Items are normalized by `CrosssharePresentationEngine.normalizeItem()`:

```js
{
  id: "<uuid>",
  type: "media" | "presentation",
  mediaId: "<id>" | null,
  presentationId: "<id>" | null,
  name: "Clip name",
  start: 0,                     // seconds offset on parent timeline
  duration: 5,                  // seconds (images default 5s)
  loop: false,
  loopCount: 1,                 // 0 = infinite loops
  visible: true,
  z: 0,                         // stacking order
  x: 50, y: 50,                 // center position (% of frame)
  scaleX: 100, scaleY: 100,     // size (% of frame)
  rotation: 0,
  opacity: 100,
  fit: "contain" | "cover" | "stretch" | "original",
  trimIn: 0,
  trimOut: null,
  transition: { type: "fade"|"crossfade"|"fadeblack", duration: 1 } | null,
  transitionOut: { ... } | null
}
```

**Timeline rules (engine):**

- Parent duration = max of `(item.start + itemSpan)` across all items.
- `itemSpan` = `unitDuration * loopCount` (or `Infinity` for infinite loop).
- Nested presentations recurse up to `MAX_RENDER_DEPTH` (8); cycles are detected and blocked.
- Transitions affect opacity at item in/out boundaries.



### Media item

Media metadata is stored in `project.media.items[]`; the actual file bytes are in IndexedDB.

```js
{
  id: "<uuid>",
  name: "photo.jpg",
  kind: "image" | "video" | "audio" | "other",
  folderId: null | "<folderId>",
  color: "blue",
  sizeBytes: 12345,
  duration: null | 12.5,        // video/audio
  frameRate: null | 30,
  width: null, height: null,    // images/video
  created: "<ISO date>"
}
```

---



## Storage Architecture



### localStorage keys


| Key                                           | Contents                                                            |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `crossshare_streams`                          | JSON array of all project objects (metadata only, no blobs).        |
| `crossshare_manager_layout:<projName>`        | Dockable panel split-tree layout for the manager workspace.         |
| `crossshare_presentation_signal:<projectId>`  | Timestamp bumped on presentation edits — triggers cross-tab reload. |
| `crossshare_instance_group_themes:<projName>` | **Legacy** — migrated into `project.instanceGroups`.                |




### IndexedDB


| Database                 | Store   | Key format                  | Contents                              |
| ------------------------ | ------- | --------------------------- | ------------------------------------- |
| `crossshare_media_blobs` | `blobs` | `<projectId>:<mediaItemId>` | Raw `Blob` for imported media         |
| `crossshare_media_blobs` | `blobs` | `<projectId>:empty:project` | Custom "no content" placeholder image |


**Important:** Data is **per-browser, per-origin**. Clearing site data wipes projects. The viewer only works if the same browser has the project in localStorage/IndexedDB.

---



## Presentation Engine (`js/presentation-engine.js`)

Exported as `window.CrosssharePresentationEngine`. Key API:


| Function                                           | Purpose                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `normalizeItem(item)`                              | Canonical item shape                                                             |
| `defaultItemFromSource(source, createId)`          | Build item from media or presentation drag payload                               |
| `presentationDuration(project, presentation)`      | Total timeline length in seconds                                                 |
| `itemPlayback(project, item, playhead, stack)`     | Whether/where an item is active at `playhead`                                    |
| `resolveLayers(project, presentationId, playhead)` | Flat sorted render layers with opacity, mediaTime, zPath                         |
| `createDomRenderer({ stage, resolveUrl })`         | Returns `{ render, destroy }` — builds `<img>` / `<video>` layers in a stage div |


**Renderer behavior:**

- Layers positioned with CSS `left/top/width/height` as percentages, centered via `translate(-50%, -50%)`.
- Video elements are always muted; playhead drives `currentTime`.
- `resolveUrl(mediaId)` is injected by caller — manager and viewer both resolve via IndexedDB blobs.

---



## Manager Workspace (`manager.html`)

Single large HTML file (~7300 lines): inline CSS + inline JS IIFE. No build step, no framework.

### Panel system

Six logical panels, arranged in a resizable split-tree (Premiere-style docking):


| Panel ID | Title      | Tabs / Role                                           |
| -------- | ---------- | ----------------------------------------------------- |
| 1        | Window 1   | **Streams**, **Instances**, **Groups**, **Preview**   |
| 2        | Window 2   | **Program** — live/preview output monitors            |
| 3        | Window 3   | **Media**, **Effects**                                |
| 4        | Window 4   | **Content Editor** — timeline + item cards            |
| 5        | Tools      | Slim tool rail (cursor, preview toggle, etc.)         |
| 6        | Properties | **Properties** (item), **Presentation** (composition) |


- Layout persisted per project in `crossshare_manager_layout:<projName>`.
- Panels can be re-docked by dragging (split tree mutations in JS).
- Default layout: Streams+Program top row; Media+Tools+Content Editor bottom row; Properties sidebar.



### Key manager features

**Media browser**

- Import files (image/video/audio), organize in bins (folders).
- List and gallery views; presentations appear as assets at project root.
- Drag to Content Editor using `application/x-crossshare-asset` MIME payload.

**Content Editor**

- Vertical stack of presentation item cards with drag-reorder.
- Drop slots between cards accept effects (`application/x-crossshare-effect`).
- Transport controls: play/pause, restart, scrubber timeline.
- Context menu: move up/down, set label color, remove transitions.

**Program monitor**

- **Live mode:** renders the editable presentation from `match` (active project).
- **Preview mode:** maintains a separate `liveStatesByStream[streamId].snapshot` clone; Program shows side-by-side or toggled live vs. preview with sync buttons ("Preview → Live", "Live → Preview").

**Effects panel**

- `fade`, `crossfade`, `fadeblack` — dragged between items to set `transition` / `transitionOut`.

**Streams table**

- Lists all `projectStreams` with status, instance count, group badge, and **Open viewer** link.



### URL parameter

- `?proj=<projectName>` — selects project by **name** (not ID). Last matching name wins if duplicates exist.

---



## Viewer (`v/index.html`)

Minimal **full**-screen player:

1. Loads project from `crossshare_streams` by `?project=` (matches `id` or `name`).
2. Selects stream via `?stream=` (defaults to first stream).
3. Creates `CrosssharePresentationEngine.createDomRenderer` on a fitted 16:9 (or custom ratio) frame.
4. `requestAnimationFrame` loop advances playhead, wraps at presentation duration.



### Cross-window sync


| Mechanism                                                                    | What it syncs                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `BroadcastChannel('crossshare-presentations:<projectId>')`                   | Playback position, play/pause, presentation structure changes |
| `storage` event on `crossshare_streams` / `crossshare_presentation_signal:*` | Project data reload in viewer                                 |


Message shapes:

```js
{ type: "playback-change", projectId, time, playing }
{ type: "presentation-change", projectId, time, playing }
```

---



## Home Screen (`app.html`)

- Shows recent projects sorted by `created`.
- **New Stream** modal: name → optional PIN (4 digits) → optional custom empty-state image.
- **Connect** button exists but is not wired up yet.
- On create, appends to `crossshare_streams` and navigates to `manager.html?proj=<name>`.

---



## Design System

All UI should follow `adobe-design-patterns.md`:

- Dark Spectrum palette (`#232323` panels, `#2b2b2b` chrome, `#1473E6` accent).
- Dense, flat, modular panels with 1px gutters.
- Segoe UI / system sans-serif, 13px body.
- Label colors match Adobe's 12-color theme set (`ADOBE_THEME_COLORS` in manager).

**Do not** introduce purple gradients, large rounded cards, or SaaS-dashboard aesthetics.

---



## Firebase (present but not wired)


| File             | Status                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `js/firebase.js` | Firebase app init for project `lcn-apps` — **not imported** by any HTML page.                                                 |
| `firebase.rules` | Firestore rules for unrelated LCN features (`commcals`, `xmen_admins`, `users`, etc.) — **not used by Crossshare** currently. |


When adding cloud features, prefer keeping the local-first path working and treat Firebase as an optional sync layer.

---



## Drag-and-Drop MIME Types


| MIME type                              | Payload                                | Used in                     |
| -------------------------------------- | -------------------------------------- | --------------------------- |
| `application/x-crossshare-asset`       | `{ id, kind: "media"|"presentation" }` | Media → Content Editor      |
| `application/x-crossshare-editor-item` | `<itemId>`                             | Reorder items in editor     |
| `application/x-crossshare-effect`      | `{ effectId }`                         | Effects → editor drop slots |


---



## Incomplete / Planned Features

These UI elements exist but are not fully implemented:

- **Connect** on home screen (remote connection).
- **PIN authentication** — stored on project but not enforced in viewer/manager.
- `requireCode` per stream — flag exists, no gate yet.
- `instances` **counter** on streams — displayed, not incremented.
- **Search** on home top bar — decorative only.
- **Filter** on recent table — input is `readonly`.
- Cloud sync / multi-device access.

When implementing these, preserve backward compatibility with existing `localStorage` project shapes (use migration helpers like `ensureProjectStreams`, `migrateLegacyGroupThemes`).

---



## File Map

```
crossshare/
├── app.html                  # Home / project launcher
├── manager.html              # Main editor workspace (panels, media, editor)
├── v/
│   └── index.html            # Standalone presentation viewer
├── js/
│   ├── presentation-engine.js   # Timeline + DOM renderer (shared)
│   └── firebase.js                # Unused Firebase init stub
├── firebase.rules            # Firestore rules (not used by Crossshare yet)
├── adobe-design-patterns.md    # UI design tokens & rules
├── appexp.md                 # This file
├── logos/
│   └── crossshare-logo.png
└── i/
    └── ncl.png               # Default "no content" placeholder
```

---



## Conventions for AI Contributors

1. **No build tooling** — vanilla HTML/CSS/JS only. Keep JS in IIFEs or the presentation engine module pattern.
2. **Minimize scope** — `manager.html` is monolithic; make surgical edits, match existing naming and patterns.
3. **Always normalize items** through `Engine.normalizeItem()` before timeline math.
4. **Persist correctly** — metadata changes go through `saveActiveProject()` → `saveStreams()`; blobs through `putMediaBlob()`.
5. **Notify on edits** — call `notifyPresentationChanged()` after presentation mutations so viewer/preview stay in sync.
6. **Clean up panel renderers** — use `body.__crossshareCleanup` pattern when panels set up RAF loops or ResizeObservers.
7. **Follow Adobe design patterns** for any new UI.
8. **Test locally** by opening `app.html` in a browser (or a static server). Same-origin required for IndexedDB and BroadcastChannel.

---



## Mental Model (one paragraph)

Crossshare is a **local Premiere-like presentation builder**: projects live in `localStorage`, media blobs in IndexedDB, and a shared **presentation engine** turns hierarchical timelines into layered DOM video/image output. The **manager** edits content across dockable panels; the **viewer** plays the same presentation in another window, kept in sync via `BroadcastChannel` and `localStorage` signals. It is intentionally offline-first, single-browser, and UI-polished to Adobe Spectrum dark standards.