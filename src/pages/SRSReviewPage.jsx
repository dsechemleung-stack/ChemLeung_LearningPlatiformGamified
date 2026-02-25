import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Play } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import { formatHKDateKey, getHKYearMonth, makeHKDate, parseHKDateKey } from '../utils/hkTime';
import { getNow } from '../utils/timeTravel';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { quizStorage } from '../utils/quizStorage';

function formatDM(dateStr) {
  const s = String(dateStr || '');
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  const d = String(Number(parts[2]));
  const m = String(Number(parts[1]));
  return `${d}/${m}`;
}

function daysBetween(dateA, dateB) {
  if (!(dateA instanceof Date) || !(dateB instanceof Date)) return 0;
  const ms = dateA.getTime() - dateB.getTime();
  return Math.floor(ms / 86400000);
}

export default function SRSReviewPage({ questions = [] }) {
  const navigate = useNavigate();
  const { t, tf } = useLanguage();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = useMemo(() => formatHKDateKey(getNow()), []);

  const selectedDate = searchParams.get('date') || '';

  const [availableDates, setAvailableDates] = useState([]);
  const [summaryByDate, setSummaryByDate] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const selectedSummary = summaryByDate?.[selectedDate] || null;

  const overdueDays = useMemo(() => {
    if (!selectedDate) return 0;
    const d = parseHKDateKey(selectedDate);
    const today = parseHKDateKey(todayStr);
    if (!d || !today) return 0;
    return Math.max(0, daysBetween(today, d));
  }, [selectedDate, todayStr]);

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [allTopicsSelected, setAllTopicsSelected] = useState(true);
  const [allSubtopicsSelected, setAllSubtopicsSelected] = useState(true);
  const [questionCount, setQuestionCount] = useState(40);
  const hasInteractedRef = useRef(false);

  // Track if user made any changes
  const markInteracted = () => {
    hasInteractedRef.current = true;
  };

  // Prevent accidental navigation away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasInteractedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const confirmLeave = () => {
    if (!hasInteractedRef.current) return true;
    return window.confirm(t('header.confirmLeaveQuiz'));
  };

  const handleBackClick = () => {
    if (confirmLeave()) {
      navigate('/dashboard');
    }
  };

  const handleDateChange = (e) => {
    const next = e.target.value;
    if (!next) return;
    if (hasInteractedRef.current) {
      if (!window.confirm(t('header.confirmLeaveQuiz'))) {
        return;
      }
    }
    setSearchParams({ date: next });
    hasInteractedRef.current = false;
  };

  // Reset selections when date changes
  useEffect(() => {
    setAllTopicsSelected(true);
    setAllSubtopicsSelected(true);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
    hasInteractedRef.current = false;
  }, [selectedDate]);

  // Load month summaries
  useEffect(() => {
    async function loadMonthSummaries() {
      if (!currentUser?.uid) return;

      try {
        setLoadingSummaries(true);
        setSummaryError(null);

        const seedDate = selectedDate ? parseHKDateKey(selectedDate) : getNow();
        const { year, monthIndex } = getHKYearMonth(seedDate);
        const start = formatHKDateKey(makeHKDate(year, monthIndex, 1));
        const end = formatHKDateKey(makeHKDate(year, monthIndex + 1, 0));

        const snap = await getDocs(query(
          collection(db, 'users', currentUser.uid, 'srs_daily_summaries'),
          where('date', '>=', start),
          where('date', '<=', end)
        ));

        const byDate = {};
        snap.forEach((d) => {
          const data = d.data() || {};
          const dateKey = data.date || d.id;
          byDate[dateKey] = { id: d.id, ...data };
        });

        const dates = Object.keys(byDate)
          .filter((d) => Number(byDate[d]?.dueTotal || 0) > 0)
          .sort((a, b) => String(a).localeCompare(String(b)));

        setSummaryByDate(byDate);
        setAvailableDates(dates);

        if (!selectedDate && dates[0]) {
          setSearchParams({ date: dates[0] });
        }
      } catch (e) {
        console.error('Failed to load SRS summaries:', e);
        setSummaryError(e?.message || String(e));
      } finally {
        setLoadingSummaries(false);
      }
    }

    loadMonthSummaries();
  }, [currentUser?.uid, selectedDate, setSearchParams]);

  const topicCounts = selectedSummary?.topicCounts && typeof selectedSummary.topicCounts === 'object'
    ? selectedSummary.topicCounts
    : {};

  const subtopicCounts = selectedSummary?.subtopicCounts && typeof selectedSummary.subtopicCounts === 'object'
    ? selectedSummary.subtopicCounts
    : {};

  const availableTopics = useMemo(() => {
    return Object.keys(topicCounts)
      .map((k) => decodeURIComponent(k))
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [topicCounts]);

  const availableSubtopics = useMemo(() => {
    // subtopicCounts are stored as topicEnc::subEnc
    const subs = new Set();
    Object.keys(subtopicCounts).forEach((compound) => {
      const [tEnc, sEnc] = String(compound).split('::');
      const topic = tEnc ? decodeURIComponent(tEnc) : '';
      const sub = sEnc ? decodeURIComponent(sEnc) : '';
      if (!sub) return;
      if (allTopicsSelected || selectedTopics.includes(topic)) subs.add(sub);
    });
    return Array.from(subs).sort((a, b) => String(a).localeCompare(String(b)));
  }, [subtopicCounts, allTopicsSelected, selectedTopics]);

  function toggleTopic(topic) {
    markInteracted();
    setAllTopicsSelected(false);
    setSelectedTopics((prev) => {
      const s = new Set(prev);
      if (s.has(topic)) s.delete(topic);
      else s.add(topic);
      return Array.from(s);
    });
  }

  function toggleSubtopic(subtopic) {
    markInteracted();
    setAllSubtopicsSelected(false);
    setSelectedSubtopics((prev) => {
      const s = new Set(prev);
      if (s.has(subtopic)) s.delete(subtopic);
      else s.add(subtopic);
      return Array.from(s);
    });
  }

  function getCardQuestionId(card) {
    if (!card || typeof card !== 'object') return '';
    return String(
      card.questionId ??
      card.questionID ??
      card.question_id ??
      card.qid ??
      ''
    );
  }

  function getQuestionObjectId(q) {
    if (!q || typeof q !== 'object') return '';
    return String(q.ID ?? q.Id ?? q.id ?? q.questionId ?? '');
  }

  async function startReview() {
    if (!currentUser?.uid || !selectedDate) return;
    const uid = currentUser.uid;

    try {
      const targetN = Math.max(1, Number(questionCount || 0) || 1);

      const baseParts = [
        collection(db, 'spaced_repetition_cards'),
        where('userId', '==', uid),
        where('isActive', '==', true),
        where('nextReviewDate', '==', selectedDate),
      ];

      const results = [];

      const topicsToUse = allTopicsSelected ? [] : selectedTopics;
      const subsToUse = allSubtopicsSelected ? [] : selectedSubtopics;

      // Helper to run a query and append unique docs
      async function runOne(extraWheres, n) {
        if (n <= 0) return;
        const qParts = [...baseParts, ...extraWheres, limit(n)];
        const snap = await getDocs(query(...qParts));
        snap.forEach((d) => {
          const data = d.data() || {};
          results.push({ id: d.id, ...data });
        });
      }

      // Strategy:
      // - If subtopics selected: query each (topic, subtopic) pair separately (reads approx N)
      // - Else if topics selected: query each topic separately
      // - Else: query without topic/subtopic
      if (subsToUse.length > 0) {
        // If topics are also selected, restrict to those topics.
        // We don't have a topic->subtopic mapping on client, so we query by subtopic first.
        for (const sub of subsToUse) {
          const remaining = targetN - results.length;
          if (remaining <= 0) break;
          await runOne([where('subtopic', '==', sub)], remaining);
        }

        if (topicsToUse.length > 0) {
          // Filter down to selected topics if user selected them too
          const topicSet = new Set(topicsToUse);
          const filtered = results.filter((c) => topicSet.has(c.topic));
          results.length = 0;
          results.push(...filtered);
        }
      } else if (topicsToUse.length > 0) {
        for (const topic of topicsToUse) {
          const remaining = targetN - results.length;
          if (remaining <= 0) break;
          await runOne([where('topic', '==', topic)], remaining);
        }
      } else {
        await runOne([], targetN);
      }

      // If subtopic filtering was applied, make sure it is enforced
      let selectedCards = results;
      if (subsToUse.length > 0) {
        const subSet = new Set(subsToUse);
        selectedCards = selectedCards.filter((c) => subSet.has(c.subtopic));
      }
      if (topicsToUse.length > 0) {
        const topicSet = new Set(topicsToUse);
        selectedCards = selectedCards.filter((c) => topicSet.has(c.topic));
      }

      // Dedupe by id
      const seen = new Set();
      selectedCards = selectedCards.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      // Stable ordering (client-side) so we don't require Firestore composite indexes.
      selectedCards.sort((a, b) => {
        const aMs = typeof a?.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Number(a?.createdAt || 0) || 0;
        const bMs = typeof b?.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Number(b?.createdAt || 0) || 0;
        if (aMs !== bMs) return aMs - bMs;
        return String(a?.id || '').localeCompare(String(b?.id || ''));
      });

      // If query results are smaller than requested, just use what we have.
      selectedCards = selectedCards.slice(0, targetN);

      if (selectedCards.length === 0) {
        alert(t('calendar.noReviewSessionsFoundForDay'));
        return;
      }

      // Prepare quiz payload
      localStorage.setItem('quiz_mode', 'spaced-repetition');
      localStorage.setItem('quiz_review_mode', 'batch');
      localStorage.setItem('quiz_srs_cards', JSON.stringify(selectedCards.map(card => ({
        id: card.id,
        questionId: getCardQuestionId(card),
        interval: card.interval,
        easeFactor: card.easeFactor,
      }))));
      localStorage.removeItem('quiz_event_ids');

      const questionIds = selectedCards.map((c) => getCardQuestionId(c)).filter(Boolean);
      const questionIdSet = new Set(questionIds);
      const selectedQuestions = (questions || []).filter((q) => questionIdSet.has(getQuestionObjectId(q)));

      if (selectedQuestions.length === 0) {
        console.error('SRS startReview: Questions not found for IDs', {
          selectedDate,
          cardCount: selectedCards.length,
          questionIds: questionIds.slice(0, 20),
          totalQuestionsLoaded: (questions || []).length,
        });
        alert(t('calendar.questionsNotFound'));
        return;
      }

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(selectedQuestions);
      localStorage.setItem('quiz_timer_enabled', 'true');
      localStorage.setItem('quiz_is_timed_mode', 'true');

      navigate('/quiz');
    } catch (e) {
      console.error('SRS startReview failed:', e);
      alert(e?.message || String(e));
    }
  }

  if (loadingSummaries) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-slate-700 font-semibold">
        {t('common.loading')}
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-red-700 font-semibold">
        {summaryError}
      </div>
    );
  }

  if (!selectedDate || availableDates.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-slate-700 font-bold hover:text-slate-900"
        >
          <ChevronLeft size={18} />
          {t('common.backToDashboard')}
        </button>

        <div className="mt-6 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-xl font-black text-slate-800">{t('srs.reviewPageTitle')}</div>
          <div className="mt-2 text-sm text-slate-600 font-semibold">
            {t('calendar.noReviewSessionsFoundForDay')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 text-slate-700 font-bold hover:text-slate-900"
        >
          <ChevronLeft size={18} />
          {t('common.backToDashboard')}
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-2xl font-black text-slate-800 truncate">{t('srs.reviewPageTitle')} ({formatDM(selectedDate)})</div>
          {overdueDays > 0 && Number(selectedSummary?.dueTotal || 0) > 0 && (
            <div className="text-sm font-black text-red-600 mt-1">
              {tf('calendar.srsOverdueDays', { count: overdueDays })}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <select
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-800"
          >
            {availableDates.map((d) => {
              const dDate = parseHKDateKey(d);
              const today = parseHKDateKey(todayStr);
              const od = dDate && today ? Math.max(0, daysBetween(today, dDate)) : 0;
              const dueCount = Number(summaryByDate?.[d]?.dueTotal || 0);
              const overdueLabel = od > 0 ? tf('calendar.srsOverdueDays', { count: od }) : '';
              const label = od > 0 && dueCount > 0
                ? `${formatDM(d)} • ${overdueLabel}`
                : formatDM(d);
              return (
                <option key={d} value={d}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-slate-700 font-black">
                {tf('srs.questionsNeedReviewShownOutOfTotal', { shown: Number(selectedSummary?.dueTotal || 0), total: Number(selectedSummary?.dueTotal || 0) })}
              </div>
              <button
                onClick={startReview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-black"
              >
                <Play size={16} fill="currentColor" />
                {t('calendar.start')}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200">
              <label className="block text-sm font-black text-indigo-900 mb-3">{t('srs.numberOfQuestions')}</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, Number(selectedSummary?.dueTotal || 0))}
                  value={Math.min(questionCount, Math.max(1, Number(selectedSummary?.dueTotal || 0)))}
                  onChange={(e) => {
                    setQuestionCount(parseInt(e.target.value));
                    markInteracted();
                  }}
                  className="flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="bg-white px-4 py-2 rounded-lg border border-indigo-200 font-black text-indigo-900 min-w-[80px] text-center">
                  {Math.min(questionCount, Math.max(1, Number(selectedSummary?.dueTotal || 0)))} / {Math.max(1, Number(selectedSummary?.dueTotal || 0))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {[5, 10, 15, 20].map((n) => {
                  const total = Math.max(1, Number(selectedSummary?.dueTotal || 0));
                  const disabled = total < n;
                  const isActive = questionCount === n && !disabled;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setQuestionCount(n);
                        markInteracted();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        disabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const total = Math.max(1, Number(selectedSummary?.dueTotal || 0));
                    setQuestionCount(total);
                    markInteracted();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    questionCount === Math.max(1, Number(selectedSummary?.dueTotal || 0))
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  {t('common.all')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black text-slate-800">{tf('calendar.topicsCount', { selected: allTopicsSelected ? availableTopics.length : selectedTopics.length, total: availableTopics.length })}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      markInteracted();
                      if (allTopicsSelected) {
                        setAllTopicsSelected(false);
                        setSelectedTopics([]);
                      } else {
                        setAllTopicsSelected(true);
                        setSelectedTopics([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${allTopicsSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                  >
                    {t('common.selectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markInteracted();
                      setAllTopicsSelected(false);
                      setSelectedTopics([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {t('common.clear')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => {
                  const enc = encodeURIComponent(topic);
                  const count = Number(topicCounts?.[enc] || 0);
                  const selected = !allTopicsSelected && selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        allTopicsSelected || selected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {topic}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-black ${allTopicsSelected || selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black text-slate-800">{tf('calendar.subtopicsCount', { selected: allSubtopicsSelected ? availableSubtopics.length : selectedSubtopics.length, total: availableSubtopics.length })}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      markInteracted();
                      if (allSubtopicsSelected) {
                        setAllSubtopicsSelected(false);
                        setSelectedSubtopics([]);
                      } else {
                        setAllSubtopicsSelected(true);
                        setSelectedSubtopics([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${allSubtopicsSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                  >
                    {t('common.selectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markInteracted();
                      setAllSubtopicsSelected(false);
                      setSelectedSubtopics([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {t('common.clear')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableSubtopics.map((sub) => {
                  const subEnc = encodeURIComponent(sub);
                  // total for sub across selected topics
                  let count = 0;
                  Object.keys(subtopicCounts).forEach((compound) => {
                    const [tEnc, sEnc] = String(compound).split('::');
                    if (sEnc !== subEnc) return;
                    const topic = tEnc ? decodeURIComponent(tEnc) : '';
                    if (allTopicsSelected || selectedTopics.includes(topic)) {
                      count += Number(subtopicCounts[compound] || 0);
                    }
                  });

                  const selected = !allSubtopicsSelected && selectedSubtopics.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubtopic(sub)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        allSubtopicsSelected || selected
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {sub}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-black ${allSubtopicsSelected || selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
