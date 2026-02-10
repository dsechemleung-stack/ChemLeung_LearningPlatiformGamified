import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResultsSummary from '../components/ResultsSummary';
import { quizStorage } from '../utils/quizStorage';
import { quizService } from '../services/quizService';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasSavedRef = useRef(false);

  // Load data from storage
  const questions = quizStorage.getSelectedQuestions();
  const userAnswers = quizStorage.getUserAnswers();
  const questionTimes = quizStorage.getQuestionTimes();

  // Redirect if no data
  useEffect(() => {
    if (!questions || questions.length === 0 || Object.keys(userAnswers).length === 0) {
      navigate('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save attempt to Firebase - only once
  useEffect(() => {
    async function saveAttemptToFirebase() {
      if (hasSavedRef.current) return;
      if (!currentUser || !questions || questions.length === 0) return;
      if (Object.keys(userAnswers).length === 0) return;

      hasSavedRef.current = true;
      setSaving(true);

      try {
        const totalQuestions = questions.length;
        const correctAnswers = questions.reduce((acc, q) => {
          return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
        }, 0);
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);
        const timeSpent = questionTimes
          ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
          : null;

        const attemptData = {
          score: percentage,
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          timeSpent,
          questionTimes,
          answers: userAnswers,
          questions, // For Mistake Notebook
        };

        await quizService.saveAttempt(currentUser.uid, attemptData);
        setSaved(true);
        console.log('✅ Attempt saved (once).');
      } catch (error) {
        console.error('❌ Error saving attempt:', error);
        hasSavedRef.current = false;
      } finally {
        setSaving(false);
      }
    }

    saveAttemptToFirebase();
  }, [currentUser]);

  if (!questions || questions.length === 0) return null;

  const handleRestart = () => {
    quizStorage.clearQuizData();
    navigate('/');
  };

  return (
    <div className="relative">
      {saving && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="font-semibold">
            {t('results.savingToProfile')}
          </span>
        </div>
      )}
      {saved && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">
            {t('results.savedToProfile')}
          </span>
        </div>
      )}
      <ResultsSummary
        questions={questions}
        userAnswers={userAnswers}
        questionTimes={questionTimes}
        onRestart={handleRestart}
      />
    </div>
  );
}