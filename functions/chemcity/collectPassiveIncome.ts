// ============================================================
// ChemCity — collectPassiveIncome Cloud Function
//
// CRITICAL: Server-side timestamp only. Client clock is IGNORED.
// Changing device clock to the future earns nothing.
//
// Algorithm:
//   1. Read user.passiveIncome.lastCollected from Firestore
//   2. Get current time from Firestore server timestamp
//   3. elapsed = serverNow - lastCollected
//   4. Cap elapsed at 24 hours
//   5. coins = passiveBaseCoinsPerHour × elapsed_in_hours
//   6. Add coins, write lastCollected = serverNow
//
// Called by client tap on "Collect" button.
// The client's displayed ticker is cosmetic only.
// ============================================================

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

const MAX_HOURS = 24; // passive income cap

export const collectPassiveIncome = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be signed in.',
      );
    }

    const userId = context.auth.uid;
    const userRef = db.collection('users').doc(userId);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'User not initialised.');
      }

      const userData = snap.data()!;
      const bonuses = userData.activeBonuses;
      const passiveBase: number = bonuses.passiveBaseCoinsPerHour ?? 0;

      if (passiveBase === 0) {
        return { coinsAwarded: 0, message: 'No passive income yet — equip cards in the Garden and Lab.' };
      }

      // Server-side time only — client clock is irrelevant
      const serverNow = admin.firestore.Timestamp.now();
      const lastCollected: admin.firestore.Timestamp | null =
        userData.passiveIncome?.lastCollected ?? null;

      let elapsedSeconds = 0;
      if (lastCollected) {
        elapsedSeconds = serverNow.seconds - lastCollected.seconds;
      } else {
        // First ever collection — treat as if collected right now
        elapsedSeconds = 0;
      }

      // Cap at 24 hours
      const cappedSeconds = Math.min(elapsedSeconds, MAX_HOURS * 3600);
      const elapsedHours = cappedSeconds / 3600;

      const coinsAwarded = Math.floor(passiveBase * elapsedHours);

      // Write new balance + timestamp
      tx.update(userRef, {
        'currencies.coins': admin.firestore.FieldValue.increment(coinsAwarded),
        'passiveIncome.lastCollected': serverNow,
        updatedAt: serverNow,
      });

      return {
        coinsAwarded,
        elapsedHours: elapsedHours.toFixed(2),
        newLastCollected: serverNow.toDate().toISOString(),
      };
    });
  },
);
