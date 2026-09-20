#!/usr/bin/env node
/**
 * Publish DBNM docs to the LCN editor Firestore collections.
 *
 * Usage:
 *   FIREBASE_ID_TOKEN="<token from browser auth>" node scripts/publish-dbnm-docs.mjs
 *
 * Or open /index/publish-dbnm-docs.html while signed into the editor (preferred).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'dbnm/docs/docs-data.js');
const PROJECT = 'lcnfoundation-registry';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function loadDocsData() {
    const source = fs.readFileSync(dataPath, 'utf8');
    const sandbox = { window: {}, globalThis: {} };
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'docs-data.js' });
    const data = sandbox.DBNM_DOCS || sandbox.window.DBNM_DOCS;
    if (!data) throw new Error('DBNM_DOCS missing from docs-data.js');
    return data;
}

function toFirestoreValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: String(value) };
        return { doubleValue: value };
    }
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFirestoreValue) } };
    }
    if (typeof value === 'object') {
        const fields = {};
        Object.keys(value).forEach((k) => {
            fields[k] = toFirestoreValue(value[k]);
        });
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

function toDocFields(obj) {
    const fields = {};
    Object.keys(obj).forEach((k) => {
        fields[k] = toFirestoreValue(obj[k]);
    });
    return fields;
}

async function upsert(token, collection, id, fields) {
    const url = `${BASE}/${collection}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${collection}/${id}: ${res.status} ${text}`);
    }
    return res.json();
}

async function main() {
    const token = process.env.FIREBASE_ID_TOKEN || process.env.LCN_FIREBASE_ID_TOKEN;
    if (!token) {
        console.error('Set FIREBASE_ID_TOKEN (Firebase Auth ID token) before running.');
        console.error('Preferred: open /index/publish-dbnm-docs.html while signed in.');
        process.exit(1);
    }

    const DATA = loadDocsData();
    const tree = DATA.buildTree();
    console.log(`Publishing ${DATA.pages.length} pages to collection ${DATA.collectionId}…`);

    for (const page of DATA.pages) {
        const fields = toDocFields({
            title: page.title,
            navLabel: page.navLabel || page.title,
            subDesc: page.subDesc || '',
            goToUrl: page.goToUrl || '/dbnm',
            date: page.date || '',
            category: page.category || 'projects',
            subCategory: page.subCategory || 'docs',
            content: page.content || '',
            images: page.images || [],
            published: true,
            collectionId: DATA.collectionId,
            role: page.role || 'page',
            listOn: page.listOn || { projects: false, development: false, updates: false }
        });
        await upsert(token, 'editor_docs', page.id, fields);
        console.log('  page', page.id);
    }

    await upsert(token, 'editor_doc_collections', DATA.collectionId, toDocFields({
        title: DATA.collectionTitle || 'DBNM',
        overviewId: DATA.overviewId,
        tree
    }));
    console.log('  collection', DATA.collectionId);
    console.log('Done. Overview: /index/doc.html?v=' + DATA.overviewId);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
