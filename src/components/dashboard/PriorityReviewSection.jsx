import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Play, ArrowRight, Zap, X, Info } from 'lucide-react';
import { getTopMistakesByPriority, getMasteryState } from '../../utils/masteryHelper';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * PriorityReviewSection: Shows top 3 urgent mistakes based on ISRS priority
 * Displays with Quick Fix button to practice immediately
 */
export default function PriorityReviewSection({ mistakes, recentTopics = [], embedded = false }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const topMistakes = useMemo(() => getTopMistakesByPriority(mistakes || [], recentTopics, 3), [mistakes, recentTopics]);
  const [showInfo, setShowInfo] = useState(false);

  if (!topMistakes || topMistakes.length === 0) {
    return (
      <div className={embedded ? 'h-full' : 'bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border-2 border-slate-200 p-6'}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
            <Zap className="text-slate-600" size={28} />
          </div>
          <h3 className="text-xl font-black text-slate-800">{t('dashboard.priorityReviewTitle')}</h3>
        </div>
        <p className="text-slate-600 text-center py-8">
          {t('dashboard.priorityReviewEmpty')}
        </p>
      </div>
    );
  }

  const handleQuickFix = (questionId) => {
    // Navigate to quiz engine with specific question
    navigate('/', { state: { focusQuestionId: questionId } });
  };

  return (
    <div className={embedded ? 'h-full' : 'bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-600" size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black text-slate-800">{t('dashboard.priorityReviewTitle')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('dashboard.top3UrgentMistakes')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all flex items-center justify-center font-black text-red-700 hover:scale-110 active:scale-105"
          title={t('dashboard.howThisWorks')}
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border-2 border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={20} className="text-red-600" />
                <h3 className="text-lg font-black text-slate-800">{t('dashboard.priorityReviewMechanismTitle')}</h3>
              </div>
              <button type="button" onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all" aria-label={t('common.close')}>
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p className="font-medium">
                {t('dashboard.priorityReviewMechanismDesc')}
              </p>
              <div className="space-y-2">
                <div>
                  <div className="font-black text-slate-800">{t('dashboard.whatIncreasesPriorityTitle')}</div>
                  <div className="text-slate-600 font-medium">{t('dashboard.whatIncreasesPriorityDesc')}</div>
                </div>
                <div>
                  <div className="font-black text-slate-800">{t('dashboard.whatQuickFixDoesTitle')}</div>
                  <div className="text-slate-600 font-medium">{t('dashboard.whatQuickFixDoesDesc')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mistakes List */}
      <div className="space-y-3">
        {topMistakes.map((mistake, index) => {
          const state = getMasteryState(mistake.correctCount || 0);
          const priority = mistake.masteryPriority || 0;
          const priorityLabel = priority > 8 ? t('dashboard.priorityCritical') : priority > 5 ? t('dashboard.priorityHigh') : t('dashboard.priorityMedium');
          const priorityColor = priority > 8 ? 'text-red-700 bg-red-50' : priority > 5 ? 'text-orange-700 bg-orange-50' : 'text-yellow-700 bg-yellow-50';

          return (
            <div
              key={mistake.questionId || index}
              className={`rounded-xl p-4 border-l-4 transition-all ${state.borderClass} ${state.bgClass}`}
            >
              {/* Top Row: Rank + Priority + Status */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">#{index + 1}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${priorityColor}`}>
                    {tf('dashboard.priorityLabel', { level: priorityLabel })}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${state.badgeClass}`}>
                    {state.label}
                  </span>
                </div>
              </div>

              {/* Question Preview */}
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700 line-clamp-2">
                  {mistake.Question || t('dashboard.questionTextNotAvailable')}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">{mistake.Topic}</span>
                  {mistake.errorType && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{mistake.errorType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats & Button */}
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-xs text-slate-600">
                  <span>{t('dashboard.attempts')}: <span className="font-bold">{mistake.attemptCount || 1}</span></span>
                  <span>{t('dashboard.correct')}: <span className="font-bold">{mistake.correctCount || 0}</span></span>
                </div>
                <button
                  onClick={() => handleQuickFix(mistake.questionId)}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:shadow-lg hover:from-red-600 hover:to-orange-600 transition-all active:scale-95"
                >
                  <Play size={14} />
                  {t('dashboard.quickFix')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={() => navigate('/notebook')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all"
        >
          {t('dashboard.viewFullMistakeNotebook')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
