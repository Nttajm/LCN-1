/* =====================================================================
   claude.js — dbnm registry package
   Install:  reg i claude
   Reload:   r

   This file assumes the dbnm shell/CLI layer already exists on the site
   (print / g_print / e_print / y_print / warning / qestion / tip_print /
   c_print / c_placeholder / appendOutput / makeLoader / _reg / _await /
   unawait / setDirectory / clearDirectory / renderCliTabs / userData /
   saveData / db_ui / registerPkgContents). It only registers commands
   and renders output through those globals — it does not touch the
   shell chrome (.prompt / #input / body), per the "never override the
   shared chrome" rule.
   ===================================================================== */

const PKG = {
    name: 'claude',
    version: '2.2.0',
    desc: 'cloud coding workspace, right in your shell',
    license: 'MIT',
    tags: ['claude', 'cc']
};

// ---- CSS lives in this file as a string and is injected once ----------
(function loadClaudeStyles() {
    let style = document.getElementById('claude-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'claude-style';
        document.head.appendChild(style);
    }
    style.textContent = `
        .claude-dim{color:#6e6a60;}
        .claude-muted{color:#524e46;}
        .claude-scope{color:var(--claude-accent, #d97757);font-weight:700;}
        .claude-tree{color:#524e46;}
        .claude-ok{color:rgb(91,202,91);}
        .claude-accent{color:var(--claude-accent, #d97757);}

        .claude-banner{margin:.45rem 0 .35rem;}
        .claude-ascii{
            color:var(--claude-accent, #d97757); font-size:.72rem; line-height:1.3;
            white-space:pre; margin:0; overflow-x:auto;
        }
        .claude-panel{padding:.2rem 0; margin:.15rem 0;}

        .claude-dl-bar{color:var(--claude-accent, #d97757);letter-spacing:-1px;}
        .claude-dl-pct{color:#6e6a60;}
        .claude-dl-done .claude-dl-bar{color:rgb(91,202,91);}

        .claude-user-msg{margin:10px 0 6px;}
        .claude-user-caret{color:var(--claude-accent, #d97757);font-weight:700;}

        .claude-thinking{color:var(--claude-accent, #d97757);margin:4px 0;}
        .claude-spin{color:var(--claude-accent, #d97757);display:inline-block;width:1em;}
        .claude-think-verb{color:var(--claude-accent, #d97757);}
        .claude-think-meta{color:#6e6a60;font-style:normal;}
        .claude-status-line{font-size:12px;padding-top:4px;color:#6e6a60;}

        .claude-dot{color:rgb(91,202,91);}
        .claude-dot-open{color:#c8c4b8;}
        .claude-elbow{color:#524e46;}
        .claude-tool{margin-top:3px;line-height:1.45;}
        .claude-tool-name{color:inherit;font-weight:700;}
        .claude-tool-args{color:#6e6a60;}
        .claude-tool-result{color:#6e6a60;margin-left:2px;line-height:1.4;}
        .claude-tool-result.ok{color:#6e6a60;}
        .claude-hint{color:#524e46;}

        .claude-work-card{margin:6px 0 4px;padding:0;}
        .claude-work-title{margin-bottom:2px;}
        .claude-work-label{font-weight:700;color:inherit;}
        .claude-work-state{color:#6e6a60;}
        .claude-work-bar-text{color:var(--claude-accent, #d97757);letter-spacing:-1px;}
        .claude-work-card.done .claude-work-bar-text{color:rgb(91,202,91);}
        .claude-work-card.done .claude-work-state{color:rgb(91,202,91);}
        .claude-work-log{color:#6e6a60;margin-top:1px;}

        .claude-diff-panel{margin:.25rem 0 .45rem .95rem;}
        .claude-diff-file{color:#6e6a60;font-size:12.5px;margin-bottom:2px;}
        .claude-diff-row{display:flex;gap:8px;padding:0 2px;font-size:13.2px;white-space:pre;}
        .claude-diff-num{width:26px;color:#524e46;text-align:right;flex-shrink:0;}
        .claude-diff-sign{width:10px;flex-shrink:0;}
        .claude-diff-add{background:rgba(91,202,91,.1);}
        .claude-diff-add .claude-diff-num,.claude-diff-add .claude-diff-sign,.claude-diff-add .claude-diff-text{color:rgb(91,202,91);}
        .claude-diff-del{background:rgba(235,57,57,.12);}
        .claude-diff-del .claude-diff-num,.claude-diff-del .claude-diff-sign,.claude-diff-del .claude-diff-text{color:#e86a6a;}
        .claude-diff-ctx .claude-diff-text{color:#c4b89a;}

        .claude-todo{margin:.35rem 0;}
        .claude-todo-title{color:#6e6a60;margin-bottom:2px;}
        .claude-todo-item{display:flex;gap:8px;line-height:1.45;}
        .claude-todo-item.done .claude-todo-text{color:#524e46;}
        .claude-todo-item.done .claude-todo-mark{color:rgb(91,202,91);}
        .claude-todo-item.active .claude-todo-mark{color:var(--claude-accent, #d97757);}
        .claude-todo-item.active .claude-todo-text{color:inherit;}
        .claude-todo-item.pending .claude-todo-mark{color:#524e46;}
        .claude-todo-item.pending .claude-todo-text{color:#6e6a60;}

        .claude-final{margin-top:.45rem;color:inherit;}
        .claude-inline-code{color:#c4b89a;}
        .claude-bash-out{font-size:13.2px;margin:.2rem 0 .2rem .95rem;color:#6e6a60;}
        .claude-code-preview{margin:.15rem 0 .35rem .95rem;}
        .claude-code-line{display:flex;gap:10px;font-size:13.2px;white-space:pre;}
        .claude-code-num{width:18px;color:#524e46;text-align:right;flex-shrink:0;}
        .claude-code-text{color:#c4b89a;}

        .claude-choice-wrap{margin:8px 0;padding:2px 0;}
        .claude-choice-title{margin-bottom:4px;color:inherit;}
        .claude-choices .choice{padding:2px 0;}
        .claude-choices .choice.selected{color:var(--claude-accent, #d97757);}

        .claude-project-row{margin:1px 0;line-height:1.5;}
        .claude-project-row.active .claude-project-name{color:var(--claude-accent, #d97757);font-weight:700;}
        .claude-project-name{color:inherit;}
        .claude-project-meta{color:#6e6a60;}
        .claude-project-mark{color:#524e46;width:1.2em;display:inline-block;}
        .claude-project-row.active .claude-project-mark{color:rgb(91,202,91);}

        .claude-kbd{color:#6e6a60;}
        .claude-agent-block{margin:4px 0 8px;}
        .claude-agent-head{margin-bottom:1px;}
        .claude-agent-row{line-height:1.45;color:#c8c4b8;}
        .claude-agent-done{color:#524e46;margin-left:1.6em;}

        .claude-ctx{margin:.35rem 0;white-space:pre;line-height:1.35;font-size:13px;}
        .claude-ctx-msg{color:#b794f6;}
        .claude-ctx-sys{color:#6e6a60;}
        .claude-ctx-free{color:#524e46;}
        .claude-ctx-compact{color:#6e6a60;}

        .claude-section-label{color:#6e6a60;margin-top:8px;margin-bottom:2px;}
        .claude-cmd-list{margin:.2rem 0;}
        .claude-cmd-row{line-height:1.5;}
        .claude-cmd-row code{color:#8fd3ff;}
    `;
})();

// ---- manifest / registry hooks -----------------------------------------
const registerPkg = typeof registerPkgContents === 'function' ? registerPkgContents : window.registerPkgContents;
if (typeof registerPkg === 'function') {
    const manifest = {
        version: PKG.version,
        desc: PKG.desc,
        files: [
            { path: 'claude.js', type: 'module' }
        ]
    };
    PKG.tags.forEach((tag) => registerPkg(tag, manifest));
}
window.gloabal_vars = window.gloabal_vars || {};
window.gloabal_vars['claude commands'] = PKG.tags;

// ---- helpers (package-local, per manual convention) ---------------------
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// ---- state ----------------------------------------------------------------
function ensureClaudeShape() {
    if (!window.userData) window.userData = {};
    if (!userData.claude || typeof userData.claude !== 'object') {
        userData.claude = {};
    }
    const t = userData.claude;
    if (typeof t.setupShown !== 'boolean') t.setupShown = false;
    if (!Array.isArray(t.todos)) t.todos = [];
    if (!Array.isArray(t.history)) t.history = [];
    if (typeof t.autoApprove !== 'boolean') t.autoApprove = false;
    if (typeof t.permissionMode !== 'string') t.permissionMode = 'ask';
    if (typeof t.model !== 'string') t.model = 'Sonnet 5';
    if (!Array.isArray(t.installedTools)) t.installedTools = [];
    if (!Array.isArray(t.projects) || !t.projects.length) t.projects = defaultClaudeProjects();
    if (!t.activeProject || !t.projects.some((project) => project.id === t.activeProject)) {
        t.activeProject = t.projects[0].id;
    }
    return t;
}
function saveClaude() {
    ensureClaudeShape();
    if (typeof saveData === 'function') saveData();
}
function getClaudeUtil() {
    return (userData.cmdUtil || []).find((u) =>
        (u.linkClass === 'reg' || u.linkClass === 'burl' || u.linkClass === 'f' || u.linkClass === 'foundation'
            || u.linkClass === '**' || u.linkClass === 'base')
        && String(u.link || '').toLowerCase() === PKG.name
    );
}
function markSetupShown() {
    const util = getClaudeUtil();
    if (util) { util.installShown = true; saveData(); }
    ensureClaudeShape().setupShown = true;
    saveClaude();
}
function shouldShowSetup() {
    const t = ensureClaudeShape();
    if (t.setupShown) return false;
    if (getClaudeUtil()?.installShown) return false;
    return true;
}

// ---- ascii banner (inline — this is a single-file reg package, no bundled assets) --
const CLAUDE_ASCII =
`             \u273B
          claude
     \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   cloud coding, in your shell`;

function showAscii() {
    appendOutput(`<div class="claude-banner g-3"><pre class="claude-ascii">${escapeHtml(CLAUDE_ASCII)}</pre></div>`);
}

// ---- "download states" ----------------------------------------------------
function progressBar(pct) {
    const width = 22;
    const filled = Math.round((width * pct) / 100);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}
async function animateDownload(label) {
    const id = 'dl-' + Math.random().toString(36).slice(2);
    appendOutput(`<div class="g-3 claude-dl" id="${id}"><span class="claude-dim">GET</span> ${escapeHtml(label)} <span class="claude-dl-bar">${progressBar(0)}</span> <span class="claude-dl-pct">0%</span></div>`);
    const el = document.getElementById(id);
    const barEl = el.querySelector('.claude-dl-bar');
    const pctEl = el.querySelector('.claude-dl-pct');
    for (let p = 0; p <= 100; p += Math.round(2 + Math.random() * 4)) {
        const pct = Math.min(p, 100);
        barEl.textContent = progressBar(pct);
        pctEl.textContent = pct + '%';
        await delay(220 + Math.random() * 280);
    }
    barEl.textContent = progressBar(100);
    pctEl.textContent = '100%';
    el.classList.add('claude-dl-done');
}
async function runInstallBanner() {
    y_print(`<span class="claude-scope">+</span> <span class="b">${PKG.name}@${PKG.version}</span>`);
    await animateDownload('claude/core');
    await animateDownload('claude/tools');
    await thinking(2.5 + Math.random() * 1.8, 'Booting');
    makeLoader(0);
    await delay(1200);
    makeLoader('rm');
    showAscii();
    await delay(650);
    print(`<div class="claude-panel"><span class="claude-tree">\u2514\u2500</span> <span class="green b">${PKG.name}@${PKG.version}</span> <span class="claude-dim">${escapeHtml(PKG.desc)}</span></div>`);
}
async function claudeInstallTool(name) {
    if (!name) { e_print('usage: claude install &lt;tool&gt;'); tip_print('example: claude install linter-mcp'); return; }
    _await('claude-install-tool');
    y_print(`<span class="claude-scope">+</span> installing <span class="b">${escapeHtml(name)}</span>`);
    await animateDownload(`registry/${name}`);
    await thinking(2.2 + Math.random() * 1.2, `Wiring up ${name}`);
    makeLoader(0);
    await delay(1100);
    makeLoader('rm');
    const t = ensureClaudeShape();
    if (!t.installedTools.includes(name)) t.installedTools.push(name);
    saveClaude();
    g_print(`<span class="b">${escapeHtml(name)}</span> ready \u2014 use it from <span class="light-blue">claude tools</span>`);
    c_placeholder('');
    unawait();
}

// ---- workspace projects and tool metadata ------------------------------------
function defaultClaudeProjects() {
    return [
        { id: 'commerce-web', name: 'commerce-web', stack: 'Next.js · TypeScript', branch: 'main', status: 'synced', files: 184, deploy: 'production' },
        { id: 'api-platform', name: 'api-platform', stack: 'Node.js · PostgreSQL', branch: 'feature/rate-limits', status: 'synced', files: 96, deploy: 'staging' },
        { id: 'mobile-app', name: 'mobile-app', stack: 'React Native · Expo', branch: 'release/2.4', status: 'needs review', files: 211, deploy: 'preview' },
        { id: 'docs-site', name: 'docs-site', stack: 'Astro · MDX', branch: 'main', status: 'synced', files: 73, deploy: 'production' }
    ];
}
function activeProject() {
    const t = ensureClaudeShape();
    return t.projects.find((project) => project.id === t.activeProject) || t.projects[0];
}
function projectLabel(project) {
    return `${project.name} · ${project.stack} · ${project.branch}`;
}
const TOOL_DEFS = [
    { id: 'Read', desc: 'read a file from the workspace', color: 'light-blue' },
    { id: 'Write', desc: 'create a new file', color: 'green' },
    { id: 'Edit', desc: 'apply a diff to an existing file', color: 'yellow' },
    { id: 'Bash', desc: 'run a shell command', color: 'coral' },
    { id: 'Grep', desc: 'search file contents', color: 'muted-teal' },
    { id: 'Glob', desc: 'find files by pattern', color: 'muted-purple' },
    { id: 'WebSearch', desc: 'search the web for current answers', color: 'blue' },
    { id: 'WebFetch', desc: 'read a linked page or API reference', color: 'light-blue' },
    { id: 'Task', desc: 'delegate a focused investigation', color: 'muted-purple' },
    { id: 'TodoWrite', desc: 'track a visible execution checklist', color: 'yellow' },
    { id: 'Git', desc: 'inspect branches, diffs, and commits', color: 'coral' },
    { id: 'Test', desc: 'run targeted checks and test suites', color: 'green' },
    { id: 'Deploy', desc: 'create a preview or production deployment', color: 'blue' },
    { id: 'Database', desc: 'inspect schemas and draft migrations', color: 'muted-teal' },
    { id: 'Browser', desc: 'exercise and inspect a running app', color: 'light-blue' },
    { id: 'MCP', desc: 'use connected workspace integrations', color: 'muted-purple' }
];
// the rotating "verbs" claude code flashes next to the spinner while it works —
// keeps the wait honest without saying the same word every time
const CLAUDE_VERBS = [
    'Accomplishing', 'Actioning', 'Actualizing', 'Baking', 'Booping', 'Brewing', 'Calculating', 'Cerebrating',
    'Channelling', 'Churning', 'Clauding', 'Coalescing', 'Cogitating', 'Combobulating', 'Computing', 'Concocting',
    'Conjuring', 'Considering', 'Contemplating', 'Cooking', 'Crafting', 'Creating', 'Crunching', 'Deciphering',
    'Deliberating', 'Determining', 'Discombobulating', 'Divining', 'Effecting', 'Elucidating', 'Enchanting',
    'Envisioning', 'Fabricating', 'Finagling', 'Forging', 'Forming', 'Frolicking', 'Generating', 'Germinating',
    'Hatching', 'Herding', 'Honking', 'Hypothesizing', 'Ideating', 'Imagining', 'Incubating', 'Inferring',
    'Manifesting', 'Marinating', 'Meandering', 'Metamorphosing', 'Moseying', 'Mulling', 'Mustering', 'Musing',
    'Noodling', 'Percolating', 'Perusing', 'Philosophising', 'Pondering', 'Pontificating', 'Processing',
    'Puttering', 'Puzzling', 'Reticulating', 'Ruminating', 'Scheming', 'Schlepping', 'Shimmying', 'Simmering',
    'Smooshing', 'Spelunking', 'Spinning', 'Stewing', 'Summoning', 'Synthesizing', 'Tinkering', 'Transmuting',
    'Unfurling', 'Unravelling', 'Vibing', 'Wandering', 'Whirring', 'Wibbling', 'Wizarding', 'Wrangling'
];
function randomVerb(exclude) {
    if (CLAUDE_VERBS.length < 2) return CLAUDE_VERBS[0];
    let verb;
    do { verb = CLAUDE_VERBS[Math.floor(Math.random() * CLAUDE_VERBS.length)]; } while (verb === exclude);
    return verb;
}
function gerund(verb) {
    if (/ing$/i.test(verb)) return verb;
    if (/[^aeiou]e$/i.test(verb)) return verb.slice(0, -1) + 'ing';
    return verb + 'ing';
}

// ---- claude-code style render helpers ---------------------------------------
function toolLine(name, args) {
    return `<div class="g-3 claude-tool"><span class="claude-bullet">\u23FA</span> <span class="claude-tool-name">${escapeHtml(name)}</span><span class="claude-tool-args">(${escapeHtml(args)})</span></div>`;
}

function toolResult(text, tone) {
    return `<div class="g-3 claude-tool-result${tone ? ' ' + tone : ''}"><span class="claude-elbow">\u23BF</span> <span>${escapeHtml(text)}</span></div>`;
}

async function thinking(seconds, label) {
    const glyphs = ['\u2736', '\u273B', '\u273D', '\u273A', '\u2733', '\u2739'];
    const id = 'think-' + Math.random().toString(36).slice(2);
    let verb = label || randomVerb();
    let tokens = Math.round(20 + Math.random() * 40);
    appendOutput(`<div class="g-3 claude-thinking" id="${id}"><span class="claude-spin">${glyphs[0]}</span> <span class="claude-dim claude-think-verb">${escapeHtml(verb)}\u2026</span> <span class="claude-think-meta">(0.0s \u00B7 esc to interrupt)</span></div>`);
    const el = document.getElementById(id);
    const spin = el.querySelector('.claude-spin');
    const verbEl = el.querySelector('.claude-think-verb');
    const meta = el.querySelector('.claude-think-meta');
    let i = 0, t = 0, sinceSwitch = 0;
    const tickMs = 220;
    const totalMs = Math.max(1000, seconds * 1000);
    const switchEvery = 1800 + Math.random() * 900;
    const iv = setInterval(() => {
        i = (i + 1) % glyphs.length;
        spin.textContent = glyphs[i];
        t += tickMs;
        sinceSwitch += tickMs;
        tokens += Math.round(5 + Math.random() * 25);
        if (sinceSwitch >= switchEvery && t < totalMs - 450) {
            verb = randomVerb(verb);
            verbEl.textContent = verb + '\u2026';
            sinceSwitch = 0;
        }
        meta.textContent = `(${(t / 1000).toFixed(1)}s \u00B7 ${tokens} tokens \u00B7 esc to interrupt)`;
    }, tickMs);
    await delay(totalMs);
    clearInterval(iv);
    el.remove();
}
async function workStep(label, logs, opts = {}) {
    const id = 'work-' + Math.random().toString(36).slice(2);
    const safeLogs = Array.isArray(logs) && logs.length ? logs : ['working'];
    appendOutput(`<div class="g-3 claude-work-card" id="${id}">
        <div class="claude-work-title"><span class="claude-work-label">${escapeHtml(label)}</span><span class="claude-work-state">queued</span></div>
        <div class="claude-work-bar"><span class="claude-work-fill"></span></div>
        <div class="claude-work-log">${escapeHtml(safeLogs[0])}</div>
    </div>`);
    const el = document.getElementById(id);
    const fill = el.querySelector('.claude-work-fill');
    const state = el.querySelector('.claude-work-state');
    const log = el.querySelector('.claude-work-log');
    const hold = opts.hold ?? 520;
    for (let i = 0; i < safeLogs.length; i++) {
        state.textContent = i === 0 ? 'starting' : 'running';
        log.textContent = safeLogs[i];
        fill.style.width = `${Math.round(((i + .65) / safeLogs.length) * 100)}%`;
        await delay(hold + Math.random() * 320);
    }
    fill.style.width = '100%';
    state.textContent = opts.done || 'done';
    el.classList.add('done');
    await delay(280);
}
function updateTodoPanel(todos) {
    appendOutput(`<div class="g-3">${todoPanel(todos)}</div>`);
}
function advanceTodo(todos, index) {
    todos.forEach((todo, i) => {
        todo.done = i < index;
        todo.active = i === index;
    });
    updateTodoPanel(todos);
}
const TOOL_LOGS = {
    Read: ['Scanning related files', 'Tracing references', 'Reading target file'],
    Write: ['Sketching file structure', 'Writing new file', 'Formatting output'],
    Edit: ['Scanning related files', 'Drafting the change', 'Applying edit'],
    Bash: ['Preparing environment', 'Running command', 'Collecting output'],
    Grep: ['Searching the codebase', 'Ranking matches', 'Compiling findings'],
    Glob: ['Walking the file tree', 'Matching patterns', 'Indexing results'],
    Test: ['Preparing test environment', 'Running test suite', 'Collecting results'],
    Deploy: ['Building artifacts', 'Running pre-flight checks', 'Staging release'],
    Database: ['Inspecting schema', 'Drafting migration', 'Checking reversibility']
};
function diffStats(lines) {
    const added = lines.filter((l) => l.type === 'add').length;
    const removed = lines.filter((l) => l.type === 'del').length;
    const parts = [];
    if (added) parts.push(`${added} addition${added === 1 ? '' : 's'}`);
    if (removed) parts.push(`${removed} removal${removed === 1 ? '' : 's'}`);
    return parts.join(' and ') || 'no line changes';
}
function diffPanel(filename, lines) {
    const rows = lines.map((l) => {
        const sign = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
        const cls = l.type === 'add' ? 'claude-diff-add' : l.type === 'del' ? 'claude-diff-del' : 'claude-diff-ctx';
        return `<div class="claude-diff-row ${cls}"><span class="claude-diff-num">${l.num ?? ''}</span><span class="claude-diff-sign">${sign}</span><span class="claude-diff-text">${escapeHtml(l.text)}</span></div>`;
    }).join('');
    return `<div class="claude-diff-panel"><div class="claude-diff-file">${escapeHtml(filename)}</div>${rows}</div>`;
}
function todoPanel(todos) {
    const rows = todos.map((td) => {
        const mark = td.done ? '\u2612' : '\u2610';
        const cls = td.done ? 'done' : td.active ? 'active' : 'pending';
        return `<div class="claude-todo-item ${cls}"><span class="claude-todo-mark">${mark}</span><span class="claude-todo-text">${escapeHtml(td.text)}</span></div>`;
    }).join('');
    return `<div class="claude-todo"><div class="claude-todo-title">Update Todos</div>${rows}</div>`;
}

// flat choice prompt (manual section 17 — package-local implementation)
function claudeChoicePrompt(choices, opts = {}) {
    return new Promise((resolve) => {
        _await('claude-choice');
        let idx = 0, armed = false;
        const id = 'choice-' + Math.random().toString(36).slice(2);
        appendOutput(`<div class="claude-choice-wrap" id="${id}">
            ${opts.title ? `<div class="claude-choice-title">${escapeHtml(opts.title)}</div>` : ''}
            <div class="choices claude-choices"></div>
        </div>`);
        const wrap = document.getElementById(id);
        const listEl = wrap.querySelector('.choices');
        function render() {
            listEl.innerHTML = choices.map((c, i) =>
                `<div class="choice ${c.color || 'light-blue'}${i === idx ? ' selected' : ''}" data-i="${i}"> &gt; ${escapeHtml(c.label)} ${c.hint ? `<span class="claude-dim">${escapeHtml(c.hint)}</span>` : ''}</div>`
            ).join('');
        }
        render();
        warning('\u2191\u2193 move \u00B7 enter pick \u00B7 esc/backspace cancel');
        setTimeout(() => { armed = true; }, 90);
        function cleanup() {
            document.removeEventListener('keydown', onKey, true);
            wrap.removeEventListener('click', onClick);
            c_placeholder('');
            unawait();
        }
        function finish(v) { cleanup(); resolve(v); }
        function onKey(e) {
            if (!armed) return;
            if (e.key === 'Escape') { e.preventDefault(); finish(null); return; }
            if (e.key === 'Backspace' && !db_ui.input.value) { e.preventDefault(); finish(null); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + choices.length) % choices.length; render(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % choices.length; render(); return; }
            if (e.key === 'Enter') { e.preventDefault(); finish(choices[idx]); }
        }
        function onClick(e) {
            const hit = e.target.closest('.choice');
            if (hit) finish(choices[Number(hit.dataset.i)]);
        }
        document.addEventListener('keydown', onKey, true);
        wrap.addEventListener('click', onClick);
    });
}

// ---- project task sessions ---------------------------------------------------
function taskProfile(prompt, project) {
    const text = prompt.toLowerCase();
    if (/test|spec|coverage/.test(text)) return { verb: 'Verify', file: 'src/features/checkout.spec.ts', command: 'npm test -- --runInBand', summary: 'a focused test plan and test preview', tool: 'Test' };
    if (/review|audit|security|bug/.test(text)) return { verb: 'Review', file: 'src/security/review-notes.md', command: 'npm run lint && npm run test', summary: 'a code-quality review with prioritized findings', tool: 'Grep' };
    if (/deploy|release|publish/.test(text)) return { verb: 'Release', file: '.github/workflows/release.yml', command: 'npm run build', summary: 'a release checklist and deployment preview', tool: 'Deploy' };
    if (/database|migration|sql|schema/.test(text)) return { verb: 'Design', file: 'db/migrations/next_migration.sql', command: 'npm run db:check', summary: 'a migration plan with a reversible schema preview', tool: 'Database' };
    if (/doc|readme|explain/.test(text)) return { verb: 'Document', file: 'docs/implementation-notes.md', command: 'npm run docs:check', summary: 'documentation and an implementation outline', tool: 'Write' };
    return { verb: 'Build', file: 'src/features/workspace/task.ts', command: 'npm test -- --related', summary: 'an implementation plan and edit preview', tool: 'Edit' };
}
function addHistory(role, text, projectId) {
    const t = ensureClaudeShape();
    t.history.unshift({ role, text, projectId: projectId || t.activeProject, at: Date.now() });
    t.history = t.history.slice(0, 30);
}
function projectCard(project, active) {
    return `<div class="claude-project-card${active ? ' active' : ''}">
        <div class="claude-project-title"><span>${escapeHtml(project.name)}</span><span class="${project.status === 'synced' ? 'green' : 'yellow'}"><span class="claude-status-dot"></span>${escapeHtml(project.status)}</span></div>
        <div class="claude-project-meta">${escapeHtml(project.stack)} · ${escapeHtml(project.branch)} · ${project.files} files · ${escapeHtml(project.deploy)}</div>
    </div>`;
}
function showProjectOverview() {
    const t = ensureClaudeShape();
    const project = activeProject();
    appendOutput(`<div class="g-3">${projectCard(project, true)}</div>`);
    print(`<div class="claude-command-grid">
        <div class="claude-command"><code>claude ask &lt;task&gt;</code><br><span class="claude-dim">start work in ${escapeHtml(project.name)}</span></div>
        <div class="claude-command"><code>claude project &lt;name&gt;</code><br><span class="claude-dim">switch cloud projects</span></div>
        <div class="claude-command"><code>claude review</code><br><span class="claude-dim">inspect the active branch</span></div>
        <div class="claude-command"><code>claude deploy preview</code><br><span class="claude-dim">prepare a preview release</span></div>
    </div>`);
    if (t.history.length) print(`<span class="claude-dim">latest activity:</span> ${escapeHtml(t.history[0].text)}`);
}
async function runClaudeTask(prompt, mode) {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) { e_print('Tell Claude what you want to do.'); tip_print('example: claude ask add a searchable orders view and tests'); return; }
    const t = ensureClaudeShape();
    const project = activeProject();
    const profile = taskProfile(cleanPrompt, project);
    _await('claude-task');
    try {
        appendOutput(`<div class="g-3 claude-user-msg"><span class="claude-user-caret">${escapeHtml(project.name)} &gt;</span> <span>${escapeHtml(cleanPrompt)}</span></div>`);
        addHistory('user', cleanPrompt, project.id);
        await thinking(4.5 + Math.random() * 2.5, gerund(profile.verb) + ' ' + project.name);
        const todos = [
            { text: `Map ${project.name} and relevant files`, done: false, active: true },
            { text: `${profile.verb} the requested change`, done: false, active: false },
            { text: 'Validate the result and summarize next steps', done: false, active: false }
        ];
        appendOutput(`<div class="g-3">${todoPanel(todos)}</div>`);
        appendOutput(toolLine('Glob', `${project.name}/**/*`));
        await delay(1200 + Math.random() * 700);
        appendOutput(toolResult(`Indexed ${project.files} workspace files`));
        todos[0].done = true; todos[0].active = false; todos[1].active = true;
        appendOutput(`<div class="g-3">${todoPanel(todos)}</div>`);
        await thinking(2.5 + Math.random() * 1.8);
        appendOutput(toolLine(profile.tool, profile.file));
        await workStep(`${profile.verb} ${project.name}`, TOOL_LOGS[profile.tool] || ['Working through the change'], { hold: 900, done: 'ready for review' });
        const diffLines = [
            { type: 'ctx', num: 1, text: `// ${project.name}: requested task` },
            { type: 'add', num: 2, text: `// ${cleanPrompt.slice(0, 64)}` },
            { type: 'add', num: 3, text: `export const taskStatus = '${mode === 'plan' ? 'planned' : 'ready for review'}';` }
        ];
        appendOutput(toolResult(`Updated ${profile.file} with ${diffStats(diffLines)}`, 'ok'));
        appendOutput(`<div class="g-3">${diffPanel(profile.file, diffLines)}</div>`);
        let approved = mode === 'plan' || t.autoApprove || t.permissionMode === 'allow';
        if (!approved) {
            const choice = await claudeChoicePrompt([
                { label: 'Keep preview', hint: 'review without applying', color: 'light-blue' },
                { label: 'Approve session', hint: 'allow this session', color: 'green' },
                { label: 'Cancel', hint: 'stop here', color: 'red' }
            ], { title: `Approve ${profile.verb.toLowerCase()} preview for ${project.name}?` });
            if (!choice || choice.label === 'Cancel') {
                todos[1].active = false; t.todos = todos; saveClaude(); e_print('Task stopped; preview remains visible.'); return;
            }
            approved = choice.label === 'Approve session';
        }
        appendOutput(toolResult(approved ? 'Session approval recorded; changes are ready to apply.' : 'Preview retained for your review.', approved ? 'ok' : ''));
        todos[1].done = true; todos[1].active = false; todos[2].active = true;
        appendOutput(`<div class="g-3">${todoPanel(todos)}</div>`);
        await thinking(1.8 + Math.random() * 1.2);
        appendOutput(toolLine('Bash', profile.command));
        await delay(1400 + Math.random() * 800);
        appendOutput(`<div class="g-3 claude-bash-out"><span class="green">CHECKED</span> ${escapeHtml(project.name)}<br><span class="claude-dim">Scope: ${escapeHtml(profile.file)} · branch: ${escapeHtml(project.branch)}</span></div>`);
        todos[2].done = true; todos[2].active = false; t.todos = todos;
        appendOutput(`<div class="g-3">${todoPanel(todos)}</div>`);
        await delay(700);
        const outcome = `${profile.verb} prepared ${profile.summary} for ${project.name}.`;
        appendOutput(`<div class="g-3 claude-final"><span class="claude-bullet">\u23FA</span> ${escapeHtml(outcome)} Use <span class="claude-inline-code">claude diff</span> to revisit the preview, or continue with another <span class="claude-inline-code">claude ask</span> task.</div>`);
        appendOutput(`<div class="g-3 claude-dim claude-status-line">\u23F5\u23F5 ${t.autoApprove ? 'auto-accept edits on' : 'accept edits: confirm each change'} <span class="claude-kbd">shift+tab</span> to cycle \u00B7 <span class="claude-kbd">${escapeHtml(t.model)}</span></div>`);
        addHistory('assistant', outcome, project.id);
        saveClaude();
    } catch (e) {
        e_print(escapeHtml(e.message || String(e)));
    } finally {
        c_placeholder('');
        unawait();
    }
}

// ---- home / help / status ----------------------------------------------------
async function claudeHome() {
    const t = ensureClaudeShape();
    if (typeof renderCliTabs !== 'function') {
        claudeStatus();
        tip_print('upgrade shell for tabs');
        return;
    }
    const pick = await renderCliTabs([
        { id: 'workspace', label: 'workspace', content: () => `<span class="claude-dim">${PKG.version}</span> · active cloud project: <span class="light-blue">${escapeHtml(activeProject().name)}</span><br><span class="claude-dim">Type</span> <span class="claude-inline-code">claude ask &lt;what you want to do&gt;</span> <span class="claude-dim">at any time.</span>`, items: [
            { id: 'overview', name: 'open workspace', flavor: projectLabel(activeProject()), color: 'light-blue' },
            { id: 'task', name: 'start a task', flavor: 'type a request in the shell', color: 'green' },
            { id: 'clear', name: 'clear activity', flavor: `${t.history.length} entries`, color: 'muted-teal' }
        ] },
        { id: 'projects', label: 'projects', content: '<span class="claude-dim">Cloud projects · select one to make it active</span>', items: () => t.projects.map((project) => ({ id: project.id, name: project.name, flavor: `${project.stack} · ${project.branch}`, color: project.id === t.activeProject ? 'green' : 'light-blue' })) },
        { id: 'actions', label: 'actions', content: '<span class="claude-dim">Common project workflows</span>', items: [
            { id: 'plan', name: 'plan a feature', flavor: 'write a task plan from your prompt', color: 'light-blue' },
            { id: 'review', name: 'review active branch', flavor: 'inspect quality and risks', color: 'yellow' },
            { id: 'test', name: 'run verification', flavor: 'targeted test and check flow', color: 'green' },
            { id: 'deploy', name: 'create preview release', flavor: 'prepare a deployment checklist', color: 'coral' },
            { id: 'diff', name: 'inspect current preview', flavor: 'show the most recent activity', color: 'muted-purple' }
        ] },
        { id: 'tools', label: 'tools', content: '<span class="claude-dim">Built-in and installed tools available to this workspace</span>', items: TOOL_DEFS.map((td) => ({ id: td.id, name: td.id, flavor: td.desc, color: td.color })) },
        { id: 'settings', label: 'settings', content: '<span class="claude-dim">session preferences</span>', items: [
            { id: 'auto-approve', name: 'auto-approve previews', flavor: t.autoApprove ? 'on' : 'off', color: t.autoApprove ? 'green' : 'red' },
            { id: 'permissions', name: 'permission mode', flavor: t.permissionMode, color: t.permissionMode === 'allow' ? 'green' : 'yellow' },
            { id: 'model', name: 'model', flavor: t.model, color: 'light-blue' }
        ] }
    ], { title: 'claude cloud', initial: 'workspace' });

    if (!pick) return;
    if (pick.tab.id === 'workspace' && pick.item?.id === 'overview') { showProjectOverview(); return; }
    if (pick.tab.id === 'workspace' && pick.item?.id === 'task') { tip_print(`type <span class="light-blue">claude ask &lt;what you want to do&gt;</span> for <span class="green">${escapeHtml(activeProject().name)}</span>`); return; }
    if (pick.tab.id === 'workspace' && pick.item?.id === 'clear') { t.history = []; saveClaude(); g_print('activity cleared'); return; }
    if (pick.tab.id === 'projects' && pick.item) { await selectClaudeProject(pick.item.id); return; }
    if (pick.tab.id === 'actions' && pick.item) { await runClaudeAction(pick.item.id); return; }
    if (pick.tab.id === 'settings' && pick.item?.id === 'auto-approve') { t.autoApprove = !t.autoApprove; saveClaude(); g_print(`auto-approve previews <span class="${t.autoApprove ? 'green' : 'red'}">${t.autoApprove ? 'on' : 'off'}</span>`); return; }
    if (pick.tab.id === 'settings' && pick.item?.id === 'permissions') { t.permissionMode = t.permissionMode === 'ask' ? 'allow' : 'ask'; saveClaude(); g_print(`permission mode <span class="yellow">${escapeHtml(t.permissionMode)}</span>`); return; }
    if (pick.tab.id === 'settings' && pick.item?.id === 'model') { t.model = t.model === 'Sonnet 5' ? 'Opus 5' : t.model === 'Opus 5' ? 'Haiku 5' : 'Sonnet 5'; saveClaude(); g_print(`model <span class="light-blue">${escapeHtml(t.model)}</span>`); return; }
    if (pick.tab.id === 'tools' && pick.item) print(`<span class="${pick.item.color} b">${escapeHtml(pick.item.name)}</span>  <span class="claude-dim">${escapeHtml(pick.item.flavor || '')}</span>`);
}
async function selectClaudeProject(name) {
    const t = ensureClaudeShape();
    const key = String(name || '').trim().toLowerCase();
    const project = t.projects.find((item) => item.id.toLowerCase() === key || item.name.toLowerCase() === key);
    if (!project) { e_print(`project not found: ${escapeHtml(name)}`); tip_print('run <span class="light-blue">claude project</span> to see available projects'); return; }
    t.activeProject = project.id;
    addHistory('system', `Switched to ${project.name}`, project.id);
    saveClaude();
    g_print(`active cloud project <span class="green b">${escapeHtml(project.name)}</span>`);
    appendOutput(`<div class="g-3">${projectCard(project, true)}</div>`);
    tip_print(`type <span class="light-blue">claude ask &lt;what you want to do&gt;</span> to work in ${escapeHtml(project.name)}`);
}
async function runClaudeAction(action) {
    const project = activeProject();
    if (action === 'diff') { claudeShowHistory(true); return; }
    const prompts = {
        plan: `Plan the next feature for ${project.name}`,
        review: `Review the active branch for correctness, security, and maintainability`,
        test: `Run targeted verification for the active branch`,
        deploy: `Prepare a preview deployment with release notes`
    };
    await runClaudeTask(prompts[action] || `Investigate ${action}`, action === 'plan' ? 'plan' : 'action');
}
function claudeShowProjects() {
    const t = ensureClaudeShape();
    print('<div class="claude-section-label">cloud projects</div>');
    t.projects.forEach((project) => appendOutput(`<div class="g-3">${projectCard(project, project.id === t.activeProject)}</div>`));
    tip_print('switch with <span class="light-blue">claude project &lt;name&gt;</span> · create with <span class="light-blue">claude new &lt;name&gt;</span>');
}
function claudeCreateProject(name) {
    const cleanName = String(name || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!cleanName) { e_print('usage: claude new <project-name>'); return; }
    const t = ensureClaudeShape();
    if (t.projects.some((project) => project.id === cleanName)) { e_print('a cloud project with that name already exists'); return; }
    const project = { id: cleanName, name: cleanName, stack: 'TypeScript · Cloud workspace', branch: 'main', status: 'synced', files: 0, deploy: 'not deployed' };
    t.projects.push(project); t.activeProject = project.id; addHistory('system', `Created ${project.name}`, project.id); saveClaude();
    g_print(`created and selected cloud project <span class="green b">${escapeHtml(project.name)}</span>`);
    tip_print('start with <span class="light-blue">claude ask scaffold the first feature</span>');
}
function claudeHelp() {
    print('<br><span class="muted-teal b">claude</span> <span class="claude-dim">commands</span>');
    print('<span class="claude-dim">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</span>');
    print('  <span class="light-blue">claude</span>                         cloud workspace tabs');
    print('  <span class="light-blue">claude ask &lt;task&gt;</span>              work on the active project');
    print('  <span class="light-blue">claude project [name]</span>           list or switch cloud projects');
    print('  <span class="light-blue">claude new &lt;name&gt;</span>              add a cloud project');
    print('  <span class="light-blue">claude plan &lt;task&gt;</span>             prepare a plan without approval');
    print('  <span class="light-blue">claude review | test | deploy</span>    project workflows');
    print('  <span class="light-blue">claude diff | files | history</span>    inspect workspace activity');
    print('  <span class="light-blue">claude context | mcp | doctor</span>    inspect workspace readiness');
    print('  <span class="light-blue">claude install &lt;tool&gt;</span>          add an integration');
    print('  <span class="light-blue">claude todo | tools | status</span>    session information');
    print('  <span class="light-blue">claude model | permissions</span>      configure the session');
    print('  <span class="light-blue">claude setup</span>                   re-run install banner');
    tip_print('aliases: <span class="light-blue">cc</span> \u00B7 <span class="light-blue">cd claude</span> for shell');
}
function claudeStatus() {
    const t = ensureClaudeShape();
    const project = activeProject();
    print(`<div class="claude-panel">
        <div><span class="claude-dim">pkg</span>            <span class="green b">${PKG.name}@${PKG.version}</span></div>
        <div><span class="claude-dim">project</span>        <span class="green">${escapeHtml(project.name)}</span> <span class="claude-dim">(${escapeHtml(project.branch)})</span></div>
        <div><span class="claude-dim">model</span>          <span class="light-blue">${escapeHtml(t.model)}</span></div>
        <div><span class="claude-dim">approval</span>       <span class="${t.autoApprove ? 'green' : 'yellow'}">${t.autoApprove ? 'automatic' : escapeHtml(t.permissionMode)}</span></div>
        <div><span class="claude-dim">activity</span>       <span class="muted-teal">${t.history.length} entries</span></div>
    </div>`);
}
function claudeShowTodos() {
    const t = ensureClaudeShape();
    if (!t.todos.length) {
        print('<span class="claude-dim">no task checklist yet — start with</span> <span class="light-blue">claude ask &lt;task&gt;</span>');
        return;
    }
    appendOutput(`<div class="g-3">${todoPanel(t.todos)}</div>`);
}
function claudeShowTools() {
    const t = ensureClaudeShape();
    print('<span class="claude-dim">tools available to this cloud workspace</span>');
    TOOL_DEFS.forEach((td) => {
        print(`  <span class="${td.color} b">${escapeHtml(td.id)}</span>  <span class="claude-dim">${escapeHtml(td.desc)}</span>`);
    });
    if (t.installedTools.length) print(`<span class="claude-dim">installed integrations:</span> <span class="green">${escapeHtml(t.installedTools.join(', '))}</span>`);
}
function claudeShowHistory(previewOnly) {
    const t = ensureClaudeShape();
    const project = activeProject();
    const entries = t.history.filter((entry) => entry.projectId === project.id);
    if (!entries.length) { print(`<span class="claude-dim">no activity for ${escapeHtml(project.name)} yet</span>`); return; }
    print(`<div class="claude-section-label">${previewOnly ? 'current preview' : 'activity'} · ${escapeHtml(project.name)}</div>`);
    entries.slice(0, 10).forEach((entry) => print(`<div class="claude-panel"><span class="${entry.role === 'user' ? 'light-blue' : entry.role === 'system' ? 'muted-teal' : 'green'}">${escapeHtml(entry.role)}</span> <span class="claude-dim">${escapeHtml(entry.text)}</span></div>`));
}
function claudeShowContext() {
    const project = activeProject();
    print(`<div class="claude-panel">
        <div><span class="claude-dim">workspace</span>      <span class="green">${escapeHtml(project.name)}</span></div>
        <div><span class="claude-dim">stack</span>          ${escapeHtml(project.stack)}</div>
        <div><span class="claude-dim">branch</span>         <span class="light-blue">${escapeHtml(project.branch)}</span></div>
        <div><span class="claude-dim">deployment</span>     ${escapeHtml(project.deploy)}</div>
        <div><span class="claude-dim">indexed context</span> ${project.files} files</div>
    </div>`);
}
function claudeShowMcp() {
    const t = ensureClaudeShape();
    print('<div class="claude-section-label">connected integrations</div>');
    ['workspace filesystem', 'git provider', 'browser inspector'].concat(t.installedTools).forEach((tool) => {
        print(`<div class="claude-panel"><span class="green">●</span> ${escapeHtml(tool)} <span class="claude-dim">ready</span></div>`);
    });
}
function claudeDoctor() {
    const project = activeProject();
    print(`<div class="claude-bash-out"><span class="green">✓</span> project selected: ${escapeHtml(project.name)}<br><span class="green">✓</span> branch context: ${escapeHtml(project.branch)}<br><span class="green">✓</span> tools available: ${TOOL_DEFS.length}<br><span class="green">✓</span> cloud session ready</div>`);
}

async function setupDialogue() {
    _await('claude');
    try {
        await runInstallBanner();
        tip_print('<span class="light-blue">claude</span> · <span class="light-blue">claude ask &lt;task&gt;</span> · <span class="light-blue">claude project</span> · <span class="light-blue">claude help</span>');
    } catch (e) {
        e_print(escapeHtml(e.message || String(e)));
    } finally {
        markSetupShown();
        c_placeholder('');
        unawait();
    }
}

async function handleClaude(_args, cmd_split) {
    ensureClaudeShape();
    const action = (cmd_split[1] || '').toLowerCase();
    const value = cmd_split.slice(2).join(' ').trim();
    if (!action || action === 'home') { await claudeHome(); return; }
    if (action === 'help' || action === 'h' || action === '?') { claudeHelp(); return; }
    if (action === 'status' || action === 'info') { claudeStatus(); return; }
    if (action === 'setup') { await setupDialogue(); return; }
    if (action === 'ask' || action === 'work' || action === 'run') { await runClaudeTask(value, 'task'); return; }
    if (action === 'plan') { await runClaudeTask(value, 'plan'); return; }
    if (action === 'review' || action === 'test' || action === 'deploy') { await runClaudeAction(action); return; }
    if (action === 'project' || action === 'projects') { if (value) await selectClaudeProject(value); else claudeShowProjects(); return; }
    if (action === 'new' || action === 'create') { claudeCreateProject(value); return; }
    if (action === 'install') { await claudeInstallTool(cmd_split.slice(2).join(' ')); return; }
    if (action === 'todo' || action === 'todos') { claudeShowTodos(); return; }
    if (action === 'tools') { claudeShowTools(); return; }
    if (action === 'history' || action === 'activity' || action === 'diff') { claudeShowHistory(action === 'diff'); return; }
    if (action === 'files') { const project = activeProject(); print(`<div class="claude-panel"><span class="light-blue b">${escapeHtml(project.name)}</span><br><span class="claude-dim">src/ · tests/ · docs/ · .github/ · ${project.files} indexed files</span></div>`); return; }
    if (action === 'context') { claudeShowContext(); return; }
    if (action === 'mcp' || action === 'integrations') { claudeShowMcp(); return; }
    if (action === 'doctor') { claudeDoctor(); return; }
    if (action === 'model') { const t = ensureClaudeShape(); if (value) t.model = value; else t.model = t.model === 'Sonnet 5' ? 'Opus 5' : t.model === 'Opus 5' ? 'Haiku 5' : 'Sonnet 5'; saveClaude(); g_print(`model <span class="light-blue">${escapeHtml(t.model)}</span>`); return; }
    if (action === 'permissions') { const t = ensureClaudeShape(); t.permissionMode = value === 'allow' ? 'allow' : t.permissionMode === 'ask' ? 'allow' : 'ask'; saveClaude(); g_print(`permission mode <span class="yellow">${escapeHtml(t.permissionMode)}</span>`); return; }
    if (action === 'clear') { const t = ensureClaudeShape(); t.history = []; t.todos = []; saveClaude(); g_print('workspace activity cleared'); return; }
    await runClaudeTask(cmd_split.slice(1).join(' '), 'task');
}
PKG.tags.forEach((tag) => _reg(tag, handleClaude));

(async function bootClaude() {
    ensureClaudeShape();
    if (shouldShowSetup()) {
        await setupDialogue();
    } else {
        tip_print('claude cloud loaded — try <span class="light-blue">claude</span> or <span class="light-blue">claude ask &lt;task&gt;</span>');
    }
})();
