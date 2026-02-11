import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { quizStorage } from '../utils/quizStorage';
import { loadMistakesFromStorage } from '../utils/masteryHelper';
import AttemptDetailModal from '../components/AttemptDetailModal';
import MasteryProgressHub from '../components/dashboard/MasteryProgressHub';
import CurrentGoalWidget from '../components/dashboard/CurrentGoalWidget';
import PriorityReviewSection from '../components/dashboard/PriorityReviewSection';
import DailyMissionCard from '../components/dashboard/DailyMissionCard';
import CalendarHeatmap from '../components/dashboard/CalendarHeatmap';
import CompactAttemptsList from '../components/dashboard/CompactAttemptsList';
import { LogOut, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

const MASTERY_THRESHOLD = 3;

// Helper function for AI Daily Mission
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

export default function DashboardPage() {
  const { currentUser, userProfile, logout } = useAuth();
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loadingAIMission, setLoadingAIMission] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAttempts();
    loadMistakes();
  }, [currentUser]);

  async function loadAttempts() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setError(null);
      setLoading(true);
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 10);
      setAttempts(userAttempts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadMistakes() {
    try {
      const loadedMistakes = loadMistakesFromStorage();
      setMistakes(loadedMistakes);
    } catch (err) {
      console.error('Error loading mistakes:', err);
      setMistakes([]);
    }
  }

  async function handleAIDailyMission() {
    setLoadingAIMission(true);
    try {
      // Load user's mistakes
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 100);
      const incorrectMap = new Map();
      const improvementData = JSON.parse(
        localStorage.getItem('mistake_improvements') || '{}'
      );
      const recentTopics = JSON.parse(localStorage.getItem('recent_quiz_topics') || '[]');
      
      userAttempts.forEach((attempt) => {
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

      const mistakesList = Array.from(incorrectMap.values());
      
      if (mistakesList.length < 10) {
        alert(`You need at least 10 mistakes to start AI Daily Mission. You currently have ${mistakesList.length}.`);
        setLoadingAIMission(false);
        return;
      }

      // Use AI selection
      const selected = selectAIDailyMission(mistakesList, recentTopics);
      
      // Start quiz directly
      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selected);
      localStorage.setItem('quiz_mode', 'ai-daily');
      localStorage.setItem('quiz_timer_enabled', 'true');
      localStorage.setItem('quiz_is_timed_mode', 'true');
      navigate('/quiz');
    } catch (error) {
      console.error('Error loading AI Daily Mission:', error);
      alert('Failed to load AI Daily Mission. Please try again.');
      setLoadingAIMission(false);
    }
  }

  async function handleLogout() {
    try { 
      await logout(); 
      navigate('/login'); 
    } catch (e) { 
      console.error(e); 
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold">Personalizing your learning experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-indigo-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                Welcome back, {currentUser?.displayName}! 🎓
              </h1>
              <p className="text-lg text-slate-600 font-medium">{currentUser?.email}</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-md"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">
                  Error Loading Data
                </h3>
                <p className="text-sm text-red-800 mb-3">{error}</p>
                <button
                  onClick={loadAttempts}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI DAILY MISSION HERO SECTION */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={32} strokeWidth={3} />
                <h2 className="text-3xl font-black">AI Daily Mission</h2>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">
                  10 Questions
                </div>
              </div>
              <p className="text-purple-100 mb-4 max-w-2xl">
                AI-optimized mistake review using spaced repetition and topic interleaving for maximum retention
              </p>
              <button
                onClick={handleAIDailyMission}
                disabled={loadingAIMission}
                className="px-8 py-4 bg-white text-purple-700 rounded-xl font-black text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                {loadingAIMission ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-700" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Start Mission
                  </>
                )}
              </button>
            </div>
            <div className="hidden lg:block">
              <div className="w-48 h-48 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur">
                <Sparkles size={96} className="text-white/40" />
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: 2/3 width - Learning Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mastery Health Bar */}
            <MasteryProgressHub userProfile={userProfile} mistakes={mistakes} />

            {/* Current Goal Widget */}
            <CurrentGoalWidget mistakes={mistakes} />

            {/* Calendar Heatmap */}
            <CalendarHeatmap mistakes={mistakes} />
          </div>

          {/* RIGHT COLUMN: 1/3 width - Quick Actions & Review */}
          <div className="space-y-6">
            {/* Priority Review Section */}
            <PriorityReviewSection 
              mistakes={mistakes} 
              recentTopics={attempts.length > 0 ? attempts[0].topics || [] : []}
            />

            {/* Quick Stats Cards */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                  <span className="text-sm font-bold text-slate-700">Study Streak</span>
                  <span className="text-2xl font-black text-indigo-600">🔥</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-bold text-slate-700">Topics Mastered</span>
                  <span className="text-2xl font-black text-green-600">✓</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm font-bold text-slate-700">In Progress</span>
                  <span className="text-2xl font-black text-amber-600">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ATTEMPTS SECTION */}
        <CompactAttemptsList 
          attempts={attempts} 
          onSelectAttempt={setSelectedAttempt}
          loading={loading}
        />

        {/* Attempt Detail Modal */}
        {selectedAttempt && (
          <AttemptDetailModal
            attempt={selectedAttempt}
            onClose={() => setSelectedAttempt(null)}
          />
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom duration-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                    <LogOut className="text-rose-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">
                      Confirm Logout
                    </h3>
                    <p className="text-sm text-slate-500">
                      Are you sure you want to leave?
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 mb-6">
                  You'll need to sign in again to access your dashboard.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}