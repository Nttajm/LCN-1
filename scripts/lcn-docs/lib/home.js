'use strict';

const { homeRef, TS } = require('./firebase');

const DEFAULT_LAYOUT = {
    featured: [null],
    side: [null, null],
    recent: [null, null, null, null, null, null]
};

function parseIdList(raw, minLen) {
    if (raw == null || raw === '') return null;
    const parts = String(raw)
        .split(',')
        .map((s) => {
            const t = s.trim();
            if (!t || t === '-' || t.toLowerCase() === 'null' || t.toLowerCase() === 'none') return null;
            return t;
        });
    if (minLen != null) {
        while (parts.length < minLen) parts.push(null);
    }
    return parts;
}

async function getHomeLayout() {
    const snap = await homeRef().get();
    if (!snap.exists) {
        return Object.assign({}, DEFAULT_LAYOUT);
    }
    const d = snap.data() || {};
    const layout = {
        featured: Array.isArray(d.featured) ? d.featured.slice() : DEFAULT_LAYOUT.featured.slice(),
        side: Array.isArray(d.side) ? d.side.slice() : DEFAULT_LAYOUT.side.slice(),
        recent: Array.isArray(d.recent) ? d.recent.slice() : DEFAULT_LAYOUT.recent.slice()
    };
    while (layout.featured.length < 1) layout.featured.push(null);
    while (layout.side.length < 2) layout.side.push(null);
    while (layout.recent.length < 6) layout.recent.push(null);
    return layout;
}

async function setHomeLayout(opts) {
    const current = await getHomeLayout();
    const next = {
        featured: current.featured.slice(),
        side: current.side.slice(),
        recent: current.recent.slice(),
        updatedAt: TS()
    };

    if (opts.featured != null) {
        const list = parseIdList(opts.featured, 1);
        next.featured = list && list.length ? list : [null];
    }
    if (opts.side != null) {
        const list = parseIdList(opts.side, 2);
        next.side = list || [null, null];
    }
    if (opts.recent != null) {
        const list = parseIdList(opts.recent, 6);
        next.recent = list || DEFAULT_LAYOUT.recent.slice();
    }

    await homeRef().set(
        {
            featured: next.featured,
            side: next.side,
            recent: next.recent,
            updatedAt: next.updatedAt
        },
        { merge: true }
    );

    return {
        featured: next.featured,
        side: next.side,
        recent: next.recent
    };
}

module.exports = {
    DEFAULT_LAYOUT,
    getHomeLayout,
    setHomeLayout,
    parseIdList
};
