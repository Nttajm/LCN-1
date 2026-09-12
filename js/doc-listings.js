(function (root) {
    var LISTING_KEYS = ['projects', 'development', 'updates'];

    function emptyListOn() {
        return { projects: false, development: false, updates: false };
    }

    function normalizeListOn(raw) {
        var out = emptyListOn();
        if (!raw || typeof raw !== 'object') return out;
        LISTING_KEYS.forEach(function (key) {
            out[key] = !!raw[key];
        });
        return out;
    }

    function listOnFromCategory(category) {
        var out = emptyListOn();
        if (category === 'projects') out.projects = true;
        else if (category === 'development') out.development = true;
        else if (category === 'updates') out.updates = true;
        return out;
    }

    function navLabelFor(doc) {
        if (!doc) return 'Untitled';
        var label = (doc.navLabel || '').trim();
        return label || doc.title || 'Untitled';
    }

    function collectPageIdsFromTree(tree, out) {
        out = out || [];
        (tree || []).forEach(function (node) {
            if (!node) return;
            if (node.type === 'page' && node.id) out.push(node.id);
            if (node.type === 'section' && node.children) {
                collectPageIdsFromTree(node.children, out);
            }
        });
        return out;
    }

    function findSectionInTree(tree, sectionId) {
        var nodes = tree || [];
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].type === 'section' && nodes[i].id === sectionId) {
                return nodes[i];
            }
        }
        return null;
    }

    function findPageParent(tree, pageId) {
        var nodes = tree || [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type === 'page' && node.id === pageId) {
                return { parent: nodes, index: i, sectionId: null };
            }
            if (node.type === 'section' && node.children) {
                for (var j = 0; j < node.children.length; j++) {
                    if (node.children[j].type === 'page' && node.children[j].id === pageId) {
                        return { parent: node.children, index: j, sectionId: node.id };
                    }
                }
            }
        }
        return null;
    }

    function firstPublishedChild(section, docsById) {
        var children = (section && section.children) || [];
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.type !== 'page' || !child.id) continue;
            var doc = docsById[child.id];
            if (doc && doc.published) return { id: child.id, data: doc };
        }
        return null;
    }

    function getSortTime(doc) {
        if (!doc) return 0;
        if (doc.date) {
            var articleDate = new Date(doc.date + 'T00:00:00').getTime();
            if (!isNaN(articleDate)) return articleDate;
        }
        if (doc.updatedAt) {
            var updated = doc.updatedAt.toDate ? doc.updatedAt.toDate() : new Date(doc.updatedAt);
            return updated.getTime();
        }
        if (doc.createdAt) {
            var created = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
            return created.getTime();
        }
        return 0;
    }

    /**
     * Build listing cards for a listing key.
     * @returns {Array<{id:string, data:object, kind:'page'|'section', sectionId?:string, hrefId:string}>}
     */
    function buildListingItems(listingKey, docsById, collectionsById) {
        var items = [];
        var listedPageIds = {};

        Object.keys(docsById || {}).forEach(function (id) {
            var doc = docsById[id];
            if (!doc || !doc.published) return;

            if (!doc.collectionId) {
                if (doc.category === listingKey) {
                    items.push({ id: id, data: doc, kind: 'page', hrefId: id });
                    listedPageIds[id] = true;
                }
                return;
            }

            var listOn = normalizeListOn(doc.listOn);
            if (listOn[listingKey]) {
                items.push({ id: id, data: doc, kind: 'page', hrefId: id });
                listedPageIds[id] = true;
            }
        });

        Object.keys(collectionsById || {}).forEach(function (colId) {
            var col = collectionsById[colId];
            if (!col || !col.tree) return;
            col.tree.forEach(function (node) {
                if (node.type !== 'section') return;
                var listOn = normalizeListOn(node.listOn);
                if (!listOn[listingKey]) return;
                var first = firstPublishedChild(node, docsById);
                if (!first) return;
                if (listedPageIds[first.id]) return;
                items.push({
                    id: 'section:' + colId + ':' + node.id,
                    data: {
                        title: node.title || 'Untitled section',
                        subDesc: '',
                        subCategory: col.title || 'Docs',
                        updatedAt: col.updatedAt,
                        date: first.data.date || ''
                    },
                    kind: 'section',
                    sectionId: node.id,
                    hrefId: first.id
                });
            });
        });

        items.sort(function (a, b) {
            return getSortTime(b.data) - getSortTime(a.data);
        });

        return items;
    }

    root.DocListings = {
        LISTING_KEYS: LISTING_KEYS,
        emptyListOn: emptyListOn,
        normalizeListOn: normalizeListOn,
        listOnFromCategory: listOnFromCategory,
        navLabelFor: navLabelFor,
        collectPageIdsFromTree: collectPageIdsFromTree,
        findSectionInTree: findSectionInTree,
        findPageParent: findPageParent,
        firstPublishedChild: firstPublishedChild,
        getSortTime: getSortTime,
        buildListingItems: buildListingItems
    };
})(window);
