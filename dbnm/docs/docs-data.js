/**
 * DBNM documentation content (Mozilla / MDN-style).
 * Shared by the static docs viewer and the LCN editor publisher.
 */
(function (root) {
    var DATE = '2026-09-20';
    var GOTO = '/dbnm';
    var COLLECTION_ID = 'dbnm_cli_guide';
    var CATEGORY = 'projects';
    var SUBCATEGORY = 'docs';

    function page(partial) {
        return Object.assign({
            subDesc: '',
            goToUrl: GOTO,
            date: DATE,
            category: CATEGORY,
            subCategory: SUBCATEGORY,
            images: ['a_home_assets/content/dbnm/s_1.png'],
            published: true,
            listOn: { projects: false, development: false, updates: false },
            role: 'page',
            content: ''
        }, partial);
    }

    var pages = [
        page({
            id: 'dbnm_doc_overview',
            title: 'DBNM documentation',
            navLabel: 'Overview',
            role: 'overview',
            listOn: { projects: true, development: false, updates: false },
            subDesc: 'Browser shell for LCN — CLI, modules, and tools.',
            content:
                '<p><strong>DBNM</strong> is a browser-based command shell that runs at <code>/dbnm</code>. ' +
                'It behaves like a lightweight terminal: you type commands, load modules, manage variables, ' +
                'and connect databases — all without leaving the page.</p>' +
                '<p>This guide covers the <strong>CLI</strong> and the main <strong>tools</strong> you install as modules. ' +
                'Demo-only packages (for example Claude Code demos) are intentionally omitted.</p>' +
                '<h2>What you can do</h2>' +
                '<ul>' +
                '<li>Run built-in commands such as <code>help</code>, <code>settings</code>, <code>var</code>, and <code>/ info</code>.</li>' +
                '<li>Download modules from base packages, foundation packages, or remote URLs.</li>' +
                '<li>Use tools like the registry, PaKeger vault, Textos messenger, and the database manager.</li>' +
                '</ul>' +
                '<h2>Quick start</h2>' +
                '<ol>' +
                '<li>Open <a href="/dbnm">lcnjoel.com/dbnm</a>.</li>' +
                '<li>Set a username with <code>/user set Your Name</code>.</li>' +
                '<li>List commands with <code>help</code>.</li>' +
                '<li>Install the joke module: <code>/ i ** funny</code>, then run <code>joke</code>.</li>' +
                '</ol>' +
                '<h2>Version</h2>' +
                '<p>Current shell version is reported by <code>/ info</code> (for example <code>1.4.7</code>). ' +
                'Always check <code>/ info</code> before following version-specific notes.</p>' +
                '<blockquote><p><strong>Note:</strong> DBNM stores session data in the browser (local storage). ' +
                'Clearing site data or running <code>clear</code> resets your local shell state.</p></blockquote>'
        }),

        page({
            id: 'dbnm_doc_shell',
            title: 'Using the DBNM shell',
            navLabel: 'Using the shell',
            section: 'getting-started',
            subDesc: 'Prompt, directories, input, and how commands are parsed.',
            content:
                '<p>The shell is the blank output area plus the input line at the bottom. ' +
                'When no username is set, the prompt looks like <code>$</code>. After you set a name it becomes <code>Name ~ $</code>.</p>' +
                '<h2>Entering commands</h2>' +
                '<p>Type a command and press <strong>Enter</strong>. DBNM splits on spaces. ' +
                'The first token is the command; the rest are arguments.</p>' +
                '<pre><code>help\n/ info\nvar theme dark</code></pre>' +
                '<h2>Directories (cd)</h2>' +
                '<p>Some modules register a <em>directory</em> so you can enter a focused mode:</p>' +
                '<pre><code>cd textos\ncd..</code></pre>' +
                '<p><code>cd &lt;command&gt;</code> only works when that name is already a registered command. ' +
                '<code>cd..</code> (or <code>/</code> / <code>r</code> in some flows) returns to the main shell. ' +
                'While inside a directory, bare commands are prefixed with that directory name automatically.</p>' +
                '<h2>Suggestions and tips</h2>' +
                '<p>Enable command suggestions with:</p>' +
                '<pre><code>settings suggestions on</code></pre>' +
                '<p>Or open the interactive settings UI with <code>settings</code> and toggle items with the arrow keys.</p>' +
                '<h2>Reload and clear</h2>' +
                '<ul>' +
                '<li><code>r</code> — reload the page.</li>' +
                '<li><code>clear</code> — wipe DBNM local storage keys and reload (username, modules, vars, databases).</li>' +
                '</ul>'
        }),

        page({
            id: 'dbnm_doc_username',
            title: 'Set your username',
            navLabel: 'Username',
            section: 'getting-started',
            subDesc: 'Personalize the prompt and /info output.',
            content:
                '<p>Your username is a local label for the shell session. It is not an account login.</p>' +
                '<h2>Set a single-word name</h2>' +
                '<pre><code>local username Joel</code></pre>' +
                '<h2>Set a name with spaces</h2>' +
                '<pre><code>/user set Joel Mulonde</code></pre>' +
                '<p>Everything after <code>set</code> becomes the username — quotes are not required.</p>' +
                '<h2>Check the current name</h2>' +
                '<pre><code>local u\n/user get\n/ info</code></pre>' +
                '<p>If unset, DBNM shows <code>user</code> or <code>user::&lt;sessionId&gt;</code> in <code>/ info</code>.</p>' +
                '<h2>Where it is stored</h2>' +
                '<p>Username lives in <code>localStorage</code> under <code>dbnm_userData</code> with your session id and loaded modules. ' +
                'It persists across refresh on the same browser, but is not synced across devices.</p>'
        }),

        page({
            id: 'dbnm_doc_commands',
            title: 'Built-in CLI commands',
            navLabel: 'Command reference',
            section: 'cli',
            subDesc: 'Core commands available before you install modules.',
            content:
                '<p>Run <code>help</code> anytime to list every registered command in the current session ' +
                '(built-ins plus anything modules have registered with <code>_reg</code>).</p>' +
                '<h2>Discovery and UI</h2>' +
                '<table><thead><tr><th>Command</th><th>Purpose</th></tr></thead><tbody>' +
                '<tr><td><code>help</code></td><td>List registered commands</td></tr>' +
                '<tr><td><code>tabs</code></td><td>Interactive tabbed CLI panel (status / commands)</td></tr>' +
                '<tr><td><code>settings</code> / <code>setting</code></td><td>Toggle suggestions, tips, and other flags</td></tr>' +
                '<tr><td><code>hello</code></td><td>Greeting plus link to these docs</td></tr>' +
                '</tbody></table>' +
                '<h2>Session and system</h2>' +
                '<table><thead><tr><th>Command</th><th>Purpose</th></tr></thead><tbody>' +
                '<tr><td><code>/ info</code></td><td>Version, description, author, user, session id</td></tr>' +
                '<tr><td><code>/ user set|get</code></td><td>Username helpers</td></tr>' +
                '<tr><td><code>local username|u</code></td><td>Local username helpers</td></tr>' +
                '<tr><td><code>clear</code></td><td>Reset local DBNM data and reload</td></tr>' +
                '<tr><td><code>r</code></td><td>Reload the page</td></tr>' +
                '<tr><td><code>time</code> / <code>time full</code> / <code>time live</code></td><td>Clock helpers</td></tr>' +
                '<tr><td><code>rand &lt;from&gt; &lt;to&gt;</code></td><td>Random integer in range</td></tr>' +
                '<tr><td><code>url &lt;address&gt;</code></td><td>Open a URL</td></tr>' +
                '<tr><td><code>print …</code> / <code>calc …</code></td><td>Print text or evaluate a simple expression</td></tr>' +
                '</tbody></table>' +
                '<h2>Slash package commands</h2>' +
                '<p>The <code>/</code> command manages imports and package listings (see <em>Install modules</em>):</p>' +
                '<pre><code>/ i ** funny\n/ i burl https://example.com/tool.js\n/ dir\n/ dir info 0\n/ rm funny\n/ rm by index 0</code></pre>'
        }),

        page({
            id: 'dbnm_doc_vars',
            title: 'Variables',
            navLabel: 'Variables',
            section: 'cli',
            subDesc: 'Store key/value pairs with the var command.',
            content:
                '<p>DBNM keeps a global variable map in your session (<code>dbnm_vars</code>). ' +
                'Tools such as PaKeger and Textos can read or write these values.</p>' +
                '<h2>Create or update</h2>' +
                '<pre><code>var apiKey sk_test_123\nvar theme dark</code></pre>' +
                '<h2>Read one key</h2>' +
                '<pre><code>var apiKey</code></pre>' +
                '<h2>List all</h2>' +
                '<pre><code>var vars</code></pre>' +
                '<h2>Update or delete by index</h2>' +
                '<p>After <code>var vars</code>, each entry is numbered. Use that index:</p>' +
                '<pre><code>var 0 update new-value\nvar 0 delete</code></pre>' +
                '<blockquote><p>Object-style values are allowed when tools write them (for example a Firebase config object linked through the database manager).</p></blockquote>'
        }),

        page({
            id: 'dbnm_doc_settings',
            title: 'Settings',
            navLabel: 'Settings',
            section: 'cli',
            subDesc: 'Suggestions, tips, and the settings UI.',
            content:
                '<p>Open the settings panel:</p>' +
                '<pre><code>settings</code></pre>' +
                '<p>Use ← → to switch tabs and ↑ ↓ to select an item, then Enter to toggle.</p>' +
                '<h2>Direct toggles</h2>' +
                '<pre><code>settings suggestions on\nsettings suggestions off\nsettings tips on\nsettings tips off</code></pre>' +
                '<p>Check a single setting:</p>' +
                '<pre><code>settings suggestions</code></pre>' +
                '<p>When suggestions are on, the input line offers matching commands and common subcommands as you type.</p>'
        }),

        page({
            id: 'dbnm_doc_install',
            title: 'Install and download modules',
            navLabel: 'Install modules',
            section: 'modules',
            subDesc: 'Load base, foundation, registry, and remote scripts — with the joke module as the example.',
            content:
                '<p>Modules are JavaScript packages that register new commands when they load. ' +
                'The standard way to install them is the slash import command:</p>' +
                '<pre><code>/ i &lt;class&gt; &lt;name&gt;</code></pre>' +
                '<h2>Example: joke module (funny)</h2>' +
                '<p>The joke tool ships as the base module file <code>public/base-modules/funny.js</code>. ' +
                'It registers the <code>joke</code> command.</p>' +
                '<pre><code>/ i ** funny</code></pre>' +
                '<p>After it loads, run:</p>' +
                '<pre><code>joke</code></pre>' +
                '<p>Each run prints a random joke to the shell output.</p>' +
                '<h2>Module classes</h2>' +
                '<table><thead><tr><th>Class</th><th>Alias</th><th>Resolved path</th><th>Example</th></tr></thead><tbody>' +
                '<tr><td><code>**</code></td><td><code>base</code></td><td><code>public/base-modules/&lt;name&gt;.js</code></td><td><code>/ i ** funny</code></td></tr>' +
                '<tr><td><code>f</code></td><td><code>foundation</code></td><td><code>foundation/&lt;name&gt;.js</code></td><td><code>/ i f registry</code></td></tr>' +
                '<tr><td><code>**svr</code></td><td>—</td><td><code>servers/&lt;name&gt;.js</code></td><td>server add-ons</td></tr>' +
                '<tr><td><code>burl</code></td><td>—</td><td>any https URL</td><td><code>/ i burl example.com/tool.js</code></td></tr>' +
                '<tr><td><code>reg</code></td><td>—</td><td>published registry package</td><td><code>reg i funny</code></td></tr>' +
                '</tbody></table>' +
                '<h2>Remote URL import</h2>' +
                '<pre><code>/ i burl https://cdn.example.com/my-tool.js</code></pre>' +
                '<p>The host must allow CORS for script loads. DBNM stores the URL and reloads it on later sessions.</p>' +
                '<h2>Other useful base / foundation modules</h2>' +
                '<ul>' +
                '<li><code>/ i ** pakeger</code> — PaKeger key vault (<code>pak</code>)</li>' +
                '<li><code>/ i ** kernal</code> — Kernal package manager demo tool</li>' +
                '<li><code>/ i f registry</code> — cloud registry (<code>reg</code>)</li>' +
                '<li><code>/ i f textos</code> — Textos messenger (<code>textos</code> / <code>tx</code>)</li>' +
                '</ul>'
        }),

        page({
            id: 'dbnm_doc_packages',
            title: 'Manage loaded packages',
            navLabel: 'Manage packages',
            section: 'modules',
            subDesc: 'List, inspect, and remove modules with / dir and / rm.',
            content:
                '<p>Every successful <code>/ i …</code> appends an entry to your loaded package list (<code>userData.cmdUtil</code>).</p>' +
                '<h2>List packages</h2>' +
                '<pre><code>/ dir</code></pre>' +
                '<p>Each line shows an index and name. Failed loads appear highlighted.</p>' +
                '<h2>Inspect package contents</h2>' +
                '<pre><code>/ dir info 0</code></pre>' +
                '<p>If the module registered a manifest via <code>registerPkgContents</code>, DBNM prints version, description, and file tree. ' +
                'For the joke module after install, the link name is <code>funny</code>.</p>' +
                '<h2>Remove a package</h2>' +
                '<pre><code>/ rm funny\n/ rm by index 0</code></pre>' +
                '<p>Removal updates local storage. Reload (<code>r</code>) if a command from that module still appears registered in memory.</p>' +
                '<h2>Clear all utils</h2>' +
                '<pre><code>x dir</code></pre>' +
                '<p>Empties the package list without wiping username or vars (unlike <code>clear</code>).</p>'
        }),

        page({
            id: 'dbnm_doc_registry',
            title: 'Registry',
            navLabel: 'Registry',
            section: 'modules',
            subDesc: 'Publish and install shared packages with reg.',
            content:
                '<p>The foundation <strong>registry</strong> module connects DBNM to the <code>dbnm-lcn</code> cloud project so you can publish scripts and install them by name.</p>' +
                '<h2>Install the registry module</h2>' +
                '<pre><code>/ i f registry</code></pre>' +
                '<h2>Sign in and status</h2>' +
                '<pre><code>reg login\nreg status\nreg logout</code></pre>' +
                '<h2>Install a published package</h2>' +
                '<p>Use the joke package name as the download example (publishers upload <code>funny.js</code>; installers run):</p>' +
                '<pre><code>reg i funny</code></pre>' +
                '<p>Then run the registered command:</p>' +
                '<pre><code>joke</code></pre>' +
                '<h2>Publish and update</h2>' +
                '<pre><code>reg publish\nreg update</code></pre>' +
                '<p>Publish uploads a local module file for others to install with <code>reg i &lt;name&gt;</code>. ' +
                'Update overwrites an existing package you own. Registry info:</p>' +
                '<pre><code>registry info</code></pre>'
        }),

        page({
            id: 'dbnm_doc_database',
            title: 'Database manager',
            navLabel: 'Database manager',
            section: 'tools',
            subDesc: 'Create databases and bind Firebase, Supabase, MongoDB, Appwrite, or the LCN foundation server.',
            content:
                '<p>The database manager is built into the shell (aliases <code>database</code>, <code>db</code>, <code>dbmgr</code>). ' +
                'It keeps named database entries locally and can bind each one to an external server config.</p>' +
                '<h2>Help and listing</h2>' +
                '<pre><code>database help\ndatabase list\ndatabase status</code></pre>' +
                '<h2>Create and select</h2>' +
                '<pre><code>database create myapp\ndatabase select myapp\ndatabase use 0</code></pre>' +
                '<h2>Connect a server</h2>' +
                '<pre><code>database server\ndatabase server firebase\ndatabase server supabase\ndatabase server mongodb\ndatabase server appwrite\ndatabase server default</code></pre>' +
                '<p><code>database server default</code> (or <code>foundation</code>) attaches the free LCN foundation server. ' +
                'Provider-specific commands open a paste flow for config snippets or connection URIs.</p>' +
                '<h2>Link a global var as config</h2>' +
                '<pre><code>var fbConfig {…}\ndatabase server global fbConfig</code></pre>' +
                '<h2>Server vars</h2>' +
                '<pre><code>database var\ndatabase var key value\ndatabase var key delete</code></pre>' +
                '<h2>Remove a database</h2>' +
                '<pre><code>database rm myapp</code></pre>'
        }),

        page({
            id: 'dbnm_doc_pakeger',
            title: 'PaKeger key vault',
            navLabel: 'PaKeger',
            section: 'tools',
            subDesc: 'AES-256-GCM vault, GenCode, and PAKK vars.',
            content:
                '<p><strong>PaKeger</strong> is a base module that adds a key vault and helpers for sealing text with DeScript (AES-256-GCM).</p>' +
                '<h2>Install</h2>' +
                '<pre><code>/ i ** pakeger</code></pre>' +
                '<h2>Commands</h2>' +
                '<pre><code>pak help\npak new\npak keys\npak gencode\npak encrypt\npak decrypt\npak key add\npak key rm &lt;id&gt;</code></pre>' +
                '<p>Aliases: <code>pakeger</code>, <code>paKeger</code>. Short forms include <code>pak e</code> / <code>pak d</code> for encrypt / decrypt.</p>' +
                '<h2>Export keys to DBNM vars</h2>' +
                '<pre><code>pak var export home-lock\npak var export all\npak var import mySecret home-lock</code></pre>' +
                '<p>Exported secrets appear as <code>PAKK.&lt;id&gt;</code> in <code>var vars</code>.</p>' +
                '<h2>Clipboard prompt</h2>' +
                '<p>After generating material, PaKeger may ask to copy to the clipboard (<code>y</code> / <code>n</code> / <code>ne</code> to never ask). Reset with:</p>' +
                '<pre><code>pak clip reset</code></pre>'
        }),

        page({
            id: 'dbnm_doc_textos',
            title: 'Textos messenger',
            navLabel: 'Textos',
            section: 'tools',
            subDesc: 'Rooms, keys, and messaging over a bound database.',
            content:
                '<p><strong>Textos</strong> is a foundation messenger module. Install it, bind a database, then create or join rooms.</p>' +
                '<h2>Install and enter</h2>' +
                '<pre><code>/ i f textos\ncd textos</code></pre>' +
                '<p>Aliases: <code>textos</code>, <code>tx</code>. Use <code>cd..</code> to leave the Textos shell.</p>' +
                '<h2>Setup</h2>' +
                '<pre><code>textos setup\ntextos status</code></pre>' +
                '<p>Setup binds Textos to a database created with the database manager (Firebase-backed rooms are the common path).</p>' +
                '<h2>Rooms</h2>' +
                '<pre><code>textos create my-room\ntextos join &lt;id&gt; [key] [password]\ntextos ls\ntextos save\ntextos unsave\ntextos leave</code></pre>' +
                '<h2>Send messages</h2>' +
                '<pre><code>textos send hello from dbnm</code></pre>' +
                '<p>Inside a room you can also type into the room input bar when the UI is active.</p>' +
                '<h2>Local see-through key</h2>' +
                '<pre><code>textos key\ntextos key &lt;secret-or-var&gt;</code></pre>'
        }),

        page({
            id: 'dbnm_doc_kernal',
            title: 'Kernal package manager',
            navLabel: 'Kernal',
            section: 'tools',
            subDesc: 'Simulated package install workflow registered by the kernal module.',
            content:
                '<p><strong>Kernal</strong> is a base module that demonstrates a package-manager style CLI inside DBNM.</p>' +
                '<h2>Install</h2>' +
                '<pre><code>/ i ** kernal</code></pre>' +
                '<h2>Usage</h2>' +
                '<pre><code>kernal\nkernal i nas.min.pkg\nkernal list\nkernal info nas.min.pkg\nkernal remove nas.min.pkg\nkernal update</code></pre>' +
                '<p>Running <code>kernal</code> with no arguments prints the usage summary. ' +
                'Install flows show staged progress messages and a loader while they complete.</p>'
        }),

        page({
            id: 'dbnm_doc_workflow',
            title: 'Example workflow',
            navLabel: 'Example workflow',
            section: 'guides',
            subDesc: 'A short end-to-end session using the joke module and common tools.',
            content:
                '<p>This walkthrough uses the <strong>joke</strong> module as the download example and touches the CLI tools you will use most often.</p>' +
                '<h2>1. Open DBNM and identify yourself</h2>' +
                '<pre><code>/user set Joel\n/ info</code></pre>' +
                '<h2>2. Turn on suggestions</h2>' +
                '<pre><code>settings suggestions on</code></pre>' +
                '<h2>3. Download the joke module</h2>' +
                '<pre><code>/ i ** funny\njoke</code></pre>' +
                '<h2>4. Confirm it is loaded</h2>' +
                '<pre><code>/ dir\n/ dir info 0</code></pre>' +
                '<h2>5. Save a variable</h2>' +
                '<pre><code>var favoriteModule funny\nvar vars</code></pre>' +
                '<h2>6. Optional: pull the same package from the registry</h2>' +
                '<pre><code>/ i f registry\nreg i funny\njoke</code></pre>' +
                '<h2>7. Clean up</h2>' +
                '<pre><code>/ rm funny</code></pre>' +
                '<p>Or wipe the entire local shell state:</p>' +
                '<pre><code>clear</code></pre>'
        })
    ];

    var sections = [
        { id: 'getting-started', title: 'Getting started' },
        { id: 'cli', title: 'CLI' },
        { id: 'modules', title: 'Modules' },
        { id: 'tools', title: 'Tools' },
        { id: 'guides', title: 'Guides' }
    ];

    root.DBNM_DOCS = {
        collectionId: COLLECTION_ID,
        collectionTitle: 'DBNM',
        overviewId: 'dbnm_doc_overview',
        date: DATE,
        goToUrl: GOTO,
        category: CATEGORY,
        subCategory: SUBCATEGORY,
        sections: sections,
        pages: pages,
        buildTree: function () {
            var bySection = {};
            sections.forEach(function (s) { bySection[s.id] = []; });
            var overviewNode = { type: 'page', id: 'dbnm_doc_overview' };
            var tree = [overviewNode];
            pages.forEach(function (p) {
                if (p.role === 'overview') return;
                if (p.section && bySection[p.section]) {
                    bySection[p.section].push({ type: 'page', id: p.id });
                } else {
                    tree.push({ type: 'page', id: p.id });
                }
            });
            sections.forEach(function (s) {
                if (!bySection[s.id].length) return;
                tree.push({
                    type: 'section',
                    id: 'sec_dbnm_' + s.id.replace(/-/g, ''),
                    title: s.title,
                    listOn: { projects: false, development: s.id === 'guides', updates: false },
                    children: bySection[s.id]
                });
            });
            return tree;
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
