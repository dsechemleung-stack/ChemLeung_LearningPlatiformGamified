import React, { useMemo, useState } from 'react';
import { Coins, Gem, ChevronLeft, Sparkles, BookOpen, Fuel, X, Zap, Ticket } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { useAuth } from '../../contexts/AuthContext';

export const CurrencyBar: React.FC = () => {
  const { userProfile } = useAuth() as any;
  const user               = useChemCityStore(s => s.user);
  const places             = useChemCityStore(s => s.places);
  const view               = useChemCityStore(s => s.view);
  const selectedPlaceId    = useChemCityStore(s => s.selectedPlaceId);
  const navigateToMap      = useChemCityStore(s => s.navigateToMap);
  const navigateToCollections = useChemCityStore(s => s.navigateToCollections);
  const navigateToGasStationDistributor = useChemCityStore(s => s.navigateToGasStationDistributor);

  const [skillsOpen, setSkillsOpen] = useState(false);

  const coins    = user?.currencies.coins ?? 0;
  const diamonds = Number(userProfile?.tokens ?? 0);
  const tickets  = (user?.currencies as any)?.tickets ?? 0;

  const showGasDistributorButton = view === 'place' && selectedPlaceId === 'gas_station' && (user?.extraSlotsBudget ?? 0) > 0;

  const skillSummaryByPlaceId = useMemo(() => {
    const b = user?.activeBonuses;
    if (!b) return {} as Record<string, string>;
    return {
      garden:             `${b.passiveBaseCoinsPerHour.toLocaleString()} coins/hr`,
      lab:                `${b.passiveMultiplier.toFixed(1)}× multiplier`,
      kitchen:            `+${b.quizFlatDiamondBonus} diamond bonus`,
      school:             `${b.quizDiamondMultiplier.toFixed(1)}× quiz diamonds`,
      beach:              `${b.quizDoubleChancePercent}% double chance`,
      toilet:             `${b.dailyLoginDiamonds} daily diamonds`,
      gas_station:        `${b.extraSlotsTotal} bonus slots`,
      lifestyle_boutique: `${b.shopDiscountPercent}% store discount`,
    };
  }, [user?.activeBonuses]);

  const NavBtn: React.FC<{
    onClick: () => void; active: boolean; label: string; children: React.ReactNode; accent?: boolean;
  }> = ({ onClick, active, label, children, accent }) => (
    <button onClick={onClick} title={label} aria-label={label} style={{
      width: 36, height: 36, borderRadius: 10,
      border: `1.5px solid ${active ? 'rgba(118,168,165,0.6)' : accent ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)'}`,
      background: active
        ? 'rgba(118,168,165,0.25)'
        : accent ? 'rgba(251,191,36,0.12)' : 'rgba(8,20,19,0.9)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      color: active ? '#C5D7B5' : accent ? '#fbbf24' : '#94a3b8',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      {children}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&display=swap');
        .skills-row:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div style={{
        position: 'fixed', top: 84, left: 12, right: 12, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        pointerEvents: 'none',
        fontFamily: "'Quicksand',sans-serif",
      }}>
        {/* Left: Back button */}
        <div style={{ pointerEvents: 'auto' }}>
          {view !== 'map' && (
            <button onClick={navigateToMap} title="Back to map" aria-label="Back to map" style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(8,20,19,0.9)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
            }}>
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Right: Currency pills + nav buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'auto' }}>
          {/* Coins pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(8,20,19,0.9)',
            border: '1.5px solid rgba(251,191,36,0.25)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '5px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <Coins size={13} color="#fbbf24" />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {coins.toLocaleString()}
            </span>
          </div>

          {/* Diamonds pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(8,20,19,0.9)',
            border: '1.5px solid rgba(103,232,249,0.25)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '5px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <Gem size={12} color="#67e8f9" />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {diamonds.toLocaleString()}
            </span>
          </div>

          {/* Tickets pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(8,20,19,0.9)',
            border: '1.5px solid rgba(167,139,250,0.25)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '5px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <Ticket size={12} color="#a78bfa" />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {Number(tickets || 0).toLocaleString()}
            </span>
          </div>

          <NavBtn onClick={() => setSkillsOpen(true)} active={false} label="Skill Boosts">
            <Sparkles size={15} />
          </NavBtn>
          <NavBtn onClick={navigateToCollections} active={view === 'collections'} label="Collections Album">
            <BookOpen size={15} />
          </NavBtn>
          {showGasDistributorButton && (
            <NavBtn onClick={navigateToGasStationDistributor} active={false} label="Distribute Bonus Slots" accent>
              <Fuel size={15} />
            </NavBtn>
          )}
        </div>
      </div>

      {/* ── Skills Modal ── */}
      {skillsOpen && (
        <div
          onClick={() => setSkillsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(4,10,9,0.88)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(420px, 94vw)',
            background: 'rgba(8,20,19,0.97)',
            border: '1.5px solid rgba(197,215,181,0.18)',
            borderRadius: 20,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            fontFamily: "'Quicksand',sans-serif",
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 18px', borderBottom: '1px solid rgba(197,215,181,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(118,168,165,0.12) 0%, transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background:'rgba(118,168,165,0.2)', border:'1.5px solid rgba(118,168,165,0.4)', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={16} color="#76A8A5" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Skill Boosts</div>
                  <div style={{ color: 'rgba(197,215,181,0.5)', fontSize: 11, fontWeight: 600 }}>Active card bonuses</div>
                </div>
              </div>
              <button onClick={() => setSkillsOpen(false)} style={{
                background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
              }}><X size={14} /></button>
            </div>

            {/* Skills list */}
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '65vh', overflowY: 'auto' }}>
              {places.map(p => (
                <div key={p.id} className="skills-row" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '10px 14px',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{p.emoji}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{p.displayName}</div>
                      <div style={{ color: 'rgba(197,215,181,0.4)', fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.skill.description}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <Zap size={10} color="#76A8A5" />
                    <span style={{ color: '#76A8A5', fontWeight: 800, fontSize: 12 }}>
                      {skillSummaryByPlaceId[p.id] ?? '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};