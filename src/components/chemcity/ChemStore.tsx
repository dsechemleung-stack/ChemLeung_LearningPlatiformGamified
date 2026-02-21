import React, { useEffect, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { getEffectiveCoinPrice } from '../../lib/chemcity/shop';
import {
  countdownToMidnight,
  STORE_SLOT_UNLOCK_COSTS,
  STORE_MAX_SLOTS,
} from '../../lib/chemcity/dailyStore';

const RARITY_STYLES: Record<string, { bg: string; border: string; pill: string; glow: string }> = {
  common: { bg: 'from-slate-700 to-slate-600', border: 'border-slate-500', pill: 'bg-slate-600 text-white', glow: '' },
  rare: { bg: 'from-blue-800 to-indigo-700', border: 'border-blue-500', pill: 'bg-blue-600 text-white', glow: 'shadow-blue-500/30' },
  epic: { bg: 'from-purple-800 to-pink-700', border: 'border-purple-500', pill: 'bg-purple-600 text-white', glow: 'shadow-purple-500/30' },
  legendary: { bg: 'from-amber-700 to-yellow-500', border: 'border-yellow-400', pill: 'bg-yellow-400 text-slate-900', glow: 'shadow-yellow-400/40' },
};

export const ChemStore: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const dailyStoreItems = useChemCityStore((s) => s.dailyStoreItems);
  const storeSlotCount = useChemCityStore((s) => s.storeSlotCount);
  const openPurchaseConfirm = useChemCityStore((s) => s.openPurchaseConfirm);
  const unlockStoreSlot = useChemCityStore((s) => s.unlockStoreSlot);

  const [countdown, setCountdown] = useState(() => countdownToMidnight());
  const [unlockingSlot, setUnlockingSlot] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setCountdown(countdownToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const discount = user?.activeBonuses.shopDiscountPercent ?? 0;
  const coins = user?.currencies.coins ?? 0;
  const ownedSet = new Set(user?.ownedItems ?? []);

  const nextSlotNum = storeSlotCount + 1;
  const nextSlotCost = STORE_SLOT_UNLOCK_COSTS[nextSlotNum] ?? null;
  const canUnlockMore = storeSlotCount < STORE_MAX_SLOTS;
  const canAffordNext = nextSlotCost != null && coins >= nextSlotCost;

  const handleUnlockSlot = async () => {
    if (unlockingSlot || !canUnlockMore || !canAffordNext) return;
    setUnlockingSlot(true);
    setUnlockError(null);
    try {
      await unlockStoreSlot();
    } catch (err: any) {
      setUnlockError(err?.message ?? 'Failed to unlock slot.');
    } finally {
      setUnlockingSlot(false);
    }
  };

  return (
    <div className="flex flex-col flex-1" style={{ paddingTop: 76 }}>
      <div className="px-4 pt-3 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">ChemStore</h2>
              <p className="text-slate-400 text-xs">New stock in {countdown}</p>
            </div>
          </div>
          {discount > 0 && (
            <span className="bg-emerald-600 text-white text-xs font-bold rounded-full px-3 py-1 shrink-0">
              {discount}% OFF
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          {Array.from({ length: STORE_MAX_SLOTS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < storeSlotCount ? 'bg-indigo-500' : 'bg-slate-700'}`}
            />
          ))}
          <span className="text-slate-400 text-xs ml-1 shrink-0">
            {storeSlotCount}/{STORE_MAX_SLOTS} slots
          </span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 pt-4 pb-6">
        {dailyStoreItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-5xl mb-3 animate-pulse">🏪</span>
            <p className="text-sm">Store loading…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dailyStoreItems.map((item, idx) => {
              const isOwned = ownedSet.has(item.id);
              const style = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
              const rawCoin = item.shopData?.coinCost;
              const rawDiamond = item.shopData?.diamondCost;
              const effCoin = rawCoin != null ? getEffectiveCoinPrice(rawCoin, user?.activeBonuses ?? null) : null;
              const coinSaved = rawCoin != null && effCoin != null ? rawCoin - effCoin : 0;

              return (
                <button
                  key={item.id}
                  onClick={() => openPurchaseConfirm(item.id)}
                  className={`relative flex items-center gap-4 rounded-2xl border-2 ${style.border} bg-gradient-to-r ${style.bg} p-3 text-left transition-transform active:scale-[0.98] shadow-lg ${style.glow ? `shadow-lg ${style.glow}` : ''}`}
                >
                  <span className="absolute top-2 left-2.5 text-[10px] text-white/30 font-mono">#{idx + 1}</span>

                  {isOwned && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                      ✓ Owned
                    </span>
                  )}

                  <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-xl bg-white/10 mt-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 object-contain rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-4xl">{item.emoji}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2 mt-3">
                    <p className="text-white font-bold text-base leading-tight truncate">{item.name}</p>
                    <p className="text-white/60 font-mono text-sm">{item.chemicalFormula}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${style.pill}`}>{item.rarity}</span>
                      <span className="text-white/40 text-[10px] capitalize">{item.placeId?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right mt-3">
                    {effCoin != null && (
                      <div>
                        <p className="text-yellow-300 font-black text-lg tabular-nums leading-tight">🪙 {effCoin.toLocaleString()}</p>
                        {coinSaved > 0 && (
                          <p className="text-slate-400 text-xs line-through tabular-nums">{rawCoin!.toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {rawDiamond != null && (
                      <p className="text-cyan-300 font-black text-lg tabular-nums leading-tight">💎 {rawDiamond.toLocaleString()}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {canUnlockMore && (
          <div className="mt-6">
            <p className="text-slate-500 text-xs text-center mb-3">Unlock more store slots to see more cards each day</p>
            <button
              onClick={handleUnlockSlot}
              disabled={!canAffordNext || unlockingSlot}
              className={`w-full flex flex-col items-center gap-1.5 border-2 border-dashed rounded-2xl py-4 transition-all active:scale-[0.98] ${
                canAffordNext && !unlockingSlot
                  ? 'border-indigo-500/60 bg-indigo-900/20 hover:bg-indigo-900/30 cursor-pointer'
                  : 'border-slate-700 bg-slate-900/40 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="text-2xl">{unlockingSlot ? '⏳' : '🔓'}</span>
              <p className="text-white font-semibold text-sm">Unlock Slot #{nextSlotNum}</p>
              {nextSlotCost != null && (
                <p className={`text-sm font-bold tabular-nums ${canAffordNext ? 'text-yellow-300' : 'text-slate-500'}`}>
                  🪙 {nextSlotCost.toLocaleString()}
                </p>
              )}
              {!canAffordNext && nextSlotCost != null && (
                <p className="text-slate-600 text-xs">Need {(nextSlotCost - coins).toLocaleString()} more coins</p>
              )}
              {unlockError && <p className="text-red-400 text-xs mt-1">{unlockError}</p>}
            </button>
          </div>
        )}

        {storeSlotCount === STORE_MAX_SLOTS && (
          <p className="text-slate-700 text-xs text-center mt-6">All store slots unlocked ✓</p>
        )}
      </div>
    </div>
  );
};
