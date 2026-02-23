// ── PassiveIncomeCollector.tsx ──────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Coins, TrendingUp, Download } from 'lucide-react';
import { useChemCityStore } from '../../store/chemcityStore';
import { formatCoinsPerHour } from '../../lib/chemcity/income';

export const PassiveIncomeCollector: React.FC = () => {
  const user                = useChemCityStore(s => s.user);
  const passiveDisplayCoins = useChemCityStore(s => s.passiveDisplayCoins);
  const collectIncome       = useChemCityStore(s => s.collectIncome);
  const tickPassiveDisplay  = useChemCityStore(s => s.tickPassiveDisplay);

  const [collecting, setCollecting]       = useState(false);
  const [lastCollected, setLastCollected] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rate = user?.activeBonuses.passiveBaseCoinsPerHour ?? 0;

  useEffect(() => {
    if (rate > 0) {
      tickPassiveDisplay();
      intervalRef.current = setInterval(tickPassiveDisplay, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [rate, tickPassiveDisplay]);

  const handleCollect = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const { coinsAwarded } = await collectIncome();
      setLastCollected(coinsAwarded);
      setTimeout(() => setLastCollected(null), 3000);
    } finally {
      setCollecting(false);
    }
  };

  if (rate === 0) return null;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@700;800&display=swap');`}</style>
      <div style={{
        margin: '10px 12px 4px',
        background: 'rgba(8,20,19,0.9)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(251,191,36,0.2)',
        borderRadius: 14, padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontFamily: "'Quicksand',sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <TrendingUp size={15} color="#fbbf24" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700 }}>
              {formatCoinsPerHour(rate)} passive
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
              <Coins size={12} color="#fbbf24" />
              <span style={{ color:'#fbbf24', fontWeight:800, fontSize:14, fontVariantNumeric:'tabular-nums' }}>
                {passiveDisplayCoins.toLocaleString()}
              </span>
              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontWeight:600 }}>pending</span>
            </div>
          </div>
        </div>

        {lastCollected !== null ? (
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)',
            borderRadius:8, padding:'6px 12px',
          }}>
            <Coins size={12} color="#4ade80" />
            <span style={{ color:'#4ade80', fontWeight:800, fontSize:13 }}>+{lastCollected.toLocaleString()}</span>
          </div>
        ) : (
          <button onClick={handleCollect} disabled={collecting || passiveDisplayCoins < 1} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
            background: collecting || passiveDisplayCoins < 1
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, rgba(180,83,9,0.8), rgba(146,64,14,0.8))',
            border: `1.5px solid ${collecting || passiveDisplayCoins < 1 ? 'rgba(255,255,255,0.08)' : 'rgba(251,191,36,0.4)'}`,
            color: collecting || passiveDisplayCoins < 1 ? 'rgba(255,255,255,0.3)' : '#fff',
            fontWeight:800, fontSize:12, cursor: collecting || passiveDisplayCoins < 1 ? 'not-allowed' : 'pointer',
            fontFamily:"'Quicksand',sans-serif", transition:'all 0.2s',
            boxShadow: passiveDisplayCoins >= 1 && !collecting ? '0 2px 12px rgba(180,83,9,0.4)' : 'none',
          }}>
            {collecting ? (
              <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            ) : (
              <Download size={13} />
            )}
            Collect
          </button>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};