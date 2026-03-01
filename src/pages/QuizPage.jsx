import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import QuestionCard from '../components/QuestionCard';
import { ChevronLeft, ChevronRight, Send, Timer, FlaskConical, Flag, Clock, X, Home, Menu } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';

export default function QuizPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const swipeStartRef = useRef(null);
  
  const [questions] = useState(() => quizStorage.getSelectedQuestions());
  const practiceMode = localStorage.getItem('quiz_mode') || 'timed'; // timed, marathon, custom, mistakes

  const isPracticeQuiz = ['timed', 'marathon', 'custom', 'mistakes'].includes(practiceMode);
  
  useEffect(() => {
    if (!questions || questions.length === 0) {
      navigate('/practice');
    }
  }, [questions, navigate]);

  const [currentIndex, setCurrentIndex] = useState(() => quizStorage.getCurrentIndex());
  const [answers, setAnswers] = useState(() => quizStorage.getUserAnswers());
  const [flagged, setFlagged] = useState(() => quizStorage.getFlagged());
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(() => {
    const saved = localStorage.getItem('quiz_timer_enabled');
    return saved === 'true';
  });
  const [isTimedMode, setIsTimedMode] = useState(() => {
    const saved = localStorage.getItem('quiz_is_timed_mode');
    return saved === 'true';
  });
  const [hideTimerUi, setHideTimerUi] = useState(() => {
    const saved = localStorage.getItem('quiz_hide_timer_ui');
    return saved === 'true';
  });
  const [questionTimes, setQuestionTimes] = useState(() => quizStorage.getQuestionTimes());
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(() => quizStorage.getSessionStart());

  const [showTopic, setShowTopic] = useState(() => {
    const saved = localStorage.getItem('practice_show_topic');
    return saved === null ? true : saved === 'true';
  });
  const [showSubtopic, setShowSubtopic] = useState(() => {
    const saved = localStorage.getItem('practice_show_subtopic');
    return saved === null ? true : saved === 'true';
  });
  const [showDseCode, setShowDseCode] = useState(() => {
    const saved = localStorage.getItem('practice_show_dsecode');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('practice_show_topic', String(showTopic));
  }, [showTopic]);

  useEffect(() => {
    localStorage.setItem('practice_show_subtopic', String(showSubtopic));
  }, [showSubtopic]);

  useEffect(() => {
    localStorage.setItem('practice_show_dsecode', String(showDseCode));
  }, [showDseCode]);

  // Calculate time limit for timed mode (questions × 75 seconds in milliseconds)
  const timeLimit = isTimedMode ? questions.length * 75 * 1000 : 0;

  // Prevent accidental navigation away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
      ) return;
      if (showPeriodicTable || showMobileMenu) return;
      if (!questions || questions.length === 0) return;

      const currentQuestion = questions[currentIndex];
      const key = e.key.toUpperCase();

      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        const currentAnswer = answers[currentQuestion.ID];
        if (currentAnswer === key) {
          setAnswers(prev => ({ ...prev, [currentQuestion.ID]: null }));
        } else {
          setAnswers(prev => ({ ...prev, [currentQuestion.ID]: key }));
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex < questions.length - 1) {
          nextQuestion();
        } else if (allAnswered) {
          handleComplete();
        }
        return;
      }

      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        e.preventDefault();
        nextQuestion();
        return;
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        prevQuestion();
        return;
      }

      if (key === 'F') {
        e.preventDefault();
        toggleFlag();
        return;
      }

      if (key === 'O') {
        e.preventDefault();
        setShowQuestionPanel(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, answers, showPeriodicTable, showQuestionPanel, showMobileMenu, questions]);

  // Persist state to localStorage
  useEffect(() => { quizStorage.saveCurrentIndex(currentIndex); }, [currentIndex]);
  useEffect(() => { quizStorage.saveUserAnswers(answers); }, [answers]);
  useEffect(() => { quizStorage.saveFlagged(flagged); }, [flagged]);
  useEffect(() => { quizStorage.saveQuestionTimes(questionTimes); }, [questionTimes]);
  useEffect(() => { if (sessionStartTime !== null) quizStorage.saveSessionStart(sessionStartTime); }, [sessionStartTime]);

  if (!questions || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const allAnswered = questions.every(q => answers[q.ID]);

  // Initialize timer on mount
  useEffect(() => {
    if ((timerEnabled || isTimedMode) && !sessionStartTime) {
      const now = Date.now();
      setCurrentQuestionStartTime(now);
      setSessionStartTime(now);
    }
  }, []);

  useEffect(() => {
    if (!timerEnabled && !isTimedMode) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, isTimedMode]);

  useEffect(() => {
    if ((timerEnabled || isTimedMode) && currentQuestion) setCurrentQuestionStartTime(Date.now());
  }, [currentIndex, timerEnabled, isTimedMode]);

  const recordQuestionTime = () => {
    if (timerEnabled && currentQuestionStartTime) {
      const timeSpent = Date.now() - currentQuestionStartTime;
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestion.ID]: (prev[currentQuestion.ID] || 0) + timeSpent
      }));
    }
  };

  const handleOptionSelect = useCallback((option) => {
    if (!currentQuestion?.ID) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.ID]: option }));
  }, [currentQuestion?.ID]);

  const toggleFlag = () => {
    const questionId = currentQuestion.ID;
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });
  };

  const nextQuestion = () => {
    recordQuestionTime();
    if (currentIndex < totalQuestions - 1) setCurrentIndex(currentIndex + 1);
  };

  const prevQuestion = () => {
    recordQuestionTime();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const jumpToQuestion = (index) => {
    recordQuestionTime();
    setCurrentIndex(index);
    setShowQuestionPanel(false);
  };

  const handleBackToTopics = () => {
    const confirmed = window.confirm(t('quiz.confirmBackToTopics'));
    if (confirmed) {
      quizStorage.clearQuizData();
      localStorage.removeItem('quiz_mode');
      localStorage.removeItem('quiz_timer_enabled');
      localStorage.removeItem('quiz_is_timed_mode');
      navigate('/practice');
    }
  };

  const handleComplete = () => {
    recordQuestionTime();
    quizStorage.saveUserAnswers(answers);
    quizStorage.saveQuestionTimes(questionTimes);
    navigate('/results');
  };

  const shouldIgnoreSwipeTarget = (target) => {
    const el = target instanceof Element ? target : null;
    if (!el) return false;
    return Boolean(el.closest('button, a, input, textarea, select, [role="button"], [data-enlarge-image="true"]'));
  };

  const handleTouchStart = (e) => {
    if (showPeriodicTable || showQuestionPanel || showMobileMenu) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (shouldIgnoreSwipeTarget(e.target)) return;

    const t0 = e.touches[0];
    swipeStartRef.current = {
      x: t0.clientX,
      y: t0.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (showPeriodicTable || showQuestionPanel || showMobileMenu) return;
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const t0 = e.changedTouches && e.changedTouches[0];
    if (!t0) return;

    const dx = t0.clientX - start.x;
    const dy = t0.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // thresholds tuned to avoid interfering with vertical scroll
    if (absX < 70) return;
    if (absY > 40 && absY > absX * 0.7) return;

    if (dx < 0) {
      // swipe left => next
      if (!isLastQuestion) nextQuestion();
      else if (allAnswered) handleComplete();
    } else {
      // swipe right => prev
      if (currentIndex > 0) prevQuestion();
    }
  };

  useEffect(() => {
    const onStart = (e) => handleTouchStart(e);
    const onEnd = (e) => handleTouchEnd(e);

    window.addEventListener('touchstart', onStart, { passive: true, capture: true });
    window.addEventListener('touchend', onEnd, { passive: true, capture: true });

    return () => {
      window.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
    };
  }, [handleTouchStart, handleTouchEnd]);

  const isLastQuestion = currentIndex === totalQuestions - 1;

  const getTotalTimeSpent = () => {
    const accumulated = Object.values(questionTimes).reduce((sum, t) => sum + t, 0);
    if (timerEnabled && currentQuestionStartTime) {
      return accumulated + (currentTime - currentQuestionStartTime);
    }
    return accumulated;
  };

  const getCurrentQuestionTime = () => {
    const accumulated = questionTimes[currentQuestion.ID] || 0;
    if (timerEnabled && currentQuestionStartTime) {
      return accumulated + (currentTime - currentQuestionStartTime);
    }
    return accumulated;
  };

  const getSessionTime = () => {
    if (timerEnabled && sessionStartTime) return currentTime - sessionStartTime;
    return 0;
  };

  const getTimeRemaining = () => {
    if (!isTimedMode || !sessionStartTime) return 0;
    const elapsed = currentTime - sessionStartTime;
    const remaining = timeLimit - elapsed;
    return Math.max(0, remaining);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) return `${hrs}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const getQuestionStatus = (q) => {
    if (answers[q.ID]) return 'answered';
    if (flagged.has(q.ID)) return 'flagged';
    return 'skipped';
  };

  const totalTimeSpent = getTotalTimeSpent();
  const currentQuestionTime = getCurrentQuestionTime();
  const sessionTime = getSessionTime();
  const timeRemaining = getTimeRemaining();

  // Check if time's up in timed mode
  useEffect(() => {
    if (isTimedMode && timeRemaining === 0 && sessionStartTime) {
      alert(t('quiz.timeUp'));
      handleComplete();
    }
  }, [timeRemaining, isTimedMode]);

  const mainContent = (
    <div className="w-full px-4 pt-6 pb-6 lg:px-0">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-lab-blue">{t('quiz.questionPrefix')}{currentIndex + 1}</span>
            <span className="text-sm font-medium text-slate-500">{t('quiz.of')} {totalQuestions}</span>
          </div>
          <span className="text-xl font-bold text-lab-blue">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-lab-blue h-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {timerEnabled && !hideTimerUi && (
        <div className="lg:hidden bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Timer className="text-lab-blue" size={18} /><span className="text-sm font-bold text-slate-600">{t('quiz.totalTime')}</span></div>
            <div className="text-xl font-black text-lab-blue font-mono">{formatTime(sessionTime)}</div>
          </div>
          {isTimedMode && (
            <div className="flex justify-between text-xs text-slate-500 pb-2 border-b mb-2">
              <span>{t('quiz.timeRemaining')}</span>
              <span className={`font-bold ${timeRemaining < 60000 ? 'text-red-600' : 'text-amber-600'}`}>{formatTime(timeRemaining)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('quiz.thisQuestion')}</span>
            <span className="font-bold text-lab-blue">{formatTime(currentQuestionTime)}</span>
          </div>
        </div>
      )}

      <div className="mb-4">
        <QuestionCard
          question={currentQuestion}
          selectedOption={answers[currentQuestion.ID]}
          onSelect={handleOptionSelect}
          showTopic={showTopic}
          showSubtopic={showSubtopic}
          showDseCode={showDseCode}
        />
      </div>

      <div className="flex justify-center gap-1 py-2">
        {questions.slice(0, Math.min(30, totalQuestions)).map((_, idx) => (
          <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-lab-blue w-6' : answers[questions[idx].ID] ? 'bg-chemistry-green' : flagged.has(questions[idx].ID) ? 'bg-amber-500' : 'bg-slate-200'}`} />
        ))}
        {totalQuestions > 30 && <span className="text-slate-400 text-xs">{t('common.ellipsis')}</span>}
      </div>

      <div className="text-center text-sm mt-2 space-y-1">
        <p className="text-slate-500 hidden lg:block">
          💡 <span className="font-semibold">{t('quiz.tip')}</span> {t('quiz.press')} <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">A</kbd>–<kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">D</kbd> {t('quiz.toSelect')} · <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Enter</kbd> / <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">→</kbd> {t('quiz.next')} · <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">F</kbd> {t('quiz.flag')} · <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">O</kbd> {t('quiz.overview')}
        </p>
        {!allAnswered && isLastQuestion && (
          <p className="text-amber-600 font-medium">
            {t('quiz.pleaseAnswerAll')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="relative min-h-screen pb-32 lg:pb-6"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Keyboard shortcut hint (desktop only) */}
      <div className="hidden lg:flex fixed top-20 left-1/2 -translate-x-1/2 z-20 items-center gap-3 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-xs text-slate-500">
        <span>{t('quiz.type')} <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">B</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">C</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">D</kbd> {t('quiz.toSelect')}</span>
        <span className="text-slate-300">|</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">Enter</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">→</kbd> {t('quiz.next')}</span>
        <span className="text-slate-300">|</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">F</kbd> {t('quiz.flag')}</span>
        <span className="text-slate-300">|</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">O</kbd> {t('quiz.overview')}</span>
      </div>

      {/* Mobile Tools */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-20 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-lab-blue text-white rounded-lg font-bold shadow-lg"
      >
        <Menu size={18} />{t('quiz.tools')}
      </button>

      {showMobileMenu && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-40" onClick={() => setShowMobileMenu(false)} />
          <div className="lg:hidden fixed top-32 right-4 bg-white rounded-xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden min-w-[200px]">
            <button onClick={() => { handleBackToTopics(); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b">
              <Home size={18} className="text-red-500" />
              <span className="font-semibold text-red-600">{t('quiz.backToTopics')}</span>
            </button>
            <button onClick={() => { setShowPeriodicTable(true); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b">
              <FlaskConical size={18} className="text-purple-600" />
              <span className="font-semibold text-slate-700">{t('quiz.periodicTable')}</span>
            </button>
            <button onClick={() => { setShowQuestionPanel(true); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b">
              <Flag size={18} className="text-slate-700" />
              <span className="font-semibold text-slate-700">{t('quiz.overview')}</span>
            </button>
            <button onClick={() => { toggleFlag(); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left ${flagged.has(currentQuestion?.ID) ? 'bg-amber-50' : ''}`}>
              <Flag size={18} className="text-amber-500" fill={flagged.has(currentQuestion?.ID) ? 'currentColor' : 'none'} />
              <span className="font-semibold text-slate-700">{flagged.has(currentQuestion?.ID) ? t('quiz.unflagQuestion') : t('quiz.flagQuestion')}</span>
            </button>
          </div>
        </>
      )}

      {/* Desktop Floating Nav Buttons */}
      <button
        type="button"
        onClick={prevQuestion}
        disabled={currentIndex === 0}
        className="hidden lg:flex fixed left-6 top-[82%] -translate-y-1/2 z-40 items-center justify-center w-16 h-16 rounded-full font-bold transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-lab-blue text-white hover:bg-blue-800 hover:scale-110"
        aria-label={t('quiz.previous')}
        title={t('quiz.previous')}
      >
        <ChevronLeft size={32} />
      </button>

      <button
        type="button"
        onClick={!isLastQuestion ? nextQuestion : handleComplete}
        disabled={isLastQuestion && !allAnswered}
        className={`hidden lg:flex fixed right-6 top-[82%] -translate-y-1/2 z-40 items-center justify-center w-16 h-16 rounded-full font-bold transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
          !isLastQuestion
            ? 'bg-lab-blue text-white hover:bg-blue-800 hover:scale-110'
            : allAnswered
              ? 'bg-chemistry-green text-white hover:opacity-90 hover:scale-110'
              : 'bg-slate-300 text-slate-500'
        }`}
        aria-label={!isLastQuestion ? t('quiz.next') : t('quiz.finishSubmit')}
        title={!isLastQuestion ? t('quiz.next') : t('quiz.finishSubmit')}
      >
        {!isLastQuestion ? <ChevronRight size={32} /> : <Send size={28} />}
      </button>

      <div className="hidden lg:flex w-full px-6 pt-6 pb-6 gap-5">
        <div className="w-52 flex-shrink-0">
          <div className="sticky top-24 flex flex-col gap-4 h-[calc(100vh-7rem)]">
            <button onClick={handleBackToTopics}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Home size={18} /><span>{t('quiz.backToTopics')}</span>
            </button>

            {timerEnabled && !hideTimerUi && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-lab-blue p-6 w-full">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Timer className="text-lab-blue" size={24} />
                    <span className="text-sm font-bold text-slate-600">{t('quiz.totalTime')}</span>
                  </div>
                  <div className="text-4xl font-black text-lab-blue mb-4 font-mono">{formatTime(sessionTime)}</div>
                  
                  {isTimedMode && (
                    <div className="mb-4 pb-4 border-b border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">{t('quiz.timeRemaining')}</div>
                      <div className={`text-2xl font-black font-mono ${timeRemaining < 60000 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-500 space-y-2">
                    <div className="flex justify-between pt-2 border-t">
                      <span>{t('quiz.thisQuestion')}</span>
                      <span className="font-bold text-lab-blue">{formatTime(currentQuestionTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setShowPeriodicTable(true)}
              className="flex items-center gap-2 px-5 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <FlaskConical size={20} /><span>{t('quiz.periodicTable')}</span>
            </button>

            <button onClick={() => setShowQuestionPanel(!showQuestionPanel)}
              className="flex items-center gap-2 px-5 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Flag size={20} /><span>{t('quiz.overview')}</span>
            </button>

            <div className="flex-1" />
          </div>
        </div>

        <div className="flex-1 min-w-0">{mainContent}</div>

        <div className="w-20 flex-shrink-0">
          <div className="sticky top-24 flex flex-col gap-4 h-[calc(100vh-7rem)]">
            <button onClick={toggleFlag}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95 ${flagged.has(currentQuestion?.ID) ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white text-amber-500 border-2 border-amber-500 hover:bg-amber-50'}`}
              title={flagged.has(currentQuestion?.ID) ? t('quiz.unflagQuestion') : t('quiz.flagQuestion')}
            >
              <Flag size={28} fill={flagged.has(currentQuestion?.ID) ? 'currentColor' : 'none'} />
            </button>
            <div className="flex-1" />
          </div>
        </div>
      </div>

      {/* Question Overview Panel - No blur, just transparent */}
      {showQuestionPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQuestionPanel(false)} />
          <div className="fixed left-0 top-0 h-full w-80 max-w-[90vw] bg-white/95 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-left duration-300 border-r-2 border-slate-200">
            <div className="sticky top-0 bg-white/95 border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{t('quiz.questionOverview')}</h3>
              <button onClick={() => setShowQuestionPanel(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-3 mb-6 text-sm">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-chemistry-green" /><span>{t('quiz.answered')} ({Object.keys(answers).filter(k => answers[k]).length})</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-amber-500" /><span>{t('quiz.flagged')} ({flagged.size})</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-slate-200" /><span>{t('quiz.skipped')} ({totalQuestions - Object.keys(answers).filter(k => answers[k]).length})</span></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q);
                  const qTime = questionTimes[q.ID] || 0;
                  return (
                    <button key={q.ID} onClick={() => jumpToQuestion(idx)}
                      className={`aspect-square rounded-xl font-bold text-base transition-all border-2 flex flex-col items-center justify-center ${idx === currentIndex ? 'border-lab-blue ring-2 ring-lab-blue ring-offset-2' : 'border-transparent'} ${status === 'answered' ? 'bg-chemistry-green text-white hover:opacity-80' : status === 'flagged' ? 'bg-amber-500 text-white hover:opacity-80' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      title={timerEnabled && qTime > 0 ? formatTime(qTime) : ''}>
                      <span>{idx + 1}</span>
                      {timerEnabled && qTime > 0 && (
                        <span className="text-[8px] opacity-75 mt-0.5">{formatTime(qTime)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Periodic Table Modal */}
      {showPeriodicTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowPeriodicTable(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{t('quiz.periodicTableOfElements')}</h3>
              <button onClick={() => setShowPeriodicTable(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"><X size={24} /></button>
            </div>
            <div className="p-4">
              <img src="/PeriodicTable.jpg" alt={t('quiz.periodicTableAlt')} className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden">{mainContent}</div>

      {/* Mobile Nav Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 shadow-2xl z-30">
        <div className="grid grid-cols-3 gap-2 p-2">
          <button onClick={prevQuestion} disabled={currentIndex === 0}
            className="flex flex-col items-center justify-center py-2 px-2 bg-slate-100 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
            <ChevronLeft size={20} className={currentIndex === 0 ? 'text-slate-400' : 'text-lab-blue'} />
            <span className={`text-xs mt-0.5 ${currentIndex === 0 ? 'text-slate-400' : 'text-lab-blue'}`}>{t('quiz.previous')}</span>
          </button>
          <div className="flex flex-col items-center justify-center py-2 px-2 bg-slate-100 rounded-lg">
            <div className="text-xl font-black text-lab-blue">{currentIndex + 1}/{totalQuestions}</div>
            <div className="text-xs text-slate-500">{t('quiz.question')}</div>
          </div>
          {!isLastQuestion ? (
            <button onClick={nextQuestion}
              className="flex flex-col items-center justify-center py-2 px-2 bg-lab-blue rounded-lg font-bold transition-all active:scale-95">
              <ChevronRight size={20} className="text-white" />
              <span className="text-xs text-white mt-0.5">{t('quiz.next')}</span>
            </button>
          ) : (
            <button onClick={handleComplete} disabled={!allAnswered}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg font-bold transition-all active:scale-95 ${allAnswered ? 'bg-chemistry-green' : 'bg-slate-300 cursor-not-allowed'}`}>
              <Send size={20} className="text-white" />
              <span className="text-xs text-white mt-0.5">{t('quiz.submit')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}