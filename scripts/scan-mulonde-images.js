#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'mulonde', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'manifest.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico']);

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function folderKey(relativePath) {
  const parts = path.dirname(relativePath).split(/[/\\]/).filter(p => p && p !== '.');
  if (parts.length === 0) return '';
  if (parts[0] === 'work' && parts.length >= 2) return `work/${parts[1]}`;
  return parts[0];
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
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const parts = path.dirname(relativePath).split('/').filter(p => p && p !== '.');

      images.push({
        path: relativePath,
        folder: folderKey(relativePath),
        subfolders: parts.slice(parts[0] === 'work' ? 2 : 1),
        name: entry.name,
        ext: path.extname(entry.name).slice(1).toLowerCase(),
      });
    }
  }

  return images;
}

function extractFolders(images) {
  const folderSet = new Set();
  for (const img of images) {
    if (img.folder) folderSet.add(img.folder);
  }
  return Array.from(folderSet).sort();
}

function main() {
  console.log('Scanning images in:', DATA_DIR);

  if (!fs.existsSync(DATA_DIR)) {
    console.log('Data directory does not exist, creating it...');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const images = scanDirectory(DATA_DIR);
  const folders = extractFolders(images);

  const manifest = {
    generated: new Date().toISOString(),
    basePath: 'data/',
    folders,
    totalImages: images.length,
    images: images.sort((a, b) => {
      if (a.folder !== b.folder) return a.folder.localeCompare(b.folder);
      return a.name.localeCompare(b.name);
    }),
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
      console.log(`  - data/${img.path}`);
    });
    if (images.length > 5) {
      console.log(`  ... and ${images.length - 5} more`);
    }
  }
}

main();
