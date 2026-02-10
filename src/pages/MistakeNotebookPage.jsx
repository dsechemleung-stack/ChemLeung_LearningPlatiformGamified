import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { quizStorage } from '../utils/quizStorage';
import {
  BookOpen, ArrowLeft, Play, AlertCircle, Target,
  CheckCircle, Filter, ChevronDown, Calendar, Hash, Tag,
  Clock, Zap, TrendingUp, Brain, BarChart2, Layers, X,
  AlertTriangle, Flame, Star,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MASTERY_THRESHOLD = 3; // correct answers to graduate a mistake

const ERROR_CATEGORIES = [
  'Misread Question',
  'Conceptual Gap',
  'Calculation Error',
  'Careless Mistake',
  'Vocabulary Gap',
  'Diagram Misread',
];

const MASTERY_LEVELS = {
  new:        { label: 'New',         min: 0, max: 0 },
  progressing:{ label: 'Progressing', min: 1, max: 1 },
  near:       { label: 'Near-Mastered', min: 2, max: 2 },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Spaced-repetition priority score.
 * Higher score = review sooner.
 * Priority = (daysSinceLastAttempt × 1.2) − (improvementCount × 2)
 */
function calcPriority(mistake) {
  const days =
    (Date.now() - new Date(mistake.lastAttempted).getTime()) /
    (1000 * 60 * 60 * 24);
  return days * 1.2 - (mistake.improvementCount ?? 0) * 2;
}

/** Card border/background tint based on mastery progress */
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

// ─────────────────────────────────────────────────────────────
// Smart Tooltip – viewport-aware, portal-free approach
// ─────────────────────────────────────────────────────────────

function SmartTooltip({ children, content }) {
  const [pos, setPos] = useState({ top: true, left: 'center' });
  const triggerRef = useRef(null);

  const recalc = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    setPos({
      top: spaceAbove >= 180 || spaceAbove > spaceBelow,
      left:
        spaceLeft < 120 ? 'start'
        : spaceRight < 120 ? 'end'
        : 'center',
    });
  }, []);

  const alignClass =
    pos.left === 'start' ? 'left-0 -translate-x-0'
    : pos.left === 'end'  ? 'right-0 translate-x-0'
    :                       'left-1/2 -translate-x-1/2';

  const vertClass = pos.top
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      className="relative group"
      ref={triggerRef}
      onMouseEnter={recalc}
      onFocusCapture={recalc}
    >
      {children}
      <div
        className={`
          absolute ${vertClass} ${alignClass}
          hidden group-hover:block z-50 w-64 pointer-events-none
        `}
      >
        <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl ring-1 ring-white/10">
          {content}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Retention Dashboard sub-component
// ─────────────────────────────────────────────────────────────

function RetentionDashboard({ mistakes, improvements }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    // Decay rate: mistakes added this week vs mastered this week
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const addedThisWeek = mistakes.filter(
      (m) => new Date(m.lastAttempted).getTime() >= weekAgo
    ).length;

    const masteredThisWeek = Object.values(improvements).filter(
      (d) =>
        d.correctCount >= MASTERY_THRESHOLD &&
        d.lastCorrect &&
        new Date(d.lastCorrect).getTime() >= weekAgo
    ).length;

    // Weakest subtopics
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

    // High-priority items (priority > 10)
    const urgent = mistakes
      .map((m) => ({ ...m, priority: calcPriority(m) }))
      .filter((m) => m.priority > 10)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    return { addedThisWeek, masteredThisWeek, weakest, urgent };
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
          {/* Decay Rate */}
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

          {/* Weakest Subtopics */}
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
              {stats.weakest.length === 0 && (
                <p className="text-xs text-slate-400 italic">No data yet.</p>
              )}
            </div>
          </div>

          {/* Urgent Reviews */}
          {stats.urgent.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                {t('notebook.urgentReviews')}
              </h3>
              <div className="space-y-2">
                {stats.urgent.map((m) => (
                  <div
                    key={m.ID}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate"
                        dangerouslySetInnerHTML={{ __html: m.Question }} />
                      <div className="text-[10px] text-slate-400">{m.Topic} › {m.Subtopic}</div>
                    </div>
                    <div className="ml-3 shrink-0 text-xs font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      {m.priority.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Metacognitive Tag selector sub-component
// ─────────────────────────────────────────────────────────────

function ErrorCategoryTag({ questionId, tagsMap, onTag }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = tagsMap[questionId];

  const categories = [
    t('notebook.errorMisread'),
    t('notebook.errorConceptual'),
    t('notebook.errorCalculation'),
    t('notebook.errorCareless'),
    t('notebook.errorVocabulary'),
    t('notebook.errorDiagram'),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border-2 transition-all ${
          current
            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
            : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-indigo-300'
        }`}
      >
        <Brain size={11} />
        {current ?? t('notebook.tagErrorType')}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 w-52">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">
            {t('notebook.errorCategory')}
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { onTag(questionId, cat); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-indigo-50 font-semibold transition-all ${
                current === cat ? 'text-indigo-700 bg-indigo-50' : 'text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
          {current && (
            <button
              onClick={() => { onTag(questionId, null); setOpen(false); }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 font-semibold flex items-center gap-1 mt-1 border-t"
            >
              <X size={10} /> {t('notebook.clearTag')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function MistakeNotebookPage() {
  const { currentUser } = useAuth();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();

  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [improvements, setImprovements] = useState({});

  // Error-category tags (metacognitive)
  const [errorTags, setErrorTags] = useState(
    () => JSON.parse(localStorage.getItem('mistake_error_tags') || '{}')
  );

  // Filter state
  const [questionCount, setQuestionCount] = useState('5');
  const [datePeriod, setDatePeriod] = useState('all');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [selectedMasteryLevels, setSelectedMasteryLevels] = useState([]);

  // Timer settings
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isTimedMode, setIsTimedMode] = useState(false);

  // ── Load data ──────────────────────────────────────────────

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
            // Graduated = mastered; skip
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

      // Sort by spaced-repetition priority score (highest first)
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

  // ── Metacognitive tag handler ──────────────────────────────

  const handleTag = useCallback((questionId, category) => {
    setErrorTags((prev) => {
      const next = { ...prev };
      if (category === null) delete next[questionId];
      else next[questionId] = category;
      localStorage.setItem('mistake_error_tags', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Derived filter data ────────────────────────────────────

  const allTopics = useMemo(
    () => [...new Set(mistakes.map((m) => m.Topic).filter(Boolean))].sort(),
    [mistakes]
  );

  // Subtopics only for currently-selected topics (hierarchical)
  const availableSubtopics = useMemo(() => {
    const base = selectedTopics.length > 0
      ? mistakes.filter((m) => selectedTopics.includes(m.Topic))
      : mistakes;
    return [...new Set(base.map((m) => m.Subtopic).filter(Boolean))].sort();
  }, [mistakes, selectedTopics]);

  // Reset subtopics when topics change
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

  // ── Main filtered + sorted list ───────────────────────────

  const filteredMistakes = useMemo(() => {
    let result = [...mistakes];

    // Date filter
    if (datePeriod === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((m) => new Date(m.lastAttempted) >= weekAgo);
    } else if (datePeriod === 'month') {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((m) => new Date(m.lastAttempted) >= monthAgo);
    }

    // Topic filter
    if (selectedTopics.length > 0)
      result = result.filter((m) => selectedTopics.includes(m.Topic));

    // Subtopic filter (hierarchical)
    if (selectedSubtopics.length > 0)
      result = result.filter((m) => selectedSubtopics.includes(m.Subtopic));

    // Mastery level filter
    if (selectedMasteryLevels.length > 0) {
      result = result.filter((m) => {
        const ic = m.improvementCount ?? 0;
        return selectedMasteryLevels.some((lvl) => {
          const { min, max } = MASTERY_LEVELS[lvl];
          return ic >= min && ic <= max;
        });
      });
    }

    // Already sorted by priority from loadMistakes, preserve that order
    return result;
  }, [mistakes, datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels]);

  const practiceCount =
    questionCount === 'All'
      ? filteredMistakes.length
      : Math.min(parseInt(questionCount), filteredMistakes.length);

  // ── Toggle helpers ─────────────────────────────────────────

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

  // ── Practice handler ───────────────────────────────────────

  const handlePracticeMistakes = () => {
    if (filteredMistakes.length === 0) return;
    // Prioritised shuffle: pick highest-priority items first
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

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  // ── Derived summary stats ─────────────────────────────────

  const repeatedMistakes = useMemo(
    () => mistakes.filter((m) => m.attemptCount > 1).length,
    [mistakes]
  );
  const topicsToFocus = useMemo(
    () => new Set(mistakes.map((m) => m.Topic)).size,
    [mistakes]
  );

  // ── Loading state ──────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">

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

      {/* ── Stats with Smart Tooltips ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Total Mistakes */}
        <SmartTooltip
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
              <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-600 pt-2">
                {t('notebook.hoverForDetails')}
              </div>
            </>
          }
        >
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('notebook.totalMistakes')}
              </span>
            </div>
            <div className="text-3xl font-black text-red-600">{mistakes.length}</div>
          </div>
        </SmartTooltip>

        {/* Topics to Focus */}
        <SmartTooltip
          content={
            <>
              <div className="font-bold mb-2">{t('notebook.weakTopics')}</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(topicBreakdown)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([topic, data]) => (
                    <div key={topic} className="text-amber-300 flex justify-between gap-2">
                      <span className="truncate">• {topic}</span>
                      <span className="shrink-0">{data.count}</span>
                    </div>
                  ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-600 pt-2">
                {t('notebook.focusTheseTopics')}
              </div>
            </>
          }
        >
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-amber-600" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('notebook.topicsToFocus')}
              </span>
            </div>
            <div className="text-3xl font-black text-amber-600">{topicsToFocus}</div>
          </div>
        </SmartTooltip>

        {/* Repeated Mistakes */}
        <SmartTooltip
          content={
            <>
              <div className="font-bold mb-2">{t('notebook.repeatsByTopic')}</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(topicBreakdown)
                  .filter(([, data]) => data.repeated > 0)
                  .sort((a, b) => b[1].repeated - a[1].repeated)
                  .map(([topic, data]) => (
                    <div key={topic} className="flex justify-between gap-2">
                      <span className="truncate">{topic}</span>
                      <span className="font-bold text-red-400 shrink-0">{data.repeated}×</span>
                    </div>
                  ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-600 pt-2">
                {t('notebook.needMorePractice')}
              </div>
            </>
          }
        >
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4 cursor-default">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-chemistry-green" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('notebook.repeatedMistakes')}
              </span>
            </div>
            <div className="text-3xl font-black text-chemistry-green">{repeatedMistakes}</div>
          </div>
        </SmartTooltip>
      </div>

      {/* ── Retention Dashboard ── */}
      {mistakes.length > 0 && (
        <RetentionDashboard mistakes={mistakes} improvements={improvements} />
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

              {/* 1. Question Count */}
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

              {/* 2. Date Range */}
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

              {/* 3. Mastery Level Filter */}
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
                {selectedMasteryLevels.length > 0 && (
                  <button
                    onClick={() => setSelectedMasteryLevels([])}
                    className="mt-2 text-xs text-orange-600 hover:underline font-semibold"
                  >
                    {t('notebook.clearMasteryFilter')}
                  </button>
                )}
              </div>

              {/* 4. Topics (Tier 1) */}
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
                  {selectedTopics.length > 0 && (
                    <button
                      onClick={() => setSelectedTopics([])}
                      className="mt-2 text-xs text-orange-600 hover:underline font-semibold"
                    >
                      {t('notebook.clearTopicFilter')}
                    </button>
                  )}
                </div>
              )}

              {/* 5. Subtopics (Tier 2 – only shown when topics selected or always if available) */}
              {availableSubtopics.length > 1 && (
                <div className={`rounded-xl p-4 border-2 transition-all ${
                  selectedTopics.length > 0
                    ? 'border-orange-200 bg-orange-50/50'
                    : 'border-slate-200 bg-white'
                }`}>
                  <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                    <Layers size={14} />
                    {t('notebook.subtopics')}
                    {selectedTopics.length > 0 && (
                      <span className="text-xs font-normal text-orange-600 normal-case tracking-normal">
                        {t('notebook.subtopicsFilteredNote')}
                      </span>
                    )}
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
                  {selectedSubtopics.length > 0 && (
                    <button
                      onClick={() => setSelectedSubtopics([])}
                      className="mt-2 text-xs text-orange-600 hover:underline font-semibold"
                    >
                      {t('notebook.clearSubtopicFilter')}
                    </button>
                  )}
                </div>
              )}

              {/* 6. Timer Settings */}
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
                  <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200 animate-in fade-in">
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

              {/* 7. Start Button */}
              <button
                onClick={handlePracticeMistakes}
                disabled={filteredMistakes.length === 0}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Play fill="currentColor" size={18} />
                {tf('notebook.practiceMistakesCount', {
                  count: practiceCount,
                  plural: practiceCount !== 1 ? 's' : '',
                })}
              </button>
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
                    {/* Card Header */}
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
                          {/* Mastery badge */}
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
                        {/* Priority score badge */}
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            priority > 15
                              ? 'bg-red-100 text-red-700'
                              : priority > 7
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                          title={t('notebook.priorityScore')}
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

                    {/* Question Text */}
                    <div className="mb-4 p-4 bg-white/70 rounded-lg border border-slate-100">
                      <div
                        className="text-base text-slate-800 font-medium prose max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: mistake.Question }}
                      />
                    </div>

                    {/* Image */}
                    {mistake.Pictureurl && (
                      <div className="mb-4 flex justify-center bg-white p-4 rounded-xl border border-slate-100">
                        <img
                          src={mistake.Pictureurl}
                          alt="Diagram"
                          className="max-w-full h-auto max-h-[200px] object-contain rounded-md"
                        />
                      </div>
                    )}

                    {/* Answer columns */}
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

                    {/* Explanation */}
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

                    {/* ── Metacognitive Tag ── */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t('notebook.errorTypeLabel')}
                      </span>
                      <ErrorCategoryTag
                        questionId={mistake.ID}
                        tagsMap={errorTags}
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
        <ul className="list-disc list-inside space-y-1 text-blue-800">
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
        </ul>
      </div>
    </div>
  );
}

