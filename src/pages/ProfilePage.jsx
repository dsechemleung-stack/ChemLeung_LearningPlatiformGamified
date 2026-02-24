import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  User, GraduationCap, Mail, Calendar, Save, ArrowLeft,
  Trophy, Target, BookOpen, Lock, Unlock, Palette,
} from 'lucide-react';
import { useQuizData } from '../hooks/useQuizData';
import { ProfileCard } from '../components/chemcity/gacha/ProfileCard';
import { getCosmeticsMap } from '../lib/chemcity/gachaStaticCache';
import { AvatarTunerButton } from '../components/chemcity/gacha/AvatarTuner';
import { useChemCityStore } from '../store/chemcityStore';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

export default function ProfilePage() {
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const { t, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const { questions, loading: questionsLoading } = useQuizData(SHEET_URL);

  const navigateToCosmetics = useChemCityStore((s) => s.navigateToCosmetics);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [level, setLevel] = useState(userProfile?.level || 'S5');
  const [learnedUpTo, setLearnedUpTo] = useState(userProfile?.learnedUpTo || '');
  const [gender, setGender] = useState(userProfile?.gender || 'boy');
  const [topicExceptions, setTopicExceptions] = useState(userProfile?.topicExceptions || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [cosmeticsMap, setCosmeticsMap] = useState(null);

  const equippedAvatarId = userProfile?.chemcity?.equippedCosmetics?.avatarId;
  const equippedBackgroundId = userProfile?.chemcity?.equippedCosmetics?.backgroundId;

  const fallbackIds = useMemo(() => {
    if (!cosmeticsMap) return { avatarId: undefined, backgroundId: undefined };
    if (equippedAvatarId && equippedBackgroundId) {
      return { avatarId: equippedAvatarId, backgroundId: equippedBackgroundId };
    }
    const all = Array.from(cosmeticsMap.values());
    const firstAvatar = all.find((c) => c?.type === 'avatar');
    const firstBg = all.find((c) => c?.type === 'background');
    return {
      avatarId: equippedAvatarId || firstAvatar?.id,
      backgroundId: equippedBackgroundId || firstBg?.id,
    };
  }, [cosmeticsMap, equippedAvatarId, equippedBackgroundId]);

  const previewAvatar = useMemo(() => {
    if (!cosmeticsMap) return null;
    const id = fallbackIds.avatarId;
    if (!id) return null;
    try {
      return cosmeticsMap.get(id) || null;
    } catch {
      return null;
    }
  }, [cosmeticsMap, fallbackIds.avatarId]);

  useEffect(() => {
    setGender(userProfile?.gender || 'boy');
  }, [userProfile]);

  useEffect(() => {
    let mounted = true;
    getCosmeticsMap()
      .then((m) => {
        if (!mounted) return;
        setCosmeticsMap(m);
      })
      .catch(() => {
        if (!mounted) return;
        setCosmeticsMap(new Map());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allTopics = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    return [...new Set(questions.map((q) => q.Topic))]
      .filter((t) => t && t !== 'Uncategorized')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  const availableTopics = useMemo(() => {
    if (!learnedUpTo) return [];
    const available = [];
    for (const topic of allTopics) {
      const topicNum = topic.match(/^\d+/)?.[0];
      if (topicNum && topicNum <= learnedUpTo && !topicExceptions.includes(topic)) {
        available.push(topic);
      }
    }
    return available;
  }, [allTopics, learnedUpTo, topicExceptions]);

  const learnedRangeTopics = useMemo(() => {
    if (!learnedUpTo) return [];
    return allTopics.filter((topic) => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= learnedUpTo;
    });
  }, [allTopics, learnedUpTo]);

  const toggleTopicException = (topic) => {
    setTopicExceptions((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  // Navigate to ChemCity cosmetics screen
  function handleChangeAvatar() {
    // Navigate to ChemCity and open cosmetics view
    // The ChemCity page should read this state to open the cosmetics panel directly
    navigate('/chemcity', { state: { openView: 'cosmetics' } });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await updateProfile(currentUser, { displayName });
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName,
        gender,
        level,
        learnedUpTo,
        topicExceptions,
        updatedAt: new Date().toISOString(),
      });
      await loadUserProfile(currentUser.uid);
      setMessage({ type: 'success', text: t('profile.profileUpdated') });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: t('profile.failedUpdate') });
    }
    setSaving(false);
  }

  const formatDate = (isoString) => {
    if (!isoString) return t('common.notAvailable');
    const date = new Date(isoString);
    return date.toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const overallAccuracy =
    userProfile?.totalQuestions > 0
      ? Math.round((userProfile.totalCorrect / userProfile.totalQuestions) * 100)
      : 0;

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
              <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 bellmt-title ink-emerald">
                <User size={32} className="text-emerald-700" />
                {t('profile.profileSettings')}
              </h1>
              <p className="text-slate-700 mt-1 font-semibold">{t('profile.manageAccount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">{t('profile.yourStatistics')}</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-lab-blue" size={20} />
              <span className="text-sm font-semibold text-slate-600">{t('profile.totalAttempts')}</span>
            </div>
            <div className="text-3xl font-black text-lab-blue">{userProfile?.totalAttempts || 0}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-chemistry-green" size={20} />
              <span className="text-sm font-semibold text-slate-600">{t('profile.overallAccuracy')}</span>
            </div>
            <div className="text-3xl font-black text-chemistry-green">{overallAccuracy}%</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="text-purple-600" size={20} />
              <span className="text-sm font-semibold text-slate-600">{t('profile.questionsSolved')}</span>
            </div>
            <div className="text-3xl font-black text-purple-600">{userProfile?.totalQuestions || 0}</div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">{t('profile.accountInformation')}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Message */}
          {message.text && (
            <div
              className={`p-4 rounded-lg border-2 ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <p className="font-semibold">{message.text}</p>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} />
              {t('profile.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder={t('profile.enterYourName')}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} />
              Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['boy', 'girl'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-3 rounded-xl border-2 font-bold capitalize transition-all ${
                    gender === g
                      ? 'border-lab-blue bg-blue-50 text-lab-blue'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* ── Profile Card Preview (enlarged) ── */}
          <div className="border-t-2 border-slate-100 pt-6">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Palette size={16} />
              Profile Card
            </label>

            {/* Two-column: large card left, info + buttons right */}
            <div className="flex gap-5 items-start">
              {/* Large card — half the content width */}
              <div className="shrink-0" style={{ width: 'min(50%, 220px)' }}>
                <ProfileCard
                  size="xl"
                  displayName={displayName}
                  gender={gender}
                  cosmeticsMap={cosmeticsMap || undefined}
                  avatarId={fallbackIds.avatarId}
                  backgroundId={fallbackIds.backgroundId}
                  className="w-full shadow-lg"
                  style={{ height: 'auto', aspectRatio: '4 / 5.5' }}
                />
              </div>

              {/* Right side: info + change button */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-black text-slate-800 mb-0.5">{t('profile.preview')}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your avatar and background are set inside ChemCity. Tap below to change them.
                  </p>
                </div>

                {/* Equipped names */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold w-20 shrink-0">Avatar</span>
                    <span className="text-xs text-slate-700 font-bold truncate">
                      {equippedAvatarId
                        ? (cosmeticsMap?.get(equippedAvatarId)?.name ?? equippedAvatarId)
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold w-20 shrink-0">Background</span>
                    <span className="text-xs text-slate-700 font-bold truncate">
                      {equippedBackgroundId
                        ? (cosmeticsMap?.get(equippedBackgroundId)?.name ?? equippedBackgroundId)
                        : 'None'}
                    </span>
                  </div>
                </div>

                {/* Change Avatar button */}
                <button
                  type="button"
                  onClick={handleChangeAvatar}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-lab-blue bg-blue-50 text-lab-blue font-bold text-sm transition-all hover:bg-blue-100 active:scale-95"
                >
                  <Palette size={16} />
                  Change Avatar &amp; Background
                </button>

                {/* Dev tuner button */}
                <AvatarTunerButton
                  avatarId={fallbackIds.avatarId}
                  avatarImageUrl={previewAvatar?.imageUrl}
                  avatarImageUrlBoy={previewAvatar?.imageUrlBoy}
                  avatarImageUrlGirl={previewAvatar?.imageUrlGirl}
                  className="w-full py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-300 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Mail size={16} />
              {t('profile.email')}
            </label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">{t('profile.emailCannotChange')}</p>
          </div>

          {/* School Level */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <GraduationCap size={16} />
              {t('profile.schoolLevel')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['S4', 'S5', 'S6'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`py-3 rounded-xl border-2 font-bold transition-all ${
                    level === lvl
                      ? 'border-lab-blue bg-blue-50 text-lab-blue'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{t('profile.selectCurrentForm')}</p>
          </div>

          {/* Topics learned up to */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen size={16} />
              {t('profile.topicsLearnedUpTo')}
            </label>
            <p className="text-xs text-slate-500 mb-3">{t('profile.selectHighestTopic')}</p>
            <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
              {allTopics.map((topic) => {
                const topicNum = topic.match(/^\d+/)?.[0];
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setLearnedUpTo(topicNum)}
                    className={`py-2 rounded-lg border-2 font-bold transition-all text-sm ${
                      learnedUpTo === topicNum
                        ? 'border-chemistry-green bg-green-50 text-chemistry-green'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    title={topic}
                  >
                    {topicNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic exceptions */}
          {learnedUpTo && learnedRangeTopics.length > 0 && (
            <div className="border-t-2 border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Lock size={16} />
                {t('profile.topicExceptionsLabel')}
              </label>
              <p className="text-xs text-slate-500 mb-3">{t('profile.clickToExclude')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {learnedRangeTopics.map((topic) => {
                  const isException = topicExceptions.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopicException(topic)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        isException
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                      }`}
                    >
                      <span className="text-sm font-semibold">{topic}</span>
                      {isException ? (
                        <Lock size={16} className="text-red-600" />
                      ) : (
                        <Unlock size={16} className="text-green-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Topics Preview */}
          {availableTopics.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <BookOpen size={16} />
                {t('profile.yourAvailableTopicsCount')} ({availableTopics.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => (
                  <span key={topic} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    {topic}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">{t('profile.theseTopicsWillAppear')}</p>
            </div>
          )}

          {/* Account Created */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              {t('profile.memberSince')}
            </label>
            <div className="px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold">
              {formatDate(userProfile?.createdAt)}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving || questionsLoading}
            className="w-full py-4 bg-lab-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save size={20} />
                {t('profile.saveChanges')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}