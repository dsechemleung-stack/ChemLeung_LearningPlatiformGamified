import React, { useMemo } from 'react';
import { X, Zap, BookOpen, FlaskConical, Star, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';

// Slot ID to human-readable label mapping (from FIXED_SLOT_LAYOUTS in PlaceView.tsx)
const SLOT_LABELS: Record<string, string> = {
  // School
  school_student_desk_1: 'School — Student Desk 1',
  school_teacher_desk: 'School — Teacher Desk',
  school_blackboard: 'School — Blackboard',
  school_science_corner: 'School — Science Corner',
  school_poster: 'School — Poster',
  school_window_side_table: 'School — Window-side Table',
  school_student_desk_2: 'School — Student Desk 2',
  // Gas Station
  gas_station_car_1: 'Gas Station — Car 1',
  gas_station_construction_site: 'Gas Station — Construction Site',
  gas_station_factory: 'Gas Station — Factory',
  gas_station_petrol_pump: 'Gas Station — Petrol Pump',
  gas_station_car_2: 'Gas Station — Car 2',
  gas_station_motel: 'Gas Station — Motel',
  gas_station_street_light: 'Gas Station — Street Light',
  gas_station_firework: 'Gas Station — Firework',
  // Lab
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
  // Kitchen
  kitchen_cutlery_drawer: 'Kitchen — Cutlery Drawer',
  kitchen_pantry_1: 'Kitchen — Pantry 1',
  kitchen_stove_oven: 'Kitchen — Stove & Oven',
  kitchen_dinette: 'Kitchen — Dinette',
  kitchen_fridge: 'Kitchen — Fridge',
  kitchen_pantry_2: 'Kitchen — Pantry 2',
  kitchen_base_cabinet: 'Kitchen — Base Cabinet',
  kitchen_countertop: 'Kitchen — Countertop',
  // Toilet
  toilet_faucet: 'Toilet — Faucet',
  toilet_vanity_cabinet: 'Toilet — Vanity Cabinet',
  toilet_bathtub: 'Toilet — Bathtub',
  toilet_mirror_cabinet_1: 'Toilet — Mirror Cabinet 1',
  toilet_toilet: 'Toilet — Toilet',
  toilet_vanity_top: 'Toilet — Vanity Top',
  toilet_mirror_cabinet_2: 'Toilet — Mirror Cabinet 2',
  // Garden
  garden_shed_1: 'Garden — Shed 1',
  garden_lawn: 'Garden — Lawn',
  garden_greenhouse: 'Garden — Greenhouse',
  garden_flower_bed: 'Garden — Flower Bed',
  garden_mole_hill: 'Garden — Mole Hill',
  garden_broadcast_spreader: 'Garden — Broadcast Spreader',
  garden_shed_2: 'Garden — Shed 2',
  // Boutique
  lifestyle_boutique_poseur_table_1: 'Boutique — Poseur Table 1',
  lifestyle_boutique_service_desk: 'Boutique — Service Desk',
  lifestyle_boutique_jewellery_display: 'Boutique — Jewellery Display',
  lifestyle_boutique_power_essentials: 'Boutique — Power Essentials',
  lifestyle_boutique_apparel_gallery: 'Boutique — Apparel Gallery',
  lifestyle_boutique_poseur_table_2: 'Boutique — Poseur Table 2',
  // Beach
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
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  artBg: string;
  badgeColor: string;
  badgeText: string;
  foilBg: string;
}> = {
  common:    { borderColor: '#94a3b8', glowColor: 'rgba(148,163,184,0.3)', bgGradient: 'linear-gradient(165deg,#1e293b,#0f172a)', artBg: 'rgba(255,255,255,0.05)', badgeColor: 'rgba(148,163,184,0.2)', badgeText: '#94a3b8', foilBg: 'none' },
  uncommon:  { borderColor: '#34d399', glowColor: 'rgba(52,211,153,0.35)',  bgGradient: 'linear-gradient(165deg,#0f3d33,#071a16)', artBg: 'rgba(52,211,153,0.08)',  badgeColor: 'rgba(52,211,153,0.18)', badgeText: '#34d399', foilBg: 'none' },
  rare:      { borderColor: '#60a5fa', glowColor: 'rgba(96,165,250,0.4)',   bgGradient: 'linear-gradient(165deg,#1e3a5f,#0f172a)', artBg: 'rgba(96,165,250,0.08)', badgeColor: 'rgba(96,165,250,0.2)', badgeText: '#60a5fa', foilBg: 'linear-gradient(135deg,rgba(96,165,250,0.06) 0%,transparent 60%)' },
  epic:      { borderColor: '#a855f7', glowColor: 'rgba(168,85,247,0.4)',   bgGradient: 'linear-gradient(165deg,#2d1b4e,#0f0a1e)', artBg: 'rgba(168,85,247,0.08)', badgeColor: 'rgba(168,85,247,0.2)', badgeText: '#a855f7', foilBg: 'linear-gradient(135deg,rgba(168,85,247,0.08) 0%,transparent 60%)' },
  legendary: { borderColor: '#fbbf24', glowColor: 'rgba(251,191,36,0.5)',   bgGradient: 'linear-gradient(165deg,#3d2800,#1a0f00)', artBg: 'rgba(251,191,36,0.1)',  badgeColor: 'rgba(251,191,36,0.2)', badgeText: '#fbbf24', foilBg: 'linear-gradient(135deg,rgba(251,191,36,0.1) 0%,transparent 60%)' },
};

const DetailSkeleton: React.FC = () => (
  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[1,2,3,4].map(i => (
      <div key={i} style={{ height: i === 1 ? 160 : 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
    ))}
    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
  </div>
);

export const CardDetail: React.FC = () => {
  const cardDetailItemId = useChemCityStore(s => s.cardDetailItemId);
  const cardDetailData   = useChemCityStore(s => s.cardDetailData);
  const cardDetailLoading = useChemCityStore(s => s.cardDetailLoading);
  const slimItems        = useChemCityStore(s => s.slimItems);
  const closeCardDetail  = useChemCityStore(s => s.closeCardDetail);
  const openCardDetail   = useChemCityStore(s => s.openCardDetail);

  const isOpen = !!cardDetailItemId;

  const slim = useMemo(() => {
    if (!cardDetailItemId) return undefined;
    return slimItems.find((i) => i.id === cardDetailItemId);
  }, [cardDetailItemId, slimItems]);

  const full = cardDetailData;
  const rarity = slim?.rarity ?? 'common';
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const rarityStars = { common: 1, uncommon: 2, rare: 2, epic: 3, legendary: 4 }[rarity] ?? 1;

  const placementSlots = useMemo(() => {
    const raw = (full as any)?.validSlots ?? (slim as any)?.validSlots;
    if (!Array.isArray(raw)) return [] as string[];
    const uniq = Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean)));
    uniq.sort((a, b) => (SLOT_LABELS[a] || a).localeCompare(SLOT_LABELS[b] || b));
    return uniq;
  }, [full, slim]);

  const variants = useMemo(() => {
    if (!cardDetailItemId) return [];
    const baseId = String((slim as any)?.baseId ?? '').trim();
    if (!baseId) return slim ? [slim] : [];
    return (slimItems || [])
      .filter((it) => String((it as any)?.baseId ?? '').trim() === baseId)
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }, [cardDetailItemId, slim, slimItems]);

  const variantIdx = useMemo(() => {
    if (!cardDetailItemId) return 0;
    const idx = variants.findIndex((v) => v.id === cardDetailItemId);
    return idx >= 0 ? idx : 0;
  }, [variants, cardDetailItemId]);

  const canNav = variants.length > 1 && !cardDetailLoading;
  const goVariant = (delta: number) => {
    if (!canNav) return;
    const len = variants.length;
    if (len <= 1) return;
    const next = variants[((variantIdx + delta) % len + len) % len];
    if (!next || next.id === cardDetailItemId) return;
    void openCardDetail(next.id);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        .card-detail-shimmer {
          background: linear-gradient(105deg, transparent 30%, rgba(255,215,0,0.15) 50%, transparent 70%);
          animation: shimmerSlide 3s ease-in-out infinite;
        }
        @keyframes shimmerSlide { 0%,100%{transform:translateX(-200%)} 50%{transform:translateX(200%)} }
        @keyframes cardReveal { from{opacity:0;transform:scale(0.88) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .card-detail-anim { animation: cardReveal 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={closeCardDetail}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(4,10,9,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          className="card-detail-anim"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: 20,
            maxWidth: 680,
            width: '90vw',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
        >
          {/* ── Left: RPG Card ── */}
          <div style={{
            flexShrink: 0,
            width: 180,
            height: 260,
            borderRadius: 16,
            border: `2.5px solid ${cfg.borderColor}`,
            background: cfg.bgGradient,
            boxShadow: `0 0 40px ${cfg.glowColor}, 0 8px 32px rgba(0,0,0,0.7)`,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Foil layer */}
            {cfg.foilBg !== 'none' && (
              <div style={{ position: 'absolute', inset: 0, background: cfg.foilBg, zIndex: 0, pointerEvents: 'none' }} />
            )}
            {rarity === 'legendary' && (
              <div className="card-detail-shimmer" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />
            )}

            {/* Card header: name + rarity */}
            <div style={{
              padding: '8px 10px 4px',
              position: 'relative', zIndex: 2,
              borderBottom: `1px solid ${cfg.borderColor}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <button
                type="button"
                onClick={() => goVariant(-1)}
                disabled={!canNav}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  marginRight: 6,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: canNav ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
                  cursor: canNav ? 'pointer' : 'not-allowed',
                }}
                aria-label="Previous variant"
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ color: '#f1f5f9', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {full?.displayName || slim?.name || '—'}
              </div>

              <button
                type="button"
                onClick={() => goVariant(+1)}
                disabled={!canNav}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  marginLeft: 6,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: canNav ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
                  cursor: canNav ? 'pointer' : 'not-allowed',
                }}
                aria-label="Next variant"
              >
                <ChevronRight size={16} />
              </button>

              <div style={{ color: cfg.badgeText, fontSize: 9, letterSpacing: 1, flexShrink: 0, marginLeft: 4 }}>
                {'✦'.repeat(rarityStars)}
              </div>
            </div>

            {/* Art */}
            <div style={{
              flex: 1, margin: '6px 8px 4px',
              background: cfg.artBg,
              border: `1px solid ${cfg.borderColor}`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative', zIndex: 2,
            }}>
              {full?.imageUrl || slim?.imageUrl ? (
                <img
                  src={full?.imageUrl || slim?.imageUrl}
                  alt={slim?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  {...(needsAnonymousCrossOrigin(full?.imageUrl || slim?.imageUrl)
                    ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                    : {})}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: 52, lineHeight: 1 }}>{slim?.emoji}</span>
              )}
            </div>

            {/* Formula */}
            <div style={{
              padding: '4px 10px', position: 'relative', zIndex: 2,
              borderTop: `1px solid ${cfg.borderColor}`,
              textAlign: 'center',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace' }}>
                {slim?.chemicalFormula}
              </div>
              <div style={{
                marginTop: 3, background: cfg.badgeColor, borderRadius: 4,
                padding: '1px 0', fontSize: 8, fontWeight: 800, color: cfg.badgeText,
                fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{rarity}</div>
            </div>
          </div>

          {/* ── Right: Info Panel ── */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(197,215,181,0.15)',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: "'Quicksand',sans-serif" }}>
                  {full?.displayName || slim?.name || '—'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 12, marginTop: 2 }}>
                  {slim?.chemicalFormula}
                </div>
                {variants.length > 1 && (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 6, fontWeight: 700 }}>
                    Variant {variantIdx + 1}/{variants.length}
                  </div>
                )}
              </div>
              <button onClick={closeCardDetail} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                flexShrink: 0, marginLeft: 8,
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cardDetailLoading ? <DetailSkeleton /> : (
                <>
                  {full?.description && (
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.7, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>
                      {renderBoldMarkdown(full.description)}
                    </p>
                  )}

                  {slim?.skillContribution !== undefined && slim.skillContribution > 0 && (
                    <div style={{
                      background: 'rgba(118,168,165,0.12)', border: '1px solid rgba(118,168,165,0.3)',
                      borderRadius: 10, padding: '8px 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={13} color="#76A8A5" />
                        <span style={{ color: 'rgba(197,215,181,0.8)', fontSize: 11, fontWeight: 700, fontFamily: "'Quicksand',sans-serif" }}>Skill Power</span>
                      </div>
                      <span style={{ color: '#76A8A5', fontWeight: 800, fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>
                        +{slim.skillContribution}
                      </span>
                    </div>
                  )}

                  {full?.educational?.funFact && (
                    <div style={{
                      background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
                      borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FlaskConical size={12} color="#60a5fa" />
                        <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fun Fact</span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 1.65, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>
                        {renderBoldMarkdown(full.educational.funFact)}
                      </p>
                    </div>
                  )}

                  {full?.educational?.everydayUses && full.educational.everydayUses.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Star size={11} color="#c5d7b5" />
                        <span style={{ color: 'rgba(197,215,181,0.7)', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Everyday Uses</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {full.educational.everydayUses.map(use => (
                          <span key={use} style={{
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'rgba(255,255,255,0.65)',
                            fontFamily: "'Quicksand',sans-serif", fontWeight: 600,
                          }}>{use}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {full?.topicConnections && full.topicConnections.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <BookOpen size={11} color="#86efac" />
                        <span style={{ color: 'rgba(134,239,172,0.7)', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>DSE Topics</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {full.topicConnections.map(tid => (
                          <span key={tid} style={{
                            background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.25)',
                            borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#86efac',
                            fontFamily: "'Quicksand',sans-serif", fontWeight: 600,
                          }}>{tid}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {placementSlots.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <MapPin size={11} color="#fbbf24" />
                        <span style={{ color: 'rgba(251,191,36,0.8)', fontSize: 10, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Can be placed at</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {placementSlots.map((slotId) => (
                          <span key={slotId} style={{
                            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
                            borderRadius: 6, padding: '4px 10px', fontSize: 10, color: '#fbbf24',
                            fontFamily: "'Quicksand',sans-serif", fontWeight: 600,
                          }}>{SLOT_LABELS[slotId] || slotId}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {full?.albumMetadata?.flavorText && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic', margin: 0, lineHeight: 1.6, fontFamily: "'Quicksand',sans-serif" }}>
                        "{full.albumMetadata.flavorText}"
                      </p>
                    </div>
                  )}

                  {!full && !cardDetailLoading && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: "'Quicksand',sans-serif" }}>Card details unavailable.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};