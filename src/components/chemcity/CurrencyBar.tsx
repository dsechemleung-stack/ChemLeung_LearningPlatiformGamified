// ==============================
// FILE: src/components/chemcity/CurrencyBar.tsx
// ==============================
import React, { useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

export const CurrencyBar: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const view = useChemCityStore((s) => s.view);
  const selectedPlaceId = useChemCityStore((s) => s.selectedPlaceId);
  const navigateToMap = useChemCityStore((s) => s.navigateToMap);
  const navigateToInventory = useChemCityStore((s) => s.navigateToInventory);
  const navigateToStore = useChemCityStore((s) => s.navigateToStore);
  const navigateToCollections = useChemCityStore((s) => s.navigateToCollections);
  const navigateToGasStationDistributor = useChemCityStore((s) => s.navigateToGasStationDistributor);

  const [skillsOpen, setSkillsOpen] = useState(false);

  const coins = user?.currencies.coins ?? 0;
  const diamonds = user?.currencies.diamonds ?? 0;

  const showGasDistributorButton =
    view === 'place' && selectedPlaceId === 'gas_station' && (user?.extraSlotsBudget ?? 0) > 0;

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

  const NavBtn: React.FC<{
    onClick: () => void;
    active: boolean;
    label: string;
    children: React.ReactNode;
    extra?: string;
  }> = ({ onClick, active, label, children, extra = '' }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center
        w-9 h-9 rounded-xl
        border backdrop-blur-md shadow-lg
        transition-all active:scale-95
        text-sm
        ${extra}
        ${active
          ? 'bg-indigo-600/90 border-indigo-400 text-white'
          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-600 text-slate-200'
        }
      `}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <>
      {/*
        Positioned BELOW the main site header (~76px tall).
        Using top-[84px] = 76px header + 8px breathing room.
      */}
      <div className="fixed top-[84px] left-3 right-3 z-50 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: back button */}
        <div className="flex items-center pointer-events-auto">
          {view !== 'map' && (
            <button
              onClick={navigateToMap}
              className="
                flex items-center justify-center
                w-9 h-9 rounded-xl
                bg-slate-900/90 hover:bg-slate-800
                border border-slate-600
                backdrop-blur-md shadow-lg
                transition-all active:scale-95
                text-white text-base
              "
              aria-label="Back to map"
            >
              ←
            </button>
          )}
        </div>

        {/* Right: currency + action buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Coins pill */}
          <div className="
            flex items-center gap-1.5
            bg-slate-900/90 border border-slate-600
            backdrop-blur-md shadow-lg
            rounded-full px-3 py-1.5
          ">
            <span className="text-yellow-400 text-sm leading-none">🪙</span>
            <span className="text-white text-sm font-bold tabular-nums leading-none">
              {coins.toLocaleString()}
            </span>
          </div>

          {/* Diamonds pill */}
          <div className="
            flex items-center gap-1.5
            bg-slate-900/90 border border-slate-600
            backdrop-blur-md shadow-lg
            rounded-full px-3 py-1.5
          ">
            <span className="text-cyan-400 text-sm leading-none">💎</span>
            <span className="text-white text-sm font-bold tabular-nums leading-none">
              {diamonds.toLocaleString()}
            </span>
          </div>

          <NavBtn onClick={() => setSkillsOpen(true)} active={false} label="Skill boosts">
            ✨
          </NavBtn>

          <NavBtn onClick={navigateToCollections} active={view === 'collections'} label="Collections Album">
            📚
          </NavBtn>

          <NavBtn onClick={navigateToStore} active={view === 'store'} label="ChemStore">
            🏪
          </NavBtn>

          <NavBtn onClick={navigateToInventory} active={view === 'inventory'} label="Card Inventory">
            🃏
          </NavBtn>

          {showGasDistributorButton && (
            <button
              onClick={navigateToGasStationDistributor}
              className={`
                flex items-center justify-center
                w-9 h-9 rounded-xl
                border backdrop-blur-md shadow-lg
                transition-all active:scale-95
                text-sm
                bg-amber-600/80 hover:bg-amber-500/80 border-amber-500 text-white
              `}
              aria-label="Distribute bonus slots"
              title="Distribute bonus slots"
            >
              ⛽
            </button>
          )}
        </div>
      </div>

      {/* Skills modal */}
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
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {places.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2"
                >
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