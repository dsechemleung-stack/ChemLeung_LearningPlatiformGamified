import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function VisitorDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exitVisitorMode } = useAuth();

  const topicNameByNumber = {
    1: 'Planet Earth',
    2: 'Microscopic World I',
    3: 'Metals',
    4: 'Acids and Bases',
    5: 'Organic I',
    6: 'Microscopic World II',
    7: 'Redox',
    8: 'Energetics',
    9: 'Reaction rate',
    10: 'Equilibrium',
    11: 'Organic II',
    12: 'Patterns',
  };

  const [learnedUpTo, setLearnedUpTo] = React.useState(() => {
    try {
      return Number(window.sessionStorage.getItem('visitor_learned_up_to') || 12);
    } catch {
      return 12;
    }
  });

  React.useEffect(() => {
    const v = Number(learnedUpTo);
    const safe = Number.isFinite(v) ? Math.max(1, Math.min(12, v)) : 12;
    try {
      window.sessionStorage.setItem('visitor_learned_up_to', String(safe));
    } catch {
      // ignore
    }
  }, [learnedUpTo]);

  return (
    <div className="min-h-screen w-full" style={{ background: '#0a1a18' }}>
      <div className="max-w-3xl mx-auto p-4 sm:p-8" style={{ color: '#fff', fontFamily: "'Quicksand', sans-serif" }}>
        <div style={{
          borderRadius: 22,
          border: '1px solid rgba(197,215,181,0.18)',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          padding: 18,
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Visitor Mode</div>

          {location?.state?.visitorBlockedRoute && (
            <div style={{
              marginBottom: 10,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              padding: 12,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 800,
              fontSize: 12,
              lineHeight: 1.4,
            }}>
              "{location.state.visitorBlockedRoute}" is not available in Visitor mode.
            </div>
          )}

          <div style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
            Caution: Visitor mode does not save or upload any data. Your progress will not be saved.
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>
              Assume learned up to
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={learnedUpTo}
                onChange={(e) => setLearnedUpTo(Number(e.target.value))}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(197,215,181,0.22)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 900,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    Topic {n}_{topicNameByNumber[n] || ''}
                  </option>
                ))}
              </select>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>
                Used for selecting which topics/questions you can practice.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>
              Not available in Visitor mode
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.72)',
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 1.5,
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              padding: 12,
            }}>
              - ChemCity
              <br />
              - ChemStore / Store
              <br />
              - Gacha
              <br />
              - Inventory
              <br />
              - Leaderboard
              <br />
              - Profile / History / Mistake Notebook
              <br />
              - Smart Calendar + AI recommendations + SRS tracking
            </div>
          </div>

          <div className="mt-4" style={{ display: 'grid', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/practice')}
              style={btnStyle()}
            >
              Start Practice
            </button>

            <button
              type="button"
              onClick={() => navigate('/millionaire')}
              style={btnStyle()}
            >
              Millionaire Quiz
            </button>

            <button
              type="button"
              onClick={() => {
                exitVisitorMode();
                navigate('/login');
              }}
              style={{
                ...btnStyle(),
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              Exit Visitor Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle() {
  return {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(197,215,181,0.22)',
    background: 'linear-gradient(135deg, #76A8A5, #5d9190)',
    color: '#fff',
    fontWeight: 900,
    fontSize: 14,
    cursor: 'pointer',
  };
}
