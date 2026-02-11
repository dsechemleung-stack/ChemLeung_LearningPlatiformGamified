import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, 
  Clock, Target, Brain, Zap, CheckCircle, Edit2, Trash2, AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  EVENT_TYPES,
  EVENT_ICONS,
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  getEventsForDate,
  scheduleMistakeReview,
  batchScheduleMistakeReviews,
} from '../../utils/calendarEventManager';

/**
 * Enhanced Study Planner Calendar
 * - Monthly calendar view with interactive events
 * - Exam/quiz scheduling with automatic prep suggestions
 * - Mistake-driven spaced repetition
 * - Deep linking to quiz page with parameters
 * - Real-time updates
 */
export default function StudyPlannerCalendar({ mistakes = [] }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);
  
  // Load events from storage
  useEffect(() => {
    loadEvents();
    
    // Listen for storage updates from other components
    const handleStorageUpdate = () => loadEvents();
    window.addEventListener('calendar-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('calendar-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);
  
  // Auto-schedule mistake reviews when mistakes change
  useEffect(() => {
    if (mistakes.length > 0) {
      // Schedule reviews for all active mistakes
      const activeMistakes = mistakes.filter(m => (m.improvementCount || 0) < 3);
      if (activeMistakes.length > 0) {
        batchScheduleMistakeReviews(activeMistakes);
        loadEvents();
      }
    }
  }, [mistakes]);
  
  const loadEvents = () => {
    setEvents(getCalendarEvents());
  };
  
  // Calendar calculations
  const { year, month } = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
  }), [currentDate]);
  
  const monthName = useMemo(() => 
    currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  , [currentDate]);
  
  const daysInMonth = useMemo(() => 
    new Date(year, month + 1, 0).getDate()
  , [year, month]);
  
  const firstDayOfMonth = useMemo(() => 
    new Date(year, month, 1).getDay()
  , [year, month]);
  
  const calendarDays = useMemo(() => {
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }
    
    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);
  
  // Get events for each day
  const eventsMap = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [events]);
  
  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Event handling
  const handleDateClick = (dateObj) => {
    const dateStr = dateObj.date.toISOString().split('T')[0];
    const dayEvents = eventsMap[dateStr] || [];
    
    if (dayEvents.length > 0) {
      setSelectedDate({ dateStr, events: dayEvents });
    } else {
      setSelectedDate({ dateStr, events: [] });
      setShowAddEventModal(true);
    }
  };
  
  const handleEventClick = (event) => {
    // Route to quiz page with appropriate parameters
    if (event.type === EVENT_TYPES.STUDY_SUGGESTION || event.type === EVENT_TYPES.MISTAKE_REVIEW) {
      // Prepare quiz based on event type
      if (event.mistakeId) {
        // Navigate to mistake review
        navigate('/mistakes');
      } else {
        // Navigate to topic practice
        navigate(`/quiz?topic=${encodeURIComponent(event.topic)}&subtopic=${encodeURIComponent(event.subtopic || '')}&count=${event.mcqCount || 10}&mode=practice`);
      }
    }
  };
  
  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.date.toDateString() === today.toDateString();
  };
  
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <CalendarIcon className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Study Planner</h3>
              <p className="text-sm text-indigo-100">Smart scheduling with spaced repetition</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Add Exam/Quiz
          </button>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <h4 className="text-2xl font-black text-white">{monthName}</h4>
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold text-white transition-all"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-black text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dateObj, idx) => {
            const dateStr = dateObj.date.toISOString().split('T')[0];
            const dayEvents = eventsMap[dateStr] || [];
            const hasEvents = dayEvents.length > 0;
            const isTodayDate = isToday(dateObj);
            
            return (
              <button
                key={idx}
                onClick={() => dateObj.isCurrentMonth && handleDateClick(dateObj)}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={!dateObj.isCurrentMonth}
                className={`
                  relative aspect-square rounded-xl p-2 transition-all
                  ${dateObj.isCurrentMonth ? 'bg-slate-50 hover:bg-indigo-50 cursor-pointer' : 'bg-slate-50/30'}
                  ${isTodayDate ? 'ring-2 ring-indigo-500 bg-indigo-100' : ''}
                  ${hasEvents ? 'border-2 border-purple-300' : 'border-2 border-transparent'}
                `}
              >
                {/* Day Number */}
                <div className={`text-sm font-bold mb-1 ${
                  dateObj.isCurrentMonth 
                    ? isTodayDate ? 'text-indigo-700' : 'text-slate-700'
                    : 'text-slate-300'
                }`}>
                  {dateObj.day}
                </div>
                
                {/* Event Indicators */}
                {hasEvents && dateObj.isCurrentMonth && (
                  <div className="flex flex-wrap gap-1 items-center justify-center">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <span key={i} className="text-lg leading-none">
                        {EVENT_ICONS[event.type]}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs font-black text-purple-600">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Hover Tooltip */}
                {hoveredDate === dateStr && dayEvents.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 z-50 bg-slate-900 text-white text-xs rounded-lg p-2 shadow-2xl min-w-[200px]">
                    <div className="font-bold mb-1">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</div>
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className="truncate opacity-90">
                        {EVENT_ICONS[e.type]} {e.title}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
            Event Types
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(EVENT_TYPES).map(([key, type]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-xl">{EVENT_ICONS[type]}</span>
                <span className="text-slate-600 font-semibold">
                  {key.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Date Detail Modal */}
      {selectedDate && !showAddEventModal && (
        <DateDetailModal
          dateStr={selectedDate.dateStr}
          events={selectedDate.events}
          onClose={() => setSelectedDate(null)}
          onEventClick={handleEventClick}
          onAddEvent={() => setShowAddEventModal(true)}
          onDeleteEvent={(eventId) => {
            deleteCalendarEvent(eventId);
            loadEvents();
          }}
        />
      )}
      
      {/* Add Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          initialDate={selectedDate?.dateStr}
          onClose={() => {
            setShowAddEventModal(false);
            setSelectedDate(null);
          }}
          onSave={() => {
            loadEvents();
            setShowAddEventModal(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Date Detail Modal - Shows events for a selected date
 */
function DateDetailModal({ dateStr, events, onClose, onEventClick, onAddEvent, onDeleteEvent }) {
  const { t } = useLanguage();
  
  const formattedDate = useMemo(() => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [dateStr]);
  
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black">{formattedDate}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-indigo-100 text-sm">
            {events.length} scheduled event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Events List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-semibold mb-4">No events scheduled</p>
              <button
                onClick={onAddEvent}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} className="inline mr-2" />
                Add Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  onDelete={() => onDeleteEvent(event.id)}
                />
              ))}
              
              <button
                onClick={onAddEvent}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Another Event
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Event Card Component
 */
function EventCard({ event, onClick, onDelete }) {
  const getEventStyle = () => {
    switch (event.type) {
      case EVENT_TYPES.MAJOR_EXAM:
        return 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300';
      case EVENT_TYPES.SMALL_QUIZ:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300';
      case EVENT_TYPES.STUDY_SUGGESTION:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300';
      case EVENT_TYPES.MISTAKE_REVIEW:
        return 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300';
      case EVENT_TYPES.COMPLETED_ACTIVITY:
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300';
      default:
        return 'bg-slate-50 border-slate-300';
    }
  };
  
  const isClickable = event.type === EVENT_TYPES.STUDY_SUGGESTION || 
                      event.type === EVENT_TYPES.MISTAKE_REVIEW;
  
  return (
    <div
      className={`p-4 rounded-xl border-2 ${getEventStyle()} ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{EVENT_ICONS[event.type]}</span>
          <div>
            <h4 className="font-black text-slate-800">{event.title}</h4>
            <p className="text-sm text-slate-600">{event.description}</p>
          </div>
        </div>
        
        {(event.type === EVENT_TYPES.MAJOR_EXAM || event.type === EVENT_TYPES.SMALL_QUIZ) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 hover:bg-red-100 rounded-lg transition-all text-red-600"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      {event.mcqCount && (
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Target size={14} />
          {event.mcqCount} MCQs
        </div>
      )}
      
      {isClickable && (
        <div className="mt-2 text-xs font-bold text-indigo-600">
          Click to start practice →
        </div>
      )}
    </div>
  );
}

/**
 * Add Event Modal
 */
function AddEventModal({ initialDate, onClose, onSave }) {
  const [eventType, setEventType] = useState(EVENT_TYPES.MAJOR_EXAM);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title || !date || !topic) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newEvent = {
      type: eventType,
      title,
      date,
      topic,
      subtopic,
      description: `${topic}${subtopic ? ` → ${subtopic}` : ''}`,
    };
    
    addCalendarEvent(newEvent);
    onSave();
  };
  
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-black">Add Exam/Quiz</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-indigo-100 text-sm">
              Automatic prep suggestions will be generated
            </p>
          </div>
          
          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Event Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEventType(EVENT_TYPES.MAJOR_EXAM)}
                  className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                    eventType === EVENT_TYPES.MAJOR_EXAM
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  🚩 Major Exam
                </button>
                <button
                  type="button"
                  onClick={() => setEventType(EVENT_TYPES.SMALL_QUIZ)}
                  className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                    eventType === EVENT_TYPES.SMALL_QUIZ
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  ✏️ Small Quiz
                </button>
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chemistry Midterm Exam"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none font-semibold"
              />
            </div>
            
            {/* Date */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none font-semibold"
              />
            </div>
            
            {/* Topic */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Organic Chemistry"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none font-semibold"
              />
            </div>
            
            {/* Subtopic */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Subtopic (Optional)
              </label>
              <input
                type="text"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder="e.g., Reaction Mechanisms"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none font-semibold"
              />
            </div>
            
            {/* Info Box */}
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Zap size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-800">
                  <strong className="font-black">Automatic Suggestions:</strong>
                  {eventType === EVENT_TYPES.MAJOR_EXAM ? (
                    <> Study plan with 10/20/40 MCQs (10-7, 6-4, 3-1 days before)</>
                  ) : (
                    <> Quick review with 5-15 MCQs (3-1 days before)</>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}