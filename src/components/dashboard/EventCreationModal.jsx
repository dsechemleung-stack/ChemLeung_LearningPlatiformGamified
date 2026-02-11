import React, { useState, useMemo } from 'react';
import { X, Flag, BookOpen, Calendar, Tag, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { calendarService } from '../../services/calendarService';

/**
 * EventCreationModal - UI for adding Major Exams and Small Quizzes
 */
export default function EventCreationModal({ userId, questions = [], onClose, onEventCreated }) {
  const [eventType, setEventType] = useState('major_exam'); // 'major_exam' or 'small_quiz'
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract unique topics and subtopics from questions
  const topics = useMemo(() => {
    const topicSet = new Set(questions.map(q => q.Topic).filter(Boolean));
    return ['', ...Array.from(topicSet)].sort();
  }, [questions]);

  const subtopics = useMemo(() => {
    if (!topic) return [''];
    const subtopicSet = new Set(
      questions
        .filter(q => q.Topic === topic && q.Subtopic)
        .map(q => q.Subtopic)
    );
    return ['', ...Array.from(subtopicSet)].sort();
  }, [questions, topic]);

  const minDate = new Date().toISOString().split('T')[0];

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!date || !title.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    
    try {
      const eventData = {
        date,
        title: title.trim(),
        topic: topic || null,
        subtopic: subtopic || null
      };

      if (eventType === 'major_exam') {
        await calendarService.addMajorExam(userId, eventData);
      } else {
        await calendarService.addSmallQuiz(userId, eventData);
      }

      onEventCreated();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
      >
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Add Event</h2>
            <p className="text-sm text-slate-500 mt-1">Schedule an exam or quiz and get a smart study plan</p>
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
              Event Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEventType('major_exam')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  eventType === 'major_exam'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    eventType === 'major_exam' ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <Flag className={eventType === 'major_exam' ? 'text-red-600' : 'text-slate-400'} size={20} />
                  </div>
                  <span className={`font-bold ${
                    eventType === 'major_exam' ? 'text-red-900' : 'text-slate-600'
                  }`}>
                    Major Exam
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  10-day study plan with scaled intensity
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEventType('small_quiz')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  eventType === 'small_quiz'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    eventType === 'small_quiz' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <BookOpen className={eventType === 'small_quiz' ? 'text-amber-600' : 'text-slate-400'} size={20} />
                  </div>
                  <span className={`font-bold ${
                    eventType === 'small_quiz' ? 'text-amber-900' : 'text-slate-600'
                  }`}>
                    Small Quiz
                  </span>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  3-day focused review plan
                </div>
              </button>
            </div>
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
                Auto-Generated Study Plan
              </span>
            </div>
            {eventType === 'major_exam' ? (
              <ul className="space-y-1 text-xs text-red-700">
                <li>• <strong>10-7 days before:</strong> 10 MCQs/day (Warm-up)</li>
                <li>• <strong>6-4 days before:</strong> 20 MCQs/day (Consolidation)</li>
                <li>• <strong>3-1 days before:</strong> 40 MCQs/day (Sprint Intensity)</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-xs text-amber-700">
                <li>• <strong>3 days before:</strong> 5 MCQs (Initial Review)</li>
                <li>• <strong>2 days before:</strong> 10 MCQs (Topic Focus)</li>
                <li>• <strong>1 day before:</strong> 15 MCQs + Mistake Review (Final Polish)</li>
              </ul>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === 'major_exam' ? 'e.g., Chemistry Final Exam' : 'e.g., Organic Chemistry Quiz'}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium"
              required
            />
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2">
              Exam/Quiz Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium"
              required
            />
          </div>

          {/* Topic Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag size={14} />
                Topic (Optional)
              </label>
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSubtopic('');
                }}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium"
              >
                <option value="">All Topics</option>
                {topics.slice(1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Layers size={14} />
                Subtopic (Optional)
              </label>
              <select
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                disabled={!topic}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">All Subtopics</option>
                {subtopics.slice(1).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>💡 Smart Study Plan:</strong> We'll automatically create daily study suggestions 
              leading up to your {eventType === 'major_exam' ? 'exam' : 'quiz'}. Each suggestion will be 
              clickable and will start a quiz session with the exact number of questions recommended.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all text-white ${
                eventType === 'major_exam'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Creating...' : `Create ${eventType === 'major_exam' ? 'Exam' : 'Quiz'} & Study Plan`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}