// ============================================================
// dailyStore.ts — Daily rotating ChemStore logic
// ============================================================

import type { SlimItemDocument } from './types';

export const STORE_SLOT_UNLOCK_COSTS: Record<number, number> = {
  4: 1_000,
  5: 2_500,
  6: 5_000,
};
export const STORE_MIN_SLOTS = 3;
export const STORE_MAX_SLOTS = 6;

const RARITY_WEIGHT: Record<string, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

function rarityWeight(item: SlimItemDocument): number {
  return RARITY_WEIGHT[item.rarity] ?? 60;
}

function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function utcDateString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function msUntilUtcMidnight(now: Date = new Date()): number {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

export function countdownToMidnight(now: Date = new Date()): string {
  const ms = msUntilUtcMidnight(now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${m}m ${s}s`;
}

export function getDailyStoreItems(
  userId: string,
  slimItems: SlimItemDocument[],
  slotCount: number,
  dateOverride?: Date,
): SlimItemDocument[] {
  const n = Math.max(STORE_MIN_SLOTS, Math.min(STORE_MAX_SLOTS, slotCount));

  const pool = slimItems.filter(
    (item) =>
      !item.deprecated &&
      (item.shopData?.coinCost != null || item.shopData?.diamondCost != null),
  );

  if (pool.length === 0) return [];
  if (pool.length <= n) return [...pool];

  const seed = hashString(userId + utcDateString(dateOverride));
  const rand = makePrng(seed);

  const selected: SlimItemDocument[] = [];
  const remaining = [...pool];

  for (let i = 0; i < n && remaining.length > 0; i++) {
    const weights = remaining.map(rarityWeight);
    const total = weights.reduce((a, b) => a + b, 0);
    let pick = rand() * total;

    let chosenIdx = remaining.length - 1;
    for (let j = 0; j < weights.length; j++) {
      pick -= weights[j];
      if (pick <= 0) {
        chosenIdx = j;
        break;
      }
    }

    selected.push(remaining[chosenIdx]);
    remaining.splice(chosenIdx, 1);
  }

  return selected;
}
