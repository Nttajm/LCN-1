# lcn-docs CLI

Manage LCN home/docs content in Firestore from the terminal (for Cursor agents and local scripts). Same data as `index/editor.html` — no browser needed.

## One-time setup

1. Open [Firebase Console](https://console.firebase.google.com/) → project **lcnfoundation-registry**
2. Project settings → **Service accounts** → **Generate new private key**
3. Save the JSON as:

```
scripts/lcn-docs/serviceAccount.json
```

(That file is gitignored. Never commit it.)

4. Install deps:

```bash
cd scripts/lcn-docs
npm install
```

Optional: set `GOOGLE_APPLICATION_CREDENTIALS` to any service-account JSON path instead of the default file above.

## Run

From the repo root:

```bash
node scripts/lcn-docs/cli.js --help
node scripts/lcn-docs/cli.js list
node scripts/lcn-docs/cli.js get <docId>
```

After `npm install` in this folder you can also use `npx lcn-docs` from `scripts/lcn-docs`.

## Commands

### Docs

```bash
node scripts/lcn-docs/cli.js list [--category projects] [--published|--draft] [--json]
node scripts/lcn-docs/cli.js get <id>
node scripts/lcn-docs/cli.js create --title "My Doc" --category projects --content-file ./draft.md
node scripts/lcn-docs/cli.js update <id> --title "New title" --go-to /somewhere
node scripts/lcn-docs/cli.js set-content <id> ./body.html
node scripts/lcn-docs/cli.js publish <id>
node scripts/lcn-docs/cli.js unpublish <id>
node scripts/lcn-docs/cli.js delete <id>          # strips from collection tree first
node scripts/lcn-docs/cli.js delete <id> --force  # dissolve if overview, then delete
node scripts/lcn-docs/cli.js list-on <id> --projects --updates
```

`--content-file` accepts `.html` (passthrough) or `.md` (light conversion: headings, lists, quotes, code fences, links, images).

Public reader URL: `index/doc.html?v=<id>`

### Collections

```bash
node scripts/lcn-docs/cli.js collection list
node scripts/lcn-docs/cli.js collection create <docId> --title "My Collection"
node scripts/lcn-docs/cli.js collection add-section <colId> --title "Section"
node scripts/lcn-docs/cli.js collection add-page <colId> --title "Page" [--section secId]
node scripts/lcn-docs/cli.js collection move <docId> <colId> [--section secId]
node scripts/lcn-docs/cli.js collection dissolve <colId>
```

### Home layout

```bash
node scripts/lcn-docs/cli.js home get
node scripts/lcn-docs/cli.js home set --featured <id> --side id1,id2 --recent id1,id2,id3,id4,id5,id6
```

Use `null` or `-` for an empty slot.

## Agent tip

Prefer this CLI over opening `index/editor.html`. Ask Cursor to run the commands above after credentials are installed.
