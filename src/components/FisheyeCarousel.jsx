import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Infinity, Sparkles, Heart, Settings, ChevronLeft, ChevronRight, Play, BarChart3, Percent, PhoneCall, Layers, Shield, Gem } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const MODES = [
  {
    id: 'timed',
    titleKey: 'practiceModeCarousel.timedTitle',
    subtitleKey: 'practiceModeCarousel.timedSubtitle',
    descriptionKey: 'practiceModeCarousel.timedDesc',
    icon: Clock,
    gradient: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
  },
  {
    id: 'marathon',
    titleKey: 'practiceModeCarousel.marathonTitle',
    subtitleKey: 'practiceModeCarousel.marathonSubtitle',
    descriptionKey: 'practiceModeCarousel.marathonDesc',
    icon: Infinity,
    gradient: 'from-purple-600 to-indigo-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
  {
    id: 'custom',
    titleKey: 'practiceModeCarousel.customTitle',
    subtitleKey: 'practiceModeCarousel.customSubtitle',
    descriptionKey: 'practiceModeCarousel.customDesc',
    icon: Settings,
    gradient: 'from-amber-700 via-orange-500 to-amber-900',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    iconColor: 'text-amber-800',
  },
  {
    id: 'ai-daily',
    titleKey: 'practiceModeCarousel.aiDailyTitle',
    subtitleKey: 'practiceModeCarousel.aiDailySubtitle',
    descriptionKey: 'practiceModeCarousel.aiDailyDesc',
    icon: Sparkles,
    gradient: 'from-cyan-600 via-sky-600 to-indigo-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-800',
    iconColor: 'text-cyan-700',
  },
  {
    id: 'srs-review',
    titleKey: 'practiceModeCarousel.srsReviewTitle',
    subtitleKey: 'practiceModeCarousel.srsReviewSubtitle',
    descriptionKey: 'practiceModeCarousel.srsReviewDesc',
    icon: Layers,
    gradient: 'from-emerald-600 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    iconColor: 'text-emerald-700',
  },
  {
    id: 'mistake-review',
    titleKey: 'practiceModeCarousel.mistakeReviewTitle',
    subtitleKey: 'practiceModeCarousel.mistakeReviewSubtitle',
    descriptionKey: 'practiceModeCarousel.mistakeReviewDesc',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-500',
  },
  {
    id: 'millionaire',
    titleKey: 'practiceModeCarousel.millionaireTitle',
    subtitleKey: 'practiceModeCarousel.millionaireSubtitle',
    descriptionKey: 'practiceModeCarousel.millionaireDesc',
    icon: Sparkles,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
  },
];

const getItemStyle = (position) => {
  const styles = {
    0: { scale: 0.7, opacity: 0.6, zIndex: 1 },
    1: { scale: 0.9, opacity: 0.85, zIndex: 2 },
    2: { scale: 1.2, opacity: 1, zIndex: 10 },
    3: { scale: 0.9, opacity: 0.85, zIndex: 2 },
    4: { scale: 0.7, opacity: 0.6, zIndex: 1 },
    5: { scale: 0.5, opacity: 0.3, zIndex: 0 },
    6: { scale: 0.5, opacity: 0.3, zIndex: 0 },
  };
  return styles[position] || { scale: 0.5, opacity: 0.3, zIndex: 0 };
};

export default function FisheyeCarousel({
  onModeSelect,
  showHeader = true,
  compact = false,
  initialModeId,
  activeModeId,
  onActiveModeChange,
}) {
  const [activeIndex, setActiveIndex] = useState(() => {
    const seed = activeModeId || initialModeId;
    if (!seed) return 2;
    const idx = MODES.findIndex((m) => m.id === seed);
    return idx >= 0 ? idx : 2;
  });
  const [showAiDailyInfo, setShowAiDailyInfo] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { t, tf, isEnglish } = useLanguage();

  useEffect(() => {
    if (!activeModeId) return;
    const idx = MODES.findIndex((m) => m.id === activeModeId);
    if (idx >= 0 && idx !== activeIndex) setActiveIndex(idx);
  }, [activeModeId, activeIndex]);

  const setActiveIndexAndNotify = (nextIndex) => {
    const next = MODES[nextIndex];
    if (next?.id && onActiveModeChange && (!activeModeId || next.id !== activeModeId)) {
      onActiveModeChange(next.id);
    }
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handleChange = (e) => setIsSmallScreen(e.matches);
    setIsSmallScreen(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', handleChange);
    else mq.addListener(handleChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handleChange);
      else mq.removeListener(handleChange);
    };
  }, []);

  const stepPx = isSmallScreen ? 220 : 280;
  const cardWidth = isSmallScreen
    ? (compact ? 'min(300px, 78vw)' : 'min(320px, 78vw)')
    : (compact ? '300px' : '320px');

  const getCircularIndex = (index) => ((index % MODES.length) + MODES.length) % MODES.length;

  const getDisplayPosition = (modeIndex) => {
    const diff = modeIndex - activeIndex;
    return (diff + 2 + MODES.length) % MODES.length;
  };

  const navigateLeft = () => {
    setActiveIndex((prev) => {
      const next = getCircularIndex(prev - 1);
      const mode = MODES[next];
      if (mode?.id && onActiveModeChange && (!activeModeId || mode.id !== activeModeId)) {
        onActiveModeChange(mode.id);
      }
      return next;
    });
  };
  const navigateRight = () => {
    setActiveIndex((prev) => {
      const next = getCircularIndex(prev + 1);
      const mode = MODES[next];
      if (mode?.id && onActiveModeChange && (!activeModeId || mode.id !== activeModeId)) {
        onActiveModeChange(mode.id);
      }
      return next;
    });
  };

  const handleItemClick = (modeIndex) => {
    if (modeIndex !== activeIndex) {
      setActiveIndexAndNotify(modeIndex);
      return;
    }
    if (onModeSelect) onModeSelect(MODES[modeIndex]);
  };

  return (
    <div className={`w-full px-4 ${compact ? 'py-6' : 'py-16'}`}>
      <div className="max-w-7xl mx-auto">
        {showHeader && (
          <div className={`text-center ${compact ? 'mb-6' : 'mb-12'}`}>
            <div className="relative inline-block">
              <div className="absolute -inset-3 rounded-3xl blur-2xl opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.45),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.40),transparent_60%),radial-gradient(circle_at_50%_90%,rgba(34,211,238,0.35),transparent_55%)]" />
              <h1 className={`relative font-black text-slate-800 ${compact ? 'text-3xl' : 'text-5xl'} mb-2`}>
                {t('practiceModeCarousel.headerTitle')}
              </h1>
            </div>
            <p className={`text-slate-600 ${compact ? 'text-base' : 'text-xl'}`}>
              {t('practiceModeCarousel.headerSubtitle')}
            </p>
          </div>
        )}

        <div className="relative">
          <button
            onClick={navigateLeft}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-14 sm:h-14 bg-white shadow-xl rounded-full items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border-2 border-slate-200"
            aria-label={t('practiceModeCarousel.previousMode')}
          >
            <ChevronLeft size={24} className="text-slate-700" strokeWidth={3} />
          </button>

          <button
            onClick={navigateRight}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-14 sm:h-14 bg-white shadow-xl rounded-full items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border-2 border-slate-200"
            aria-label={t('practiceModeCarousel.nextMode')}
          >
            <ChevronRight size={24} className="text-slate-700" strokeWidth={3} />
          </button>

          <div className={`relative flex items-center justify-center overflow-visible ${compact ? 'h-[420px]' : 'h-[500px]'}`}>
            <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-20">
              <div className="flex items-center justify-center gap-4">
                {MODES.map((mode, modeIndex) => {
                  const displayPosition = getDisplayPosition(modeIndex);
                  const style = getItemStyle(displayPosition);
                  const isActive = modeIndex === activeIndex;
                  const Icon = mode.icon;
                  const isMillionaire = mode.id === 'millionaire';

                  return (
                    <motion.div
                      key={mode.id}
                      className="absolute"
                      initial={false}
                      animate={{
                        x: `${(displayPosition - 2) * stepPx}px`,
                        scale: style.scale,
                        opacity: style.opacity,
                        zIndex: style.zIndex,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8,
                      }}
                      style={{ width: cardWidth }}
                    >
                      <motion.button
                        onClick={() => handleItemClick(modeIndex)}
                        className={`w-full bg-white rounded-3xl shadow-2xl border-2 overflow-hidden transition-all ${
                          isMillionaire
                            ? `pm-mill-card ${isActive ? 'pm-mill-card--active' : ''}`
                            : (isActive ? 'border-slate-300 cursor-pointer' : 'border-slate-200 cursor-pointer hover:border-slate-300')
                        }`}
                        whileHover={!isActive ? { scale: 1.05 } : {}}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                      >
                        {isMillionaire ? (
                          <div className="pm-mill-shell">
                            <div className="pm-mill-lines pm-mill-lines--left" aria-hidden="true" />
                            <div className="pm-mill-lines pm-mill-lines--right" aria-hidden="true" />

                            <div className="pm-mill-top p-8 text-white relative overflow-hidden">
                              <span className="pm-mill-top-icon pm-mill-top-icon--abs" aria-hidden="true">
                                <Gem size={28} />
                              </span>
                              <div className="pm-mill-maxwin pm-mill-maxwin--top" aria-hidden="true">
                                {isEnglish
                                  ? `Max Winning: 100 ${t('millionaire.tokensUnit')}`
                                  : `最高獎勵：100 ${t('millionaire.tokensUnit')}`}
                              </div>
                              <div className="pm-mill-top-content">
                                <div className={`pm-mill-title ${isEnglish ? '' : 'pm-mill-title--zh'}`}>
                                  {isEnglish ? 'MILLIONAIRE' : '化學百萬富翁'}
                                </div>

                                <div className="pm-mill-icons" aria-hidden="true">
                                  <span className="pm-mill-icon">
                                    <BarChart3 size={18} />
                                  </span>
                                  <span className="pm-mill-icon">
                                    <Percent size={18} />
                                  </span>
                                  <span className="pm-mill-icon">
                                    <PhoneCall size={18} />
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-6 pm-mill-bottom">
                              <p className={`text-sm font-medium mb-4 ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                                {isEnglish
                                  ? 'One wrong answer ends the run. Reach higher stages to earn more.'
                                  : '答錯即止，闖關賺鑽石。'}
                              </p>

                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ delay: 0.2 }}
                                    className="pm-mill-start"
                                  >
                                    <div className="pm-mill-answer-btn" role="presentation">
                                      <Play size={18} fill="currentColor" />
                                      {t('practiceModeCarousel.startSession')}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {!isActive && (
                                <div className="text-xs text-slate-400 text-center font-medium pm-mill-hint">
                                  {t('practiceModeCarousel.clickToSelect')}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={`bg-gradient-to-r ${mode.gradient} p-8 text-white relative overflow-hidden`}>
                              <motion.div
                                className="absolute inset-0 bg-white"
                                initial={{ x: '-100%' }}
                                animate={{ x: isActive ? '100%' : '-100%' }}
                                transition={{ duration: 0.6, ease: 'easeInOut' }}
                                style={{ opacity: 0.2 }}
                              />

                              {mode.id === 'ai-daily' && (
                                <div
                                  className="absolute inset-0"
                                  aria-hidden="true"
                                  style={{
                                    opacity: 0.22,
                                    backgroundImage:
                                      'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px), radial-gradient(circle at 30% 25%, rgba(34,211,238,0.28), transparent 55%), radial-gradient(circle at 70% 70%, rgba(99,102,241,0.25), transparent 60%)',
                                    backgroundSize: '18px 18px, 18px 18px, auto, auto',
                                    backgroundPosition: '0 0, 0 0, 0 0, 0 0',
                                  }}
                                />
                              )}

                              <div className="relative z-10">
                                <Icon size={48} strokeWidth={2.5} className="mb-3" />
                                {mode.id === 'ai-daily' ? (
                                  <div className="relative mb-1">
                                    <h3 className="text-2xl font-black text-center whitespace-nowrap">{t(mode.titleKey)}</h3>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowAiDailyInfo(true);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key !== 'Enter' && e.key !== ' ') return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowAiDailyInfo(true);
                                      }}
                                      className="absolute left-0 top-1/2 -translate-y-[65%] w-5 h-5 rounded-full border border-white/35 bg-white/15 text-white font-black text-[11px] leading-none flex items-center justify-center hover:bg-white/25 transition-all"
                                      aria-label={t('practiceModeCarousel.aiDailyInfoTitle')}
                                      title={t('practiceModeCarousel.aiDailyInfoTitle')}
                                    >
                                      !
                                    </div>
                                    <span className="absolute right-0 top-1/2 -translate-y-[65%] pointer-events-none text-[11px] font-black tracking-widest uppercase text-white/95 bg-white/15 border border-white/30 px-2 py-1 rounded-full backdrop-blur-sm">
                                      AI
                                    </span>
                                  </div>
                                ) : (
                                  <h3 className="text-2xl font-black mb-1">{t(mode.titleKey)}</h3>
                                )}
                                <p className="text-sm opacity-90 font-medium">{t(mode.subtitleKey)}</p>
                              </div>
                            </div>

                            <div className="p-6">
                              <p className={`text-sm font-medium mb-4 ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                                {t(mode.descriptionKey)}
                              </p>

                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ delay: 0.2 }}
                                    className={`py-3 px-6 bg-gradient-to-r ${mode.gradient} text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg`}
                                  >
                                    <Play size={18} fill="currentColor" />
                                    {t('practiceModeCarousel.startSession')}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {!isActive && (
                                <div className="text-xs text-slate-400 text-center font-medium">
                                  {t('practiceModeCarousel.clickToSelect')}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {showAiDailyInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAiDailyInfo(false)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-cyan-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b-2 border-cyan-200 flex items-center justify-between bg-cyan-50">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-cyan-700" />
                  <h3 className="text-lg font-black text-slate-800">{t('practiceModeCarousel.aiDailyInfoTitle')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiDailyInfo(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all"
                  aria-label={t('common.close')}
                >
                  ×
                </button>
              </div>
              <div className="p-5">
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {t('practiceModeCarousel.aiDailyInfoBody')}
                </div>
              </div>
            </div>
          </div>
        )}

        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-slate-700">
              {tf('practiceModeCarousel.selectedLabel', { mode: t(MODES[activeIndex].titleKey) })}
            </span>
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-2 mt-8">
          {MODES.map((mode, index) => (
            <button
              key={mode.id}
              onClick={() => setActiveIndex(index)}
              className={`transition-all ${
                index === activeIndex ? 'w-8 h-3 bg-slate-700' : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'
              } rounded-full`}
              aria-label={tf('practiceModeCarousel.selectModeAria', { mode: t(mode.titleKey) })}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
