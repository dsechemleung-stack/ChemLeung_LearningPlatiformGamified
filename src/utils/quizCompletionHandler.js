/**
 * Quiz Completion Handler: Handles logging completed quiz sessions to calendar
 */

import { addCompletedSession } from './calendarHelper';

// Session types
export const SESSION_TYPES = {
  TOPICAL: 'Topical',
  MISTAKE_BOOK: 'Mistake Book',
  AI_DAILY_MISSION: 'AI Daily Mission',
  PRACTICE_MODE: 'Practice Mode',
  REVIEW_SESSION: 'Review Session'
};

// Log completed quiz session to calendar
export function logQuizCompletion(quizData) {
  const {
    sessionType = SESSION_TYPES.PRACTICE_MODE,
    questionCount = 0,
    correctAnswers = 0,
    timeSpent = 0,
    topics = [],
    date = new Date(),
    includeMistakeReview = false
  } = quizData;

  // Add main session
  addCompletedSession(date, sessionType, {
    questionCount,
    correctAnswers,
    accuracy: questionCount > 0 ? Math.round((correctAnswers / questionCount) * 100) : 0,
    timeSpent,
    topics
  });

  // Add mistake review session if included
  if (includeMistakeReview) {
    addCompletedSession(date, SESSION_TYPES.MISTAKE_BOOK, {
      reviewed: true,
      timeSpent: Math.floor(timeSpent * 0.3) // Assume 30% of time was mistake review
    });
  }

  // Add AI Daily Mission session if it was an AI mission
  if (sessionType === SESSION_TYPES.AI_DAILY_MISSION) {
    addCompletedSession(date, SESSION_TYPES.AI_DAILY_MISSION, {
      questionCount: 10, // AI missions are always 10 questions
      completed: true,
      timeSpent
    });
  }

  return true;
}

// Get session type from quiz parameters
export function getSessionTypeFromParams(params) {
  if (params.get('includeMistakeReview') === 'true') {
    return SESSION_TYPES.MISTAKE_BOOK;
  }
  
  if (params.get('type') === 'ai-mission') {
    return SESSION_TYPES.AI_DAILY_MISSION;
  }
  
  if (params.get('topicId')) {
    return SESSION_TYPES.TOPICAL;
  }
  
  return SESSION_TYPES.PRACTICE_MODE;
}

// Auto-log quiz completion (call this when quiz is finished)
export function autoLogQuizCompletion(quizResults, queryParams = {}) {
  const sessionType = getSessionTypeFromParams(new URLSearchParams(queryParams));
  
  return logQuizCompletion({
    sessionType,
    questionCount: quizResults.totalQuestions || 0,
    correctAnswers: quizResults.correctAnswers || 0,
    timeSpent: quizResults.timeSpent || 0,
    topics: quizResults.topics || [],
    date: new Date(),
    includeMistakeReview: queryParams.get('includeMistakeReview') === 'true'
  });
}
