import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ChemistryLoading from '../components/ChemistryLoading';
import { quizService } from '../services/quizService';
import AttemptDetailModal from '../components/AttemptDetailModal';
import {
  History, ArrowLeft, Calendar, Clock, Target, TrendingUp,
  Filter, ChevronDown, Trophy, AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react';

/**
 * HistoryPage - UPDATED VERSION
 * 
 * NEW FEATURE:
 * - Supports ?attempt=<attemptId> parameter to auto-open specific attempt
 * - Used when clicking "View Results" from calendar completion events
 */
export default function HistoryPage() {
  const { currentUser } = useAuth();
  const { t, tf, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => { 
    loadHistory(); 
  }, [currentUser]);

  // 🎯 NEW: Auto-open attempt if specified in URL
  useEffect(() => {
    const attemptId = searchParams.get('attempt');
    if (attemptId && attempts.length > 0) {
      const attempt = attempts.find(a => a.id === attemptId);
      if (attempt) {
        console.log('🎯 Auto-opening attempt from calendar:', attemptId);
        setSelectedAttempt(attempt);
        
        // Clear the URL parameter after opening (optional)
        // navigate('/history', { replace: true });
      } else {
        console.warn('⚠️ Attempt not found:', attemptId);
      }
    }
  }, [searchParams, attempts]);

  async function loadHistory() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setError(null);
      setLoading(true);
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 100);
      setAttempts(userAttempts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatTime = (ms) => {
    if (!ms) return t('common.notAvailable');
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return tf('history.timeHrsMins', { h, m: m % 60 });
    if (m > 0) return tf('history.timeMinsSecs', { m, s: s % 60 });
    return tf('history.timeSecs', { s });
  };

  const getFilteredAttempts = () => {
    let filtered = [...attempts];
    if (filterPeriod === 'week') {
      const w = new Date(); w.setDate(w.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.timestamp) >= w);
    } else if (filterPeriod === 'month') {
      const m = new Date(); m.setMonth(m.getMonth() - 1);
      filtered = filtered.filter(a => new Date(a.timestamp) >= m);
    }
    if (sortBy === 'recent') filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    else if (sortBy === 'score') filtered.sort((a, b) => b.percentage - a.percentage);
    else if (sortBy === 'time') filtered.sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));
    return filtered;
  };

  const filteredAttempts = getFilteredAttempts();
  const stats = {
    total: filteredAttempts.length,
    average: filteredAttempts.length > 0
      ? Math.round(filteredAttempts.reduce((s, a) => s + a.percentage, 0) / filteredAttempts.length) : 0,
    best: filteredAttempts.length > 0 ? Math.max(...filteredAttempts.map(a => a.percentage)) : 0,
    totalTime: filteredAttempts.reduce((s, a) => s + (a.timeSpent || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ChemistryLoading />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex justify-center">
          <div className="paper-island paper-island-md paper-blue">
            <div className="paper-island-content">
              <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 bellmt-title ink-indigo">
                <History size={32} className="text-indigo-700" />
                {t('history.title')}
              </h1>
              <p className="text-slate-700 mt-1 font-semibold">
              {searchParams.get('attempt') 
                ? t('history.viewingAttemptFromCalendar')
                : t('history.clickToSeeAnalysis')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">{t('dashboard.errorLoadingAttempts')}</h3>
              <p className="text-sm text-red-800 mb-3">{error}</p>
              <button onClick={loadHistory} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all">
                <RefreshCw size={16} /> {t('dashboard.retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: <Target className="text-lab-blue" size={20} />, label: t('history.totalAttempts'), val: stats.total, color: 'text-lab-blue' },
          { icon: <TrendingUp className="text-chemistry-green" size={20} />, label: t('history.averageScore'), val: `${stats.average}%`, color: 'text-chemistry-green' },
          { icon: <Trophy className="text-amber-500" size={20} />, label: t('history.bestScore'), val: `${stats.best}%`, color: 'text-amber-500' },
          { icon: <Clock className="text-purple-600" size={20} />, label: t('history.totalTime'), val: formatTime(stats.totalTime), color: 'text-purple-600' },
        ].map(({ icon, label, val, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-semibold text-slate-600">{label}</span></div>
            <div className={`text-3xl font-black ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Filter className="text-lab-blue" size={20} />
            <span className="font-bold text-slate-800">{t('history.filtersAndSorting')}</span>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {t('history.timePeriod')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: t('history.allTime') },
                    { value: 'month', label: t('history.lastMonth') },
                    { value: 'week', label: t('history.lastWeek') },
                  ].map(o => (
                    <button key={o.value} onClick={() => setFilterPeriod(o.value)}
                      className={`py-2 rounded-lg font-semibold text-sm transition-all ${filterPeriod === o.value ? 'bg-lab-blue text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {t('history.sortBy')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'recent', label: t('history.recent') },
                    { value: 'score', label: t('history.score') },
                    { value: 'time', label: t('history.time') },
                  ].map(o => (
                    <button key={o.value} onClick={() => setSortBy(o.value)}
                      className={`py-2 rounded-lg font-semibold text-sm transition-all ${sortBy === o.value ? 'bg-chemistry-green text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attempts List */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {t('history.yourAttempts')} ({filteredAttempts.length})
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 italic hidden sm:block">
              {t('history.clickViewAnalysis')}
            </span>
            <button onClick={loadHistory} className="text-sm text-lab-blue hover:underline flex items-center gap-1">
              <RefreshCw size={14} /> {t('history.refresh')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">{t('history.noAttemptsFound')}</p>
              <p className="text-slate-500 text-sm mb-4">
                {filterPeriod !== 'all'
                  ? t('history.tryChangingFilter')
                  : t('history.startPracticingHistory')}
              </p>
              {attempts.length === 0 && (
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all">
                  {t('history.takeFirstQuiz')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAttempts.map((attempt, index) => (
                <button
                  key={attempt.id}
                  onClick={() => setSelectedAttempt(attempt)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md text-left group ${
                    searchParams.get('attempt') === attempt.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-100 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600">
                      #{index + 1}
                    </div>
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl ${
                      attempt.percentage >= 70 ? 'bg-green-100 text-green-700'
                      : attempt.percentage >= 50 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {attempt.percentage}%
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-lg">
                        {attempt.correctAnswers}/{attempt.totalQuestions} {t('history.correct')}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar size={14} /> {formatDate(attempt.timestamp)}
                      </div>
                      {attempt.topics && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {attempt.topics.slice(0, 3).map((topic, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-lab-blue px-2 py-0.5 rounded-full font-semibold">{topic}</span>
                          ))}
                          {attempt.topics.length > 3 && (
                            <span className="text-xs text-slate-400 px-1">+{attempt.topics.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.timeSpent && (
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                          <Clock size={14} /> {formatTime(attempt.timeSpent)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTime(attempt.timeSpent / attempt.totalQuestions)}/Q
                        </div>
                      </div>
                    )}
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-purple-500 transition-colors flex-shrink-0" />
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
          onClose={() => {
            setSelectedAttempt(null);
            // Clear URL parameter when closing modal
            if (searchParams.get('attempt')) {
              navigate('/history', { replace: true });
            }
          }}
        />
      )}
    </div>
  );
}