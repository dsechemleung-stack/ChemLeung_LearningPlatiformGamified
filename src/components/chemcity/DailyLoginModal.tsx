import React, { useMemo } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';

function milestoneMessage(streak: number): string {
  if (streak === 1) return 'Welcome back! 👋';
  if (streak === 7) return '7-day streak! 🎉';
  if (streak === 30) return '30-day legend! 🏆';
  if (streak % 10 === 0) return `${streak} days strong! ⚡`;
  return `${streak}-day streak! 🔥`;
}

export const DailyLoginModal: React.FC = () => {
  const dailyLogin = useChemCityStore((s) => s.dailyLogin);
  const dismissDailyLogin = useChemCityStore((s) => s.dismissDailyLogin);

  const msg = useMemo(() => milestoneMessage(dailyLogin.streak || 0), [dailyLogin.streak]);

  const isOpen = dailyLogin.showModal;
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[70]" onClick={dismissDailyLogin} />
      <div className="fixed inset-x-4 top-20 z-[80] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base">Daily Login Bonus</h3>
            <p className="text-slate-400 text-xs">{msg}</p>
          </div>
          <button
            onClick={dismissDailyLogin}
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
              <p className="text-yellow-300 font-black text-2xl tabular-nums">+{Number(dailyLogin.coins || 0).toLocaleString()} 🪙</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Diamonds</p>
              <p className="text-cyan-300 font-black text-2xl tabular-nums">+{Number(dailyLogin.diamonds || 0).toLocaleString()} 💎</p>
            </div>
          </div>

          <div className="bg-indigo-900/30 border border-indigo-800 rounded-xl p-3">
            <p className="text-indigo-200 text-xs">
              Tip: Equip cards in the <span className="font-bold">🚽 Toilet</span> to boost daily login diamonds.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={dismissDailyLogin}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-bold"
            >
              Nice
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
