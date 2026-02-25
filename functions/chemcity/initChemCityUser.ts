// ============================================================
// ChemCity — User Initialization
// Creates the user doc + progress sub-document with defaults.
// Called by the initChemCityUser Cloud Function.
//
// NOTE: This function must run server-side (Cloud Function).
//       It writes currencies — clients cannot do this.
// ============================================================

import * as admin from 'firebase-admin';
import type { UserChemCityData, UserProgressData } from '../../src/lib/chemcity/types';

const db = admin.firestore();

/**
 * Creates a fresh ChemCity user doc and progress sub-document.
 * Called once per user on their first ChemCity session.
 *
 * Starter state:
 *  - 500 coins, 20 diamonds (enough to unlock Garden + Kitchen)
 *  - Lab unlocked by default (free)
 *  - No cards, no equipped items
 */
export async function initChemCityUser(userId: string): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const progressRef = userRef.collection('progress').doc('data');

  // Check if already initialised
  const existing = await userRef.get();
  if (existing.exists) {
    console.warn(`[initChemCityUser] User ${userId} already initialised — skipping.`);
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  const userDoc: Omit<UserChemCityData, 'createdAt' | 'updatedAt' | 'passiveIncome'> & {
    createdAt: admin.firestore.FieldValue;
    updatedAt: admin.firestore.FieldValue;
    passiveIncome: { lastCollected: null };
  } = {
    userId,
    growthTokens: 0,
    currencies: {
      coins: 500,
      diamonds: 0,
      tickets: 0,
    },
    storeSlotCount: 3,
    ownedItems: [],
    ownedCosmetics: ['avatar_1_plain', 'bg_1'],
    equipped: {},
    equippedCosmetics: {
      avatarId: 'avatar_1_plain',
      backgroundId: 'bg_1',
    },
    activeBonuses: {
      passiveBaseCoinsPerHour: 0,
      passiveMultiplier: 1,
      quizFlatDiamondBonus: 0,
      quizDiamondMultiplier: 1,
      quizDoubleChancePercent: 0,
      dailyLoginDiamonds: 5, // base Toilet: 5 + (0 × 2)
      extraSlotsTotal: 0,
      shopDiscountPercent: 0,
    },
    unlockedPlaces: ['lab'], // Lab is free — unlocked from the start
    unlockedSlots: [],
    extraSlotsBudget: 0,
    passiveIncome: {
      lastCollected: null,
    },
    streaks: {
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: '',
      streakFreezeCount: 0,
    },
    cacheVersion: 0, // will be updated on first client load
    createdAt: now,
    updatedAt: now,
  };

  const progressDoc: UserProgressData = {
    collections: {},
    topicMastery: {},
  };

  // Write both docs in a single batch
  const batch = db.batch();
  batch.set(userRef, userDoc);
  batch.set(progressRef, progressDoc);
  await batch.commit();

  console.info(`[initChemCityUser] User ${userId} initialised successfully.`);
}
