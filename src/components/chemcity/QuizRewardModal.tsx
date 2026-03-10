import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Gem } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();

  const isOpen = Boolean(quizReward?.isAwarding) || !!quizReward?.result;
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
      baseDiamonds: Number(b.baseDiamonds ?? 0),
      baseCoins: Number(b.baseCoins ?? 0),
      error: Boolean(b.error),
      message: typeof b.message === 'string' ? b.message : '',
      kitchenFlatBonus: Number(b.kitchenFlatBonus ?? 0),
      afterKitchen: Number(b.afterKitchen ?? 0),
      schoolMultiplier: Number(b.schoolMultiplier ?? 1),
      afterSchool: Number(b.afterSchool ?? 0),
      afterBeach: Number(b.afterBeach ?? 0),
      correctAnswers: Number(b.correctAnswers ?? 0),
      totalQuestions: Number(b.totalQuestions ?? 0),
      didDouble: Boolean((result as any)?.didDouble),
    };
  }, [result]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[200]" onClick={clearQuizReward} />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-gradient-to-b from-slate-50 to-emerald-50/30 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-slate-900 font-black text-lg leading-tight">{t('results.quizRewardsTitle')}</h3>
            <p className="text-slate-600 text-xs mt-0.5">{t('results.quizRewardsSubtitle')}</p>
          </div>
          <button
            onClick={clearQuizReward}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-800 text-lg"
            aria-label={t('common.close')}
          >
            ×
          </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
          {quizReward?.isAwarding && !result && (
            <div className="bg-white/75 border border-slate-200 rounded-xl p-3">
              <p className="text-slate-900 text-sm font-semibold">{t('results.quizRewardsCalculating')}</p>
              <p className="text-slate-600 text-xs mt-1">{t('results.quizRewardsPleaseWait')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/75 border border-slate-200 rounded-xl p-3">
              <p className="text-slate-600 text-xs">{t('results.quizRewardsCoins')}</p>
              <p className="text-amber-600 font-black text-2xl tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Coins size={18} />
                <span>{coinsDisplay.toLocaleString()}</span>
              </p>
            </div>
            <div className="bg-white/75 border border-slate-200 rounded-xl p-3">
              <p className="text-slate-600 text-xs">{t('results.quizRewardsDiamonds')}</p>
              <p className="text-sky-600 font-black text-2xl tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Gem size={18} />
                <span>{diamondsDisplay.toLocaleString()}</span>
              </p>
            </div>
          </div>

          {breakdown?.error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-rose-700 text-xs font-semibold">{t('results.quizRewardsNotGranted')}</p>
              {breakdown.message ? (
                <p className="text-rose-700/80 text-xs mt-1 break-words">{breakdown.message}</p>
              ) : null}
            </div>
          )}

          {breakdown && (
            <div className="bg-white/75 border border-slate-200 rounded-xl p-3">
              <p className="text-slate-700 text-xs font-semibold mb-2">{t('results.quizRewardsBreakdownTitle')}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-600">{t('results.quizRewardsQuizScore')}</div>
                <div className="text-right text-slate-900 tabular-nums">
                  {breakdown.totalQuestions > 0
                    ? `${breakdown.correctAnswers}/${breakdown.totalQuestions} (${Math.round((breakdown.correctAnswers / breakdown.totalQuestions) * 100)}%)`
                    : `${breakdown.correctAnswers}/${breakdown.totalQuestions}`}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="bg-white/60 border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-700 text-xs font-semibold mb-2">{t('results.quizRewardsCoins')}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-600">{t('results.quizRewardsRule')}</div>
                    <div className="text-right text-slate-900 tabular-nums">
                      {breakdown.correctAnswers} × 10 = {breakdown.baseCoins}
                    </div>

                    <div className="text-slate-600">{t('results.quizRewardsTotalCoins')}</div>
                    <div className="text-right text-slate-900 tabular-nums">{coinsFinal}</div>
                  </div>
                </div>

                <div className="bg-white/60 border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-700 text-xs font-semibold mb-2">{t('results.quizRewardsDiamonds')}</p>
                  {(() => {
                    const kitchenDelta = Number.isFinite(breakdown.kitchenFlatBonus) ? breakdown.kitchenFlatBonus : 0;
                    const schoolDelta = Math.max(0, (Number.isFinite(breakdown.afterSchool) ? breakdown.afterSchool : 0) - (Number.isFinite(breakdown.afterKitchen) ? breakdown.afterKitchen : 0));
                    const beachDelta = Math.max(0, (Number.isFinite(breakdown.afterBeach) ? breakdown.afterBeach : 0) - (Number.isFinite(breakdown.afterSchool) ? breakdown.afterSchool : 0));

                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-slate-600">{t('results.quizRewardsBaseDiamonds')}</div>
                        <div className="text-right text-slate-900 tabular-nums">{breakdown.baseDiamonds}</div>

                        <div className="text-slate-600">{t('results.quizRewardsKitchenBonus')}</div>
                        <div className="text-right text-slate-900 tabular-nums">+{kitchenDelta}</div>

                        <div className="text-slate-600">
                          {t('results.quizRewardsSchoolDelta')} (×{breakdown.schoolMultiplier.toFixed(1)})
                        </div>
                        <div className="text-right text-slate-900 tabular-nums">+{schoolDelta}</div>

                        <div className="text-slate-600">{t('results.quizRewardsBeachDelta')}</div>
                        <div className="text-right text-slate-900 tabular-nums">+{beachDelta}</div>

                        <div className="text-slate-600 font-semibold">{t('results.quizRewardsTotalDiamonds')}</div>
                        <div className="text-right text-slate-900 tabular-nums font-semibold">{breakdown.afterBeach}</div>
                      </div>
                    );
                  })()}

                  {breakdown.didDouble && (
                    <div className="mt-2 text-emerald-800 text-xs font-semibold">{t('results.quizRewardsBeachDoubled')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={clearQuizReward}
              className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl px-5 py-2 text-sm font-black"
            >
              {t('common.continue')}
            </button>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};
