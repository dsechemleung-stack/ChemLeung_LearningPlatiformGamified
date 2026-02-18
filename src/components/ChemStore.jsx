// ============================================================================
// CHEMSTORE - Token Economy Shop
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { purchaseItem, equipItem } from '../services/tokenService';
import { STORE_ITEMS, RARITY_COLORS, RARITY_BORDER, RARITY_LABELS } from '../utils/storeItems';
import { ArrowLeft, ShoppingBag, Sparkles, Check, Lock, Gem } from 'lucide-react';
import TokenRulesModal from './TokenRulesModal';

export default function ChemStore() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('profilePics');
  const [purchasing, setPurchasing] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showRules, setShowRules] = useState(false);

  const tokens = userProfile?.tokens || 0;
  const inventory = userProfile?.inventory || [];
  const equipped = userProfile?.equipped || {};

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle purchase
  const handlePurchase = async (item) => {
    if (purchasing) return;
    
    if (tokens < item.price) {
      showNotification(t('store.notEnoughTokens'), 'error');
      return;
    }

    setPurchasing(item.id);

    try {
      const result = await purchaseItem(currentUser.uid, item.id, item.price);
      
      if (result.success) {
        showNotification(t('store.purchased').replace('{name}', item.name), 'success');
      } else {
        showNotification(result.error || t('store.purchaseFailed'), 'error');
      }
    } catch (error) {
      showNotification(t('store.pleaseTryAgain'), 'error');
    }

    setPurchasing(null);
  };

  // Handle equip
  const handleEquip = async (item) => {
    try {
      const slot = item.category;
      const result = await equipItem(currentUser.uid, item.id, slot);
      
      if (result.success) {
        showNotification(t('store.equipped').replace('{name}', item.name), 'success');
      } else {
        showNotification(result.error || t('store.failedToEquip'), 'error');
      }
    } catch (error) {
      showNotification(t('store.failedToEquipItem'), 'error');
    }
  };

  const categories = [
    { key: 'profilePics', label: t('store.profilePics'), icon: '🎭' },
    { key: 'badges', label: t('store.badges'), icon: '🏅' },
    { key: 'themes', label: t('store.themes'), icon: '🎨' }
  ];

  const currentItems = STORE_ITEMS[selectedCategory] || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-2xl animate-in slide-in-from-top-2 ${
          notification.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
            : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
        }`}>
          <p className="font-bold">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-lab-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 receipt-widget">
          <div className="receipt-perforation" />
          <div className="receipt-widget-content p-6">
            <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 bellmt-title ink-amber">
              <ShoppingBag size={32} className="text-amber-700" />
              {t('store.title')}
            </h1>
            <p className="text-slate-700 mt-1 font-semibold">
              {t('store.subtitle')}
            </p>
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="mt-3 receipt-rule" />
                <p className="mt-3 text-sm text-slate-700 font-medium">
                  {t('store.subtitle')}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                  {t('store.yourBalance')}
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <Gem size={20} className="text-amber-600" fill="currentColor" />
                  <span className="text-3xl font-black text-slate-900 tabular-nums">
                    {tokens}
                  </span>
                </div>
                <div className="mt-3 receipt-rule" />
                <div className="mt-2 font-mono text-[11px] text-slate-500">
                  #{String(currentUser?.uid || '').slice(0, 6).toUpperCase()} · {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="w-12 h-12 bg-white rounded-xl border-2 border-slate-200 hover:border-lab-blue transition-all flex items-center justify-center font-black text-lab-blue hover:scale-110 active:scale-105"
          title={t('store.howToEarnTokens')}
        >
          ?
        </button>
      </div>

      <TokenRulesModal open={showRules} onClose={() => setShowRules(false)} />

      {/* Category Tabs */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
        <div className="flex border-b-2 border-slate-200">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex-1 px-6 py-4 font-bold text-base transition-all flex items-center justify-center gap-2 ${
                selectedCategory === cat.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map(item => {
              const owned = inventory.includes(item.id);
              const isEquipped = equipped[item.category] === item.id;
              const canAfford = tokens >= item.price;
              const isFree = item.price === 0;

              return (
                <div
                  key={item.id}
                  className={`relative bg-white rounded-2xl border-4 ${RARITY_BORDER[item.rarity]} overflow-hidden transition-all hover:scale-105 hover:shadow-2xl group`}
                >
                  {/* Rarity Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r ${RARITY_COLORS[item.rarity]} shadow-lg z-10 flex items-center gap-1`}>
                    <Sparkles size={12} />
                    {RARITY_LABELS[item.rarity]}
                  </div>

                  {/* Item Icon */}
                  <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                    {item.category === 'theme' ? (
                      <div className="w-32 h-32 rounded-2xl shadow-2xl" style={{ background: item.preview }}></div>
                    ) : (
                      <div className="text-8xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-black text-slate-800 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      {item.description}
                    </p>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gem size={20} className="text-amber-500" fill="currentColor" />
                        <span className="text-2xl font-black text-slate-800">
                          {item.price === 0 ? 'FREE' : item.price}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {owned ? (
                        isEquipped ? (
                          <button
                            disabled
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold cursor-default"
                          >
                            <Check size={16} />
                            {t('store.equipped')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(item)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-bold hover:opacity-90 transition-all"
                          >
                            <Sparkles size={16} />
                            {t('store.equip')}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={!canAfford || purchasing === item.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                            canAfford
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {purchasing === item.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              {t('store.buying')}
                            </>
                          ) : !canAfford && !isFree ? (
                            <>
                              <Lock size={16} />
                              {t('store.locked')}
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={16} />
                              {isFree ? t('store.claim') : t('store.buy')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">{t('store.comingSoon')}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}