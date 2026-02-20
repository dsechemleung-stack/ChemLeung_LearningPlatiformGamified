// ============================================================
// ChemCity — TypeScript Types
// Single source of truth for all data shapes.
// DO NOT change field names once users have data in Firestore.
// ============================================================

// ─── Item Documents ──────────────────────────────────────────

/**
 * Slim fields only — what is cached in localStorage.
 * ~170 bytes per card. Never includes educational content.
 */
export interface SlimItemDocument {
  id: string;                  // e.g. "item_nacl"
  name: string;                // e.g. "Salt"
  chemicalFormula: string;     // e.g. "NaCl" (Unicode subscripts)
  emoji: string;               // e.g. "🧂"
  imageUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityValue: 1 | 2 | 3 | 4;
  placeId: PlaceId;            // which city location this belongs to
  validSlots: string[];        // slot IDs within that place
  shopData: {
    coinCost?: number;         // undefined = not coin-purchasable
    diamondCost?: number;      // undefined = not diamond-purchasable
  };
  skillContribution: number;   // this card's bonus value added to its place's skill total
  collections: string[];       // collection group IDs only — not full objects
  deprecated: boolean;         // true = hidden from UI, never delete the row
}

/**
 * Full fields — fetched from Firestore on card detail tap only.
 * ~800 bytes per card. NEVER stored in localStorage.
 */
export interface FullItemDocument extends SlimItemDocument {
  displayName: string;         // e.g. "The Seasoning of Life"
  description: string;
  cardBackground?: string;     // CSS gradient or colour token
  imageUrl?: string;
  topicConnections: string[];  // topic IDs this card relates to
  educational: {
    funFact: string;
    everydayUses: string[];
    category: 'element' | 'compound' | 'mixture' | 'process';
  };
  albumMetadata: {
    flavorText: string;
    sortOrder: number;
    tags: string[];
  };
}

// ─── Places ──────────────────────────────────────────────────

export type PlaceId =
  | 'lab'
  | 'kitchen'
  | 'toilet'
  | 'garden'
  | 'gas_station'
  | 'lifestyle_boutique'
  | 'beach'
  | 'school';

export interface SlotDocument {
  slotId: string;
  unlockCost?: number;         // undefined = free by default
  unlockCurrency?: 'coins' | 'diamonds';
  equippedItemId?: string;     // null = empty
}

export interface PlaceDocument {
  id: PlaceId;
  displayName: string;
  emoji: string;
  unlockCost: number;          // coin cost to unlock the place itself
  slots: SlotDocument[];
  skill: {
    description: string;
    formula: string;           // human-readable formula string for display
  };
}

// ─── User Documents ──────────────────────────────────────────

/**
 * Main user document — users/{userId}
 * Kept lean: only IDs and numbers, never full objects.
 */
export interface UserChemCityData {
  userId: string;
  currencies: {
    coins: number;
    diamonds: number;
  };
  ownedItems: string[];        // array of item IDs only
  equipped: {
    [slotId: string]: string;  // slotId → itemId
  };
  activeBonuses: ActiveBonuses;
  unlockedPlaces: PlaceId[];
  unlockedSlots: string[];     // slot IDs unlocked by the user
  extraSlotsBudget: number;    // remaining Gas Station bonus slots to distribute
  passiveIncome: {
    lastCollected: Date | null; // Firestore Timestamp — set by server
  };
  streaks: {
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string;     // ISO date string YYYY-MM-DD
    streakFreezeCount: number;
  };
  cacheVersion: number;        // last known version when user doc was written
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Progress sub-document — users/{userId}/progress/data
 * Separated to protect the 1MB Firestore doc limit.
 */
export interface UserProgressData {
  collections: {
    [collectionId: string]: {
      collected: number;
      total: number;
      completed: boolean;
      rewardClaimed: boolean;
    };
  };
  topicMastery: {
    [topicId: string]: {
      quizzesCompleted: number;
      correctAnswers: number;
      totalQuestions: number;
    };
  };
}

// ─── Bonus Engine ─────────────────────────────────────────────

/**
 * Computed bonuses — recalculated after every equip/unequip.
 * Persisted to user doc so they're available instantly on load.
 */
export interface ActiveBonuses {
  passiveBaseCoinsPerHour: number;      // Garden: total_bonus × 10
  passiveMultiplier: number;            // Lab:    1 + (total_bonus × 0.1)
  quizFlatDiamondBonus: number;         // Kitchen: total_bonus × random(1,3) — stored as max
  quizDiamondMultiplier: number;        // School: 1 + (total_bonus × 0.1)
  quizDoubleChancePercent: number;      // Beach:  min(total_bonus × 5, 100)
  dailyLoginDiamonds: number;           // Toilet: 5 + (total_bonus × 2)
  extraSlotsTotal: number;              // Gas Station: total_bonus
  shopDiscountPercent: number;          // Boutique: min(total_bonus × 2, 50) — capped at 50%
}

// ─── Cache ────────────────────────────────────────────────────

export interface CacheManifest {
  version: number;
  fetchedAt: number;           // Date.now() timestamp
  itemIds: string[];           // IDs of what's cached
}

// ─── Collections ─────────────────────────────────────────────

export interface CollectionDocument {
  id: string;
  displayName: string;
  description: string;
  itemIds: string[];
  rewardCoins?: number;
  rewardDiamonds?: number;
}

// ─── Topics ──────────────────────────────────────────────────

export interface TopicDocument {
  id: string;
  name: string;
  dseUnit: string;
  description?: string;
}

// ─── Cloud Function Request/Response Types ────────────────────

export interface EquipCardRequest {
  slotId: string;
  itemId: string;
}

export interface UnequipCardRequest {
  slotId: string;
}

export interface PurchaseCardRequest {
  itemId: string;
  currency: 'coins' | 'diamonds';
}

export interface UnlockPlaceRequest {
  placeId: string;
}

export interface UnlockSlotRequest {
  placeId: string;
  slotId: string;
}

export interface QuizRewardRequest {
  baseCoins: number;
  baseDiamonds: number;
  topicId?: string;
  correctAnswers?: number;
  totalQuestions?: number;
}

export interface QuizRewardResult {
  coinsAwarded: number;
  diamondsAwarded: number;
  didDouble?: boolean;
  breakdown?: {
    flatBonus: number;
    afterSchool: number;
    afterBeach: number;
  };
  ok?: boolean;
}
