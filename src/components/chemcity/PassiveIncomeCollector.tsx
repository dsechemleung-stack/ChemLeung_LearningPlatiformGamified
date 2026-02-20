import React, { useEffect, useRef, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { formatCoinsPerHour } from '../../lib/chemcity/income';

export const PassiveIncomeCollector: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const passiveDisplayCoins = useChemCityStore((s) => s.passiveDisplayCoins);
  const collectIncome = useChemCityStore((s) => s.collectIncome);
  const tickPassiveDisplay = useChemCityStore((s) => s.tickPassiveDisplay);

  const [collecting, setCollecting] = useState(false);
  const [lastCollected, setLastCollected] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rate = user?.activeBonuses.passiveBaseCoinsPerHour ?? 0;

  useEffect(() => {
    if (rate > 0) {
      tickPassiveDisplay();
      intervalRef.current = setInterval(tickPassiveDisplay, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rate, tickPassiveDisplay]);

  const handleCollect = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const { coinsAwarded } = await collectIncome();
      setLastCollected(coinsAwarded);
      setTimeout(() => setLastCollected(null), 3000);
    } finally {
      setCollecting(false);
    }
  };

  if (rate === 0) return null;

  return (
    <div className="mx-4 my-2 bg-slate-800 border border-slate-600 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{formatCoinsPerHour(rate)}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-yellow-300 font-bold text-base tabular-nums">
            🪙 {passiveDisplayCoins.toLocaleString()}
          </span>
          <span className="text-slate-500 text-xs">pending</span>
        </div>
      </div>

      {lastCollected !== null ? (
        <div className="flex items-center gap-1 bg-green-600 rounded-lg px-3 py-1.5 text-white font-bold text-sm">
          +{lastCollected.toLocaleString()} 🪙
        </div>
      ) : (
        <button
          onClick={handleCollect}
          disabled={collecting || passiveDisplayCoins < 1}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-all ${
            collecting || passiveDisplayCoins < 1
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 active:scale-95'
          }`}
        >
          {collecting ? <span className="inline-block animate-spin">⟳</span> : 'Collect'}
        </button>
      )}
    </div>
  );
};
