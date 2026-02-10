import React from 'react';
import { Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * CompactAttemptsList: More compact version of Recent Attempts
 * Adds Topic Badges and better visual hierarchy
 */
export default function CompactAttemptsList({ attempts = [], onSelectAttempt = () => {}, loading = false }) {
  const { t } = useLanguage();

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const s = Math.floor(ms / 1000),
      m = Math.floor(s / 60),
      h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const getAccuracyColor = (percentage) => {
    if (percentage >= 70) return 'from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300';
    if (percentage >= 50) return 'from-amber-100 to-amber-200 text-amber-800 border-amber-300';
    return 'from-rose-100 to-rose-200 text-rose-800 border-rose-300';
  };

  const getTopicBadgeColor = (index) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-green-100 text-green-700',
      'bg-orange-100 text-orange-700',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-5 border-b-2 border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="text-slate-600" size={24} />
          Recent Attempts
        </h2>
        <span className="text-sm text-slate-500 font-medium">{attempts.length} Quiz Session(s)</span>
      </div>

      {/* Content */}
      <div className="p-6">
        {attempts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-semibold mb-2">No attempts yet</p>
            <p className="text-slate-500 text-sm">Complete a quiz to see your results here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <button
                key={attempt.id}
                onClick={() => onSelectAttempt(attempt)}
                className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                {/* Left Side: Score + Details */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Score Badge */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 border-2 bg-gradient-to-br ${getAccuracyColor(
                      attempt.percentage
                    )}`}
                  >
                    {attempt.percentage}%
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-slate-800">
                        {attempt.correctAnswers}/{attempt.totalQuestions} Correct
                      </div>
                      {attempt.timeSpent && (
                        <span className="text-xs text-slate-500">
                          ⏱️ {formatTime(attempt.timeSpent)}
                        </span>
                      )}
                    </div>

                    {/* Date & Topics */}
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-slate-500 font-medium">{formatDate(attempt.timestamp)}</div>

                      {/* Topic Badges */}
                      {attempt.topics && attempt.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {attempt.topics.slice(0, 3).map((topic, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-xs font-bold truncate ${getTopicBadgeColor(
                                idx
                              )}`}
                            >
                              {topic}
                            </span>
                          ))}
                          {attempt.topics.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-slate-600 bg-slate-100">
                              +{attempt.topics.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Arrow */}
                <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {attempts.length > 0 && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <p className="text-xs text-center text-slate-500">
            👆 <span className="font-semibold">Click any attempt</span> to see detailed analysis and insights
          </p>
        </div>
      )}
    </div>
  );
}
