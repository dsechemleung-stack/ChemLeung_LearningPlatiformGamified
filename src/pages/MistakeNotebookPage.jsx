// MistakeNotebookPage.jsx
//
// ── Read budget ──────────────────────────────────────────────────────────────
// Mount            : 1 (summary doc) + 2 (SRS cards + review attempts) = 3 reads
// Custom Review    : 0 reads — summary doc has all topic/subtopic/bucket metadata
// Filter changes   : 0 reads — computed from summary doc math
// Week/Month filter: 1 getCountFromServer (only when datePeriod ≠ 'all')
// Start Review     : N reads — mistake docs fetched ONLY here, for the quiz
// Archive tab      : 1 SRS archived-cards query (lazy, once per session)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ChemistryLoading from '../components/ChemistryLoading';
import { quizStorage } from '../utils/quizStorage';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { db } from '../firebase/config';
import {
  collection, doc, getCountFromServer, getDoc,
  documentId, getDocs, limit, orderBy, query, startAfter, where,
} from 'firebase/firestore';
import { getNow } from '../utils/timeTravel';
import { formatHKDateKey } from '../utils/hkTime';
import app from '../firebase/config';
import {
  ArrowLeft, Play, Target, CheckCircle, ChevronDown,
  Calendar, Hash, Tag, Clock, Zap, TrendingUp, Brain,
  BarChart2, Layers, X, Flame, PlusCircle, Archive,
  ChevronRight, Check, Activity, SlidersHorizontal,
} from 'lucide-react';
import { srsService } from '../services/srsService';

// ─────────────────────────────────────────────────────────────────────────────
// NOTEBOOK HOME — INLINE STYLES
// ─────────────────────────────────────────────────────────────────────────────

const notebookStyles = {
  desk: {
    fontFamily: "'Georgia', serif",
  },
  page: {
    background: '#fdfcf7',
    borderRadius: '16px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
    width: '100%',
    maxWidth: '900px',
    minHeight: '620px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  // The spiral binding holes on the left
  binding: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '28px',
    background: 'linear-gradient(to right, #c8bfa0, #e8dfc8)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '24px',
    gap: '20px',
  },
  bindingHole: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8a7a60, #b0a080)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.3)',
  },
  // Lined paper area
  paperContent: {
    flex: 1,
    marginLeft: '28px',
    position: 'relative',
    padding: '2rem 2rem 2rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  // Left margin line (double red)
  marginLine: {
    position: 'absolute',
    left: '56px',
    top: 0,
    bottom: 0,
    width: '3px',
    background: 'linear-gradient(to right, #d63031 0%, #d63031 1px, transparent 1px, transparent 2px, #ff7675 2px)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  // Horizontal ruled lines overlay
  ruledLines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
    backgroundImage: `repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 31px,
      #b0c4de 31px,
      #b0c4de 32px
    )`,
    backgroundPosition: '0 40px',
    opacity: 0.55,
  },
  title: {
    fontFamily: "'Georgia', serif",
    fontSize: '2rem',
    fontWeight: '700',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: '1.5rem',
    marginLeft: '28px',
    letterSpacing: '-0.02em',
    position: 'relative',
    zIndex: 3,
  },
  // Two-column layout
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr',
    gap: '1.5rem',
    position: 'relative',
    zIndex: 3,
    flex: 1,
  },
  // Left column
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  // Date stamp
  dateBubble: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.7)',
    border: '1.5px solid #ddd',
    borderRadius: '10px',
    padding: '8px 14px',
    alignSelf: 'flex-start',
    marginLeft: '28px',
  },
  dateBubbleTop: {
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '0.15em',
    color: '#888',
    textTransform: 'uppercase',
  },
  dateBubbleVal: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#2d3436',
  },
  // Post-it note
  postit: {
    background: 'linear-gradient(135deg, #fdfd96, #f9f900)',
    borderRadius: '2px 8px 8px 2px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#666',
    boxShadow: '3px 4px 10px rgba(0,0,0,0.15)',
    alignSelf: 'flex-end',
    marginRight: '-8px',
    transform: 'rotate(1.5deg)',
    fontFamily: "'Georgia', serif",
    fontStyle: 'italic',
  },
  // Right column cards
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginRight: '0',
  },
  card: {
    background: '#fff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'left',
  },
  cardTab: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    borderRadius: '12px 12px 0 0',
  },
  cardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '2px',
  },
  cardDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    lineHeight: '1.4',
  },
};

// Chemistry / study themed SVG illustrations for left column
function ChemFlask({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="8" width="10" height="22" rx="2" fill="#a0aec0" stroke="#718096" strokeWidth="1.5"/>
      <path d="M28 30 L15 62 Q14 68 20 68 L60 68 Q66 68 65 62 L52 30 Z" fill="#ebf8ff" stroke="#a0aec0" strokeWidth="1.5"/>
      <circle cx="30" cy="52" r="5" fill="#63b3ed" opacity="0.7"/>
      <circle cx="50" cy="57" r="3.5" fill="#68d391" opacity="0.7"/>
      <circle cx="42" cy="44" r="4" fill="#fc8181" opacity="0.6"/>
      <line x1="25" y1="64" x2="55" y2="64" stroke="#90cdf4" strokeWidth="1.5" strokeDasharray="3 2"/>
      <line x1="22" y1="58" x2="58" y2="58" stroke="#90cdf4" strokeWidth="1" strokeDasharray="3 2" opacity="0.5"/>
    </svg>
  );
}

function AtomDoodle({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="35" cy="35" rx="28" ry="10" stroke="#90cdf4" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <ellipse cx="35" cy="35" rx="28" ry="10" stroke="#fc8181" strokeWidth="1.5" fill="none" opacity="0.7" transform="rotate(60 35 35)"/>
      <ellipse cx="35" cy="35" rx="28" ry="10" stroke="#68d391" strokeWidth="1.5" fill="none" opacity="0.7" transform="rotate(120 35 35)"/>
      <circle cx="35" cy="35" r="5" fill="#fbd38d"/>
      <circle cx="63" cy="35" r="3" fill="#90cdf4"/>
      <circle cx="7" cy="35" r="3" fill="#90cdf4"/>
    </svg>
  );
}

function GraphDoodle({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="60" x2="10" y2="10" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="60" x2="80" y2="60" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="15,55 25,42 38,48 50,30 62,22 75,15" stroke="#63b3ed" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15" cy="55" r="2.5" fill="#63b3ed"/>
      <circle cx="38" cy="48" r="2.5" fill="#63b3ed"/>
      <circle cx="62" cy="22" r="2.5" fill="#63b3ed"/>
      <polyline points="15,50 25,50 38,55 50,48 62,44 75,40" stroke="#fc8181" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
    </svg>
  );
}

function StarDoodle() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polygon points="11,2 13.5,8.5 20,9.5 15,14 16.5,20.5 11,17 5.5,20.5 7,14 2,9.5 8.5,8.5" fill="#fbd38d" stroke="#f6ad55" strokeWidth="1"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS CHART COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CalendarHeatmapFromSummaries({ summaries }) {
  const { t, tf } = useLanguage();
  const activityMap = useMemo(() => {
    const map = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }
    (summaries || []).forEach(s => {
      const key = s?.date || s?.id;
      if (!key || map[key] === undefined) return;
      const v = Number(s?.clearedCorrect || 0);
      map[key] = Math.max(0, v);
    });
    return map;
  }, [summaries]);

  const days = Object.entries(activityMap).reverse();
  const maxActivity = Math.max(...Object.values(activityMap), 1);
  const getColor = v => {
    const i = v / maxActivity;
    if (i === 0)  return 'bg-slate-100';
    if (i < 0.33) return 'bg-blue-200';
    if (i < 0.67) return 'bg-blue-400';
    return 'bg-blue-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />{t('notebook.mistakeClearingActivity')}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {[t('notebook.weekdaySunShort'), t('notebook.weekdayMonShort'), t('notebook.weekdayTueShort'), t('notebook.weekdayWedShort'), t('notebook.weekdayThuShort'), t('notebook.weekdayFriShort'), t('notebook.weekdaySatShort')]
          .map((d, i) => <div key={i} className="text-center text-xs font-bold text-slate-400 h-6">{d}</div>)}
        {days.map(([dateStr, count]) => (
          <TooltipWithPortal
            key={dateStr}
            trigger={
              <div className={`w-8 h-8 rounded ${getColor(count)} flex items-center justify-center text-xs font-bold text-slate-700 hover:ring-2 ring-blue-400 transition-all cursor-pointer`}>
                {count > 0 && count}
              </div>
            }
            content={tf('notebook.activityTooltipCleared', { date: dateStr, count })}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
        <span>{t('notebook.less')}</span>
        <div className="flex gap-1">{[0, 0.33, 0.67, 1.0].map((v, i) => <div key={i} className={`w-3 h-3 rounded ${getColor(v * maxActivity)}`} />)}</div>
        <span>{t('notebook.more')}</span>
      </div>
    </div>
  );
}

function RetentionDashboardFromSummaries({ cards = [], summaries = [] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const addedThisWeek = (cards || []).filter(c => c.createdAt && new Date(c.createdAt).getTime() >= weekAgo).length;
    const masteredThisWeek = (summaries || []).reduce((sum, s) => {
      const dateStr = String(s?.date || s?.id || '');
      if (!dateStr) return sum;
      const ts = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      if (!ts || ts < weekAgo) return sum;
      return sum + Number(s?.statusGraduated || 0);
    }, 0);

    const subtopicMap = {};
    (cards || []).filter(c => c.isActive !== false).forEach(c => {
      const key = c.subtopic || 'Unknown';
      if (!subtopicMap[key]) subtopicMap[key] = { count: 0, repeats: 0 };
      subtopicMap[key].count++;
      if ((c.failedAttempts || 0) > 0) subtopicMap[key].repeats++;
    });
    const weakest = Object.entries(subtopicMap)
      .sort((a, b) => (b[1].count + b[1].repeats * 2) - (a[1].count + a[1].repeats * 2))
      .slice(0, 6);

    return { addedThisWeek, masteredThisWeek, weakest };
  }, [cards, summaries]);

  const decayLabel =
    stats.addedThisWeek === 0 && stats.masteredThisWeek === 0 ? '—'
    : stats.masteredThisWeek > stats.addedThisWeek  ? t('notebook.decayImproving')
    : stats.masteredThisWeek === stats.addedThisWeek ? t('notebook.decayStable')
    : t('notebook.decayGrowing');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-2">
          <Activity className="text-purple-600" size={20} />
          <span className="font-bold text-slate-800 text-lg">{t('notebook.retentionDashboard')}</span>
        </div>
        <ChevronDown size={20} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
            className="border-t border-slate-200 overflow-hidden"
          >
            <div className="p-6 space-y-6 bg-slate-50">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t('notebook.addedThisWeek'),    value: stats.addedThisWeek,    cls: 'text-3xl text-red-500'    },
                  { label: t('notebook.masteredThisWeek'), value: stats.masteredThisWeek, cls: 'text-3xl text-green-600'  },
                  { label: t('notebook.decayRate'),         value: decayLabel,            cls: 'text-lg mt-1 text-purple-700' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-white rounded-xl p-4 border-2 border-slate-200 text-center">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                    <div className={`font-black ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>
              {stats.weakest.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Flame size={14} className="text-red-500" />{t('notebook.weakestSubtopics')}
                  </h3>
                  <div className="space-y-2">
                    {stats.weakest.map(([sub, data]) => {
                      const max  = stats.weakest[0][1].count + stats.weakest[0][1].repeats * 2;
                      const score = data.count + data.repeats * 2;
                      const pct  = max > 0 ? (score / max) * 100 : 0;
                      return (
                        <div key={sub} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-slate-600 font-semibold truncate shrink-0">{sub}</div>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-red-400 to-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-slate-500 shrink-0 w-8 text-right">{data.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImprovementTrendChartFromSummaries({ summaries }) {
  const { t } = useLanguage();
  const trendData = useMemo(() => {
    const now  = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });
    const byDate = new Map((summaries || []).map(s => [String(s?.date || s?.id || ''), s || {}]));

    return days.map(d => {
      const s = byDate.get(d) || {};
      return {
        date: d,
        New: Number(s?.statusNew || 0),
        Developing: Number(s?.statusLearning || 0),
        'Near-Mastery': Number(s?.statusReview || 0),
        Mastered: Number(s?.statusGraduated || 0),
      };
    });
  }, [summaries]);

  const renderLegend = (props) => {
    const order = ['New', 'Developing', 'Near-Mastery', 'Mastered'];
    const items = Array.isArray(props?.payload) ? props.payload : [];
    const byKey = new Map(items.map((it) => [String(it?.dataKey || it?.value || ''), it]));
    const ordered = order.map((k) => byKey.get(k)).filter(Boolean);
    const labelByKey = {
      New: t('notebook.masteryNew'),
      Developing: t('notebook.masteryDeveloping'),
      'Near-Mastery': t('notebook.masteryNear'),
      Mastered: t('notebook.masteryMastered'),
    };
    return (
      <div className="recharts-default-legend" style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        {ordered.map((entry) => {
          const k = String(entry?.dataKey || entry?.value || '');
          return (
            <span key={k} className="recharts-legend-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="recharts-legend-icon" style={{ width: 8, height: 8, borderRadius: 9999, background: entry?.color || '#64748b' }} />
              <span style={{ color: entry?.color || '#334155' }}>{labelByKey[k] || entry?.value || k}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const renderTooltip = (props) => {
    const active = props?.active === true;
    const label = props?.label == null ? '' : String(props.label);
    const payload = Array.isArray(props?.payload) ? props.payload : [];
    if (!active || !label || payload.length === 0) return null;
    const order = ['New', 'Developing', 'Near-Mastery', 'Mastered'];
    const byKey = new Map(payload.map((it) => [String(it?.dataKey || it?.name || it?.value || ''), it]));
    const labelByKey = {
      New: t('notebook.masteryNew'),
      Developing: t('notebook.masteryDeveloping'),
      'Near-Mastery': t('notebook.masteryNear'),
      Mastered: t('notebook.masteryMastered'),
    };
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
        <div className="text-sm font-semibold text-slate-800 mb-2">{label}</div>
        <div className="space-y-1">
          {order.map((k) => {
            const entry = byKey.get(k);
            if (!entry) return null;
            const v = Number(entry?.value || 0);
            return (
              <div key={k} className="text-sm" style={{ color: entry?.color || '#334155' }}>
                {labelByKey[k] || k} : {v}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-purple-600" />{t('notebook.improvementTrend')}
      </h3>
      <div className="text-xs text-slate-500 mb-4">
        New = first-time reviews of never-reviewed cards. After you answer, cards typically move to Developing (wrong or first correct), then Near‑Mastery (2+ correct), and Mastered after 5 correct reviews.
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" /><YAxis />
          <Tooltip content={renderTooltip} /><Legend content={renderLegend} />
          <Area type="monotone" dataKey="New"          stackId="1" stroke="#ef4444" fill="#fecaca" />
          <Area type="monotone" dataKey="Developing"   stackId="1" stroke="#f59e0b" fill="#fed7aa" />
          <Area type="monotone" dataKey="Near-Mastery" stackId="1" stroke="#eab308" fill="#fef08a" />
          <Area type="monotone" dataKey="Mastered"     stackId="1" stroke="#22c55e" fill="#bbf7d0" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MASTERY_LEVELS = {
  not_in_srs:  { labelKey: 'notebook.masteryNotInSrs',  color: 'slate'  },
  new:         { labelKey: 'notebook.masteryNew',        color: 'red'    },
  progressing: { labelKey: 'notebook.masteryDeveloping', color: 'amber'  },
  near:        { labelKey: 'notebook.masteryNear',       color: 'yellow' },
  archived:    { labelKey: 'notebook.mastered',          color: 'green'  },
};

const ALL_BUCKET_KEYS = Object.keys(MASTERY_LEVELS);
const MASTERY_FILTER_KEYS = ALL_BUCKET_KEYS.filter((k) => k !== 'not_in_srs');

// ═══════════════════════════════════════════════════════════════════════════════
// PURE HELPERS (zero reads)
// ═══════════════════════════════════════════════════════════════════════════════

const decodeTopic = (key) => { try { return decodeURIComponent(key); } catch { return key; } };
const encodeTopic = (t)   => { try { return encodeURIComponent(String(t)); } catch { return String(t); } };

function getSrsBucket(card) {
  if (!card) return 'not_in_srs';
  if (card.srsBucket) return card.srsBucket;
  if (card.hasSrsCard === false) return 'not_in_srs';
  if (!card.hasSrsCard && !card.status && !card.nextReviewDate) return 'not_in_srs';
  if (card.isActive === false)     return 'archived';
  if (card.status === 'new')       return 'new';
  if (card.status === 'learning')  return 'progressing';
  if (card.status === 'review')    return 'near';
  if (card.status === 'graduated') return 'archived';
  return 'progressing';
}

function matchesSrsPresence(row, srsPresence) {
  if (srsPresence === 'in_srs')     return row?.srsIsActive === true;
  if (srsPresence === 'not_in_srs') return (row?.srsBucket || 'not_in_srs') === 'not_in_srs';
  return true;
}

function calcPriority(row) {
  const last = row.lastAttempted || row.lastReviewedAt || row.createdAt;
  const days = last ? (Date.now() - new Date(last).getTime()) / 86_400_000 : 0;
  const rep  = row.repetitionCount ?? row.improvementCount ?? 0;
  return days * 1.2 - rep * 2;
}

function computeCountFromSummary(topicStatsDoc, { selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence }) {
  if (!topicStatsDoc?.topics) return null;
  if (selectedSubtopics.length > 0) return null;

  const mastery = (selectedMasteryLevels || []).filter(Boolean);
  if (srsPresence === 'in_srs') {
    if (mastery.length > 0) return null;
  }
  if (srsPresence === 'not_in_srs') {
    if (mastery.length > 0) return 0;
  }

  const filterTopics = selectedTopics.filter(Boolean);
  const buckets      = mastery.length > 0 ? mastery : ALL_BUCKET_KEYS;
  let total = 0;

  for (const [enc, entry] of Object.entries(topicStatsDoc.topics)) {
    const topic = decodeTopic(enc);
    if (filterTopics.length > 0 && !filterTopics.includes(topic)) continue;
    const e = (entry && typeof entry === 'object') ? entry : {};
    if (srsPresence === 'in_srs')     { total += Number(e.active || 0); continue; }
    if (srsPresence === 'not_in_srs') { total += Number(e.b_not_in_srs || 0); continue; }
    for (const b of buckets) total += Number(e[`b_${b}`] || 0);
  }
  return total;
}

function buildCountQuery(uid, { datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence }) {
  const now      = getNow();
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const parts    = [collection(db, 'users', uid, 'mistakes')];

  if (datePeriod === 'week')  parts.push(where('lastWrongAt', '>=', weekAgo.toISOString()));
  if (datePeriod === 'month') parts.push(where('lastWrongAt', '>=', monthAgo.toISOString()));

  const topics = selectedTopics.filter(Boolean);
  if (topics.length === 1)                            parts.push(where('Topic', '==', topics[0]));
  else if (topics.length >= 2 && topics.length <= 10) parts.push(where('Topic', 'in', topics));

  const subs = selectedSubtopics.filter(Boolean);
  if (subs.length === 1 && topics.length <= 1)        parts.push(where('Subtopic', '==', subs[0]));

  const lvls = selectedMasteryLevels.filter(Boolean);
  if (srsPresence !== 'not_in_srs' && lvls.length === 1) parts.push(where('srsBucket', '==', lvls[0]));

  if (srsPresence === 'in_srs')     parts.push(where('srsIsActive', '==', true));
  if (srsPresence === 'not_in_srs') parts.push(where('srsBucket', '==', 'not_in_srs'));

  return query(...parts);
}

async function countMistakesClientSide(uid, filters) {
  const { datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence } = filters;
  const now      = getNow();
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const parts = [collection(db, 'users', uid, 'mistakes')];
  if (datePeriod === 'week')  parts.push(where('lastWrongAt', '>=', weekAgo.toISOString()));
  if (datePeriod === 'month') parts.push(where('lastWrongAt', '>=', monthAgo.toISOString()));

  const topics = (selectedTopics || []).filter(Boolean);
  const subs   = (selectedSubtopics || []).filter(Boolean);
  const lvls   = (selectedMasteryLevels || []).filter(Boolean);

  const matches = (row) => {
    const tp  = row?.Topic ?? row?.topic ?? null;
    const sub = row?.Subtopic ?? row?.subtopic ?? null;
    if (topics.length > 0 && !topics.includes(tp)) return false;
    if (subs.length > 0 && !subs.includes(sub)) return false;
    if (srsPresence !== 'not_in_srs' && lvls.length > 0 && !lvls.includes(row?.srsBucket || 'not_in_srs')) return false;
    if (srsPresence !== 'all' && !matchesSrsPresence(row, srsPresence)) return false;
    return true;
  };

  let total = 0;
  let fetched = 0;
  const maxFetch = 2000;
  const pageSize = 250;
  let cursor = null;

  while (fetched < maxFetch) {
    const qParts = [...parts, orderBy('lastWrongAt', 'desc')];
    if (cursor) qParts.push(startAfter(cursor));
    qParts.push(limit(Math.min(pageSize, maxFetch - fetched)));

    const snap = await getDocs(query(...qParts));
    if (snap.empty) break;
    fetched += snap.size;
    cursor = snap.docs[snap.docs.length - 1];

    snap.docs.forEach((d) => {
      const row = d.data() || {};
      if (matches(row)) total += 1;
    });

    if (snap.size < pageSize) break;
  }

  return total;
}

async function fetchMistakesForQuiz(uid, filters, questionCount, questionsBank) {
  const { datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence } = filters;
  const now      = getNow();
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const want   = questionCount === 'All' ? 400 : Math.min(parseInt(questionCount) || 10, 400);
  const maxFetch = 500;
  const parts  = [collection(db, 'users', uid, 'mistakes')];

  if (datePeriod === 'week')  parts.push(where('lastWrongAt', '>=', weekAgo.toISOString()));
  if (datePeriod === 'month') parts.push(where('lastWrongAt', '>=', monthAgo.toISOString()));

  const topics = selectedTopics.filter(Boolean);
  const subs = selectedSubtopics.filter(Boolean);
  const lvls = selectedMasteryLevels.filter(Boolean);

  // For week/month filters, avoid adding extra Firestore where clauses.
  // Composite indexes are often missing (and fail silently in UI when caught),
  // so we filter client-side instead.
  if (datePeriod === 'all') {
    if (topics.length === 1)                            parts.push(where('Topic', '==', topics[0]));
    else if (topics.length >= 2 && topics.length <= 10) parts.push(where('Topic', 'in', topics));

    if (subs.length === 1 && topics.length <= 1)        parts.push(where('Subtopic', '==', subs[0]));

    if (srsPresence !== 'not_in_srs' && lvls.length === 1) parts.push(where('srsBucket', '==', lvls[0]));

    if (srsPresence === 'in_srs')     parts.push(where('srsIsActive', '==', true));
    if (srsPresence === 'not_in_srs') parts.push(where('srsBucket', '==', 'not_in_srs'));
  }

  const makeFiltered = (inRows) => {
    let out = inRows;
    if (selectedTopics.length > 10)  out = out.filter(r => selectedTopics.includes(r?.Topic ?? r?.topic));
    if (selectedSubtopics.length > 1)     out = out.filter(r => selectedSubtopics.includes(r?.Subtopic ?? r?.subtopic));
    if (srsPresence !== 'not_in_srs' && selectedMasteryLevels.length > 1) out = out.filter(r => selectedMasteryLevels.includes(r.srsBucket || 'not_in_srs'));
    if (srsPresence !== 'all') out = out.filter(r => matchesSrsPresence(r, srsPresence));

    // When datePeriod is week/month we intentionally did not apply topic/subtopic/bucket filters
    // server-side, so apply all of them here.
    if (datePeriod !== 'all') {
      if (topics.length > 0) out = out.filter(r => topics.includes(r?.Topic ?? r?.topic));
      if (subs.length > 0)   out = out.filter(r => subs.includes(r?.Subtopic ?? r?.subtopic));
      if (srsPresence !== 'not_in_srs' && lvls.length > 0) out = out.filter(r => lvls.includes(r.srsBucket || 'not_in_srs'));
    }
    return out;
  };

  const collected = [];
  let fetched = 0;
  let cursor = null;

  while (collected.length < want && fetched < maxFetch) {
    const remaining = want - collected.length;
    const batchSize = Math.min(Math.max(remaining * 2, 40), 120);
    const qParts = [...parts, orderBy('lastWrongAt', 'desc')];
    if (cursor) qParts.push(startAfter(cursor));
    qParts.push(limit(Math.min(batchSize, maxFetch - fetched)));

    const snap = await getDocs(query(...qParts));
    if (snap.empty) break;
    fetched += snap.size;
    cursor = snap.docs[snap.docs.length - 1];

    const batchRows = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    const filteredBatch = makeFiltered(batchRows);
    collected.push(...filteredBatch);
  }

  const qMap = new Map();
  (questionsBank || []).forEach(q => {
    qMap.set(String(q.ID), q);
    qMap.set(String(Number(q.ID)), q);
  });

  return collected
    .slice(0, want)
    .map(row => {
      const qid = String(row?.questionId ?? row?.ID ?? row?.docId ?? '');
      const q   = qMap.get(qid) || {};
      return {
        ...q, ...row,
        ID:            q?.ID      ?? qid,
        questionId:    qid,
        Topic:         q?.Topic    ?? row?.Topic    ?? null,
        Subtopic:      q?.Subtopic ?? row?.Subtopic ?? null,
        attemptCount:  Number(row?.attemptCount || 0),
        lastAttempted: row?.lastAttempted || row?.lastWrongAt || null,
        hasSrsCard:    row?.hasSrsCard  === true,
        srsIsActive:   row?.srsIsActive === true,
        srsBucket:     row?.srsBucket   ?? 'not_in_srs',
        srsCardId:     row?.srsCardId   ?? null,
        id:            row?.srsCardId   ?? null,
        status:        row?.srsStatus   ?? null,
      };
    })
    .filter(m => m.questionId)
    .sort((a, b) => calcPriority(b) - calcPriority(a));
}

async function fetchMistakeDocsByIds(uid, ids) {
  const safeIds = (Array.isArray(ids) ? ids : []).filter(Boolean).map(String);
  if (!uid || safeIds.length === 0) return [];

  const out = [];
  const col = collection(db, 'users', uid, 'mistakes');

  for (let i = 0; i < safeIds.length; i += 10) {
    const chunk = safeIds.slice(i, i + 10);
    const snap = await getDocs(query(col, where(documentId(), 'in', chunk)));
    snap.docs.forEach(d => { out.push({ docId: d.id, ...d.data() }); });
  }

  const byId = new Map(out.map(r => [String(r.docId), r]));
  return safeIds.map(id => byId.get(String(id))).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function InfoIconButton({ title, body, onOpenModal, hoverCapable }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => hoverCapable && setOpen(true)}
      onMouseLeave={() => hoverCapable && setOpen(false)}
    >
      <button
        type="button" onClick={() => onOpenModal?.()}
        className="w-5 h-5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 font-black text-[11px] leading-none flex items-center justify-center hover:bg-amber-100 transition-all"
        aria-label={title}
      >!
      </button>
      {hoverCapable && open && (
        <div className="absolute left-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs text-slate-700 z-[90] break-words">
          <div className="font-bold text-slate-800 mb-1 normal-case">{title}</div>
          <div className="text-slate-600 leading-relaxed normal-case">{body}</div>
        </div>
      )}
    </span>
  );
}

function FilterInfoModal({ onClose }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-11/12 max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-200"
      >
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-lg font-bold text-slate-800 normal-case">{t('notebook.filterInfoTitle')}</div>
            <div className="text-sm text-slate-600 mt-2 leading-relaxed normal-case">{t('notebook.filterInfoBody')}</div>
          </div>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-all flex-shrink-0">
            {t('notebook.close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TooltipWithPortal({ trigger, content, placement = 'top' }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    placement, open, onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  return (
    <>
      <div ref={refs.setReference} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="cursor-help">
        {trigger}
      </div>
      {open && createPortal(
        <div ref={refs.setFloating} style={floatingStyles} className="z-[9999] bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl ring-1 ring-white/10 max-w-xs pointer-events-none">
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}

function TopicDensityList({ topicDensityData, selectedTopics, onTopicToggle }) {
  const { t, tf } = useLanguage();
  if (!topicDensityData?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <Target size={20} className="text-rose-600" />{t('notebook.topicsToFocus')}
      </h3>
      <div className="space-y-2">
        {topicDensityData.slice(0, 10).map((row, idx) => (
          <button
            key={row.topic} onClick={() => onTopicToggle(row.topic)}
            className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-sm ${selectedTopics.includes(row.topic) ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-800 truncate">#{idx + 1} {row.topic}</div>
                <div className="text-xs text-slate-500 mt-0.5">{tf('notebook.topicFilter', { topic: row.topic })}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-black text-rose-600">{row.density.toFixed(2)}</div>
                <div className="text-[11px] text-slate-500">{Math.round(row.score)} / {row.total || '—'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InteractiveTopicHeatmap({ topicDensityData, selectedTopics, onTopicToggle }) {
  const { t, tf } = useLanguage();
  const getColor = (density, isSelected) => {
    if (isSelected) {
      const base = density < 0.4 ? 'yellow' : density < 0.7 ? 'orange' : 'red';
      return `from-${base}-600 to-${base}-700 text-white ring-2 ring-${base}-400 ring-offset-2`;
    }
    if (density < 0.2) return 'from-yellow-100 to-yellow-200 text-yellow-900 hover:from-yellow-200 hover:to-yellow-300';
    if (density < 0.4) return 'from-orange-200 to-orange-300 text-orange-900 hover:from-orange-300 hover:to-orange-400';
    if (density < 0.6) return 'from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600';
    if (density < 0.8) return 'from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700';
    return 'from-red-700 to-red-800 text-white hover:from-red-800 hover:to-red-900';
  };
  if (!topicDensityData?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
        <BarChart2 size={20} className="text-orange-600" />{t('notebook.errorDensityByTopic')}
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        {t('notebook.clickTopicsToFilter')}
        {selectedTopics.length > 0 && ` • ${tf('notebook.selectedCount', { count: selectedTopics.length })}`}
      </p>
      <div className="space-y-3">
        {topicDensityData.map(({ topic, density, score, total }) => {
          const isSel = selectedTopics.includes(topic);
          return (
            <button
              key={topic} onClick={() => onTopicToggle(topic)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${getColor(density, isSel)}`}
            >
              <div className="w-24 sm:w-32 font-semibold text-sm text-left truncate flex items-center gap-2">
                {isSel && <Check size={14} />}{topic}
              </div>
              <div className="flex-1 text-right font-bold text-sm">
                {(density * 100).toFixed(0)}%{total > 0 && ` (${Math.round(score)}/${total})`}
              </div>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
      {selectedTopics.length > 0 && (
        <button onClick={() => selectedTopics.forEach(onTopicToggle)} className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all">
          {t('notebook.clearSelection')}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM REVIEW PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function MasteryBadge({ bucket, count, selected, onClick }) {
  const { t } = useLanguage();
  const lvl = MASTERY_LEVELS[bucket];
  if (!lvl) return null;
  const CM = {
    slate:  { base: 'border-slate-200 bg-slate-50 text-slate-600',   sel: 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-300',   dot: 'bg-slate-400' },
    red:    { base: 'border-red-200 bg-red-50 text-red-700',         sel: 'border-red-500 bg-red-100 text-red-900 ring-2 ring-red-300',           dot: 'bg-red-500'   },
    amber:  { base: 'border-amber-200 bg-amber-50 text-amber-700',   sel: 'border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-300',   dot: 'bg-amber-400' },
    yellow: { base: 'border-yellow-200 bg-yellow-50 text-yellow-700',sel: 'border-yellow-500 bg-yellow-100 text-yellow-900 ring-2 ring-yellow-300',dot: 'bg-yellow-400'},
    green:  { base: 'border-green-200 bg-green-50 text-green-700',   sel: 'border-green-500 bg-green-100 text-green-900 ring-2 ring-green-300',   dot: 'bg-green-500' },
  };
  const c = CM[lvl.color] || CM.slate;
  return (
    <button type="button" onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all hover:shadow-sm active:scale-95 ${selected ? c.sel : c.base}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className="flex-1 text-left leading-tight">{t(lvl.labelKey)}</span>
      {count != null && <span className="ml-auto text-xs font-black opacity-70 tabular-nums">{count}</span>}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
          <Check size={9} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-indigo-900 ml-0.5"><X size={10} strokeWidth={3} /></button>
    </span>
  );
}

function CustomReviewPage({
  onBack,
  filteredCount, countLoading,
  allTopics, availableSubtopics, masteryCounts, topicFacetCountMap,
  questionCount, setQuestionCount,
  datePeriod, setDatePeriod,
  selectedTopics, toggleTopic,
  selectedSubtopics, toggleSubtopic,
  selectedMasteryLevels, toggleMasteryLevel,
  srsPresence, setSrsPresence,
  timerEnabled, setTimerEnabled,
  isTimedMode, setIsTimedMode,
  onPractice, launchingQuiz,
  filterInfoOpen, setFilterInfoOpen,
  hoverCapable,
}) {
  const { t } = useLanguage();

  const masteryEnabled = srsPresence !== 'not_in_srs';

  const selectAllTopics = () => {
    for (const topic of allTopics) {
      if (!selectedTopics.includes(topic)) toggleTopic(topic);
    }
  };

  const clearTopics = () => {
    for (const topic of selectedTopics) toggleTopic(topic);
  };

  const masteryBtnCls = {
    new:         { on: 'border-red-500 bg-red-50 text-red-700',          off: 'border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/40' },
    progressing: { on: 'border-amber-500 bg-amber-50 text-amber-800',    off: 'border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50/40' },
    near:        { on: 'border-yellow-500 bg-yellow-50 text-yellow-800', off: 'border-slate-200 text-slate-600 hover:border-yellow-200 hover:bg-yellow-50/40' },
    archived:    { on: 'border-emerald-500 bg-emerald-50 text-emerald-800', off: 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/40' },
  };

  const barColors = {
    new: 'bg-red-500',
    progressing: 'bg-amber-500',
    near: 'bg-yellow-500',
    archived: 'bg-emerald-500',
  };

  const displayCount  = countLoading ? '…' : (filteredCount ?? 0);
  const parsedQuestionCount = questionCount === 'All' ? (filteredCount ?? 0) : parseInt(questionCount, 10);
  const practiceCount = Math.max(0, Math.min(filteredCount ?? 0, Number.isFinite(parsedQuestionCount) ? parsedQuestionCount : 0));
  const masteryTotal = MASTERY_FILTER_KEYS.reduce((sum, key) => sum + Number(masteryCounts?.[key] || 0), 0);

  const hasAnyFilter =
    datePeriod !== 'all' || selectedTopics.length > 0 || selectedSubtopics.length > 0 ||
    selectedMasteryLevels.length > 0 || srsPresence !== 'all';

  return (
    <motion.div
      key="custom-review"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: 'easeOut' }}
      className="min-h-full"
    >
      {hasAnyFilter && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 sm:px-6 py-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-black text-indigo-500 uppercase tracking-widest mr-1">{t('notebook.activeFilters') || 'Active'}</span>
          {datePeriod !== 'all' && <FilterPill label={datePeriod === 'week' ? t('notebook.lastWeek') : t('notebook.lastMonth')} onRemove={() => setDatePeriod('all')} />}
          {selectedTopics.map(tp    => <FilterPill key={tp} label={tp} onRemove={() => toggleTopic(tp)} />)}
          {selectedSubtopics.map(s  => <FilterPill key={s}  label={s}  onRemove={() => toggleSubtopic(s)} />)}
          {masteryEnabled && selectedMasteryLevels.map(l => <FilterPill key={l} label={t(MASTERY_LEVELS[l]?.labelKey || '')} onRemove={() => toggleMasteryLevel(l)} />)}
          {srsPresence !== 'all' && <FilterPill label={srsPresence === 'in_srs' ? t('notebook.srsPresenceInSrs') : t('notebook.srsPresenceNotInSrs')} onRemove={() => setSrsPresence('all')} />}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            {/* Time Range */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />{t('notebook.timeRange')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'all', l: t('notebook.allTime') }, { v: 'month', l: t('notebook.lastMonth') }, { v: 'week', l: t('notebook.lastWeek') },
                ].map(o => (
                  <button key={o.v} type="button" onClick={() => setDatePeriod(o.v)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${datePeriod === o.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* SRS Presence */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Brain size={13} className="text-slate-400" />{t('notebook.srsPresence')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'all', l: t('notebook.srsPresenceAll') }, { v: 'in_srs', l: t('notebook.srsPresenceInSrs') }, { v: 'not_in_srs', l: t('notebook.srsPresenceNotInSrs') },
                ].map(o => (
                  <button key={o.v} type="button" onClick={() => setSrsPresence(o.v)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${srsPresence === o.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {masteryEnabled && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />{t('notebook.masteryLevel')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MASTERY_FILTER_KEYS.map(key => {
                    const isSel = selectedMasteryLevels.includes(key);
                    const count = masteryCounts?.[key] ?? null;
                    const cls = masteryBtnCls[key] || { on: 'border-indigo-500 bg-indigo-50 text-indigo-700', off: 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50' };
                    return (
                      <button key={key} type="button" onClick={() => toggleMasteryLevel(key)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 ${isSel ? `${cls.on} shadow-sm` : cls.off}`}>
                        {t(MASTERY_LEVELS[key]?.labelKey || '')}
                        {count != null && <span className={`text-xs font-black tabular-nums ${isSel ? 'opacity-90' : 'text-slate-400'}`}>{Number(count) || 0}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {allTopics.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Tag size={13} className="text-slate-400" />{t('notebook.topics')}
                  <InfoIconButton title={t('notebook.filterInfoTitle')} body={t('notebook.filterInfoBody')} onOpenModal={() => setFilterInfoOpen(true)} hoverCapable={hoverCapable} />
                  {selectedTopics.length > 0 && (
                    <span className="ml-auto text-[10px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{selectedTopics.length} selected</span>
                  )}
                </h3>
                <div className="flex items-center justify-end gap-2 mb-3">
                  {selectedTopics.length < allTopics.length && (
                    <button type="button" onClick={selectAllTopics} className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                      {t('notebook.selectAll') || 'Select all'}
                    </button>
                  )}
                  {selectedTopics.length > 0 && (
                    <button type="button" onClick={clearTopics} className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                      {t('notebook.clearSelection')}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                  {allTopics.map(topic => {
                    const count = topicFacetCountMap?.get(topic) ?? null;
                    const isSel = selectedTopics.includes(topic);
                    return (
                      <button key={topic} type="button" onClick={() => toggleTopic(topic)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-xs font-bold text-left transition-all ${isSel ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm' : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                        <span className="truncate flex items-center gap-1.5">
                          {isSel && <Check size={10} strokeWidth={3} />}{topic}
                        </span>
                        {count != null && <span className={`ml-2 tabular-nums flex-shrink-0 ${isSel ? 'text-indigo-200' : 'text-slate-400'}`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableSubtopics.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" />{t('notebook.subtopics')}
                  <InfoIconButton title={t('notebook.filterInfoTitle')} body={t('notebook.filterInfoBody')} onOpenModal={() => setFilterInfoOpen(true)} hoverCapable={hoverCapable} />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {availableSubtopics.slice(0, 30).map(sub => {
                    const isSel = selectedSubtopics.includes(sub);
                    return (
                      <button key={sub} type="button" onClick={() => toggleSubtopic(sub)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold text-left transition-all ${isSel ? 'border-indigo-400 bg-indigo-400 text-white shadow-sm' : 'border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'}`}>
                        {isSel && <Check size={10} strokeWidth={3} className="flex-shrink-0" />}
                        <span className="truncate">{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview + Launch */}
          <div className="xl:col-span-1">
            <div className="sticky top-4 space-y-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{t('notebook.sessionPreview') || 'Session preview'}</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{t('notebook.questionsAvailable')}</span>
                    <span className="text-2xl font-black text-white tabular-nums">{displayCount}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                    <span className="text-sm text-slate-300">{t('notebook.willPractice') || 'Will practice'}</span>
                    <span className="text-2xl font-black text-orange-400 tabular-nums">{practiceCount}</span>
                  </div>
                </div>
                {masteryTotal > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('notebook.masteryBreakdown') || 'Breakdown'}</div>
                    <div className="space-y-1.5">
                      {MASTERY_FILTER_KEYS.map(key => {
                        const count = Number(masteryCounts?.[key] || 0);
                        if (!count) return null;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-20 truncate">{t(MASTERY_LEVELS[key].labelKey)}</span>
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${barColors[key]}`} style={{ width: `${(count / masteryTotal) * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 tabular-nums w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" />{t('notebook.numberOfQuestions')}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['5', '10', '15', '20', 'All'].map(num => (
                    <button key={num} type="button" onClick={() => setQuestionCount(num)}
                      disabled={num !== 'All' && parseInt(num) > (filteredCount ?? 0)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-xs font-black transition-all ${questionCount === num ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'}`}>
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">{t('notebook.custom') || 'Custom'}:</span>
                  <input type="number" min="1" max={filteredCount || 1}
                    value={['5', '10', '15', '20', 'All'].includes(questionCount) ? '' : questionCount}
                    onChange={e => { const v = parseInt(e.target.value); if (v > 0) setQuestionCount(String(Math.min(v, filteredCount || 1))); }}
                    placeholder="___"
                    className="w-16 px-2 py-1.5 rounded-lg border-2 border-slate-200 text-xs font-black text-center focus:border-orange-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />{t('notebook.timerSettings') || 'Timer'}
                </h3>
                <div className="space-y-2">
                  {[
                    { show: true,         active: timerEnabled, toggle: () => setTimerEnabled(v => !v), icon: Clock, label: t('notebook.timerEnabled'), bg: 'bg-green-500', border: 'border-green-500 bg-green-50 text-green-700' },
                    { show: timerEnabled, active: isTimedMode,  toggle: () => setIsTimedMode(v => !v),  icon: Zap,   label: t('notebook.timedMode'),    bg: 'bg-amber-500', border: 'border-amber-500 bg-amber-50 text-amber-700' },
                  ].filter(r => r.show).map(({ active, toggle, icon: Icon, label, bg, border }) => (
                    <button key={label} type="button" onClick={toggle}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? border : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      <span className="flex items-center gap-2"><Icon size={14} />{label}</span>
                      <div className={`w-9 h-5 rounded-full relative ${active ? bg : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${active ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={onPractice}
                disabled={(filteredCount ?? 0) === 0 || practiceCount === 0 || launchingQuiz || countLoading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-base shadow-lg shadow-orange-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
              >
                {launchingQuiz
                  ? <span className="animate-pulse">Loading questions…</span>
                  : <><Play fill="currentColor" size={18} />Practice {practiceCount} question{practiceCount !== 1 ? 's' : ''}</>
                }
              </button>
              {(filteredCount ?? 0) === 0 && !countLoading && (
                <p className="text-center text-xs text-slate-400 font-semibold">{t('notebook.noQuestionsFound')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MistakeNotebookPage({ questions = [] }) {
  const { currentUser } = useAuth();
  const { t, tf }       = useLanguage();
  const navigate        = useNavigate();
  const location        = useLocation();

  const texturedBgStyle = useMemo(() => ({
    backgroundColor: '#0f2340',
    backgroundImage: [
      'linear-gradient(135deg, #1e3a5f 0%, #0f2340 50%, #162d4a 100%)',
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 14px)',
      'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 14px)',
      'radial-gradient(1200px 800px at 15% 10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 60%)',
      'radial-gradient(900px 700px at 80% 20%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.0) 55%)',
    ].join(','),
    backgroundBlendMode: 'normal, overlay, overlay, screen, multiply',
  }), []);

  const [topicStatsDoc,  setTopicStatsDoc]  = useState(null);
  const [srsCards,       setSrsCards]       = useState([]);
  const [reviewAttempts, setReviewAttempts] = useState([]);
  const [srsDailySummaries, setSrsDailySummaries] = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  const [archivedMistakes, setArchivedMistakes] = useState({});
  const [archivedLoaded,   setArchivedLoaded]   = useState(false);
  const [archiveLoadError, setArchiveLoadError] = useState(null);

  const [questionCount,         setQuestionCount]         = useState('10');
  const [datePeriod,            setDatePeriod]            = useState('all');
  const [selectedTopics,        setSelectedTopics]        = useState([]);
  const [selectedSubtopics,     setSelectedSubtopics]     = useState([]);
  const [selectedMasteryLevels, setSelectedMasteryLevels] = useState([]);
  const [srsPresence,           setSrsPresence]           = useState('all');

  useEffect(() => {
    if (srsPresence !== 'not_in_srs') return;
    if (selectedMasteryLevels.length === 0) return;
    setSelectedMasteryLevels([]);
  }, [srsPresence, selectedMasteryLevels.length]);

  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isTimedMode,  setIsTimedMode]  = useState(false);

  const [showHome,         setShowHome]         = useState(true);
  const [activeTab,        setActiveTab]        = useState(null);
  const [archiveSubTab,    setArchiveSubTab]     = useState('mastery');
  const [showCustomReview, setShowCustomReview]  = useState(false);
  const [filterInfoOpen,   setFilterInfoOpen]    = useState(false);
  const [hoverCapable,     setHoverCapable]      = useState(true);
  const [launchingQuiz,    setLaunchingQuiz]     = useState(false);

  // Card hover state
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const qs = location?.search || '';
    if (!qs) return;
    const sp = new URLSearchParams(qs);
    if (sp.get('customReview') !== '1') return;
    setShowHome(false);
    setShowCustomReview(true);
    sp.delete('customReview');
    const nextSearch = sp.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!location?.search) {
      setShowHome(true);
      setShowCustomReview(false);
      setActiveTab(null);
    }
  }, [location?.search]);

  useEffect(() => {
    const nonce = location?.state?.forceNotebookHome;
    if (!nonce) return;
    setShowHome(true);
    setShowCustomReview(false);
    setActiveTab(null);
  }, [location?.state?.forceNotebookHome]);

  const [filteredCount,  setFilteredCount]  = useState(null);
  const [countLoading,   setCountLoading]   = useState(false);

  const SRS_TTL        = 5 * 60 * 1000;
  const srsUidRef      = useRef(null);
  const srsTsRef       = useRef(0);
  const srsCardsRef    = useRef([]);
  const srsAttemptsRef = useRef([]);

  const needsTopicStats = !showHome && (showCustomReview || activeTab === 'analytics');
  const needsAnalytics = !showHome && activeTab === 'analytics';

  useEffect(() => {
    if (!currentUser?.uid || !needsTopicStats) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'mistake_stats', 'topicBuckets'));
        if (!cancelled) setTopicStatsDoc(snap.exists() ? snap.data() : null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid, needsTopicStats]);

  useEffect(() => {
    if (!currentUser?.uid || !needsAnalytics) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const needsSrs = srsUidRef.current !== currentUser.uid || Date.now() - srsTsRef.current > SRS_TTL;
        if (needsSrs) {
          const now = getNow();
          const start = new Date(now);
          start.setDate(start.getDate() - 29);
          const startKey = formatHKDateKey(start);
          const endKey = formatHKDateKey(now);

          const summariesRef = collection(db, 'users', currentUser.uid, 'srs_daily_summaries');
          const [summSnap, cards] = await Promise.all([
            getDocs(query(summariesRef, where('date', '>=', startKey), where('date', '<=', endKey))),
            srsService.getDueCards(currentUser.uid, getNow(), { limit: 200 }),
          ]);

          const summaries = (summSnap?.docs || []).map(d => ({ id: d.id, ...(d.data() || {}) }));
          srsAttemptsRef.current = [];
          srsCardsRef.current    = cards;
          srsUidRef.current      = currentUser.uid;
          srsTsRef.current       = Date.now();

          if (!cancelled) setSrsDailySummaries(summaries);
        }
        if (!cancelled) {
          setReviewAttempts(srsAttemptsRef.current);
          setSrsCards(srsCardsRef.current);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid, needsAnalytics]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handler = e => setHoverCapable(!!e.matches);
    setHoverCapable(!!mql.matches);
    mql.addEventListener?.('change', handler) ?? mql.addListener?.(handler);
    return () => mql.removeEventListener?.('change', handler) ?? mql.removeListener?.(handler);
  }, []);

  useEffect(() => {
    if (!currentUser || activeTab !== 'archive' || archivedLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        setArchiveLoadError(null);
        const qMap          = new Map((questions || []).map(q => [q.ID, q]));
        const archivedCards = await srsService.getArchivedCards(currentUser.uid);
        if (cancelled) return;
        const byId = {};
        (archivedCards || []).forEach(c => {
          byId[c.questionId] = { ...c, ...(qMap.get(c.questionId) || {}), ID: c.questionId };
        });
        setArchivedMistakes(byId);
        setArchivedLoaded(true);
      } catch (e) {
        console.error('Error loading archived cards:', e);
        if (cancelled) return;
        setArchiveLoadError(e);
        setArchivedMistakes({});
        setArchivedLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, archivedLoaded, currentUser, questions]);

  useEffect(() => { if (activeTab === 'archive') setArchiveSubTab('mastery'); }, [activeTab]);

  useEffect(() => {
    if (!showCustomReview) return;
    const filters = { selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence };

    if (datePeriod === 'all') {
      const summaryCount = computeCountFromSummary(topicStatsDoc, filters);
      if (summaryCount !== null && summaryCount !== undefined) {
        setFilteredCount(summaryCount);
        setCountLoading(false);
        return;
      }

      if (!currentUser?.uid) return;
      let cancelled = false;
      setCountLoading(true);
      (async () => {
        try {
          const q = buildCountQuery(currentUser.uid, { datePeriod: 'all', ...filters });
          const snap = await getCountFromServer(q);
          if (!cancelled) setFilteredCount(Number(snap.data().count || 0));
        } catch (e) {
          console.error('Count query failed:', e);
          if (!cancelled) setFilteredCount(null);
        } finally {
          if (!cancelled) setCountLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }

    if (!currentUser?.uid) return;
    let cancelled = false;
    setCountLoading(true);

    // Week/Month + additional filters: avoid composite Firestore count query.
    // Missing composite indexes can cause this to fail and look like 0.
    const hasExtraFilters =
      selectedTopics.length > 0 ||
      selectedSubtopics.length > 0 ||
      selectedMasteryLevels.length > 0 ||
      srsPresence !== 'all';

    if (hasExtraFilters) {
      (async () => {
        try {
          const n = await countMistakesClientSide(currentUser.uid, { datePeriod, ...filters });
          if (!cancelled) setFilteredCount(Number(n || 0));
        } catch (e) {
          console.error('Client-side count failed:', e);
          if (!cancelled) setFilteredCount(null);
        } finally {
          if (!cancelled) setCountLoading(false);
        }
      })();

      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const q    = buildCountQuery(currentUser.uid, { datePeriod, ...filters });
        const snap = await getCountFromServer(q);
        if (!cancelled) setFilteredCount(Number(snap.data().count || 0));
      } catch (e) {
        console.error('Count query failed:', e);
        if (!cancelled) setFilteredCount(null);
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showCustomReview, datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence, topicStatsDoc, currentUser?.uid]);

  const allTopics = useMemo(() =>
    topicStatsDoc?.topics
      ? Object.keys(topicStatsDoc.topics).map(decodeTopic).filter(Boolean).sort()
      : []
  , [topicStatsDoc]);

  const topicFacetCountMap = useMemo(() => {
    if (!topicStatsDoc?.topics) return new Map();
    const map     = new Map();
    const masteryEnabled = srsPresence !== 'not_in_srs';
    const buckets = masteryEnabled
      ? (selectedMasteryLevels.length > 0 ? selectedMasteryLevels : MASTERY_FILTER_KEYS)
      : [];
    Object.entries(topicStatsDoc.topics).forEach(([enc, entry]) => {
      const topic = decodeTopic(enc);
      const e     = (entry && typeof entry === 'object') ? entry : {};
      let count   = 0;
      if (srsPresence === 'in_srs')     count = Number(e.active || 0);
      else if (srsPresence === 'not_in_srs') count = Number(e.b_not_in_srs || 0);
      else buckets.forEach(b => { count += Number(e[`b_${b}`] || 0); });
      map.set(topic, count);
    });
    return map;
  }, [topicStatsDoc, selectedMasteryLevels, srsPresence]);

  const masteryCounts = useMemo(() => {
    if (!topicStatsDoc?.topics) return {};
    const filterTopics = selectedTopics.filter(Boolean);
    const counts = Object.fromEntries(MASTERY_FILTER_KEYS.map(k => [k, 0]));
    Object.entries(topicStatsDoc.topics).forEach(([enc, entry]) => {
      const topic = decodeTopic(enc);
      if (filterTopics.length > 0 && !filterTopics.includes(topic)) return;
      const e = (entry && typeof entry === 'object') ? entry : {};
      MASTERY_FILTER_KEYS.forEach(k => { counts[k] += Number(e[`b_${k}`] || 0); });
    });
    return counts;
  }, [topicStatsDoc, selectedTopics]);

  const totalMistakesCount = useMemo(() => {
    if (!topicStatsDoc?.topics) return null;
    return Object.values(topicStatsDoc.topics).reduce((sum, e) =>
      sum + (e && typeof e === 'object' ? Number(e.total || 0) : 0), 0);
  }, [topicStatsDoc]);

  const topicDensityData = useMemo(() => {
    if (!topicStatsDoc?.topics) return [];
    const totalByTopic = {};
    (questions || []).forEach(q => {
      if (q?.Topic) totalByTopic[q.Topic] = (totalByTopic[q.Topic] || 0) + 1;
    });
    return Object.entries(topicStatsDoc.topics)
      .map(([enc, entry]) => {
        const topic   = decodeTopic(enc);
        const e       = (entry && typeof entry === 'object') ? entry : {};
        const score   = Number(e.total || 0);
        const total   = totalByTopic[topic] || 0;
        const density = total > 0 ? score / total : score > 0 ? 1 : 0;
        return { topic, score, total, density };
      })
      .filter(d => d.score > 0)
      .sort((a, b) => b.density - a.density);
  }, [topicStatsDoc, questions]);

  const availableSubtopics = useMemo(() => {
    if (!topicStatsDoc?.topics) return [];
    const filterTopics = selectedTopics.filter(Boolean);
    const subs = new Set();
    Object.entries(topicStatsDoc.topics).forEach(([enc, entry]) => {
      const topic = decodeTopic(enc);
      if (filterTopics.length > 0 && !filterTopics.includes(topic)) return;
      (entry?.subtopics || []).forEach(s => { if (s) subs.add(s); });
    });
    return [...subs].sort();
  }, [topicStatsDoc, selectedTopics]);

  useEffect(() => {
    setSelectedSubtopics(prev => {
      const next = prev.filter(s => availableSubtopics.includes(s));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSubtopics]);

  const toggleTopic        = useCallback(tp  => setSelectedTopics(p => p.includes(tp)  ? p.filter(x => x !== tp)  : [...p, tp]),  []);
  const toggleSubtopic     = useCallback(sub => setSelectedSubtopics(p => p.includes(sub) ? p.filter(x => x !== sub) : [...p, sub]), []);
  const toggleMasteryLevel = useCallback(lvl => setSelectedMasteryLevels(p => p.includes(lvl) ? p.filter(x => x !== lvl) : [...p, lvl]), []);

  const handlePracticeMistakes = useCallback(async () => {
    if (!currentUser?.uid || (filteredCount ?? 0) === 0) return;
    setLaunchingQuiz(true);
    try {
      const filters = { datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence };
      const want = questionCount === 'All' ? 400 : Math.min(parseInt(questionCount) || 10, 400);
      let mistakeRows = [];

      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(app, 'asia-east1');
        const callable = httpsCallable(functions, 'pickMistakesForReview');
        const res = await callable({ limit: want, filters });
        const ids = (res?.data && Array.isArray(res.data.ids)) ? res.data.ids : [];
        const picked = await fetchMistakeDocsByIds(currentUser.uid, ids);
        mistakeRows = picked.map(r => ({ ...r, docId: r.docId }));
      } catch (e) {
        mistakeRows = await fetchMistakesForQuiz(currentUser.uid, filters, questionCount, questions);
      }

      const qMap = new Map();
      (questions || []).forEach(q => {
        qMap.set(String(q.ID), q);
        qMap.set(String(Number(q.ID)), q);
      });

      mistakeRows = (mistakeRows || [])
        .slice(0, want)
        .map(row => {
          const qid = String(row?.questionId ?? row?.ID ?? row?.docId ?? '');
          const q   = qMap.get(qid) || {};
          return {
            ...q, ...row,
            ID:            q?.ID      ?? qid,
            questionId:    qid,
            Topic:         q?.Topic    ?? row?.Topic    ?? null,
            Subtopic:      q?.Subtopic ?? row?.Subtopic ?? null,
            attemptCount:  Number(row?.attemptCount || 0),
            lastAttempted: row?.lastAttempted || row?.lastWrongAt || null,
            hasSrsCard:    row?.hasSrsCard  === true,
            srsIsActive:   row?.srsIsActive === true,
            srsBucket:     row?.srsBucket   ?? 'not_in_srs',
            srsCardId:     row?.srsCardId   ?? null,
            id:            row?.srsCardId   ?? null,
            status:        row?.srsStatus   ?? null,
          };
        })
        .filter(m => m.questionId)
        .sort((a, b) => calcPriority(b) - calcPriority(a));

      if (!mistakeRows.length) return;

      quizStorage.clearQuizData();
      quizStorage.saveSelectedQuestions(mistakeRows);

      const allHaveSrs = mistakeRows.every(m => !!m.id);
      if (allHaveSrs) {
        localStorage.setItem('quiz_mode', 'spaced-repetition');
        localStorage.setItem('quiz_srs_cards', JSON.stringify(
          mistakeRows.map(m => ({ id: m.id, questionId: m.questionId, topic: m.Topic, subtopic: m.Subtopic || null, nextReviewDate: m.nextReviewDate, status: m.status }))
        ));
      } else {
        localStorage.setItem('quiz_mode', 'mistakes');
        localStorage.removeItem('quiz_srs_cards');
      }
      localStorage.setItem('quiz_timer_enabled', String(timerEnabled));
      localStorage.setItem('quiz_is_timed_mode', String(isTimedMode));
      navigate('/quiz');
    } catch (err) {
      console.error('Failed to load questions for quiz:', err);
    } finally {
      setLaunchingQuiz(false);
    }
  }, [currentUser?.uid, filteredCount, datePeriod, selectedTopics, selectedSubtopics, selectedMasteryLevels, srsPresence, questionCount, questions, timerEnabled, isTimedMode, navigate]);

  const handleRestoreCard = useCallback(async questionId => {
    if (!currentUser) return;
    const card = Object.values(archivedMistakes).find(c => c.questionId === questionId || c.ID === questionId);
    if (!card?.id) return;
    try {
      await srsService.restoreArchivedCard(card.id);
      setArchivedMistakes(prev => { const next = { ...prev }; delete next[questionId]; return next; });
    } catch (e) { console.error('Error restoring card:', e); }
  }, [currentUser, archivedMistakes]);

  const formatDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const hasData = (totalMistakesCount ?? 0) > 0;

  if (loading) return (
    <div className="mistake-notebook-bg flex items-center justify-center h-screen">
      <ChemistryLoading />
    </div>
  );

  if (error) return (
    <div className="mistake-notebook-bg flex items-center justify-center h-screen">
      <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-200 max-w-lg">
        <p className="text-red-600 font-black mb-2">{t('notebook.loadingMistakes')}</p>
        <p className="text-slate-600 text-sm">{String(error?.message || error)}</p>
      </div>
    </div>
  );

  // ── BINDING HOLES ──────────────────────────────────────────────────────────
  const bindingHoles = Array.from({ length: 14 }, (_, i) => (
    <div key={i} style={notebookStyles.bindingHole} />
  ));

  return (
    <div
      className="mistake-notebook-bg flex flex-col min-h-0"
    >
      <AnimatePresence>
        {filterInfoOpen && <FilterInfoModal onClose={() => setFilterInfoOpen(false)} />}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════════════
              HOME PAGE — full notebook rewrite
          ═══════════════════════════════════════════════════════════════════ */}
          {showHome && (
            <motion.section
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="notebook-desk"
              style={notebookStyles.desk}
            >
              <div style={notebookStyles.page}>

                {/* ── Binding strip ── */}
                <div style={notebookStyles.binding}>
                  {bindingHoles}
                </div>

                {/* ── Paper content ── */}
                <div style={notebookStyles.paperContent}>
                  {/* Ruled lines overlay */}
                  <div style={notebookStyles.ruledLines} />
                  {/* Double-red left margin */}
                  <div style={notebookStyles.marginLine} />

                  {/* Post-it note top-right */}
                  <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 10 }}>
                    <div style={notebookStyles.postit}>Don't give up!</div>
                  </div>

                  {/* Title */}
                  <h1 style={notebookStyles.title}>
                    {t('dashboard.mistakeNotebook') || 'Mistake Notebook'}
                  </h1>

                  {/* Two-column body */}
                  <div style={notebookStyles.twoCol}>

                    {/* ── LEFT COLUMN: date + illustrations ── */}
                    <div style={notebookStyles.leftCol}>
                      {/* Date bubble */}
                      <div style={{ ...notebookStyles.dateBubble, marginLeft: '2rem' }}>
                        <div style={notebookStyles.dateBubbleTop}>Today</div>
                        <div style={notebookStyles.dateBubbleVal}>
                          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Chemistry illustration cluster */}
                      <div style={{
                        marginLeft: '2rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        flex: 1,
                      }}>
                        {/* Top row: flask + atom */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                          <ChemFlask size={88} />
                          <AtomDoodle size={72} />
                        </div>

                        {/* Trend graph */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <GraphDoodle size={100} />
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}>
                            {['Acids & Bases', 'Organic Rxns', 'Redox'].map((label, i) => (
                              <div key={label} style={{
                                fontSize: '10px',
                                color: '#718096',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <div style={{
                                  width: '8px', height: '8px', borderRadius: '50%',
                                  background: ['#fc8181', '#68d391', '#63b3ed'][i],
                                }} />
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Motivational stars row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: 'auto',
                          paddingBottom: '0.5rem',
                          opacity: 0.75,
                        }}>
                          <StarDoodle /><StarDoodle /><StarDoodle />
                          <span style={{ fontSize: '11px', color: '#a0aec0', fontStyle: 'italic', marginLeft: '4px' }}>
                            keep reviewing!
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT COLUMN: nav cards ── */}
                    <div style={notebookStyles.rightCol}>

                      {/* Custom Review — orange tab */}
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCard('custom')}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => { setShowHome(false); setShowCustomReview(true); }}
                        style={{
                          ...notebookStyles.card,
                          transform: hoveredCard === 'custom' ? 'translateY(-2px)' : 'translateY(0)',
                          boxShadow: hoveredCard === 'custom'
                            ? '0 8px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)'
                            : notebookStyles.card.boxShadow,
                          paddingTop: '1.25rem',
                        }}
                      >
                        {/* Color tab */}
                        <div style={{ ...notebookStyles.cardTab, background: 'linear-gradient(90deg, #f97316, #fb923c)' }} />
                        <div style={{
                          ...notebookStyles.cardIcon,
                          background: 'linear-gradient(135deg, #fed7aa, #ffedd5)',
                        }}>
                          <SlidersHorizontal size={18} color="#ea580c" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={notebookStyles.cardTitle}>{t('notebook.customReview') || 'Custom Review'}</div>
                          <div style={notebookStyles.cardDesc}>Personalized practice sessions based on your weakest topics.</div>
                        </div>
                        <ChevronRight size={16} color="#94a3b8" />
                      </button>

                      {/* Learning Insights — purple tab */}
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCard('analytics')}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => { setShowHome(false); setActiveTab('analytics'); }}
                        style={{
                          ...notebookStyles.card,
                          transform: hoveredCard === 'analytics' ? 'translateY(-2px)' : 'translateY(0)',
                          boxShadow: hoveredCard === 'analytics'
                            ? '0 8px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)'
                            : notebookStyles.card.boxShadow,
                          paddingTop: '1.25rem',
                        }}
                      >
                        <div style={{ ...notebookStyles.cardTab, background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)' }} />
                        <div style={{
                          ...notebookStyles.cardIcon,
                          background: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
                        }}>
                          <Brain size={18} color="#7c3aed" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={notebookStyles.cardTitle}>{t('notebook.learningInsights') || 'Learning Insights'}</div>
                          <div style={notebookStyles.cardDesc}>Visual analytics to identify your recurring mistakes and progress.</div>
                        </div>
                        <ChevronRight size={16} color="#94a3b8" />
                      </button>

                      {/* Archive — slate tab with red bookmark accent */}
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredCard('archive')}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => { setShowHome(false); setActiveTab('archive'); }}
                        style={{
                          ...notebookStyles.card,
                          transform: hoveredCard === 'archive' ? 'translateY(-2px)' : 'translateY(0)',
                          boxShadow: hoveredCard === 'archive'
                            ? '0 8px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)'
                            : notebookStyles.card.boxShadow,
                          paddingTop: '1.25rem',
                          position: 'relative',
                        }}
                      >
                        <div style={{ ...notebookStyles.cardTab, background: 'linear-gradient(90deg, #475569, #64748b)' }} />
                        {/* Red bookmark tag on top-right corner */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: '18px',
                          width: '14px',
                          height: '26px',
                          background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                          clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
                          zIndex: 5,
                        }} />
                        <div style={{
                          ...notebookStyles.cardIcon,
                          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                        }}>
                          <Archive size={18} color="#475569" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={notebookStyles.cardTitle}>{t('notebook.archive') || 'Archive'}</div>
                          <div style={notebookStyles.cardDesc}>Browse and revisit your completed mistake history.</div>
                        </div>
                        <ChevronRight size={16} color="#94a3b8" />
                      </button>

                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Custom Review ── */}
          {showCustomReview && !showHome && (
            <CustomReviewPage
              key="custom-review"
              onBack={() => { setShowHome(true); setShowCustomReview(false); setActiveTab(null); }}
              filteredCount={filteredCount}   countLoading={countLoading}
              allTopics={allTopics}           availableSubtopics={availableSubtopics}
              masteryCounts={masteryCounts}   topicFacetCountMap={topicFacetCountMap}
              questionCount={questionCount}   setQuestionCount={setQuestionCount}
              datePeriod={datePeriod}         setDatePeriod={setDatePeriod}
              selectedTopics={selectedTopics} toggleTopic={toggleTopic}
              selectedSubtopics={selectedSubtopics} toggleSubtopic={toggleSubtopic}
              selectedMasteryLevels={selectedMasteryLevels} toggleMasteryLevel={toggleMasteryLevel}
              srsPresence={srsPresence}       setSrsPresence={setSrsPresence}
              timerEnabled={timerEnabled}     setTimerEnabled={setTimerEnabled}
              isTimedMode={isTimedMode}       setIsTimedMode={setIsTimedMode}
              onPractice={handlePracticeMistakes} launchingQuiz={launchingQuiz}
              filterInfoOpen={filterInfoOpen} setFilterInfoOpen={setFilterInfoOpen}
              hoverCapable={hoverCapable}
            />
          )}

          {/* ── Analytics Tab ── */}
          {!showHome && !showCustomReview && activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 sm:p-6 space-y-6">
              {!hasData ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2 font-semibold">{t('notebook.noMistakesYet')}</p>
                  <p className="text-slate-500 text-sm mb-6">{t('notebook.keepPracticing')}</p>
                  <button onClick={() => navigate('/practice')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                    {t('notebook.startPracticing')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: t('notebook.totalMistakes'),    value: totalMistakesCount ?? '—', color: 'text-red-600'    },
                      { label: t('notebook.topicsToFocus'),    value: allTopics.length,           color: 'text-amber-600'  },
                      { label: t('notebook.srsPresenceInSrs'), value: Object.values(masteryCounts).reduce((s,v) => s+v, 0) - (masteryCounts.not_in_srs || 0), color: 'text-indigo-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</div>
                        <div className={`text-3xl font-black ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                      <TopicDensityList   topicDensityData={topicDensityData} selectedTopics={selectedTopics} onTopicToggle={toggleTopic} />
                      <InteractiveTopicHeatmap topicDensityData={topicDensityData} selectedTopics={selectedTopics} onTopicToggle={toggleTopic} />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                      <RetentionDashboardFromSummaries cards={srsCards} summaries={srsDailySummaries} />
                      <CalendarHeatmapFromSummaries summaries={srsDailySummaries} />
                      <ImprovementTrendChartFromSummaries summaries={srsDailySummaries} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── Archive Tab ── */}
          {!showHome && !showCustomReview && activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-4 sm:p-6">
              {!archivedLoaded ? (
                <div className="flex items-center justify-center py-16"><ChemistryLoading /></div>
              ) : archiveLoadError ? (
                <div className="text-center py-12">
                  <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-700 text-lg mb-2 font-black">{t('notebook.archive') || 'Archive'}</p>
                  <p className="text-slate-500 text-sm font-semibold">{String(archiveLoadError?.message || archiveLoadError)}</p>
                </div>
              ) : Object.keys(archivedMistakes).length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2 font-semibold">{t('notebook.noArchivedYet')}</p>
                  <div className="max-w-2xl mx-auto space-y-3">
                    <p className="text-slate-500 text-sm">{t('notebook.archiveInstructions')}</p>
                    {[
                      { bg: 'bg-emerald-50 border-emerald-200', title: t('notebook.archiveMasteryHowTitle'), body: t('notebook.archiveMasteryHowBody') },
                      { bg: 'bg-amber-50 border-amber-200',     title: t('notebook.archiveOverdueHowTitle'), body: t('notebook.archiveOverdueHowBody') },
                    ].map(({ bg, title, body }) => (
                      <div key={title} className={`p-4 rounded-xl border-2 ${bg} text-left`}>
                        <div className="text-sm font-black text-slate-800 mb-1">{title}</div>
                        <div className="text-xs text-slate-600 leading-relaxed">{body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (() => {
                const all      = Object.values(archivedMistakes);
                const overdue  = all.filter(q => q.archiveReason === 'overdue_7_days' || q.archiveReason === 'overdue_14_days');
                const mastered = all.filter(q => q.archiveReason !== 'overdue_7_days' && q.archiveReason !== 'overdue_14_days');
                const list     = archiveSubTab === 'overdue' ? overdue : mastered;
                const isOD     = archiveSubTab === 'overdue';

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'mastery', label: `${t('notebook.archiveSubtabMastery')} (${mastered.length})`, cls: 'bg-emerald-600 border-emerald-600' },
                          { id: 'overdue', label: `${t('notebook.archiveSubtabOverdue')} (${overdue.length})`,  cls: 'bg-amber-500 border-amber-500'    },
                        ].map(({ id, label, cls }) => (
                          <button key={id} type="button" onClick={() => setArchiveSubTab(id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-black border-2 transition-all ${archiveSubTab === id ? `${cls} text-white` : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">{tf('notebook.archiveSubtabCount', { count: list.length })}</div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 ${isOD ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="text-sm font-black text-slate-800 mb-1">{isOD ? t('notebook.archiveOverdueHowTitle') : t('notebook.archiveMasteryHowTitle')}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">{isOD ? t('notebook.archiveOverdueHowBody') : t('notebook.archiveMasteryHowBody')}</div>
                    </div>

                    {list.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-sm font-black text-slate-700 mb-1">{isOD ? t('notebook.noOverdueArchives') : t('notebook.noMasteryArchives')}</div>
                        <div className="text-xs text-slate-500">{isOD ? t('notebook.noOverdueArchivesHint') : t('notebook.noMasteryArchivesHint')}</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {list.map(q => (
                          <motion.div key={q?.docId ?? q?.ID} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-xs font-bold text-green-700 uppercase">{q.Topic}</div>
                                <div className="text-xs text-green-600">{q.Subtopic}</div>
                                {q.archiveReason && (
                                  <div className="text-xs text-amber-600 font-semibold mt-1">
                                    {isOD ? 'Auto-archived (14+ days overdue)' : 'Archived'}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircle size={14} />{tf('notebook.masteredOn', { date: formatDate(q.archivedAt) })}
                                </div>
                                <button onClick={() => handleRestoreCard(q.ID)} className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                                  <PlusCircle size={12} /> Restore
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-green-900 font-medium mb-2">
                              {q.Question?.replace(/<[^>]*>/g, '').substring(0, 100)}…
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <span>Attempts: {q.attemptCount || 1}</span>
                              <span>SRS reviews: {q.repetitionCount || 0}</span>
                              {q.interval && <span>Interval: {q.interval}d</span>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}