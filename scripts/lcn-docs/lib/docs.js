'use strict';

const { docsCol, collectionsCol, TS, deleteField } = require('./firebase');
const { generateId } = require('./ids');
const {
    loadContentFromFile,
    resolveSiteUrl,
    normalizeDateInput,
    parseImagesCsv
} = require('./content');
const {
    stripPageFromTree,
    ensureOverviewFirst,
    getCollection
} = require('./collections');

function serializeDoc(id, data) {
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

async function listDocs(opts) {
    const snap = await docsCol().get();
    let rows = snap.docs.map((d) => serializeDoc(d.id, d.data()));

    if (opts.category) {
        rows = rows.filter((r) => r.category === opts.category);
    }
    if (opts.published === true) {
        rows = rows.filter((r) => !!r.published);
    } else if (opts.published === false) {
        rows = rows.filter((r) => !r.published);
    }

    rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
    return rows;
}

async function getDoc(id) {
    const snap = await docsCol().doc(id).get();
    if (!snap.exists) {
        throw new Error('Document not found: ' + id);
    }
    return serializeDoc(snap.id, snap.data());
}

async function createDoc(opts) {
    const id = generateId();
    let content = '';
    if (opts.contentFile) {
        content = loadContentFromFile(opts.contentFile);
    } else if (opts.content != null) {
        content = String(opts.content);
    }

    const data = {
        title: (opts.title && String(opts.title).trim()) || 'Untitled',
        subDesc: opts.subDesc != null ? String(opts.subDesc) : '',
        goToUrl: resolveSiteUrl(opts.goToUrl || '') || '',
        date: normalizeDateInput(opts.date || ''),
        category: opts.category || '',
        subCategory: opts.subCategory || '',
        content,
        images: opts.images ? parseImagesCsv(opts.images) : [],
        published: false,
        createdAt: TS(),
        updatedAt: TS()
    };

    if (opts.navLabel) data.navLabel = String(opts.navLabel).trim();

    await docsCol().doc(id).set(data);
    return { id, ...data, createdAt: undefined, updatedAt: undefined };
}

async function updateDoc(id, opts) {
    const ref = docsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new Error('Document not found: ' + id);
    }
    const existing = snap.data() || {};
    const patch = { updatedAt: TS() };

    if (opts.title != null) patch.title = String(opts.title).trim() || 'Untitled';
    if (opts.subDesc != null) patch.subDesc = String(opts.subDesc);
    if (opts.goToUrl != null) patch.goToUrl = resolveSiteUrl(opts.goToUrl) || '';
    if (opts.date != null) patch.date = normalizeDateInput(opts.date);
    if (opts.category != null) patch.category = String(opts.category);
    if (opts.subCategory != null) patch.subCategory = String(opts.subCategory);
    if (opts.navLabel != null) patch.navLabel = String(opts.navLabel).trim();
    if (opts.images != null) patch.images = parseImagesCsv(opts.images);

    if (opts.contentFile) {
        patch.content = loadContentFromFile(opts.contentFile);
    } else if (opts.content != null) {
        patch.content = String(opts.content);
    }

    if (existing.collectionId && opts.navLabel == null && opts.title != null && !existing.navLabel) {
        // keep navLabel untouched unless explicitly set
    }

    await ref.update(patch);
    return getDoc(id);
}

async function setContent(id, filePath) {
    return updateDoc(id, { contentFile: filePath });
}

async function publishDoc(id) {
    const ref = docsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Document not found: ' + id);
    await ref.update({ published: true, updatedAt: TS() });
    return getDoc(id);
}

async function unpublishDoc(id) {
    const ref = docsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Document not found: ' + id);
    await ref.update({ published: false, updatedAt: TS() });
    return getDoc(id);
}

async function setListOn(id, flags) {
    const ref = docsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Document not found: ' + id);
    const data = snap.data() || {};
    if (!data.collectionId) {
        throw new Error('listOn only applies to docs inside a collection. Move the doc into a collection first.');
    }
    const { applyListOnFlags } = require('./listOn');
    const listOn = applyListOnFlags(data.listOn, flags);
    await ref.update({ listOn, updatedAt: TS() });
    return getDoc(id);
}

async function deleteDoc(id, opts) {
    const force = !!(opts && opts.force);
    const ref = docsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Document not found: ' + id);
    const data = snap.data() || {};

    if (data.collectionId) {
        const col = await getCollection(data.collectionId);
        if (col && (data.role === 'overview' || col.overviewId === id)) {
            if (!force) {
                throw new Error(
                    'Cannot delete overview page. Dissolve the collection first, or pass --force to dissolve then delete overview.'
                );
            }
            const { dissolveCollection } = require('./collections');
            await dissolveCollection(data.collectionId);
            // after dissolve, overview is a standalone doc — delete it
            const again = await ref.get();
            if (again.exists) await ref.delete();
            return { id, deleted: true, dissolved: true };
        }

        const tree = stripPageFromTree(JSON.parse(JSON.stringify(col.tree || [])), id);
        await collectionsCol().doc(data.collectionId).update({
            tree: ensureOverviewFirst(tree, col.overviewId),
            updatedAt: TS()
        });
    }

    await ref.delete();
    return { id, deleted: true };
}

module.exports = {
    serializeDoc,
    listDocs,
    getDoc,
    createDoc,
    updateDoc,
    setContent,
    publishDoc,
    unpublishDoc,
    setListOn,
    deleteDoc
};
