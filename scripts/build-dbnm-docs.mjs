#!/usr/bin/env node
/**
 * Merge dbnm/docs/howto/*.txt into docs-data.js (by manifest.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { txtToHtml } from './lib/dbnm-txt-to-html.mjs';
import { loadDbnmDocs, DOCS_DATA_PATH } from './lib/load-dbnm-docs.mjs';
import { writeDbnmDocs } from './lib/write-dbnm-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOWTO_DIR = path.resolve(__dirname, '../dbnm/docs/howto');
const MANIFEST_PATH = path.join(HOWTO_DIR, 'manifest.json');

function main() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const data = loadDbnmDocs();
    if (manifest.date) data.date = manifest.date;

    const byId = new Map(data.pages.map((p) => [p.id, p]));

    for (const entry of manifest.pages) {
        const filePath = path.resolve(HOWTO_DIR, entry.file);
        const raw = fs.readFileSync(filePath, 'utf8');
        const content = txtToHtml(raw);
        const base = {
            id: entry.id,
            title: entry.title,
            navLabel: entry.navLabel || entry.title,
            section: entry.section,
            subDesc: entry.subDesc || '',
            role: 'page',
            content,
            listOn: entry.listOn || { projects: false, development: entry.section === 'guides', updates: false }
        };

        if (entry.id === 'dbnm_doc_username_txt') {
            // Keep the canonical username page in sync with setuser.txt
            const canonical = byId.get('dbnm_doc_username');
            if (canonical) {
                Object.assign(canonical, {
                    title: base.title,
                    navLabel: 'Username',
                    subDesc: base.subDesc || canonical.subDesc,
                    content: base.content
                });
                continue;
            }
        }

        const existing = byId.get(entry.id);
        if (existing) {
            Object.assign(existing, base);
        } else {
            data.pages.push(base);
            byId.set(entry.id, base);
        }
    }

    writeDbnmDocs(data, DOCS_DATA_PATH);
    console.log(`Updated ${DOCS_DATA_PATH} (${data.pages.length} pages).`);
}

main();
