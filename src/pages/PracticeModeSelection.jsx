import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Settings, Play, Zap, BookOpen, Lock, Check, AlertCircle } from 'lucide-react';
import FisheyeCarousel from '../components/FisheyeCarousel';
import { quizStorage } from '../utils/quizStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { quizService } from '../services/quizService';

// Helper function for AI Daily Mission selection
function calculateMasteryPriority(mistake, recentTopics = []) {
  const now = Date.now();
  const lastAttemptTime = new Date(mistake.lastAttempted).getTime();
  const daysSinceLastAttempt = Math.max(0, (now - lastAttemptTime) / (1000 * 60 * 60 * 24));
  const U = Math.pow(2, daysSinceLastAttempt / 7);
  const D = Math.min(1.0, (mistake.attemptCount || 1) / 3);
  let R = 0.5;
  if (recentTopics.length > 0 && recentTopics.includes(mistake.Topic)) {
    R = 1.5;
  }
  return (U * 0.4) + (D * 0.4) + (R * 0.2);
}

function selectAIDailyMission(mistakes, recentTopics = []) {
  const prioritized = mistakes
    .map(m => ({
      ...m,
      masteryPriority: calculateMasteryPriority(m, recentTopics)
    }))
    .sort((a, b) => b.masteryPriority - a.masteryPriority);
  
  const byTopic = {};
  prioritized.forEach(m => {
    if (!byTopic[m.Topic]) byTopic[m.Topic] = [];
    byTopic[m.Topic].push(m);
  });
  
  const selected = [];
  const topicList = Object.keys(byTopic);
  const indices = Object.fromEntries(topicList.map(t => [t, 0]));
  
  while (selected.length < 10 && topicList.some(t => indices[t] < byTopic[t].length)) {
    for (const topic of topicList) {
      if (selected.length >= 10) break;
      if (indices[topic] < byTopic[topic].length) {
        selected.push(byTopic[topic][indices[topic]++]);
      }
    }
  }
  
  return selected.slice(0, 10);
}

export default function PracticeModeSelection({ questions }) {
  const navigate = useNavigate();
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const { t, tf } = useLanguage();
  const [selectedMode, setSelectedMode] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [showCustom, setShowCustom] = useState(false);
  const [showUpdateTopics, setShowUpdateTopics] = useState(false);
  const [loadingMistakes, setLoadingMistakes] = useState(false);

  // Timer settings for each mode
  const [timedModeTimer, setTimedModeTimer] = useState(true);
  const [timedModeIsTimed, setTimedModeIsTimed] = useState(true);
  const [marathonModeTimer, setMarathonModeTimer] = useState(true);
  const [marathonModeIsTimed, setMarathonModeIsTimed] = useState(false);

  // Custom mode state
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [customCount, setCustomCount] = useState(10);
  const [customTimerEnabled, setCustomTimerEnabled] = useState(false);
  const [customIsTimed, setCustomIsTimed] = useState(false);

  // Quick update topics state
  const [tempLearnedUpTo, setTempLearnedUpTo] = useState(userProfile?.learnedUpTo || '');
  const [tempExceptions, setTempExceptions] = useState(userProfile?.topicExceptions || []);
  const [updating, setUpdating] = useState(false);

  const MAX_QUESTIONS = 40;

  // Get all unique topics from questions
  const allTopics = useMemo(() => {
    return [...new Set(questions.map(q => q.Topic))]
      .filter(t => t && t !== "Uncategorized")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  // Get available topics based on user's learned progress
  const availableTopics = useMemo(() => {
    const learnedUpTo = userProfile?.learnedUpTo;
    const exceptions = userProfile?.topicExceptions || [];
    
    if (!learnedUpTo) return [];
    
    return allTopics.filter(topic => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= learnedUpTo && !exceptions.includes(topic);
    });
  }, [allTopics, userProfile]);

  // For custom mode: determine which topics can be selected
  const customTopics = useMemo(() => {
    return allTopics.map(topic => {
      const isAvailable = availableTopics.includes(topic);
      return {
        name: topic,
        available: isAvailable
      };
    });
  }, [allTopics, availableTopics]);

  const availableSubtopics = useMemo(() => {
    if (selectedTopics.length === 0) return [];
    return [...new Set(questions
      .filter(q => selectedTopics.includes(q.Topic))
      .map(q => q.Subtopic))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [selectedTopics, questions]);

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
    setSelectedSubtopics([]);
  };

  const toggleSubtopic = (sub) => {
    setSelectedSubtopics(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleUpdateTopics = async () => {
    setUpdating(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        learnedUpTo: tempLearnedUpTo,
        topicExceptions: tempExceptions,
        updatedAt: new Date().toISOString()
      });
      await loadUserProfile(currentUser.uid);
      setShowUpdateTopics(false);
      alert(t('practiceMode.topicsUpdated'));
    } catch (error) {
      console.error('Error updating topics:', error);
      alert(t('practiceMode.failedUpdate'));
    }
    setUpdating(false);
  };

  const handleModeSelect = (mode, count, timerEnabled = false, isTimed = false) => {
    if (mode === 'mistakes') {
      navigate('/notebook');
      return;
    }

    if (mode === 'ai-daily') {
      handleAIDailyMission();
      return;
    }

    if (availableTopics.length === 0) {
      alert(t('practice.pleaseSetTopics'));
      navigate('/profile');
      return;
    }

    setSelectedMode(mode);
    setQuestionCount(count);
    
    if (mode === 'custom') {
      setShowCustom(true);
    } else {
      const filtered = questions.filter(q => availableTopics.includes(q.Topic));
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      const finalSelection = shuffled.slice(0, Math.min(count, MAX_QUESTIONS, shuffled.length));
      
      startQuiz(finalSelection, mode, timerEnabled, isTimed);
    }
  };

  const handleCarouselModeSelect = (mode) => {
    switch (mode.id) {
      case 'timed':
        handleModeSelect('timed', 10, timedModeTimer, timedModeIsTimed);
        break;
      case 'marathon':
        handleModeSelect('marathon', 10, marathonModeTimer, marathonModeIsTimed);
        break;
      case 'ai-daily':
        handleAIDailyMission();
        break;
      case 'mistake-review':
        navigate('/notebook');
        break;
      case 'custom':
        handleModeSelect('custom', 10);
        break;
      default:
        break;
    }
  };

  const handleAIDailyMission = async () => {
    setLoadingMistakes(true);
    try {
      // Load user's mistakes
      const attempts = await quizService.getUserAttempts(currentUser.uid, 100);
      const incorrectMap = new Map();
      const improvementData = JSON.parse(
        localStorage.getItem('mistake_improvements') || '{}'
      );
      const recentTopics = JSON.parse(localStorage.getItem('recent_quiz_topics') || '[]');
      const MASTERY_THRESHOLD = 3;
      
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

      const mistakes = Array.from(incorrectMap.values());
      
      if (mistakes.length < 10) {
        alert(tf('notebook.needMoreQuestions', { count: mistakes.length }));
        setLoadingMistakes(false);
        return;
      }

      // Use AI selection
      const selected = selectAIDailyMission(mistakes, recentTopics);
      startQuiz(selected, 'ai-daily', true, true);
    } catch (error) {
      console.error('Error loading mistakes for AI Daily Mission:', error);
      alert(t('practiceMode.failedLoadMistakesTryAgain'));
    }
    setLoadingMistakes(false);
  };

  const handleCustomStart = () => {
    let pool = questions.filter(q => selectedTopics.includes(q.Topic));
    
    if (selectedSubtopics.length > 0) {
      pool = pool.filter(q => selectedSubtopics.includes(q.Subtopic));
    }
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const requestedCount = customCount === 'All' ? pool.length : parseInt(customCount);
    const finalCount = Math.min(requestedCount, MAX_QUESTIONS);
    const finalSelection = shuffled.slice(0, finalCount);
    
    if (finalSelection.length === 0) {
      alert(t('notebook.noQuestionsFound'));
      return;
    }

    if (requestedCount > MAX_QUESTIONS) {
      alert(tf('notebook.sessionLimited', { max: MAX_QUESTIONS }));
    }

    startQuiz(finalSelection, 'custom', customTimerEnabled, customIsTimed);
  };

  const startQuiz = (selectedQuestions, mode, timerEnabled, isTimed) => {
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selectedQuestions);
    
    localStorage.setItem('quiz_mode', mode);
    localStorage.setItem('quiz_timer_enabled', timerEnabled.toString());
    localStorage.setItem('quiz_is_timed_mode', isTimed.toString());
    
    navigate('/quiz');
  };

  // Quick update topics modal
  if (showUpdateTopics) {
    const learnedRangeTopics = allTopics.filter(topic => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= tempLearnedUpTo;
    });

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-lab-blue p-6 text-white flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {t('practiceMode.updateYourTopics')}
            </h2>
            <button
              onClick={() => setShowUpdateTopics(false)}
              className="text-white hover:text-blue-100 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                {t('practiceMode.learnedUpTo')}
              </label>
              <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                {allTopics.map((topic) => {
                  const topicNum = topic.match(/^\d+/)?.[0];
                  return (
                    <button
                      key={topic}
                      onClick={() => setTempLearnedUpTo(topicNum)}
                      className={`py-2 rounded-lg border-2 font-bold transition-all ${
                        tempLearnedUpTo === topicNum
                          ? 'border-chemistry-green bg-green-50 text-chemistry-green'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {topicNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {tempLearnedUpTo && learnedRangeTopics.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  {t('practiceMode.exceptions')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {learnedRangeTopics.map((topic) => {
                    const isException = tempExceptions.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => setTempExceptions(prev =>
                          prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                        )}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isException
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                        }`}
                      >
                        <span className="text-sm font-semibold">{topic}</span>
                        {isException ? <Lock size={16} /> : <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUpdateTopics}
                disabled={updating}
                className="flex-1 py-3 bg-chemistry-green text-white rounded-xl font-bold hover:opacity-90 disabled:bg-slate-300 transition-all"
              >
                {updating ? t('practiceMode.updating') : t('practiceMode.saveChanges')}
              </button>
              <button
                onClick={() => setShowUpdateTopics(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom mode configuration
  if (showCustom) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Settings size={20} className="text-lab-blue" />
              {t('practiceMode.configureCustomSession')}
            </h2>
            <button
              onClick={() => setShowCustom(false)}
              className="text-sm text-slate-600 hover:text-slate-800 hover:underline font-semibold"
            >
              ← {t('practiceMode.back')}
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                {t('practiceMode.selectTopics')}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {customTopics.map(({ name, available }) => (
                  <button
                    key={name}
                    onClick={() => available && toggleTopic(name)}
                    disabled={!available}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      !available
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                        : selectedTopics.includes(name)
                        ? 'border-lab-blue bg-blue-50 text-lab-blue shadow-sm'
                        : 'border-slate-100 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {!available && <Lock size={14} />}
                      {name}
                    </span>
                    {selectedTopics.includes(name) && <Check size={16} />}
                  </button>
                ))}
              </div>
              {customTopics.some(t => !t.available) && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Lock size={12} />
                  {t('practiceMode.lockedTopicsNotLearned')}
                </p>
              )}
            </div>

            {selectedTopics.length > 0 && availableSubtopics.length > 0 && (
              <div className="animate-in slide-in-from-top-4">
                <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
                  {t('practiceMode.focusSubtopics')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSubtopics.map(sub => (
                    <button
                      key={sub}
                      onClick={() => toggleSubtopic(sub)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                        selectedSubtopics.includes(sub)
                        ? 'bg-lab-blue border-lab-blue text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-black text-slate-500 mb-4 uppercase tracking-widest">
                {t('practiceMode.sessionLength')}
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {['5', '10', '20', '36'].map(num => (
                  <button
                    key={num}
                    onClick={() => setCustomCount(num)}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${
                      customCount === num ? 'border-lab-blue bg-blue-50 text-lab-blue' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Settings for Custom Mode */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-lab-blue" />
                    <div>
                      <h3 className="font-bold text-slate-800">{t('quiz.enableTimer')}</h3>
                      <p className="text-xs text-slate-500">{t('quiz.trackTimeSpent')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCustomTimerEnabled(!customTimerEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all ${
                      customTimerEnabled ? 'bg-chemistry-green' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      customTimerEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {customTimerEnabled && (
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
                      onClick={() => setCustomIsTimed(!customIsTimed)}
                      className={`relative w-14 h-8 rounded-full transition-all ${
                        customIsTimed ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        customIsTimed ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={selectedTopics.length === 0}
              onClick={handleCustomStart}
              className="w-full py-5 bg-lab-blue text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Play fill="currentColor" size={18} />
              {t('practiceMode.startPractice')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main mode selection screen
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Available Topics Info + Update Button */}
      {availableTopics.length > 0 ? (
        <div className="sticky top-4 z-30 rounded-2xl p-4 border border-white/40 bg-white/55 backdrop-blur-xl shadow-lg">
          <div className="absolute inset-0 rounded-2xl opacity-70 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.22),transparent_60%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.18),transparent_60%),radial-gradient(circle_at_50%_85%,rgba(34,211,238,0.16),transparent_55%)]" />
          <div className="relative flex justify-between items-start mb-2 gap-4">
            <div>
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <BookOpen size={16} />
                {t('practice.yourAvailableTopics')} ({availableTopics.length})
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTopics.slice(0, 8).map((topic) => (
                  <span key={topic} className="px-2 py-1 bg-white/70 border border-white/50 text-slate-800 rounded-lg text-xs font-bold shadow-sm">
                    {topic}
                  </span>
                ))}
                {availableTopics.length > 8 && (
                  <span className="px-2 py-1 text-slate-700 text-xs font-bold">
                    +{availableTopics.length - 8} {t('practice.more')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUpdateTopics(true)}
              className="px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap border border-white/40 bg-white/40 backdrop-blur hover:bg-white/55 text-slate-900 shadow-sm"
            >
              {t('practice.updateTopics')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-amber-900 font-bold mb-2">
                {t('practice.noTopicsConfigured')}
              </p>
              <p className="text-amber-800 text-sm mb-3">
                {t('practice.pleaseSetTopics')}
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-all"
              >
                {t('practice.goToProfile')}
              </button>
            </div>
          </div>
        </div>
      )}

      <FisheyeCarousel onModeSelect={handleCarouselModeSelect} showHeader={false} compact />
    </div>
  );
}