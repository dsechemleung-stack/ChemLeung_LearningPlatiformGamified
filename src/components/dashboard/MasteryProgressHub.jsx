import React, { useMemo, useState } from 'react';
import { BarChart3, Zap, Target, X, Info } from 'lucide-react';
import { getMasteryState, calculateMasteryStats } from '../../utils/masteryHelper';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * MasteryProgressHub: Displays the syllabus progress with Unseen/In-Progress/Mastered breakdown
 * Replaces the 5 basic stat boxes with a more meaningful visual
 */
export default function MasteryProgressHub({ userProfile, mistakes, embedded = false }) {
  const stats = useMemo(() => calculateMasteryStats(userProfile, mistakes || []), [userProfile, mistakes]);
  const [showInfo, setShowInfo] = useState(false);
  const { t, tf } = useLanguage();

  const total = stats.unseenCount + stats.inProgressCount + stats.masteredCount;
  const unseenPct = total > 0 ? Math.round((stats.unseenCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((stats.inProgressCount / total) * 100) : 0;
  const masteredPct = total > 0 ? Math.round((stats.masteredCount / total) * 100) : 0;

  return (
    <div className={embedded ? 'h-full' : 'bg-white rounded-2xl shadow-lg border-2 border-indigo-100 p-8'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
          <BarChart3 className="text-indigo-600" size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black text-slate-800">{t('dashboard.masteryHealthBarTitle')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('dashboard.ruleOf3Subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center font-black text-indigo-700 hover:scale-110 active:scale-105"
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
                <Info size={20} className="text-indigo-700" />
                <h3 className="text-lg font-black text-slate-800">{t('dashboard.masteryHealthBarMechanismTitle')}</h3>
              </div>
              <button type="button" onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all" aria-label={t('common.close')}>
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p className="font-medium">
                {t('dashboard.masteryMechanismDesc')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border-2 border-slate-200 bg-red-50">
                  <div className="font-black text-red-700">{t('dashboard.masteryNewTitle')}</div>
                  <div className="text-slate-600 font-medium">{t('dashboard.masteryNewDesc')}</div>
                </div>
                <div className="p-3 rounded-xl border-2 border-slate-200 bg-amber-50">
                  <div className="font-black text-amber-700">{t('dashboard.masteryImprovingTitle')}</div>
                  <div className="text-slate-600 font-medium">{t('dashboard.masteryImprovingDesc')}</div>
                </div>
                <div className="p-3 rounded-xl border-2 border-slate-200 bg-green-50">
                  <div className="font-black text-green-700">{t('dashboard.masteryMasteredTitle')}</div>
                  <div className="text-slate-600 font-medium">{t('dashboard.masteryMasteredDesc')}</div>
                </div>
              </div>
              <p className="text-slate-600 font-medium">
                {t('dashboard.masteryBarExplainer')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Progress Bar with Stacked Sections */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-700">{t('dashboard.syllabusCoverage')}</h3>
          <span className="text-sm font-semibold text-slate-600">{tf('dashboard.topicsTrackedCount', { count: total })}</span>
        </div>

        {/* 3-Segment Progress Bar */}
        <div className="flex h-6 rounded-full overflow-hidden bg-slate-100 shadow-inner border border-slate-200">
          {/* Red: Unseen */}
          <div
            className="bg-red-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${unseenPct}%` }}
            title={tf('dashboard.unseenTooltip', { pct: unseenPct, count: stats.unseenCount })}
          >
            {unseenPct > 5 && <span className="text-white text-xs font-bold">{unseenPct}%</span>}
          </div>

          {/* Amber: In-Progress */}
          <div
            className="bg-amber-400 flex items-center justify-center transition-all duration-300"
            style={{ width: `${inProgressPct}%` }}
            title={tf('dashboard.improvingTooltip', { pct: inProgressPct, count: stats.inProgressCount })}
          >
            {inProgressPct > 5 && <span className="text-white text-xs font-bold">{inProgressPct}%</span>}
          </div>

          {/* Green: Mastered */}
          <div
            className="bg-green-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${masteredPct}%` }}
            title={tf('dashboard.masteredTooltip', { pct: masteredPct, count: stats.masteredCount })}
          >
            {masteredPct > 5 && <span className="text-white text-xs font-bold">{masteredPct}%</span>}
          </div>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Unseen */}
        <div className="bg-red-50 rounded-xl p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">{t('dashboard.masteryNewTitle')}</span>
          </div>
          <div className="text-3xl font-black text-red-600">{stats.unseenCount}</div>
          <p className="text-xs text-red-600 mt-1">{t('dashboard.masteryNewDesc')}</p>
        </div>

        {/* In-Progress */}
        <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{t('dashboard.masteryImprovingTitle')}</span>
          </div>
          <div className="text-3xl font-black text-amber-600">{stats.inProgressCount}</div>
          <p className="text-xs text-amber-600 mt-1">{t('dashboard.masteryImprovingDesc')}</p>
        </div>

        {/* Mastered */}
        <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">{t('dashboard.masteryMasteredTitle')}</span>
          </div>
          <div className="text-3xl font-black text-green-600">{stats.masteredCount}</div>
          <p className="text-xs text-green-600 mt-1">{t('dashboard.masteryMasteredDesc')}</p>
        </div>
      </div>

      {/* Legacy Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">{t('dashboard.totalAttempts')}</div>
          <div className="text-2xl font-black text-slate-800">{userProfile?.totalAttempts || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">{t('dashboard.overallAccuracy')}</div>
          <div className="text-2xl font-black text-slate-800">
            {userProfile?.totalQuestions > 0 ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100) : 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">{t('dashboard.questionsSolved')}</div>
          <div className="text-2xl font-black text-slate-800">{userProfile?.totalQuestions || 0}</div>
        </div>
      </div>
    </div>
  );
}
