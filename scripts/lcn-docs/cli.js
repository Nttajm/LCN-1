#!/usr/bin/env node
'use strict';

const docs = require('./lib/docs');
const collections = require('./lib/collections');
const home = require('./lib/home');

function printHelp() {
    console.log(`lcn-docs — manage LCN editor docs via Firestore (no browser)

Usage:
  node scripts/lcn-docs/cli.js <command> [args] [options]

Docs:
  list [--category <cat>] [--published|--draft] [--json]
  get <id> [--json]
  create [--title t] [--sub-desc s] [--go-to url] [--date YYYY-MM-DD]
         [--category c] [--sub-category s] [--nav-label n]
         [--images url,url] [--content-file path] [--json]
  update <id> [same flags as create] [--json]
  set-content <id> <file>
  publish <id>
  unpublish <id>
  delete <id> [--force]
  list-on <id> [--projects] [--development] [--updates]
               [--off-projects] [--off-development] [--off-updates]

Collections:
  collection list [--json]
  collection create <docId> [--title t]
  collection add-page <colId> [--section secId] [--title t]
  collection add-section <colId> --title t
  collection move <docId> <colId> [--section secId]
  collection dissolve <colId>

Home layout:
  home get [--json]
  home set [--featured id] [--side id,id] [--recent id,id,...]
           (use null/- for empty slots)

Setup:
  Save Firebase service-account JSON as scripts/lcn-docs/serviceAccount.json
  then: cd scripts/lcn-docs && npm install
`);
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const positional = [];
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--help' || a === '-h') {
            flags.help = true;
            continue;
        }
        if (a === '--json') {
            flags.json = true;
            continue;
        }
        if (a === '--published') {
            flags.published = true;
            continue;
        }
        if (a === '--draft') {
            flags.published = false;
            continue;
        }
        if (a === '--force') {
            flags.force = true;
            continue;
        }
        if (a === '--projects') {
            flags.projects = true;
            continue;
        }
        if (a === '--development') {
            flags.development = true;
            continue;
        }
        if (a === '--updates') {
            flags.updates = true;
            continue;
        }
        if (a === '--off-projects') {
            flags.offProjects = true;
            continue;
        }
        if (a === '--off-development') {
            flags.offDevelopment = true;
            continue;
        }
        if (a === '--off-updates') {
            flags.offUpdates = true;
            continue;
        }
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = args[i + 1];
            if (next == null || next.startsWith('--')) {
                flags[key] = true;
            } else {
                flags[key] = next;
                i += 1;
            }
            continue;
        }
        positional.push(a);
    }
    return { positional, flags };
}

function flagAliases(flags) {
    return {
        title: flags.title,
        subDesc: flags['sub-desc'] != null ? flags['sub-desc'] : flags.subDesc,
        goToUrl: flags['go-to'] != null ? flags['go-to'] : flags.goTo,
        date: flags.date,
        category: flags.category,
        subCategory: flags['sub-category'] != null ? flags['sub-category'] : flags.subCategory,
        navLabel: flags['nav-label'] != null ? flags['nav-label'] : flags.navLabel,
        images: flags.images,
        contentFile: flags['content-file'] != null ? flags['content-file'] : flags.contentFile,
        section: flags.section,
        featured: flags.featured,
        side: flags.side,
        recent: flags.recent,
        force: !!flags.force,
        json: !!flags.json,
        published: flags.published,
        projects: !!flags.projects,
        development: !!flags.development,
        updates: !!flags.updates,
        offProjects: !!flags.offProjects,
        offDevelopment: !!flags.offDevelopment,
        offUpdates: !!flags.offUpdates
    };
}

function printJson(data) {
    console.log(JSON.stringify(data, null, 2));
}

function printDocTable(rows) {
    if (!rows.length) {
        console.log('(no documents)');
        return;
    }
    const lines = rows.map((r) => {
        const pub = r.published ? 'published' : 'draft';
        const col = r.collectionId || '-';
        const cat = r.category || '-';
        return `${r.id}\t${pub}\t${cat}\t${col}\t${r.title || 'Untitled'}`;
    });
    console.log(['id', 'status', 'category', 'collection', 'title'].join('\t'));
    lines.forEach((l) => console.log(l));
}

async function run() {
    const { positional, flags } = parseArgs(process.argv);
    const opts = flagAliases(flags);

    if (flags.help) {
        printHelp();
        process.exit(0);
    }

    if (!positional.length) {
        printHelp();
        process.exit(1);
    }

    const cmd = positional[0];

    if (cmd === 'list') {
        const rows = await docs.listDocs({
            category: opts.category,
            published: opts.published
        });
        if (opts.json) printJson(rows);
        else printDocTable(rows);
        return;
    }

    if (cmd === 'get') {
        const id = positional[1];
        if (!id) throw new Error('Usage: get <id>');
        const row = await docs.getDoc(id);
        printJson(row);
        return;
    }

    if (cmd === 'create') {
        const created = await docs.createDoc(opts);
        if (opts.json) printJson(created);
        else console.log(created.id);
        return;
    }

    if (cmd === 'update') {
        const id = positional[1];
        if (!id) throw new Error('Usage: update <id> [flags]');
        const updated = await docs.updateDoc(id, opts);
        if (opts.json) printJson(updated);
        else console.log('updated ' + id);
        return;
    }

    if (cmd === 'set-content') {
        const id = positional[1];
        const file = positional[2];
        if (!id || !file) throw new Error('Usage: set-content <id> <file>');
        await docs.setContent(id, file);
        console.log('content set on ' + id);
        return;
    }

    if (cmd === 'publish') {
        const id = positional[1];
        if (!id) throw new Error('Usage: publish <id>');
        await docs.publishDoc(id);
        console.log('published ' + id);
        return;
    }

    if (cmd === 'unpublish') {
        const id = positional[1];
        if (!id) throw new Error('Usage: unpublish <id>');
        await docs.unpublishDoc(id);
        console.log('unpublished ' + id);
        return;
    }

    if (cmd === 'delete') {
        const id = positional[1];
        if (!id) throw new Error('Usage: delete <id> [--force]');
        const result = await docs.deleteDoc(id, { force: opts.force });
        if (opts.json) printJson(result);
        else console.log('deleted ' + id + (result.dissolved ? ' (collection dissolved)' : ''));
        return;
    }

    if (cmd === 'list-on') {
        const id = positional[1];
        if (!id) throw new Error('Usage: list-on <id> [--projects] [--development] [--updates] [--off-*]');
        const updated = await docs.setListOn(id, opts);
        if (opts.json) printJson(updated);
        else console.log('listOn updated on ' + id + ':', JSON.stringify(updated.listOn));
        return;
    }

    if (cmd === 'collection') {
        const sub = positional[1];
        if (!sub) throw new Error('Usage: collection <list|create|add-page|add-section|move|dissolve> ...');

        if (sub === 'list') {
            const rows = await collections.listCollections();
            if (opts.json) printJson(rows);
            else {
                if (!rows.length) console.log('(no collections)');
                else {
                    console.log(['id', 'overview', 'title'].join('\t'));
                    rows.forEach((r) => {
                        console.log([r.id, r.overviewId || '-', r.title || ''].join('\t'));
                    });
                }
            }
            return;
        }

        if (sub === 'create') {
            const docId = positional[2];
            if (!docId) throw new Error('Usage: collection create <docId> [--title t]');
            const result = await collections.createCollectionFromDoc(docId, { title: opts.title });
            if (opts.json) printJson(result);
            else console.log(result.collectionId);
            return;
        }

        if (sub === 'add-page') {
            const colId = positional[2];
            if (!colId) throw new Error('Usage: collection add-page <colId> [--section id] [--title t]');
            const result = await collections.addCollectionPage(colId, {
                title: opts.title,
                section: opts.section
            });
            if (opts.json) printJson(result);
            else console.log(result.id);
            return;
        }

        if (sub === 'add-section') {
            const colId = positional[2];
            if (!colId || !opts.title) throw new Error('Usage: collection add-section <colId> --title t');
            const result = await collections.addCollectionSection(colId, { title: opts.title });
            if (opts.json) printJson(result);
            else console.log(result.sectionId);
            return;
        }

        if (sub === 'move') {
            const docId = positional[2];
            const colId = positional[3];
            if (!docId || !colId) throw new Error('Usage: collection move <docId> <colId> [--section id]');
            const result = await collections.moveDocIntoCollection(docId, colId, opts.section || null);
            if (opts.json) printJson(result);
            else console.log(result.unchanged ? 'unchanged' : 'moved ' + docId + ' → ' + colId);
            return;
        }

        if (sub === 'dissolve') {
            const colId = positional[2];
            if (!colId) throw new Error('Usage: collection dissolve <colId>');
            const result = await collections.dissolveCollection(colId);
            if (opts.json) printJson(result);
            else console.log('dissolved ' + colId);
            return;
        }

        throw new Error('Unknown collection subcommand: ' + sub);
    }

    if (cmd === 'home') {
        const sub = positional[1];
        if (sub === 'get') {
            const layout = await home.getHomeLayout();
            printJson(layout);
            return;
        }
        if (sub === 'set') {
            const layout = await home.setHomeLayout({
                featured: opts.featured,
                side: opts.side,
                recent: opts.recent
            });
            if (opts.json) printJson(layout);
            else {
                console.log('home layout updated');
                printJson(layout);
            }
            return;
        }
        throw new Error('Usage: home get|set ...');
    }

    throw new Error('Unknown command: ' + cmd + '\nRun with --help for usage.');
}

run().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
