// ============================================================
// ChemCity — Bonus Engine
// Computes all 8 place skill bonuses from equipped cards.
// Called after every equip/unequip — result persisted to user doc.
//
// FORMULAS (locked — do not change):
//   Garden:       coins_per_hour = total_bonus × 10
//   Lab:          multiplier = 1 + (total_bonus × 0.1)
//   Kitchen:      bonus_diamonds = total_bonus × random(1,3)  [max stored]
//   School:       multiplier = 1 + (total_bonus × 0.1)
//   Beach:        chance% = min(total_bonus × 5, 100)
//   Toilet:       diamonds = 5 + (total_bonus × 2)
//   Gas Station:  extra_slots_count = total_bonus
//   Boutique:     discount% = min(total_bonus × 2, 50)  [capped at 50%]
// ============================================================

import type { ActiveBonuses, SlimItemDocument } from './types';

// ─── Place Skill Totals ───────────────────────────────────────

/**
 * Given the equipped map { slotId → itemId } and the full slim item
 * catalog, sum up skillContribution per place.
 */
function sumBonusByPlace(
  equipped: Record<string, string>,
  slimItems: SlimItemDocument[],
): Record<string, number> {
  const itemMap = new Map(slimItems.map((i) => [i.id, i]));
  const totals: Record<string, number> = {};

  for (const itemId of Object.values(equipped)) {
    const item = itemMap.get(itemId);
    if (!item || item.deprecated) continue;
    const place = item.placeId;
    totals[place] = (totals[place] ?? 0) + item.skillContribution;
  }

  return totals;
}

// ─── Individual Skill Formulas ────────────────────────────────

/** Garden — base passive coin income per hour */
export function calcGardenCoinsPerHour(totalBonus: number): number {
  return totalBonus * 10;
}

/** Lab — passive income multiplier applied to Garden base */
export function calcLabMultiplier(totalBonus: number): number {
  return 1 + totalBonus * 0.1;
}

/** Kitchen — flat diamond bonus per quiz (returns the MAX of the range) */
export function calcKitchenMaxDiamonds(totalBonus: number): number {
  return totalBonus * 3; // range is (1×bonus) to (3×bonus); store max
}

/** Kitchen — roll the actual bonus at quiz time */
export function rollKitchenBonus(totalBonus: number): number {
  if (totalBonus === 0) return 0;
  const min = totalBonus * 1;
  const max = totalBonus * 3;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** School — quiz diamond multiplier */
export function calcSchoolMultiplier(totalBonus: number): number {
  return 1 + totalBonus * 0.1;
}

/** Beach — chance % to double quiz diamonds (capped at 100%) */
export function calcBeachDoubleChance(totalBonus: number): number {
  return Math.min(totalBonus * 5, 100);
}

/** Beach — roll whether diamonds are doubled at quiz time */
export function rollBeachDouble(totalBonus: number): boolean {
  return Math.random() * 100 < calcBeachDoubleChance(totalBonus);
}

/** Toilet — diamonds awarded on daily login */
export function calcToiletLoginDiamonds(totalBonus: number): number {
  return 5 + totalBonus * 2;
}

/** Gas Station — number of extra slots available to distribute */
export function calcGasStationExtraSlots(totalBonus: number): number {
  return totalBonus;
}

/** Boutique — shop discount % (capped at 50%) */
export function calcBoutiqueDiscount(totalBonus: number): number {
  return Math.min(totalBonus * 2, 50);
}

// ─── Quiz Diamond Chain ───────────────────────────────────────

/**
 * Full quiz diamond chain:
 *   base → + Kitchen flat → × School multiplier → Beach double chance
 *
 * Called by the quizReward Cloud Function — NOT the client.
 * Exposed here for unit tests and the Cloud Function to import.
 */
export function computeQuizDiamonds(
  baseDiamonds: number,
  bonuses: ActiveBonuses,
): number {
  let total = baseDiamonds;

  // Step 1: Kitchen flat bonus (randomised per quiz)
  const kitchenBonus = bonuses.quizFlatDiamondBonus > 0
    ? rollKitchenBonus(/* totalBonus */ bonuses.quizFlatDiamondBonus / 3)
    : 0;
  total += kitchenBonus;

  // Step 2: School multiplier
  total = Math.floor(total * bonuses.quizDiamondMultiplier);

  // Step 3: Beach double chance
  if (rollBeachDouble(bonuses.quizDoubleChancePercent / 5)) {
    total *= 2;
  }

  return Math.max(0, total);
}

// ─── Main Bonus Recompute ─────────────────────────────────────

/**
 * Recomputes all 8 active bonuses from the current equipped state.
 *
 * Call after every equip/unequip, then persist result to:
 *   users/{userId}.activeBonuses
 *
 * This is a PURE function — no Firestore reads. Fast and testable.
 */
export function computeActiveBonuses(
  equipped: Record<string, string>,
  slimItems: SlimItemDocument[],
): ActiveBonuses {
  const totals = sumBonusByPlace(equipped, slimItems);

  const gardenBonus = totals['garden'] ?? 0;
  const labBonus = totals['lab'] ?? 0;
  const kitchenBonus = totals['kitchen'] ?? 0;
  const schoolBonus = totals['school'] ?? 0;
  const beachBonus = totals['beach'] ?? 0;
  const toiletBonus = totals['toilet'] ?? 0;
  const gasStationBonus = totals['gas_station'] ?? 0;
  const boutiqueBonus = totals['lifestyle_boutique'] ?? 0;

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

// ─── Shop Price Helper ────────────────────────────────────────

/**
 * Returns the discounted price of an item given active bonuses.
 * Always used before displaying prices in ChemStore.
 */
export function getShopPrice(
  baseCost: number,
  currency: 'coins' | 'diamonds',
  bonuses: ActiveBonuses,
): number {
  if (currency === 'diamonds') return baseCost; // diamonds never discounted
  const discount = bonuses.shopDiscountPercent / 100;
  return Math.max(1, Math.floor(baseCost * (1 - discount)));
}
