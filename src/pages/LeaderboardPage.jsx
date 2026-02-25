import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ChemistryLoading from '../components/ChemistryLoading';
import { quizService } from '../services/quizService';
import { Trophy, Medal, Award, Calendar, ArrowLeft, Flame, GraduationCap, Info } from 'lucide-react';
import ChemCityUserProfileIcon from '../components/ChemCityUserProfileIcon';
import TokenRulesModal from '../components/TokenRulesModal';

// ── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level, rank }) {
  if (!level) return null;
  const isTopThree = rank <= 3;
  const colors = {
    S4: isTopThree ? 'bg-white/70 text-slate-900 border-slate-300' : 'bg-sky-100 text-sky-700 border-sky-200',
    S5: isTopThree ? 'bg-white/70 text-slate-900 border-slate-300' : 'bg-violet-100 text-violet-700 border-violet-200',
    S6: isTopThree ? 'bg-white/70 text-slate-900 border-slate-300' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${colors[level] || colors.S5}`}>
      <GraduationCap size={10} className={isTopThree ? 'text-slate-900' : undefined} />
      {level}
    </span>
  );
}

function getRankPalette(rank) {
  if (rank === 1) {
    return {
      hexBg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600',
      border: 'border-amber-300',
      glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_10px_30px_rgba(251,191,36,0.20)]'
    };
  }
  if (rank === 2) {
    return {
      hexBg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500',
      border: 'border-slate-300',
      glow: 'shadow-[0_0_0_1px_rgba(148,163,184,0.30),0_10px_30px_rgba(100,116,139,0.18)]'
    };
  }
  if (rank === 3) {
    return {
      hexBg: 'bg-gradient-to-br from-amber-200 via-orange-400 to-amber-800',
      border: 'border-amber-400',
      glow: 'shadow-[0_0_0_1px_rgba(251,146,60,0.25),0_10px_30px_rgba(217,119,6,0.18)]'
    };
  }
  return {
    hexBg: 'bg-gradient-to-br from-cyan-500 to-indigo-600',
    border: 'border-cyan-300',
    glow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_10px_30px_rgba(14,116,144,0.14)]'
  };
}

function HexRankBadge({ rank }) {
  const { tf } = useLanguage();
  const p = getRankPalette(rank);
  return (
    <div
      className={`w-12 h-12 ${p.hexBg} ${p.glow} text-white flex items-center justify-center font-black text-lg select-none [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0%_50%)]`}
      aria-label={tf('leaderboard.rankAriaLabel', { rank })}
      title={tf('leaderboard.rankTitle', { rank })}
    >
      {rank}
    </div>
  );
}

function CircleAvatar({ entry, rank }) {
  const { t } = useLanguage();
  const p = getRankPalette(rank);
  const photoUrl = entry?.photoURL || entry?.photoUrl || entry?.avatarUrl || null;

  return (
    <div
      className={`w-14 h-14 p-[2px] border-2 ${p.border} bg-white/70 shadow-sm rounded-full`}
      title={entry?.displayName || ''}
    >
      <div className="w-full h-full overflow-hidden bg-white/80 rounded-full">
        {photoUrl ? (
          <img src={photoUrl} alt={entry?.displayName || t('common.avatar')} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChemCityUserProfileIcon
              userId={entry.userId}
              displayName={entry.displayName}
              size={52}
              className="shadow-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TestTubeBar({ value }) {
  const clamped = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="w-full">
      <div className="h-3 rounded-full bg-white/60 border border-white/60 shadow-inner overflow-hidden backdrop-blur">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-[inset_0_0_10px_rgba(255,255,255,0.35)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => { loadLeaderboard(); }, []);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const data = await quizService.getWeeklyLeaderboard(20);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
    setLoading(false);
  }

  function getWeeklyKeyForDate(dateObj) {
    const date = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    const yyyy = date.getUTCFullYear();
    return `leaderboard_weekly_${yyyy}-W${String(weekNo).padStart(2, '0')}`;
  }

  const periodInfo = t('leaderboard.averageScoreLast7');

  const myRank = useMemo(() => {
    if (!currentUser?.uid || !Array.isArray(leaderboard)) return null;
    const idx = leaderboard.findIndex(e => e.userId === currentUser.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, currentUser]);

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
        <div className="flex-1 flex justify-center">
          <div className="paper-island paper-island-md paper-amber">
            <div className="paper-island-content">
              <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 bellmt-title ink-amber">
                <Trophy size={32} className="text-amber-700" />
                {t('leaderboard.weeklyTitle')}
                <button
                  type="button"
                  onClick={() => setShowRules(true)}
                  className="ml-1 w-8 h-8 rounded-xl border-2 border-slate-200 bg-white/70 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-center text-amber-700 shadow-sm hover:shadow-md active:scale-[0.99]"
                  title={t('store.howToEarnTokens')}
                  aria-label={t('store.howToEarnTokens')}
                >
                  <Info size={18} strokeWidth={2.5} />
                </button>
              </h1>
              <p className="text-slate-700 mt-1 font-semibold">
                {t('leaderboard.seeHowYouRank')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <TokenRulesModal open={showRules} onClose={() => setShowRules(false)} />

      {/* Chemistry background wrapper (below header only) */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(6,182,212,0.22) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(99,102,241,0.12) 1px, transparent 0)',
              backgroundSize: '26px 26px, 52px 52px',
              backgroundPosition: '0 0, 13px 13px'
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_55%)]" />
        </div>

        {/* Tabs + controls (glass lab panel) */}
        <div className="rounded-3xl border border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.10)] overflow-hidden">
          <div className="px-6 pt-6" />

          {/* List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <ChemistryLoading />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-black">
                  {t('leaderboard.noDataYet')}
                </p>
                <p className="text-slate-500 text-sm mt-2 font-medium">
                  {t('leaderboard.beFirstComplete')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.userId === currentUser?.uid;
                  const scoreToShow = entry.averageScore;
                  const isTopThree = rank <= 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`group relative rounded-2xl border border-white/70 bg-white/90 shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] ${
                        isCurrentUser ? 'ring-4 ring-emerald-400/60 ring-offset-2 ring-offset-white/60' : ''
                      }`}
                    >
                      {isTopThree && (
                        <>
                          <div
                            className={`pointer-events-none absolute inset-0 rounded-2xl opacity-90 ${
                              rank === 1
                                ? 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100'
                                : rank === 2
                                  ? 'bg-gradient-to-r from-slate-50 via-white to-slate-100'
                                  : 'bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100'
                            }`}
                          />
                          <div
                            className={`pointer-events-none absolute -inset-[2px] rounded-[18px] blur-lg opacity-70 ${
                              rank === 1
                                ? 'bg-amber-300/30'
                                : rank === 2
                                  ? 'bg-slate-400/20'
                                  : 'bg-orange-400/25'
                            }`}
                          />
                          <div
                            className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity ${
                              rank === 1
                                ? 'shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_45px_rgba(251,191,36,0.25)]'
                                : rank === 2
                                  ? 'shadow-[0_0_0_1px_rgba(148,163,184,0.30),0_0_45px_rgba(148,163,184,0.22)]'
                                  : 'shadow-[0_0_0_1px_rgba(251,146,60,0.25),0_0_45px_rgba(251,146,60,0.22)]'
                            }`}
                          />
                        </>
                      )}

                      {!isTopThree && (
                        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_40px_rgba(34,211,238,0.18)]" />
                      )}
                      <div className="relative p-4 sm:p-5 flex items-center gap-4">
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <HexRankBadge rank={rank} />
                          <CircleAvatar entry={entry} rank={rank} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-black text-slate-900 truncate">
                              {entry.displayName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black flex-shrink-0">
                                {t('leaderboard.you')}
                              </span>
                            )}
                            {entry.level && <LevelBadge level={entry.level} rank={rank} />}
                            {entry.streak > 0 && <StreakBadge streak={entry.streak} rank={rank} />}
                          </div>

                          <div className="mt-1 text-xs text-slate-600 font-semibold">
                            {`${entry.attemptCount} ${t('leaderboard.attempts')} · ${entry.totalQuestions} ${t('leaderboard.questions')}`}
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <TestTubeBar value={scoreToShow} />
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl sm:text-3xl font-black text-indigo-700">
                                {scoreToShow}%
                              </div>
                              <div className="text-xs text-slate-500 font-bold">
                                {entry.totalCorrect}/{entry.totalQuestions}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isTopThree && (
                          <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-10">
                            {rank === 1 && <Trophy className="text-amber-500" size={26} />}
                            {rank === 2 && <Medal className="text-slate-400" size={26} />}
                            {rank === 3 && <Award className="text-amber-700" size={26} />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">
          📊 {t('leaderboard.howRankingsWork')}
        </p>
        <p className="text-blue-700">{periodInfo}</p>
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