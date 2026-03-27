import React from 'react';

export default function App() {
  const [activeLevel, setActiveLevel] = React.useState('F4');

  return (
    <div style={{ minHeight: '100vh', width: '100%', position: 'relative', overflow: 'hidden', background: '#0a1a18' }}>
      <style>{`
        .brand-script {
          font-family: 'Quicksand', sans-serif;
          background: linear-gradient(135deg, #C5D7B5 0%, #76A8A5 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          -webkit-text-stroke: 2px rgba(255,255,255,0.98);
          text-shadow:
            1px 0 0 rgba(255,255,255,0.95),
            -1px 0 0 rgba(255,255,255,0.95),
            0 1px 0 rgba(255,255,255,0.95),
            0 -1px 0 rgba(255,255,255,0.95),
            1px 1px 0 rgba(255,255,255,0.9),
            -1px 1px 0 rgba(255,255,255,0.9),
            1px -1px 0 rgba(255,255,255,0.9),
            -1px -1px 0 rgba(255,255,255,0.9);
        }

        .hero-tagline {
          font-family: 'Quicksand', sans-serif;
        }

        .pill-badge {
          font-family: 'Quicksand', sans-serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(118,168,165,0.55);
          border: 1.5px solid rgba(197,215,181,0.7);
          border-radius: 999px;
          padding: 6px 16px;
          display: inline-block;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          text-shadow: 0 1px 4px rgba(255,255,255,0.3);
        }

        .landing-widget {
          font-family: 'Quicksand', sans-serif;
          text-decoration: none;
          color: rgba(255,255,255,0.96);
          background: rgba(118,168,165,0.14);
          border: 1.5px solid rgba(197,215,181,0.55);
          border-radius: 18px;
          padding: 16px 18px;
          width: min(680px, 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 16px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }

        .landing-widget:hover {
          transform: translateY(-2px);
          border-color: rgba(197,215,181,0.8);
          box-shadow: 0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12);
        }

        .landing-widget:focus-visible {
          outline: none;
          box-shadow: 0 18px 60px rgba(0,0,0,0.55), 0 0 0 4px rgba(118,168,165,0.55);
        }

        .landing-widget-title {
          font-weight: 800;
          letter-spacing: -0.01em;
          font-size: 16px;
          margin: 0;
          line-height: 1.25;
          text-shadow: 0 1px 10px rgba(0,0,0,0.35);
        }

        .landing-widget-subtitle {
          margin: 6px 0 0;
          font-weight: 600;
          font-size: 13px;
          color: rgba(230,245,230,0.9);
          line-height: 1.45;
          text-shadow: 0 1px 10px rgba(0,0,0,0.35);
        }

        .landing-widget-chip {
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(135deg, rgba(197,215,181,0.9), rgba(118,168,165,0.85));
          color: rgba(10,26,24,0.95);
          white-space: nowrap;
          box-shadow: 0 8px 22px rgba(0,0,0,0.35);
        }

        .level-toggle {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          border: 1.5px solid rgba(197,215,181,0.55);
          background: rgba(118,168,165,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 10px 34px rgba(0,0,0,0.4);
        }

        .level-btn {
          appearance: none;
          border: 0;
          cursor: pointer;
          border-radius: 999px;
          padding: 8px 14px;
          font-family: 'Quicksand', sans-serif;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          background: transparent;
          transition: background 140ms ease, color 140ms ease, transform 140ms ease;
        }

        .level-btn:hover {
          transform: translateY(-1px);
          color: rgba(255,255,255,0.95);
        }

        .level-btn.active {
          background: linear-gradient(135deg, rgba(197,215,181,0.9), rgba(118,168,165,0.85));
          color: rgba(10,26,24,0.95);
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(10,26,24,0.2) 0%, rgba(10,26,24,0.9) 100%)',
          pointerEvents: 'none',
        }}
      />

      <nav
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '20px 18px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ filter: 'drop-shadow(0 0 10px rgba(118,168,165,0.5))' }}>
            <div
              style={{
                clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                background: 'linear-gradient(135deg, #76A8A5, #C5D7B5)',
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                  background: '#0d1f1e',
                  width: 50,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/ChemistreeIcon_square.png"
                  alt="ChemLeung"
                  draggable={false}
                  style={{ width: 36, height: 36, objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: '#fff',
                letterSpacing: '-0.01em',
              }}
            >
              Chemistry Learning Resources
            </span>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: 'rgba(255,255,255,0.72)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              by ChemLeung
            </span>
          </div>
        </div>
      </nav>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <div className="pill-badge" style={{ marginBottom: 28 }}>
          {activeLevel} Chemistry
        </div>

        <h1 className="brand-script" style={{ fontSize: 'clamp(2.6rem, 8vw, 5.2rem)', lineHeight: 1.08, margin: 0 }}>
          Chemistry Learning Resources
        </h1>

        <p
          className="hero-tagline"
          style={{
            fontSize: 'clamp(1rem, 2.4vw, 1.2rem)',
            color: 'rgba(230,245,230,0.97)',
            fontWeight: 600,
            maxWidth: 640,
            lineHeight: 1.7,
            marginTop: 20,
            marginBottom: 0,
            textShadow: '0 1px 4px rgba(255,255,255,0.25), 0 2px 16px rgba(255,255,255,0.15), 0 4px 32px rgba(0,0,0,0.6)',
          }}
        >
          Curated notes, practice, and tools for HKDSE Chemistry.
        </p>

        <div style={{ marginTop: 24 }}>
          <div className="level-toggle" role="tablist" aria-label="Select level">
            <button
              type="button"
              className={`level-btn ${activeLevel === 'F3' ? 'active' : ''}`}
              onClick={() => setActiveLevel('F3')}
              aria-pressed={activeLevel === 'F3'}
            >
              F3
            </button>
            <button
              type="button"
              className={`level-btn ${activeLevel === 'F4' ? 'active' : ''}`}
              onClick={() => setActiveLevel('F4')}
              aria-pressed={activeLevel === 'F4'}
            >
              F4
            </button>
          </div>
        </div>

        <div style={{ width: 'min(680px, 100%)', marginTop: 26 }}>
          {activeLevel === 'F3' ? (
            <a className="landing-widget" href="chemical-bonding.html" aria-label="Open Chemical Bonding">
              <div style={{ textAlign: 'left' }}>
                <p className="landing-widget-title">Chemical Bonding</p>
                <p className="landing-widget-subtitle">Interactive learning page</p>
              </div>
              <span className="landing-widget-chip">Open</span>
            </a>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <a className="landing-widget" href="neutralization-exothermic.html" aria-label="Open Neutralization: Exothermic nature">
                <div style={{ textAlign: 'left' }}>
                  <p className="landing-widget-title">Neutralization: Exothermic nature</p>
                  <p className="landing-widget-subtitle">Interactive notes / explanation page</p>
                </div>
                <span className="landing-widget-chip">Open</span>
              </a>

              <a className="landing-widget" href="titration.html" aria-label="Open Acid-Base Titration">
                <div style={{ textAlign: 'left' }}>
                  <p className="landing-widget-title">Acid–Base Titration</p>
                  <p className="landing-widget-subtitle">Interactive titration simulation</p>
                </div>
                <span className="landing-widget-chip">Open</span>
              </a>

              <a className="landing-widget" href="salt-page.html" aria-label="Open Salt Quiz">
                <div style={{ textAlign: 'left' }}>
                  <p className="landing-widget-title">Salt Quiz</p>
                  <p className="landing-widget-subtitle">Salt solubility rules + preparation method practice</p>
                </div>
                <span className="landing-widget-chip">Open</span>
              </a>

              <a className="landing-widget" href="HOT_guiding_saltprep_reactingmass.html" aria-label="Open HOT questions: salt preparation and reacting masses">
                <div style={{ textAlign: 'left' }}>
                  <p className="landing-widget-title">HOT questions: salt preparation and reacting masses</p>
                  <p className="landing-widget-subtitle">Guiding questions + scaffolded hints</p>
                </div>
                <span className="landing-widget-chip">Open</span>
              </a>
            </div>
          )}
        </div>

        <p
          className="hero-tagline"
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 36,
            textShadow: '0 1px 6px rgba(255,255,255,0.3), 0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          by ChemLeung
        </p>
      </div>
    </div>
  );
}
