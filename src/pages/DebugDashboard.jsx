import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';

export default function DebugDashboard() {
  const { currentUser, userProfile } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);
  const [rawData, setRawData] = useState(null);

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  async function testEverything() {
    setLogs([]);
    setTesting(true);
    
    addLog('info', `🔍 ${t('Starting comprehensive diagnostics...')}`);
    
    // Test 1: Check Authentication
    addLog('info', `--- ${t('TEST 1: Authentication')} ---`);
    if (currentUser) {
      addLog('success', `✅ ${t('User authenticated:')} ${currentUser.email}`);
      addLog('info', `${t('User ID:')} ${currentUser.uid}`);
    } else {
      addLog('error', `❌ ${t('No user authenticated')}`);
      setTesting(false);
      return;
    }

    // Test 2: Check User Profile
    addLog('info', `--- ${t('TEST 2: User Profile')} ---`);
    if (userProfile) {
      addLog('success', `✅ ${t('Profile loaded')}`);
      addLog('info', `${t('Display Name:')} ${userProfile.displayName}`);
      addLog('info', `${t('Total Attempts:')} ${userProfile.totalAttempts || 0}`);
      addLog('info', `${t('Total Questions:')} ${userProfile.totalQuestions || 0}`);
      addLog('info', `${t('Total Correct:')} ${userProfile.totalCorrect || 0}`);
    } else {
      addLog('error', `❌ ${t('Profile not loaded')}`);
    }

    // Test 3: Direct Firestore Read - Users Collection
    addLog('info', `--- ${t('TEST 3: Direct Firestore Read (Users)')} ---`);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        addLog('success', `✅ ${t('User document exists in Firestore')}`);
        addLog('info', `${t('Data:')} ${JSON.stringify(userDocSnap.data())}`);
      } else {
        addLog('error', `❌ ${t('User document does NOT exist in Firestore')}`);
      }
    } catch (error) {
      addLog('error', `❌ ${t('Error reading user document:')} ${error.message}`);
    }

    // Test 4: Direct Firestore Read - Attempts Collection
    addLog('info', `--- ${t('TEST 4: Direct Firestore Read (Attempts)')} ---`);
    try {
      const attemptsQuery = query(
        collection(db, 'attempts'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(attemptsQuery);
      addLog('info', `${t('Found')} ${querySnapshot.size} ${t('attempts in Firestore')}`);
      
      if (querySnapshot.size > 0) {
        addLog('success', `✅ ${t('Attempts collection has data')}`);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          addLog('info', `${t('Attempt')} ${doc.id}: ${data.percentage}% - ${data.timestamp}`);
        });
      } else {
        addLog('warning', `⚠️ ${t('Attempts collection is EMPTY - no quiz results saved yet')}`);
      }

      setRawData({ attempts: querySnapshot.size });
    } catch (error) {
      addLog('error', `❌ ${t('Error reading attempts:')} ${error.message}`);
      if (error.code === 'failed-precondition') {
        addLog('error', `❌ ${t('FIRESTORE INDEX MISSING! You need to create an index.')}`);
        addLog('info', t('Firebase will show a link in the console to create the index automatically.'));
      }
    }

    // Test 5: Test Save Function
    addLog('info', `--- ${t('TEST 5: Test Save Attempt')} ---`);
    try {
      const testAttemptData = {
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        percentage: 80,
        topics: ['Test Topic'],
        timeSpent: 120000,
        questionTimes: {},
        answers: {}
      };

      addLog('info', t('Attempting to save test quiz result...'));
      const attemptId = await quizService.saveAttempt(currentUser.uid, testAttemptData);
      addLog('success', `✅ ${t('Test attempt saved successfully! ID:')} ${attemptId}`);
    } catch (error) {
      addLog('error', `❌ ${t('Failed to save test attempt:')} ${error.message}`);
      addLog('error', `${t('Error code:')} ${error.code}`);
    }

    // Test 6: Test Fetch Function
    addLog('info', `--- ${t('TEST 6: Test Fetch Attempts')} ---`);
    try {
      const attempts = await quizService.getUserAttempts(currentUser.uid, 5);
      addLog('success', `✅ ${t('Successfully fetched')} ${attempts.length} ${t('attempts')}`);
      if (attempts.length > 0) {
        attempts.forEach((att, idx) => {
          addLog('info', `${t('Attempt')} ${idx + 1}: ${att.percentage}% (${att.correctAnswers}/${att.totalQuestions})`);
        });
      }
    } catch (error) {
      addLog('error', `❌ ${t('Failed to fetch attempts:')} ${error.message}`);
    }

    // Test 7: Check Leaderboard
    addLog('info', `--- ${t('TEST 7: Test Leaderboard')} ---`);
    try {
      const leaderboard = await quizService.getWeeklyLeaderboard(5);
      addLog('success', `✅ ${t('Leaderboard loaded with')} ${leaderboard.length} ${t('users')}`);
    } catch (error) {
      addLog('error', `❌ ${t('Failed to load leaderboard:')} ${error.message}`);
    }

    addLog('info', `✅ ${t('Diagnostics complete!')}`);
    setTesting(false);
  }

  async function createTestAttempt() {
    if (!currentUser) {
      addLog('error', `❌ ${t('Must be logged in')}`);
      return;
    }

    addLog('info', t('Creating test quiz attempt...'));
    
    try {
      const testAttemptData = {
        score: Math.floor(Math.random() * 40) + 60,
        totalQuestions: 10,
        correctAnswers: Math.floor(Math.random() * 4) + 6,
        percentage: Math.floor(Math.random() * 40) + 60,
        topics: ['Organic Chemistry', 'Acids and Bases'],
        timeSpent: Math.floor(Math.random() * 300000) + 60000,
        questionTimes: {},
        answers: {}
      };

      const attemptId = await quizService.saveAttempt(currentUser.uid, testAttemptData);
      addLog('success', `✅ ${t('Test attempt created! ID:')} ${attemptId}`);
      addLog('info', t('Now check Dashboard and History pages to see if it appears'));
    } catch (error) {
      addLog('error', `❌ ${t('Failed to create test attempt:')} ${error.message}`);
    }
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <XCircle className="text-red-500" size={16} />;
      case 'warning':
        return <AlertCircle className="text-amber-500" size={16} />;
      default:
        return <Database className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Database size={32} />
          {t('Firebase Debug Dashboard')}
        </h1>
        <p className="text-orange-100 mt-1">
          {t('Comprehensive diagnostics for data saving issues')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={testEverything}
          disabled={testing}
          className="py-6 bg-lab-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-800 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              {t('Running Tests...')}
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              {t('Run Full Diagnostics')}
            </>
          )}
        </button>

        <button
          onClick={createTestAttempt}
          className="py-6 bg-chemistry-green text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Database size={20} />
          {t('Create Test Quiz Attempt')}
        </button>
      </div>

      {/* Console Output */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-4 border-b">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Database size={20} />
            {t('Console Output')}
          </h2>
        </div>

        <div className="p-4 bg-slate-900 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center py-8 font-mono">
              {t('Click "Run Full Diagnostics" to start testing...')}
            </p>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-2 rounded ${
                    log.type === 'error' ? 'bg-red-900/20' :
                    log.type === 'success' ? 'bg-green-900/20' :
                    log.type === 'warning' ? 'bg-amber-900/20' :
                    'bg-slate-800'
                  }`}
                >
                  {getLogIcon(log.type)}
                  <span className="text-slate-400 text-xs">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-amber-400' :
                    'text-blue-400'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <CheckCircle size={18} />
            {t('What Success Looks Like')}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ {t('User authenticated')}</li>
            <li>✅ {t('Profile loaded')}</li>
            <li>✅ {t('User document exists')}</li>
            <li>✅ {t('Can read attempts collection')}</li>
            <li>✅ {t('Can save test attempt')}</li>
            <li>✅ {t('Can fetch attempts')}</li>
            <li>✅ {t('Leaderboard loads')}</li>
          </ul>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
            <XCircle size={18} />
            {t('Common Errors & Fixes')}
          </h3>
          <ul className="text-sm text-red-800 space-y-2">
            <li><strong>{t('Permission denied:')}</strong> {t('Update Firestore rules')}</li>
            <li><strong>{t('Failed precondition:')}</strong> {t('Missing Firestore index')}</li>
            <li><strong>{t('Not authenticated:')}</strong> {t('Log in first')}</li>
            <li><strong>{t('Empty attempts:')}</strong> {t('Complete a quiz first')}</li>
          </ul>
        </div>
      </div>

      {/* Firestore Rules Reminder */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
        <h3 className="font-bold text-amber-900 mb-2">
          📋 {t('Required Firestore Rules')}
        </h3>
        <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /attempts/{attemptId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}`}
        </pre>
        <p className="text-sm text-amber-800 mt-2">
          {t('Copy this to Firebase Console → Firestore Database → Rules tab → Publish')}
        </p>
      </div>
    </div>
  );
}