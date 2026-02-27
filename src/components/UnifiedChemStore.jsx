// src/components/UnifiedChemStore.jsx
// Unified ChemStore: ChemCards tab + Cosmetics tab (Ticket Store + Gacha Machine)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChemCityStore } from '../store/chemcityStore';
import { getEffectiveCoinPrice } from '../lib/chemcity/shop';
import {
  countdownToMidnight,
  STORE_SLOT_UNLOCK_COSTS,
  STORE_MAX_SLOTS,
} from '../lib/chemcity/dailyStore';
import {
  callChemCityBuyTickets,
  callChemCityPurchaseCosmetic,
} from '../lib/chemcity/cloudFunctions';
import { PurchaseConfirmModal } from './chemcity/PurchaseConfirmModal';
import ChemistryLoading from './ChemistryLoading';
import {
  ArrowLeft,
  Coins,
  Gem,
  Ticket,
  ShoppingBag,
  Sparkles,
  FlaskConical,
  Clock,
  Lock,
  Plus,
  Tag,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Archive,
} from 'lucide-react';

const RARITY_CFG = {
  common: { border: '#94a3b8', glow: 'rgba(148,163,184,0.2)', bg: 'linear-gradient(165deg,#1e293b,#0f172a)', badge: 'rgba(148,163,184,0.2)', text: '#94a3b8', stars: 1 },
  uncommon: { border: '#34d399', glow: 'rgba(52,211,153,0.28)', bg: 'linear-gradient(165deg,#0f3d33,#071a16)', badge: 'rgba(52,211,153,0.18)', text: '#34d399', stars: 2 },
  rare: { border: '#60a5fa', glow: 'rgba(96,165,250,0.35)', bg: 'linear-gradient(165deg,#1e3a5f,#0f172a)', badge: 'rgba(96,165,250,0.2)', text: '#60a5fa', stars: 2 },
  epic: { border: '#a855f7', glow: 'rgba(168,85,247,0.35)', bg: 'linear-gradient(165deg,#2d1b4e,#0f0a1e)', badge: 'rgba(168,85,247,0.2)', text: '#a855f7', stars: 3 },
  legendary: { border: '#fbbf24', glow: 'rgba(251,191,36,0.45)', bg: 'linear-gradient(165deg,#3d2800,#1a0f00)', badge: 'rgba(251,191,36,0.2)', text: '#fbbf24', stars: 4 },
};

function needsAnonymousCrossOrigin(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

function StoreCard({ item, idx, ownedSet, user, onCardClick }) {
  const isOwned = ownedSet.has(item.id);
  const rarityKey = (() => {
    const r = String(item?.rarity ?? '').toLowerCase();
    if (r === 'common' || r === 'uncommon' || r === 'rare' || r === 'epic' || r === 'legendary') return r;
    return 'common';
  })();
  const cfg = RARITY_CFG[rarityKey] ?? RARITY_CFG.common;
  const rawCoin = item.shopData?.coinCost;
  const effCoin = rawCoin != null ? getEffectiveCoinPrice(rawCoin, user?.activeBonuses ?? null) : null;
  const coinSaved = rawCoin != null && effCoin != null ? rawCoin - effCoin : 0;
  const isLegendary = rarityKey === 'legendary';
  const formulaText = String(item?.chemicalFormula ?? '');
  const shouldMarquee = formulaText.length >= 18;

  const CARD_W = 162;
  const CARD_H = 242;
  const ART_H = 132;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: CARD_W + 10 }}>
      <button
        onClick={() => onCardClick(item.id)}
        style={{
          position: 'relative',
          width: '100%', maxWidth: CARD_W, height: CARD_H,
          borderRadius: 14,
          border: `2px solid ${cfg.border}`,
          background: cfg.bg,
          boxShadow: isLegendary
            ? `0 0 28px ${cfg.glow}, 0 6px 20px rgba(0,0,0,0.6)`
            : `0 0 14px ${cfg.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
          cursor: 'pointer', overflow: 'hidden', padding: 0,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          animation: isLegendary ? 'legendGlow 2.5s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {isLegendary && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'linear-gradient(105deg,transparent 30%,rgba(255,215,0,0.12) 50%,transparent 70%)',
            animation: 'shimmerSlide 3s ease-in-out infinite',
          }} />
        )}
        <div style={{ position: 'absolute', top: 6, left: 8, zIndex: 3, color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, fontFamily: "'Quicksand',sans-serif" }}>#{idx + 1}</div>
        <div style={{ position: 'absolute', top: 5, right: 7, zIndex: 3, color: cfg.text, fontSize: 8, letterSpacing: 1 }}>{'✦'.repeat(cfg.stars)}</div>
        <div style={{
          position: 'absolute', top: 16, right: 7, zIndex: 3,
          background: cfg.badge,
          border: `1px solid ${cfg.border}`,
          borderRadius: 999,
          padding: '2px 6px',
          fontSize: 8,
          fontWeight: 900,
          color: cfg.text,
          fontFamily: "'Quicksand',sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1.1,
        }}>{rarityKey}</div>
        <div style={{
          height: ART_H, margin: '34px 10px 6px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${cfg.border}`,
          borderRadius: 8,
          position: 'relative', zIndex: 2,
          overflow: 'hidden',
        }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl} alt={item.name}
              style={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '90%', 
                maxHeight: '90%', 
                width: 'auto', 
                height: 'auto',
                display: 'block'
              }}
              {...(needsAnonymousCrossOrigin(item.imageUrl) ? { crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' } : {})}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 48 
            }}>{item.emoji}</span>
          )}
        </div>
        <div style={{
          margin: '0 10px',
          background: 'rgba(0,0,0,0.22)',
          border: `1px solid rgba(255,255,255,0.10)`,
          borderRadius: 10,
          padding: '6px 8px',
          backdropFilter: 'blur(6px)',
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0, textAlign: 'center' }}>
              <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 900, fontFamily: "'Quicksand',sans-serif", lineHeight: 1.2, paddingBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
              {shouldMarquee ? (
                <div className="chemcity-marquee" style={{
                  marginTop: 2,
                  height: 28,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}>
                  <div className="chemcity-marquee__track" style={{
                    display: 'inline-flex',
                    alignItems: 'flex-end',
                    gap: 18,
                  }}>
                    <span className="chemcity-marquee__text" style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "'Quicksand',sans-serif",
                      lineHeight: '24px',
                      paddingBottom: 4,
                    }}>{formulaText}</span>
                    <span className="chemcity-marquee__text" style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "'Quicksand',sans-serif",
                      lineHeight: '24px',
                      paddingBottom: 4,
                    }}>{formulaText}</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  color: 'rgba(255,255,255,0.70)',
                  fontSize: 10,
                  fontWeight: 800,
                  fontFamily: "'Quicksand',sans-serif",
                  marginTop: 2,
                  lineHeight: '24px',
                  minHeight: 28,
                  paddingBottom: 4,
                  display: 'block',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {formulaText || '—'}
                </div>
              )}
            </div>
          </div>
        </div>
        {isOwned && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4,
            pointerEvents: 'none',
          }}>
            <div style={{ background: 'rgba(52,211,153,0.9)', borderRadius: 8, padding: '6px 14px', fontWeight: 800, fontSize: 12, color: '#052e16', fontFamily: "'Quicksand',sans-serif", pointerEvents: 'auto' }}>✓ Owned</div>
          </div>
        )}
      </button>
      <div
        onClick={() => onCardClick(item.id)}
        style={{ textAlign: 'center', width: '100%', cursor: 'pointer' }}
        role="button"
      >
        {effCoin != null && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 12,
                background: '#76A8A5',
              }}>
                <Coins size={12} color="#fbbf24" />
                <span style={{
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: 13,
                  fontFamily: "'Quicksand',sans-serif",
                }}>{effCoin.toLocaleString()}</span>
              </span>
            </div>
            {coinSaved > 0 && (
              <div style={{ color: 'rgba(15,23,42,0.45)', fontSize: 10, textDecoration: 'line-through', fontFamily: "'Quicksand',sans-serif", marginTop: 2 }}>{rawCoin.toLocaleString()}</div>
            )}
          </div>
        )}
        {item.shopData?.diamondCost != null && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 12,
              background: '#0e7490',
            }}>
              <Gem size={11} color="#67e8f9" />
              <span style={{
                color: '#ffffff',
                fontWeight: 900,
                fontSize: 13,
                fontFamily: "'Quicksand',sans-serif",
              }}>{item.shopData.diamondCost.toLocaleString()}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChemCardsTab() {
  const user = useChemCityStore((s) => s.user);
  const dailyStoreItems = useChemCityStore((s) => s.dailyStoreItems);
  const storeSlotCount = useChemCityStore((s) => s.storeSlotCount);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const openPurchaseConfirm = useChemCityStore((s) => s.openPurchaseConfirm);
  const unlockStoreSlot = useChemCityStore((s) => s.unlockStoreSlot);
  const collections = useChemCityStore((s) => s.collections);

  const [countdown, setCountdown] = useState(() => countdownToMidnight());
  const [unlockingSlot, setUnlockingSlot] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setCountdown(countdownToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const discount = user?.activeBonuses?.shopDiscountPercent ?? 0;
  const coins = user?.currencies?.coins ?? 0;
  const ownedSet = new Set(user?.ownedItems ?? []);
  const purchasableCount = React.useMemo(() => {
    return (slimItems || []).filter((i) => !i?.deprecated && (i?.shopData?.coinCost != null || i?.shopData?.diamondCost != null)).length;
  }, [slimItems]);

  const nextSlotNum = storeSlotCount + 1;
  const nextSlotCost = STORE_SLOT_UNLOCK_COSTS[nextSlotNum] ?? null;
  const canUnlockMore = storeSlotCount < STORE_MAX_SLOTS;
  const canAffordNext = nextSlotCost != null && coins >= nextSlotCost;

  const handleUnlockSlot = async () => {
    if (unlockingSlot || !canUnlockMore || !canAffordNext) return;
    setUnlockingSlot(true);
    setUnlockError(null);
    try { await unlockStoreSlot(); }
    catch (err) { setUnlockError(err?.message ?? 'Failed to unlock slot.'); }
    finally { setUnlockingSlot(false); }
  };

  return (
    <div style={{ padding: '0 20px 20px', fontFamily: "'Quicksand',sans-serif" }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, padding: '12px 16px',
        background: 'rgba(118,168,165,0.08)', border: '1px solid rgba(118,168,165,0.2)',
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="#2d4a3e" />
          <span style={{ color: '#2d4a3e', fontSize: 12, fontWeight: 900 }}>Resets in {countdown}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(52,211,153,0.15)', border: '1.5px solid rgba(52,211,153,0.4)', borderRadius: 20, padding: '4px 10px' }}>
            <Tag size={12} color="#34d399" />
            <span style={{ color: '#34d399', fontWeight: 800, fontSize: 12 }}>{discount}% OFF</span>
          </div>
        )}
      </div>

      {dailyStoreItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
          <ShoppingBag size={40} color="rgba(45,74,62,0.35)" />
          <p style={{ color: 'rgba(15,23,42,0.55)', fontSize: 14, fontWeight: 800, textAlign: 'center', margin: 0 }}>
            {slimItems.length === 0
              ? 'No ChemCard catalog loaded.'
              : purchasableCount === 0
                ? 'No purchasable ChemCards found in catalog.'
                : 'Loading store…'}
          </p>
          <p style={{ color: 'rgba(15,23,42,0.45)', fontSize: 12, fontWeight: 700, textAlign: 'center', margin: 0 }}>
            {slimItems.length === 0
              ? 'Check the CSV URL / CORS / column headers (open DevTools Console).'
              : purchasableCount === 0
                ? 'Ensure your CSV has coinCost/diamondCost (or shopCoinCost/shopDiamondCost) columns.'
                : 'Please wait…'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          justifyItems: 'center',
          marginBottom: 20,
        }}>
          {dailyStoreItems.map((item, idx) => (
            <StoreCard
              key={item.id}
              item={item}
              idx={idx}
              ownedSet={ownedSet}
              user={user}
              onCardClick={openPurchaseConfirm}
            />
          ))}
        </div>
      )}

      {canUnlockMore && (
        <div style={{ marginTop: 8 }}>
          <p style={{ color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>
            Unlock more slots to see more cards daily
          </p>
          <button
            onClick={handleUnlockSlot}
            disabled={!canAffordNext || unlockingSlot}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 14, border: '2px dashed',
              borderColor: canAffordNext && !unlockingSlot ? 'rgba(118,168,165,0.5)' : 'rgba(15,23,42,0.12)',
              background: canAffordNext && !unlockingSlot ? 'rgba(118,168,165,0.08)' : 'rgba(15,23,42,0.02)',
              cursor: canAffordNext && !unlockingSlot ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s', fontFamily: "'Quicksand',sans-serif",
            }}
          >
            <div style={{ width: 32, height: 32, background: canAffordNext ? 'rgba(118,168,165,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unlockingSlot
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#76A8A5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <Lock size={14} color={canAffordNext ? '#76A8A5' : '#64748b'} />
              }
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: canAffordNext ? '#0f172a' : '#64748b', fontWeight: 900, fontSize: 13 }}>Unlock Slot #{nextSlotNum}</div>
              {nextSlotCost != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: canAffordNext ? '#76A8A5' : 'rgba(148,163,184,0.3)',
                  }}>
                    <Coins size={11} color={canAffordNext ? '#fbbf24' : '#cbd5e1'} />
                    <span style={{
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: 12,
                    }}>
                      {nextSlotCost.toLocaleString()}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <Plus size={16} color={canAffordNext ? '#76A8A5' : '#64748b'} style={{ marginLeft: 'auto' }} />
          </button>
          {unlockError && <p style={{ color: '#f87171', fontSize: 11, textAlign: 'center', marginTop: 6 }}>{unlockError}</p>}
        </div>
      )}
    </div>
  );
}

function CosmeticsTab() {
  const navigate = useNavigate();
  const user = useChemCityStore((s) => s.user);
  const cosmeticsMap = useChemCityStore((s) => s.cosmeticsMap);

  const [ticketStoreOpen, setTicketStoreOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(null);
  const [notification, setNotification] = useState(null);

  const coins = user?.currencies?.coins ?? 0;
  const tickets = user?.currencies?.tickets ?? 0;
  const ownedSet = new Set(user?.ownedCosmetics ?? []);

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuyTickets = async (count) => {
    if (purchasing) return;
    setPurchasing(`tickets_${count}`);
    try {
      await callChemCityBuyTickets({ count });
      showNotif(`Bought ${count} ticket${count > 1 ? 's' : ''}!`);
    } catch (e) {
      showNotif(e?.message || 'Failed to buy tickets', 'error');
    }
    setPurchasing(null);
  };

  const handleBuyCosmetic = async (cosmeticId, currency) => {
    if (purchasing) return;
    setPurchasing(cosmeticId);
    try {
      await callChemCityPurchaseCosmetic({ cosmeticId, currency });
      showNotif('Cosmetic added to your collection!');
    } catch (e) {
      showNotif(e?.message || 'Purchase failed', 'error');
    }
    setPurchasing(null);
  };

  const shopCosmetics = cosmeticsMap
    ? Array.from(cosmeticsMap.values()).filter((c) => c?.availability?.channels?.shop === true && !c?.deprecated)
    : [];

  const TICKET_PACKAGES = [
    { count: 1, cost: 250, label: 'Single Pull' },
    { count: 10, cost: 2500, label: '10-Pull Bundle' },
    { count: 50, cost: 12500, label: 'Mega Bundle' },
  ];

  return (
    <div style={{ padding: '0 20px 20px', fontFamily: "'Quicksand',sans-serif" }}>
      {notification && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 100,
          padding: '12px 20px', borderRadius: 12,
          background: notification.type === 'success' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
          color: '#fff', fontWeight: 800, fontSize: 13, fontFamily: "'Quicksand',sans-serif",
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeInDown 0.3s ease',
        }}>{notification.message}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setTicketStoreOpen((v) => !v)}
          style={{
            width: '100%', padding: '18px 16px',
            background: ticketStoreOpen
              ? 'linear-gradient(135deg, rgba(118,168,165,0.18), rgba(197,215,181,0.18))'
              : 'rgba(118,168,165,0.10)',
            border: `2px solid ${ticketStoreOpen ? 'rgba(118,168,165,0.55)' : 'rgba(118,168,165,0.25)'}`,
            borderRadius: 16, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            transition: 'all 0.2s', fontFamily: "'Quicksand',sans-serif",
          }}
        >
          <div style={{ width: 48, height: 48, background: 'rgba(118,168,165,0.16)', border: '2px solid rgba(118,168,165,0.30)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ticket size={24} color="#76A8A5" />
          </div>
          <div>
            <div style={{ color: '#2d4a3e', fontWeight: 900, fontSize: 14 }}>Ticket Store</div>
            <div style={{ color: 'rgba(45,74,62,0.65)', fontSize: 11, fontWeight: 700 }}>Buy with coins</div>
          </div>
          <div style={{ color: '#2d4a3e', marginTop: 2 }}>
            {ticketStoreOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <button
          onClick={() => navigate('/gacha')}
          style={{
            padding: '18px 16px',
            background: 'linear-gradient(135deg, rgba(118,168,165,0.14), rgba(197,215,181,0.14))',
            border: '2px solid rgba(118,168,165,0.28)',
            borderRadius: 16, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            transition: 'all 0.2s ease', fontFamily: "'Quicksand',sans-serif",
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(118,168,165,0.20), rgba(197,215,181,0.20))'; e.currentTarget.style.borderColor = 'rgba(118,168,165,0.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(118,168,165,0.14), rgba(197,215,181,0.14))'; e.currentTarget.style.borderColor = 'rgba(118,168,165,0.28)'; }}
        >
          <div style={{ width: 48, height: 48, background: 'rgba(118,168,165,0.16)', border: '2px solid rgba(118,168,165,0.35)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color="#76A8A5" />
          </div>
          <div>
            <div style={{ color: '#2d4a3e', fontWeight: 900, fontSize: 14 }}>Gacha Machine</div>
            <div style={{ color: 'rgba(45,74,62,0.65)', fontSize: 11, fontWeight: 700 }}>Pull for cosmetics</div>
          </div>
          <div style={{ color: '#2d4a3e', fontSize: 10, fontWeight: 900, background: 'rgba(118,168,165,0.14)', borderRadius: 20, padding: '3px 10px', border: '1px solid rgba(118,168,165,0.25)' }}>
            Open →
          </div>
        </button>
      </div>

      {ticketStoreOpen && (
        <div style={{
          marginTop: 8, background: '#ffffff',
          border: '2px solid rgba(118,168,165,0.25)',
          borderRadius: 16, overflow: 'hidden',
          animation: 'fadeInDown 0.2s ease',
        }}>
          {TICKET_PACKAGES.map((pkg) => {
            const canAfford = coins >= pkg.cost;
            const isLoading = purchasing === `tickets_${pkg.count}`;
            return (
              <div key={pkg.count} style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 900, fontSize: 13 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Ticket size={13} color="#76A8A5" />
                      {pkg.count} {pkg.count === 1 ? 'Ticket' : 'Tickets'}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: 700 }}>{pkg.label}</div>
                </div>
                <button
                  onClick={() => handleBuyTickets(pkg.count)}
                  disabled={!canAfford || !!purchasing}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none',
                    background: canAfford
                      ? 'linear-gradient(135deg,#76A8A5,#5d9794)'
                      : 'rgba(15,23,42,0.06)',
                    color: canAfford ? '#fff' : '#64748b',
                    fontWeight: 800, fontSize: 12, cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: "'Quicksand',sans-serif",
                    display: 'flex', alignItems: 'center', gap: 5,
                    minWidth: 90, justifyContent: 'center',
                  }}
                >
                  {isLoading ? (
                    <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <>
                      <Coins size={12} color={canAfford ? '#fbbf24' : '#64748b'} />
                      {pkg.cost.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            );
          })}
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: 800 }}>Your tickets</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Ticket size={13} color="#76A8A5" />
              <span style={{ color: '#2d4a3e', fontWeight: 900, fontSize: 14 }}>{tickets.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnifiedChemStore() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const user = useChemCityStore((s) => s.user);
  const isLoading = useChemCityStore((s) => s.isLoading);
  const error = useChemCityStore((s) => s.error);
  const loadAll = useChemCityStore((s) => s.loadAll);
  const loadGachaStatic = useChemCityStore((s) => s.loadGachaStatic);
  const devRefreshStaticData = useChemCityStore((s) => s.devRefreshStaticData);

  const [activeTab, setActiveTab] = useState('chemcards');

  useEffect(() => {
    if (currentUser?.uid && !user && !isLoading) {
      loadAll(currentUser.uid);
    }
  }, [currentUser?.uid, user, isLoading, loadAll]);

  useEffect(() => {
    loadGachaStatic();
  }, [loadGachaStatic]);

  const coins = user?.currencies?.coins ?? 0;
  const diamonds = Number(userProfile?.tokens ?? 0);
  const tickets = user?.currencies?.tickets ?? 0;
  const discount = user?.activeBonuses?.shopDiscountPercent ?? 0;

  const showDevControls = false;

  if (isLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f9f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Quicksand',sans-serif" }}>
        <ChemistryLoading persistKey="chemstore" className="text-center" textOverride="Loading ChemStore…" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f9f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Quicksand',sans-serif", padding: 16 }}>
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-6 text-center max-w-md w-full">
          <div className="font-black text-red-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl font-black bg-slate-900 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800;900&display=swap');
        @keyframes shimmerSlide { 0%,100%{transform:translateX(-200%)} 50%{transform:translateX(200%)} }
        @keyframes legendGlow { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.35),0 4px 12px rgba(0,0,0,0.5)} 50%{box-shadow:0 0 36px rgba(251,191,36,0.65),0 4px 16px rgba(0,0,0,0.6)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes chemcityMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .chemcity-marquee__track { animation: chemcityMarquee 10s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .chemcity-marquee__track { animation: none !important; }
        }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
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
                ChemStore
              </h1>
              <p className="text-slate-700 mt-1 font-semibold">Expand your collection</p>

              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="mt-3 receipt-rule" />
                  <p className="mt-3 text-sm text-slate-700 font-medium">
                    Daily store + ticket shop + cosmetics.
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                    Your Balance
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black tabular-nums inline-flex items-center gap-2">
                      <Gem size={14} className="text-cyan-500" />
                      {diamonds} diamonds
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black tabular-nums inline-flex items-center gap-2">
                      <Coins size={14} className="text-amber-500" />
                      {coins} coins
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-black tabular-nums inline-flex items-center gap-2">
                      <Ticket size={14} className="text-teal-600" />
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

          {showDevControls && (
            <button
              onClick={devRefreshStaticData}
              className="px-4 py-3 bg-white rounded-xl border-2 border-slate-200 hover:border-lab-blue transition-all font-black text-slate-800"
              title="DEV: refresh ChemCity static data"
              type="button"
            >
              Refresh
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="flex items-stretch border-b-2 border-slate-200">
            <button
              onClick={() => setActiveTab('chemcards')}
              className={`flex-1 px-6 py-4 font-bold text-base transition-all flex items-center justify-center gap-2 ${
                activeTab === 'chemcards'
                  ? 'bg-gradient-to-r from-[#76A8A5] to-[#C5D7B5] text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FlaskConical size={18} />
              ChemCards
            </button>
            <button
              onClick={() => setActiveTab('cosmetics')}
              className={`flex-1 px-6 py-4 font-bold text-base transition-all flex items-center justify-center gap-2 ${
                activeTab === 'cosmetics'
                  ? 'bg-gradient-to-r from-[#76A8A5] to-[#C5D7B5] text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles size={18} />
              Cosmetics
            </button>

            <div className="flex items-center px-4 border-l-2 border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => navigate('/inventory', { state: { tab: activeTab === 'chemcards' ? 'chemcards' : 'wardrobe' } })}
                className="px-4 py-2 rounded-xl font-black transition-all active:scale-[0.99] bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50"
                title="Open Inventory"
              >
                <span className="inline-flex items-center gap-2">
                  <Archive size={16} />
                  Inventory
                </span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'chemcards' ? <ChemCardsTab /> : <CosmeticsTab />}
          </div>
        </div>

        <PurchaseConfirmModal />
      </div>
    </>
  );
}
