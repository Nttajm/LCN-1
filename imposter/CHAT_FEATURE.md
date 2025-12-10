# Chat Feature Implementation

## Overview
A real-time chat feature has been added to the Impostor game, allowing players to communicate during the lobby and game phases.

## Features

### 1. **Lobby Chat**
- Players can chat before the game starts
- Located in the Party Lobby page
- Persistent across all players in the same party

### 2. **Game Chat**
- In-game chat during the Impostor game
- Available while voting and gameplay is active
- Separate from lobby chat to keep conversations organized

### 3. **Real-Time Synchronization**
- Uses Firebase Firestore for instant message delivery
- Messages are stored in subcollections under each party:
  - `parties/{partyCode}/chats/` - Lobby messages
  - `parties/{partyCode}/gameChats/` - Game phase messages

### 4. **Message Display**
- Shows sender name (highlighted in yellow)
- Displays timestamp for each message
- Auto-scrolls to the latest message
- Last 50 messages are loaded and displayed

## UI Components

### Chat Container
- Semi-transparent styled box with blur effect
- Messages display area with scrolling
- Input field for typing messages
- Send button (can also press Enter)

### Message Format
```
[Sender Name] [HH:MM]
Message text here
```

## Technical Implementation

### New Functions
- `sendChatMessage(message, isGameChat)` - Sends a message to chat
- `formatTime(timestamp)` - Formats Firebase timestamp to HH:MM
- `displayChatMessage(message, containerId)` - Renders a message in the UI
- `setupChatListener(isGameChat)` - Sets up real-time listener for messages

### Event Listeners
- Send button click handlers for both lobby and game chat
- Enter key support for quick message sending
- Automatic cleanup of chat listeners when leaving a party

### Firestore Collections
Messages are stored with the following structure:
```
{
  sender: "PlayerName",
  message: "Chat message text",
  timestamp: Timestamp
}
```

## Usage

### In the Lobby
1. Enter your name and join/create a party
2. Find the "💬 Party Chat" section
3. Type in the text field and click Send, or press Enter
4. Messages from all players appear in real-time

### During Game
1. After the game starts, the chat moves to the game page
2. Look for the "💬 Game Chat" section
3. Chat with other players while playing (useful for discussion before voting)
4. Continue chatting through voting phase

## Browser Console Cleanup
- Chat listeners are automatically cleaned up when:
  - Leaving a party
  - Browser window closes
  - Navigating away from the application

## Notes
- Chat messages are limited to the last 50 per collection
- Messages include timestamps for clarity
- Sender names are taken from the current user's entered name
- Messages persist in Firebase even after the game ends
