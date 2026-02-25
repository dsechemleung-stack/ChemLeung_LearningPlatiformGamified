import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Eye, CheckSquare, Filter, Tag, Layers, ArrowRight, Timer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import ChemistryLoading from '../ChemistryLoading';
import { useLanguage } from '../../contexts/LanguageContext';
import { getNow } from '../../utils/timeTravel';

/**
 * SpacedRepetitionModal - COMPLETE ENHANCED VERSION with SRS Service
 * 
 * FEATURES:
 * ✅ Default: "5-Mistake Review" - AI selects 5 random questions
 * ✅ Question number selector (1 to all available)
 * ✅ Auto-select all topics → auto-select all subtopics → auto-select all questions
 * ✅ Timer and timed mode options for all review modes
 * ✅ Improved side-by-side topic/subtopic layout
 * ✅ Single question review option
 * ✅ Custom batch review with full filtering
 * ✅ SRS service integration for fetching due cards
 */
export default function SpacedRepetitionModal({ 
  userId,
  questions = [],
  initialCards = null,
  embedded = false,
  settingsOnly = false,
  maxCardsToLoad = 50,
  onClose, 
  onStartReview 
}) {
  const { t, tf } = useLanguage();
  const safeOnClose = typeof onClose === 'function' ? onClose : () => {};
  // Review modes: '5-mistake' (default), 'single', 'batch'
  const [reviewMode, setReviewMode] = useState('5-mistake');
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedTopicFilters, setSelectedTopicFilters] = useState([]);
  const [selectedSubtopicFilters, setSelectedSubtopicFilters] = useState([]);
  const [allTopicsSelected, setAllTopicsSelected] = useState(true);
  const [allSubtopicsSelected, setAllSubtopicsSelected] = useState(true);
  const [enableTimer, setEnableTimer] = useState(true);
  const [timedMode, setTimedMode] = useState(true);
  const [dueCards, setDueCards] = useState([]);
  const [totalDueCount, setTotalDueCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [overdueCount, setOverdueCount] = useState(0);
  const [batchFiltersVisuallyCleared, setBatchFiltersVisuallyCleared] = useState(false);

  const didInitTopicFiltersRef = useRef(false);
  const didInitSubtopicFiltersRef = useRef(false);

  const MAX_DUE_CARDS_TO_LOAD = Math.max(1, Number(maxCardsToLoad || 0) || 50);

  // Load due cards on mount
  useEffect(() => {
    if (Array.isArray(initialCards)) {
      const all = initialCards;
      setTotalDueCount(all.filter((c) => !c?.completed).length);
      setDueCards(all.slice(0, MAX_DUE_CARDS_TO_LOAD));
      setOverdueCount(0);
      setSelectedCardIds(new Set(all.slice(0, MAX_DUE_CARDS_TO_LOAD).map(card => card.id)));
      setError(null);
      setIsLoading(false);
      return;
    }

    setTotalDueCount(null);

    const loadDueCards = async () => {
      try {
        setIsLoading(true);
        const [cards, overdue] = await Promise.all([
          // Include due + overdue cards (<= today) so users always see what needs review.
          srsService.getDueCards(userId, getNow(), { limit: MAX_DUE_CARDS_TO_LOAD }),
          srsService.getOverdueCount(userId, getNow())
        ]);
        setDueCards(cards);
        setTotalDueCount(null);
        setOverdueCount(overdue);
        
        // Auto-select all cards initially for batch mode
        setSelectedCardIds(new Set(cards.map(card => card.id)));
      } catch (err) {
        console.error('Error loading due cards:', err);
        setError(t('srs.failedLoadDueCardsTryAgain'));
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadDueCards();
    }
  }, [userId, initialCards]);

  // Get all non-completed reviews
  const availableReviews = useMemo(() => {
    return dueCards.filter(card => !card.completed);
  }, [dueCards]);

  // Get unique topics
  const availableTopics = useMemo(() => {
    const topics = new Set();
    availableReviews.forEach(card => {
      if (card.topic) topics.add(card.topic);
    });
    return Array.from(topics).sort();
  }, [availableReviews]);

  const topicCounts = useMemo(() => {
    const counts = {};
    availableReviews.forEach((card) => {
      const k = card?.topic;
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [availableReviews]);

  // Get subtopics based on selected topics
  const availableSubtopics = useMemo(() => {
    const subtopics = new Set();
    availableReviews.forEach(card => {
      if (card.subtopic) {
        if (allTopicsSelected || selectedTopicFilters.includes(card.topic)) {
          subtopics.add(card.subtopic);
        }
      }
    });
    return Array.from(subtopics).sort();
  }, [availableReviews, selectedTopicFilters, allTopicsSelected]);

  const subtopicCounts = useMemo(() => {
    const counts = {};
    availableReviews.forEach((card) => {
      const k = card?.subtopic;
      if (!k) return;
      if (!(allTopicsSelected || selectedTopicFilters.includes(card.topic))) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [availableReviews, allTopicsSelected, selectedTopicFilters]);

  // Filtered reviews based on topic/subtopic selection
  const filteredReviews = useMemo(() => {
    return availableReviews.filter(card => {
      if (!allTopicsSelected && !selectedTopicFilters.includes(card.topic)) return false;
      if (!allSubtopicsSelected && !selectedSubtopicFilters.includes(card.subtopic)) return false;
      return true;
    });
  }, [availableReviews, selectedTopicFilters, selectedSubtopicFilters, allTopicsSelected, allSubtopicsSelected]);

  const batchHasNoSelectedCards = reviewMode === 'batch' && selectedCardIds.size === 0;
  const shouldVisuallyClearBatchFilters = reviewMode === 'batch' && batchFiltersVisuallyCleared && batchHasNoSelectedCards;

  // Group due cards by date for display
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredReviews.forEach(card => {
      const dueDate = new Date(card.nextReviewDate).toLocaleDateString();
      if (!groups[dueDate]) {
        groups[dueDate] = [];
      }
      groups[dueDate].push(card);
    });
    return groups;
  }, [filteredReviews]);

  // Default filters: ALL topics/subtopics on first load.
  useEffect(() => {
    if (!didInitTopicFiltersRef.current && availableTopics.length > 0) {
      didInitTopicFiltersRef.current = true;
      setAllTopicsSelected(true);
      setSelectedTopicFilters([]);
    }
  }, [availableTopics]);

  useEffect(() => {
    if (!didInitSubtopicFiltersRef.current && availableSubtopics.length > 0) {
      didInitSubtopicFiltersRef.current = true;
      setAllSubtopicsSelected(true);
      setSelectedSubtopicFilters([]);
    }
  }, [availableSubtopics]);

  // Adjust question count when filtered reviews change
  useEffect(() => {
    const len = filteredReviews.length;
    if (len <= 0) return;
    setQuestionCount((prev) => {
      const nextDefault = 10;
      if (prev == null || Number.isNaN(prev) || prev < 1) return Math.min(nextDefault, len);
      if (prev > len) return len;
      return prev;
    });
  }, [filteredReviews.length]);

  const toggleTopicFilter = (topic) => {
    if (shouldVisuallyClearBatchFilters) {
      setBatchFiltersVisuallyCleared(false);
      setAllTopicsSelected(false);
      setSelectedTopicFilters([topic]);
      return;
    }
    setSelectedTopicFilters((prev) => {
      const base = allTopicsSelected ? availableTopics : prev;
      const next = base.includes(topic) ? base.filter((t) => t !== topic) : [...base, topic];
      setAllTopicsSelected(false);
      return next;
    });
  };

  const toggleSubtopicFilter = (subtopic) => {
    if (shouldVisuallyClearBatchFilters) {
      setBatchFiltersVisuallyCleared(false);
      setAllSubtopicsSelected(false);
      setSelectedSubtopicFilters([subtopic]);
      return;
    }
    setSelectedSubtopicFilters((prev) => {
      const base = allSubtopicsSelected ? availableSubtopics : prev;
      const next = base.includes(subtopic) ? base.filter((s) => s !== subtopic) : [...base, subtopic];
      setAllSubtopicsSelected(false);
      return next;
    });
  };

  const toggleCardSelection = (cardId) => {
    if (batchFiltersVisuallyCleared) setBatchFiltersVisuallyCleared(false);
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const toggleAllCards = () => {
    const allFilteredSelected =
      filteredReviews.length > 0 && filteredReviews.every((card) => selectedCardIds.has(card.id));

    if (allFilteredSelected) {
      setSelectedCardIds(new Set());
      setBatchFiltersVisuallyCleared(true);
      return;
    }

    setSelectedCardIds(new Set(filteredReviews.map(card => card.id)));
    setBatchFiltersVisuallyCleared(false);
  };

  const selectTopicsUpTo = (targetTopic) => {
    const targetIndex = availableTopics.indexOf(targetTopic);
    if (targetIndex === -1) return;
    setSelectedTopicFilters(availableTopics.slice(0, targetIndex + 1));
  };

  const selectSubtopicsUpTo = (targetSubtopic) => {
    const targetIndex = availableSubtopics.indexOf(targetSubtopic);
    if (targetIndex === -1) return;
    setSelectedSubtopicFilters(availableSubtopics.slice(0, targetIndex + 1));
  };

  // Get random N questions from filtered reviews
  const getRandomQuestions = (count) => {
    const shuffled = [...filteredReviews].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  const handleStartReview = async () => {
    let selectedCards = [];
    
    if (reviewMode === '5-mistake') {
      selectedCards = getRandomQuestions(questionCount);
    } else if (reviewMode === 'single') {
      // For single question mode, use the first due card
      selectedCards = filteredReviews.slice(0, 1);
    } else { // batch
      if (settingsOnly) {
        selectedCards = getRandomQuestions(Math.min(questionCount, filteredReviews.length));
      } else {
        selectedCards = filteredReviews.filter(card => selectedCardIds.has(card.id));
      }
    }
    
    if (selectedCards.length === 0) {
      alert(t('srs.pleaseSelectAtLeastOne'));
      return;
    }

    // Persist SRS cards metadata for ResultsPage to submit back to SRS
    localStorage.setItem('quiz_mode', 'spaced-repetition');
    localStorage.setItem('quiz_srs_cards', JSON.stringify(selectedCards.map(card => ({
      id: card.id,
      questionId: card.questionId,
      interval: card.interval,
      easeFactor: card.easeFactor
    }))));

    const eventIds = selectedCards
      .map((c) => c.eventId)
      .filter(Boolean);
    if (eventIds.length > 0) {
      localStorage.setItem('quiz_event_ids', JSON.stringify(eventIds));
    } else {
      localStorage.removeItem('quiz_event_ids');
    }

    const questionIds = selectedCards.map(card => card.questionId);
    const selectedQuestions = questions.filter(q => questionIds.includes(q.ID));

    if (selectedQuestions.length === 0) {
      alert(t('srs.questionsStillLoading'));
      return;
    }

    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selectedQuestions);
    localStorage.setItem('quiz_timer_enabled', String(enableTimer));
    localStorage.setItem('quiz_is_timed_mode', String(timedMode));
    localStorage.setItem('quiz_review_mode', reviewMode);

    if (typeof onStartReview === 'function') {
      onStartReview(reviewMode, questionIds);
      return;
    }

    window.location.href = '/quiz';
  };

  const effectiveQuestionCount = reviewMode === 'single' 
    ? 1 
    : reviewMode === 'batch'
    ? (settingsOnly ? Math.min(questionCount, filteredReviews.length) : selectedCardIds.size)
    : Math.min(questionCount, filteredReviews.length);

  const modalContent = isLoading ? (
    <div className={embedded ? "w-full" : "fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"}>
      <div className={embedded ? "bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-100" : "bg-white rounded-2xl p-8 shadow-2xl"}>
        <ChemistryLoading persistKey="srs_due_cards" className="text-center" textOverride={t('srs.loadingDueCards')} />
      </div>
    </div>
  ) : error ? (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
      <div className="text-red-600 text-center mb-4">⚠️</div>
      <p className="text-center text-red-600 font-semibold">{error}</p>
      {!embedded && (
        <button
            onClick={safeOnClose}
            className="mt-6 w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold transition-all"
          >
            {t('common.close')}
          </button>
      )}
    </div>
  ) : (
    <div 
      className={embedded ? "w-full" : "fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"}
      onClick={embedded ? undefined : safeOnClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className={embedded
          ? "bg-white rounded-2xl shadow-lg border-2 border-slate-100 w-full overflow-hidden flex flex-col"
          : "bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"}
      >
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{t('srs.title')}</h2>
            <p className="text-sm text-slate-600 mt-1">
              {totalDueCount != null
                ? tf('srs.questionsNeedReviewShownOutOfTotal', { shown: availableReviews.length, total: totalDueCount })
                : tf('srs.questionsNeedReviewCount', { count: availableReviews.length })}
            </p>
            {overdueCount > 0 && (
              <p className="text-xs text-red-600 font-bold mt-1">
                {tf('srs.overdueReviewsNotShown', { count: overdueCount, plural: overdueCount > 1 ? 's' : '' })}
              </p>
            )}
          </div>
          {!embedded && (
            <button onClick={safeOnClose} className="p-2 hover:bg-white/50 rounded-lg transition-all">
              <X size={24} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Review Mode Selector */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
              {t('srs.reviewMode')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Quick Review (5-Mistake Default) */}
              <button
                onClick={() => setReviewMode('5-mistake')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === '5-mistake' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={reviewMode === '5-mistake' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === '5-mistake' ? 'text-purple-900' : 'text-slate-600'}`}>
                    {t('srs.quickReview')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  {t('srs.aiSelectsRandomQuestions')}
                </div>
                {reviewMode === '5-mistake' && (
                  <div className="mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-bold inline-block">
                    {t('srs.defaultBadge')}
                  </div>
                )}
              </button>

              {/* Single Question */}
              <button
                onClick={() => setReviewMode('single')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'single' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye className={reviewMode === 'single' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === 'single' ? 'text-purple-900' : 'text-slate-600'}`}>
                    {t('srs.singleQuestion')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">{t('srs.reviewOneMistake')}</div>
              </button>

              {/* Custom Batch */}
              <button
                onClick={() => setReviewMode('batch')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reviewMode === 'batch' 
                    ? 'border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className={reviewMode === 'batch' ? 'text-purple-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${reviewMode === 'batch' ? 'text-purple-900' : 'text-slate-600'}`}>
                    {t('srs.customBatch')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">{t('srs.selectSpecificCards')}</div>
              </button>
            </div>
          </div>

          {/* Question Count Selector (for 5-mistake mode only) */}
          {reviewMode === '5-mistake' && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
              <label className="block text-sm font-black text-purple-900 mb-3 flex items-center gap-2">
                <CheckSquare size={16} />
                {t('srs.numberOfQuestions')}
              </label>
              <div className="flex items-center gap-4 mb-3">
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, filteredReviews.length)}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, filteredReviews.length)}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, filteredReviews.length)))}
                    className="w-20 px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-center text-purple-900 bg-white"
                  />
                  <span className="text-sm text-purple-700 font-semibold whitespace-nowrap">
                    / {filteredReviews.length}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setQuestionCount(5)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  {tf('srs.nQuestions', { count: 5 })}
                </button>
                <button 
                  onClick={() => setQuestionCount(10)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  {tf('srs.nQuestions', { count: 10 })}
                </button>
                <button 
                  onClick={() => setQuestionCount(filteredReviews.length)} 
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-all"
                >
                  {tf('srs.allCount', { count: filteredReviews.length })}
                </button>
              </div>
            </div>
          )}

          {reviewMode === 'batch' && settingsOnly && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200">
              <label className="block text-sm font-black text-indigo-900 mb-3 flex items-center gap-2">
                <CheckSquare size={16} />
                {t('srs.numberOfQuestions')}
              </label>
              <div className="flex items-center gap-4 mb-3">
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, filteredReviews.length)}
                  value={Math.min(questionCount, Math.max(1, filteredReviews.length))}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="bg-white px-4 py-2 rounded-lg border border-indigo-200 font-black text-indigo-900 min-w-[80px] text-center">
                  {Math.min(questionCount, filteredReviews.length)}
                </div>
              </div>
              <p className="text-xs text-indigo-700 font-semibold">
                {tf('srs.questionsNeedReviewShownOutOfTotal', { shown: Math.min(questionCount, filteredReviews.length), total: filteredReviews.length })}
              </p>
            </div>
          )}

          {/* Timer Settings */}
          <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="text-blue-600" size={20} />
              <h3 className="font-black text-blue-900">{t('srs.timerSettings')}</h3>
            </div>
            
            <div className="space-y-3">
              {/* Enable Timer */}
              <button
                onClick={() => setEnableTimer(!enableTimer)}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  enableTimer 
                    ? 'bg-blue-100 border-blue-500' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  enableTimer ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {enableTimer && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`font-bold flex-1 text-left ${enableTimer ? 'text-blue-900' : 'text-slate-600'}`}>
                  {t('srs.showTimer')}
                </span>
                {enableTimer && (
                  <span className="text-xs bg-white px-2 py-1 rounded font-bold text-blue-700">{t('common.on')}</span>
                )}
              </button>

              {/* Timed Mode */}
              <button
                onClick={() => setTimedMode(!timedMode)}
                disabled={!enableTimer}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  timedMode && enableTimer
                    ? 'bg-amber-100 border-amber-500' 
                    : 'bg-white border-slate-200'
                } ${!enableTimer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  timedMode && enableTimer ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                }`}>
                  {timedMode && enableTimer && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`font-bold flex-1 text-left ${timedMode && enableTimer ? 'text-amber-900' : 'text-slate-600'}`}>
                  {t('srs.timedMode75sPerQuestion')}
                </span>
                {timedMode && enableTimer && (
                  <span className="text-xs bg-white px-2 py-1 rounded font-bold text-amber-700">⏱️ {t('common.on')}</span>
                )}
              </button>

              <p className="text-xs text-blue-700 italic pl-8">
                💡 {timedMode && enableTimer 
                  ? t('srs.mustAnswerWithin75SecondsPerQuestion') 
                  : enableTimer 
                  ? t('srs.timerTracksSpeedNoLimit') 
                  : t('srs.noTimerTracking')}
              </p>
            </div>
          </div>
          {/* Batch Review - Card Selection */}
          {reviewMode === 'batch' && !settingsOnly && (
            <div className="bg-white rounded-xl p-6 border-2 border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <Filter size={18} className="text-slate-600" />
                <h3 className="font-black text-slate-800">{t('srs.selectCardsToReview')}</h3>
                <span className="ml-auto text-xs bg-white px-3 py-1 rounded-full font-bold text-slate-600 border border-slate-200">
                  {tf('srs.selectedCountOutOfTotal', { selected: selectedCardIds.size, total: filteredReviews.length })}
                </span>
              </div>
              
              {/* Select All Button */}
              <div className="mb-4 flex justify-between items-center">
                <button
                  onClick={toggleAllCards}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                >
                  <CheckSquare size={16} />
                  {selectedCardIds.size === filteredReviews.length ? t('srs.deselectAll') : t('srs.selectAll')}
                </button>
                
                {/* Topic/Subtopic Filters */}
                <div className="flex gap-3 items-start">
                  <div className="w-[360px] h-[190px] flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                        <Tag size={14} className="text-slate-500" />
                        {tf('calendar.topicsCount', { selected: shouldVisuallyClearBatchFilters ? 0 : (allTopicsSelected ? availableTopics.length : selectedTopicFilters.length), total: availableTopics.length })}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAllTopicsSelected(true);
                            setSelectedTopicFilters([]);
                            setBatchFiltersVisuallyCleared(false);
                          }}
                          disabled={availableTopics.length === 0}
                          className={`text-[11px] font-black ${availableTopics.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-700 hover:text-indigo-900'}`}
                        >
                          {t('common.selectAll')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAllTopicsSelected(false);
                            setSelectedTopicFilters([]);
                            setBatchFiltersVisuallyCleared(false);
                          }}
                          disabled={!allTopicsSelected && selectedTopicFilters.length === 0}
                          className={`text-[11px] font-black ${(!allTopicsSelected && selectedTopicFilters.length === 0) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('common.clear')}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1 min-h-0 overflow-auto pr-1">
                      {availableTopics.map(topic => (
                        <button
                          key={topic}
                          onClick={() => toggleTopicFilter(topic)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                            allTopicsSelected
                              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              : selectedTopicFilters.includes(topic)
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {topic}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                            (!allTopicsSelected && selectedTopicFilters.includes(topic)) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                          >
                            {topicCounts[topic] || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-[360px] h-[190px] flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                        <Layers size={14} className="text-slate-500" />
                        {tf('calendar.subtopicsCount', { selected: shouldVisuallyClearBatchFilters ? 0 : (allSubtopicsSelected ? availableSubtopics.length : selectedSubtopicFilters.length), total: availableSubtopics.length })}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAllSubtopicsSelected(true);
                            setSelectedSubtopicFilters([]);
                            setBatchFiltersVisuallyCleared(false);
                          }}
                          disabled={availableSubtopics.length === 0}
                          className={`text-[11px] font-black ${availableSubtopics.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-purple-700 hover:text-purple-900'}`}
                        >
                          {t('common.selectAll')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAllSubtopicsSelected(false);
                            setSelectedSubtopicFilters([]);
                            setBatchFiltersVisuallyCleared(false);
                          }}
                          disabled={!allSubtopicsSelected && selectedSubtopicFilters.length === 0}
                          className={`text-[11px] font-black ${(!allSubtopicsSelected && selectedSubtopicFilters.length === 0) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('common.clear')}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1 min-h-0 overflow-auto pr-1">
                      {availableSubtopics.map(subtopic => (
                        <button
                          key={subtopic}
                          onClick={() => toggleSubtopicFilter(subtopic)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                            allSubtopicsSelected
                              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              : selectedSubtopicFilters.includes(subtopic)
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {subtopic}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                            (!allSubtopicsSelected && selectedSubtopicFilters.includes(subtopic)) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                          >
                            {subtopicCounts[subtopic] || 0}
                          </span>
                        </button>
                      ))}
                      {availableSubtopics.length === 0 && (
                        <div className="text-xs text-slate-500">{t('calendar.noSubtopicsAvailable')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards Grouped by Date */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedByDate).map(([date, cards]) => (
                  <div key={date} className="border-2 border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-bold text-sm text-slate-700">
                      {t('srs.dueLabel')}: {date}
                    </div>
                    <div className="divide-y divide-slate-200">
                      {cards.map(card => (
                        <div
                          key={card.id}
                          onClick={() => toggleCardSelection(card.id)}
                          className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${
                            selectedCardIds.has(card.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedCardIds.has(card.id)
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300'
                          }`}>
                            {selectedCardIds.has(card.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                                {card.topic || t('srs.noTopic')}
                              </span>
                              {card.subtopic && (
                                <>
                                  <span className="text-slate-400">→</span>
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                                    {card.subtopic}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <div 
                              className="text-sm text-slate-600 line-clamp-2"
                              dangerouslySetInnerHTML={{ 
                                __html: `${t('srs.questionIdLabel')}: ${card.questionId}<span class=\"text-slate-400\"> (${t('srs.questionIdHelp')})</span>` 
                              }}
                            />
                            
                            <div className="flex gap-4 mt-2 text-xs text-slate-500">
                              <span>📅 {t('srs.intervalLabel')}: {card.interval}</span>
                              <span>🔄 {t('srs.attemptLabel')}: {card.attemptNumber || 1}</span>
                              <span>⭐ {t('srs.easeLabel')}: {card.easeFactor?.toFixed(2) || '2.50'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {filteredReviews.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">{t('srs.noDueCardsMatchFilters')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Start Review Button */}
        <div className="border-t p-6 flex-shrink-0 bg-slate-50">
          <button
            onClick={handleStartReview}
            disabled={effectiveQuestionCount === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
          >
            <Play size={22} fill="currentColor" />
            {reviewMode === '5-mistake' 
              ? tf('srs.startQuickReviewCount', { count: effectiveQuestionCount })
              : reviewMode === 'single'
              ? t('srs.startSingleReview')
              : tf('srs.startBatchReviewCount', { count: effectiveQuestionCount })}
          </button>
          
          {/* Settings Summary */}
          <div className="text-center mt-3 text-xs text-slate-600 flex items-center justify-center gap-3 flex-wrap">
            {enableTimer && (
              <span className="flex items-center gap-1">
                <Timer size={12} />
                {timedMode ? t('srs.timedModeSummary75') : t('srs.timerTrackingEnabled')}
              </span>
            )}
            {!enableTimer && <span className="text-slate-400">{t('srs.noTimer')}</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );

  if (embedded) return modalContent;
  return createPortal(modalContent, document.body);
}