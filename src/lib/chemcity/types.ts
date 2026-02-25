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
  baseId?: string;              // optional grouping key for item variants, e.g. "chem_h2o"
  name: string;                // e.g. "Salt"
  chemicalFormula: string;     // e.g. "NaCl" (Unicode subscripts)
  emoji: string;               // e.g. "🧂"
  imageUrl?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
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
  budgetOnly?: boolean;        // if true, can only be unlocked via extraSlotsBudget
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
  growthTokens?: number;
  currencies: {
    coins: number;
    diamonds: number;
    tickets?: number;
  };
  storeSlotCount: number;
  ownedItems: string[];        // array of item IDs only
  ownedCosmetics?: string[];
  equipped: {
    [slotId: string]: string;  // slotId → itemId
  };
  equippedCosmetics?: {
    avatarId?: string;
    backgroundId?: string;
    iconId?: string;
  };
  gachaState?: {
    [bannerId: string]: {
      sinceEpic: number;
      sinceLegendary: number;
      lifetimePulls: number;
      updatedAt?: unknown;
    };
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

// ─── Cosmetics + Gacha ───────────────────────────────────────

export type CosmeticType = 'avatar' | 'background' | 'icon';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface FaceCropMeta {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CosmeticAvailability {
  channels: {
    gacha: boolean;
    shop: boolean;
  };
  eventKey?: string;
  startAt?: unknown;
  endAt?: unknown;
}

export interface CosmeticShopData {
  coinCost?: number;
  diamondCost?: number;
  ticketCost?: number;
}

export interface Cosmetic {
  id: string;
  type: CosmeticType;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  imageUrlBoy?: string;
  imageUrlGirl?: string;
  availability: CosmeticAvailability;
  shopData?: CosmeticShopData;
  faceCrop?: FaceCropMeta;
  tags?: string[];
  deprecated?: boolean;
}

export type RarityRates = Record<Rarity, number>;

export type DuplicateRefunds = Record<Rarity, number>;

export interface PityRules {
  epicEvery: number;
  legendaryEvery: number;
}

export interface GachaBanner {
  id: string;
  name: string;
  description?: string;
  bannerImageUrl?: string;
  active: boolean;
  startAt?: unknown;
  endAt?: unknown;
  eventKey?: string;
  rarityRates: RarityRates;
  duplicateRefundCoinsByRarity: DuplicateRefunds;
  pityRules: PityRules;
  cacheVersion: number;
}

export interface GachaDrawRequest {
  bannerId: string;
  count: 1 | 10;
  payWith: 'tickets' | 'coins';
}

export interface GachaDrawResult {
  cosmeticId: string;
  rarity: Rarity;
  isNew: boolean;
  refundCoins: number;
  pitied: boolean;
}

export interface GachaDrawResponse {
  success: true;
  results: GachaDrawResult[];
  newBalance: {
    coins: number;
    tickets: number;
    diamonds?: number;
  };
  newGachaState: {
    sinceEpic: number;
    sinceLegendary: number;
    lifetimePulls: number;
    updatedAt?: unknown;
  };
}

export interface PurchaseCosmeticRequest {
  cosmeticId: string;
  currency: 'coins' | 'diamonds' | 'tickets';
}

export interface PurchaseCosmeticResponse {
  success: true;
  cosmeticId: string;
  newBalance: {
    coins: number;
    diamonds: number;
    tickets: number;
  };
}

export interface EquipCosmeticsRequest {
  avatarId?: string;
  backgroundId?: string;
  iconId?: string;
}

export interface EquipCosmeticsResponse {
  success: true;
  equippedCosmetics: {
    avatarId?: string;
    backgroundId?: string;
    iconId?: string;
  };
}

export interface BuyTicketsRequest {
  count: number;
}

export interface BuyTicketsResponse {
  success: true;
  count: number;
  newBalance: {
    coins: number;
    diamonds: number;
    tickets: number;
  };
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
  useExtraSlotBudget?: boolean;
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
