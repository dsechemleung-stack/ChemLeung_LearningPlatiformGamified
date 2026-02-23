import React, { useEffect, useMemo, useState } from 'react';
import { X, Warehouse, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';
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

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';
type PlaceFilter = 'all' | string;

const RARITY_PILL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  all:       { bg: 'rgba(118,168,165,0.2)', border: 'rgba(118,168,165,0.5)', text: '#C5D7B5' },
  common:    { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', text: '#94a3b8' },
  rare:      { bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)',  text: '#60a5fa' },
  epic:      { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)',  text: '#a855f7' },
  legendary: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.5)', text: '#fbbf24' },
};

export const CardInventory: React.FC = () => {
  const user          = useChemCityStore(s => s.user);
  const slimItems     = useChemCityStore(s => s.slimItems);
  const places        = useChemCityStore(s => s.places);
  const openCardDetail = useChemCityStore(s => s.openCardDetail);
  const navigateToMap = useChemCityStore(s => s.navigateToMap);

  const [placeFilter, setPlaceFilter]   = useState<PlaceFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);

  const ownedItems = useMemo(() => {
    if (!user) return [];
    return slimItems.filter(item => !item.deprecated && user.ownedItems.includes(item.id));
  }, [slimItems, user]);

  const filtered = useMemo(() => {
    return ownedItems.filter(item => {
      if (placeFilter !== 'all' && item.placeId !== placeFilter) return false;
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.chemicalFormula.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [ownedItems, placeFilter, rarityFilter, searchQuery]);

  const equippedSet = new Set(Object.values(user?.equipped ?? {}));
  const rarities: RarityFilter[] = ['all', 'legendary', 'epic', 'rare', 'common'];

  // Count by rarity for display
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ownedItems.length };
    ownedItems.forEach(item => { counts[item.rarity] = (counts[item.rarity] ?? 0) + 1; });
    return counts;
  }, [ownedItems]);

  // Preload owned card images
  useEffect(() => {
    preloadCardImages(ownedItems);
  }, [ownedItems]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        @keyframes warehouseIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .warehouse-panel { animation: warehouseIn 0.25s ease forwards; }
        .inv-rarity-btn { font-family:'Quicksand',sans-serif; font-weight:800; font-size:11px; padding:5px 10px; border-radius:20px; border:1.5px solid; cursor:pointer; transition:all 0.2s ease; text-transform:capitalize; white-space:nowrap; }
        .inv-place-btn { font-family:'Quicksand',sans-serif; font-weight:700; font-size:11px; padding:4px 10px; border-radius:8px; border:1.5px solid rgba(255,255,255,0.1); cursor:pointer; transition:all 0.2s ease; white-space:nowrap; background:transparent; color:rgba(255,255,255,0.5); }
        .inv-place-btn:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.8); }
        .inv-place-btn.active { border-color:rgba(118,168,165,0.5); background:rgba(118,168,165,0.15); color:#C5D7B5; }
        .inv-search { width:100%; padding:9px 12px 9px 36px; background:rgba(255,255,255,0.05); border:1.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; font-size:13px; font-family:'Quicksand',sans-serif; font-weight:600; outline:none; box-sizing:border-box; }
        .inv-search:focus { border-color:rgba(118,168,165,0.5); background:rgba(255,255,255,0.07); }
        .inv-search::placeholder { color:rgba(255,255,255,0.25); }
        /* Shelf dividers */
        .shelf-row { background:rgba(255,255,255,0.02); border-radius:12px; padding:12px; border:1px solid rgba(255,255,255,0.05); margin-bottom:8px; }
        .shelf-row::after { content:''; display:block; height:3px; background:linear-gradient(90deg, rgba(118,168,165,0.3), transparent); border-radius:2px; margin-top:12px; }
      `}</style>

      {/* Full-screen backdrop */}
      <div
        onClick={navigateToMap}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(4,10,9,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        role="dialog" aria-modal="true"
      >
        <div
          className="warehouse-panel"
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(860px, 96vw)',
            height: 'min(80vh, 680px)',
            background: 'rgba(8,20,19,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(197,215,181,0.18)',
            borderRadius: 24,
            boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Quicksand',sans-serif",
          }}
        >
          {/* ── Warehouse Header ── */}
          <div style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid rgba(197,215,181,0.1)',
            background: 'linear-gradient(135deg, rgba(118,168,165,0.1) 0%, transparent 70%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(118,168,165,0.3), rgba(118,168,165,0.1))',
                  border: '1.5px solid rgba(118,168,165,0.5)',
                  borderRadius: 12, width: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Warehouse size={22} color="#76A8A5" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Card Warehouse</div>
                  <div style={{ color: 'rgba(197,215,181,0.5)', fontSize: 12, fontWeight: 600 }}>
                    {ownedItems.length} cards in storage
                    {filtered.length !== ownedItems.length && <span style={{ color: '#76A8A5', marginLeft: 8 }}>· {filtered.length} shown</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 8 }}>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  style={{
                    background: showFilters ? 'rgba(118,168,165,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${showFilters ? 'rgba(118,168,165,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showFilters ? '#76A8A5' : '#94a3b8',
                  }}
                ><Filter size={15} /></button>
                <button onClick={navigateToMap} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                }}><X size={16} /></button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Search by name or formula..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="inv-search" />
            </div>

            {/* Expandable filters */}
            {showFilters && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Rarity row */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {rarities.map(r => {
                    const pc = RARITY_PILL_COLORS[r] ?? RARITY_PILL_COLORS.all;
                    const active = rarityFilter === r;
                    return (
                      <button key={r} className="inv-rarity-btn" onClick={() => setRarityFilter(r)} style={{
                        background: active ? pc.bg : 'transparent',
                        borderColor: active ? pc.border : 'rgba(255,255,255,0.1)',
                        color: active ? pc.text : 'rgba(255,255,255,0.4)',
                      }}>
                        {r} {rarityCounts[r] != null ? <span style={{ opacity: 0.7 }}>({rarityCounts[r]})</span> : null}
                      </button>
                    );
                  })}
                </div>
                {/* Place row */}
                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
                  <button className={`inv-place-btn ${placeFilter === 'all' ? 'active' : ''}`} onClick={() => setPlaceFilter('all')}>All</button>
                  {places.map(p => (
                    <button key={p.id} className={`inv-place-btn ${placeFilter === p.id ? 'active' : ''}`} onClick={() => setPlaceFilter(p.id)}>
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Card Grid (warehouse shelves) ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 20px' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Warehouse size={44} color="rgba(255,255,255,0.1)" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {ownedItems.length === 0 ? 'No cards yet — visit ChemStore!' : 'No cards match your filters'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 110px)', gap: 14, justifyContent: 'start' }}>
                {filtered.map(item => (
                  <ChemCard
                    key={item.id}
                    item={item}
                    size="md"
                    isEquipped={equippedSet.has(item.id)}
                    onClick={() => openCardDetail(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};