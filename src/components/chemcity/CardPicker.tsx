import React, { useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';
import type { SlimItemDocument } from '../../lib/chemcity/types';

export const CardPicker: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const cardPickerSlotId = useChemCityStore((s) => s.cardPickerSlotId);
  const closeCardPicker = useChemCityStore((s) => s.closeCardPicker);
  const equipCard = useChemCityStore((s) => s.equipCard);
  const unequipCard = useChemCityStore((s) => s.unequipCard);
  const openCardDetail = useChemCityStore((s) => s.openCardDetail);

  const [equipping, setEquipping] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string>('all');

  const isOpen = !!cardPickerSlotId;

  const validCards = useMemo<SlimItemDocument[]>(() => {
    if (!cardPickerSlotId || !user) return [];
    return slimItems.filter(
      (item) =>
        !item.deprecated &&
        user.ownedItems.includes(item.id) &&
        item.validSlots.includes(cardPickerSlotId)
    );
  }, [cardPickerSlotId, slimItems, user]);

  const filteredCards = useMemo(() => {
    if (filterRarity === 'all') return validCards;
    return validCards.filter((c) => c.rarity === filterRarity);
  }, [validCards, filterRarity]);

  const currentlyEquipped = cardPickerSlotId ? user?.equipped?.[cardPickerSlotId] : undefined;

  const handleSelect = async (itemId: string) => {
    if (!cardPickerSlotId || equipping) return;
    setEquipping(itemId);
    try {
      if (currentlyEquipped === itemId) {
        await unequipCard(cardPickerSlotId);
      } else {
        await equipCard(cardPickerSlotId, itemId);
      }
      closeCardPicker();
    } finally {
      setEquipping(null);
    }
  };

  const handleUnequipCurrent = async () => {
    if (!cardPickerSlotId || !currentlyEquipped) return;
    setEquipping('__unequip__');
    try {
      await unequipCard(cardPickerSlotId);
      closeCardPicker();
    } finally {
      setEquipping(null);
    }
  };

  if (!isOpen) return null;

  const rarities = ['all', 'common', 'rare', 'epic', 'legendary'];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={closeCardPicker} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="flex flex-col items-center pt-3 px-4 pb-2 border-b border-slate-700">
          <div className="w-10 h-1 bg-slate-600 rounded-full mb-3" />
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="text-white font-bold text-base">Choose a Card</h3>
              <p className="text-slate-400 text-xs">
                Slot: <span className="font-mono">{cardPickerSlotId}</span>
              </p>
            </div>
            <button
              onClick={closeCardPicker}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {rarities.map((r) => (
            <button
              key={r}
              onClick={() => setFilterRarity(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filterRarity === r
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {currentlyEquipped && (
          <div className="px-4 py-2 border-b border-slate-700">
            <button
              onClick={handleUnequipCurrent}
              disabled={!!equipping}
              className="w-full flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg py-2 text-red-300 text-sm font-semibold transition-colors"
            >
              {equipping === '__unequip__' ? 'Removing...' : '↩ Remove equipped card'}
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 py-3">
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <span className="text-4xl mb-3">🃏</span>
              <p className="text-sm">{validCards.length === 0 ? 'No cards owned for this slot yet' : 'No cards match the filter'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredCards.map((item) => {
                const isEquipped = user?.equipped?.[cardPickerSlotId!] === item.id;
                return (
                  <div key={item.id} className="flex flex-col items-center gap-1">
                    <ChemCard
                      item={item}
                      size="md"
                      isEquipped={isEquipped}
                      onClick={() => handleSelect(item.id)}
                    />
                    <button
                      onClick={() => openCardDetail(item.id)}
                      className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                      details →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
