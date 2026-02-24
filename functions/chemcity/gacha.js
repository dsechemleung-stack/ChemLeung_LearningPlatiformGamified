'use strict';

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { randomInt } = require('crypto');

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const DRAW_COST = { tickets: 1, coins: 500 };

const TICKET_EXCHANGE = { coinsPerTicket: 250 };

function nowIso() {
  return new Date().toISOString();
}

function invalid(msg) {
  throw new HttpsError('invalid-argument', msg);
}

function precondition(msg) {
  throw new HttpsError('failed-precondition', msg);
}

async function ensureChemCityGachaFields(db, uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  const data = snap.data() || {};
  const chemcity = data.chemcity && typeof data.chemcity === 'object' ? data.chemcity : null;
  if (!chemcity) {
    // Let the main chemcity init flow create the chemcity root. We only merge gacha fields.
    // Existing codebase already provides chemcityInitUser/ensureChemCityInitialized.
    await userRef.set(
      {
        chemcity: {
          currencies: { tickets: 0 },
          ownedCosmetics: [],
          equippedCosmetics: {
            avatarId: 'avatar_1_plain',
            backgroundId: 'bg_1',
          },
          gachaState: {},
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    return;
  }

  const currencies = chemcity.currencies && typeof chemcity.currencies === 'object' ? chemcity.currencies : {};

  const patch = {};

  if (typeof currencies.tickets !== 'number') {
    patch['chemcity.currencies.tickets'] = 0;
  }
  if (!Array.isArray(chemcity.ownedCosmetics)) {
    patch['chemcity.ownedCosmetics'] = [];
  }
  if (!chemcity.equippedCosmetics || typeof chemcity.equippedCosmetics !== 'object') {
    patch['chemcity.equippedCosmetics'] = {
      avatarId: 'avatar_1_plain',
      backgroundId: 'bg_1',
    };
  }
  if (!chemcity.gachaState || typeof chemcity.gachaState !== 'object') {
    patch['chemcity.gachaState'] = {};
  }

  if (Object.keys(patch).length > 0) {
    patch['chemcity.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
    await userRef.update(patch);
  }

  // Gift defaults: ensure user owns and has equipped the starter cosmetics.
  // (Only applies when fields already exist; safe for repeated calls.)
  try {
    const data2 = (await userRef.get()).data() || {};
    const cc2 = data2.chemcity && typeof data2.chemcity === 'object' ? data2.chemcity : {};
    const owned = Array.isArray(cc2.ownedCosmetics) ? cc2.ownedCosmetics : [];
    const equipped = cc2.equippedCosmetics && typeof cc2.equippedCosmetics === 'object' ? cc2.equippedCosmetics : {};

    const needOwned = !owned.includes('avatar_1_plain') || !owned.includes('bg_1');
    const needEquipped = !equipped.avatarId || !equipped.backgroundId;

    if (needOwned || needEquipped) {
      const nextOwned = owned.slice();
      if (!nextOwned.includes('avatar_1_plain')) nextOwned.push('avatar_1_plain');
      if (!nextOwned.includes('bg_1')) nextOwned.push('bg_1');
      await userRef.update({
        'chemcity.ownedCosmetics': nextOwned,
        'chemcity.equippedCosmetics': {
          avatarId: equipped.avatarId || 'avatar_1_plain',
          backgroundId: equipped.backgroundId || 'bg_1',
          ...(equipped.iconId ? { iconId: equipped.iconId } : {}),
        },
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch {
    // ignore
  }
}

function secureRandom() {
  return randomInt(0, 2 ** 32) / 2 ** 32;
}

async function loadActiveBanner(db, bannerId) {
  const snap = await db.collection('gachaBanners').doc(bannerId).get();
  if (!snap.exists) invalid(`Banner "${bannerId}" not found.`);
  const banner = { id: snap.id, ...(snap.data() || {}) };
  if (!banner.active) precondition('Banner is not active.');

  const now = new Date();
  if (banner.startAt) {
    const start = typeof banner.startAt?.toDate === 'function' ? banner.startAt.toDate() : new Date(banner.startAt);
    if (now < start) precondition('Banner has not started yet.');
  }
  if (banner.endAt) {
    const end = typeof banner.endAt?.toDate === 'function' ? banner.endAt.toDate() : new Date(banner.endAt);
    if (now > end) precondition('Banner has ended.');
  }
  return banner;
}

async function loadCompiledPool(db, bannerId) {
  const snap = await db
    .collection('gachaBanners')
    .doc(bannerId)
    .collection('entries')
    .where('enabled', '==', true)
    .get();

  if (snap.empty) invalid('Banner has no enabled entries.');

  const byRarity = {};
  snap.docs.forEach((d) => {
    const entry = { cosmeticId: d.id, ...(d.data() || {}) };
    if (!entry.rarity) return;
    if (!byRarity[entry.rarity]) byRarity[entry.rarity] = [];
    byRarity[entry.rarity].push({ cosmeticId: entry.cosmeticId, weight: Number(entry.weight || 1) });
  });

  const compiled = {};
  for (const [rarity, entries] of Object.entries(byRarity)) {
    let total = 0;
    const items = entries.map((e) => {
      total += e.weight;
      return { cosmeticId: e.cosmeticId, cumulativeWeight: total };
    });
    compiled[rarity] = { items, totalWeight: total };
  }
  return compiled;
}

function selectRarity(rarityRates, pityRules, pityState) {
  const sinceEpic = Number(pityState?.sinceEpic || 0);
  const sinceLegendary = Number(pityState?.sinceLegendary || 0);
  const epicEvery = Number(pityRules?.epicEvery || 20);
  const legendaryEvery = Number(pityRules?.legendaryEvery || 40);

  if (sinceLegendary >= legendaryEvery - 1) {
    return { rarity: 'legendary', pitied: true };
  }

  if (sinceEpic >= epicEvery - 1) {
    const roll = secureRandom();
    const epicRate = Number(rarityRates?.epic ?? 0.05);
    const legRate = Number(rarityRates?.legendary ?? 0.02);
    const total = epicRate + legRate;
    if (!(total > 0)) return { rarity: 'epic', pitied: true };
    return { rarity: roll < legRate / total ? 'legendary' : 'epic', pitied: true };
  }

  const roll = secureRandom();
  let cumulative = 0;
  for (const rarity of [...RARITY_ORDER].reverse()) {
    cumulative += Number(rarityRates?.[rarity] ?? 0);
    if (roll <= cumulative) return { rarity, pitied: false };
  }
  return { rarity: 'common', pitied: false };
}

function selectCosmetic(compiledPool, rarity) {
  const rarityIndex = RARITY_ORDER.indexOf(rarity);

  for (let i = rarityIndex; i >= 0; i--) {
    const r = RARITY_ORDER[i];
    const pool = compiledPool[r];
    if (!pool || pool.totalWeight <= 0) continue;

    const roll = secureRandom() * pool.totalWeight;
    const entry = pool.items.find((e) => e.cumulativeWeight >= roll);
    return entry ? entry.cosmeticId : pool.items[pool.items.length - 1].cosmeticId;
  }

  for (const r of [...RARITY_ORDER].reverse()) {
    const pool = compiledPool[r];
    if (pool && pool.items?.length > 0) return pool.items[0].cosmeticId;
  }

  throw new HttpsError('internal', 'No cosmetics available in pool.');
}

function updatePity(currentState, rarity) {
  let sinceEpic = Number(currentState?.sinceEpic || 0);
  let sinceLegendary = Number(currentState?.sinceLegendary || 0);
  let lifetimePulls = Number(currentState?.lifetimePulls || 0);

  lifetimePulls += 1;

  if (rarity === 'legendary') {
    sinceEpic = 0;
    sinceLegendary = 0;
  } else if (rarity === 'epic') {
    sinceEpic = 0;
    sinceLegendary += 1;
  } else {
    sinceEpic += 1;
    sinceLegendary += 1;
  }

  return { sinceEpic, sinceLegendary, lifetimePulls, updatedAt: nowIso() };
}

exports.chemcityGachaDraw = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'User must be signed in.');

    const bannerId = request.data?.bannerId;
    const count = request.data?.count;
    const payWith = request.data?.payWith;

    if (typeof bannerId !== 'string' || !bannerId) invalid('bannerId is required.');
    if (count !== 1 && count !== 10) invalid('count must be 1 or 10.');
    if (payWith !== 'tickets' && payWith !== 'coins') invalid('payWith must be "tickets" or "coins".');

    const db = admin.firestore();
    await ensureChemCityGachaFields(db, uid);

    const [banner, compiledPool] = await Promise.all([
      loadActiveBanner(db, bannerId),
      loadCompiledPool(db, bannerId),
    ]);

    const totalCost = payWith === 'tickets' ? DRAW_COST.tickets * count : DRAW_COST.coins * count;

    const userRef = db.collection('users').doc(uid);

    let resultsOut = [];
    let newBalanceOut = null;
    let newGachaStateOut = null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.');

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      const diamonds = Number(currencies.diamonds || 0);
      const tickets = Number(currencies.tickets || 0);

      const ownedCosmeticsArr = Array.isArray(chemcity.ownedCosmetics) ? chemcity.ownedCosmetics.map(String) : [];
      const ownedCosmetics = new Set(ownedCosmeticsArr);

      const gachaState = chemcity.gachaState && typeof chemcity.gachaState === 'object' ? chemcity.gachaState : {};
      const pityBefore = gachaState[bannerId] && typeof gachaState[bannerId] === 'object'
        ? gachaState[bannerId]
        : { sinceEpic: 0, sinceLegendary: 0, lifetimePulls: 0, updatedAt: nowIso() };

      if (payWith === 'tickets' && tickets < totalCost) {
        precondition(`Not enough tickets. Need ${totalCost}, have ${tickets}.`);
      }
      if (payWith === 'coins' && coins < totalCost) {
        precondition(`Not enough coins. Need ${totalCost}, have ${coins}.`);
      }

      let pity = { ...pityBefore };
      let coinRefundTotal = 0;
      const results = [];
      const rollTrace = [];

      for (let i = 0; i < count; i++) {
        const { rarity, pitied } = selectRarity(banner.rarityRates, banner.pityRules, pity);
        const cosmeticId = selectCosmetic(compiledPool, rarity);

        const isNew = !ownedCosmetics.has(cosmeticId);
        let refundCoins = 0;

        if (isNew) {
          ownedCosmetics.add(cosmeticId);
        } else {
          refundCoins = Number(banner.duplicateRefundCoinsByRarity?.[rarity] || 0);
          if (!Number.isFinite(refundCoins) || refundCoins < 0) refundCoins = 0;
          coinRefundTotal += refundCoins;
        }

        pity = updatePity(pity, rarity);

        results.push({ cosmeticId, rarity, isNew, refundCoins, pitied });
        rollTrace.push({ i, cosmeticId, rarity, pitied, isNew, refundCoins });
      }

      // 10-pull guarantee: ensure at least one Rare+ result.
      if (count === 10) {
        const hasRarePlus = results.some((r) => ['rare', 'epic', 'legendary'].includes(r.rarity));
        if (!hasRarePlus) {
          // Upgrade the last pull to Rare (no pity flag), and reroll cosmetic from the Rare pool.
          const upgradedCosmeticId = selectCosmetic(compiledPool, 'rare');
          const old = results[9];
          const wasNew = !ownedCosmetics.has(upgradedCosmeticId);
          let refundCoins = 0;

          if (wasNew) {
            ownedCosmetics.add(upgradedCosmeticId);
          } else {
            refundCoins = Number(banner.duplicateRefundCoinsByRarity?.['rare'] || 0);
            if (!Number.isFinite(refundCoins) || refundCoins < 0) refundCoins = 0;
          }

          // If we replaced a duplicate that previously refunded coins, remove that previous refund.
          if (!old.isNew && Number.isFinite(Number(old.refundCoins))) {
            coinRefundTotal -= Number(old.refundCoins || 0);
          }
          coinRefundTotal += refundCoins;

          results[9] = {
            cosmeticId: upgradedCosmeticId,
            rarity: 'rare',
            isNew: wasNew,
            refundCoins,
            pitied: false,
          };
          rollTrace.push({
            i: 9,
            cosmeticId: upgradedCosmeticId,
            rarity: 'rare',
            pitied: false,
            isNew: wasNew,
            refundCoins,
            guaranteed: true,
          });
        }
      }

      const nextCoins = payWith === 'coins'
        ? coins - totalCost + coinRefundTotal
        : coins + coinRefundTotal;
      const nextTickets = payWith === 'tickets' ? tickets - totalCost : tickets;

      const updatedCurrencies = {
        coins: nextCoins,
        diamonds,
        tickets: nextTickets,
      };

      const updatedOwnedCosmetics = Array.from(ownedCosmetics);
      const updatedGachaState = { ...gachaState, [bannerId]: pity };

      tx.update(userRef, {
        'chemcity.currencies': updatedCurrencies,
        'chemcity.ownedCosmetics': updatedOwnedCosmetics,
        'chemcity.gachaState': updatedGachaState,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      const drawLogRef = userRef.collection('chemcity_gacha_draws').doc();
      tx.set(drawLogRef, {
        bannerId,
        count,
        payWith,
        totalCost,
        coinRefundTotal,
        results: rollTrace,
        currenciesBefore: { coins, diamonds, tickets },
        currenciesAfter: updatedCurrencies,
        pityBefore,
        pityAfter: pity,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      resultsOut = results;
      newBalanceOut = updatedCurrencies;
      newGachaStateOut = pity;
    });

    return {
      success: true,
      results: resultsOut,
      newBalance: newBalanceOut,
      newGachaState: newGachaStateOut,
    };
  },
);

exports.chemcityPurchaseCosmetic = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'User must be signed in.');

    const cosmeticId = request.data?.cosmeticId;
    const currency = request.data?.currency;

    if (typeof cosmeticId !== 'string' || !cosmeticId) invalid('cosmeticId is required.');
    if (currency !== 'coins' && currency !== 'diamonds' && currency !== 'tickets') {
      invalid('currency must be coins, diamonds, or tickets.');
    }

    const db = admin.firestore();
    await ensureChemCityGachaFields(db, uid);

    const cosmeticSnap = await db.collection('cosmetics').doc(cosmeticId).get();
    if (!cosmeticSnap.exists) invalid(`Cosmetic "${cosmeticId}" not found.`);
    const cosmetic = cosmeticSnap.data() || {};

    if (cosmetic.deprecated === true) precondition('Cosmetic is no longer available.');
    if (!(cosmetic.availability?.channels?.shop === true)) {
      precondition('This cosmetic is not available in the shop.');
    }

    const now = new Date();
    if (cosmetic.availability?.startAt) {
      const start = typeof cosmetic.availability.startAt?.toDate === 'function'
        ? cosmetic.availability.startAt.toDate()
        : new Date(cosmetic.availability.startAt);
      if (now < start) precondition('Cosmetic is not yet available.');
    }
    if (cosmetic.availability?.endAt) {
      const end = typeof cosmetic.availability.endAt?.toDate === 'function'
        ? cosmetic.availability.endAt.toDate()
        : new Date(cosmetic.availability.endAt);
      if (now > end) precondition('Cosmetic is no longer available.');
    }

    const shopData = cosmetic.shopData && typeof cosmetic.shopData === 'object' ? cosmetic.shopData : {};
    const costField = currency === 'coins'
      ? 'coinCost'
      : currency === 'diamonds'
        ? 'diamondCost'
        : 'ticketCost';

    const cost = Number(shopData[costField] || 0);
    if (!Number.isFinite(cost) || cost <= 0) {
      precondition(`This cosmetic cannot be purchased with ${currency}.`);
    }

    const userRef = db.collection('users').doc(uid);

    let newBalanceOut = null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.');

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const currencies = chemcity.currencies || {};
      const coins = Number(currencies.coins || 0);
      const diamonds = Number(currencies.diamonds || 0);
      const tickets = Number(currencies.tickets || 0);

      const owned = Array.isArray(chemcity.ownedCosmetics) ? chemcity.ownedCosmetics.map(String) : [];
      if (owned.includes(cosmeticId)) precondition('You already own this cosmetic.');

      const balance = currency === 'coins' ? coins : currency === 'diamonds' ? diamonds : tickets;
      if (balance < cost) precondition(`Not enough ${currency}. Need ${cost}, have ${balance}.`);

      const updatedCurrencies = {
        coins: currency === 'coins' ? coins - cost : coins,
        diamonds: currency === 'diamonds' ? diamonds - cost : diamonds,
        tickets: currency === 'tickets' ? tickets - cost : tickets,
      };

      tx.update(userRef, {
        'chemcity.currencies': updatedCurrencies,
        'chemcity.ownedCosmetics': admin.firestore.FieldValue.arrayUnion(cosmeticId),
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      const purchaseRef = userRef.collection('chemcity_purchases').doc();
      tx.set(purchaseRef, {
        cosmeticId,
        currency,
        cost,
        currenciesBefore: { coins, diamonds, tickets },
        currenciesAfter: updatedCurrencies,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      newBalanceOut = updatedCurrencies;
    });

    return {
      success: true,
      cosmeticId,
      newBalance: newBalanceOut,
    };
  },
);

exports.chemcityEquipCosmetics = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'User must be signed in.');

    const avatarId = request.data?.avatarId;
    const backgroundId = request.data?.backgroundId;
    const iconId = request.data?.iconId;

    if (!avatarId && !backgroundId && !iconId) {
      invalid('Provide at least one of avatarId, backgroundId, or iconId.');
    }

    const db = admin.firestore();
    await ensureChemCityGachaFields(db, uid);

    const userRef = db.collection('users').doc(uid);

    let updatedEquippedOut = null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.');

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};

      const owned = Array.isArray(chemcity.ownedCosmetics) ? chemcity.ownedCosmetics.map(String) : [];
      const ownedSet = new Set(owned);

      if (typeof avatarId === 'string' && avatarId && !ownedSet.has(avatarId)) {
        precondition(`You do not own avatar "${avatarId}".`);
      }
      if (typeof backgroundId === 'string' && backgroundId && !ownedSet.has(backgroundId)) {
        precondition(`You do not own background "${backgroundId}".`);
      }
      if (typeof iconId === 'string' && iconId && !ownedSet.has(iconId)) {
        precondition(`You do not own icon "${iconId}".`);
      }

      const currentEquipped = chemcity.equippedCosmetics && typeof chemcity.equippedCosmetics === 'object'
        ? chemcity.equippedCosmetics
        : {};

      const updatedEquipped = {
        ...currentEquipped,
        ...(avatarId !== undefined ? { avatarId } : null),
        ...(backgroundId !== undefined ? { backgroundId } : null),
        ...(iconId !== undefined ? { iconId } : null),
      };

      tx.update(userRef, {
        'chemcity.equippedCosmetics': updatedEquipped,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      updatedEquippedOut = updatedEquipped;
    });

    return {
      success: true,
      equippedCosmetics: updatedEquippedOut,
    };
  },
);

exports.chemcityBuyTickets = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'User must be signed in.');

    const count = request.data?.count;
    if (!Number.isFinite(Number(count)) || Number(count) <= 0) invalid('count must be a positive number.');
    const ticketCount = Math.floor(Number(count));
    if (ticketCount <= 0) invalid('count must be a positive integer.');

    const db = admin.firestore();
    await ensureChemCityGachaFields(db, uid);

    const userRef = db.collection('users').doc(uid);

    let newBalanceOut = null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.');

      const userData = userSnap.data() || {};
      const chemcity = userData.chemcity || {};
      const currencies = chemcity.currencies || {};

      const coins = Number(currencies.coins || 0);
      const diamonds = Number(currencies.diamonds || 0);
      const tickets = Number(currencies.tickets || 0);

      const totalCost = TICKET_EXCHANGE.coinsPerTicket * ticketCount;
      if (coins < totalCost) precondition(`Not enough coins. Need ${totalCost}, have ${coins}.`);

      const updatedCurrencies = {
        coins: coins - totalCost,
        diamonds,
        tickets: tickets + ticketCount,
      };

      tx.update(userRef, {
        'chemcity.currencies': updatedCurrencies,
        'chemcity.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      const purchaseRef = userRef.collection('chemcity_purchases').doc();
      tx.set(purchaseRef, {
        type: 'tickets',
        ticketCount,
        currency: 'coins',
        cost: totalCost,
        currenciesBefore: { coins, diamonds, tickets },
        currenciesAfter: updatedCurrencies,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      newBalanceOut = updatedCurrencies;
    });

    return {
      success: true,
      count: ticketCount,
      newBalance: newBalanceOut,
    };
  },
);
