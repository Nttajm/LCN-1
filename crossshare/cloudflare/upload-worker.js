/**
 * Crossshare Cloudflare Worker — R2 media uploads.
 *
 * Bindings (wrangler.toml):
 *   - MEDIA_BUCKET (R2 bucket)
 * Vars / secrets:
 *   - PUBLIC_MEDIA_BASE_URL  e.g. https://media.example.com
 *   - FIREBASE_PROJECT_ID    e.g. lcn-apps
 *   - ALLOWED_ORIGINS        comma-separated, optional
 *
 * Endpoints:
 *   POST   /upload              multipart: file, projectId, mediaId?, kind?
 *   DELETE /media/:objectKey    Authorization: Bearer <Firebase ID token>
 *   OPTIONS *                   CORS preflight
 */

const FIREBASE_JWKS_URL =
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJwks = null;
let cachedJwksAt = 0;

function json(data, status, origin) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400'
    };
    return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function corsPreflight(origin) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Max-Age': '86400'
        }
    });
}

function pickOrigin(request, env) {
    const reqOrigin = request.headers.get('Origin') || '*';
    const allowed = String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (!allowed.length) return reqOrigin === 'null' ? '*' : reqOrigin;
    if (allowed.includes(reqOrigin)) return reqOrigin;
    return allowed[0];
}

function b64urlToUint8Array(str) {
    const pad = '='.repeat((4 - (str.length % 4)) % 4);
    const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function getJwks() {
    const now = Date.now();
    if (cachedJwks && now - cachedJwksAt < 60 * 60 * 1000) return cachedJwks;
    const res = await fetch(FIREBASE_JWKS_URL);
    if (!res.ok) throw new Error('Failed to load Firebase JWKS');
    cachedJwks = await res.json();
    cachedJwksAt = now;
    return cachedJwks;
}

async function importJwk(jwk) {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
    );
}

async function verifyFirebaseIdToken(token, projectId) {
    if (!token || !projectId) throw new Error('Missing token or project');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');

    const header = JSON.parse(new TextDecoder().decode(b64urlToUint8Array(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToUint8Array(parts[1])));
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToUint8Array(parts[2]);

    if (header.alg !== 'RS256') throw new Error('Unsupported alg');
    if (payload.aud !== projectId) throw new Error('Invalid audience');
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer');
    if (!payload.sub) throw new Error('Missing subject');
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) throw new Error('Token expired');

    const jwks = await getJwks();
    const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) throw new Error('Unknown kid');

    const key = await importJwk(jwk);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
    if (!ok) throw new Error('Bad signature');
    return payload;
}

function sanitizeSegment(value) {
    return String(value || '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120);
}

function extFromName(name, mime) {
    const fromName = String(name || '').split('.').pop();
    if (fromName && fromName !== name && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) {
        return fromName.toLowerCase();
    }
    if (mime && mime.indexOf('image/') === 0) return mime.split('/')[1] || 'bin';
    if (mime && mime.indexOf('video/') === 0) return mime.split('/')[1] || 'bin';
    if (mime && mime.indexOf('audio/') === 0) return mime.split('/')[1] || 'bin';
    return 'bin';
}

async function assertProjectOwner(env, projectId, uid, token) {
    if (!projectId || !uid || !token) throw new Error('Missing project or user');

    const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'lcn-apps';
    const documentUrl =
        `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}` +
        `/databases/(default)/documents/crossshare_projects/${encodeURIComponent(projectId)}`;
    const response = await fetch(documentUrl, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 404) throw new Error('Project not found');
    if (!response.ok) throw new Error('Project ownership could not be verified');

    const document = await response.json();
    const ownerId = document?.fields?.ownerId?.stringValue;
    if (!ownerId || ownerId !== uid) throw new Error('Not project owner');
}

async function handleUpload(request, env, origin, user, token) {
    const form = await request.formData();
    const file = form.get('file');
    const projectId = String(form.get('projectId') || '');
    const mediaId = String(form.get('mediaId') || crypto.randomUUID());
    const kind = String(form.get('kind') || 'media');

    if (!file || typeof file.arrayBuffer !== 'function') {
        return json({ error: 'file required' }, 400, origin);
    }
    if (!projectId) return json({ error: 'projectId required' }, 400, origin);

    await assertProjectOwner(env, projectId, user.sub, token);

    const mime = file.type || 'application/octet-stream';
    const name = file.name || 'upload.bin';
    const ext = extFromName(name, mime);
    const objectKey = [
        'users',
        sanitizeSegment(user.sub),
        'projects',
        sanitizeSegment(projectId),
        kind === 'empty' ? 'empty' : 'media',
        sanitizeSegment(mediaId) + '.' + ext
    ].join('/');

    const bytes = await file.arrayBuffer();
    await env.MEDIA_BUCKET.put(objectKey, bytes, {
        httpMetadata: {
            contentType: mime,
            cacheControl: 'public, max-age=31536000, immutable'
        },
        customMetadata: {
            ownerId: user.sub,
            projectId: projectId,
            mediaId: mediaId,
            originalName: name
        }
    });

    const base = String(env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
    const url = base ? `${base}/${objectKey}` : null;

    return json({
        ok: true,
        objectKey,
        key: objectKey,
        url,
        publicUrl: url,
        mime,
        size: bytes.byteLength,
        name,
        mediaId,
        projectId
    }, 200, origin);
}

async function handleDelete(request, env, origin, user, objectKey) {
    if (!objectKey) return json({ error: 'objectKey required' }, 400, origin);
    const decoded = decodeURIComponent(objectKey);
    const prefix = `users/${sanitizeSegment(user.sub)}/`;
    if (!decoded.startsWith(prefix) && !decoded.startsWith(`users/${user.sub}/`)) {
        return json({ error: 'Not allowed' }, 403, origin);
    }
    await env.MEDIA_BUCKET.delete(decoded);
    return json({ ok: true }, 200, origin);
}

export default {
    async fetch(request, env) {
        const origin = pickOrigin(request, env);
        if (request.method === 'OPTIONS') return corsPreflight(origin);

        try {
            const url = new URL(request.url);
            if (request.method === 'GET' && url.pathname === '/health') {
                return json({ ok: true, service: 'crossshare-upload' }, 200, origin);
            }

            const authHeader = request.headers.get('Authorization') || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
            if (!token) return json({ error: 'Missing Authorization' }, 401, origin);

            const projectId = env.FIREBASE_PROJECT_ID || 'lcn-apps';
            const user = await verifyFirebaseIdToken(token, projectId);

            if (request.method === 'POST' && url.pathname === '/upload') {
                return await handleUpload(request, env, origin, user, token);
            }

            if (request.method === 'DELETE' && url.pathname.startsWith('/media/')) {
                const objectKey = url.pathname.slice('/media/'.length);
                return await handleDelete(request, env, origin, user, objectKey);
            }

            return json({ error: 'Not found' }, 404, origin);
        } catch (err) {
            const message = (err && err.message) || 'Server error';
            let status = 500;
            if (/token|Authorization|signature|audience|issuer|expired/i.test(message)) status = 401;
            else if (/not project owner|ownership could not be verified/i.test(message)) status = 403;
            else if (/project not found/i.test(message)) status = 404;
            return json({ error: message }, status, origin);
        }
    }
};
