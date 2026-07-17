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
- Worker fetches the Firestore project and verifies `ownerId` before upload
- Objects are stored under `users/{uid}/projects/{projectId}/...`
- Deletes are allowed only for the caller's own key prefix

## Endpoints

- `POST /upload` multipart form fields: `file`, `projectId`, `mediaId?`, `kind?`
- `DELETE /media/:objectKey`
- `GET /health`

## Configuration

`wrangler.toml` binds `MEDIA_BUCKET` to `crossshare-media` and provides:

- `FIREBASE_PROJECT_ID`
- `PUBLIC_MEDIA_BASE_URL`
- optional `ALLOWED_ORIGINS` as a comma-separated allowlist

Without `ALLOWED_ORIGINS`, the Worker reflects the requesting origin. Set it before production if Crossshare should only be served from known domains.
