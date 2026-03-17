import { doc, setDoc, collection, addDoc, updateDoc, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

function toHongKongDate(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  return new Date(d.getTime() + 8 * 60 * 60 * 1000);
}

function getWeeklyKeyForDate(dateObj) {
  const hk = toHongKongDate(dateObj);
  const date = new Date(Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const yyyy = date.getUTCFullYear();
  return `leaderboard_weekly_${yyyy}-W${String(weekNo).padStart(2, '0')}`;
}

export const quizService = {
  // Save a quiz attempt WITH questions data for Mistake Notebook
  async saveAttempt(userId, attemptData) {
    if (!userId || userId === 'visitor') {
      return `visitor_attempt_${Date.now()}`;
    }
    try {
      const attemptRef = await addDoc(collection(db, 'attempts'), {
        userId: userId,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        score: attemptData.score,
        totalQuestions: attemptData.totalQuestions,
        correctAnswers: attemptData.correctAnswers,
        percentage: attemptData.percentage,
        topics: attemptData.topics,
        timeSpent: attemptData.timeSpent || null,
        questionTimes: attemptData.questionTimes || null,
        answers: attemptData.answers || null,
        questions: attemptData.questions || null,
      });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalAttempts: increment(1),
        totalQuestions: increment(attemptData.totalQuestions),
        totalCorrect: increment(attemptData.correctAnswers),
        lastAttemptDate: new Date().toISOString(),
      });

      return attemptRef.id;
    } catch (error) {
      console.error('Error saving attempt:', error);
      throw error;
    }
  },

  // Get user's attempt history
  async getUserAttempts(userId, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'attempts'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount),
      );
      const querySnapshot = await getDocs(q);
      const attempts = [];
      querySnapshot.forEach((doc) => attempts.push({ id: doc.id, ...doc.data() }));
      return attempts;
    } catch (error) {
      console.error('Error getting user attempts:', error);
      throw error;
    }
  },

  // ─── Helper: compute streak for a user given their attempts ───────────────
  _computeStreak(attempts) {
    if (!attempts.length) return 0;
    const uniqueDates = [...new Set(attempts.map(a => new Date(a.timestamp).toDateString()))]
      .sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = Math.floor((new Date(uniqueDates[i - 1]) - new Date(uniqueDates[i])) / 86400000);
      if (diff === 1) streak++; else break;
    }
    return streak;
  },

  // Get weekly leaderboard
  async getWeeklyLeaderboard(limitCount = 10) {
    try {
      const weekId = getWeeklyKeyForDate(new Date());
      const q = query(
        collection(db, 'weekly_leaderboards', weekId, 'entries'),
        orderBy('averageScore', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting weekly leaderboard:', error);
      throw error;
    }
  },

  async getMyWeeklyLeaderboardEntry(userId, dateObj = new Date()) {
    try {
      if (!userId) return null;
      const weekId = getWeeklyKeyForDate(dateObj);
      const ref = doc(db, 'weekly_leaderboards', weekId, 'entries', userId);
      const snap = await getDoc(ref);
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.error('Error getting my weekly leaderboard entry:', error);
      return null;
    }
  },

  // Convenience: last 7-day window BEFORE the current week window
  async getLastWeekLeaderboard(limitCount = 10) {
    const now = new Date();
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekId = getWeeklyKeyForDate(lastWeekDate);
    const q = query(
      collection(db, 'weekly_leaderboards', weekId, 'entries'),
      orderBy('averageScore', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};