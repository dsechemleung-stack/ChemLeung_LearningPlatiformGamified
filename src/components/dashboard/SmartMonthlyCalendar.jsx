import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Flag, Calendar as CalendarIcon, BookOpen, Brain, CheckCircle, Trash2, X, Sparkles, ThumbsUp, ThumbsDown, Play, Info, Target, Clock, Eye } from 'lucide-react';
import { calendarServiceOptimized } from '../../services/calendarServiceOptimized';
import { EVENT_TYPES } from '../../services/calendarServiceOptimized';
import { performanceService } from '../../services/performanceService';
import { quizStorage } from '../../utils/quizStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatHKDateKey, getHKYearMonth, getHKWeekdayIndex, makeHKDate, parseHKDateKey, HK_TIME_ZONE } from '../../utils/hkTime';
import { getNow } from '../../utils/timeTravel';
import { calendarService } from '../../services/calendarService';

const SRS_REVIEW_SESSION_STORAGE_KEY = 'srs_review_cache_v1';

function formatDM(dateStr) {
  const s = String(dateStr || '');
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  const d = String(Number(parts[2]));
  const m = String(Number(parts[1]));
  return `${d}/${m}`;
}

/**
 * SmartMonthlyCalendar - COMPLETE FIX
 * 
 * FIXES:
 * 1. ✅ Green completion badges for ALL quiz types
 * 2. ✅ Completed events turn GREEN with checkmarks
 * 3. ✅ Separate completion section always visible
 * 4. ✅ Better visual hierarchy
 */
export default function SmartMonthlyCalendar({ userId, questions = [], onAddEvent, embedded = false }) {
  const navigate = useNavigate();
  const { t, tf, isEnglish } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => {
    const { year, monthIndex } = getHKYearMonth(getNow());
    return makeHKDate(year, monthIndex, 1);
  });
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [aiRecommendations, setAIRecommendations] = useState([]);
  const [suggestionPreview, setSuggestionPreview] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSrsInfo, setShowSrsInfo] = useState(false);
  const [showAiInfo, setShowAiInfo] = useState(false);
  
  const { year, month: monthIndex } = useMemo(() => {
    const { year: y, monthIndex: m } = getHKYearMonth(currentDate);
    return { year: y, month: m };
  }, [currentDate]);
  
  useEffect(() => {
    loadCalendarData();
    loadAIRecommendations();
  }, [userId, year, monthIndex]);

  useEffect(() => {
    const onRefresh = () => {
      try {
        calendarServiceOptimized.clearCalendarCache?.();
      } catch {
        // ignore
      }
      loadCalendarData();
    };

    window.addEventListener('calendar:refresh', onRefresh);
    return () => window.removeEventListener('calendar:refresh', onRefresh);
  }, [userId, year, monthIndex]);

  async function loadCalendarData() {
    if (!userId) return;
    
    try {
      setLoading(true);

      const data = await calendarServiceOptimized.getCalendarData(userId, year, monthIndex);
      console.log('📅 Calendar data loaded:', data);
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAIRecommendations() {
    if (!userId) return;
    
    try {
      const recommendations = await performanceService.getRecommendations(userId);
      console.log('🤖 AI Recommendations loaded:', recommendations);
      setAIRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    }
  }

  const formatTime = (seconds) => {
    if (!seconds) return tf('calendar.timeSecs', { s: 0 });
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? tf('calendar.timeMinsSecs', { m: mins, s: secs }) : tf('calendar.timeSecs', { s: secs });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', solid: 'bg-green-500' };
    if (percentage >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', solid: 'bg-blue-500' };
    if (percentage >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', solid: 'bg-amber-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', solid: 'bg-red-500' };
  };

  const calendarGrid = useMemo(() => {
    const startingDayOfWeek = getHKWeekdayIndex(makeHKDate(year, monthIndex, 1));
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    
    const grid = [];
    let week = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }
    
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }
    
    return grid;
  }, [year, monthIndex]);

  const monthName = makeHKDate(year, monthIndex, 1).toLocaleDateString(isEnglish ? 'en-US' : 'zh-HK', { timeZone: HK_TIME_ZONE, month: 'long', year: 'numeric' });
  const today = formatHKDateKey(getNow());

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return calendarData[selectedDate] || {
      exams: [],
      quizzes: [],
      suggestions: [],
      repetitions: [],
      aiRecommendations: [],
      completions: [],
    };
  }, [calendarData, selectedDate]);

  useEffect(() => {
    const onRefresh = async () => {
      if (!userId) return;
      try {
        calendarServiceOptimized.clearCalendarCache();
      } catch {
        // ignore
      }
      await loadCalendarData();
    };

    window.addEventListener('calendar:refresh', onRefresh);
    return () => window.removeEventListener('calendar:refresh', onRefresh);
  }, [userId, year, monthIndex]);

  function prevMonth() {
    setCurrentDate(makeHKDate(year, monthIndex - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(makeHKDate(year, monthIndex + 1, 1));
  }

  function getDateString(day) {
    if (!day) return null;
    return formatHKDateKey(makeHKDate(year, monthIndex, day));
  }

  function getDayEvents(day) {
    const dateStr = getDateString(day);
    if (!dateStr) return null;
    return calendarData[dateStr] || null;
  }

  function isToday(day) {
    return getDateString(day) === today;
  }

  function isPast(day) {
    if (!day) return false;
    return getDateString(day) < today;
  }

  function getAvailableQuestions(suggestion) {
    if (!questions || questions.length === 0) {
      return { filtered: [], count: 0 };
    }

    let filtered = [...questions];
    
    if (suggestion.topic) {
      filtered = filtered.filter(q => q.Topic === suggestion.topic);
    }
    
    if (suggestion.subtopic) {
      filtered = filtered.filter(q => q.Subtopic === suggestion.subtopic);
    }
    
    return {
      filtered: filtered.slice(0, suggestion.questionCount),
      count: filtered.length,
      requested: suggestion.questionCount
    };
  }

  function handleSuggestionPreview(suggestion, event) {
    event?.stopPropagation();
    const questionInfo = getAvailableQuestions(suggestion);
    setSuggestionPreview({ ...suggestion, questionInfo });
  }

  async function handleAcceptRecommendation(recommendation, event) {
    event?.stopPropagation();
    
    try {
      console.log('✅ Accepting AI recommendation:', recommendation);
      await calendarServiceOptimized.createAIRecommendationEvent(userId, recommendation);
      await loadCalendarData();
      await loadAIRecommendations();
      alert(t('calendar.aiRecommendationAddedSuccess'));
    } catch (error) {
      console.error('❌ Error accepting recommendation:', error);
      alert(tf('calendar.failedAddRecommendationWithReason', { reason: error.message }));
    }
  }

  async function handleDismissRecommendation(recommendationId, event) {
    event?.stopPropagation();
    
    try {
      await performanceService.dismissRecommendation(userId, recommendationId);
      await loadAIRecommendations();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  }

  async function handleAIRecommendationClick(aiRec) {
    try {
      let filteredQuestions = questions;
      
      if (aiRec.topic) {
        filteredQuestions = filteredQuestions.filter(q => q.Topic === aiRec.topic);
      }
      
      if (aiRec.subtopic) {
        filteredQuestions = filteredQuestions.filter(q => q.Subtopic === aiRec.subtopic);
      }

      const selectedQuestions = filteredQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(aiRec.questionCount, filteredQuestions.length));

      if (selectedQuestions.length === 0) {
        alert(tf('calendar.noQuestionsAvailableForTopicSubtopic', {
          topic: aiRec.topic || t('calendar.thisTopic'),
          subtopic: aiRec.subtopic || ''
        }));
        return;
      }

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selectedQuestions);
      localStorage.setItem('quiz_mode', 'ai-recommendation');
      localStorage.setItem('quiz_event_id', aiRec.id);
      localStorage.setItem('quiz_timer_enabled', 'true');
      navigate('/quiz');
    } catch (error) {
      console.error('Error starting AI recommendation session:', error);
      alert(t('calendar.failedStartStudySessionTryAgain'));
    }
  }

  async function handleStudySuggestionClick(suggestion) {
    try {
      if (!questions || questions.length === 0) {
        alert(t('calendar.questionsStillLoading'));
        return;
      }

      let filteredQuestions = [...questions];
      
      if (suggestion.topic) {
        filteredQuestions = filteredQuestions.filter(q => q.Topic === suggestion.topic);
      }
      
      if (suggestion.subtopic) {
        filteredQuestions = filteredQuestions.filter(q => q.Subtopic === suggestion.subtopic);
      }

      if (filteredQuestions.length === 0) {
        alert(tf('calendar.noQuestionsAvailableForSuggestion', {
          topic: suggestion.topic || t('calendar.allTopics'),
          subtopic: suggestion.subtopic || ''
        }));
        return;
      }

      const selectedQuestions = filteredQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(suggestion.questionCount, filteredQuestions.length));

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selectedQuestions);
      localStorage.setItem('quiz_mode', 'study-plan');
      localStorage.setItem('quiz_event_id', suggestion.id);
      localStorage.setItem('quiz_event_phase', suggestion.phase || '');
      localStorage.setItem('quiz_timer_enabled', 'true');
      navigate('/quiz');
    } catch (error) {
      console.error('Error starting study session:', error);
      alert(t('calendar.failedStartStudySessionTryAgain'));
    }
  }

  function handleSpacedRepetitionClick(dateStr, event) {
    event?.stopPropagation();
    if (!dateStr) {
      alert(t('calendar.noReviewSessionsFoundForDay'));
      return;
    }

    navigate(`/srs-review?date=${encodeURIComponent(dateStr)}`);
  }

  async function handleDeleteEvent(eventId, eventType, event) {
    event?.stopPropagation();

    const eventTypeLabel = eventType === EVENT_TYPES.MAJOR_EXAM
      ? t('calendar.eventTypeMajorExam')
      : eventType === EVENT_TYPES.SMALL_QUIZ
        ? t('calendar.eventTypeSmallQuiz')
        : t('calendar.eventTypeEvent');

    if (!window.confirm(tf('calendar.deleteEventConfirm', { eventType: eventTypeLabel }))) {
      return;
    }
    
    try {
      await calendarServiceOptimized.deleteEvent(userId, eventId, true);
      await loadCalendarData();
      setSelectedDate(null);
      alert(t('calendar.eventDeletedSuccess'));
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      alert(tf('calendar.failedDeleteEventWithReason', { reason: error.message }));
    }
  }

  // CRITICAL FIX: Render day cell with GREEN completion badges
  function renderDayCell(day) {
    if (!day) return null;
    
    const dateStr = getDateString(day);
    const events = getDayEvents(day);
    const isTodayDate = isToday(day);
    const isPastDate = isPast(day);
    
    const completionCount = events?.completions?.length || 0;
    const highestScore = completionCount > 0 
      ? Math.max(...events.completions.map(c => c.percentage))
      : 0;

    return (
      <div className="flex flex-col h-full p-1.5">
        {/* Day number + Completion badge */}
        <div className={`flex items-center justify-between mb-1 ${
          isTodayDate ? 'text-blue-600' : isPastDate ? 'text-slate-400' : 'text-slate-700'
        }`}>
          <span className="text-sm font-bold">{day}</span>
          
          {/* GREEN COMPLETION BADGE - Always visible when completions exist */}
          {completionCount > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-black shadow-sm">
              <CheckCircle size={10} fill="white" />
              <span>{completionCount}</span>
            </div>
          )}
        </div>
        
        {/* Event markers */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
          {/* Exams - GREEN if completed */}
          {events?.exams?.map((exam, idx) => (
            <div
              key={`exam-${idx}`}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer group ${
                exam.completed 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-red-100 text-red-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
            >
              {exam.completed ? <CheckCircle size={10} className="text-green-600" /> : <Flag size={10} />}
              <span className="truncate flex-1">{exam.title}</span>
              {!exam.completed && (
                <button
                  onClick={(e) => handleDeleteEvent(exam.id, EVENT_TYPES.MAJOR_EXAM, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          
          {/* Quizzes - GREEN if completed */}
          {events?.quizzes?.map((quiz, idx) => (
            <div
              key={`quiz-${idx}`}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer group ${
                quiz.completed 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-amber-100 text-amber-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
            >
              {quiz.completed ? <CheckCircle size={10} className="text-green-600" /> : <BookOpen size={10} />}
              <span className="truncate flex-1">{quiz.title}</span>
              {!quiz.completed && (
                <button
                  onClick={(e) => handleDeleteEvent(quiz.id, EVENT_TYPES.SMALL_QUIZ, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          
          {/* Study Suggestions - GREEN if completed */}
          {events?.suggestions?.slice(0, 2).map((suggestion, idx) => (
            <button
              key={`suggestion-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                suggestion.completed ? setSelectedDate(dateStr) : handleSuggestionPreview(suggestion, e);
              }}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors ${
                suggestion.completed 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {suggestion.completed ? <CheckCircle size={10} className="text-green-600" /> : <CalendarIcon size={10} />}
              <span className="truncate flex-1">{tf('calendar.mcqCount', { count: suggestion.questionCount })}</span>
            </button>
          ))}
          
          {/* Spaced Repetition summary (cheap counts) */}
          {events?.srsSummary?.dueTotal > 0 && (
            <button
              key={`srs-${dateStr}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSpacedRepetitionClick(dateStr, e);
              }}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors ${
                dateStr < today
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <Brain size={10} />
              <span className="truncate flex-1">SRS review ({formatDM(dateStr)}) • {events.srsSummary.dueTotal}</span>
            </button>
          )}

          {/* AI Recommendations - GREEN if completed */}
          {events?.aiRecommendations?.slice(0, 1).map((aiRec, idx) => (
            <button
              key={`ai-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                aiRec.completed ? setSelectedDate(dateStr) : handleAIRecommendationClick(aiRec);
              }}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors border ${
                aiRec.completed 
                  ? 'bg-green-100 text-green-700 border-green-300' 
                  : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-300 hover:from-purple-200 hover:to-pink-200'
              }`}
            >
              {aiRec.completed ? <CheckCircle size={10} className="text-green-600" /> : <Sparkles size={10} />}
              <span className="truncate flex-1">{t('calendar.aiLabel')}: {aiRec.questionCount}</span>
            </button>
          ))}
          
          {/* Big GREEN completion button if completions exist */}
          {completionCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(dateStr);
              }}
              className="flex items-center gap-1 text-xs px-1.5 py-1 rounded-lg font-bold bg-green-500 text-white hover:bg-green-600 transition-all shadow-sm mt-auto"
            >
              <CheckCircle size={12} fill="white" />
              <span className="flex-1">{tf('calendar.doneCount', { count: completionCount })}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'h-full' : 'bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6'}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
            <CalendarIcon className="text-blue-700" size={30} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-3xl font-black text-slate-800 tracking-tight leading-tight max-w-[14rem] sm:max-w-none special-calendar-title special-calendar-title-animate">
                {t('calendar.smartStudyCalendar')}
              </h3>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="w-9 h-9 rounded-full border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-110 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center text-indigo-700"
                title={t('dashboard.howThisWorks')}
              >
                <Info size={18} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-semibold truncate">{monthName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border-2 border-slate-200">
            <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-all">
              <ChevronLeft size={20} className="text-slate-700" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-all">
              <ChevronRight size={20} className="text-slate-700" />
            </button>
          </div>

          <button
            onClick={onAddEvent}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            {t('calendar.addEvent')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInfo(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border-2 border-slate-200"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
            >
              <div className="p-5 border-b-2 border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={20} className="text-indigo-700" />
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">{t('calendar.smartStudyCalendarFeatures')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={18} className="text-blue-700" />
                      <h4 className="font-black text-slate-800">{t('calendar.srsReviewMechanismTitle')}</h4>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      {t('calendar.srsReviewMechanismDesc')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} className="text-purple-700" />
                      <h4 className="font-black text-slate-800">{t('calendar.aiSuggestionsByTopicTitle')}</h4>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      {t('calendar.aiSuggestionsByTopicDesc')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={18} className="text-emerald-700" />
                      <h4 className="font-black text-slate-800">{t('calendar.examQuizRevisionPlanTitle')}</h4>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      {t('calendar.examQuizRevisionPlanDesc')}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={18} className="text-amber-700" />
                      <h4 className="font-black text-slate-800">{t('calendar.mechanicsTitle')}</h4>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      {t('calendar.mechanicsDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SRS Info Modal - SRS-specific information */}
      <AnimatePresence>
        {showSrsInfo && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSrsInfo(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-purple-200"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
            >
              <div className="p-5 border-b-2 border-purple-200 flex items-center justify-between bg-purple-50">
                <div className="flex items-center gap-2">
                  <Brain size={20} className="text-purple-700" />
                  <h3 className="text-lg font-black text-slate-800">{t('calendar.srsReviewMechanismTitle')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSrsInfo(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {t('calendar.srsReviewMechanismDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">{t('calendar.srsFormulaTitle')}</h4>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 whitespace-pre-line">
                    {t('calendar.srsFormulaBody')}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">{t('calendar.srsGraduationTitle')}</h4>
                  <p className="text-xs text-slate-600">
                    {tf('calendar.srsGraduationDesc', { archiveName: 'Mastery Archive' })}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Info Modal - AI Suggestions-specific information */}
      <AnimatePresence>
        {showAiInfo && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAiInfo(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-purple-200"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
            >
              <div className="p-5 border-b-2 border-purple-200 flex items-center justify-between bg-purple-50">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-700" />
                  <h3 className="text-lg font-black text-slate-800">{t('calendar.aiSuggestionsByTopicTitle')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiInfo(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {t('calendar.aiSuggestionsByTopicDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">{t('dashboard.aiHowGeneratesTitle')}</h4>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 whitespace-pre-line">
                    {t('dashboard.aiHowGeneratesDesc')}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">{t('dashboard.aiPriorityLevelsTitle')}</h4>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">{t('dashboard.priorityHigh')}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">{t('dashboard.priorityMedium')}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{t('dashboard.priorityLow')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Flag size={12} className="text-red-600" />
          <span className="text-slate-600 font-semibold">{t('calendar.eventTypeMajorExam')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen size={12} className="text-amber-600" />
          <span className="text-slate-600 font-semibold">{t('calendar.legendQuiz')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarIcon size={12} className="text-blue-600" />
          <span className="text-slate-600 font-semibold">{t('calendar.legendStudyPlan')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-purple-600" />
          <span className="text-slate-600 font-semibold">{t('calendar.review')}</span>
          <button
            onClick={() => setShowSrsInfo(true)}
            className="w-5 h-5 rounded-full bg-purple-100 hover:bg-purple-200 hover:scale-110 hover:shadow-sm active:scale-95 transition-all duration-200 text-purple-700 flex items-center justify-center"
            title={t('calendar.srsReviewMechanismTitle')}
          >
            <Info size={12} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-purple-600" />
          <span className="text-slate-600 font-semibold">{t('calendar.legendAiSuggestion')}</span>
          <button
            onClick={() => setShowAiInfo(true)}
            className="w-5 h-5 rounded-full bg-purple-100 hover:bg-purple-200 hover:scale-110 hover:shadow-sm active:scale-95 transition-all duration-200 text-purple-700 flex items-center justify-center"
            title={t('calendar.aiSuggestionsByTopicTitle')}
          >
            <Info size={12} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle size={12} className="text-green-600" fill="currentColor" />
          <span className="text-slate-600 font-semibold">{t('calendar.eventTypeCompletedActivity')}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b-2 border-slate-200">
          {[
            t('calendar.weekdaySunShort'),
            t('calendar.weekdayMonShort'),
            t('calendar.weekdayTueShort'),
            t('calendar.weekdayWedShort'),
            t('calendar.weekdayThuShort'),
            t('calendar.weekdayFriShort'),
            t('calendar.weekdaySatShort'),
          ].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-black text-slate-600 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {calendarGrid.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                onMouseEnter={() => day && setHoveredDate(getDateString(day))}
                onMouseLeave={() => setHoveredDate(null)}
                onClick={() => day && setSelectedDate(getDateString(day))}
                className={`min-h-[120px] border-r border-slate-200 last:border-r-0 transition-all cursor-pointer ${
                  day ? 'hover:bg-slate-50' : 'bg-slate-50/30'
                } ${
                  isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''
                } ${
                  isPast(day) ? 'opacity-60' : ''
                }`}
              >
                {renderDayCell(day)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modals (existing - unchanged) */}
      <AnimatePresence>
        {suggestionPreview && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSuggestionPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">{t('calendar.studySessionPreviewTitle')}</h3>
                <button
                  onClick={() => setSuggestionPreview(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2">{suggestionPreview.title}</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={16} />
                      <span>{t('calendar.phaseLabel')}: <strong>{suggestionPreview.phase}</strong></span>
                    </div>
                    {suggestionPreview.topic && (
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} />
                        <span>
                          <strong>{suggestionPreview.topic}</strong>
                          {suggestionPreview.subtopic && ` → ${suggestionPreview.subtopic}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={18} className={
                      suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                        ? 'text-green-600'
                        : 'text-amber-600'
                    } />
                    <span className={`font-bold ${
                      suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                        ? 'text-green-900'
                        : 'text-amber-900'
                    }`}>
                      Questions Available
                    </span>
                  </div>
                  <p className={`text-sm ${
                    suggestionPreview.questionInfo.count >= suggestionPreview.questionInfo.requested
                      ? 'text-green-800'
                      : 'text-amber-800'
                  }`}>
                    <strong>{suggestionPreview.questionInfo.count}</strong> questions found
                    {suggestionPreview.questionInfo.count < suggestionPreview.questionInfo.requested && (
                      <span> (requested: {suggestionPreview.questionInfo.requested})</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => {
                    handleStudySuggestionClick(suggestionPreview);
                    setSuggestionPreview(null);
                  }}
                  disabled={suggestionPreview.questionInfo.count === 0}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={18} fill="currentColor" />
                  Start Practice ({Math.min(suggestionPreview.questionInfo.count, suggestionPreview.questionInfo.requested)} Questions)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Detail Modal - Shows completions prominently */}
      <AnimatePresence>
        {selectedDate && selectedDayData && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h3 className="text-lg font-black text-slate-800">
                  {(parseHKDateKey(selectedDate) || new Date(selectedDate)).toLocaleDateString('en-US', { 
                    timeZone: HK_TIME_ZONE,
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* COMPLETIONS FIRST - Most important! */}
                {selectedDayData.completions?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-green-200">
                      <CheckCircle className="text-green-600" size={24} fill="currentColor" />
                      <h4 className="font-black text-slate-800 text-lg">
                        ✅ Completed Quizzes ({selectedDayData.completions.length})
                      </h4>
                    </div>
                    
                    {selectedDayData.completions.map((comp, idx) => {
                      const scoreColors = getScoreColor(comp.percentage);
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border-2 hover:shadow-md transition-all ${scoreColors.bg} ${scoreColors.border}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className={scoreColors.text} size={20} fill="currentColor" />
                              <span className={`font-bold ${scoreColors.text}`}>
                                {comp.title || `Quiz Session ${idx + 1}`}
                              </span>
                            </div>
                            <div className={`px-4 py-2 rounded-lg font-black text-xl border-2 shadow-sm ${
                              comp.percentage >= 70 ? 'bg-green-600 border-green-700 text-white' :
                              comp.percentage >= 50 ? 'bg-yellow-500 border-yellow-600 text-white' :
                              'bg-red-500 border-red-600 text-white'
                            }`}>
                              {comp.percentage}%
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className={`flex items-center gap-2 text-sm ${scoreColors.text}`}>
                              <Target size={16} />
                              <span><strong>{comp.correctAnswers}/{comp.totalQuestions}</strong> correct</span>
                            </div>
                            
                            {comp.timeSpent && (
                              <div className={`flex items-center gap-2 text-sm ${scoreColors.text}`}>
                                <Clock size={16} />
                                <span>{formatTime(comp.timeSpent)}</span>
                              </div>
                            )}
                          </div>
                          
                          {comp.topics && comp.topics.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1">
                                {comp.topics.map((topic, i) => (
                                  <span key={i} className={`text-xs px-2 py-1 rounded-full font-bold border ${
                                    comp.percentage >= 70 ? 'bg-green-200 text-green-900 border-green-300' :
                                    comp.percentage >= 50 ? 'bg-blue-200 text-blue-900 border-blue-300' :
                                    'bg-red-200 text-red-900 border-red-300'
                                  }`}>
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className={`flex items-center gap-2 text-xs ${scoreColors.text} mb-3`}>
                            <CalendarIcon size={12} />
                            <span>
                              {new Date(comp.completedAt).toLocaleString('en-GB', {
                                timeZone: 'Asia/Hong_Kong',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {comp.attemptId && (
                            <button
                              onClick={() => {
                                navigate(`/history?attempt=${comp.attemptId}`);
                              }}
                              className={`w-full px-4 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${
                                comp.percentage >= 70 ? 'bg-green-600 hover:bg-green-700 text-white' :
                                comp.percentage >= 50 ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              <Eye size={18} />
                              View Full Results
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Other events below completions */}
                {(selectedDayData.exams || selectedDayData.quizzes || 
                  selectedDayData.suggestions || selectedDayData.srsSummary || selectedDayData.aiRecommendations) && (
                  <div className="space-y-3 pt-3 border-t-2">
                    <h4 className="font-bold text-slate-700 text-sm">{t('calendar.scheduledEvents')}</h4>
                    
                    {/* Rest of events... (exams, quizzes, suggestions, etc.) */}
                    {/* (existing modal code for these sections - unchanged) */}

                    {selectedDayData.exams?.length > 0 && (
                      <div className="space-y-2">
                        {selectedDayData.exams.map((exam) => (
                          <div
                            key={exam.id}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              exam.completed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {exam.completed
                                    ? <CheckCircle size={18} className="text-green-700" fill="currentColor" />
                                    : <Flag size={18} className="text-red-700" />
                                  }
                                  <div className="font-black text-slate-800 truncate">{exam.title}</div>
                                </div>
                                {Array.isArray(exam.topics) && exam.topics.length > 0 && (
                                  <div className="text-xs text-slate-600 mt-1 font-semibold truncate">
                                    {exam.topics.join(', ')}
                                  </div>
                                )}
                              </div>

                              {!exam.completed && (
                                <button
                                  onClick={(e) => handleDeleteEvent(exam.id, EVENT_TYPES.MAJOR_EXAM, e)}
                                  className="p-2 rounded-lg hover:bg-white/70 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={16} className="text-red-700" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDayData.quizzes?.length > 0 && (
                      <div className="space-y-2">
                        {selectedDayData.quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              quiz.completed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-amber-50 border-amber-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {quiz.completed
                                    ? <CheckCircle size={18} className="text-green-700" fill="currentColor" />
                                    : <BookOpen size={18} className="text-amber-700" />
                                  }
                                  <div className="font-black text-slate-800 truncate">{quiz.title}</div>
                                </div>
                              </div>

                              {!quiz.completed && (
                                <button
                                  onClick={(e) => handleDeleteEvent(quiz.id, EVENT_TYPES.SMALL_QUIZ, e)}
                                  className="p-2 rounded-lg hover:bg-white/70 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={16} className="text-amber-700" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDayData.suggestions?.length > 0 && (
                      <div className="space-y-2">
                        {selectedDayData.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              if (suggestion.completed) return;
                              handleStudySuggestionClick(suggestion);
                              setSelectedDate(null);
                            }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              suggestion.completed
                                ? 'bg-green-50 border-green-200 cursor-default'
                                : 'bg-blue-50 border-blue-200 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {suggestion.completed
                                    ? <CheckCircle size={18} className="text-green-700" fill="currentColor" />
                                    : <CalendarIcon size={18} className="text-blue-700" />
                                  }
                                  <div className="font-black text-slate-800 truncate">{suggestion.title}</div>
                                </div>
                                <div className="text-xs text-slate-600 mt-1 font-semibold">
                                  {tf('calendar.mcqCount', { count: suggestion.questionCount })}
                                  {suggestion.topic ? ` • ${suggestion.topic}` : ''}
                                  {suggestion.subtopic ? ` → ${suggestion.subtopic}` : ''}
                                </div>
                              </div>

                              {!suggestion.completed && (
                                <div className="shrink-0 text-xs font-black text-blue-700 flex items-center gap-1">
                                  <Play size={14} fill="currentColor" />
                                  Start
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedDayData.srsSummary?.dueTotal > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={(e) => handleSpacedRepetitionClick(selectedDate, e)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedDate < today
                              ? 'bg-red-50 border-red-200 hover:shadow-sm'
                              : 'bg-purple-50 border-purple-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Brain size={18} className={selectedDate < today ? 'text-red-700' : 'text-purple-700'} />
                                <div className="font-black text-slate-800 truncate">SRS review ({formatDM(selectedDate)}) • {selectedDayData.srsSummary.dueTotal}</div>
                              </div>
                            </div>
                            <div className="shrink-0 text-xs font-black text-purple-700 flex items-center gap-1">
                              <Play size={14} fill="currentColor" />
                              Start
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    {selectedDayData.aiRecommendations?.length > 0 && (
                      <div className="space-y-2">
                        {selectedDayData.aiRecommendations.map((aiRec) => (
                          <button
                            key={aiRec.id}
                            onClick={() => {
                              if (aiRec.completed) return;
                              handleAIRecommendationClick(aiRec);
                              setSelectedDate(null);
                            }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              aiRec.completed
                                ? 'bg-green-50 border-green-200 cursor-default'
                                : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {aiRec.completed
                                    ? <CheckCircle size={18} className="text-green-700" fill="currentColor" />
                                    : <Sparkles size={18} className="text-purple-700" />
                                  }
                                  <div className="font-black text-slate-800 truncate">{t('calendar.aiLabel')}</div>
                                </div>
                                <div className="text-xs text-slate-600 mt-1 font-semibold">
                                  {tf('calendar.mcqCount', { count: aiRec.questionCount })}
                                  {aiRec.topic ? ` • ${aiRec.topic}` : ''}
                                  {aiRec.subtopic ? ` → ${aiRec.subtopic}` : ''}
                                </div>
                              </div>

                              {!aiRec.completed && (
                                <div className="shrink-0 text-xs font-black text-purple-700 flex items-center gap-1">
                                  <Play size={14} fill="currentColor" />
                                  Start
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedDayData.completions?.length === 0 &&
                      (selectedDayData.exams?.length || 0) === 0 &&
                      (selectedDayData.quizzes?.length || 0) === 0 &&
                      (selectedDayData.suggestions?.length || 0) === 0 &&
                      (selectedDayData.srsSummary?.dueTotal || 0) === 0 &&
                      (selectedDayData.aiRecommendations?.length || 0) === 0 && (
                      <div className="p-6 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold">
                        {t('calendar.noEventsScheduled')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}