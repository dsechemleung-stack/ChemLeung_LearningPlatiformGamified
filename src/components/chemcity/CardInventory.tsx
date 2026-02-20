import React, { useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

type PlaceFilter = 'all' | string;

export const CardInventory: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const places = useChemCityStore((s) => s.places);
  const openCardDetail = useChemCityStore((s) => s.openCardDetail);

  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const ownedItems = useMemo(() => {
    if (!user) return [];
    return slimItems.filter((item) => !item.deprecated && user.ownedItems.includes(item.id));
  }, [slimItems, user]);

  const filtered = useMemo(() => {
    return ownedItems.filter((item) => {
      if (placeFilter !== 'all' && item.placeId !== placeFilter) return false;
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.chemicalFormula.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [ownedItems, placeFilter, rarityFilter, searchQuery]);

  const equippedSet = new Set(Object.values(user?.equipped ?? {}));
  const rarities: RarityFilter[] = ['all', 'common', 'rare', 'epic', 'legendary'];

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-white font-bold text-lg">Card Inventory</h2>
        <p className="text-slate-400 text-xs">{ownedItems.length} cards owned</p>
      </div>

      <div className="px-4 pb-2">
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
        <button
          onClick={() => setPlaceFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            placeFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          All Places
        </button>
        {places.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlaceFilter(p.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              placeFilter === p.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {p.emoji} {p.displayName}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {rarities.map((r) => (
          <button
            key={r}
            onClick={() => setRarityFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
              rarityFilter === r
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-5xl mb-3">🃏</span>
            <p className="text-sm">{ownedItems.length === 0 ? 'No cards yet — visit ChemStore!' : 'No cards match your filter'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((item) => (
              <ChemCard
                key={item.id}
                item={item}
                size="md"
                isEquipped={equippedSet.has(item.id)}
                onClick={() => openCardDetail(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
