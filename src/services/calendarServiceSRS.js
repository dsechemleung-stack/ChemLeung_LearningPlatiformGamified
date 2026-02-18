/**
 * Calendar Service - SRS Integration
 * 
 * This module provides the missing link between SRS system and calendar
 * Creates calendar events based on SRS due cards and algorithm scheduling
 */

import { db } from '../firebase/config';
import { 
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { srsService } from './srsService';
import { getNow } from '../utils/timeTravel';
import { calendarServiceOptimized } from './calendarServiceOptimized';

export const EVENT_TYPES = {
  MAJOR_EXAM: 'major_exam',
  SMALL_QUIZ: 'small_quiz',
  STUDY_SUGGESTION: 'study_suggestion',
  SPACED_REPETITION: 'spaced_repetition',
  AI_RECOMMENDATION: 'ai_recommendation',
  COMPLETION: 'completion'
};

/**
 * Create spaced repetition calendar event based on SRS card
 * 
 * @param {string} userId - User ID
 * @param {Object} cardData - SRS card data
 * @returns {Promise<Object>} Created calendar event
 */
export async function createSpacedRepetitionEvent(userId, cardData) {
  try {
    const eventId = `srs_${cardData.id}_${Date.now()}`;
    
    const calendarEvent = {
      id: eventId,
      userId,
      type: EVENT_TYPES.SPACED_REPETITION,
      date: cardData.nextReviewDate,
      title: `SRS Review: ${cardData.subtopic || cardData.topic}`,
      description: `Spaced repetition review for ${cardData.topic}`,
      topic: cardData.topic,
      subtopic: cardData.subtopic,
      questionId: cardData.questionId,
      srsCardId: cardData.id,
      difficulty: cardData.difficulty,
      interval: cardData.interval,
      easeFactor: cardData.easeFactor,
      reviewCount: cardData.reviewCount,
      priority: getPriorityFromDifficulty(cardData.difficulty),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🧠 Creating SRS calendar event:', calendarEvent);

    // Save to user's calendar subcollection
    await setDoc(
      doc(db, 'users', userId, 'calendar_events', eventId),
      calendarEvent
    );

    return calendarEvent;
  } catch (error) {
    console.error('❌ Error creating SRS calendar event:', error);
    throw error;
  }
}

/**
 * Schedule spaced repetition events for due cards
 * This creates calendar events for all SRS cards that are due
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Scheduling options
 * @returns {Promise<Object>} Scheduling results
 */
export async function scheduleSpacedRepetition(userId, options = {}) {
  try {
    console.log('🧠 Scheduling SRS events for user:', userId);
    
    // Schedule only cards due exactly today (avoid scheduling a large overdue backlog)
    const todayStr = getNow().toISOString().split('T')[0];
    const dueCards = await srsService.getCardsDueOnDate(userId, todayStr);
    
    if (dueCards.length === 0) {
      console.log('✅ No due SRS cards found');
      return { scheduled: 0, events: [], message: 'No due cards found' };
    }

    console.log(`📊 Found ${dueCards.length} SRS cards due today (${todayStr})`);

    // Create calendar events for due cards
    const batch = writeBatch(db);
    const events = [];
    
    for (const card of dueCards) {
      // Deterministic ID to prevent duplicates for the same card+date
      const eventId = `srs_${card.id}_${card.nextReviewDate}`;
      
      const calendarEvent = {
        id: eventId,
        userId,
        type: EVENT_TYPES.SPACED_REPETITION,
        date: card.nextReviewDate,
        title: `SRS Review: ${card.subtopic || card.topic}`,
        description: `Spaced repetition review (Interval: ${card.interval} days)`,
        topic: card.topic,
        subtopic: card.subtopic,
        questionId: card.questionId,
        srsCardId: card.id,
        difficulty: card.difficulty ?? null,
        interval: card.interval,
        easeFactor: card.easeFactor,
        reviewCount: card.repetitionCount ?? 0,
        priority: getPriorityFromDifficulty(card.difficulty),
        completed: false,
        createdAt: getNow().toISOString(),
        updatedAt: getNow().toISOString()
      };

      // Add to batch
      const eventRef = doc(db, 'users', userId, 'calendar_events', eventId);
      batch.set(eventRef, calendarEvent, { merge: true });
      events.push(calendarEvent);
    }

    // Commit all events at once
    await batch.commit();
    
    console.log(`✅ Created ${events.length} SRS calendar events`);
    
    return {
      scheduled: events.length,
      events,
      message: `Scheduled ${events.length} SRS reviews`
    };
    
  } catch (error) {
    console.error('❌ Error scheduling SRS events:', error);
    throw error;
  }
}

/**
 * Schedule SRS events for specific questions (from mistakes)
 * 
 * @param {string} userId - User ID
 * @param {Object} params - Question parameters
 * @returns {Promise<Object>} Scheduling results
 */
export async function scheduleSpacedRepetitionForQuestions(userId, params) {
  try {
    const { questionId, topic, subtopic, attemptCount } = params;
    
    console.log('🧠 Creating SRS schedule for question:', { questionId, topic, subtopic });
    
    // First, create SRS cards if they don't exist
    const wrongQuestions = [{
      ID: questionId,
      Topic: topic,
      Subtopic: subtopic,
      attemptCount: attemptCount || 1
    }];
    
    // Create SRS cards from mistakes
    const cards = await srsService.createCardsFromMistakes(
      userId, 
      wrongQuestions, 
      `manual_${Date.now()}`, 
      `manual_attempt_${Date.now()}`
    );
    
    console.log(`📝 Created ${cards.length} SRS cards`);
    
    // Schedule the first review for these cards
    const scheduleResult = await scheduleSpacedRepetition(userId);
    
    return {
      cardsCreated: cards.length,
      ...scheduleResult
    };
    
  } catch (error) {
    console.error('❌ Error scheduling SRS for questions:', error);
    throw error;
  }
}

/**
 * Mark SRS calendar event as completed and update the SRS card
 * 
 * @param {string} userId - User ID
 * @param {string} eventId - Calendar event ID
 * @param {boolean} wasCorrect - Was the review completed correctly?
 * @param {Object} completionData - Additional completion data
 * @returns {Promise<Object>} Updated card and event
 */
export async function completeSpacedRepetitionEvent(userId, eventId, wasCorrect, completionData = {}) {
  try {
    console.log('🧠 Completing SRS event:', eventId, 'correct:', wasCorrect);
    
    // Get the calendar event
    const eventRef = doc(db, 'users', userId, 'calendar_events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('SRS calendar event not found');
    }
    
    const eventData = eventSnap.data();
    
    // Update the SRS card
    if (eventData.srsCardId) {
      await srsService.submitReview(eventData.srsCardId, wasCorrect, {
        completedAt: new Date().toISOString(),
        calendarEventId: eventId,
        ...completionData
      });
    }
    
    // Mark calendar event as completed
    await calendarServiceOptimized.markEventCompleted(userId, eventId, {
      wasCorrect,
      completedAt: new Date().toISOString(),
      ...completionData
    });
    
    // Schedule next review if this was a correct review
    if (wasCorrect && eventData.srsCardId) {
      const updatedCard = await srsService.getCard(eventData.srsCardId);
      if (updatedCard && updatedCard.isActive) {
        await createSpacedRepetitionEvent(userId, updatedCard);
        console.log('📅 Scheduled next SRS review');
      }
    }
    
    return {
      eventCompleted: true,
      cardUpdated: !!eventData.srsCardId,
      nextScheduled: wasCorrect
    };
    
  } catch (error) {
    console.error('❌ Error completing SRS event:', error);
    throw error;
  }
}

/**
 * Get SRS events for a specific date range
 * 
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} SRS calendar events
 */
export async function getSRSEvents(userId, startDate, endDate) {
  try {
    const eventsQuery = query(
      collection(db, 'users', userId, 'calendar_events'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const snapshot = await getDocs(eventsQuery);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((e) => e?.type === EVENT_TYPES.SPACED_REPETITION);
    
  } catch (error) {
    console.error('❌ Error getting SRS events:', error);
    return [];
  }
}

/**
 * Clean up old SRS events that are no longer relevant
 * This removes SRS events for cards that are archived or have newer events
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOldSRSEvents(userId) {
  try {
    console.log('🧹 Cleaning up old SRS events for user:', userId);
    
    // Get all SRS events
    const allEventsQuery = query(
      collection(db, 'users', userId, 'calendar_events')
    );
    
    const snapshot = await getDocs(allEventsQuery);
    const events = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((e) => e?.type === EVENT_TYPES.SPACED_REPETITION);
    
    // Group events by SRS card ID
    const eventsByCard = {};
    events.forEach(event => {
      if (event.srsCardId) {
        if (!eventsByCard[event.srsCardId]) {
          eventsByCard[event.srsCardId] = [];
        }
        eventsByCard[event.srsCardId].push(event);
      }
    });
    
    // Find outdated events to delete
    const toDelete = [];
    const toKeep = [];
    
    for (const [cardId, cardEvents] of Object.entries(eventsByCard)) {
      // Sort by date (newest first)
      cardEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Keep the newest event, mark others for deletion
      const newest = cardEvents.shift();
      toKeep.push(newest);
      toDelete.push(...cardEvents);
    }
    
    // Delete old events
    if (toDelete.length > 0) {
      const batch = writeBatch(db);
      toDelete.forEach(event => {
        const eventRef = doc(db, 'users', userId, 'calendar_events', event.id);
        batch.delete(eventRef);
      });
      await batch.commit();
    }
    
    console.log(`🧹 Cleaned up ${toDelete.length} old SRS events, kept ${toKeep.length}`);
    
    return {
      deleted: toDelete.length,
      kept: toKeep.length,
      total: events.length
    };
    
  } catch (error) {
    console.error('❌ Error cleaning up SRS events:', error);
    return { deleted: 0, kept: 0, total: 0, error: error.message };
  }
}

/**
 * Get priority level based on SRS difficulty
 */
function getPriorityFromDifficulty(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'hard': return 'high';
    case 'medium': return 'medium';
    case 'easy': return 'low';
    default: return 'medium';
  }
}

/**
 * Update the main calendar service to include SRS functions
 */
export const calendarServiceSRS = {
  ...calendarServiceOptimized,
  scheduleSpacedRepetition,
  createSpacedRepetitionEvent,
  completeSpacedRepetitionEvent,
  getSRSEvents,
  cleanupOldSRSEvents,
  scheduleSpacedRepetitionForQuestions
};

export default calendarServiceSRS;
