import { doc, setDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { performanceService } from './performanceService';

/**
 * Calendar Service - Manages user events, exams, quizzes, and AI-generated study plans
 */

export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  SPACED_REPETITION: 'spaced_repetition',
  COMPLETION_LOG: 'completion_log',
  AI_RECOMMENDATION: 'ai_recommendation'  // NEW: AI-generated recommendation
};

export const calendarService = {
  /**
   * Add a major exam event
   */
  async addMajorExam(userId, examData) {
    try {
      const { date, topic, subtopic, title } = examData;
      
      const examRef = await addDoc(collection(db, 'calendar_events'), {
        userId,
        type: EVENT_TYPES.MAJOR_EXAM,
        date: new Date(date).toISOString().split('T')[0],
        topic: topic || null,
        subtopic: subtopic || null,
        title: title || 'Major Exam',
        createdAt: new Date().toISOString(),
        completed: false
      });

      await this.generateMajorExamStudyPlan(userId, examRef.id, date, topic, subtopic);

      return examRef.id;
    } catch (error) {
      console.error('Error adding major exam:', error);
      throw error;
    }
  },

  /**
   * Add a small quiz event
   */
  async addSmallQuiz(userId, quizData) {
    try {
      const { date, topic, subtopic, title } = quizData;
      
      const quizRef = await addDoc(collection(db, 'calendar_events'), {
        userId,
        type: EVENT_TYPES.SMALL_QUIZ,
        date: new Date(date).toISOString().split('T')[0],
        topic: topic || null,
        subtopic: subtopic || null,
        title: title || 'Quiz',
        createdAt: new Date().toISOString(),
        completed: false
      });

      await this.generateSmallQuizStudyPlan(userId, quizRef.id, date, topic, subtopic);

      return quizRef.id;
    } catch (error) {
      console.error('Error adding small quiz:', error);
      throw error;
    }
  },

  /**
   * Generate study plan for major exam
   */
  async generateMajorExamStudyPlan(userId, examId, examDate, topic, subtopic) {
    const batch = writeBatch(db);
    const examDateObj = new Date(examDate);

    // Phase 1: Warm-up (10-7 days before)
    for (let daysBeforeExam = 10; daysBeforeExam >= 7; daysBeforeExam--) {
      const studyDate = new Date(examDateObj);
      studyDate.setDate(studyDate.getDate() - daysBeforeExam);
      
      const ref = doc(collection(db, 'calendar_events'));
      batch.set(ref, {
        userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        date: studyDate.toISOString().split('T')[0],
        topic,
        subtopic,
        questionCount: 10,
        phase: 'warm-up',
        linkedEventId: examId,
        linkedEventType: EVENT_TYPES.MAJOR_EXAM,
        title: `Warm-up: 10 MCQs${topic ? ` - ${topic}` : ''}`,
        createdAt: new Date().toISOString(),
        completed: false
      });
    }

    // Phase 2: Consolidation (6-4 days before)
    for (let daysBeforeExam = 6; daysBeforeExam >= 4; daysBeforeExam--) {
      const studyDate = new Date(examDateObj);
      studyDate.setDate(studyDate.getDate() - daysBeforeExam);
      
      const ref = doc(collection(db, 'calendar_events'));
      batch.set(ref, {
        userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        date: studyDate.toISOString().split('T')[0],
        topic,
        subtopic,
        questionCount: 20,
        phase: 'consolidation',
        linkedEventId: examId,
        linkedEventType: EVENT_TYPES.MAJOR_EXAM,
        title: `Consolidation: 20 MCQs${topic ? ` - ${topic}` : ''}`,
        createdAt: new Date().toISOString(),
        completed: false
      });
    }

    // Phase 3: Sprint (3-1 days before)
    for (let daysBeforeExam = 3; daysBeforeExam >= 1; daysBeforeExam--) {
      const studyDate = new Date(examDateObj);
      studyDate.setDate(studyDate.getDate() - daysBeforeExam);
      
      const ref = doc(collection(db, 'calendar_events'));
      batch.set(ref, {
        userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        date: studyDate.toISOString().split('T')[0],
        topic,
        subtopic,
        questionCount: 40,
        phase: 'sprint',
        linkedEventId: examId,
        linkedEventType: EVENT_TYPES.MAJOR_EXAM,
        title: `Sprint: 40 MCQs${topic ? ` - ${topic}` : ''}`,
        createdAt: new Date().toISOString(),
        completed: false
      });
    }

    await batch.commit();
  },

  /**
   * Generate study plan for small quiz
   */
  async generateSmallQuizStudyPlan(userId, quizId, quizDate, topic, subtopic) {
    const batch = writeBatch(db);
    const quizDateObj = new Date(quizDate);

    const plan = [
      { days: 3, count: 5, phase: 'initial-review', title: 'Initial Review: 5 MCQs' },
      { days: 2, count: 10, phase: 'topic-focus', title: 'Topic Focus: 10 MCQs' },
      { days: 1, count: 15, phase: 'final-polish', title: 'Final Polish: 15 MCQs + Mistakes' }
    ];

    for (const { days, count, phase, title } of plan) {
      const studyDate = new Date(quizDateObj);
      studyDate.setDate(studyDate.getDate() - days);
      
      const ref = doc(collection(db, 'calendar_events'));
      batch.set(ref, {
        userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        date: studyDate.toISOString().split('T')[0],
        topic,
        subtopic,
        questionCount: count,
        phase,
        linkedEventId: quizId,
        linkedEventType: EVENT_TYPES.SMALL_QUIZ,
        title: `${title}${topic ? ` - ${topic}` : ''}`,
        createdAt: new Date().toISOString(),
        completed: false,
        includeMistakes: phase === 'final-polish'
      });
    }

    await batch.commit();
  },

  /**
   * Schedule spaced repetition for a mistake
   */
  async scheduleSpacedRepetition(userId, mistakeData) {
    try {
      const { questionId, topic, subtopic, attemptCount } = mistakeData;
      
      const intervals = [1, 3, 7, 14, 30];
      const intervalIndex = Math.min(attemptCount - 1, intervals.length - 1);
      const daysUntilReview = intervals[intervalIndex];

      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() + daysUntilReview);

      const existingQuery = query(
        collection(db, 'calendar_events'),
        where('userId', '==', userId),
        where('type', '==', EVENT_TYPES.SPACED_REPETITION),
        where('questionId', '==', questionId),
        where('date', '==', reviewDate.toISOString().split('T')[0])
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        await addDoc(collection(db, 'calendar_events'), {
          userId,
          type: EVENT_TYPES.SPACED_REPETITION,
          date: reviewDate.toISOString().split('T')[0],
          questionId,
          topic,
          subtopic,
          attemptCount,
          interval: daysUntilReview,
          title: `Review: ${topic}${subtopic ? ` - ${subtopic}` : ''}`,
          createdAt: new Date().toISOString(),
          completed: false
        });
      }

      return reviewDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error scheduling spaced repetition:', error);
      throw error;
    }
  },

  /**
   * NEW: Create AI recommendation event from suggestion
   */
  async createAIRecommendationEvent(userId, recommendation) {
    try {
      const eventRef = await addDoc(collection(db, 'calendar_events'), {
        userId,
        type: EVENT_TYPES.AI_RECOMMENDATION,
        date: recommendation.suggestedDate,
        topic: recommendation.topic,
        subtopic: recommendation.subtopic,
        questionCount: recommendation.questionCount,
        priority: recommendation.priority,
        reason: recommendation.reason,
        recommendationId: recommendation.id,
        title: `🤖 AI Suggests: ${recommendation.subtopic}`,
        description: recommendation.reason,
        createdAt: new Date().toISOString(),
        completed: false
      });

      // Mark recommendation as accepted
      await performanceService.acceptRecommendation(userId, recommendation.id);

      return eventRef.id;
    } catch (error) {
      console.error('Error creating AI recommendation event:', error);
      throw error;
    }
  },

  /**
   * Log completion of a study session
   * NOW ALSO RECORDS PERFORMANCE
   */
  async logCompletion(userId, date, sessionData, questions = null, answers = null) {
    try {
      const { type, topic, questionCount, correctCount } = sessionData;
      
      // Log to calendar
      await addDoc(collection(db, 'calendar_events'), {
        userId,
        type: EVENT_TYPES.COMPLETION_LOG,
        date: new Date(date).toISOString().split('T')[0],
        sessionType: type,
        topic,
        questionCount,
        correctCount,
        accuracy: correctCount / questionCount,
        timestamp: new Date().toISOString()
      });

      // Record performance if questions and answers provided
      if (questions && answers) {
        await performanceService.recordQuizResults(userId, questions, answers);
      }
    } catch (error) {
      console.error('Error logging completion:', error);
      throw error;
    }
  },

  /**
   * Mark an event as completed
   */
  async markEventCompleted(eventId) {
    try {
      const eventRef = doc(db, 'calendar_events', eventId);
      await updateDoc(eventRef, {
        completed: true,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking event completed:', error);
      throw error;
    }
  },

  /**
   * Get all events for a user in a date range
   */
  async getUserEvents(userId, startDate, endDate) {
    try {
      const q = query(
        collection(db, 'calendar_events'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting user events:', error);
      throw error;
    }
  },

  /**
   * Delete an event (and optionally its linked study suggestions)
   */
  async deleteEvent(eventId, deleteLinkedEvents = true) {
    try {
      const eventRef = doc(db, 'calendar_events', eventId);
      
      if (deleteLinkedEvents) {
        const linkedQuery = query(
          collection(db, 'calendar_events'),
          where('linkedEventId', '==', eventId)
        );
        
        const linkedDocs = await getDocs(linkedQuery);
        const batch = writeBatch(db);
        
        linkedDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        batch.delete(eventRef);
        await batch.commit();
      } else {
        await deleteDoc(eventRef);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  /**
   * Get events grouped by date for calendar display
   * NOW INCLUDES AI RECOMMENDATIONS
   */
  async getCalendarData(userId, year, month) {
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const events = await this.getUserEvents(userId, startDate, endDate);
      
      // Group events by date
      const calendar = {};
      
      events.forEach(event => {
        if (!calendar[event.date]) {
          calendar[event.date] = {
            exams: [],
            quizzes: [],
            suggestions: [],
            repetitions: [],
            completions: [],
            aiRecommendations: []  // NEW
          };
        }
        
        switch (event.type) {
          case EVENT_TYPES.MAJOR_EXAM:
            calendar[event.date].exams.push(event);
            break;
          case EVENT_TYPES.SMALL_QUIZ:
            calendar[event.date].quizzes.push(event);
            break;
          case EVENT_TYPES.STUDY_SUGGESTION:
            calendar[event.date].suggestions.push(event);
            break;
          case EVENT_TYPES.SPACED_REPETITION:
            calendar[event.date].repetitions.push(event);
            break;
          case EVENT_TYPES.COMPLETION_LOG:
            calendar[event.date].completions.push(event);
            break;
          case EVENT_TYPES.AI_RECOMMENDATION:
            calendar[event.date].aiRecommendations.push(event);
            break;
        }
      });
      
      return calendar;
    } catch (error) {
      console.error('Error getting calendar data:', error);
      throw error;
    }
  }
};