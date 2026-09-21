'use strict';

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = 'lcnfoundation-registry';
const DOCS_COL = 'editor_docs';
const COLLECTIONS_COL = 'editor_doc_collections';
const HOME_DOC = { collection: 'home_layout', id: 'current' };

let db = null;

function resolveCredentialPath() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    }
    return path.join(__dirname, '..', 'serviceAccount.json');
}

function isServiceAccountJson(obj) {
    return !!(obj && obj.private_key && (obj.client_email || obj.project_id));
}

function initFirebase() {
    if (db) return db;

    if (!getApps().length) {
        const credPath = resolveCredentialPath();
        const hasFile = fs.existsSync(credPath);

        if (hasFile) {
            const raw = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            if (isServiceAccountJson(raw)) {
                initializeApp({
                    credential: cert(raw),
                    projectId: PROJECT_ID
                });
            } else {
                initializeApp({
                    credential: applicationDefault(),
                    projectId: PROJECT_ID
                });
            }
        } else {
            try {
                initializeApp({
                    credential: applicationDefault(),
                    projectId: PROJECT_ID
                });
            } catch (err) {
                throw new Error(
                    [
                        'Missing Firebase credentials for lcn-docs.',
                        '',
                        'One-time setup:',
                        '  1. Firebase Console → Project settings → Service accounts → Generate new private key',
                        '  2. Save as scripts/lcn-docs/serviceAccount.json (gitignored)',
                        '  3. cd scripts/lcn-docs && npm install',
                        '',
                        'Or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path.',
                        '',
                        'Detail: ' + (err && err.message ? err.message : String(err))
                    ].join('\n')
                );
            }
        }
    }

    db = getFirestore();
    return db;
}

function docsCol() {
    return initFirebase().collection(DOCS_COL);
}

function collectionsCol() {
    return initFirebase().collection(COLLECTIONS_COL);
}

function homeRef() {
    return initFirebase().collection(HOME_DOC.collection).doc(HOME_DOC.id);
}

function TS() {
    return FieldValue.serverTimestamp();
}

function deleteField() {
    return FieldValue.delete();
}

module.exports = {
    PROJECT_ID,
    DOCS_COL,
    COLLECTIONS_COL,
    initFirebase,
    docsCol,
    collectionsCol,
    homeRef,
    TS,
    deleteField,
    FieldValue
};
