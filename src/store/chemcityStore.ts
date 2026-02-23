import { create } from 'zustand';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { fetchSlimItems, fetchPlaces, fetchFullItem, fetchCollections } from '../lib/cache';
import type {
  UserChemCityData,
  UserProgressData,
  SlimItemDocument,
  PlaceDocument,
  FullItemDocument,
  CollectionDocument,
} from '../lib/chemcity/types';
import {
  callChemCityInitUser,
  callChemCityMigrateSlotIds,
  callChemCityEquipCard,
  callChemCityUnequipCard,
  callChemCityCollectPassiveIncome,
  callChemCityUnlockPlace,
  callChemCityUnlockSlot,
  callChemCityGetDailyLoginBonus,
  callChemCityQuizReward,
  callChemCityPurchaseCard,
  callChemCityUnlockStoreSlot,
  callChemCityClaimCollectionReward,
  callChemCityDevGrantCoins,
} from '../lib/chemcity/cloudFunctions';
import { estimateUnclaimedCoins } from '../lib/chemcity/income';
import { getDailyStoreItems, STORE_MIN_SLOTS } from '../lib/chemcity/dailyStore';
import type { QuizRewardRequest, QuizRewardResult } from '../lib/chemcity/types';

const ONBOARDING_STORAGE_KEY = 'chemcity_onboarding_done_v1';

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

type View = 'map' | 'place' | 'inventory' | 'store' | 'gas_station_distributor' | 'collections';

type RootUserDoc = {
  chemcity?: UserChemCityData;
} & Record<string, unknown>;

interface ChemCityStore {
  user: UserChemCityData | null;
  progress: UserProgressData | null;
  slimItems: SlimItemDocument[];
  places: PlaceDocument[];
  collections: CollectionDocument[];

  isLoading: boolean;
  error: string | null;

  view: View;
  selectedPlaceId: string | null;

  cardPickerSlotId: string | null;

  cardDetailItemId: string | null;
  cardDetailData: FullItemDocument | null;
  cardDetailLoading: boolean;

  passiveDisplayCoins: number;

  // Phase 4: store + unlock modals
  dailyStoreItems: SlimItemDocument[];
  storeSlotCount: number;
  storePurchaseItemId: string | null;
  storePurchaseData: FullItemDocument | null;
  storePurchaseLoading: boolean;
  placeUnlockModalId: string | null;

  quizReward: {
    result: QuizRewardResult | null;
    correctAnswers: number;
    totalQuestions: number;
    isAwarding: boolean;
  };

  dailyLogin: {
    diamonds: number;
    coins: number;
    streak: number;
    showModal: boolean;
    checked: boolean;
  };

  showOnboarding: boolean;

  _unsubUser: Unsubscribe | null;

  loadAll: (userId: string) => Promise<void>;
  teardown: () => void;

  navigateToMap: () => void;
  navigateToPlace: (placeId: string) => void;
  navigateToInventory: () => void;
  navigateToStore: () => void;
  navigateToGasStationDistributor: () => void;
  navigateToCollections: () => void;

  openCardPicker: (slotId: string) => void;
  closeCardPicker: () => void;

  openCardDetail: (itemId: string) => Promise<void>;
  closeCardDetail: () => void;

  equipCard: (slotId: string, itemId: string) => Promise<void>;
  unequipCard: (slotId: string) => Promise<void>;

  collectIncome: () => Promise<{ coinsAwarded: number }>;

  unlockPlace: (placeId: string) => Promise<void>;
  unlockSlot: (placeId: string, slotId: string, useExtraSlotBudget?: boolean) => Promise<void>;

  tickPassiveDisplay: () => void;

  awardQuizReward: (request: QuizRewardRequest) => Promise<void>;
  clearQuizReward: () => void;

  checkDailyLogin: () => Promise<void>;
  dismissDailyLogin: () => void;

  computeDailyStore: (userId: string) => void;
  unlockStoreSlot: () => Promise<void>;

  devRefreshStaticData: () => Promise<void>;
  devGrantCoins: (amount: number) => Promise<void>;
  devRerollStore: () => void;

  openPurchaseConfirm: (itemId: string) => void;
  closePurchaseConfirm: () => void;
  purchaseCard: (itemId: string, currency: 'coins' | 'diamonds') => Promise<void>;

  openPlaceUnlockModal: (placeId: string) => void;
  closePlaceUnlockModal: () => void;

  claimCollectionReward: (collectionId: string) => Promise<void>;
  dismissOnboarding: () => void;
}

export const useChemCityStore = create<ChemCityStore>((set, get) => ({
  user: null,
  progress: null,
  slimItems: [],
  places: [],
  collections: [],

  isLoading: false,
  error: null,

  view: 'map',
  selectedPlaceId: null,

  cardPickerSlotId: null,

  cardDetailItemId: null,
  cardDetailData: null,
  cardDetailLoading: false,

  passiveDisplayCoins: 0,

  dailyStoreItems: [],
  storeSlotCount: STORE_MIN_SLOTS,
  storePurchaseItemId: null,
  storePurchaseData: null,
  storePurchaseLoading: false,
  placeUnlockModalId: null,

  quizReward: {
    result: null,
    correctAnswers: 0,
    totalQuestions: 0,
    isAwarding: false,
  },

  dailyLogin: {
    diamonds: 0,
    coins: 0,
    streak: 0,
    showModal: false,
    checked: false,
  },

  showOnboarding: false,

  _unsubUser: null,

  loadAll: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [slimItems, places, collections] = await Promise.all([
        fetchSlimItems(),
        fetchPlaces(),
        fetchCollections(),
      ]);

      await callChemCityInitUser();
      await callChemCityMigrateSlotIds();

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const root = (userSnap.data() || {}) as RootUserDoc;
      const chemcity = (root.chemcity || null) as UserChemCityData | null;

      const progressRef = doc(db, 'users', userId, 'chemcity_progress', 'data');
      const progressSnap = await getDoc(progressRef);
      const progress = (progressSnap.data() || null) as UserProgressData | null;

      const existing = get()._unsubUser;
      if (existing) existing();

      const unsub = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const freshRoot = (snap.data() || {}) as RootUserDoc;
        const fresh = (freshRoot.chemcity || null) as UserChemCityData | null;

        // Phase 4: mirror storeSlotCount (default 3) + compute daily store items
        const slotCount = (fresh as any)?.storeSlotCount ?? STORE_MIN_SLOTS;
        const pool = get().slimItems;
        const dailyStoreItems = fresh
          ? getDailyStoreItems(userId, pool, slotCount)
          : [];

        set({ user: fresh, storeSlotCount: slotCount, dailyStoreItems });
      });

      const progressUnsub = onSnapshot(progressRef, (snap) => {
        if (!snap.exists()) return;
        const fresh = snap.data() as UserProgressData;
        set({ progress: fresh });
      });

      const showOnboarding = (() => {
        if (hasSeenOnboarding()) return false;
        const createdAt = (chemcity as any)?.createdAt;
        if (!createdAt) return true;
        const createdMs =
          typeof createdAt?.toMillis === 'function'
            ? createdAt.toMillis()
            : typeof createdAt === 'number'
              ? createdAt
              : Date.now();
        return Date.now() - createdMs < 90_000;
      })();

      set({
        user: chemcity,
        progress,
        slimItems,
        places,
        collections,
        isLoading: false,
        passiveDisplayCoins: 0,
        storeSlotCount: (chemcity as any)?.storeSlotCount ?? STORE_MIN_SLOTS,
        dailyStoreItems: chemcity
          ? getDailyStoreItems(userId, slimItems, (chemcity as any)?.storeSlotCount ?? STORE_MIN_SLOTS)
          : [],
        showOnboarding,
        _unsubUser: (() => {
          return () => {
            unsub();
            progressUnsub();
          };
        })(),
      });

      // Phase 3: check daily login bonus (non-blocking)
      get().checkDailyLogin();

      // Phase 4: compute store (non-blocking)
      setTimeout(() => get().computeDailyStore(userId), 200);
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load ChemCity' });
    }
  },

  devGrantCoins: async (amount: number) => {
    if (!Number.isFinite(amount) || amount === 0) return;
    await callChemCityDevGrantCoins(amount);
  },

  devRerollStore: () => {
    const userId = get().user?.userId;
    if (!userId) return;
    const pool = get().slimItems;
    const slotCount = get().storeSlotCount ?? STORE_MIN_SLOTS;
    const salt = Math.random().toString(36).slice(2, 10);
    const dailyStoreItems = getDailyStoreItems(`${userId}:dev:${salt}`, pool, slotCount);
    set({ dailyStoreItems });
  },

  teardown: () => {
    const unsub = get()._unsubUser;
    if (unsub) unsub();
    set({ _unsubUser: null });
  },

  navigateToMap: () => set({ view: 'map', selectedPlaceId: null }),
  navigateToPlace: (placeId) => set({ view: 'place', selectedPlaceId: placeId }),
  navigateToInventory: () => set({ view: 'inventory' }),
  navigateToStore: () => set({ view: 'store' }),
  navigateToGasStationDistributor: () => set({ view: 'gas_station_distributor' }),
  navigateToCollections: () => set({ view: 'collections' }),

  openCardPicker: (slotId) => set({ cardPickerSlotId: slotId }),
  closeCardPicker: () => set({ cardPickerSlotId: null }),

  openCardDetail: async (itemId: string) => {
    set({ cardDetailItemId: itemId, cardDetailData: null, cardDetailLoading: true });
    try {
      const full = await fetchFullItem(itemId);
      set({ cardDetailData: full ?? null, cardDetailLoading: false });
    } catch {
      set({ cardDetailLoading: false });
    }
  },
  closeCardDetail: () => set({ cardDetailItemId: null, cardDetailData: null, cardDetailLoading: false }),

  equipCard: async (slotId, itemId) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update - show equipped immediately
    const previousEquipped = user.equipped?.[slotId];
    set({
      user: {
        ...user,
        equipped: { ...user.equipped, [slotId]: itemId },
      },
    });

    try {
      await callChemCityEquipCard(slotId, itemId);
    } catch (err) {
      // Revert on error
      set({
        user: {
          ...user,
          equipped: { ...user.equipped, [slotId]: previousEquipped },
        },
      });
      throw err;
    }
  },

  unequipCard: async (slotId) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update - show unequipped immediately
    const previousEquipped = user.equipped?.[slotId];
    const newEquipped = { ...user.equipped };
    delete newEquipped[slotId];

    set({
      user: {
        ...user,
        equipped: newEquipped,
      },
    });

    try {
      await callChemCityUnequipCard(slotId);
    } catch (err) {
      // Revert on error
      set({
        user: {
          ...user,
          equipped: { ...user.equipped, [slotId]: previousEquipped },
        },
      });
      throw err;
    }
  },

  collectIncome: async () => {
    const result = await callChemCityCollectPassiveIncome();
    set({ passiveDisplayCoins: 0 });
    return { coinsAwarded: Number(result.coinsAwarded || 0) };
  },

  unlockPlace: async (placeId) => {
    await callChemCityUnlockPlace(placeId);
  },

  unlockSlot: async (placeId, slotId, useExtraSlotBudget) => {
    await callChemCityUnlockSlot(placeId, slotId, useExtraSlotBudget);
  },

  computeDailyStore: (userId: string) => {
    const state = get();
    if (!state.user) return;
    const slotCount = state.storeSlotCount ?? STORE_MIN_SLOTS;
    const dailyStoreItems = getDailyStoreItems(userId, state.slimItems, slotCount);
    set({ dailyStoreItems });
  },

  devRefreshStaticData: async () => {
    try {
      localStorage.removeItem('cc_manifest');
      localStorage.removeItem('cc_slim_items');
      localStorage.removeItem('cc_places');
      localStorage.removeItem('cc_collections');
      localStorage.removeItem('cc_topics');
    } catch {
      // ignore
    }

    const userId = get().user?.userId;
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const [slimItems, places, collections] = await Promise.all([
        fetchSlimItems(),
        fetchPlaces(),
        fetchCollections(),
      ]);

      const slotCount = get().storeSlotCount ?? STORE_MIN_SLOTS;
      const dailyStoreItems = getDailyStoreItems(userId, slimItems, slotCount);

      set({ slimItems, places, collections, dailyStoreItems, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to refresh ChemCity data' });
    }
  },

  unlockStoreSlot: async () => {
    await callChemCityUnlockStoreSlot();
  },

  openPurchaseConfirm: (itemId: string) => {
    set({ storePurchaseItemId: itemId, storePurchaseData: null, storePurchaseLoading: true });
    fetchFullItem(itemId)
      .then((data) => set({ storePurchaseData: data ?? null, storePurchaseLoading: false }))
      .catch(() => set({ storePurchaseLoading: false }));
  },

  closePurchaseConfirm: () =>
    set({ storePurchaseItemId: null, storePurchaseData: null, storePurchaseLoading: false }),

  purchaseCard: async (itemId: string, currency: 'coins' | 'diamonds') => {
    await callChemCityPurchaseCard(itemId, currency);
  },

  openPlaceUnlockModal: (placeId: string) => set({ placeUnlockModalId: placeId }),
  closePlaceUnlockModal: () => set({ placeUnlockModalId: null }),

  tickPassiveDisplay: () => {
    const user = get().user;
    if (!user) return;

    const lastCollected = (user.passiveIncome?.lastCollected ?? null) as any;
    const coins = estimateUnclaimedCoins(user.activeBonuses, lastCollected);
    set({ passiveDisplayCoins: coins });
  },

  awardQuizReward: async (request) => {
    set((s) => ({
      quizReward: {
        ...s.quizReward,
        isAwarding: true,
        result: null,
      },
    }));

    try {
      const result = await callChemCityQuizReward(request);
      set({
        quizReward: {
          result,
          correctAnswers: request.correctAnswers ?? 0,
          totalQuestions: request.totalQuestions ?? 0,
          isAwarding: false,
        },
      });
    } catch {
      set((s) => ({
        quizReward: { ...s.quizReward, isAwarding: false },
      }));
    }
  },

  clearQuizReward: () => {
    set({
      quizReward: {
        result: null,
        correctAnswers: 0,
        totalQuestions: 0,
        isAwarding: false,
      },
    });
  },

  checkDailyLogin: async () => {
    const { dailyLogin } = get();
    if (dailyLogin.checked) return;

    try {
      const result = await callChemCityGetDailyLoginBonus();
      const alreadyClaimed = Boolean((result as any)?.alreadyClaimed);
      if (alreadyClaimed) {
        set((s) => ({ dailyLogin: { ...s.dailyLogin, checked: true } }));
        return;
      }

      set({
        dailyLogin: {
          diamonds: Number((result as any)?.diamondsAwarded || 0),
          coins: Number((result as any)?.coinsAwarded || 0),
          streak: Number((result as any)?.currentStreak || 0),
          showModal: true,
          checked: true,
        },
      });
    } catch {
      set((s) => ({ dailyLogin: { ...s.dailyLogin, checked: true } }));
    }
  },

  dismissDailyLogin: () => {
    set((s) => ({ dailyLogin: { ...s.dailyLogin, showModal: false } }));
  },

  claimCollectionReward: async (collectionId: string) => {
    await callChemCityClaimCollectionReward(collectionId);
  },

  dismissOnboarding: () => {
    markOnboardingDone();
    set({ showOnboarding: false });
  },
}));
