#!/usr/bin/env node

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const {
    CONTENT_DIR,
    ensureContentDir,
    listContentFolders,
    writeManifest
} = require('./lib/image-manifest');

const HOST = '127.0.0.1';
const PORT = 3927;
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
};

function sendJson(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Folder, X-Upload-Filename'
    });
    res.end(body);
}

function sanitizeFolder(raw) {
    const folder = String(raw || '').trim().replace(/\\/g, '/');
    if (!folder) return null;
    if (folder.includes('..') || folder.startsWith('/') || path.isAbsolute(folder)) return null;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(folder)) return null;
    return folder;
}

function sanitizeFilename(raw, mime) {
    let name = String(raw || 'paste').trim();
    name = path.basename(name).replace(/\\/g, '/');
    name = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    if (!name || name === '.' || name === '..') name = 'paste';

    let ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
        ext = MIME_TO_EXT[(mime || '').toLowerCase()] || '.png';
        name = name.replace(/\.[^.]+$/, '') + ext;
    }

    const base = path.basename(name, ext).slice(0, 80) || 'paste';
    return base + ext;
}

function uniquePath(dir, filename) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let candidate = filename;
    let n = 0;
    while (fs.existsSync(path.join(dir, candidate))) {
        n += 1;
        candidate = base + '_' + Date.now().toString(36) + (n > 1 ? '_' + n : '') + ext;
    }
    return candidate;
}

function readBody(req) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        let size = 0;
        req.on('data', function (chunk) {
            size += chunk.length;
            if (size > MAX_BYTES) {
                reject(new Error('File too large (max 15MB)'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', function () {
            resolve(Buffer.concat(chunks));
        });
        req.on('error', reject);
    });
}

function parseMultipart(buffer, contentType) {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
    if (!match) return null;
    const boundary = match[1] || match[2];
    const delim = Buffer.from('--' + boundary);
    const parts = [];
    let start = buffer.indexOf(delim) + delim.length;

    while (start < buffer.length) {
        if (buffer[start] === 45 && buffer[start + 1] === 45) break; // --
        if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

        const next = buffer.indexOf(delim, start);
        if (next < 0) break;

        let part = buffer.slice(start, next - 2); // strip \r\n before boundary
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd >= 0) {
            const headers = part.slice(0, headerEnd).toString('utf8');
            const body = part.slice(headerEnd + 4);
            const nameMatch = /name="([^"]+)"/i.exec(headers);
            const fileMatch = /filename="([^"]*)"/i.exec(headers);
            const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);
            parts.push({
                name: nameMatch ? nameMatch[1] : '',
                filename: fileMatch ? fileMatch[1] : '',
                mime: typeMatch ? typeMatch[1].trim() : '',
                data: body
            });
        }
        start = next + delim.length;
    }

    return parts;
}

async function handleUpload(req, res) {
    ensureContentDir();

    const contentType = req.headers['content-type'] || '';
    let folder = sanitizeFolder(req.headers['x-upload-folder'] || '');
    let filename = req.headers['x-upload-filename'] || '';
    let mime = '';
    let data;

    try {
        const body = await readBody(req);

        if (contentType.indexOf('multipart/form-data') === 0) {
            const parts = parseMultipart(body, contentType);
            if (!parts || !parts.length) {
                sendJson(res, 400, { error: 'No multipart parts found' });
                return;
            }

            let filePart = null;
            for (const part of parts) {
                if (part.name === 'folder' && part.data.length) {
                    folder = sanitizeFolder(part.data.toString('utf8'));
                } else if (part.name === 'file' || part.filename) {
                    filePart = part;
                }
            }

            if (!filePart) {
                sendJson(res, 400, { error: 'No file part found' });
                return;
            }

            data = filePart.data;
            mime = filePart.mime || '';
            if (!filename) filename = filePart.filename || 'paste.png';
        } else {
            data = body;
            mime = contentType.split(';')[0].trim();
            if (!filename) filename = 'paste.png';
        }
    } catch (err) {
        sendJson(res, 400, { error: err.message || 'Failed to read upload' });
        return;
    }

    if (!folder) {
        sendJson(res, 400, { error: 'Missing or invalid folder name' });
        return;
    }

    if (!data || !data.length) {
        sendJson(res, 400, { error: 'Empty file' });
        return;
    }

    const safeName = sanitizeFilename(filename, mime);
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
        sendJson(res, 400, { error: 'Unsupported image type' });
        return;
    }

    const destDir = path.join(CONTENT_DIR, folder);
    const resolvedDir = path.resolve(destDir);
    if (!resolvedDir.startsWith(path.resolve(CONTENT_DIR) + path.sep) && resolvedDir !== path.resolve(CONTENT_DIR)) {
        sendJson(res, 400, { error: 'Invalid folder path' });
        return;
    }

    fs.mkdirSync(destDir, { recursive: true });
    const finalName = uniquePath(destDir, safeName);
    const finalPath = path.join(destDir, finalName);
    fs.writeFileSync(finalPath, data);

    const manifest = writeManifest();
    const relativePath = path.posix.join('content', folder, finalName);

    sendJson(res, 200, {
        ok: true,
        path: relativePath,
        folder: folder,
        name: finalName,
        totalImages: manifest.totalImages
    });
}

const server = http.createServer(async function (req, res) {
    if (req.method === 'OPTIONS') {
        sendJson(res, 204, {});
        return;
    }

    const url = (req.url || '').split('?')[0];

    if (req.method === 'GET' && url === '/health') {
        sendJson(res, 200, { ok: true, contentDir: CONTENT_DIR });
        return;
    }

    if (req.method === 'GET' && url === '/folders') {
        try {
            sendJson(res, 200, { folders: listContentFolders() });
        } catch (err) {
            sendJson(res, 500, { error: err.message || 'Failed to list folders' });
        }
        return;
    }

    if (req.method === 'POST' && url === '/upload') {
        try {
            await handleUpload(req, res);
        } catch (err) {
            sendJson(res, 500, { error: err.message || 'Upload failed' });
        }
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, function () {
    ensureContentDir();
    console.log('LCN image upload helper listening on http://' + HOST + ':' + PORT);
    console.log('Writing into:', CONTENT_DIR);
    console.log('Endpoints: GET /health  GET /folders  POST /upload');
});
