import React, { useCallback, useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import type { CollectionDocument } from '../../lib/chemcity/types';

const ProgressBar: React.FC<{ pct: number; completed: boolean }> = ({ pct, completed }) => (
  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ease-out ${
        completed ? 'bg-emerald-400' : 'bg-indigo-500'
      }`}
      style={{ width: `${Math.max(2, pct)}%` }}
    />
  </div>
);

const RARITY_PILL: Record<string, string> = {
  common: 'bg-slate-600 text-white',
  rare: 'bg-blue-600 text-white',
  epic: 'bg-purple-600 text-white',
  legendary: 'bg-yellow-400 text-slate-900',
};

interface CollectionCardProps {
  collection: CollectionDocument;
  collected: number;
  total: number;
  completed: boolean;
  rewardClaimed: boolean;
  ownedItemIds: Set<string>;
  onClaim: (collectionId: string) => void;
  isClaiming: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  collected,
  total,
  completed,
  rewardClaimed,
  ownedItemIds,
  onClaim,
  isClaiming,
}) => {
  const [expanded, setExpanded] = useState(false);
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
  const slimItems = useChemCityStore((s) => s.slimItems);

  const itemSlims = useMemo(
    () =>
      collection.itemIds
        .map((id) => slimItems.find((i) => i.id === id))
        .filter(Boolean) as typeof slimItems,
    [collection.itemIds, slimItems],
  );

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        completed ? 'border-emerald-600 bg-emerald-900/20' : 'border-slate-700 bg-slate-800/60'
      }`}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm leading-tight">{collection.displayName}</h3>
            {completed && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0">
                ✓ Complete
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5 leading-snug line-clamp-1">{collection.description}</p>

          <div className="flex items-center gap-2 mt-2">
            <ProgressBar pct={pct} completed={completed} />
            <span className="text-slate-400 text-xs shrink-0 tabular-nums">
              {collected}/{total}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {(collection.rewardCoins || collection.rewardDiamonds) && (
            <div className="flex items-center gap-1 text-xs">
              {collection.rewardCoins ? (
                <span className="text-yellow-300 font-bold tabular-nums">
                  🪙 {collection.rewardCoins.toLocaleString()}
                </span>
              ) : null}
              {collection.rewardDiamonds ? (
                <span className="text-cyan-300 font-bold tabular-nums">💎 {collection.rewardDiamonds}</span>
              ) : null}
            </div>
          )}
          <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {completed && !rewardClaimed && (
        <div className="px-4 pb-3">
          <button
            onClick={() => onClaim(collection.id)}
            disabled={isClaiming}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm transition-all active:scale-95"
          >
            {isClaiming ? 'Claiming...' : '🎁 Claim Reward'}
          </button>
        </div>
      )}

      {rewardClaimed && (
        <div className="px-4 pb-3">
          <div className="w-full py-2 rounded-xl bg-slate-700/60 text-center text-slate-500 text-xs font-semibold">
            Reward claimed ✓
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-700/60 px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {itemSlims.map((item) => {
              const owned = ownedItemIds.has(item.id);
              const rarityPill = RARITY_PILL[item.rarity] ?? RARITY_PILL.common;
              return (
                <div key={item.id} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${
                      owned
                        ? 'border-emerald-500/70 bg-slate-700'
                        : 'border-slate-700 bg-slate-900/60 opacity-40 grayscale'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl">{item.emoji}</span>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 capitalize ${rarityPill}`}>
                    {item.rarity[0].toUpperCase()}
                  </span>
                  <span className="text-[9px] text-slate-400 text-center leading-tight max-w-[3.5rem] truncate">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const CollectionsAlbum: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const progress = useChemCityStore((s) => s.progress);
  const collections = useChemCityStore((s) => s.collections);
  const claimCollectionReward = useChemCityStore((s) => s.claimCollectionReward);

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<'all' | 'complete' | 'incomplete'>('all');

  const ownedItemIds = useMemo(() => new Set(user?.ownedItems ?? []), [user?.ownedItems]);

  const liveProgress = useMemo(() => {
    const map: Record<string, { collected: number; total: number }> = {};
    for (const col of collections) {
      const total = col.itemIds.length;
      const collected = col.itemIds.filter((id: string) => ownedItemIds.has(id)).length;
      map[col.id] = { collected, total };
    }
    return map;
  }, [collections, ownedItemIds]);

  const enriched = useMemo(() => {
    return collections.map((col: CollectionDocument) => {
      const live = liveProgress[col.id] ?? { collected: 0, total: col.itemIds.length };
      const completed = live.collected === live.total && live.total > 0;
      const serverProgress = progress?.collections?.[col.id];
      const rewardClaimed = serverProgress?.rewardClaimed ?? false;
      return { collection: col, ...live, completed, rewardClaimed };
    });
  }, [collections, liveProgress, progress]);

  const filtered = useMemo(() => {
    if (filterState === 'complete') return enriched.filter((e: (typeof enriched)[number]) => e.completed);
    if (filterState === 'incomplete') return enriched.filter((e: (typeof enriched)[number]) => !e.completed);
    return enriched;
  }, [enriched, filterState]);

  const totalComplete = enriched.filter((e: (typeof enriched)[number]) => e.completed).length;
  const totalCollections = enriched.length;
  const overallPct = totalCollections > 0 ? Math.round((totalComplete / totalCollections) * 100) : 0;

  const handleClaim = useCallback(
    async (collectionId: string) => {
      if (claimingId) return;
      setClaimingId(collectionId);
      setClaimError(null);
      try {
        await claimCollectionReward(collectionId);
      } catch (err: any) {
        setClaimError(err?.message ?? 'Failed to claim reward.');
      } finally {
        setClaimingId(null);
      }
    },
    [claimingId, claimCollectionReward],
  );

  return (
    <div className="flex flex-col" style={{ paddingTop: 76 }}>
      <div className="px-4 pt-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📚</span>
          <h2 className="text-white font-bold text-lg">Collections Album</h2>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">
                {totalComplete}/{totalCollections} collections complete
              </span>
              <span className="text-slate-300 text-xs font-bold">{overallPct}%</span>
            </div>
            <ProgressBar pct={overallPct} completed={overallPct === 100} />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {(['all', 'complete', 'incomplete'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterState(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                filterState === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-3 pb-8 flex flex-col gap-3">
        {claimError && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
            <p className="text-red-300 text-sm">{claimError}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="text-5xl mb-3">📚</span>
            <p className="text-sm">No collections found</p>
          </div>
        ) : (
          filtered.map((entry: (typeof filtered)[number]) => (
            <CollectionCard
              key={entry.collection.id}
              collection={entry.collection}
              collected={entry.collected}
              total={entry.total}
              completed={entry.completed}
              rewardClaimed={entry.rewardClaimed}
              ownedItemIds={ownedItemIds}
              onClaim={handleClaim}
              isClaiming={claimingId === entry.collection.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
