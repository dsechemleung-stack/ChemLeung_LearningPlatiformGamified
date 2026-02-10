import React, { useMemo } from 'react';
import { BarChart3, Zap, Target } from 'lucide-react';
import { getMasteryState, calculateMasteryStats } from '../../utils/masteryHelper';

/**
 * MasteryProgressHub: Displays the syllabus progress with Unseen/In-Progress/Mastered breakdown
 * Replaces the 5 basic stat boxes with a more meaningful visual
 */
export default function MasteryProgressHub({ userProfile, mistakes }) {
  const stats = useMemo(() => calculateMasteryStats(userProfile, mistakes || []), [userProfile, mistakes]);

  const total = stats.unseenCount + stats.inProgressCount + stats.masteredCount;
  const unseenPct = total > 0 ? Math.round((stats.unseenCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((stats.inProgressCount / total) * 100) : 0;
  const masteredPct = total > 0 ? Math.round((stats.masteredCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-100 p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
          <BarChart3 className="text-indigo-600" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Mastery Health Bar</h2>
          <p className="text-sm text-slate-500 mt-1">Based on the Rule of 3 system</p>
        </div>
      </div>

      {/* Main Progress Bar with Stacked Sections */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-700">Syllabus Coverage</h3>
          <span className="text-sm font-semibold text-slate-600">{total} Topics Tracked</span>
        </div>

        {/* 3-Segment Progress Bar */}
        <div className="flex h-6 rounded-full overflow-hidden bg-slate-100 shadow-inner border border-slate-200">
          {/* Red: Unseen */}
          <div
            className="bg-red-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${unseenPct}%` }}
            title={`${unseenPct}% Unseen (${stats.unseenCount} topics)`}
          >
            {unseenPct > 5 && <span className="text-white text-xs font-bold">{unseenPct}%</span>}
          </div>

          {/* Amber: In-Progress */}
          <div
            className="bg-amber-400 flex items-center justify-center transition-all duration-300"
            style={{ width: `${inProgressPct}%` }}
            title={`${inProgressPct}% Improving (${stats.inProgressCount} topics)`}
          >
            {inProgressPct > 5 && <span className="text-white text-xs font-bold">{inProgressPct}%</span>}
          </div>

          {/* Green: Mastered */}
          <div
            className="bg-green-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${masteredPct}%` }}
            title={`${masteredPct}% Mastered (${stats.masteredCount} topics)`}
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
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">New</span>
          </div>
          <div className="text-3xl font-black text-red-600">{stats.unseenCount}</div>
          <p className="text-xs text-red-600 mt-1">Not yet attempted</p>
        </div>

        {/* In-Progress */}
        <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Improving</span>
          </div>
          <div className="text-3xl font-black text-amber-600">{stats.inProgressCount}</div>
          <p className="text-xs text-amber-600 mt-1">1-2 correct answers</p>
        </div>

        {/* Mastered */}
        <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Mastered</span>
          </div>
          <div className="text-3xl font-black text-green-600">{stats.masteredCount}</div>
          <p className="text-xs text-green-600 mt-1">3+ correct answers ✓</p>
        </div>
      </div>

      {/* Legacy Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">Total Attempts</div>
          <div className="text-2xl font-black text-slate-800">{userProfile?.totalAttempts || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">Overall Accuracy</div>
          <div className="text-2xl font-black text-slate-800">
            {userProfile?.totalQuestions > 0 ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100) : 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">Questions Solved</div>
          <div className="text-2xl font-black text-slate-800">{userProfile?.totalQuestions || 0}</div>
        </div>
      </div>
    </div>
  );
}
