import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Play, ArrowRight, Zap } from 'lucide-react';
import { getTopMistakesByPriority, getMasteryState } from '../../utils/masteryHelper';

/**
 * PriorityReviewSection: Shows top 3 urgent mistakes based on ISRS priority
 * Displays with Quick Fix button to practice immediately
 */
export default function PriorityReviewSection({ mistakes, recentTopics = [] }) {
  const navigate = useNavigate();
  const topMistakes = useMemo(() => getTopMistakesByPriority(mistakes || [], recentTopics, 3), [mistakes, recentTopics]);

  if (!topMistakes || topMistakes.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border-2 border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
            <Zap className="text-slate-600" size={28} />
          </div>
          <h3 className="text-xl font-black text-slate-800">Priority Review</h3>
        </div>
        <p className="text-slate-600 text-center py-8">
          No mistakes tracked yet. Complete quizzes and log your mistakes to get personalized review recommendations!
        </p>
      </div>
    );
  }

  const handleQuickFix = (questionId) => {
    // Navigate to quiz engine with specific question
    navigate('/', { state: { focusQuestionId: questionId } });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-600" size={28} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Priority Review</h3>
          <p className="text-xs text-slate-500 mt-1">Top 3 Urgent Mistakes (ISRS Algorithm)</p>
        </div>
      </div>

      {/* Mistakes List */}
      <div className="space-y-3">
        {topMistakes.map((mistake, index) => {
          const state = getMasteryState(mistake.correctCount || 0);
          const priority = mistake.masteryPriority || 0;
          const priorityLabel = priority > 8 ? 'Critical' : priority > 5 ? 'High' : 'Medium';
          const priorityColor = priority > 8 ? 'text-red-700 bg-red-50' : priority > 5 ? 'text-orange-700 bg-orange-50' : 'text-yellow-700 bg-yellow-50';

          return (
            <div
              key={mistake.questionId || index}
              className={`rounded-xl p-4 border-l-4 transition-all $${state.borderClass} ${state.bgClass}`}
            >
              {/* Top Row: Rank + Priority + Status */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">#{index + 1}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${priorityColor}`}>
                    {priorityLabel} Priority
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${state.badgeClass}`}>
                    {state.label}
                  </span>
                </div>
              </div>

              {/* Question Preview */}
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700 line-clamp-2">
                  {mistake.Question || 'Question text not available'}
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
                  <span>Attempts: <span className="font-bold">{mistake.attemptCount || 1}</span></span>
                  <span>Correct: <span className="font-bold">{mistake.correctCount || 0}</span></span>
                </div>
                <button
                  onClick={() => handleQuickFix(mistake.questionId)}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:shadow-lg hover:from-red-600 hover:to-orange-600 transition-all active:scale-95"
                >
                  <Play size={14} />
                  Quick Fix
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
          View Full Mistake Notebook
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
