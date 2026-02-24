// ============================================================================
// TOKEN SERVICE - Real-Time Token Economy with Anti-Cheat
// ============================================================================

import { 
  doc, getDoc, setDoc, updateDoc, collection, addDoc, 
  query, orderBy, limit, getDocs, runTransaction, serverTimestamp,
  onSnapshot, increment, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ────────────────────────────────────────────────────────────────────────────
// TRANSACTION-SAFE TOKEN OPERATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens to a user with transaction safety
 * Creates entry in tokenHistory sub-collection
 */
export async function awardTokens(userId, amount, reason, metadata = {}) {
  try {
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentTokens = userDoc.data().tokens || 0;
      const newTokens = currentTokens + amount;

      // Update user tokens
      transaction.update(userRef, {
        tokens: newTokens,
        updatedAt: serverTimestamp()
      });

      // Create history entry
      const historyRef = doc(collection(db, 'users', userId, 'tokenHistory'));
      transaction.set(historyRef, {
        amount,
        reason,
        type: 'gain',
        timestamp: serverTimestamp(),
        balanceAfter: newTokens,
        metadata
      });
    });

    // Clean up old history records (keep only 8 most recent)
    // Run this after transaction to avoid conflicts
    setTimeout(() => cleanupTokenHistory(userId), 100);

    return { success: true, message: `Awarded ${amount} tokens` };
  } catch (error) {
    console.error('Error awarding tokens:', error);
    throw error;
  }
}

/**
 * Deduct tokens with transaction safety (prevents double-spending)
 */
export async function deductTokens(userId, amount, reason, metadata = {}) {
  try {
    const userRef = doc(db, 'users', userId);
    
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentTokens = userDoc.data().tokens || 0;
      
      // Anti-cheat: Verify sufficient funds
      if (currentTokens < amount) {
        throw new Error('INSUFFICIENT_TOKENS');
      }

      const newTokens = currentTokens - amount;

      // Update user tokens
      transaction.update(userRef, {
        tokens: newTokens,
        updatedAt: serverTimestamp()
      });

      // Create history entry
      const historyRef = doc(collection(db, 'users', userId, 'tokenHistory'));
      transaction.set(historyRef, {
        amount: -amount,
        reason,
        type: 'spend',
        timestamp: serverTimestamp(),
        balanceAfter: newTokens,
        metadata
      });

      return { newBalance: newTokens };
    });

    // Clean up old history records (keep only 8 most recent)
    setTimeout(() => cleanupTokenHistory(userId), 100);

    return { success: true, newBalance: result.newBalance };
  } catch (error) {
    if (error.message === 'INSUFFICIENT_TOKENS') {
      return { success: false, error: 'Not enough tokens' };
    }
    console.error('Error deducting tokens:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STORE OPERATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Purchase an item from the store
 */
export async function purchaseItem(userId, itemId, price) {
  try {
    const userRef = doc(db, 'users', userId);
    
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentTokens = userDoc.data().tokens || 0;
      const inventory = userDoc.data().inventory || [];

      // Check if already owned
      if (inventory.includes(itemId)) {
        throw new Error('ALREADY_OWNED');
      }

      // Verify funds
      if (currentTokens < price) {
        throw new Error('INSUFFICIENT_TOKENS');
      }

      const newTokens = currentTokens - price;

      // Update user
      transaction.update(userRef, {
        tokens: newTokens,
        inventory: [...inventory, itemId],
        updatedAt: serverTimestamp()
      });

      // Log transaction
      const historyRef = doc(collection(db, 'users', userId, 'tokenHistory'));
      transaction.set(historyRef, {
        amount: -price,
        reason: `Purchased: ${itemId}`,
        type: 'spend',
        timestamp: serverTimestamp(),
        balanceAfter: newTokens,
        metadata: { itemId, category: 'store_purchase' }
      });

      return { newBalance: newTokens, newInventory: [...inventory, itemId] };
    });

    return { success: true, ...result };
  } catch (error) {
    if (error.message === 'ALREADY_OWNED') {
      return { success: false, error: 'You already own this item' };
    }
    if (error.message === 'INSUFFICIENT_TOKENS') {
      return { success: false, error: 'Not enough tokens' };
    }
    console.error('Error purchasing item:', error);
    throw error;
  }
}

/**
 * Equip an item (set as active profile picture, etc.)
 */
export async function equipItem(userId, itemId, slot = 'profilePic') {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const inventory = userDoc.data().inventory || [];
    
    if (!inventory.includes(itemId)) {
      return { success: false, error: 'Item not owned' };
    }

    // Update equipped item
    await updateDoc(userRef, {
      [`equipped.${slot}`]: itemId,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error equipping item:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TOKEN HISTORY
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get user's token transaction history
 */
export async function getTokenHistory(userId, limitCount = 8) {
  try {
    const historyRef = collection(db, 'users', userId, 'tokenHistory');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
    
    const snapshot = await getDocs(q);
    const history = [];
    
    snapshot.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching token history:', error);
    return [];
  }
}

/**
 * Clean up old token history records, keeping only the most recent 8
 */
export async function cleanupTokenHistory(userId) {
  try {
    const historyRef = collection(db, 'users', userId, 'tokenHistory');
    
    // Get all records ordered by timestamp (newest first)
    const allRecordsQuery = query(historyRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(allRecordsQuery);
    
    // If we have more than 8 records, delete the oldest ones
    if (snapshot.size > 8) {
      const batch = writeBatch(db);
      let deletedCount = 0;
      
      // Skip the first 8 (newest) and delete the rest
      snapshot.docs.forEach((doc, index) => {
        if (index >= 8) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${deletedCount} old token history records for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up token history:', error);
  }
}

/**
 * Subscribe to real-time token updates
 */
export function subscribeToTokens(userId, callback) {
  const userRef = doc(db, 'users', userId);

  const disableListeners = String(import.meta.env?.VITE_DISABLE_FIRESTORE_LISTENERS ?? '').trim() === '1';
  if (disableListeners) {
    let timer = null;
    const poll = async () => {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          callback({
            tokens: data.tokens || 0,
            inventory: data.inventory || [],
            equipped: data.equipped || {},
          });
        }
      } catch (error) {
        console.error('Error in token polling:', error);
      }
    };
    poll();
    timer = window.setInterval(poll, 15000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }

  return onSnapshot(
    userRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          tokens: data.tokens || 0,
          inventory: data.inventory || [],
          equipped: data.equipped || {},
        });
      }
    },
    (error) => {
      console.error('Error in token subscription:', error);
    },
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ANTI-CHEAT UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if user can claim a reward (prevents spam/abuse)
 */
export async function canClaimReward(userId, rewardKey) {
  try {
    const cooldownRef = doc(db, 'users', userId, 'rewardCooldowns', rewardKey);
    const cooldownDoc = await getDoc(cooldownRef);

    if (!cooldownDoc.exists()) {
      return { canClaim: true };
    }

    const lastClaimed = cooldownDoc.data().lastClaimed?.toDate();
    const cooldownHours = cooldownDoc.data().cooldownHours || 24;
    
    if (!lastClaimed) {
      return { canClaim: true };
    }

    const hoursSince = (Date.now() - lastClaimed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince >= cooldownHours) {
      return { canClaim: true };
    }

    const hoursRemaining = Math.ceil(cooldownHours - hoursSince);
    return { 
      canClaim: false, 
      hoursRemaining,
      message: `Please wait ${hoursRemaining}h before claiming again`
    };
  } catch (error) {
    console.error('Error checking reward cooldown:', error);
    return { canClaim: true }; // Fail open
  }
}

/**
 * Record a reward claim with cooldown
 */
export async function recordRewardClaim(userId, rewardKey, cooldownHours = 24) {
  try {
    const cooldownRef = doc(db, 'users', userId, 'rewardCooldowns', rewardKey);
    await setDoc(cooldownRef, {
      lastClaimed: serverTimestamp(),
      cooldownHours,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error recording reward claim:', error);
  }
}

/**
 * Record multiple reward claims efficiently in one batch
 */
export async function recordRewardClaimsBatch(userId, rewardKeys = [], cooldownHours = 24) {
  try {
    if (!userId || !Array.isArray(rewardKeys) || rewardKeys.length === 0) return;

    const batch = writeBatch(db);
    rewardKeys.forEach((rewardKey) => {
      const cooldownRef = doc(db, 'users', userId, 'rewardCooldowns', rewardKey);
      batch.set(cooldownRef, {
        lastClaimed: serverTimestamp(),
        cooldownHours,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error recording reward claims batch:', error);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Initialize token system for new user
 */
export async function initializeUserTokens(userId, initialTokens = 100) {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      tokens: initialTokens,
      inventory: [],
      equipped: {},
      updatedAt: serverTimestamp()
    });

    // Create welcome token entry
    const historyRef = doc(collection(db, 'users', userId, 'tokenHistory'));
    await setDoc(historyRef, {
      amount: initialTokens,
      reason: 'Welcome to ChemLeung! 🎉',
      type: 'gain',
      timestamp: serverTimestamp(),
      balanceAfter: initialTokens,
      metadata: { category: 'welcome_bonus' }
    });

    // Clean up old history records (keep only 8 most recent)
    setTimeout(() => cleanupTokenHistory(userId), 100);

    return { success: true };
  } catch (error) {
    console.error('Error initializing tokens:', error);
    throw error;
  }
}