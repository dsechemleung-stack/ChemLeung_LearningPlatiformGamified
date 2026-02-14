import { doc, setDoc, collection, addDoc, updateDoc, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const quizService = {
  // Save a quiz attempt WITH questions data for Mistake Notebook
  async saveAttempt(userId, attemptData) {
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

  // ─── Shared leaderboard builder ────────────────────────────────────────────
  async _buildLeaderboard(attemptsQuery, limitCount, sortField = 'averageScore') {
    const querySnapshot = await getDocs(attemptsQuery);

    // Group by user
    const userMap = new Map();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const uid = data.userId;
      if (!userMap.has(uid)) {
        userMap.set(uid, { userId: uid, attempts: [], totalScore: 0, totalQuestions: 0, totalCorrect: 0 });
      }
      const u = userMap.get(uid);
      u.attempts.push(data);
      u.totalScore += data.percentage;
      u.totalQuestions += data.totalQuestions;
      u.totalCorrect += data.correctAnswers;
    });

    // Fetch user profiles + compute streaks
    const leaderboard = await Promise.all(
      Array.from(userMap.values()).map(async (u) => {
        const userDoc = await getDoc(doc(db, 'users', u.userId));
        const userData = userDoc.data() || {};

        // Streak: fetch all-time attempts for streak calculation
        let streak = 0;
        try {
          const allQ = query(
            collection(db, 'attempts'),
            where('userId', '==', u.userId),
            orderBy('timestamp', 'desc'),
            limit(100),
          );
          const allSnap = await getDocs(allQ);
          const allAttempts = [];
          allSnap.forEach(d => allAttempts.push(d.data()));
          streak = this._computeStreak(allAttempts);
        } catch (_) { /* streak stays 0 */ }

        return {
          userId: u.userId,
          displayName: userData.displayName || 'Unknown',
          equippedProfilePic: (userData.equipped || {}).profilePic || 'flask_blue',
          equippedTheme: (userData.equipped || {}).theme || 'default',
          level: userData.level || null,          // S4 / S5 / S6
          attemptCount: u.attempts.length,
          averageScore: Math.round(u.totalScore / u.attempts.length),
          totalQuestions: u.totalQuestions,
          totalCorrect: u.totalCorrect,
          overallPercentage: Math.round((u.totalCorrect / u.totalQuestions) * 100),
          streak,
        };
      })
    );

    leaderboard.sort((a, b) => b[sortField] - a[sortField]);
    return leaderboard.slice(0, limitCount);
  },

  // Get weekly leaderboard
  async getWeeklyLeaderboard(limitCount = 10) {
    try {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const q = query(
        collection(db, 'attempts'),
        where('timestamp', '>=', weekAgo.toISOString()),
        orderBy('timestamp', 'desc'),
      );
      return await this._buildLeaderboard(q, limitCount, 'averageScore');
    } catch (error) {
      console.error('Error getting weekly leaderboard:', error);
      throw error;
    }
  },

  // Get leaderboard for a specific timestamp range [fromIso, toIso)
  async getLeaderboardByRange(fromIso, toIso, limitCount = 10) {
    try {
      if (!fromIso || !toIso) throw new Error('Missing range bounds');
      const q = query(
        collection(db, 'attempts'),
        where('timestamp', '>=', fromIso),
        where('timestamp', '<', toIso),
        orderBy('timestamp', 'desc'),
      );
      return await this._buildLeaderboard(q, limitCount, 'averageScore');
    } catch (error) {
      console.error('Error getting ranged leaderboard:', error);
      throw error;
    }
  },

  // Convenience: last 7-day window BEFORE the current week window
  async getLastWeekLeaderboard(limitCount = 10) {
    const now = new Date();
    const to = new Date(now); to.setDate(to.getDate() - 7);
    const from = new Date(now); from.setDate(from.getDate() - 14);
    return await this.getLeaderboardByRange(from.toISOString(), to.toISOString(), limitCount);
  },

  // Get monthly leaderboard
  async getMonthlyLeaderboard(limitCount = 10) {
    try {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      const q = query(
        collection(db, 'attempts'),
        where('timestamp', '>=', monthAgo.toISOString()),
        orderBy('timestamp', 'desc'),
      );
      return await this._buildLeaderboard(q, limitCount, 'averageScore');
    } catch (error) {
      console.error('Error getting monthly leaderboard:', error);
      throw error;
    }
  },

  // Convenience: last 30-day window BEFORE the current month window
  async getLastMonthLeaderboard(limitCount = 10) {
    const now = new Date();
    const to = new Date(now); to.setMonth(to.getMonth() - 1);
    const from = new Date(now); from.setMonth(from.getMonth() - 2);
    return await this.getLeaderboardByRange(from.toISOString(), to.toISOString(), limitCount);
  },

  // Get all-time leaderboard
  async getAllTimeLeaderboard(limitCount = 10) {
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      const users = [];
      const streakPromises = [];

      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.totalAttempts > 0) {
          const entry = {
            userId: docSnap.id,
            displayName: data.displayName || 'Unknown',
            level: data.level || null,
            equippedProfilePic: (data.equipped || {}).profilePic || 'flask_blue',
            equippedTheme: (data.equipped || {}).theme || 'default',
            totalAttempts: data.totalAttempts || 0,
            totalQuestions: data.totalQuestions || 0,
            totalCorrect: data.totalCorrect || 0,
            overallPercentage: data.totalQuestions > 0
              ? Math.round((data.totalCorrect / data.totalQuestions) * 100)
              : 0,
            streak: 0,
          };
          users.push(entry);

          // Queue streak fetch
          streakPromises.push(
            (async () => {
              try {
                const q = query(
                  collection(db, 'attempts'),
                  where('userId', '==', docSnap.id),
                  orderBy('timestamp', 'desc'),
                  limit(100),
                );
                const snap = await getDocs(q);
                const arr = []; snap.forEach(d => arr.push(d.data()));
                entry.streak = this._computeStreak(arr);
              } catch (_) {}
            })()
          );
        }
      });

      await Promise.all(streakPromises);
      users.sort((a, b) => b.overallPercentage - a.overallPercentage);
      return users.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting all-time leaderboard:', error);
      throw error;
    }
  },
};