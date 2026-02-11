/**
 * Calendar Event Manager (Merged)
 * Combines user-specific storage with spaced repetition and event management
 */

import { auth } from '../firebase/config';

// Event Types
export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  MISTAKE_REVIEW: 'mistake_review',
  COMPLETED_ACTIVITY: 'completed_activity',
};

// Event Icons
export const EVENT_ICONS = {
  [EVENT_TYPES.MAJOR_EXAM]: '🚩',
  [EVENT_TYPES.SMALL_QUIZ]: '✏️',
  [EVENT_TYPES.STUDY_SUGGESTION]: '💡',
  [EVENT_TYPES.MISTAKE_REVIEW]: '🧠',
  [EVENT_TYPES.COMPLETED_ACTIVITY]: '✅',
};

/**
 * Get user-specific storage key (Firebase auth aware)
 */
function getUserStorageKey(suffix) {
  const user = auth.currentUser;
  if (!user) return `studyCalendar_guest_${suffix}`;
  return `studyCalendar_${user.uid}_${suffix}`;
}

/**
 * Load calendar data from localStorage (user-specific)
 */
export function loadCalendarData() {
  try {
    const data = localStorage.getItem(getUserStorageKey('data'));
    return data ? JSON.parse(data) : { events: [], completedSessions: {} };
  } catch (error) {
    console.error('Error loading calendar data:', error);
    return { events: [], completedSessions: {} };
  }
}

/**
 * Save calendar data to localStorage (user-specific)
 */
export function saveCalendarData(data) {
  try {
    localStorage.setItem(getUserStorageKey('data'), JSON.stringify(data));
    // Trigger storage event for cross-component updates
    window.dispatchEvent(new Event('calendar-update'));
  } catch (error) {
    console.error('Error saving calendar data:', error);
  }
}

/**
 * Get all calendar events
 */
export function getCalendarEvents() {
  const data = loadCalendarData();
  return data.events || [];
}

/**
 * Save calendar events
 */
export function saveCalendarEvents(events) {
  const data = loadCalendarData();
  data.events = events;
  saveCalendarData(data);
}

/**
 * Calculate spaced repetition interval based on mistake improvement count
 * Uses SM-2 inspired algorithm with mistake-specific adjustments
 */
export function calculateSpacedRepetitionDate(mistake) {
  const now = new Date();
  const improvementCount = mistake.improvementCount || 0;
  
  // Spaced repetition intervals (in days)
  const intervals = {
    0: 1,   // First review: next day
    1: 3,   // Second review: 3 days later
    2: 7,   // Third review: 1 week later
    3: 14,  // Mastered but reinforce: 2 weeks
  };
  
  const daysToAdd = intervals[improvementCount] || 14;
  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + daysToAdd);
  
  return reviewDate.toISOString().split('T')[0];
}

/**
 * Generate study suggestions based on exam date and topic
 * Returns array of suggestion events with scaled MCQ counts
 */
export function generateExamPrepSuggestions(examDate, topic, subtopic = null) {
  const exam = new Date(examDate);
  const suggestions = [];
  
  // Major Exam Scaling Algorithm
  const prepSchedule = [
    { daysBeforeStart: 10, daysBeforeEnd: 7, mcqCount: 10, phase: 'Warm-up' },
    { daysBeforeStart: 6, daysBeforeEnd: 4, mcqCount: 20, phase: 'Consolidation' },
    { daysBeforeStart: 3, daysBeforeEnd: 1, mcqCount: 40, phase: 'Sprint' },
  ];
  
  prepSchedule.forEach(({ daysBeforeStart, daysBeforeEnd, mcqCount, phase }) => {
    for (let day = daysBeforeStart; day >= daysBeforeEnd; day--) {
      const suggestionDate = new Date(exam);
      suggestionDate.setDate(suggestionDate.getDate() - day);
      
      suggestions.push({
        id: `prep_${topic}_${day}`,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        date: suggestionDate.toISOString().split('T')[0],
        title: `${phase} - ${mcqCount} MCQs`,
        description: `Practice ${mcqCount} questions on ${topic}`,
        topic,
        subtopic,
        mcqCount,
        phase,
        linkedExamId: examDate,
      });
    }
  });
  
  return suggestions;
}

/**
 * Generate quiz prep suggestions (smaller scale)
 */
export function generateQuizPrepSuggestions(quizDate, topic, subtopic) {
  const quiz = new Date(quizDate);
  const suggestions = [];
  
  // Small Quiz: 3-1 days before with 5-15 MCQs on subtopic
  for (let day = 3; day >= 1; day--) {
    const suggestionDate = new Date(quiz);
    suggestionDate.setDate(suggestionDate.getDate() - day);
    
    const mcqCount = day === 1 ? 15 : (day === 2 ? 10 : 5);
    
    suggestions.push({
      id: `quiz_prep_${subtopic}_${day}`,
      type: EVENT_TYPES.STUDY_SUGGESTION,
      date: suggestionDate.toISOString().split('T')[0],
      title: `Quiz Prep - ${mcqCount} MCQs`,
      description: `Review ${mcqCount} questions on ${subtopic}`,
      topic,
      subtopic,
      mcqCount,
      linkedQuizId: quizDate,
    });
  }
  
  return suggestions;
}

/**
 * Add a new event (exam or quiz)
 */
export function addCalendarEvent(event) {
  const events = getCalendarEvents();
  
  // Add the main event
  events.push({
    ...event,
    id: event.id || `${event.type}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  
  // Generate prep suggestions if it's an exam or quiz
  if (event.type === EVENT_TYPES.MAJOR_EXAM) {
    const suggestions = generateExamPrepSuggestions(event.date, event.topic, event.subtopic);
    events.push(...suggestions);
  } else if (event.type === EVENT_TYPES.SMALL_QUIZ) {
    const suggestions = generateQuizPrepSuggestions(event.date, event.topic, event.subtopic);
    events.push(...suggestions);
  }
  
  saveCalendarEvents(events);
  return events;
}

/**
 * Delete an event and its associated suggestions
 */
export function deleteCalendarEvent(eventId) {
  const events = getCalendarEvents();
  const filtered = events.filter(e => 
    e.id !== eventId && 
    e.linkedExamId !== eventId && 
    e.linkedQuizId !== eventId
  );
  saveCalendarEvents(filtered);
  return filtered;
}

/**
 * Mark event as completed
 */
export function completeCalendarEvent(eventId, completedData = {}) {
  const events = getCalendarEvents();
  const event = events.find(e => e.id === eventId);
  
  if (event) {
    // Mark original as completed
    event.completed = true;
    event.completedAt = new Date().toISOString();
    event.completedData = completedData;
    
    // Add completion badge
    events.push({
      id: `completed_${eventId}`,
      type: EVENT_TYPES.COMPLETED_ACTIVITY,
      date: event.date,
      title: `✅ ${event.title}`,
      description: `Completed: ${event.description}`,
      parentEventId: eventId,
    });
  }
  
  saveCalendarEvents(events);
  return events;
}

/**
 * Schedule mistake review based on spaced repetition
 */
export function scheduleMistakeReview(mistake) {
  const events = getCalendarEvents();
  const reviewDate = calculateSpacedRepetitionDate(mistake);
  
  // Remove old review for this mistake
  const filtered = events.filter(e => 
    !(e.type === EVENT_TYPES.MISTAKE_REVIEW && e.mistakeId === mistake.ID)
  );
  
  // Add new review
  filtered.push({
    id: `review_${mistake.ID}_${Date.now()}`,
    type: EVENT_TYPES.MISTAKE_REVIEW,
    date: reviewDate,
    title: `Review Mistake`,
    description: `${mistake.Topic} → ${mistake.Subtopic}`,
    topic: mistake.Topic,
    subtopic: mistake.Subtopic,
    mistakeId: mistake.ID,
    improvementCount: mistake.improvementCount || 0,
  });
  
  saveCalendarEvents(filtered);
  return filtered;
}

/**
 * Batch schedule mistake reviews for all active mistakes
 */
export function batchScheduleMistakeReviews(mistakes) {
  const events = getCalendarEvents();
  
  // Remove all existing mistake reviews
  const filtered = events.filter(e => e.type !== EVENT_TYPES.MISTAKE_REVIEW);
  
  // Add new reviews for all mistakes
  mistakes.forEach(mistake => {
    const reviewDate = calculateSpacedRepetitionDate(mistake);
    
    filtered.push({
      id: `review_${mistake.ID}_${Date.now()}`,
      type: EVENT_TYPES.MISTAKE_REVIEW,
      date: reviewDate,
      title: `Review Mistake`,
      description: `${mistake.Topic}${mistake.Subtopic ? ` → ${mistake.Subtopic}` : ''}`,
      topic: mistake.Topic,
      subtopic: mistake.Subtopic,
      mistakeId: mistake.ID,
      improvementCount: mistake.improvementCount || 0,
    });
  });
  
  saveCalendarEvents(filtered);
  return filtered;
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(dateStr) {
  const events = getCalendarEvents();
  return events.filter(e => e.date === dateStr && !e.completed);
}

/**
 * Get events for a date range
 */
export function getEventsForDateRange(startDate, endDate) {
  const events = getCalendarEvents();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= start && eventDate <= end && !e.completed;
  });
}

/**
 * Get events in range (alias for compatibility)
 */
export function getEventsInRange(startDate, endDate) {
  return getEventsForDateRange(startDate, endDate);
}

/**
 * Get upcoming events (next 7 days)
 */
export function getUpcomingEvents(days = 7) {
  const today = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return getEventsForDateRange(
    today.toISOString().split('T')[0],
    future.toISOString().split('T')[0]
  ).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Add completed session to calendar
 */
export function addCompletedSession(date, sessionType, details = {}) {
  const calendarData = loadCalendarData();
  const dateStr = date.toISOString().split('T')[0];
  
  if (!calendarData.completedSessions[dateStr]) {
    calendarData.completedSessions[dateStr] = [];
  }
  
  calendarData.completedSessions[dateStr].push({
    type: sessionType,
    timestamp: new Date().toISOString(),
    ...details
  });
  
  saveCalendarData(calendarData);
}

/**
 * Get completed sessions for a specific date
 */
export function getCompletedSessions(date) {
  const calendarData = loadCalendarData();
  const dateStr = date.toISOString().split('T')[0];
  return calendarData.completedSessions[dateStr] || [];
}

/**
 * Remove event from calendar (alias for compatibility)
 */
export function removeCalendarEvent(eventId) {
  return deleteCalendarEvent(eventId);
}

/**
 * Clear old data (older than 6 months)
 */
export function clearOldCalendarData() {
  const calendarData = loadCalendarData();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Filter old events
  calendarData.events = calendarData.events.filter(event => 
    new Date(event.date) >= sixMonthsAgo
  );
  
  // Filter old completed sessions
  Object.keys(calendarData.completedSessions).forEach(dateStr => {
    if (new Date(dateStr) < sixMonthsAgo) {
      delete calendarData.completedSessions[dateStr];
    }
  });
  
  saveCalendarData(calendarData);
}