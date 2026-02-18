/**
 * Calendar Service - OPTIMIZED VERSION
 * 
 * KEY FIXES:
 * 1. User subcollections for data isolation
 * 2. Client-side caching
 * 3. Batch operations for study plans
 * 4. Query optimization
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { performanceService } from './performanceService';
import { formatHKDateKey, makeHKDate } from '../utils/hkTime';

export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  SPACED_REPETITION: 'spaced_repetition',
  AI_RECOMMENDATION: 'ai_recommendation',
  COMPLETION: 'completion'
};

const CALENDAR_EVENT_TYPES_FOR_MONTH_VIEW = [
  EVENT_TYPES.MAJOR_EXAM,
  EVENT_TYPES.SMALL_QUIZ,
  EVENT_TYPES.STUDY_SUGGESTION,
  EVENT_TYPES.AI_RECOMMENDATION,
  EVENT_TYPES.COMPLETION,
];

// Client-side cache for calendar data
const calendarCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const MANUAL_EVENT_TYPES = [EVENT_TYPES.MAJOR_EXAM, EVENT_TYPES.SMALL_QUIZ];
const MANUAL_EVENT_MAX = 8;
const MANUAL_EVENT_RETENTION_DAYS = 30;
const CLEANUP_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCleanupThrottleKey(userId) {
  return `calendar_manual_cleanup_last_${userId}`;
}

function getDateKeyDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

async function cleanupOldManualEvents(userId) {
  if (!userId) return;

  const cutoff = getDateKeyDaysAgo(MANUAL_EVENT_RETENTION_DAYS);
  const eventsRef = collection(db, 'users', userId, 'calendar_events');

  // Batch delete old manual events in pages to avoid huge reads.
  // Each parent event deletion also cascades to its linked children.
  const pageSize = 25;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const oldManualQuery = query(
      eventsRef,
      where('date', '<', cutoff),
      orderBy('date', 'asc'),
      limit(pageSize)
    );

    const snap = await getDocs(oldManualQuery);
    if (snap.empty) break;

    const candidates = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) }))
      .filter((e) => MANUAL_EVENT_TYPES.includes(e.type));

    for (const e of candidates) {
      await deleteEvent(userId, e.id, true);
    }
  }
}

async function ensureManualEventCapacity(userId) {
  if (!userId) return;

  const eventsRef = collection(db, 'users', userId, 'calendar_events');

  // If already at/over cap, delete earliest manual event (and its linked children).
  // We may be asked to create the 9th event, but this also repairs existing >8 states.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const manualQuery = query(
      eventsRef,
      orderBy('date', 'asc'),
      limit(MANUAL_EVENT_MAX + 1)
    );

    const snap = await getDocs(manualQuery);
    const manualDocs = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) }))
      .filter((e) => MANUAL_EVENT_TYPES.includes(e.type));

    if (manualDocs.length <= MANUAL_EVENT_MAX) break;

    const earliest = manualDocs[0];
    if (!earliest?.id) break;
    await deleteEvent(userId, earliest.id, true);
  }
}

async function maybeRunManualCleanup(userId) {
  if (!userId) return;
  try {
    const key = getCleanupThrottleKey(userId);
    const lastRaw = localStorage.getItem(key);
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    if (!Number.isFinite(last) || now - last > CLEANUP_THROTTLE_MS) {
      await cleanupOldManualEvents(userId);
      localStorage.setItem(key, String(now));
    }
  } catch {
    // ignore (non-browser env or localStorage blocked)
  }
}

/**
 * 🔧 OPTIMIZED: Get calendar data with caching and user subcollection
 */
export async function getCalendarData(userId, year, month) {
  const cacheKey = `${userId}_${year}_${month}`;
  const now = Date.now();

  await maybeRunManualCleanup(userId);
  
  // Check cache first
  if (calendarCache.has(cacheKey)) {
    const cached = calendarCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log('📅 Using cached calendar data for:', cacheKey);
      return cached.data;
    }
  }

  const startDateStr = formatHKDateKey(makeHKDate(year, month, 1));
  const endDateStr = formatHKDateKey(makeHKDate(year, month + 1, 0));

  console.log('📅 Loading calendar for:', { userId, year, month, startDateStr, endDateStr });

  // ✅ OPTIMIZED: Query user's subcollection instead of global collection
  const eventsQuery = query(
    collection(db, 'users', userId, 'calendar_events'),  // User-specific subcollection
    where('date', '>=', startDateStr),
    where('date', '<=', endDateStr)
  );

  const settled = await Promise.allSettled([
    getDocs(eventsQuery),
    getDocs(query(
      collection(db, 'users', userId, 'srs_daily_summaries'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    ))
  ]);

  const eventsSnapshot = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const srsSummarySnapshot = settled[1].status === 'fulfilled' ? settled[1].value : null;

  if (settled[0].status === 'rejected') {
    console.error('❌ Calendar events query failed:', settled[0].reason);
  }
  if (settled[1].status === 'rejected') {
    console.error('❌ SRS summary query failed:', settled[1].reason);
  }
  
  console.log('📊 Found', eventsSnapshot?.size || 0, 'events for user', userId);
  console.log('🧠 Found', srsSummarySnapshot?.size || 0, 'SRS daily summaries for month');

  // Organize by date
  const calendarData = {};

  (eventsSnapshot?.docs || []).forEach(doc => {
    const event = { id: doc.id, ...doc.data() };
    if (!CALENDAR_EVENT_TYPES_FOR_MONTH_VIEW.includes(event.type)) return;
    
    if (!calendarData[event.date]) {
      calendarData[event.date] = {
        exams: [],
        quizzes: [],
        suggestions: [],
        repetitions: [],
        srsSummary: null,
        aiRecommendations: [],
        completions: []
      };
    }

    // Sort events by type
    if (event.type === EVENT_TYPES.MAJOR_EXAM) {
      calendarData[event.date].exams.push(event);
    } else if (event.type === EVENT_TYPES.SMALL_QUIZ) {
      calendarData[event.date].quizzes.push(event);
    } else if (event.type === EVENT_TYPES.STUDY_SUGGESTION) {
      calendarData[event.date].suggestions.push(event);
    } else if (event.type === EVENT_TYPES.AI_RECOMMENDATION) {
      calendarData[event.date].aiRecommendations.push(event);
    } else if (event.type === EVENT_TYPES.COMPLETION) {
      calendarData[event.date].completions.push(event);
    }
  });

  // Attach SRS summaries (cheap counts for calendar; no per-question docs)
  (srsSummarySnapshot?.docs || []).forEach((docSnap) => {
    const summary = { id: docSnap.id, ...docSnap.data() };
    const dateKey = summary.date || docSnap.id;
    if (!dateKey) return;

    if (!calendarData[dateKey]) {
      calendarData[dateKey] = {
        exams: [],
        quizzes: [],
        suggestions: [],
        repetitions: [],
        srsSummary: null,
        aiRecommendations: [],
        completions: [],
      };
    }

    calendarData[dateKey].srsSummary = summary;
  });

  // Cache the result
  calendarCache.set(cacheKey, {
    data: calendarData,
    timestamp: now
  });

  console.log('✅ Calendar data cached and organized:', Object.keys(calendarData).length, 'days with events');

  return calendarData;
}

/**
 * ✅ OPTIMIZED: Add major exam with batched study plan creation
 */
export async function addMajorExam(userId, examData) {
  const { date, title, topics, subtopics } = examData;

  await maybeRunManualCleanup(userId);
  await ensureManualEventCapacity(userId);
  
  const examEvent = {
    id: `exam_${Date.now()}`,
    userId,
    type: EVENT_TYPES.MAJOR_EXAM,
    date,
    title,
    topics,
    subtopics,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('📝 Creating exam event:', examEvent);

  // ✅ Use user subcollection
  await setDoc(
    doc(db, 'users', userId, 'calendar_events', examEvent.id),
    examEvent
  );

  // Generate study plan (10-day)
  const studyPlan = generateMajorExamPlan(examEvent);
  
  // ✅ OPTIMIZED: Batch write all study suggestions at once
  const batch = writeBatch(db);
  studyPlan.forEach(suggestion => {
    const suggestionRef = doc(db, 'users', userId, 'calendar_events', suggestion.id);
    batch.set(suggestionRef, suggestion);
  });
  
  await batch.commit();

  console.log('✅ Created exam + batched study plan:', { exam: examEvent.id, suggestions: studyPlan.length });

  // Invalidate cache for this month
  invalidateCalendarCache(userId, new Date(examEvent.date));

  return { examEvent, studyPlan };
}

/**
 * ✅ OPTIMIZED: Add small quiz with batched study plan
 */
export async function addSmallQuiz(userId, quizData) {
  const { date, title, topics, subtopics } = quizData;

  await maybeRunManualCleanup(userId);
  await ensureManualEventCapacity(userId);
  
  const quizEvent = {
    id: `quiz_${Date.now()}`,
    userId,
    type: EVENT_TYPES.SMALL_QUIZ,
    date,
    title,
    topics,
    subtopics,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('📝 Creating quiz event:', quizEvent);

  // ✅ Use user subcollection
  await setDoc(
    doc(db, 'users', userId, 'calendar_events', quizEvent.id),
    quizEvent
  );

  // Generate study plan (3-day)
  const studyPlan = generateSmallQuizPlan(quizEvent);
  
  // ✅ OPTIMIZED: Batch write all study suggestions
  const batch = writeBatch(db);
  studyPlan.forEach(suggestion => {
    const suggestionRef = doc(db, 'users', userId, 'calendar_events', suggestion.id);
    batch.set(suggestionRef, suggestion);
  });
  
  await batch.commit();

  console.log('✅ Created quiz + batched study plan:', { quiz: quizEvent.id, suggestions: studyPlan.length });

  // Invalidate cache for this month
  invalidateCalendarCache(userId, new Date(quizEvent.date));

  return { quizEvent, studyPlan };
}

/**
 * ✅ OPTIMIZED: Create AI recommendation in user subcollection
 */
export async function createAIRecommendationEvent(userId, recommendation) {
  const aiEvent = {
    id: `ai_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: EVENT_TYPES.AI_RECOMMENDATION,
    date: recommendation.suggestedDate,
    title: `AI: ${recommendation.subtopic}`,
    description: recommendation.reason,
    topic: recommendation.topic,
    subtopic: recommendation.subtopic,
    questionCount: recommendation.questionCount,
    priority: recommendation.priority,
    currentAccuracy: recommendation.currentAccuracy,
    sourceRecommendationId: recommendation.id,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('🤖 Creating AI recommendation event:', aiEvent);

  // ✅ Use user subcollection
  await setDoc(
    doc(db, 'users', userId, 'calendar_events', aiEvent.id),
    aiEvent
  );

  await performanceService.acceptRecommendation(userId, recommendation.id);

  console.log('✅ AI recommendation added to calendar');

  // Invalidate cache for this month
  invalidateCalendarCache(userId, new Date(recommendation.suggestedDate));

  return aiEvent;
}

/**
 * ✅ OPTIMIZED: Mark event completed in user subcollection
 */
export async function markEventCompleted(userId, eventId, completionData = {}) {
  try {
    // ✅ Use user subcollection
    const eventRef = doc(db, 'users', userId, 'calendar_events', eventId);
    
    await updateDoc(eventRef, {
      completed: true,
      completedAt: new Date().toISOString(),
      completionData,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Event marked as completed:', eventId);
  } catch (error) {
    console.error('❌ Error marking event as completed:', error);
    throw error;
  }
}

/**
 * ✅ OPTIMIZED: Delete event from user subcollection
 */
export async function deleteEvent(userId, eventId, cascadeDelete = true) {
  try {
    console.log('🗑️ Deleting event:', eventId, '(cascade:', cascadeDelete, ')');

    // ✅ Use user subcollection
    const eventRef = doc(db, 'users', userId, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();
    
    await deleteDoc(eventRef);
    console.log('✅ Deleted main event:', eventId);

    if (cascadeDelete) {
      // ✅ Query user subcollection for children
      const childrenQuery = query(
        collection(db, 'users', userId, 'calendar_events'),
        where('linkedEventId', '==', eventId)
      );
      
      const childrenSnapshot = await getDocs(childrenQuery);
      
      console.log('🔍 Found', childrenSnapshot.size, 'child events to delete');
      
      const batch = writeBatch(db);
      childrenSnapshot.forEach((childDoc) => {
        batch.delete(childDoc.ref);
      });
      
      if (childrenSnapshot.size > 0) {
        await batch.commit();
        console.log('✅ Deleted', childrenSnapshot.size, 'child events');
      }
    }

    console.log('✅ Event deletion complete');

    // Invalidate cache for this month
    invalidateCalendarCache(userId, new Date(eventData.date));
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    throw error;
  }
}

/**
 * Cache management utilities
 */
function invalidateCalendarCache(userId, date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const cacheKey = `${userId}_${year}_${month}`;
  
  if (calendarCache.has(cacheKey)) {
    calendarCache.delete(cacheKey);
    console.log('🗑️ Invalidated cache for:', cacheKey);
  }
}

export function clearCalendarCache() {
  calendarCache.clear();
  console.log('🗑️ Cleared all calendar cache');
}

// Helper functions (unchanged)
function generateMajorExamPlan(examEvent) {
  const examDate = new Date(examEvent.date);
  const suggestions = [];
  
  const schedule = [
    { days: [10, 9, 8, 7], count: 10, phase: 'Warm-up' },
    { days: [6, 5, 4], count: 20, phase: 'Consolidation' },
    { days: [3, 2, 1], count: 40, phase: 'Sprint' }
  ];
  
  schedule.forEach(({ days, count, phase }) => {
    days.forEach(daysBefore => {
      const suggestionDate = new Date(examDate);
      suggestionDate.setDate(suggestionDate.getDate() - daysBefore);
      
      suggestions.push({
        id: `suggestion_${examEvent.id}_day${daysBefore}`,
        userId: examEvent.userId,
        type: EVENT_TYPES.STUDY_SUGGESTION,
        parentEventId: examEvent.id,
        linkedEventId: examEvent.id,
        date: suggestionDate.toISOString().split('T')[0],
        title: `${phase} - ${count} MCQs`,
        description: `Day ${daysBefore} before exam`,
        questionCount: count,
        phase,
        topics: examEvent.topics,
        subtopics: examEvent.subtopics,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  });
  
  return suggestions;
}

function generateSmallQuizPlan(quizEvent) {
  const quizDate = new Date(quizEvent.date);
  const suggestions = [];
  
  const schedule = [
    { day: 3, count: 5, phase: 'Initial Review' },
    { day: 2, count: 10, phase: 'Topic Focus' },
    { day: 1, count: 15, phase: 'Final Polish' }
  ];
  
  schedule.forEach(({ day, count, phase }) => {
    const suggestionDate = new Date(quizDate);
    suggestionDate.setDate(suggestionDate.getDate() - day);
    
    suggestions.push({
      id: `suggestion_${quizEvent.id}_day${day}`,
      userId: quizEvent.userId,
      type: EVENT_TYPES.STUDY_SUGGESTION,
      parentEventId: quizEvent.id,
      linkedEventId: quizEvent.id,
      date: suggestionDate.toISOString().split('T')[0],
      title: `${phase} - ${count} MCQs`,
      description: `Day ${day} before quiz`,
      questionCount: count,
      phase,
      topics: quizEvent.topics,
      subtopics: quizEvent.subtopics,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  
  return suggestions;
}

export const calendarServiceOptimized = {
  addMajorExam,
  addSmallQuiz,
  createAIRecommendationEvent,
  markEventCompleted,
  deleteEvent,
  getCalendarData,
  clearCalendarCache
};

export default calendarServiceOptimized;
