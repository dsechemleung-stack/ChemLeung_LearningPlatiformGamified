// ============================================================================
// CHEMSTORE - Token Economy Shop
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getCosmeticsMap } from '../lib/chemcity/gachaStaticCache';
import { callChemCityBuyTickets, callChemCityPurchaseCosmetic } from '../lib/chemcity/cloudFunctions';

export default function ChemStore() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('tickets');
  const [purchasing, setPurchasing] = useState(null);
  const [notification, setNotification] = useState(null);

  const [cosmeticsMap, setCosmeticsMap] = useState(null);

  const chemcity = userProfile?.chemcity || {};
  const currencies = chemcity?.currencies || {};
  const coins = Number(currencies.coins || 0);
  const tickets = Number(currencies.tickets || 0);
  const ownedCosmetics = Array.isArray(chemcity?.ownedCosmetics) ? chemcity.ownedCosmetics.map(String) : [];
  const ownedCosmeticsSet = new Set(ownedCosmetics);

  const gender = userProfile?.gender || 'boy';

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    let mounted = true;
    getCosmeticsMap()
      .then((m) => {
        if (!mounted) return;
        setCosmeticsMap(m);
      })
      .catch(() => {
        if (!mounted) return;
        setCosmeticsMap(new Map());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const categories = [
    { key: 'tickets', label: 'Tickets', icon: '🎟️' },
    { key: 'avatars', label: 'Avatars', icon: '🧑' },
    { key: 'backgrounds', label: 'Backgrounds', icon: '🖼️' },
  ];

  const allCosmetics = cosmeticsMap ? Array.from(cosmeticsMap.values()) : [];
  const shopCosmetics = allCosmetics.filter((c) => c?.availability?.channels?.shop === true && c?.deprecated !== true);
  const currentCosmetics =
    selectedCategory === 'avatars'
      ? shopCosmetics.filter((c) => c.type === 'avatar')
      : selectedCategory === 'backgrounds'
        ? shopCosmetics.filter((c) => c.type === 'background')
        : [];

  const handleBuyTickets = async (count) => {
    if (purchasing) return;
    setPurchasing(`tickets_${count}`);
    try {
      await callChemCityBuyTickets({ count });
      showNotification(`Bought ${count} tickets`, 'success');
    } catch (e) {
      showNotification(e?.message || 'Failed to buy tickets', 'error');
    }
    setPurchasing(null);
  };

  const handleBuyCosmetic = async (cosmetic, currency) => {
    if (purchasing) return;
    setPurchasing(cosmetic.id);
    try {
      await callChemCityPurchaseCosmetic({ cosmeticId: cosmetic.id, currency });
      showNotification(`Purchased ${cosmetic.name}`, 'success');
    } catch (e) {
      showNotification(e?.message || 'Purchase failed', 'error');
    }
    setPurchasing(null);
  };

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
                <div className="mt-2 flex items-center justify-end gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black tabular-nums">
                    {coins} coins
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black tabular-nums">
                    {tickets} tickets
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
      </div>

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
          {selectedCategory === 'tickets' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 10, 50].map((count) => {
                const cost = 250 * count;
                const canAfford = coins >= cost;
                return (
                  <div
                    key={count}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm"
                  >
                    <div className="text-2xl font-black text-slate-900">{count} Tickets</div>
                    <div className="mt-1 text-slate-600 font-semibold">Cost: {cost} coins</div>
                    <button
                      onClick={() => handleBuyTickets(count)}
                      disabled={!canAfford || purchasing === `tickets_${count}`}
                      className={`mt-4 w-full px-4 py-3 rounded-xl font-black transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {purchasing === `tickets_${count}` ? 'Buying...' : canAfford ? 'Buy' : 'Not enough coins'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentCosmetics.map((cosmetic) => {
                const owned = ownedCosmeticsSet.has(cosmetic.id);
                const coinCost = Number(cosmetic?.shopData?.coinCost || 0);
                const canBuyWithCoins = Number.isFinite(coinCost) && coinCost > 0;
                const canAfford = canBuyWithCoins ? coins >= coinCost : false;

                return (
                  <div
                    key={cosmetic.id}
                    className="relative bg-white rounded-2xl border-2 border-slate-200 overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="p-4 bg-slate-50 flex items-center justify-center">
                      {cosmetic.type === 'background' ? (
                        <img
                          src={cosmetic.imageUrl}
                          alt=""
                          className="w-full h-40 object-cover rounded-xl"
                          draggable={false}
                        />
                      ) : (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gradient-to-b from-indigo-900 to-gray-900">
                          <img
                            src={cosmetic.imageUrl}
                            alt=""
                            draggable={false}
                            className="absolute bottom-0 left-0 h-full w-[200%] object-contain"
                            style={{ transform: gender === 'girl' ? 'translateX(-50%)' : 'translateX(0%)' }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="text-lg font-black text-slate-900 truncate">{cosmetic.name}</div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-slate-700 font-black tabular-nums">
                          {canBuyWithCoins ? `${coinCost} coins` : 'Not for sale'}
                        </div>

                        {owned ? (
                          <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-black text-sm">
                            Owned
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBuyCosmetic(cosmetic, 'coins')}
                            disabled={!canBuyWithCoins || !canAfford || purchasing === cosmetic.id}
                            className={`px-4 py-2 rounded-xl font-black transition-all ${
                              canBuyWithCoins && canAfford
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {purchasing === cosmetic.id ? 'Buying...' : canBuyWithCoins ? 'Buy' : 'Locked'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {currentCosmetics.length === 0 && (
                <div className="text-center py-12 col-span-full">
                  <p className="text-slate-400 text-lg">No items for sale yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}