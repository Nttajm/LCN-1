# Firebase Realtime Database setup

Multiplayer lobbies use the `parties` path in Firebase Realtime Database.

1. In the Firebase console for project `lcn-apps`, create a **Realtime Database** if one does not exist.
2. Confirm the database URL matches `https://lcn-apps-default-rtdb.firebaseio.com` in `js/firebase.js` (update the URL if your instance is in another region).
3. For this no-auth lobby phase, set rules that allow client read/write on parties:

```json
{
  "rules": {
    "parties": {
      ".read": true,
      ".write": true
    }
  }
}
```

Tighten these rules before shipping anything public (auth, host-only writes, code validation, etc.).
