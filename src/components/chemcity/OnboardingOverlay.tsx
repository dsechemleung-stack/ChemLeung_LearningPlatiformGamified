import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { useLanguage } from '../../contexts/LanguageContext';

export const OnboardingOverlay: React.FC = () => {
  const { t, tf } = useLanguage();
  const dismissOnboarding = useChemCityStore((s) => s.dismissOnboarding);
  const [step, setStep] = useState(0);

  const STEPS = [
    {
      emoji: '🧪',
      title: t('chemcity.onboarding.step1.title'),
      subtitle: t('chemcity.onboarding.step1.subtitle'),
      body: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>{t('chemcity.onboarding.step1.body1')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '🃏', label: t('chemcity.onboarding.step1.collectCards') },
              { emoji: '🏙️', label: t('chemcity.onboarding.step1.buildCity') },
              { emoji: '💰', label: t('chemcity.onboarding.step1.earnCoins') },
              { emoji: '💎', label: t('chemcity.onboarding.step1.winDiamonds') },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2">
                <span className="text-xl">{emoji}</span>
                <span className="text-white text-xs font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      emoji: '💰',
      title: t('chemcity.onboarding.step2.title'),
      subtitle: t('chemcity.onboarding.step2.subtitle'),
      body: (
        <div className="flex flex-col gap-3 text-sm">
          <div className="bg-yellow-900/30 border border-yellow-700/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coins size={18} className="text-yellow-300" />
              <span className="text-yellow-300 font-bold">{t('chemcity.onboarding.step2.coinsTitle')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {tf('chemcity.onboarding.step2.coinsBody', { garden: '🌱', lab: '⚗️' })}
            </p>
          </div>
          <div className="bg-cyan-900/30 border border-cyan-700/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">💎</span>
              <span className="text-cyan-300 font-bold">{t('chemcity.onboarding.step2.diamondsTitle')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {tf('chemcity.onboarding.step2.diamondsBody', { kitchen: '🍳', school: '📚', beach: '🏖️' })}
            </p>
          </div>
          <div className="bg-indigo-900/30 border border-indigo-700/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🚽</span>
              <span className="text-slate-200 font-bold">{t('chemcity.onboarding.step2.dailyBonusTitle')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('chemcity.onboarding.step2.dailyBonusBody')}
            </p>
          </div>
        </div>
      ),
    },
    {
      emoji: '🏪',
      title: t('chemcity.onboarding.step3.title'),
      subtitle: t('chemcity.onboarding.step3.subtitle'),
      body: (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-slate-300 leading-relaxed">
            {t('chemcity.onboarding.step3.body1')}
          </p>
          <div className="flex flex-col gap-2">
            {[
              {
                pill: t('chemcity.onboarding.step3.common'),
                pillClass: 'bg-slate-600 text-white',
                desc: t('chemcity.onboarding.step3.commonDesc'),
              },
              { pill: t('chemcity.onboarding.step3.rare'), pillClass: 'bg-blue-600 text-white', desc: t('chemcity.onboarding.step3.rareDesc') },
              { pill: t('chemcity.onboarding.step3.epic'), pillClass: 'bg-purple-600 text-white', desc: t('chemcity.onboarding.step3.epicDesc') },
              {
                pill: t('chemcity.onboarding.step3.legendary'),
                pillClass: 'bg-yellow-400 text-slate-900',
                desc: t('chemcity.onboarding.step3.legendaryDesc'),
              },
            ].map(({ pill, pillClass, desc }) => (
              <div key={pill} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5">
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${pillClass}`}>
                  {pill}
                </span>
                <span className="text-slate-300 text-xs">{desc}</span>
              </div>
            ))}
          </div>
          <div className="bg-emerald-900/30 border border-emerald-700/60 rounded-xl p-3">
            <p className="text-slate-300 text-xs leading-relaxed">
              {tf('chemcity.onboarding.step3.tip', { boutique: '🛍️' })}
            </p>
          </div>
        </div>
      ),
    },
  ] as const;

  const isLast = step === STEPS.length - 1;
  const { emoji, title, subtitle, body } = STEPS[step];

  const handleNext = () => {
    if (isLast) dismissOnboarding();
    else setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSkip = () => {
    dismissOnboarding();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100]" />

      <div className="fixed inset-x-4 top-16 bottom-4 z-[110] flex flex-col">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full">
          <div className="flex items-center justify-center gap-2 pt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-2 bg-indigo-400'
                    : i < step
                      ? 'w-2 h-2 bg-indigo-600'
                      : 'w-2 h-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl mb-3 shadow-lg">
                {emoji}
              </div>
              <h2 className="text-white font-bold text-xl leading-tight">{title}</h2>
              <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
            </div>

            {body}
          </div>

          <div className="shrink-0 border-t border-slate-700 px-5 py-4 flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center justify-center transition-colors"
              >
                ←
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="text-slate-500 text-sm hover:text-slate-300 transition-colors px-2"
              >
                {t('chemcity.onboarding.skip')}
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all active:scale-95"
            >
              {isLast ? t('chemcity.onboarding.letsGo') : t('chemcity.onboarding.next')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
