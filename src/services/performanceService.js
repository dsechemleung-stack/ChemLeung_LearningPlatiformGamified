import { doc, setDoc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Performance Service - Tracks user performance by topic/subtopic
 * Records quiz results and identifies weak areas for AI recommendations
 */

export const performanceService = {
  
  /**
   * Record quiz results grouped by subtopic
   * @param {string} userId - User ID
   * @param {Array} questions - Questions from the quiz
   * @param {Object} answers - User's answers {questionId: selectedOption}
   */
  async recordQuizResults(userId, questions, answers) {
    try {
      // Group questions by topic::subtopic
      const subtopicGroups = {};
      
      questions.forEach(question => {
        const topic = question.Topic || 'General';
        const subtopic = question.Subtopic || 'General';
        const key = `${topic}::${subtopic}`;
        
        if (!subtopicGroups[key]) {
          subtopicGroups[key] = {
            topic,
            subtopic,
            questions: [],
            correct: 0,
            total: 0
          };
        }
        
        subtopicGroups[key].questions.push(question);
        subtopicGroups[key].total++;
        
        // Check if answer is correct
        if (answers[question.ID] === question.CorrectOption) {
          subtopicGroups[key].correct++;
        }
      });
      
      // Update Firestore for each subtopic
      const batch = writeBatch(db);
      
      for (const [key, data] of Object.entries(subtopicGroups)) {
        const subtopicRef = doc(db, 'user_performance', userId, 'subtopics', key);
        
        // Get existing data
        const existingDoc = await getDoc(subtopicRef);
        const existing = existingDoc.exists() ? existingDoc.data() : null;
        
        // Calculate new values
        const totalAttempts = (existing?.totalAttempts || 0) + data.total;
        const correctAttempts = (existing?.correctAttempts || 0) + data.correct;
        const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
        const newAccuracy = data.correct / data.total;
        
        // Track recent attempts (last 10)
        const recentAttempts = existing?.recentAttempts || [];
        recentAttempts.push({
          date: new Date().toISOString(),
          total: data.total,
          correct: data.correct,
          accuracy: newAccuracy
        });
        
        // Keep only last 10 attempts
        if (recentAttempts.length > 10) {
          recentAttempts.shift();
        }
        
        // Merge with existing data
        batch.set(subtopicRef, {
          topic: data.topic,
          subtopic: data.subtopic,
          totalAttempts,
          correctAttempts,
          accuracy,
          lastAttempted: new Date().toISOString(),
          firstAttempted: existing?.firstAttempted || new Date().toISOString(),
          questionsSeen: Array.from(new Set([
            ...(existing?.questionsSeen || []),
            ...data.questions.map(q => q.ID)
          ])),
          recentAttempts,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      await batch.commit();
      
      // After recording, trigger AI recommendation generation
      await this.generateAIRecommendations(userId);
      
      return Object.keys(subtopicGroups).length;
    } catch (error) {
      console.error('Error recording quiz results:', error);
      throw error;
    }
  },
  
  /**
   * Get performance data for a specific subtopic
   */
  async getSubtopicPerformance(userId, topic, subtopic) {
    try {
      const key = `${topic}::${subtopic}`;
      const subtopicRef = doc(db, 'user_performance', userId, 'subtopics', key);
      const docSnap = await getDoc(subtopicRef);
      
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting subtopic performance:', error);
      return null;
    }
  },
  
  /**
   * Get all performance data for user
   */
  async getAllPerformance(userId) {
    try {
      const subtopicsRef = collection(db, 'user_performance', userId, 'subtopics');
      const snapshot = await getDocs(subtopicsRef);
      
      const performance = [];
      snapshot.forEach(doc => {
        performance.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return performance;
    } catch (error) {
      console.error('Error getting all performance:', error);
      return [];
    }
  },
  
  /**
   * Generate AI recommendations based on performance data
   * Identifies weak subtopics and creates study suggestions
   */
  async generateAIRecommendations(userId) {
    try {
      const performance = await this.getAllPerformance(userId);
      
      // Identify weak subtopics
      const weakAreas = performance.filter(p => {
        // Criteria for weakness:
        // 1. Accuracy < 60% AND attempted at least 5 questions
        // 2. OR accuracy < 70% AND attempted at least 10 questions
        // 3. OR declining trend in recent attempts
        
        const hasLowAccuracy = p.accuracy < 0.6 && p.totalAttempts >= 5;
        const hasModerateWeakness = p.accuracy < 0.7 && p.totalAttempts >= 10;
        
        // Check for declining trend
        const hasDecliningTrend = this.checkDecliningTrend(p.recentAttempts);
        
        return hasLowAccuracy || hasModerateWeakness || hasDecliningTrend;
      });
      
      // Sort by priority (lowest accuracy first)
      weakAreas.sort((a, b) => a.accuracy - b.accuracy);
      
      // Create recommendations for top 5 weak areas
      const recommendations = weakAreas.slice(0, 5).map((area, index) => {
        const priority = area.accuracy < 0.5 ? 'HIGH' : 
                        area.accuracy < 0.6 ? 'MEDIUM' : 'LOW';
        
        // Suggest date: tomorrow + index (spread recommendations)
        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + index + 1);
        
        const questionCount = priority === 'HIGH' ? 20 : 
                              priority === 'MEDIUM' ? 15 : 10;
        
        return {
          topic: area.topic,
          subtopic: area.subtopic,
          reason: this.generateReason(area),
          priority,
          suggestedDate: suggestedDate.toISOString().split('T')[0],
          questionCount,
          currentAccuracy: Math.round(area.accuracy * 100),
          attemptsCount: area.totalAttempts,
          status: 'pending', // pending, accepted, dismissed
          createdAt: new Date().toISOString()
        };
      });
      
      // Save recommendations to Firestore
      await this.saveRecommendations(userId, recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return [];
    }
  },
  
  /**
   * Check if there's a declining performance trend
   */
  checkDecliningTrend(recentAttempts) {
    if (!recentAttempts || recentAttempts.length < 3) return false;
    
    // Get last 3 attempts
    const last3 = recentAttempts.slice(-3);
    
    // Check if each attempt is worse than the previous
    for (let i = 1; i < last3.length; i++) {
      if (last3[i].accuracy >= last3[i-1].accuracy) {
        return false; // Not consistently declining
      }
    }
    
    return true;
  },
  
  /**
   * Generate human-readable reason for recommendation
   */
  generateReason(area) {
    const accuracy = Math.round(area.accuracy * 100);
    
    if (area.accuracy < 0.5) {
      return `Critical weakness (${accuracy}% accuracy). Needs immediate review.`;
    } else if (area.accuracy < 0.6) {
      return `Below target (${accuracy}% accuracy). Practice recommended.`;
    } else if (area.accuracy < 0.7) {
      return `Room for improvement (${accuracy}% accuracy). Additional practice suggested.`;
    } else {
      return `Recent performance decline detected. Reinforce fundamentals.`;
    }
  },
  
  /**
   * Save recommendations to Firestore
   */
  async saveRecommendations(userId, recommendations) {
    try {
      const batch = writeBatch(db);
      
      // Clear old pending recommendations first
      const oldRecsRef = collection(db, 'ai_recommendations', userId, 'suggestions');
      const oldQuery = query(oldRecsRef, where('status', '==', 'pending'));
      const oldDocs = await getDocs(oldQuery);
      
      oldDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Add new recommendations
      recommendations.forEach(rec => {
        const recRef = doc(collection(db, 'ai_recommendations', userId, 'suggestions'));
        batch.set(recRef, rec);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error saving recommendations:', error);
      throw error;
    }
  },
  
  /**
   * Get AI recommendations for user
   */
  async getRecommendations(userId) {
    try {
      const recsRef = collection(db, 'ai_recommendations', userId, 'suggestions');
      const q = query(recsRef, where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      
      const recommendations = [];
      snapshot.forEach(doc => {
        recommendations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by priority (HIGH -> MEDIUM -> LOW)
      const priorityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  },
  
  /**
   * Accept a recommendation (convert to calendar event)
   */
  async acceptRecommendation(userId, recommendationId) {
    try {
      const recRef = doc(db, 'ai_recommendations', userId, 'suggestions', recommendationId);
      await setDoc(recRef, {
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      throw error;
    }
  },
  
  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(userId, recommendationId) {
    try {
      const recRef = doc(db, 'ai_recommendations', userId, 'suggestions', recommendationId);
      await setDoc(recRef, {
        status: 'dismissed',
        dismissedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      throw error;
    }
  }
};