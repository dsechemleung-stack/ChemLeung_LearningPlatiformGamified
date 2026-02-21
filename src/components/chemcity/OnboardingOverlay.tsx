import React, { useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

const STEPS = [
  {
    emoji: '🧪',
    title: 'Welcome to ChemCity!',
    subtitle: 'Your chemistry-powered city awaits.',
    body: (
      <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
        <p>
          ChemCity is a collectible card game built around real chemistry. Collect chemical compound
          cards, equip them to 8 city locations, and watch your city generate rewards.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: '🃏', label: 'Collect cards' },
            { emoji: '🏙️', label: 'Build your city' },
            { emoji: '💰', label: 'Earn coins' },
            { emoji: '💎', label: 'Win diamonds' },
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
    title: 'Earn Coins & Diamonds',
    subtitle: 'Two ways to build your wealth.',
    body: (
      <div className="flex flex-col gap-3 text-sm">
        <div className="bg-yellow-900/30 border border-yellow-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🪙</span>
            <span className="text-yellow-300 font-bold">Coins — Passive Income</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Equip cards in the 🌱 <strong>Garden</strong> to generate coins per hour. The ⚗️{' '}
            <strong>Lab</strong> multiplies your rate. Collect any time from the map.
          </p>
        </div>
        <div className="bg-cyan-900/30 border border-cyan-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💎</span>
            <span className="text-cyan-300 font-bold">Diamonds — Quiz Rewards</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Complete quizzes to earn diamonds. 🍳 <strong>Kitchen</strong>, 📚 <strong>School</strong>,
            and 🏖️ <strong>Beach</strong> cards supercharge your quiz rewards.
          </p>
        </div>
        <div className="bg-indigo-900/30 border border-indigo-700/60 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚽</span>
            <span className="text-slate-200 font-bold">Daily Login Bonus</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Open ChemCity every day to claim a streak bonus. Toilet cards boost your daily diamond
            reward.
          </p>
        </div>
      </div>
    ),
  },
  {
    emoji: '🏪',
    title: 'Collect Cards in ChemStore',
    subtitle: 'A new selection every day.',
    body: (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-slate-300 leading-relaxed">
          The <strong className="text-white">🏪 ChemStore</strong> rotates 3–6 cards daily. Spend
          coins or diamonds to add them to your collection.
        </p>
        <div className="flex flex-col gap-2">
          {[
            {
              pill: 'Common',
              pillClass: 'bg-slate-600 text-white',
              desc: 'Affordable and plentiful — great for filling slots.',
            },
            { pill: 'Rare', pillClass: 'bg-blue-600 text-white', desc: 'Stronger skill contributions.' },
            { pill: 'Epic', pillClass: 'bg-purple-600 text-white', desc: 'Significant boosts to place skills.' },
            {
              pill: 'Legendary',
              pillClass: 'bg-yellow-400 text-slate-900',
              desc: 'Massive power — rare to appear in the store.',
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
            💡 <strong className="text-white">Tip:</strong> Equip cards from the 🛍️{' '}
            <strong>Boutique</strong> to get a discount in the ChemStore — up to 50% off coin prices!
          </p>
        </div>
      </div>
    ),
  },
] as const;

export const OnboardingOverlay: React.FC = () => {
  const dismissOnboarding = useChemCityStore((s) => s.dismissOnboarding);
  const [step, setStep] = useState(0);

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
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all active:scale-95"
            >
              {isLast ? "Let's go! 🚀" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
