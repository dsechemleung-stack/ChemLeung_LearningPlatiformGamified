import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import { ChevronLeft, ChevronRight, Send, Timer, FlaskConical, Flag, Clock, X, Home, Menu } from 'lucide-react';
import { quizStorage } from '../utils/quizStorage';

export default function QuizPage() {
  const navigate = useNavigate();
  
  // Load questions from storage
  const questions = quizStorage.getSelectedQuestions();
  
  // Redirect if no questions selected
  useEffect(() => {
    if (!questions || questions.length === 0) {
      navigate('/');
    }
  }, [questions, navigate]);

  // Load saved state or initialize
  const [currentIndex, setCurrentIndex] = useState(() => quizStorage.getCurrentIndex());
  const [answers, setAnswers] = useState(() => quizStorage.getUserAnswers());
  const [flagged, setFlagged] = useState(() => quizStorage.getFlagged());
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(() => quizStorage.getTimerEnabled());
  const [questionTimes, setQuestionTimes] = useState(() => quizStorage.getQuestionTimes());
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(() => quizStorage.getSessionStart());
  const timerInitialized = useRef(false);

  // CRITICAL: Prevent page refresh/close without warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Handle Enter key press for navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        if (showPeriodicTable || showQuestionPanel) {
          return;
        }
        if (currentIndex < questions.length - 1) {
          nextQuestion();
        } else if (allAnswered) {
          handleComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentIndex, answers, showPeriodicTable, showQuestionPanel]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    quizStorage.saveCurrentIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    quizStorage.saveUserAnswers(answers);
  }, [answers]);

  useEffect(() => {
    quizStorage.saveFlagged(flagged);
  }, [flagged]);

  useEffect(() => {
    quizStorage.saveQuestionTimes(questionTimes);
  }, [questionTimes]);

  useEffect(() => {
    if (timerEnabled !== null) {
      quizStorage.saveTimerEnabled(timerEnabled);
    }
  }, [timerEnabled]);

  useEffect(() => {
    if (sessionStartTime !== null) {
      quizStorage.saveSessionStart(sessionStartTime);
    }
  }, [sessionStartTime]);

  if (!questions || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // Timer initialization prompt - only once
  useEffect(() => {
    if (timerEnabled === null && !timerInitialized.current) {
      timerInitialized.current = true;
      const enableTimer = window.confirm(
        "Do you want to enable the timer?\n\n" +
        "The timer will track how long you spend on each question.\n\n" +
        "Click OK to enable, Cancel to skip."
      );
      setTimerEnabled(enableTimer);
      if (enableTimer) {
        const now = Date.now();
        setCurrentQuestionStartTime(now);
        setSessionStartTime(now);
      }
    }
  }, [timerEnabled]);

  // Live timer update - updates every second
  useEffect(() => {
    if (!timerEnabled) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled]);

  // Start timer when changing questions
  useEffect(() => {
    if (timerEnabled && currentQuestion) {
      setCurrentQuestionStartTime(Date.now());
    }
  }, [currentIndex, timerEnabled]);

  // Record time when leaving a question
  const recordQuestionTime = () => {
    if (timerEnabled && currentQuestionStartTime) {
      const timeSpent = Date.now() - currentQuestionStartTime;
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestion.ID]: (prev[currentQuestion.ID] || 0) + timeSpent
      }));
    }
  };

  const handleOptionSelect = (option) => {
    setAnswers({
      ...answers,
      [currentQuestion.ID]: option
    });
  };

  const toggleFlag = () => {
    const questionId = currentQuestion.ID;
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const nextQuestion = () => {
    recordQuestionTime();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevQuestion = () => {
    recordQuestionTime();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const jumpToQuestion = (index) => {
    recordQuestionTime();
    setCurrentIndex(index);
    setShowQuestionPanel(false);
  };

  const handleBackToTopics = () => {
    const confirmed = window.confirm(
      "Are you sure you want to go back to topic selection?\n\n" +
      "⚠️ ALL YOUR PROGRESS WILL BE LOST!"
    );
    
    if (confirmed) {
      quizStorage.clearQuizData();
      navigate('/');
    }
  };

  const handleComplete = () => {
    recordQuestionTime();
    
    // Save final state
    quizStorage.saveUserAnswers(answers);
    quizStorage.saveQuestionTimes(questionTimes);
    
    // Navigate to results
    navigate('/results');
  };

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  // Calculate total time spent
  const getTotalTimeSpent = () => {
    const accumulated = Object.values(questionTimes).reduce((sum, time) => sum + time, 0);
    if (timerEnabled && currentQuestionStartTime) {
      const currentQuestionTime = currentTime - currentQuestionStartTime;
      return accumulated + currentQuestionTime;
    }
    return accumulated;
  };

  // Calculate session time
  const getSessionTime = () => {
    if (timerEnabled && sessionStartTime) {
      return currentTime - sessionStartTime;
    }
    return 0;
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) {
      return `${hrs}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  // Get question status
  const getQuestionStatus = (q) => {
    if (answers[q.ID]) return 'answered';
    if (flagged.has(q.ID)) return 'flagged';
    return 'skipped';
  };

  if (timerEnabled === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Clock className="animate-pulse text-lab-blue w-12 h-12 mx-auto mb-4" />
          <p className="text-slate-600">Initializing quiz...</p>
        </div>
      </div>
    );
  }

  const totalTimeSpent = getTotalTimeSpent();
  const sessionTime = getSessionTime();

  return (
    <div className="relative min-h-screen pb-32 md:pb-6">
      {/* Mobile Tools Menu Button - FIXED POSITION */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="md:hidden fixed top-20 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-lab-blue text-white rounded-lg font-bold shadow-lg"
      >
        <Menu size={18} />
        Tools
      </button>

      {/* Mobile Tools Menu Dropdown */}
      {showMobileMenu && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="md:hidden fixed top-32 right-4 bg-white rounded-xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden min-w-[200px]">
            <button
              onClick={() => {
                handleBackToTopics();
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b"
            >
              <Home size={18} className="text-red-500" />
              <span className="font-semibold text-red-600">Back to Topics</span>
            </button>
            <button
              onClick={() => {
                setShowPeriodicTable(true);
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b"
            >
              <FlaskConical size={18} className="text-purple-600" />
              <span className="font-semibold text-slate-700">Periodic Table</span>
            </button>
            <button
              onClick={() => {
                setShowQuestionPanel(true);
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b"
            >
              <Flag size={18} className="text-slate-700" />
              <span className="font-semibold text-slate-700">Overview</span>
            </button>
            <button
              onClick={() => {
                toggleFlag();
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-all text-left ${
                flagged.has(currentQuestion?.ID) ? 'bg-amber-50' : ''
              }`}
            >
              <Flag size={18} className="text-amber-500" fill={flagged.has(currentQuestion?.ID) ? 'currentColor' : 'none'} />
              <span className="font-semibold text-slate-700">
                {flagged.has(currentQuestion?.ID) ? 'Unflag' : 'Flag'} Question
              </span>
            </button>
          </div>
        </>
      )}

      {/* Desktop: Back to Topics Button - Top Left */}
      <button
        onClick={handleBackToTopics}
        className="hidden md:flex fixed left-8 top-24 z-30 items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all shadow-lg hover:scale-105 active:scale-95"
      >
        <Home size={18} />
        <span>Back to Topics</span>
      </button>

      {/* Desktop: Fixed Left Sidebar */}
      <div className="hidden md:flex fixed left-8 top-40 flex-col gap-4 z-30 h-[calc(100vh-12rem)]">
        {/* Timer Display */}
        {timerEnabled && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-lab-blue p-6 w-48">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="text-lab-blue" size={24} />
                <span className="text-sm font-bold text-slate-600">SESSION TIME</span>
              </div>
              <div className="text-4xl font-black text-lab-blue mb-4 font-mono">
                {formatTime(sessionTime)}
              </div>
              <div className="text-xs text-slate-500 border-t pt-2">
                <div className="flex justify-between mb-1">
                  <span>Active Time:</span>
                  <span className="font-bold">{formatTime(totalTimeSpent)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Periodic Table Button */}
        <button
          onClick={() => setShowPeriodicTable(true)}
          className="flex items-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          <FlaskConical size={20} />
          <span>Periodic Table</span>
        </button>

        {/* Question Panel Button */}
        <button
          onClick={() => setShowQuestionPanel(!showQuestionPanel)}
          className="flex items-center gap-2 px-6 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          <Flag size={20} />
          <span>Overview</span>
        </button>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Previous Button - Desktop */}
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="flex items-center justify-center w-16 h-16 bg-lab-blue text-white rounded-full font-bold hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      {/* Desktop: Fixed Right Sidebar */}
      <div className="hidden md:flex fixed right-8 top-40 flex-col gap-4 z-30 h-[calc(100vh-12rem)]">
        {/* Flag Button - Desktop */}
        <button
          onClick={toggleFlag}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95 ${
            flagged.has(currentQuestion?.ID)
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-white text-amber-500 border-2 border-amber-500 hover:bg-amber-50'
          }`}
          title={flagged.has(currentQuestion?.ID) ? 'Unflag Question' : 'Flag Question'}
        >
          <Flag size={28} fill={flagged.has(currentQuestion?.ID) ? 'currentColor' : 'none'} />
        </button>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Next/Submit Button - Desktop */}
        {!isLastQuestion ? (
          <button
            onClick={nextQuestion}
            className="flex items-center justify-center w-16 h-16 bg-lab-blue text-white rounded-full font-bold hover:bg-blue-800 transition-all shadow-lg hover:scale-110 active:scale-95"
          >
            <ChevronRight size={32} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!allAnswered}
            className={`flex items-center justify-center w-16 h-16 rounded-full font-bold transition-all shadow-lg hover:scale-110 active:scale-95 ${
              allAnswered 
                ? 'bg-chemistry-green text-white hover:opacity-90' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            title="Finish & Submit"
          >
            <Send size={28} />
          </button>
        )}
      </div>

      {/* Question Overview Panel */}
      {showQuestionPanel && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-15"
            onClick={() => setShowQuestionPanel(false)}
          />
          
          <div className="fixed left-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-left duration-300">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Question Overview</h3>
              <button 
                onClick={() => setShowQuestionPanel(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col gap-3 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-chemistry-green"></div>
                  <span>Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500"></div>
                  <span>Flagged ({flagged.size})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-200"></div>
                  <span>Skipped ({totalQuestions - Object.keys(answers).length})</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q);
                  return (
                    <button
                      key={q.ID}
                      onClick={() => jumpToQuestion(idx)}
                      className={`aspect-square rounded-xl font-bold text-base transition-all border-2 ${
                        idx === currentIndex
                          ? 'border-lab-blue ring-2 ring-lab-blue ring-offset-2'
                          : 'border-transparent'
                      } ${
                        status === 'answered'
                          ? 'bg-chemistry-green text-white hover:opacity-80'
                          : status === 'flagged'
                          ? 'bg-amber-500 text-white hover:opacity-80'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {idx + 1}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPeriodicTable(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Periodic Table of Elements</h3>
              <button 
                onClick={() => setShowPeriodicTable(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/2e/Simple_Periodic_Table_Chart-en.svg"
                alt="Periodic Table"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-6">
        {/* Progress Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-lab-blue">
                Q{currentIndex + 1}
              </span>
              <span className="text-sm font-medium text-slate-500">
                of {totalQuestions}
              </span>
            </div>
            <span className="text-xl font-bold text-lab-blue">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-lab-blue h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Mobile Timer Display - Compact */}
        {timerEnabled && (
          <div className="md:hidden bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="text-lab-blue" size={18} />
                <span className="text-sm font-bold text-slate-600">Time</span>
              </div>
              <div className="text-xl font-black text-lab-blue font-mono">
                {formatTime(sessionTime)}
              </div>
            </div>
          </div>
        )}

        {/* Question Card Component */}
        <div className="mb-4">
          <QuestionCard 
            question={currentQuestion}
            selectedOption={answers[currentQuestion.ID]}
            onSelect={handleOptionSelect}
          />
        </div>

        {/* Mini Progress Dots */}
        <div className="flex justify-center gap-1 py-2">
          {questions.slice(0, Math.min(30, totalQuestions)).map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-lab-blue w-6' : 
                answers[questions[idx].ID] ? 'bg-chemistry-green' : 
                flagged.has(questions[idx].ID) ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            />
          ))}
          {totalQuestions > 30 && <span className="text-slate-400 text-xs">...</span>}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm mt-2 space-y-1">
          <p className="text-slate-500 hidden md:block">
            💡 <span className="font-semibold">Tip:</span> Press <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Enter</kbd> to go to the next question
          </p>
          {!allAnswered && isLastQuestion && (
            <p className="text-amber-600 font-medium">
              Please answer all questions before submitting.
            </p>
          )}
        </div>
      </div>

      {/* MOBILE NAVIGATION BAR - FIXED AT BOTTOM */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 shadow-2xl z-30">
        <div className="grid grid-cols-3 gap-2 p-3">
          {/* Previous Button */}
          <button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="flex flex-col items-center justify-center py-3 px-2 bg-slate-100 rounded-lg font-bold disabled:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <ChevronLeft size={24} className={currentIndex === 0 ? 'text-slate-400' : 'text-lab-blue'} />
            <span className={`text-xs mt-1 ${currentIndex === 0 ? 'text-slate-400' : 'text-lab-blue'}`}>Previous</span>
          </button>

          {/* Question Counter - Middle */}
          <div className="flex flex-col items-center justify-center py-3 px-2 bg-slate-100 rounded-lg">
            <div className="text-2xl font-black text-lab-blue">
              {currentIndex + 1}/{totalQuestions}
            </div>
            <div className="text-xs text-slate-500 mt-1">Question</div>
          </div>

          {/* Next/Submit Button */}
          {!isLastQuestion ? (
            <button
              onClick={nextQuestion}
              className="flex flex-col items-center justify-center py-3 px-2 bg-lab-blue rounded-lg font-bold transition-all active:scale-95"
            >
              <ChevronRight size={24} className="text-white" />
              <span className="text-xs text-white mt-1">Next</span>
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!allAnswered}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg font-bold transition-all active:scale-95 ${
                allAnswered 
                  ? 'bg-chemistry-green' 
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Send size={24} className="text-white" />
              <span className="text-xs text-white mt-1">Submit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}