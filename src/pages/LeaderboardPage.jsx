import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { Trophy, Medal, Award, Calendar, TrendingUp, ArrowLeft, Flame, GraduationCap } from 'lucide-react';

// ── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level, rank }) {
  if (!level) return null;
  const isTopThree = rank <= 3;
  const colors = {
    S4: isTopThree ? 'bg-white/20 text-white border-white/40' : 'bg-sky-100 text-sky-700 border-sky-200',
    S5: isTopThree ? 'bg-white/20 text-white border-white/40' : 'bg-violet-100 text-violet-700 border-violet-200',
    S6: isTopThree ? 'bg-white/20 text-white border-white/40' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${colors[level] || colors.S5}`}>
      <GraduationCap size={10} />
      {level}
    </span>
  );
}

// ── Streak badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak, rank }) {
  const { t } = useLanguage();
  if (!streak || streak < 1) return null;
  const isTopThree = rank <= 3;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
      isTopThree ? 'bg-white/20 text-white border border-white/40' : 'bg-orange-100 text-orange-700 border border-orange-200'
    }`}>
      <Flame size={10} />
      {streak} {t('dashboard.days').charAt(0)}
    </span>
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => { loadLeaderboard(); }, [activeTab]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'weekly') data = await quizService.getWeeklyLeaderboard(20);
      else if (activeTab === 'monthly') data = await quizService.getMonthlyLeaderboard(20);
      else data = await quizService.getAllTimeLeaderboard(20);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
    setLoading(false);
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="text-yellow-400" size={24} />;
    if (rank === 2) return <Medal className="text-slate-300" size={24} />;
    if (rank === 3) return <Award className="text-amber-500" size={24} />;
    return (
      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
        {rank}
      </div>
    );
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white shadow-md';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-md';
    return 'bg-white border-2 border-slate-200 hover:border-slate-300';
  };

  const tabs = [
    {
      value: 'weekly',
      icon: <Calendar size={16} />,
      label: t('leaderboard.thisWeek'),
    },
    {
      value: 'monthly',
      icon: <TrendingUp size={16} />,
      label: t('leaderboard.thisMonth'),
    },
    {
      value: 'alltime',
      icon: <Trophy size={16} />,
      label: t('leaderboard.allTime'),
    },
  ];

  const periodInfo = {
    weekly: t('leaderboard.averageScoreLast7'),
    monthly: t('leaderboard.averageScoreLast30'),
    alltime: t('leaderboard.overallAccuracyAllTime'),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Trophy size={32} />
            {t('leaderboard.title')}
          </h1>
          <p className="text-orange-100 mt-1">
            {t('leaderboard.seeHowYouRank')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 px-4 py-4 font-bold transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                activeTab === tab.value
                  ? 'bg-lab-blue text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue"></div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-semibold">
                {t('leaderboard.noDataYet')}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {t('leaderboard.beFirstComplete')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = entry.userId === currentUser?.uid;
                const scoreToShow = activeTab === 'alltime' ? entry.overallPercentage : entry.averageScore;
                const isTopThree = rank <= 3;

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${getRankStyle(rank)} ${
                      isCurrentUser ? 'ring-4 ring-chemistry-green ring-offset-2' : ''
                    }`}
                  >
                    {/* Rank icon */}
                    <div className="flex-shrink-0 w-8 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className={`font-bold text-base truncate ${isTopThree ? 'text-white' : 'text-slate-800'}`}>
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-chemistry-green text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                            {t('leaderboard.you')}
                          </span>
                        )}
                        {entry.level && <LevelBadge level={entry.level} rank={rank} />}
                        {entry.streak > 0 && <StreakBadge streak={entry.streak} rank={rank} />}
                      </div>
                      <div className={`text-xs ${isTopThree ? 'text-white/75' : 'text-slate-500'}`}>
                        {activeTab === 'alltime'
                          ? `${entry.totalAttempts} ${t('leaderboard.attempts')} · ${entry.totalQuestions} ${t('leaderboard.questions')}`
                          : `${entry.attemptCount} ${t('leaderboard.attempts')} · ${entry.totalQuestions} ${t('leaderboard.questions')}`
                        }
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-3xl font-black ${isTopThree ? 'text-white' : 'text-lab-blue'}`}>
                        {scoreToShow}%
                      </div>
                      <div className={`text-xs ${isTopThree ? 'text-white/70' : 'text-slate-500'}`}>
                        {entry.totalCorrect}/{entry.totalQuestions}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">
          📊 {t('leaderboard.howRankingsWork')}
        </p>
        <p className="text-blue-700">{periodInfo[activeTab]}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-blue-700">
          <span className="flex items-center gap-1">
            <GraduationCap size={12} />
            {t('leaderboard.formLevel')}
          </span>
          <span className="flex items-center gap-1">
            <Flame size={12} />
            {t('leaderboard.flameStreak')}
          </span>
        </div>
      </div>
    </div>
  );
}