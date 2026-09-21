'use strict';

const { docsCol, collectionsCol, TS, deleteField } = require('./firebase');
const { generateId, generateSectionId } = require('./ids');
const { emptyListOn, listOnFromCategory, normalizeListOn } = require('./listOn');

function findSectionInTree(tree, sectionId) {
    const nodes = tree || [];
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].type === 'section' && nodes[i].id === sectionId) {
            return nodes[i];
        }
    }
    return null;
}

function findPageParent(tree, pageId) {
    const nodes = tree || [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === 'page' && node.id === pageId) {
            return { parent: nodes, index: i, sectionId: null };
        }
        if (node.type === 'section' && node.children) {
            for (let j = 0; j < node.children.length; j++) {
                if (node.children[j].type === 'page' && node.children[j].id === pageId) {
                    return { parent: node.children, index: j, sectionId: node.id };
                }
            }
        }
    }
    return null;
}

function collectPageIdsFromTree(tree, out) {
    out = out || [];
    (tree || []).forEach((node) => {
        if (!node) return;
        if (node.type === 'page' && node.id) out.push(node.id);
        if (node.type === 'section' && node.children) {
            collectPageIdsFromTree(node.children, out);
        }
    });
    return out;
}

function ensureOverviewFirst(tree, overviewId) {
    const next = (tree || []).slice();
    let overviewNode = null;
    const rest = [];
    next.forEach((node) => {
        if (node.type === 'page' && node.id === overviewId) overviewNode = node;
        else rest.push(node);
    });
    if (!overviewNode) overviewNode = { type: 'page', id: overviewId };
    return [overviewNode].concat(rest);
}

function stripPageFromTree(tree, pageId) {
    const next = [];
    (tree || []).forEach((node) => {
        if (node.type === 'page' && node.id === pageId) return;
        if (node.type === 'section') {
            next.push(
                Object.assign({}, node, {
                    children: (node.children || []).filter((c) => !(c.type === 'page' && c.id === pageId))
                })
            );
            return;
        }
        next.push(node);
    });
    return next;
}

function insertPageIntoTree(tree, overviewId, pageId, sectionId) {
    let next = ensureOverviewFirst(JSON.parse(JSON.stringify(tree || [])), overviewId);
    next = stripPageFromTree(next, pageId);
    const node = { type: 'page', id: pageId };
    if (sectionId) {
        const section = findSectionInTree(next, sectionId);
        if (!section) {
            next.push(node);
        } else {
            if (!section.children) section.children = [];
            section.children.push(node);
        }
    } else {
        next.push(node);
    }
    return ensureOverviewFirst(next, overviewId);
}

async function saveCollectionTree(colId, tree, extra) {
    const payload = Object.assign({ tree, updatedAt: TS() }, extra || {});
    await collectionsCol().doc(colId).update(payload);
}

async function getCollection(colId) {
    const snap = await collectionsCol().doc(colId).get();
    if (!snap.exists) return null;
    return Object.assign({ id: snap.id }, snap.data());
}

function serializeCollection(id, data) {
    const out = Object.assign({ id }, data || {});
    ['createdAt', 'updatedAt'].forEach((key) => {
        const v = out[key];
        if (v && typeof v.toDate === 'function') {
            out[key] = v.toDate().toISOString();
        } else if (v && v._seconds != null) {
            out[key] = new Date(v._seconds * 1000).toISOString();
        }
    });
    return out;
}

async function listCollections() {
    const snap = await collectionsCol().get();
    return snap.docs
        .map((d) => serializeCollection(d.id, d.data()))
        .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
}

async function createCollectionFromDoc(docId, opts) {
    const docRef = docsCol().doc(docId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Document not found: ' + docId);
    const doc = snap.data() || {};
    if (doc.collectionId) {
        throw new Error('Document is already in a collection: ' + doc.collectionId);
    }

    const colId = generateId();
    const title = ((opts && opts.title) || doc.title || 'Untitled').trim() || 'Untitled';
    const listOn = listOnFromCategory(doc.category || '');

    await collectionsCol().doc(colId).set({
        title,
        overviewId: docId,
        tree: [{ type: 'page', id: docId }],
        createdAt: TS(),
        updatedAt: TS()
    });

    await docRef.update({
        collectionId: colId,
        role: 'overview',
        navLabel: doc.navLabel || doc.title || 'Overview',
        listOn,
        updatedAt: TS()
    });

    return { collectionId: colId, overviewId: docId, title };
}

async function addCollectionPage(colId, opts) {
    const col = await getCollection(colId);
    if (!col) throw new Error('Collection not found: ' + colId);

    const overviewSnap = await docsCol().doc(col.overviewId).get();
    const overview = overviewSnap.exists ? overviewSnap.data() || {} : {};
    const pageId = generateId();
    const title = ((opts && opts.title) || 'Untitled').trim() || 'Untitled';
    const sectionId = (opts && opts.section) || null;

    const data = {
        title,
        navLabel: title,
        subDesc: '',
        goToUrl: '',
        date: '',
        category: overview.category || '',
        subCategory: overview.subCategory || '',
        content: '',
        images: [],
        published: false,
        collectionId: colId,
        role: 'page',
        listOn: emptyListOn(),
        createdAt: TS(),
        updatedAt: TS()
    };

    await docsCol().doc(pageId).set(data);

    let tree = JSON.parse(JSON.stringify(col.tree || []));
    tree = ensureOverviewFirst(tree, col.overviewId);
    const node = { type: 'page', id: pageId };
    if (sectionId) {
        const section = findSectionInTree(tree, sectionId);
        if (!section) tree.push(node);
        else {
            if (!section.children) section.children = [];
            section.children.push(node);
        }
    } else {
        tree.push(node);
    }
    await saveCollectionTree(colId, tree);
    return { id: pageId, collectionId: colId, sectionId: sectionId || null, title };
}

async function addCollectionSection(colId, opts) {
    const col = await getCollection(colId);
    if (!col) throw new Error('Collection not found: ' + colId);
    const title = ((opts && opts.title) || 'New Section').trim() || 'New Section';
    const sectionId = generateSectionId();

    let tree = JSON.parse(JSON.stringify(col.tree || []));
    tree = ensureOverviewFirst(tree, col.overviewId);
    tree.push({
        type: 'section',
        id: sectionId,
        title,
        listOn: emptyListOn(),
        children: []
    });
    await saveCollectionTree(colId, tree);
    return { sectionId, collectionId: colId, title };
}

async function moveDocIntoCollection(docId, targetColId, sectionId) {
    const docSnap = await docsCol().doc(docId).get();
    if (!docSnap.exists) throw new Error('Document not found: ' + docId);
    const doc = docSnap.data() || {};
    const targetCol = await getCollection(targetColId);
    if (!targetCol) throw new Error('Collection not found: ' + targetColId);

    if (doc.role === 'overview' || targetCol.overviewId === docId) {
        throw new Error('Cannot move overview page');
    }

    const sourceColId = doc.collectionId || null;
    const sourceCol = sourceColId ? await getCollection(sourceColId) : null;

    if (sourceColId === targetColId) {
        const currentParent = findPageParent(sourceCol.tree || [], docId);
        const currentSection = currentParent ? currentParent.sectionId : null;
        if ((currentSection || null) === (sectionId || null)) {
            return { unchanged: true };
        }
        const sameTree = insertPageIntoTree(sourceCol.tree || [], targetCol.overviewId, docId, sectionId || null);
        await saveCollectionTree(targetColId, sameTree);
        return { unchanged: false, collectionId: targetColId };
    }

    const writes = [];

    if (sourceColId && sourceCol) {
        const stripped = ensureOverviewFirst(
            stripPageFromTree(JSON.parse(JSON.stringify(sourceCol.tree || [])), docId),
            sourceCol.overviewId
        );
        writes.push(saveCollectionTree(sourceColId, stripped));
    }

    const targetTree = insertPageIntoTree(targetCol.tree || [], targetCol.overviewId, docId, sectionId || null);
    writes.push(saveCollectionTree(targetColId, targetTree));

    const docUpdate = {
        collectionId: targetColId,
        role: 'page',
        updatedAt: TS()
    };
    if (!doc.navLabel) docUpdate.navLabel = doc.title || 'Untitled';
    if (!doc.listOn) docUpdate.listOn = listOnFromCategory(doc.category || '');
    writes.push(docsCol().doc(docId).update(docUpdate));

    await Promise.all(writes);
    return { unchanged: false, collectionId: targetColId, sectionId: sectionId || null };
}

async function dissolveCollection(colId) {
    const col = await getCollection(colId);
    if (!col) throw new Error('Collection not found: ' + colId);
    const pageIds = collectPageIdsFromTree(col.tree || []);
    if (col.overviewId && pageIds.indexOf(col.overviewId) === -1) {
        pageIds.push(col.overviewId);
    }

    const db = collectionsCol().firestore;
    const batch = db.batch();
    pageIds.forEach((id) => {
        batch.update(docsCol().doc(id), {
            collectionId: deleteField(),
            role: deleteField(),
            updatedAt: TS()
        });
    });
    batch.delete(collectionsCol().doc(colId));
    await batch.commit();
    return { collectionId: colId, dissolved: true, pageIds };
}

module.exports = {
    findSectionInTree,
    findPageParent,
    collectPageIdsFromTree,
    ensureOverviewFirst,
    stripPageFromTree,
    insertPageIntoTree,
    saveCollectionTree,
    getCollection,
    listCollections,
    createCollectionFromDoc,
    addCollectionPage,
    addCollectionSection,
    moveDocIntoCollection,
    dissolveCollection,
    normalizeListOn
};
