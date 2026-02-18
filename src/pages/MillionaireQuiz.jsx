
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Gem, PhoneCall, BarChart3, Percent, X, Menu, Info, MoreHorizontal, LayoutGrid, HandCoins, ShieldCheck } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ChemistryLoading from '../components/ChemistryLoading';
import { quizService } from '../services/quizService';
import { fetchMillionaireQuestionsFiltered, MILLIONAIRE_LEVELS } from '../services/millionaireService';
import MoneyLadder from '../components/millionaire/MoneyLadder';
import GameOverModal from '../components/millionaire/GameOverModal';
import ChemLeungModal from '../components/millionaire/ChemLeungModal';
import ProbabilityModal from '../components/millionaire/ProbabilityModal';

const LADDER_TOKENS = [1, 2, 3, 4, 5, 7, 9, 11, 14, 17, 21, 25, 30, 35, 42, 50, 60, 72, 85, 100];

function computeFailReward(levelReached) {
  const lvl = Number(levelReached || 0);
  if (!Number.isFinite(lvl) || lvl <= 0) return 0;
  if (lvl < 5) return 0;
  if (lvl >= 6 && lvl <= 10) return 5;
  if (lvl >= 11 && lvl <= 14) return 14;
  if (lvl >= 15 && lvl <= 17) return 42; // Safety net at Q15
  if (lvl >= 18 && lvl <= 20) return 60; // Safety net at Q17
  return 0;
}

export default function MillionaireQuiz({ questions: allQuestions = [] }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, tf } = useLanguage();

  const QUESTION_HEIGHT = 240;
  const ANSWER_HEIGHT = 66;
  const ANSWER_GAP_Y = 10;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedOption, setSelectedOption] = useState(null);
  const [lockedOption, setLockedOption] = useState(null);
  const [answers, setAnswers] = useState({});
  const [revealState, setRevealState] = useState(null); // null | 'correct' | 'wrong'
  const [victoryOverlay, setVictoryOverlay] = useState(false);
  const [milestoneOverlay, setMilestoneOverlay] = useState(null); // null | { level, tokens }
  const [pendingBank, setPendingBank] = useState(0);

  const [gameOver, setGameOver] = useState(false);
  const [finalReward, setFinalReward] = useState(0);
  const [finalReason, setFinalReason] = useState(null);
  const [savingReward, setSavingReward] = useState(false);

  const [lifeline5050Used, setLifeline5050Used] = useState(false);
  const [lifelineChemUsed, setLifelineChemUsed] = useState(false);
  const [lifelineProbUsed, setLifelineProbUsed] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState(new Set());
  const [showChemModal, setShowChemModal] = useState(false);
  const [showProbModal, setShowProbModal] = useState(false);

  const [ladderOpenMobile, setLadderOpenMobile] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);

  const [shimmerOption, setShimmerOption] = useState(null);
  const [lockInPending, setLockInPending] = useState(false);
  const [expandModal, setExpandModal] = useState(null); // null | { title, text }

  // Timer for Q16-20 (1.25 minutes = 75 seconds)
  const [timeRemaining, setTimeRemaining] = useState(75);
  const [isTimedQuestion, setIsTimedQuestion] = useState(false);
  const timerRef = useRef(null);

  const questionTextRef = useRef(null);
  const [questionFitFont, setQuestionFitFont] = useState(null);
  const [questionFitLineHeight, setQuestionFitLineHeight] = useState(null);
  const [questionOverflowing, setQuestionOverflowing] = useState(false);

  const answerTextRefs = useRef({});
  const [answerOverflowing, setAnswerOverflowing] = useState({});

  const questionTextInnerRef = useRef(null);

  const hoverCloseTimerRef = useRef(null);
  const [hoverPopover, setHoverPopover] = useState(null); // null | { title, text, rect }

  const finalizeOnceRef = useRef(false);

  const getQuestionKey = (q, idx) => {
    if (!q) return String(idx ?? 'unknown');
    return String(q.ID ?? q.Id ?? q.id ?? q.DSEcode ?? idx ?? 'unknown');
  };

  const shuffle = (arr) => {
    const a = Array.isArray(arr) ? [...arr] : [];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const currentQuestion = questions[currentIndex];
  const level = currentIndex + 1;
  const currentBank = useMemo(() => {
    if (level <= 1) return 0;
    return LADDER_TOKENS[level - 2] || 0;
  }, [level]);

  const ladderData = useMemo(() => {
    return LADDER_TOKENS.map((amt, idx) => ({
      level: idx + 1,
      amount: amt,
      safe: idx + 1 === 5 || idx + 1 === 10 || idx + 1 === 15 || idx + 1 === 17,
      isFireLevel: idx + 1 >= 16, // Q16-20 have fire effects
    }));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    try {
      setLoading(true);
      const picked = fetchMillionaireQuestionsFiltered(allQuestions, [], MILLIONAIRE_LEVELS);
      setQuestions(picked);
    } catch (e) {
      console.error(e);
      alert(e.message || t('millionaire.errors.startFailed'));
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  }, [allQuestions, navigate]);

  // Timer logic for Q16-20
  useEffect(() => {
    const level = currentIndex + 1;
    const shouldBeTimed = level >= 16;
    
    setIsTimedQuestion(shouldBeTimed);
    
    if (shouldBeTimed) {
      setTimeRemaining(75);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - treat as wrong answer
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex]);

  const handleTimeUp = () => {
    if (lockedOption || gameOver) return;
    // Set game over with time up reason
    const failReward = computeFailReward(level);
    finalizeGame({ reward: failReward, reason: 'time_up' });
  };

  const resetPerQuestionState = () => {
    setSelectedOption(null);
    setLockedOption(null);
    setRevealState(null);
    setHiddenOptions(new Set());
    setPendingBank(0);
  };

  const awardTokensToUser = async (amount) => {
    if (!currentUser?.uid || !amount || amount <= 0) return;
    try {
      const { awardTokens } = await import('../services/tokenService');
      await awardTokens(currentUser.uid, amount, `Millionaire Game: Completed Q${level}`, {
        category: 'millionaire',
        level,
        totalReward: amount
      });
    } catch (error) {
      console.error('Error awarding tokens:', error);
    }
  };

  const finalizeGame = async ({ reward, reason }) => {
    if (finalizeOnceRef.current) return;
    finalizeOnceRef.current = true;

    setSavingReward(true);
    try {
      if (currentUser?.uid) {
        const attemptedQuestions = questions.slice(0, Math.min(currentIndex + 1, questions.length));
        const correctAnswers = attemptedQuestions.reduce((acc, q, idx) => {
          const key = getQuestionKey(q, idx);
          const chosen = String(answers[key] || '').toUpperCase();
          const correct = String(q.CorrectOption || '').toUpperCase();
          return acc + (chosen && chosen === correct ? 1 : 0);
        }, 0);

        const totalQuestions = attemptedQuestions.length;
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const topics = [...new Set(attemptedQuestions.map(q => q.Topic))].filter(Boolean);

        await quizService.saveAttempt(currentUser.uid, {
          score: percentage,
          totalQuestions,
          correctAnswers,
          percentage,
          topics,
          timeSpent: null,
          questionTimes: null,
          answers,
          questions: attemptedQuestions,
          mode: 'millionaire',
          millionaireLevelReached: level,
          millionaireFinalReward: reward,
          millionaireReason: reason,
          millionaireWin: reason === 'win',
        });
      }

      await awardTokensToUser(reward);
    } catch (e) {
      console.error(e);
      alert(e.message || t('millionaire.errors.tokenUpdateFailed'));
    } finally {
      setFinalReward(reward);
      setFinalReason(reason);
      setSavingReward(false);
      setGameOver(true);
      setVictoryOverlay(false);
      setMilestoneOverlay(null);
      setLadderOpenMobile(false);
      console.log('Millionaire finalize:', { reward, reason });
    }
  };

  const handleSelect = (opt) => {
    if (!currentQuestion || gameOver || savingReward) return;
    if (lockedOption) return;
    if (hiddenOptions.has(opt)) return;
    setSelectedOption(opt);
  };

  const handleLockIn = async () => {
    if (!currentQuestion || gameOver || savingReward) return;
    if (!selectedOption) return;

    const correct = String(currentQuestion.CorrectOption).toUpperCase();
    const chosen = String(selectedOption).toUpperCase();
    setLockedOption(chosen);
    setShimmerOption(chosen);
    setLockInPending(true);
    setAnswers(prev => ({ ...prev, [getQuestionKey(currentQuestion, currentIndex)]: chosen }));

    const isCorrect = chosen === correct;
    setRevealState(isCorrect ? 'correct' : 'wrong');

    window.setTimeout(async () => {
      setLockInPending(false);
      if (isCorrect) {
        const passedLevel = level;
        const bankAfter = LADDER_TOKENS[passedLevel - 1] || 0;
        setPendingBank(bankAfter);

        if (passedLevel === 5 || passedLevel === 10 || passedLevel === 15 || passedLevel === 17) {
          setMilestoneOverlay({ level: passedLevel, tokens: bankAfter });
          return;
        }

        if (passedLevel >= MILLIONAIRE_LEVELS) {
          await finalizeGame({ reward: bankAfter, reason: 'win' });
          return;
        }

        setVictoryOverlay(true);
      } else {
        const levelReached = level;
        const reward = computeFailReward(levelReached);
        await finalizeGame({ reward, reason: 'wrong_answer' });
      }
    }, 650);

    window.setTimeout(() => {
      setShimmerOption(null);
    }, 750);
  };

  const handleContinue = () => {
    if (gameOver || savingReward) return;
    setVictoryOverlay(false);
    resetPerQuestionState();
    setCurrentIndex(i => i + 1);
  };

  const handleCashOut = async () => {
    if (gameOver || savingReward) return;
    // Use safety net calculation for quitting
    const reward = computeFailReward(level);
    await finalizeGame({ reward, reason: 'cash_out' });
  };

  const handleMilestoneContinue = () => {
    if (!milestoneOverlay) return;
    setMilestoneOverlay(null);

    const passedLevel = milestoneOverlay.level;
    if (passedLevel >= MILLIONAIRE_LEVELS) {
      finalizeGame({ reward: milestoneOverlay.tokens, reason: 'win' });
      return;
    }

    resetPerQuestionState();
    setCurrentIndex(i => i + 1);
  };

  const use5050 = () => {
    if (!currentQuestion || lifeline5050Used || lockedOption || gameOver) return;
    const correct = String(currentQuestion.CorrectOption).toUpperCase();
    const wrongs = ['A', 'B', 'C', 'D'].filter(o => o !== correct);
    const hide = shuffle(wrongs).slice(0, 2);
    setHiddenOptions(new Set(hide));
    setLifeline5050Used(true);
  };

  const useChemLeung = () => {
    if (!currentQuestion || lifelineChemUsed || gameOver) return;
    setShowChemModal(true);
    setLifelineChemUsed(true);
  };

  const useProbability = () => {
    if (!currentQuestion || lifelineProbUsed || gameOver) return;
    setShowProbModal(true);
    setLifelineProbUsed(true);
  };

  const optionText = useMemo(() => {
    if (!currentQuestion) return {};
    return {
      A: currentQuestion.OptionA,
      B: currentQuestion.OptionB,
      C: currentQuestion.OptionC,
      D: currentQuestion.OptionD,
    };
  }, [currentQuestion]);

  const isRichHtml = (val) => {
    const s = String(val || '');
    if (!s) return false;
    return /<\s*img\b|<\s*span\b|<\s*br\b|<\s*div\b|<\s*p\b|<\s*svg\b/i.test(s);
  };

  const isWide = useMediaQuery('(min-width: 768px)');

  const fullQuestionSetText = useMemo(() => {
    if (!currentQuestion) return '';
    const q = normalizeQuestionText(currentQuestion.Question, isWide);
    const a = normalizeQuestionText(currentQuestion.OptionA, isWide);
    const b = normalizeQuestionText(currentQuestion.OptionB, isWide);
    const c = normalizeQuestionText(currentQuestion.OptionC, isWide);
    const d = normalizeQuestionText(currentQuestion.OptionD, isWide);
    return `${q}\n\nA. ${a}\nB. ${b}\nC. ${c}\nD. ${d}`;
  }, [currentQuestion, isWide]);

  const fullQuestionSetHtml = useMemo(() => {
    if (!currentQuestion) return null;
    const q = String(currentQuestion.Question || '');
    const a = String(currentQuestion.OptionA || '');
    const b = String(currentQuestion.OptionB || '');
    const c = String(currentQuestion.OptionC || '');
    const d = String(currentQuestion.OptionD || '');
    return `
      <div class="space-y-5">
        <div class="prose prose-slate max-w-none text-white/90 prose-invert" data-m-rich="true">${q}</div>
        <div class="grid grid-cols-1 gap-2">
          <div class="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
            <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-black bg-white/10 text-white">A</div>
            <div class="flex-1 prose prose-slate max-w-none text-white/90 prose-invert" data-m-rich="true">${a}</div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
            <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-black bg-white/10 text-white">B</div>
            <div class="flex-1 prose prose-slate max-w-none text-white/90 prose-invert" data-m-rich="true">${b}</div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
            <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-black bg-white/10 text-white">C</div>
            <div class="flex-1 prose prose-slate max-w-none text-white/90 prose-invert" data-m-rich="true">${c}</div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
            <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-black bg-white/10 text-white">D</div>
            <div class="flex-1 prose prose-slate max-w-none text-white/90 prose-invert" data-m-rich="true">${d}</div>
          </div>
        </div>
      </div>
    `;
  }, [currentQuestion]);

  const getFittedText = (raw, isQuestion = false) => {
    const s = normalizeQuestionText(raw, isWide);
    const len = s.length;

    const clampNum = (n, min, max) => Math.min(max, Math.max(min, n));

    let fontSize;
    let lineHeight;
    let letterSpacing;
    if (isQuestion) {
      const max = 22;
      const min = 12;
      const t = clampNum((len - 60) / 220, 0, 1);
      fontSize = Math.round((max - (max - min) * t) * 10) / 10;

      const lhMax = 1.22;
      const lhMin = 1.04;
      const ft = clampNum((max - fontSize) / (max - min), 0, 1);
      lineHeight = Math.round((lhMax - (lhMax - lhMin) * ft) * 100) / 100;

      const lsMax = 0.02;
      const lsMin = -0.02;
      const lt = clampNum((len - 120) / 220, 0, 1);
      letterSpacing = `${Math.round((lsMax - (lsMax - lsMin) * lt) * 1000) / 1000}em`;
    } else {
      const max = 18;
      const min = 13;
      const t = clampNum((len - 28) / 92, 0, 1);
      fontSize = Math.round((max - (max - min) * t) * 10) / 10;

      const lhMax = 1.18;
      const lhMin = 1.02;
      const ft = clampNum((max - fontSize) / (max - min), 0, 1);
      lineHeight = Math.round((lhMax - (lhMax - lhMin) * ft) * 100) / 100;

      const lsMax = 0.01;
      const lsMin = -0.02;
      const lt = clampNum((len - 60) / 120, 0, 1);
      letterSpacing = `${Math.round((lsMax - (lsMax - lsMin) * lt) * 1000) / 1000}em`;
    }

    const maxLength = isQuestion ? 280 : 140;
    const needsTruncate = len > maxLength;
    const text = needsTruncate ? s.slice(0, maxLength - 10) : s;

    return { fullText: s, displayText: text, fontSize, lineHeight, letterSpacing, truncated: needsTruncate };
  };

  const correctOption = useMemo(() => {
    return String(currentQuestion?.CorrectOption || '').toUpperCase();
  }, [currentQuestion]);

  useLayoutEffect(() => {
    if (!currentQuestion) return;

    const el = questionTextInnerRef.current;
    if (!el) return;

    const q = getFittedText(currentQuestion.Question, true);
    const lhForFont = (font) => {
      const maxF = 22;
      const minF = 12;
      const lhMax = 1.22;
      const lhMin = 1.04;
      const t = Math.min(1, Math.max(0, (maxF - font) / (maxF - minF)));
      return Math.round((lhMax - (lhMax - lhMin) * t) * 100) / 100;
    };
    const minFont = 12;

    setQuestionFitFont(null);
    setQuestionFitLineHeight(null);
    setQuestionOverflowing(false);

    const raf = requestAnimationFrame(() => {
      let font = 22;

      for (let i = 0; i < 40; i += 1) {
        el.style.fontSize = `${font}px`;
        el.style.lineHeight = `${lhForFont(font)}`;
        if (q.letterSpacing) el.style.letterSpacing = q.letterSpacing;
        const overflows = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
        if (!overflows || font <= minFont) break;
        font -= 1;
      }

      const stillOverflows = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      setQuestionFitFont(font);
      setQuestionFitLineHeight(lhForFont(font));
      setQuestionOverflowing(stillOverflows);
    });

    return () => cancelAnimationFrame(raf);
  }, [currentQuestion, isWide]);

  useLayoutEffect(() => {
    if (!currentQuestion) return;

    const next = {};
    (['A', 'B', 'C', 'D']).forEach((opt) => {
      const el = answerTextRefs.current?.[opt];
      if (!el) return;
      next[opt] = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
    });
    setAnswerOverflowing(next);
  }, [currentQuestion, isWide]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  const openHoverPopover = (e, title, text) => {
    if (!text) return;
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);

    const rect = e?.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    setHoverPopover({ title, text, rect });
  };

  const scheduleCloseHoverPopover = () => {
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = window.setTimeout(() => setHoverPopover(null), 120);
  };

  const getOptionClass = (opt) => {
    const isHidden = hiddenOptions.has(opt);
    if (isHidden) return 'opacity-0 pointer-events-none';

    const base = 'm-hex m-hex--svg m-hex--idle m-hex--hover transition-all duration-300';
    const isSelected = selectedOption === opt;
    const isLocked = lockedOption === opt;

    if (!lockedOption) {
      return `${base} ${isSelected ? 'm-hex--selected' : ''}`;
    }

    if (lockInPending) {
      if (isLocked) return `${base} m-hex--selected scale-[1.02] animate-pulse`;
      return `${base} opacity-15 transition-opacity duration-700`;
    }

    if (revealState === 'correct') {
      if (opt === correctOption) return `${base} m-hex--correct scale-[1.02]`;
      if (isLocked) return `${base} m-hex--wrong`;
      return `${base} m-hex--dim`;
    }

    if (revealState === 'wrong') {
      if (isLocked) return `${base} m-hex--wrong scale-[1.02]`;
      if (opt === correctOption) return `${base} m-hex--correct m-hex--flash`;
      return `${base} m-hex--dim`;
    }

    return `${base}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020230]">
        <ChemistryLoading />
      </div>
    );
  }

  if (!currentQuestion) return null;

  const rewardIfClear = LADDER_TOKENS[level - 1] || 0;

  return (
    <div
      className="h-screen overflow-hidden text-white"
      style={{
        background: 'radial-gradient(circle at top, #020230 0%, #000000 70%)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4 h-full flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-4 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-300/30 flex items-center justify-center">
              <Gem className="text-white" size={20} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70">{t('millionaire.modeName')}</div>
              <div className="text-xl font-black">Q{level} / {MILLIONAIRE_LEVELS}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-[11px] text-white/70">{t('millionaire.rewardIfClear')}</div>
              <div className="text-lg font-black text-amber-300">
                +{rewardIfClear} {t('millionaire.tokensUnit')}
              </div>
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              disabled={savingReward}
              className="hidden sm:inline-flex m-quit w-10 h-10 items-center justify-center rounded-xl bg-red-600/25 border border-red-400/40 text-red-200 hover:bg-red-600/35 transition disabled:opacity-50"
              title={t('millionaire.quit')}
            >
              <X size={18} />
            </button>

            <button
              onClick={() => setLadderOpenMobile(true)}
              className="sm:hidden px-3 py-2 rounded-xl bg-white/10 border border-white/10"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 flex-1 min-h-0 pb-24">
          {!victoryOverlay && (
            <div className="lg:col-span-2 flex items-center justify-between gap-3 flex-none">
              <div className="flex flex-wrap items-center gap-3">
                <MagneticIconButton
                  label={t('millionaire.lifelines.aiTips')}
                  onClick={useProbability}
                  disabled={lifelineProbUsed || savingReward || gameOver}
                  used={lifelineProbUsed}
                >
                  <BarChart3 size={18} />
                </MagneticIconButton>
                <MagneticIconButton
                  label={t('millionaire.lifelines.fiftyFifty')}
                  onClick={use5050}
                  disabled={lifeline5050Used || !!lockedOption || savingReward || gameOver}
                  used={lifeline5050Used}
                >
                  <Percent size={18} />
                </MagneticIconButton>
                <MagneticIconButton
                  label={t('millionaire.lifelines.chemLeung')}
                  onClick={useChemLeung}
                  disabled={lifelineChemUsed || savingReward || gameOver}
                  used={lifelineChemUsed}
                >
                  <PhoneCall size={18} />
                </MagneticIconButton>

                {/* Timer with fire line for Q16-20 */}
                {isTimedQuestion && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-red-600/20 border border-red-400/40 rounded-xl">
                    <div className="relative">
                      {/* Fire line - decreases as time runs out */}
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000 ease-linear"
                          style={{ width: `${(timeRemaining / 75) * 100}%` }}
                        />
                      </div>
                      {/* Fire emoji at the end of the line */}
                      <div 
                        className="absolute -top-1 text-sm transition-all duration-1000 ease-linear"
                        style={{ left: `${(timeRemaining / 75) * 80 - 8}px` }}
                      >
                        🔥
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-3 h-3">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                      </div>
                      <span className={`font-mono font-bold ${timeRemaining <= 10 ? 'text-red-300 animate-pulse' : 'text-red-200'}`}>
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPeriodicTable(true)}
                className="m-tool-btn m-tool-btn--pt"
                title={t('millionaire.periodicTable')}
                aria-label={t('millionaire.periodicTable')}
              >
                <span className="m-tool-btn__icon" aria-hidden="true">
                  <LayoutGrid size={20} />
                </span>
                <span className="m-tool-btn__label">{t('millionaire.periodicTable')}</span>
              </button>
            </div>
          )}
          {/* Left: Question + Answers */}
          <div className="min-h-0 h-full flex flex-col gap-4">
            <div className="flex-none flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-white/60">{t('millionaire.questionLabel')}</div>
              <div className="text-sm font-black text-white/90">Q{level}/{MILLIONAIRE_LEVELS}</div>
            </div>

            {/* Question Hex (taller to fit longer chemistry stems) */}
            <div className="flex-none w-full m-hex-wrap" style={{ ['--m-hex-span']: '90%' }}>
              <div className="m-hex-extend" />
              <div
                className="m-hex m-hex--svg m-hex--idle px-0 shadow-2xl flex items-center justify-center transition-all duration-500"
                style={{
                  width: 'var(--m-hex-span)',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  height: `${QUESTION_HEIGHT}px`,
                  minHeight: `${QUESTION_HEIGHT}px`,
                  maxHeight: `${QUESTION_HEIGHT}px`
                }}
              >
                <HexNeonOutline isTimedQuestion={isTimedQuestion} />
                {(() => {
                  const isRich = isRichHtml(currentQuestion.Question);
                  const q = isRich ? null : getFittedText(currentQuestion.Question, true);
                  return (
                    <div
                      ref={questionTextRef}
                      className="m-hex-content text-center font-black leading-relaxed flex items-center justify-center min-w-0 overflow-hidden"
                      style={{
                        fontSize: isRich ? undefined : (questionFitFont ?? q.fontSize),
                        lineHeight: isRich ? undefined : (questionFitLineHeight ?? q.lineHeight),
                        letterSpacing: isRich ? undefined : q.letterSpacing,
                        height: '100%',
                        ['--m-safe-pad']: '12%'
                      }}
                    >
                      {isRich ? (
                        <div
                          ref={questionTextInnerRef}
                          className="block overflow-hidden text-left w-full max-w-full min-w-0 break-words whitespace-normal px-6 sm:px-10 [&_*]:max-w-full [&_img]:max-h-[180px] [&_img]:max-w-full [&_img]:h-auto [&_img]:w-auto [&_img]:object-contain [&_img]:my-2"
                          style={{ maxHeight: `${QUESTION_HEIGHT - 14}px` }}
                          dangerouslySetInnerHTML={{ __html: String(currentQuestion.Question || '') }}
                        />
                      ) : (
                        <span
                          ref={questionTextInnerRef}
                          className="block overflow-hidden whitespace-pre-wrap break-words px-6 sm:px-10"
                          style={{ maxHeight: `${QUESTION_HEIGHT - 14}px` }}
                        >
                          {q.displayText}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Middle Expand Area: Answers OR Decision Card */}
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              {!victoryOverlay ? (
                <div className="flex-1 min-h-0">
                  <div
                    className="w-[92%] mx-auto flex justify-end mb-2"
                    style={{ marginRight: 'auto', marginLeft: 'auto' }}
                  >
                    <button
                      type="button"
                      className="m-ellipsis-btn"
                      onClick={() => setExpandModal({ title: `Question Set (Q${level})`, text: fullQuestionSetText, html: fullQuestionSetHtml })}
                      title="View full question and options"
                      aria-label="View full question and options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-[10px] min-h-0 lg:content-center"
                    style={{
                      width: '92%',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      gridTemplateRows: `${ANSWER_HEIGHT}px ${ANSWER_HEIGHT}px`,
                      gridAutoRows: `${ANSWER_HEIGHT}px`,
                      maxHeight: `${(ANSWER_HEIGHT * 2) + ANSWER_GAP_Y}px`
                    }}
                  >
                    {(['A', 'B', 'C', 'D']).map((opt) => (
                      <div key={opt} className="m-hex-wrap" style={{ ['--m-hex-span']: '100%' }}>
                        <div className="m-hex-extend" />
                        <MagneticMotionButton
                          onClick={() => handleSelect(opt)}
                          disabled={savingReward || gameOver || hiddenOptions.has(opt)}
                          className={`px-0 text-left shadow-xl ${getOptionClass(opt)} hover:scale-[1.02] w-full flex items-center transition-all duration-500`}
                          style={{
                            height: `${ANSWER_HEIGHT}px`,
                            minHeight: `${ANSWER_HEIGHT}px`,
                            maxHeight: `${ANSWER_HEIGHT}px`
                          }}
                        >
                          {shimmerOption === opt && <span className="m-shimmer" />}
                          <HexNeonOutline isTimedQuestion={isTimedQuestion} />
                          <span className="m-answer-connectors" />
                          {(() => {
                            const raw = optionText[opt] || '';
                            const rich = isRichHtml(raw);
                            const a = rich ? null : getFittedText(raw, false);
                            return (
                              <div className="m-hex-content flex items-center gap-3 w-full">
                                <div className="font-black text-base sm:text-lg">
                                  <span className="m-opt-label">{opt}:</span>
                                </div>
                                <div
                                  className="font-bold leading-relaxed text-white flex-1 min-w-0"
                                  style={rich ? undefined : { fontSize: a.fontSize, lineHeight: a.lineHeight, letterSpacing: a.letterSpacing }}
                                >
                                  {rich ? (
                                    <div
                                      ref={(node) => {
                                        if (node) answerTextRefs.current[opt] = node;
                                      }}
                                      className="block overflow-hidden text-left max-w-full min-w-0 break-words whitespace-normal [&_*]:max-w-full [&_img]:max-h-[120px] [&_img]:max-w-[calc(100%-3rem)] [&_img]:h-auto [&_img]:w-auto [&_img]:object-contain [&_img]:my-2"
                                      style={{ maxHeight: `${ANSWER_HEIGHT - 10}px` }}
                                      dangerouslySetInnerHTML={{ __html: String(raw) }}
                                    />
                                  ) : (
                                    <span
                                      ref={(node) => {
                                        if (node) answerTextRefs.current[opt] = node;
                                      }}
                                      className="block overflow-hidden whitespace-pre-wrap break-words"
                                      style={{ maxHeight: `${ANSWER_HEIGHT - 10}px` }}
                                    >
                                      {a.displayText}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </MagneticMotionButton>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0" />
              )}
            </div>

            {/* Bottom: Lock In + Bank (anchored above dock) */}
            <div className="flex-none">
              {!victoryOverlay && (
                <button
                  onClick={handleLockIn}
                  disabled={!selectedOption || !!lockedOption || savingReward || gameOver}
                  className={`w-full m-lockin-btn transition-all duration-500 ${
                    isTimedQuestion ? 'm-lockin-btn-timed' : ''
                  }`}
                >
                  {t('millionaire.lockIn')}
                </button>
              )}

              <div className="text-sm text-white/70 mt-3">
                {t('millionaire.currentBank')}: <span className="font-black text-amber-300">{currentBank}</span>{' '}
                {t('millionaire.tokensUnit')}
              </div>
            </div>
          </div>

          {/* Right: Ladder (desktop) */}
          <div className="hidden lg:block min-h-0 h-full">
            <MoneyLadder ladder={ladderData} currentLevel={level} />
          </div>
        </div>
      </div>

      {/* Floating Pill Dock */}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-30">
        <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-3 py-2 flex items-center gap-2 sm:hidden">
          <DockIconButton
            label={t('millionaire.quit')}
            onClick={() => setShowExitConfirm(true)}
            disabled={savingReward}
            used={false}
            variant="danger"
          >
            <X size={18} />
          </DockIconButton>
        </div>
      </div>

      {/* Exit Warning */}
      {showExitConfirm && (
        <div className="m-dec-overlay">
          <div className="m-dec-lines" aria-hidden="true">
            <span className="m-dec-line m-dec-line--left" />
            <span className="m-dec-line m-dec-line--right" />
          </div>
          <div className="m-dec-hex-frame">
            <div className="m-dec-inner m-dec-inner--normalcase">
              <div className="m-dec-kicker">{t('millionaire.overlays.finalDecision')}</div>
              <div className="m-dec-title">{t('millionaire.overlays.confirmQuit')}</div>
              <div className="m-dec-body">
                {t('millionaire.overlays.cashOutToSavePrefix')}
                <span className="m-dec-value"> {computeFailReward(level)} {t('millionaire.tokensUnit')}</span>
                {t('millionaire.overlays.cashOutToSaveSuffix')}
                {' '}
                {t('millionaire.overlays.orStayContinue')}
              </div>
              <div className="m-dec-actions">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="m-dec-hex-btn m-dec-hex-btn--stay"
                >
                  <ShieldCheck size={18} />
                  {t('millionaire.overlays.stay')}
                </button>
                <button
                  onClick={async () => {
                    setShowExitConfirm(false);
                    await handleCashOut();
                  }}
                  className="m-dec-hex-btn m-dec-hex-btn--cash"
                >
                  <HandCoins size={18} />
                  {t('millionaire.overlays.cashOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hoverPopover && (
        <div
          className="fixed z-[60] w-[320px] max-w-[85vw] m-glass border border-white/15 rounded-2xl shadow-2xl p-4"
          style={{
            left: Math.min(Math.max(12, hoverPopover.rect.left), window.innerWidth - 332),
            top: Math.min(hoverPopover.rect.bottom + 10, window.innerHeight - 220)
          }}
          onMouseEnter={() => {
            if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
          }}
          onMouseLeave={scheduleCloseHoverPopover}
        >
          <div className="text-[11px] uppercase tracking-widest text-white/60">{hoverPopover.title}</div>
          <div className="mt-2 text-sm font-semibold text-white leading-relaxed whitespace-pre-wrap">{hoverPopover.text}</div>
        </div>
      )}

      {/* Ladder Drawer (mobile/tablet) */}
      {ladderOpenMobile && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/70" onClick={() => setLadderOpenMobile(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm p-4">
            <div className="h-full">
              <MoneyLadder ladder={ladderData} currentLevel={level} />
            </div>
          </div>
        </div>
      )}

      {/* Milestone Overlay */}
      {milestoneOverlay && (
        <div className="m-dec-overlay">
          <div className="m-dec-lines" aria-hidden="true">
            <span className="m-dec-line m-dec-line--left" />
            <span className="m-dec-line m-dec-line--right" />
          </div>
          <div className="m-dec-hex-frame">
            <div className="m-dec-inner m-dec-inner--normalcase">
              <div className="m-dec-kicker">{t('millionaire.overlays.safeHaven')}</div>
              <div className="m-dec-title">{t('millionaire.overlays.safetyNetReached')}</div>
              <div className="m-dec-body">
                {t('millionaire.overlays.guaranteedPrefix')}
                <span className="m-dec-value"> {milestoneOverlay.tokens} {t('millionaire.tokensUnit')}</span>
                {' '}
                {t('millionaire.overlays.guaranteedSuffix')}
              </div>
              <div className="m-dec-body m-dec-body--muted">
                {tf('millionaire.overlays.safeHavenAt', { level: milestoneOverlay.level })}
              </div>
              {milestoneOverlay.level === 15 && (
                <div className="m-dec-body m-dec-body--fire">
                  🔥 {t('millionaire.overlays.fireRoundWarning')} 🔥
                </div>
              )}
              {milestoneOverlay.level === 17 && (
                <div className="m-dec-body m-dec-body--fire">
                  🛡️ {t('millionaire.overlays.finalSafetyNet')} 🛡️
                </div>
              )}
              <div className="m-dec-actions">
                <button
                  onClick={handleMilestoneContinue}
                  disabled={savingReward}
                  className="m-dec-hex-btn m-dec-hex-btn--next"
                >
                  {t('millionaire.overlays.continue')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Overlay (Correct) */}
      {victoryOverlay && (
        <div className="m-dec-overlay">
          <div className="m-dec-lines" aria-hidden="true">
            <span className="m-dec-line m-dec-line--left" />
            <span className="m-dec-line m-dec-line--right" />
          </div>
          <div className="m-dec-hex-frame">
            <div className="m-dec-inner">
              <div className="m-dec-kicker">{t('millionaire.overlays.decision')}</div>
              <div className="m-dec-title m-dec-title--correct">{t('millionaire.overlays.correct')}</div>
              <div className="m-dec-body">
                {tf('millionaire.overlays.clearedCurrentReward', { level })}
                <span className="m-dec-value"> {pendingBank} {t('millionaire.tokensUnit')}</span>
              </div>
              <div className="m-dec-actions">
                <button
                  onClick={handleCashOut}
                  disabled={savingReward}
                  className="m-dec-hex-btn m-dec-hex-btn--cash"
                >
                  <HandCoins size={18} />
                  {t('millionaire.overlays.cashOut')}
                </button>
                <button
                  onClick={handleContinue}
                  disabled={savingReward}
                  className="m-dec-hex-btn m-dec-hex-btn--next"
                >
                  {t('millionaire.overlays.nextQuestion')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifeline Modals */}
      {showChemModal && (
        <ChemLeungModal
          explanation={currentQuestion.Explanation}
          onClose={() => setShowChemModal(false)}
        />
      )}
      {showProbModal && (
        <ProbabilityModal
          correctOption={correctOption}
          options={['A', 'B', 'C', 'D']}
          onClose={() => setShowProbModal(false)}
        />
      )}

      {showPeriodicTable && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPeriodicTable(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{t('millionaire.periodicTableOfElements')}</h3>
              <button
                onClick={() => setShowPeriodicTable(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2e/Simple_Periodic_Table_Chart-en.svg"
                alt={t('millionaire.periodicTableAlt')}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <GameOverModal
          winAmount={String(finalReward)}
          questionsAnswered={level}
          fallbackReward={computeFailReward(level)}
          reason={finalReason}
          onPlayAgain={() => window.location.reload()}
          onExit={() => navigate('/practice')}
        />
      )}

      {expandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setExpandModal(null)} />
          <div className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-3xl m-glass sm:rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto">
            <div className="text-xs uppercase tracking-widest text-white/60">{t('millionaire.details')}</div>
            <div className="text-2xl font-black mt-2">{expandModal.title}</div>
            {expandModal.html ? (
              <div
                className="mt-4"
                dangerouslySetInnerHTML={{ __html: String(expandModal.html) }}
              />
            ) : (
              <div className="text-white/85 mt-4 leading-relaxed whitespace-pre-line">
                {expandModal.text}
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={() => setExpandModal(null)}
                className="px-6 py-4 rounded-2xl font-black bg-blue-600 hover:bg-blue-500 transition"
              >
                {t('millionaire.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function HexNeonOutline({ isTimedQuestion = false }) {
  const filterId = useId();
  return (
    <svg className="m-hex-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        className="m-hex-glow"
        points="16,0 84,0 100,50 84,100 16,100 0,50"
        fill="none"
        stroke={isTimedQuestion ? "#ef4444" : "#22d3ee"}
        strokeWidth="2.6"
        filter={`url(#${filterId})`}
        opacity="0.95"
      />
      <polygon
        className="m-hex-core"
        points="16,0 84,0 100,50 84,100 16,100 0,50"
        fill="none"
        stroke={isTimedQuestion ? "#f87171" : "#67e8f9"}
        strokeWidth="1.2"
        opacity="0.98"
      />
    </svg>
  );
}

function normalizeQuestionText(raw, preserveBreaks) {
  const s = String(raw || '');
  if (!s) return '';
  if (preserveBreaks) {
    return s.replace(/<br\s*\/?>/gi, '\n');
  }
  return s.replace(/<br\s*\/?>/gi, ' ');
}

function DockIconButton({ label, onClick, disabled, used, children, variant }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`relative w-11 h-11 rounded-full border flex items-center justify-center transition ${
        used
          ? 'bg-white/5 border-white/10 text-white/35'
          : variant === 'danger'
            ? 'bg-red-600/25 border-red-400/40 hover:bg-red-600/35 text-red-200'
            : 'bg-white/10 border-white/10 hover:bg-white/15 text-white'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {children}
      {used && (
        <span className="pointer-events-none absolute inset-0">
          <span className="absolute left-1/2 top-1/2 w-12 h-[2px] bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-[-35deg] rounded" />
        </span>
      )}
    </button>
  );
}

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return pos;
}

function MagneticMotionButton({ className, disabled, onClick, children, style }) {
  const ref = useRef(null);
  const mouse = useMousePosition();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 420, damping: 26, mass: 0.55 });
  const sy = useSpring(y, { stiffness: 420, damping: 26, mass: 0.55 });

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) {
      x.set(0);
      y.set(0);
      return;
    }

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = 40;
    const strength = 12;

    if (dist < radius) {
      const pull = (1 - dist / radius) * strength;
      x.set((dx / (dist || 1)) * pull);
      y.set((dy / (dist || 1)) * pull);
    } else {
      x.set(0);
      y.set(0);
    }
  }, [mouse.x, mouse.y, disabled, x, y]);

  return (
    <motion.button
      ref={ref}
      style={{ ...(style || {}), x: sx, y: sy }}
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {children}
    </motion.button>
  );
}

function MagneticIconButton({ label, onClick, disabled, used, children }) {
  return (
    <MagneticMotionButton
      onClick={onClick}
      disabled={disabled}
      className={`m-lifeline-btn relative flex items-center gap-2 px-4 py-3 rounded-2xl m-glass shadow-xl transition ${
        used ? 'm-lifeline-btn--used text-white/35' : 'text-white'
      }`}
    >
      <span className="m-lifeline-icon flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10">
        {children}
      </span>
      <span className="text-sm font-black">{label}</span>
      {used && (
        <span className="pointer-events-none absolute inset-0">
          <span className="absolute left-1/2 top-1/2 w-[110%] h-[2px] bg-red-500/80 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded" />
        </span>
      )}
    </MagneticMotionButton>
  );
}