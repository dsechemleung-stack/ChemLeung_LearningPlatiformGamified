import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResultsSummary from '../components/ResultsSummary';
import { quizStorage } from '../utils/quizStorage';
import { quizService } from '../services/quizService';
import { quizCompletionService } from '../services/quizCompletionService';
import { calendarService } from '../services/calendarService';
import { rewardMCQCompletion, rewardQuizQuestionTokens } from '../services/rewardLogic';
import ChemistryLoading from '../components/ChemistryLoading';
import { formatHKDateKey } from '../utils/hkTime';
import { srsService } from '../services/srsService';
import { HelpCircle } from 'lucide-react';

/**
 * ResultsPage - OPTIMIZED VERSION with SRS Review Support
 * 
 * FIXES:
 * 1. ✅ No translation keys - plain English text
 * 2. ✅ Faster save - parallel operations
 * 3. ✅ Always logs to calendar with date
 * 4. ✅ Shortened loading time
 * 5. ✅ Spaced repetition reviews submitted in batch
 */
export default function ResultsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const hasSavedRef = useRef(false);
  const [savedAttemptId, setSavedAttemptId] = useState(null);
  const [showAddToSrsPrompt, setShowAddToSrsPrompt] = useState(false);
  const [showSrsInfo, setShowSrsInfo] = useState(false);
  const [addingToSrs, setAddingToSrs] = useState(false);
  const [addToSrsDone, setAddToSrsDone] = useState(false);
  const hasShownSrsPromptRef = useRef(false);

  const questions = quizStorage.getSelectedQuestions();
  const userAnswers = quizStorage.getUserAnswers();
  const questionTimes = quizStorage.getQuestionTimes();
  
  // Generate attempt key AFTER userAnswers is defined
  const attemptKey = userAnswers && Object.keys(userAnswers).length > 0 
    ? `quiz_saved_${Object.keys(userAnswers).sort().join('_')}` 
    : null;

  const mistakesToSrsMode = localStorage.getItem('practice_mistakes_to_srs_mode') || 'ask';

  useEffect(() => {
    if (!questions || questions.length === 0 || Object.keys(userAnswers).length === 0) {
      navigate('/practice');
    }
  }, [navigate, questions, userAnswers]);

  // Block navigation until save completes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saving || !saved) {
        e.preventDefault();
        e.returnValue = t('results.resultsSavingLeaveConfirm');
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving, saved]);

  // OPTIMIZED: Save function with parallel operations
  useEffect(() => {
    async function saveAttemptToFirebase() {
      if (hasSavedRef.current) return;
      if (!currentUser || !questions || questions.length === 0) return;
      if (Object.keys(userAnswers).length === 0) return;
      
      // CRITICAL: Check sessionStorage to prevent double-submit on refresh
      if (attemptKey && sessionStorage.getItem(attemptKey)) {
        console.log('⚠️ Attempt already saved (sessionStorage), skipping duplicate save');
        setSaved(true);

        const existingAttemptId = attemptKey
          ? sessionStorage.getItem(`${attemptKey}_attemptId`)
          : null;

        if (existingAttemptId) setSavedAttemptId(existingAttemptId);

        if (!hasShownSrsPromptRef.current) {
          const alreadyResponded = attemptKey && sessionStorage.getItem(`${attemptKey}_srsPromptResponded`);
          const alreadyAutoAdded = attemptKey && sessionStorage.getItem(`${attemptKey}_srsAutoAdded`);
          if (!alreadyResponded) {
            hasShownSrsPromptRef.current = true;
            const wrongAnswers = questions.filter(q => userAnswers[q.ID] !== q.CorrectOption);
            const mode = localStorage.getItem('quiz_mode') || 'practice';

            if (mode !== 'spaced-repetition' && wrongAnswers.length > 0) {
              if (mistakesToSrsMode === 'never') {
                sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');
              } else if (mistakesToSrsMode === 'always') {
                if (!alreadyAutoAdded && currentUser?.uid && existingAttemptId) {
                  (async () => {
                    try {
                      await srsService.createCardsFromMistakes(currentUser.uid, wrongAnswers, existingAttemptId, existingAttemptId);
                      sessionStorage.setItem(`${attemptKey}_srsAutoAdded`, 'true');
                      sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');
                      setAddToSrsDone(true);
                      setTimeout(() => setAddToSrsDone(false), 2500);
                    } catch (e) {
                      console.error('Failed to auto-add mistakes to SRS:', e);
                    }
                  })();
                }
              } else {
                setShowAddToSrsPrompt(true);
              }
            }
          }
        }
        return;
      }

      hasSavedRef.current = true;
      setSaving(true);
      setSaveError(null);

      try {
        console.log('💾 Starting optimized save...');
        
        // Calculate results
        const totalQuestions = questions.length;
        const correctAnswers = questions.reduce((acc, q) => {
          return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
        }, 0);
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);
        const subtopics = [...new Set(questions.map(q => q.Subtopic).filter(Boolean))];
        const timeSpent = questionTimes
          ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
          : null;

        const attemptData = {
          score: percentage,
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          subtopics,
          timeSpent,
          questionTimes,
          answers: userAnswers,
          questions,
        };

        // STEP 1: Save attempt to Firestore
        const savedAttemptId = await quizService.saveAttempt(currentUser.uid, attemptData);
        const attemptId = savedAttemptId || `attempt_${Date.now()}`;
        console.log('✅ Attempt saved:', attemptId);
        setSavedAttemptId(attemptId);

        // Get quiz metadata
        const quizMode = localStorage.getItem('quiz_mode') || 'practice';
        const eventId = localStorage.getItem('quiz_event_id');
        const today = formatHKDateKey(new Date());

        // Prepare completion data for calendar
        const completionData = {
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          subtopics,
          timeSpent,
          mode: quizMode,
          eventId,
          date: today,  // Critical: Always include date
          completedAt: new Date().toISOString(),
          title: `${quizMode.charAt(0).toUpperCase() + quizMode.slice(1)} Quiz`
        };

        // STEP 2: Run ALL operations in parallel (MUCH FASTER!)
        const parallelOperations = [];

        // Operation 0: Token rewards (per-question + quiz bonus)
        parallelOperations.push(
          (async () => {
            try {
              await rewardQuizQuestionTokens(currentUser.uid, questions, userAnswers, quizMode);
              await rewardMCQCompletion(currentUser.uid, {
                percentage,
                totalQuestions,
                correctAnswers,
                topics,
                attemptId
              });
            } catch (err) {
              console.error('⚠️ Token reward error:', err);
            }
          })()
        );

        // Operation 1: Process quiz completion (performance + spaced repetition)
        parallelOperations.push(
          quizCompletionService.processQuizCompletion(
            currentUser.uid,
            questions,
            userAnswers,
            attemptId,
            { createSrsCards: false }
          ).catch(err => {
            console.error('⚠️ Processing error:', err);
            return { error: err };
          })
        );

        // Operation 2: Log to calendar (ALWAYS, for ALL quiz types)
        parallelOperations.push(
          quizCompletionService.logDetailedCompletion(
            currentUser.uid,
            attemptId,
            completionData
          ).catch(err => {
            console.error('⚠️ Calendar logging error:', err);
            return { error: err };
          })
        );

        // Operation 3: Mark specific event as complete (if applicable)
        if (quizMode === 'study-plan' && eventId) {
          parallelOperations.push(
            calendarService.markEventCompleted(eventId, {
              completedAt: new Date().toISOString(),
              questionCount: totalQuestions,
              correctCount: correctAnswers,
              accuracy: correctAnswers / totalQuestions,
              attemptId
            }).catch(err => {
              console.error('⚠️ Event marking error:', err);
              return { error: err };
            })
          );
        }

        // Operation 4: Handle spaced repetition reviews (NEW - BATCH SUBMISSION)
        if (quizMode === 'spaced-repetition') {
          // Get SRS cards from localStorage
          const srsCards = JSON.parse(localStorage.getItem('quiz_srs_cards') || '[]');
          
          // Build reviews array for ALL questions in this session
          const reviews = questions.map((question) => {
            const card = srsCards.find(c => c.questionId === question.ID);
            const wasCorrect = userAnswers[question.ID] === question.CorrectOption;
            
            return {
              cardId: card?.id,
              wasCorrect,
              userAnswer: userAnswers[question.ID],
              correctAnswer: question.CorrectOption,
              timeSpent: questionTimes?.[question.ID] || 0
            };
          }).filter(review => review.cardId); // Only include valid cards with cardId

          if (reviews.length > 0) {
            console.log(`📚 Submitting ${reviews.length} SRS reviews in batch...`);
            
            // Submit all reviews in one batch session
            parallelOperations.push(
              quizCompletionService.handleReviewSessionCompletion(
                currentUser.uid,
                reviews
              ).then(() => {
                // Clear SRS data after successful submission
                localStorage.removeItem('quiz_srs_cards');
                localStorage.removeItem('quiz_srs_session_id');
                console.log('✅ SRS reviews submitted and cleared');
              }).catch(err => {
                console.error('⚠️ SRS review submission error:', err);
                return { error: err };
              })
            );
          }

          // Also handle individual event markings (backward compatibility)
          const eventIdsJson = localStorage.getItem('quiz_event_ids');
          if (eventIdsJson) {
            const eventIds = JSON.parse(eventIdsJson);
            eventIds.forEach(id => {
              parallelOperations.push(
                (async () => {
                  const isCorrect = correctAnswers === totalQuestions;
                  await calendarService.markEventCompleted(id, {
                    completedAt: new Date().toISOString(),
                    wasCorrect: isCorrect,
                    attemptId
                  });
                })().catch(err => {
                  console.error('⚠️ Review marking error:', err);
                  return { error: err };
                })
              );
            });
          } else if (eventId) {
            parallelOperations.push(
              (async () => {
                const isCorrect = correctAnswers === totalQuestions;
                await calendarService.markEventCompleted(eventId, {
                  completedAt: new Date().toISOString(),
                  wasCorrect: isCorrect,
                  attemptId
                });
              })().catch(err => {
                console.error('⚠️ Review marking error:', err);
                return { error: err };
              })
            );
          }
        }

        // Operation 5: Handle AI recommendations
        if (quizMode === 'ai-recommendation' && eventId) {
          parallelOperations.push(
            calendarService.markEventCompleted(eventId, {
              completedAt: new Date().toISOString(),
              questionCount: totalQuestions,
              correctCount: correctAnswers,
              accuracy: correctAnswers / totalQuestions,
              attemptId
            }).catch(err => {
              console.error('⚠️ AI rec marking error:', err);
              return { error: err };
            })
          );
        }

        // Execute ALL operations at once (parallel = faster!)
        console.log(`🚀 Running ${parallelOperations.length} operations in parallel...`);
        const results = await Promise.all(parallelOperations);
        console.log('✅ All operations complete!');

        // Check for any errors (non-blocking)
        const errors = results.filter(r => r?.error);
        if (errors.length > 0) {
          console.warn('⚠️ Some operations had errors (non-critical):', errors);
          
          // If SRS submission failed, keep the data for retry
          const srsError = errors.find(e => e.error && e.error.message?.includes('SRS'));
          if (srsError) {
            console.log('📝 SRS data preserved for retry');
          }
        }

        setSaved(true);

        if (!hasShownSrsPromptRef.current) {
          const alreadyResponded = attemptKey && sessionStorage.getItem(`${attemptKey}_srsPromptResponded`);
          if (!alreadyResponded) {
            hasShownSrsPromptRef.current = true;
            const wrongAnswers = questions.filter(q => userAnswers[q.ID] !== q.CorrectOption);
            const mode = localStorage.getItem('quiz_mode') || 'practice';

            if (mode !== 'spaced-repetition' && wrongAnswers.length > 0) {
              if (mistakesToSrsMode === 'never') {
                sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');
              } else if (mistakesToSrsMode === 'always') {
                try {
                  await srsService.createCardsFromMistakes(currentUser.uid, wrongAnswers, attemptId, attemptId);
                  sessionStorage.setItem(`${attemptKey}_srsAutoAdded`, 'true');
                  sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');
                  setAddToSrsDone(true);
                  setTimeout(() => setAddToSrsDone(false), 2500);
                } catch (e) {
                  console.error('Failed to auto-add mistakes to SRS:', e);
                }
              } else {
                setShowAddToSrsPrompt(true);
              }
            }
          }
        }
        
        // Mark as saved in sessionStorage to prevent double-submit on refresh
        if (attemptKey) {
          sessionStorage.setItem(attemptKey, 'true');
          sessionStorage.setItem(`${attemptKey}_attemptId`, attemptId);
        }
        
        console.log('🎉 Save complete!');

      } catch (error) {
        console.error('❌ Critical save error:', error);
        setSaveError(error.message || 'Failed to save quiz results');
        hasSavedRef.current = false;
      } finally {
        setSaving(false);
      }
    }

    saveAttemptToFirebase();
  }, [currentUser, questions, userAnswers, questionTimes]);

  const handleRetry = () => {
    hasSavedRef.current = false;
    setSaveError(null);
    window.location.reload();
  };

  if (!questions || questions.length === 0) return null;

  const handleRestart = () => {
    if (!saved && !window.confirm(t('results.resultsMayNotBeSavedLeaveConfirm'))) {
      return;
    }

    // Clear ALL quiz-related localStorage items
    quizStorage.clearQuizData();
    localStorage.removeItem('quiz_mode');
    localStorage.removeItem('quiz_event_id');
    localStorage.removeItem('quiz_event_ids');
    localStorage.removeItem('quiz_event_phase');
    localStorage.removeItem('quiz_timer_enabled');
    localStorage.removeItem('quiz_review_mode');
    localStorage.removeItem('quiz_srs_cards');
    localStorage.removeItem('quiz_srs_session_id');
    
    navigate('/practice');
  };

  return (
    <div className="relative">
      {/* Blocking Save Modal - Simplified & Faster */}
      {saving && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <ChemistryLoading />
          </div>
        </div>
      )}

      {addToSrsDone && (
        <div className="fixed top-32 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <span className="font-semibold">
            {t('results.addedToSrs')}
          </span>
        </div>
      )}

      {showAddToSrsPrompt && !saving && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddToSrsPrompt(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-black text-slate-900">
                  {t('results.addMistakesToSrsTitle')}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {t('results.addMistakesToSrsBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddToSrsPrompt(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center flex-none"
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between mt-5 gap-3">
              <button
                type="button"
                onClick={() => setShowSrsInfo(true)}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-center text-slate-800 font-bold"
                aria-label={t('common.details')}
              >
                <HelpCircle size={16} />
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={addingToSrs}
                  onClick={() => {
                    if (attemptKey) sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');
                    setShowAddToSrsPrompt(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-black hover:bg-slate-300 transition-all disabled:opacity-60"
                >
                  {t('common.noThanks')}
                </button>
                <button
                  type="button"
                  disabled={addingToSrs}
                  onClick={async () => {
                    try {
                      setAddingToSrs(true);
                      const uid = currentUser?.uid;
                      if (!uid) return;
                      const wrongAnswers = questions.filter(q => userAnswers[q.ID] !== q.CorrectOption);
                      if (wrongAnswers.length === 0) {
                        setShowAddToSrsPrompt(false);
                        return;
                      }

                      const attemptId = savedAttemptId || null;
                      const sessionId = attemptId || `attempt_${Date.now()}`;

                      await srsService.createCardsFromMistakes(uid, wrongAnswers, sessionId, attemptId);

                      if (attemptKey) sessionStorage.setItem(`${attemptKey}_srsPromptResponded`, 'true');

                      setShowAddToSrsPrompt(false);
                      setAddToSrsDone(true);
                      setTimeout(() => setAddToSrsDone(false), 2500);
                    } catch (e) {
                      console.error('Failed to add mistakes to SRS:', e);
                      alert(t('results.failedAddToSrs'));
                    } finally {
                      setAddingToSrs(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-black transition-all disabled:opacity-60"
                >
                  {addingToSrs ? t('results.addingToSrs') : t('results.addToSrs')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSrsInfo && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSrsInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-black text-slate-900">
                  {t('calendar.srsReviewMechanismTitle')}
                </h3>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                  {t('calendar.srsReviewMechanismDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSrsInfo(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center flex-none"
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {saveError && !saving && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {t('results.saveFailed')}
            </h3>
            <p className="text-slate-600 mb-6">
              {saveError}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                {t('common.retry')}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t('results.resultsNotSavedContinueAnywayConfirm'))) {
                    setSaveError(null);
                    setSaved(true);
                    
                    // Clear quiz data even if save failed
                    quizStorage.clearQuizData();
                    localStorage.removeItem('quiz_mode');
                    localStorage.removeItem('quiz_event_id');
                    localStorage.removeItem('quiz_event_ids');
                    localStorage.removeItem('quiz_srs_cards');
                    localStorage.removeItem('quiz_srs_session_id');
                  }
                }}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
              >
                {t('results.continueAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Indicator */}
      {saved && !saving && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">
            {localStorage.getItem('quiz_mode') === 'spaced-repetition' 
              ? t('results.reviewsSaved') 
              : t('results.savedToProfile')}
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