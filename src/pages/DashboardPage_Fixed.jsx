import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { loadMistakesFromStorage } from '../utils/masteryHelper';
import AttemptDetailModal from '../components/AttemptDetailModal';
import SmartMonthlyCalendar from '../components/dashboard/SmartMonthlyCalendar';
import EventCreationModal from '../components/dashboard/EventCreationModal';
import CompactAttemptsList from '../components/dashboard/CompactAttemptsList';
import ChemistryLoading from '../components/ChemistryLoading';
import { LogOut, AlertCircle, RefreshCw, X, Info, Gift, Target, Brain, TrendingUp, BarChart2, ChevronRight, Sparkles } from 'lucide-react';
import { awardTokens, canClaimReward, recordRewardClaim } from '../services/tokenService';
import { performanceService } from '../services/performanceService';
import { calendarServiceOptimized } from '../services/calendarServiceOptimized';

// ✅ FIXED: Now receives questions as prop
export default function DashboardPage({ questions = [] }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const notebookPath = '/notebook';

  const [attempts, setAttempts] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [dailyClaiming, setDailyClaiming] = useState(false);
  const [dailyClaimMessage, setDailyClaimMessage] = useState(null);
  const [aiRecommendations, setAIRecommendations] = useState([]);
  const [showAiSuggestionsInfo, setShowAiSuggestionsInfo] = useState(false);

  const topicsToFocus = useMemo(() => {
    try {
      const raw = localStorage.getItem('dashboard_topics_to_focus_cache_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const top = parsed?.top;
      if (Array.isArray(top) && top.length > 0) return top;
    } catch {
      // ignore
    }

    // Fallback (no cache yet): minimal local calc from stored mistakes
    const byTopicWrong = {};
    (mistakes || []).forEach((m) => {
      const topic = m?.Topic || m?.topic;
      if (!topic) return;
      const wrong = Number(m?.attemptCount || 0);
      byTopicWrong[topic] = (byTopicWrong[topic] || 0) + wrong;
    });

    const totalByTopic = {};
    (questions || []).forEach((q) => {
      const topic = q?.Topic || q?.topic;
      if (!topic) return;
      totalByTopic[topic] = (totalByTopic[topic] || 0) + 1;
    });

    return Object.entries(byTopicWrong)
      .map(([topic, wrong]) => {
        const total = totalByTopic[topic] || 0;
        const density = total > 0 ? wrong / total : wrong;
        return { topic, score: wrong, total, density };
      })
      .sort((a, b) => b.density - a.density)
      .slice(0, 4);
  }, [mistakes, questions]);

  // ✅ REMOVED: No longer loading questions here - using prop instead
  // const { questions: allQuestions, loading: questionsLoading } = useQuizData(...)

  useEffect(() => {
    loadAttempts();
    loadMistakes();
    loadAIRecommendations();
  }, [currentUser]);

  async function loadAIRecommendations() {
    if (!currentUser?.uid) return;
    try {
      const recommendations = await performanceService.getRecommendations(currentUser.uid);
      setAIRecommendations(recommendations || []);
    } catch (e) {
      console.error('Error loading AI recommendations:', e);
      setAIRecommendations([]);
    }
  }

  async function handleAcceptRecommendation(recommendation, event) {
    event?.stopPropagation();
    if (!currentUser?.uid) return;
    try {
      await calendarServiceOptimized.createAIRecommendationEvent(currentUser.uid, recommendation);
      await loadAIRecommendations();
      setCalendarKey((prev) => prev + 1);
      alert(t('calendar.aiRecommendationAddedSuccess'));
    } catch (error) {
      console.error('❌ Error accepting recommendation:', error);
      alert(t('calendar.failedStartStudySessionTryAgain'));
    }
  }

  async function handleDismissRecommendation(recommendationId, event) {
    event?.stopPropagation();
    if (!currentUser?.uid) return;
    try {
      await performanceService.dismissRecommendation(currentUser.uid, recommendationId);
      await loadAIRecommendations();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  }

  async function loadAttempts() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setError(null);
      setLoading(true);
      const userAttempts = await quizService.getUserAttempts(currentUser.uid, 200);
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
      console.error('Error loading mistakes:', err);1
      setMistakes([]);
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

  function getDailyRewardKey(dateObj = new Date()) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `daily_reward_${yyyy}-${mm}-${dd}`;
  }

  async function handleDailyReward() {
    if (!currentUser?.uid) return;
    const rewardKey = getDailyRewardKey(new Date());

    setDailyClaiming(true);
    setDailyClaimMessage(null);
    try {
      const check = await canClaimReward(currentUser.uid, rewardKey);
      if (!check?.canClaim) {
        setDailyClaimMessage(check?.message || 'Already claimed');
        setDailyClaiming(false);
        return;
      }

      const amount = 5;
      await awardTokens(currentUser.uid, amount, 'Daily Reward', {
        category: 'daily_reward',
        rewardKey
      });
      await recordRewardClaim(currentUser.uid, rewardKey, 24);
      setDailyClaimMessage(`+${amount} diamonds!`);
    } catch (e) {
      console.error(e);
      setDailyClaimMessage('Claim failed');
    }
    setDailyClaiming(false);
  }

  function handleEventCreated() {
    setCalendarKey(prev => prev + 1); // Force calendar reload
    setShowEventModal(false);
  }

  // ✅ FIXED: Check if questions are still loading
  if (loading || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <ChemistryLoading persistKey="startup" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 wood-bg min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-center">
          <div className="paper-island paper-island-lg paper-amber w-full">
            <div className="paper-island-content">
              <div className="flex justify-between items-start gap-6">
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 leading-tight tracking-tight bellmt-title ink-slate">
                    {t('dashboard.welcomeBack')}, {currentUser?.displayName}!
                  </h1>
                  <p className="text-sm sm:text-base text-slate-700 font-semibold truncate">{currentUser?.email}</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <div className="flex flex-col items-end">
                    <button
                      type="button"
                      onClick={handleDailyReward}
                      disabled={dailyClaiming}
                      className="flex items-center gap-2 px-4 py-2 bg-chemistry-green text-white rounded-xl font-bold transition-all shadow-sm hover:opacity-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <Gift size={18} />
                      {dailyClaiming ? t('dashboard.claiming') : t('dashboard.dailyReward')}
                    </button>
                    {dailyClaimMessage && (
                      <div className="mt-1 text-xs font-bold text-slate-700">{dailyClaimMessage}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white text-slate-800 rounded-xl font-bold transition-all shadow-sm border border-white/60 hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <LogOut size={18} />
                    {t('dashboard.logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR DISPLAY */}
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

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[minmax(140px,auto)]">
          <div className="lg:col-span-12 lg:row-span-2">
            <div className="h-full bento-glass bento-glass-hover">
              <div className="bento-glass-content p-6">
                <SmartMonthlyCalendar
                  key={calendarKey}
                  userId={currentUser?.uid}
                  questions={questions}
                  onAddEvent={() => setShowEventModal(true)}
                  embedded
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full bento-glass bento-glass-hover">
              <div className="bento-glass-content p-6 bg-gradient-to-br from-white/70 via-indigo-50/40 to-purple-50/50 rounded-2xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center shadow-sm">
                      <Brain className="text-indigo-600" size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-slate-800 leading-tight">{t('dashboard.learningInsights')}</h3>
                      <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Sparkles size={12} className="text-indigo-600" />
                        <span className="truncate">{t('dashboard.startLearningJourney')}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(notebookPath)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm"
                  >
                    {t('dashboard.viewAll')}
                    <ChevronRight size={16} />
                  </button>
                </div>

                {mistakes.length === 0 ? (
                  <div className="space-y-4">
                    {/* Show features even without data */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart2 className="text-indigo-600" size={16} />
                        <span className="text-sm font-black text-slate-700">{t('dashboard.availableFeatures')}</span>
                      </div>
                      
                      <div 
                        onClick={() => navigate(notebookPath)}
                        className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" size={16} />
                            <div>
                              <div className="text-sm font-black text-indigo-800">{t('dashboard.learningAnalytics')}</div>
                              <div className="text-xs text-indigo-600">{t('dashboard.learningAnalyticsDesc')}</div>
                            </div>
                          </div>
                          <ChevronRight className="text-indigo-500" size={16} />
                        </div>
                      </div>

                      <div 
                        onClick={() => navigate(notebookPath)}
                        className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="text-purple-600" size={16} />
                            <div>
                              <div className="text-sm font-black text-purple-800">{t('dashboard.mistakeDeckWithSRS')}</div>
                              <div className="text-xs text-purple-600">{t('dashboard.mistakeDeckWithSRSDesc')}</div>
                            </div>
                          </div>
                          <ChevronRight className="text-purple-500" size={16} />
                        </div>
                      </div>

                      <div 
                        onClick={() => navigate(notebookPath)}
                        className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="text-green-600" size={16} />
                            <div>
                              <div className="text-sm font-black text-green-800">{t('dashboard.masteryArchiveSystem')}</div>
                              <div className="text-xs text-green-600">{t('dashboard.masteryArchiveSystemDesc')}</div>
                            </div>
                          </div>
                          <ChevronRight className="text-green-500" size={16} />
                        </div>
                      </div>

                      <div 
                        onClick={() => navigate(notebookPath)}
                        className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart2 className="text-amber-600" size={16} />
                            <div>
                              <div className="text-sm font-black text-amber-800">{t('dashboard.progressTrackingCharts')}</div>
                              <div className="text-xs text-amber-600">{t('dashboard.progressTrackingChartsDesc')}</div>
                            </div>
                          </div>
                          <ChevronRight className="text-amber-500" size={16} />
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => navigate(notebookPath)}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Brain size={18} />
                      {t('dashboard.exploreLearningNotebook')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="text-lg font-black text-red-600">{mistakes.length}</div>
                        <div className="text-xs text-red-600 font-semibold">{t('dashboard.totalMistakes')}</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="text-lg font-black text-amber-600">{new Set(mistakes.map(m => m.Topic)).size}</div>
                        <div className="text-xs text-amber-600 font-semibold">{t('dashboard.topics')}</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                        <div className="text-lg font-black text-green-600">{mistakes.filter(m => m.attemptCount > 1).length}</div>
                        <div className="text-xs text-green-600 font-semibold">{t('dashboard.repeated')}</div>
                      </div>
                    </div>

                    {/* Top Topics to Focus */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="text-rose-600" size={16} />
                        <span className="text-sm font-black text-slate-700">{t('dashboard.topTopicsToFocus')}</span>
                      </div>
                      {topicsToFocus.slice(0, 3).map((item, idx) => (
                        <div
                          key={item.topic}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all cursor-pointer"
                          onClick={() => navigate(notebookPath)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs font-black text-rose-700">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-black text-slate-800">{item.topic}</div>
                              <div className="text-xs text-slate-500">{item.wrong} {t('dashboard.mistakes')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-rose-600">{item.density.toFixed(2)}</div>
                            <div className="text-xs text-slate-500">{t('dashboard.density')}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Learning Features Preview */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart2 className="text-indigo-600" size={16} />
                        <span className="text-sm font-black text-slate-700">{t('dashboard.learningFeatures')}</span>
                      </div>
                      <div className="space-y-2">
                        <div 
                          onClick={() => navigate(notebookPath)}
                          className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="text-indigo-600" size={16} />
                              <div>
                                <div className="text-sm font-black text-indigo-800">{t('dashboard.learningAnalytics')}</div>
                                <div className="text-xs text-indigo-600">{t('dashboard.learningAnalyticsDesc')}</div>
                              </div>
                            </div>
                            <ChevronRight className="text-indigo-500" size={16} />
                          </div>
                        </div>

                        <div 
                          onClick={() => navigate(notebookPath)}
                          className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Brain className="text-purple-600" size={16} />
                              <div>
                                <div className="text-sm font-black text-purple-800">{t('dashboard.mistakeDeckWithSRS')}</div>
                                <div className="text-xs text-purple-600">{t('dashboard.mistakeDeckWithSRSDesc')}</div>
                              </div>
                            </div>
                            <ChevronRight className="text-purple-500" size={16} />
                          </div>
                        </div>

                        <div 
                          onClick={() => navigate(notebookPath)}
                          className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="text-green-600" size={16} />
                              <div>
                                <div className="text-sm font-black text-green-800">{t('dashboard.masteryArchiveSystem')}</div>
                                <div className="text-xs text-green-600">{t('dashboard.masteryArchiveSystemDesc')}</div>
                              </div>
                            </div>
                            <ChevronRight className="text-green-500" size={16} />
                          </div>
                        </div>

                        <div 
                          onClick={() => navigate(notebookPath)}
                          className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart2 className="text-amber-600" size={16} />
                              <div>
                                <div className="text-sm font-black text-amber-800">{t('dashboard.progressTrackingCharts')}</div>
                                <div className="text-xs text-amber-600">{t('dashboard.progressTrackingChartsDesc')}</div>
                              </div>
                            </div>
                            <ChevronRight className="text-amber-500" size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => navigate(notebookPath)}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Brain size={18} />
                      {t('dashboard.openLearningNotebook')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full bento-glass bento-glass-hover">
              <div className="bento-glass-content p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-800">{t('dashboard.priorityReviewAiStudySuggestionTitle')}</h3>
                    <button
                      type="button"
                      onClick={() => setShowAiSuggestionsInfo(true)}
                      className="w-9 h-9 rounded-full border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:scale-110 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center text-purple-700"
                      title={t('dashboard.howThisWorks')}
                    >
                      <Info size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {aiRecommendations.length > 0 ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                      <div className="space-y-2">
                        {aiRecommendations.slice(0, 3).map((rec) => (
                          <div
                            key={rec.id}
                            className="bg-white rounded-lg p-3 border border-purple-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                                    rec.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {rec.priority}
                                  </span>
                                  <span className="font-bold text-sm text-slate-800">
                                    {rec.subtopic}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{rec.reason}</p>
                                <div className="flex gap-2 mt-2 text-xs text-slate-500 flex-wrap">
                                  <span>📅 {t('calendar.suggestedLabel')}: {new Date(rec.suggestedDate).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>📊 {t('calendar.currentLabel')}: {rec.currentAccuracy}%</span>
                                </div>
                              </div>

                              <div className="flex gap-1 ml-3">
                                <button
                                  onClick={(e) => handleAcceptRecommendation(rec, e)}
                                  className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all"
                                  title={t('calendar.addToCalendar')}
                                >
                                  👍
                                </button>
                                <button
                                  onClick={(e) => handleDismissRecommendation(rec.id, e)}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                  title={t('calendar.dismiss')}
                                >
                                  👎
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold">
                      {t('dashboard.aiStudySuggestionsEmpty')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12">
            <div className="h-full bento-glass bento-glass-hover">
              <div className="bento-glass-content p-6">
                <CompactAttemptsList
                  attempts={(attempts || []).slice(0, 10)}
                  onSelectAttempt={setSelectedAttempt}
                  loading={loading}
                  embedded
                />
              </div>
            </div>
          </div>
        </div>

        {null}

        {showAiSuggestionsInfo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAiSuggestionsInfo(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border-2 border-purple-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b-2 border-purple-200 flex items-center justify-between bg-purple-50">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-700" />
                  <h3 className="text-lg font-black text-slate-800">{t('calendar.aiSuggestionsByTopicTitle')}</h3>
                </div>
                <button type="button" onClick={() => setShowAiSuggestionsInfo(false)} className="p-2 hover:bg-white rounded-xl transition-all" aria-label={t('common.close')}>
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
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
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
            </div>
          </div>
        )}

        {/* Attempt Detail Modal */}
        {selectedAttempt && (
          <AttemptDetailModal
            attempt={selectedAttempt}
            onClose={() => setSelectedAttempt(null)}
          />
        )}

        {/* ✅ FIXED: Using questions prop */}
        {showEventModal && (
          <EventCreationModal
            userId={currentUser?.uid}
            questions={questions}
            onClose={() => setShowEventModal(false)}
            onEventCreated={handleEventCreated}
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
    </div>
  );
}