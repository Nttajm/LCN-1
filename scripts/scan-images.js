#!/usr/bin/env node

'use strict';

const { CONTENT_DIR, OUTPUT_FILE, writeManifest } = require('./lib/image-manifest');

function main() {
    console.log('Scanning images in:', CONTENT_DIR);

    const manifest = writeManifest();

    console.log(`\nManifest generated: ${OUTPUT_FILE}`);
    console.log(`Found ${manifest.totalImages} images in ${manifest.folders.length} folders`);

    if (manifest.folders.length > 0) {
        console.log('\nFolders:', manifest.folders.join(', '));
    }

    if (manifest.images.length > 0) {
        console.log('\nSample images:');
        manifest.images.slice(0, 5).forEach(img => {
            console.log(`  - ${img.path}`);
        });
        if (manifest.images.length > 5) {
            console.log(`  ... and ${manifest.images.length - 5} more`);
        }
    }
}

main();
