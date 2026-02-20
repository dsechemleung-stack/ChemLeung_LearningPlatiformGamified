import React from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

const DetailSkeleton: React.FC = () => (
  <div className="animate-pulse flex flex-col gap-4 p-4">
    <div className="w-full h-48 bg-slate-700 rounded-xl" />
    <div className="h-6 bg-slate-700 rounded w-3/4" />
    <div className="h-4 bg-slate-700 rounded w-1/2" />
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex flex-col gap-2">
        <div className="h-3 bg-slate-700 rounded w-1/4" />
        <div className="h-4 bg-slate-700 rounded" />
        <div className="h-4 bg-slate-700 rounded w-4/5" />
      </div>
    ))}
  </div>
);

const RARITY_BG: Record<string, string> = {
  common: 'from-slate-700 to-slate-600',
  rare: 'from-blue-800 to-indigo-700',
  epic: 'from-purple-800 to-pink-700',
  legendary: 'from-amber-700 to-yellow-500',
};

export const CardDetail: React.FC = () => {
  const cardDetailItemId = useChemCityStore((s) => s.cardDetailItemId);
  const cardDetailData = useChemCityStore((s) => s.cardDetailData);
  const cardDetailLoading = useChemCityStore((s) => s.cardDetailLoading);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const closeCardDetail = useChemCityStore((s) => s.closeCardDetail);

  const isOpen = !!cardDetailItemId;
  if (!isOpen) return null;

  const slim = slimItems.find((i) => i.id === cardDetailItemId);
  const full = cardDetailData;
  const rarity = slim?.rarity ?? 'common';
  const gradBg = RARITY_BG[rarity] ?? RARITY_BG.common;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={closeCardDetail} />

      <div className="fixed inset-x-4 top-12 bottom-4 z-50 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <button
          onClick={closeCardDetail}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-white text-lg"
          aria-label="Close"
        >
          ×
        </button>

        <div className="overflow-y-auto flex-1">
          {cardDetailLoading ? (
            <DetailSkeleton />
          ) : (
            <>
              <div className={`w-full bg-gradient-to-b ${gradBg} p-6 flex flex-col items-center gap-3`}>
                {full?.imageUrl ? (
                  <img
                    src={full.imageUrl}
                    alt={full.name}
                    className="w-32 h-32 object-contain rounded-xl shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-7xl">{slim?.emoji}</span>
                )}

                <div className="text-center">
                  <h2 className="text-white font-bold text-xl leading-tight">
                    {full?.displayName || slim?.name || 'Unknown'}
                  </h2>
                  <p className="text-white/70 font-mono text-lg mt-0.5">{slim?.chemicalFormula}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-0.5 capitalize">
                      {rarity}
                    </span>
                    {slim?.placeId && (
                      <span className="bg-white/20 text-white text-xs rounded-full px-3 py-0.5">
                        {slim.placeId.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {full?.description && (
                  <p className="text-slate-300 text-sm leading-relaxed">{full.description}</p>
                )}

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

                {slim?.skillContribution !== undefined && slim.skillContribution > 0 && (
                  <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Skill Contribution</span>
                    <span className="text-white font-bold">+{slim.skillContribution}</span>
                  </div>
                )}

                {!full && (
                  <div className="text-slate-500 text-sm">Card details unavailable.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
