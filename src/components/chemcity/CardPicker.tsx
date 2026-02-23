import React, { useEffect, useMemo, useState } from 'react';
import { X, Backpack, Search, Package, Info } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';
import type { SlimItemDocument } from '../../lib/chemcity/types';

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };

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

export const CardPicker: React.FC = () => {
  const user               = useChemCityStore(s => s.user);
  const slimItems          = useChemCityStore(s => s.slimItems);
  const cardPickerSlotId   = useChemCityStore(s => s.cardPickerSlotId);
  const closeCardPicker    = useChemCityStore(s => s.closeCardPicker);
  const equipCard          = useChemCityStore(s => s.equipCard);
  const unequipCard        = useChemCityStore(s => s.unequipCard);
  const openCardDetail     = useChemCityStore(s => s.openCardDetail);

  const [equipping, setEquipping]     = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [search, setSearch]           = useState('');

  const isOpen = !!cardPickerSlotId;

  const validCards = useMemo<SlimItemDocument[]>(() => {
    if (!cardPickerSlotId || !user) return [];
    return slimItems
      .filter(item => !item.deprecated && user.ownedItems.includes(item.id) && item.validSlots.includes(cardPickerSlotId))
      .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3));
  }, [cardPickerSlotId, slimItems, user]);

  // Preload images when validCards changes
  useEffect(() => {
    preloadCardImages(validCards);
  }, [validCards]);

  const filteredCards = useMemo(() => {
    return validCards.filter(c => {
      if (filterRarity !== 'all' && c.rarity !== filterRarity) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.chemicalFormula.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [validCards, filterRarity, search]);

  const currentlyEquipped = cardPickerSlotId ? user?.equipped?.[cardPickerSlotId] : undefined;

  const handleSelect = async (itemId: string) => {
    if (!cardPickerSlotId || equipping) return;
    setEquipping(itemId);
    try {
      if (currentlyEquipped === itemId) await unequipCard(cardPickerSlotId);
      else await equipCard(cardPickerSlotId, itemId);
      closeCardPicker();
    } finally {
      setEquipping(null);
    }
  };

  const handleUnequip = async () => {
    if (!cardPickerSlotId || !currentlyEquipped) return;
    setEquipping('__unequip__');
    try {
      await unequipCard(cardPickerSlotId);
      closeCardPicker();
    } finally {
      setEquipping(null);
    }
  };

  if (!isOpen) return null;

  const rarities = ['all', 'legendary', 'epic', 'rare', 'common'];
  const slotLabel = cardPickerSlotId?.replace(/_/g, ' ') ?? '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        @keyframes panelIn { from{opacity:0;transform:scale(0.93) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .picker-anim { animation: panelIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .rarity-pill { font-family:'Quicksand',sans-serif; font-weight:800; font-size:11px; padding:5px 12px; border-radius:20px; border:1.5px solid; cursor:pointer; transition:all 0.2s ease; text-transform:capitalize; white-space:nowrap; }
        .card-slot-hover:hover { border-color:rgba(118,168,165,0.5) !important; background:rgba(118,168,165,0.08) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={closeCardPicker}
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'rgba(4,10,9,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'backdropIn 0.2s ease',
        }}
      >
        <div
          className="picker-anim"
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(580px, 94vw)',
            maxHeight: '88vh',
            background: 'rgba(8,20,19,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(197,215,181,0.18)',
            borderRadius: 22,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Quicksand', sans-serif",
          }}
        >
          {/* ── Header: Backpack ── */}
          <div style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(197,215,181,0.1)',
            background: 'linear-gradient(135deg, rgba(118,168,165,0.12) 0%, transparent 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: 'rgba(118,168,165,0.2)', border: '1.5px solid rgba(118,168,165,0.4)',
                  borderRadius: 12, width: 42, height: 42,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Backpack size={20} color="#76A8A5" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Your Backpack</div>
                  <div style={{ color: 'rgba(197,215,181,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                    Slot: <span style={{ color: '#76A8A5' }}>{slotLabel}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{validCards.length} compatible cards</span>
                  </div>
                </div>
              </div>
              <button onClick={closeCardPicker} style={{
                background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 10, width: 34, height: 34, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
              }}><X size={16} /></button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginTop: 12 }}>
              <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search cards..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 34px',
                  background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: "'Quicksand',sans-serif",
                  fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Rarity filters */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {rarities.map(r => (
                <button key={r} className="rarity-pill" onClick={() => setFilterRarity(r)} style={{
                  background: filterRarity === r ? 'rgba(118,168,165,0.25)' : 'transparent',
                  borderColor: filterRarity === r ? '#76A8A5' : 'rgba(255,255,255,0.12)',
                  color: filterRarity === r ? '#C5D7B5' : 'rgba(255,255,255,0.5)',
                }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Unequip current */}
          {currentlyEquipped && (
            <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleUnequip} disabled={!!equipping} style={{
                width: '100%', padding: '9px', borderRadius: 10,
                background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                fontFamily: "'Quicksand',sans-serif", transition: 'all 0.2s',
              }}>
                {equipping === '__unequip__' ? 'Removing...' : '↩ Remove equipped card'}
              </button>
            </div>
          )}

          {/* Card Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
            {filteredCards.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
                <Package size={36} color="rgba(255,255,255,0.15)" />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {validCards.length === 0 ? 'No cards for this slot yet' : 'No cards match filter'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 110px)', gap: 14, justifyContent: 'center' }}>
                {filteredCards.map(item => {
                  const isEq = user?.equipped?.[cardPickerSlotId!] === item.id;
                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <ChemCard
                        item={item}
                        size="md"
                        isEquipped={isEq}
                        onClick={() => handleSelect(item.id)}
                      />
                      <button
                        onClick={() => openCardDetail(item.id)}
                        style={{
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 6, padding: '3px 10px', color: 'rgba(255,255,255,0.45)',
                          fontSize: 10, cursor: 'pointer', fontFamily: "'Quicksand',sans-serif",
                          fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                        }}
                        className="card-slot-hover"
                      >
                        <Info size={9} />Info
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};