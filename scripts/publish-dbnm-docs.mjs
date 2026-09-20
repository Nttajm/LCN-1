#!/usr/bin/env node
/**
 * Publish DBNM docs from dbnm/docs/docs-data.js to Firestore (LCN editor).
 *
 * Auth (pick one):
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   - gcloud auth application-default login (uses ADC)
 *
 * Or use the browser publisher: /index/publish-dbnm-docs.html
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDbnmDocs } from './lib/load-dbnm-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const PROJECT_ID = 'lcnfoundation-registry';

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const data = loadDbnmDocs();

    if (dryRun) {
        console.log(`[dry-run] Would publish ${data.pages.length} pages to collection ${data.collectionId}`);
        console.log(`[dry-run] Overview: ${data.overviewId}`);
        data.pages.forEach((p) => console.log(`  - ${p.id}: ${p.title}`));
        return;
    }

    let admin;
    try {
        admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
    } catch {
        console.error('firebase-admin not found. Run: npm install --prefix functions');
        process.exit(1);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: PROJECT_ID
        });
    }

    const db = admin.firestore();
    const TS = admin.firestore.FieldValue.serverTimestamp;
    const colId = data.collectionId;
    const tree = data.buildTree();

    console.log(`Publishing ${data.pages.length} pages to ${PROJECT_ID}…`);

    for (const page of data.pages) {
        const ref = db.collection('editor_docs').doc(page.id);
        const snap = await ref.get();
        const payload = {
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
            collectionId: colId,
            role: page.role || 'page',
            listOn: page.listOn || { projects: false, development: false, updates: false },
            updatedAt: TS()
        };
        if (!snap.exists) payload.createdAt = TS();
        await ref.set(payload, { merge: true });
        console.log(`  ✓ ${page.id}`);
    }

    const colRef = db.collection('editor_doc_collections').doc(colId);
    const colSnap = await colRef.get();
    const colPayload = {
        title: data.collectionTitle || 'DBNM',
        overviewId: data.overviewId,
        tree,
        updatedAt: TS()
    };
    if (!colSnap.exists) colPayload.createdAt = TS();
    await colRef.set(colPayload, { merge: true });

    console.log(`Done. Open /index/doc.html?v=${encodeURIComponent(data.overviewId)} after deploy.`);
}

main().catch((err) => {
    console.error(err.message || err);
    console.error('\nTip: sign in via /index/publish-dbnm-docs.html if you lack service-account credentials.');
    process.exit(1);
});
