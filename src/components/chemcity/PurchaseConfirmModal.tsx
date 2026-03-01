import React, { useEffect, useMemo, useState } from 'react';
import { X, Coins, Gem, CheckCircle, FlaskConical, Star, BookOpen, Zap, MapPin } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { getEffectiveCoinPrice } from '../../lib/chemcity/shop';
import { useAuth } from '../../contexts/AuthContext';

const SLOT_LABELS: Record<string, string> = {
  school_student_desk_1: 'School — Student Desk 1',
  school_teacher_desk: 'School — Teacher Desk',
  school_blackboard: 'School — Blackboard',
  school_science_corner: 'School — Science Corner',
  school_poster: 'School — Poster',
  school_window_side_table: 'School — Window-side Table',
  school_student_desk_2: 'School — Student Desk 2',
  gas_station_car_1: 'Gas Station — Car 1',
  gas_station_construction_site: 'Gas Station — Construction Site',
  gas_station_factory: 'Gas Station — Factory',
  gas_station_petrol_pump: 'Gas Station — Petrol Pump',
  gas_station_car_2: 'Gas Station — Car 2',
  gas_station_motel: 'Gas Station — Motel',
  gas_station_street_light: 'Gas Station — Street Light',
  gas_station_firework: 'Gas Station — Firework',
  lab_bench: 'Lab — Bench',
  lab_fume_hood: 'Lab — Fume Hood',
  lab_acid_alkali_cabinet: 'Lab — Acid & Alkali Cabinet',
  lab_apparatus_1: 'Lab — Apparatus 1',
  lab_metal_shelf: 'Lab — Metal Shelf',
  lab_salt_shelf: 'Lab — Salt Shelf',
  lab_hazardous_chemical_shelf: 'Lab — Hazardous Chemical Shelf',
  lab_apparatus_2: 'Lab — Apparatus 2',
  lab_chemical_shelf: 'Lab — Chemical Shelf',
  lab_gas_tank: 'Lab — Gas Tank',
  kitchen_cutlery_drawer: 'Kitchen — Cutlery Drawer',
  kitchen_pantry_1: 'Kitchen — Pantry 1',
  kitchen_stove_oven: 'Kitchen — Stove & Oven',
  kitchen_dinette: 'Kitchen — Dinette',
  kitchen_fridge: 'Kitchen — Fridge',
  kitchen_pantry_2: 'Kitchen — Pantry 2',
  kitchen_base_cabinet: 'Kitchen — Base Cabinet',
  kitchen_countertop: 'Kitchen — Countertop',
  toilet_faucet: 'Toilet — Faucet',
  toilet_vanity_cabinet: 'Toilet — Vanity Cabinet',
  toilet_bathtub: 'Toilet — Bathtub',
  toilet_mirror_cabinet_1: 'Toilet — Mirror Cabinet 1',
  toilet_toilet: 'Toilet — Toilet',
  toilet_vanity_top: 'Toilet — Vanity Top',
  toilet_mirror_cabinet_2: 'Toilet — Mirror Cabinet 2',
  garden_shed_1: 'Garden — Shed 1',
  garden_lawn: 'Garden — Lawn',
  garden_greenhouse: 'Garden — Greenhouse',
  garden_flower_bed: 'Garden — Flower Bed',
  garden_mole_hill: 'Garden — Mole Hill',
  garden_broadcast_spreader: 'Garden — Broadcast Spreader',
  garden_shed_2: 'Garden — Shed 2',
  lifestyle_boutique_poseur_table_1: 'Boutique — Poseur Table 1',
  lifestyle_boutique_service_desk: 'Boutique — Service Desk',
  lifestyle_boutique_jewellery_display: 'Boutique — Jewellery Display',
  lifestyle_boutique_power_essentials: 'Boutique — Power Essentials',
  lifestyle_boutique_apparel_gallery: 'Boutique — Apparel Gallery',
  lifestyle_boutique_poseur_table_2: 'Boutique — Poseur Table 2',
  beach_sky: 'Beach — Sky',
  beach_sea: 'Beach — Sea',
  beach_rock_1: 'Beach — Rock 1',
  beach_dry_sand: 'Beach — Dry Sand',
  beach_strandline: 'Beach — Strandline',
  beach_rock_2: 'Beach — Rock 2',
  beach_cliffside: 'Beach — Cliffside',
};

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

function renderBoldMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = re.lastIndex;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(<strong key={`b-${start}`}>{match[1]}</strong>);
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? <>{parts}</> : text;
}

const RARITY_CONFIG: Record<string, {
  borderColor: string; glowColor: string; bgGradient: string; artBg: string;
  badgeColor: string; badgeText: string;
}> = {
  common:    { borderColor: '#94a3b8', glowColor: 'rgba(148,163,184,0.3)', bgGradient: 'linear-gradient(165deg,#1e293b,#0f172a)', artBg: 'rgba(255,255,255,0.04)', badgeColor: 'rgba(148,163,184,0.2)', badgeText: '#94a3b8' },
  uncommon:  { borderColor: '#34d399', glowColor: 'rgba(52,211,153,0.35)',  bgGradient: 'linear-gradient(165deg,#0f3d33,#071a16)', artBg: 'rgba(52,211,153,0.06)',  badgeColor: 'rgba(52,211,153,0.18)', badgeText: '#34d399' },
  rare:      { borderColor: '#60a5fa', glowColor: 'rgba(96,165,250,0.4)',  bgGradient: 'linear-gradient(165deg,#1e3a5f,#0f172a)', artBg: 'rgba(96,165,250,0.07)',  badgeColor: 'rgba(96,165,250,0.2)',  badgeText: '#60a5fa' },
  epic:      { borderColor: '#a855f7', glowColor: 'rgba(168,85,247,0.4)',  bgGradient: 'linear-gradient(165deg,#2d1b4e,#0f0a1e)', artBg: 'rgba(168,85,247,0.07)',  badgeColor: 'rgba(168,85,247,0.2)',  badgeText: '#a855f7' },
  legendary: { borderColor: '#fbbf24', glowColor: 'rgba(251,191,36,0.5)',  bgGradient: 'linear-gradient(165deg,#3d2800,#1a0f00)', artBg: 'rgba(251,191,36,0.09)',  badgeColor: 'rgba(251,191,36,0.2)',  badgeText: '#fbbf24' },
};

type PurchaseCurrency = 'coins' | 'diamonds';

export const PurchaseConfirmModal: React.FC = () => {
  const { userProfile } = useAuth() as any;
  const user                  = useChemCityStore(s => s.user);
  const slimItems             = useChemCityStore(s => s.slimItems);
  const storePurchaseItemId   = useChemCityStore(s => s.storePurchaseItemId);
  const storePurchaseData     = useChemCityStore(s => s.storePurchaseData);
  const storePurchaseLoading  = useChemCityStore(s => s.storePurchaseLoading);
  const closePurchaseConfirm  = useChemCityStore(s => s.closePurchaseConfirm);
  const purchaseCard          = useChemCityStore(s => s.purchaseCard);

  const [purchasing, setPurchasing]         = useState(false);
  const [purchaseCurrency, setPurchaseCurrency] = useState<PurchaseCurrency>('coins');
  const [purchaseError, setPurchaseError]   = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const isOpen = !!storePurchaseItemId;
  const slim   = slimItems.find(i => i.id === storePurchaseItemId);
  const full   = storePurchaseData;

  const isOwned  = !!user?.ownedItems?.includes(storePurchaseItemId ?? '');
  const rarity   = slim?.rarity ?? 'common';
  const cfg      = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const rarityStars = { common:1, uncommon:2, rare:2, epic:3, legendary:4 }[rarity] ?? 1;
  const discount = user?.activeBonuses.shopDiscountPercent ?? 0;
  const rawCoin  = slim?.shopData?.coinCost;
  const rawDiamond = slim?.shopData?.diamondCost;
  const effCoin  = rawCoin != null ? getEffectiveCoinPrice(rawCoin, user?.activeBonuses ?? null) : null;
  const coins    = user?.currencies.coins ?? 0;
  const diamonds = Number(userProfile?.tokens ?? 0);
  const canAffordCoins    = effCoin != null && coins >= effCoin;
  const canAffordDiamonds = rawDiamond != null && diamonds >= rawDiamond;

  const placementSlots = useMemo(() => {
    const raw = (full as any)?.validSlots ?? (slim as any)?.validSlots;
    if (!Array.isArray(raw)) return [] as string[];
    const uniq = Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean)));
    uniq.sort((a, b) => (SLOT_LABELS[a] || a).localeCompare(SLOT_LABELS[b] || b));
    return uniq;
  }, [full, slim]);

  useEffect(() => {
    if (isOpen) {
      setPurchaseError(null);
      setPurchaseSuccess(false);
      setPurchasing(false);
      if (rawCoin != null) setPurchaseCurrency('coins');
      else if (rawDiamond != null) setPurchaseCurrency('diamonds');
    }
  }, [isOpen, storePurchaseItemId, rawCoin, rawDiamond]);

  if (!isOpen || !slim) return null;

  const handlePurchase = async () => {
    if (purchasing || isOwned) return;
    const canAfford = purchaseCurrency === 'coins' ? canAffordCoins : canAffordDiamonds;
    if (!canAfford) return;
    setPurchasing(true);
    setPurchaseError(null);
    try {
      await purchaseCard(slim.id, purchaseCurrency);
      setPurchaseSuccess(true);
      setTimeout(() => closePurchaseConfirm(), 1800);
    } catch (err: any) {
      setPurchaseError(err?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        @keyframes purchaseIn { from{opacity:0;transform:scale(0.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes shimmerSlide { 0%,100%{transform:translateX(-200%)} 50%{transform:translateX(200%)} }
        @keyframes legendGlow { 0%,100%{box-shadow:0 0 24px rgba(251,191,36,0.4)} 50%{box-shadow:0 0 44px rgba(251,191,36,0.7)} }
        @keyframes successPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        .purchase-panel { animation: purchaseIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .curr-tab { font-family:'Quicksand',sans-serif; font-weight:800; font-size:12px; padding:8px 16px; border-radius:10px; border:1.5px solid; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:6px; }
      `}</style>

      {/* Backdrop */}
      <div onClick={closePurchaseConfirm} style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(4,10,9,0.9)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div className="purchase-panel" onClick={e => e.stopPropagation()} style={{
          width: 'min(620px, 94vw)', maxHeight: '90vh',
          background: 'rgba(8,20,19,0.97)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(197,215,181,0.18)',
          borderRadius: 24,
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          fontFamily: "'Quicksand',sans-serif",
        }}>
          {/* Close */}
          <button onClick={closePurchaseConfirm} style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
          }}><X size={14} /></button>

          <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* ── Left: Vertical RPG Card ── */}
            <div style={{
              width: 200, flexShrink: 0, padding: '24px 0 24px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              {/* Card */}
              <div style={{
                width: 155, height: 220, borderRadius: 16,
                border: `2.5px solid ${cfg.borderColor}`,
                background: cfg.bgGradient,
                boxShadow: rarity === 'legendary'
                  ? `0 0 40px ${cfg.glowColor}, 0 8px 24px rgba(0,0,0,0.7)`
                  : `0 0 20px ${cfg.glowColor}, 0 6px 16px rgba(0,0,0,0.6)`,
                overflow: 'hidden', position: 'relative', flexShrink: 0,
                animation: rarity === 'legendary' ? 'legendGlow 2.5s ease-in-out infinite' : 'none',
              }}>
                {rarity === 'legendary' && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(105deg,transparent 30%,rgba(255,215,0,0.13) 50%,transparent 70%)',
                    animation: 'shimmerSlide 3s ease-in-out infinite',
                  }} />
                )}
                {/* Stars */}
                <div style={{ position:'absolute', top:6, right:8, zIndex:3, color:cfg.badgeText, fontSize:10, letterSpacing:1 }}>
                  {'✦'.repeat(rarityStars)}
                </div>
                {/* Art */}
                <div style={{
                  height: 140, margin: '14px 10px 6px',
                  background: cfg.artBg, border: `1px solid ${cfg.borderColor}`,
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', position: 'relative', zIndex: 2,
                }}>
                  {(full?.imageUrl || slim.imageUrl) ? (
                    <img
                      src={full?.imageUrl || slim.imageUrl}
                      alt={slim.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      {...(needsAnonymousCrossOrigin(full?.imageUrl || slim.imageUrl)
                        ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                        : {})}
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                    />
                  ) : (
                    <span style={{ fontSize: 52 }}>{slim.emoji}</span>
                  )}
                </div>
                {/* Name / formula */}
                <div style={{ padding:'0 10px 4px', textAlign:'center', position:'relative', zIndex:2 }}>
                  <div style={{ color:'#f1f5f9', fontSize:11, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {full?.displayName || slim.name}
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'monospace', marginTop:1 }}>
                    {slim.chemicalFormula}
                  </div>
                </div>
                {/* Rarity footer */}
                <div style={{
                  position:'absolute', bottom:8, left:10, right:10,
                  background:cfg.badgeColor, borderRadius:4, padding:'2px 0',
                  textAlign:'center', fontSize:8, fontWeight:800, color:cfg.badgeText,
                  textTransform:'uppercase', letterSpacing:'0.06em', zIndex:2,
                }}>{rarity}</div>

                {/* Owned stamp */}
                {isOwned && (
                  <div style={{
                    position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', zIndex:4, borderRadius:14,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <div style={{ background:'rgba(74,222,128,0.9)', borderRadius:8, padding:'6px 14px', fontWeight:800, fontSize:12, color:'#052e16' }}>✓ Owned</div>
                  </div>
                )}
              </div>

              {/* Skill contribution */}
              {slim.skillContribution > 0 && (
                <div style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'rgba(118,168,165,0.12)', border:'1px solid rgba(118,168,165,0.3)',
                  borderRadius:8, padding:'6px 12px',
                }}>
                  <Zap size={12} color="#76A8A5" />
                  <span style={{ color:'rgba(197,215,181,0.8)', fontSize:11, fontWeight:700 }}>+{slim.skillContribution} Power</span>
                </div>
              )}
            </div>

            {/* ── Right: Info + Purchase ── */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
              {/* Scrollable info */}
              <div style={{ flex:1, overflowY:'auto', padding:'24px 24px 12px' }}>
                <div style={{ color:'#fff', fontWeight:800, fontSize:17, marginBottom:4 }}>
                  {full?.displayName || slim.name}
                </div>
                <div style={{ color:'rgba(255,255,255,0.35)', fontFamily:'monospace', fontSize:12, marginBottom:12 }}>
                  {slim.chemicalFormula}
                </div>

                {storePurchaseLoading && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height:14, background:'rgba(255,255,255,0.06)', borderRadius:6, animation:'pulse 1.5s infinite' }} />)}
                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                  </div>
                )}

                {full?.description && (
                  <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, lineHeight:1.7, margin:'0 0 12px', fontFamily:"'Quicksand',sans-serif" }}>
                    {renderBoldMarkdown(full.description)}
                  </p>
                )}

                {placementSlots.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <MapPin size={12} color="#fbbf24" />
                      <span style={{ color: 'rgba(251,191,36,0.8)', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Can be placed at
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {placementSlots.map((slotId) => (
                        <span
                          key={slotId}
                          style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.35)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 10,
                            color: '#fbbf24',
                            fontFamily: "'Quicksand',sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {SLOT_LABELS[slotId] || slotId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {full?.educational?.funFact && (
                  <div style={{ background:'rgba(96,165,250,0.07)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <FlaskConical size={11} color="#60a5fa" />
                      <span style={{ color:'#60a5fa', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>Fun Fact</span>
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.65)', fontSize:11, lineHeight:1.6, margin:0 }}>{renderBoldMarkdown(full.educational.funFact)}</p>
                  </div>
                )}

                {full?.educational?.everydayUses && full.educational.everydayUses.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <Star size={10} color="#c5d7b5" />
                      <span style={{ color:'rgba(197,215,181,0.7)', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>Uses</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {full.educational.everydayUses.slice(0,5).map(use => (
                        <span key={use} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'3px 8px', fontSize:10, color:'rgba(255,255,255,0.6)', fontFamily:"'Quicksand',sans-serif", fontWeight:600 }}>{use}</span>
                      ))}
                    </div>
                  </div>
                )}

                {full?.topicConnections && full.topicConnections.length > 0 && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <BookOpen size={10} color="#86efac" />
                      <span style={{ color:'rgba(134,239,172,0.7)', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>DSE Topics</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {full.topicConnections.map(tid => (
                        <span key={tid} style={{ background:'rgba(134,239,172,0.08)', border:'1px solid rgba(134,239,172,0.25)', borderRadius:6, padding:'3px 8px', fontSize:10, color:'#86efac', fontFamily:"'Quicksand',sans-serif", fontWeight:600 }}>{tid}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Purchase Footer ── */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', padding:'14px 24px 20px', background:'rgba(0,0,0,0.2)', flexShrink:0 }}>
                {purchaseSuccess ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'10px 0', animation:'successPop 0.4s ease forwards' }}>
                    <CheckCircle size={32} color="#4ade80" />
                    <span style={{ color:'#4ade80', fontWeight:800, fontSize:14 }}>Added to your collection!</span>
                  </div>
                ) : isOwned ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12 }}>
                    <CheckCircle size={16} color="rgba(255,255,255,0.3)" />
                    <span style={{ color:'rgba(255,255,255,0.35)', fontWeight:700, fontSize:13 }}>Already in your collection</span>
                  </div>
                ) : (
                  <>
                    {/* Currency toggle */}
                    {effCoin != null && rawDiamond != null && (
                      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                        <button className="curr-tab" onClick={() => setPurchaseCurrency('coins')} style={{
                          flex:1, background: purchaseCurrency==='coins' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                          borderColor: purchaseCurrency==='coins' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)',
                          color: purchaseCurrency==='coins' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                          justifyContent:'center',
                        }}>
                          <Coins size={14} /> Coins
                        </button>
                        <button className="curr-tab" onClick={() => setPurchaseCurrency('diamonds')} style={{
                          flex:1, background: purchaseCurrency==='diamonds' ? 'rgba(103,232,249,0.12)' : 'rgba(255,255,255,0.05)',
                          borderColor: purchaseCurrency==='diamonds' ? 'rgba(103,232,249,0.5)' : 'rgba(255,255,255,0.1)',
                          color: purchaseCurrency==='diamonds' ? '#67e8f9' : 'rgba(255,255,255,0.4)',
                          justifyContent:'center',
                        }}>
                          <Gem size={13} /> Diamonds
                        </button>
                      </div>
                    )}

                    {/* Price + balance */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                      <div>
                        {purchaseCurrency === 'coins' && effCoin != null && (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <Coins size={15} color="#fbbf24" />
                              <span style={{ color:'#fbbf24', fontWeight:800, fontSize:16 }}>{effCoin.toLocaleString()}</span>
                            </div>
                            {rawCoin != null && rawCoin !== effCoin && (
                              <span style={{ color:'rgba(255,255,255,0.25)', fontSize:12, textDecoration:'line-through' }}>{rawCoin.toLocaleString()}</span>
                            )}
                            {discount > 0 && (
                              <span style={{ background:'rgba(52,211,153,0.2)', border:'1px solid rgba(52,211,153,0.4)', borderRadius:20, padding:'1px 7px', fontSize:10, color:'#34d399', fontWeight:800 }}>{discount}% OFF</span>
                            )}
                          </div>
                        )}
                        {purchaseCurrency === 'diamonds' && rawDiamond != null && (
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <Gem size={14} color="#67e8f9" />
                            <span style={{ color:'#67e8f9', fontWeight:800, fontSize:16 }}>{rawDiamond.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:600 }}>
                        You have: {purchaseCurrency === 'coins' ? `${coins.toLocaleString()} 🪙` : `${diamonds.toLocaleString()} 💎`}
                      </span>
                    </div>

                    {purchaseError && <p style={{ color:'#f87171', fontSize:11, textAlign:'center', marginBottom:8 }}>{purchaseError}</p>}

                    {/* Shortfall notice */}
                    {purchaseCurrency === 'coins' && effCoin != null && !canAffordCoins && (
                      <p style={{ color:'rgba(251,191,36,0.7)', fontSize:11, textAlign:'center', marginBottom:8 }}>
                        Need {(effCoin - coins).toLocaleString()} more coins
                      </p>
                    )}
                    {purchaseCurrency === 'diamonds' && rawDiamond != null && !canAffordDiamonds && (
                      <p style={{ color:'rgba(103,232,249,0.7)', fontSize:11, textAlign:'center', marginBottom:8 }}>
                        Need {(rawDiamond - diamonds).toLocaleString()} more diamonds
                      </p>
                    )}

                    <button onClick={handlePurchase} disabled={
                      purchasing ||
                      (purchaseCurrency==='coins' && (!canAffordCoins || effCoin==null)) ||
                      (purchaseCurrency==='diamonds' && (!canAffordDiamonds || rawDiamond==null))
                    } style={{
                      width:'100%', padding:'13px',
                      borderRadius:12, border:'none',
                      background: purchasing ? 'rgba(255,255,255,0.08)'
                        : purchaseCurrency==='coins' && canAffordCoins ? 'linear-gradient(135deg, #b45309, #92400e)'
                        : purchaseCurrency==='diamonds' && canAffordDiamonds ? 'linear-gradient(135deg, #0e7490, #164e63)'
                        : 'rgba(255,255,255,0.06)',
                      color: (purchaseCurrency==='coins' && canAffordCoins) || (purchaseCurrency==='diamonds' && canAffordDiamonds) ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontWeight:800, fontSize:14, cursor: purchasing ? 'not-allowed' : 'pointer',
                      fontFamily:"'Quicksand',sans-serif",
                      boxShadow: (purchaseCurrency==='coins' && canAffordCoins) ? '0 4px 20px rgba(180,83,9,0.4)' : 'none',
                      transition:'all 0.2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}>
                      {purchasing ? (
                        <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                      ) : purchaseCurrency==='coins' && effCoin != null ? (
                        <><Coins size={16} />Buy for {effCoin.toLocaleString()} coins</>
                      ) : rawDiamond != null ? (
                        <><Gem size={15} />Buy for {rawDiamond.toLocaleString()} diamonds</>
                      ) : 'Not for sale'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};