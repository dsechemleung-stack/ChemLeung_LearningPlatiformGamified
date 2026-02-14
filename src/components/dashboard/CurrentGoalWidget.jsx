import React, { useMemo } from 'react';
import { Target, ThumbsUp } from 'lucide-react';
import { getMasteryState, findClosestToMastery } from '../../utils/masteryHelper';

/**
 * CurrentGoalWidget: Shows the user's next mastery milestone
 * "You are 5 questions away from mastering Organic Chemistry."
 */
export default function CurrentGoalWidget({ mistakes, embedded = false }) {
  const goal = useMemo(() => findClosestToMastery(mistakes || []), [mistakes]);

  if (!goal) {
    return (
      <div className={embedded ? 'h-full' : 'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg border-2 border-indigo-200 p-6'}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-200 flex items-center justify-center">
            <Target className="text-indigo-600" size={28} />
          </div>
          <h3 className="text-xl font-black text-indigo-900">Your Next Goal</h3>
        </div>
        <p className="text-indigo-700">No tracked mistakes yet. Complete quizzes to start your learning journey!</p>
      </div>
    );
  }

  const progressPercentage = (goal.mastered / goal.total) * 100;

  return (
    <div className={embedded ? 'h-full' : 'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg border-2 border-indigo-200 p-6'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-200 flex items-center justify-center">
          <Target className="text-indigo-600" size={28} />
        </div>
        <h3 className="text-xl font-black text-indigo-900">Your Next Goal</h3>
      </div>

      {/* Goal Statement */}
      <div className="mb-4">
        <p className="text-indigo-900 text-lg font-bold">
          You are{' '}
          <span className="text-indigo-600 font-black">
            {Math.max(0, goal.questionsUntilMastery)}
          </span>{' '}
          questions away from mastering{' '}
          <span className="text-indigo-600 bg-indigo-200 px-2 py-1 rounded font-bold">
            {goal.topic}
          </span>
        </p>
        <p className="text-indigo-600 text-sm mt-2 flex items-center gap-1">
          <ThumbsUp size={16} /> {goal.mastered} of {goal.total} topics already solidified
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-indigo-200/50 rounded-full h-3 overflow-hidden mb-3 border border-indigo-300">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs font-semibold text-indigo-700">
        <span>{goal.mastered}/{goal.total} Mastered</span>
        <span>{Math.round(progressPercentage)}%</span>
      </div>

      {/* Action CTA */}
      <div className="mt-4 pt-4 border-t border-indigo-200">
        <p className="text-xs text-indigo-600 font-medium mb-2">Pro Tip:</p>
        <p className="text-sm text-indigo-800 font-semibold">
          Focus your daily mission on {goal.topic} to reach mastery faster!
        </p>
      </div>
    </div>
  );
}
