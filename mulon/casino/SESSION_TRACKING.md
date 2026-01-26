# Session Tracking System

## Overview
The session tracking system automatically creates and maintains game session records in Firestore. Sessions are stored as subcollections under each user's document at: `mulon_users/{userId}/sessions/{sessionId}`

## How It Works

### Automatic Session Creation
Sessions are automatically started when:
- A user places their first bet in a game (`placeBet()` is called)
- Any game calls `recordGameResult()` with game data

### Session Data Structure
Each session document contains:
```javascript
{
  gameName: 'plinko',           // Name of the game
  startedAt: Timestamp,         // When session started
  lastActivityAt: Timestamp,    // Last interaction time
  endedAt: Timestamp | null,    // When session ended
  status: 'active',             // 'active', 'ended', 'abandoned'
  
  // Game Statistics
  totalBets: 0,                 // Number of bets placed
  totalWagered: 0,              // Total amount bet
  totalWon: 0,                  // Total amount won
  netProfit: 0,                 // Total profit/loss
  gamesPlayed: 0,               // Number of games played
  wins: 0,                      // Number of wins
  losses: 0,                    // Number of losses
  
  // Session Metadata
  initialBalance: 500.00,       // Balance at session start
  finalBalance: null,           // Balance at session end
  initialBet: 10.00,            // First bet amount
  biggestWin: 0,                // Largest win in session
  biggestLoss: 0,               // Largest loss in session
  longestWinStreak: 0,          // Best win streak
  currentWinStreak: 0,          // Current win streak
  
  // Device Info
  userAgent: '...',             // Browser user agent
  screenResolution: '1920x1080', // Screen size
  timezone: 'America/New_York'  // User timezone
}
```

## Using Session Tracking

### In Game Files

#### Option 1: Automatic (Recommended)
Sessions start automatically when you use `placeBet()`:

```javascript
// Just place bets normally - session starts automatically
const result = await CasinoDB.placeBet(betAmount, 'plinko');
```

Then record results:
```javascript
// Record each game outcome
await CasinoDB.recordGameResult('plinko', betAmount, wonAmount);
```

#### Option 2: Manual Control
For more control, manually start/end sessions:

```javascript
// Start a session when game begins
await CasinoDB.startGameSession('plinko', initialBet);

// Update session with each game result
await CasinoDB.updateGameSession({
  bet: betAmount,
  won: wonAmount
});

// End session when done
await CasinoDB.endGameSession('user_ended');
```

### Page Cleanup
Add these to your game page for proper session management:

```javascript
// End session when user leaves page
window.addEventListener('beforeunload', () => {
  if (CasinoDB.activeSessionId) {
    CasinoDB.endGameSession('user_left');
  }
});

// Keep session alive (every 2 minutes)
setInterval(() => {
  if (CasinoDB.activeSessionId) {
    CasinoDB.updateSessionActivity();
  }
}, 2 * 60 * 1000);
```

### Check for Abandoned Sessions
On page load, check for abandoned sessions:

```javascript
// In your init function
async function init() {
  await CasinoAuth.init();
  
  // Clean up any abandoned sessions
  if (CasinoAuth.currentUser) {
    await CasinoDB.checkAbandonedSessions();
  }
}
```

## API Reference

### `startGameSession(gameName, initialBetAmount = 0)`
Manually start a new game session.
- Returns: `{ success: true, sessionId: string, session: object }`

### `updateGameSession(result)`
Update active session with game result.
- `result`: `{ bet: number, won: number }`
- Returns: `{ success: true, sessionId: string }`

### `endGameSession(reason = 'user_ended')`
End the current session.
- `reason`: 'user_ended', 'user_left', 'abandoned', etc.
- Returns: `{ success: true, sessionId: string }`

### `updateSessionActivity()`
Update the session's last activity timestamp (keepalive).
- Returns: `{ success: true }`

### `recordGameResult(game, betAmount, wonAmount)`
Auto-starts session if needed and records result.
- Returns: `{ success: true }`

### `getGameSessions(options)`
Retrieve user's game sessions.
- `options`: `{ userId?, gameName?, status? }`
- Returns: Array of session objects

### `getSessionStats(userId)`
Get aggregate statistics for a user's sessions.
- Returns: Statistics object with totals, averages, and breakdowns

### `checkAbandonedSessions()`
Mark sessions inactive for 30+ minutes as abandoned.
- Auto-called on page load

## Example: Plinko Integration

```javascript
// In dropBall() function after ball lands:
if (landedBucket) {
  const winAmount = config.betAmount * landedBucket.multiplier;
  
  // Record result in session (auto-starts if needed)
  await CasinoDB.recordGameResult('plinko', config.betAmount, winAmount);
  
  // Record win in user balance
  if (winAmount > 0) {
    await CasinoDB.recordWin(winAmount, config.betAmount);
  }
}
```

## Firestore Structure

```
mulon_users (collection)
  └── {userId} (document)
      ├── balance: 500.00
      ├── xps: 100
      ├── lastLoginAt: Timestamp
      └── sessions (subcollection)
          ├── {sessionId1} (document)
          │   ├── gameName: "plinko"
          │   ├── status: "ended"
          │   ├── totalWagered: 250.00
          │   └── ...
          └── {sessionId2} (document)
              ├── gameName: "gems"
              ├── status: "active"
              └── ...
```

## Session Status

- **active**: Currently playing
- **ended**: Properly closed by user
- **abandoned**: Auto-marked after 30 minutes of inactivity

## Benefits

1. **Analytics**: Track user behavior and game performance
2. **Anti-cheat**: Detect suspicious patterns
3. **User insights**: Understand play sessions and engagement
4. **Debugging**: See what happened during a session
5. **Stats**: Calculate win rates, session durations, favorite games

## Notes

- Sessions auto-start on first bet
- Abandoned sessions marked after 30 minutes
- Session ID stored in `CasinoDB.activeSessionId`
- Only one active session per page load
- Keepalive updates every 2 minutes
