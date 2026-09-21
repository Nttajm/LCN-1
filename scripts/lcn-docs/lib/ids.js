'use strict';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function generateSectionId() {
    return 'sec_' + generateId();
}

module.exports = { generateId, generateSectionId };
