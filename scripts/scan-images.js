#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', 'a_home_assets');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const OUTPUT_FILE = path.join(ROOT_DIR, 'manifest.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico']);

function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

function scanDirectory(dir, baseDir = dir) {
    const images = [];
    
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return images;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            images.push(...scanDirectory(fullPath, baseDir));
        } else if (entry.isFile() && isImageFile(entry.name)) {
            const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
            const relativeToContent = path.relative(CONTENT_DIR, fullPath).replace(/\\/g, '/');
            const folderParts = path.dirname(relativeToContent).split('/').filter(p => p && p !== '.');
            
            images.push({
                path: relativePath,
                folder: folderParts.length > 0 ? folderParts[0] : '',
                subfolders: folderParts.slice(1),
                name: entry.name,
                ext: path.extname(entry.name).slice(1).toLowerCase()
            });
        }
    }

    return images;
}

function extractFolders(images) {
    const folderSet = new Set();
    for (const img of images) {
        if (img.folder) {
            folderSet.add(img.folder);
        }
    }
    return Array.from(folderSet).sort();
}

function main() {
    console.log('Scanning images in:', CONTENT_DIR);
    
    if (!fs.existsSync(CONTENT_DIR)) {
        console.log('Content directory does not exist, creating it...');
        fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }

    const images = scanDirectory(CONTENT_DIR);
    const folders = extractFolders(images);

    const manifest = {
        generated: new Date().toISOString(),
        basePath: 'a_home_assets/',
        folders: folders,
        totalImages: images.length,
        images: images.sort((a, b) => {
            if (a.folder !== b.folder) return a.folder.localeCompare(b.folder);
            return a.name.localeCompare(b.name);
        })
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    
    console.log(`\nManifest generated: ${OUTPUT_FILE}`);
    console.log(`Found ${images.length} images in ${folders.length} folders`);
    
    if (folders.length > 0) {
        console.log('\nFolders:', folders.join(', '));
    }
    
    if (images.length > 0) {
        console.log('\nSample images:');
        images.slice(0, 5).forEach(img => {
            console.log(`  - ${img.path}`);
        });
        if (images.length > 5) {
            console.log(`  ... and ${images.length - 5} more`);
        }
    }
}

main();
