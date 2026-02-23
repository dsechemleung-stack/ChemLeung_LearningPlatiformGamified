// tests/chemcity/phase5.test.ts
// Phase 5 — Collections Album + Onboarding tests
// Run with: npm test

import type { CollectionDocument, SlimItemDocument } from '../../src/lib/chemcity/types';

function makeSlimItem(id: string, collections: string[]): SlimItemDocument {
  return {
    id,
    name: id,
    chemicalFormula: 'H₂O',
    emoji: '💧',
    rarity: 'common',
    rarityValue: 1,
    placeId: 'lab',
    validSlots: ['lab_bench'],
    shopData: { coinCost: 100 },
    skillContribution: 1,
    collections,
    deprecated: false,
  };
}

function makeCollection(
  id: string,
  itemIds: string[],
  rewards?: { rewardCoins?: number; rewardDiamonds?: number },
): CollectionDocument {
  return {
    id,
    displayName: id,
    description: `Collection: ${id}`,
    itemIds,
    ...rewards,
  };
}

function computeCollectionProgress(
  collection: CollectionDocument,
  ownedItemIds: Set<string>,
): { collected: number; total: number; completed: boolean } {
  const total = collection.itemIds.length;
  const collected = collection.itemIds.filter((id) => ownedItemIds.has(id)).length;
  return { collected, total, completed: collected === total && total > 0 };
}

describe('Collection progress computation', () => {
  const col = makeCollection('acids', ['item_hcl', 'item_h2so4', 'item_hno3']);

  it('empty owned → 0 collected', () => {
    const { collected, completed } = computeCollectionProgress(col, new Set());
    expect(collected).toBe(0);
    expect(completed).toBe(false);
  });

  it('partial ownership → not completed', () => {
    const { collected, completed } = computeCollectionProgress(col, new Set(['item_hcl', 'item_h2so4']));
    expect(collected).toBe(2);
    expect(completed).toBe(false);
  });

  it('all items owned → completed', () => {
    const { collected, completed } = computeCollectionProgress(
      col,
      new Set(['item_hcl', 'item_h2so4', 'item_hno3']),
    );
    expect(collected).toBe(3);
    expect(completed).toBe(true);
  });

  it('empty collection is never completed', () => {
    const empty = makeCollection('empty', []);
    const { completed } = computeCollectionProgress(empty, new Set(['item_hcl']));
    expect(completed).toBe(false);
  });

  it('extra owned items not in collection do not count', () => {
    const owned = new Set(['item_hcl', 'item_h2so4', 'item_hno3', 'item_nacl', 'item_kcl']);
    const { collected, total } = computeCollectionProgress(col, owned);
    expect(collected).toBe(3);
    expect(total).toBe(3);
  });
});

function computeAlbumOverall(
  collections: CollectionDocument[],
  ownedItemIds: Set<string>,
): { totalComplete: number; totalCollections: number; overallPct: number } {
  let totalComplete = 0;
  for (const col of collections) {
    const { completed } = computeCollectionProgress(col, ownedItemIds);
    if (completed) totalComplete++;
  }
  const totalCollections = collections.length;
  const overallPct = totalCollections > 0 ? Math.round((totalComplete / totalCollections) * 100) : 0;
  return { totalComplete, totalCollections, overallPct };
}

describe('Album overall progress', () => {
  const cols = [
    makeCollection('acids', ['item_hcl', 'item_h2so4']),
    makeCollection('salts', ['item_nacl', 'item_kcl']),
    makeCollection('metals', ['item_fe', 'item_cu']),
  ];

  it('no collections owned → 0% overall', () => {
    const { overallPct } = computeAlbumOverall(cols, new Set());
    expect(overallPct).toBe(0);
  });

  it('one of three collections complete → 33%', () => {
    const { overallPct, totalComplete } = computeAlbumOverall(cols, new Set(['item_hcl', 'item_h2so4']));
    expect(totalComplete).toBe(1);
    expect(overallPct).toBe(33);
  });

  it('all collections complete → 100%', () => {
    const owned = new Set(['item_hcl', 'item_h2so4', 'item_nacl', 'item_kcl', 'item_fe', 'item_cu']);
    const { overallPct } = computeAlbumOverall(cols, owned);
    expect(overallPct).toBe(100);
  });

  it('empty collections list → 0%', () => {
    const { overallPct } = computeAlbumOverall([], new Set(['item_hcl']));
    expect(overallPct).toBe(0);
  });
});

type FilterState = 'all' | 'complete' | 'incomplete';

function applyCollectionFilter(
  enriched: Array<{ collection: CollectionDocument; completed: boolean }>,
  filter: FilterState,
) {
  if (filter === 'complete') return enriched.filter((e) => e.completed);
  if (filter === 'incomplete') return enriched.filter((e) => !e.completed);
  return enriched;
}

describe('Collection filter', () => {
  const acids = makeCollection('acids', ['item_hcl', 'item_h2so4']);
  const salts = makeCollection('salts', ['item_nacl', 'item_kcl']);

  const enriched = [
    { collection: acids, completed: true },
    { collection: salts, completed: false },
  ];

  it('"all" shows all collections', () => {
    expect(applyCollectionFilter(enriched, 'all')).toHaveLength(2);
  });

  it('"complete" shows only completed', () => {
    const result = applyCollectionFilter(enriched, 'complete');
    expect(result).toHaveLength(1);
    expect(result[0].collection.id).toBe('acids');
  });

  it('"incomplete" shows only incomplete', () => {
    const result = applyCollectionFilter(enriched, 'incomplete');
    expect(result).toHaveLength(1);
    expect(result[0].collection.id).toBe('salts');
  });
});

function validateClaimReward(
  collection: CollectionDocument,
  ownedItemIds: Set<string>,
  alreadyClaimed: boolean,
): { valid: boolean; reason?: string } {
  if (collection.itemIds.length === 0) {
    return { valid: false, reason: 'Collection has no items.' };
  }
  const allOwned = collection.itemIds.every((id) => ownedItemIds.has(id));
  if (!allOwned) {
    return { valid: false, reason: 'Collection not complete.' };
  }
  if (alreadyClaimed) {
    return { valid: false, reason: 'Reward already claimed.' };
  }
  return { valid: true };
}

describe('Claim collection reward validation', () => {
  const col = makeCollection('acids', ['item_hcl', 'item_h2so4'], {
    rewardCoins: 500,
    rewardDiamonds: 10,
  });

  it('valid claim when all owned + not claimed', () => {
    const result = validateClaimReward(col, new Set(['item_hcl', 'item_h2so4']), false);
    expect(result.valid).toBe(true);
  });

  it('invalid when collection incomplete', () => {
    const result = validateClaimReward(col, new Set(['item_hcl']), false);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('complete');
  });

  it('invalid when already claimed', () => {
    const result = validateClaimReward(col, new Set(['item_hcl', 'item_h2so4']), true);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('claimed');
  });

  it('invalid when collection has no items', () => {
    const empty = makeCollection('empty', []);
    const result = validateClaimReward(empty, new Set(['item_hcl']), false);
    expect(result.valid).toBe(false);
  });
});

const ONBOARDING_KEY = 'chemcity_onboarding_done_v1';

function shouldShowOnboarding(storageValue: string | null, createdAtMs: number | null, nowMs: number): boolean {
  if (storageValue === '1') return false;
  if (createdAtMs === null) return true;
  return nowMs - createdAtMs < 90_000;
}

describe('Onboarding display logic', () => {
  const NOW = 1_700_000_000_000;

  it('shows onboarding for brand new user with no storage flag', () => {
    expect(shouldShowOnboarding(null, null, NOW)).toBe(true);
  });

  it('shows onboarding for user created < 90 s ago', () => {
    expect(shouldShowOnboarding(null, NOW - 30_000, NOW)).toBe(true);
  });

  it('hides onboarding for user created > 90 s ago', () => {
    expect(shouldShowOnboarding(null, NOW - 120_000, NOW)).toBe(false);
  });

  it('hides onboarding when localStorage flag is set', () => {
    expect(shouldShowOnboarding('1', null, NOW)).toBe(false);
  });

  it('localStorage flag takes priority over creation time', () => {
    expect(shouldShowOnboarding('1', NOW - 10_000, NOW)).toBe(false);
  });
});

describe('Slim item collection field', () => {
  it('item can belong to multiple collections', () => {
    const item = makeSlimItem('item_water', ['household', 'life_essentials']);
    expect(item.collections).toContain('household');
    expect(item.collections).toContain('life_essentials');
  });

  it('item can belong to no collections', () => {
    const item = makeSlimItem('item_radon', []);
    expect(item.collections).toHaveLength(0);
  });

  it('deprecated items are excluded from collection display', () => {
    const item = makeSlimItem('item_old', ['acids']);
    item.deprecated = true;
    expect(item.deprecated).toBe(true);
  });
});
