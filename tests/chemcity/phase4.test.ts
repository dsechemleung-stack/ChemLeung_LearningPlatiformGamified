import {
  getDailyStoreItems,
  utcDateString,
  msUntilUtcMidnight,
  countdownToMidnight,
  STORE_SLOT_UNLOCK_COSTS,
  STORE_MIN_SLOTS,
  STORE_MAX_SLOTS,
} from '../../src/lib/chemcity/dailyStore';

import { getEffectiveCoinPrice, canAffordItem, getDisplayPrice } from '../../src/lib/chemcity/shop';

import type { SlimItemDocument, ActiveBonuses } from '../../src/lib/chemcity/types';

function makeItem(id: string, rarity: SlimItemDocument['rarity'], coinCost: number): SlimItemDocument {
  return {
    id,
    name: id,
    chemicalFormula: 'X',
    emoji: '🧪',
    rarity,
    rarityValue: { common: 1, rare: 2, epic: 3, legendary: 4 }[rarity] as any,
    placeId: 'lab',
    validSlots: ['lab_bench_1'],
    shopData: { coinCost },
    skillContribution: 0,
    collections: [],
    deprecated: false,
  };
}

function makeActiveBonuses(shopDiscountPercent: number): ActiveBonuses {
  return {
    passiveBaseCoinsPerHour: 0,
    passiveMultiplier: 1,
    quizFlatDiamondBonus: 0,
    quizDiamondMultiplier: 1,
    quizDoubleChancePercent: 0,
    dailyLoginDiamonds: 5,
    extraSlotsTotal: 0,
    shopDiscountPercent,
  };
}

const POOL = [
  ...Array.from({ length: 20 }, (_, i) => makeItem(`common_${i}`, 'common', 100)),
  ...Array.from({ length: 8 }, (_, i) => makeItem(`rare_${i}`, 'rare', 300)),
  ...Array.from({ length: 4 }, (_, i) => makeItem(`epic_${i}`, 'epic', 600)),
  ...Array.from({ length: 1 }, (_, i) => makeItem(`legendary_${i}`, 'legendary', 1000)),
];

describe('getDailyStoreItems — determinism', () => {
  const DATE = new Date('2026-03-01T12:00:00Z');

  it('returns exactly storeSlotCount items', () => {
    const items = getDailyStoreItems('user123', POOL, 3, DATE);
    expect(items).toHaveLength(3);
  });

  it('returns correct count for 6 slots', () => {
    const items = getDailyStoreItems('user123', POOL, 6, DATE);
    expect(items).toHaveLength(6);
  });

  it('same user + same date → same items (deterministic)', () => {
    const a = getDailyStoreItems('user123', POOL, 3, DATE);
    const b = getDailyStoreItems('user123', POOL, 3, DATE);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it('different users on same date → different selections', () => {
    const a = getDailyStoreItems('user_A', POOL, 3, DATE);
    const b = getDailyStoreItems('user_B', POOL, 3, DATE);
    expect(a.map((i) => i.id).join(',')).not.toBe(b.map((i) => i.id).join(','));
  });

  it('same user on different days → different selections', () => {
    const day1 = new Date('2026-03-01T00:00:00Z');
    const day2 = new Date('2026-03-02T00:00:00Z');
    const a = getDailyStoreItems('user123', POOL, 3, day1);
    const b = getDailyStoreItems('user123', POOL, 3, day2);
    expect(a.map((i) => i.id).join(',')).not.toBe(b.map((i) => i.id).join(','));
  });

  it('no duplicate items in same day selection', () => {
    const items = getDailyStoreItems('user123', POOL, 6, DATE);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes deprecated items', () => {
    const poolWithDeprecated = [...POOL, { ...makeItem('deprecated_1', 'legendary', 500), deprecated: true }];
    for (let u = 0; u < 20; u++) {
      const items = getDailyStoreItems(`u${u}`, poolWithDeprecated, 6, DATE);
      items.forEach((item) => expect(item.deprecated).toBeFalsy());
    }
  });

  it('excludes items with no shop price', () => {
    const poolWithUnpurchasable = [...POOL, { ...makeItem('noshop_1', 'epic', 0), shopData: {} } as any];
    for (let u = 0; u < 20; u++) {
      const items = getDailyStoreItems(`u${u}`, poolWithUnpurchasable, 6, DATE);
      items.forEach((item) => {
        const hasCoin = item.shopData?.coinCost != null;
        const hasDia = item.shopData?.diamondCost != null;
        expect(hasCoin || hasDia).toBe(true);
      });
    }
  });
});

describe('utcDateString', () => {
  it('formats date as YYYY-MM-DD UTC', () => {
    expect(utcDateString(new Date('2026-03-05T23:59:59Z'))).toBe('2026-03-05');
  });

  it('rolls over at UTC midnight', () => {
    expect(utcDateString(new Date('2026-03-05T23:59:59.999Z'))).toBe('2026-03-05');
    expect(utcDateString(new Date('2026-03-06T00:00:00.000Z'))).toBe('2026-03-06');
  });
});

describe('msUntilUtcMidnight', () => {
  it('always returns a positive number', () => {
    expect(msUntilUtcMidnight()).toBeGreaterThan(0);
  });
});

describe('Store slot constants', () => {
  it('STORE_MIN_SLOTS is 3', () => expect(STORE_MIN_SLOTS).toBe(3));
  it('STORE_MAX_SLOTS is 6', () => expect(STORE_MAX_SLOTS).toBe(6));

  it('unlock costs are defined for slots 4, 5, 6', () => {
    expect(STORE_SLOT_UNLOCK_COSTS[4]).toBeGreaterThan(0);
    expect(STORE_SLOT_UNLOCK_COSTS[5]).toBeGreaterThan(STORE_SLOT_UNLOCK_COSTS[4]);
    expect(STORE_SLOT_UNLOCK_COSTS[6]).toBeGreaterThan(STORE_SLOT_UNLOCK_COSTS[5]);
  });
});

describe('getEffectiveCoinPrice', () => {
  it('no discount → original price', () => {
    expect(getEffectiveCoinPrice(200, makeActiveBonuses(0))).toBe(200);
  });

  it('50% discount halves the price', () => {
    expect(getEffectiveCoinPrice(200, makeActiveBonuses(50))).toBe(100);
  });

  it('never reduces below 1', () => {
    expect(getEffectiveCoinPrice(1, makeActiveBonuses(50))).toBe(1);
  });
});

describe('canAffordItem', () => {
  it('can afford exact coin price', () => {
    expect(canAffordItem(100, undefined, 'coins', 100, 0, makeActiveBonuses(0))).toBe(true);
  });

  it('discount makes unaffordable item affordable', () => {
    expect(canAffordItem(200, undefined, 'coins', 100, 0, makeActiveBonuses(50))).toBe(true);
  });
});

describe('getDisplayPrice', () => {
  it('coin price with 20% discount → 80', () => {
    expect(getDisplayPrice(100, undefined, 'coins', makeActiveBonuses(20))).toBe(80);
  });

  it('returns null when currency path unavailable', () => {
    expect(getDisplayPrice(undefined, 100, 'coins', makeActiveBonuses(0))).toBeNull();
    expect(getDisplayPrice(100, undefined, 'diamonds', makeActiveBonuses(0))).toBeNull();
  });
});

describe('countdownToMidnight', () => {
  it('returns a string', () => {
    expect(typeof countdownToMidnight(new Date('2026-03-05T22:30:00.000Z'))).toBe('string');
  });
});
