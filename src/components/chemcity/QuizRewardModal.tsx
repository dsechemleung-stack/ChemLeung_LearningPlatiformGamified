import React, { useEffect, useMemo, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function animateNumber(from: number, to: number, durationMs: number, onTick: (v: number) => void) {
  const start = performance.now();
  const delta = to - from;

  function step(now: number) {
    const t = clamp((now - start) / durationMs, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    onTick(Math.floor(from + delta * eased));
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export const QuizRewardModal: React.FC = () => {
  const quizReward = useChemCityStore((s) => s.quizReward);
  const clearQuizReward = useChemCityStore((s) => s.clearQuizReward);

  const isOpen = !!quizReward?.result;
  const result = quizReward.result;

  const [coinsDisplay, setCoinsDisplay] = useState(0);
  const [diamondsDisplay, setDiamondsDisplay] = useState(0);

  const coinsFinal = result?.coinsAwarded ?? 0;
  const diamondsFinal = result?.diamondsAwarded ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    setCoinsDisplay(0);
    setDiamondsDisplay(0);

    animateNumber(0, coinsFinal, 700, setCoinsDisplay);
    animateNumber(0, diamondsFinal, 900, setDiamondsDisplay);
  }, [coinsFinal, diamondsFinal, isOpen]);

  const breakdown = useMemo(() => {
    const b = (result as any)?.breakdown;
    if (!b || typeof b !== 'object') return null;
    return {
      flatBonus: Number(b.flatBonus ?? 0),
      afterSchool: Number(b.afterSchool ?? 0),
      afterBeach: Number(b.afterBeach ?? 0),
      didDouble: Boolean((result as any)?.didDouble),
    };
  }, [result]);

  if (!isOpen || !result) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[60]" onClick={clearQuizReward} />
      <div className="fixed inset-x-4 top-24 z-[70] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base">Quiz Rewards</h3>
            <p className="text-slate-400 text-xs">No cards drop from quizzes</p>
          </div>
          <button
            onClick={clearQuizReward}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Coins</p>
              <p className="text-yellow-300 font-black text-2xl tabular-nums">{coinsDisplay.toLocaleString()} 🪙</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Diamonds</p>
              <p className="text-cyan-300 font-black text-2xl tabular-nums">{diamondsDisplay.toLocaleString()} 💎</p>
            </div>
          </div>

          {breakdown && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-300 text-xs font-semibold mb-2">Diamond breakdown</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">Kitchen flat bonus</div>
                <div className="text-right text-slate-200 tabular-nums">+{breakdown.flatBonus}</div>
                <div className="text-slate-400">After School multiplier</div>
                <div className="text-right text-slate-200 tabular-nums">{breakdown.afterSchool}</div>
                <div className="text-slate-400">After Beach</div>
                <div className="text-right text-slate-200 tabular-nums">{breakdown.afterBeach}</div>
              </div>
              {breakdown.didDouble && (
                <div className="mt-2 text-emerald-300 text-xs font-semibold">Beach doubled your diamonds!</div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={clearQuizReward}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-bold"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
