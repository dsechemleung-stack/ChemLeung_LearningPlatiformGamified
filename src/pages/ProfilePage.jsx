import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, GraduationCap, Mail, Calendar, Save, ArrowLeft, Trophy, Target, BookOpen, Lock, Unlock } from 'lucide-react';
import { useQuizData } from '../hooks/useQuizData';
import Avatar from '../components/Avatar';
import { STORE_ITEMS } from '../utils/storeItems';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK36yaUN-NMCkQNT-DAHgc6FMZPjUc0Yv3nYEK4TA9W2qE9V1TqVD10Tq98-wXQoAvKOZlwGWRSDkU/pub?gid=1182550140&single=true&output=csv';

export default function ProfilePage() {
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const { t, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const { questions, loading: questionsLoading } = useQuizData(SHEET_URL);
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [level, setLevel] = useState(userProfile?.level || 'S5');
  const [learnedUpTo, setLearnedUpTo] = useState(userProfile?.learnedUpTo || '');
  const [topicExceptions, setTopicExceptions] = useState(userProfile?.topicExceptions || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile picture editor state (ChemStore owned items only)
  const inventory = userProfile?.inventory || [];
  const equipped = userProfile?.equipped || {};
  const ownedProfilePics = STORE_ITEMS.profilePics.filter(item => inventory.includes(item.id) || item.price === 0);
  const ownedThemes = STORE_ITEMS.themes.filter(item => inventory.includes(item.id) || item.price === 0);

  const [selectedProfilePicId, setSelectedProfilePicId] = useState(equipped.profilePic || 'flask_blue');
  const [selectedThemeId, setSelectedThemeId] = useState(equipped.theme || 'default');

  useEffect(() => {
    setSelectedProfilePicId((userProfile?.equipped || {}).profilePic || 'flask_blue');
    setSelectedThemeId((userProfile?.equipped || {}).theme || 'default');
  }, [userProfile]);

  // Extract all unique topics from questions
  const allTopics = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    return [...new Set(questions.map(q => q.Topic))]
      .filter(t => t && t !== "Uncategorized")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  // Get currently available topics based on learnedUpTo and exceptions
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

  // Get topics that are within learned range (for exceptions UI)
  const learnedRangeTopics = useMemo(() => {
    if (!learnedUpTo) return [];
    
    return allTopics.filter(topic => {
      const topicNum = topic.match(/^\d+/)?.[0];
      return topicNum && topicNum <= learnedUpTo;
    });
  }, [allTopics, learnedUpTo]);

  const toggleTopicException = (topic) => {
    setTopicExceptions(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: displayName
      });

      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        level: level,
        learnedUpTo: learnedUpTo,
        topicExceptions: topicExceptions,
        equipped: {
          ...(userProfile?.equipped || {}),
          profilePic: selectedProfilePicId,
          theme: selectedThemeId
        },
        updatedAt: new Date().toISOString()
      });

      // Reload user profile
      await loadUserProfile(currentUser.uid);

      setMessage({ 
        type: 'success', 
        text: t('profile.profileUpdated')
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: t('profile.failedUpdate')
      });
    }

    setSaving(false);
  }

  const formatDate = (isoString) => {
    if (!isoString) return t('common.notAvailable');
    const date = new Date(isoString);
    return date.toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

  const overallAccuracy = userProfile?.totalQuestions > 0
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
              <p className="text-slate-700 mt-1 font-semibold">
                {t('profile.manageAccount')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {t('profile.yourStatistics')}
          </h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-lab-blue" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('profile.totalAttempts')}
              </span>
            </div>
            <div className="text-3xl font-black text-lab-blue">
              {userProfile?.totalAttempts || 0}
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-chemistry-green" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('profile.overallAccuracy')}
              </span>
            </div>
            <div className="text-3xl font-black text-chemistry-green">
              {overallAccuracy}%
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="text-purple-600" size={20} />
              <span className="text-sm font-semibold text-slate-600">
                {t('profile.questionsSolved')}
              </span>
            </div>
            <div className="text-3xl font-black text-purple-600">
              {userProfile?.totalQuestions || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {t('profile.accountInformation')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Message */}
          {message.text && (
            <div className={`p-4 rounded-lg border-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
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

          {/* Profile Picture Editor */}
          <div className="border-t-2 border-slate-100 pt-6">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <User size={16} />
              {t('profile.profilePicture')}
            </label>

            <div className="flex items-center gap-4 mb-4">
              <Avatar
                userId={currentUser?.uid}
                displayName={displayName}
                profilePicId={selectedProfilePicId}
                themeId={selectedThemeId}
                fetchUser={false}
                size="lg"
              />
              <div className="text-sm text-slate-600">
                <div className="font-bold text-slate-800">{t('profile.preview')}</div>
                <div className="text-xs text-slate-500">{t('profile.onlyOwnedItems')}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">{t('profile.icon')}</div>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {ownedProfilePics.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProfilePicId(item.id)}
                    className={`p-2 rounded-xl border-2 transition-all flex items-center justify-center text-xl ${
                      selectedProfilePicId === item.id
                        ? 'border-lab-blue bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    title={item.name}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">{t('profile.background')}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ownedThemes.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedThemeId === theme.id
                        ? 'border-lab-blue bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full h-10 rounded-lg border border-white/50 shadow-inner" style={{ background: theme.preview }} />
                    <div className="mt-2 text-xs font-bold text-slate-700 truncate">{theme.name}</div>
                  </button>
                ))}
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
            <p className="text-xs text-slate-500 mt-1">
              {t('profile.emailCannotChange')}
            </p>
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
            <p className="text-xs text-slate-500 mt-2">
              {t('profile.selectCurrentForm')}
            </p>
          </div>

          {/* LEARNED UP TO SELECTOR */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen size={16} />
              {t('profile.topicsLearnedUpTo')}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              {t('profile.selectHighestTopic')}
            </p>
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

          {/* TOPIC EXCEPTIONS */}
          {learnedUpTo && learnedRangeTopics.length > 0 && (
            <div className="border-t-2 border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Lock size={16} />
                {t('profile.topicExceptionsLabel')}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t('profile.clickToExclude')}
              </p>
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
                  <span
                    key={topic}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {t('profile.theseTopicsWillAppear')}
              </p>
            </div>
          )}

          {/* Account Created Date */}
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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