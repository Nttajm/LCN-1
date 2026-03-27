// ══════════════════════════════════════════════════════════════
// JOSU – Cloudflare R2 Upload (S3-compatible, browser-safe)
//
// api.cloudflare.com is CORS-blocked from browsers, so we use
// the S3-compatible endpoint directly with AWS Signature V4.
//
// SETUP:
//   1. Paste your Account ID into R2_ACCOUNT_ID below
//      (Cloudflare Dashboard → top-right corner)
//   2. Enable Public Access on your bucket, then paste the
//      r2.dev URL into R2_PUBLIC_BASE
//   3. Set CORS on the bucket (Dashboard → R2 → bucket → Settings → CORS):
//      [{ "AllowedOrigins":["*"], "AllowedMethods":["GET","PUT","HEAD"],
//         "AllowedHeaders":["*"], "ExposeHeaders":["ETag"] }]
// ══════════════════════════════════════════════════════════════

const JosuR2 = (() => {
    // ── Fill these in ───────────────────────────────────────
    // Cloudflare Dashboard → top-right corner (32-char hex string)
    const R2_ACCOUNT_ID  = 'd0115d67cd55571ce78dad4d26e449d0';

    const S3_ACCESS_KEY  = '46954c75e49998d05a81a38d0ef426eb';
    const S3_SECRET_KEY  = '328d5324927c2506f39246da91fbad2b3e550bed1b7817d476affce747416dd8';
    const R2_BUCKET      = 'josu';
    const R2_REGION      = 'auto';

    // After enabling r2.dev Public Access, paste the URL here:
    // e.g. 'https://pub-abc123def456.r2.dev'
    const R2_PUBLIC_BASE = 'https://pub-fedf9f69b8554f7ba5a4cdb484d8d15c.r2.dev';

    // ── AWS Sig4 Helpers ────────────────────────────────────
    async function sha256hex(data) {
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hmac(key, data) {
        const keyBytes = key instanceof ArrayBuffer ? key : new TextEncoder().encode(key);
        const ck = await crypto.subtle.importKey(
            'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        return crypto.subtle.sign('HMAC', ck, new TextEncoder().encode(data));
    }

    async function buildRequest(key, fileType, fileBuffer) {
        const now       = new Date();
        const isoRaw    = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const amzdate   = isoRaw.slice(0, 15) + 'Z';
        const datestamp = isoRaw.slice(0, 8);

        const host        = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const uri         = `/${R2_BUCKET}/${key}`;
        const payloadHash = await sha256hex(new Uint8Array(fileBuffer));
        const credScope   = `${datestamp}/${R2_REGION}/s3/aws4_request`;

        const canonHeaders =
            `content-type:${fileType}\n` +
            `host:${host}\n` +
            `x-amz-content-sha256:${payloadHash}\n` +
            `x-amz-date:${amzdate}\n`;
        const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

        const canonReq = ['PUT', uri, '', canonHeaders, signedHeaders, payloadHash].join('\n');
        const sts      = ['AWS4-HMAC-SHA256', amzdate, credScope, await sha256hex(canonReq)].join('\n');

        let sigKey = await hmac('AWS4' + S3_SECRET_KEY, datestamp);
        sigKey = await hmac(sigKey, R2_REGION);
        sigKey = await hmac(sigKey, 's3');
        sigKey = await hmac(sigKey, 'aws4_request');

        const sigBuf = await hmac(sigKey, sts);
        const sig    = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        return {
            url: `https://${host}${uri}`,
            headers: {
                'Content-Type':         fileType,
                'x-amz-date':           amzdate,
                'x-amz-content-sha256': payloadHash,
                'Authorization':        `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY}/${credScope},SignedHeaders=${signedHeaders},Signature=${sig}`
            }
        };
    }

    // ── Main Upload ─────────────────────────────────────────
    // Accepts a File or a Blob. For Blobs, pass optional name/type.
    async function uploadAudio(fileOrBlob, optName, optType) {
        if (!R2_ACCOUNT_ID || R2_ACCOUNT_ID === 'YOUR_ACCOUNT_ID_HERE') {
            throw new Error('R2_ACCOUNT_ID not set in r2.js — paste your Cloudflare Account ID there.');
        }

        const name = fileOrBlob.name || optName || 'audio.mp3';
        const ext  = (name.split('.').pop() || 'mp3').toLowerCase();
        const key  = `audio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const mime = fileOrBlob.type || optType || 'audio/mpeg';
        const buf  = await fileOrBlob.arrayBuffer();

        const req = await buildRequest(key, mime, buf);
        const res = await fetch(req.url, { method: 'PUT', headers: req.headers, body: buf });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`R2 upload failed (${res.status}): ${errText}`);
        }

        const base = R2_PUBLIC_BASE
            ? R2_PUBLIC_BASE
            : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
        return `${base}/${key}`;
    }

    return { uploadAudio };
})();
