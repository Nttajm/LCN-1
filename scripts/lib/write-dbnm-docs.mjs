import fs from 'node:fs';

function emitPage(p) {
    const fields = [
        'id',
        'title',
        'navLabel',
        'section',
        'subDesc',
        'role',
        'goToUrl',
        'date',
        'category',
        'subCategory',
        'content'
    ];
    const lines = ['        page({'];
    for (const key of fields) {
        if (p[key] === undefined || p[key] === '') continue;
        if (key === 'content') {
            lines.push(`            content: ${JSON.stringify(p.content)},`);
            continue;
        }
        lines.push(`            ${key}: ${JSON.stringify(p[key])},`);
    }
    if (p.listOn) {
        lines.push(`            listOn: ${JSON.stringify(p.listOn)},`);
    }
    if (p.images) {
        lines.push(`            images: ${JSON.stringify(p.images)},`);
    }
    if (p.published === false) {
        lines.push('            published: false,');
    }
    const last = lines[lines.length - 1];
    if (last.endsWith(',')) lines[lines.length - 1] = last.slice(0, -1);
    lines.push('        }),');
    return lines.join('\n');
}

export function writeDbnmDocs(data, outPath) {
    const pageBlocks = data.pages.map(emitPage).join('\n\n');
    const sectionsJson = JSON.stringify(data.sections, null, 8).replace(/^/gm, '    ');

    const file = `/**
 * DBNM documentation content (Mozilla / MDN-style).
 * Shared by the static docs viewer and the LCN editor publisher.
 *
 * Regenerate page bodies from dbnm/docs/howto/*.txt with:
 *   node scripts/build-dbnm-docs.mjs
 */
(function (root) {
    var DATE = ${JSON.stringify(data.date || '2026-09-20')};
    var GOTO = ${JSON.stringify(data.goToUrl || '/dbnm')};
    var COLLECTION_ID = ${JSON.stringify(data.collectionId)};
    var CATEGORY = ${JSON.stringify(data.category || 'projects')};
    var SUBCATEGORY = ${JSON.stringify(data.subCategory || 'docs')};

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
${pageBlocks}
    ];

    var sections = ${sectionsJson.trimStart()};

    root.DBNM_DOCS = {
        collectionId: COLLECTION_ID,
        collectionTitle: ${JSON.stringify(data.collectionTitle || 'DBNM')},
        overviewId: ${JSON.stringify(data.overviewId)},
        date: DATE,
        goToUrl: GOTO,
        category: CATEGORY,
        subCategory: SUBCATEGORY,
        sections: sections,
        pages: pages,
        buildTree: function () {
            var bySection = {};
            sections.forEach(function (s) { bySection[s.id] = []; });
            var overviewNode = { type: 'page', id: ${JSON.stringify(data.overviewId)} };
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
`;

    fs.writeFileSync(outPath, file, 'utf8');
}
