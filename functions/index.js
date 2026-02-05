// ========================================
// FIREBASE CLOUD FUNCTIONS
// Bad word filtering for Casino Live Chat
// ========================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Filter = require('bad-words');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize bad words filter with custom additions
const filter = new Filter();

// Add custom bad words/phrases
filter.addWords(
  'scam', 'scammer', 'cheat', 'cheater', 'hack', 'hacker',
  'exploit', 'exploiter', 'bot', 'kys', 'kill yourself',
  'retard', 'retarded', 'faggot', 'fag', 'nazi', 'n1gger',
  'n1gga', 'nigg3r', 'n!gger', 'rape', 'rapist', 'pedo',
  'pedophile', 'molest', 'molester', 'terrorist', 'bomb',
  'shoot', 'shooting', 'murder', 'suicide'
);

// Remove some words that might be false positives in gaming context
filter.removeWords('hell', 'damn', 'crap', 'suck');

// ========================================
// FILTER CHAT MESSAGE
// Called from client before sending message
// ========================================
exports.filterChatMessage = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in to send messages'
    );
  }

  const { text } = data;
  
  if (!text || typeof text !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Message text is required'
    );
  }

  // Check message length
  if (text.length > 500) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Message too long (max 500 characters)'
    );
  }

  // Check for bad words
  const hasBadWords = filter.isProfane(text);
  
  // Clean the text
  const cleanText = filter.clean(text);
  
  // Log if bad words detected (for monitoring)
  if (hasBadWords) {
    console.log('Bad words detected:', {
      userId: context.auth.uid,
      originalText: text,
      cleanedText: cleanText,
      timestamp: new Date().toISOString()
    });
    
    // Update user's warning count in Firestore
    try {
      const userWarningsRef = admin.firestore()
        .collection('chat_warnings')
        .doc(context.auth.uid);
      
      await userWarningsRef.set({
        userId: context.auth.uid,
        email: context.auth.token.email || null,
        displayName: context.auth.token.name || null,
        warningCount: admin.firestore.FieldValue.increment(1),
        lastWarning: admin.firestore.FieldValue.serverTimestamp(),
        violations: admin.firestore.FieldValue.arrayUnion({
          text: text,
          timestamp: new Date().toISOString()
        })
      }, { merge: true });
      
      // Check if user should be banned (more than 5 warnings)
      const userDoc = await userWarningsRef.get();
      if (userDoc.exists && userDoc.data().warningCount >= 5) {
        // Add to banned users
        await admin.firestore()
          .collection('mulon_banned_emails')
          .doc(context.auth.token.email)
          .set({
            email: context.auth.token.email,
            reason: 'Excessive chat violations',
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            userId: context.auth.uid
          });
        
        console.log('User banned for excessive violations:', context.auth.uid);
      }
    } catch (error) {
      console.error('Error updating warnings:', error);
    }
  }

  return {
    hasBadWords,
    cleanText,
    original: text
  };
});

// ========================================
// AUTO-MODERATE CHAT MESSAGES
// Triggered when a message is added to casino_chat
// ========================================
exports.moderateChatMessage = functions.firestore
  .document('casino_chat/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const { text, userId } = message;
    
    if (!text) return null;
    
    // Check for bad words
    if (filter.isProfane(text)) {
      // Delete the message
      await snapshot.ref.delete();
      
      // Log the moderation action
      await admin.firestore().collection('chat_moderation_log').add({
        messageId: context.params.messageId,
        originalText: text,
        userId: userId,
        action: 'deleted',
        reason: 'profanity',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Message deleted for profanity:', context.params.messageId);
      return { moderated: true };
    }
    
    return { moderated: false };
  });

// ========================================
// GET CHAT WARNINGS
// Returns user's warning count
// ========================================
exports.getChatWarnings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in'
    );
  }

  try {
    const warningsDoc = await admin.firestore()
      .collection('chat_warnings')
      .doc(context.auth.uid)
      .get();
    
    if (!warningsDoc.exists) {
      return { warningCount: 0, isBanned: false };
    }
    
    const data = warningsDoc.data();
    return {
      warningCount: data.warningCount || 0,
      isBanned: data.warningCount >= 5
    };
  } catch (error) {
    console.error('Error getting warnings:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get warnings');
  }
});

// ========================================
// RESET WARNINGS (Admin only)
// ========================================
exports.resetChatWarnings = functions.https.onCall(async (data, context) => {
  // Verify admin status
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  
  // Check if user is admin (you'd need to set this up in your Firestore)
  const adminDoc = await admin.firestore()
    .collection('admins')
    .doc(context.auth.uid)
    .get();
  
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID required');
  }
  
  try {
    await admin.firestore()
      .collection('chat_warnings')
      .doc(userId)
      .update({
        warningCount: 0,
        resetAt: admin.firestore.FieldValue.serverTimestamp(),
        resetBy: context.auth.uid
      });
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting warnings:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reset warnings');
  }
});

// ========================================
// CLEANUP OLD MESSAGES
// Runs daily to delete messages older than 24 hours
// ========================================
exports.cleanupOldMessages = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    
    const oldMessages = await admin.firestore()
      .collection('casino_chat')
      .where('timestamp', '<', cutoff)
      .get();
    
    const batch = admin.firestore().batch();
    let count = 0;
    
    oldMessages.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Deleted ${count} old chat messages`);
    }
    
    return null;
  });
