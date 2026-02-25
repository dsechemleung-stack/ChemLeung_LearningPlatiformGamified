// ============================================================================
// TOKEN LOG - Transaction History
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTokenHistory } from '../services/tokenService';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Filter, Gem } from 'lucide-react';
import ChemistryLoading from './ChemistryLoading';

export default function TokenLog() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, tf, isEnglish } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | gains | spends

  useEffect(() => {
    loadHistory();
  }, [currentUser]);

  async function loadHistory() {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const data = await getTokenHistory(currentUser.uid, 8);
      setHistory(data);
    } catch (error) {
      console.error('Error loading token history:', error);
    }
    setLoading(false);
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return t('tokenLog.unknown');
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('forum.justNow');
    if (diffMins < 60) return tf('forum.timeAgoMinutesShort', { count: diffMins });
    if (diffHours < 24) return tf('forum.timeAgoHoursShort', { count: diffHours });
    if (diffDays < 7) return tf('forum.timeAgoDaysShort', { count: diffDays });
    
    return date.toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', { 
      timeZone: 'Asia/Hong_Kong',
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const filteredHistory = history.filter(entry => {
    if (filter === 'gains') return entry.type === 'gain';
    if (filter === 'spends') return entry.type === 'spend';
    return true;
  });

  // Calculate totals
  const totalGained = history
    .filter(e => e.type === 'gain')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalSpent = history
    .filter(e => e.type === 'spend')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Clock size={32} />
            {t('tokenLog.title')}
          </h1>
          <p className="text-orange-100 mt-1">
            {t('tokenLog.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-600">{t('tokenLog.totalEarned')}</div>
              <div className="text-3xl font-black text-green-600 flex items-center gap-2">
                <Gem size={24} fill="currentColor" />
                {totalGained}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-600">{t('tokenLog.totalSpent')}</div>
              <div className="text-3xl font-black text-red-600 flex items-center gap-2">
                <Gem size={24} fill="currentColor" />
                {totalSpent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-slate-600" />
          <div className="flex gap-2">
            {[
              { value: 'all', label: t('tokenLog.allTransactions') },
              { value: 'gains', label: t('tokenLog.gains') },
              { value: 'spends', label: t('tokenLog.spends') }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  filter === opt.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b-2 border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {tf('tokenLog.recentTransactionsCount', { count: filteredHistory.length })}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex justify-center py-12">
              <ChemistryLoading persistKey="token_log" className="text-center" showText={false} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {filter === 'all' 
                  ? t('tokenLog.noTransactionsYet')
                  : (filter === 'gains' ? t('tokenLog.noEarningsYet') : t('tokenLog.noPurchasesYet'))
                }
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {t('tokenLog.completeQuizzesToEarn')}
              </p>
            </div>
          ) : (
            filteredHistory.map((entry, index) => {
              const isGain = entry.type === 'gain';
              const amount = Math.abs(entry.amount);

              return (
                <div
                  key={entry.id || index}
                  className="p-4 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`p-3 rounded-lg ${
                        isGain ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isGain ? (
                          <TrendingUp className="text-green-600" size={20} />
                        ) : (
                          <TrendingDown className="text-red-600" size={20} />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 mb-1">
                          {entry.reason}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <Clock size={12} />
                          {formatTimeAgo(entry.timestamp)}
                          {entry.metadata?.category && (
                            <>
                              <span>•</span>
                              <span className="capitalize">
                                {entry.metadata.category.replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-black ${
                        isGain ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isGain ? '+' : '-'}{amount}
                      </div>
                      <Gem 
                        size={20} 
                        className={isGain ? 'text-green-600' : 'text-red-600'}
                        fill="currentColor"
                      />
                    </div>
                  </div>

                  {/* Balance After */}
                  {entry.balanceAfter !== undefined && (
                    <div className="mt-2 text-xs text-slate-400 text-right">
                      {tf('tokenLog.balanceAfterTokens', { balance: entry.balanceAfter })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}