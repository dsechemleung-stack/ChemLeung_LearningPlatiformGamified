import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { quizStorage } from '../utils/quizStorage';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  BookOpen, ArrowLeft, Play, AlertCircle, Target,
  CheckCircle, Filter, ChevronDown, Calendar, Hash, Tag,
  Clock, Zap, TrendingUp, Brain, BarChart2, Layers, X,
  AlertTriangle, Flame, Star, PlusCircle, Wand2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MASTERY_THRESHOLD = 3; // Correct answers to graduate a mistake

const ERROR_TYPES = [
  { value: 'misread', label: 'Misread Question', color: 'blue' },
  { value: 'calculation', label: 'Calculation Error', color: 'red' },
  { value: 'conceptual', label: 'Conceptual Gap', color: 'orange' },
  { value: 'careless', label: 'Careless Mistake', color: 'yellow' },
  { value: 'vocab', label: 'Vocabulary Gap', color: 'purple' },
  { value: 'diagram', label: 'Diagram Misread', color: 'pink' },
];

const MASTERY_LEVELS = {
  new:        { label: 'New',         min: 0, max: 0 },
  progressing:{ label: 'Progressing', min: 1, max: 1 },
  near:       { label: 'Near-Mastered', min: 2, max: 2 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS: ISRS & State Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate multi-weighted ISRS (Integrated Spaced Repetition System) priority score
 * Score = (U × 0.4) + (D × 0.4) + (R × 0.2)
 * where U = Urgency (Ebbinghaus curve), D = Difficulty, R = Recency/Context boost
 */
function calculateMasteryPriority(mistake, recentTopics = []) {
  // 1. URGENCY: Ebbinghaus Forgetting Curve
  const now = Date.now();
  const lastAttemptTime = new Date(mistake.lastAttempted).getTime();
  const daysSinceLastAttempt = Math.max(0, (now - lastAttemptTime) / (1000 * 60 * 60 * 24));
  
  // U = 2^(days/7) exponential curve
  const U = Math.pow(2, daysSinceLastAttempt / 7);
  
  // 2. DIFFICULTY: Based on attempt count (max 1.0 at 3+ attempts)
  const D = Math.min(1.0, (mistake.attemptCount || 1) / 3);
  
  // 3. RECENCY/CONTEXT: Boost if matches recent quiz topics
  let R = 0.5; // Baseline
  if (recentTopics.length > 0 && recentTopics.includes(mistake.Topic)) {
    R = 1.5; // 1.5x boost for contextual relevance
  }
  
  return (U * 0.4) + (D * 0.4) + (R * 0.2);
}

/**
 * Get mastery state (0: Unprocessed, 1: Acquiring, 2: Consolidating, 3: Mastered)
 */
function getMasteryState(improvementCount = 0) {
  if (improvementCount === 0) return { state: 0, label: 'Unprocessed', color: 'red' };
  if (improvementCount === 1) return { state: 1, label: 'Acquiring', color: 'amber' };
  if (improvementCount === 2) return { state: 2, label: 'Consolidating', color: 'yellow' };
  return { state: 3, label: 'Mastered', color: 'green' };
}

/**
 * Legacy priority calculation for backward compatibility
 */
function calcPriority(mistake) {
  const days = (Date.now() - new Date(mistake.lastAttempted).getTime()) / (1000 * 60 * 60 * 24);
  return days * 1.2 - (mistake.improvementCount ?? 0) * 2;
}

/**
 * Mastery styling helper
 */
function masteryStyle(improvementCount) {
  if (improvementCount >= 2)
    return {
      border: 'border-green-300',
      bg: 'bg-green-50/60',
      badge: 'bg-green-100 text-green-700',
      labelKey: 'notebook.statusNearMastery',
      dot: 'bg-green-500',
    };
  if (improvementCount === 1)
    return {
      border: 'border-amber-300',
      bg: 'bg-amber-50/60',
      badge: 'bg-amber-100 text-amber-700',
      labelKey: 'notebook.statusInProgress',
      dot: 'bg-amber-400',
    };
  return {
    border: 'border-red-200',
    bg: 'bg-white',
    badge: 'bg-red-100 text-red-700',
    labelKey: 'notebook.statusUnprocessed',
    dot: 'bg-red-500',
  };
}

/**
 * Apply Rule of 3: Archive questions after 3 consecutive correct answers
 */
function applyRuleOfThree(improvements) {
  const archived = JSON.parse(localStorage.getItem('mistake_archive') || '{}');
  const activeImprovements = { ...improvements };
  
  Object.entries(improvements).forEach(([questionId, data]) => {
    if ((data.correctCount || 0) >= 3) {
      archived[questionId] = { ...data, archivedAt: new Date().toISOString() };
      delete activeImprovements[questionId];
    }
  });
  
  if (Object.keys(archived).length > Object.keys(JSON.parse(localStorage.getItem('mistake_archive') || '{}')).length) {
    localStorage.setItem('mistake_archive', JSON.stringify(archived));
  }
  
  return activeImprovements;
}

/**
 * Select 20 questions for AI Daily Mission with interleaved practice (≥3 topics)
 */
function selectAIDailyMission(mistakes, recentTopics = []) {
  // Calculate priority for each mistake
  const prioritized = mistakes
    .map(m => ({
      ...m,
      masteryPriority: calculateMasteryPriority(m, recentTopics)
    }))
    .sort((a, b) => b.masteryPriority - a.masteryPriority);
  
  // Group by topic
  const byTopic = {};
  prioritized.forEach(m => {
    if (!byTopic[m.Topic]) byTopic[m.Topic] = [];
    byTopic[m.Topic].push(m);
  });
  
  // Round-robin selection for interleaved practice
  const selected = [];
  const topicList = Object.keys(byTopic);
  const indices = Object.fromEntries(topicList.map(t => [t, 0]));
  
  while (selected.length < 20 && topicList.some(t => indices[t] < byTopic[t].length)) {
    for (const topic of topicList) {
      if (selected.length >= 20) break;
      if (indices[topic] < byTopic[topic].length) {
        selected.push(byTopic[topic][indices[topic]++]);
      }
    }
  }
  
  // Verify interleaved practice
  const uniqueTopics = new Set(selected.map(q => q.Topic)).size;
  if (uniqueTopics < 3) {
    console.warn(`AI Daily Mission: Only ${uniqueTopics} topics, need ≥3 for interleaved practice`);
  }
  
  return selected.slice(0, 20);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TooltipWithPortal: Floating UI smart tooltip with viewport edge detection
 */
function TooltipWithPortal({ trigger, content, placement = 'top' }) {
  const [open, setOpen] = useState(false);
  
  const { refs, floatingStyles } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate
  });
  
  return (
    <>
      <div
        ref={refs.setReference}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="cursor-help"
      >
        {trigger}
      </div>
      
      {open && createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[9999] bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl ring-1 ring-white/10 max-w-xs pointer-events-none"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * CalendarHeatmap: 30-day mistake-clearing activity visualization
 */
function CalendarHeatmap({ improvements }) {
  const { t } = useLanguage();
  
  const activityMap = useMemo(() => {
    const map = {};
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map[dateStr] = 0;
    }
    
    Object.values(improvements).forEach(data => {
      if (data.lastCorrect) {
        const dateStr = new Date(data.lastCorrect).toISOString().split('T')[0];
        if (map[dateStr] !== undefined) map[dateStr]++;
      }
    });
    
    return map;
  }, [improvements]);
  
  const days = Object.entries(activityMap).reverse();
  const maxActivity = Math.max(...Object.values(activityMap), 1);
  
  const getColor = (count) => {
    const intensity = count / maxActivity;
    if (intensity === 0) return 'bg-slate-100';
    if (intensity < 0.33) return 'bg-blue-200';
    if (intensity < 0.67) return 'bg-blue-400';
    return 'bg-blue-600';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        {t('notebook.mistakeClearingActivity')}
      </h3>
      
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={`header-${idx}`} className="text-center text-xs font-bold text-slate-400 h-6">
            {day.slice(0, 1)}
          </div>
        ))}
        
        {days.map(([dateStr, count]) => (
          <div
            key={dateStr}
            className={`w-8 h-8 rounded ${getColor(count)} flex items-center justify-center text-xs font-bold text-slate-700 hover:ring-2 ring-blue-400 transition-all cursor-pointer`}
            title={`${dateStr}: ${count} cleared`}
          >
            {count > 0 && count}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
        <span>{t('notebook.less')}</span>
        <div className="flex gap-1">
          {[0, 0.33, 0.67, 1.0].map((i, idx) => (
            <div key={idx} className={`w-3 h-3 rounded ${getColor(i * maxActivity)}`} />
          ))}
        </div>
        <span>{t('notebook.more')}</span>
      </div>
    </div>
  );
}

/**
 * TopicHeatmap: Error density visualization by topic
 */
function TopicHeatmap({ mistakes }) {
  const { t } = useLanguage();
  
  const errorDensity = useMemo(() => {
    const topicMap = {};
    
    mistakes.forEach(m => {
      if (!topicMap[m.Topic]) {
        topicMap[m.Topic] = { attempted: 0, wrong: 0 };
      }
      topicMap[m.Topic].wrong++;
      topicMap[m.Topic].attempted += Math.max(m.attemptCount, 1);
    });
    
    return Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      errorDensity: Math.min(1.0, data.wrong / Math.max(data.attempted, 1)),
      wrongCount: data.wrong,
      attemptedCount: data.attempted
    })).sort((a, b) => b.errorDensity - a.errorDensity);
  }, [mistakes]);
  
  const getColor = (density) => {
    if (density < 0.2) return 'bg-yellow-100 text-yellow-900';
    if (density < 0.4) return 'bg-orange-200 text-orange-900';
    if (density < 0.6) return 'bg-orange-400 text-orange-900';
    if (density < 0.8) return 'bg-red-500 text-white';
    return 'bg-crimson-700 text-white';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <BarChart2 size={20} className="text-orange-600" />
        {t('notebook.errorDensityByTopic')}
      </h3>
      
      <div className="space-y-3">
        {errorDensity.map(({ topic, errorDensity: density, wrongCount, attemptedCount }) => (
          <div key={topic} className="flex items-center gap-4">
            <div className="w-32 font-semibold text-sm text-slate-700 truncate">
              {topic}
            </div>
            <div className={`flex-1 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${getColor(density)}`}>
              {(density * 100).toFixed(0)}% ({wrongCount}/{attemptedCount})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ImprovementTrendChart: Stacked area chart of mastery state progression
 */
function ImprovementTrendChart({ improvements }) {
  const { t } = useLanguage();
  
  const trendData = useMemo(() => {
    const stateHistory = {};
    
    Object.values(improvements).forEach(data => {
      const state = getMasteryState(data.correctCount || 0);
      const dateStr = data.lastCorrect
        ? new Date(data.lastCorrect).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      if (!stateHistory[dateStr]) {
        stateHistory[dateStr] = { Unprocessed: 0, Acquiring: 0, Consolidating: 0, Mastered: 0 };
      }
      stateHistory[dateStr][state.label]++;
    });
    
    return Object.entries(stateHistory)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, states]) => ({ date, ...states }))
      .slice(-14); // Last 14 days
  }, [improvements]);
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-purple-600" />
        {t('notebook.improvementTrend')}
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="Unprocessed" stackId="1" stroke="#ef4444" fill="#fecaca" />
          <Area type="monotone" dataKey="Acquiring" stackId="1" stroke="#f59e0b" fill="#fed7aa" />
          <Area type="monotone" dataKey="Consolidating" stackId="1" stroke="#eab308" fill="#fef08a" />
          <Area type="monotone" dataKey="Mastered" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * ErrorTagSelector: Dropdown for metacognitive error tagging
 */
function ErrorTagSelector({ questionId, currentTag, onTag }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1 ${
          currentTag
            ? `bg-slate-100 text-slate-700`
            : 'bg-white text-slate-500 hover:border-slate-400'
        }`}
      >
        {currentTag ? ERROR_TYPES.find(e => e.value === currentTag)?.label : t('notebook.tagError')}
        <ChevronDown size={12} />
      </button>
      
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-max">
          {ERROR_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => {
                onTag(questionId, type.value);
                setOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                currentTag === type.value ? 'bg-blue-50 text-blue-700 font-bold' : ''
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${type.color}-500`} />
              {type.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * RetentionDashboard: Overview of learning progress
 */
function RetentionDashboard({ mistakes, improvements }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const addedThisWeek = mistakes.filter(
      (m) => new Date(m.lastAttempted).getTime() >= weekAgo
    ).length;

    const masteredThisWeek = Object.values(improvements).filter(
      (d) => (d.correctCount || 0) >= MASTERY_THRESHOLD &&
             d.lastCorrect &&
             new Date(d.lastCorrect).getTime() >= weekAgo
    ).length;

    const subtopicMap = {};
    mistakes.forEach((m) => {
      const key = m.Subtopic || 'Unknown';
      if (!subtopicMap[key]) subtopicMap[key] = { count: 0, repeats: 0 };
      subtopicMap[key].count++;
      if (m.attemptCount > 1) subtopicMap[key].repeats++;
    });

    const weakest = Object.entries(subtopicMap)
      .sort((a, b) => b[1].count + b[1].repeats * 2 - (a[1].count + a[1].repeats * 2))
      .slice(0, 6);

    return { addedThisWeek, masteredThisWeek, weakest };
  }, [mistakes, improvements]);

  const decayLabel =
    stats.addedThisWeek === 0 && stats.masteredThisWeek === 0
      ? '—'
      : stats.masteredThisWeek > stats.addedThisWeek
      ? t('notebook.decayImproving')
      : stats.masteredThisWeek === stats.addedThisWeek
      ? t('notebook.decayStable')
      : t('notebook.decayGrowing');

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="text-purple-600" size={20} />
          <span className="font-bold text-slate-800 text-lg">{t('notebook.retentionDashboard')}</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-200 p-6 space-y-6 bg-slate-50">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.addedThisWeek')}
              </div>
              <div className="text-3xl font-black text-red-500">{stats.addedThisWeek}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.masteredThisWeek')}
              </div>
              <div className="text-3xl font-black text-green-600">{stats.masteredThisWeek}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-purple-200 text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.decayRate')}
              </div>
              <div className="text-lg font-black text-purple-700 mt-1">{decayLabel}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Flame size={14} className="text-red-500" />
              {t('notebook.weakestSubtopics')}
            </h3>
            <div className="space-y-2">
              {stats.weakest.map(([subtopic, data]) => {
                const max = stats.weakest[0][1].count + stats.weakest[0][1].repeats * 2;
                const score = data.count + data.repeats * 2;
                const pct = max > 0 ? (score / max) * 100 : 0;
                return (
                  <div key={subtopic} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-slate-600 font-semibold truncate shrink-0">
                      {subtopic}
                    </div>
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-400 to-orange-400 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 shrink-0 w-8 text-right">
                      {data.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MistakeNotebookPage() {
  const { currentUser } = useAuth();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();

  // Core state
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [improvements, setImprovements] = useState({});
  const [errorTags, setErrorTags] = useState(() =>
    JSON.parse(localStorage.getItem('mistake_error_tags') || '{}')
  );

  // New ISRS state
  const [recentQuizTopics, setRecentQuizTopics] = useState(() =>
    JSON.parse(localStorage.getItem('recent_quiz_topics') || '[]')
  );
  const [archivedMistakes, setArchivedMistakes] = useState(() =>
    JSON.parse(localStorage.getItem('mistake_archive') || '{}')
  );
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Filter state
  const [showFilters, setShowFilters] = useState(true);
  const [questionCount, setQuestionCount] = useState('5');
  const [datePeriod, setDatePeriod] = useState('all');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [selectedMasteryLevels, setSelectedMasteryLevels] = useState([]);

  // Timer settings
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isTimedMode, setIsTimedMode] = useState(false);

  // ── Load data ──

  useEffect(() => { loadMistakes(); }, [currentUser]);

  async function loadMistakes() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setLoading(true);
      const attempts = await quizService.getUserAttempts(currentUser.uid, 100);
      const incorrectMap = new Map();
      const improvementData = JSON.parse(
        localStorage.getItem('mistake_improvements') || '{}'
      );

      attempts.forEach((attempt) => {
        if (!attempt.answers || !attempt.questions) return;
        attempt.questions.forEach((question) => {
          const userAnswer = attempt.answers[question.ID];
          const isCorrect = userAnswer && userAnswer === question.CorrectOption;

          if (isCorrect && improvementData[question.ID]) {
            improvementData[question.ID].correctCount =
              (improvementData[question.ID].correctCount || 0) + 1;
            improvementData[question.ID].lastCorrect = attempt.timestamp;
          }

          if (userAnswer && userAnswer !== question.CorrectOption) {
            const improveCount = improvementData[question.ID]?.correctCount || 0;
            if (improveCount >= MASTERY_THRESHOLD) return;

            if (!incorrectMap.has(question.ID)) {
              incorrectMap.set(question.ID, {
                ...question,
                attemptCount: 1,
                lastAttempted: attempt.timestamp,
                userAnswer,
                improvementCount: improveCount,
              });
            } else {
              const existing = incorrectMap.get(question.ID);
              existing.attemptCount += 1;
              existing.improvementCount = improveCount;
              if (new Date(attempt.timestamp) > new Date(existing.lastAttempted)) {
                existing.lastAttempted = attempt.timestamp;
                existing.userAnswer = userAnswer;
              }
            }
          }
        });
      });

      localStorage.setItem('mistake_improvements', JSON.stringify(improvementData));
      setImprovements(improvementData);

      const arr = Array.from(incorrectMap.values()).sort(
        (a, b) => calcPriority(b) - calcPriority(a)
      );
      setMistakes(arr);
    } catch (err) {
      console.error('Error loading mistakes:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Effects for persistence ──

  useEffect(() => {
    localStorage.setItem('mistake_error_tags', JSON.stringify(errorTags));
  }, [errorTags]);

  useEffect(() => {
    localStorage.setItem('recent_quiz_topics', JSON.stringify(recentQuizTopics));
  }, [recentQuizTopics]);

  useEffect(() => {
    // Apply Rule of 3 on improvements change
    const updated = applyRuleOfThree(improvements);
    setArchivedMistakes(JSON.parse(localStorage.getItem('mistake_archive') || '{}'));
  }, [improvements]);

  // ── ISRS Calculations (Memoized) ──

  const prioritizedMistakes = useMemo(() => {
    return mistakes
      .map(m => ({
        ...m,
        masteryPriority: calculateMasteryPriority(m, recentQuizTopics),
        masteryState: getMasteryState(m.improvementCount ?? 0)
      }))
      .sort((a, b) => b.masteryPriority - a.masteryPriority);
  }, [mistakes, recentQuizTopics]);

  // ── Filter helpers ──

  const allTopics = useMemo(
    () => [...new Set(mistakes.map((m) => m.Topic).filter(Boolean))].sort(),
    [mistakes]
  );

  const availableSubtopics = useMemo(() => {
    const base = selectedTopics.length > 0
      ? mistakes.filter((m) => selectedTopics.includes(m.Topic))
      : mistakes;
    return [...new Set(base.map((m) => m.Subtopic).filter(Boolean))].sort();
  }, [mistakes, selectedTopics]);

  useEffect(() => {
    setSelectedSubtopics((prev) =>
      prev.filter((s) => availableSubtopics.includes(s))
    );
  }, [availableSubtopics]);

  const topicBreakdown = useMemo(() => {
    const bd = {};
    mistakes.forEach((m) => {
      if (!bd[m.Topic]) bd[m.Topic] = { count: 0, repeated: 0 };
      bd[m.Topic].count++;
      if (m.attemptCount > 1) bd[m.Topic].repeated++;
    });
    return bd;
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    let result = [...mistakes];

    if (datePeriod === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((m) => new Date(m.lastAttempted) >= weekAgo);
    } else if (datePeriod === 'month') {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((m) => new Date(m.lastAttempted) >= monthAgo);
    }

    if (selectedTopics.length > 0)
      result = result.filter((m) => selectedTopics.includes(m.Topic));

    if (selectedSubtopics.length > 0)
      result = result.filter((m) => selectedSubtopics.includes(m.Subtopic));

    if (selectedMasteryLevels.length > 0) {
      result = result.filter((m) => {
        const ic = m.improvementCount ?? 0;
        return selectedMasteryLevels.some((lvl) => {
          const { min, max } = MASTERY_LEVELS[lvl];
          return ic >= min && ic <= max;
        });
      });
    }

    return result;
  }, [mistakes, datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels]);

  const practiceCount =
    questionCount === 'All'
      ? filteredMistakes.length
      : Math.min(parseInt(questionCount), filteredMistakes.length);

  // ── Handlers ──

  const handleTag = useCallback((questionId, tag) => {
    setErrorTags((prev) => {
      const next = { ...prev };
      if (tag === null) delete next[questionId];
      else next[questionId] = tag;
      return next;
    });
  }, []);

  const toggleTopic = useCallback((topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }, []);

  const toggleSubtopic = useCallback((sub) => {
    setSelectedSubtopics((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  }, []);

  const toggleMasteryLevel = useCallback((lvl) => {
    setSelectedMasteryLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    );
  }, []);

  const handlePracticeMistakes = () => {
    if (filteredMistakes.length === 0) return;
    const selected = [...filteredMistakes]
      .sort((a, b) => calcPriority(b) - calcPriority(a))
      .slice(0, practiceCount);
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selected);
    localStorage.setItem('quiz_mode', 'mistakes');
    localStorage.setItem('quiz_timer_enabled', timerEnabled.toString());
    localStorage.setItem('quiz_is_timed_mode', isTimedMode.toString());
    navigate('/quiz');
  };

  const handleAIDailyMission = () => {
    const selected = selectAIDailyMission(mistakes, recentQuizTopics);
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selected);
    localStorage.setItem('quiz_mode', 'mistakes');
    localStorage.setItem('quiz_timer_enabled', 'true');
    localStorage.setItem('quiz_is_timed_mode', 'true');
    navigate('/quiz');
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  // ── Derived stats ──

  const repeatedMistakes = useMemo(
    () => mistakes.filter((m) => m.attemptCount > 1).length,
    [mistakes]
  );
  const topicsToFocus = useMemo(
    () => new Set(mistakes.map((m) => m.Topic)).size,
    [mistakes]
  );

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue mx-auto mb-4" />
          <p className="text-slate-600">{t('notebook.loadingMistakes')}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BookOpen size={32} />
            {t('notebook.title')}
          </h1>
          <p className="text-orange-100 mt-1">{t('notebook.reviewMaster')}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TooltipWithPortal
          content={
            <>
              <div className="font-bold mb-2">{t('notebook.topicBreakdown')}</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(topicBreakdown)
                  .sort((a, b) => b[1].count - a[1].count)
                  .slice(0, 10)
                  .map(([topic, data]) => (
                    <div key={topic} className="flex justify-between gap-2">
                      <span className="truncate">{topic}</span>
                      <span className="font-bold shrink-0">{data.count}</span>
                    </div>
                  ))}
              </div>
            </>
          }
          trigger={
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-red-600" size={20} />
                <span className="text-sm font-semibold text-slate-600">
                  {t('notebook.totalMistakes')}
                </span>
              </div>
              <div className="text-3xl font-black text-red-600">{mistakes.length}</div>
            </div>
          }
        />

        <TooltipWithPortal
          content={
            <>
              <div className="font-bold mb-2">{t('notebook.weakTopics')}</div>
              <div className="space-y-1">
                {Object.entries(topicBreakdown)
                  .sort((a, b) => b[1].count - a[1].count)
                  .slice(0, 6)
                  .map(([topic, data]) => (
                    <div key={topic} className="text-amber-300 text-xs">
                      • {topic}: {data.count}
                    </div>
                  ))}
              </div>
            </>
          }
          trigger={
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-amber-600" size={20} />
                <span className="text-sm font-semibold text-slate-600">
                  {t('notebook.topicsToFocus')}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-600">{topicsToFocus}</div>
            </div>
          }
        />

        <TooltipWithPortal
          content={
            <>
              <div className="font-bold mb-2">{t('notebook.repeatsByTopic')}</div>
              <div className="space-y-1">
                {Object.entries(topicBreakdown)
                  .filter(([, data]) => data.repeated > 0)
                  .sort((a, b) => b[1].repeated - a[1].repeated)
                  .slice(0, 6)
                  .map(([topic, data]) => (
                    <div key={topic} className="flex justify-between gap-2 text-xs">
                      <span>{topic}</span>
                      <span className="text-red-400 font-bold">{data.repeated}×</span>
                    </div>
                  ))}
              </div>
            </>
          }
          trigger={
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-chemistry-green" size={20} />
                <span className="text-sm font-semibold text-slate-600">
                  {t('notebook.repeatedMistakes')}
                </span>
              </div>
              <div className="text-3xl font-black text-chemistry-green">{repeatedMistakes}</div>
            </div>
          }
        />
      </div>

      {/* ── Retention Dashboard ── */}
      {mistakes.length > 0 && (
        <RetentionDashboard mistakes={mistakes} improvements={improvements} />
      )}

      {/* ── Learning Analytics Dashboard ── */}
      {mistakes.length > 0 && (
        <div>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full flex items-center justify-between p-5 bg-white rounded-t-2xl shadow-xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Brain className="text-indigo-600" size={20} />
              <span className="font-bold text-slate-800 text-lg">{t('notebook.learningAnalytics')}</span>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transition-transform ${showAnalytics ? 'rotate-180' : ''}`}
            />
          </button>

          {showAnalytics && (
            <div className="bg-white rounded-b-2xl shadow-xl border border-t-0 border-slate-200 p-6 space-y-6 bg-gradient-to-b from-white to-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopicHeatmap mistakes={mistakes} />
                <CalendarHeatmap improvements={improvements} />
              </div>
              <ImprovementTrendChart improvements={improvements} />
            </div>
          )}
        </div>
      )}

      {/* ── Practice Configurator ── */}
      {mistakes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter className="text-orange-600" size={20} />
              <span className="font-bold text-slate-800 text-lg">
                {t('notebook.configurePractice')}
              </span>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>

          {showFilters && (
            <div className="border-t border-slate-200 p-6 space-y-6 bg-slate-50">

              {/* Question Count */}
              <div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                  <Hash size={14} />
                  {t('notebook.numberOfQuestions')}
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {['5', '10', '15', '20', '30', '40', 'All'].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      disabled={num !== 'All' && parseInt(num) > filteredMistakes.length}
                      className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                        questionCount === num
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {filteredMistakes.length} {t('notebook.questionsAvailable')}
                </p>
              </div>

              {/* Date Range */}
              <div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                  <Calendar size={14} />
                  {t('notebook.timeRange')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all',   label: t('notebook.allTime'),   desc: t('notebook.default') },
                    { value: 'month', label: t('notebook.lastMonth'), desc: '' },
                    { value: 'week',  label: t('notebook.lastWeek'),  desc: '' },
                  ].map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setDatePeriod(o.value)}
                      className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left ${
                        datePeriod === o.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {o.label}
                      {o.desc && (
                        <span className="block text-xs font-normal opacity-70">{o.desc}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mastery Level */}
              <div>
                <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                  <Star size={14} />
                  {t('notebook.masteryLevel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MASTERY_LEVELS).map(([key, lvl]) => {
                    const colors = {
                      new:         'bg-red-500 border-red-500 text-white',
                      progressing: 'bg-amber-500 border-amber-500 text-white',
                      near:        'bg-green-500 border-green-500 text-white',
                    };
                    const inactive = {
                      new:         'bg-white border-red-200 text-red-700 hover:border-red-400',
                      progressing: 'bg-white border-amber-200 text-amber-700 hover:border-amber-400',
                      near:        'bg-white border-green-200 text-green-700 hover:border-green-400',
                    };
                    return (
                      <button
                        key={key}
                        onClick={() => toggleMasteryLevel(key)}
                        className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                          selectedMasteryLevels.includes(key) ? colors[key] : inactive[key]
                        }`}
                      >
                        {t(`notebook.mastery${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                        <span className="ml-1 opacity-70">
                          ({mistakes.filter((m) => {
                            const ic = m.improvementCount ?? 0;
                            return ic >= lvl.min && ic <= lvl.max;
                          }).length})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topics */}
              {allTopics.length > 1 && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                    <Tag size={14} />
                    {t('notebook.topics')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                          selectedTopics.includes(topic)
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                        }`}
                      >
                        {topic}
                        <span className="ml-1 opacity-70">
                          ({mistakes.filter((m) => m.Topic === topic).length})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtopics */}
              {availableSubtopics.length > 1 && (
                <div className={`rounded-xl p-4 border-2 transition-all ${
                  selectedTopics.length > 0
                    ? 'border-orange-200 bg-orange-50/50'
                    : 'border-slate-200 bg-white'
                }`}>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                    <Layers size={14} />
                    {t('notebook.subtopics')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSubtopics.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => toggleSubtopic(sub)}
                        className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                          selectedSubtopics.includes(sub)
                            ? 'bg-orange-400 border-orange-400 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timer Settings */}
              <div className="space-y-3 pt-4 border-t">
                <div className="bg-white rounded-xl p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-lab-blue" />
                      <div>
                        <h3 className="font-bold text-slate-800">{t('quiz.enableTimer')}</h3>
                        <p className="text-xs text-slate-500">{t('quiz.trackTimeSpent')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTimerEnabled(!timerEnabled)}
                      className={`relative w-14 h-8 rounded-full transition-all ${
                        timerEnabled ? 'bg-chemistry-green' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                          timerEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {timerEnabled && (
                  <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap size={20} className="text-amber-600" />
                        <div>
                          <h3 className="font-bold text-amber-900">{t('quiz.timedMode')}</h3>
                          <p className="text-xs text-amber-700">{t('quiz.countdownTimer')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsTimedMode(!isTimedMode)}
                        className={`relative w-14 h-8 rounded-full transition-all ${
                          isTimedMode ? 'bg-amber-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                            isTimedMode ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handlePracticeMistakes}
                  disabled={filteredMistakes.length === 0}
                  className="py-4 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play fill="currentColor" size={18} />
                  {tf('notebook.practiceMistakesCount', {
                    count: practiceCount,
                    plural: practiceCount !== 1 ? 's' : '',
                  })}
                </button>

                <button
                  onClick={handleAIDailyMission}
                  disabled={mistakes.length < 20}
                  className="py-4 bg-purple-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-purple-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                  title={mistakes.length < 20 ? t('notebook.needMoreQuestions') : t('notebook.aiDailyMission')}
                >
                  <Wand2 fill="currentColor" size={18} />
                  {t('notebook.aiDailyMission')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mistakes List ── */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {t('notebook.allMistakes')} ({filteredMistakes.length})
          </h2>
          {filteredMistakes.length !== mistakes.length && (
            <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
              {t('notebook.filteredFrom')} {mistakes.length}
            </span>
          )}
        </div>

        <div className="p-6">
          {mistakes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2 font-semibold">
                {t('notebook.noMistakesYet')}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {t('notebook.keepPracticing')}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all"
              >
                {t('notebook.startPracticing')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((mistake, index) => {
                const style = masteryStyle(mistake.improvementCount ?? 0);
                const priority = calcPriority(mistake);

                return (
                  <div
                    key={mistake.ID}
                    className={`p-6 rounded-xl border-2 transition-all ${style.border} ${style.bg}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center font-black text-red-600">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase">
                            {mistake.Topic}
                          </div>
                          <div className="text-xs text-slate-400">{mistake.Subtopic}</div>
                          <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {t(style.labelKey)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-xs text-slate-500">{t('notebook.lastAttempt')}</div>
                        <div className="text-sm font-semibold text-slate-700">
                          {formatDate(mistake.lastAttempted)}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            priority > 15
                              ? 'bg-red-100 text-red-700'
                              : priority > 7
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Zap size={9} /> {priority.toFixed(1)}
                        </div>
                        {mistake.attemptCount > 1 && (
                          <div className="text-xs text-amber-600 font-bold block">
                            ⚠️ {tf('notebook.missed', { count: mistake.attemptCount })}
                          </div>
                        )}
                        {mistake.improvementCount > 0 && (
                          <div className="text-xs text-green-600 font-bold block">
                            ✓ {tf('notebook.improved', { count: mistake.improvementCount })} / {MASTERY_THRESHOLD}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 p-4 bg-white/70 rounded-lg border border-slate-100">
                      <div
                        className="text-base text-slate-800 font-medium prose max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: mistake.Question }}
                      />
                    </div>

                    {mistake.Pictureurl && (
                      <div className="mb-4 flex justify-center bg-white p-4 rounded-xl border border-slate-100">
                        <img
                          src={mistake.Pictureurl}
                          alt="Diagram"
                          className="max-w-full h-auto max-h-[200px] object-contain rounded-md"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="text-xs font-bold text-red-700 mb-1">
                          {t('notebook.yourAnswer')}
                        </div>
                        <div className="text-sm font-semibold text-red-900">
                          {mistake.userAnswer}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-xs font-bold text-green-700 mb-1">
                          {t('notebook.correctAnswer')}
                        </div>
                        <div className="text-sm font-semibold text-green-900">
                          {mistake.CorrectOption}
                        </div>
                      </div>
                    </div>

                    {mistake.Explanation && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                        <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                          <BookOpen size={14} /> {t('notebook.explanation')}
                        </div>
                        <div
                          className="text-sm text-blue-900 leading-relaxed prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: mistake.Explanation }}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t('notebook.errorTypeLabel')}
                      </span>
                      <ErrorTagSelector
                        questionId={mistake.ID}
                        currentTag={errorTags[mistake.ID]}
                        onTag={handleTag}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm">
        <p className="text-blue-900 font-semibold mb-2">
          💡 {t('notebook.howItWorks')}
        </p>
        <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
          <li>{t('notebook.wrongAnswersAutoSaved')}</li>
          <li>{t('notebook.useFilters')}</li>
          <li>{t('notebook.practiceUntilMaster')}</li>
          <li className="text-green-700 font-semibold">
            {t('notebook.clearAfterThreeCorrect')}
          </li>
          <li className="text-purple-700 font-semibold">
            {t('notebook.spacedRepetitionNote')}
          </li>
          <li className="text-indigo-700 font-semibold">
            {t('notebook.metacognitiveNote')}
          </li>
          <li className="text-blue-800">
            ✨ AI Daily Mission: {t('notebook.aiDailyMissionNote')}
          </li>
        </ul>
      </div>
    </div>
  );
}
