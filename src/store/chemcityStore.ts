import { create } from 'zustand';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { fetchSlimItems, fetchPlaces, fetchFullItem } from '../lib/cache';
import type {
  UserChemCityData,
  UserProgressData,
  SlimItemDocument,
  PlaceDocument,
  FullItemDocument,
} from '../lib/chemcity/types';
import {
  callChemCityInitUser,
  callChemCityEquipCard,
  callChemCityUnequipCard,
  callChemCityCollectPassiveIncome,
  callChemCityUnlockPlace,
  callChemCityUnlockSlot,
  callChemCityGetDailyLoginBonus,
  callChemCityQuizReward,
} from '../lib/chemcity/cloudFunctions';
import { estimateUnclaimedCoins } from '../lib/chemcity/income';
import type { QuizRewardRequest, QuizRewardResult } from '../lib/chemcity/types';

type View = 'map' | 'place' | 'inventory';

type RootUserDoc = {
  chemcity?: UserChemCityData;
} & Record<string, unknown>;

interface ChemCityStore {
  user: UserChemCityData | null;
  progress: UserProgressData | null;
  slimItems: SlimItemDocument[];
  places: PlaceDocument[];

  isLoading: boolean;
  error: string | null;

  view: View;
  selectedPlaceId: string | null;

  cardPickerSlotId: string | null;

  cardDetailItemId: string | null;
  cardDetailData: FullItemDocument | null;
  cardDetailLoading: boolean;

  passiveDisplayCoins: number;

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

  _unsubUser: Unsubscribe | null;

  loadAll: (userId: string) => Promise<void>;
  teardown: () => void;

  navigateToMap: () => void;
  navigateToPlace: (placeId: string) => void;
  navigateToInventory: () => void;

  openCardPicker: (slotId: string) => void;
  closeCardPicker: () => void;

  openCardDetail: (itemId: string) => Promise<void>;
  closeCardDetail: () => void;

  equipCard: (slotId: string, itemId: string) => Promise<void>;
  unequipCard: (slotId: string) => Promise<void>;

  collectIncome: () => Promise<{ coinsAwarded: number }>;

  unlockPlace: (placeId: string) => Promise<void>;
  unlockSlot: (placeId: string, slotId: string) => Promise<void>;

  tickPassiveDisplay: () => void;

  awardQuizReward: (request: QuizRewardRequest) => Promise<void>;
  clearQuizReward: () => void;

  checkDailyLogin: () => Promise<void>;
  dismissDailyLogin: () => void;
}

export const useChemCityStore = create<ChemCityStore>((set, get) => ({
  user: null,
  progress: null,
  slimItems: [],
  places: [],

  isLoading: false,
  error: null,

  view: 'map',
  selectedPlaceId: null,

  cardPickerSlotId: null,

  cardDetailItemId: null,
  cardDetailData: null,
  cardDetailLoading: false,

  passiveDisplayCoins: 0,

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

  _unsubUser: null,

  loadAll: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [slimItems, places] = await Promise.all([fetchSlimItems(), fetchPlaces()]);

      await callChemCityInitUser();

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
        set({ user: fresh });
      });

      set({
        user: chemcity,
        progress,
        slimItems,
        places,
        isLoading: false,
        passiveDisplayCoins: 0,
        _unsubUser: unsub,
      });

      // Phase 3: check daily login bonus (non-blocking)
      get().checkDailyLogin();
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load ChemCity' });
    }
  },

  teardown: () => {
    const unsub = get()._unsubUser;
    if (unsub) unsub();
    set({ _unsubUser: null });
  },

  navigateToMap: () => set({ view: 'map', selectedPlaceId: null }),
  navigateToPlace: (placeId) => set({ view: 'place', selectedPlaceId: placeId }),
  navigateToInventory: () => set({ view: 'inventory' }),

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
    await callChemCityEquipCard(slotId, itemId);
  },

  unequipCard: async (slotId) => {
    await callChemCityUnequipCard(slotId);
  },

  collectIncome: async () => {
    const result = await callChemCityCollectPassiveIncome();
    set({ passiveDisplayCoins: 0 });
    return { coinsAwarded: Number(result.coinsAwarded || 0) };
  },

  unlockPlace: async (placeId) => {
    await callChemCityUnlockPlace(placeId);
  },

  unlockSlot: async (placeId, slotId) => {
    await callChemCityUnlockSlot(placeId, slotId);
  },

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
          coins: 0,
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
}));
