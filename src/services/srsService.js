/**
 * SRS Service - Firestore Integration
 * 
 * Manages spaced repetition cards using Just-in-Time scheduling
 * 
 * CRITICAL: This service NEVER pre-schedules multiple reviews.
 * Reviews are created ONE AT A TIME as users complete them.
 */

import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { getNow } from '../utils/timeTravel';
import { formatHKDateKey } from '../utils/hkTime';
import {
  createNewCard,
  updateCardAfterReview,
  isCardDue,
  shouldArchiveCard,
  SRS_CONFIG
} from './srsAlgorithm';

// Collection names
const COLLECTIONS = {
  CARDS: 'spaced_repetition_cards',
  ATTEMPTS: 'review_attempts',
  SESSIONS: 'review_sessions'
};

function deriveSrsBucketFromCard(card) {
  if (!card || typeof card !== 'object') return 'not_in_srs';
  if (card.isActive === false) return 'archived';
  if (card.status === 'new') return 'new';
  if (card.status === 'learning') return 'progressing';
  if (card.status === 'review') return 'near';
  if (card.status === 'graduated') return 'archived';
  return 'progressing';
}

async function upsertMistakeSrsMeta(userId, questionId, cardOrNull) {
  if (!userId || !questionId) return;

  const ref = doc(db, 'users', userId, 'mistakes', String(questionId));

  if (!cardOrNull) {
    await setDoc(ref, {
      hasSrsCard: false,
      srsIsActive: false,
      srsStatus: null,
      srsBucket: 'not_in_srs',
      srsUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    return;
  }

  await setDoc(ref, {
    hasSrsCard: true,
    srsIsActive: cardOrNull.isActive !== false,
    srsStatus: cardOrNull.status || null,
    srsBucket: deriveSrsBucketFromCard(cardOrNull),
    srsCardId: cardOrNull.id || null,
    srsUpdatedAt: new Date().toISOString(),
  }, { merge: true });
}

async function findAnyCardForQuestion(userId, questionId) {
  if (!userId || !questionId) return null;

  // Prefer deterministic ID (new behavior)
  const deterministicId = `card_${userId}_${questionId}`;
  const deterministicRef = doc(db, COLLECTIONS.CARDS, deterministicId);
  const deterministicSnap = await getDoc(deterministicRef);
  if (deterministicSnap.exists()) {
    return { id: deterministicSnap.id, ...deterministicSnap.data() };
  }

  // Backward-compatibility: legacy cards were session-scoped IDs.
  // We pick any existing card for this question.
  const q = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('questionId', '==', questionId),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

function resetCardForReactivation(card, { topic, subtopic, attemptId }) {
  const now = getNow();
  const nextReviewDate = formatHKDateKey(new Date(now.getTime() + 86400000));
  return {
    ...card,
    topic: topic ?? card.topic ?? null,
    subtopic: subtopic ?? card.subtopic ?? null,

    interval: 1,
    easeFactor: 2.5,
    repetitionCount: 0,
    status: 'new',
    currentAttemptNumber: 0,

    nextReviewDate,
    lastReviewedAt: null,
    isDue: false,

    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,

    isActive: true,
    archivedAt: null,
    archiveReason: null,
    createdFromAttemptId: attemptId ?? card.createdFromAttemptId ?? null,
    updatedAt: now.toISOString(),
  };
}

/**
 * Create SRS cards for wrong answers from a quiz
 * 
 * @param {string} userId - User ID
 * @param {Array} wrongQuestions - Questions answered incorrectly
 * @param {string} sessionId - Original quiz session ID
 * @param {string} attemptId - Original quiz attempt ID
 * @returns {Promise<Array>} Created cards
 */
export async function createCardsFromMistakes(userId, wrongQuestions, sessionId, attemptId) {
  const batch = writeBatch(db);
  const createdCards = [];
  
  console.log(`📝 Creating ${wrongQuestions.length} SRS cards for user ${userId}`);
  
  for (const question of wrongQuestions) {
    const questionId = question?.ID;
    if (!questionId) continue;

    const existing = await findAnyCardForQuestion(userId, questionId);
    if (existing) {
      // If a card exists (active or archived), reuse it.
      // Archived/graduated cards are reactivated + reset.
      const next = existing.isActive === false
        ? resetCardForReactivation(existing, {
          topic: question.Topic,
          subtopic: question.Subtopic || null,
          attemptId,
        })
        : {
          ...existing,
          topic: question.Topic ?? existing.topic ?? null,
          subtopic: (question.Subtopic || null) ?? existing.subtopic ?? null,
          updatedAt: getNow().toISOString(),
        };

      batch.set(doc(db, COLLECTIONS.CARDS, existing.id), next);
      createdCards.push(next);

      console.log(`♻️ Reused SRS card: ${existing.id} (review on ${next.nextReviewDate})`);
      continue;
    }

    // No prior card -> create deterministic ID (one card per user+question)
    const card = createNewCard({
      questionId,
      userId,
      topic: question.Topic,
      subtopic: question.Subtopic || null,
      sessionId,
      attemptId
    });
    const deterministicId = `card_${userId}_${questionId}`;
    card.id = deterministicId;
    
    batch.set(doc(db, COLLECTIONS.CARDS, card.id), card);
    createdCards.push(card);
    
    console.log(`✅ Created SRS card: ${card.id} (review on ${card.nextReviewDate})`);
  }
  
  if (createdCards.length > 0) {
    await batch.commit();
    console.log(`🎉 Successfully created ${createdCards.length} SRS cards`);

    // Denormalize onto mistake index (writes only)
    await Promise.all(
      createdCards.map((c) => upsertMistakeSrsMeta(userId, c.questionId, c))
    );
  }
  
  return createdCards;
}

/**
 * Get all cards due for review (JIT query)
 * 
 * @param {string} userId - User ID
 * @param {Date} asOf - Check for cards due as of this date (defaults to today)
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of due cards to return
 * @returns {Promise<Array>} Due cards
 */
export async function getDueCards(userId, asOf = getNow(), options = {}) {
  const today = formatHKDateKey(asOf);
  const max = Number(options?.limit);
  
  console.log(`🔍 Fetching due cards for ${userId} as of ${today}`);
  
  const queryParts = [
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('nextReviewDate', '<=', today),
    orderBy('nextReviewDate', 'asc')
  ];

  if (Number.isFinite(max) && max > 0) {
    queryParts.push(limit(max));
  }

  const cardsQuery = query(...queryParts);
  
  const snapshot = await getDocs(cardsQuery);
  const dueCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`📊 Found ${dueCards.length} cards due for review`);
  
  return dueCards;
}

/**
 * Get cards due on an exact date (no overdue accumulation)
 *
 * This is useful for calendar scheduling when you only want to create
 * events for "today" (or a specific day) and avoid reading a large backlog.
 *
 * @param {string} userId - User ID
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of cards to return
 * @returns {Promise<Array>} Cards due exactly on dateStr
 */
export async function getCardsDueOnDate(userId, dateStr, options = {}) {
  const max = Number(options?.limit);

  if (!dateStr) {
    throw new Error('getCardsDueOnDate requires dateStr (YYYY-MM-DD)');
  }

  console.log(`🔍 Fetching cards due on ${dateStr} for ${userId}`);

  const queryParts = [
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('nextReviewDate', '==', dateStr),
    orderBy('nextReviewDate', 'asc')
  ];

  if (Number.isFinite(max) && max > 0) {
    queryParts.push(limit(max));
  }

  const cardsQuery = query(...queryParts);
  const snapshot = await getDocs(cardsQuery);
  const cards = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

  console.log(`📊 Found ${cards.length} cards due on ${dateStr}`);
  return cards;
}

export async function getOverdueCount(userId, asOf = getNow()) {
  const todayStr = formatHKDateKey(asOf);
  const fourteenDaysAgo = new Date(asOf);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoStr = formatHKDateKey(fourteenDaysAgo);

  const q = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('nextReviewDate', '<', todayStr),
    where('nextReviewDate', '>=', fourteenDaysAgoStr)
  );

  const snap = await getCountFromServer(q);
  return Number(snap.data().count || 0);
}

/**
 * Archive overdue cards older than 14 days (recoverable)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of archived cards
 */
export async function archiveOverdueCards(userId) {
  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoStr = formatHKDateKey(fourteenDaysAgo);
  
  console.log(`🗄️ Archiving overdue cards older than 14 days for user ${userId}`);
  
  // Find cards overdue by more than 14 days
  const overdueQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('nextReviewDate', '<', fourteenDaysAgoStr)
  );
  
  const snapshot = await getDocs(overdueQuery);
  const cardsToArchive = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  if (cardsToArchive.length === 0) {
    console.log('✅ No cards to archive');
    return 0;
  }
  
  // Archive cards in batches
  const batchSize = 500;
  let archivedCount = 0;
  
  for (let i = 0; i < cardsToArchive.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchCards = cardsToArchive.slice(i, i + batchSize);
    
    batchCards.forEach(card => {
      const cardRef = doc(db, COLLECTIONS.CARDS, card.id);
      batch.update(cardRef, {
        isActive: false,
        archivedAt: new Date().toISOString(),
        archiveReason: 'overdue_14_days',
        updatedAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    archivedCount += batchCards.length;
    console.log(`📦 Archived batch of ${batchCards.length} cards`);

    // Best-effort denormalization
    await Promise.all(
      batchCards.map((c) => upsertMistakeSrsMeta(userId, c.questionId, { ...c, isActive: false }))
    );
  }
  
  console.log(`🎉 Successfully archived ${archivedCount} overdue cards`);
  return archivedCount;
}

/**
 * Get archived cards for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {string} options.reason - Filter by archive reason
 * @param {number} options.limit - Max number of cards to return
 * @returns {Promise<Array>} Archived cards
 */
export async function getArchivedCards(userId, options = {}) {
  const { reason, limit } = options;
  
  const queryParts = [
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', false)
  ];
  
  if (reason) {
    queryParts.push(where('archiveReason', '==', reason));
  }
  
  queryParts.push(orderBy('archivedAt', 'desc'));
  
  if (Number.isFinite(limit) && limit > 0) {
    queryParts.push(limit(limit));
  }
  
  const cardsQuery = query(...queryParts);
  const snapshot = await getDocs(cardsQuery);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Restore an archived card
 * 
 * @param {string} cardId - Card ID
 * @returns {Promise<Object>} Restored card
 */
export async function restoreArchivedCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  
  await updateDoc(cardRef, {
    isActive: true,
    archivedAt: null,
    archiveReason: null,
    updatedAt: new Date().toISOString()
  });
  
  const updatedCard = await getCard(cardId);
  console.log(`♻️ Restored archived card: ${cardId}`);

  try {
    if (updatedCard) {
      await upsertMistakeSrsMeta(updatedCard.userId, updatedCard.questionId, updatedCard);
    }
  } catch (e) {
    console.error('⚠️ Failed to update mistake SRS meta on restore:', e);
  }
  
  return updatedCard;
}
/**
 * Save a single card (for debugging)
 * 
 * @param {Object} card - Card data
 * @returns {Promise<Object>} Saved card
 */
export async function saveCard(card) {
  const cardRef = doc(db, COLLECTIONS.CARDS, card.id);
  await setDoc(cardRef, card);
  return { id: card.id, ...card };
}

/**
 * Delete a card (for debugging)
 * 
 * @param {string} cardId - Card ID
 * @returns {Promise<void>}
 */
export async function deleteCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  await deleteDoc(cardRef);
}

/**
 * Get all SRS cards for a user
 */
export async function getAllCards(userId) {
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(cardsQuery);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function getActiveCards(userId, options = {}) {
  const max = Number(options?.limit);

  if (!userId) return [];

  // Index-safe: avoid requiring a composite index on (userId, isActive).
  // We'll query by userId only and filter isActive client-side.
  const queryParts = [collection(db, COLLECTIONS.CARDS), where('userId', '==', userId)];
  if (Number.isFinite(max) && max > 0) queryParts.push(limit(max));

  const q = query(...queryParts);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c?.isActive === true);
}

export async function getCardsByQuestionIds(userId, questionIds = []) {
  const ids = (Array.isArray(questionIds) ? questionIds : [])
    .map((x) => String(x))
    .filter(Boolean);

  if (!userId || ids.length === 0) return [];

  const chunkSize = 10;
  const results = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const q = query(
      collection(db, COLLECTIONS.CARDS),
      where('userId', '==', userId),
      where('questionId', 'in', chunk)
    );

    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }

  return results;
}

/**
 * Get recent review attempts for analytics
 */
export async function getRecentReviewAttempts(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const attemptsQuery = query(
    collection(db, COLLECTIONS.ATTEMPTS),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(attemptsQuery);

  const sinceIso = since.toISOString();
  return snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((a) => {
      const attemptedAt = a?.attemptedAt;
      if (!attemptedAt || typeof attemptedAt !== 'string') return false;
      return attemptedAt >= sinceIso;
    })
    .sort((a, b) => String(a?.attemptedAt || '').localeCompare(String(b?.attemptedAt || '')));
}

/**
 * Get specific card by ID
 * 
 * @param {string} cardId - Card ID
 * @returns {Promise<Object|null>} Card or null
 */
export async function getCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  const cardSnap = await getDoc(cardRef);
  
  if (!cardSnap.exists()) {
    return null;
  }
  
  return { id: cardSnap.id, ...cardSnap.data() };
}

/**
 * Submit a review attempt (CORE SRS FUNCTION)
 * 
 * This is where the magic happens:
 * 1. Records the attempt
 * 2. Updates card state based on result
 * 3. Calculates ONLY the next single review date
 * 
 * @param {string} cardId - Card ID
 * @param {boolean} wasCorrect - Did user answer correctly?
 * @param {Object} attemptData - Additional attempt data
 * @returns {Promise<Object>} Updated card and attempt record
 */
export async function submitReview(cardId, wasCorrect, attemptData = {}) {
  console.log(`📝 Processing review: ${cardId}, correct: ${wasCorrect}`);
  
  // 1. Get current card state
  const card = await getCard(cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }
  
  // 2. Create attempt record (for audit trail)
  const attemptId = `attempt_${cardId}_${Date.now()}`;
  const attempt = {
    id: attemptId,
    cardId,
    userId: card.userId,
    questionId: card.questionId,
    
    // Attempt details
    attemptNumber: (card.currentAttemptNumber || 0) + 1,
    wasCorrect,
    userAnswer: attemptData.userAnswer || null,
    correctAnswer: attemptData.correctAnswer || null,
    
    // Timing
    timeSpent: attemptData.timeSpent || null,
    attemptedAt: new Date().toISOString(),
    
    // State before attempt (audit)
    stateBefore: {
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitionCount: card.repetitionCount,
      status: card.status
    },
    
    // Review session
    reviewSessionId: attemptData.reviewSessionId || null,
    
    // Audit
    createdAt: new Date().toISOString()
  };
  
  // 3. Calculate new card state
  const updatedCard = updateCardAfterReview(card, wasCorrect);
  
  // Add state after to attempt record
  attempt.stateAfter = {
    interval: updatedCard.interval,
    easeFactor: updatedCard.easeFactor,
    repetitionCount: updatedCard.repetitionCount,
    status: updatedCard.status
  };
  
  // 4. Save both records in a batch
  const batch = writeBatch(db);
  
  // Save attempt
  batch.set(doc(db, COLLECTIONS.ATTEMPTS, attemptId), attempt);
  
  // Update card
  batch.set(doc(db, COLLECTIONS.CARDS, cardId), updatedCard);
  
  await batch.commit();
  
  console.log(`✅ Review processed successfully:`, {
    cardId,
    wasCorrect,
    nextReview: updatedCard.nextReviewDate,
    newInterval: updatedCard.interval,
    newStatus: updatedCard.status
  });
  
  // 5. Archive if graduated
  if (shouldArchiveCard(updatedCard)) {
    console.log(`🎓 Card graduated! Archiving: ${cardId}`);
    await archiveCard(cardId);
  }

  // Denormalize onto mistake index
  try {
    const fresh = shouldArchiveCard(updatedCard)
      ? { ...updatedCard, isActive: false }
      : updatedCard;
    await upsertMistakeSrsMeta(fresh.userId, fresh.questionId, fresh);
  } catch (e) {
    console.error('⚠️ Failed to update mistake SRS meta:', e);
  }
  
  return {
    card: updatedCard,
    attempt
  };
}

/**
 * Submit multiple reviews in one session
 * 
 * @param {string} userId - User ID
 * @param {Array} reviews - Array of {cardId, wasCorrect, userAnswer}
 * @param {string} sessionType - Session type identifier
 * @returns {Promise<Object>} Session summary
 */
export async function submitReviewSession(userId, reviews, sessionType = 'spaced_repetition') {
  const sessionId = `review_session_${Date.now()}`;
  const startTime = new Date();
  
  console.log(`🎯 Starting review session: ${sessionId} with ${reviews.length} cards`);
  
  let cardsCorrect = 0;
  let cardsFailed = 0;
  const results = [];
  
  // Process each review
  for (const review of reviews) {
    try {
      const result = await submitReview(review.cardId, review.wasCorrect, {
        userAnswer: review.userAnswer,
        correctAnswer: review.correctAnswer,
        timeSpent: review.timeSpent,
        reviewSessionId: sessionId
      });
      
      results.push(result);
      
      if (review.wasCorrect) {
        cardsCorrect++;
      } else {
        cardsFailed++;
      }
    } catch (error) {
      console.error(`❌ Error processing review for card ${review.cardId}:`, error);
      cardsFailed++;
    }
  }
  
  const endTime = new Date();
  const totalTimeSpent = Math.floor((endTime - startTime) / 1000);
  
  // Create session record
  const session = {
    id: sessionId,
    userId,
    
    // Stats
    cardsReviewed: reviews.length,
    cardsCorrect,
    cardsFailed,
    totalTimeSpent,
    
    // Metadata
    sessionType,
    startedAt: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    
    // Audit
    createdAt: new Date().toISOString()
  };
  
  // Save session
  await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), session);
  
  console.log(`✅ Review session completed:`, session);
  
  return {
    session,
    results
  };
}

/**
 * Archive a graduated card
 * 
 * @param {string} cardId - Card ID
 */
async function archiveCard(cardId) {
  const cardRef = doc(db, COLLECTIONS.CARDS, cardId);
  await updateDoc(cardRef, {
    isActive: false,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Get review statistics for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics
 */
export async function getReviewStats(userId) {
  // Get all cards
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId)
  );
  
  const cardsSnapshot = await getDocs(cardsQuery);
  const cards = cardsSnapshot.docs.map(doc => doc.data());
  
  const stats = {
    total: cards.length,
    active: cards.filter(c => c.isActive).length,
    archived: cards.filter(c => !c.isActive).length,
    
    // By status
    new: cards.filter(c => c.status === SRS_CONFIG.STATUS.NEW).length,
    learning: cards.filter(c => c.status === SRS_CONFIG.STATUS.LEARNING).length,
    review: cards.filter(c => c.status === SRS_CONFIG.STATUS.REVIEW).length,
    graduated: cards.filter(c => c.status === SRS_CONFIG.STATUS.GRADUATED).length,
    
    // Due today
    dueToday: cards.filter(c => c.isActive && c.isDue).length,
    
    // Performance
    totalAttempts: cards.reduce((sum, c) => sum + (c.totalAttempts || 0), 0),
    successRate: calculateSuccessRate(cards)
  };
  
  return stats;
}

function calculateSuccessRate(cards) {
  const totalAttempts = cards.reduce((sum, c) => sum + (c.totalAttempts || 0), 0);
  const successfulAttempts = cards.reduce((sum, c) => sum + (c.successfulAttempts || 0), 0);
  
  if (totalAttempts === 0) return 0;
  return Math.round((successfulAttempts / totalAttempts) * 100);
}

/**
 * Update isDue flags for all cards (run daily)
 * 
 * @param {string} userId - User ID
 */
export async function updateDueFlags(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const cardsQuery = query(
    collection(db, COLLECTIONS.CARDS),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(cardsQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(docSnap => {
    const card = docSnap.data();
    const isDue = isCardDue(card.nextReviewDate, new Date(today));
    
    if (card.isDue !== isDue) {
      batch.update(docSnap.ref, { isDue });
    }
  });
  
  await batch.commit();
}

export const srsService = {
  createCardsFromMistakes,
  getAllCards,
  getActiveCards,
  getCardsByQuestionIds,
  getRecentReviewAttempts,
  getDueCards,
  getCardsDueOnDate,
  getOverdueCount,
  getCard,
  submitReview,
  submitReviewSession,
  getReviewStats,
  updateDueFlags,
  archiveOverdueCards,
  getArchivedCards,
  restoreArchivedCard,
  saveCard,
  deleteCard
};

export default srsService;