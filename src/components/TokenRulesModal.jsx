import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Info, Gem, Trophy, Gift, Target } from 'lucide-react';

export default function TokenRulesModal({ open, onClose, title }) {
  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 border-2 border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Info size={24} />
              </div>
              <h2 className="text-2xl font-black">{title || t('store.howToEarnTokens')}</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <X size={24} />
            </button>
          </div>
          <p className="mt-3 text-amber-100 font-medium">
            Complete activities to earn diamonds and unlock exclusive items!
          </p>
        </div>

        {/* Rules Grid */}
        <div className="p-6">
          <div className="grid gap-4">
            {/* Correct Answers */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Target size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-lg mb-1">
                  {t('store.correctAnswers')}
                </h3>
                <p className="text-green-700 font-medium">
                  {t('store.correctAnswersTokens')}
                </p>
              </div>
            </div>

            {/* Quiz Bonus */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Trophy size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 text-lg mb-1">
                  {t('store.quizBonus')}
                </h3>
                <p className="text-blue-700 font-medium">
                  {t('store.quizBonusTokens')}
                </p>
              </div>
            </div>

            {/* Daily Reward */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Gift size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900 text-lg mb-1">
                  {t('store.dailyReward')}
                </h3>
                <p className="text-purple-700 font-medium">
                  {t('store.dailyRewardTokens')}
                </p>
              </div>
            </div>

            {/* Weekly Leaderboard */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Gem size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-lg mb-1">
                  {t('store.weeklyLeaderboard')}
                </h3>
                <p className="text-amber-700 font-medium">
                  {t('store.weeklyLeaderboardTokens')}
                </p>
              </div>
            </div>

            {/* Millionaire Game */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Trophy size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-900 text-lg mb-1">
                  {t('store.millionaireGame')}
                </h3>
                <p className="text-rose-700 font-medium">
                  {t('store.millionaireGameTokens')}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Tip */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Gem size={16} className="text-amber-500" />
              <span className="font-medium">
                Pro tip: Combine multiple activities to maximize your diamond earnings!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
