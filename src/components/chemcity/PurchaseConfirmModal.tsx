import React, { useEffect, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { getEffectiveCoinPrice } from '../../lib/chemcity/shop';

const RARITY_BG: Record<string, string> = {
  common: 'from-slate-700 to-slate-600',
  rare: 'from-blue-800 to-indigo-700',
  epic: 'from-purple-800 to-pink-700',
  legendary: 'from-amber-700 to-yellow-500',
};

type PurchaseCurrency = 'coins' | 'diamonds';

export const PurchaseConfirmModal: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const storePurchaseItemId = useChemCityStore((s) => s.storePurchaseItemId);
  const storePurchaseData = useChemCityStore((s) => s.storePurchaseData);
  const storePurchaseLoading = useChemCityStore((s) => s.storePurchaseLoading);
  const closePurchaseConfirm = useChemCityStore((s) => s.closePurchaseConfirm);
  const purchaseCard = useChemCityStore((s) => s.purchaseCard);

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseCurrency, setPurchaseCurrency] = useState<PurchaseCurrency>('coins');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const isOpen = !!storePurchaseItemId;
  const slim = slimItems.find((i) => i.id === storePurchaseItemId);
  const full = storePurchaseData;

  const isOwned = !!user?.ownedItems?.includes(storePurchaseItemId ?? '');
  const rarity = slim?.rarity ?? 'common';
  const gradBg = RARITY_BG[rarity] ?? RARITY_BG.common;
  const discount = user?.activeBonuses.shopDiscountPercent ?? 0;
  const rawCoin = slim?.shopData?.coinCost;
  const rawDiamond = slim?.shopData?.diamondCost;
  const effCoin = rawCoin != null ? getEffectiveCoinPrice(rawCoin, user?.activeBonuses ?? null) : null;

  const coins = user?.currencies.coins ?? 0;
  const diamonds = user?.currencies.diamonds ?? 0;

  const canAffordCoins = effCoin != null && coins >= effCoin;
  const canAffordDiamonds = rawDiamond != null && diamonds >= rawDiamond;

  useEffect(() => {
    if (isOpen) {
      setPurchaseError(null);
      setPurchaseSuccess(false);
      setPurchasing(false);
      if (rawCoin != null) setPurchaseCurrency('coins');
      else if (rawDiamond != null) setPurchaseCurrency('diamonds');
    }
  }, [isOpen, storePurchaseItemId, rawCoin, rawDiamond]);

  if (!isOpen || !slim) return null;

  const handlePurchase = async () => {
    if (purchasing || isOwned) return;
    const canAfford = purchaseCurrency === 'coins' ? canAffordCoins : canAffordDiamonds;
    if (!canAfford) return;

    setPurchasing(true);
    setPurchaseError(null);
    try {
      await purchaseCard(slim.id, purchaseCurrency);
      setPurchaseSuccess(true);
      setTimeout(() => closePurchaseConfirm(), 1500);
    } catch (err: any) {
      setPurchaseError(err?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/75 z-[80]" onClick={closePurchaseConfirm} />

      <div className="fixed inset-x-3 top-10 bottom-4 z-[90] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <button
          onClick={closePurchaseConfirm}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-white text-lg"
          aria-label="Close"
        >
          ×
        </button>

        <div className="overflow-y-auto flex-1">
          <div className={`w-full bg-gradient-to-b ${gradBg} p-6 flex flex-col items-center gap-3`}>
            {full?.imageUrl ? (
              <img
                src={full.imageUrl}
                alt={full.name}
                className="w-28 h-28 object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-6xl">{slim.emoji}</span>
            )}
            <div className="text-center">
              <h2 className="text-white font-bold text-xl leading-tight">{full?.displayName || slim.name}</h2>
              <p className="text-white/70 font-mono text-lg mt-0.5">{slim.chemicalFormula}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-0.5 capitalize">{rarity}</span>
                {isOwned && (
                  <span className="bg-green-500 text-white text-xs font-bold rounded-full px-3 py-0.5">✓ Owned</span>
                )}
              </div>
            </div>
          </div>

          {storePurchaseLoading && (
            <div className="animate-pulse px-4 py-3 flex flex-col gap-2">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-5/6" />
            </div>
          )}

          <div className="p-4 flex flex-col gap-4">
            {full?.description && <p className="text-slate-300 text-sm leading-relaxed">{full.description}</p>}

            {full?.educational?.funFact && (
              <div className="bg-indigo-900/40 border border-indigo-700 rounded-xl p-3">
                <p className="text-indigo-300 text-xs font-semibold mb-1">🔬 Fun Fact</p>
                <p className="text-slate-200 text-sm leading-relaxed">{full.educational.funFact}</p>
              </div>
            )}

            {full?.educational?.everydayUses && full.educational.everydayUses.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-2">🏠 Everyday Uses</p>
                <div className="flex flex-wrap gap-2">
                  {full.educational.everydayUses.map((use) => (
                    <span key={use} className="bg-slate-700 text-slate-200 text-xs rounded-full px-3 py-1">
                      {use}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {full?.topicConnections && full.topicConnections.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-2">📚 DSE Topics</p>
                <div className="flex flex-wrap gap-2">
                  {full.topicConnections.map((tid) => (
                    <span
                      key={tid}
                      className="bg-emerald-900/50 text-emerald-300 text-xs rounded-full px-3 py-1 border border-emerald-800"
                    >
                      {tid}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {full?.albumMetadata?.flavorText && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-500 text-xs italic leading-relaxed">"{full.albumMetadata.flavorText}"</p>
              </div>
            )}

            {slim.skillContribution > 0 && (
              <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Skill Contribution</span>
                <span className="text-white font-bold">+{slim.skillContribution}</span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-700 p-4 bg-slate-900">
          {purchaseSuccess ? (
            <div className="flex items-center justify-center gap-2 bg-green-600 rounded-xl py-3">
              <span className="text-white font-bold">🎉 Added to your collection!</span>
            </div>
          ) : isOwned ? (
            <div className="flex items-center justify-center gap-2 bg-slate-700 rounded-xl py-3">
              <span className="text-slate-300 font-semibold">✓ Already in your collection</span>
            </div>
          ) : (
            <>
              {effCoin != null && rawDiamond != null && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setPurchaseCurrency('coins')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                      purchaseCurrency === 'coins'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400'
                    }`}
                  >
                    🪙 Coins
                  </button>
                  <button
                    onClick={() => setPurchaseCurrency('diamonds')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                      purchaseCurrency === 'diamonds'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400'
                    }`}
                  >
                    💎 Diamonds
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  {purchaseCurrency === 'coins' && effCoin != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-300 font-black text-xl tabular-nums">🪙 {effCoin.toLocaleString()}</span>
                      {rawCoin != null && rawCoin !== effCoin && (
                        <span className="text-slate-500 text-sm line-through tabular-nums">{rawCoin.toLocaleString()}</span>
                      )}
                      {discount > 0 && (
                        <span className="bg-emerald-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                  )}
                  {purchaseCurrency === 'diamonds' && rawDiamond != null && (
                    <span className="text-cyan-300 font-black text-xl tabular-nums">💎 {rawDiamond.toLocaleString()}</span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-400">
                  {purchaseCurrency === 'coins' ? `You have: 🪙 ${coins.toLocaleString()}` : `You have: 💎 ${diamonds.toLocaleString()}`}
                </div>
              </div>

              {purchaseError && <p className="text-red-400 text-xs mb-2 text-center">{purchaseError}</p>}

              {purchaseCurrency === 'coins' && effCoin != null && !canAffordCoins && (
                <p className="text-yellow-500 text-xs mb-2 text-center">Not enough coins — need {(effCoin - coins).toLocaleString()} more</p>
              )}
              {purchaseCurrency === 'diamonds' && rawDiamond != null && !canAffordDiamonds && (
                <p className="text-cyan-500 text-xs mb-2 text-center">
                  Not enough diamonds — need {(rawDiamond - diamonds).toLocaleString()} more
                </p>
              )}

              <button
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  (purchaseCurrency === 'coins' && (!canAffordCoins || effCoin == null)) ||
                  (purchaseCurrency === 'diamonds' && (!canAffordDiamonds || rawDiamond == null))
                }
                className={`w-full py-3 rounded-xl font-bold text-base transition-all active:scale-95 ${
                  purchasing
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : purchaseCurrency === 'coins' && canAffordCoins
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                      : purchaseCurrency === 'diamonds' && canAffordDiamonds
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {purchasing
                  ? 'Purchasing...'
                  : purchaseCurrency === 'coins' && effCoin != null
                    ? `Buy for 🪙 ${effCoin.toLocaleString()}`
                    : rawDiamond != null
                      ? `Buy for 💎 ${rawDiamond.toLocaleString()}`
                      : 'Not for sale'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
