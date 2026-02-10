/**
 * Mastery Helper Utilities
 * Includes ISRS priority algorithm and Rule of 3 mastery calculations
 */

/**
 * Calculate multi-weighted ISRS (Integrated Spaced Repetition System) priority score
 * Score = (U × 0.4) + (D × 0.4) + (R × 0.2)
 * where U = Urgency (Ebbinghaus curve), D = Difficulty, R = Recency/Context boost
 */
export function calculateMasteryPriority(mistake, recentTopics = []) {
  // 1. URGENCY: Ebbinghaus Forgetting Curve
  const now = Date.now();
  const lastAttemptTime = new Date(mistake.lastAttempted).getTime();
  const daysSinceLastAttempt = Math.max(0, (now - lastAttemptTime) / (1000 * 60 * 60 * 24));

  // U = 2^(days/7) exponential curve
  const U = Math.pow(2, daysSinceLastAttempt / 7);

  // 2. DIFFICULTY: Based on attempt count (max 1.0 at 3+ attempts)
  const D = Math.min(1.0, (mistake.attemptCount || 1) / 3);

  // 3. RECENCY/CONTEXT: Boost if matches recent quiz topics
  let R = 0.5; // Baseline
  if (recentTopics.length > 0 && recentTopics.includes(mistake.Topic)) {
    R = 1.5; // 1.5x boost for contextual relevance
  }

  return (U * 0.4) + (D * 0.4) + (R * 0.2);
}

/**
 * Get mastery state based on Rule of 3 (3 correct answers)
 */
export function getMasteryState(correctCount = 0) {
  if (correctCount >= 3) {
    return { state: 3, label: 'Mastered', color: 'green', bgClass: 'bg-green-50/60', borderClass: 'border-green-300', badgeClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-500' };
  }
  if (correctCount === 2) {
    return { state: 2, label: 'Consolidating', color: 'amber', bgClass: 'bg-amber-50/60', borderClass: 'border-amber-300', badgeClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-400' };
  }
  if (correctCount === 1) {
    return { state: 1, label: 'Improving', color: 'amber', bgClass: 'bg-amber-50/60', borderClass: 'border-amber-300', badgeClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-400' };
  }
  return { state: 0, label: 'New', color: 'red', bgClass: 'bg-white', borderClass: 'border-red-200', badgeClass: 'bg-red-100 text-red-700', dotClass: 'bg-red-500' };
}

/**
 * Load mistakes from localStorage (from MistakeNotebookPage format)
 */
export function loadMistakesFromStorage() {
  try {
    const improvements = JSON.parse(localStorage.getItem('mistake_improvements') || '{}');
    const mistakes = [];

    Object.entries(improvements).forEach(([questionId, data]) => {
      mistakes.push({
        questionId,
        Topic: data.Topic || 'Unknown',
        Question: data.Question || '',
        lastAttempted: data.lastAttempted || new Date().toISOString(),
        attemptCount: data.attemptCount || 0,
        correctCount: data.correctCount || 0,
        lastCorrect: data.lastCorrect || null,
        errorType: data.errorType || 'conceptual', ...data
      });
    });

    return mistakes;
  } catch (error) {
    console.error('Error loading mistakes:', error);
    return [];
  }
}

/**
 * Calculate mastery statistics across all topics
 */
export function calculateMasteryStats(userProfile, mistakes = []) {
  const stats = {
    unseenCount: 0,
    inProgressCount: 0,
    masteredCount: 0,
    totalTopicsMastered: 0,
    topicStats: {},
  };

  // Collect all mistakes by topic
  mistakes.forEach((mistake) => {
    const topic = mistake.Topic || 'Unknown';
    if (!stats.topicStats[topic]) {
      stats.topicStats[topic] = { unseen: 0, inProgress: 0, mastered: 0 };
    }

    const state = getMasteryState(mistake.correctCount);
    if (state.state === 3) {
      stats.masteredCount++;
      stats.topicStats[topic].mastered++;
    } else if (state.state > 0) {
      stats.inProgressCount++;
      stats.topicStats[topic].inProgress++;
    } else {
      stats.unseenCount++;
      stats.topicStats[topic].unseen++;
    }
  });

  // Count topics with mastery
  stats.totalTopicsMastered = Object.values(stats.topicStats).filter(
    (topic) => topic.mastered > 0 && topic.inProgress === 0 && topic.unseen === 0
  ).length;

  return stats;
}

/**
 * Get top N mistakes by ISRS priority score
 */
export function getTopMistakesByPriority(mistakes, recentTopics = [], limit = 3) {
  return mistakes
    .map((m) => ({
      ...m,
      masteryPriority: calculateMasteryPriority(m, recentTopics),
    }))
    .sort((a, b) => b.masteryPriority - a.masteryPriority)
    .slice(0, limit);
}

/**
 * Find the closest topic to mastery
 */
export function findClosestToMastery(mistakes) {
  const topicProgress = {};

  mistakes.forEach((m) => {
    const topic = m.Topic || 'Unknown';
    if (!topicProgress[topic]) {
      topicProgress[topic] = { mastered: 0, total: 0 };
    }
    topicProgress[topic].total++;
    if (getMasteryState(m.correctCount).state === 3) {
      topicProgress[topic].mastered++;
    }
  });

  let closest = null;
  let maxProgress = -1;

  Object.entries(topicProgress).forEach(([topic, data]) => {
    if (data.total > 0) {
      const progress = data.mastered / data.total;
      const questionsUntilMastery = Math.max(0, Math.ceil((data.total - data.mastered) * 3));
      if (progress > maxProgress && progress < 1.0) {
        maxProgress = progress;
        closest = { topic, ...data, questionsUntilMastery };
      }
    }
  });

  return closest;
}
