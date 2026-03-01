import React, { useMemo, useState } from 'react';
import { ChevronLeft, Sparkles, Fuel, X, Zap, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChemCityStore } from '../../store/chemcityStore';

export const CurrencyBar: React.FC = () => {
  const navigate = useNavigate();
  const user               = useChemCityStore(s => s.user);
  const places             = useChemCityStore(s => s.places);
  const view               = useChemCityStore(s => s.view);
  const selectedPlaceId    = useChemCityStore(s => s.selectedPlaceId);
  const navigateToMap      = useChemCityStore(s => s.navigateToMap);
  const navigateToGasStationDistributor = useChemCityStore(s => s.navigateToGasStationDistributor);

  const [skillsOpen, setSkillsOpen] = useState(false);

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
    onClick: () => void;
    active: boolean;
    label: string;
    children: React.ReactNode;
    accent?: boolean;
    showText?: boolean;
    pulse?: boolean;
    textColor?: string;
    bg?: string;
    borderColor?: string;
    className?: string;
  }> = ({ onClick, active, label, children, accent, showText, pulse, textColor, bg, borderColor, className }) => (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={showText ? `cc-nav-pill ${className ?? ''}`.trim() : className}
      style={{
      width: showText ? 'auto' : 36,
      height: 36,
      borderRadius: showText ? 999 : 10,
      padding: showText ? '0 12px' : 0,
      border: `1.5px solid ${
        borderColor ?? (active ? 'rgba(118,168,165,0.6)' : accent ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)')
      }`,
      background:
        bg ??
        (active
          ? 'rgba(118,168,165,0.25)'
          : accent
            ? 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,191,36,0.08))'
            : 'rgba(8,20,19,0.9)'),
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      color: textColor ?? (active ? '#C5D7B5' : accent ? '#fbbf24' : '#94a3b8'),
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      gap: showText ? 8 : undefined,
      fontWeight: showText ? 900 : undefined,
      fontSize: showText ? 12 : undefined,
      letterSpacing: showText ? 0.2 : undefined,
      animation: pulse ? 'skillPulse 1.8s ease-in-out infinite' : undefined,
    }}>
      {children}
      {showText && (
        <span
          className="cc-nav-pill-label"
          style={{
          color: textColor ?? (active ? '#C5D7B5' : accent ? '#fbbf24' : '#94a3b8'),
          fontWeight: 900,
          fontSize: 13,
          lineHeight: '13px',
          whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&display=swap');
        .skills-row:hover { background: rgba(255,255,255,0.06) !important; }
        @keyframes skillPulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 rgba(251,191,36,0); }
          50% { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 16px rgba(251,191,36,0.35); }
        }
        @media (max-width: 480px) {
          .cc-nav-pill {
            height: 32px !important;
            padding: 0 10px !important;
          }
          .cc-nav-pill-label {
            font-size: 12px !important;
            line-height: 12px !important;
          }
        }
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

        {/* Right: nav buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'auto' }}>
          <NavBtn
            onClick={() => setSkillsOpen(true)}
            active={false}
            label="Skill Boosts"
            showText
            pulse
            bg="linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.92))"
            borderColor="rgba(253,230,138,0.95)"
            textColor="#111827"
          >
            <Sparkles size={16} color="#111827" />
          </NavBtn>
          <NavBtn
            onClick={() => navigate('/inventory')}
            active={false}
            label="Inventory"
            showText
            bg="linear-gradient(135deg, rgba(59,130,246,0.35), rgba(14,165,233,0.18))"
            borderColor="rgba(125,211,252,0.55)"
            textColor="#111827"
          >
            <Archive size={16} color="#111827" />
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