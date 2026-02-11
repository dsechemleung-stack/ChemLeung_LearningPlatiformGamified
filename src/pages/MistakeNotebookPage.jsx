import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { quizService } from '../services/quizService';
import { quizStorage } from '../utils/quizStorage';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  BookOpen, ArrowLeft, Play, AlertCircle, Target,
  CheckCircle, Filter, ChevronDown, Calendar, Hash, Tag,
  Clock, Zap, TrendingUp, Brain, BarChart2, Layers, X,
  AlertTriangle, Flame, Star, PlusCircle, Wand2, Eye, EyeOff, 
  Grid3x3, List as ListIcon, Command, Archive, Sparkles,
  ChevronRight, Maximize2, Check, Activity, LineChart,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const MASTERY_THRESHOLD = 3;
const ERROR_TYPES = [
  { value: 'misread', label: 'Misread Question', color: 'blue' },
  { value: 'calculation', label: 'Calculation Error', color: 'red' },
  { value: 'conceptual', label: 'Conceptual Gap', color: 'orange' },
  { value: 'careless', label: 'Careless Mistake', color: 'yellow' },
  { value: 'vocab', label: 'Vocabulary Gap', color: 'purple' },
  { value: 'diagram', label: 'Diagram Misread', color: 'pink' },
];
const MASTERY_LEVELS = {
  new:        { label: 'New',         min: 0, max: 0, color: 'red' },
  progressing:{ label: 'Developing', min: 1, max: 1, color: 'amber' },
  near:       { label: 'Near-Mastery', min: 2, max: 2, color: 'green' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function calculateMasteryPriority(mistake, recentTopics = []) {
  const now = Date.now();
  const lastAttemptTime = new Date(mistake.lastAttempted).getTime();
  const daysSinceLastAttempt = Math.max(0, (now - lastAttemptTime) / (1000 * 60 * 60 * 24));
  const U = Math.pow(2, daysSinceLastAttempt / 7);
  const D = Math.min(1.0, (mistake.attemptCount || 1) / 3);
  let R = 0.5;
  if (recentTopics.length > 0 && recentTopics.includes(mistake.Topic)) {
    R = 1.5;
  }
  return (U * 0.4) + (D * 0.4) + (R * 0.2);
}

function getMasteryState(improvementCount = 0) {
  if (improvementCount === 0) return { state: 0, label: 'Unprocessed', color: 'red' };
  if (improvementCount === 1) return { state: 1, label: 'Acquiring', color: 'amber' };
  if (improvementCount === 2) return { state: 2, label: 'Consolidating', color: 'yellow' };
  return { state: 3, label: 'Mastered', color: 'green' };
}

function calcPriority(mistake) {
  const days = (Date.now() - new Date(mistake.lastAttempted).getTime()) / (1000 * 60 * 60 * 24);
  return days * 1.2 - (mistake.improvementCount ?? 0) * 2;
}

function masteryStyle(improvementCount) {
  if (improvementCount >= 2)
    return {
      border: 'border-green-300',
      bg: 'bg-green-50/60',
      badge: 'bg-green-100 text-green-700',
      dot: 'bg-green-500',
    };
  if (improvementCount === 1)
    return {
      border: 'border-amber-300',
      bg: 'bg-amber-50/60',
      badge: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-400',
    };
  return {
    border: 'border-red-200',
    bg: 'bg-white',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  };
}

function applyRuleOfThree(improvements) {
  const archived = JSON.parse(localStorage.getItem('mistake_archive') || '{}');
  const activeImprovements = { ...improvements };
  
  Object.entries(improvements).forEach(([questionId, data]) => {
    if ((data.correctCount || 0) >= 3) {
      archived[questionId] = { ...data, archivedAt: new Date().toISOString() };
      delete activeImprovements[questionId];
    }
  });
  
  if (Object.keys(archived).length > Object.keys(JSON.parse(localStorage.getItem('mistake_archive') || '{}')).length) {
    localStorage.setItem('mistake_archive', JSON.stringify(archived));
  }
  
  return activeImprovements;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FullQuestionModal: Pop-up to show complete question details
 */
function FullQuestionModal({ mistake, errorTag, onTag, onClose }) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState(errorTag || '');

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    onTag(mistake.ID, tag);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">{t('notebook.questionDetail')}</h2>
            <p className="text-slate-300 text-sm">{mistake.Topic} → {mistake.Subtopic}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Question */}
          <div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
              {t('notebook.question')}
            </h3>
            <div
              className="prose prose-slate max-w-none text-base bg-slate-50 p-4 rounded-xl border-2 border-slate-200"
              dangerouslySetInnerHTML={{ __html: mistake.Question }}
            />
          </div>

          {/* Image if exists */}
          {mistake.Pictureurl && (
            <div className="flex justify-center">
              <img 
                src={mistake.Pictureurl} 
                alt="Question diagram" 
                className="max-h-96 object-contain rounded-lg border-2 border-slate-200 shadow-md" 
              />
            </div>
          )}

          {/* Options Grid */}
          <div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
              {t('notebook.options')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const isUserAnswer = mistake.userAnswer === opt;
                const isCorrect = mistake.CorrectOption === opt;
                
                return (
                  <div
                    key={opt}
                    className={`p-4 rounded-xl border-2 ${
                      isCorrect
                        ? 'border-green-500 bg-green-50'
                        : isUserAnswer
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        isCorrect
                          ? 'bg-green-500 text-white'
                          : isUserAnswer
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {opt}
                      </div>
                      <div className="flex-1">
                        {isCorrect && (
                          <div className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                            <CheckCircle size={12} /> {t('notebook.correctAnswer')}
                          </div>
                        )}
                        {isUserAnswer && !isCorrect && (
                          <div className="text-xs font-bold text-red-700 mb-1">
                            {t('notebook.yourAnswer')}
                          </div>
                        )}
                        <div className={`text-sm ${
                          isCorrect ? 'text-green-900 font-semibold' : isUserAnswer ? 'text-red-900' : 'text-slate-700'
                        }`}>
                          {mistake[`Option${opt}`] || opt}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          {mistake.Explanation && (
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                {t('notebook.explanation')}
              </h3>
              <div
                className="prose prose-slate max-w-none text-sm bg-blue-50 p-4 rounded-xl border-2 border-blue-200"
                dangerouslySetInnerHTML={{ __html: mistake.Explanation }}
              />
            </div>
          )}

          {/* Error Type Tagging */}
          <div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
              {t('notebook.tagErrorType')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ERROR_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTagSelect(type.value)}
                  className={`p-3 rounded-lg text-sm font-bold border-2 transition-all ${
                    selectedTag === type.value
                      ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${type.color}-500`} />
                    <span>{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div className="text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.attempts')}
              </div>
              <div className="text-2xl font-black text-slate-700">{mistake.attemptCount || 1}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.masteryLevel')}
              </div>
              <div className="text-2xl font-black text-amber-600">{mistake.improvementCount || 0}/3</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                {t('notebook.lastAttempted')}
              </div>
              <div className="text-sm font-bold text-slate-700">
                {new Date(mistake.lastAttempted).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short'
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ProgressSegments: 3-segment progress bar
 */
function ProgressSegments({ current, target = 3, size = 'sm' }) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  return (
    <div className={`flex gap-1 ${sizeClasses[size]}`}>
      {Array.from({ length: target }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-all duration-300 ${
            i < current
              ? 'bg-green-500 shadow-lg'
              : i === current
              ? 'bg-amber-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * TooltipWithPortal: Floating tooltip
 */
function TooltipWithPortal({ trigger, content, placement = 'top' }) {
  const [open, setOpen] = useState(false);
  
  const { refs, floatingStyles } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  });
  
  return (
    <>
      <div
        ref={refs.setReference}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="cursor-help"
      >
        {trigger}
      </div>
      
      {open && createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[9999] bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl ring-1 ring-white/10 max-w-xs pointer-events-none"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * InteractiveTopicHeatmap: Clickable topic density chart with multi-select
 */
function InteractiveTopicHeatmap({ mistakes, selectedTopics, onTopicToggle }) {
  const { t } = useLanguage();
  
  const errorDensity = useMemo(() => {
    const topicMap = {};
    mistakes.forEach(m => {
      if (!topicMap[m.Topic]) {
        topicMap[m.Topic] = { attempted: 0, wrong: 0 };
      }
      topicMap[m.Topic].wrong++;
      topicMap[m.Topic].attempted += Math.max(m.attemptCount, 1);
    });
    
    return Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      errorDensity: Math.min(1.0, data.wrong / Math.max(data.attempted, 1)),
      wrongCount: data.wrong,
      attemptedCount: data.attempted
    })).sort((a, b) => b.errorDensity - a.errorDensity);
  }, [mistakes]);
  
  const getColor = (density, isSelected) => {
    const base = density < 0.2 ? 'yellow' 
      : density < 0.4 ? 'orange' 
      : density < 0.6 ? 'orange' 
      : density < 0.8 ? 'red'
      : 'red';
    
    if (isSelected) {
      return `from-${base}-600 to-${base}-700 text-white ring-2 ring-${base}-400 ring-offset-2`;
    }
    
    if (density < 0.2) return 'from-yellow-100 to-yellow-200 text-yellow-900 hover:from-yellow-200 hover:to-yellow-300';
    if (density < 0.4) return 'from-orange-200 to-orange-300 text-orange-900 hover:from-orange-300 hover:to-orange-400';
    if (density < 0.6) return 'from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600';
    if (density < 0.8) return 'from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700';
    return 'from-red-700 to-red-800 text-white hover:from-red-800 hover:to-red-900';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
        <BarChart2 size={20} className="text-orange-600" />
        {t('notebook.errorDensityByTopic')}
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        {t('notebook.clickTopicsToFilter')} • {selectedTopics.length > 0 && `${selectedTopics.length} selected`}
      </p>
      
      <div className="space-y-3">
        {errorDensity.map(({ topic, errorDensity: density, wrongCount, attemptedCount }) => {
          const isSelected = selectedTopics.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => onTopicToggle(topic)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${getColor(density, isSelected)}`}
            >
              <div className="w-32 font-semibold text-sm text-left truncate flex items-center gap-2">
                {isSelected && <Check size={14} />}
                {topic}
              </div>
              <div className="flex-1 text-right font-bold text-sm">
                {(density * 100).toFixed(0)}% ({wrongCount}/{attemptedCount})
              </div>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
      
      {selectedTopics.length > 0 && (
        <button
          onClick={() => selectedTopics.forEach(onTopicToggle)}
          className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all"
        >
          {t('notebook.clearSelection')}
        </button>
      )}
    </div>
  );
}

/**
 * CalendarHeatmap: 30-day activity visualization
 */
function CalendarHeatmap({ improvements }) {
  const { t } = useLanguage();
  
  const activityMap = useMemo(() => {
    const map = {};
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map[dateStr] = 0;
    }
    
    Object.values(improvements).forEach(data => {
      if (data.lastCorrect) {
        const dateStr = new Date(data.lastCorrect).toISOString().split('T')[0];
        if (map[dateStr] !== undefined) map[dateStr]++;
      }
    });
    
    return map;
  }, [improvements]);
  
  const days = Object.entries(activityMap).reverse();
  const maxActivity = Math.max(...Object.values(activityMap), 1);
  
  const getColor = (count) => {
    const intensity = count / maxActivity;
    if (intensity === 0) return 'bg-slate-100';
    if (intensity < 0.33) return 'bg-blue-200';
    if (intensity < 0.67) return 'bg-blue-400';
    return 'bg-blue-600';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        {t('notebook.mistakeClearingActivity')}
      </h3>
      
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={`header-${idx}`} className="text-center text-xs font-bold text-slate-400 h-6">
            {day}
          </div>
        ))}
        
        {days.map(([dateStr, count]) => (
          <TooltipWithPortal
            key={dateStr}
            trigger={
              <div
                className={`w-8 h-8 rounded ${getColor(count)} flex items-center justify-center text-xs font-bold text-slate-700 hover:ring-2 ring-blue-400 transition-all cursor-pointer`}
              >
                {count > 0 && count}
              </div>
            }
            content={`${dateStr}: ${count} cleared`}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
        <span>{t('notebook.less')}</span>
        <div className="flex gap-1">
          {[0, 0.33, 0.67, 1.0].map((i, idx) => (
            <div key={idx} className={`w-3 h-3 rounded ${getColor(i * maxActivity)}`} />
          ))}
        </div>
        <span>{t('notebook.more')}</span>
      </div>
    </div>
  );
}

/**
 * ImprovementTrendChart: 14-day mastery progression
 */
function ImprovementTrendChart({ improvements }) {
  const { t } = useLanguage();
  
  const trendData = useMemo(() => {
    const stateHistory = {};
    
    Object.values(improvements).forEach(data => {
      const state = getMasteryState(data.correctCount || 0);
      const dateStr = data.lastCorrect
        ? new Date(data.lastCorrect).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      if (!stateHistory[dateStr]) {
        stateHistory[dateStr] = { Unprocessed: 0, Acquiring: 0, Consolidating: 0, Mastered: 0 };
      }
      stateHistory[dateStr][state.label]++;
    });
    
    return Object.entries(stateHistory)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, states]) => ({ date, ...states }))
      .slice(-14);
  }, [improvements]);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-purple-600" />
        {t('notebook.improvementTrend')}
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="Unprocessed" stackId="1" stroke="#ef4444" fill="#fecaca" />
          <Area type="monotone" dataKey="Acquiring" stackId="1" stroke="#f59e0b" fill="#fed7aa" />
          <Area type="monotone" dataKey="Consolidating" stackId="1" stroke="#eab308" fill="#fef08a" />
          <Area type="monotone" dataKey="Mastered" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * RetentionDashboard: Learning metrics overview
 */
function RetentionDashboard({ mistakes, improvements }) {
  const { t, tf } = useLanguage();
  const [open, setOpen] = useState(true);
  
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const addedThisWeek = mistakes.filter(
      (m) => new Date(m.lastAttempted).getTime() >= weekAgo
    ).length;
    const masteredThisWeek = Object.values(improvements).filter(
      (d) => (d.correctCount || 0) >= MASTERY_THRESHOLD &&
             d.lastCorrect &&
             new Date(d.lastCorrect).getTime() >= weekAgo
    ).length;
    
    const subtopicMap = {};
    mistakes.forEach((m) => {
      const key = m.Subtopic || 'Unknown';
      if (!subtopicMap[key]) subtopicMap[key] = { count: 0, repeats: 0 };
      subtopicMap[key].count++;
      if (m.attemptCount > 1) subtopicMap[key].repeats++;
    });
    
    const weakest = Object.entries(subtopicMap)
      .sort((a, b) => b[1].count + b[1].repeats * 2 - (a[1].count + a[1].repeats * 2))
      .slice(0, 6);
    
    return { addedThisWeek, masteredThisWeek, weakest };
  }, [mistakes, improvements]);
  
  const decayLabel =
    stats.addedThisWeek === 0 && stats.masteredThisWeek === 0
      ? '—'
      : stats.masteredThisWeek > stats.addedThisWeek
      ? t('notebook.decayImproving')
      : stats.masteredThisWeek === stats.addedThisWeek
      ? t('notebook.decayStable')
      : t('notebook.decayGrowing');
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-2">
          <Activity className="text-purple-600" size={20} />
          <span className="font-bold text-slate-800 text-lg">{t('notebook.retentionDashboard')}</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-200 overflow-hidden"
          >
            <div className="p-6 space-y-6 bg-slate-50">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border-2 border-slate-200 text-center">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    {t('notebook.addedThisWeek')}
                  </div>
                  <div className="text-3xl font-black text-red-500">{stats.addedThisWeek}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-slate-200 text-center">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    {t('notebook.masteredThisWeek')}
                  </div>
                  <div className="text-3xl font-black text-green-600">{stats.masteredThisWeek}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-purple-200 text-center">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                    {t('notebook.decayRate')}
                  </div>
                  <div className="text-lg font-black text-purple-700 mt-1">{decayLabel}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Flame size={14} className="text-red-500" />
                  {t('notebook.weakestSubtopics')}
                </h3>
                <div className="space-y-2">
                  {stats.weakest.map(([subtopic, data]) => {
                    const max = stats.weakest[0][1].count + stats.weakest[0][1].repeats * 2;
                    const score = data.count + data.repeats * 2;
                    const pct = max > 0 ? (score / max) * 100 : 0;
                    return (
                      <div key={subtopic} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-slate-600 font-semibold truncate shrink-0">
                          {subtopic}
                        </div>
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-400 to-orange-400 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 shrink-0 w-8 text-right">
                          {data.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * LIST VIEW: Compact expandable rows
 */
function ListViewDeck({ mistakes, errorTags, onTag, selectedIds, onToggleSelect, onToggleSelectAll, allSelected, onViewFull }) {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);
  
  return (
    <div className="space-y-2">
      {/* Select All */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="w-4 h-4 rounded cursor-pointer"
        />
        <span className="text-sm font-bold text-slate-700">
          {t('notebook.selectAll')} ({selectedIds.size}/{mistakes.length})
        </span>
      </div>
      
      {/* Mistake Rows */}
      <AnimatePresence>
        {mistakes.map((mistake) => {
          const style = masteryStyle(mistake.improvementCount ?? 0);
          const priority = calcPriority(mistake);
          const isExpanded = expandedId === mistake.ID;
          const isSelected = selectedIds.has(mistake.ID);
          const isUrgent = priority > 15;
          
          return (
            <motion.div
              key={mistake.ID}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`rounded-lg border-2 transition-all ${style.border} ${style.bg} ${
                isUrgent ? 'ring-2 ring-red-400' : ''
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center gap-3 p-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(mistake.ID)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <button
                  onClick={() => setExpandedId(isExpanded ? null : mistake.ID)}
                  className="flex-1 flex items-center justify-between hover:bg-white/50 p-2 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {mistake.Topic.slice(0, 2)}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-600">
                        {mistake.Topic} → {mistake.Subtopic}
                      </div>
                      <div className="text-sm text-slate-800 font-semibold truncate">
                        {mistake.Question?.replace(/<[^>]*>/g, '').substring(0, 60)}...
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24">
                      <ProgressSegments current={mistake.improvementCount ?? 0} target={3} size="sm" />
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${
                      isUrgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {priority.toFixed(1)}
                    </span>
                    <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                <button
                  onClick={() => onViewFull(mistake)}
                  className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all"
                  title={t('notebook.viewFullQuestion')}
                >
                  <Maximize2 size={18} />
                </button>
              </div>
              
              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-slate-300 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="text-xs font-bold text-red-700 mb-1">{t('notebook.yourAnswer')}</div>
                          <div className="text-sm font-semibold text-red-900">{mistake.userAnswer}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="text-xs font-bold text-green-700 mb-1">{t('notebook.correctAnswer')}</div>
                          <div className="text-sm font-semibold text-green-900">{mistake.CorrectOption}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * KANBAN VIEW: 3-column layout (New, Developing, Near-Mastery)
 */
function KanbanViewDeck({ columns, errorTags, onTag, onViewFull }) {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);
  
  const columnConfig = {
    new: { label: t('notebook.masteryNew'), color: 'red', icon: AlertTriangle, gradient: 'from-red-50 to-red-100', border: 'border-red-300' },
    progressing: { label: t('notebook.masteryDeveloping'), color: 'amber', icon: Flame, gradient: 'from-amber-50 to-amber-100', border: 'border-amber-300' },
    near: { label: t('notebook.masteryNear'), color: 'green', icon: Star, gradient: 'from-green-50 to-green-100', border: 'border-green-300' },
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {Object.entries(columns).map(([key, mistakes]) => {
        const config = columnConfig[key];
        
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl border-2 ${config.border} bg-gradient-to-b ${config.gradient} p-4 flex flex-col`}
          >
            {/* Column Header */}
            <div className="mb-4 pb-3 border-b-2 border-slate-300">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <config.icon size={20} className={`text-${config.color}-600`} />
                {config.label} ({mistakes.length})
              </h3>
            </div>
            
            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {mistakes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={32} className={`text-${config.color}-300 mx-auto mb-2`} />
                  <p className={`text-xs font-bold text-${config.color}-700`}>
                    {t('notebook.allCaughtUp')}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {mistakes.map((mistake) => {
                    const priority = calcPriority(mistake);
                    const isUrgent = priority > 15;
                    
                    return (
                      <motion.div
                        key={mistake.ID}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`bg-white rounded-xl p-4 shadow-md border-2 border-slate-200 hover:shadow-lg transition-all ${
                          isUrgent ? 'ring-2 ring-red-400' : ''
                        }`}
                      >
                        {/* Card Header */}
                        <div className="mb-3">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {mistake.Topic}
                          </div>
                          <div className="text-sm font-bold text-slate-800 line-clamp-2">
                            {mistake.Question?.replace(/<[^>]*>/g, '').substring(0, 80)}...
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <ProgressSegments current={mistake.improvementCount ?? 0} target={3} size="md" />
                        </div>
                        
                        {/* Priority Badge */}
                        <div className={`inline-block text-xs font-black px-2 py-1 rounded-full mb-3 ${
                          isUrgent
                            ? 'bg-red-100 text-red-700'
                            : priority > 7
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t('notebook.priority')}: {priority.toFixed(1)}
                        </div>
                        
                        {/* View Full Button */}
                        <button
                          onClick={() => onViewFull(mistake)}
                          className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Maximize2 size={14} />
                          {t('notebook.viewFull')}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MistakeNotebookPage() {
  const { currentUser } = useAuth();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();
  
  // Core state
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [improvements, setImprovements] = useState({});
  const [errorTags, setErrorTags] = useState(() =>
    JSON.parse(localStorage.getItem('mistake_error_tags') || '{}')
  );
  const [recentQuizTopics, setRecentQuizTopics] = useState(() =>
    JSON.parse(localStorage.getItem('recent_quiz_topics') || '[]')
  );
  const [archivedMistakes, setArchivedMistakes] = useState(() =>
    JSON.parse(localStorage.getItem('mistake_archive') || '{}')
  );
  
  // Filter state
  const [questionCount, setQuestionCount] = useState('10');
  const [datePeriod, setDatePeriod] = useState('all');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [selectedMasteryLevels, setSelectedMasteryLevels] = useState([]);
  
  // Timer settings
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isTimedMode, setIsTimedMode] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('deck');
  const [viewMode, setViewMode] = useState('list');
  const [selectedMistakeIds, setSelectedMistakeIds] = useState(new Set());
  const [fullViewMistake, setFullViewMistake] = useState(null);
  
  // Load data
  useEffect(() => { loadMistakes(); }, [currentUser]);
  
  async function loadMistakes() {
    if (!currentUser) { setLoading(false); return; }
    try {
      setLoading(true);
      const attempts = await quizService.getUserAttempts(currentUser.uid, 100);
      const incorrectMap = new Map();
      const improvementData = JSON.parse(
        localStorage.getItem('mistake_improvements') || '{}'
      );
      
      attempts.forEach((attempt) => {
        if (!attempt.answers || !attempt.questions) return;
        attempt.questions.forEach((question) => {
          const userAnswer = attempt.answers[question.ID];
          const isCorrect = userAnswer && userAnswer === question.CorrectOption;
          
          if (isCorrect && improvementData[question.ID]) {
            improvementData[question.ID].correctCount =
              (improvementData[question.ID].correctCount || 0) + 1;
            improvementData[question.ID].lastCorrect = attempt.timestamp;
          }
          
          if (userAnswer && userAnswer !== question.CorrectOption) {
            const improveCount = improvementData[question.ID]?.correctCount || 0;
            if (improveCount >= MASTERY_THRESHOLD) return;
            
            if (!incorrectMap.has(question.ID)) {
              incorrectMap.set(question.ID, {
                ...question,
                attemptCount: 1,
                lastAttempted: attempt.timestamp,
                userAnswer,
                improvementCount: improveCount,
              });
            } else {
              const existing = incorrectMap.get(question.ID);
              existing.attemptCount += 1;
              existing.improvementCount = improveCount;
              if (new Date(attempt.timestamp) > new Date(existing.lastAttempted)) {
                existing.lastAttempted = attempt.timestamp;
                existing.userAnswer = userAnswer;
              }
            }
          }
        });
      });
      
      localStorage.setItem('mistake_improvements', JSON.stringify(improvementData));
      setImprovements(improvementData);
      
      const arr = Array.from(incorrectMap.values()).sort(
        (a, b) => calcPriority(b) - calcPriority(a)
      );
      setMistakes(arr);
    } catch (err) {
      console.error('Error loading mistakes:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Persistence effects
  useEffect(() => {
    localStorage.setItem('mistake_error_tags', JSON.stringify(errorTags));
  }, [errorTags]);
  
  useEffect(() => {
    const updated = applyRuleOfThree(improvements);
    setArchivedMistakes(JSON.parse(localStorage.getItem('mistake_archive') || '{}'));
  }, [improvements]);
  
  // Computed values
  const allTopics = useMemo(
    () => [...new Set(mistakes.map((m) => m.Topic).filter(Boolean))].sort(),
    [mistakes]
  );
  
  const availableSubtopics = useMemo(() => {
    const base = selectedTopics.length > 0
      ? mistakes.filter((m) => selectedTopics.includes(m.Topic))
      : mistakes;
    return [...new Set(base.map((m) => m.Subtopic).filter(Boolean))].sort();
  }, [mistakes, selectedTopics]);
  
  useEffect(() => {
    setSelectedSubtopics((prev) =>
      prev.filter((s) => availableSubtopics.includes(s))
    );
  }, [availableSubtopics]);
  
  const filteredMistakes = useMemo(() => {
    let result = [...mistakes];
    
    if (datePeriod === 'week') {
      const weekAgo = new Date(); 
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((m) => new Date(m.lastAttempted) >= weekAgo);
    } else if (datePeriod === 'month') {
      const monthAgo = new Date(); 
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((m) => new Date(m.lastAttempted) >= monthAgo);
    }
    
    if (selectedTopics.length > 0)
      result = result.filter((m) => selectedTopics.includes(m.Topic));
    
    if (selectedSubtopics.length > 0)
      result = result.filter((m) => selectedSubtopics.includes(m.Subtopic));
    
    if (selectedMasteryLevels.length > 0) {
      result = result.filter((m) => {
        const ic = m.improvementCount ?? 0;
        return selectedMasteryLevels.some((lvl) => {
          const { min, max } = MASTERY_LEVELS[lvl];
          return ic >= min && ic <= max;
        });
      });
    }
    
    return result;
  }, [mistakes, datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels]);
  
  const practiceCount =
    questionCount === 'All'
      ? filteredMistakes.length
      : Math.min(parseInt(questionCount), filteredMistakes.length);
  
  // Kanban columns
  const kanbanColumns = useMemo(() => ({
    new: filteredMistakes.filter(m => (m.improvementCount ?? 0) === 0),
    progressing: filteredMistakes.filter(m => (m.improvementCount ?? 0) === 1),
    near: filteredMistakes.filter(m => (m.improvementCount ?? 0) === 2),
  }), [filteredMistakes]);
  
  // Handlers
  const handleTag = useCallback((questionId, tag) => {
    setErrorTags((prev) => {
      const next = { ...prev };
      if (tag === null) delete next[questionId];
      else next[questionId] = tag;
      return next;
    });
  }, []);
  
  const toggleTopic = useCallback((topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }, []);
  
  const toggleSubtopic = useCallback((sub) => {
    setSelectedSubtopics((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  }, []);
  
  const toggleMasteryLevel = useCallback((lvl) => {
    setSelectedMasteryLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    );
  }, []);
  
  const handlePracticeMistakes = () => {
    if (filteredMistakes.length === 0) return;
    
    const selected = selectedMistakeIds.size > 0
      ? filteredMistakes.filter(m => selectedMistakeIds.has(m.ID))
      : [...filteredMistakes]
          .sort((a, b) => calcPriority(b) - calcPriority(a))
          .slice(0, practiceCount);
    
    quizStorage.clearQuizData();
    quizStorage.saveSelectedQuestions(selected);
    localStorage.setItem('quiz_mode', 'mistakes');
    localStorage.setItem('quiz_timer_enabled', timerEnabled.toString());
    localStorage.setItem('quiz_is_timed_mode', isTimedMode.toString());
    navigate('/quiz');
  };
  
  const toggleMistakeSelection = (questionId) => {
    setSelectedMistakeIds(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedMistakeIds.size === filteredMistakes.length) {
      setSelectedMistakeIds(new Set());
    } else {
      setSelectedMistakeIds(new Set(filteredMistakes.map(m => m.ID)));
    }
  };
  
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">{t('notebook.loadingMistakes')}</p>
        </div>
      </div>
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Full Question Modal */}
      <AnimatePresence>
        {fullViewMistake && (
          <FullQuestionModal
            mistake={fullViewMistake}
            errorTag={errorTags[fullViewMistake.ID]}
            onTag={handleTag}
            onClose={() => setFullViewMistake(null)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SIDEBAR: Practice Configurator
          ═══════════════════════════════════════════════════════════════════════════════ */}
      
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <Command size={20} className="text-indigo-600"/>
            {t('notebook.commandCenter')}
          </h1>
        </div>
        
        {/* Configurator */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Question Count */}
          <div>
            <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Hash size={12} />
              {t('notebook.numberOfQuestions')}
            </label>
            <div className="grid grid-cols-3 gap-1">
              {['5', '10', '15', '20', '30', 'All'].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuestionCount(num)}
                  disabled={num !== 'All' && parseInt(num) > filteredMistakes.length}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                    questionCount === num
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          {/* Date Range */}
          <div>
            <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Calendar size={12} />
              {t('notebook.timeRange')}
            </label>
            <div className="space-y-1">
              {[
                { value: 'all',   label: t('notebook.allTime') },
                { value: 'month', label: t('notebook.lastMonth') },
                { value: 'week',  label: t('notebook.lastWeek') },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setDatePeriod(o.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-bold text-left transition-all ${
                    datePeriod === o.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Mastery Level */}
          <div>
            <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
              {t('notebook.masteryLevel')}
            </label>
            <div className="space-y-1">
              {Object.entries(MASTERY_LEVELS).map(([key, lvl]) => {
                const count = mistakes.filter((m) => {
                  const ic = m.improvementCount ?? 0;
                  return ic >= lvl.min && ic <= lvl.max;
                }).length;
                
                return (
                  <button
                    key={key}
                    onClick={() => toggleMasteryLevel(key)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold border text-left transition-all ${
                      selectedMasteryLevels.includes(key)
                        ? `bg-${lvl.color}-500 border-${lvl.color}-500 text-white`
                        : `bg-white border-${lvl.color}-200 text-${lvl.color}-700`
                    }`}
                  >
                    {lvl.label}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Topics */}
          {allTopics.length > 1 && (
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                {t('notebook.topics')}
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left border transition-all ${
                      selectedTopics.includes(topic)
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {topic}
                    <span className="ml-1 opacity-70">
                      ({mistakes.filter((m) => m.Topic === topic).length})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Subtopics */}
          {availableSubtopics.length > 1 && (
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                {t('notebook.subtopics')}
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableSubtopics.slice(0, 12).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => toggleSubtopic(sub)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left border transition-all ${
                      selectedSubtopics.includes(sub)
                        ? 'bg-indigo-400 border-indigo-400 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Timer Settings */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between ${
                timerEnabled
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {t('notebook.timerEnabled')}
              </span>
              {timerEnabled && <Check size={14} />}
            </button>
            {timerEnabled && (
              <button
                onClick={() => setIsTimedMode(!isTimedMode)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between ${
                  isTimedMode
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Zap size={12} />
                  {t('notebook.timedMode')}
                </span>
                {isTimedMode && <Check size={14} />}
              </button>
            )}
          </div>
        </div>
        
        {/* Practice Button */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handlePracticeMistakes}
            disabled={filteredMistakes.length === 0}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-orange-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Play fill="currentColor" size={16} />
            {selectedMistakeIds.size > 0 
              ? tf('notebook.practiceSelected', { count: selectedMistakeIds.size })
              : tf('notebook.practiceMistakesCount', { 
                  count: practiceCount,
                  plural: practiceCount !== 1 ? 's' : ''
                })}
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {filteredMistakes.length} {t('notebook.questionsAvailable')}
          </p>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════
          MAIN WORKSPACE: Tabbed Interface
          ═══════════════════════════════════════════════════════════════════════════════ */}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Brain size={16} className="inline mr-2" />
                {t('notebook.learningInsights')}
              </button>
              <button
                onClick={() => setActiveTab('deck')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeTab === 'deck'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Grid3x3 size={16} className="inline mr-2" />
                {t('notebook.mistakeDeck')} ({filteredMistakes.length})
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeTab === 'archive'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Archive size={16} className="inline mr-2" />
                {t('notebook.masteryArchive')} ({Object.keys(archivedMistakes).length})
              </button>
            </div>
            
            {activeTab === 'deck' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={t('notebook.listView')}
                >
                  <ListIcon size={18} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={t('notebook.kanbanView')}
                >
                  <Grid3x3 size={18} />
                </button>
              </div>
            )}
          </div>
          
          {/* Filter Summary */}
          {(selectedTopics.length > 0 || selectedMasteryLevels.length > 0 || datePeriod !== 'all') && (
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedTopics.map(t => (
                <span key={t} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                  {tf('notebook.topicFilter', { topic: t })}
                  <button onClick={() => toggleTopic(t)} className="ml-1">✕</button>
                </span>
              ))}
              {selectedMasteryLevels.map(l => (
                <span key={l} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                  {MASTERY_LEVELS[l].label}
                  <button onClick={() => toggleMasteryLevel(l)} className="ml-1">✕</button>
                </span>
              ))}
              {datePeriod !== 'all' && (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                  {datePeriod === 'week' ? t('notebook.lastWeek') : t('notebook.lastMonth')}
                  <button onClick={() => setDatePeriod('all')} className="ml-1">✕</button>
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Tab 1: Learning Insights */}
            {activeTab === 'analytics' && mistakes.length > 0 && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      {t('notebook.totalMistakes')}
                    </div>
                    <div className="text-3xl font-black text-red-600">{mistakes.length}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      {t('notebook.topicsToFocus')}
                    </div>
                    <div className="text-3xl font-black text-amber-600">
                      {new Set(mistakes.map((m) => m.Topic)).size}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      {t('notebook.repeatedMistakes')}
                    </div>
                    <div className="text-3xl font-black text-green-600">
                      {mistakes.filter((m) => m.attemptCount > 1).length}
                    </div>
                  </div>
                </div>
                
                {/* Interactive Heatmap */}
                <InteractiveTopicHeatmap 
                  mistakes={mistakes} 
                  selectedTopics={selectedTopics}
                  onTopicToggle={toggleTopic}
                />
                
                {/* Retention Dashboard */}
                <RetentionDashboard mistakes={mistakes} improvements={improvements} />
                
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CalendarHeatmap improvements={improvements} />
                </div>
                
                <ImprovementTrendChart improvements={improvements} />
              </motion.div>
            )}
            
            {/* Tab 2: Mistake Deck */}
            {activeTab === 'deck' && (
              <motion.div
                key="deck"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {mistakes.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg mb-2 font-semibold">
                      {t('notebook.noMistakesYet')}
                    </p>
                    <p className="text-slate-500 text-sm mb-4">
                      {t('notebook.keepPracticing')}
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
                    >
                      {t('notebook.startPracticing')}
                    </button>
                  </div>
                ) : filteredMistakes.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg mb-2 font-semibold">
                      {t('notebook.noQuestionsFound')}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {t('notebook.tryAdjustFilters')}
                    </p>
                  </div>
                ) : viewMode === 'list' ? (
                  <ListViewDeck
                    mistakes={filteredMistakes}
                    errorTags={errorTags}
                    onTag={handleTag}
                    selectedIds={selectedMistakeIds}
                    onToggleSelect={toggleMistakeSelection}
                    onToggleSelectAll={toggleSelectAll}
                    allSelected={selectedMistakeIds.size === filteredMistakes.length}
                    onViewFull={setFullViewMistake}
                  />
                ) : (
                  <KanbanViewDeck
                    columns={kanbanColumns}
                    errorTags={errorTags}
                    onTag={handleTag}
                    onViewFull={setFullViewMistake}
                  />
                )}
              </motion.div>
            )}
            
            {/* Tab 3: Mastery Archive */}
            {activeTab === 'archive' && (
              <motion.div
                key="archive"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {Object.keys(archivedMistakes).length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg mb-2 font-semibold">
                      {t('notebook.noArchivedYet')}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {t('notebook.archiveInstructions')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.values(archivedMistakes).map((question) => (
                      <motion.div
                        key={question.ID}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-xs font-bold text-green-700 uppercase">
                              {question.Topic}
                            </div>
                            <div className="text-xs text-green-600">{question.Subtopic}</div>
                          </div>
                          <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle size={14} />
                            {tf('notebook.masteredOn', { date: formatDate(question.archivedAt) })}
                          </div>
                        </div>
                        <div className="text-sm text-green-900 font-medium">
                          {question.Question?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}