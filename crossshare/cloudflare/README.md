# Crossshare Cloudflare R2 Upload Worker

This Worker accepts authenticated media uploads from the Crossshare manager and stores them in an R2 bucket.

No local npm install is required. Deploy with `npx wrangler@latest` from this folder.

## Live deployment

- Worker: `https://crossshare-upload.joelmulonde81.workers.dev`
- Health: `https://crossshare-upload.joelmulonde81.workers.dev/health`
- R2 bucket: `crossshare-media`
- Public media base: `https://pub-21d5b946991b464ea5952a5f6933679c.r2.dev`
- Firebase project: `lcn-apps`

The deployed URLs are configured in `../js/crossshare-config.js`.

## Deploy (no npm)

```bash
cd crossshare/cloudflare
npx wrangler@latest login          # once per machine
npx wrangler@latest deploy
```

Validate the bundle without deploying:

```bash
npx wrangler@latest deploy --dry-run
```

Local dev (optional):

```bash
npx wrangler@latest dev
```

## First-time setup (new Cloudflare account)

```bash
cd crossshare/cloudflare
npx wrangler@latest login
npx wrangler@latest r2 bucket create crossshare-media
npx wrangler@latest r2 bucket dev-url enable crossshare-media
# Update PUBLIC_MEDIA_BASE_URL in wrangler.toml with the r2.dev URL printed above
npx wrangler@latest deploy
```

Then set the Worker URL in `../js/crossshare-config.js`:

```js
window.CROSSSHARE_CONFIG = {
  workerUrl: 'https://crossshare-upload.<account>.workers.dev',
  publicMediaBaseUrl: 'https://YOUR_PUBLIC_MEDIA_HOST',
  usePopupAuth: true
};
```

## What lives in this folder

| File | Purpose |
|------|---------|
| `upload-worker.js` | Worker source (runs on Cloudflare) |
| `wrangler.toml` | R2 binding and env vars |
| `README.md` | This file |

There is no `package.json` and no `node_modules`. Wrangler is fetched on demand by `npx`.

## Auth model

- Browser sends `Authorization: Bearer <Firebase ID token>`
- Worker verifies the token against Firebase JWKS for project `lcn-apps`
- Worker fetches only `ownerId` / `memberEmails` from the Firestore project (field mask) and verifies owner or member access before upload; positive checks are cached for 5 minutes per worker instance
- Objects are stored under `users/{uid}/projects/{projectId}/...`
- Deletes are allowed only for the caller's own key prefix

## Endpoints

- `POST /upload?projectId=...&mediaId=...&kind=...&name=...` raw file body (small files; streamed straight into R2). `Content-Type` header carries the file MIME type.
- `POST /upload` multipart form fields: `file`, `projectId`, `mediaId?`, `kind?` (legacy; buffers the file in Worker memory)
- `POST /multipart/create?projectId=...&mediaId=...&kind=...&name=...&mime=...` starts a chunked upload, returns `{ key, uploadId }`
- `PUT /multipart/part?key=...&uploadId=...&partNumber=N` raw chunk body, returns `{ partNumber, etag }`
- `POST /multipart/complete?key=...&uploadId=...&name=...&mime=...` JSON body `{ parts: [{ partNumber, etag }] }`, finalizes the object
- `POST /multipart/abort?key=...&uploadId=...` cancels a chunked upload
- `DELETE /media/:objectKey`
- `GET /health`

Files larger than 24 MB are uploaded by the browser in 8 MB chunks through the `/multipart/*` endpoints (3 chunks in parallel, each chunk retried up to 4 times with backoff). This keeps large uploads under the Workers ~100 MB request body limit and makes them resilient to connection hiccups. Smaller files still use the single `POST /upload` request.

## Configuration

`wrangler.toml` binds `MEDIA_BUCKET` to `crossshare-media` and provides:

- `FIREBASE_PROJECT_ID`
- `PUBLIC_MEDIA_BASE_URL`
- optional `ALLOWED_ORIGINS` as a comma-separated allowlist

Without `ALLOWED_ORIGINS`, the Worker reflects the requesting origin. Set it before production if Crossshare should only be served from known domains.
