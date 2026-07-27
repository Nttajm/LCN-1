# Building a dbnm foundation (or external) file

This guide explains how to author packages for **dbnm** — foundation modules (`foundation/*.js`), base modules (`public/base-modules/*.js`), remote/registry installs, and how they plug into the shell (`ps_main.js`).

Reference implementations:

| Package | Path | Good for |
|---------|------|----------|
| **textos** | `dbnm/foundation/textos.js` | full app: PKG, CSS, ASCII, setup flag, tabs, Firebase, `userData` |
| **registry** | `dbnm/foundation/registry.js` | install banner, Firebase auth, `installShown` |
| **paKeger** | `dbnm/public/base-modules/paKeger.js` | base-module style, inline CSS |
| **hello-reg** | `man/hello-reg.js` | minimal `_reg` example |

---

## 1. What a package is

A package is a JS file that:

1. Runs when loaded (as an ES module for foundation/base).
2. Registers one or more commands with `_reg(...)`.
3. Optionally registers a **manifest** via `registerPkgContents` (for `/ dir info`).
4. Optionally injects CSS, fetches ASCII, persists state under `userData`, and shows a first-run UI once.

Install examples:

```text
/ i f textos              → foundation/textos.js
/ i foundation registry   → foundation/registry.js
/ i ** paKeger            → public/base-modules/paKeger.js
/ i burl https://…/x.js   → remote URL
reg i hello-reg           → registry download
```

After install, reload (or boot) loads every entry in `userData.cmdUtil`.

---

## 2. File layout

### Foundation package

```text
dbnm/foundation/
  mypkg.js
  assets/mypkg/
    ascii.txt          optional banner art
    mypkg.css          optional styles
```

### Base module

```text
dbnm/public/base-modules/
  mypkg.js             (often inline CSS instead of a file)
```

### Fetch / link paths are site-relative from the dbnm web root

```text
foundation/mypkg.js
foundation/assets/mypkg/ascii.txt
foundation/assets/mypkg/mypkg.css
public/base-modules/mypkg.js
```

**Important:** the script loader does **not** auto-load CSS or ASCII. You must inject/fetch them yourself. The manifest only tells `/ dir info` what files “belong” to the package.

---

## 3. The `PKG` object

Every serious package starts with a local metadata object:

```js
const PKG = {
    name: 'mypkg',
    version: '1.0.0',
    desc: 'one-line description',
    license: 'MIT',
    tags: ['mypkg', 'mp'],   // command names / aliases
    asciiPath: 'foundation/assets/mypkg/ascii.txt',
    stylePath: 'foundation/assets/mypkg/mypkg.css'
    // …any extras you need (collection names, limits, etc.)
};
```

Use `PKG.name`, `PKG.version`, `PKG.desc` in install banners, help text, and panels so branding stays consistent.

Expose tags for tooling / help dumps:

```js
window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['mypkg commands'] = PKG.tags;
```

---

## 4. Registering the package manifest

```js
const registerPkg = typeof registerPkgContents === 'function'
    ? registerPkgContents
    : window.registerPkgContents;

if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'mypkg.js', type: 'module' },
            { path: 'assets/mypkg/ascii.txt', type: 'asset' },
            { path: 'assets/mypkg/mypkg.css', type: 'style' }
        ]
    };
    // Register under every command tag so / dir info works for aliases
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}
```

**Manifest `files` paths** are relative to the package root for display (`foundation/` or `public/base-modules/` is prefixed by the shell from `linkClass`). They are **not** automatically loaded.

---

## 5. Command registration & handler syntax

```js
_reg('mypkg', handleMypkg);
_reg('mp', handleMypkg);   // alias — or loop PKG.tags
```

Handler signature used everywhere:

```js
async function handleMypkg(args, cmd_split) {
    // cmd_split[0] === 'mypkg' (or directory-prefixed command)
    // cmd_split[1] === subcommand (setup, help, …)
    // args = values parsed from parentheses: mypkg (a, b)
}
```

Inside a shell directory (`cd mypkg`), the user can omit the prefix: typing `help` becomes `mypkg help`.

```js
function setDirectory(name) { /* must be a registered command name */ }
function clearDirectory() { /* cd.. */ }
window.setDirectory = setDirectory;
window.clearDirectory = clearDirectory;
```

Optional cleanup when leaving your shell:

```js
window.cleanupMypkgOnCdUp = function () {
    // end dialogues, tear down listeners, save state
};
// ps_main already special-cases textos; for new packages
// hook similarly or document that users run leave/exit first.
```

---

## 6. Print helpers (shell UI)

All write HTML into `#output`. Prefer helpers over raw DOM.

| Helper | Use |
|--------|-----|
| `print(value)` | Normal line (prefixes `dir$` / `db$`) |
| `g_print(value)` | Success (green) |
| `e_print(value)` | Error (red) |
| `y_print(value)` | Status / progress (yellow) |
| `warning(value)` | `[!]` attention |
| `qestion(value)` | `[?]` prompt label (spelling is intentional) |
| `tip_print(value)` | Dim tip; **hidden** when user setting `tips` is off |
| `c_print(value, custom)` | Custom prefix + value |
| `u_print(value)` | Echo user input |
| `c_placeholder(value)` | Input placeholder + focus |
| `_await(key)` | Block other commands while in a dialogue |
| `unawait()` | Release after ~300ms |
| `makeLoader(0)` / `makeLoader('rm')` | Dot loader on / off |
| `appendOutput(html)` | Raw HTML append |
| `scrollOutputToBottom()` | Keep view pinned |

**Always escape** user-controlled strings before HTML interpolation:

```js
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
```

---

## 7. Interactive dialogues — `_await` rules

While `_await('mypkg')` is active, Enter does **not** run new shell commands. Use this for any multi-step flow.

```js
async function setupDialogue() {
    _await('mypkg');
    try {
        // prompts / choices / tabs
    } finally {
        c_placeholder('');
        unawait();
        // mark first-run shown here (see §9)
    }
}
```

Patterns:

- Text input: attach `keydown` on `db_ui.input`, resolve on Enter, cancel on empty Backspace / Esc.
- Choice list: ↑↓ / Enter / Esc (see textos `renderTxChoices`, database `renderDbChoices`).
- Tabs: `renderCliTabs` (see §8).

**Gotcha:** if the previous step ended with Enter, defer attaching the next key listener (and optionally “arm” Enter after ~80ms) so that same keypress cannot auto-pick a choice.

---

## 8. CLI tabs (`renderCliTabs`)

Shared Claude Code–style tab UI from `ps_main.js` (styles in `base_ps/css/utils.css`).

```js
const pick = await renderCliTabs([
    {
        id: 'home',
        label: 'home',
        content: '<span class="tx-dim">status html…</span>',  // string or () => string
        items: [                                               // array or () => array
            { id: 'a', name: 'Room 1', flavor: 'room-1', color: 'light-blue' }
        ]
    },
    {
        id: 'settings',
        label: 'settings',
        content: 'pick a setting',
        items: [
            { id: 'color', name: 'username color', flavor: 'light blue', color: 'light-blue' }
        ]
    }
], {
    title: 'mypkg',
    initial: 'home'
    // awaitKey: 'mypkg-tabs'   // optional _await key
});

// pick === null → cancelled (Esc / Backspace)
// pick.tab, pick.item, pick.tabIndex, pick.itemIndex
```

Keys:

- `←` `→` — switch tabs (content/items update live)
- `↓` — enter item list (if any)
- `↑` `↓` — move items (`↑` on first item returns to tab bar)
- `Enter` — select item / confirm content-only tab
- `Esc` / empty `Backspace` — cancel
- Click tabs or items also works

Also available as `window.renderCliTabs` / `window.cliTabs`.

Use tabs for home screens, settings panels, multi-view pickers — not for dumping thousands of remote rows (prompt for an id instead).

---

## 9. First-run / install UI — do not re-show after cancel or reload

**Rule:** once the user has seen the setup/install dialogue (even if they cancel or leave incomplete), **do not** auto-open it again on load. They can re-run it manually (`mypkg setup`).

### Pattern A — util flag only (registry)

```js
function getMyUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'f' || u.linkClass === 'foundation')
        && String(u.link || '').toLowerCase() === 'mypkg'
    );
}

function markInstallShown() {
    const util = getMyUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
}

function shouldShowInstall() {
    const util = getMyUtil();
    return !util || !util.installShown;
}

async function maybeFirstInstall() {
    if (!shouldShowInstall()) return;
    await runInstall();
    markInstallShown();
}

maybeFirstInstall();
```

### Pattern B — dual flags (textos)

Persist both `util.installShown` and `userData.mypkg.setupShown`. Mark in a **`finally`** so cancel, bind failure, and errors all count as “already shown”:

```js
function shouldShowSetup() {
    const t = ensureMypkgShape();
    if (t.setupShown) return false;
    if (getMyUtil()?.installShown) return false;
    return true;
}

function markSetupShown() {
    const util = getMyUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
    const t = ensureMypkgShape();
    t.setupShown = true;
    saveMypkg();
}

async function setupDialogue() {
    _await('mypkg');
    try {
        // …wizard…
    } finally {
        markSetupShown();
        unawait();
        c_placeholder('');
    }
}

(async function bootMypkg() {
    ensureMypkgShape();
    if (shouldShowSetup()) await setupDialogue();
})();
```

Never gate “don’t show again” on “setup completed successfully” alone — that causes the reload loop.

---

## 10. Local storage / `userData`

**Key:** `localStorage['dbnm_userData']`

```js
window.userData   // shared object
window.saveData() // JSON.stringify → localStorage
window.dbnm_vars  // alias of userData.vars
```

### Nest your state under `userData.<pkgName>`

```js
function ensureMypkgShape() {
    if (!window.userData) window.userData = {};
    if (!userData.mypkg || typeof userData.mypkg !== 'object') {
        userData.mypkg = {};
    }
    const t = userData.mypkg;
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    if (!t.theme) t.theme = 'default';
    // …
    return t;
}

function saveMypkg() {
    ensureMypkgShape();
    if (typeof saveData === 'function') saveData();
}
```

Call `saveData()` / `saveMypkg()` after every mutation you want to survive reload.

Shell-owned settings you may care about:

- `userData.suggestions` — command suggestions
- `userData.tips` — when false, `tip_print` still writes markup but wraps content in `display:none`
- `userData.cmdUtil` — installed packages
- `userData.databases` — database manager entries
- `userData.username` — global display name (textos syncs this into `deviceName`)

Do **not** invent parallel localStorage keys for new packages; nest under `userData` so one save path covers everything.

---

## 11. Loading ASCII

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

function showAscii(ascii) {
    const body = ascii
        ? `<pre class="mypkg-ascii">${escapeHtml(ascii)}</pre>`
        : `<span class="red">asset not found: ${escapeHtml(PKG.asciiPath)}</span>`;
    db_ui.output.innerHTML += `<div class="mypkg-banner g-3">${body}</div>`;
}
```

Install choreography (npm-flavored, used by textos/registry):

```js
y_print(`<span class="b">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
c_print(`<span class="tx-dim">GET</span> foundation/${PKG.name}`, '·');
await delay(280);
makeLoader(0);
const ascii = await fetchAscii();
makeLoader('rm');
showAscii(ascii);
print(`installed <span class="green b">${PKG.name}@${PKG.version}</span>`);
```

```js
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
```

---

## 12. Loading CSS

### Preferred — external file + singleton id + cache bust

```js
(function loadMypkgStyles() {
    if (document.getElementById('mypkg-style')) return;
    const link = document.createElement('link');
    link.id = 'mypkg-style';
    link.rel = 'stylesheet';
    link.href = PKG.stylePath + '?v=' + Date.now();
    document.head.appendChild(link);
})();
```

### Also fine — inject `<style id="…">` (paKeger)

### Shared shell styles

Put reusable shell UI (tabs, tips, loaders) in `dbnm/base_ps/css/utils.css` — not inside every package. Package-specific look goes in `foundation/assets/<name>/…css`.

---

## 13. How packages get loaded (`cmdUtil`)

Each install adds an object:

```js
{
    linkClass: 'f',        // see table
    link: 'mypkg',         // stem → mypkg.js
    index: 3,              // stable for / dir / / rm
    downloadUrl?: string,  // reg / burl
    storagePath?: string,  // registry
    loaded?: boolean,
    installShown?: boolean
}
```

| `linkClass` | Script URL |
|-------------|------------|
| `f` / `foundation` | `foundation/<link>.js` (`type="module"`) |
| `**` / `base` | `public/base-modules/<link>.js` (module) |
| `**svr` | `servers/<link>.js` (only one server util loads) |
| `reg` | `downloadUrl` from registry |
| `burl` | arbitrary HTTPS URL |

Boot path: `initialize_db()` → `renderUtils()` → create `<script type="module">` for each util.

Because handlers register on the shared global `commandHandlers`, modules can call `_reg` at top level even when loaded as modules (as long as `ps_main.js` loaded first on the page).

---

## 14. Choice selectors (non-tab)

When you need a flat picker (not multi-view tabs), clone the textos/database pattern:

```js
function renderMyChoices(choices) {
    // append .choices with .choice rows
    // ↑↓ · Enter → resolve(choices[selected])
    // Esc / Backspace → resolve(null)
    // warning('↑↓ move · Enter pick · Backspace/Esc bail');
}
```

Choice shape:

```js
{ id, name, flavor?, color?, /* extras: entry, secret, … */ }
```

Colors should be existing utility classes: `light-blue`, `green`, `yellow`, `red`, `muted-teal`, `coral`, …

---

## 15. Databases & Firebase (when you need cloud)

### Prefer binding to a user database entry

1. User creates/selects a DB via `database` commands.
2. Your package stores `boundDbId` in `userData.<pkg>`.
3. Resolve Firebase config from:
   - `entry.vars.firebaseConfig`
   - `server.type === 'foundation'` → load `foundation/foundationServer.js` (`window.foundationServer`)
   - `server.type === 'global_vars'` → `dbnm_vars[varKey]`
   - pasted firebase / supabase / etc. configs from the database wizard

### Dynamic Firebase apps

Use a **named** Firebase app per binding so packages don’t collide:

```js
const appName = 'mypkg-' + entry.id;
```

### Foundation server

`foundation/foundationServer.js` exposes shared LCN Firebase config. Firestore rules in this repo are intentionally open for the foundation playground — don’t assume production security.

### Don’t list unbounded collections in the UI

If there could be thousands of docs (rooms, posts), **prompt for an id** instead of `getDocs` + list. Keep optional `ls` commands capped (e.g. limit 24).

---

## 16. Help, status, and home

Conventions users expect:

```text
mypkg              → home / overview (tabs OK)
mypkg help         → command list
mypkg status       → binding / session summary
mypkg setup        → re-run bind/install wizard (manual)
```

Home tip lines should go through `tip_print` so the global **tips** setting can hide them.

---

## 17. Minimal starter (foundation)

```js
const PKG = {
    name: 'hello',
    version: '0.1.0',
    desc: 'minimal foundation package',
    license: 'MIT',
    tags: ['hello'],
    asciiPath: 'foundation/assets/hello/ascii.txt',
    stylePath: 'foundation/assets/hello/hello.css'
};

(function loadStyles() {
    if (document.getElementById('hello-style')) return;
    const link = document.createElement('link');
    link.id = 'hello-style';
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
            { path: 'hello.js', type: 'module' },
            { path: 'assets/hello/ascii.txt', type: 'asset' },
            { path: 'assets/hello/hello.css', type: 'style' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}

function ensureHelloShape() {
    if (!window.userData) window.userData = {};
    if (!userData.hello || typeof userData.hello !== 'object') userData.hello = {};
    const t = userData.hello;
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    return t;
}

function saveHello() {
    ensureHelloShape();
    if (typeof saveData === 'function') saveData();
}

function getHelloUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'f' || u.linkClass === 'foundation' || u.linkClass === '**' || u.linkClass === 'base')
        && String(u.link || '').toLowerCase() === 'hello'
    );
}

function markSetupShown() {
    const util = getHelloUtil();
    if (util) {
        util.installShown = true;
        saveData();
    }
    ensureHelloShape().setupShown = true;
    saveHello();
}

function shouldShowSetup() {
    const t = ensureHelloShape();
    if (t.setupShown) return false;
    if (getHelloUtil()?.installShown) return false;
    return true;
}

async function handleHello(_, cmd_split) {
    const action = (cmd_split[1] || '').toLowerCase();
    if (!action || action === 'home') {
        if (typeof renderCliTabs === 'function') {
            await renderCliTabs([
                { id: 'home', label: 'home', content: `<span class="green b">${PKG.name}</span> @${PKG.version}` },
                { id: 'about', label: 'about', content: escapeHtml(PKG.desc) }
            ], { title: 'hello' });
        } else {
            print(`${PKG.name}@${PKG.version}`);
        }
        return;
    }
    if (action === 'help') {
        print('hello · hello help · hello setup');
        return;
    }
    if (action === 'setup') {
        await setupDialogue();
        return;
    }
    e_print(`unknown: ${action}`);
}

async function setupDialogue() {
    _await('hello');
    try {
        y_print(`+ ${PKG.name}@${PKG.version}`);
        print('setup complete — run hello anytime');
    } finally {
        markSetupShown();
        unawait();
    }
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

_reg('hello', handleHello);

(async function bootHello() {
    ensureHelloShape();
    if (shouldShowSetup()) await setupDialogue();
})();
```

Install:

```text
/ i f hello
hello
cd hello
help
cd..
```

---

## 18. Author checklist

1. Create `foundation/<name>.js` (+ optional `assets/<name>/ascii.txt` + `.css`).
2. Define `PKG` (`name`, `version`, `desc`, `tags`, paths).
3. Inject CSS yourself; list assets in `registerPkgContents` for `/ dir info`.
4. `_reg` primary command (+ aliases from `tags`).
5. Nest state in `userData.<name>`; always `saveData()` after changes.
6. First-run UI: mark shown in `finally` — cancel/reload must not re-prompt.
7. Interactive flows: `_await` → UI → `unawait` + clear placeholder.
8. Prefer `renderCliTabs` for multi-view home/settings; flat choices for single lists.
9. Escape all user/remote strings in HTML.
10. Use `tip_print` for soft tips (respects global tips setting).
11. Don’t dump huge remote lists — prompt for ids.
12. Install with `/ i f <name>`; optional shell via `cd <command>`.

---

## 19. Quick reference — colors & classes

Utility classes from `base_ps/css/utils.css`:

`light-blue`, `green`, `yellow`, `red`, `coral`, `pink`, `muted-teal`, `muted-purple`, `muted-rose`, `muted-orange`, `b`, `u`, `i`, `selected`, `tip-print`

CLI tabs: `.cli-tabs`, `.cli-tab`, `.cli-tabs-item`, `.focus-tabs`, `.focus-items`

Package CSS: keep scoped prefixes (`.tx-…`, `.reg-…`, `.mypkg-…`).

---

## 20. Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Setup shows every reload after cancel | `markSetupShown()` in `finally` + persist `setupShown` / `installShown` |
| CSS never appears | Loader doesn’t load CSS — inject `<link>` yourself |
| Manifest paths vs fetch paths | Manifest is package-relative display; `fetch`/`href` need full site path (`foundation/assets/…`) |
| Enter steals next choice | Defer listener; arm Enter after short timeout |
| Commands blocked forever | Always `unawait()` / clear dialogue listeners on cancel |
| Tips still visible | Use `tip_print`, not `print`, for tip lines |
| Parallel localStorage keys | Nest under `userData.<pkg>` only |
| Listing all rooms/docs | Cap or require id entry |
| Directory `cd mypkg` fails | Command name must be `_reg`’d first |

---

*This document tracks conventions as of dbnm ~1.4.x (`ps_main.js`, textos, registry). When in doubt, copy the nearest working package and delete what you don’t need.*
