import React, { useState, useMemo, useEffect } from 'react';
import { X, Flag, BookOpen, Calendar, Tag, Layers, ArrowUpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { calendarService } from '../../services/calendarService';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * EventCreationModal - COMPLETE FIX
 * 
 * FIXES:
 * ✅ Topic filter LEFT, Subtopic filter RIGHT (side-by-side)
 * ✅ Subtopics auto-filter when topics change (BUG FIX!)
 * ✅ Selected subtopics are cleared when they're no longer in available list
 * ✅ YYYY/MM/DD or MM/DD date format
 */
export default function EventCreationModal({ userId, questions = [], onClose, onEventCreated }) {
  const { t, tf } = useLanguage();
  const [eventType, setEventType] = useState('major_exam');
  const [title, setTitle] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [loading, setLoading] = useState(false);

  // Extract unique topics from questions (sorted)
  const allTopics = useMemo(() => {
    const topicSet = new Set(questions.map(q => q.Topic).filter(Boolean));
    return Array.from(topicSet).sort();
  }, [questions]);

  // Extract subtopics based on selected topics
  const availableSubtopics = useMemo(() => {
    if (selectedTopics.length === 0) {
      // Show all subtopics if no topic filter
      const subtopicSet = new Set(
        questions
          .filter(q => q.Subtopic)
          .map(q => q.Subtopic)
      );
      return Array.from(subtopicSet).sort();
    }
    
    // Only show subtopics from selected topics
    const subtopicSet = new Set(
      questions
        .filter(q => selectedTopics.includes(q.Topic) && q.Subtopic)
        .map(q => q.Subtopic)
    );
    return Array.from(subtopicSet).sort();
  }, [questions, selectedTopics]);

  /**
   * 🔧 CRITICAL BUG FIX: Auto-filter selected subtopics when available subtopics change
   * 
   * Problem: When user selects topics 01-07, then changes to 01-04,
   * the subtopics from topics 05-07 remain selected even though they're no longer available
   * 
   * Solution: Filter out any selected subtopics that are no longer in the available list
   */
  useEffect(() => {
    if (selectedSubtopics.length > 0) {
      // Keep only subtopics that are still available
      const validSubtopics = selectedSubtopics.filter(sub => 
        availableSubtopics.includes(sub)
      );
      
      // Only update if something actually changed
      if (validSubtopics.length !== selectedSubtopics.length) {
        const removed = selectedSubtopics.filter(s => !validSubtopics.includes(s));
        console.log('🔧 Auto-filtering subtopics:', {
          before: selectedSubtopics,
          after: validSubtopics,
          removed: removed
        });
        setSelectedSubtopics(validSubtopics);
      }
    }
  }, [availableSubtopics]); // Trigger when available subtopics change

  function parseDate(input) {
    if (!input) return null;
    
    const parts = input.split('/');
    const currentYear = new Date().getFullYear();
    
    let year, month, day;
    
    if (parts.length === 2) {
      [month, day] = parts;
      year = currentYear.toString();
    } else if (parts.length === 3) {
      [year, month, day] = parts;
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum <= 30 ? `20${year}` : `19${year}`;
      }
    } else {
      return null;
    }
    
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    if (y < 2000 || y > 2100) return null;
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function handleDateInput(value) {
    const cleaned = value.replace(/[^\d\/]/g, '');
    let formatted = cleaned;
    const digits = cleaned.replace(/\//g, '');
    
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      if (parseInt(digits.substring(0, 2)) <= 12) {
        formatted = digits.substring(0, 2) + '/' + digits.substring(2);
      } else {
        formatted = digits;
      }
    } else if (digits.length <= 6) {
      formatted = digits.substring(0, 4) + '/' + digits.substring(4);
    } else {
      formatted = digits.substring(0, 4) + '/' + digits.substring(4, 6) + '/' + digits.substring(6, 8);
    }
    
    if (formatted.length <= 10) {
      setDateInput(formatted);
    }
  }

  function toggleTopic(topic) {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  }

  function selectTopicsUpTo(targetTopic) {
    const targetIndex = allTopics.indexOf(targetTopic);
    if (targetIndex === -1) return;
    setSelectedTopics(allTopics.slice(0, targetIndex + 1));
  }

  function toggleSubtopic(subtopic) {
    setSelectedSubtopics(prev => 
      prev.includes(subtopic)
        ? prev.filter(s => s !== subtopic)
        : [...prev, subtopic]
    );
  }

  function selectSubtopicsUpTo(targetSubtopic) {
    const targetIndex = availableSubtopics.indexOf(targetSubtopic);
    if (targetIndex === -1) return;
    setSelectedSubtopics(availableSubtopics.slice(0, targetIndex + 1));
  }

  function generateTitle() {
    if (title.trim()) return title.trim();
    
    if (eventType === 'major_exam') {
      if (selectedTopics.length === 0) {
        return t('calendar.comprehensiveExam');
      } else {
        return tf('calendar.topicsExamTitle', {
          topics: selectedTopics.slice(0, 2).join(', '),
          ellipsis: selectedTopics.length > 2 ? t('common.ellipsis') : ''
        });
      }
    } else {
      if (selectedTopics.length === 0) {
        return t('calendar.comprehensiveQuiz');
      } else {
        return tf('calendar.topicsQuizTitle', {
          topics: selectedTopics.slice(0, 2).join(', '),
          ellipsis: selectedTopics.length > 2 ? t('common.ellipsis') : ''
        });
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const parsedDate = parseDate(dateInput);
    
    if (!parsedDate) {
      alert(t('calendar.invalidDateHelp'));
      return;
    }

    const selectedDate = new Date(parsedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      const proceed = window.confirm(t('calendar.pastDateWarningConfirm'));
      if (!proceed) return;
    }

    setLoading(true);
    
    try {
      const eventData = {
        date: parsedDate,
        title: generateTitle(),
        topics: selectedTopics.length > 0 ? selectedTopics : null,
        subtopics: selectedSubtopics.length > 0 ? selectedSubtopics : null
      };

      console.log('📝 Creating event:', eventData);

      if (eventType === 'major_exam') {
        await calendarService.addMajorExam(userId, eventData);
      } else {
        await calendarService.addSmallQuiz(userId, eventData);
      }

      alert(t('calendar.eventCreatedSuccess'));
      onEventCreated();
      onClose();
    } catch (error) {
      console.error('❌ Error creating event:', error);
      alert(tf('calendar.failedCreateEventWithReason', { reason: error.message }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{t('calendar.addEvent')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('calendar.addEventSubtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Type Selector */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
              {t('calendar.eventType')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEventType('major_exam')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  eventType === 'major_exam'
                    ? 'border-red-500 bg-red-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Flag className={eventType === 'major_exam' ? 'text-red-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${
                    eventType === 'major_exam' ? 'text-red-900' : 'text-slate-600'
                  }`}>
                    {t('calendar.majorExam')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  {t('calendar.majorExamDesc')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEventType('small_quiz')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  eventType === 'small_quiz'
                    ? 'border-amber-500 bg-amber-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className={eventType === 'small_quiz' ? 'text-amber-600' : 'text-slate-400'} size={20} />
                  <span className={`font-bold ${
                    eventType === 'small_quiz' ? 'text-amber-900' : 'text-slate-600'
                  }`}>
                    {t('calendar.smallQuiz')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  {t('calendar.smallQuizDesc')}
                </div>
              </button>
            </div>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2">
              {t('calendar.examQuizDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={dateInput}
              onChange={(e) => handleDateInput(e.target.value)}
              placeholder={t('calendar.dateInputPlaceholder')}
              maxLength={10}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium text-lg"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              {t('calendar.dateQuickLabel')} <strong>12/25</strong> → {new Date().getFullYear()}/12/25 | {t('calendar.dateFullLabel')} <strong>2024/12/25</strong>
            </p>
          </div>

          {/* Topic & Subtopic Filters - SIDE BY SIDE */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
              {t('calendar.filterTopicsSubtopics')}
            </label>

            <div className="grid grid-cols-2 gap-4">
              {/* LEFT: Topic Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-slate-600" />
                    <span className="text-sm font-bold text-slate-600">
                      {tf('calendar.topicsCountFull', {
                        selected: selectedTopics.length,
                        total: allTopics.length,
                        plural: selectedTopics.length === 1 ? '' : 's'
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTopics([])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    {t('common.clear')}
                  </button>
                </div>

                <div className="border-2 border-slate-200 rounded-lg p-3 bg-white h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {allTopics.map((topic) => (
                      <div key={topic} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTopic(topic)}
                          className={`flex-1 px-3 py-2 rounded-lg text-left transition-all flex items-center gap-2 text-sm ${
                            selectedTopics.includes(topic)
                              ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-900 font-bold'
                              : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedTopics.includes(topic)
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300'
                          }`}>
                            {selectedTopics.includes(topic) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">{topic}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => selectTopicsUpTo(topic)}
                          title={tf('calendar.selectAllTopicsUpToTitle', { topic })}
                          className="px-2 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all flex items-center gap-1 text-xs font-bold text-purple-700 flex-shrink-0"
                        >
                          <ArrowUpCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  {t('calendar.upToHint')}
                </p>
              </div>

              {/* RIGHT: Subtopic Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-slate-600" />
                    <span className="text-sm font-bold text-slate-600">
                      {tf('calendar.subtopicsCountFull', {
                        selected: selectedSubtopics.length,
                        total: availableSubtopics.length,
                        plural: selectedSubtopics.length === 1 ? '' : 's'
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubtopics([])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    {t('common.clear')}
                  </button>
                </div>

                <div className="border-2 border-slate-200 rounded-lg p-3 bg-white h-96 overflow-y-auto">
                  {availableSubtopics.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      {selectedTopics.length === 0 ? t('calendar.selectTopicsToFilterSubtopics') : t('calendar.noSubtopicsAvailable')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableSubtopics.map((subtopic) => (
                        <div key={subtopic} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSubtopic(subtopic)}
                            className={`flex-1 px-3 py-2 rounded-lg text-left transition-all flex items-center gap-2 text-sm ${
                              selectedSubtopics.includes(subtopic)
                                ? 'bg-purple-100 border-2 border-purple-500 text-purple-900 font-bold'
                                : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedSubtopics.includes(subtopic)
                                ? 'border-purple-600 bg-purple-600'
                                : 'border-slate-300'
                            }`}>
                              {selectedSubtopics.includes(subtopic) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="truncate">{subtopic}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => selectSubtopicsUpTo(subtopic)}
                            title={tf('calendar.selectAllSubtopicsUpToTitle', { subtopic })}
                            className="px-2 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all flex items-center gap-1 text-xs font-bold text-purple-700 flex-shrink-0"
                          >
                            <ArrowUpCircle size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  {t('calendar.subtopicsAutoFilterHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Custom Title */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2">
              {t('calendar.customTitle')} <span className="text-slate-400 text-xs font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tf('calendar.autoTitlePlaceholder', { title: generateTitle() })}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium"
            />
          </div>

          {/* Study Plan Preview */}
          <div className={`p-4 rounded-xl border-2 ${
            eventType === 'major_exam' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className={eventType === 'major_exam' ? 'text-red-600' : 'text-amber-600'} size={18} />
              <span className={`font-bold text-sm ${
                eventType === 'major_exam' ? 'text-red-900' : 'text-amber-900'
              }`}>
                {t('calendar.autoGeneratedStudyPlan')}
              </span>
            </div>
            {eventType === 'major_exam' ? (
              <ul className="space-y-1 text-xs text-red-700">
                <li>• <strong>{t('calendar.planMajor10to7Label')}</strong> {t('calendar.planMajor10to7Desc')}</li>
                <li>• <strong>{t('calendar.planMajor6to4Label')}</strong> {t('calendar.planMajor6to4Desc')}</li>
                <li>• <strong>{t('calendar.planMajor3to1Label')}</strong> {t('calendar.planMajor3to1Desc')}</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-xs text-amber-700">
                <li>• <strong>{t('calendar.planSmall3Label')}</strong> {t('calendar.planSmall3Desc')}</li>
                <li>• <strong>{t('calendar.planSmall2Label')}</strong> {t('calendar.planSmall2Desc')}</li>
                <li>• <strong>{t('calendar.planSmall1Label')}</strong> {t('calendar.planSmall1Desc')}</li>
              </ul>
            )}
            <p className="text-xs font-bold mt-2 text-slate-700">
              {t('calendar.focusLabel')}{' '}
              {selectedTopics.length === 0
                ? t('calendar.allTopics')
                : tf('calendar.topicCountLabel', { count: selectedTopics.length })}
              {selectedSubtopics.length > 0 && ` • ${tf('calendar.subtopicCountLabel', { count: selectedSubtopics.length })}`}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all text-white ${
                eventType === 'major_exam'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {loading ? t('calendar.creating') : t('calendar.createEventAndStudyPlan')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}