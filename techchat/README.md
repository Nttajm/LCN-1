# Techchat

Classroom chat for periods B5, C3 and D4. Students sign in with the name on their
schedule, pick a period, and talk in three channels per class.

## Files

```
techchat/
  index.html      sign-in gate and chat shell
  css/app.css     all styling
  js/app.js       Firestore wiring, presence, messages, GIPHY picker
```

No build step. Serve the folder over HTTP (ES modules do not load from `file://`):

```bash
python3 -m http.server 8899
# then open http://127.0.0.1:8899/techchat/
```

## How identity works

There are no accounts. A student types a first and last name, and the app derives
the roster name shown to everyone else: first initial, space, last name
(`Jaydon Faintly` becomes `J Faintly`). The name and a device id are kept in
`localStorage` under `techchat.me`, so a returning student lands straight in the
last class they used. "Sign out" from the left rail clears it.

## Data

Firestore project `overunder-ths`.

| Path | Holds |
| --- | --- |
| `techchat_rooms/{classId}/channels/{channelId}/messages` | One document per message |
| `techchat_presence/{deviceId}` | Who is in which class, plus typing state |

Messages are ordered by a client `createdAt` millisecond number, which keeps a
sent message on screen immediately and avoids a composite index. Presence
documents carry a `beat` timestamp refreshed every 20 seconds; anything older
than 70 seconds is treated as gone.

Rules for both paths live in `../crossshare/firebase.rules` and validate document
shape and size, since writes are unauthenticated. Deploy them with:

```bash
firebase deploy --only firestore:rules
```

## GIFs

The picker calls the GIPHY search endpoint, pre-loaded with the term `speed`, and
students can search any other term. The key is in `js/app.js` as `GIPHY_KEY`;
results are requested at rating `pg`.

## Classes and channels

Both lists are plain arrays at the top of `js/app.js`. Add a period by pushing to
`CLASSES` with an `id`, `code`, `subject`, `teacher` and `room`; the rail, the
picker and the roster pick it up with no other changes.
