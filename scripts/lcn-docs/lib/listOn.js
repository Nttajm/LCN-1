'use strict';

const LISTING_KEYS = ['projects', 'development', 'updates'];

function emptyListOn() {
    return { projects: false, development: false, updates: false };
}

function normalizeListOn(raw) {
    const out = emptyListOn();
    if (!raw || typeof raw !== 'object') return out;
    LISTING_KEYS.forEach((key) => {
        out[key] = !!raw[key];
    });
    return out;
}

function listOnFromCategory(category) {
    const out = emptyListOn();
    if (category === 'projects') out.projects = true;
    else if (category === 'development') out.development = true;
    else if (category === 'updates') out.updates = true;
    return out;
}

function applyListOnFlags(current, flags) {
    const out = normalizeListOn(current);
    if (flags.projects === true) out.projects = true;
    if (flags.development === true) out.development = true;
    if (flags.updates === true) out.updates = true;
    if (flags.offProjects === true) out.projects = false;
    if (flags.offDevelopment === true) out.development = false;
    if (flags.offUpdates === true) out.updates = false;
    return out;
}

module.exports = {
    LISTING_KEYS,
    emptyListOn,
    normalizeListOn,
    listOnFromCategory,
    applyListOnFlags
};
