// ── DailyLoginModal.tsx ─────────────────────────────────────────
import React, { useMemo } from 'react';
import { X, Coins, Gem, Flame, Trophy, LogIn } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';

function milestoneMessage(streak: number): { text: string; icon: React.ReactNode } {
  if (streak === 1) return { text: 'Welcome back!', icon: <LogIn size={16} color="#76A8A5" /> };
  if (streak === 7) return { text: '7-day streak!', icon: <Flame size={16} color="#fb923c" /> };
  if (streak === 30) return { text: '30-day legend!', icon: <Trophy size={16} color="#fbbf24" /> };
  if (streak % 10 === 0) return { text: `${streak} days strong!`, icon: <Trophy size={16} color="#fbbf24" /> };
  return { text: `${streak}-day streak!`, icon: <Flame size={16} color="#fb923c" /> };
}

export const DailyLoginModal: React.FC = () => {
  const dailyLogin     = useChemCityStore(s => s.dailyLogin);
  const dismissDailyLogin = useChemCityStore(s => s.dismissDailyLogin);

  const { text: msg, icon } = useMemo(() => milestoneMessage(dailyLogin.streak || 0), [dailyLogin.streak]);
  if (!dailyLogin.showModal) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@600;700;800&display=swap');
        @keyframes loginIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes coinPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
      `}</style>
      <div onClick={dismissDailyLogin} style={{
        position:'fixed', inset:0, zIndex:70,
        background:'rgba(4,10,9,0.88)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width:'min(340px,92vw)',
          background:'rgba(8,20,19,0.97)',
          border:'1.5px solid rgba(197,215,181,0.18)',
          borderRadius:22,
          boxShadow:'0 32px 80px rgba(0,0,0,0.7)',
          overflow:'hidden',
          fontFamily:"'Quicksand',sans-serif",
          animation:'loginIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          {/* Header */}
          <div style={{
            padding:'20px 20px 16px',
            borderBottom:'1px solid rgba(197,215,181,0.1)',
            background:'linear-gradient(135deg,rgba(118,168,165,0.15) 0%,transparent)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ background:'rgba(118,168,165,0.2)', border:'1.5px solid rgba(118,168,165,0.4)', borderRadius:12, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {icon}
              </div>
              <div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>Daily Login Bonus</div>
                <div style={{ color:'rgba(197,215,181,0.6)', fontSize:12, fontWeight:600 }}>{msg}</div>
              </div>
            </div>
            <button onClick={dismissDailyLogin} style={{ background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
              <X size={14} />
            </button>
          </div>

          {/* Rewards */}
          <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'rgba(251,191,36,0.06)', border:'1.5px solid rgba(251,191,36,0.25)', borderRadius:14, padding:'14px', textAlign:'center', animation:'coinPop 0.5s 0.1s ease both' }}>
                <Coins size={24} color="#fbbf24" style={{ margin:'0 auto 6px' }} />
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Coins</div>
                <div style={{ color:'#fbbf24', fontWeight:800, fontSize:20, fontVariantNumeric:'tabular-nums' }}>
                  +{Number(dailyLogin.coins || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background:'rgba(103,232,249,0.06)', border:'1.5px solid rgba(103,232,249,0.25)', borderRadius:14, padding:'14px', textAlign:'center', animation:'coinPop 0.5s 0.2s ease both' }}>
                <Gem size={24} color="#67e8f9" style={{ margin:'0 auto 6px' }} />
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Diamonds</div>
                <div style={{ color:'#67e8f9', fontWeight:800, fontSize:20, fontVariantNumeric:'tabular-nums' }}>
                  +{Number(dailyLogin.diamonds || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ background:'rgba(118,168,165,0.08)', border:'1px solid rgba(118,168,165,0.2)', borderRadius:10, padding:'9px 12px' }}>
              <p style={{ color:'rgba(197,215,181,0.65)', fontSize:11, fontWeight:600, margin:0 }}>
                Tip: Equip cards in the <strong style={{ color:'#C5D7B5' }}>Toilet</strong> to boost your daily diamond reward.
              </p>
            </div>

            <button onClick={dismissDailyLogin} style={{
              width:'100%', padding:'12px', borderRadius:12, border:'none',
              background:'linear-gradient(135deg, #76A8A5, #5d9190)',
              color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer',
              fontFamily:"'Quicksand',sans-serif",
              boxShadow:'0 4px 20px rgba(118,168,165,0.4)',
            }}>
              Collect
            </button>
          </div>
        </div>
      </div>
    </>
  );
};