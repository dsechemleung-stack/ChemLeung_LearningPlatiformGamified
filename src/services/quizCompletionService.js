/**
 * Quiz Completion Service - REFACTORED FOR JIT SRS
 * 
 * KEY CHANGES:
 * 1. ✅ Uses new SRS service for spaced repetition
 * 2. ✅ Creates completion events in calendar
 * 3. ✅ Records performance for AI recommendations
 * 4. ✅ No more pre-scheduling multiple reviews
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc,
  writeBatch,
  increment,
  Timestamp 
} from 'firebase/firestore';
import { performanceService } from './performanceService';
import { srsService } from './srsService';

async function upsertMistakeIndex(userId, wrongAnswers, userAnswers, attemptId) {
  if (!userId) return;
  if (!Array.isArray(wrongAnswers) || wrongAnswers.length === 0) return;

  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);

  wrongAnswers.forEach((q) => {
    const questionId = q?.ID;
    if (!questionId) return;
    const ref = doc(db, 'users', userId, 'mistakes', String(questionId));
    batch.set(
      ref,
      {
        ID: questionId,
        questionId,
        Topic: q?.Topic || q?.topic || null,
        Subtopic: q?.Subtopic || q?.subtopic || null,
        lastAttempted: nowIso,
        lastWrongAt: nowIso,
        lastAttemptId: attemptId || null,
        lastUserAnswer: userAnswers?.[questionId] ?? null,
        attemptCount: increment(1),
        // SRS meta (denormalized). Defaults mean "not yet in SRS".
        hasSrsCard: false,
        srsIsActive: false,
        srsStatus: null,
        srsBucket: 'not_in_srs',
        srsUpdatedAt: nowIso,
        updatedAt: nowIso,
        createdAt: nowIso,
      },
      { merge: true }
    );
  });

  await batch.commit();
}

/**
 * 🎯 MAIN FUNCTION: Process quiz completion
 * 
 * This function:
 * 1. Records performance data for AI recommendations
 * 2. Creates SRS cards for wrong answers using JIT scheduling
 * 3. Logs completion to calendar with full metadata
 */
export async function processQuizCompletion(userId, questions, userAnswers, attemptId = null) {
  const options = arguments.length >= 5 && arguments[4] ? arguments[4] : {};
  const createSrsCards = options?.createSrsCards !== false;
  const results = {
    performanceRecorded: false,
    srsCardsCreated: 0,
    completionLogged: false,
    errors: []
  };

  try {
    // Generate session ID for this quiz
    const sessionId = attemptId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📊 Processing quiz completion:', {
      userId,
      sessionId,
      totalQuestions: questions.length
    });

    // STEP 1: Record performance data (for AI recommendations)
    console.log('📊 Recording performance data...');
    try {
      await performanceService.recordQuizResults(userId, questions, userAnswers);
      results.performanceRecorded = true;
      console.log('✅ Performance data recorded');
    } catch (error) {
      console.error('⚠️ Performance recording error:', error);
      results.errors.push('Performance recording failed: ' + error.message);
    }

    // STEP 2: Create SRS cards for wrong answers (JIT scheduling)
    console.log('🧠 Creating SRS cards for wrong answers...');
    
    const wrongAnswers = questions.filter(q => userAnswers[q.ID] !== q.CorrectOption);

    try {
      await upsertMistakeIndex(userId, wrongAnswers, userAnswers, attemptId);
    } catch (error) {
      console.error('⚠️ Mistake index update error:', error);
      results.errors.push('Mistake index update failed: ' + error.message);
    }
    
    if (wrongAnswers.length > 0 && createSrsCards) {
      console.log(`📝 Found ${wrongAnswers.length} wrong answers`);
      
      try {
        const cards = await srsService.createCardsFromMistakes(
          userId,
          wrongAnswers,
          sessionId,
          attemptId
        );
        
        results.srsCardsCreated = cards.length;
        console.log(`✅ Created ${cards.length} SRS card(s)`);
      } catch (error) {
        console.error('⚠️ SRS card creation error:', error);
        results.errors.push('SRS creation failed: ' + error.message);
      }
    } else {
      console.log('🎉 Perfect score! No SRS cards needed.');
    }

    results.completionLogged = true;

  } catch (error) {
    console.error('❌ Error in quiz completion processing:', error);
    results.errors.push(error.message);
  }

  return results;
}

/**
 * 🔧 Log detailed completion to calendar
 * 
 * This creates a completion event in the calendar with:
 * - Score and percentage
 * - Topics/subtopics covered
 * - Question count
 * - Link back to results page
 * 
 * @param {string} userId - User ID
 * @param {string} attemptId - Attempt ID (for linking back to results)
 * @param {Object} completionData - Quiz completion details
 */
export async function logDetailedCompletion(userId, attemptId, completionData) {
  const {
    totalQuestions,
    correctAnswers,
    percentage,
    topics,
    subtopics,
    timeSpent,
    mode,
    eventId,
    date,
    completedAt,
    title
  } = completionData;

  // Use provided date or today
  const completionDate = date || new Date().toISOString().split('T')[0];
  
  const completionEvent = {
    id: `completion_${attemptId}`,
    userId,
    type: 'completion',
    date: completionDate,
    
    // Display info
    title: title || `Completed: ${percentage}%`,
    description: `${correctAnswers}/${totalQuestions} correct`,
    
    // Performance data
    totalQuestions,
    correctAnswers,
    percentage,
    accuracy: percentage / 100,
    
    // Content covered
    topics: topics || [],
    subtopics: subtopics || [],
    
    // Timing
    timeSpent: timeSpent || null,
    
    // Link back to results
    attemptId,  // CRITICAL: Links to the original attempt for viewing results
    
    // Quiz context
    mode: mode || 'practice',
    linkedEventId: eventId || null,
    
    // Timestamps
    completedAt: completedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('📝 Logging detailed completion to calendar:', completionEvent);

  try {
    await setDoc(
      doc(db, 'calendar_events', completionEvent.id),
      completionEvent
    );
    console.log('✅ Completion logged to calendar');
  } catch (error) {
    console.error('❌ Error logging completion:', error);
    throw error;
  }

  return completionEvent;
}

/**
 * 🔧 Handle spaced repetition review completion
 * 
 * When user completes an SRS review, this:
 * 1. Submits the review to SRS service
 * 2. SRS service automatically calculates next review date
 * 3. Returns updated card state
 * 
 * @param {string} cardId - SRS card ID
 * @param {boolean} wasCorrect - Did user answer correctly?
 * @param {Object} attemptData - Additional attempt data
 */
export async function handleReviewCompletion(cardId, wasCorrect, attemptData = {}) {
  try {
    console.log(`📝 Handling review completion: ${cardId}, correct: ${wasCorrect}`);

    // Submit review to SRS service
    // This will:
    // 1. Record the attempt
    // 2. Update card state
    // 3. Calculate ONLY the next single review date
    const result = await srsService.submitReview(cardId, wasCorrect, attemptData);

    console.log(`✅ Review processed:`, {
      cardId,
      wasCorrect,
      nextReview: result.card.nextReviewDate,
      newInterval: result.card.interval,
      newStatus: result.card.status
    });

    return result;

  } catch (error) {
    console.error('❌ Error handling review completion:', error);
    throw error;
  }
}

/**
 * 🔧 Handle multiple review completions (batch)
 * 
 * Used when user completes a review session with multiple cards
 * 
 * @param {string} userId - User ID
 * @param {Array} reviews - Array of {cardId, wasCorrect, userAnswer}
 */
export async function handleReviewSessionCompletion(userId, reviews) {
  try {
    console.log(`🎯 Handling review session: ${reviews.length} cards`);

    const result = await srsService.submitReviewSession(userId, reviews);

    console.log(`✅ Review session completed:`, {
      sessionId: result.session.id,
      cardsReviewed: result.session.cardsReviewed,
      cardsCorrect: result.session.cardsCorrect,
      cardsFailed: result.session.cardsFailed
    });

    return result;

  } catch (error) {
    console.error('❌ Error handling review session:', error);
    throw error;
  }
}

/**
 * 🔧 Get SRS cards due for review
 * 
 * @param {string} userId - User ID
 */
export async function getDueReviews(userId) {
  try {
    const dueCards = await srsService.getDueCards(userId);
    
    console.log(`📊 Found ${dueCards.length} cards due for review`);
    
    return dueCards;
  } catch (error) {
    console.error('❌ Error getting due reviews:', error);
    throw error;
  }
}

/**
 * 🔧 Get SRS statistics for user
 * 
 * @param {string} userId - User ID
 */
export async function getReviewStats(userId) {
  try {
    const stats = await srsService.getReviewStats(userId);
    
    console.log(`📊 Review stats for ${userId}:`, stats);
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting review stats:', error);
    throw error;
  }
}

export const quizCompletionService = {
  processQuizCompletion,
  logDetailedCompletion,
  handleReviewCompletion,
  handleReviewSessionCompletion,
  getDueReviews,
  getReviewStats
};

export default quizCompletionService;