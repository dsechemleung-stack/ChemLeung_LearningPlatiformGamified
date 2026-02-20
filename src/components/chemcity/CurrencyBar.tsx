import React, { useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

export const CurrencyBar: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const view = useChemCityStore((s) => s.view);
  const navigateToMap = useChemCityStore((s) => s.navigateToMap);
  const navigateToInventory = useChemCityStore((s) => s.navigateToInventory);

  const [skillsOpen, setSkillsOpen] = useState(false);

  const coins = user?.currencies.coins ?? 0;
  const diamonds = user?.currencies.diamonds ?? 0;

  const skillSummaryByPlaceId = useMemo(() => {
    const bonuses = user?.activeBonuses;
    if (!bonuses) return {} as Record<string, string>;

    return {
      garden: `${bonuses.passiveBaseCoinsPerHour.toLocaleString()} 🪙/hr`,
      lab: `${bonuses.passiveMultiplier.toFixed(1)}× multiplier`,
      kitchen: `+${bonuses.quizFlatDiamondBonus} 💎 max bonus`,
      school: `${bonuses.quizDiamondMultiplier.toFixed(1)}× quiz diamonds`,
      beach: `${bonuses.quizDoubleChancePercent}% double chance`,
      toilet: `${bonuses.dailyLoginDiamonds} 💎 daily`,
      gas_station: `${bonuses.extraSlotsTotal} bonus slots`,
      lifestyle_boutique: `${bonuses.shopDiscountPercent}% store discount`,
    };
  }, [user?.activeBonuses]);

  return (
    <>
      <div className="fixed top-3 left-3 right-3 z-50 flex items-start justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {view !== 'map' && (
            <button
              onClick={navigateToMap}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 backdrop-blur transition-colors text-white text-sm"
              aria-label="Back to map"
            >
              ←
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 backdrop-blur rounded-full px-3 py-2">
            <span className="text-yellow-400 text-sm">🪙</span>
            <span className="text-white text-sm font-semibold tabular-nums">{coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 backdrop-blur rounded-full px-3 py-2">
            <span className="text-cyan-400 text-sm">💎</span>
            <span className="text-white text-sm font-semibold tabular-nums">{diamonds.toLocaleString()}</span>
          </div>

          <button
            onClick={() => setSkillsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 backdrop-blur transition-colors text-sm text-slate-200"
            aria-label="Skill boosts"
            title="Skill boosts"
          >
            ✨
          </button>

          <button
            onClick={navigateToInventory}
            className={`flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur transition-colors text-sm ${
              view === 'inventory'
                ? 'bg-indigo-600/90 border-indigo-300 text-white'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
            aria-label="Card inventory"
            title="Card Inventory"
          >
            🃏
          </button>
        </div>
      </div>

      {skillsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSkillsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-white font-bold">Skill Boosts</h3>
              <button
                type="button"
                onClick={() => setSkillsOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {places.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-bold truncate">{p.displayName}</div>
                      <div className="text-slate-400 text-xs truncate">{p.skill.description}</div>
                    </div>
                  </div>
                  <div className="text-indigo-200 text-sm font-bold shrink-0">
                    {skillSummaryByPlaceId[p.id] ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
