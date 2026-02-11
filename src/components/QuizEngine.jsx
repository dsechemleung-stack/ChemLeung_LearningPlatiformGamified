import React, { useState, useEffect, useRef } from 'react';
import QuestionCard from './QuestionCard';
import { ChevronLeft, ChevronRight, Send, Timer, FlaskConical, Flag, Clock, X } from 'lucide-react';
import { calendarService } from '../services/calendarService';
import { useAuth } from '../context/AuthContext';

export default function QuizEngine({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(null);
  const [questionTimes, setQuestionTimes] = useState({});
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const timerInitialized = useRef(false);
  
  const { currentUser } = useAuth();
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

  /**
   * Handle quiz completion with calendar AND performance tracking integration
   */
  async function handleQuizComplete(finalAnswers, finalQuestionTimes) {
    try {
      const quizMode = localStorage.getItem('quiz_mode');
      const eventId = localStorage.getItem('quiz_event_id');
      
      if (currentUser?.uid) {
        const correctCount = Object.entries(finalAnswers).filter(([qId, answer]) => {
          const question = questions.find(q => q.ID === qId);
          return question && answer === question.CorrectOption;
        }).length;

        // Log completion WITH performance tracking
        await calendarService.logCompletion(
          currentUser.uid, 
          new Date().toISOString(), 
          {
            type: quizMode || 'practice',
            topic: questions[0]?.Topic || 'Mixed',
            questionCount: questions.length,
            correctCount
          },
          questions,  // Pass questions for performance analysis
          finalAnswers  // Pass answers for performance analysis
        );

        // Mark linked event as completed if exists
        if (eventId && (quizMode === 'study-plan' || quizMode === 'spaced-repetition' || quizMode === 'ai-recommendation')) {
          await calendarService.markEventCompleted(eventId);
        }
      }

      // Clear event tracking
      localStorage.removeItem('quiz_event_id');
      localStorage.removeItem('quiz_mode');
      
      // Call original completion handler
      onComplete(finalAnswers, timerEnabled ? finalQuestionTimes : null);
    } catch (error) {
      console.error('Error handling quiz completion:', error);
      // Still complete the quiz even if logging fails
      onComplete(finalAnswers, timerEnabled ? finalQuestionTimes : null);
    }
  }

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

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  // Calculate total time spent (accumulated + current question time)
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
    <div className="relative h-screen overflow-hidden">
      {/* Fixed Left Sidebar */}
      <div className="fixed left-8 top-32 flex flex-col gap-4 z-30 h-[calc(100vh-10rem)]">
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

        {/* Spacer to push button to bottom */}
        <div className="flex-1"></div>

        {/* Previous Button - Left Side - Aligned to bottom */}
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="flex items-center justify-center w-16 h-16 bg-lab-blue text-white rounded-full font-bold hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      {/* Fixed Right Sidebar */}
      <div className="fixed right-8 top-32 flex flex-col gap-4 z-30 h-[calc(100vh-10rem)]">
        {/* Flag Button */}
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

        {/* Spacer to push button to bottom */}
        <div className="flex-1"></div>

        {/* Next/Submit Button - Right Side - Aligned to bottom */}
        {!isLastQuestion ? (
          <button
            onClick={nextQuestion}
            className="flex items-center justify-center w-16 h-16 bg-lab-blue text-white rounded-full font-bold hover:bg-blue-800 transition-all shadow-lg hover:scale-110 active:scale-95"
          >
            <ChevronRight size={32} />
          </button>
        ) : (
          <button
            onClick={() => {
              recordQuestionTime();
              handleQuizComplete(answers, timerEnabled ? questionTimes : null);
            }}
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

      {/* Question Overview Panel - Floating Left Sidebar */}
      {showQuestionPanel && (
        <>
          {/* Backdrop - semi-transparent to see content behind */}
          <div 
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onClick={() => setShowQuestionPanel(false)}
          />
          
          {/* Panel - narrower sidebar on the left */}
          <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-left duration-300">
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

      {/* Main Content Area - Centered and compact */}
      <div className="max-w-5xl mx-auto px-4 py-6 h-full flex flex-col">
        {/* Progress Header - More Compact */}
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

        {/* Question Card Component - Takes remaining space */}
        <div className="flex-1 overflow-y-auto">
          <QuestionCard 
            question={currentQuestion}
            selectedOption={answers[currentQuestion.ID]}
            onSelect={handleOptionSelect}
          />
        </div>

        {/* Mini Progress Dots */}
        <div className="flex justify-center gap-1 mt-4 py-2">
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

        {!allAnswered && isLastQuestion && (
          <p className="text-center text-sm text-amber-600 font-medium mt-2">
            Please answer all questions before submitting.
          </p>
        )}
      </div>
    </div>
  );
}