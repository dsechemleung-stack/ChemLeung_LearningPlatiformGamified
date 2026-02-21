import React, { useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

export const GasStationDistributor: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const unlockSlot = useChemCityStore((s) => s.unlockSlot);

  const [unlockingSlotId, setUnlockingSlotId] = useState<string | null>(null);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const budget = user?.extraSlotsBudget ?? 0;

  const gasStationSlots = useMemo(() => {
    if (!user) return [] as Array<{ placeId: string; placeEmoji: string; placeDisplayName: string; slotId: string; slotLabel: string }>;

    const result: Array<{ placeId: string; placeEmoji: string; placeDisplayName: string; slotId: string; slotLabel: string }> = [];

    for (const place of places) {
      if (place.unlockCost > 0 && !user.unlockedPlaces.includes(place.id)) continue;

      for (const slot of place.slots) {
        if (!slot.budgetOnly) continue;
        if (user.unlockedSlots.includes(slot.slotId)) continue;
        if (recentlyUnlocked.has(slot.slotId)) continue;

        result.push({
          placeId: place.id,
          placeEmoji: place.emoji,
          placeDisplayName: place.displayName,
          slotId: slot.slotId,
          slotLabel: slot.slotId.replace(/_/g, ' '),
        });
      }
    }

    return result;
  }, [user, places, recentlyUnlocked]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof gasStationSlots>();
    for (const s of gasStationSlots) {
      if (!map.has(s.placeId)) map.set(s.placeId, []);
      map.get(s.placeId)!.push(s);
    }
    return Array.from(map.entries()).map(([placeId, slots]) => ({ placeId, slots }));
  }, [gasStationSlots]);

  const handleUnlock = async (placeId: string, slotId: string) => {
    if (unlockingSlotId || budget < 1) return;
    setUnlockingSlotId(slotId);
    setError(null);
    try {
      await unlockSlot(placeId, slotId, true);
      setRecentlyUnlocked((prev) => new Set([...prev, slotId]));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to unlock slot.');
    } finally {
      setUnlockingSlotId(null);
    }
  };

  return (
    <div className="flex flex-col" style={{ paddingTop: 76 }}>
      <div className="px-4 pt-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⛽</span>
          <h2 className="text-white font-bold text-lg">Gas Station</h2>
        </div>
        <p className="text-slate-400 text-xs mb-3">Use your bonus slot budget to unlock extra card slots across any place.</p>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs">Extra Slot Budget</p>
            <p className="text-white font-black text-2xl tabular-nums">{budget}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Total unlockable</p>
            <p className="text-slate-300 font-bold text-lg">{gasStationSlots.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-3 pb-8">
        {budget === 0 && gasStationSlots.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-3 mb-4">
            <p className="text-amber-200 text-sm">
              💡 Equip more cards in the <span className="font-bold">⛽ Gas Station</span> to increase your budget.
            </p>
          </div>
        )}

        {gasStationSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-5xl mb-3">⛽</span>
            {user?.extraSlotsBudget === 0 ? (
              <>
                <p className="text-sm text-center">No bonus slots available yet.</p>
                <p className="text-xs text-center mt-1">Equip cards in the Gas Station to earn slot budget.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-center">All extra slots are unlocked!</p>
                <p className="text-xs text-center mt-1">Check back after unlocking more places.</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {grouped.map(({ placeId, slots }) => {
              const place = places.find((p) => p.id === placeId);
              return (
                <div key={placeId}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{place?.emoji}</span>
                    <span className="text-slate-300 font-semibold text-sm">{place?.displayName}</span>
                    <span className="text-slate-500 text-xs ml-auto">{slots.length} available</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {slots.map(({ slotId, slotLabel }) => {
                      const isUnlocking = unlockingSlotId === slotId;
                      const canAfford = budget >= 1;

                      return (
                        <button
                          key={slotId}
                          onClick={() => handleUnlock(placeId, slotId)}
                          disabled={!canAfford || !!unlockingSlotId}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-95 ${
                            canAfford && !unlockingSlotId
                              ? 'bg-slate-800 border-slate-600 hover:border-indigo-500 hover:bg-slate-700 cursor-pointer'
                              : 'bg-slate-900/60 border-slate-800 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold capitalize leading-tight truncate">{slotLabel}</p>
                            <p className="text-slate-500 text-[10px] font-mono truncate">{slotId}</p>
                          </div>
                          <span
                            className={`shrink-0 text-xs font-bold rounded-lg px-2 py-1 ${
                              canAfford && !unlockingSlotId ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {isUnlocking ? '⏳' : '-1'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
