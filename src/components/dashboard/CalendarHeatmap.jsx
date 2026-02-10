import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * CalendarHeatmap: 30-day mistake-clearing activity visualization
 * Shows daily progress on a calendar grid with color intensity
 */
export default function CalendarHeatmap({ mistakes = [] }) {
  const { t } = useLanguage();

  const activityMap = useMemo(() => {
    const map = {};
    const now = new Date();

    // Initialize 30-day map
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map[dateStr] = 0;
    }

    // Count correct answers by date
    mistakes.forEach((mistake) => {
      if (mistake.lastCorrect) {
        const dateStr = new Date(mistake.lastCorrect).toISOString().split('T')[0];
        if (map[dateStr] !== undefined) {
          map[dateStr]++;
        }
      }
    });

    return map;
  }, [mistakes]);

  const days = Object.entries(activityMap).reverse();
  const maxActivity = Math.max(...Object.values(activityMap), 1);

  const getColor = (count) => {
    const intensity = count / maxActivity;
    if (intensity === 0) return 'bg-slate-100 hover:bg-slate-200';
    if (intensity < 0.33) return 'bg-green-200 hover:bg-green-300';
    if (intensity < 0.67) return 'bg-green-400 hover:bg-green-500';
    return 'bg-green-600 hover:bg-green-700';
  };

  const getTotalCleared = () => Object.values(activityMap).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <Calendar className="text-green-600" size={28} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Activity Tracker</h3>
          <p className="text-xs text-slate-500 mt-1">30-day mistake-clearing consistency</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">Total Cleared (30 days)</div>
          <div className="text-3xl font-black text-green-600">{getTotalCleared()}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 font-medium mb-1">Busiest Day</div>
          <div className="text-3xl font-black text-green-600">{maxActivity}</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto mb-4">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div
                key={`header-${idx}`}
                className="text-center text-xs font-bold text-slate-400 h-6 flex items-center justify-center"
              >
                {day.slice(0, 1)}
              </div>
            ))}

            {/* Calendar cells */}
            {days.map(([dateStr, count]) => {
              const date = new Date(dateStr);
              const dayOfWeek = date.getDay();
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={dateStr}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-slate-700 transition-all cursor-pointer ring-2 ring-offset-1 ${
                    isToday ? 'ring-indigo-400 ring-offset-slate-100' : 'ring-transparent'
                  } ${getColor(count)}`}
                  title={`${dateStr}: ${count} question${count !== 1 ? 's' : ''} cleared`}
                >
                  {count > 0 && <span className="text-white font-black text-xs">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-600 pt-4 border-t border-slate-200">
        <span className="font-medium">Less</span>
        <div className="flex gap-1">
          {[0, 0.33, 0.67, 1.0].map((i, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded transition-colors ${getColor(i * maxActivity).split(' ')[0]}`}
            />
          ))}
        </div>
        <span className="font-medium">More</span>
      </div>

      {/* Motivational Message */}
      <div className="mt-4 pt-4 border-t border-slate-200 bg-green-50 rounded-lg p-3">
        <p className="text-sm text-green-800 font-semibold text-center">
          🔥 Keep the streak going! Consistency builds mastery.{' '}
        </p>
      </div>
    </div>
  );
}
