# Techchat

Classroom chat for published periods. Students sign in with the name on their
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

Everyone signs in with Google first. Then they set a roster name (first and last)
used in chat: first initial, space, last name (`Jaydon Faintly` becomes
`J Faintly`). The roster profile is kept in `localStorage` under `techchat.me`
and keyed to the Google uid. Sign out clears both Google auth and that profile.

Only `joel.mulonde@crpusd.org` can publish or edit classes. After that Google
account signs in, **Add class** appears on the period picker and the left rail.

## Data

Firebase project `overunder-ths`.

| Path | Holds |
| --- | --- |
| `techchat_classes/{classId}` | Published periods (code, subject, teacher, room) |
| `techchat_rooms/{classId}/channels/{channelId}/messages` | One document per message |
| `techchat_presence/{deviceId}` | Who is in which class, plus typing state |

Messages are ordered by a client `createdAt` millisecond number. Presence
documents carry a `beat` timestamp refreshed every 20 seconds; anything older
than 70 seconds is treated as gone.

Rules live in `../crossshare/firebase.rules`. Deploy them with:

```bash
firebase deploy --only firestore:rules
```

## GIFs

The picker calls the GIPHY search endpoint, pre-loaded with the term `speed`.
The key is in `js/app.js` as `GIPHY_KEY`; results are requested at rating `pg`.

## Channels

Every class gets `#general`, `#homework`, and `#lounge` from the `CHANNELS`
array in `js/app.js`. Periods themselves come from Firestore, not that file.
