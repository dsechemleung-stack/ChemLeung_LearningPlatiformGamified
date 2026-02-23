import React, { useState } from 'react';
import { X, Lock, Coins, CheckCircle } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';

export const PlaceUnlockModal: React.FC = () => {
  const user                  = useChemCityStore(s => s.user);
  const places                = useChemCityStore(s => s.places);
  const placeUnlockModalId    = useChemCityStore(s => s.placeUnlockModalId);
  const closePlaceUnlockModal = useChemCityStore(s => s.closePlaceUnlockModal);
  const unlockPlace           = useChemCityStore(s => s.unlockPlace);

  const [unlocking, setUnlocking] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const isOpen = !!placeUnlockModalId;
  const place  = places.find(p => p.id === placeUnlockModalId) ?? null;
  if (!isOpen || !place || !user) return null;

  const cost       = place.unlockCost ?? 0;
  const coins      = user.currencies.coins;
  const canAfford  = coins >= cost;
  const isUnlocked = user.unlockedPlaces.includes(place.id as any);

  const handleUnlock = async () => {
    if (unlocking || !canAfford || isUnlocked) return;
    setUnlocking(true); setError(null);
    try {
      await unlockPlace(place.id);
      setSuccess(true);
      setTimeout(() => { closePlaceUnlockModal(); setSuccess(false); }, 1200);
    } catch (err: any) { setError(err?.message ?? 'Unlock failed.'); }
    finally { setUnlocking(false); }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700;800&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes modalIn{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

      <div onClick={closePlaceUnlockModal} style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(4,10,9,0.88)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: 'min(360px, 92vw)',
          background: 'rgba(8,20,19,0.97)',
          border: '1.5px solid rgba(197,215,181,0.18)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          fontFamily: "'Quicksand',sans-serif",
          animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          {/* Header */}
          <div style={{
            padding: '22px 20px 16px',
            borderBottom: '1px solid rgba(197,215,181,0.1)',
            background: 'linear-gradient(135deg, rgba(118,168,165,0.1) 0%, transparent)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            position: 'relative',
          }}>
            <button onClick={closePlaceUnlockModal} style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
            }}><X size={13} /></button>

            <div style={{ fontSize: 48, lineHeight: 1 }}>{place.emoji}</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, textAlign: 'center' }}>{place.displayName}</div>
            <div style={{ color: 'rgba(197,215,181,0.5)', fontSize: 12, fontWeight: 600, textAlign: 'center', maxWidth: 260 }}>
              {place.skill.description}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isUnlocked || success ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                <CheckCircle size={30} color="#4ade80" />
                <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>
                  {isUnlocked ? 'Already unlocked!' : `${place.displayName} unlocked!`}
                </span>
              </div>
            ) : (
              <>
                {/* Cost / Balance */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700 }}>Unlock Cost</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Coins size={14} color="#fbbf24" />
                      <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 16 }}>{cost.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700 }}>Your Balance</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Coins size={13} color={canAfford ? '#fbbf24' : '#f87171'} />
                      <span style={{ color: canAfford ? '#fff' : '#f87171', fontWeight: 800, fontSize: 14 }}>{coins.toLocaleString()}</span>
                    </div>
                  </div>
                  {!canAfford && (
                    <div style={{ textAlign: 'center', color: '#f87171', fontSize: 11, fontWeight: 700 }}>
                      Need {(cost - coins).toLocaleString()} more coins
                    </div>
                  )}
                </div>

                {/* Slot info */}
                <div style={{ background: 'rgba(118,168,165,0.08)', border: '1px solid rgba(118,168,165,0.2)', borderRadius: 10, padding: '9px 12px' }}>
                  <span style={{ color: 'rgba(197,215,181,0.7)', fontSize: 11, fontWeight: 600, fontFamily: "'Quicksand',sans-serif" }}>
                    Grants access to <strong style={{ color: '#C5D7B5' }}>{place.slots?.length ?? 0} card slots</strong>
                  </span>
                </div>

                {error && <p style={{ color: '#f87171', fontSize: 11, textAlign: 'center', margin: 0 }}>{error}</p>}
              </>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <button onClick={closePlaceUnlockModal} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                fontFamily: "'Quicksand',sans-serif",
              }}>
                {isUnlocked || success ? 'Close' : 'Cancel'}
              </button>
              {!success && !isUnlocked && (
                <button onClick={handleUnlock} disabled={!canAfford || unlocking} style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                  background: canAfford && !unlocking ? 'linear-gradient(135deg, #b45309, #92400e)' : 'rgba(255,255,255,0.05)',
                  color: canAfford && !unlocking ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontWeight: 800, fontSize: 13,
                  cursor: canAfford && !unlocking ? 'pointer' : 'not-allowed',
                  fontFamily: "'Quicksand',sans-serif",
                  boxShadow: canAfford ? '0 4px 16px rgba(180,83,9,0.4)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                  {unlocking ? (
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : <Lock size={13} />}
                  Unlock for {cost.toLocaleString()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};