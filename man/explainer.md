# dbnm Package Authoring Manual

**Audience:** humans or AIs building a foundation / base / remote dbnm module **from scratch**, without reading other source files.

**Goal:** after this document, you can create a complete working package (JS + optional CSS + optional ASCII), install it, register commands, persist state, show a first-run UI once, use tabs/choices, and match the CLI design language.

**Runtime assumed:** dbnm web shell already running (`index.html` + `base_com/ps_main.js` + `base_ps/css/utils.css`). Your file is loaded *into* that shell.

---

# Table of contents

1. [What dbnm is](#1-what-dbnm-is)
2. [Architecture & boot](#2-architecture--boot)
3. [Where files live](#3-where-files-live)
4. [Design language (base_ps CLI look)](#4-design-language-base_ps-cli-look)
5. [Global APIs available to your package](#5-global-apis-available-to-your-package)
6. [Print system (exact HTML contracts)](#6-print-system-exact-html-contracts)
7. [Command registration & argv](#7-command-registration--argv)
8. [Directories / shells (`cd`)](#8-directories--shells-cd)
9. [Local storage & `userData`](#9-local-storage--userdata)
10. [Installing & loading packages (`cmdUtil`)](#10-installing--loading-packages-cmdutil)
11. [PKG object & manifests](#11-pkg-object--manifests)
12. [CSS loading](#12-css-loading)
13. [ASCII banners & install choreography](#13-ascii-banners--install-choreography)
14. [First-run / setup — critical rules](#14-first-run--setup--critical-rules)
15. [Interactive dialogues (`_await`)](#15-interactive-dialogues-_await)
16. [CLI tabs (`renderCliTabs`)](#16-cli-tabs-renderclitabs)
17. [Flat choice lists](#17-flat-choice-lists)
18. [Databases & Firebase (optional)](#18-databases--firebase-optional)
19. [Help / home / status conventions](#19-help--home--status-conventions)
20. [Step-by-step: build a package from zero](#20-step-by-step-build-a-package-from-zero)
21. [Complete copy-paste template](#21-complete-copy-paste-template)
22. [Package CSS template](#22-package-css-template)
23. [ASCII art tips](#23-ascii-art-tips)
24. [Checklist & acceptance tests](#24-checklist--acceptance-tests)
25. [Pitfalls & anti-patterns](#25-pitfalls--anti-patterns)
26. [Glossary](#26-glossary)

---

# 1. What dbnm is

**dbnm** is a browser terminal / CLI UI:

- Black monospace screen
- Scrolling `#output` log
- Single prompt + text input at the bottom
- Commands registered in a global map
- Packages are JS files that call `_reg('name', handler)` when loaded
- User state lives in `localStorage` under one key: `dbnm_userData`

It is **not** Node. There is no `require`. Foundation/base packages load as `<script type="module">` but still use **global** functions from `ps_main.js` (`print`, `_reg`, `saveData`, …). Those globals exist because `ps_main.js` is a classic non-module script loaded first.

---

# 2. Architecture & boot

## Page structure (`index.html`)

```html
<link rel="stylesheet" href="base_ps/css/utils.css">
<div id="output"></div>
<div class="js_cont">
  <span class="prompt">&gt; $</span>
  <input type="text" class="js_input" id="input" autocomplete="off">
</div>
<script src="base_com/ps_main.js"></script>
```

## Boot order

1. `utils.css` styles the shell.
2. `ps_main.js` loads → builds `userData` from localStorage → registers built-in commands → binds Enter on `#input`.
3. `initialize_db()` runs → `renderUtils()` loads every package listed in `userData.cmdUtil`.
4. Each package script executes → your top-level code runs (`_reg`, CSS inject, optional boot setup).

## UI object

```js
db_ui = {
  input: document.getElementById('input'),
  output: document.getElementById('output'),
  loaders: []
}
```

Always write UI through helpers (`print`, `appendOutput`, …). Prefer not to invent a second output root.

## Command loop (simplified)

```
User presses Enter
  → u_print(command)           // echo
  → handleCommand(command)
       if cmd === 'cd..' → clearDirectory (+ optional cleanup hook)
       if directory set → rewrite to `${directory} ${cmd}`
       parse into cmd_split
       if !awaiting → commandHandlers[cmd_split[0]](args, cmd_split)
```

While `awaiting === true` (set by `_await`), **new commands are ignored**. Dialogues must call `unawait()` when finished.

---

# 3. Where files live

Assume web root is the `dbnm/` folder.

| Kind | Path on disk | Install command | Runtime script URL |
|------|--------------|-----------------|--------------------|
| Foundation | `dbnm/foundation/<name>.js` | `/ i f <name>` or `/ i foundation <name>` | `foundation/<name>.js` |
| Foundation assets | `dbnm/foundation/assets/<name>/…` | (bundled with package) | fetch/link as `foundation/assets/<name>/…` |
| Base module | `dbnm/public/base-modules/<name>.js` | `/ i ** <name>` or `/ i base <name>` | `public/base-modules/<name>.js` |
| Server util | `dbnm/servers/<name>.js` | `/ i **svr <name>` | `servers/<name>.js` |
| Remote URL | anywhere HTTPS | `/ i burl <url>` | that URL |
| Registry | Storage URL | `reg i <name>` | `downloadUrl` on util |

### Typical foundation package tree

```text
dbnm/foundation/
  notes.js
  assets/notes/
    ascii.txt
    notes.css
```

### Site-relative URLs your code must use

```text
foundation/notes.js
foundation/assets/notes/ascii.txt
foundation/assets/notes/notes.css
```

Manifest `files[].path` values are **package-relative for display** (e.g. `assets/notes/notes.css`), not the full fetch URL. The shell prefixes `foundation/` or `public/base-modules/` when showing `/ dir info`.

---

# 4. Design language (base_ps CLI look)

Match this visual language. Users recognize packages that “feel like dbnm.”

## Canvas

- Background: **black**
- Text: **white**, monospace, ~17px root
- Prompt accent: **teal** `rgb(81, 231, 211)` (`.prompt`)
- Selection highlight: **light blue bar** `rgb(101, 181, 255)` on black text (`.selected`)

## Semantic colors (use these class names in HTML strings)

| Class | RGB / value | Typical meaning |
|-------|-------------|-----------------|
| `light-blue` | `rgb(124, 182, 227)` | primary accent, commands, ids, links |
| `green` | `rgb(91, 202, 91)` | success, package name@version |
| `yellow` | `rgb(215, 179, 0)` | progress, warnings soft, sealed |
| `red` | `rgb(235, 57, 57)` | errors, danger, unbound |
| `coral` / `pink` | coral / pink | secondary accents |
| `muted-teal` | `#a3d9d1` | titles, soft labels |
| `muted-purple` | `#b3a3d9` | optional accent |
| `muted-rose` | `#d9a3b3` | optional accent |
| `muted-orange` | `#d5844d` | optional accent |
| `muted-yellow` | `#d9d9a3` | optional accent |
| `blue` | `rgb(64, 129, 204)` | rarer accent |

Also: `*-bg` variants exist (e.g. `green-bg`) — use sparingly; CLI prefers colored text, not filled pills.

## Typography utilities

| Class | Effect |
|-------|--------|
| `b` | bold |
| `u` | underline |
| `i` | italic |
| `g-3` | gap wrapper (print helpers already use this) |

## Dim / secondary text

Global utils do **not** define `.tx-dim` / `.db-dim` / `.reg-dim`. Packages invent a dim class in their own CSS:

```css
.notes-dim { color: #7a7a7a; }
```

Convention across packages: **dim ≈ `#7a7a7a`**, separators `─`, trees `├─` `└─` in yellow/tree color.

## Tips

`.tip-print` — smaller, gray, dotted bottom border. Always emit tips via `tip_print(...)` so the global **tips** setting can hide them (`display:none` on inner span when tips off).

## Layout patterns (CLI, not web marketing)

**Do:**

- Monospace trees and key/value rows
- Thin panels: `1px solid #333`, tiny radius (~2px), near-transparent fill
- Left accent banner stripe in light-blue
- Command names in `light-blue`, values in accent or white
- Separators: `────────────────────────────────`
- npm-ish install lines: `+ name@version`, `GET foundation/name`, `└─ name@version`

**Don’t:**

- Cards with heavy shadows, rounded-full pills, dashboards
- Purple gradient themes
- Dumping huge tables
- Overlays / floating badges on “hero” content

## Choice rows

```html
<div class="choices notes-choices">
  <div class="choice light-blue"> &gt; create <span class="notes-dim">open new</span></div>
  <div class="choice green selected"> &gt; join <span class="notes-dim">enter id</span></div>
</div>
```

Selected row uses global `.selected` (blue background, black text).

## CLI tabs (shared)

Classes in `utils.css`: `.cli-tabs`, `.cli-tab`, `.cli-tab.active`, `.cli-tabs-item`, `.cli-tabs-item.is-active`, `.focus-tabs`, `.focus-items`.

You do **not** style tabs yourself unless extending — call `renderCliTabs`.

## Package-scoped CSS prefix

Always prefix your classes: `.notes-…`, `.tx-…`, `.reg-…`, `.pak-…`. Never override `.prompt`, `body`, or `#input` globally.

---

# 5. Global APIs available to your package

These exist when your script runs (from `ps_main.js` or `window`):

### State

| Symbol | Role |
|--------|------|
| `userData` / `window.userData` | persisted app state object |
| `saveData()` / `window.saveData` | write `userData` → `localStorage['dbnm_userData']` |
| `dbnm_vars` / `window.dbnm_vars` | alias of `userData.vars` |
| `databases` / `window.databases` | database manager state |
| `directory` | current shell directory string or `null` |
| `awaiting` | true while a dialogue owns the input |
| `db_ui` | `{ input, output, loaders }` |
| `commandHandlers` | map of command → handler (prefer `_reg`, don’t mutate blindly) |

### Output

`print`, `g_print`, `e_print`, `y_print`, `warning`, `qestion`, `tip_print`, `c_print`, `u_print`, `c_placeholder`, `appendOutput`, `scrollOutputToBottom`, `makeLoader`

### Control

`_reg`, `_await`, `unawait`, `setDirectory`, `clearDirectory`, `registerPkgContents`, `renderCliTabs` / `cliTabs`

### Database helpers (when present)

`listDatabaseEntries`, `getActiveDatabase`, and related `database` commands — call only if `typeof listDatabaseEntries === 'function'`.

### Optional hooks you may define

```js
window.cleanupMyPkgOnCdUp = function () { /* tear down */ };
```

Note: `ps_main` currently auto-calls cleanup only for `directory === 'textos'`. For other packages, either document `leave`/`exit` or extend that hook pattern similarly.

---

# 6. Print system (exact HTML contracts)

All values may contain HTML. Escape user data first.

### `print(value)`

Normal line with directory prefix:

```html
<div class="g-3"><span class="print_out">db$</span> <span>YOUR HTML</span>
```

If `directory === 'notes'`, prefix is `notes$` instead of `db$`.

### `g_print(value)` — success

```html
<div class=" g-3 green"><span> YOUR HTML</span></div>
```

### `e_print(value)` — error

```html
<div class=" g-3 red"><span> YOUR HTML</span></div>
```

### `y_print(value)` — status / progress

```html
<div class=" g-3 yellow"><span> YOUR HTML</span></div>
```

### `warning(value)`

```html
<div class=" g-3">[<span class='red b'>!</span>] YOUR HTML</div>
```

### `qestion(value)` — prompt label (spelling intentional)

```html
<div class=" g-3">[<span class='light-blue b'>?</span>] YOUR HTML</div>
```

### `tip_print(value)`

```html
<div class="g-3 tip-print"><span>YOUR HTML</span></div>
<!-- if tips setting OFF: -->
<div class="g-3 tip-print"><span style="display:none">YOUR HTML</span></div>
```

Still appends to DOM when tips are off — just hidden. Prefer this over skipping the call.

### `c_print(value, customPrefix)`

```html
<div class=" g-3"><span>PREFIX</span> VALUE</div>
```

### `c_placeholder(text)`

Sets `#input` placeholder and focuses. Clear with `c_placeholder('')` when leaving dialogues.

### `makeLoader(0)` / `makeLoader('rm')`

Shows/removes animated 3×3 dot loader in output. Always pair: show before await, `'rm'` after.

### `appendOutput(html)`

Raw append to `#output` + scroll. Use for custom blocks without the `db$` prefix (or wrap yourself).

### Escaping helper (copy into every package)

```js
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
```

Never interpolate `roomId`, `username`, remote message bodies, etc. without escaping.

---

# 7. Command registration & argv

### Register

```js
_reg('notes', handleNotes);
_reg('n', handleNotes); // alias
```

Handler:

```js
async function handleNotes(args, cmd_split) {
  // cmd_split[0] = 'notes' (or alias)
  // cmd_split[1] = subcommand
  // cmd_split[2+] = args
  // args = array from parentheses form: notes (a, b) → ['a','b']
}
```

### Parsing quirks

- Commands are lowercased for lookup: `_reg('Notes')` → key `notes`.
- Inside a directory shell, user types `help` → rewritten to `notes help` before parse.
- Empty Enter prints a blank line.
- Unknown command → `e_print` with `Command not found`.

### Subcommand router pattern

```js
async function handleNotes(_, cmd_split) {
    ensureNotesShape();
    const action = (cmd_split[1] || '').toLowerCase();

    if (!action || action === 'home') { await notesHome(); return; }
    if (action === 'help' || action === 'h' || action === '?') { notesHelp(); return; }
    if (action === 'setup' || action === 'install') { await setupDialogue(); return; }
    if (action === 'status' || action === 'info') { notesStatus(); return; }
    // …
    e_print(`unknown: ${escapeHtml(action)}`);
    tip_print('notes help');
}
```

### Built-in shell commands (don’t collide)

Avoid registering over: `help`, `settings`, `cd`, `cd..`, `r`, `/`, `print`, `var`, `database`, `tabs`, `time`, `url`, `exit`, …

Your primary command name should be unique (`notes`, `textos`, `registry`, …).

---

# 8. Directories / shells (`cd`)

```text
cd notes     → prompt becomes "(notes): user $"
             → subsequent input prefixed with "notes "
cd..         → leave directory
```

Rules:

- `setDirectory(name)` **only succeeds if `name` is an already-registered command**.
- So `_reg('notes', …)` must run before `cd notes` works.
- Special: `r` (reload) and `/` are not directory-prefixed.

Prompt helpers:

```js
setDirectory('notes');  // true/false
clearDirectory();
```

---

# 9. Local storage & `userData`

### Single key

```text
localStorage['dbnm_userData'] = JSON.stringify(userData)
```

Always mutate `userData` then call `saveData()`.

### Shape (core — do not break)

```js
userData = {
  username: string|null,
  cmdUtil: [ /* installed packages */ ],
  sessionId: string,
  suggestions: boolean,
  tips: boolean,              // default true; hides tip_print content when false
  vars: { /* global vars */ },
  databases: { active, items },
  pakeger: { keys: [], clipPref: 'ask' },
  textos: { /* textos package state */ },
  // YOUR PACKAGE:
  notes: { setupShown: false, /* … */ }
}
```

### Package state convention

```js
function ensureNotesShape() {
    if (!window.userData) window.userData = {};
    if (!userData.notes || typeof userData.notes !== 'object') {
        userData.notes = {};
    }
    const t = userData.notes;
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    if (!t.theme) t.theme = 'default';
    if (!Array.isArray(t.items)) t.items = [];
    return t;
}

function saveNotes() {
    ensureNotesShape();
    if (typeof saveData === 'function') saveData();
}
```

**Rules:**

- Nest under `userData.<pkgName>` matching `PKG.name`.
- Default every field in `ensure*Shape` so old saves don’t crash.
- Never create separate localStorage keys for new packages.
- Don’t store secrets you aren’t willing to keep in plaintext localStorage (see-through keys are a known tradeoff in textos).

---

# 10. Installing & loading packages (`cmdUtil`)

### Install commands

```text
/ i f notes
/ i foundation notes
/ i ** paKeger
/ i burl https://example.com/addon.js
reg i hello-reg
```

### Util object

```js
{
  linkClass: 'f',           // see table
  link: 'notes',            // filename stem without .js
  index: 3,                 // for / dir listing
  downloadUrl?: string,     // reg / burl
  storagePath?: string,
  loaded?: boolean,
  installShown?: boolean    // first-run banner already shown
}
```

### linkClass → URL

| linkClass | URL |
|-----------|-----|
| `f`, `foundation` | `foundation/<link>.js` as module |
| `**`, `base` | `public/base-modules/<link>.js` as module |
| `**svr` | `servers/<link>.js` |
| `reg` | `util.downloadUrl` |
| `burl` | `util.downloadUrl` |

### Finding your util entry

```js
function getNotesUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'f' || u.linkClass === 'foundation'
          || u.linkClass === '**' || u.linkClass === 'base'
          || u.linkClass === 'reg')
        && String(u.link || '').toLowerCase() === 'notes'
    );
}
```

### `/ dir info`

If you called `registerPkgContents`, `/ dir` can show version/desc/files for that util.

---

# 11. PKG object & manifests

### PKG

```js
const PKG = {
    name: 'notes',                 // must match userData key & util.link ideally
    version: '1.0.0',
    desc: 'quick notes in the dbnm shell',
    license: 'MIT',
    tags: ['notes', 'n'],          // _reg each; registerPkg each
    asciiPath: 'foundation/assets/notes/ascii.txt',
    stylePath: 'foundation/assets/notes/notes.css'
};
```

### Manifest

```js
const registerPkg = typeof registerPkgContents === 'function'
    ? registerPkgContents
    : window.registerPkgContents;

if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'notes.js', type: 'module' },
            { path: 'assets/notes/ascii.txt', type: 'asset' },
            { path: 'assets/notes/notes.css', type: 'style' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}
```

Also:

```js
window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['notes commands'] = PKG.tags;
```

(Yes, `gloabal_vars` is misspelled in the codebase — keep that spelling.)

---

# 12. CSS loading

The package loader does **not** load CSS from the manifest. You must inject.

### Recommended pattern

```js
(function loadNotesStyles() {
    if (document.getElementById('notes-style')) return;
    const link = document.createElement('link');
    link.id = 'notes-style';
    link.rel = 'stylesheet';
    link.href = PKG.stylePath + '?v=' + Date.now(); // cache bust while iterating
    document.head.appendChild(link);
})();
```

Run this at top level immediately when the module loads.

### Alternative

Inject a `<style id="notes-style">` block with CSS text (fine for small base modules).

### What belongs where

| Put in `utils.css` | Put in package CSS |
|--------------------|--------------------|
| Shared shell (tabs, tips, colors, loader) | Package panels, ascii, trees, chat bars |
| Global semantic colors | Prefixed layout (`.notes-panel`) |

---

# 13. ASCII banners & install choreography

### Fetch

```js
async function fetchAscii() {
    try {
        const res = await fetch(PKG.asciiPath);
        if (!res.ok) return null;
        return (await res.text()).trimEnd();
    } catch {
        return null;
    }
}
```

### Show

```js
function showAscii(ascii) {
    const body = ascii
        ? `<pre class="notes-ascii">${escapeHtml(ascii)}</pre>`
        : `<span class="red">asset not found: ${escapeHtml(PKG.asciiPath)}</span>`;
    appendOutput(`<div class="notes-banner g-3">${body}</div>`);
}
```

### npm-flavored install sequence (canonical)

```js
async function runInstallBanner() {
    y_print(`<span class="notes-scope">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
    c_print(`<span class="notes-dim">GET</span> foundation/${PKG.name}`, '·');
    await delay(280);
    makeLoader(0);
    const ascii = await fetchAscii();
    makeLoader('rm');
    showAscii(ascii);
    print(`<div class="notes-panel"><span class="notes-tree">└─</span> <span class="green b">${PKG.name}@${PKG.version}</span> <span class="notes-dim">${escapeHtml(PKG.desc)}</span></div>`);
}

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
```

---

# 14. First-run / setup — critical rules

### The rule (non-negotiable)

> If setup/install UI was shown once — **including cancel, Esc, incomplete bind, or error** — do **not** auto-show it again on reload. User re-runs via `notes setup`.

### Why

Otherwise every refresh traps the user in a wizard.

### Implementation (dual flags — recommended)

```js
function markSetupShown() {
    const util = getNotesUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
    ensureNotesShape().setupShown = true;
    saveNotes();
}

function shouldShowSetup() {
    const t = ensureNotesShape();
    if (t.setupShown) return false;
    if (getNotesUtil()?.installShown) return false;
    return true;
}

async function setupDialogue() {
    _await('notes');
    try {
        await runInstallBanner();
        // … optional picks …
    } catch (e) {
        e_print(e.message || String(e));
    } finally {
        markSetupShown();   // ALWAYS
        c_placeholder('');
        unawait();
    }
}

(async function bootNotes() {
    ensureNotesShape();
    if (shouldShowSetup()) await setupDialogue();
})();
```

### Manual re-entry

Always keep `notes setup` / `notes install` as an explicit command that runs the same dialogue (without requiring `shouldShowSetup()`).

---

# 15. Interactive dialogues (`_await`)

### Lifecycle

```js
_await('notes');           // block other commands
// show UI, listen for keys
c_placeholder('');
unawait();                 // release after ~300ms
```

### Text wait helper

```js
function waitInput(label, placeholder) {
    return new Promise((resolve) => {
        qestion(label);
        c_placeholder(placeholder || '');
        const onKey = (e) => {
            if (e.key === 'Backspace' && !(db_ui.input?.value)) {
                e.preventDefault();
                db_ui.input.removeEventListener('keydown', onKey);
                resolve(null);
                return;
            }
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            const value = (db_ui.input?.value || '').trim();
            db_ui.input.value = '';
            db_ui.input.removeEventListener('keydown', onKey);
            resolve(value);
        };
        db_ui.input.addEventListener('keydown', onKey);
        db_ui.input.focus();
    });
}
```

### Enter-steal guard

When moving from a text prompt to a choice list, the Enter that submitted the prompt can fire the choice handler. Fix:

1. Attach choice listener in `setTimeout(..., 0)`.
2. Ignore Enter until `armed = true` after ~80ms.

---

# 16. CLI tabs (`renderCliTabs`)

### API

```js
/**
 * @param {Array<{
 *   id: string,
 *   label: string,
 *   content?: string | ((tab) => string),   // HTML allowed
 *   items?: Array<item> | ((tab) => Array<item>)
 * }>} tabs
 * @param {{ title?: string, initial?: string, awaitKey?: string }} [opts]
 * @returns {Promise<null | { tab, item, tabIndex, itemIndex }>}
 *
 * item: { id, name, flavor?, color?, ...extras }
 */
const pick = await renderCliTabs(tabs, opts);
```

`null` = cancelled.

### Keys

| Key | Action |
|-----|--------|
| ← → | switch tabs |
| ↓ | enter item list (if items exist) |
| ↑ ↓ | move in item list; ↑ on first returns to tabs |
| Enter | pick item, or enter items, or confirm content-only tab |
| Esc / empty Backspace | cancel |
| Click | select tab or pick item |

### Content note

`content` is inserted as **HTML** (not escaped by the tabs renderer). Escape dynamic pieces yourself. Static chrome can use classes.

`items[].name` / `flavor` **are escaped** by the renderer. `color` must be a safe class name you control (e.g. `light-blue`), not user text.

### Example: home + settings

```js
async function notesHome() {
    const t = ensureNotesShape();
    const pick = await renderCliTabs([
        {
            id: 'home',
            label: 'home',
            content: `<span class="notes-dim">${PKG.version}</span> · <span class="light-blue">${escapeHtml(t.theme)}</span>`,
            items: (t.items || []).map((n) => ({
                id: n.id,
                name: n.title,
                flavor: n.id,
                color: 'light-blue'
            }))
        },
        {
            id: 'settings',
            label: 'settings',
            content: '<span class="notes-dim">pick a setting</span>',
            items: [
                { id: 'theme', name: 'theme', flavor: t.theme, color: 'muted-teal' }
            ]
        },
        {
            id: 'theme',
            label: 'theme',
            content: `current · <span class="green">${escapeHtml(t.theme)}</span>`,
            items: [
                { id: 'default', name: 'default', color: 'light-blue' },
                { id: 'green', name: 'green', color: 'green' },
                { id: 'yellow', name: 'yellow', color: 'yellow' }
            ]
        }
    ], { title: 'notes', initial: 'home' });

    if (!pick) return;
    if (pick.tab.id === 'settings' && pick.item?.id === 'theme') {
        await notesHome(); // or reopen with initial: 'theme'
        return;
    }
    if (pick.tab.id === 'theme' && pick.item?.id) {
        t.theme = pick.item.id;
        saveNotes();
        g_print(`theme <span class="${escapeHtml(pick.item.id)}">${escapeHtml(pick.item.id)}</span>`);
    }
}
```

---

# 17. Flat choice lists

When you need a single list (not tabs), implement a local `renderChoices` mirroring this contract:

**Input:** `[{ id, name, flavor?, color? }, …]`  
**Output:** `Promise<item|null>`  
**Keys:** ↑↓, Enter, Esc/Backspace  
**DOM:** `.choices` + `.choice` + `.selected`  
**UX:** `warning('↑↓ move · Enter pick · Backspace/Esc bail')` then blur input

For multi-view settings/home, prefer `renderCliTabs` instead.

---

# 18. Databases & Firebase (optional)

### Prefer user-bound databases

1. User runs `database create …` / `database server default`.
2. Your setup picks a database entry (choices).
3. Store `userData.notes.boundDbId = entry.id`.
4. Resolve Firebase config from entry vars / foundation server / linked global var.

### Named Firebase apps

```js
const appName = 'notes-' + entry.id;
```

Avoid colliding with registry/textos default apps.

### Foundation server

`foundation/foundationServer.js` may expose `window.foundationServer.server.vars.firebaseConfig`. Load the script dynamically if missing.

### Listing

Never list unbounded collections into the CLI. Cap (`limit(24)`) or prompt for an id.

---

# 19. Help / home / status conventions

Users expect:

| Command | Behavior |
|---------|----------|
| `notes` / `notes home` | Overview (tabs OK) |
| `notes help` | Command list using `light-blue` for commands, dim for descriptions |
| `notes status` | Binding / version / key state in a panel |
| `notes setup` | Re-run wizard anytime |

Help layout example:

```js
print('<span class="notes-dim">rooms</span>');
print('  <span class="light-blue">notes create [name]</span>   open a note pad');
tip_print('aliases: n · cd notes for shell');
```

---

# 20. Step-by-step: build a package from zero

### Step 1 — Create files

```text
dbnm/foundation/notes.js
dbnm/foundation/assets/notes/notes.css
dbnm/foundation/assets/notes/ascii.txt
```

### Step 2 — Write PKG + CSS inject + manifest + escape/delay

(Top of `notes.js` — see template §21.)

### Step 3 — `ensureNotesShape` + save + util helpers + setup flags

### Step 4 — `_reg('notes', handler)` + aliases from `PKG.tags`

### Step 5 — Implement `help`, `status`, `home` (tabs), `setup`

### Step 6 — Boot IIFE: `if (shouldShowSetup()) await setupDialogue()`

### Step 7 — Package CSS with prefixed classes

### Step 8 — ASCII file (monospace art or simple title block)

### Step 9 — Install & test

```text
/ i f notes
r
notes
notes help
cd notes
help
settings          # global tips/suggestions still work
cd..
notes setup       # manual re-run
```

Refresh page twice after cancelling setup once — **must not** auto-open setup again.

---

# 21. Complete copy-paste template

Save as `dbnm/foundation/notes.js` (rename `notes` everywhere for your package).

```js
const PKG = {
    name: 'notes',
    version: '1.0.0',
    desc: 'quick notes in the dbnm shell',
    license: 'MIT',
    tags: ['notes', 'n'],
    asciiPath: 'foundation/assets/notes/ascii.txt',
    stylePath: 'foundation/assets/notes/notes.css'
};

(function loadNotesStyles() {
    if (document.getElementById('notes-style')) return;
    const link = document.createElement('link');
    link.id = 'notes-style';
    link.rel = 'stylesheet';
    link.href = PKG.stylePath + '?v=' + Date.now();
    document.head.appendChild(link);
})();

const registerPkg = typeof registerPkgContents === 'function'
    ? registerPkgContents
    : window.registerPkgContents;

if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'notes.js', type: 'module' },
            { path: 'assets/notes/ascii.txt', type: 'asset' },
            { path: 'assets/notes/notes.css', type: 'style' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}

window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['notes commands'] = PKG.tags;

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureNotesShape() {
    if (!window.userData) window.userData = {};
    if (!userData.notes || typeof userData.notes !== 'object') {
        userData.notes = {};
    }
    const t = userData.notes;
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    if (!t.theme) t.theme = 'default';
    if (!Array.isArray(t.items)) t.items = [];
    return t;
}

function saveNotes() {
    ensureNotesShape();
    if (typeof saveData === 'function') saveData();
}

function getNotesUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'f' || u.linkClass === 'foundation'
            || u.linkClass === '**' || u.linkClass === 'base'
            || u.linkClass === 'reg')
        && String(u.link || '').toLowerCase() === PKG.name
    );
}

function markSetupShown() {
    const util = getNotesUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
    ensureNotesShape().setupShown = true;
    saveNotes();
}

function shouldShowSetup() {
    const t = ensureNotesShape();
    if (t.setupShown) return false;
    if (getNotesUtil()?.installShown) return false;
    return true;
}

async function fetchAscii() {
    try {
        const res = await fetch(PKG.asciiPath);
        if (!res.ok) return null;
        return (await res.text()).trimEnd();
    } catch {
        return null;
    }
}

function showAscii(ascii) {
    const body = ascii
        ? `<pre class="notes-ascii">${escapeHtml(ascii)}</pre>`
        : `<span class="red">asset not found: ${escapeHtml(PKG.asciiPath)}</span>`;
    if (typeof appendOutput === 'function') {
        appendOutput(`<div class="notes-banner g-3">${body}</div>`);
    } else if (db_ui?.output) {
        db_ui.output.innerHTML += `<div class="notes-banner g-3">${body}</div>`;
    }
}

async function runInstallBanner() {
    y_print(`<span class="notes-scope">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
    c_print(`<span class="notes-dim">GET</span> foundation/${PKG.name}`, '·');
    await delay(280);
    makeLoader(0);
    const ascii = await fetchAscii();
    makeLoader('rm');
    showAscii(ascii);
    print(`<div class="notes-panel"><span class="notes-tree">└─</span> <span class="green b">${PKG.name}@${PKG.version}</span> <span class="notes-dim">${escapeHtml(PKG.desc)}</span></div>`);
}

function notesHelp() {
    print('<br><span class="muted-teal b">notes</span> <span class="notes-dim">commands</span>');
    print('<span class="notes-dim">────────────────────────────────</span>');
    print('  <span class="light-blue">notes</span>              home tabs');
    print('  <span class="light-blue">notes help</span>         this list');
    print('  <span class="light-blue">notes status</span>       state');
    print('  <span class="light-blue">notes setup</span>        re-run install UI');
    tip_print('aliases: n · <span class="light-blue">cd notes</span> for shell');
}

function notesStatus() {
    const t = ensureNotesShape();
    print(`<div class="notes-panel">
        <div><span class="notes-dim">pkg</span>    <span class="green b">${PKG.name}@${PKG.version}</span></div>
        <div><span class="notes-dim">theme</span>  <span class="light-blue">${escapeHtml(t.theme)}</span></div>
        <div><span class="notes-dim">items</span>  <span class="muted-teal">${t.items.length}</span></div>
    </div>`);
}

async function notesHome() {
    const t = ensureNotesShape();
    if (typeof renderCliTabs !== 'function') {
        notesStatus();
        tip_print('upgrade shell for tabs');
        return;
    }

    const pick = await renderCliTabs([
        {
            id: 'home',
            label: 'home',
            content: `<span class="notes-dim">${PKG.version}</span><span class="notes-sep"> · </span><span class="light-blue">${escapeHtml(t.theme)}</span>`,
            items: t.items.map((n) => ({
                id: n.id,
                name: n.title,
                flavor: n.id,
                color: 'light-blue'
            }))
        },
        {
            id: 'settings',
            label: 'settings',
            content: '<span class="notes-dim">pick a setting</span>',
            items: [
                { id: 'theme', name: 'theme', flavor: t.theme, color: 'muted-teal' }
            ]
        },
        {
            id: 'theme',
            label: 'theme',
            content: `current · <span class="green">${escapeHtml(t.theme)}</span>`,
            items: [
                { id: 'default', name: 'default', color: 'light-blue' },
                { id: 'green', name: 'green', color: 'green' },
                { id: 'yellow', name: 'yellow', color: 'yellow' }
            ]
        }
    ], { title: 'notes', initial: 'home' });

    if (!pick) return;

    if (pick.tab.id === 'settings' && pick.item?.id === 'theme') {
        // reopen focused on theme tab
        const t2 = ensureNotesShape();
        const pick2 = await renderCliTabs([
            {
                id: 'theme',
                label: 'theme',
                content: `current · <span class="green">${escapeHtml(t2.theme)}</span>`,
                items: [
                    { id: 'default', name: 'default', color: 'light-blue' },
                    { id: 'green', name: 'green', color: 'green' },
                    { id: 'yellow', name: 'yellow', color: 'yellow' }
                ]
            }
        ], { title: 'notes · theme', initial: 'theme' });
        if (pick2?.item?.id) {
            t2.theme = pick2.item.id;
            saveNotes();
            g_print(`theme <span class="${escapeHtml(pick2.item.id)}">${escapeHtml(pick2.item.id)}</span>`);
        }
        return;
    }

    if (pick.tab.id === 'theme' && pick.item?.id) {
        t.theme = pick.item.id;
        saveNotes();
        g_print(`theme <span class="${escapeHtml(pick.item.id)}">${escapeHtml(pick.item.id)}</span>`);
    }
}

async function setupDialogue() {
    _await('notes');
    try {
        await runInstallBanner();
        tip_print('<span class="light-blue">notes</span> · <span class="light-blue">cd notes</span> · <span class="light-blue">notes help</span>');
    } catch (e) {
        e_print(e.message || String(e));
    } finally {
        markSetupShown();
        c_placeholder('');
        unawait();
    }
}

async function handleNotes(_, cmd_split) {
    ensureNotesShape();
    const action = (cmd_split[1] || '').toLowerCase();

    if (!action || action === 'home' || action === 'notes') {
        await notesHome();
        return;
    }
    if (action === 'help' || action === 'h' || action === '?') {
        notesHelp();
        return;
    }
    if (action === 'status' || action === 'info') {
        notesStatus();
        return;
    }
    if (action === 'setup' || action === 'install') {
        await setupDialogue();
        return;
    }
    e_print(`unknown: ${escapeHtml(action)}`);
    tip_print('notes help');
}

PKG.tags.forEach((tag) => _reg(tag, handleNotes));

(async function bootNotes() {
    ensureNotesShape();
    if (shouldShowSetup()) await setupDialogue();
})();
```

---

# 22. Package CSS template

Save as `dbnm/foundation/assets/notes/notes.css`:

```css
.notes-dim { color: #7a7a7a; }
.notes-sep { color: #555; }
.notes-scope { color: rgb(91, 202, 91); font-weight: bold; }
.notes-tree { color: rgb(215, 179, 0); }

.notes-ascii {
    color: rgb(124, 182, 227);
    line-height: 1.05;
    font-size: 0.58rem;
    margin: 0;
    overflow-x: auto;
    white-space: pre;
    font-family: monospace;
}

.notes-banner {
    border-left: 3px solid rgb(124, 182, 227);
    padding: 0.55rem 0 0.55rem 0.85rem;
    margin: 0.45rem 0;
    background: linear-gradient(90deg, rgba(124, 182, 227, 0.08), transparent 65%);
}

.notes-panel {
    border: 1px solid #333;
    border-radius: 2px;
    padding: 0.5rem 0.65rem;
    margin: 0.35rem 0;
    background: rgba(255, 255, 255, 0.02);
}

.notes-choices .choice { cursor: pointer; }
```

---

# 23. ASCII art tips

`ascii.txt` is plain text, fetched and shown inside `<pre class="notes-ascii">`.

Guidelines:

- Keep width ≤ ~70 chars for typical windows
- Prefer simple block letters / outlines
- File should end cleanly (code uses `trimEnd()`)
- If missing, UI shows a red “asset not found” line — don’t crash

Minimal fallback content:

```text
notes
=====
```

---

# 24. Checklist & acceptance tests

### Build checklist

- [ ] `foundation/<name>.js` exists
- [ ] Optional `assets/<name>/<name>.css` + `ascii.txt`
- [ ] `PKG` with name/version/desc/tags/paths
- [ ] CSS injected with singleton id
- [ ] `registerPkgContents` for every tag
- [ ] `_reg` for every tag
- [ ] `ensure*Shape` + `save*`
- [ ] `shouldShowSetup` / `markSetupShown` with `finally`
- [ ] `help`, home, `setup`, `status`
- [ ] All user strings `escapeHtml`’d
- [ ] Tips via `tip_print`
- [ ] No unbounded remote lists

### Acceptance tests

1. `/ i f notes` then `r` → package loads, commands appear in `help`.
2. First load shows install banner once.
3. Cancel/Esc mid-setup → reload → **no** auto setup.
4. `notes setup` still works manually.
5. `notes` opens tabs; ←→ switches; ↓ selects; Esc cancels.
6. `settings tips off` (global) → your `tip_print` lines hidden.
7. `cd notes` → prompt shows `(notes): …` → `help` runs `notes help`.
8. `cd..` leaves shell.
9. Hard refresh keeps theme/settings from `userData.notes`.

---

# 25. Pitfalls & anti-patterns

| Mistake | Correct approach |
|---------|------------------|
| Gate `setupShown` only on successful bind | Mark in `finally` always |
| Expect loader to fetch CSS/ASCII | Inject/fetch yourself |
| Manifest path used as `fetch()` URL | Fetch needs `foundation/assets/...` full site path |
| `print` for soft hints | Use `tip_print` |
| Store package state at localStorage root | Nest under `userData.<pkg>` |
| List all Firestore docs | Cap or ask for id |
| Register command `cd` / `help` | Choose unique pkg name |
| Forget `unawait()` | Always clear in `finally` |
| Put secrets in HTML attributes | Escape; avoid putting keys in DOM |
| Heavy web UI cards | Stay monospace CLI |
| Mutate `userData` without `saveData` | Persist after every change you care about |
| Assume `renderCliTabs` exists forever without guard | `typeof renderCliTabs === 'function'` fallback |

---

# 26. Glossary

| Term | Meaning |
|------|---------|
| **foundation** | Official package under `dbnm/foundation/` |
| **base module** | Package under `public/base-modules/` |
| **util** | One `cmdUtil` entry describing an installed package |
| **linkClass** | How to resolve the script URL (`f`, `**`, `reg`, …) |
| **PKG** | Local metadata object in the package file |
| **manifest** | Object passed to `registerPkgContents` for `/ dir info` |
| **directory / shell** | `cd <command>` mode that prefixes input |
| **awaiting** | Dialogue lock; blocks command dispatch |
| **tips** | Global setting; hides `tip_print` visually |
| **cli tabs** | Shared ←→ tab + ↓ item selector UI |
| **dim** | Secondary gray text (`#7a7a7a`) |
| **installShown / setupShown** | Flags preventing first-run UI on reload |

---

# Appendix A — Color cheat sheet for HTML strings

```html
<span class="light-blue">command</span>
<span class="green b">name@1.0.0</span>
<span class="yellow">loading…</span>
<span class="red">error</span>
<span class="muted-teal b">title</span>
<span class="notes-dim">secondary</span>
<span class="b">bold</span>
<span class="u">underline</span>
```

---

# Appendix B — Minimal remote package (registry / burl)

Smallest useful file (no CSS/ASCII):

```js
_reg('hello-reg', () => {
    g_print('hello from remote!');
    tip_print('installed via registry or burl');
});
print('<span class="green b">hello-reg</span> loaded — try <span class="light-blue">hello-reg</span>');
```

Still runs in the same global shell context.

---

# Appendix C — Mental model one-pager

```
index.html
  └─ utils.css          ← shared CLI look
  └─ ps_main.js         ← shell, print, _reg, tabs, userData, loader
       └─ loads cmdUtil scripts
            └─ foundation/notes.js
                 ├─ inject notes.css
                 ├─ registerPkgContents
                 ├─ _reg('notes')
                 ├─ userData.notes + saveData
                 ├─ boot setup once (finally marks shown)
                 └─ home via renderCliTabs
```

You are writing the leaf (`notes.js` + assets). The shell is already there. Speak its language: monospace, helpers, escaped HTML, persist under `userData`, never re-trap the user in setup.

---

*Manual version aligned with dbnm ~1.4.x (`ps_main.js`, shared cli-tabs, tips setting, foundation module patterns). Build packages so they work standalone against these contracts.*
