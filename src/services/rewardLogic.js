// ============================================================================
// REWARD LOGIC - Token Awards with Anti-Cheat
// ============================================================================

import { awardTokens, canClaimReward, recordRewardClaim, recordRewardClaimsBatch } from './tokenService';

// ────────────────────────────────────────────────────────────────────────────
// REWARD TIERS
// ────────────────────────────────────────────────────────────────────────────

const REWARDS = {
  // Quiz completion bonus (only if totalQuestions >= 10)
  QUIZ_BONUS_PERFECT: 20,
  QUIZ_BONUS_HIGH: 15,
  QUIZ_BONUS_PASS: 10,

  // Leaderboard rewards
  LEADERBOARD_WEEKLY: [30, 27, 24, 21, 18, 15, 12, 9, 6, 3],
};

const MILLIONAIRE_REWARD_LADDER = [
  1, 2, 3, 4, 5, 7, 9, 11, 14, 17, 21, 25, 30, 35, 42, 50, 60, 72, 85, 100
];

export async function rewardMillionaire(userId, levelReached, attemptId = null) {
  try {
    const level = Number(levelReached || 0);
    if (!userId || !Number.isFinite(level) || level <= 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const idx = Math.min(level, MILLIONAIRE_REWARD_LADDER.length) - 1;
    const tokensAwarded = MILLIONAIRE_REWARD_LADDER[idx] || 0;
    if (tokensAwarded <= 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const reason = `Millionaire Reward: Reached Q${level}`;
    await awardTokens(userId, tokensAwarded, reason, {
      category: 'millionaire',
      levelReached: level,
      attemptId
    });

    return { success: true, tokensAwarded };
  } catch (error) {
    console.error('Error rewarding Millionaire:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MCQ COMPLETION REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens for MCQ quiz completion
 */
export async function rewardMCQCompletion(userId, attemptData) {
  try {
    const { percentage, totalQuestions, correctAnswers, topics, attemptId } = attemptData;

    let tokensAwarded = 0;
    let rewardTier = '';

    // Quiz completion bonus only applies if quiz has 10+ questions
    if (totalQuestions >= 10) {
      if (percentage === 100) {
        tokensAwarded = REWARDS.QUIZ_BONUS_100;
        rewardTier = '100% Bonus';
      } else if (percentage >= 80) {
        tokensAwarded = REWARDS.QUIZ_BONUS_80;
        rewardTier = '80% Bonus';
      } else if (percentage >= 50) {
        tokensAwarded = REWARDS.QUIZ_BONUS_50;
        rewardTier = '50% Bonus';
      } else {
        tokensAwarded = 0;
        rewardTier = 'No Bonus';
      }
    } else {
      tokensAwarded = 0;
      rewardTier = 'No Bonus (min 10 questions)';
    }

    const reason = `MCQ Completed (${percentage}%) - ${rewardTier}`;
    
    if (tokensAwarded > 0) {
      await awardTokens(userId, tokensAwarded, reason, {
        category: 'quiz_bonus',
        percentage,
        totalQuestions,
        correctAnswers,
        topics,
        attemptId
      });
    }

    return {
      success: true,
      tokensAwarded,
      message: tokensAwarded > 0 ? `+${tokensAwarded} diamonds! ${rewardTier}` : `No diamond bonus (${rewardTier})`
    };
  } catch (error) {
    console.error('Error rewarding MCQ completion:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// LEADERBOARD REWARDS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Award tokens for leaderboard placement
 */
export async function rewardLeaderboardPlacement(userId, rank, period = 'weekly') {
  try {
    if (period !== 'weekly') {
      return { success: false, tokensAwarded: 0 };
    }

    const tokensAwarded = Math.max(0, 11 - Number(rank || 0));

    if (tokensAwarded === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    const reason = `Leaderboard Reward: ${period} #${rank}`;

    await awardTokens(userId, tokensAwarded, reason, {
      category: 'leaderboard',
      rank,
      period
    });

    return {
      success: true,
      tokensAwarded,
      message: `+${tokensAwarded} diamonds!`
    };
  } catch (error) {
    console.error('Error rewarding leaderboard placement:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// QUIZ CORRECT ANSWER REWARDS (1 token per 2 correct answers)
// ────────────────────────────────────────────────────────────────────────────

export async function rewardQuizQuestionTokens(userId, questions = [], answers = {}, quizMode = 'practice') {
  try {
    if (!userId || !Array.isArray(questions) || questions.length === 0) {
      return { success: false, tokensAwarded: 0 };
    }

    // Count correct answers
    let correctCount = 0;
    questions.forEach(q => {
      const qid = q?.ID;
      if (qid && answers[qid] && answers[qid] === q.CorrectOption) {
        correctCount++;
      }
    });

    // 1 diamond per 2 correct answers (floor division)
    const tokensAwarded = Math.floor(correctCount / 2);

    if (tokensAwarded <= 0) {
      return { success: true, tokensAwarded: 0 };
    }

    const reason = `Quiz Correct Answers: ${correctCount} correct (${tokensAwarded} diamonds)`;
    await awardTokens(userId, tokensAwarded, reason, {
      category: 'quiz_correct_answers',
      correctCount,
      quizMode
    });

    return { success: true, tokensAwarded };
  } catch (error) {
    console.error('Error rewarding quiz correct answers:', error);
    return { success: false, tokensAwarded: 0 };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export const REWARD_AMOUNTS = REWARDS;

export default {
  rewardMCQCompletion,
  rewardLeaderboardPlacement,
  rewardQuizQuestionTokens,
  rewardMillionaire,
  REWARDS
};