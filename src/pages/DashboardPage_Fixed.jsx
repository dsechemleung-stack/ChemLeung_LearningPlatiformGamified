import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import AttemptDetailModal from '../components/AttemptDetailModal';
import {
  Trophy, Clock, Target, TrendingUp, Calendar, LogOut,
  Play, AlertCircle, RefreshCw, Flame, BookOpen, MessageSquare,
  ChevronRight, X,
} from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, userProfile, logout } = useAuth();
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyStreak, setStudyStreak] = useState(0);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAttempts();
    calculateStudyStreak();
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

  async function calculateStudyStreak() {
    if (!currentUser) return;
    try {
      const allAttempts = await quizService.getUserAttempts(currentUser.uid, 100);
      if (!allAttempts.length) { setStudyStreak(0); return; }
      const uniqueDates = [...new Set(allAttempts.map(a => new Date(a.timestamp).toDateString()))]
        .sort((a, b) => new Date(b) - new Date(a));
      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const diff = Math.floor((new Date(uniqueDates[i - 1]) - new Date(uniqueDates[i])) / 86400000);
          if (diff === 1) streak++; else break;
        }
      }
      setStudyStreak(streak);
    } catch { setStudyStreak(0); }
  }

  async function handleLogout() {
    try { 
      await logout(); 
      navigate('/login'); 
    } catch (e) { 
      console.error(e); 
    }
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  const overallAccuracy = userProfile?.totalQuestions > 0
    ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-indigo-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
              {t('dashboard.welcomeBack')}, {currentUser?.displayName}!
            </h1>
            <p className="text-lg text-slate-600 font-medium">{currentUser?.email}</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-md"
          >
            <LogOut size={18} />
            {t('dashboard.logout')}
          </button>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-5 shadow-sm border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-amber-700" size={20} />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                {t('dashboard.totalAttempts')}
              </span>
            </div>
            <div className="text-4xl font-black text-amber-900">{userProfile?.totalAttempts || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl p-5 shadow-sm border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-emerald-700" size={20} />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                {t('dashboard.overallAccuracy')}
              </span>
            </div>
            <div className="text-4xl font-black text-emerald-900">{overallAccuracy}%</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-5 shadow-sm border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-purple-700" size={20} />
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">
                {t('dashboard.questionsSolved')}
              </span>
            </div>
            <div className="text-4xl font-black text-purple-900">{userProfile?.totalQuestions || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-5 shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-700" size={20} />
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                {t('dashboard.correctAnswers')}
              </span>
            </div>
            <div className="text-4xl font-black text-blue-900">{userProfile?.totalCorrect || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-5 shadow-sm border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="text-orange-700" size={20} />
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                {t('dashboard.studyStreak')}
              </span>
            </div>
            <div className="text-4xl font-black text-orange-900 flex items-baseline gap-2">
              {studyStreak}
              <span className="text-base font-bold text-orange-700">{t('dashboard.days')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-indigo-400 to-indigo-500 text-white rounded-xl p-6 font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Play fill="currentColor" size={24} />
          {t('dashboard.startNewQuiz')}
        </button>
        <button
          onClick={() => navigate('/forum')}
          className="bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-xl p-6 font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <MessageSquare size={24} />
          {t('dashboard.browseForm')}
        </button>
        <button
          onClick={() => navigate('/notebook')}
          className="bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-xl p-6 font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <BookOpen size={24} />
          {t('dashboard.mistakeNotebook')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">
                {t('dashboard.errorLoadingAttempts')}
              </h3>
              <p className="text-sm text-red-800 mb-3">{error}</p>
              <button
                onClick={loadAttempts}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
              >
                <RefreshCw size={16} />
                {t('dashboard.retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Attempts */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-5 border-b-2 border-indigo-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" size={24} />
            {t('dashboard.recentAttempts')}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 italic hidden sm:block">
              {t('dashboard.clickRowFullAnalysis')}
            </span>
            <button
              onClick={loadAttempts}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw size={14} />
              {t('dashboard.refresh')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2 font-semibold">
                {t('dashboard.noAttempts')}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {t('dashboard.completeQuizSeeResults')}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-md"
              >
                {t('dashboard.takeFirstQuiz')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  onClick={() => setSelectedAttempt(attempt)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all hover:shadow-md text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-sm ${
                      attempt.percentage >= 70
                        ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 border-2 border-emerald-300'
                        : attempt.percentage >= 50
                        ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 border-2 border-amber-300'
                        : 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-800 border-2 border-rose-300'
                    }`}>
                      {attempt.percentage}%
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-800">
                        {attempt.correctAnswers}/{attempt.totalQuestions} {t('dashboard.correct')}
                      </div>
                      <div className="text-sm text-slate-600 font-medium">{formatDate(attempt.timestamp)}</div>
                      {attempt.topics && (
                        <div className="text-xs text-slate-500 mt-1 truncate max-w-xs">
                          {attempt.topics.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.timeSpent && (
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-slate-700">⏱️ {formatTime(attempt.timeSpent)}</div>
                        <div className="text-xs text-slate-500">{t('dashboard.timeSpent')}</div>
                      </div>
                    )}
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
                    {t('dashboard.confirmLogout')}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t('dashboard.areYouSureLogout')}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                {t('dashboard.needSignInAgain')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  {t('dashboard.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}