# Adobe Design Patterns (Spectrum / Premiere-style)

> **How to use this file:** Paste this entire document into a UI prompt (or `@` it in Cursor). Instruct the model: *“Build the UI using ONLY these Adobe design patterns. Match Premiere Pro / Spectrum dark desktop UI. Do not invent a different dark theme.”*

This document describes how to recreate and keep the look of Adobe creative apps (Premiere Pro home, workspace panels, dialogs). Source reference: Adobe Spectrum dark desktop UI.

---

## 1. Design philosophy (non-negotiable)

1. **Professional dark desktop app**, not a marketing site, not a “modern SaaS dashboard.”
2. **One accent only:** Spectrum blue `#1473E6`. No purple glows, no gradients on chrome, no neon.
3. **Hierarchy = brightness**, not bold weights or big type. White = primary, gray = secondary/inactive.
4. **Flat, dense, modular.** Panels are docked rectangles separated by 1px gutters. Almost no shadows.
5. **Geometry is mostly sharp.** Radius is tiny (0–4px) except home-screen pill buttons (fully rounded).
6. **Icons are thin monoline strokes**, light gray by default, blue when active.
7. **Empty states** = centered muted gray sentence (“Import media to start”), not illustrations or cards.
8. **Windows OS chrome** on modals may keep a light system title bar; the *content* stays dark Spectrum.



### Anti-patterns (never do)

- Purple / indigo gradient themes, glassmorphism, multi-layer drop shadows
- Large rounded cards, pill chip clusters, colorful badges on panels
- Inter/Roboto as the “hero” look with big display headlines
- Flat single `#000` with no panel depth, or overly light gray backgrounds
- Thick borders, 8–16px corner radius on panels
- Colored icons (except the product logo tile and the single blue accent)

---



## 2. Color tokens (exact palette)

Use CSS variables. Keep these values stable across screens.

```css
:root {
  /* Surfaces (dark → lighter = raised) */
  --ad-bg-app:        #1a1a1a; /* deepest app / list body */
  --ad-bg-panel:      #232323; /* main panel fill */
  --ad-bg-chrome:     #2b2b2b; /* top bar, tab bars, toolbars */
  --ad-bg-elevated:   #323232; /* selection fill, hover wells */
  --ad-bg-input:      #1a1a1a; /* inputs / dropdowns (inset) */
  --ad-bg-dialog:     #2d2d2d; /* modal body */

  /* Borders & dividers */
  --ad-border:        #323232; /* panel gutters, row rules */
  --ad-border-strong: #454545; /* fieldset / input borders */
  --ad-border-focus:  #1473E6; /* active panel outline */

  /* Text */
  --ad-text:          #e1e1e1; /* primary labels, active tabs */
  --ad-text-secondary:#959595; /* inactive tabs, metadata */
  --ad-text-muted:    #6d6d6d; /* empty states, disabled */
  --ad-text-bright:   #ffffff; /* high-emphasis names / CTAs */

  /* Accent (single) */
  --ad-accent:        #1473E6;
  --ad-accent-sel:    #0d66d0; /* text selection / strong focus */

  /* Icons */
  --ad-icon:          #b3b3b3;
  --ad-icon-active:   #1473E6;
}
```

**Surface stacking rule:** app chrome `#2b2b2b` sits on panels `#232323` sits on deepest list/body `#1a1a1a`. Never invert this.

---



## 3. Typography


| Role                          | Size    | Weight  | Color                                                | Notes                                |
| ----------------------------- | ------- | ------- | ---------------------------------------------------- | ------------------------------------ |
| Section title (Home “Recent”) | 22–24px | 400–500 | `--ad-text-bright`                                   | Rare large type; home only           |
| Workspace / panel tab         | 11–12px | 400     | active: `--ad-text`, inactive: `--ad-text-secondary` | Sentence case                        |
| Body / list row name          | 13–14px | 400     | `--ad-text-bright`                                   |                                      |
| Metadata (date, size, kind)   | 12–13px | 400     | `--ad-text-secondary`                                |                                      |
| Table column headers          | 10–11px | 500–600 | `--ad-text-secondary`                                | **ALL CAPS**, letter-spacing ~0.04em |
| Fieldset legend               | 11–12px | 400     | `--ad-text-secondary`                                | Sits on border                       |
| Form labels                   | 11–12px | 400     | `--ad-text-secondary`                                | Often right-aligned to a gutter      |
| Timecode / mono values        | 13–16px | 500     | `--ad-text`                                          | Monospace or tabular nums            |
| Empty state                   | 12–13px | 400     | `--ad-text-muted`                                    | Centered                             |


**Font stack (Adobe Clean substitutes):**

```css
font-family: "Segoe UI", "Adobe Clean", -apple-system, BlinkMacSystemFont,
  "Helvetica Neue", Arial, sans-serif;
```

Do **not** use display serifs, Inter as a brand look, or oversized hero headlines inside the app chrome.

---



## 4. Spacing, density, radius


| Token                         | Value     | Use                            |
| ----------------------------- | --------- | ------------------------------ |
| Panel gutter                  | 1px       | Dividers between docked panels |
| Panel padding                 | 8–12px    | Header / toolbar padding       |
| Form section padding          | 12–16px   | Inside fieldsets               |
| Form row gap                  | 6–10px    | Tight vertical rhythm          |
| Home sidebar width            | ~200px    | Nav + CTAs                     |
| Home content margin           | ~32–40px  | Breathable list area           |
| Icon hit area                 | 24–28px   | Tools / utility icons          |
| Border radius (panels)        | **0px**   | Workspace panels are square    |
| Border radius (inputs)        | 2–3px     | Fields, small buttons          |
| Border radius (nav selection) | 4px       | Sidebar “Home” well            |
| Border radius (pill CTA)      | **999px** | Home “New Project…” only       |
| Dialog button radius          | 12–999px  | Soft capsule OK/Cancel         |


**Density:** Workspace UI is compact. Home screen is slightly airier. Never add card gaps / 24px grids like a website.

---



## 5. Layout patterns



### A. Home / Start screen

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]                                      [search]    │  top bar ~40–44px, --ad-bg-chrome
├──────────────┬──────────────────────────────────────────┤
│ Home (sel)   │  Recent                    Filter _____  │
│              │  NAME   RECENT   SIZE   KIND             │
│ [New Proj…]  │  row ─────────────────────────────────── │
│ [Open Proj…] │  row ─────────────────────────────────── │
│              │  row ─────────────────────────────────── │
└──────────────┴──────────────────────────────────────────┘
```

Rules:

- Left sidebar: nav item with **filled** `--ad-bg-elevated` **rounded rect** when active.
- Primary actions: **ghost pill buttons** — transparent fill, **1px white/light border**, white text, full pill radius.
- Main area title “Recent” large; filter is **underline-only** (no boxed search).
- File table: thin `#323232` row dividers; no zebra stripes; no card wrappers.
- Sortable header shows a small ▾ next to the active column.



### B. Editing workspace (docked panels)

```
┌─ workspace tabs: Learning | Assembly | Editing | Color | Effects | Audio ─┐
├───────────────┬────────────────────────┬───┬─────────────────────┬──────┤
│ Source / tabs │ Effect Controls / tabs │ T │ Timeline (focused)  │ meters│
│               │                        │ o │                     │      │
├───────────────┴────────────────────────┤ o ├─────────────────────┤      │
│ Project / Media Browser                │ l │                     │      │
│ (bottom: search, new bin, new, delete) │ s │                     │      │
└────────────────────────────────────────┴───┴─────────────────────┴──────┘
```

Rules:

- **1px gutters** between panels (`--ad-border`).
- **Focused panel:** 1px outline `--ad-accent` around the whole panel group.
- Each panel group has a **tab row** + optional hamburger menu on the right.
- Active tab: brighter text + **2px blue underline** under the label (not a filled pill).
- Active workspace name in top bar: blue text + optional hamburger.
- Vertical tool strip between Project and Timeline: narrow, icon-only; active tool = blue icon on slightly darker square.



### C. Settings / New Project dialog

```
┌ New Project ──────────────────────────────────── [X] ┐  ← OS title bar may be light
│ Name: [____________]   Location: [path] [Browse…]   │
│ General | Scratch Disks | Ingest Settings           │  tabs + underline
│ ┌ Video Rendering and Playback ───────────────────┐ │  fieldset: legend ON border
│ │ Renderer:        [ dropdown              ▾ ]    │ │
│ │ Preview Cache:   [ disabled dropdown     ▾ ]    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌ Video ──────────────────────────────────────────┐ │
│ │ Display Format:  [ dropdown              ▾ ]    │ │
│ └─────────────────────────────────────────────────┘ │
│                              [ OK ]  [ Cancel ]     │  bottom-right capsules
└─────────────────────────────────────────────────────┘
```

Rules:

- Group boxes = thin `--ad-border-strong` rectangle; **legend text interrupts the top border** (classic fieldset).
- Labels left (often right-aligned to a column); controls fill remaining width.
- Disabled controls at ~50% opacity / muted text.
- Focused text selection uses Spectrum blue highlight.
- Footer actions right-aligned; secondary outline/capsule style (not bright filled primary unless needed).

---



## 6. Component recipes



### Top bar

- Height 40–44px, background `--ad-bg-chrome`, bottom border 1px `#1a1a1a` or `--ad-border`.
- Left: product logo tile (~28–34px, rounded 4–5px) + optional name.
- Right: thin-stroke search icon button, no fill.



### Sidebar nav item

```css
.nav-item { padding: 6px 12px; border-radius: 4px; color: var(--ad-text); }
.nav-item.active { background: var(--ad-bg-elevated); }
```



### Ghost pill button (Home CTAs)

```css
.btn-pill {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 18px; border-radius: 999px;
  border: 1px solid #fff; background: transparent;
  color: #fff; font-size: 13px; cursor: pointer;
}
.btn-pill:hover { background: rgba(255,255,255,0.06); }
```



### Panel + focus ring

```css
.panel {
  background: var(--ad-bg-panel);
  border: 1px solid var(--ad-border);
}
.panel.is-focused {
  outline: 1px solid var(--ad-accent);
  outline-offset: -1px;
}
```



### Tabs (panel / dialog)

```css
.tabs { display: flex; gap: 16px; border-bottom: 1px solid var(--ad-border); }
.tab { padding: 8px 2px; color: var(--ad-text-secondary); font-size: 12px; }
.tab.active {
  color: var(--ad-text);
  box-shadow: inset 0 -2px 0 var(--ad-accent); /* blue underline */
}
```



### Data table (Recent files)

- Header row: ALL CAPS, small, secondary color.
- Body: name bright; other columns secondary.
- Separators: `border-bottom: 1px solid var(--ad-border)`.
- Hover row: subtle `--ad-bg-elevated` or slight lighten — no blue fill unless selected.
- Selected row (if needed): soft blue wash at low opacity, or elevated gray — stay restrained.



### Underline filter (Home)

```css
.filter-input {
  background: transparent; border: none;
  border-bottom: 1px solid var(--ad-border-strong);
  color: var(--ad-text); padding: 4px 0; min-width: 180px;
}
.filter-input::placeholder { color: var(--ad-text-muted); }
```



### Inputs & selects (dialogs)

```css
.input, .select {
  background: var(--ad-bg-input);
  border: 1px solid var(--ad-border-strong);
  border-radius: 2px;
  color: var(--ad-text);
  padding: 4px 8px; height: 28px; font-size: 12px;
}
.input:focus, .select:focus {
  outline: 1px solid var(--ad-accent);
  border-color: var(--ad-accent);
}
```



### Fieldset with legend on border

```css
.fieldset {
  border: 1px solid var(--ad-border-strong);
  padding: 12px 14px 14px;
  margin: 12px 0;
}
.fieldset legend {
  padding: 0 6px; margin-left: 8px;
  color: var(--ad-text-secondary); font-size: 11px;
}
```



### Vertical tool strip

- Width ~28–36px, background `--ad-bg-chrome`.
- Icons ~16px, color `--ad-icon`.
- Active: `--ad-icon-active` on `#1f1f1f` / darker square.
- Flyout affordance: tiny triangle at bottom-right of icon cell.



### Panel utility bar (bottom of Project panel)

- Row of small gray icons: search, new folder/bin, new item, delete.
- No labels; generous hit padding; left-aligned.



### Dialog footer buttons

```css
.btn-dialog {
  min-width: 72px; height: 28px; padding: 0 16px;
  border-radius: 14px;
  background: #3a3a3a;
  border: 1px solid #6a6a6a;
  color: var(--ad-text);
  font-size: 12px;
}
```

---



## 7. Iconography rules

- Stroke icons, 1.5–2px optical weight, no fill except when “active” (then blue fill/stroke).
- Default color `#B3B3B3`; hover slightly brighter; active `#1473E6`.
- No emoji. No duotone. No colored product icons inside toolbars.
- Product logo is the **only** colorful square (brand tile).

---



## 8. Interaction & state map


| State           | Treatment                                                  |
| --------------- | ---------------------------------------------------------- |
| Hover (row/nav) | Background → `--ad-bg-elevated` or +4% lightness           |
| Active nav      | Filled elevated well, brighter text                        |
| Active tab      | Bright text + 2px blue underline                           |
| Focused panel   | 1px blue outline on panel group                            |
| Active tool     | Blue icon                                                  |
| Disabled        | ~40–50% opacity, non-interactive                           |
| Empty           | Centered `--ad-text-muted` sentence                        |
| Focus input     | Blue border / outline; selection highlight blue            |
| Drag target     | Same empty copy; optional dashed inner hint — keep minimal |


No bounce animations. Transitions ≤150ms opacity/background only.

---



## 9. CSS starter (drop into new HTML)

```css
:root {
  --ad-bg-app: #1a1a1a;
  --ad-bg-panel: #232323;
  --ad-bg-chrome: #2b2b2b;
  --ad-bg-elevated: #323232;
  --ad-bg-input: #1a1a1a;
  --ad-bg-dialog: #2d2d2d;
  --ad-border: #323232;
  --ad-border-strong: #454545;
  --ad-accent: #1473E6;
  --ad-text: #e1e1e1;
  --ad-text-secondary: #959595;
  --ad-text-muted: #6d6d6d;
  --ad-text-bright: #ffffff;
  --ad-icon: #b3b3b3;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: "Segoe UI", "Adobe Clean", -apple-system, BlinkMacSystemFont,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  background: var(--ad-bg-panel);
  color: var(--ad-text);
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; }
```

---



## 10. Prompt checklist (paste under your feature request)

When generating UI, require:

- [ ] Uses the color tokens above (no new accent colors)
- [ ] Dark Spectrum panels with 1px gutters
- [ ] Blue only for focus / active tab underline / active tool
- [ ] Tabs = underline, not pills
- [ ] Home CTAs = white ghost pills
- [ ] Tables = caps headers + hairline row dividers
- [ ] Dialogs = fieldsets with legend on border
- [ ] Icons = monoline gray; blue when active
- [ ] No cards, no shadows, no purple, no large radius on panels
- [ ] Dense workspace OR airy home — match the screen type

**Example prompt opener:**

```text
Build [feature] as an Adobe Premiere / Spectrum dark desktop UI.
Follow adobe-design-patterns.md strictly: tokens, panels, tabs, buttons, forms.
Match the screenshots of Premiere home, workspace, and New Project dialog.
Do not redesign; clone the Adobe chrome language.
```

---



## 11. Screen-type cheat sheet


| Screen        | Key look                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| **Home**      | Sidebar + ghost pills + “Recent” table + underline filter; airier            |
| **Workspace** | Docked panels, blue focus ring, tab underlines, tool strip, empty muted copy |
| **Dialog**    | Dark body, tab underline, fieldset legends on borders, capsule OK/Cancel     |


Keep these three dialects consistent so every CrossShare (or other) surface feels like one Adobe family.

no exsive comments in code anywhere