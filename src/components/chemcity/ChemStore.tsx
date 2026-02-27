import React, { useEffect, useState } from 'react';
import { X, ShoppingBag, Clock, Lock, Plus, Coins, Gem, Tag, RefreshCw } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { getEffectiveCoinPrice } from '../../lib/chemcity/shop';
import { countdownToMidnight, STORE_SLOT_UNLOCK_COSTS, STORE_MAX_SLOTS } from '../../lib/chemcity/dailyStore';
import type { SlimItemDocument } from '../../lib/chemcity/types';

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

// Preload card images in the background
function preloadCardImages(items: SlimItemDocument[]) {
  items.forEach(item => {
    if (item.imageUrl) {
      const img = new Image();
      if (needsAnonymousCrossOrigin(item.imageUrl)) {
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
      }
      img.src = item.imageUrl;
    }
  });
}

const RARITY_CONFIG: Record<string, {
  borderColor: string; glowColor: string; bgGradient: string; artBg: string;
  badgeColor: string; badgeText: string; labelBg: string;
}> = {
  common:    { borderColor: '#94a3b8', glowColor: 'rgba(148,163,184,0.2)', bgGradient: 'linear-gradient(165deg,#1e293b,#0f172a)', artBg: 'rgba(255,255,255,0.04)', badgeColor: 'rgba(148,163,184,0.2)', badgeText: '#94a3b8', labelBg: 'rgba(148,163,184,0.15)' },
  uncommon:  { borderColor: '#34d399', glowColor: 'rgba(52,211,153,0.28)',  bgGradient: 'linear-gradient(165deg,#0f3d33,#071a16)', artBg: 'rgba(52,211,153,0.06)',  badgeColor: 'rgba(52,211,153,0.18)', badgeText: '#34d399', labelBg: 'rgba(52,211,153,0.14)' },
  rare:      { borderColor: '#60a5fa', glowColor: 'rgba(96,165,250,0.35)',  bgGradient: 'linear-gradient(165deg,#1e3a5f,#0f172a)', artBg: 'rgba(96,165,250,0.07)',  badgeColor: 'rgba(96,165,250,0.2)',  badgeText: '#60a5fa', labelBg: 'rgba(96,165,250,0.15)'  },
  epic:      { borderColor: '#a855f7', glowColor: 'rgba(168,85,247,0.35)',  bgGradient: 'linear-gradient(165deg,#2d1b4e,#0f0a1e)', artBg: 'rgba(168,85,247,0.07)',  badgeColor: 'rgba(168,85,247,0.2)',  badgeText: '#a855f7', labelBg: 'rgba(168,85,247,0.15)' },
  legendary: { borderColor: '#fbbf24', glowColor: 'rgba(251,191,36,0.45)',  bgGradient: 'linear-gradient(165deg,#3d2800,#1a0f00)', artBg: 'rgba(251,191,36,0.09)',  badgeColor: 'rgba(251,191,36,0.2)',  badgeText: '#fbbf24', labelBg: 'rgba(251,191,36,0.15)' },
};

export const ChemStore: React.FC = () => {
  const user             = useChemCityStore(s => s.user);
  const dailyStoreItems  = useChemCityStore(s => s.dailyStoreItems);
  const storeSlotCount   = useChemCityStore(s => s.storeSlotCount);
  const openPurchaseConfirm = useChemCityStore(s => s.openPurchaseConfirm);
  const unlockStoreSlot  = useChemCityStore(s => s.unlockStoreSlot);
  const devRefreshStaticData = useChemCityStore(s => s.devRefreshStaticData);
  const devGrantCoins = useChemCityStore(s => s.devGrantCoins);
  const devRerollStore = useChemCityStore(s => s.devRerollStore);

  const [countdown, setCountdown]   = useState(() => countdownToMidnight());
  const [unlockingSlot, setUnlockingSlot] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setCountdown(countdownToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  // Preload store item images when they change
  useEffect(() => {
    preloadCardImages(dailyStoreItems);
  }, [dailyStoreItems]);

  const discount  = user?.activeBonuses.shopDiscountPercent ?? 0;
  const coins     = user?.currencies.coins ?? 0;
  const ownedSet  = new Set(user?.ownedItems ?? []);

  const isDevBuild = !!(import.meta as any)?.env?.DEV;
  const isDevToggle = (() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('cc_dev') === '1') return true;
      return localStorage.getItem('cc_dev') === '1';
    } catch {
      return false;
    }
  })();
  const isLocalhost = (() => {
    try {
      return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  })();
  const showDevControls = isDevBuild || isDevToggle || isLocalhost;

  const nextSlotNum  = storeSlotCount + 1;
  const nextSlotCost = STORE_SLOT_UNLOCK_COSTS[nextSlotNum] ?? null;
  const canUnlockMore = storeSlotCount < STORE_MAX_SLOTS;
  const canAffordNext = nextSlotCost != null && coins >= nextSlotCost;

  const handleUnlockSlot = async () => {
    if (unlockingSlot || !canUnlockMore || !canAffordNext) return;
    setUnlockingSlot(true);
    setUnlockError(null);
    try { await unlockStoreSlot(); }
    catch (err: any) { setUnlockError(err?.message ?? 'Failed to unlock slot.'); }
    finally { setUnlockingSlot(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        @keyframes shimmerSlide { 0%,100%{transform:translateX(-200%)} 50%{transform:translateX(200%)} }
        @keyframes legendGlow { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.4),0 4px 12px rgba(0,0,0,0.5)} 50%{box-shadow:0 0 36px rgba(251,191,36,0.7),0 4px 16px rgba(0,0,0,0.6)} }
        .store-card:hover { transform:translateY(-4px) !important; }
        .store-card { transition:transform 0.2s ease, box-shadow 0.2s ease !important; }
        .owned-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.5); border-radius:inherit; display:flex; align-items:center; justify-content:center; }
        .slot-bar-segment { height:4px; border-radius:2px; flex:1; transition:background 0.4s ease; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: 132, fontFamily: "'Quicksand',sans-serif", minHeight: 0 }}>

        {/* ── Store Header ── */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(197,215,181,0.1)',
          background: 'linear-gradient(135deg, rgba(118,168,165,0.1) 0%, transparent 80%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'linear-gradient(135deg,rgba(118,168,165,0.3),rgba(118,168,165,0.1))',
                border: '1.5px solid rgba(118,168,165,0.5)',
                borderRadius: 12, width: 46, height: 46,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingBag size={22} color="#76A8A5" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>ChemStore</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(197,215,181,0.5)', fontSize: 12, fontWeight: 600 }}>
                  <Clock size={11} />
                  <span>Resets in {countdown}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', rowGap: 8, maxWidth: 520 }}>
              {showDevControls && (
                <>
                  <button
                    type="button"
                    onClick={() => devRefreshStaticData()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.55)',
                      fontWeight: 800,
                      fontSize: 11,
                      fontFamily: "'Quicksand',sans-serif",
                    }}
                    title="DEV: refresh ChemCity static data"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => devRerollStore()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(118,168,165,0.14)',
                      border: '1px solid rgba(118,168,165,0.28)',
                      borderRadius: 12,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: 'rgba(197,215,181,0.9)',
                      fontWeight: 900,
                      fontSize: 11,
                      fontFamily: "'Quicksand',sans-serif",
                    }}
                    title="DEV: reroll store items"
                  >
                    Reroll
                  </button>

                  <button
                    type="button"
                    onClick={() => devGrantCoins(1000)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.25)',
                      borderRadius: 12,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: 'rgba(251,191,36,0.9)',
                      fontWeight: 900,
                      fontSize: 11,
                      fontFamily: "'Quicksand',sans-serif",
                    }}
                    title="DEV: +1000 coins"
                  >
                    +1000
                  </button>
                </>
              )}

              {discount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(52,211,153,0.15)', border: '1.5px solid rgba(52,211,153,0.4)',
                  borderRadius: 20, padding: '5px 12px',
                }}>
                  <Tag size={13} color="#34d399" />
                  <span style={{ color: '#34d399', fontWeight: 800, fontSize: 13 }}>{discount}% OFF</span>
                </div>
              )}
            </div>
          </div>

          {/* Slot progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {Array.from({ length: STORE_MAX_SLOTS }, (_, i) => (
                <div key={i} className="slot-bar-segment" style={{
                  background: i < storeSlotCount ? 'rgba(118,168,165,0.8)' : 'rgba(255,255,255,0.08)',
                }} />
              ))}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {storeSlotCount}/{STORE_MAX_SLOTS} slots
            </span>
          </div>
        </div>

        {/* ── Card Display ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {dailyStoreItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
              <ShoppingBag size={40} color="rgba(255,255,255,0.1)" style={{ animation: 'legendGlow 2s infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 600, margin: 0 }}>Loading store…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* ── Card Row ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(dailyStoreItems.length, 3)}, 1fr)`,
                gap: 12,
                justifyItems: 'center',
              }}>
                {dailyStoreItems.map((item, idx) => {
                  const isOwned = ownedSet.has(item.id);
                  const cfg = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
                  const rawCoin = item.shopData?.coinCost;
                  const rawDiamond = item.shopData?.diamondCost;
                  const effCoin = rawCoin != null ? getEffectiveCoinPrice(rawCoin, user?.activeBonuses ?? null) : null;
                  const coinSaved = rawCoin != null && effCoin != null ? rawCoin - effCoin : 0;
                  const formulaText = String(item.chemicalFormula ?? '');
                  const shouldMarquee = formulaText.length >= 18;

                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxWidth: 160 }}>
                      {/* Vertical RPG card */}
                      <button
                        onClick={() => openPurchaseConfirm(item.id)}
                        className="store-card"
                        style={{
                          position: 'relative',
                          width: '100%', maxWidth: 150, height: 210,
                          borderRadius: 14,
                          border: `2px solid ${cfg.borderColor}`,
                          background: cfg.bgGradient,
                          boxShadow: item.rarity === 'legendary'
                            ? `0 0 28px ${cfg.glowColor}, 0 6px 20px rgba(0,0,0,0.6)`
                            : `0 0 14px ${cfg.glowColor}, 0 4px 12px rgba(0,0,0,0.5)`,
                          cursor: 'pointer', overflow: 'hidden', padding: 0,
                          animation: item.rarity === 'legendary' ? 'legendGlow 2.5s ease-in-out infinite' : 'none',
                        }}
                      >
                        {/* Shimmer for legendary */}
                        {item.rarity === 'legendary' && (
                          <div style={{
                            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                            background: 'linear-gradient(105deg,transparent 30%,rgba(255,215,0,0.12) 50%,transparent 70%)',
                            animation: 'shimmerSlide 3s ease-in-out infinite',
                          }} />
                        )}

                        {/* Slot # badge */}
                        <div style={{
                          position: 'absolute', top: 6, left: 8, zIndex: 3,
                          color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700,
                          fontFamily: "'Quicksand',sans-serif",
                        }}>#{idx + 1}</div>

                        {/* Stars */}
                        <div style={{
                          position: 'absolute', top: 5, right: 7, zIndex: 3,
                          color: cfg.badgeText, fontSize: 8, letterSpacing: 1,
                        }}>{'✦'.repeat({ common:1, uncommon:2, rare:2, epic:3, legendary:4 }[item.rarity] ?? 1)}</div>

                        {/* Art */}
                        <div style={{
                          height: 130, margin: '14px 10px 6px',
                          background: cfg.artBg,
                          border: `1px solid ${cfg.borderColor}`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative',
                          zIndex: 2,
                        }}>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                              {...(needsAnonymousCrossOrigin(item.imageUrl)
                                ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                                : {})}
                              loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                            />
                          ) : (
                            <span style={{ fontSize: 48 }}>{item.emoji}</span>
                          )}
                        </div>

                        {/* Name */}
                        <div style={{ padding: '0 10px 6px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                          <div style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          {shouldMarquee ? (
                            <div className="chemcity-marquee" style={{
                              marginTop: 2,
                              height: 12,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}>
                              <div className="chemcity-marquee__track" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 18,
                              }}>
                                <span className="chemcity-marquee__text" style={{
                                  color: 'rgba(255,255,255,0.60)',
                                  fontSize: 8,
                                  fontWeight: 700,
                                  fontFamily: "'Quicksand',sans-serif",
                                  lineHeight: '12px',
                                  paddingBottom: 1,
                                }}>{formulaText}</span>
                                <span className="chemcity-marquee__text" style={{
                                  color: 'rgba(255,255,255,0.60)',
                                  fontSize: 8,
                                  fontWeight: 700,
                                  fontFamily: "'Quicksand',sans-serif",
                                  lineHeight: '12px',
                                  paddingBottom: 1,
                                }}>{formulaText}</span>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              color: 'rgba(255,255,255,0.55)',
                              fontSize: 8,
                              fontWeight: 700,
                              fontFamily: "'Quicksand',sans-serif",
                              marginTop: 2,
                              lineHeight: '12px',
                              paddingBottom: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>{formulaText}</div>
                          )}
                        </div>

                        {/* Rarity footer */}
                        <div style={{
                          position: 'absolute', bottom: 8, left: 10, right: 10,
                          background: cfg.badgeColor, borderRadius: 4, padding: '2px 0',
                          textAlign: 'center', fontSize: 8, fontWeight: 800,
                          color: cfg.badgeText, fontFamily: "'Quicksand',sans-serif",
                          textTransform: 'uppercase', letterSpacing: '0.06em', zIndex: 2,
                        }}>{item.rarity}</div>

                        {/* Owned overlay */}
                        {isOwned && (
                          <div className="owned-overlay" style={{ zIndex: 4, borderRadius: 12 }}>
                            <div style={{
                              background: 'rgba(52,211,153,0.9)', borderRadius: 8,
                              padding: '6px 14px', fontWeight: 800, fontSize: 12,
                              color: '#052e16', fontFamily: "'Quicksand',sans-serif",
                            }}>✓ Owned</div>
                          </div>
                        )}
                      </button>

                      {/* Price below card */}
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        {effCoin != null && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Coins size={12} color="#fbbf24" />
                              <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>
                                {effCoin.toLocaleString()}
                              </span>
                            </div>
                            {coinSaved > 0 && (
                              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textDecoration: 'line-through', fontFamily: "'Quicksand',sans-serif" }}>
                                {rawCoin!.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                        {item.shopData?.diamondCost != null && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Gem size={11} color="#67e8f9" />
                            <span style={{ color: '#67e8f9', fontWeight: 800, fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>
                              {item.shopData.diamondCost.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Unlock More Slots ── */}
              {canUnlockMore && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, textAlign: 'center', marginBottom: 10 }}>
                    Unlock more slots to see more cards daily
                  </p>
                  <button
                    onClick={handleUnlockSlot}
                    disabled={!canAffordNext || unlockingSlot}
                    style={{
                      width: '100%', padding: '14px',
                      borderRadius: 14, border: '2px dashed',
                      borderColor: canAffordNext && !unlockingSlot ? 'rgba(118,168,165,0.5)' : 'rgba(255,255,255,0.1)',
                      background: canAffordNext && !unlockingSlot ? 'rgba(118,168,165,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: canAffordNext && !unlockingSlot ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32,
                      background: canAffordNext ? 'rgba(118,168,165,0.2)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unlockingSlot ? (
                        <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#76A8A5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                      ) : (
                        <Lock size={14} color={canAffordNext ? '#76A8A5' : '#64748b'} />
                      )}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: canAffordNext ? '#fff' : '#64748b', fontWeight: 800, fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>
                        Unlock Slot #{nextSlotNum}
                      </div>
                      {nextSlotCost != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Coins size={11} color={canAffordNext ? '#fbbf24' : '#64748b'} />
                          <span style={{ color: canAffordNext ? '#fbbf24' : '#64748b', fontSize: 12, fontWeight: 800, fontFamily: "'Quicksand',sans-serif" }}>
                            {nextSlotCost.toLocaleString()}
                          </span>
                          {!canAffordNext && (
                            <span style={{ color: '#64748b', fontSize: 10, fontFamily: "'Quicksand',sans-serif" }}>
                              (need {(nextSlotCost - coins).toLocaleString()} more)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Plus size={16} color={canAffordNext ? '#76A8A5' : '#64748b'} style={{ marginLeft: 'auto' }} />
                  </button>
                  {unlockError && <p style={{ color: '#f87171', fontSize: 11, textAlign: 'center', marginTop: 6, fontFamily: "'Quicksand',sans-serif" }}>{unlockError}</p>}
                </div>
              )}

              {storeSlotCount === STORE_MAX_SLOTS && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0' }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, fontFamily: "'Quicksand',sans-serif" }}>All slots unlocked</span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes chemcityMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .chemcity-marquee__track { animation: chemcityMarquee 10s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .chemcity-marquee__track { animation: none !important; }
        }
      `}</style>
    </>
  );
};