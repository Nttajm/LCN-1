#!/usr/bin/env node
/**
 * Publish DBNM docs from dbnm/docs/docs-data.js to Firestore (LCN editor).
 *
 * Auth (pick one):
 *   - FIREBASE_ID_TOKEN or LCN_FIREBASE_ID_TOKEN (browser session ID token)
 *   - GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC (firebase-admin)
 *
 * Or open /index/publish-dbnm-docs.html while signed in (preferred in browser).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDbnmDocs } from './lib/load-dbnm-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const PROJECT_ID = 'lcnfoundation-registry';
const REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

async function upsertRest(token, collection, id, fields) {
    const url = `${REST_BASE}/${collection}/${encodeURIComponent(id)}`;
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

function pagePayloadRest(page, data) {
    return {
        title: page.title,
        navLabel: page.navLabel || page.title,
        subDesc: page.subDesc || '',
        goToUrl: page.goToUrl || '/dbnm',
        date: page.date || data.date || '',
        category: page.category || 'projects',
        subCategory: page.subCategory || 'docs',
        content: page.content || '',
        images: page.images || [],
        published: page.published !== false,
        collectionId: data.collectionId,
        role: page.role || 'page',
        listOn: page.listOn || { projects: false, development: false, updates: false }
    };
}

function pagePayloadAdmin(page, data, TS) {
    return {
        ...pagePayloadRest(page, data),
        updatedAt: TS()
    };
}

async function publishWithRest(token, data) {
    const tree = data.buildTree();
    console.log(`Publishing ${data.pages.length} pages to ${PROJECT_ID} (REST)…`);

    for (const page of data.pages) {
        await upsertRest(token, 'editor_docs', page.id, toDocFields(pagePayloadRest(page, data)));
        console.log(`  page ${page.id}`);
    }

    await upsertRest(token, 'editor_doc_collections', data.collectionId, toDocFields({
        title: data.collectionTitle || 'DBNM',
        overviewId: data.overviewId,
        tree
    }));
    console.log(`  collection ${data.collectionId}`);
}

async function publishWithAdmin(data) {
    let admin;
    try {
        admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
    } catch {
        throw new Error('firebase-admin not found. Run: npm install --prefix functions');
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: PROJECT_ID
        });
    }

    const db = admin.firestore();
    const TS = admin.firestore.FieldValue.serverTimestamp;
    const tree = data.buildTree();

    console.log(`Publishing ${data.pages.length} pages to ${PROJECT_ID} (admin SDK)…`);

    for (const page of data.pages) {
        const ref = db.collection('editor_docs').doc(page.id);
        const snap = await ref.get();
        const payload = pagePayloadAdmin(page, data, TS);
        if (!snap.exists) payload.createdAt = TS();
        await ref.set(payload, { merge: true });
        console.log(`  ✓ ${page.id}`);
    }

    const colRef = db.collection('editor_doc_collections').doc(data.collectionId);
    const colSnap = await colRef.get();
    const colPayload = {
        title: data.collectionTitle || 'DBNM',
        overviewId: data.overviewId,
        tree,
        updatedAt: TS()
    };
    if (!colSnap.exists) colPayload.createdAt = TS();
    await colRef.set(colPayload, { merge: true });
    console.log(`  ✓ collection ${data.collectionId}`);
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const data = loadDbnmDocs();

    if (dryRun) {
        console.log(`[dry-run] Would publish ${data.pages.length} pages to collection ${data.collectionId}`);
        console.log(`[dry-run] Overview: ${data.overviewId}`);
        data.pages.forEach((p) => console.log(`  - ${p.id}: ${p.title}`));
        return;
    }

    const token = process.env.FIREBASE_ID_TOKEN || process.env.LCN_FIREBASE_ID_TOKEN;

    if (token) {
        await publishWithRest(token, data);
    } else {
        await publishWithAdmin(data);
    }

    console.log(`Done. Open /index/doc.html?v=${encodeURIComponent(data.overviewId)} after deploy.`);
}

main().catch((err) => {
    console.error(err.message || err);
    console.error('\nTip: set FIREBASE_ID_TOKEN or use /index/publish-dbnm-docs.html in the browser.');
    process.exit(1);
});
