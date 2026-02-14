import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function FirebaseTestPage() {
  const { currentUser, userProfile } = useAuth();
  const { t, tf } = useLanguage();
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  async function runTests() {
    setTesting(true);
    const results = {};

    // Test 1: Check if user is authenticated
    results.auth = {
      status: currentUser ? 'success' : 'error',
      message: currentUser 
        ? tf('firebaseTest.authenticatedAs', { email: currentUser.email })
        : t('firebaseTest.notAuthenticated')
    };

    // Test 2: Check if user profile exists
    results.profile = {
      status: userProfile ? 'success' : 'error',
      message: userProfile 
        ? tf('firebaseTest.profileLoadedWithAttempts', { count: userProfile.totalAttempts })
        : t('firebaseTest.profileNotFound')
    };

    // Test 3: Try to save a test attempt
    if (currentUser) {
      try {
        const testAttempt = {
          score: 75,
          totalQuestions: 10,
          correctAnswers: 7,
          percentage: 70,
          topics: ['Test Topic'],
          timeSpent: 120000,
          questionTimes: {},
          answers: {}
        };

        const attemptId = await quizService.saveAttempt(currentUser.uid, testAttempt);
        results.saveAttempt = {
          status: 'success',
          message: tf('firebaseTest.testAttemptSavedWithId', { id: attemptId })
        };
      } catch (error) {
        results.saveAttempt = {
          status: 'error',
          message: tf('firebaseTest.failedSaveAttemptWithReason', { reason: error.message })
        };
      }
    } else {
      results.saveAttempt = {
        status: 'warning',
        message: t('firebaseTest.skippedNotAuthenticated')
      };
    }

    // Test 4: Try to fetch user attempts
    if (currentUser) {
      try {
        const attempts = await quizService.getUserAttempts(currentUser.uid, 5);
        results.fetchAttempts = {
          status: 'success',
          message: tf('firebaseTest.fetchedAttemptsCount', { count: attempts.length })
        };
      } catch (error) {
        results.fetchAttempts = {
          status: 'error',
          message: tf('firebaseTest.failedFetchAttemptsWithReason', { reason: error.message })
        };
      }
    } else {
      results.fetchAttempts = {
        status: 'warning',
        message: t('firebaseTest.skippedNotAuthenticated')
      };
    }

    // Test 5: Check leaderboard
    try {
      const leaderboard = await quizService.getWeeklyLeaderboard(5);
      results.leaderboard = {
        status: 'success',
        message: tf('firebaseTest.leaderboardLoadedUsersCount', { count: leaderboard.length })
      };
    } catch (error) {
      results.leaderboard = {
        status: 'error',
        message: tf('firebaseTest.failedLoadLeaderboardWithReason', { reason: error.message })
      };
    }

    setTestResults(results);
    setTesting(false);
  }

  const getIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'error':
        return <XCircle className="text-red-500" size={24} />;
      case 'warning':
        return <AlertCircle className="text-amber-500" size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <h1 className="text-3xl font-black">{t('firebaseTest.title')}</h1>
        <p className="text-purple-100 mt-1">
          {t('firebaseTest.subtitle')}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <button
            onClick={runTests}
            disabled={testing}
            className="w-full py-4 bg-lab-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('firebaseTest.runningTests')}
              </>
            ) : (
              t('firebaseTest.runFirebaseTests')
            )}
          </button>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="border-t border-slate-200 p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{t('firebaseTest.testResults')}</h2>
            
            {Object.entries(testResults).map(([test, result]) => (
              <div
                key={test}
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-100"
              >
                {getIcon(result.status)}
                <div className="flex-1">
                  <div className="font-bold text-slate-800 capitalize mb-1">
                    {test.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-slate-600">
                    {result.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-900 mb-2">{t('firebaseTest.howToInterpretResults')}</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>{t('firebaseTest.authLabel')}:</strong> {t('firebaseTest.authInterpret')}</li>
          <li><strong>{t('firebaseTest.profileLabel')}:</strong> {t('firebaseTest.profileInterpret')}</li>
          <li><strong>{t('firebaseTest.saveAttemptLabel')}:</strong> {t('firebaseTest.saveAttemptInterpret')}</li>
          <li><strong>{t('firebaseTest.fetchAttemptsLabel')}:</strong> {t('firebaseTest.fetchAttemptsInterpret')}</li>
          <li><strong>{t('firebaseTest.leaderboardLabel')}:</strong> {t('firebaseTest.leaderboardInterpret')}</li>
        </ul>
      </div>

      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <h3 className="font-bold text-red-900 mb-2">{t('firebaseTest.commonIssues')}</h3>
        <ul className="text-sm text-red-800 space-y-2">
          <li>
            <strong>{t('firebaseTest.issueNotAuthenticatedTitle')}:</strong> {t('firebaseTest.issueNotAuthenticatedDesc')}
          </li>
          <li>
            <strong>{t('firebaseTest.issueFailedSaveFetchTitle')}:</strong> {t('firebaseTest.issueFailedSaveFetchDesc')}
          </li>
          <li>
            <strong>{t('firebaseTest.issuePermissionDeniedTitle')}:</strong> {t('firebaseTest.issuePermissionDeniedDesc')}
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
        <h3 className="font-bold text-amber-900 mb-2">{t('firebaseTest.recommendedFirestoreRules')}</h3>
        <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Attempts collection
    match /attempts/{attemptId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}