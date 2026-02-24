const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const algoliasearch = require('algoliasearch');

admin.initializeApp();

Object.assign(exports, require('./chemcity/gacha'));

function getChemCityDefaults(userId) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return {
    userId,
    currencies: {
      coins: 500,
      diamonds: 20,
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
      dailyLoginDiamonds: 5,
      extraSlotsTotal: 0,
      shopDiscountPercent: 0,
    },
    unlockedPlaces: ['lab'],
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
    cacheVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureChemCityInitialized(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  const userData = snap.data() || {};
  if (userData.chemcity && typeof userData.chemcity === 'object') {
    // Backfill starter cosmetics if missing (non-destructive).
    const cc = userData.chemcity;
    const patch = {};

    const owned = Array.isArray(cc.ownedCosmetics) ? cc.ownedCosmetics : null;
    if (!owned) {
      patch['chemcity.ownedCosmetics'] = ['avatar_1_plain', 'bg_1'];
    } else {
      const nextOwned = owned.slice();
      if (!nextOwned.includes('avatar_1_plain')) nextOwned.push('avatar_1_plain');
      if (!nextOwned.includes('bg_1')) nextOwned.push('bg_1');
      if (nextOwned.length !== owned.length) patch['chemcity.ownedCosmetics'] = nextOwned;
    }

    const equipped = cc.equippedCosmetics && typeof cc.equippedCosmetics === 'object' ? cc.equippedCosmetics : null;
    if (!equipped) {
      patch['chemcity.equippedCosmetics'] = { avatarId: 'avatar_1_plain', backgroundId: 'bg_1' };
    } else {
      if (!equipped.avatarId || !equipped.backgroundId) {
        patch['chemcity.equippedCosmetics'] = {
          avatarId: equipped.avatarId || 'avatar_1_plain',
          backgroundId: equipped.backgroundId || 'bg_1',
          ...(equipped.iconId ? { iconId: equipped.iconId } : {}),
        };
      }
    }

    if (Object.keys(patch).length > 0) {
      patch['chemcity.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
      await userRef.update(patch);
    }
    return;
  }

  const chemcity = getChemCityDefaults(userId);
  const progressRef = userRef.collection('chemcity_progress').doc('data');
  const batch = db.batch();
  batch.set(userRef, { chemcity }, { merge: true });
  batch.set(progressRef, { collections: {}, topicMastery: {} }, { merge: true });
  await batch.commit();
}

function calcGardenCoinsPerHour(totalBonus) {
  return totalBonus * 10;
}

function calcLabMultiplier(totalBonus) {
  return 1 + totalBonus * 0.1;
}

function calcKitchenMaxDiamonds(totalBonus) {
  return totalBonus * 3;
}

function calcSchoolMultiplier(totalBonus) {
  return 1 + totalBonus * 0.1;
}

function calcBeachDoubleChance(totalBonus) {
  return Math.min(totalBonus * 5, 100);
}

function calcToiletLoginDiamonds(totalBonus) {
  return 5 + totalBonus * 2;
}

function calcGasStationExtraSlots(totalBonus) {
  return totalBonus;
}

function calcBoutiqueDiscount(totalBonus) {
  return Math.min(totalBonus * 2, 50);
}

function getTodayUtcDateKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rollKitchenBonusFromMax(maxBonus) {
  const max = Number(maxBonus || 0);
  if (!Number.isFinite(max) || max <= 0) return 0;
  const totalBonus = Math.floor(max / 3);
  if (totalBonus <= 0) return 0;
  const min = totalBonus;
  const mx = totalBonus * 3;
  return Math.floor(Math.random() * (mx - min + 1)) + min;
}

function rollBeachDoubleFromPercent(percent) {
  const p = Number(percent || 0);
  if (!Number.isFinite(p) || p <= 0) return false;
  return Math.random() * 100 < Math.min(p, 100);
}

function getDiscountedCoinCost(baseCost, shopDiscountPercent) {
  const cost = Number(baseCost);
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  const disc = Number(shopDiscountPercent || 0);
  if (!Number.isFinite(disc) || disc <= 0) return cost;
  const factor = 1 - Math.min(disc, 50) / 100;
  return Math.max(1, Math.floor(cost * factor));
}

const STORE_SLOT_UNLOCK_COSTS = {
  4: 1000,
  5: 2500,
  6: 5000,
};

async function computeChemCityActiveBonuses(db, equipped) {
  const itemIds = Object.values(equipped || {}).filter((x) => typeof x === 'string' && x.length > 0);
  const uniqueIds = Array.from(new Set(itemIds));

  const totals = {};
  if (uniqueIds.length > 0) {
    const refs = uniqueIds.map((id) => db.collection('items').doc(id));
    const snaps = await db.getAll(...refs);

    const itemMap = new Map();
    snaps.forEach((s) => {
      if (s.exists) itemMap.set(s.id, s.data() || {});
    });

    for (const id of itemIds) {
      const item = itemMap.get(id);
      if (!item || item.deprecated) continue;
      const placeId = String(item.placeId || '');
      const contrib = Number(item.skillContribution || 0);
      if (!placeId || !Number.isFinite(contrib)) continue;
      totals[placeId] = (totals[placeId] || 0) + contrib;
    }
  }

  const gardenBonus = totals.garden || 0;
  const labBonus = totals.lab || 0;
  const kitchenBonus = totals.kitchen || 0;
  const schoolBonus = totals.school || 0;
  const beachBonus = totals.beach || 0;
  const toiletBonus = totals.toilet || 0;
  const gasStationBonus = totals.gas_station || 0;
  const boutiqueBonus = totals.lifestyle_boutique || 0;

  const gardenBase = calcGardenCoinsPerHour(gardenBonus);
  const labMult = calcLabMultiplier(labBonus);

  return {
    passiveBaseCoinsPerHour: Math.round(gardenBase * labMult),
    passiveMultiplier: labMult,
    quizFlatDiamondBonus: calcKitchenMaxDiamonds(kitchenBonus),
    quizDiamondMultiplier: calcSchoolMultiplier(schoolBonus),
    quizDoubleChancePercent: calcBeachDoubleChance(beachBonus),
    dailyLoginDiamonds: calcToiletLoginDiamonds(toiletBonus),
    extraSlotsTotal: calcGasStationExtraSlots(gasStationBonus),
    shopDiscountPercent: calcBoutiqueDiscount(boutiqueBonus),
  };
}

function encodeKey(value) {
  const s = value == null ? '' : String(value);
  return encodeURIComponent(s);
}

function safeString(value) {
  return value == null ? '' : String(value);
}

function decodeKey(value) {
  const s = value == null ? '' : String(value);
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeBucket(value) {
  const v = value == null ? '' : String(value);
  if (v === 'not_in_srs' || v === 'new' || v === 'progressing' || v === 'near' || v === 'archived') return v;
  return 'not_in_srs';
}

function getTopicFromMistake(m) {
  if (!m || typeof m !== 'object') return '';
  return safeString(m.Topic || m.topic || '');
}

function getBucketFromMistake(m) {
  if (!m || typeof m !== 'object') return 'not_in_srs';
  return normalizeBucket(m.srsBucket || 'not_in_srs');
}

function getIsActiveFromMistake(m) {
  if (!m || typeof m !== 'object') return false;
  return m.srsIsActive === true;
}

async function applyMistakeTopicStatsDelta(db, userId, delta, topic, bucket, isActive) {
  const uid = safeString(userId);
  const d = Number(delta);
  if (!uid || !Number.isFinite(d) || d === 0) return;

  const topicEnc = encodeKey(topic || '');
  if (!topicEnc) return;

  const b = normalizeBucket(bucket);
  const active = isActive === true;

  const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const prev = snap.exists ? (snap.data() || {}) : {};
    const prevTopics = prev.topics && typeof prev.topics === 'object' ? prev.topics : {};
    const prevEntry = prevTopics[topicEnc] && typeof prevTopics[topicEnc] === 'object' ? prevTopics[topicEnc] : {};

    const nextTopics = { ...prevTopics };
    const nextEntry = { ...prevEntry };

    const prevTotal = Number(nextEntry.total || 0);
    const nextTotal = Math.max(0, prevTotal + d);
    nextEntry.total = nextTotal;

    const bucketKey = `b_${b}`;
    const prevBucket = Number(nextEntry[bucketKey] || 0);
    const nextBucket = Math.max(0, prevBucket + d);
    if (nextBucket === 0) delete nextEntry[bucketKey];
    else nextEntry[bucketKey] = nextBucket;

    if (active) {
      const prevActive = Number(nextEntry.active || 0);
      const nextActive = Math.max(0, prevActive + d);
      nextEntry.active = nextActive;
    }

    // Prune empty
    if (nextEntry.total === 0) {
      delete nextTopics[topicEnc];
    } else {
      nextEntry.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      nextTopics[topicEnc] = nextEntry;
    }

    tx.set(statsRef, {
      topics: nextTopics,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function applySrsAttemptDelta(db, userId, attemptedAtIso, deltaCorrect, statusBefore) {
  const uid = safeString(userId);
  const iso = safeString(attemptedAtIso);
  if (!uid || !iso) return;

  const dateKey = iso.slice(0, 10);
  if (!dateKey) return;

  const summaryRef = db.collection('users').doc(uid).collection('srs_daily_summaries').doc(dateKey);
  const dCorrect = Number.isFinite(deltaCorrect) ? deltaCorrect : 0;

  const normalizeStatus = (s) => {
    const v = safeString(s);
    if (v === 'new') return 'new';
    if (v === 'learning') return 'learning';
    if (v === 'review') return 'review';
    if (v === 'graduated') return 'graduated';
    return '';
  };

  const bucket = normalizeStatus(statusBefore);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const prev = snap.exists ? (snap.data() || {}) : {};
    const next = { ...prev };

    next.date = dateKey;
    next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (dCorrect !== 0) {
      const old = Number(prev.clearedCorrect || 0);
      next.clearedCorrect = Math.max(0, old + dCorrect);
    }

    if (bucket) {
      const field = bucket === 'new' ? 'statusNew'
        : bucket === 'learning' ? 'statusLearning'
        : bucket === 'review' ? 'statusReview'
        : 'statusGraduated';
      const old = Number(prev[field] || 0);
      next[field] = Math.max(0, old + 1);
    }

    tx.set(summaryRef, next, { merge: true });
  });
}

async function applyMistakeDocDelta(db, userId, before, after) {
  const beforeExists = before && typeof before === 'object' && Object.keys(before).length > 0;
  const afterExists = after && typeof after === 'object' && Object.keys(after).length > 0;

  if (!beforeExists && !afterExists) return;

  // Create
  if (!beforeExists && afterExists) {
    await applyMistakeTopicStatsDelta(
      db,
      userId,
      1,
      getTopicFromMistake(after),
      getBucketFromMistake(after),
      getIsActiveFromMistake(after)
    );
    return;
  }

  // Delete
  if (beforeExists && !afterExists) {
    await applyMistakeTopicStatsDelta(
      db,
      userId,
      -1,
      getTopicFromMistake(before),
      getBucketFromMistake(before),
      getIsActiveFromMistake(before)
    );
    return;
  }

  const beforeTopic = getTopicFromMistake(before);
  const afterTopic = getTopicFromMistake(after);
  const beforeBucket = getBucketFromMistake(before);
  const afterBucket = getBucketFromMistake(after);
  const beforeActive = getIsActiveFromMistake(before);
  const afterActive = getIsActiveFromMistake(after);

  const changed =
    beforeTopic !== afterTopic ||
    beforeBucket !== afterBucket ||
    beforeActive !== afterActive;

  if (!changed) return;

  // Remove old
  await applyMistakeTopicStatsDelta(db, userId, -1, beforeTopic, beforeBucket, beforeActive);
  // Add new
  await applyMistakeTopicStatsDelta(db, userId, 1, afterTopic, afterBucket, afterActive);
}

// Maintain mistake topic stats for global sidebar facets
exports.updateMistakeTopicStatsOnCreate = onDocumentCreated(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const after = snap.data() || {};
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, null, after);
  }
);

exports.chemcityUnlockStoreSlot = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const current = Number(chemcity.storeSlotCount || 3);
      if (!Number.isFinite(current) || current < 3) {
        throw new HttpsError('failed-precondition', 'Invalid storeSlotCount.');
      }
      if (current >= 6) {
        throw new HttpsError('failed-precondition', 'All store slots already unlocked.');
      }

      const next = current + 1;
      const cost = STORE_SLOT_UNLOCK_COSTS[next];
      if (!Number.isFinite(cost) || cost <= 0) {
        throw new HttpsError('failed-precondition', 'Invalid store slot unlock cost.');
      }

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      if (coins < cost) {
        throw new HttpsError('failed-precondition', 'Insufficient coins.');
      }

      tx.update(userRef, {
        'chemcity.currencies.coins': coins - cost,
        'chemcity.storeSlotCount': next,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, newSlotCount: next, coinsDeducted: cost };
    });
  }
);

exports.chemcityDevGrantCoins = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const amount = request.data?.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
      throw new HttpsError('invalid-argument', 'amount must be a non-zero number.');
    }

    const delta = Math.floor(amount);
    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      tx.update(userRef, {
        'chemcity.currencies.coins': admin.firestore.FieldValue.increment(delta),
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { ok: true, amount: delta };
  }
);

exports.chemcityClaimCollectionReward = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const collectionId = request.data?.collectionId;
    if (typeof collectionId !== 'string' || !collectionId) {
      throw new HttpsError('invalid-argument', 'collectionId must be a non-empty string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const progressRef = userRef.collection('chemcity_progress').doc('data');
    const colRef = db.collection('collections').doc(collectionId);

    return db.runTransaction(async (tx) => {
      const [userSnap, progressSnap, colSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(progressRef),
        tx.get(colRef),
      ]);

      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      if (!colSnap.exists) {
        throw new HttpsError('not-found', `Collection '${collectionId}' not found.`);
      }

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const ownedItems = Array.isArray(chemcity.ownedItems) ? chemcity.ownedItems : [];
      const ownedSet = new Set(ownedItems.map(String));

      const colData = colSnap.data() || {};
      const itemIds = Array.isArray(colData.itemIds) ? colData.itemIds.map(String) : [];
      const rewardCoins = Number(colData.rewardCoins || 0);
      const rewardDiamonds = Number(colData.rewardDiamonds || 0);

      if (itemIds.length === 0) {
        throw new HttpsError('failed-precondition', 'Collection has no items.');
      }

      const allOwned = itemIds.every((id) => ownedSet.has(id));
      if (!allOwned) {
        throw new HttpsError('failed-precondition', 'You have not collected all items in this collection.');
      }

      const progress = progressSnap.exists ? (progressSnap.data() || {}) : {};
      const collectionsProgress = progress.collections && typeof progress.collections === 'object'
        ? progress.collections
        : {};
      const prevColProgress = collectionsProgress[collectionId] && typeof collectionsProgress[collectionId] === 'object'
        ? collectionsProgress[collectionId]
        : {};

      if (prevColProgress.rewardClaimed === true) {
        throw new HttpsError('already-exists', 'Reward for this collection has already been claimed.');
      }

      const update = {
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      };
      if (rewardCoins > 0) {
        update['chemcity.currencies.coins'] = admin.firestore.FieldValue.increment(rewardCoins);
      }
      if (rewardDiamonds > 0) {
        update['chemcity.currencies.diamonds'] = admin.firestore.FieldValue.increment(rewardDiamonds);
      }

      tx.update(userRef, update);

      tx.set(
        progressRef,
        {
          collections: {
            [collectionId]: {
              collected: itemIds.length,
              total: itemIds.length,
              completed: true,
              rewardClaimed: true,
              claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        { merge: true },
      );

      return {
        ok: true,
        coinsAwarded: Math.max(0, Math.floor(rewardCoins)),
        diamondsAwarded: Math.max(0, Math.floor(rewardDiamonds)),
      };
    });
  },
);

exports.chemcityPurchaseCard = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const itemId = request.data?.itemId;
    const currency = request.data?.currency;
    if (typeof itemId !== 'string' || !itemId) {
      throw new HttpsError('invalid-argument', 'itemId must be a non-empty string.');
    }
    if (currency !== 'coins' && currency !== 'diamonds') {
      throw new HttpsError('invalid-argument', 'currency must be "coins" or "diamonds".');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const itemRef = db.collection('items').doc(itemId);

    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      throw new HttpsError('not-found', 'Item not found.');
    }
    const item = itemSnap.data() || {};
    if (item.deprecated === true) {
      throw new HttpsError('failed-precondition', 'Item is deprecated.');
    }

    const shopData = item.shopData && typeof item.shopData === 'object' ? item.shopData : {};
    const baseCoinCost = shopData.coinCost;
    const baseDiamondCost = shopData.diamondCost;

    if (currency === 'coins' && !(Number.isFinite(Number(baseCoinCost)) && Number(baseCoinCost) > 0)) {
      throw new HttpsError('failed-precondition', 'Item is not purchasable with coins.');
    }
    if (currency === 'diamonds' && !(Number.isFinite(Number(baseDiamondCost)) && Number(baseDiamondCost) > 0)) {
      throw new HttpsError('failed-precondition', 'Item is not purchasable with diamonds.');
    }

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const owned = Array.isArray(chemcity.ownedItems) ? chemcity.ownedItems : [];
      if (owned.includes(itemId)) {
        throw new HttpsError('already-exists', 'Item already owned.');
      }

      const bonuses = chemcity.activeBonuses || {};
      const discountPercent = Number(bonuses.shopDiscountPercent || 0);

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      const diamonds = Number(currencies.diamonds || 0);

      const effectiveCoinCost = currency === 'coins'
        ? getDiscountedCoinCost(baseCoinCost, discountPercent)
        : 0;
      const effectiveDiamondCost = currency === 'diamonds'
        ? Number(baseDiamondCost)
        : 0;

      if (currency === 'coins') {
        if (!Number.isFinite(effectiveCoinCost) || effectiveCoinCost <= 0) {
          throw new HttpsError('failed-precondition', 'Invalid coin cost.');
        }
        if (coins < effectiveCoinCost) {
          throw new HttpsError('failed-precondition', 'Insufficient coins.');
        }
      } else {
        if (!Number.isFinite(effectiveDiamondCost) || effectiveDiamondCost <= 0) {
          throw new HttpsError('failed-precondition', 'Invalid diamond cost.');
        }
        if (diamonds < effectiveDiamondCost) {
          throw new HttpsError('failed-precondition', 'Insufficient diamonds.');
        }
      }

      const update = {
        'chemcity.ownedItems': [...owned, itemId],
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      };

      if (currency === 'coins') {
        update['chemcity.currencies.coins'] = coins - effectiveCoinCost;
      } else {
        update['chemcity.currencies.diamonds'] = diamonds - effectiveDiamondCost;
      }

      tx.update(userRef, update);

      return {
        ok: true,
        itemId,
        currency,
        coinCost: currency === 'coins' ? effectiveCoinCost : null,
        diamondCost: currency === 'diamonds' ? effectiveDiamondCost : null,
      };
    });
  }
);

exports.chemcityUnlockPlace = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const placeId = request.data?.placeId;
    if (typeof placeId !== 'string' || !placeId) {
      throw new HttpsError('invalid-argument', 'placeId must be a non-empty string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const placeRef = db.collection('places').doc(placeId);

    const placeSnap = await placeRef.get();
    if (!placeSnap.exists) {
      throw new HttpsError('not-found', 'Place not found.');
    }
    const place = placeSnap.data() || {};
    const unlockCost = Number(place.unlockCost || 0);
    if (!Number.isFinite(unlockCost) || unlockCost < 0) {
      throw new HttpsError('failed-precondition', 'Invalid place unlock cost.');
    }

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const unlockedPlaces = Array.isArray(chemcity.unlockedPlaces) ? chemcity.unlockedPlaces : [];
      if (unlockedPlaces.includes(placeId)) {
        return { ok: true, alreadyUnlocked: true, placeId };
      }

      if (unlockCost === 0) {
        tx.update(userRef, {
          'chemcity.unlockedPlaces': [...unlockedPlaces, placeId],
          'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, placeId, cost: 0 };
      }

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      if (coins < unlockCost) {
        throw new HttpsError('failed-precondition', 'Insufficient coins.');
      }

      tx.update(userRef, {
        'chemcity.currencies.coins': coins - unlockCost,
        'chemcity.unlockedPlaces': [...unlockedPlaces, placeId],
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, placeId, cost: unlockCost };
    });
  }
);

exports.chemcityUnlockSlot = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const placeId = request.data?.placeId;
    const slotId = request.data?.slotId;
    const useExtraSlotBudget = request.data?.useExtraSlotBudget === true;

    if (typeof placeId !== 'string' || !placeId) {
      throw new HttpsError('invalid-argument', 'placeId must be a non-empty string.');
    }
    if (typeof slotId !== 'string' || !slotId) {
      throw new HttpsError('invalid-argument', 'slotId must be a non-empty string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const placeRef = db.collection('places').doc(placeId);

    const placeSnap = await placeRef.get();
    if (!placeSnap.exists) {
      throw new HttpsError('not-found', 'Place not found.');
    }
    const place = placeSnap.data() || {};
    const slots = Array.isArray(place.slots) ? place.slots : [];
    const slot = slots.find((s) => s && typeof s === 'object' && String(s.slotId || '') === slotId);
    if (!slot) {
      throw new HttpsError('failed-precondition', 'Invalid slotId.');
    }

    const isBudgetOnly = slot.budgetOnly === true;

    const unlockCost = slot.unlockCost == null ? null : Number(slot.unlockCost);
    const unlockCurrency = slot.unlockCurrency == null ? 'coins' : String(slot.unlockCurrency);

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const unlockedPlaces = Array.isArray(chemcity.unlockedPlaces) ? chemcity.unlockedPlaces : [];
      if (!unlockedPlaces.includes(placeId)) {
        throw new HttpsError('failed-precondition', 'Place is locked.');
      }

      const unlockedSlots = Array.isArray(chemcity.unlockedSlots) ? chemcity.unlockedSlots : [];
      if (unlockedSlots.includes(slotId)) {
        return { ok: true, alreadyUnlocked: true, slotId };
      }

      // Budget-only slots can only be unlocked via extraSlotsBudget.
      if (isBudgetOnly) {
        if (!useExtraSlotBudget) {
          throw new HttpsError('failed-precondition', 'This slot can only be unlocked using extra slot budget.');
        }
        const budget = Number(chemcity.extraSlotsBudget || 0);
        if (budget <= 0) {
          throw new HttpsError('failed-precondition', 'No extra slot budget available.');
        }
        tx.update(userRef, {
          'chemcity.extraSlotsBudget': budget - 1,
          'chemcity.unlockedSlots': [...unlockedSlots, slotId],
          'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, slotId, usedExtraSlotBudget: true, budgetOnly: true };
      }

      // Non-budget slots must not spend extraSlotsBudget.
      if (useExtraSlotBudget) {
        throw new HttpsError('failed-precondition', 'This slot cannot be unlocked using extra slot budget.');
      }

      if (unlockCost == null) {
        tx.update(userRef, {
          'chemcity.unlockedSlots': [...unlockedSlots, slotId],
          'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, slotId, cost: 0, currency: null };
      }

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      const diamonds = Number(currencies.diamonds || 0);

      if (unlockCurrency === 'diamonds') {
        if (!Number.isFinite(unlockCost) || unlockCost <= 0) {
          throw new HttpsError('failed-precondition', 'Invalid slot unlock cost.');
        }
        if (diamonds < unlockCost) {
          throw new HttpsError('failed-precondition', 'Insufficient diamonds.');
        }
        tx.update(userRef, {
          'chemcity.currencies.diamonds': diamonds - unlockCost,
          'chemcity.unlockedSlots': [...unlockedSlots, slotId],
          'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, slotId, cost: unlockCost, currency: 'diamonds' };
      }

      if (!Number.isFinite(unlockCost) || unlockCost <= 0) {
        throw new HttpsError('failed-precondition', 'Invalid slot unlock cost.');
      }
      if (coins < unlockCost) {
        throw new HttpsError('failed-precondition', 'Insufficient coins.');
      }
      tx.update(userRef, {
        'chemcity.currencies.coins': coins - unlockCost,
        'chemcity.unlockedSlots': [...unlockedSlots, slotId],
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, slotId, cost: unlockCost, currency: 'coins' };
    });
  }
);

exports.chemcityGetDailyLoginBonus = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};
      const streaks = chemcity.streaks || {};

      const today = getTodayUtcDateKey();
      const lastLoginDate = typeof streaks.lastLoginDate === 'string' ? streaks.lastLoginDate : '';

      if (lastLoginDate === today) {
        return { ok: true, alreadyClaimed: true, date: today };
      }

      const prevStreak = Number(streaks.currentStreak || 0);

      let nextStreak = 1;
      if (lastLoginDate) {
        const last = new Date(`${lastLoginDate}T00:00:00.000Z`);
        const t = new Date(`${today}T00:00:00.000Z`);
        const diffDays = Math.floor((t.getTime() - last.getTime()) / (24 * 3600 * 1000));
        if (diffDays === 1) nextStreak = prevStreak + 1;
        else nextStreak = 1;
      }

      const longestStreak = Math.max(Number(streaks.longestStreak || 0), nextStreak);

      const bonuses = chemcity.activeBonuses || {};
      const diamondsAwarded = Math.max(0, Math.floor(Number(bonuses.dailyLoginDiamonds || 5)));

      tx.update(userRef, {
        'chemcity.currencies.diamonds': admin.firestore.FieldValue.increment(diamondsAwarded),
        'chemcity.streaks.currentStreak': nextStreak,
        'chemcity.streaks.longestStreak': longestStreak,
        'chemcity.streaks.lastLoginDate': today,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        date: today,
        diamondsAwarded,
        currentStreak: nextStreak,
        longestStreak,
      };
    });
  }
);

exports.chemcityQuizReward = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const baseDiamonds = Number(request.data?.baseDiamonds || 0);
    const baseCoins = Number(request.data?.baseCoins || 0);
    const topicId = request.data?.topicId;
    const correctAnswers = Number(request.data?.correctAnswers || 0);
    const totalQuestions = Number(request.data?.totalQuestions || 0);

    if (!Number.isFinite(baseDiamonds) || baseDiamonds < 0) {
      throw new HttpsError('invalid-argument', 'baseDiamonds must be a non-negative number.');
    }
    if (!Number.isFinite(baseCoins) || baseCoins < 0) {
      throw new HttpsError('invalid-argument', 'baseCoins must be a non-negative number.');
    }
    if (topicId != null && typeof topicId !== 'string') {
      throw new HttpsError('invalid-argument', 'topicId must be a string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const progressRef = userRef.collection('chemcity_progress').doc('data');

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};
      const bonuses = chemcity.activeBonuses || {};

      let diamonds = Math.floor(baseDiamonds);

      const kitchenRoll = rollKitchenBonusFromMax(bonuses.quizFlatDiamondBonus);
      diamonds += kitchenRoll;

      const mult = Number(bonuses.quizDiamondMultiplier || 1);
      if (Number.isFinite(mult) && mult > 0) {
        diamonds = Math.floor(diamonds * mult);
      }

      if (rollBeachDoubleFromPercent(bonuses.quizDoubleChancePercent)) {
        diamonds *= 2;
      }

      diamonds = Math.max(0, diamonds);

      const updates = {
        'chemcity.currencies.coins': admin.firestore.FieldValue.increment(Math.floor(baseCoins)),
        'chemcity.currencies.diamonds': admin.firestore.FieldValue.increment(diamonds),
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.update(userRef, updates);

      if (typeof topicId === 'string' && topicId) {
        const progressSnap = await tx.get(progressRef);
        const progress = progressSnap.exists ? (progressSnap.data() || {}) : {};
        const tm = progress.topicMastery && typeof progress.topicMastery === 'object' ? progress.topicMastery : {};
        const prev = tm[topicId] && typeof tm[topicId] === 'object' ? tm[topicId] : {};

        const next = {
          quizzesCompleted: Number(prev.quizzesCompleted || 0) + 1,
          correctAnswers: Number(prev.correctAnswers || 0) + (Number.isFinite(correctAnswers) ? correctAnswers : 0),
          totalQuestions: Number(prev.totalQuestions || 0) + (Number.isFinite(totalQuestions) ? totalQuestions : 0),
        };

        const nextTm = { ...tm, [topicId]: next };
        tx.set(progressRef, { topicMastery: nextTm }, { merge: true });
      }

      return {
        ok: true,
        coinsAwarded: Math.floor(baseCoins),
        diamondsAwarded: diamonds,
      };
    });
  }
);

exports.chemcityEquipCard = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const slotId = request.data?.slotId;
    const itemId = request.data?.itemId;
    if (typeof slotId !== 'string' || !slotId) {
      throw new HttpsError('invalid-argument', 'slotId must be a non-empty string.');
    }
    if (typeof itemId !== 'string' || !itemId) {
      throw new HttpsError('invalid-argument', 'itemId must be a non-empty string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const itemRef = db.collection('items').doc(itemId);

    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      throw new HttpsError('not-found', 'Item not found.');
    }
    const item = itemSnap.data() || {};
    if (item.deprecated === true) {
      throw new HttpsError('failed-precondition', 'Item is deprecated.');
    }
    const baseId = typeof item.baseId === 'string' && item.baseId.trim() ? item.baseId.trim() : '';
    const itemPlaceId = String(item.placeId || '');
    const validSlots = Array.isArray(item.validSlots) ? item.validSlots.map(String) : [];
    if (!validSlots.includes(slotId)) {
      throw new HttpsError('failed-precondition', 'Item cannot be equipped in this slot.');
    }

    const placeRef = itemPlaceId ? db.collection('places').doc(itemPlaceId) : null;

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const owned = Array.isArray(chemcity.ownedItems) ? chemcity.ownedItems : [];
      if (!owned.includes(itemId)) {
        throw new HttpsError('failed-precondition', 'Item not owned.');
      }

      const unlockedPlaces = Array.isArray(chemcity.unlockedPlaces) ? chemcity.unlockedPlaces : [];
      if (itemPlaceId && !unlockedPlaces.includes(itemPlaceId)) {
        throw new HttpsError('failed-precondition', 'Place is locked.');
      }

      if (placeRef) {
        const placeSnap = await tx.get(placeRef);
        if (!placeSnap.exists) {
          throw new HttpsError('failed-precondition', 'Place config missing.');
        }
        const place = placeSnap.data() || {};
        const slots = Array.isArray(place.slots) ? place.slots : [];
        const slot = slots.find((s) => s && typeof s === 'object' && String(s.slotId || '') === slotId);
        if (!slot) {
          throw new HttpsError('failed-precondition', 'Invalid slotId.');
        }
        const unlockedSlots = Array.isArray(chemcity.unlockedSlots) ? chemcity.unlockedSlots : [];
        const isFree = slot.unlockCost == null;
        if (!isFree && !unlockedSlots.includes(slotId)) {
          throw new HttpsError('failed-precondition', 'Slot is locked.');
        }
      }

      const prevEquipped = chemcity.equipped && typeof chemcity.equipped === 'object' ? chemcity.equipped : {};
      const nextEquipped = { ...prevEquipped };

      if (baseId) {
        const entries = Object.entries(prevEquipped);
        for (const [equippedSlotId, equippedItemId] of entries) {
          if (equippedSlotId === slotId) continue;
          if (typeof equippedItemId !== 'string' || !equippedItemId) continue;

          const equippedRef = db.collection('items').doc(equippedItemId);
          const equippedSnap = await tx.get(equippedRef);
          if (!equippedSnap.exists) continue;
          const equipped = equippedSnap.data() || {};
          const equippedBaseId =
            typeof equipped.baseId === 'string' && equipped.baseId.trim() ? equipped.baseId.trim() : '';
          if (equippedBaseId && equippedBaseId === baseId) {
            delete nextEquipped[equippedSlotId];
          }
        }
      }

      nextEquipped[slotId] = itemId;

      const nextBonuses = await computeChemCityActiveBonuses(db, nextEquipped);

      tx.update(userRef, {
        'chemcity.equipped': nextEquipped,
        'chemcity.activeBonuses': nextBonuses,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, equipped: nextEquipped, activeBonuses: nextBonuses };
    });
  }
);

exports.chemcityUnequipCard = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const slotId = request.data?.slotId;
    if (typeof slotId !== 'string' || !slotId) {
      throw new HttpsError('invalid-argument', 'slotId must be a non-empty string.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }
      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const prevEquipped = chemcity.equipped && typeof chemcity.equipped === 'object' ? chemcity.equipped : {};
      const nextEquipped = { ...prevEquipped };
      delete nextEquipped[slotId];

      const nextBonuses = await computeChemCityActiveBonuses(db, nextEquipped);

      tx.update(userRef, {
        'chemcity.equipped': nextEquipped,
        'chemcity.activeBonuses': nextBonuses,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, equipped: nextEquipped, activeBonuses: nextBonuses };
    });
  }
);

exports.chemcityInitUser = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);
    return { ok: true };
  }
);

exports.chemcityMigrateSlotIds = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const db = admin.firestore();
    await ensureChemCityInitialized(db, uid);

    const SLOT_ID_SCHEMA_VERSION = 2;

    const SLOT_ID_MAP = {
      // Lab
      lab_bench_1: 'lab_bench',
      lab_bench_2: 'lab_fume_hood',
      lab_bench_3: 'lab_acid_alkali_cabinet',
      lab_bench_4: 'lab_apparatus_1',
      lab_bench_5: 'lab_metal_shelf',
      lab_bench_6: 'lab_salt_shelf',
      lab_premium_1: 'lab_hazardous_chemical_shelf',
      lab_premium_2: 'lab_apparatus_2',
      lab_premium_3: 'lab_chemical_shelf',
      lab_premium_4: 'lab_gas_tank',
      // Kitchen
      kitchen_counter_1: 'kitchen_cutlery_drawer',
      kitchen_counter_2: 'kitchen_pantry_1',
      kitchen_counter_3: 'kitchen_stove_oven',
      kitchen_counter_4: 'kitchen_dinette',
      kitchen_shelf_1: 'kitchen_fridge',
      kitchen_shelf_2: 'kitchen_pantry_2',
      kitchen_shelf_3: 'kitchen_base_cabinet',
      kitchen_shelf_4: 'kitchen_countertop',
      // Toilet
      toilet_tank_1: 'toilet_faucet',
      toilet_tank_2: 'toilet_vanity_cabinet',
      toilet_tank_3: 'toilet_bathtub',
      toilet_tank_4: 'toilet_mirror_cabinet_1',
      toilet_cabinet_1: 'toilet_toilet',
      toilet_cabinet_2: 'toilet_vanity_top',
      toilet_cabinet_3: 'toilet_mirror_cabinet_2',
      // Garden
      garden_bed_1: 'garden_shed_1',
      garden_bed_2: 'garden_lawn',
      garden_bed_3: 'garden_greenhouse',
      garden_bed_4: 'garden_flower_bed',
      garden_plot_1: 'garden_mole_hill',
      garden_plot_2: 'garden_broadcast_spreader',
      garden_plot_3: 'garden_shed_2',
      // Gas Station
      gas_pump_1: 'gas_station_car_1',
      gas_pump_2: 'gas_station_construction_site',
      gas_pump_3: 'gas_station_factory',
      gas_pump_4: 'gas_station_petrol_pump',
      gas_shelf_1: 'gas_station_car_2',
      gas_shelf_2: 'gas_station_motel',
      gas_shelf_3: 'gas_station_street_light',
      gas_shelf_4: 'gas_station_firework',
      // Boutique
      boutique_shelf_1: 'lifestyle_boutique_poseur_table_1',
      boutique_shelf_2: 'lifestyle_boutique_service_desk',
      boutique_shelf_3: 'lifestyle_boutique_jewellery_display',
      boutique_shelf_4: 'lifestyle_boutique_power_essentials',
      boutique_display_1: 'lifestyle_boutique_apparel_gallery',
      boutique_display_2: 'lifestyle_boutique_poseur_table_2',
      // Beach
      beach_sand_1: 'beach_sky',
      beach_sand_2: 'beach_sea',
      beach_sand_3: 'beach_rock_1',
      beach_sand_4: 'beach_dry_sand',
      beach_pier_1: 'beach_strandline',
      beach_pier_2: 'beach_rock_2',
      beach_pier_3: 'beach_cliffside',
      // School
      school_desk_1: 'school_student_desk_1',
      school_desk_2: 'school_teacher_desk',
      school_desk_3: 'school_blackboard',
      school_desk_4: 'school_science_corner',
      school_desk_5: 'school_poster',
      school_locker_1: 'school_window_side_table',
      school_locker_2: 'school_student_desk_2',
    };

    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = snap.data() || {};
      const chemcity = userData.chemcity || {};

      const currentVersion = Number(chemcity.slotIdSchemaVersion || 0);
      if (currentVersion >= SLOT_ID_SCHEMA_VERSION) {
        return { ok: true, alreadyMigrated: true, version: currentVersion };
      }

      const prevEquipped = chemcity.equipped && typeof chemcity.equipped === 'object' ? chemcity.equipped : {};
      const prevUnlockedSlots = Array.isArray(chemcity.unlockedSlots) ? chemcity.unlockedSlots.map(String) : [];

      const nextEquipped = {};
      let equippedKeysMigrated = 0;
      for (const [oldSlotId, itemId] of Object.entries(prevEquipped)) {
        const newSlotId = SLOT_ID_MAP[oldSlotId] || oldSlotId;
        if (newSlotId !== oldSlotId) equippedKeysMigrated++;
        nextEquipped[newSlotId] = itemId;
      }

      const nextUnlockedSlots = [];
      let unlockedSlotsMigrated = 0;
      const seen = new Set();
      for (const oldSlotId of prevUnlockedSlots) {
        const newSlotId = SLOT_ID_MAP[oldSlotId] || oldSlotId;
        if (newSlotId !== oldSlotId) unlockedSlotsMigrated++;
        if (seen.has(newSlotId)) continue;
        seen.add(newSlotId);
        nextUnlockedSlots.push(newSlotId);
      }

      const nextBonuses = await computeChemCityActiveBonuses(db, nextEquipped);

      tx.update(userRef, {
        'chemcity.equipped': nextEquipped,
        'chemcity.unlockedSlots': nextUnlockedSlots,
        'chemcity.activeBonuses': nextBonuses,
        'chemcity.slotIdSchemaVersion': SLOT_ID_SCHEMA_VERSION,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        alreadyMigrated: false,
        version: SLOT_ID_SCHEMA_VERSION,
        equippedKeysMigrated,
        unlockedSlotsMigrated,
      };
    });
  }
);

exports.chemcityCollectPassiveIncome = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const db = admin.firestore();

    await ensureChemCityInitialized(db, uid);

    const userRef = db.collection('users').doc(uid);
    const MAX_HOURS = 24;

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = snap.data() || {};
      const chemcity = userData.chemcity || {};
      const bonuses = chemcity.activeBonuses || {};
      const passiveBase = Number(bonuses.passiveBaseCoinsPerHour || 0);

      if (!Number.isFinite(passiveBase) || passiveBase <= 0) {
        return {
          coinsAwarded: 0,
          message: 'No passive income yet — equip cards in the Garden and Lab.',
        };
      }

      const serverNow = admin.firestore.Timestamp.now();
      const lastCollected = chemcity.passiveIncome?.lastCollected || null;

      let elapsedSeconds = 0;
      if (lastCollected && typeof lastCollected.seconds === 'number') {
        elapsedSeconds = serverNow.seconds - lastCollected.seconds;
      }

      const cappedSeconds = Math.min(elapsedSeconds, MAX_HOURS * 3600);
      const elapsedHours = cappedSeconds / 3600;
      const coinsAwarded = Math.floor(passiveBase * elapsedHours);

      tx.update(userRef, {
        'chemcity.currencies.coins': admin.firestore.FieldValue.increment(coinsAwarded),
        'chemcity.passiveIncome.lastCollected': serverNow,
        'chemcity.updatedAt': serverNow,
      });

      return {
        coinsAwarded,
        elapsedHours: Number(elapsedHours.toFixed(2)),
        newLastCollected: serverNow.toDate().toISOString(),
      };
    });
  }
);

exports.normalizeMistakes = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to normalize mistakes');
    }

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');

    const pageSize = 800;
    let last = null;
    let processed = 0;
    let updated = 0;

    const nowIso = new Date().toISOString();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = mistakesRef.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (last) q = q.startAfter(last);

      const snap = await q.get();
      if (snap.empty) break;

      // Only write docs that truly need a patch.
      const toPatch = [];
      for (const docSnap of snap.docs) {
        const d = docSnap.data() || {};

        const topic = d.Topic ?? d.topic ?? null;
        const subtopic = d.Subtopic ?? d.subtopic ?? null;
        const lastWrongAt = d.lastWrongAt ?? d.lastAttempted ?? d.updatedAt ?? d.createdAt ?? nowIso;

        const needsTopic = d.Topic == null && d.topic != null;
        const needsSubtopic = d.Subtopic == null && d.subtopic != null;
        const needsLastWrongAt = d.lastWrongAt == null;

        if (needsTopic || needsSubtopic || needsLastWrongAt) {
          toPatch.push({
            ref: docSnap.ref,
            patch: {
              Topic: topic,
              Subtopic: subtopic,
              lastWrongAt,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });
        }
      }

      if (toPatch.length > 0) {
        for (let i = 0; i < toPatch.length; i += 450) {
          const batch = db.batch();
          const slice = toPatch.slice(i, i + 450);
          slice.forEach((x) => {
            batch.set(x.ref, x.patch, { merge: true });
          });
          await batch.commit();
          updated += slice.length;
        }
      }

      processed += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Make it easy to see when it was last run.
    const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');
    await statsRef.set({
      lastNormalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastNormalizedProcessed: processed,
      lastNormalizedUpdated: updated,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, userId: uid, processed, updated };
  }
);

exports.updateMistakeTopicStatsOnUpdate = onDocumentUpdated(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data?.before?.data?.() || null;
    const after = event.data?.after?.data?.() || null;
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, before, after);
  }
);

exports.updateMistakeTopicStatsOnDelete = onDocumentDeleted(
  {
    document: 'users/{userId}/mistakes/{mistakeId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const before = snap.data() || {};
    const userId = event.params?.userId;
    if (!userId) return;
    const db = admin.firestore();
    await applyMistakeDocDelta(db, userId, before, null);
  }
);

exports.rebuildMistakeTopicStats = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to rebuild mistake topic stats');
    }

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');
    const statsRef = db.collection('users').doc(uid).collection('mistake_stats').doc('topicBuckets');

    const topics = {};

    const pageSize = 800;
    let last = null;
    let processed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = mistakesRef.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;

      snap.docs.forEach((docSnap) => {
        const m = docSnap.data() || {};
        const topic = getTopicFromMistake(m);
        if (!topic) return;
        const topicEnc = encodeKey(topic);
        const bucket = getBucketFromMistake(m);
        const isActive = getIsActiveFromMistake(m);

        const entry = topics[topicEnc] && typeof topics[topicEnc] === 'object' ? topics[topicEnc] : {};
        entry.total = Number(entry.total || 0) + 1;
        const bucketKey = `b_${bucket}`;
        entry[bucketKey] = Number(entry[bucketKey] || 0) + 1;
        if (isActive) entry.active = Number(entry.active || 0) + 1;
        topics[topicEnc] = entry;
      });

      processed += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    await statsRef.set({
      topics,
      processed,
      rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, userId: uid, processed, topics: Object.keys(topics).length };
  }
);

exports.pickMistakesForReview = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to pick mistakes');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : {};
    const limitN = Math.min(Math.max(parseInt(data.limit || 40, 10) || 40, 1), 400);
    const filters = data.filters && typeof data.filters === 'object' ? data.filters : {};

    const datePeriod = safeString(filters.datePeriod || 'all');
    const selectedTopics = Array.isArray(filters.selectedTopics) ? filters.selectedTopics.filter(Boolean).map(String) : [];
    const selectedSubtopics = Array.isArray(filters.selectedSubtopics) ? filters.selectedSubtopics.filter(Boolean).map(String) : [];
    const selectedMasteryLevels = Array.isArray(filters.selectedMasteryLevels) ? filters.selectedMasteryLevels.filter(Boolean).map(String) : [];
    const srsPresence = safeString(filters.srsPresence || 'all');

    const db = admin.firestore();
    const mistakesRef = db.collection('users').doc(uid).collection('mistakes');

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const matchesSrs = (row) => {
      if (srsPresence === 'in_srs') return row && row.srsIsActive === true;
      if (srsPresence === 'not_in_srs') return normalizeBucket((row && row.srsBucket) || 'not_in_srs') === 'not_in_srs';
      return true;
    };

    const topics = selectedTopics;
    const subs = selectedSubtopics;
    const lvls = selectedMasteryLevels;

    const baseParts = [];
    if (datePeriod === 'week') baseParts.push(['lastWrongAt', '>=', weekAgo.toISOString()]);
    if (datePeriod === 'month') baseParts.push(['lastWrongAt', '>=', monthAgo.toISOString()]);

    if (topics.length === 1) baseParts.push(['Topic', '==', topics[0]]);
    else if (topics.length >= 2 && topics.length <= 10) baseParts.push(['Topic', 'in', topics]);

    if (subs.length === 1 && topics.length <= 1) baseParts.push(['Subtopic', '==', subs[0]]);

    if (srsPresence !== 'not_in_srs' && lvls.length === 1) baseParts.push(['srsBucket', '==', normalizeBucket(lvls[0])]);

    if (srsPresence === 'in_srs') baseParts.push(['srsIsActive', '==', true]);
    if (srsPresence === 'not_in_srs') baseParts.push(['srsBucket', '==', 'not_in_srs']);

    const collected = [];
    let fetched = 0;
    const maxFetch = 1200;
    const pageSize = 250;
    let last = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (collected.length >= limitN) break;
      if (fetched >= maxFetch) break;

      let q = mistakesRef.orderBy('lastWrongAt', 'desc');
      baseParts.forEach(([f, op, v]) => { q = q.where(f, op, v); });
      if (last) q = q.startAfter(last);
      q = q.limit(Math.min(pageSize, maxFetch - fetched));

      let snap;
      try {
        snap = await q.get();
      } catch (err) {
        const code = err && (err.code || err.status || err.statusCode);
        const details = err && (err.details || err.message || String(err));
        // Firestore missing index => FAILED_PRECONDITION (gRPC code 9)
        if (code === 9 || code === 'FAILED_PRECONDITION') {
          throw new HttpsError('failed-precondition', details);
        }
        throw new HttpsError('internal', details);
      }
      if (snap.empty) break;
      fetched += snap.size;
      last = snap.docs[snap.docs.length - 1];

      for (const docSnap of snap.docs) {
        const row = docSnap.data() || {};

        if (topics.length > 10) {
          const tp = safeString(row.Topic || row.topic || '');
          if (!tp || !topics.includes(tp)) continue;
        }

        if (subs.length > 1) {
          const sb = safeString(row.Subtopic || row.subtopic || '');
          if (!sb || !subs.includes(sb)) continue;
        }

        if (srsPresence !== 'not_in_srs' && lvls.length > 1) {
          const b = normalizeBucket(row.srsBucket || 'not_in_srs');
          if (!lvls.includes(b)) continue;
        }

        if (!matchesSrs(row)) continue;

        collected.push(docSnap.id);
        if (collected.length >= limitN) break;
      }

      if (snap.size < pageSize) break;
    }

    return {
      ok: true,
      userId: uid,
      ids: collected.slice(0, limitN),
      requested: limitN,
      fetched,
    };
  }
);

async function applySrsSummaryDelta(db, userId, dateStr, delta, topic, subtopic) {
  const uid = safeString(userId);
  const dateKey = safeString(dateStr);
  if (!uid || !dateKey || !Number.isFinite(delta) || delta === 0) return;

  const topicKey = encodeKey(topic || '');
  const subtopicKey = encodeKey(subtopic || '');
  const hasTopic = Boolean(topicKey);
  const hasSubtopic = Boolean(topicKey) && Boolean(subtopicKey);
  const compoundSubKey = hasSubtopic ? `${topicKey}::${subtopicKey}` : '';

  const summaryRef = db.collection('users').doc(uid).collection('srs_daily_summaries').doc(dateKey);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const prev = snap.exists ? (snap.data() || {}) : {};

    const next = { ...prev };
    next.date = dateKey;
    next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const prevTotal = Number(prev.dueTotal || 0);
    next.dueTotal = Math.max(0, prevTotal + delta);

    const prevTopics = prev.topicCounts && typeof prev.topicCounts === 'object' ? prev.topicCounts : {};
    const prevSubs = prev.subtopicCounts && typeof prev.subtopicCounts === 'object' ? prev.subtopicCounts : {};

    const nextTopics = { ...prevTopics };
    const nextSubs = { ...prevSubs };

    if (hasTopic) {
      const old = Number(nextTopics[topicKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextTopics[topicKey];
      else nextTopics[topicKey] = v;
    }

    if (hasSubtopic) {
      const old = Number(nextSubs[compoundSubKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextSubs[compoundSubKey];
      else nextSubs[compoundSubKey] = v;
    }

    next.topicCounts = nextTopics;
    next.subtopicCounts = nextSubs;

    tx.set(summaryRef, next, { merge: true });
  });
}

function isActiveCard(card) {
  if (!card || typeof card !== 'object') return false;
  if (card.isActive === false) return false;
  if (!card.userId) return false;
  if (!card.nextReviewDate) return false;
  return true;
}

// Define secrets (use new Firebase Functions params API)
const algoliaAppId = defineSecret('ALGOLIA_APP_ID');
const algoliaAdminKey = defineSecret('ALGOLIA_ADMIN_KEY');
const ALGOLIA_INDEX_NAME = 'forum_posts';

// Initialize Algolia client lazily at runtime
function getAlgoliaClient() {
  const appId = algoliaAppId.value();
  const adminKey = algoliaAdminKey.value();
  if (!appId || !adminKey) return null;
  return algoliasearch(appId, adminKey);
}

exports.aggregateCommentQuestionStatsOnCommentCreate = onDocumentCreated(
  {
    document: 'comments/{commentId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const comment = snap.data() || {};
    const questionId = comment.questionId != null ? String(comment.questionId) : '';
    if (!questionId) return;

    const createdAt = typeof comment.createdAt === 'string'
      ? comment.createdAt
      : new Date().toISOString();

    const db = admin.firestore();
    const statsRef = db.collection('comment_question_stats').doc(questionId);

    await db.runTransaction(async (tx) => {
      const statsSnap = await tx.get(statsRef);
      const prev = statsSnap.exists ? (statsSnap.data() || {}) : {};

      const prevLast = typeof prev.lastActivity === 'string' ? prev.lastActivity : '';
      const nextLastActivity = prevLast && prevLast > createdAt ? prevLast : createdAt;

      tx.set(statsRef, {
        questionId,
        commentCount: admin.firestore.FieldValue.increment(1),
        lastActivity: nextLastActivity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

exports.rebuildSrsDailySummaries = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to rebuild summaries');
    }

    const db = admin.firestore();

    // Page through all active cards for this user
    const cardsRef = db.collection('spaced_repetition_cards');
    const pageSize = 500;
    let last = null;
    let totalCards = 0;

    // dateStr => { dueTotal, topicCounts, subtopicCounts }
    const aggregated = new Map();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = cardsRef
        .where('userId', '==', uid)
        .where('isActive', '==', true)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);

      if (last) {
        q = q.startAfter(last);
      }

      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        const card = docSnap.data() || {};
        if (!card.nextReviewDate) continue;

        const dateKey = safeString(card.nextReviewDate);
        const topicEnc = encodeKey(card.topic || '');
        const subEnc = encodeKey(card.subtopic || '');
        const compound = (topicEnc && subEnc) ? `${topicEnc}::${subEnc}` : '';

        if (!aggregated.has(dateKey)) {
          aggregated.set(dateKey, {
            date: dateKey,
            dueTotal: 0,
            topicCounts: {},
            subtopicCounts: {},
          });
        }

        const entry = aggregated.get(dateKey);
        entry.dueTotal += 1;

        if (topicEnc) {
          entry.topicCounts[topicEnc] = (entry.topicCounts[topicEnc] || 0) + 1;
        }
        if (compound) {
          entry.subtopicCounts[compound] = (entry.subtopicCounts[compound] || 0) + 1;
        }
      }

      totalCards += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Write summaries for encountered dates (overwrite those docs).
    const summariesRef = db.collection('users').doc(uid).collection('srs_daily_summaries');
    const dateKeys = Array.from(aggregated.keys()).sort((a, b) => String(a).localeCompare(String(b)));

    let written = 0;
    for (let i = 0; i < dateKeys.length; i += 400) {
      const batch = db.batch();
      const slice = dateKeys.slice(i, i + 400);

      for (const dateKey of slice) {
        const data = aggregated.get(dateKey);
        const ref = summariesRef.doc(dateKey);
        batch.set(ref, {
          date: data.date,
          dueTotal: data.dueTotal,
          topicCounts: data.topicCounts,
          subtopicCounts: data.subtopicCounts,
          rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      written += slice.length;
    }

    return {
      ok: true,
      userId: uid,
      cardsProcessed: totalCards,
      datesWritten: written,
    };
  }
);

// Maintain SRS daily summaries (cheap calendar counts)
exports.updateSrsDailySummaryOnCardCreate = onDocumentCreated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, 1, card.topic, card.subtopic);
  }
);

exports.updateSrsDailySummaryOnCardUpdate = onDocumentUpdated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data?.before?.data?.() || {};
    const after = event.data?.after?.data?.() || {};

    const beforeActive = isActiveCard(before);
    const afterActive = isActiveCard(after);

    const db = admin.firestore();

    // Removed from active set
    if (beforeActive && !afterActive) {
      await applySrsSummaryDelta(db, before.userId, before.nextReviewDate, -1, before.topic, before.subtopic);
      return;
    }

    // Added to active set
    if (!beforeActive && afterActive) {
      await applySrsSummaryDelta(db, after.userId, after.nextReviewDate, 1, after.topic, after.subtopic);
      return;
    }

    if (!beforeActive && !afterActive) return;

    const uid = after.userId || before.userId;
    const beforeDate = safeString(before.nextReviewDate);
    const afterDate = safeString(after.nextReviewDate);
    const beforeTopic = safeString(before.topic);
    const afterTopic = safeString(after.topic);
    const beforeSub = safeString(before.subtopic);
    const afterSub = safeString(after.subtopic);

    const dateChanged = beforeDate !== afterDate;
    const topicChanged = beforeTopic !== afterTopic;
    const subChanged = beforeSub !== afterSub;

    if (!dateChanged && !topicChanged && !subChanged) return;

    // Remove old
    await applySrsSummaryDelta(db, uid, beforeDate, -1, beforeTopic, beforeSub);
    // Add new
    await applySrsSummaryDelta(db, uid, afterDate, 1, afterTopic, afterSub);
  }
);

exports.updateSrsDailySummaryOnCardDelete = onDocumentDeleted(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, -1, card.topic, card.subtopic);
  }
);

// Maintain daily cleared/milestone stats from SRS review attempts
exports.updateSrsDailySummaryOnAttemptCreate = onDocumentCreated(
  {
    document: 'review_attempts/{attemptId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const attempt = snap.data() || {};

    const uid = safeString(attempt.userId);
    if (!uid) return;

    const attemptedAt = safeString(attempt.attemptedAt);
    if (!attemptedAt) return;

    const wasCorrect = attempt.wasCorrect === true;
    const statusBefore = attempt?.stateBefore?.status;

    const db = admin.firestore();
    await applySrsAttemptDelta(db, uid, attemptedAt, wasCorrect ? 1 : 0, statusBefore);
  }
);

 function toHongKongDate(dateObj) {
   // Convert an instant-in-time to a Date whose UTC fields represent Asia/Hong_Kong local time.
   // This avoids discrepancies between browser local time (HK) and Cloud Functions runtime (UTC).
   const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
   return new Date(d.getTime() + 8 * 60 * 60 * 1000);
 }

function getWeeklyKeyForDate(dateObj) {
  // Use UTC getters so output is independent of the runtime's local timezone.
  const date = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const yyyy = date.getUTCFullYear();
  return `leaderboard_weekly_${yyyy}-W${String(weekNo).padStart(2, '0')}`;
}

function weeklyTokensForRank(rank) {
  const r = Number(rank || 0);
  if (!Number.isFinite(r) || r <= 0) return 0;
  // Keep consistent with frontend logic: max(0, 11 - rank)
  return Math.max(0, 11 - r);
}

exports.aggregateWeeklyLeaderboardOnAttemptCreate = onDocumentCreated(
  {
    document: 'attempts/{attemptId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const attemptData = snap.data() || {};
    const userId = attemptData.userId;
    if (!userId) return;

    const attemptTs = attemptData.timestamp ? new Date(attemptData.timestamp) : new Date();
    const weekId = getWeeklyKeyForDate(toHongKongDate(attemptTs));

    const db = admin.firestore();
    const entryRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries').doc(userId);
    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
      const [entrySnap, userSnap] = await Promise.all([
        tx.get(entryRef),
        tx.get(userRef),
      ]);

      const userData = userSnap.exists ? userSnap.data() : {};
      const prev = entrySnap.exists ? entrySnap.data() : {};

      const prevAttemptCount = Number(prev.attemptCount || 0);
      const prevTotalScore = Number(prev.totalScore || 0);
      const prevTotalQuestions = Number(prev.totalQuestions || 0);
      const prevTotalCorrect = Number(prev.totalCorrect || 0);

      const nextAttemptCount = prevAttemptCount + 1;
      const nextTotalScore = prevTotalScore + Number(attemptData.percentage || 0);
      const nextTotalQuestions = prevTotalQuestions + Number(attemptData.totalQuestions || 0);
      const nextTotalCorrect = prevTotalCorrect + Number(attemptData.correctAnswers || 0);
      const nextAverageScore = nextAttemptCount > 0 ? Math.round(nextTotalScore / nextAttemptCount) : 0;

      tx.set(entryRef, {
        userId,
        weekId,
        displayName: userData?.displayName || 'Unknown',
        level: userData?.level || null,
        equippedProfilePic: (userData?.equipped || {}).profilePic || 'flask_blue',
        equippedTheme: (userData?.equipped || {}).theme || 'default',
        streak: Number(userData?.streak || 0),
        attemptCount: nextAttemptCount,
        totalScore: nextTotalScore,
        averageScore: nextAverageScore,
        totalQuestions: nextTotalQuestions,
        totalCorrect: nextTotalCorrect,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

exports.weeklyLeaderboardPayout = onSchedule(
  {
    schedule: '0 0 * * 1',
    timeZone: 'Asia/Hong_Kong',
    region: 'asia-east1',
  },
  async () => {
    const db = admin.firestore();

    // Run payout for LAST week (so the leaderboard is complete)
    const now = toHongKongDate(new Date());
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekId = getWeeklyKeyForDate(toHongKongDate(lastWeekDate));

    const entriesRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries');
    const topSnap = await entriesRef.orderBy('averageScore', 'desc').limit(10).get();

    if (topSnap.empty) return;

    // Batch-like loop (transactions per user to keep idempotency + correct balances)
    const payoutPromises = topSnap.docs.map(async (docSnap, idx) => {
      const entry = docSnap.data() || {};
      const userId = entry.userId || docSnap.id;
      const rank = idx + 1;
      const tokens = weeklyTokensForRank(rank);
      if (!userId || tokens <= 0) return;

      const payoutRef = db
        .collection('weekly_leaderboards')
        .doc(weekId)
        .collection('payouts')
        .doc(userId);

      const userRef = db.collection('users').doc(userId);

      await db.runTransaction(async (tx) => {
        const [payoutSnap, userSnap] = await Promise.all([
          tx.get(payoutRef),
          tx.get(userRef),
        ]);

        if (payoutSnap.exists) {
          return; // already paid
        }

        if (!userSnap.exists) {
          // still record payout marker to avoid repeated attempts
          tx.set(payoutRef, {
            userId,
            weekId,
            rank,
            tokens,
            skipped: true,
            reason: 'User doc missing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }

        const userData = userSnap.data() || {};
        const currentTokens = Number(userData.tokens || 0);
        const newTokens = currentTokens + tokens;

        tx.update(userRef, {
          tokens: newTokens,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const historyRef = userRef.collection('tokenHistory').doc();
        tx.set(historyRef, {
          amount: tokens,
          reason: `Leaderboard Reward: weekly #${rank}`,
          type: 'gain',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          balanceAfter: newTokens,
          metadata: {
            category: 'leaderboard',
            period: 'weekly',
            rank,
            weekId,
          },
        });

        const notifRef = db.collection('notifications').doc();
        tx.set(notifRef, {
          recipientId: userId,
          senderId: 'system',
          type: 'leaderboard_reward',
          senderDisplayName: 'System',
          previewText: `Weekly leaderboard #${rank}: +${tokens} tokens`,
          read: false,
          createdAt: new Date().toISOString(),
          weekId,
          rank,
          tokens,
        });

        tx.set(payoutRef, {
          userId,
          weekId,
          rank,
          tokens,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    });

    await Promise.all(payoutPromises);
  }
);

// === Algolia search sync for forum_posts ===

// Helper: prepare Algolia record from Firestore doc
function toAlgoliaRecord(postId, data) {
  return {
    objectID: postId,
    title: data.title || '',
    content: data.content || '',
    category: data.category || '',
    userDisplayName: data.userDisplayName || '',
    userId: data.userId || '',
    createdAt: data.createdAt || '',
    // You can add more fields if you want them searchable/filterable
  };
}

// Create: when a new forum post is created
exports.syncForumPostToAlgoliaOnCreate = onDocumentCreated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Update: when a forum post is updated
exports.syncForumPostToAlgoliaOnUpdate = onDocumentUpdated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.after.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Delete: when a forum post is deleted
exports.syncForumPostToAlgoliaOnDelete = onDocumentDeleted(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const postId = event.params.postId;
    await algoliaIndex.deleteObject(postId);
  }
);
