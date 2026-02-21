import React, { useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

export const PlaceUnlockModal: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const placeUnlockModalId = useChemCityStore((s) => s.placeUnlockModalId);
  const closePlaceUnlockModal = useChemCityStore((s) => s.closePlaceUnlockModal);
  const unlockPlace = useChemCityStore((s) => s.unlockPlace);

  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isOpen = !!placeUnlockModalId;
  const place = places.find((p) => p.id === placeUnlockModalId) ?? null;

  if (!isOpen || !place || !user) return null;

  const cost = place.unlockCost ?? 0;
  const coins = user.currencies.coins;
  const canAfford = coins >= cost;
  const isUnlocked = user.unlockedPlaces.includes(place.id);

  const handleUnlock = async () => {
    if (unlocking || !canAfford || isUnlocked) return;
    setUnlocking(true);
    setError(null);
    try {
      await unlockPlace(place.id);
      setSuccess(true);
      setTimeout(() => {
        closePlaceUnlockModal();
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Unlock failed. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[70]" onClick={closePlaceUnlockModal} />

      <div className="fixed inset-x-6 top-1/4 z-[80] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 flex flex-col items-center gap-2 border-b border-slate-700">
          <span className="text-5xl">{place.emoji}</span>
          <h3 className="text-white font-bold text-xl text-center">{place.displayName}</h3>
          <p className="text-slate-400 text-sm text-center leading-snug">{place.skill.description}</p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {isUnlocked ? (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
              <p className="text-green-300 font-semibold">✓ Already unlocked!</p>
            </div>
          ) : success ? (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
              <p className="text-green-300 font-semibold">🎉 {place.displayName} unlocked!</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Unlock Cost</span>
                  <span className="text-yellow-300 font-black text-xl tabular-nums">🪙 {cost.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Your Balance</span>
                  <span className={`font-bold text-base tabular-nums ${canAfford ? 'text-white' : 'text-red-400'}`}>
                    🪙 {coins.toLocaleString()}
                  </span>
                </div>
                {!canAfford && (
                  <p className="text-red-400 text-xs mt-2 text-center">Need {(cost - coins).toLocaleString()} more coins</p>
                )}
              </div>

              <div className="bg-indigo-900/30 border border-indigo-800 rounded-xl p-3">
                <p className="text-indigo-200 text-xs">
                  Unlocking <span className="font-bold">{place.displayName}</span> gives you access to{' '}
                  <span className="font-bold">{place.slots?.length ?? 0} card slots</span>.
                </p>
              </div>

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </>
          )}

          {!success && !isUnlocked && (
            <div className="flex gap-3">
              <button
                onClick={closePlaceUnlockModal}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={!canAfford || unlocking}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  canAfford && !unlocking
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                {unlocking ? 'Unlocking...' : `Unlock for 🪙 ${cost.toLocaleString()}`}
              </button>
            </div>
          )}

          {(success || isUnlocked) && (
            <button
              onClick={closePlaceUnlockModal}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
};
