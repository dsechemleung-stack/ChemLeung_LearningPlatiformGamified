import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Infinity, Sparkles, Heart, Settings, ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
    id: 'ai-daily',
    titleKey: 'practiceModeCarousel.aiDailyTitle',
    subtitleKey: 'practiceModeCarousel.aiDailySubtitle',
    descriptionKey: 'practiceModeCarousel.aiDailyDesc',
    icon: Sparkles,
    gradient: 'from-purple-600 via-indigo-600 to-blue-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    iconColor: 'text-indigo-600',
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
    id: 'custom',
    titleKey: 'practiceModeCarousel.customTitle',
    subtitleKey: 'practiceModeCarousel.customSubtitle',
    descriptionKey: 'practiceModeCarousel.customDesc',
    icon: Settings,
    gradient: 'from-blue-600 to-cyan-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
];

const getItemStyle = (position) => {
  const styles = {
    0: { scale: 0.7, opacity: 0.6, zIndex: 1 },
    1: { scale: 0.9, opacity: 0.85, zIndex: 2 },
    2: { scale: 1.2, opacity: 1, zIndex: 10 },
    3: { scale: 0.9, opacity: 0.85, zIndex: 2 },
    4: { scale: 0.7, opacity: 0.6, zIndex: 1 },
  };
  return styles[position] || { scale: 0.7, opacity: 0.6, zIndex: 0 };
};

export default function FisheyeCarousel({ onModeSelect, showHeader = true, compact = false }) {
  const [activeIndex, setActiveIndex] = useState(2);
  const { t, tf } = useLanguage();

  const getCircularIndex = (index) => ((index % MODES.length) + MODES.length) % MODES.length;

  const getDisplayPosition = (modeIndex) => {
    const diff = modeIndex - activeIndex;
    return (diff + 2 + MODES.length) % MODES.length;
  };

  const navigateLeft = () => setActiveIndex((prev) => getCircularIndex(prev - 1));
  const navigateRight = () => setActiveIndex((prev) => getCircularIndex(prev + 1));

  const handleItemClick = (modeIndex) => {
    if (modeIndex !== activeIndex) {
      setActiveIndex(modeIndex);
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border-2 border-slate-200"
            aria-label={t('practiceModeCarousel.previousMode')}
          >
            <ChevronLeft size={28} className="text-slate-700" strokeWidth={3} />
          </button>

          <button
            onClick={navigateRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border-2 border-slate-200"
            aria-label={t('practiceModeCarousel.nextMode')}
          >
            <ChevronRight size={28} className="text-slate-700" strokeWidth={3} />
          </button>

          <div className={`relative flex items-center justify-center overflow-visible ${compact ? 'h-[420px]' : 'h-[500px]'}`}>
            <div className="relative w-full max-w-6xl mx-auto px-20">
              <div className="flex items-center justify-center gap-4">
                {MODES.map((mode, modeIndex) => {
                  const displayPosition = getDisplayPosition(modeIndex);
                  const style = getItemStyle(displayPosition);
                  const isActive = modeIndex === activeIndex;
                  const Icon = mode.icon;

                  return (
                    <motion.div
                      key={mode.id}
                      className="absolute"
                      initial={false}
                      animate={{
                        x: `${(displayPosition - 2) * 280}px`,
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
                      style={{ width: compact ? '300px' : '320px' }}
                    >
                      <motion.button
                        onClick={() => handleItemClick(modeIndex)}
                        className={`w-full bg-white rounded-3xl shadow-2xl border-2 overflow-hidden transition-all ${
                          isActive ? 'border-slate-300 cursor-pointer' : 'border-slate-200 cursor-pointer hover:border-slate-300'
                        }`}
                        whileHover={!isActive ? { scale: 1.05 } : {}}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                      >
                        <div className={`bg-gradient-to-r ${mode.gradient} p-8 text-white relative overflow-hidden`}>
                          <motion.div
                            className="absolute inset-0 bg-white"
                            initial={{ x: '-100%' }}
                            animate={{ x: isActive ? '100%' : '-100%' }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                            style={{ opacity: 0.2 }}
                          />

                          <div className="relative z-10">
                            <Icon size={48} strokeWidth={2.5} className="mb-3" />
                            <h3 className="text-2xl font-black mb-1">{t(mode.titleKey)}</h3>
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
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

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
